import InputError from '@/components/input-error';
import { Disponibilidade, Foto, type ProdutoLoja } from '@/components/site';
import SiteLayout, { useSite } from '@/layouts/site-layout';
import { formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, router, useForm } from '@inertiajs/react';
import { ChevronLeft, LoaderCircle, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Props {
    produto: ProdutoLoja & { fotos: { id: number; grande: string; media: string; mini: string }[] };
    filtros: { de?: string; ate?: string };
    podeReservar: boolean;
}

const campo = 'border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-2.5 text-[13.5px] outline-none focus-visible:ring-2';

export default function ProdutoSite({ produto: p, filtros, podeReservar }: Props) {
    const { cliente } = useSite();
    const [activa, setActiva] = useState(0);
    const [datas, setDatas] = useState({ de: filtros.de ?? '', ate: filtros.ate ?? '' });
    const form = useForm({ produto_id: p.id, quantidade: '1' });
    const foto = p.fotos[activa];

    function adicionar(e: FormEvent) {
        e.preventDefault();
        form.post('/catalogo/reserva/linhas', { preserveScroll: true });
    }

    return (
        <SiteLayout titulo={`${p.nome} · LemServ`} largo>
            <div className="py-6">
                <Link href="/catalogo" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[13px]">
                    <ChevronLeft className="size-3.5" />
                    Catálogo
                </Link>

                <div className="mt-4 grid gap-8 md:grid-cols-[1.2fr_1fr]">
                    <div>
                        <div className="aspect-[4/3] overflow-hidden rounded-lg border">
                            <Foto src={foto?.grande ?? null} alt={p.nome} />
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
                                            'size-16 shrink-0 overflow-hidden rounded-md border-2',
                                            i === activa ? 'border-foreground' : 'border-transparent',
                                        )}
                                    >
                                        <img src={f.mini} alt="" className="size-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-muted-foreground text-[13px]">{[p.categoria, p.material].filter(Boolean).join(' · ')}</p>
                        <h1 className="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.02em]">{p.nome}</h1>
                        {p.descricao && <p className="text-muted-foreground mt-3 text-[14.5px] leading-relaxed whitespace-pre-line">{p.descricao}</p>}

                        {p.preco_dia ? (
                            <div className="mt-6 rounded-lg border p-4">
                                <p className="text-[22px] font-semibold tabular-nums">
                                    {formatNumero(p.preco_dia)} MT{' '}
                                    <span className="text-muted-foreground text-[13px] font-normal">por dia, com IVA</span>
                                </p>

                                <form
                                    className="mt-4 flex flex-wrap items-end gap-2"
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        router.get(`/catalogo/${p.id}`, Object.fromEntries(Object.entries(datas).filter(([, v]) => v)), {
                                            preserveScroll: true,
                                            preserveState: true,
                                            replace: true,
                                        });
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
                                    <button type="submit" className="hover:bg-muted h-9 rounded-md border px-3 text-[13px] font-medium">
                                        Ver disponibilidade
                                    </button>
                                </form>
                                <Disponibilidade n={p.disponivel} className="mt-3" />

                                {podeReservar && (
                                    <form onSubmit={adicionar} className="mt-5 flex items-end gap-2 border-t pt-4">
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
                                            className="bg-primary text-primary-foreground inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[13.5px] font-medium disabled:opacity-60"
                                        >
                                            {form.processing ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                                            Juntar à reserva
                                        </button>
                                    </form>
                                )}
                                <InputError message={form.errors.quantidade} className="mt-2" />
                            </div>
                        ) : (
                            !cliente && (
                                <div className="bg-muted/50 mt-6 rounded-lg border p-4 text-[13.5px]">
                                    <p>Para ver o preço por dia e pedir a reserva, entre na sua conta.</p>
                                    <div className="mt-3 flex gap-2">
                                        <Link href="/conta/entrar" className="hover:bg-background rounded-md border px-3 py-1.5 font-medium">
                                            Entrar
                                        </Link>
                                        <Link
                                            href="/conta/registar"
                                            className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 font-medium"
                                        >
                                            Criar conta
                                        </Link>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </SiteLayout>
    );
}
