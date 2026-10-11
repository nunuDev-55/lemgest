<?php

namespace App\Services;

use App\Models\EncomendaFornecedor;
use App\Models\FacturaFornecedor;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Encomendas a fornecedores (ver docs/analise-dolibarr/07-compras.md):
 * rascunho → validada (EF2026/0001) → encomendada → recebida; validada/encomendada → anulada.
 */
class EncomendaFornecedorService extends DocumentoCompraService
{
    protected function chave(): string
    {
        return 'encomenda';
    }

    protected function nome(): string
    {
        return 'encomenda';
    }

    /** @param array<string, mixed> $dados */
    public function criar(array $dados, User $autor): EncomendaFornecedor
    {
        $fornecedor = $this->garantirFornecedor((int) $dados['terceiro_id']);

        $e = new EncomendaFornecedor([
            ...$dados,
            'termos_pagamento' => $dados['termos_pagamento'] ?? $fornecedor->termos_pagamento,
            'metodo_pagamento' => $dados['metodo_pagamento'] ?? $fornecedor->metodo_pagamento,
        ]);
        $e->estado = EncomendaFornecedor::RASCUNHO;
        $e->criado_por = $autor->id;
        $e->save();

        $this->registar($e, 'created', "Encomenda a fornecedor criada (rascunho) — {$fornecedor->nome}");

        return $e;
    }

    /** @param array<string, mixed> $dados */
    public function actualizarCabecalho(EncomendaFornecedor $e, array $dados): EncomendaFornecedor
    {
        $this->garantirRascunho($e);
        if ((int) $dados['terceiro_id'] !== $e->terceiro_id) {
            $this->garantirFornecedor((int) $dados['terceiro_id']);
        }
        $e->fill($dados)->save();

        return $e;
    }

    public function validar(EncomendaFornecedor $e, User $quem): EncomendaFornecedor
    {
        $this->garantirRascunho($e);
        $this->garantirLinhas($e);

        return DB::transaction(function () use ($e, $quem) {
            $e = EncomendaFornecedor::lockForUpdate()->findOrFail($e->id);
            $this->garantirRascunho($e);

            // Uma encomenda que voltou a rascunho mantém o número
            $e->numero ??= $this->numeracao->proximo('encomenda_fornecedor', (int) $e->data->format('Y'));
            $e->estado = EncomendaFornecedor::VALIDADA;
            $e->validada_em = now();
            $e->validada_por = $quem->id;
            $e->save();

            $this->registar($e, 'validada', "Encomenda a fornecedor {$e->numero} validada");

            return $e;
        });
    }

    public function voltarARascunho(EncomendaFornecedor $e): EncomendaFornecedor
    {
        $this->garantirEstado($e, [EncomendaFornecedor::VALIDADA], 'Só uma encomenda validada (ainda não enviada ao fornecedor) pode voltar a rascunho.');
        $e->estado = EncomendaFornecedor::RASCUNHO;
        $e->save();
        $this->registar($e, 'rascunho', "Encomenda a fornecedor {$e->numero} voltou a rascunho");

        return $e;
    }

    /** "Encomendar": regista que a encomenda foi enviada ao fornecedor, quando e como. */
    public function encomendar(EncomendaFornecedor $e, string $data, string $meio): EncomendaFornecedor
    {
        $this->garantirEstado($e, [EncomendaFornecedor::VALIDADA], 'Só uma encomenda validada pode ser enviada ao fornecedor.');
        $e->estado = EncomendaFornecedor::ENCOMENDADA;
        $e->encomendada_em = $data;
        $e->meio_encomenda = $meio;
        $e->save();
        $meioNome = EncomendaFornecedor::MEIOS[$meio] ?? $meio;
        $this->registar($e, 'encomendada', "Encomenda {$e->numero} enviada ao fornecedor ({$meioNome})");

        return $e;
    }

    /** Recebida: os produtos das linhas dão entrada em stock. Devolve o número de peças que entraram. */
    public function receber(EncomendaFornecedor $e, ?User $quem = null): int
    {
        $this->garantirEstado($e, [EncomendaFornecedor::ENCOMENDADA], 'Só uma encomenda já enviada ao fornecedor pode ser classificada como recebida.');

        return $this->comErrosDeStock(fn () => DB::transaction(function () use ($e, $quem) {
            $e->estado = EncomendaFornecedor::RECEBIDA;
            $e->recebida_em = now();
            $e->save();
            $pecas = app(Stock::class)->receberEncomenda($e, $quem ?? auth()->user());
            $this->registar($e, 'recebida', "Encomenda {$e->numero} recebida".($pecas > 0 ? " ({$pecas} peça(s) entraram em stock)" : ''));

            return $pecas;
        }));
    }

    public function anular(EncomendaFornecedor $e): EncomendaFornecedor
    {
        $this->garantirEstado($e, [EncomendaFornecedor::VALIDADA, EncomendaFornecedor::ENCOMENDADA], 'Só uma encomenda validada ou encomendada (ainda não recebida) pode ser anulada.');
        if ($e->facturada) {
            throw ValidationException::withMessages(['encomenda' => 'A encomenda já tem factura do fornecedor e não pode ser anulada.']);
        }
        $e->estado = EncomendaFornecedor::ANULADA;
        $e->save();
        $this->registar($e, 'anulada', "Encomenda a fornecedor {$e->numero} anulada");

        return $e;
    }

    /** Recebida volta a encomendada (e as entradas em stock são anuladas); anulada volta a validada */
    public function reabrir(EncomendaFornecedor $e, ?User $quem = null): EncomendaFornecedor
    {
        $this->garantirEstado($e, [EncomendaFornecedor::RECEBIDA, EncomendaFornecedor::ANULADA], 'Só uma encomenda recebida ou anulada pode ser reaberta.');

        return $this->comErrosDeStock(fn () => DB::transaction(function () use ($e, $quem) {
            if ($e->estado === EncomendaFornecedor::RECEBIDA) {
                app(Stock::class)->anularRecepcao($e, $quem ?? auth()->user());
                $e->estado = EncomendaFornecedor::ENCOMENDADA;
                $e->recebida_em = null;
            } else {
                $e->estado = $e->encomendada_em ? EncomendaFornecedor::ENCOMENDADA : EncomendaFornecedor::VALIDADA;
            }
            $e->save();
            $this->registar($e, 'reaberta', "Encomenda a fornecedor {$e->numero} reaberta");

            return $e;
        }));
    }

    /**
     * As regras do stock respondem no campo "stock"; a ficha da encomenda mostra os erros do campo "encomenda".
     *
     * @template T
     *
     * @param  callable(): T  $accao
     * @return T
     */
    private function comErrosDeStock(callable $accao): mixed
    {
        try {
            return $accao();
        } catch (ValidationException $erro) {
            $mensagens = $erro->errors();
            if (! isset($mensagens['stock'])) {
                throw $erro;
            }
            throw ValidationException::withMessages(['encomenda' => $mensagens['stock'][0]]);
        }
    }

    public function classificarFacturada(EncomendaFornecedor $e): EncomendaFornecedor
    {
        $this->garantirEstado($e, [EncomendaFornecedor::ENCOMENDADA, EncomendaFornecedor::RECEBIDA], 'Só uma encomenda encomendada ou recebida pode ser classificada como facturada.');
        $e->facturada = true;
        $e->save();
        $this->registar($e, 'facturada', "Encomenda a fornecedor {$e->numero} classificada como facturada");

        return $e;
    }

    public function apagar(EncomendaFornecedor $e): void
    {
        $this->garantirRascunho($e);
        if ($e->numero !== null) {
            throw ValidationException::withMessages(['encomenda' => "A encomenda {$e->numero} já teve número e não pode ser apagada. Anule-a em vez disso."]);
        }
        $ref = $e->referencia();
        $e->delete();
        activity('compras')->event('deleted')->withProperties(['documento' => $ref])->log("Rascunho de encomenda a fornecedor {$ref} apagado");
    }

    /** "Criar factura": rascunho de factura de fornecedor com as mesmas linhas */
    public function criarFactura(EncomendaFornecedor $e, string $refFornecedor, User $autor): FacturaFornecedor
    {
        $this->garantirEstado($e, [EncomendaFornecedor::ENCOMENDADA, EncomendaFornecedor::RECEBIDA], 'Só se lança a factura de uma encomenda já enviada ao fornecedor.');
        if ($e->facturada) {
            throw ValidationException::withMessages(['encomenda' => 'Esta encomenda já tem factura do fornecedor.']);
        }
        $factura = app(FacturaFornecedorService::class)->criarAPartirDe($e, $refFornecedor, $autor);
        $this->registar($e, 'factura', "Factura de fornecedor {$factura->referencia()} criada a partir da encomenda {$e->numero}");

        return $factura;
    }
}
