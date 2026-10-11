import { ListaFacturas, type FacturaCliente } from '@/components/conta';
import { Paginacao } from '@/components/paginacao';
import ContaLayout from '@/layouts/conta-layout';
import { formatData, formatNumero } from '@/lib/format';
import { type Paginado } from '@/types';
import { ReceiptText } from 'lucide-react';

interface Recibo {
    id: number;
    numero: string;
    data: string;
    valor: string;
    metodo: string;
}

export default function FacturasCliente({ facturas, recibos }: { facturas: Paginado<FacturaCliente>; recibos: Recibo[] }) {
    return (
        <ContaLayout titulo="Facturas e recibos">
            <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.015em]">Facturas e recibos</h1>
            <p className="text-muted-foreground mb-5 text-[14px]">
                A factura diz quanto há a pagar; o recibo prova que pagou. Cada documento abre pronto a imprimir ou a guardar em PDF.
            </p>

            <h2 className="mb-3 text-[15px] font-semibold">Facturas</h2>
            <ListaFacturas facturas={facturas.data} vazio="Ainda não tem facturas." />
            {facturas.last_page > 1 && <Paginacao pagina={facturas} nome="facturas" />}

            <h2 className="mt-8 mb-3 text-[15px] font-semibold">Recibos</h2>
            {recibos.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border px-4 py-8 text-center text-[13.5px]">Ainda não tem pagamentos registados.</p>
            ) : (
                <ul className="divide-y rounded-lg border">
                    {recibos.map((r) => (
                        // Abre noutro separador, pronto a imprimir (página A4, fora da área do cliente)
                        <li key={r.id}>
                            <a
                                href={`/conta/recibos/${r.id}`}
                                target="_blank"
                                rel="noopener"
                                className="hover:bg-muted flex items-center gap-4 px-4 py-3.5 transition-colors"
                            >
                                <ReceiptText className="text-muted-foreground size-4 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-medium">Recibo {r.numero}</p>
                                    <p className="text-muted-foreground text-[12.5px]">
                                        {formatData(r.data)} · {r.metodo}
                                    </p>
                                </div>
                                <span className="text-[14px] font-medium tabular-nums">{formatNumero(r.valor)} MT</span>
                            </a>
                        </li>
                    ))}
                </ul>
            )}
        </ContaLayout>
    );
}
