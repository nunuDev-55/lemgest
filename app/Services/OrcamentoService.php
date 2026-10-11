<?php

namespace App\Services;

use App\Models\Factura;
use App\Models\Orcamento;
use App\Models\Reserva;
use App\Models\User;
use App\Support\Definicoes;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Orçamentos (ver docs/analise-dolibarr/04-comercio.md):
 * rascunho → aberto (recebe OR2026/0001) → assinado ou não assinado; assinado → encomenda/factura → facturado.
 */
class OrcamentoService extends DocumentoComercialService
{
    protected function chave(): string
    {
        return 'orcamento';
    }

    protected function nome(): string
    {
        return 'orçamento';
    }

    /** @param array<string, mixed> $dados */
    public function criar(array $dados, User $autor): Orcamento
    {
        $cliente = $this->garantirTerceiro((int) $dados['terceiro_id'], aceitaPotencial: true);

        $o = new Orcamento([
            ...$dados,
            'termos_pagamento' => $dados['termos_pagamento'] ?? $cliente->termos_pagamento,
            'metodo_pagamento' => $dados['metodo_pagamento'] ?? $cliente->metodo_pagamento,
            'validade_dias' => $dados['validade_dias'] ?? app(Definicoes::class)->validadeOrcamento(),
        ]);
        $o->estado = Orcamento::RASCUNHO;
        $o->criado_por = $autor->id;
        $o->data_fim_validade = $this->fimValidade($o);
        $o->save();

        $this->registar($o, 'created', 'Orçamento criado (rascunho)');

        return $o;
    }

    /** @param array<string, mixed> $dados */
    public function actualizarCabecalho(Orcamento $o, array $dados): Orcamento
    {
        $this->garantirRascunho($o);
        if ((int) $dados['terceiro_id'] !== $o->terceiro_id) {
            $this->garantirTerceiro((int) $dados['terceiro_id'], aceitaPotencial: true);
        }
        $o->fill($dados);
        $o->data_fim_validade = $this->fimValidade($o);
        $o->save();

        return $o;
    }

    public function validar(Orcamento $o, User $quem): Orcamento
    {
        $this->garantirRascunho($o);
        $this->garantirLinhas($o);

        return DB::transaction(function () use ($o, $quem) {
            $o = Orcamento::lockForUpdate()->findOrFail($o->id);
            $this->garantirRascunho($o);

            // Um orçamento que voltou a rascunho com "Modificar" mantém o número que já tinha
            $o->numero ??= $this->numeracao->proximo('orcamento', (int) $o->data->format('Y'));
            $o->estado = Orcamento::ABERTO;
            $o->validado_em = now();
            $o->validado_por = $quem->id;
            $o->data_fim_validade = $this->fimValidade($o);
            $o->save();

            $this->registar($o, 'validado', "Orçamento {$o->numero} validado");

            return $o;
        });
    }

    /** "Modificar" num orçamento aberto: volta a rascunho para se poder alterar. */
    public function voltarARascunho(Orcamento $o): Orcamento
    {
        $this->garantirEstado($o, [Orcamento::ABERTO], 'Só um orçamento aberto pode voltar a rascunho.');
        $o->estado = Orcamento::RASCUNHO;
        $o->save();
        $this->registar($o, 'rascunho', "Orçamento {$o->numero} voltou a rascunho");

        return $o;
    }

    /** Fechar: assinado pelo cliente (aceite) ou não assinado (recusado). */
    public function fechar(Orcamento $o, bool $assinado, ?string $nota): Orcamento
    {
        $this->garantirEstado($o, [Orcamento::ABERTO], 'Só um orçamento aberto pode ser fechado como assinado ou não assinado.');
        $o->estado = $assinado ? Orcamento::ASSINADO : Orcamento::RECUSADO;
        $o->nota_fecho = $nota;
        $o->fechado_em = now();
        $o->save();
        $this->registar($o, $assinado ? 'assinado' : 'recusado', $assinado ? "Orçamento {$o->numero} assinado pelo cliente" : "Orçamento {$o->numero} não assinado", ['nota' => $nota]);

        return $o;
    }

    public function reabrir(Orcamento $o): Orcamento
    {
        $this->garantirEstado($o, [Orcamento::ASSINADO, Orcamento::RECUSADO], 'Só um orçamento assinado ou não assinado pode ser reaberto.');
        $o->estado = Orcamento::ABERTO;
        $o->nota_fecho = null;
        $o->fechado_em = null;
        $o->save();
        $this->registar($o, 'reaberto', "Orçamento {$o->numero} reaberto");

        return $o;
    }

    public function classificarFacturado(Orcamento $o): Orcamento
    {
        $this->garantirEstado($o, [Orcamento::ASSINADO], 'Só um orçamento assinado pode ser classificado como facturado.');
        $o->estado = Orcamento::FACTURADO;
        $o->save();
        $this->registar($o, 'facturado', "Orçamento {$o->numero} classificado como facturado");

        return $o;
    }

    public function apagar(Orcamento $o): void
    {
        $this->garantirRascunho($o);
        if ($o->numero !== null) {
            throw ValidationException::withMessages(['orcamento' => "O orçamento {$o->numero} já teve número e não pode ser apagado (a numeração não pode ter falhas). Feche-o como não assinado."]);
        }
        $ref = $o->referencia();
        $o->delete();
        activity('comercial')->event('deleted')->withProperties(['documento' => $ref])->log("Rascunho de orçamento {$ref} apagado");
    }

    /** @param array<string, mixed> $datas */
    public function criarReserva(Orcamento $o, array $datas, User $autor): Reserva
    {
        $this->garantirEstado($o, [Orcamento::ASSINADO], 'Só se cria a reserva a partir de um orçamento assinado (aceite pelo cliente).');
        $r = app(ReservaService::class)->criarAPartirDe($o, $datas, $autor);
        $this->registar($o, 'reserva', "Reserva {$r->numero} criada a partir do orçamento {$o->numero}");

        return $r;
    }

    public function criarFactura(Orcamento $o, User $autor): Factura
    {
        $this->garantirEstado($o, [Orcamento::ASSINADO], 'Só se cria factura a partir de um orçamento assinado.');
        $factura = app(FacturaService::class)->criarAPartirDe($o, $autor);
        $this->registar($o, 'factura', "Factura {$factura->referencia()} criada a partir do orçamento {$o->numero}");

        return $factura;
    }

    private function fimValidade(Orcamento $o): ?string
    {
        return $o->data ? CarbonImmutable::parse($o->data)->addDays((int) $o->validade_dias)->toDateString() : null;
    }
}
