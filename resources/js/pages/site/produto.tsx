import InputError from '@/components/input-error';
import { CarrosselProdutos, Foto, type ProdutoLoja } from '@/components/site';
import { VisorFotos } from '@/components/visor-fotos';
import SiteLayout, { useSite } from '@/layouts/site-layout';
import { formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, CalendarDays, ChevronLeft, Expand, Hammer, LoaderCircle, Palette, Plus, Truck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Props {
    produto: ProdutoLoja & { fotos: { id: number; grande: string; media: string; mini: string }[] };
    podeReservar: boolean;
    relacionados: ProdutoLoja[];
}

const campo = 'border-input bg-card focus-visible:ring-ring h-10 rounded-[3px] border px-3 text-[13.5px] outline-none focus-visible:ring-2';

const GARANTIAS = [
    { icone: Truck, texto: 'Entrega, montagem e recolha em Maputo e Matola' },
    { icone: Palette, texto: 'Almofadas e mesas a combinar com o seu tema' },
    { icone: Hammer, texto: 'Fabrico próprio, limpo e revisto antes de cada evento' },
];

/** Ficha de uma peça (só com conta): fotos, descrição, preço por dia e "Juntar à reserva"; as datas escolhem-se na reserva */
export default function ProdutoSite({ produto: p, podeReservar, relacionados }: Props) {
    const { carrinho } = useSite();
    const [activa, setActiva] = useState(0);
    const [visor, setVisor] = useState<number | null>(null);
    const form = useForm({ produto_id: p.id, quantidade: '1' });
    const foto = p.fotos[activa];
    // A categoria já está por cima do título e o preço na caixa da reserva: aqui só o que falta dizer
    const detalhes = [['Material', p.material]].filter(([, v]) => v) as [string, string][];

    function adicionar(e: FormEvent) {
        e.preventDefault();
        form.post('/catalogo/reserva/linhas', { preserveScroll: true });
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
                        {foto ? (
                            <button
                                type="button"
                                onClick={() => setVisor(activa)}
                                className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[24px] bg-[var(--areia)]"
                                aria-label="Ver a foto em grande"
                            >
                                <Foto
                                    key={foto.id}
                                    src={foto.grande}
                                    alt={p.nome}
                                    prioridade
                                    className="transition-transform duration-500 group-hover:scale-[1.02]"
                                />
                                <span className="absolute right-4 bottom-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[12.5px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
                                    <Expand className="size-3.5" />
                                    Ver em grande
                                </span>
                            </button>
                        ) : (
                            <div className="aspect-[4/3] overflow-hidden rounded-[24px]">
                                <Foto src={null} alt={p.nome} />
                            </div>
                        )}
                        <VisorFotos fotos={p.fotos.map((f) => ({ src: f.grande, alt: p.nome }))} indice={visor} onMudar={setVisor} />
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
                        <p className="maiusculas-pequenas font-medium text-[#9c7a45]">{p.categoria}</p>
                        <h1 className="font-titulo mt-3 text-[32px] leading-[1.04] font-medium tracking-[-0.01em] break-words sm:text-[40px] md:text-[50px]">
                            {p.nome}
                        </h1>
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

                        {p.preco_dia && (
                            <div className="bg-card mt-6 rounded-xl border p-5">
                                <p className="font-titulo text-[30px] leading-none font-medium tabular-nums">
                                    {formatNumero(p.preco_dia)} MT{' '}
                                    <span className="text-muted-foreground font-sans text-[13px] font-normal">por dia, com IVA</span>
                                </p>
                                {podeReservar && (
                                    <form onSubmit={adicionar} className="mt-5 flex items-end gap-2">
                                        <label className="grid gap-1 text-[12px]">
                                            <span className="text-muted-foreground">Quantidade</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={9999}
                                                value={form.data.quantidade}
                                                onChange={(e) => form.setData('quantidade', e.target.value)}
                                                className={cn(campo, 'w-20 text-right')}
                                            />
                                        </label>
                                        <button
                                            type="submit"
                                            disabled={form.processing}
                                            className="maiusculas-pequenas inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[3px] bg-[var(--tinta)] px-4 font-medium text-[#efe6da] disabled:opacity-60"
                                        >
                                            {form.processing ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                                            Juntar à reserva
                                        </button>
                                    </form>
                                )}
                                <InputError message={form.errors.quantidade} className="mt-2" />
                                <p className="text-muted-foreground mt-4 flex items-start gap-2 text-[12.5px]">
                                    <CalendarDays className="mt-0.5 size-4 shrink-0" strokeWidth={1.6} />
                                    As datas do evento, o local e o transporte escolhem-se em "A minha reserva"; aí vê logo o que está livre.
                                </p>
                                {podeReservar && carrinho > 0 && (
                                    <Link
                                        href="/catalogo/reserva"
                                        className="maiusculas-pequenas mt-4 inline-flex items-center gap-1.5 font-medium hover:underline"
                                    >
                                        Ver a minha reserva ({carrinho})
                                        <ArrowRight className="size-3.5" />
                                    </Link>
                                )}
                            </div>
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
                <div className="mx-auto max-w-7xl px-4 pt-20 md:px-8">
                    <CarrosselProdutos etiqueta={p.categoria ?? undefined} titulo="Também lhe pode interessar" produtos={relacionados} />
                </div>
            )}
        </SiteLayout>
    );
}
