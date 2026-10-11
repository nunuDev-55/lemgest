import { BotaoLink, LinhaVazia, TituloPagina } from '@/components/erp';
import { Paginacao } from '@/components/paginacao';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData } from '@/lib/format';
import { type Paginado } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ClipboardList } from 'lucide-react';

interface Linha {
    id: number;
    data: string;
    nota: string | null;
    produtos_contados: number;
    diferencas: number;
    utilizador: string;
}

export default function Inventarios({ inventarios }: { inventarios: Paginado<Linha> }) {
    const pode = usePode();

    return (
        <AppLayout>
            <Head title="Inventários" />
            <TituloPagina
                titulo="Inventários"
                contagem={inventarios.total}
                descricao="Contagens físicas do armazém. As diferenças corrigem o stock e ficam registadas como ajustes."
                accoes={
                    pode('stock.inventariar') && (
                        <BotaoLink href="/stock/inventarios/novo" icone={ClipboardList}>
                            Fazer inventário
                        </BotaoLink>
                    )
                }
            />

            <div className="painel overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Nota</th>
                            <th className="text-right">Produtos contados</th>
                            <th className="text-right">Com diferença</th>
                            <th>Por</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventarios.data.length === 0 && <LinhaVazia colunas={5} texto="Ainda não foi feito nenhum inventário" />}
                        {inventarios.data.map((i) => (
                            <tr key={i.id}>
                                <td className="whitespace-nowrap">
                                    <Link href={`/stock/inventarios/${i.id}`} className="text-primary font-medium tabular-nums hover:underline">
                                        {formatData(i.data)}
                                    </Link>
                                </td>
                                <td className="text-muted-foreground">{i.nota ?? '—'}</td>
                                <td className="text-right tabular-nums">{i.produtos_contados}</td>
                                <td className="text-right font-medium tabular-nums">{i.diferencas}</td>
                                <td className="text-muted-foreground">{i.utilizador}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Paginacao pagina={inventarios} nome="inventários" />
        </AppLayout>
    );
}
