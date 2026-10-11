import { DocumentoImpresso, type Empresa } from '@/components/documento-impresso';
import { formatData } from '@/lib/format';
import type { NotaCreditoFicha } from './mostrar';

/** Nota de crédito em A4. Identifica sempre a factura que corrige e o motivo (exigência fiscal). */
export default function ImprimirNotaCredito({ nota: n, empresa }: { nota: NotaCreditoFicha; empresa: Empresa }) {
    return (
        <DocumentoImpresso
            titulo="NOTA DE CRÉDITO"
            referencia={n.referencia}
            marca="Original"
            destinatario="Cliente"
            empresa={empresa}
            terceiro={n.terceiro}
            campos={[
                ['Data', formatData(n.data)],
                ['Factura corrigida', `${n.factura.numero} de ${formatData(n.factura.data)}`],
                ['Motivo', n.motivo],
                ['Código de cliente', n.terceiro.codigo_cliente ?? '—'],
            ]}
            linhas={n.linhas}
            totais={{ sem_iva: n.total_sem_iva, iva: n.total_iva, total: n.total, rotuloTotal: 'Total a creditar' }}
            nota={n.nota_publica}
        />
    );
}
