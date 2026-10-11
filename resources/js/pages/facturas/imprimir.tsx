import { DocumentoImpresso, type Empresa } from '@/components/documento-impresso';
import { datasEvento } from '@/components/reserva';
import { formatData, formatNumero } from '@/lib/format';
import { type FacturaFicha } from './mostrar';

const MARCA: Record<string, string> = {
    validada: 'Original',
    paga: 'Original — PAGA',
    abandonada: 'ANULADA',
};

/** Factura em A4 para imprimir ou guardar como PDF a partir do navegador. */
export default function ImprimirFactura({ factura: f, empresa, rodape }: { factura: FacturaFicha; empresa: Empresa; rodape: string | null }) {
    return (
        <DocumentoImpresso
            titulo="FACTURA"
            referencia={f.referencia}
            marca={MARCA[f.estado]}
            destinatario="Factura para"
            empresa={empresa}
            terceiro={f.terceiro}
            campos={[
                ['Data da factura', formatData(f.data)],
                ['Vencimento', formatData(f.data_vencimento)],
                ['Termos de pagamento', f.termos_pagamento_nome],
                ['Método de pagamento', f.metodo_pagamento_nome ?? '—'],
                ['Código de cliente', f.terceiro.codigo_cliente ?? '—'],
                // Factura de um aluguer: a reserva e o período (a referência da reserva não se repete como requisição)
                ...(f.aluguer
                    ? ([
                          ['Reserva', f.aluguer.numero],
                          ['Evento', datasEvento(f.aluguer)],
                          ['Entrega e recolha', `${formatData(f.aluguer.data_entrega)} a ${formatData(f.aluguer.data_recolha)}`],
                      ] as [string, string][])
                    : []),
                ...(f.ref_cliente && f.ref_cliente !== f.aluguer?.numero ? ([['Nº requisição', f.ref_cliente]] as [string, string][]) : []),
            ]}
            linhas={f.linhas}
            totais={{ sem_iva: f.total_sem_iva, iva: f.total_iva, total: f.total, rotuloTotal: 'Total a pagar' }}
            extraTotais={
                Number(f.total_pago) > 0 && (
                    <>
                        <tr>
                            <td className="py-1 text-neutral-600">Já pago</td>
                            <td className="py-1 text-right tabular-nums">{formatNumero(f.total_pago)} MT</td>
                        </tr>
                        <tr className="font-semibold">
                            <td className="py-1">Restante</td>
                            <td className="py-1 text-right tabular-nums">{formatNumero(f.em_falta)} MT</td>
                        </tr>
                    </>
                )
            }
            nota={f.nota_publica}
            rodape={rodape}
        />
    );
}
