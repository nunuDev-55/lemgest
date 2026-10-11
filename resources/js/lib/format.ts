const numero = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });

/** 1234.5 → "1 234,50 MT" (formato usado em Moçambique) */
export function formatMT(valor: number | string): string {
    return `${numero.format(Number(valor))} MT`;
}

const dataLonga = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Maputo' });

/** "quinta-feira, 9 de outubro de 2026" */
export function formatDataLonga(data: Date = new Date()): string {
    return dataLonga.format(data);
}

const dataHora = new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Maputo',
});

/** "09/10/2026, 14:30" */
export function formatDataHora(iso: string | null | undefined): string {
    return iso ? dataHora.format(new Date(iso)) : '—';
}

const relativo = new Intl.RelativeTimeFormat('pt-PT', { numeric: 'auto' });

/** "há 5 minutos", "ontem", "há 3 dias" */
export function formatRelativo(iso: string | null | undefined): string {
    if (!iso) return 'Nunca';
    const segundos = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const unidades: [Intl.RelativeTimeFormatUnit, number][] = [
        ['year', 31536000],
        ['month', 2592000],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];
    for (const [unidade, s] of unidades) {
        if (Math.abs(segundos) >= s) return relativo.format(Math.round(segundos / s), unidade);
    }
    return 'agora mesmo';
}

const numeroMilhares = new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' });

/** 1740 → "1 740,00" (sem a moeda, para tabelas) */
export function formatNumero(valor: number | string | null | undefined): string {
    if (valor === null || valor === undefined || valor === '') return '';
    return numeroMilhares.format(Number(valor));
}

/** "2026-10-09" → "09/10/2026" */
export function formatData(iso: string | null | undefined): string {
    if (!iso) return '';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${a}`;
}

/** "1.000" → "1", "2.500" → "2,5" (quantidades) */
export function formatQuantidade(valor: number | string): string {
    return new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 3 }).format(Number(valor));
}
