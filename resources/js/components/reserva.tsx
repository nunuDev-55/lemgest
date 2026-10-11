import { formatData, formatNumero } from '@/lib/format';

/** Campos de uma reserva nas listas, no calendário e no cabeçalho da ficha */
export interface ReservaResumo {
    id: number;
    numero: string;
    estado: string;
    estado_nome: string;
    data_evento: string;
    data_fim_evento: string;
    data_entrega: string;
    data_recolha: string;
    dias: number;
    local: string | null;
    tema: string | null;
    transporte: boolean;
    taxa_transporte?: string | null;
    total: string;
    atrasada: boolean;
    cliente?: string;
    terceiro_id?: number;
}

/** "Sim, 3 500,00 MT" / "Sim, taxa por definir" / "Não, o cliente levanta" */
export function textoTransporte(r: { transporte: boolean; taxa_transporte?: string | null }): string {
    if (!r.transporte) return 'Não, o cliente levanta no armazém';
    return r.taxa_transporte
        ? `Sim, a LemServ leva e recolhe · ${formatNumero(r.taxa_transporte)} MT`
        : 'Sim, a LemServ leva e recolhe · taxa por definir';
}

/** "14/11/2026" ou "14/11 a 16/11/2026" */
export function datasEvento(r: Pick<ReservaResumo, 'data_evento' | 'data_fim_evento'>): string {
    if (r.data_evento === r.data_fim_evento) return formatData(r.data_evento);
    return `${formatData(r.data_evento).slice(0, 5)} a ${formatData(r.data_fim_evento)}`;
}
