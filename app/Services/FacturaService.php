<?php

namespace App\Services;

use App\Models\Encomenda;
use App\Models\Factura;
use App\Models\FacturaLinha;
use App\Models\Orcamento;
use App\Models\Pagamento;
use App\Models\Reserva;
use App\Models\Terceiro;
use App\Models\User;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Regras da facturação (ver docs/analise-dolibarr/01-facturacao-pagamento.md):
 *
 * 1. A factura nasce em rascunho, com referência provisória (PROV).
 * 2. Ao validar recebe o número definitivo e sequencial (FT2026/0001) e fica bloqueada.
 * 3. O vencimento calcula-se pela data e pelos termos de pagamento.
 * 4. Os pagamentos podem ser parciais; pago o total, passa a "Paga".
 * 5. Uma factura validada e sem pagamentos pode ser abandonada, com motivo.
 * 6. Só os rascunhos se apagam.
 */
class FacturaService
{
    public function __construct(
        private readonly Numeracao $numeracao,
        private readonly LinhasDocumento $linhas,
    ) {}

    /** @param array<string, mixed> $dados */
    public function criar(array $dados, User $autor): Factura
    {
        $cliente = Terceiro::findOrFail($dados['terceiro_id']);
        $this->garantirCliente($cliente);

        $factura = new Factura([
            'tipo' => 'normal',
            'terceiro_id' => $cliente->id,
            'data' => $dados['data'],
            'termos_pagamento' => $dados['termos_pagamento'] ?? $cliente->termos_pagamento,
            'metodo_pagamento' => $dados['metodo_pagamento'] ?? $cliente->metodo_pagamento,
            'ref_cliente' => $dados['ref_cliente'] ?? null,
            'nota_publica' => $dados['nota_publica'] ?? null,
            'nota_privada' => $dados['nota_privada'] ?? null,
        ]);
        $factura->estado = Factura::RASCUNHO;
        $factura->criado_por = $autor->id;
        $factura->data_vencimento = $this->calcularVencimento($factura->data, $factura->termos_pagamento);
        $factura->save();

        $this->registar($factura, 'created', 'Factura criada (rascunho)');

        return $factura;
    }

    /** @param array<string, mixed> $dados */
    public function actualizarCabecalho(Factura $factura, array $dados): Factura
    {
        $this->garantirRascunho($factura);

        if (isset($dados['terceiro_id']) && (int) $dados['terceiro_id'] !== $factura->terceiro_id) {
            $this->garantirCliente(Terceiro::findOrFail($dados['terceiro_id']));
        }

        $factura->fill($dados);
        $factura->data_vencimento = $this->calcularVencimento($factura->data, $factura->termos_pagamento);
        $factura->save();

        return $factura;
    }

    /**
     * Cria um rascunho de factura a partir de um orçamento assinado ou de uma encomenda,
     * copiando o cliente, os termos e todas as linhas (como "Criar factura" no Dolibarr).
     */
    public function criarAPartirDe(Orcamento|Encomenda|Reserva $origem, User $autor): Factura
    {
        return DB::transaction(function () use ($origem, $autor) {
            // A reserva não tem termos de pagamento: usam-se os do cliente
            $factura = $this->criar([
                'terceiro_id' => $origem->terceiro_id,
                'data' => now()->toDateString(),
                'termos_pagamento' => $origem instanceof Reserva ? null : $origem->termos_pagamento,
                'metodo_pagamento' => $origem instanceof Reserva ? null : $origem->metodo_pagamento,
                'ref_cliente' => $origem instanceof Reserva ? $origem->numero : $origem->ref_cliente,
                'nota_publica' => $origem->nota_publica,
            ], $autor);

            if ($origem instanceof Reserva) {
                $factura->reserva_id = $origem->id;
                $factura->orcamento_id = $origem->orcamento_id;
            } elseif ($origem instanceof Orcamento) {
                $factura->orcamento_id = $origem->id;
            } else {
                $factura->encomenda_id = $origem->id;
                $factura->orcamento_id = $origem->orcamento_id;
            }
            $factura->save();
            $this->linhas->copiar($origem, $factura);

            return $factura;
        });
    }

    /** @param array{produto_id?: ?int, descricao?: ?string, quantidade: string|float, preco_unitario?: string|float|null, desconto?: string|float|null, taxa_iva?: string|float|null} $dados */
    public function adicionarLinha(Factura $factura, array $dados): FacturaLinha
    {
        $this->garantirRascunho($factura);

        /** @var FacturaLinha */
        return $this->linhas->adicionar($factura, $dados);
    }

    /** @param array<string, mixed> $dados */
    public function actualizarLinha(FacturaLinha $linha, array $dados): FacturaLinha
    {
        $this->garantirRascunho($linha->factura);

        /** @var FacturaLinha */
        return $this->linhas->actualizar($linha->factura, $linha, $dados);
    }

    public function removerLinha(FacturaLinha $linha): void
    {
        $this->garantirRascunho($linha->factura);
        $this->linhas->remover($linha->factura, $linha);
    }

    public function validar(Factura $factura, User $quem): Factura
    {
        $this->garantirRascunho($factura);

        if (! $factura->linhas()->exists()) {
            throw ValidationException::withMessages(['factura' => 'A factura não tem linhas. Acrescente pelo menos um produto ou serviço antes de validar.']);
        }

        if (bccomp((string) $factura->total, '0', 2) <= 0) {
            throw ValidationException::withMessages(['factura' => 'O total da factura tem de ser maior do que zero.']);
        }

        return DB::transaction(function () use ($factura, $quem) {
            // Volta a ler a factura com bloqueio: se duas pessoas carregarem em "Validar" ao mesmo tempo,
            // a segunda espera e depois vê que já não é rascunho.
            $factura = Factura::lockForUpdate()->findOrFail($factura->id);
            $this->garantirRascunho($factura);

            // A numeração segue as datas: não se valida uma factura com data anterior à última validada
            $factura->numero = $this->numeracao->proximoEmOrdem('factura', Factura::class, $factura->data, $factura->id, 'factura', 'factura');
            $factura->estado = Factura::VALIDADA;
            $factura->validada_em = now();
            $factura->validada_por = $quem->id;
            $factura->data_vencimento = $this->calcularVencimento($factura->data, $factura->termos_pagamento);
            $factura->save();

            // Objectos relacionados: a origem fica marcada como facturada
            if ($factura->orcamento_id !== null) {
                Orcamento::whereKey($factura->orcamento_id)->where('estado', Orcamento::ASSINADO)->update(['estado' => Orcamento::FACTURADO]);
            }
            if ($factura->encomenda_id !== null) {
                Encomenda::whereKey($factura->encomenda_id)->update(['facturada' => true]);
            }

            $this->registar($factura, 'validada', "Factura {$factura->numero} validada");

            return $factura;
        });
    }

    public function abandonar(Factura $factura, string $motivo): Factura
    {
        if ($factura->estado !== Factura::VALIDADA) {
            throw ValidationException::withMessages(['factura' => 'Só uma factura pendente de cobrança pode ser abandonada.']);
        }
        if (bccomp((string) $factura->total_pago, '0', 2) > 0) {
            throw ValidationException::withMessages(['factura' => 'Esta factura já tem pagamentos e não pode ser abandonada.']);
        }
        if ($factura->notasCredito()->exists()) {
            throw ValidationException::withMessages(['factura' => 'Esta factura tem notas de crédito e não pode ser abandonada. Use uma nota de crédito pelo restante.']);
        }

        $factura->estado = Factura::ABANDONADA;
        $factura->motivo_abandono = $motivo;
        $factura->save();

        $this->registar($factura, 'abandonada', "Factura {$factura->numero} classificada como abandonada", ['motivo' => $motivo]);

        return $factura;
    }

    public function reabrir(Factura $factura): Factura
    {
        if ($factura->estado !== Factura::ABANDONADA) {
            throw ValidationException::withMessages(['factura' => 'Só uma factura abandonada pode ser reaberta.']);
        }

        $factura->estado = Factura::VALIDADA;
        $factura->motivo_abandono = null;
        $factura->save();

        $this->registar($factura, 'reaberta', "Factura {$factura->numero} reaberta");

        return $factura;
    }

    public function apagar(Factura $factura): void
    {
        $this->garantirRascunho($factura);

        $ref = $factura->referencia();
        $cliente = $factura->terceiro?->nome;
        $factura->delete();

        activity('facturas')->event('deleted')->withProperties(['factura' => $ref, 'cliente' => $cliente])->log("Rascunho de factura {$ref} apagado");
    }

    /**
     * Regista um pagamento recebido para uma factura.
     *
     * @param  array{data: string, metodo: string, valor: string|float, numero_documento?: ?string, remetente?: ?string, comentario?: ?string}  $dados
     */
    public function registarPagamento(Factura $factura, array $dados, User $autor): Pagamento
    {
        return DB::transaction(function () use ($factura, $dados, $autor) {
            $factura = Factura::lockForUpdate()->findOrFail($factura->id);

            if ($factura->estado !== Factura::VALIDADA) {
                throw ValidationException::withMessages(['valor' => 'Só se registam pagamentos em facturas pendentes de cobrança.']);
            }

            $valor = Dinheiro::arredondar((string) $dados['valor']);
            if (bccomp($valor, '0', 2) <= 0) {
                throw ValidationException::withMessages(['valor' => 'O valor tem de ser maior do que zero.']);
            }
            if (bccomp($valor, $factura->emFalta(), 2) > 0) {
                throw ValidationException::withMessages(['valor' => 'O valor é maior do que o que falta pagar ('.number_format((float) $factura->emFalta(), 2, ',', ' ').' MT).']);
            }

            $pagamento = new Pagamento([
                'terceiro_id' => $factura->terceiro_id,
                'data' => $dados['data'],
                'metodo' => $dados['metodo'],
                'numero_documento' => $dados['numero_documento'] ?? null,
                'remetente' => $dados['remetente'] ?? null,
                'comentario' => $dados['comentario'] ?? null,
                'valor' => $valor,
            ]);
            $pagamento->numero = $this->numeracao->proximo('pagamento', (int) CarbonImmutable::parse($dados['data'])->format('Y'));
            $pagamento->criado_por = $autor->id;
            $pagamento->save();
            $pagamento->facturas()->attach($factura->id, ['valor' => $valor]);

            $factura->total_pago = bcadd((string) $factura->total_pago, $valor, 2);
            // Paga quando pagamentos + notas de crédito cobrem o total
            if (bccomp($factura->emFalta(), '0', 2) <= 0) {
                $factura->estado = Factura::PAGA;
            }
            $factura->save();

            $metodo = Opcoes::METODOS_PAGAMENTO[$pagamento->metodo] ?? $pagamento->metodo;
            $this->registar($factura, 'pagamento', "Pagamento {$pagamento->numero} de {$valor} MT ({$metodo})".($factura->estado === Factura::PAGA ? ' — factura paga' : ''));

            return $pagamento;
        });
    }

    public function calcularVencimento(\DateTimeInterface|string|null $data, ?string $termos): ?string
    {
        if ($data === null) {
            return null;
        }
        $dias = Opcoes::TERMOS_PAGAMENTO[$termos ?? 'pronto'][1] ?? 0;

        return CarbonImmutable::parse($data)->addDays($dias)->toDateString();
    }

    private function garantirRascunho(Factura $factura): void
    {
        if (! $factura->eRascunho()) {
            throw ValidationException::withMessages(['factura' => "A factura {$factura->referencia()} já foi validada e não pode ser alterada. Para corrigir, emita uma nota de crédito."]);
        }
    }

    private function garantirCliente(Terceiro $terceiro): void
    {
        if (! $terceiro->e_cliente) {
            throw ValidationException::withMessages(['terceiro_id' => "{$terceiro->nome} não está marcado como cliente."]);
        }
        if (! $terceiro->activo) {
            throw ValidationException::withMessages(['terceiro_id' => "{$terceiro->nome} está encerrado e não pode ser facturado."]);
        }
    }

    /** @param array<string, mixed> $extra */
    private function registar(Factura $factura, string $evento, string $descricao, array $extra = []): void
    {
        activity('facturas')
            ->performedOn($factura)
            ->event($evento)
            ->withProperties($extra)
            ->log($descricao);
    }
}
