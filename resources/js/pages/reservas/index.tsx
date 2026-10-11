import {
    BotaoLink,
    ColunaOrdenavel,
    Estado,
    EstadoReserva,
    FiltroTexto,
    LinhaVazia,
    PorPagina,
    TituloPagina,
    useListaFiltros,
    type OrdenacaoLista,
} from '@/components/erp';
import { Paginacao } from '@/components/paginacao';
import { datasEvento, type ReservaResumo } from '@/components/reserva';
import { Button } from '@/components/ui/button';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Paginado } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CalendarDays, FilterX, Plus, Truck } from 'lucide-react';

interface Props {
    reservas: Paginado<ReservaResumo & { cliente: string; facturada: boolean }>;
    filtros: Record<string, string | undefined>;
    ordenacao: OrdenacaoLista;
    resumo: { pedidos: number; entregas: number; recolhas: number; atrasadas: number };
}

const ESTADOS = [
    { valor: undefined, label: 'Todas' },
    { valor: 'activas', label: 'Em curso' },
    { valor: 'pedido', label: 'Pedidos' },
    { valor: 'confirmada', label: 'Confirmadas' },
    { valor: 'entregue', label: 'Entregues' },
    { valor: 'devolvida', label: 'Devolvidas' },
    { valor: 'cancelada', label: 'Canceladas' },
];

export default function Reservas({ reservas, filtros, ordenacao, resumo }: Props) {
    const pode = usePode();
    const lista = useListaFiltros('/reservas', filtros, ordenacao);

    return (
        <AppLayout>
            <Head title="Reservas" />
            <TituloPagina
                titulo="Reservas"
                contagem={reservas.total}
                accoes={
                    <>
                        {lista.temFiltros && (
                            <Button variant="ghost" size="sm" onClick={lista.limpar}>
                                <FilterX className="size-4" />
                                Limpar filtros
                            </Button>
                        )}
                        <BotaoLink href="/reservas/calendario" variante="outline" icone={CalendarDays}>
                            Calendário
                        </BotaoLink>
                        {pode('reservas.criar') && (
                            <BotaoLink href="/reservas/nova" icone={Plus}>
                                Nova reserva
                            </BotaoLink>
                        )}
                    </>
                }
            />

            <section className="grelha-celulas mb-6 grid grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Pedidos por confirmar', valor: resumo.pedidos, estado: 'pedido' },
                    { label: 'Entregas nos próximos 7 dias', valor: resumo.entregas, estado: 'confirmada' },
                    { label: 'Recolhas nos próximos 7 dias', valor: resumo.recolhas, estado: 'entregue' },
                    { label: 'Recolhas em atraso', valor: resumo.atrasadas, estado: 'atrasadas', alerta: resumo.atrasadas > 0 },
                ].map((c) => (
                    <button
                        key={c.label}
                        type="button"
                        onClick={() => lista.escolher('estado', c.estado)}
                        className={cn('bg-card hover:bg-muted px-4 py-3 text-left transition-colors', filtros.estado === c.estado && 'bg-muted')}
                    >
                        <p className="text-muted-foreground text-[13px]">{c.label}</p>
                        <p className={cn('text-xl font-semibold tabular-nums', c.alerta && 'text-red-600 dark:text-red-400')}>{c.valor}</p>
                    </button>
                ))}
            </section>

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1">
                    {ESTADOS.map((e) => (
                        <button
                            key={e.label}
                            type="button"
                            onClick={() => lista.escolher('estado', e.valor ?? '')}
                            className={
                                filtros.estado === e.valor
                                    ? 'bg-foreground text-background h-8 rounded-md px-3 text-[13px] font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted h-8 rounded-md px-3 text-[13px]'
                            }
                        >
                            {e.label}
                        </button>
                    ))}
                </div>
                <FiltroTexto
                    rotulo="número, cliente ou local"
                    valor={lista.valores.pesquisa}
                    onChange={(v) => lista.escrever('pesquisa', v)}
                    className="w-60 max-w-full"
                />
            </div>

            <div className="painel overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr>
                            <ColunaOrdenavel coluna="numero" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Reserva
                            </ColunaOrdenavel>
                            <th>Cliente</th>
                            <ColunaOrdenavel coluna="evento" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Evento
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="entrega" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Entrega → recolha
                            </ColunaOrdenavel>
                            <th>Local</th>
                            <ColunaOrdenavel coluna="total" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="text-right">
                                Total
                            </ColunaOrdenavel>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reservas.data.length === 0 && <LinhaVazia colunas={7} texto="Nenhuma reserva encontrada" />}
                        {reservas.data.map((r) => (
                            <tr key={r.id}>
                                <td className="whitespace-nowrap">
                                    <Link href={`/reservas/${r.id}`} className="text-primary font-medium hover:underline">
                                        {r.numero}
                                    </Link>
                                </td>
                                <td className="max-w-56">
                                    <span className="line-clamp-1">{r.cliente}</span>
                                </td>
                                <td className="whitespace-nowrap tabular-nums">{datasEvento(r)}</td>
                                <td className="text-muted-foreground whitespace-nowrap tabular-nums">
                                    {formatData(r.data_entrega).slice(0, 5)} → {formatData(r.data_recolha).slice(0, 5)}
                                </td>
                                <td className="max-w-64">
                                    <span className="text-muted-foreground line-clamp-1">
                                        {r.transporte && <Truck className="mr-1 inline size-3.5 align-[-2px]" aria-label="Com transporte" />}
                                        {r.local ?? '—'}
                                    </span>
                                </td>
                                <td className="text-right font-medium whitespace-nowrap tabular-nums">{formatNumero(r.total)}</td>
                                <td>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                                        <EstadoReserva estado={r.estado} atrasada={r.atrasada} />
                                        {r.facturada && <Estado cor="verde">Facturada</Estado>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Paginacao pagina={reservas} nome="reservas" extra={<PorPagina valor={reservas.per_page} onChange={lista.porPagina} />} />
        </AppLayout>
    );
}
