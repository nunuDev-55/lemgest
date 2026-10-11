import {
    BotaoLink,
    ColunaOrdenavel,
    EstadoFactura,
    FiltroEscolha,
    FiltroTexto,
    LinhaVazia,
    PorPagina,
    TituloPagina,
    useListaFiltros,
    type OrdenacaoLista,
} from '@/components/erp';
import { Paginacao } from '@/components/paginacao';
import { Button } from '@/components/ui/button';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Paginado } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { FilePlus2, FilterX, Receipt } from 'lucide-react';

interface Linha {
    id: number;
    referencia: string;
    data: string;
    data_vencimento: string | null;
    cliente: string;
    terceiro_id: number;
    total_sem_iva: string;
    total: string;
    ref_cliente: string | null;
    estado: string;
    vencida: boolean;
    parcial: boolean;
}

interface Filtros {
    estado?: string;
    ref?: string;
    cliente?: string;
    ref_cliente?: string;
    de?: string;
    ate?: string;
    [k: string]: string | undefined;
}

interface Props {
    facturas: Paginado<Linha>;
    filtros: Filtros;
    ordenacao: OrdenacaoLista;
    totais: { sem_iva: string; total: string };
}

const ESTADOS = [
    { valor: 'rascunho', label: 'Rascunho' },
    { valor: 'validada', label: 'Pendente de cobrança' },
    { valor: 'vencidas', label: 'Vencidas' },
    { valor: 'paga', label: 'Paga' },
    { valor: 'abandonada', label: 'Abandonada' },
];

export default function FacturasIndex({ facturas, filtros, ordenacao, totais }: Props) {
    const pode = usePode();
    const lista = useListaFiltros('/facturas', filtros, ordenacao);
    const titulo = ESTADOS.find((e) => e.valor === filtros.estado)?.label;

    return (
        <AppLayout>
            <Head title="Facturas a clientes" />
            <TituloPagina
                icone={Receipt}
                titulo={titulo ? `Facturas a clientes — ${titulo}` : 'Facturas a clientes'}
                contagem={facturas.total}
                accoes={
                    <>
                        {lista.temFiltros && (
                            <Button variant="outline" size="sm" onClick={lista.limpar}>
                                <FilterX className="size-4" />
                                Limpar filtros
                            </Button>
                        )}
                        {pode('facturas.criar') && (
                            <BotaoLink href="/facturas/nova" icone={FilePlus2}>
                                Nova factura
                            </BotaoLink>
                        )}
                    </>
                }
            />

            <div className="painel overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr className="linha-filtros">
                            <th>
                                <FiltroTexto rotulo="referência" valor={lista.valores.ref} onChange={(v) => lista.escrever('ref', v)} />
                            </th>
                            <th>
                                <input
                                    type="date"
                                    aria-label="Desde a data"
                                    value={lista.valores.de ?? ''}
                                    onChange={(e) => lista.escolher('de', e.target.value)}
                                    className="border-input bg-card h-7 w-full rounded border px-1 text-xs font-normal"
                                />
                            </th>
                            <th>
                                <input
                                    type="date"
                                    aria-label="Até à data"
                                    value={lista.valores.ate ?? ''}
                                    onChange={(e) => lista.escolher('ate', e.target.value)}
                                    className="border-input bg-card h-7 w-full rounded border px-1 text-xs font-normal"
                                />
                            </th>
                            <th>
                                <FiltroTexto rotulo="cliente" valor={lista.valores.cliente} onChange={(v) => lista.escrever('cliente', v)} />
                            </th>
                            <th />
                            <th />
                            <th>
                                <FiltroTexto
                                    rotulo="nº requisição"
                                    valor={lista.valores.ref_cliente}
                                    onChange={(v) => lista.escrever('ref_cliente', v)}
                                />
                            </th>
                            <th>
                                <FiltroEscolha
                                    rotulo="estado"
                                    valor={lista.valores.estado}
                                    onChange={(v) => lista.escolher('estado', v)}
                                    opcoes={ESTADOS}
                                />
                            </th>
                        </tr>
                        <tr>
                            <ColunaOrdenavel coluna="ref" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Ref.
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="data" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Data da factura
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="vencimento" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Vencimento
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="cliente" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Terceiro
                            </ColunaOrdenavel>
                            <th className="text-right">Valor (sem IVA)</th>
                            <ColunaOrdenavel coluna="total" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="text-right">
                                Montante (IVA inc.)
                            </ColunaOrdenavel>
                            <th>Nº requisição</th>
                            <ColunaOrdenavel coluna="estado" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Estado
                            </ColunaOrdenavel>
                        </tr>
                    </thead>
                    <tbody>
                        {facturas.data.length === 0 && <LinhaVazia colunas={8} />}
                        {facturas.data.map((f) => (
                            <tr key={f.id}>
                                <td className="whitespace-nowrap">
                                    <Link href={`/facturas/${f.id}`} className="text-primary font-semibold hover:underline">
                                        {f.referencia}
                                    </Link>
                                </td>
                                <td className="tabular-nums">{formatData(f.data)}</td>
                                <td className={cn('tabular-nums', f.vencida && 'font-semibold text-red-600 dark:text-red-400')}>
                                    {formatData(f.data_vencimento)}
                                </td>
                                <td>
                                    <Link href={`/terceiros/${f.terceiro_id}`} className="hover:text-primary hover:underline">
                                        {f.cliente}
                                    </Link>
                                </td>
                                <td className="text-right tabular-nums">{formatNumero(f.total_sem_iva)}</td>
                                <td className="text-right font-medium tabular-nums">{formatNumero(f.total)}</td>
                                <td className="text-muted-foreground">{f.ref_cliente}</td>
                                <td>
                                    <EstadoFactura estado={f.estado} vencida={f.vencida} parcial={f.parcial} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {facturas.data.length > 0 && (
                        <tfoot>
                            <tr className="bg-muted font-semibold">
                                <td colSpan={4} className="px-3 py-2">
                                    Total
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatNumero(totais.sem_iva)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatNumero(totais.total)}</td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <Paginacao pagina={facturas} nome="facturas" extra={<PorPagina valor={facturas.per_page} onChange={lista.porPagina} />} />
        </AppLayout>
    );
}
