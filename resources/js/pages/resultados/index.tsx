import { Bloco, EstadoFactura, LinhaVazia, TituloPagina } from '@/components/erp';
import { GraficoGanhosGastos, type MesGanhosGastos } from '@/components/grafico-ganhos-gastos';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface Mes extends MesGanhosGastos {
    n: number;
    recebido: string;
    compras: string;
    despesas: string;
}

interface Props {
    periodo: { chave: string; de: string; ate: string };
    periodos: { valor: string; label: string }[];
    resumo: {
        facturado: string;
        facturado_bruto: string;
        notas_credito: string;
        facturado_com_iva: string;
        n_facturas: number;
        recebido: string;
        por_receber: string;
        compras: string;
        despesas: string;
        gastos: string;
        resultado: string;
    };
    meses: Mes[];
    gastosPorCategoria: { categoria: string; valor: string }[];
    clientes: { id: number; nome: string; n: number; facturado: string; recebido: string; por_receber: string }[];
    categorias: { categoria: string; valor: string }[];
    facturas: {
        id: number;
        numero: string;
        data: string;
        cliente: string;
        terceiro_id: number;
        total_sem_iva: string;
        total: string;
        pago: string;
        em_falta: string;
        estado: string;
        vencida: boolean;
    }[];
    mais_facturas: number;
}

const mesLongo = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const negativo = (v: string) => Number(v) < 0 && 'text-red-600 dark:text-red-400';
const campoData = 'border-input bg-card focus-visible:ring-ring h-8 rounded-md border px-2 text-[13px] outline-none focus-visible:ring-2';

export default function Resultados({
    periodo,
    periodos,
    resumo: r,
    meses,
    gastosPorCategoria,
    clientes,
    categorias,
    facturas,
    mais_facturas,
}: Props) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const [datas, setDatas] = useState({ de: periodo.de, ate: periodo.ate });
    const ir = (params: Record<string, string>) => router.get('/resultados', params, { preserveScroll: true, preserveState: true, replace: true });
    const maiorCategoria = Math.max(1, ...categorias.map((c) => Number(c.valor)));
    const maiorGasto = Math.max(1, ...gastosPorCategoria.map((c) => Number(c.valor)));

    const celulas = [
        {
            label: 'Ganhos',
            valor: r.facturado,
            nota: `facturado em ${r.n_facturas} ${r.n_facturas === 1 ? 'factura' : 'facturas'}`,
        },
        { label: 'Gastos', valor: r.gastos, nota: `compras ${formatNumero(r.compras)} · despesas ${formatNumero(r.despesas)}` },
        { label: 'Resultado', valor: r.resultado, nota: 'ganhos − gastos', destaque: true },
        { label: 'Recebido', valor: r.recebido, nota: 'pagamentos de clientes' },
        { label: 'Por receber', valor: r.por_receber, nota: 'das facturas do período' },
    ];

    return (
        <AppLayout>
            <Head title="Resultados" />
            <TituloPagina
                titulo="Resultados"
                descricao={`De ${formatData(periodo.de)} a ${formatData(periodo.ate)}. Ganhos e compras sem IVA; despesas pelo valor pago; em meticais.`}
            />

            <div className="mb-5 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1">
                    {periodos.map((p) => (
                        <button
                            key={p.valor}
                            type="button"
                            onClick={() => (p.valor === 'datas' ? ir({ periodo: 'datas', de: datas.de, ate: datas.ate }) : ir({ periodo: p.valor }))}
                            className={cn(
                                'h-8 rounded-md px-3 text-[13px]',
                                periodo.chave === p.valor
                                    ? 'bg-foreground text-background font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                {periodo.chave === 'datas' && (
                    <form
                        className="flex flex-wrap items-center gap-2 text-[13px]"
                        onSubmit={(e) => {
                            e.preventDefault();
                            ir({ periodo: 'datas', de: datas.de, ate: datas.ate });
                        }}
                    >
                        <input
                            type="date"
                            aria-label="De"
                            value={datas.de}
                            onChange={(e) => setDatas((d) => ({ ...d, de: e.target.value }))}
                            className={campoData}
                        />
                        <span className="text-muted-foreground">a</span>
                        <input
                            type="date"
                            aria-label="Até"
                            value={datas.ate}
                            min={datas.de}
                            onChange={(e) => setDatas((d) => ({ ...d, ate: e.target.value }))}
                            className={campoData}
                        />
                        <button type="submit" className="bg-foreground text-background h-8 rounded-md px-3 font-medium">
                            Ver
                        </button>
                    </form>
                )}
                {(errors.de || errors.ate) && <p className="text-destructive w-full text-[13px]">{errors.de || errors.ate}</p>}
            </div>

            <section className="grelha-celulas mb-6 grid grid-cols-2 lg:grid-cols-5">
                {celulas.map((c) => (
                    <div key={c.label} className={cn('bg-card px-4 py-3', c.destaque && 'bg-muted')}>
                        <p className="text-muted-foreground text-[13px]">{c.label}</p>
                        <p className={cn('text-xl font-semibold tabular-nums', negativo(c.valor))}>{formatNumero(c.valor)}</p>
                        <p className="text-muted-foreground text-[12.5px]">{c.nota}</p>
                    </div>
                ))}
            </section>
            {Number(r.notas_credito) > 0 && (
                <p className="text-muted-foreground -mt-3 mb-6 text-[12.5px]">
                    Facturas {formatNumero(r.facturado_bruto)} − notas de crédito {formatNumero(r.notas_credito)} = {formatNumero(r.facturado)}.
                </p>
            )}

            <section className="mb-6">
                <h2 className="mb-3 text-[15px] font-semibold">Ganhos e gastos por mês</h2>
                <div className="rounded-lg border px-2 pt-2 pb-2">
                    <GraficoGanhosGastos meses={meses} />
                </div>
            </section>

            <Bloco titulo="Mês a mês" className="mb-6">
                <table className="tabela">
                    <thead>
                        <tr>
                            <th>Mês</th>
                            <th className="text-right">Ganhos</th>
                            <th className="text-right">Compras</th>
                            <th className="text-right">Despesas</th>
                            <th className="text-right">Resultado</th>
                            <th className="text-right">Recebido</th>
                        </tr>
                    </thead>
                    <tbody>
                        {meses.map((m) => (
                            <tr key={m.mes}>
                                <td className="first-letter:uppercase">{mesLongo.format(new Date(`${m.mes}-01T00:00:00Z`))}</td>
                                <td className="text-right tabular-nums">{formatNumero(m.valor)}</td>
                                <td className="text-right tabular-nums">{formatNumero(m.compras)}</td>
                                <td className="text-right tabular-nums">{formatNumero(m.despesas)}</td>
                                <td className={cn('text-right font-medium tabular-nums', negativo(m.resultado))}>{formatNumero(m.resultado)}</td>
                                <td className="text-muted-foreground text-right tabular-nums">{formatNumero(m.recebido)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-semibold">
                            <td className="px-4 py-2.5">Total</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{formatNumero(r.facturado)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{formatNumero(r.compras)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums">{formatNumero(r.despesas)}</td>
                            <td className={cn('px-3 py-2.5 text-right tabular-nums', negativo(r.resultado))}>{formatNumero(r.resultado)}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums">{formatNumero(r.recebido)}</td>
                        </tr>
                    </tfoot>
                </table>
            </Bloco>

            <div className="mb-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
                <Bloco titulo="Clientes com mais facturado">
                    <table className="tabela">
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th className="text-right">Facturado</th>
                                <th className="text-right">Recebido</th>
                                <th className="text-right">Por receber</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clientes.length === 0 && <LinhaVazia colunas={4} texto="Sem facturas no período" />}
                            {clientes.map((c) => (
                                <tr key={c.id}>
                                    <td>
                                        <Link href={`/terceiros/${c.id}`} className="font-medium hover:underline">
                                            {c.nome}
                                        </Link>
                                        <div className="text-muted-foreground text-[12.5px]">
                                            {c.n} {c.n === 1 ? 'factura' : 'facturas'}
                                        </div>
                                    </td>
                                    <td className="text-right tabular-nums">{formatNumero(c.facturado)}</td>
                                    <td className="text-right tabular-nums">{formatNumero(c.recebido)}</td>
                                    <td className="text-right tabular-nums">{Number(c.por_receber) > 0 ? formatNumero(c.por_receber) : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Bloco>

                <Bloco titulo="Ganhos por categoria de produto">
                    <ul className="grid gap-3 p-4">
                        {categorias.length === 0 && <li className="text-muted-foreground py-6 text-center text-[13px]">Sem facturas no período</li>}
                        {categorias.map((c) => (
                            <li key={c.categoria} className="grid gap-1">
                                <div className="flex justify-between gap-3 text-[13.5px]">
                                    <span>{c.categoria}</span>
                                    <span className="font-medium tabular-nums">{formatNumero(c.valor)}</span>
                                </div>
                                <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                                    <div
                                        className="h-full rounded-full bg-[var(--chart-1)]"
                                        style={{ width: `${Math.max(2, (Number(c.valor) / maiorCategoria) * 100)}%` }}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </Bloco>
            </div>

            <Bloco
                titulo="Para onde foi o dinheiro"
                className="mb-6"
                accoes={
                    <Link href="/despesas" className="text-muted-foreground hover:text-foreground text-[13px]">
                        Ver despesas
                    </Link>
                }
            >
                <ul className="grid gap-3 p-4 md:grid-cols-2 md:gap-x-8">
                    {gastosPorCategoria.length === 0 && (
                        <li className="text-muted-foreground py-6 text-center text-[13px] md:col-span-2">Sem compras nem despesas no período</li>
                    )}
                    {gastosPorCategoria.map((c) => (
                        <li key={c.categoria} className="grid gap-1">
                            <div className="flex justify-between gap-3 text-[13.5px]">
                                <span>{c.categoria}</span>
                                <span className="font-medium tabular-nums">{formatNumero(c.valor)}</span>
                            </div>
                            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                                <div
                                    className="h-full rounded-full bg-[var(--chart-2)]"
                                    style={{ width: `${Math.max(2, (Number(c.valor) / maiorGasto) * 100)}%` }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            </Bloco>

            <Bloco titulo={`Facturas do período (${r.n_facturas})`}>
                <table className="tabela">
                    <thead>
                        <tr>
                            <th>Factura</th>
                            <th>Data</th>
                            <th>Cliente</th>
                            <th className="text-right">Sem IVA</th>
                            <th className="text-right">Com IVA</th>
                            <th className="text-right">Pago</th>
                            <th className="text-right">Em falta</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {facturas.length === 0 && <LinhaVazia colunas={8} texto="Sem facturas no período" />}
                        {facturas.map((f) => (
                            <tr key={f.id}>
                                <td>
                                    <Link href={`/facturas/${f.id}`} className="text-primary font-medium hover:underline">
                                        {f.numero}
                                    </Link>
                                </td>
                                <td className="whitespace-nowrap tabular-nums">{formatData(f.data)}</td>
                                <td className="max-w-56 truncate">{f.cliente}</td>
                                <td className="text-right tabular-nums">{formatNumero(f.total_sem_iva)}</td>
                                <td className="text-right tabular-nums">{formatNumero(f.total)}</td>
                                <td className="text-right tabular-nums">{formatNumero(f.pago)}</td>
                                <td className="text-right tabular-nums">{Number(f.em_falta) > 0 ? formatNumero(f.em_falta) : '—'}</td>
                                <td>
                                    <EstadoFactura estado={f.estado} vencida={f.vencida} parcial={Number(f.pago) > 0 && Number(f.em_falta) > 0} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {mais_facturas > 0 && (
                    <p className="text-muted-foreground border-t px-4 py-2.5 text-[12.5px]">
                        E mais {mais_facturas} facturas. Veja-as todas em{' '}
                        <Link href="/facturas" className="text-foreground hover:underline">
                            Facturas
                        </Link>
                        .
                    </p>
                )}
            </Bloco>
        </AppLayout>
    );
}
