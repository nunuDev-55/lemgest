import { TituloPagina } from '@/components/erp';
import { LayoutGrid, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface Props {
    titulo: string;
    descricao?: string;
    icone?: LucideIcon;
    accoes?: ReactNode;
}

/** Título das páginas de administração (mesmo aspecto do resto do sistema). */
export function CabecalhoPagina({ titulo, descricao, icone, accoes }: Props) {
    return <TituloPagina icone={icone ?? LayoutGrid} titulo={titulo} descricao={descricao} accoes={accoes} />;
}
