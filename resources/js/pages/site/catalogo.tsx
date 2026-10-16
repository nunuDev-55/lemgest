import { CarrosselProdutos, CartaoProduto, type ProdutoLoja } from '@/components/site';
import SiteLayout, { useSite } from '@/layouts/site-layout';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { ArrowRight, ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

type Opcao = { valor: string; label: string };

interface Props {
    produtos: ProdutoLoja[];
    destaques: ProdutoLoja[];
    filtros: { categoria?: string; material?: string; pesquisa?: string; ordem?: string };
    categorias: Opcao[];
    materiais: Opcao[];
    ordens: Opcao[];
    podeReservar: boolean;
}

/** Caixa de escolha em forma de "pílula", com a seta à direita */
function Escolha({
    rotulo,
    valor,
    opcoes,
    onChange,
    todos,
    largo,
}: {
    rotulo: string;
    valor: string;
    opcoes: Opcao[];
    onChange: (v: string) => void;
    todos?: string;
    largo?: boolean;
}) {
    return (
        <label className={cn('relative', largo && 'w-full')}>
            <span className="sr-only">{rotulo}</span>
            <select
                value={valor}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    'bg-card focus-visible:ring-ring h-10 cursor-pointer appearance-none rounded-full border pr-9 pl-4 text-[13px] outline-none focus-visible:ring-2',
                    largo && 'w-full',
                )}
            >
                {todos && <option value="">{todos}</option>}
                {opcoes.map((o) => (
                    <option key={o.valor} value={o.valor}>
                        {o.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="text-muted-foreground pointer-events-none absolute top-3 right-3.5 size-4" />
        </label>
    );
}

function Activo({ children, onTirar }: { children: ReactNode; onTirar: () => void }) {
    return (
        <button
            type="button"
            onClick={onTirar}
            className="bg-card hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px]"
            aria-label={`Tirar o filtro ${typeof children === 'string' ? children : ''}`}
        >
            {children}
            <X className="size-3.5" />
        </button>
    );
}

/**
 * Catálogo (só com conta): "Material em destaque" numa fila que desliza, e todas as peças com categorias,
 * material, pesquisa e "Ordenar por". As datas, o local e o transporte escolhem-se depois, em "A minha reserva".
 */
export default function Catalogo({ produtos, destaques, filtros, categorias, materiais, ordens, podeReservar }: Props) {
    const { carrinho } = useSite();
    const [pesquisa, setPesquisa] = useState(filtros.pesquisa ?? '');
    const [painel, setPainel] = useState(false);

    const ir = (novos: Record<string, string | undefined>) => {
        const params = Object.fromEntries(Object.entries({ ...filtros, ...novos }).filter(([, v]) => v));
        router.get('/catalogo', params, { preserveScroll: true, preserveState: true, replace: true });
    };

    // Pesquisa ao fim de uma pausa a escrever
    useEffect(() => {
        if (pesquisa === (filtros.pesquisa ?? '')) return;
        const t = setTimeout(() => ir({ pesquisa }), 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pesquisa]);

    const categoriaActual = categorias.find((c) => c.valor === filtros.categoria)?.label;
    const materialActual = materiais.find((m) => m.valor === filtros.material)?.label;
    const temFiltros = Boolean(filtros.categoria || filtros.material || filtros.pesquisa);
    // Quantos filtros do painel "Filtros" (telemóvel) estão escolhidos
    const noPainel = (filtros.material ? 1 : 0) + (filtros.ordem ? 1 : 0);

    const escolhaMaterial = (largo?: boolean) =>
        materiais.length > 0 && (
            <Escolha
                rotulo="Material"
                valor={filtros.material ?? ''}
                opcoes={materiais}
                todos="Material: todos"
                largo={largo}
                onChange={(v) => ir({ material: v || undefined })}
            />
        );
    const escolhaOrdem = (largo?: boolean) => (
        <Escolha
            rotulo="Ordenar por"
            valor={filtros.ordem ?? 'recomendados'}
            opcoes={ordens}
            largo={largo}
            onChange={(v) => ir({ ordem: v === 'recomendados' ? undefined : v })}
        />
    );

    return (
        <SiteLayout titulo="Catálogo · LemServ">
            {/* Cabeçalho escuro, como a capa da página inicial */}
            <section className="escuro">
                <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-10 pb-10 md:flex-row md:items-end md:justify-between md:px-8 md:pt-14 md:pb-12">
                    <div className="min-w-0">
                        <p className="maiusculas-pequenas text-[#efe6da]/55">
                            <Link href="/" className="hover:text-white">
                                Início
                            </Link>{' '}
                            / Catálogo{categoriaActual ? ` / ${categoriaActual}` : ''}
                        </p>
                        <h1 className="titulo-maiusculo mt-5 text-[38px] break-words sm:text-[48px] md:mt-6 md:text-[66px]">
                            {categoriaActual ?? 'Todo o nosso material.'}
                        </h1>
                        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[#efe6da]/70 md:text-[15.5px]">
                            Escolha as peças e junte-as à sua reserva. As datas, o local e o transporte escolhem-se no fim, em "A minha reserva".
                        </p>
                    </div>
                    {podeReservar && carrinho > 0 && (
                        <Link
                            href="/catalogo/reserva"
                            className="maiusculas-pequenas inline-flex w-fit shrink-0 items-center gap-2 rounded-[3px] bg-[var(--dourado)] px-5 py-3.5 font-medium text-[var(--tinta)]"
                        >
                            A minha reserva ({carrinho})
                            <ArrowRight className="size-3.5" />
                        </Link>
                    )}
                </div>
            </section>

            {/* Barra de filtros (fica presa ao topo ao descer): no telemóvel o material e a ordem ficam em "Filtros";
                até 1280 px as categorias ficam numa linha própria, por baixo da pesquisa; daí para cima, tudo numa linha */}
            <section className="bg-background/95 sticky top-[76px] z-20 border-b backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:px-8 xl:flex-row xl:items-center">
                    <div className="order-2 -mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0 xl:order-1 [&::-webkit-scrollbar]:hidden">
                        {[{ valor: '', label: 'Tudo' }, ...categorias].map((c) => (
                            <button
                                key={c.valor || 'tudo'}
                                type="button"
                                onClick={() => ir({ categoria: c.valor || undefined })}
                                aria-pressed={(filtros.categoria ?? '') === c.valor}
                                className={cn(
                                    'h-9 shrink-0 rounded-full px-4 text-[13px] whitespace-nowrap transition-colors lg:h-10',
                                    (filtros.categoria ?? '') === c.valor
                                        ? 'bg-[var(--tinta)] font-medium text-[#efe6da]'
                                        : 'bg-card hover:bg-muted border',
                                )}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <div className="order-1 flex items-center gap-2 xl:order-2 xl:ml-auto">
                        <label className="relative min-w-0 flex-1 xl:w-56 xl:flex-none">
                            <span className="sr-only">Procurar no catálogo</span>
                            <Search className="text-muted-foreground pointer-events-none absolute top-3 left-3.5 size-4" />
                            <input
                                value={pesquisa}
                                onChange={(e) => setPesquisa(e.target.value)}
                                placeholder="Procurar sofá, puff…"
                                className="bg-card focus-visible:ring-ring h-10 w-full rounded-full border pr-4 pl-10 text-[13px] outline-none focus-visible:ring-2"
                            />
                        </label>
                        <div className="hidden items-center gap-2 lg:flex">
                            {escolhaMaterial()}
                            {escolhaOrdem()}
                        </div>
                        <button
                            type="button"
                            onClick={() => setPainel((p) => !p)}
                            aria-expanded={painel}
                            aria-controls="painel-filtros"
                            className={cn(
                                'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] lg:hidden',
                                painel ? 'bg-[var(--tinta)] text-[#efe6da]' : 'bg-card',
                            )}
                        >
                            <SlidersHorizontal className="size-4" />
                            Filtros
                            {noPainel > 0 && (
                                <span className="min-w-5 rounded-full bg-[var(--dourado)] px-1.5 text-center text-[11px] leading-5 font-semibold text-[var(--tinta)]">
                                    {noPainel}
                                </span>
                            )}
                        </button>
                    </div>
                    {painel && (
                        <div id="painel-filtros" className="order-3 grid gap-2 sm:grid-cols-2 lg:hidden">
                            {escolhaMaterial(true)}
                            {escolhaOrdem(true)}
                        </div>
                    )}
                </div>
            </section>

            {/* Material em destaque: fila que desliza para os lados (só sem filtros) */}
            {!temFiltros && destaques.length > 0 && (
                <div className="mx-auto max-w-7xl px-4 pt-10 md:px-8">
                    <CarrosselProdutos
                        etiqueta="Material em destaque"
                        titulo="As peças mais escolhidas"
                        produtos={destaques}
                        className="border-b pb-12"
                    />
                </div>
            )}

            <section className="mx-auto max-w-7xl px-4 pt-10 md:px-8">
                {!temFiltros && destaques.length > 0 && <h2 className="font-titulo mb-4 text-[30px] font-medium md:text-[38px]">Todo o catálogo</h2>}
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    <p className="text-muted-foreground mr-2 text-[13px]">
                        {produtos.length} {produtos.length === 1 ? 'peça' : 'peças'}
                    </p>
                    {materialActual && <Activo onTirar={() => ir({ material: undefined })}>{materialActual}</Activo>}
                    {filtros.pesquisa && (
                        <Activo
                            onTirar={() => {
                                setPesquisa('');
                                ir({ pesquisa: undefined });
                            }}
                        >
                            “{filtros.pesquisa}”
                        </Activo>
                    )}
                    {temFiltros && (
                        <button
                            type="button"
                            onClick={() => {
                                setPesquisa('');
                                router.get('/catalogo', filtros.ordem ? { ordem: filtros.ordem } : {}, { preserveScroll: true, replace: true });
                            }}
                            className="text-[12.5px] underline underline-offset-4 hover:no-underline"
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>

                {produtos.length === 0 ? (
                    <div className="rounded-xl border px-4 py-16 text-center">
                        <p className="font-titulo text-[24px]">Não encontrámos peças com estes filtros.</p>
                        <p className="text-muted-foreground mt-2 text-[14px]">Experimente outra categoria ou limpe os filtros.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                        {produtos.map((p) => (
                            <CartaoProduto key={p.id} p={p} />
                        ))}
                    </div>
                )}
            </section>
        </SiteLayout>
    );
}
