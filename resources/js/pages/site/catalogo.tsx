import { CarrosselProdutos, CartaoProduto, SelosConfianca, type ProdutoLoja } from '@/components/site';
import SiteLayout, { useSite } from '@/layouts/site-layout';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { ArrowRight, ChevronDown, History, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

type Opcao = { valor: string; label: string };

/** Pesquisas recentes: só neste navegador (comodidade de quem o usa), nunca no servidor */
const CHAVE_RECENTES = 'lemserv.pesquisas';

function lerRecentes(): string[] {
    try {
        const lista: unknown = JSON.parse(localStorage.getItem(CHAVE_RECENTES) ?? '[]');
        return Array.isArray(lista) ? lista.filter((t): t is string => typeof t === 'string').slice(0, 6) : [];
    } catch {
        return [];
    }
}

function guardarRecentes(lista: string[]) {
    try {
        localStorage.setItem(CHAVE_RECENTES, JSON.stringify(lista));
    } catch {
        // Sem armazenamento (janela privada, por exemplo): as recentes valem só nesta visita
    }
}

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
                    'bg-card focus-visible:ring-ring cursor-pointer appearance-none rounded-full border pr-9 pl-4 text-[13px] outline-none focus-visible:ring-2',
                    largo ? 'h-11 w-full' : 'h-12',
                )}
            >
                {todos && <option value="">{todos}</option>}
                {opcoes.map((o) => (
                    <option key={o.valor} value={o.valor}>
                        {o.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="text-muted-foreground pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2" />
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
    const [focado, setFocado] = useState(false);
    const [recentes, setRecentes] = useState<string[]>(lerRecentes);
    const campoPesquisa = useRef<HTMLInputElement>(null);

    const ir = (novos: Record<string, string | undefined>) => {
        const params = Object.fromEntries(Object.entries({ ...filtros, ...novos }).filter(([, v]) => v));
        router.get('/catalogo', params, { preserveScroll: true, preserveState: true, replace: true });
    };

    /** Guarda a pesquisa nas recentes; "sof" e depois "sofá" deixam só a mais completa */
    const lembrar = (termo: string) => {
        const t = termo.trim();
        if (t.length < 3) return;
        setRecentes((antes) => {
            const lista = [t, ...antes.filter((r) => !t.toLowerCase().startsWith(r.toLowerCase()))].slice(0, 6);
            guardarRecentes(lista);
            return lista;
        });
    };
    const esquecerRecentes = () => {
        setRecentes([]);
        guardarRecentes([]);
    };

    // Pesquisa ao fim de uma pausa a escrever
    useEffect(() => {
        if (pesquisa === (filtros.pesquisa ?? '')) return;
        const t = setTimeout(() => {
            ir({ pesquisa });
            lembrar(pesquisa);
        }, 400);
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
                <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-7 pb-7 md:flex-row md:items-end md:justify-between md:gap-6 md:px-8 md:pt-14 md:pb-12">
                    <div className="min-w-0">
                        <p className="maiusculas-pequenas text-[#efe6da]/55">
                            <Link href="/" className="hover:text-white">
                                Início
                            </Link>{' '}
                            / Catálogo{categoriaActual ? ` / ${categoriaActual}` : ''}
                        </p>
                        <h1 className="titulo-maiusculo mt-4 text-[32px] break-words sm:text-[48px] md:mt-6 md:text-[66px]">
                            {categoriaActual ?? 'Todo o nosso material.'}
                        </h1>
                        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-[#efe6da]/70 md:mt-4 md:text-[15.5px]">
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

            {/* Barra presa ao topo ao descer: a pesquisa em destaque (no telemóvel com os filtros lá dentro) e as categorias por baixo */}
            <section className="bg-background/95 sticky top-[76px] z-20 border-b backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:px-8">
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-0 flex-1">
                            <label className="block">
                                <span className="sr-only">Procurar no catálogo</span>
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2" />
                                <input
                                    ref={campoPesquisa}
                                    value={pesquisa}
                                    onChange={(e) => setPesquisa(e.target.value)}
                                    onFocus={() => setFocado(true)}
                                    onBlur={() => setFocado(false)}
                                    onKeyDown={(e) => {
                                        // Enter fecha o teclado do telemóvel (a pesquisa já corre sozinha); Esc fecha as recentes
                                        if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
                                    }}
                                    enterKeyHint="search"
                                    autoComplete="off"
                                    placeholder="Procurar sofás, puffs, tendas…"
                                    className="bg-card focus-visible:ring-ring h-12 w-full rounded-full border pr-14 pl-11 text-[15px] shadow-sm outline-none focus-visible:ring-2 lg:pr-5"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => setPainel((p) => !p)}
                                aria-expanded={painel}
                                aria-controls="painel-filtros"
                                aria-label={noPainel > 0 ? `Filtros (${noPainel} escolhidos)` : 'Filtros'}
                                className={cn(
                                    'absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-full transition-colors lg:hidden',
                                    painel ? 'bg-[var(--tinta)] text-[#efe6da]' : 'hover:bg-muted',
                                )}
                            >
                                <SlidersHorizontal className="size-[18px]" />
                                {noPainel > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] rounded-full bg-[var(--dourado)] px-1 text-center text-[10.5px] leading-[18px] font-semibold text-[var(--tinta)]">
                                        {noPainel}
                                    </span>
                                )}
                            </button>
                            {/* Pesquisas recentes (só neste navegador), ao tocar na barra vazia */}
                            {focado && pesquisa === '' && recentes.length > 0 && (
                                <div
                                    onMouseDown={(e) => e.preventDefault()}
                                    className="bg-card absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border p-2 shadow-lg"
                                >
                                    <div className="flex items-center justify-between px-3 pt-1 pb-2">
                                        <span className="maiusculas-pequenas text-muted-foreground text-[10.5px]">Pesquisas recentes</span>
                                        <button
                                            type="button"
                                            onClick={esquecerRecentes}
                                            className="text-muted-foreground hover:text-foreground text-[12.5px] underline-offset-4 hover:underline"
                                        >
                                            Limpar
                                        </button>
                                    </div>
                                    <ul>
                                        {recentes.map((t) => (
                                            <li key={t}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPesquisa(t);
                                                        campoPesquisa.current?.blur();
                                                    }}
                                                    className="hover:bg-muted flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px]"
                                                >
                                                    <History className="text-muted-foreground size-4 shrink-0" />
                                                    {t}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="hidden items-center gap-2 lg:flex">
                            {escolhaMaterial()}
                            {escolhaOrdem()}
                        </div>
                    </div>
                    {painel && (
                        <div id="painel-filtros" className="grid gap-2 sm:grid-cols-2 lg:hidden">
                            {escolhaMaterial(true)}
                            {escolhaOrdem(true)}
                        </div>
                    )}
                    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0 [&::-webkit-scrollbar]:hidden">
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

            {/* O que a LemServ garante em todas as peças (sem filtros; com filtros, os resultados vêm primeiro) */}
            {!temFiltros && (
                <div className="mx-auto max-w-7xl px-4 pt-8 md:px-8">
                    <SelosConfianca />
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
