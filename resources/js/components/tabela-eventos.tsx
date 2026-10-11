import { Bloco } from '@/components/erp';
import { formatDataHora } from '@/lib/format';

export interface Evento {
    id: number;
    data: string;
    descricao: string;
    utilizador: string;
}

/** Separador "Eventos" das fichas: o que foi feito ao documento, por quem e quando (vem da auditoria). */
export function TabelaEventos({ eventos }: { eventos: Evento[] }) {
    return (
        <Bloco titulo="Últimos eventos">
            <table className="tabela">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Por</th>
                        <th>Evento</th>
                    </tr>
                </thead>
                <tbody>
                    {eventos.length === 0 && (
                        <tr>
                            <td colSpan={3} className="text-muted-foreground italic">
                                Sem eventos
                            </td>
                        </tr>
                    )}
                    {eventos.map((e) => (
                        <tr key={e.id}>
                            <td className="whitespace-nowrap tabular-nums">{formatDataHora(e.data)}</td>
                            <td>{e.utilizador}</td>
                            <td>{e.descricao}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Bloco>
    );
}
