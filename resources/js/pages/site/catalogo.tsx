import InputError from '@/components/input-error';
import { CartaoProduto, type ProdutoLoja } from '@/components/site';
import SiteLayout, { useSite } from '@/layouts/site-layout';
import { cn } from '@/lib/utils';
import { Link, router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

type Opcao = { valor: string; label: string };

interface Props {
    produtos: ProdutoLoja[];
    filtros: { categoria?: string; material?: string; pesquisa?: string; de?: string; ate?: string };
    categorias: Opcao[];
    materiais: Opcao[];
    podeReservar: boolean;
}

const campo = 'border-input bg-card focus-visible:ring-ring h-10 rounded-[3px] border px-3 text-[13.5px] outline-none focus-visible:ring-2';

/** Catálogo: fotos para todos; preço e disponibilidade para quem entrou na sua conta (e para a equipa) */
export default function Catalogo({ produtos, filtros, categorias, materiais }: Props) {
    const { cliente, pode, equipa } = useSite();
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const verPrecos = (cliente !== null && pode('loja.catalogo')) || equipa !== null;
    const [pesquisa, setPesquisa] = useState(filtros.pesquisa ?? '');
    const [datas, setDatas] = useState({ de: filtros.de ?? '', ate: filtros.ate ?? '' });

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

    // As datas seguem para a ficha de cada produto
    const sufixo = filtros.de ? `?de=${filtros.de}${filtros.ate ? `&ate=${filtros.ate}` : ''}` : '';
    const categoriaActual = categorias.find((c) => c.valor === filtros.categoria)?.label;

    return (
        <SiteLayout titulo="Catálogo · LemServ">
            {/* Cabeçalho escuro, como a capa da página inicial */}
            <section className="escuro">
                <div className="mx-auto max-w-7xl px-4 pt-14 pb-12 md:px-8">
                    <p className="maiusculas-pequenas text-[#efe6da]/55">
                        <Link href="/" className="hover:text-white">
                            Início
                        </Link>{' '}
                        / Catálogo{categoriaActual ? ` / ${categoriaActual}` : ''}
                    </p>
                    <h1 className="titulo-maiusculo mt-6 text-[44px] md:text-[66px]">{categoriaActual ?? 'Todo o nosso material.'}</h1>
                    <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-[#efe6da]/70">
                        Sofás, puffs, mesas, tendas e decoração, fabricados pela LemServ.
                        {verPrecos && ' Escolha as datas do evento para ver o que está livre.'}
                    </p>

                    {!verPrecos && (
                        <div className="mt-8 flex flex-col gap-3 border border-[var(--dourado)]/40 p-5 text-[14px] sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-[#efe6da]/80">
                                Entre na sua conta para ver os preços por dia, a disponibilidade nas suas datas e pedir a reserva.
                            </p>
                            <div className="flex shrink-0 gap-2">
                                <Link
                                    href="/conta/entrar"
                                    className="maiusculas-pequenas rounded-[3px] border border-[#efe6da]/35 px-4 py-2.5 font-medium text-[#efe6da] hover:bg-white/10"
                                >
                                    Entrar
                                </Link>
                                <Link
                                    href="/conta/registar"
                                    className="maiusculas-pequenas rounded-[3px] bg-[var(--dourado)] px-4 py-2.5 font-medium text-[var(--tinta)]"
                                >
                                    Criar conta
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Filtros (ficam presos ao topo ao descer) */}
            <section className="bg-background/95 sticky top-[76px] z-20 border-b backdrop-blur">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 md:px-8">
                    <div className="flex flex-wrap gap-1.5">
                        {[{ valor: '', label: 'Tudo' }, ...categorias].map((c) => (
                            <button
                                key={c.valor || 'tudo'}
                                type="button"
                                onClick={() => ir({ categoria: c.valor || undefined })}
                                className={cn(
                                    'maiusculas-pequenas h-9 rounded-[3px] px-4 text-[10.5px] transition-colors',
                                    (filtros.categoria ?? '') === c.valor
                                        ? 'bg-[var(--tinta)] font-medium text-white'
                                        : 'bg-card hover:bg-muted border',
                                )}
                            >
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {materiais.length > 0 && (
                            <select
                                value={filtros.material ?? ''}
                                onChange={(e) => ir({ material: e.target.value || undefined })}
                                aria-label="Material"
                                className={campo}
                            >
                                <option value="">Todos os materiais</option>
                                {materiais.map((m) => (
                                    <option key={m.valor} value={m.valor}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        )}
                        <label className="relative">
                            <Search className="text-muted-foreground absolute top-3 left-3.5 size-4" />
                            <input
                                value={pesquisa}
                                onChange={(e) => setPesquisa(e.target.value)}
                                placeholder="Procurar…"
                                aria-label="Procurar no catálogo"
                                className={cn(campo, 'w-48 pl-9')}
                            />
                        </label>
                    </div>
                </div>
                {verPrecos && (
                    <form
                        className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 pb-3 text-[13px] md:px-8"
                        onSubmit={(e) => {
                            e.preventDefault();
                            ir({ de: datas.de || undefined, ate: datas.ate || undefined });
                        }}
                    >
                        <span className="text-muted-foreground">Datas do evento:</span>
                        <input
                            type="date"
                            aria-label="Do dia"
                            value={datas.de}
                            onChange={(e) => setDatas((d) => ({ ...d, de: e.target.value }))}
                            className={cn(campo, 'h-9')}
                        />
                        <span className="text-muted-foreground">a</span>
                        <input
                            type="date"
                            aria-label="Ao dia"
                            value={datas.ate}
                            min={datas.de}
                            onChange={(e) => setDatas((d) => ({ ...d, ate: e.target.value }))}
                            className={cn(campo, 'h-9')}
                        />
                        <button
                            type="submit"
                            className="maiusculas-pequenas h-9 rounded-[3px] bg-[var(--tinta)] px-4 text-[10.5px] font-medium text-white"
                        >
                            Ver disponibilidade
                        </button>
                        <InputError message={errors.de || errors.ate} />
                    </form>
                )}
            </section>

            <section className="mx-auto max-w-7xl px-4 pt-10 md:px-8">
                <p className="text-muted-foreground mb-6 text-[13px]">
                    {produtos.length} {produtos.length === 1 ? 'peça' : 'peças'}
                </p>
                {produtos.length === 0 ? (
                    <p className="text-muted-foreground rounded-2xl border px-4 py-16 text-center text-[14px]">Nada encontrado com estes filtros.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
                        {produtos.map((p) => (
                            <CartaoProduto key={p.id} p={p} sufixo={sufixo} />
                        ))}
                    </div>
                )}
            </section>
        </SiteLayout>
    );
}
