<?php

namespace App\Http\Controllers\Concerns;

use App\Contracts\DocumentoComLinhas;
use App\Models\Factura;
use App\Models\Produto;
use App\Models\Terceiro;
use App\Support\Opcoes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Spatie\Activitylog\Models\Activity;

/** Dados repetidos pelas fichas de orçamentos, encomendas e facturas. */
trait DadosDocumento
{
    /** @return Collection<int, array<string, mixed>> */
    protected function clientesParaSelect(bool $comPotenciais = false): Collection
    {
        return Terceiro::query()
            ->where('activo', true)
            ->where(fn ($q) => $comPotenciais ? $q->where('e_cliente', true)->orWhere('e_potencial', true) : $q->where('e_cliente', true))
            ->orderBy('nome')
            ->get(['id', 'nome', 'codigo_cliente', 'termos_pagamento', 'metodo_pagamento', 'e_cliente'])
            ->map(fn (Terceiro $t) => [
                'id' => $t->id,
                'nome' => $t->nome,
                'codigo' => $t->codigo_cliente.($t->e_cliente ? '' : ' (potencial)'),
                'termos_pagamento' => $t->termos_pagamento,
                'metodo_pagamento' => $t->metodo_pagamento,
            ]);
    }

    /** Produtos que se vendem ou alugam; os de aluguer propõem o preço por dia */
    protected function produtosEmVenda(): Collection
    {
        return Produto::where(fn ($q) => $q->where('em_venda', true)->orWhere('em_aluguer', true))
            ->orderBy('referencia')
            ->get(['id', 'referencia', 'nome', 'preco', 'preco_aluguer', 'em_aluguer', 'taxa_iva', 'unidade', 'tipo'])
            ->map(fn (Produto $p) => [
                'id' => $p->id,
                'referencia' => $p->referencia,
                'nome' => $p->nome,
                'preco' => (string) $p->precoDocumento(),
                'taxa_iva' => (string) $p->taxa_iva,
                'unidade' => $p->unidade,
                'tipo' => $p->tipo,
            ]);
    }

    /** @return Collection<int, array<string, mixed>> Fornecedores activos, para os documentos de compra */
    protected function fornecedoresParaSelect(): Collection
    {
        return Terceiro::query()
            ->where('activo', true)
            ->where('e_fornecedor', true)
            ->orderBy('nome')
            ->get(['id', 'nome', 'codigo_fornecedor', 'termos_pagamento', 'metodo_pagamento'])
            ->map(fn (Terceiro $t) => [
                'id' => $t->id,
                'nome' => $t->nome,
                'codigo' => $t->codigo_fornecedor,
                'termos_pagamento' => $t->termos_pagamento,
                'metodo_pagamento' => $t->metodo_pagamento,
            ]);
    }

    /** Matérias-primas que se compram, com o preço de compra no lugar do preço (as linhas usam-no por omissão) */
    protected function produtosEmCompra(): Collection
    {
        return Produto::where('tipo', Produto::MATERIA)->where('em_compra', true)->orderBy('referencia')
            ->get(['id', 'referencia', 'nome', 'preco_compra', 'taxa_iva', 'unidade', 'tipo'])
            ->map(fn (Produto $p) => [
                'id' => $p->id,
                'referencia' => $p->referencia,
                'nome' => $p->nome,
                'preco' => (string) ($p->preco_compra ?? '0.00'),
                'taxa_iva' => (string) $p->taxa_iva,
                'unidade' => $p->unidade,
                'tipo' => $p->tipo,
            ]);
    }

    /** @return array<string, mixed> */
    protected function fornecedorResumo(Terceiro $t): array
    {
        return [...$this->terceiroResumo($t), 'codigo_fornecedor' => $t->codigo_fornecedor];
    }

    /** Últimos eventos da auditoria sobre o documento (separador "Eventos") */
    protected function eventos(Model $doc): Collection
    {
        return Activity::where('subject_type', $doc->getMorphClass())->where('subject_id', $doc->getKey())
            ->with('causer:id,name')->latest('id')->limit(15)->get()
            ->map(fn (Activity $a) => [
                'id' => $a->id,
                'data' => $a->created_at?->toIso8601String(),
                'descricao' => $a->description,
                'utilizador' => $a->causer?->name ?? 'Sistema',
            ]);
    }

    /** @return array<string, mixed> */
    protected function terceiroResumo(Terceiro $t): array
    {
        return [
            'id' => $t->id,
            'nome' => $t->nome,
            'codigo_cliente' => $t->codigo_cliente,
            'nuit' => $t->nuit,
            'morada' => $t->morada,
            'cidade' => $t->cidade,
            'provincia' => $t->provinciaNome(),
            'telefone' => $t->telefone,
            'telemovel' => $t->telemovel,
            'email' => $t->email,
        ];
    }

    /** @return array<string, mixed> Campos comuns do cabeçalho de um documento comercial */
    protected function cabecalho(Model&DocumentoComLinhas $d): array
    {
        return [
            'id' => $d->id,
            'referencia' => $d->referencia(),
            'numero' => $d->numero,
            'estado' => $d->estado,
            'data' => $d->data->toDateString(),
            'data_entrega' => $d->data_entrega?->toDateString(),
            'termos_pagamento' => $d->termos_pagamento,
            'termos_pagamento_nome' => Opcoes::TERMOS_PAGAMENTO[$d->termos_pagamento][0] ?? $d->termos_pagamento,
            'metodo_pagamento' => $d->metodo_pagamento,
            'metodo_pagamento_nome' => Opcoes::METODOS_PAGAMENTO[$d->metodo_pagamento] ?? null,
            'ref_cliente' => $d->ref_cliente,
            'nota_publica' => $d->nota_publica,
            'nota_privada' => $d->nota_privada,
            'total_sem_iva' => (string) $d->total_sem_iva,
            'total_iva' => (string) $d->total_iva,
            'total' => (string) $d->total,
            'terceiro' => $this->terceiroResumo($d->terceiro),
            'linhas' => $d->linhas->map->paraEcra()->values(),
        ];
    }

    /** @param iterable<Model&DocumentoComLinhas> $docs */
    protected function relacionados(string $tipo, iterable $docs): array
    {
        $lista = [];
        foreach ($docs as $d) {
            if ($d === null) {
                continue;
            }
            $lista[] = [
                'tipo' => $tipo,
                'id' => $d->id,
                'referencia' => $d->referencia(),
                // As reservas não têm data do documento: mostra-se a data do evento
                'data' => ($d->data ?? $d->data_evento)->toDateString(),
                'total_sem_iva' => (string) $d->total_sem_iva,
                'estado' => $d->estado,
            ];
        }

        return $lista;
    }

    /** @return array<string, mixed> Ficha da factura (ecrã e impressão; a área do cliente tira as notas internas) */
    protected function fichaFactura(Factura $f): array
    {
        return [
            'id' => $f->id,
            'referencia' => $f->referencia(),
            'numero' => $f->numero,
            'tipo' => $f->tipo,
            'estado' => $f->estado,
            'vencida' => $f->estaVencida(),
            'data' => $f->data->toDateString(),
            'data_vencimento' => $f->data_vencimento?->toDateString(),
            'termos_pagamento' => $f->termos_pagamento,
            'termos_pagamento_nome' => Opcoes::TERMOS_PAGAMENTO[$f->termos_pagamento][0] ?? $f->termos_pagamento,
            'metodo_pagamento' => $f->metodo_pagamento,
            'metodo_pagamento_nome' => Opcoes::METODOS_PAGAMENTO[$f->metodo_pagamento] ?? null,
            'ref_cliente' => $f->ref_cliente,
            'nota_publica' => $f->nota_publica,
            'nota_privada' => $f->nota_privada,
            'motivo_abandono' => $f->motivo_abandono,
            'total_sem_iva' => (string) $f->total_sem_iva,
            'total_iva' => (string) $f->total_iva,
            'total' => (string) $f->total,
            'total_pago' => (string) $f->total_pago,
            'total_creditado' => (string) $f->total_creditado,
            'em_falta' => $f->emFalta(),
            'validada_em' => $f->validada_em?->toIso8601String(),
            'validada_por' => $f->validadaPor?->name,
            'terceiro' => $this->terceiroResumo($f->terceiro),
            'linhas' => $f->linhas->map->paraEcra()->values(),
            // Factura de um aluguer: o período, para aparecer no documento
            'aluguer' => $f->reserva ? [
                'id' => $f->reserva->id,
                'numero' => $f->reserva->numero,
                'data_evento' => $f->reserva->data_evento->toDateString(),
                'data_fim_evento' => $f->reserva->data_fim_evento->toDateString(),
                'data_entrega' => $f->reserva->data_entrega->toDateString(),
                'data_recolha' => $f->reserva->data_recolha->toDateString(),
                'local' => $f->reserva->local,
            ] : null,
            'pagamentos' => $f->pagamentos->map(fn ($p) => [
                'id' => $p->id,
                'numero' => $p->numero,
                'data' => $p->data->toDateString(),
                'metodo' => $p->metodoNome(),
                'numero_documento' => $p->numero_documento,
                'valor' => (string) $p->pivot->valor,
            ])->values(),
        ];
    }
}
