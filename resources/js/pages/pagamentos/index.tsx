import {
    ColunaOrdenavel,
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
import { CreditCard, FilterX } from 'lucide-react';

interface Linha {
    id: number;
    numero: string;
    data: string;
    cliente: string;
    terceiro_id: number;
    metodo: string;
    numero_documento: string | null;
    valor: string;
    facturas: { id: number; numero: string }[];
}

interface Props {
    pagamentos: Paginado<Linha>;
    filtros: Record<string, string | undefined>;
    ordenacao: OrdenacaoLista;
    total: string;
    metodos: { valor: string; label: string }[];
}

export default function PagamentosIndex({ pagamentos, filtros, ordenacao, total, metodos }: Props) {
    const lista = useListaFiltros('/pagamentos', filtros, ordenacao);

    return (
        <AppLayout>
            <Head title="Pagamentos recebidos" />
            <TituloPagina
                icone={CreditCard}
                titulo="Pagamentos recebidos dos clientes"
                contagem={pagamentos.total}
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
                                <FiltroTexto rotulo="referência" valor={lista.valores.numero} onChange={(v) => lista.escrever('numero', v)} />
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
                                <FiltroEscolha
                                    rotulo="tipo"
                                    valor={lista.valores.metodo}
                                    onChange={(v) => lista.escolher('metodo', v)}
                                    opcoes={metodos}
                                />
                            </th>
                            <th />
                            <th />
                            <th />
                        </tr>
                        <tr>
                            <ColunaOrdenavel coluna="numero" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Recibo
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="data" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Data
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="cliente" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Terceiro
                            </ColunaOrdenavel>
                            <th>Tipo</th>
                            <th>Número</th>
                            <th>Facturas</th>
                            <ColunaOrdenavel coluna="valor" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="text-right">
                                Montante
                            </ColunaOrdenavel>
                        </tr>
                    </thead>
                    <tbody>
                        {pagamentos.data.length === 0 && <LinhaVazia colunas={7} />}
                        {pagamentos.data.map((p) => (
                            <tr key={p.id}>
                                <td>
                                    <a
                                        href={`/pagamentos/${p.id}/recibo`}
                                        target="_blank"
                                        rel="noopener"
                                        className="text-primary font-semibold hover:underline"
                                        title="Abrir o recibo"
                                    >
                                        {p.numero}
                                    </a>
                                </td>
                                <td className="tabular-nums">{formatData(p.data)}</td>
                                <td>
                                    <Link href={`/terceiros/${p.terceiro_id}`} className="hover:text-primary hover:underline">
                                        {p.cliente}
                                    </Link>
                                </td>
                                <td>{p.metodo}</td>
                                <td className="text-muted-foreground">{p.numero_documento}</td>
                                <td>
                                    {p.facturas.map((f, i) => (
                                        <span key={f.id}>
                                            {i > 0 && ', '}
                                            <Link href={`/facturas/${f.id}`} className="text-primary hover:underline">
                                                {f.numero}
                                            </Link>
                                        </span>
                                    ))}
                                </td>
                                <td className="text-right font-medium tabular-nums">{formatNumero(p.valor)}</td>
                            </tr>
                        ))}
                    </tbody>
                    {pagamentos.data.length > 0 && (
                        <tfoot>
                            <tr className="bg-muted font-semibold">
                                <td colSpan={6} className="px-3 py-2">
                                    Total
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatNumero(total)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <Paginacao pagina={pagamentos} nome="pagamentos" extra={<PorPagina valor={pagamentos.per_page} onChange={lista.porPagina} />} />
        </AppLayout>
    );
}
