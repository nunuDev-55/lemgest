import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

/** Miniatura quadrada da foto principal de um produto; sem foto, mostra um quadrado neutro */
export function MiniaturaProduto({ src, nome, className }: { src: string | null; nome: string; className?: string }) {
    return (
        <span className={cn('bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border', className)}>
            {src ? (
                <img src={src} alt={nome} loading="lazy" decoding="async" className="size-full object-cover" />
            ) : (
                <ImageIcon className="text-muted-foreground/50 size-4" aria-hidden="true" />
            )}
        </span>
    );
}
