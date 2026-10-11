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

const campo = 'border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-2.5 text-[13.5px] outline-none focus-visible:ring-2';

/** Catálogo: fotos para todos; preço e disponibilidade para quem entrou na sua conta */
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

    return (
        <SiteLayout titulo="Catálogo · LemServ" largo>
            <div className="py-8">
                <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Catálogo</h1>
                <p className="text-muted-foreground mt-1 text-[14.5px]">Material para alugar, fabricado pela LemServ.</p>

                {!verPrecos && (
                    <div className="bg-muted/50 mt-5 flex flex-col gap-3 rounded-lg border p-4 text-[13.5px] sm:flex-row sm:items-center sm:justify-between">
                        <p>Entre na sua conta para ver os preços por dia, a disponibilidade nas suas datas e pedir a reserva.</p>
                        <div className="flex shrink-0 gap-2">
                            <Link href="/conta/entrar" className="hover:bg-background rounded-md border px-3 py-1.5 font-medium">
                                Entrar
                            </Link>
                            <Link href="/conta/registar" className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 font-medium">
                                Criar conta
                            </Link>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex flex-wrap gap-1.5">
                    {[{ valor: '', label: 'Tudo' }, ...categorias].map((c) => (
                        <button
                            key={c.valor || 'tudo'}
                            type="button"
                            onClick={() => ir({ categoria: c.valor || undefined })}
                            className={cn(
                                'h-8 rounded-full border px-3.5 text-[13px]',
                                (filtros.categoria ?? '') === c.valor
                                    ? 'bg-foreground text-background border-foreground font-medium'
                                    : 'hover:bg-muted',
                            )}
                        >
                            {c.label}
                        </button>
                    ))}
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                    <label className="relative">
                        <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                        <input
                            value={pesquisa}
                            onChange={(e) => setPesquisa(e.target.value)}
                            placeholder="Procurar…"
                            aria-label="Procurar no catálogo"
                            className={cn(campo, 'w-56 pl-8')}
                        />
                    </label>
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
                    {verPrecos && (
                        <form
                            className="flex flex-wrap items-end gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                ir({ de: datas.de || undefined, ate: datas.ate || undefined });
                            }}
                        >
                            <label className="grid gap-1 text-[12px]">
                                <span className="text-muted-foreground">Do dia</span>
                                <input
                                    type="date"
                                    value={datas.de}
                                    onChange={(e) => setDatas((d) => ({ ...d, de: e.target.value }))}
                                    className={campo}
                                />
                            </label>
                            <label className="grid gap-1 text-[12px]">
                                <span className="text-muted-foreground">Ao dia</span>
                                <input
                                    type="date"
                                    value={datas.ate}
                                    min={datas.de}
                                    onChange={(e) => setDatas((d) => ({ ...d, ate: e.target.value }))}
                                    className={campo}
                                />
                            </label>
                            <button type="submit" className="bg-foreground text-background h-9 rounded-md px-3 text-[13px] font-medium">
                                Ver disponibilidade
                            </button>
                        </form>
                    )}
                </div>
                <InputError message={errors.de || errors.ate} className="mt-2" />

                {produtos.length === 0 ? (
                    <p className="text-muted-foreground mt-10 rounded-lg border px-4 py-12 text-center text-[14px]">
                        Nada encontrado com estes filtros.
                    </p>
                ) : (
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                        {produtos.map((p) => (
                            <CartaoProduto key={p.id} p={p} sufixo={sufixo} />
                        ))}
                    </div>
                )}
            </div>
        </SiteLayout>
    );
}
