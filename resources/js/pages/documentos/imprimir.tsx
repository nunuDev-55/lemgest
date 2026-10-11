import { DocumentoImpresso, type Empresa } from '@/components/documento-impresso';
import { type LinhaDocumento } from '@/components/linhas-documento';
import { formatData } from '@/lib/format';

interface Documento {
    referencia: string;
    estado: string;
    data: string;
    data_entrega: string | null;
    data_fim_validade?: string | null;
    termos_pagamento_nome: string;
    metodo_pagamento_nome: string | null;
    ref_cliente: string | null;
    nota_publica: string | null;
    total_sem_iva: string;
    total_iva: string;
    total: string;
    terceiro: {
        nome: string;
        codigo_cliente: string | null;
        morada: string | null;
        cidade: string | null;
        provincia: string | null;
        nuit: string | null;
    };
    linhas: LinhaDocumento[];
}

/** Orçamento ou encomenda em A4, para imprimir ou guardar como PDF. */
export default function ImprimirDocumento({
    tipo,
    documento: d,
    empresa,
    rodape,
}: {
    tipo: 'orcamento' | 'encomenda';
    documento: Documento;
    empresa: Empresa;
    rodape: string | null;
}) {
    const orcamento = tipo === 'orcamento';
    const campos: [string, string][] = orcamento
        ? [
              ['Data', formatData(d.data)],
              ['Válido até', formatData(d.data_fim_validade)],
              ...(d.data_entrega ? ([['Data de entrega / evento', formatData(d.data_entrega)]] as [string, string][]) : []),
              ['Termos de pagamento', d.termos_pagamento_nome],
          ]
        : [
              ['Data da encomenda', formatData(d.data)],
              ['Entrega prevista', formatData(d.data_entrega) || '—'],
              ['Termos de pagamento', d.termos_pagamento_nome],
          ];
    campos.push(['Código de cliente', d.terceiro.codigo_cliente ?? '—']);
    if (d.ref_cliente) campos.push(['Ref. do cliente', d.ref_cliente]);

    return (
        <DocumentoImpresso
            titulo={orcamento ? 'ORÇAMENTO' : 'ENCOMENDA'}
            referencia={d.referencia}
            marca={d.estado === 'recusado' || d.estado === 'anulada' ? 'ANULADO' : undefined}
            destinatario={orcamento ? 'Orçamento para' : 'Cliente'}
            empresa={empresa}
            terceiro={d.terceiro}
            campos={campos}
            linhas={d.linhas}
            totais={{ sem_iva: d.total_sem_iva, iva: d.total_iva, total: d.total }}
            nota={d.nota_publica}
            rodape={rodape}
        />
    );
}
