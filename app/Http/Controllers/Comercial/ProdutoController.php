<?php

namespace App\Http\Controllers\Comercial;

use App\Http\Controllers\Controller;
use App\Http\Requests\Comercial\GuardarProdutoRequest;
use App\Models\Categoria;
use App\Models\FacturaLinha;
use App\Models\Material;
use App\Models\MovimentoStock;
use App\Models\Produto;
use App\Models\Reserva;
use App\Models\ReservaLinha;
use App\Models\Terceiro;
use App\Services\Disponibilidade;
use App\Services\FotosProduto;
use App\Services\Stock;
use App\Support\Opcoes;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ProdutoController extends Controller
{
    /** Produtos e stock: catálogo, preços e quantidades numa só lista */
    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'tipo' => ['nullable', 'in:produto,servico'],
            'pesquisa' => ['nullable', 'string', 'max:100'],
            'categoria' => ['nullable', 'string', 'max:10'],
            'material' => ['nullable', 'integer'],
            'estado' => ['nullable', 'in:aluguer,venda,loja,inactivo'],
            'stock' => ['nullable', 'in:fora,atrasado,esgotado,vazio'],
        ]);
        $verStock = $request->user()->can('stock.ver');
        if (! $verStock) {
            unset($filtros['stock']);
        }

        $query = Produto::query()
            ->select('produtos.*')
            ->selectRaw('(quantidade_total - quantidade_fora) as disponivel')
            ->with(['categoria:id,nome', 'material:id,nome', 'fotoPrincipal'])
            ->when($filtros['tipo'] ?? null, fn ($q, $t) => $q->where('tipo', $t))
            ->when($filtros['pesquisa'] ?? null, fn ($q, $t) => $q->where(fn ($q) => $q->where('nome', 'like', Pesquisa::like($t))->orWhere('referencia', 'like', Pesquisa::like($t))))
            ->when($filtros['categoria'] ?? null, fn ($q, $c) => $c === 'sem' ? $q->whereNull('categoria_id') : $q->where('categoria_id', (int) $c))
            ->when($filtros['material'] ?? null, fn ($q, $m) => $q->where('material_id', (int) $m))
            ->when($filtros['estado'] ?? null, fn ($q, $e) => match ($e) {
                'aluguer' => $q->where('em_aluguer', true),
                'venda' => $q->where('em_venda', true),
                'loja' => $q->where('na_loja', true),
                'inactivo' => $q->where('em_aluguer', false)->where('em_venda', false),
            })
            ->when($filtros['stock'] ?? null, fn ($q, $s) => match ($s) {
                'fora' => $q->where('quantidade_fora', '>', 0),
                'esgotado' => $q->where('quantidade_total', '>', 0)->whereColumn('quantidade_fora', '>=', 'quantidade_total'),
                'vazio' => $q->where('tipo', 'produto')->where('quantidade_total', 0),
                'atrasado' => $q->whereHas('movimentos', fn ($m) => $m->where('tipo', MovimentoStock::SAIDA)->where('pendente', '>', 0)->whereDate('devolucao_prevista', '<', today())),
            });

        $ordenacao = Ordenacao::aplicar($query, $request, [
            'referencia' => 'referencia',
            'nome' => 'nome',
            'preco' => 'preco',
            'preco_aluguer' => 'preco_aluguer',
            'total' => 'quantidade_total',
            'fora' => 'quantidade_fora',
            'disponivel' => 'disponivel',
        ], 'nome');

        $produtos = $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (Produto $p) => [
            'id' => $p->id,
            'referencia' => $p->referencia,
            'tipo' => $p->tipo,
            'nome' => $p->nome,
            'categoria' => $p->categoria?->nome,
            'material' => $p->material?->nome,
            'foto' => $p->fotoPrincipal?->url('mini'),
            'preco' => $p->preco,
            'preco_aluguer' => $p->preco_aluguer,
            'unidade' => $p->unidade,
            'em_venda' => $p->em_venda,
            'em_aluguer' => $p->em_aluguer,
            'na_loja' => $p->na_loja,
            'total' => $p->quantidade_total,
            'fora' => $p->quantidade_fora,
            'disponivel' => $p->disponivelAgora(),
        ]);

        return Inertia::render('produtos/index', [
            'produtos' => $produtos,
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
            'categorias' => $this->categorias(),
            'materiais' => $this->materiais(),
            'resumo' => $verStock ? $this->resumoStock() : null,
            'atrasadas' => $verStock ? $this->saidasAtrasadas() : [],
        ]);
    }

    /** @return array{pecas: int, fora: int, esgotados: int, atrasadas: int} */
    private function resumoStock(): array
    {
        $base = Produto::where('tipo', 'produto');

        return [
            'pecas' => (int) (clone $base)->sum('quantidade_total'),
            'fora' => (int) (clone $base)->sum('quantidade_fora'),
            'esgotados' => (clone $base)->where('quantidade_total', '>', 0)->whereColumn('quantidade_fora', '>=', 'quantidade_total')->count(),
            'atrasadas' => (int) MovimentoStock::where('tipo', MovimentoStock::SAIDA)->where('pendente', '>', 0)->whereDate('devolucao_prevista', '<', today())->sum('pendente'),
        ];
    }

    /** Peças que já deviam ter voltado (as 20 mais atrasadas) */
    private function saidasAtrasadas(): Collection
    {
        return MovimentoStock::query()
            ->where('tipo', MovimentoStock::SAIDA)->where('pendente', '>', 0)->whereDate('devolucao_prevista', '<', today())
            ->with(['produto:id,referencia,nome', 'terceiro:id,nome'])
            ->orderBy('devolucao_prevista')->limit(20)->get()
            ->map(fn (MovimentoStock $m) => [
                'id' => $m->id,
                'produto' => ['id' => $m->produto->id, 'referencia' => $m->produto->referencia, 'nome' => $m->produto->nome],
                'terceiro' => $m->terceiro?->nome,
                'motivo' => $m->motivo,
                'pendente' => $m->pendente,
                'data' => $m->data->toDateString(),
                'devolucao_prevista' => $m->devolucao_prevista->toDateString(),
            ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('produtos/formulario', [
            'produto' => null,
            'tipo' => $request->query('tipo') === 'servico' ? 'servico' : 'produto',
            'opcoes' => Opcoes::todas(),
            'categorias' => $this->categorias(),
            'materiais' => $this->materiais(),
            'proximosCodigos' => $this->proximosCodigos(),
        ]);
    }

    public function store(GuardarProdutoRequest $request, Stock $stock): RedirectResponse
    {
        $dados = $request->dados();
        $produto = DB::transaction(function () use ($dados, $request, $stock) {
            // Código automático pela categoria (SOF-001...); a categoria fica presa até gravar, para dois registos não ficarem com o mesmo código
            if (empty($dados['referencia'])) {
                $dados['referencia'] = Categoria::whereKey($dados['categoria_id'])->lockForUpdate()->firstOrFail()->proximoCodigoProduto();
            }
            $produto = new Produto($dados);
            $produto->criado_por = $request->user()->id;
            $produto->save();
            // A quantidade que já existe entra como primeiro movimento de stock
            if ($produto->tipo === 'produto') {
                $stock->inicial($produto, (int) $dados['quantidade_total'], $request->user());
            }

            return $produto;
        });

        return to_route('produtos.show', $produto)->with('sucesso', ($produto->tipo === 'servico' ? 'Serviço ' : 'Produto ')."{$produto->referencia} criado.");
    }

    public function show(Request $request, Produto $produto): Response
    {
        $produto->load(['categoria:id,nome', 'material:id,nome', 'fotos']);
        $usos = FacturaLinha::where('produto_id', $produto->id)->count();
        $comStock = $produto->tipo === 'produto' && $request->user()->can('stock.ver');

        return Inertia::render('produtos/mostrar', [
            'produto' => [
                ...$produto->only([
                    'id', 'referencia', 'tipo', 'nome', 'descricao', 'preco', 'taxa_iva', 'preco_compra', 'em_venda', 'em_compra',
                    'em_aluguer', 'preco_aluguer', 'quantidade_total', 'na_loja', 'loja_destaque', 'loja_ordem', 'loja_descricao',
                ]),
                'categoria' => $produto->categoria?->nome,
                'material' => $produto->material?->nome,
                'unidade' => Opcoes::UNIDADES[$produto->unidade] ?? $produto->unidade,
                'preco_com_iva' => $produto->precoComIva(),
                'preco_aluguer_com_iva' => $produto->precoAluguerComIva(),
                'criado_em' => $produto->created_at?->toIso8601String(),
                'fotos' => $produto->fotos->map->paraEcra()->values(),
            ],
            'usos' => $usos,
            'maximoFotos' => FotosProduto::MAXIMO_POR_PRODUTO,
            'stock' => $comStock ? $this->stock($produto) : null,
            'clientes' => $comStock && $request->user()->can('stock.movimentar')
                ? Terceiro::where('activo', true)->where('e_cliente', true)->orderBy('nome')->get(['id', 'nome', 'codigo_cliente'])
                    ->map(fn (Terceiro $t) => ['valor' => (string) $t->id, 'label' => $t->nome, 'detalhe' => $t->codigo_cliente])
                : [],
        ]);
    }

    /** @return array<string, mixed> Separador "Stock" da ficha */
    private function stock(Produto $produto): array
    {
        $com = ['terceiro:id,nome', 'autor:id,name', 'origem'];

        return [
            'total' => $produto->quantidade_total,
            'fora' => $produto->quantidade_fora,
            'disponivel' => $produto->disponivelAgora(),
            'saidas_abertas' => $produto->movimentos()->with($com)
                ->where('tipo', MovimentoStock::SAIDA)->where('pendente', '>', 0)
                ->orderByRaw('devolucao_prevista is null')->orderBy('devolucao_prevista')->get()
                ->map->paraEcra(),
            'movimentos' => $produto->movimentos()->with($com)->latest('id')->limit(15)->get()->map->paraEcra(),
            'n_movimentos' => $produto->movimentos()->count(),
            // Reservas confirmadas que ainda não saíram
            'reservadas' => app(Disponibilidade::class)->reservadas(collect([$produto->id]))[$produto->id] ?? 0,
            'proximas_reservas' => ReservaLinha::query()
                ->where('produto_id', $produto->id)
                ->whereHas('reserva', fn ($q) => $q->whereIn('estado', [Reserva::PEDIDO, Reserva::CONFIRMADA])->whereDate('data_recolha', '>=', today()->toDateString()))
                ->with('reserva.terceiro:id,nome')
                ->get()
                ->sortBy(fn (ReservaLinha $l) => $l->reserva->data_entrega)
                ->take(10)
                ->map(fn (ReservaLinha $l) => [
                    'id' => $l->reserva->id,
                    'numero' => $l->reserva->numero,
                    'estado' => $l->reserva->estado,
                    'cliente' => $l->reserva->terceiro->nome,
                    'quantidade' => $l->pecas(),
                    'data_entrega' => $l->reserva->data_entrega->toDateString(),
                    'data_recolha' => $l->reserva->data_recolha->toDateString(),
                ])->values(),
        ];
    }

    public function edit(Produto $produto): Response
    {
        return Inertia::render('produtos/formulario', [
            'produto' => $produto->only([
                'id', 'referencia', 'tipo', 'nome', 'categoria_id', 'material_id', 'descricao', 'preco', 'taxa_iva', 'unidade', 'preco_compra', 'em_venda', 'em_compra',
                'em_aluguer', 'preco_aluguer', 'quantidade_total', 'quantidade_fora', 'na_loja', 'loja_destaque', 'loja_ordem', 'loja_descricao',
            ]),
            'tipo' => $produto->tipo,
            'opcoes' => Opcoes::todas(),
            'categorias' => $this->categorias(),
            'materiais' => $this->materiais(),
            'proximosCodigos' => $this->proximosCodigos(),
        ]);
    }

    public function update(GuardarProdutoRequest $request, Produto $produto): RedirectResponse
    {
        // A quantidade já não se escreve aqui: muda pelos movimentos de stock
        $produto->update(Arr::except($request->dados(), ['quantidade_total']));

        return to_route('produtos.show', $produto)->with('sucesso', 'Alterações guardadas.');
    }

    public function destroy(Produto $produto, FotosProduto $fotos): RedirectResponse
    {
        if (FacturaLinha::where('produto_id', $produto->id)->exists()) {
            return back()->with('erro', "{$produto->referencia} já foi usado em facturas e não pode ser apagado. Pode retirá-lo de venda e de aluguer.");
        }

        if ($produto->movimentos()->where('tipo', '!=', MovimentoStock::INICIAL)->exists()) {
            return back()->with('erro', "{$produto->referencia} já tem movimentos de stock e não pode ser apagado. Pode retirá-lo de venda e de aluguer.");
        }

        $ref = $produto->referencia;
        $lista = $produto->fotos()->get();
        $produto->delete();
        $fotos->apagarFicheirosDe($lista);

        return to_route('produtos.index')->with('sucesso', "{$ref} apagado.");
    }

    /** @return Collection<int, array{valor: string, label: string, detalhe: ?string}> */
    private function categorias(): Collection
    {
        return Categoria::orderBy('ordem')->orderBy('nome')->get(['id', 'nome', 'codigo'])
            ->map(fn (Categoria $c) => ['valor' => (string) $c->id, 'label' => $c->nome, 'detalhe' => $c->codigo]);
    }

    /** @return Collection<int, array{valor: string, label: string}> */
    private function materiais(): Collection
    {
        return Material::orderBy('ordem')->orderBy('nome')->get(['id', 'nome'])
            ->map(fn (Material $m) => ['valor' => (string) $m->id, 'label' => $m->nome]);
    }

    /** @return array<string, string> Próximo código de cada categoria, para o formulário mostrar o que vai ser gerado */
    private function proximosCodigos(): array
    {
        return Categoria::whereNotNull('codigo')->get()
            ->mapWithKeys(fn (Categoria $c) => [(string) $c->id => $c->proximoCodigoProduto()])->all();
    }
}
