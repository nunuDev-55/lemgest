import {
    Bloco,
    BotaoLink,
    ColunaOrdenavel,
    Estado,
    FiltroEscolha,
    FiltroTexto,
    LinhaVazia,
    PorPagina,
    TituloPagina,
    useListaFiltros,
    type OrdenacaoLista,
} from '@/components/erp';
import { MiniaturaProduto } from '@/components/foto-produto';
import { Paginacao } from '@/components/paginacao';
import { Button } from '@/components/ui/button';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Paginado } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CalendarSearch, FilterX, Plus } from 'lucide-react';

type Opcao = { valor: string; label: string };

interface Linha {
    id: number;
    referencia: string;
    tipo: 'produto' | 'servico';
    nome: string;
    categoria: string | null;
    material: string | null;
    foto: string | null;
    preco: string;
    preco_aluguer: string | null;
    unidade: string;
    em_venda: boolean;
    em_aluguer: boolean;
    na_loja: boolean;
    total: number;
    fora: number;
    disponivel: number;
}

interface Atrasada {
    id: number;
    produto: { id: number; referencia: string; nome: string };
    terceiro: string | null;
    motivo: string | null;
    pendente: number;
    data: string;
    devolucao_prevista: string;
}

interface Props {
    produtos: Paginado<Linha>;
    filtros: Record<string, string | undefined>;
    ordenacao: OrdenacaoLista;
    categorias: Opcao[];
    materiais: Opcao[];
    /** Só para quem vê o stock */
    resumo: { pecas: number; fora: number; esgotados: number; atrasadas: number } | null;
    atrasadas: Atrasada[];
}

const nada = <span className="text-muted-foreground/60">—</span>;

/** Produtos e stock: catálogo, preços e quantidades numa só lista */
export default function ProdutosEStock({ produtos, filtros, ordenacao, categorias, materiais, resumo, atrasadas }: Props) {
    const pode = usePode();
    const lista = useListaFiltros('/produtos', filtros, ordenacao);
    const comStock = resumo !== null;
    const servicos = filtros.tipo === 'servico';
    const titulo = filtros.tipo === 'produto' ? 'Produtos' : servicos ? 'Serviços' : 'Produtos e stock';
    const colunas = comStock ? 6 : 3;

    return (
        <AppLayout>
            <Head title={titulo} />
            <TituloPagina
                titulo={titulo}
                contagem={produtos.total}
                accoes={
                    <>
                        {lista.temFiltros && (
                            <Button variant="ghost" size="sm" onClick={lista.limpar}>
                                <FilterX className="size-4" />
                                Limpar filtros
                            </Button>
                        )}
                        {comStock && (
                            <BotaoLink href="/stock/disponibilidade" variante="outline" icone={CalendarSearch}>
                                Disponibilidade por data
                            </BotaoLink>
                        )}
                        {pode('produtos.gerir') && (
                            <BotaoLink href={`/produtos/novo?tipo=${servicos ? 'servico' : 'produto'}`} icone={Plus}>
                                {servicos ? 'Novo serviço' : 'Novo produto'}
                            </BotaoLink>
                        )}
                    </>
                }
            />

            {resumo && !servicos && (
                <section className="grelha-celulas mb-6 grid grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: 'Peças no total', valor: resumo.pecas, filtro: '' },
                        { label: 'Alugadas agora', valor: resumo.fora, filtro: 'fora' },
                        { label: 'Por devolver em atraso', valor: resumo.atrasadas, filtro: 'atrasado', alerta: resumo.atrasadas > 0 },
                        { label: 'Produtos esgotados', valor: resumo.esgotados, filtro: 'esgotado' },
                    ].map((c) => (
                        <button
                            key={c.label}
                            type="button"
                            onClick={() => lista.escolher('stock', c.filtro)}
                            className={cn(
                                'bg-card hover:bg-muted px-4 py-3 text-left transition-colors',
                                c.filtro !== '' && filtros.stock === c.filtro && 'bg-muted',
                            )}
                        >
                            <p className="text-muted-foreground text-[13px]">{c.label}</p>
                            <p className={cn('text-xl font-semibold tabular-nums', c.alerta && 'text-red-600 dark:text-red-400')}>{c.valor}</p>
                        </button>
                    ))}
                </section>
            )}

            {atrasadas.length > 0 && !lista.temFiltros && (
                <Bloco titulo="Devoluções em atraso" className="mb-6">
                    <table className="tabela">
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th>Cliente / evento</th>
                                <th className="text-right">Por voltar</th>
                                <th>Saiu</th>
                                <th>Devia voltar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {atrasadas.map((a) => (
                                <tr key={a.id}>
                                    <td>
                                        <Link href={`/produtos/${a.produto.id}#stock`} className="font-medium hover:underline">
                                            {a.produto.nome}
                                        </Link>
                                        <div className="text-muted-foreground text-[12.5px]">{a.produto.referencia}</div>
                                    </td>
                                    <td>{[a.terceiro, a.motivo].filter(Boolean).join(' · ') || nada}</td>
                                    <td className="text-right font-medium tabular-nums">{a.pendente}</td>
                                    <td className="tabular-nums">{formatData(a.data)}</td>
                                    <td className="font-medium text-red-600 tabular-nums dark:text-red-400">{formatData(a.devolucao_prevista)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Bloco>
            )}

            {/* Filtros: tipo, pesquisa, categoria, estado e situação do stock */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                    {[
                        { valor: undefined, label: 'Todos' },
                        { valor: 'produto', label: 'Produtos' },
                        { valor: 'servico', label: 'Serviços' },
                    ].map((t) => (
                        <button
                            key={t.label}
                            type="button"
                            onClick={() => lista.escolher('tipo', t.valor ?? '')}
                            className={
                                filtros.tipo === t.valor
                                    ? 'bg-foreground text-background h-8 rounded-md px-3 text-[13px] font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted h-8 rounded-md px-3 text-[13px]'
                            }
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <FiltroTexto
                    rotulo="nome ou referência"
                    valor={lista.valores.pesquisa}
                    onChange={(v) => lista.escrever('pesquisa', v)}
                    className="w-56 max-w-full"
                />
                <div className="w-44">
                    <FiltroEscolha
                        rotulo="categoria"
                        valor={lista.valores.categoria}
                        onChange={(v) => lista.escolher('categoria', v)}
                        opcoes={[...categorias, { valor: 'sem', label: 'Sem categoria' }]}
                        todos="Todas as categorias"
                    />
                </div>
                {materiais.length > 0 && (
                    <div className="w-36">
                        <FiltroEscolha
                            rotulo="material"
                            valor={lista.valores.material}
                            onChange={(v) => lista.escolher('material', v)}
                            opcoes={materiais}
                            todos="Todos os materiais"
                        />
                    </div>
                )}
                <div className="w-44">
                    <FiltroEscolha
                        rotulo="estado"
                        valor={lista.valores.estado}
                        onChange={(v) => lista.escolher('estado', v)}
                        opcoes={[
                            { valor: 'aluguer', label: 'Em aluguer' },
                            { valor: 'venda', label: 'Em venda' },
                            { valor: 'loja', label: 'Na loja' },
                            { valor: 'inactivo', label: 'Sem aluguer nem venda' },
                        ]}
                        todos="Todos os estados"
                    />
                </div>
                {comStock && (
                    <div className="w-52">
                        <FiltroEscolha
                            rotulo="stock"
                            valor={lista.valores.stock}
                            onChange={(v) => lista.escolher('stock', v)}
                            opcoes={[
                                { valor: 'fora', label: 'Com peças alugadas' },
                                { valor: 'atrasado', label: 'Com devolução em atraso' },
                                { valor: 'esgotado', label: 'Esgotados' },
                                { valor: 'vazio', label: 'Sem quantidade' },
                            ]}
                            todos="Todo o stock"
                        />
                    </div>
                )}
            </div>

            <div className="painel overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr>
                            <ColunaOrdenavel coluna="nome" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="min-w-56">
                                Produto
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="preco_aluguer" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="text-right">
                                Aluguer / dia
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="preco" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="text-right">
                                Venda
                            </ColunaOrdenavel>
                            {comStock && (
                                <>
                                    <ColunaOrdenavel coluna="total" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="text-right">
                                        Total
                                    </ColunaOrdenavel>
                                    <ColunaOrdenavel coluna="fora" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="text-right">
                                        Alugadas
                                    </ColunaOrdenavel>
                                    <ColunaOrdenavel coluna="disponivel" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="text-right">
                                        No armazém
                                    </ColunaOrdenavel>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {produtos.data.length === 0 && <LinhaVazia colunas={colunas} />}
                        {produtos.data.map((p) => {
                            const produto = p.tipo === 'produto';
                            return (
                                <tr key={p.id}>
                                    <td>
                                        <Link href={`/produtos/${p.id}`} className="group flex items-center gap-3">
                                            <MiniaturaProduto src={p.foto} nome={p.nome} className="size-10" />
                                            <span className="min-w-0">
                                                <span className="line-clamp-1 font-medium group-hover:underline">{p.nome}</span>
                                                <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-[12.5px]">
                                                    <span>
                                                        {[p.referencia, p.categoria ?? (produto ? null : 'Serviço'), p.material]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </span>
                                                    {p.na_loja && (
                                                        <Estado cor="roxo" className="text-muted-foreground text-[12px]">
                                                            Loja
                                                        </Estado>
                                                    )}
                                                    {!p.em_aluguer && !p.em_venda && (
                                                        <Estado cor="cinza" className="text-[12px]">
                                                            Inactivo
                                                        </Estado>
                                                    )}
                                                </span>
                                            </span>
                                        </Link>
                                    </td>
                                    <td className="text-right whitespace-nowrap tabular-nums">
                                        {p.em_aluguer && p.preco_aluguer !== null ? formatNumero(p.preco_aluguer) : nada}
                                    </td>
                                    <td className="text-right whitespace-nowrap tabular-nums">
                                        {p.em_venda ? (
                                            <>
                                                {formatNumero(p.preco)}
                                                {p.unidade !== 'un' && <span className="text-muted-foreground"> /{p.unidade}</span>}
                                            </>
                                        ) : (
                                            nada
                                        )}
                                    </td>
                                    {comStock && (
                                        <>
                                            <td className="text-right tabular-nums">{produto ? p.total : nada}</td>
                                            <td className="text-right tabular-nums">
                                                {!produto ? nada : p.fora > 0 ? p.fora : <span className="text-muted-foreground/60">0</span>}
                                            </td>
                                            <td
                                                className={cn(
                                                    'text-right font-medium tabular-nums',
                                                    produto && p.total > 0 && p.disponivel === 0 && 'text-red-600 dark:text-red-400',
                                                )}
                                            >
                                                {produto ? p.disponivel : nada}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <Paginacao pagina={produtos} nome="registos" extra={<PorPagina valor={produtos.per_page} onChange={lista.porPagina} />} />
            <p className="text-muted-foreground mt-2 text-[12.5px]">Preços em meticais, sem IVA.</p>
        </AppLayout>
    );
}
