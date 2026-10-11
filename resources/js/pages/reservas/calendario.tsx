import { BotaoLink, TituloPagina } from '@/components/erp';
import { type ReservaResumo } from '@/components/reserva';
import { hojeLocal } from '@/components/stock';
import { Button } from '@/components/ui/button';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, List, Plus } from 'lucide-react';
import { useMemo } from 'react';

type Reserva = ReservaResumo & { cliente: string };

interface Props {
    mes: string; // "2026-11"
    reservas: Reserva[];
}

/** O que acontece a uma reserva num dia */
type Papel = 'evento' | 'entrega' | 'recolha';

const COR: Record<string, string> = {
    pedido: 'bg-amber-500',
    confirmada: 'bg-blue-600 dark:bg-blue-500',
    entregue: 'bg-primary dark:bg-[#c77bb8]',
    devolvida: 'bg-green-600 dark:bg-green-500',
};

const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function iso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mesVizinho(mes: string, delta: number): string {
    const [a, m] = mes.split('-').map(Number);
    const d = new Date(a, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Papel da reserva no dia (o evento tem prioridade sobre a entrega e a recolha) */
function papel(r: Reserva, dia: string): Papel | null {
    if (dia >= r.data_evento && dia <= r.data_fim_evento) return 'evento';
    if (dia === r.data_entrega) return 'entrega';
    if (dia === r.data_recolha) return 'recolha';
    return null;
}

function Etiqueta({ r, p }: { r: Reserva; p: Papel }) {
    return (
        <Link
            href={`/reservas/${r.id}`}
            title={`${r.numero} · ${r.cliente}${r.local ? ` · ${r.local}` : ''}`}
            className={cn(
                'hover:bg-muted flex min-w-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-[12px] leading-tight',
                p !== 'evento' && 'text-muted-foreground',
            )}
        >
            <span className={cn('size-[7px] shrink-0 rounded-full', COR[r.estado] ?? 'bg-neutral-400')} aria-hidden="true" />
            <span className="truncate">
                {p === 'entrega' ? 'Entrega · ' : p === 'recolha' ? 'Recolha · ' : ''}
                <span className={cn(p === 'evento' && 'font-medium')}>{r.cliente}</span>
            </span>
        </Link>
    );
}

export default function Calendario({ mes, reservas }: Props) {
    const pode = usePode();
    const hoje = hojeLocal();
    const [ano, numMes] = mes.split('-').map(Number);
    const titulo = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(ano, numMes - 1, 1));

    // Semanas de segunda a domingo que cobrem o mês
    const dias = useMemo(() => {
        const primeiro = new Date(ano, numMes - 1, 1);
        const inicio = new Date(primeiro);
        inicio.setDate(1 - ((primeiro.getDay() + 6) % 7));
        const ultimo = new Date(ano, numMes, 0);
        const fim = new Date(ultimo);
        fim.setDate(ultimo.getDate() + (6 - ((ultimo.getDay() + 6) % 7)));
        const lista: { dia: string; numero: number; doMes: boolean }[] = [];
        for (const d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
            lista.push({ dia: iso(d), numero: d.getDate(), doMes: d.getMonth() === numMes - 1 });
        }
        return lista;
    }, [ano, numMes]);

    const doDia = (dia: string) => reservas.map((r) => ({ r, p: papel(r, dia) })).filter((x): x is { r: Reserva; p: Papel } => x.p !== null);

    const irPara = (m: string) => router.get('/reservas/calendario', { mes: m }, { preserveScroll: true, replace: true });

    return (
        <AppLayout>
            <Head title="Calendário de reservas" />
            <TituloPagina
                titulo="Calendário"
                descricao="Os dias de cada evento, e quando o material sai e volta."
                accoes={
                    <>
                        <BotaoLink href="/reservas" variante="outline" icone={List}>
                            Lista
                        </BotaoLink>
                        {pode('reservas.criar') && (
                            <BotaoLink href="/reservas/nova" icone={Plus}>
                                Nova reserva
                            </BotaoLink>
                        )}
                    </>
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => irPara(mesVizinho(mes, -1))} aria-label="Mês anterior">
                    <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => irPara(mesVizinho(mes, 1))} aria-label="Mês seguinte">
                    <ChevronRight className="size-4" />
                </Button>
                <h2 className="ml-1 text-[16px] font-semibold first-letter:uppercase">{titulo}</h2>
                {mes !== hoje.slice(0, 7) && (
                    <Button variant="ghost" size="sm" onClick={() => irPara(hoje.slice(0, 7))}>
                        Hoje
                    </Button>
                )}
                <div className="text-muted-foreground ml-auto flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                    {[
                        ['pedido', 'Pedido'],
                        ['confirmada', 'Confirmada'],
                        ['entregue', 'Entregue'],
                        ['devolvida', 'Devolvida'],
                    ].map(([e, l]) => (
                        <span key={e} className="inline-flex items-center gap-1.5">
                            <span className={cn('size-[7px] rounded-full', COR[e])} />
                            {l}
                        </span>
                    ))}
                </div>
            </div>

            {/* Computador: grelha do mês */}
            <div className="painel hidden overflow-hidden md:block">
                <div className="grid grid-cols-7 border-b">
                    {DIAS_SEMANA.map((d) => (
                        <div key={d} className="text-muted-foreground px-2 py-2 text-[12.5px] font-medium">
                            {d}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7">
                    {dias.map(({ dia, numero, doMes }) => {
                        const itens = doDia(dia);
                        return (
                            <div key={dia} className={cn('min-h-28 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0', !doMes && 'bg-muted/60')}>
                                <div
                                    className={cn(
                                        'mb-1 flex size-6 items-center justify-center rounded-full text-[12.5px] tabular-nums',
                                        !doMes && 'text-muted-foreground',
                                        dia === hoje && 'bg-foreground text-background font-semibold',
                                    )}
                                >
                                    {numero}
                                </div>
                                <div className="grid gap-0.5">
                                    {itens.slice(0, 4).map(({ r, p }) => (
                                        <Etiqueta key={`${r.id}-${p}`} r={r} p={p} />
                                    ))}
                                    {itens.length > 4 && <span className="text-muted-foreground px-1.5 text-[11.5px]">+{itens.length - 4}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Telemóvel: agenda, só os dias com movimento */}
            <div className="grid gap-3 md:hidden">
                {dias
                    .filter((d) => d.doMes)
                    .map(({ dia }) => ({ dia, itens: doDia(dia) }))
                    .filter((d) => d.itens.length > 0)
                    .map(({ dia, itens }) => (
                        <section key={dia} className="painel">
                            <h3 className={cn('border-b px-3 py-2 text-[13px] font-semibold first-letter:uppercase', dia === hoje && 'text-primary')}>
                                {new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' }).format(
                                    new Date(`${dia}T00:00:00`),
                                )}
                            </h3>
                            <div className="grid gap-0.5 p-1.5">
                                {itens.map(({ r, p }) => (
                                    <Etiqueta key={`${r.id}-${p}`} r={r} p={p} />
                                ))}
                            </div>
                        </section>
                    ))}
                {reservas.length === 0 && <p className="text-muted-foreground py-10 text-center text-[13.5px]">Sem reservas neste mês.</p>}
            </div>
        </AppLayout>
    );
}
