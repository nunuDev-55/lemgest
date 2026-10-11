<?php

namespace App\Http\Controllers\Comercial;

use App\Http\Controllers\Controller;
use App\Http\Requests\Comercial\GuardarTerceiroRequest;
use App\Models\Contacto;
use App\Models\EncomendaFornecedor;
use App\Models\Factura;
use App\Models\FacturaFornecedor;
use App\Models\NotaCredito;
use App\Models\Orcamento;
use App\Models\Reserva;
use App\Models\Terceiro;
use App\Services\TerceiroService;
use App\Support\Dinheiro;
use App\Support\Opcoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TerceiroController extends Controller
{
    public function __construct(private readonly TerceiroService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'natureza' => ['nullable', 'in:clientes,potenciais,fornecedores'],
            'nome' => ['nullable', 'string', 'max:100'],
            'codigo' => ['nullable', 'string', 'max:30'],
            'cidade' => ['nullable', 'string', 'max:100'],
            'nuit' => ['nullable', 'string', 'max:20'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'estado' => ['nullable', 'in:activos,encerrados'],
        ]);

        $query = Terceiro::query()
            ->when($filtros['natureza'] ?? null, fn ($q, $n) => $q->where(match ($n) {
                'clientes' => 'e_cliente', 'potenciais' => 'e_potencial', default => 'e_fornecedor',
            }, true))
            ->when($filtros['nome'] ?? null, fn ($q, $t) => $q->where(fn ($q) => $q->where('nome', 'like', Pesquisa::like($t))->orWhere('nome_alternativo', 'like', Pesquisa::like($t))))
            ->when($filtros['codigo'] ?? null, fn ($q, $t) => $q->where(fn ($q) => $q->where('codigo_cliente', 'like', Pesquisa::like($t))->orWhere('codigo_fornecedor', 'like', Pesquisa::like($t))))
            ->when($filtros['cidade'] ?? null, fn ($q, $t) => $q->where('cidade', 'like', Pesquisa::like($t)))
            ->when($filtros['nuit'] ?? null, fn ($q, $t) => $q->where('nuit', 'like', Pesquisa::like($t)))
            ->when($filtros['telefone'] ?? null, fn ($q, $t) => $q->where(fn ($q) => $q->where('telefone', 'like', Pesquisa::like($t))->orWhere('telemovel', 'like', Pesquisa::like($t))))
            ->when($filtros['estado'] ?? null, fn ($q, $e) => $q->where('activo', $e === 'activos'));

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'nome' => 'nome', 'codigo' => 'codigo_cliente', 'cidade' => 'cidade', 'nuit' => 'nuit', 'criado' => 'created_at',
        ], 'nome');

        $terceiros = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (Terceiro $t) => [
            'id' => $t->id,
            'nome' => $t->nome,
            'nome_alternativo' => $t->nome_alternativo,
            'codigo_cliente' => $t->codigo_cliente,
            'codigo_fornecedor' => $t->codigo_fornecedor,
            'cidade' => $t->cidade,
            'provincia' => $t->provinciaNome(),
            'telefone' => $t->telefone ?: $t->telemovel,
            'nuit' => $t->nuit,
            'natureza' => $t->natureza(),
            'activo' => $t->activo,
        ]);

        return Inertia::render('terceiros/index', [
            'terceiros' => $terceiros,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
        ]);
    }

    public function create(Request $request): Response
    {
        $natureza = $request->query('natureza');

        return Inertia::render('terceiros/formulario', [
            'terceiro' => null,
            'predefinido' => [
                'e_cliente' => $natureza === 'cliente' || $natureza === null,
                'e_potencial' => $natureza === 'potencial',
                'e_fornecedor' => $natureza === 'fornecedor',
            ],
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function store(GuardarTerceiroRequest $request): RedirectResponse
    {
        $terceiro = $this->service->criar($request->validated(), $request->user());

        return to_route('terceiros.show', $terceiro)->with('sucesso', "Terceiro {$terceiro->nome} criado.");
    }

    public function show(Request $request, Terceiro $terceiro): Response
    {
        $facturas = $terceiro->facturas()->latest('data')->latest('id')->limit(10)->get();

        return Inertia::render('terceiros/mostrar', [
            'terceiro' => [
                ...$terceiro->only([
                    'id', 'nome', 'nome_alternativo', 'e_cliente', 'e_potencial', 'e_fornecedor', 'codigo_cliente', 'codigo_fornecedor',
                    'nuit', 'sujeito_iva', 'morada', 'codigo_postal', 'cidade', 'telefone', 'telemovel', 'email', 'website',
                    'nota_publica', 'nota_privada', 'activo',
                ]),
                'tipo_entidade' => Opcoes::TIPOS_ENTIDADE[$terceiro->tipo_entidade] ?? null,
                'provincia' => $terceiro->provinciaNome(),
                'pais' => Opcoes::PAISES[$terceiro->pais] ?? $terceiro->pais,
                'termos_pagamento' => Opcoes::TERMOS_PAGAMENTO[$terceiro->termos_pagamento][0] ?? $terceiro->termos_pagamento,
                'metodo_pagamento' => Opcoes::METODOS_PAGAMENTO[$terceiro->metodo_pagamento] ?? null,
                'natureza' => $terceiro->natureza(),
                'criado_em' => $terceiro->created_at?->toIso8601String(),
            ],
            'resumo' => [
                // Facturado líquido: facturas validadas menos as notas de crédito validadas
                'facturado' => bcsub(
                    Dinheiro::normalizar($terceiro->facturas()->whereIn('estado', [Factura::VALIDADA, Factura::PAGA])->sum('total_sem_iva')),
                    Dinheiro::normalizar(NotaCredito::where('terceiro_id', $terceiro->id)->where('estado', '!=', NotaCredito::RASCUNHO)->sum('total_sem_iva')),
                    2,
                ),
                'por_receber' => Dinheiro::normalizar($terceiro->facturas()->where('estado', Factura::VALIDADA)->selectRaw('COALESCE(SUM('.Factura::SQL_EM_FALTA.'), 0) as v')->value('v')),
                'numero_facturas' => $terceiro->facturas()->count(),
                // Valor em orçamentos abertos/assinados e em reservas em curso (pedidas, confirmadas ou entregues)
                'orcamentos' => Dinheiro::normalizar($terceiro->orcamentos()->whereIn('estado', [Orcamento::ABERTO, Orcamento::ASSINADO])->sum('total_sem_iva')),
                'reservas' => Dinheiro::normalizar($terceiro->reservas()->whereIn('estado', [Reserva::PEDIDO, Reserva::CONFIRMADA, Reserva::ENTREGUE])->sum('total_sem_iva')),
            ],
            'facturas' => $facturas->map(fn (Factura $f) => [
                'id' => $f->id,
                'referencia' => $f->referencia(),
                'data' => $f->data->toDateString(),
                'total' => (string) $f->total,
                'estado' => $f->estado,
                'vencida' => $f->estaVencida(),
            ]),
            'orcamentos' => $terceiro->orcamentos()->latest('data')->latest('id')->limit(5)->get()->map(fn (Orcamento $o) => [
                'id' => $o->id, 'referencia' => $o->referencia(), 'data' => $o->data->toDateString(), 'total' => (string) $o->total,
                'estado' => $o->estado, 'expirado' => $o->expirado(),
            ]),
            'reservas' => $request->user()->can('reservas.ver')
                ? $terceiro->reservas()->latest('data_evento')->latest('id')->limit(5)->get()->map(fn (Reserva $r) => [
                    'id' => $r->id, 'referencia' => $r->numero, 'data' => $r->data_evento->toDateString(), 'total' => (string) $r->total,
                    'estado' => $r->estado, 'atrasada' => $r->recolhaAtrasada(),
                ])
                : [],
            'contasLoja' => $request->user()->can('terceiros.contas')
                ? $terceiro->contasCliente()->get(['id', 'email', 'estado', 'ultimo_acesso_em'])->map(fn ($c) => [
                    'email' => $c->email, 'estado' => $c->estado, 'ultimo_acesso_em' => $c->ultimo_acesso_em?->toIso8601String(),
                ])
                : [],
            'contactos' => $terceiro->contactos()->get()->map(fn (Contacto $c) => $c->only(['id', 'nome', 'cargo', 'telefone', 'telemovel', 'email', 'nota', 'activo'])),
            // Separador "Fornecedor" (como no Dolibarr), só para quem vê as compras
            'fornecedor' => $terceiro->e_fornecedor && $request->user()->can('compras.ver') ? $this->dadosFornecedor($terceiro) : null,
        ]);
    }

    /** @return array<string, mixed> */
    private function dadosFornecedor(Terceiro $t): array
    {
        return [
            'resumo' => [
                'encomendas_abertas' => Dinheiro::normalizar($t->encomendasFornecedor()
                    ->whereIn('estado', [EncomendaFornecedor::VALIDADA, EncomendaFornecedor::ENCOMENDADA])->sum('total_sem_iva')),
                'comprado' => Dinheiro::normalizar($t->facturasFornecedor()
                    ->whereIn('estado', [FacturaFornecedor::VALIDADA, FacturaFornecedor::PAGA])->sum('total_sem_iva')),
                'por_pagar' => Dinheiro::normalizar($t->facturasFornecedor()
                    ->where('estado', FacturaFornecedor::VALIDADA)->selectRaw('COALESCE(SUM(total - total_pago), 0) as v')->value('v')),
            ],
            'encomendas' => $t->encomendasFornecedor()->latest('data')->latest('id')->limit(5)->get()->map(fn (EncomendaFornecedor $e) => [
                'id' => $e->id, 'referencia' => $e->referencia(), 'data' => $e->data->toDateString(), 'total' => (string) $e->total,
                'estado' => $e->estado, 'facturada' => $e->facturada, 'atrasada' => $e->atrasada(),
            ]),
            'facturas' => $t->facturasFornecedor()->latest('data')->latest('id')->limit(5)->get()->map(fn (FacturaFornecedor $f) => [
                'id' => $f->id, 'referencia' => $f->referencia(), 'ref_fornecedor' => $f->ref_fornecedor, 'data' => $f->data->toDateString(),
                'total' => (string) $f->total, 'estado' => $f->estado, 'vencida' => $f->estaVencida(),
            ]),
        ];
    }

    public function edit(Terceiro $terceiro): Response
    {
        return Inertia::render('terceiros/formulario', [
            'terceiro' => $terceiro->only([
                'id', 'nome', 'nome_alternativo', 'e_cliente', 'e_potencial', 'e_fornecedor', 'codigo_cliente', 'codigo_fornecedor',
                'tipo_entidade', 'nuit', 'sujeito_iva', 'morada', 'codigo_postal', 'cidade', 'provincia', 'pais',
                'telefone', 'telemovel', 'email', 'website', 'termos_pagamento', 'metodo_pagamento', 'nota_publica', 'nota_privada',
            ]),
            'predefinido' => null,
            'opcoes' => Opcoes::todas(),
        ]);
    }

    public function update(GuardarTerceiroRequest $request, Terceiro $terceiro): RedirectResponse
    {
        $this->service->actualizar($terceiro, $request->validated());

        return to_route('terceiros.show', $terceiro)->with('sucesso', 'Alterações guardadas.');
    }

    public function alternarEstado(Terceiro $terceiro): RedirectResponse
    {
        $this->service->alternarEstado($terceiro);

        return back()->with('sucesso', $terceiro->activo ? "{$terceiro->nome} foi reaberto." : "{$terceiro->nome} foi encerrado.");
    }

    public function destroy(Terceiro $terceiro): RedirectResponse
    {
        $nome = $terceiro->nome;
        $this->service->apagar($terceiro);

        return to_route('terceiros.index')->with('sucesso', "Terceiro {$nome} apagado.");
    }
}
