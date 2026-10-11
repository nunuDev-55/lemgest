import { FiltroEscolha, FiltroTexto, TituloPagina, useListaFiltros } from '@/components/erp';
import { Paginacao } from '@/components/paginacao';
import { TabelaMovimentos, type Movimento } from '@/components/stock';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type Paginado } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ChevronLeft, FilterX } from 'lucide-react';

type Opcao = { valor: string; label: string };

interface Props {
    movimentos: Paginado<Movimento>;
    filtros: Record<string, string | undefined>;
    produto: { id: number; referencia: string; nome: string } | null;
    tipos: Opcao[];
}

const campoData = 'border-input bg-card focus-visible:ring-ring h-8 rounded-md border px-2 text-[12.5px] outline-none focus-visible:ring-2';

export default function Movimentos({ movimentos, filtros, produto, tipos }: Props) {
    const lista = useListaFiltros('/stock/movimentos', filtros);

    return (
        <AppLayout>
            <Head title="Movimentos de stock" />
            {produto && (
                <Link
                    href={`/produtos/${produto.id}#stock`}
                    className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-[13px]"
                >
                    <ChevronLeft className="size-3.5" />
                    {produto.referencia}
                </Link>
            )}
            <TituloPagina
                titulo={produto ? `Movimentos de ${produto.nome}` : 'Movimentos de stock'}
                contagem={movimentos.total}
                descricao="Cada entrada, saída, devolução, perda e ajuste, com data e quem o registou. Os movimentos não se apagam."
                accoes={
                    lista.temFiltros && (
                        <Button variant="ghost" size="sm" onClick={lista.limpar}>
                            <FilterX className="size-4" />
                            Limpar filtros
                        </Button>
                    )
                }
            />

            <div className="mb-4 flex flex-wrap items-center gap-2">
                {!produto && (
                    <FiltroTexto
                        rotulo="produto"
                        valor={lista.valores.pesquisa}
                        onChange={(v) => lista.escrever('pesquisa', v)}
                        className="w-56 max-w-full"
                    />
                )}
                <div className="w-52">
                    <FiltroEscolha rotulo="tipo de movimento" valor={lista.valores.tipo} onChange={(v) => lista.escolher('tipo', v)} opcoes={tipos} />
                </div>
                <label className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
                    De
                    <input type="date" value={lista.valores.de ?? ''} onChange={(e) => lista.escolher('de', e.target.value)} className={campoData} />
                </label>
                <label className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
                    até
                    <input
                        type="date"
                        value={lista.valores.ate ?? ''}
                        onChange={(e) => lista.escolher('ate', e.target.value)}
                        className={campoData}
                    />
                </label>
            </div>

            <div className="painel overflow-x-auto">
                <TabelaMovimentos movimentos={movimentos.data} comProduto={!produto} />
            </div>
            <Paginacao pagina={movimentos} nome="movimentos" />
        </AppLayout>
    );
}
