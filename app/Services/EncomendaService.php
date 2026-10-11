<?php

namespace App\Services;

use App\Models\Encomenda;
use App\Models\Factura;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Encomendas de venda (ver docs/analise-dolibarr/04-comercio.md):
 * rascunho → validada (recebe EN2026/0001) → entregue; validada → anulada.
 * A marca "facturada" é independente do estado de entrega.
 */
class EncomendaService extends DocumentoComercialService
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
    public function criar(array $dados, User $autor): Encomenda
    {
        $cliente = $this->garantirTerceiro((int) $dados['terceiro_id'], aceitaPotencial: false);

        $e = new Encomenda([
            ...$dados,
            'termos_pagamento' => $dados['termos_pagamento'] ?? $cliente->termos_pagamento,
            'metodo_pagamento' => $dados['metodo_pagamento'] ?? $cliente->metodo_pagamento,
        ]);
        $e->estado = Encomenda::RASCUNHO;
        $e->criado_por = $autor->id;
        $e->save();

        $this->registar($e, 'created', 'Encomenda criada (rascunho)');

        return $e;
    }

    /** @param array<string, mixed> $dados */
    public function actualizarCabecalho(Encomenda $e, array $dados): Encomenda
    {
        $this->garantirRascunho($e);
        if ((int) $dados['terceiro_id'] !== $e->terceiro_id) {
            $this->garantirTerceiro((int) $dados['terceiro_id'], aceitaPotencial: false);
        }
        $e->fill($dados)->save();

        return $e;
    }

    public function validar(Encomenda $e, User $quem): Encomenda
    {
        $this->garantirRascunho($e);
        $this->garantirLinhas($e);

        return DB::transaction(function () use ($e, $quem) {
            $e = Encomenda::lockForUpdate()->findOrFail($e->id);
            $this->garantirRascunho($e);

            $e->numero ??= $this->numeracao->proximo('encomenda', (int) $e->data->format('Y'));
            $e->estado = Encomenda::VALIDADA;
            $e->validada_em = now();
            $e->validada_por = $quem->id;
            $e->save();

            $this->registar($e, 'validada', "Encomenda {$e->numero} validada");

            return $e;
        });
    }

    public function voltarARascunho(Encomenda $e): Encomenda
    {
        $this->garantirEstado($e, [Encomenda::VALIDADA], 'Só uma encomenda validada pode voltar a rascunho.');
        if ($e->facturada) {
            throw ValidationException::withMessages(['encomenda' => 'A encomenda já foi facturada e não pode ser alterada.']);
        }
        $e->estado = Encomenda::RASCUNHO;
        $e->save();
        $this->registar($e, 'rascunho', "Encomenda {$e->numero} voltou a rascunho");

        return $e;
    }

    public function entregar(Encomenda $e): Encomenda
    {
        $this->garantirEstado($e, [Encomenda::VALIDADA], 'Só uma encomenda validada pode ser classificada como entregue.');
        $e->estado = Encomenda::ENTREGUE;
        $e->entregue_em = now();
        $e->save();
        $this->registar($e, 'entregue', "Encomenda {$e->numero} entregue");

        return $e;
    }

    public function anular(Encomenda $e): Encomenda
    {
        $this->garantirEstado($e, [Encomenda::VALIDADA], 'Só uma encomenda validada (ainda não entregue) pode ser anulada.');
        if ($e->facturada) {
            throw ValidationException::withMessages(['encomenda' => 'A encomenda já foi facturada; anule primeiro a factura com uma nota de crédito.']);
        }
        $e->estado = Encomenda::ANULADA;
        $e->save();
        $this->registar($e, 'anulada', "Encomenda {$e->numero} anulada");

        return $e;
    }

    public function reabrir(Encomenda $e): Encomenda
    {
        $this->garantirEstado($e, [Encomenda::ENTREGUE, Encomenda::ANULADA], 'Só uma encomenda entregue ou anulada pode ser reaberta.');
        $e->estado = Encomenda::VALIDADA;
        $e->entregue_em = null;
        $e->save();
        $this->registar($e, 'reaberta', "Encomenda {$e->numero} reaberta");

        return $e;
    }

    public function classificarFacturada(Encomenda $e): Encomenda
    {
        $this->garantirEstado($e, [Encomenda::VALIDADA, Encomenda::ENTREGUE], 'Só uma encomenda validada ou entregue pode ser classificada como facturada.');
        $e->facturada = true;
        $e->save();
        $this->registar($e, 'facturada', "Encomenda {$e->numero} classificada como facturada");

        return $e;
    }

    public function apagar(Encomenda $e): void
    {
        $this->garantirRascunho($e);
        if ($e->numero !== null) {
            throw ValidationException::withMessages(['encomenda' => "A encomenda {$e->numero} já teve número e não pode ser apagada. Anule-a em vez disso."]);
        }
        $ref = $e->referencia();
        $e->delete();
        activity('comercial')->event('deleted')->withProperties(['documento' => $ref])->log("Rascunho de encomenda {$ref} apagado");
    }

    public function criarFactura(Encomenda $e, User $autor): Factura
    {
        $this->garantirEstado($e, [Encomenda::VALIDADA, Encomenda::ENTREGUE], 'Só se cria factura a partir de uma encomenda validada ou entregue.');
        if ($e->facturada) {
            throw ValidationException::withMessages(['encomenda' => 'Esta encomenda já foi facturada.']);
        }
        $factura = app(FacturaService::class)->criarAPartirDe($e, $autor);
        $this->registar($e, 'factura', "Factura {$factura->referencia()} criada a partir da encomenda {$e->numero}");

        return $factura;
    }
}
