<?php

namespace App\Http\Controllers;

use App\Models\ContaCliente;
use App\Models\EncomendaFornecedor;
use App\Models\Factura;
use App\Models\FacturaFornecedor;
use App\Models\MovimentoStock;
use App\Models\Orcamento;
use App\Models\Pagamento;
use App\Models\Produto;
use App\Models\Reserva;
use App\Models\User;
use App\Support\Definicoes;
use App\Support\Dinheiro;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

/**
 * Página Início (ver docs/analise-dolibarr/02-inicio.md):
 * "vista global" com caixas por módulo e, por baixo, caixas de informação.
 * Cada caixa só aparece a quem tem permissão para ver o módulo.
 */
class InicioController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $hoje = CarbonImmutable::today();
        $verFacturas = $user->can('facturas.ver');
        $verPagamentos = $user->can('pagamentos.ver');

        $verOrcamentos = $user->can('orcamentos.ver');

        $vencidas = $verFacturas
            ? Factura::where('estado', Factura::VALIDADA)->whereDate('data_vencimento', '<', $hoje)->count()
            : 0;
        $expirados = $verOrcamentos
            ? Orcamento::where('estado', Orcamento::ABERTO)->whereDate('data_fim_validade', '<', $hoje)->count()
            : 0;
        $recolhasAtrasadas = $user->can('reservas.ver')
            ? Reserva::where('estado', Reserva::ENTREGUE)->whereDate('data_recolha', '<', $hoje)->count()
            : 0;

        // Como o Dolibarr: avisa quem configura enquanto os dados da empresa estão incompletos
        $configuracaoEmFalta = $user->can('configuracao.gerir') ? app(Definicoes::class)->emFalta() : [];

        return Inertia::render('dashboard', [
            'configuracaoEmFalta' => $configuracaoEmFalta,
            'emAtraso' => $vencidas + $expirados + $recolhasAtrasadas,
            'caixas' => array_values(array_filter([
                $user->can('reservas.ver') ? $this->caixaReservas($user->can('terceiros.contas')) : null,
                $verOrcamentos ? $this->caixaOrcamentos($expirados) : null,
                $verFacturas ? $this->caixaFacturas($vencidas) : null,
                $verPagamentos ? $this->caixaPagamentos($hoje) : null,
                $user->can('produtos.consultar') ? $this->caixaProdutos($user->can('stock.ver')) : null,
                $user->can('compras.ver') ? $this->caixaCompras() : null,
            ])),
            'login' => $this->informacaoLogin($user),

            'naoPagas' => $verFacturas ? $this->maisAntigasNaoPagas() : null,
            'devedores' => $verFacturas ? $this->maioresDevedores() : null,

        ]);
    }

    private function caixaOrcamentos(int $expirados): array
    {
        return [
            'id' => 'orcamentos',
            'titulo' => 'Orçamentos',
            'href' => '/orcamentos',
            'linhas' => [
                [
                    'label' => 'Para assinar',
                    'valor' => Orcamento::where('estado', Orcamento::ABERTO)->count(),
                    'href' => '/orcamentos?estado=aberto',
                    'alerta' => $expirados > 0 ? "{$expirados} expirados" : null,
                    'hrefAlerta' => '/orcamentos?estado=expirados',
                ],
                ['label' => 'Assinados por facturar', 'valor' => Orcamento::where('estado', Orcamento::ASSINADO)->count(), 'href' => '/orcamentos?estado=assinado'],
            ],
        ];
    }

    private function caixaFacturas(int $vencidas): array
    {
        return [
            'id' => 'facturas',
            'titulo' => 'Facturas',
            'href' => '/facturas',
            'linhas' => [
                ['label' => 'Rascunho', 'valor' => Factura::where('estado', Factura::RASCUNHO)->count(), 'href' => '/facturas?estado=rascunho'],
                [
                    'label' => 'Pendentes de cobrança',
                    'valor' => Factura::where('estado', Factura::VALIDADA)->count(),
                    'href' => '/facturas?estado=validada',
                    'alerta' => $vencidas > 0 ? "{$vencidas} em atraso" : null,
                    'hrefAlerta' => '/facturas?estado=vencidas',
                ],
            ],
        ];
    }

    private function caixaPagamentos(CarbonImmutable $hoje): array
    {
        $inicio = $hoje->startOfMonth()->toDateString();

        return [
            'id' => 'pagamentos',
            'titulo' => 'Pagamentos',
            'href' => '/pagamentos',
            'linhas' => [
                [
                    'label' => 'Recebido este mês',
                    'valor' => Dinheiro::normalizar(Pagamento::whereDate('data', '>=', $inicio)->sum('valor')),
                    'dinheiro' => true,
                    'href' => "/pagamentos?de={$inicio}",
                ],
                [
                    'label' => 'Restante a receber',
                    'valor' => Dinheiro::normalizar(Factura::where('estado', Factura::VALIDADA)->selectRaw('COALESCE(SUM('.Factura::SQL_EM_FALTA.'), 0) as v')->value('v')),
                    'dinheiro' => true,
                    'href' => '/facturas?estado=validada',
                ],
            ],
        ];
    }

    /** Caixa "Produtos e stock": catálogo e, para quem vê o stock, peças alugadas, atrasos e esgotados */
    private function caixaProdutos(bool $comStock): array
    {
        $linhas = [
            ['label' => 'Produtos em aluguer', 'valor' => Produto::where('tipo', 'produto')->where('em_aluguer', true)->count(), 'href' => '/produtos?tipo=produto&estado=aluguer'],
        ];
        if ($comStock) {
            $atrasadas = (int) MovimentoStock::where('tipo', MovimentoStock::SAIDA)->where('pendente', '>', 0)->whereDate('devolucao_prevista', '<', now()->toDateString())->sum('pendente');
            $linhas[] = [
                'label' => 'Peças alugadas agora',
                'valor' => (int) Produto::where('tipo', 'produto')->sum('quantidade_fora'),
                'href' => '/produtos?stock=fora',
                'alerta' => $atrasadas > 0 ? "{$atrasadas} por devolver em atraso" : null,
                'hrefAlerta' => '/produtos?stock=atrasado',
            ];
            $linhas[] = [
                'label' => 'Produtos esgotados',
                'valor' => Produto::where('tipo', 'produto')->where('quantidade_total', '>', 0)->whereColumn('quantidade_fora', '>=', 'quantidade_total')->count(),
                'href' => '/produtos?stock=esgotado',
            ];
        }
        $linhas[] = ['label' => 'Mostrados na loja', 'valor' => Produto::where('na_loja', true)->count(), 'href' => '/produtos?estado=loja'];

        return ['id' => 'produtos', 'titulo' => 'Produtos e stock', 'href' => '/produtos', 'linhas' => $linhas];
    }

    private function caixaReservas(bool $verContas): array
    {
        $hoje = now()->toDateString();
        $daqui7 = now()->addDays(7)->toDateString();
        $atrasadas = Reserva::where('estado', Reserva::ENTREGUE)->whereDate('data_recolha', '<', $hoje)->count();

        return [
            'id' => 'reservas',
            'titulo' => 'Reservas',
            'href' => '/reservas',
            'linhas' => [
                ['label' => 'Pedidos por confirmar', 'valor' => Reserva::where('estado', Reserva::PEDIDO)->count(), 'href' => '/reservas?estado=pedido'],
                ['label' => 'Entregas nos próximos 7 dias', 'valor' => Reserva::where('estado', Reserva::CONFIRMADA)->whereDate('data_entrega', '>=', $hoje)->whereDate('data_entrega', '<=', $daqui7)->count(), 'href' => '/reservas/calendario'],
                [
                    'label' => 'Material fora (por recolher)',
                    'valor' => Reserva::where('estado', Reserva::ENTREGUE)->count(),
                    'href' => '/reservas?estado=entregue',
                    'alerta' => $atrasadas > 0 ? "{$atrasadas} com recolha em atraso" : null,
                    'hrefAlerta' => '/reservas?estado=atrasadas',
                ],
                // Pedidos de conta feitos pelos clientes (D7: a LemServ aprova)
                ...($verContas ? [['label' => 'Contas de clientes por aprovar', 'valor' => ContaCliente::where('estado', ContaCliente::PENDENTE)->count(), 'href' => '/contas-clientes']] : []),
            ],
        ];
    }

    private function caixaCompras(): array
    {
        $atrasadas = EncomendaFornecedor::where('estado', EncomendaFornecedor::ENCOMENDADA)->whereDate('data_entrega', '<', now()->toDateString())->count();
        $vencidas = FacturaFornecedor::where('estado', FacturaFornecedor::VALIDADA)->whereDate('data_vencimento', '<', now()->toDateString())->count();

        return [
            'id' => 'compras',
            'titulo' => 'Compras',
            'href' => '/encomendas-fornecedor',
            'linhas' => [
                [
                    'label' => 'Encomendas por receber',
                    'valor' => EncomendaFornecedor::where('estado', EncomendaFornecedor::ENCOMENDADA)->count(),
                    'href' => '/encomendas-fornecedor?estado=encomendada',
                    'alerta' => $atrasadas > 0 ? "{$atrasadas} em atraso" : null,
                    'hrefAlerta' => '/encomendas-fornecedor?estado=atrasadas',
                ],
                [
                    'label' => 'Facturas de fornecedor por pagar',
                    'valor' => FacturaFornecedor::where('estado', FacturaFornecedor::VALIDADA)->count(),
                    'href' => '/facturas-fornecedor?estado=validada',
                    'alerta' => $vencidas > 0 ? "{$vencidas} vencidas" : null,
                    'hrefAlerta' => '/facturas-fornecedor?estado=vencidas',
                ],
            ],
        ];
    }

    private function informacaoLogin(User $user): array
    {
        // A entrada mais recente é a sessão actual; a "anterior" é a seguinte (como no Dolibarr).
        $anterior = Activity::where('log_name', 'acessos')
            ->where('causer_type', $user->getMorphClass())->where('causer_id', $user->id)
            ->latest('id')->skip(1)->first();

        return [
            'nome' => $user->name,
            'perfil' => $user->getRoleNames()->first(),
            'anterior' => $anterior?->created_at?->toIso8601String(),
            'ipAnterior' => $anterior?->properties['ip'] ?? null,
            'senhaAlterada' => $user->password_changed_at?->toIso8601String(),
        ];
    }

    private function maisAntigasNaoPagas(): array
    {
        $query = Factura::with('terceiro:id,nome')->where('estado', Factura::VALIDADA);

        return [
            'linhas' => (clone $query)->orderBy('data_vencimento')->orderBy('id')->limit(5)->get()
                ->map(fn (Factura $f) => [
                    'id' => $f->id,
                    'referencia' => $f->referencia(),
                    'cliente' => $f->terceiro->nome,
                    'em_falta' => $f->emFalta(),
                    'vencimento' => $f->data_vencimento?->toDateString(),
                    'vencida' => $f->estaVencida(),
                ])->all(),
            'total' => Dinheiro::normalizar((clone $query)->selectRaw('COALESCE(SUM('.Factura::SQL_EM_FALTA.'), 0) as v')->value('v')),
        ];
    }

    private function maioresDevedores(): array
    {
        return Factura::query()
            ->join('terceiros', 'terceiros.id', '=', 'facturas.terceiro_id')
            ->where('facturas.estado', Factura::VALIDADA)
            ->groupBy('terceiros.id', 'terceiros.nome')
            ->selectRaw('terceiros.id, terceiros.nome, COUNT(*) as n, SUM('.Factura::SQL_EM_FALTA.') as em_falta')
            ->orderByDesc('em_falta')
            ->limit(5)
            ->get()
            ->map(fn ($l) => ['id' => $l->id, 'nome' => $l->nome, 'n' => (int) $l->n, 'em_falta' => Dinheiro::normalizar($l->em_falta)])
            ->all();
    }
}
