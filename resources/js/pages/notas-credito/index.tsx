import {
    ColunaOrdenavel,
    EstadoNotaCredito,
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
import AppLayout from '@/layouts/app-layout';
import { formatData, formatNumero } from '@/lib/format';
import { type Paginado } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { FilterX, ReceiptText } from 'lucide-react';

interface Linha {
    id: number;
    referencia: string;
    data: string;
    cliente: string;
    terceiro_id: number;
    factura_id: number;
    factura: string;
    motivo: string;
    total_sem_iva: string;
    total: string;
    estado: string;
}

interface Filtros {
    estado?: string;
    ref?: string;
    cliente?: string;
    factura?: string;
    de?: string;
    ate?: string;
    [k: string]: string | undefined;
}

interface Props {
    notas: Paginado<Linha>;
    filtros: Filtros;
    ordenacao: OrdenacaoLista;
    totais: { sem_iva: string; total: string };
}

const ESTADOS = [
    { valor: 'rascunho', label: 'Rascunho' },
    { valor: 'validada', label: 'Por reembolsar' },
    { valor: 'fechada', label: 'Fechada' },
];

/** Lista de notas de crédito (no Dolibarr aparecem na lista de facturas com o tipo "Nota de crédito"). */
export default function NotasCreditoIndex({ notas, filtros, ordenacao, totais }: Props) {
    const lista = useListaFiltros('/notas-credito', filtros, ordenacao);
    const titulo = ESTADOS.find((e) => e.valor === filtros.estado)?.label;

    return (
        <AppLayout>
            <Head title="Notas de crédito" />
            <TituloPagina
                icone={ReceiptText}
                titulo={titulo ? `Notas de crédito — ${titulo}` : 'Notas de crédito'}
                contagem={notas.total}
                descricao="Para emitir uma nota de crédito, abra a factura que vai corrigir e use “Criar nota de crédito”."
                accoes={
                    lista.temFiltros && (
                        <Button variant="outline" size="sm" onClick={lista.limpar}>
                            <FilterX className="size-4" />
                            Limpar filtros
                        </Button>
                    )
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
                                <FiltroTexto rotulo="cliente" valor={lista.valores.cliente} onChange={(v) => lista.escrever('cliente', v)} />
                            </th>
                            <th>
                                <FiltroTexto rotulo="factura" valor={lista.valores.factura} onChange={(v) => lista.escrever('factura', v)} />
                            </th>
                            <th />
                            <th />
                            <th />
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
                                Data
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="cliente" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Terceiro
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="factura" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Factura corrigida
                            </ColunaOrdenavel>
                            <th>Motivo</th>
                            <th className="text-right">Valor (sem IVA)</th>
                            <ColunaOrdenavel coluna="total" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="text-right">
                                Montante (IVA inc.)
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="estado" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Estado
                            </ColunaOrdenavel>
                        </tr>
                    </thead>
                    <tbody>
                        {notas.data.length === 0 && <LinhaVazia colunas={8} />}
                        {notas.data.map((n) => (
                            <tr key={n.id}>
                                <td className="whitespace-nowrap">
                                    <Link href={`/notas-credito/${n.id}`} className="text-primary font-semibold hover:underline">
                                        {n.referencia}
                                    </Link>
                                </td>
                                <td className="tabular-nums">{formatData(n.data)}</td>
                                <td>
                                    <Link href={`/terceiros/${n.terceiro_id}`} className="hover:text-primary hover:underline">
                                        {n.cliente}
                                    </Link>
                                </td>
                                <td className="whitespace-nowrap">
                                    <Link href={`/facturas/${n.factura_id}`} className="hover:text-primary hover:underline">
                                        {n.factura}
                                    </Link>
                                </td>
                                <td className="text-muted-foreground max-w-64 truncate" title={n.motivo}>
                                    {n.motivo}
                                </td>
                                <td className="text-right tabular-nums">{formatNumero(n.total_sem_iva)}</td>
                                <td className="text-right font-medium tabular-nums">{formatNumero(n.total)}</td>
                                <td>
                                    <EstadoNotaCredito estado={n.estado} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {notas.data.length > 0 && (
                        <tfoot>
                            <tr className="bg-muted font-semibold">
                                <td colSpan={5} className="px-3 py-2">
                                    Total
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatNumero(totais.sem_iva)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatNumero(totais.total)}</td>
                                <td />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <Paginacao pagina={notas} nome="notas de crédito" extra={<PorPagina valor={notas.per_page} onChange={lista.porPagina} />} />
        </AppLayout>
    );
}
