import { Bloco, TituloPagina } from '@/components/erp';
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Hash, Info } from 'lucide-react';

interface Serie {
    serie: string;
    nome: string;
    formato: string;
    quantos: number;
    ultimo: string | null;
    proximo: string;
}

/** Séries de numeração e o próximo número de cada uma (no Dolibarr aparece ao lado de cada modelo de numeração). */
export default function ConfiguracaoNumeracao({ ano, series }: { ano: number; series: Serie[] }) {
    return (
        <AppLayout>
            <Head title="Numeração" />
            <TituloPagina icone={Hash} titulo="Numeração" descricao={`Séries de numeração dos documentos e códigos em ${ano}.`} />

            <Bloco className="max-w-5xl">
                <div className="overflow-x-auto">
                    <table className="tabela">
                        <thead>
                            <tr>
                                <th>Documento</th>
                                <th>Formato</th>
                                <th className="text-right">Atribuídos em {ano}</th>
                                <th>Último</th>
                                <th>Próximo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {series.map((s) => (
                                <tr key={s.serie}>
                                    <td className="font-medium">{s.nome}</td>
                                    <td>
                                        <code className="bg-muted rounded px-1.5 py-0.5 text-[12px]">{s.formato}</code>
                                    </td>
                                    <td className="text-right tabular-nums">{s.quantos}</td>
                                    <td className="tabular-nums">{s.ultimo ?? <span className="text-muted-foreground">—</span>}</td>
                                    <td className="text-primary font-semibold tabular-nums">{s.proximo}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Bloco>

            <div className="painel text-muted-foreground mt-4 flex max-w-5xl gap-3 p-4 text-[13px]">
                <Info className="text-primary mt-0.5 size-4 shrink-0" />
                <div className="space-y-1">
                    <p>
                        <code>{'{ano}'}</code> é o ano do documento e <code>{'{n}'}</code> o número de ordem, com 4 algarismos. Cada série recomeça em
                        1 no início de cada ano.
                    </p>
                    <p>
                        O número só é atribuído quando o documento é <strong>validado</strong>; até lá o rascunho tem uma referência provisória
                        (PROV). Os números são sequenciais, sem saltos nem repetições, mesmo com vários utilizadores a validar ao mesmo tempo, e não
                        se alteram à mão (exigência fiscal).
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
