import { formatNumero } from '@/lib/format';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface MesGanhosGastos {
    mes: string; // "2026-10"
    /** Ganhos: facturado sem IVA, já sem as notas de crédito */
    valor: string;
    /** Gastos: compras de matéria-prima + despesas */
    gastos: string;
    resultado: string;
}

const nomeMes = new Intl.DateTimeFormat('pt-PT', { month: 'short', timeZone: 'UTC' });
/** "2026-10" → "out 26" */
const mesCurto = (d: Date) => `${nomeMes.format(d).replace('.', '')} ${String(d.getUTCFullYear()).slice(2)}`;
const mesLongo = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const compacto = new Intl.NumberFormat('pt-PT', { notation: 'compact', maximumFractionDigits: 1 });

const data = (mes: string) => new Date(`${mes}-01T00:00:00Z`);

function Dica({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as MesGanhosGastos;
    return (
        <div className="glass-strong rounded-md px-3 py-2 text-xs">
            <p className="mb-1 font-semibold first-letter:uppercase">{mesLongo.format(data(p.mes))}</p>
            <p className="tabular-nums">
                <span className="mr-1.5 inline-block size-2 rounded-sm bg-[var(--chart-1)] align-middle" />
                Ganhos {formatNumero(p.valor)} MT
            </p>
            <p className="tabular-nums">
                <span className="mr-1.5 inline-block size-2 rounded-sm bg-[var(--chart-2)] align-middle" />
                Gastos {formatNumero(p.gastos)} MT
            </p>
            <p className="mt-1 font-medium tabular-nums">Resultado {formatNumero(p.resultado)} MT</p>
        </div>
    );
}

/** Ganhos e gastos lado a lado, mês a mês (os valores exactos estão na tabela "Mês a mês" da página) */
export function GraficoGanhosGastos({ meses }: { meses: MesGanhosGastos[] }) {
    const dados = meses.map((m) => ({ ...m, ganhos: Number(m.valor), gastosN: Number(m.gastos) }));
    if (dados.every((d) => d.ganhos === 0 && d.gastosN === 0)) {
        return (
            <p className="text-muted-foreground py-16 text-center text-[13px] italic">Ainda não há facturas, compras nem despesas neste período.</p>
        );
    }

    return (
        <div>
            <div className="text-muted-foreground flex gap-4 px-3 pt-2 text-[12px]">
                <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded-sm bg-[var(--chart-1)]" />
                    Ganhos (facturado)
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="inline-block size-2.5 rounded-sm bg-[var(--chart-2)]" />
                    Gastos (compras e despesas)
                </span>
            </div>
            <div className="h-64 px-2 pt-3" role="img" aria-label="Gráfico de barras com os ganhos e os gastos de cada mês">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dados} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%" barGap={2}>
                        <CartesianGrid vertical={false} stroke="var(--border)" />
                        <XAxis
                            dataKey="mes"
                            tickFormatter={(m: string) => mesCurto(data(m))}
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={{ stroke: 'var(--border)' }}
                            interval={0}
                        />
                        <YAxis
                            tickFormatter={(v: number) => compacto.format(v)}
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                            tickLine={false}
                            axisLine={false}
                            width={48}
                        />
                        <Tooltip content={<Dica />} cursor={{ fill: 'var(--accent)', opacity: 0.6 }} />
                        <Bar dataKey="ganhos" fill="var(--chart-1)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                        <Bar dataKey="gastosN" fill="var(--chart-2)" radius={[3, 3, 0, 0]} maxBarSize={22} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
