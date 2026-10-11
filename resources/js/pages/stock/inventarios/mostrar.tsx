import { CabecalhoFicha, Campo, Campos, LinhaVazia } from '@/components/erp';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatDataHora } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';

interface Linha {
    id: number;
    produto_id: number | null;
    referencia: string;
    nome: string;
    esperado: number;
    contado: number;
    diferenca: number;
}

interface Props {
    inventario: {
        id: number;
        data: string;
        nota: string | null;
        produtos_contados: number;
        diferencas: number;
        utilizador: string;
        criado_em: string | null;
        linhas: Linha[];
    };
}

export default function Inventario({ inventario: i }: Props) {
    return (
        <AppLayout>
            <Head title={`Inventário de ${formatData(i.data)}`} />
            <CabecalhoFicha
                referencia={`Inventário de ${formatData(i.data)}`}
                titulo={i.nota ?? undefined}
                voltar={{ href: '/stock/inventarios', label: 'Inventários' }}
            />

            <Campos className="mb-4 max-w-xl">
                <Campo rotulo="Produtos contados">{i.produtos_contados}</Campo>
                <Campo rotulo="Com diferença">{i.diferencas}</Campo>
                <Campo rotulo="Feito por">{i.utilizador}</Campo>
                <Campo rotulo="Gravado em">{formatDataHora(i.criado_em)}</Campo>
            </Campos>

            <div className="painel overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr>
                            <th>Produto</th>
                            <th className="text-right">No sistema</th>
                            <th className="text-right">Contado (com alugadas)</th>
                            <th className="text-right">Diferença</th>
                        </tr>
                    </thead>
                    <tbody>
                        {i.linhas.length === 0 && <LinhaVazia colunas={4} />}
                        {i.linhas.map((l) => (
                            <tr key={l.id}>
                                <td>
                                    {l.produto_id ? (
                                        <Link href={`/produtos/${l.produto_id}#stock`} className="font-medium hover:underline">
                                            {l.nome}
                                        </Link>
                                    ) : (
                                        <span className="font-medium">{l.nome}</span>
                                    )}
                                    <span className="text-muted-foreground ml-2 text-[12.5px]">{l.referencia}</span>
                                </td>
                                <td className="text-right tabular-nums">{l.esperado}</td>
                                <td className="text-right tabular-nums">{l.contado}</td>
                                <td
                                    className={cn(
                                        'text-right font-medium tabular-nums',
                                        l.diferenca < 0 && 'text-red-600 dark:text-red-400',
                                        l.diferenca > 0 && 'text-green-700 dark:text-green-400',
                                    )}
                                >
                                    {l.diferenca === 0 ? (
                                        <span className="text-muted-foreground font-normal">certo</span>
                                    ) : (
                                        `${l.diferenca > 0 ? '+' : ''}${l.diferenca}`
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}
