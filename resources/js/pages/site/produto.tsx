import InputError from '@/components/input-error';
import { CartaoProduto, Disponibilidade, Foto, TituloSeccao, type ProdutoLoja } from '@/components/site';
import SiteLayout, { useSite } from '@/layouts/site-layout';
import { formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, router, useForm } from '@inertiajs/react';
import { ChevronLeft, Hammer, LoaderCircle, Palette, Plus, Truck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Props {
    produto: ProdutoLoja & { fotos: { id: number; grande: string; media: string; mini: string }[] };
    filtros: { de?: string; ate?: string };
    podeReservar: boolean;
    relacionados: ProdutoLoja[];
}

const campo = 'border-input bg-card focus-visible:ring-ring h-10 rounded-full border px-4 text-[13.5px] outline-none focus-visible:ring-2';

const GARANTIAS = [
    { icone: Truck, texto: 'Entrega, montagem e recolha em Maputo e Matola' },
    { icone: Palette, texto: 'Almofadas e mesas a combinar com o seu tema' },
    { icone: Hammer, texto: 'Fabrico próprio, limpo e revisto antes de cada evento' },
];

/** Ficha de uma peça: fotos, descrição e, para quem tem sessão, preço, disponibilidade e "Juntar à reserva" */
export default function ProdutoSite({ produto: p, filtros, podeReservar, relacionados }: Props) {
    const { cliente, equipa } = useSite();
    const [activa, setActiva] = useState(0);
    const [datas, setDatas] = useState({ de: filtros.de ?? '', ate: filtros.ate ?? '' });
    const form = useForm({ produto_id: p.id, quantidade: '1' });
    const foto = p.fotos[activa];
    const detalhes = [
        ['Categoria', p.categoria],
        ['Material', p.material],
        ['Preço', p.preco_dia ? `${formatNumero(p.preco_dia)} MT por dia, com IVA` : null],
    ].filter(([, v]) => v) as [string, string][];

    function adicionar(e: FormEvent) {
        e.preventDefault();
        form.post('/catalogo/reserva/linhas', { preserveScroll: true });
    }

    function verDisponibilidade(e: FormEvent) {
        e.preventDefault();
        router.get(`/catalogo/${p.id}`, Object.fromEntries(Object.entries(datas).filter(([, v]) => v)), {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    return (
        <SiteLayout titulo={`${p.nome} · LemServ`}>
            <div className="mx-auto max-w-7xl px-4 pt-8 md:px-8">
                <Link href="/catalogo" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[13px]">
                    <ChevronLeft className="size-3.5" />
                    Catálogo
                </Link>

                <div className="mt-5 grid gap-10 lg:grid-cols-[1.25fr_1fr]">
                    {/* Fotos */}
                    <div>
                        <div className="aspect-[4/3] overflow-hidden rounded-[24px] bg-[var(--areia)]">
                            {foto ? <img src={foto.grande} alt={p.nome} className="size-full object-cover" /> : <Foto src={null} alt={p.nome} />}
                        </div>
                        {p.fotos.length > 1 && (
                            <div className="mt-3 flex gap-2 overflow-x-auto">
                                {p.fotos.map((f, i) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setActiva(i)}
                                        aria-label={`Foto ${i + 1}`}
                                        className={cn(
                                            'size-20 shrink-0 overflow-hidden rounded-xl border-2 transition-opacity',
                                            i === activa ? 'border-[var(--tinta)]' : 'border-transparent opacity-70 hover:opacity-100',
                                        )}
                                    >
                                        <img src={f.mini} alt="" className="size-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Informação e reserva */}
                    <div className="lg:pt-2">
                        <p className="text-primary text-[12px] font-medium tracking-[0.16em] uppercase">{p.categoria}</p>
                        <h1 className="font-titulo mt-2 text-[36px] leading-[1.06] tracking-[-0.015em] md:text-[44px]">{p.nome}</h1>
                        {p.descricao && <p className="text-muted-foreground mt-4 text-[15px] leading-relaxed whitespace-pre-line">{p.descricao}</p>}

                        {detalhes.length > 0 && (
                            <dl className="mt-6 divide-y border-y text-[14px]">
                                {detalhes.map(([k, v]) => (
                                    <div key={k} className="flex justify-between gap-4 py-3">
                                        <dt className="text-muted-foreground">{k}</dt>
                                        <dd className="text-right font-medium">{v}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}

                        {p.preco_dia ? (
                            <div className="bg-card mt-6 rounded-2xl border p-5">
                                <form onSubmit={verDisponibilidade} className="flex flex-wrap items-end gap-2">
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
                                    <button type="submit" className="hover:bg-muted h-10 rounded-full border px-4 text-[13px] font-medium">
                                        Ver disponibilidade
                                    </button>
                                </form>
                                <Disponibilidade n={p.disponivel} className="mt-3" />

                                {podeReservar && (
                                    <form onSubmit={adicionar} className="mt-5 flex items-end gap-2 border-t pt-5">
                                        <label className="grid gap-1 text-[12px]">
                                            <span className="text-muted-foreground">Quantidade</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={9999}
                                                value={form.data.quantidade}
                                                onChange={(e) => form.setData('quantidade', e.target.value)}
                                                className={cn(campo, 'w-24 text-right')}
                                            />
                                        </label>
                                        <button
                                            type="submit"
                                            disabled={form.processing}
                                            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[var(--tinta)] px-5 text-[14px] font-medium text-white disabled:opacity-60"
                                        >
                                            {form.processing ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                                            Juntar à reserva
                                        </button>
                                    </form>
                                )}
                                <InputError message={form.errors.quantidade} className="mt-2" />
                            </div>
                        ) : (
                            !cliente &&
                            !equipa && (
                                <div className="mt-6 rounded-2xl bg-[var(--areia)]/70 p-5 text-[14px]">
                                    <p>Para ver o preço por dia, a disponibilidade e pedir a reserva, entre na sua conta.</p>
                                    <div className="mt-4 flex gap-2">
                                        <Link
                                            href="/conta/entrar"
                                            className="rounded-full border border-[var(--tinta)]/20 px-4 py-2 font-medium hover:bg-white"
                                        >
                                            Entrar
                                        </Link>
                                        <Link href="/conta/registar" className="rounded-full bg-[var(--tinta)] px-4 py-2 font-medium text-white">
                                            Criar conta
                                        </Link>
                                    </div>
                                </div>
                            )
                        )}

                        <ul className="mt-6 grid gap-3 text-[13.5px]">
                            {GARANTIAS.map((g) => (
                                <li key={g.texto} className="text-muted-foreground flex items-center gap-3">
                                    <g.icone className="text-primary size-4 shrink-0" strokeWidth={1.7} />
                                    {g.texto}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {relacionados.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8">
                    <TituloSeccao etiqueta={p.categoria ?? undefined} titulo="Também lhe pode interessar" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
                        {relacionados.map((r) => (
                            <CartaoProduto key={r.id} p={r} />
                        ))}
                    </div>
                </section>
            )}
        </SiteLayout>
    );
}
