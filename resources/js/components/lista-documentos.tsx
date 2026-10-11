import {
    BotaoLink,
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
import { cn } from '@/lib/utils';
import { type Paginado } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { FilePlus2, FilterX, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

export interface LinhaListaDocumento {
    id: number;
    referencia: string;
    data: string;
    cliente: string;
    terceiro_id: number;
    total_sem_iva: string;
    total: string;
    estado: string;
    /** data da 2.ª coluna de datas (validade ou entrega) */
    data2: string | null;
    /** a 2.ª data está em atraso (orçamento expirado, encomenda atrasada) */
    atraso: boolean;
}

interface Props {
    titulo: string;
    icone: LucideIcon;
    rota: string;
    novo?: { href: string; label: string } | null;
    rotuloData2: string;
    colunaData2: string;
    pagina: Paginado<LinhaListaDocumento>;
    filtros: Record<string, string | undefined>;
    ordenacao: OrdenacaoLista;
    totais: { sem_iva: string; total: string };
    estados: { valor: string; label: string }[];
    estado: (l: LinhaListaDocumento) => ReactNode;
    nome: string;
    /** Texto do filtro da coluna Terceiro ("cliente" ou "fornecedor") */
    rotuloTerceiro?: string;
}

/** Lista de documentos comerciais (orçamentos, encomendas) com filtros por coluna, ordenação e totais. */
export function ListaDocumentos({
    titulo,
    icone,
    rota,
    novo,
    rotuloData2,
    colunaData2,
    pagina,
    filtros,
    ordenacao,
    totais,
    estados,
    estado,
    nome,
    rotuloTerceiro = 'cliente',
}: Props) {
    const lista = useListaFiltros(rota, filtros, ordenacao);
    const sufixo = estados.find((e) => e.valor === filtros.estado)?.label;

    return (
        <AppLayout>
            <Head title={titulo} />
            <TituloPagina
                icone={icone}
                titulo={sufixo ? `${titulo} — ${sufixo}` : titulo}
                contagem={pagina.total}
                accoes={
                    <>
                        {lista.temFiltros && (
                            <Button variant="outline" size="sm" onClick={lista.limpar}>
                                <FilterX className="size-4" />
                                Limpar filtros
                            </Button>
                        )}
                        {novo && (
                            <BotaoLink href={novo.href} icone={FilePlus2}>
                                {novo.label}
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
                            <th />
                            <th>
                                <FiltroTexto rotulo={rotuloTerceiro} valor={lista.valores.cliente} onChange={(v) => lista.escrever('cliente', v)} />
                            </th>
                            <th />
                            <th />
                            <th>
                                <FiltroEscolha
                                    rotulo="estado"
                                    valor={lista.valores.estado}
                                    onChange={(v) => lista.escolher('estado', v)}
                                    opcoes={estados}
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
                            <ColunaOrdenavel coluna={colunaData2} ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                {rotuloData2}
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="cliente" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Terceiro
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
                        {pagina.data.length === 0 && <LinhaVazia colunas={7} />}
                        {pagina.data.map((l) => (
                            <tr key={l.id}>
                                <td className="whitespace-nowrap">
                                    <Link href={`${rota}/${l.id}`} className="text-primary font-semibold hover:underline">
                                        {l.referencia}
                                    </Link>
                                </td>
                                <td className="tabular-nums">{formatData(l.data)}</td>
                                <td className={cn('tabular-nums', l.atraso && 'font-semibold text-red-600 dark:text-red-400')}>
                                    {formatData(l.data2)}
                                </td>
                                <td>
                                    <Link href={`/terceiros/${l.terceiro_id}`} className="hover:text-primary hover:underline">
                                        {l.cliente}
                                    </Link>
                                </td>
                                <td className="text-right tabular-nums">{formatNumero(l.total_sem_iva)}</td>
                                <td className="text-right font-medium tabular-nums">{formatNumero(l.total)}</td>
                                <td>{estado(l)}</td>
                            </tr>
                        ))}
                    </tbody>
                    {pagina.data.length > 0 && (
                        <tfoot>
                            <tr className="bg-muted font-semibold">
                                <td colSpan={4} className="px-3 py-2">
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
            <Paginacao pagina={pagina} nome={nome} extra={<PorPagina valor={pagina.per_page} onChange={lista.porPagina} />} />
        </AppLayout>
    );
}
