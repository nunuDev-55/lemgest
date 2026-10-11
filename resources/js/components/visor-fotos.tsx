import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface FotoVisor {
    src: string;
    alt: string;
}

/**
 * Fotos em ecrã inteiro: setas (ou ← →) para passar, Esc ou clique fora para fechar.
 * indice = null quando está fechado.
 */
export function VisorFotos({ fotos, indice, onMudar }: { fotos: FotoVisor[]; indice: number | null; onMudar: (i: number | null) => void }) {
    const fechar = useRef<HTMLButtonElement>(null);
    const aberto = indice !== null && fotos[indice] !== undefined;

    useEffect(() => {
        if (!aberto) return;
        const anterior = document.activeElement as HTMLElement | null;
        fechar.current?.focus();
        document.body.style.overflow = 'hidden';
        const tecla = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onMudar(null);
            if (e.key === 'ArrowRight') onMudar(((indice ?? 0) + 1) % fotos.length);
            if (e.key === 'ArrowLeft') onMudar(((indice ?? 0) - 1 + fotos.length) % fotos.length);
        };
        window.addEventListener('keydown', tecla);
        return () => {
            window.removeEventListener('keydown', tecla);
            document.body.style.overflow = '';
            anterior?.focus();
        };
    }, [aberto, indice, fotos.length, onMudar]);

    if (!aberto) return null;
    const foto = fotos[indice];
    const varias = fotos.length > 1;
    const botao = 'flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20';

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={foto.alt}
            className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onMudar(null)}
        >
            <div className="flex items-center justify-between p-4 text-[13px] text-white/70">
                <span className="tabular-nums">{varias ? `${indice + 1} / ${fotos.length}` : ''}</span>
                <button ref={fechar} type="button" onClick={() => onMudar(null)} className={botao} aria-label="Fechar">
                    <X className="size-5" />
                </button>
            </div>
            <div
                className="flex min-h-0 flex-1 items-center justify-center gap-3 px-3 pb-4"
                onClick={(e) => e.target === e.currentTarget && onMudar(null)}
            >
                {varias && (
                    <button
                        type="button"
                        onClick={() => onMudar((indice - 1 + fotos.length) % fotos.length)}
                        className={botao}
                        aria-label="Foto anterior"
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                )}
                <figure className="flex max-h-full min-w-0 flex-1 flex-col items-center">
                    <img key={foto.src} src={foto.src} alt={foto.alt} className="max-h-[78svh] max-w-full rounded-lg object-contain" />
                    <figcaption className="mt-3 text-center text-[13px] text-white/70">{foto.alt}</figcaption>
                </figure>
                {varias && (
                    <button type="button" onClick={() => onMudar((indice + 1) % fotos.length)} className={botao} aria-label="Foto seguinte">
                        <ChevronRight className="size-5" />
                    </button>
                )}
            </div>
        </div>
    );
}
