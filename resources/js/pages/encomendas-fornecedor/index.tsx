import { EstadoEncomendaFornecedor, type OrdenacaoLista } from '@/components/erp';
import { ListaDocumentos } from '@/components/lista-documentos';
import { usePode } from '@/hooks/use-pode';
import { type Paginado } from '@/types';
import { ShoppingCart } from 'lucide-react';

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
    { valor: 'encomendada', label: 'Encomendada' },
    { valor: 'atrasadas', label: 'Encomendadas em atraso' },
    { valor: 'recebida', label: 'Recebida' },
    { valor: 'por_facturar', label: 'Por facturar' },
    { valor: 'anulada', label: 'Anulada' },
];

export default function EncomendasFornecedorIndex({ encomendas, filtros, ordenacao, totais }: Props) {
    const pode = usePode();
    const facturadas = new Map(encomendas.data.map((e) => [e.id, e.facturada]));

    return (
        <ListaDocumentos
            titulo="Encomendas a fornecedores"
            icone={ShoppingCart}
            rota="/encomendas-fornecedor"
            novo={pode('compras.criar') ? { href: '/encomendas-fornecedor/nova', label: 'Nova encomenda' } : null}
            rotuloData2="Entrega prevista"
            colunaData2="entrega"
            pagina={{ ...encomendas, data: encomendas.data.map((e) => ({ ...e, data2: e.data_entrega, atraso: e.atrasada })) }}
            filtros={filtros}
            ordenacao={ordenacao}
            totais={totais}
            estados={ESTADOS}
            estado={(l) => <EstadoEncomendaFornecedor estado={l.estado} facturada={facturadas.get(l.id)} atrasada={l.atraso} />}
            nome="encomendas"
            rotuloTerceiro="fornecedor"
        />
    );
}
