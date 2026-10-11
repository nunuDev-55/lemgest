/** Peças das páginas da área do cliente (tipos e listas curtas) */
import { EstadoFactura, EstadoReserva } from '@/components/erp';
import { datasEvento, type ReservaResumo } from '@/components/reserva';
import { formatData, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

export type ReservaCliente = Omit<ReservaResumo, 'estado_nome' | 'cliente' | 'terceiro_id'>;

export interface FacturaCliente {
    id: number;
    numero: string;
    estado: string;
    data: string;
    data_vencimento: string | null;
    vencida: boolean;
    total: string;
    em_falta: string;
}

export function ListaReservas({ reservas, vazio }: { reservas: ReservaCliente[]; vazio: string }) {
    if (reservas.length === 0) return <p className="text-muted-foreground rounded-lg border px-4 py-8 text-center text-[13.5px]">{vazio}</p>;
    return (
        <ul className="divide-y rounded-lg border">
            {reservas.map((r) => (
                <li key={r.id}>
                    <Link href={`/conta/reservas/${r.id}`} className="hover:bg-muted flex items-center gap-4 px-4 py-3.5 transition-colors">
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-medium">{datasEvento(r)}</span>
                                <EstadoReserva estado={r.estado} atrasada={r.atrasada} />
                            </div>
                            <p className="text-muted-foreground truncate text-[13px]">{[r.numero, r.local].filter(Boolean).join(' · ')}</p>
                        </div>
                        <span className="text-[14px] font-medium tabular-nums">{formatNumero(r.total)} MT</span>
                        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                </li>
            ))}
        </ul>
    );
}

export function ListaFacturas({ facturas, vazio }: { facturas: FacturaCliente[]; vazio: string }) {
    if (facturas.length === 0) return <p className="text-muted-foreground rounded-lg border px-4 py-8 text-center text-[13.5px]">{vazio}</p>;
    return (
        <ul className="divide-y rounded-lg border">
            {facturas.map((f) => (
                <li key={f.id}>
                    {/* A factura abre em A4, pronta a imprimir ou guardar em PDF */}
                    <a
                        href={`/conta/facturas/${f.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:bg-muted flex items-center gap-4 px-4 py-3.5 transition-colors"
                    >
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-medium">{f.numero}</span>
                                <EstadoFactura
                                    estado={f.estado}
                                    vencida={f.vencida}
                                    parcial={f.estado === 'validada' && Number(f.em_falta) < Number(f.total)}
                                />
                            </div>
                            <p className="text-muted-foreground text-[13px]">
                                {formatData(f.data)}
                                {f.estado === 'validada' && f.data_vencimento && (
                                    <span className={cn(f.vencida && 'font-medium text-red-600 dark:text-red-400')}>
                                        {' '}
                                        · pagar até {formatData(f.data_vencimento)}
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[14px] font-medium tabular-nums">{formatNumero(f.total)} MT</p>
                            {f.estado === 'validada' && (
                                <p className="text-muted-foreground text-[12.5px] tabular-nums">falta {formatNumero(f.em_falta)} MT</p>
                            )}
                        </div>
                        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                    </a>
                </li>
            ))}
        </ul>
    );
}
