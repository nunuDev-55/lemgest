import { EstadoOrcamento, type OrdenacaoLista } from '@/components/erp';
import { ListaDocumentos } from '@/components/lista-documentos';
import { usePode } from '@/hooks/use-pode';
import { type Paginado } from '@/types';
import { FileSignature } from 'lucide-react';

interface Linha {
    id: number;
    referencia: string;
    data: string;
    data_fim_validade: string | null;
    cliente: string;
    terceiro_id: number;
    total_sem_iva: string;
    total: string;
    estado: string;
    expirado: boolean;
}

interface Props {
    orcamentos: Paginado<Linha>;
    filtros: Record<string, string | undefined>;
    ordenacao: OrdenacaoLista;
    totais: { sem_iva: string; total: string };
}

const ESTADOS = [
    { valor: 'rascunho', label: 'Rascunho' },
    { valor: 'aberto', label: 'Aberto' },
    { valor: 'expirados', label: 'Abertos expirados' },
    { valor: 'assinado', label: 'Assinado (por facturar)' },
    { valor: 'recusado', label: 'Não assinado' },
    { valor: 'facturado', label: 'Facturado' },
];

export default function OrcamentosIndex({ orcamentos, filtros, ordenacao, totais }: Props) {
    const pode = usePode();

    return (
        <ListaDocumentos
            titulo="Orçamentos"
            icone={FileSignature}
            rota="/orcamentos"
            novo={pode('orcamentos.criar') ? { href: '/orcamentos/novo', label: 'Novo orçamento' } : null}
            rotuloData2="Válido até"
            colunaData2="validade"
            pagina={{ ...orcamentos, data: orcamentos.data.map((o) => ({ ...o, data2: o.data_fim_validade, atraso: o.expirado })) }}
            filtros={filtros}
            ordenacao={ordenacao}
            totais={totais}
            estados={ESTADOS}
            estado={(l) => <EstadoOrcamento estado={l.estado} expirado={l.atraso} />}
            nome="orçamentos"
        />
    );
}
