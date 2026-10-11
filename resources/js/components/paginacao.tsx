import { cn } from '@/lib/utils';
import { type Paginado } from '@/types';
import { Link } from '@inertiajs/react';
import { type ReactNode } from 'react';

function rotulo(label: string) {
    if (label.includes('Previous') || label.includes('Anterior') || label.includes('&laquo;')) return '‹';
    if (label.includes('Next') || label.includes('Próximo') || label.includes('&raquo;')) return '›';
    return label;
}

export function Paginacao<T>({ pagina, nome = 'registos', extra }: { pagina: Paginado<T>; nome?: string; extra?: ReactNode }) {
    return (
        <div className="flex flex-col items-center justify-between gap-2 py-3 sm:flex-row">
            <p className="text-muted-foreground text-xs">
                {pagina.total === 0 ? `0 ${nome}` : `${pagina.from}–${pagina.to} de ${pagina.total} ${nome}`}
            </p>
            <div className="flex items-center gap-3">
                {extra}
                {pagina.last_page > 1 && (
                    <nav className="flex items-center gap-0.5" aria-label="Paginação">
                        {pagina.links.map((link, i) =>
                            link.url ? (
                                <Link
                                    key={i}
                                    href={link.url}
                                    preserveScroll
                                    preserveState
                                    className={cn(
                                        'flex h-7 min-w-7 items-center justify-center rounded border px-2 text-xs transition-colors',
                                        link.active ? 'bg-primary text-primary-foreground border-primary font-semibold' : 'bg-card hover:bg-accent',
                                    )}
                                    aria-current={link.active ? 'page' : undefined}
                                >
                                    {rotulo(link.label)}
                                </Link>
                            ) : (
                                <span key={i} className="text-muted-foreground/50 flex h-7 min-w-7 items-center justify-center px-2 text-xs">
                                    {rotulo(link.label)}
                                </span>
                            ),
                        )}
                    </nav>
                )}
            </div>
        </div>
    );
}
