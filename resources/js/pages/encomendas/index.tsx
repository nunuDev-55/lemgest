import { EstadoEncomenda, type OrdenacaoLista } from '@/components/erp';
import { ListaDocumentos } from '@/components/lista-documentos';
import { usePode } from '@/hooks/use-pode';
import { type Paginado } from '@/types';
import { PackageCheck } from 'lucide-react';

interface Linha {
    id: number;
    referencia: string;
    data: string;
    data_entrega: string | null;
    cliente: string;
    terceiro_id: number;
    total_sem_iva: string;
    total: string;
    estado: string;
    facturada: boolean;
    atrasada: boolean;
}

interface Props {
    encomendas: Paginado<Linha>;
    filtros: Record<string, string | undefined>;
    ordenacao: OrdenacaoLista;
    totais: { sem_iva: string; total: string };
}

const ESTADOS = [
    { valor: 'rascunho', label: 'Rascunho' },
    { valor: 'validada', label: 'Validada' },
    { valor: 'atrasadas', label: 'Validadas em atraso' },
    { valor: 'entregue', label: 'Entregue' },
    { valor: 'por_facturar', label: 'Por facturar' },
    { valor: 'anulada', label: 'Anulada' },
];

export default function EncomendasIndex({ encomendas, filtros, ordenacao, totais }: Props) {
    const pode = usePode();
    const facturadas = new Map(encomendas.data.map((e) => [e.id, e.facturada]));

    return (
        <ListaDocumentos
            titulo="Encomendas de venda"
            icone={PackageCheck}
            rota="/encomendas"
            novo={pode('encomendas.criar') ? { href: '/encomendas/nova', label: 'Nova encomenda' } : null}
            rotuloData2="Entrega prevista"
            colunaData2="entrega"
            pagina={{ ...encomendas, data: encomendas.data.map((e) => ({ ...e, data2: e.data_entrega, atraso: e.atrasada })) }}
            filtros={filtros}
            ordenacao={ordenacao}
            totais={totais}
            estados={ESTADOS}
            estado={(l) => <EstadoEncomenda estado={l.estado} facturada={facturadas.get(l.id)} atrasada={l.atraso} />}
            nome="encomendas"
        />
    );
}
