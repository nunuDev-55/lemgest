import { formatNumero } from '@/lib/format';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface PontoMes {
    mes: string; // "2026-10"
    valor: string;
    n: number;
}

const nomeMes = new Intl.DateTimeFormat('pt-PT', { month: 'short', timeZone: 'UTC' });
/** "2026-10" → "out 26" */
const mesCurto = { format: (d: Date) => `${nomeMes.format(d).replace('.', '')} ${String(d.getUTCFullYear()).slice(2)}` };
const mesLongo = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const compacto = new Intl.NumberFormat('pt-PT', { notation: 'compact', maximumFractionDigits: 1 });

function data(mes: string) {
    return new Date(`${mes}-01T00:00:00Z`);
}

/** Recebe do recharts o mês por baixo do rato */
function Dica({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as PontoMes & { v: number };
    return (
        <div className="glass-strong rounded-md px-3 py-2 text-xs">
            <p className="mb-1 font-semibold first-letter:uppercase">{mesLongo.format(data(p.mes))}</p>
            <p className="tabular-nums">
                <span className="mr-1.5 inline-block size-2 rounded-sm bg-[var(--chart-1)] align-middle" />
                {formatNumero(p.valor)} MT <span className="text-muted-foreground">sem IVA</span>
            </p>
            <p className="text-muted-foreground mt-0.5">
                {p.n} {p.n === 1 ? 'factura' : 'facturas'}
            </p>
        </div>
    );
}

/**
 * Valor facturado por mês (uma só série, um só eixo).
 * O número de facturas aparece na dica, não num segundo eixo.
 */
export function GraficoFacturacao({
    pontos,
    textoVazio = 'Ainda não há facturas validadas neste período.',
}: {
    pontos: PontoMes[];
    textoVazio?: string;
}) {
    const dados = pontos.map((p) => ({ ...p, v: Number(p.valor) }));
    const vazio = dados.every((d) => d.v === 0);

    return (
        <div>
            {vazio ? (
                <p className="text-muted-foreground py-16 text-center text-[13px] italic">{textoVazio}</p>
            ) : (
                <div className="h-64 px-2 pt-4" role="img" aria-label="Gráfico de barras do valor facturado por mês">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dados} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
                            <CartesianGrid vertical={false} stroke="var(--border)" />
                            <XAxis
                                dataKey="mes"
                                tickFormatter={(m: string) => mesCurto.format(data(m))}
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
                            <Bar dataKey="v" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            <details className="border-t px-3 py-2 text-xs">
                <summary className="text-muted-foreground hover:text-foreground cursor-pointer">Ver os valores em tabela</summary>
                <table className="tabela mt-2">
                    <thead>
                        <tr>
                            <th>Mês</th>
                            <th className="text-right">Facturas</th>
                            <th className="text-right">Valor (sem IVA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pontos.map((p) => (
                            <tr key={p.mes}>
                                <td className="first-letter:uppercase">{mesLongo.format(data(p.mes))}</td>
                                <td className="text-right tabular-nums">{p.n}</td>
                                <td className="text-right tabular-nums">{formatNumero(p.valor)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </details>
        </div>
    );
}
