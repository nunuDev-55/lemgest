import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

export function EstadoVazio({
    icone: Icone,
    titulo,
    descricao,
    accao,
}: {
    icone: LucideIcon;
    titulo: string;
    descricao?: string;
    accao?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="bg-secondary text-muted-foreground flex size-11 items-center justify-center rounded-full">
                <Icone className="size-5" />
            </div>
            <div>
                <p className="font-semibold">{titulo}</p>
                {descricao && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{descricao}</p>}
            </div>
            {accao}
        </div>
    );
}
