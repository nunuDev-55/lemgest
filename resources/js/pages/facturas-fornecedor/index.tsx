import {
    BotaoLink,
    ColunaOrdenavel,
    EstadoFacturaFornecedor,
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
import { FileInput, FilePlus2, FilterX } from 'lucide-react';

interface Linha {
    id: number;
    referencia: string;
    ref_fornecedor: string;
    data: string;
    data_vencimento: string | null;
    fornecedor: string;
    terceiro_id: number;
    total_sem_iva: string;
    total: string;
    estado: string;
    vencida: boolean;
    parcial: boolean;
}

interface Props {
    facturas: Paginado<Linha>;
    filtros: Record<string, string | undefined>;
    ordenacao: OrdenacaoLista;
    totais: { sem_iva: string; total: string; por_pagar: string };
}

const ESTADOS = [
    { valor: 'rascunho', label: 'Rascunho' },
    { valor: 'validada', label: 'Por pagar' },
    { valor: 'vencidas', label: 'Vencidas' },
    { valor: 'paga', label: 'Paga' },
    { valor: 'abandonada', label: 'Abandonada' },
];

export default function FacturasFornecedorIndex({ facturas, filtros, ordenacao, totais }: Props) {
    const pode = usePode();
    const lista = useListaFiltros('/facturas-fornecedor', filtros, ordenacao);
    const sufixo = ESTADOS.find((e) => e.valor === filtros.estado)?.label;

    return (
        <AppLayout>
            <Head title="Facturas de fornecedores" />
            <TituloPagina
                icone={FileInput}
                titulo={sufixo ? `Facturas de fornecedores — ${sufixo}` : 'Facturas de fornecedores'}
                contagem={facturas.total}
                descricao={Number(totais.por_pagar) > 0 ? `Por pagar nesta lista: ${formatNumero(totais.por_pagar)} MT` : undefined}
                accoes={
                    <>
                        {lista.temFiltros && (
                            <Button variant="outline" size="sm" onClick={lista.limpar}>
                                <FilterX className="size-4" />
                                Limpar filtros
                            </Button>
                        )}
                        {pode('compras.criar') && (
                            <BotaoLink href="/facturas-fornecedor/nova" icone={FilePlus2}>
                                Lançar factura
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
                                <FiltroTexto
                                    rotulo="nº do fornecedor"
                                    valor={lista.valores.ref_fornecedor}
                                    onChange={(v) => lista.escrever('ref_fornecedor', v)}
                                />
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
                            <th />
                            <th>
                                <FiltroTexto rotulo="fornecedor" valor={lista.valores.cliente} onChange={(v) => lista.escrever('cliente', v)} />
                            </th>
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
                            <ColunaOrdenavel coluna="ref_fornecedor" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Nº do fornecedor
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="data" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Data
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="vencimento" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Vencimento
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="cliente" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Fornecedor
                            </ColunaOrdenavel>
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
                        {facturas.data.length === 0 && <LinhaVazia colunas={8} />}
                        {facturas.data.map((f) => (
                            <tr key={f.id}>
                                <td className="whitespace-nowrap">
                                    <Link href={`/facturas-fornecedor/${f.id}`} className="text-primary font-semibold hover:underline">
                                        {f.referencia}
                                    </Link>
                                </td>
                                <td>{f.ref_fornecedor}</td>
                                <td className="tabular-nums">{formatData(f.data)}</td>
                                <td className={cn('tabular-nums', f.vencida && 'font-semibold text-red-600 dark:text-red-400')}>
                                    {formatData(f.data_vencimento)}
                                </td>
                                <td>
                                    <Link href={`/terceiros/${f.terceiro_id}?separador=fornecedor`} className="hover:text-primary hover:underline">
                                        {f.fornecedor}
                                    </Link>
                                </td>
                                <td className="text-right tabular-nums">{formatNumero(f.total_sem_iva)}</td>
                                <td className="text-right font-medium tabular-nums">{formatNumero(f.total)}</td>
                                <td>
                                    <EstadoFacturaFornecedor estado={f.estado} vencida={f.vencida} parcial={f.parcial} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {facturas.data.length > 0 && (
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
            <Paginacao pagina={facturas} nome="facturas" extra={<PorPagina valor={facturas.per_page} onChange={lista.porPagina} />} />
        </AppLayout>
    );
}
