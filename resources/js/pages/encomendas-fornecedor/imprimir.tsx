import { DocumentoImpresso, type Empresa } from '@/components/documento-impresso';
import { formatData } from '@/lib/format';
import type { EncomendaFornecedorFicha } from './mostrar';

/** Encomenda a fornecedor em A4, para enviar ao fornecedor (PDF por e-mail ou WhatsApp). */
export default function ImprimirEncomendaFornecedor({ documento: e, empresa }: { documento: EncomendaFornecedorFicha; empresa: Empresa }) {
    const campos: [string, string][] = [
        ['Data da encomenda', formatData(e.data)],
        ['Entrega prevista', formatData(e.data_entrega) || '—'],
        ['Termos de pagamento', e.termos_pagamento_nome],
    ];
    if (e.ref_fornecedor) campos.push(['Vossa referência', e.ref_fornecedor]);
    if (e.terceiro.codigo_fornecedor) campos.push(['Código de fornecedor', e.terceiro.codigo_fornecedor]);

    return (
        <DocumentoImpresso
            titulo="ENCOMENDA"
            referencia={e.referencia}
            marca={e.estado === 'anulada' ? 'ANULADA' : 'A fornecedor'}
            destinatario="Fornecedor"
            empresa={empresa}
            terceiro={e.terceiro}
            campos={campos}
            linhas={e.linhas}
            totais={{ sem_iva: e.total_sem_iva, iva: e.total_iva, total: e.total }}
            nota={e.nota_publica}
            rodape="Pedimos a confirmação desta encomenda e da data de entrega. Na factura, indique o nosso número de encomenda."
        />
    );
}
