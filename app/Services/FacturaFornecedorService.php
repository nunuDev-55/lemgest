<?php

namespace App\Services;

use App\Models\EncomendaFornecedor;
use App\Models\FacturaFornecedor;
use App\Models\PagamentoFornecedor;
use App\Models\User;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Facturas de fornecedores (ver docs/analise-dolibarr/07-compras.md):
 *
 * 1. Lançada em rascunho com o número da factura do fornecedor (único por fornecedor).
 * 2. Ao validar recebe o número interno FF2026/0001 e o vencimento pelos termos de pagamento.
 * 3. Pagamentos parciais ou totais (PF2026/0001); pago o total, passa a "Paga".
 * 4. Validada sem pagamentos pode ser abandonada (com motivo) e reaberta.
 */
class FacturaFornecedorService extends DocumentoCompraService
{
    protected function chave(): string
    {
        return 'factura';
    }

    protected function nome(): string
    {
        return 'factura de fornecedor';
    }

    /** @param array<string, mixed> $dados */
    public function criar(array $dados, User $autor): FacturaFornecedor
    {
        $fornecedor = $this->garantirFornecedor((int) $dados['terceiro_id']);

        $f = new FacturaFornecedor([
            ...$dados,
            'termos_pagamento' => $dados['termos_pagamento'] ?? $fornecedor->termos_pagamento,
            'metodo_pagamento' => $dados['metodo_pagamento'] ?? $fornecedor->metodo_pagamento,
        ]);
        $f->estado = FacturaFornecedor::RASCUNHO;
        $f->criado_por = $autor->id;
        $f->data_vencimento = $this->vencimento($f);
        $f->save();

        $this->registar($f, 'created', "Factura de fornecedor {$f->ref_fornecedor} lançada (rascunho) — {$fornecedor->nome}");

        return $f;
    }

    public function criarAPartirDe(EncomendaFornecedor $e, string $refFornecedor, User $autor): FacturaFornecedor
    {
        return DB::transaction(function () use ($e, $refFornecedor, $autor) {
            $f = $this->criar([
                'terceiro_id' => $e->terceiro_id,
                'ref_fornecedor' => $refFornecedor,
                'data' => now()->toDateString(),
                'termos_pagamento' => $e->termos_pagamento,
                'metodo_pagamento' => $e->metodo_pagamento,
            ], $autor);
            $f->encomenda_fornecedor_id = $e->id;
            $f->save();
            $this->linhas->copiar($e, $f);

            return $f;
        });
    }

    /** @param array<string, mixed> $dados */
    public function actualizarCabecalho(FacturaFornecedor $f, array $dados): FacturaFornecedor
    {
        $this->garantirRascunho($f);
        if ((int) $dados['terceiro_id'] !== $f->terceiro_id) {
            $this->garantirFornecedor((int) $dados['terceiro_id']);
        }
        $f->fill($dados);
        $f->data_vencimento = $this->vencimento($f);
        $f->save();

        return $f;
    }

    public function validar(FacturaFornecedor $f, User $quem): FacturaFornecedor
    {
        $this->garantirRascunho($f);
        $this->garantirLinhas($f);
        if (bccomp((string) $f->total, '0', 2) <= 0) {
            throw ValidationException::withMessages(['factura' => 'O total da factura tem de ser maior do que zero.']);
        }

        return DB::transaction(function () use ($f, $quem) {
            $f = FacturaFornecedor::lockForUpdate()->findOrFail($f->id);
            $this->garantirRascunho($f);

            $f->numero = $this->numeracao->proximo('factura_fornecedor', (int) $f->data->format('Y'));
            $f->estado = FacturaFornecedor::VALIDADA;
            $f->validada_em = now();
            $f->validada_por = $quem->id;
            $f->data_vencimento = $this->vencimento($f);
            $f->save();

            if ($f->encomenda_fornecedor_id !== null) {
                EncomendaFornecedor::whereKey($f->encomenda_fornecedor_id)->update(['facturada' => true]);
            }

            $this->registar($f, 'validada', "Factura de fornecedor {$f->numero} (nº do fornecedor {$f->ref_fornecedor}) validada");

            return $f;
        });
    }

    public function abandonar(FacturaFornecedor $f, string $motivo): FacturaFornecedor
    {
        $this->garantirEstado($f, [FacturaFornecedor::VALIDADA], 'Só uma factura por pagar pode ser abandonada.');
        if (bccomp((string) $f->total_pago, '0', 2) > 0) {
            throw ValidationException::withMessages(['factura' => 'Esta factura já tem pagamentos e não pode ser abandonada.']);
        }
        $f->estado = FacturaFornecedor::ABANDONADA;
        $f->motivo_abandono = $motivo;
        $f->save();
        $this->registar($f, 'abandonada', "Factura de fornecedor {$f->numero} classificada como abandonada", ['motivo' => $motivo]);

        return $f;
    }

    public function reabrir(FacturaFornecedor $f): FacturaFornecedor
    {
        $this->garantirEstado($f, [FacturaFornecedor::ABANDONADA], 'Só uma factura abandonada pode ser reaberta.');
        $f->estado = FacturaFornecedor::VALIDADA;
        $f->motivo_abandono = null;
        $f->save();
        $this->registar($f, 'reaberta', "Factura de fornecedor {$f->numero} reaberta");

        return $f;
    }

    public function apagar(FacturaFornecedor $f): void
    {
        $this->garantirRascunho($f);
        $ref = $f->referencia();
        $f->delete();
        activity('compras')->event('deleted')->withProperties(['documento' => $ref])->log("Rascunho de factura de fornecedor {$ref} apagado");
    }

    /**
     * Pagamento feito ao fornecedor.
     *
     * @param  array{data: string, metodo: string, valor: string|float, numero_documento?: ?string, comentario?: ?string}  $dados
     */
    public function registarPagamento(FacturaFornecedor $f, array $dados, User $autor): PagamentoFornecedor
    {
        return DB::transaction(function () use ($f, $dados, $autor) {
            $f = FacturaFornecedor::lockForUpdate()->findOrFail($f->id);
            $this->garantirEstado($f, [FacturaFornecedor::VALIDADA], 'Só se registam pagamentos em facturas de fornecedor por pagar.');

            $valor = Dinheiro::arredondar((string) $dados['valor']);
            if (bccomp($valor, '0', 2) <= 0) {
                throw ValidationException::withMessages(['valor' => 'O valor tem de ser maior do que zero.']);
            }
            if (bccomp($valor, $f->emFalta(), 2) > 0) {
                throw ValidationException::withMessages(['valor' => 'O valor é maior do que o que falta pagar ('.number_format((float) $f->emFalta(), 2, ',', ' ').' MT).']);
            }

            $p = new PagamentoFornecedor([
                'terceiro_id' => $f->terceiro_id,
                'data' => $dados['data'],
                'metodo' => $dados['metodo'],
                'numero_documento' => $dados['numero_documento'] ?? null,
                'comentario' => $dados['comentario'] ?? null,
                'valor' => $valor,
            ]);
            $p->numero = $this->numeracao->proximo('pagamento_fornecedor', (int) CarbonImmutable::parse($dados['data'])->format('Y'));
            $p->criado_por = $autor->id;
            $p->save();
            $p->facturas()->attach($f->id, ['valor' => $valor]);

            $f->total_pago = bcadd((string) $f->total_pago, $valor, 2);
            if (bccomp($f->emFalta(), '0', 2) <= 0) {
                $f->estado = FacturaFornecedor::PAGA;
            }
            $f->save();

            $metodo = Opcoes::METODOS_PAGAMENTO[$p->metodo] ?? $p->metodo;
            $this->registar($f, 'pagamento', "Pagamento {$p->numero} de {$valor} MT ao fornecedor ({$metodo})".($f->estado === FacturaFornecedor::PAGA ? ' — factura paga' : ''));

            return $p;
        });
    }

    private function vencimento(FacturaFornecedor $f): ?string
    {
        return app(FacturaService::class)->calcularVencimento($f->data, $f->termos_pagamento);
    }
}
