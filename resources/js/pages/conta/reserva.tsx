import { ListaFacturas, type FacturaCliente, type ReservaCliente } from '@/components/conta';
import { Campo, Campos, EstadoReserva } from '@/components/erp';
import { type LinhaDocumento } from '@/components/linhas-documento';
import { datasEvento, textoTransporte } from '@/components/reserva';
import ContaLayout from '@/layouts/conta-layout';
import { formatData, formatNumero, formatQuantidade } from '@/lib/format';
import { Link } from '@inertiajs/react';
import { ChevronLeft } from 'lucide-react';

interface Props {
    reserva: ReservaCliente & {
        contacto_local: string | null;
        nota_publica: string | null;
        total_sem_iva: string;
        total_iva: string;
        linhas: LinhaDocumento[];
    };
    facturas: FacturaCliente[];
}

/** O que cada estado quer dizer para o cliente */
const EXPLICACAO: Record<string, string> = {
    pedido: 'A LemServ está a confirmar a disponibilidade do material para estas datas.',
    confirmada: 'Reserva confirmada: o material está guardado para estas datas.',
    entregue: 'O material foi entregue. A recolha está marcada para o dia indicado.',
    devolvida: 'O material voltou. Obrigado por escolher a LemServ.',
    cancelada: 'Esta reserva foi cancelada.',
};

export default function ReservaCliente({ reserva: r, facturas }: Props) {
    return (
        <ContaLayout titulo={`Reserva ${r.numero}`}>
            <Link href="/conta/reservas" className="text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1 text-[13px]">
                <ChevronLeft className="size-3.5" />
                As minhas reservas
            </Link>
            <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <h1 className="font-titulo text-[28px] tracking-[-0.015em]">Reserva {r.numero}</h1>
                <EstadoReserva estado={r.estado} atrasada={r.atrasada} />
            </div>
            <p className="text-muted-foreground mb-6 text-[14px]">{EXPLICACAO[r.estado]}</p>

            <Campos className="mb-6">
                <Campo rotulo="Evento">{datasEvento(r)}</Campo>
                <Campo rotulo="Entrega">{formatData(r.data_entrega)}</Campo>
                <Campo rotulo="Recolha">{formatData(r.data_recolha)}</Campo>
                <Campo rotulo="Local">{r.local}</Campo>
                <Campo rotulo="Contacto no local">{r.contacto_local}</Campo>
                <Campo rotulo="Transporte">{textoTransporte(r)}</Campo>
                <Campo rotulo="Tema de cores">{r.tema}</Campo>
            </Campos>

            <h2 className="mb-3 text-[15px] font-semibold">Material e serviços</h2>
            <div className="mb-6 overflow-x-auto rounded-lg border">
                <table className="tabela">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th className="text-right">Qtd.</th>
                            <th className="text-right">Dias</th>
                            <th className="text-right">Preço/dia</th>
                            <th className="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {r.linhas.map((l) => (
                            <tr key={l.id}>
                                <td>{l.descricao}</td>
                                <td className="text-right tabular-nums">{formatQuantidade(l.quantidade)}</td>
                                <td className="text-right tabular-nums">{l.dias ?? 1}</td>
                                <td className="text-right tabular-nums">{formatNumero(l.preco_unitario)}</td>
                                <td className="text-right tabular-nums">{formatNumero(l.total_sem_iva)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4} className="text-muted-foreground px-4 py-2 text-right">
                                Total sem IVA
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatNumero(r.total_sem_iva)}</td>
                        </tr>
                        <tr>
                            <td colSpan={4} className="text-muted-foreground px-4 py-2 text-right">
                                IVA
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">{formatNumero(r.total_iva)}</td>
                        </tr>
                        <tr>
                            <td colSpan={4} className="px-4 py-2 text-right font-semibold">
                                Total
                            </td>
                            <td className="px-4 py-2 text-right font-semibold tabular-nums">{formatNumero(r.total)} MT</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {r.nota_publica && (
                <>
                    <h2 className="mb-2 text-[15px] font-semibold">Observações</h2>
                    <p className="text-muted-foreground mb-6 text-[14px] whitespace-pre-line">{r.nota_publica}</p>
                </>
            )}

            {facturas.length > 0 && (
                <>
                    <h2 className="mb-3 text-[15px] font-semibold">Facturas desta reserva</h2>
                    <ListaFacturas facturas={facturas} vazio="" />
                </>
            )}
        </ContaLayout>
    );
}
