import { formatData } from '@/lib/format';

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
    total: string;
    atrasada: boolean;
    cliente?: string;
    terceiro_id?: number;
}

/** "14/11/2026" ou "14/11 a 16/11/2026" */
export function datasEvento(r: Pick<ReservaResumo, 'data_evento' | 'data_fim_evento'>): string {
    if (r.data_evento === r.data_fim_evento) return formatData(r.data_evento);
    return `${formatData(r.data_evento).slice(0, 5)} a ${formatData(r.data_fim_evento)}`;
}
