import { formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ImageOff } from 'lucide-react';

/** Material como o site e o catálogo o mostram (o preço e a disponibilidade só vêm para clientes com sessão) */
export interface ProdutoLoja {
    id: number;
    nome: string;
    categoria: string | null;
    material: string | null;
    descricao: string | null;
    foto: string | null;
    preco_dia: string | null;
    disponivel?: number | null;
}

export function Foto({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
    return src ? (
        <img src={src} alt={alt} loading="lazy" className={cn('bg-muted size-full object-cover', className)} />
    ) : (
        <div className={cn('bg-muted text-muted-foreground flex size-full items-center justify-center', className)} aria-hidden="true">
            <ImageOff className="size-6 opacity-50" />
        </div>
    );
}

/** "12 livres" / "Esgotado nessas datas" */
export function Disponibilidade({ n, className }: { n: number | null | undefined; className?: string }) {
    if (n === null || n === undefined) return null;
    return (
        <span className={cn('inline-flex items-center gap-1.5 text-[12.5px]', className)}>
            <span className={cn('size-1.5 rounded-full', n > 0 ? 'bg-green-600' : 'bg-red-600')} />
            {n > 0 ? `${n} ${n === 1 ? 'livre' : 'livres'} nessas datas` : 'Esgotado nessas datas'}
        </span>
    );
}

export function CartaoProduto({ p, sufixo = '' }: { p: ProdutoLoja; sufixo?: string }) {
    return (
        <Link href={`/catalogo/${p.id}${sufixo}`} className="group flex flex-col overflow-hidden rounded-lg border transition-shadow hover:shadow-md">
            <div className="aspect-[4/3] overflow-hidden">
                <Foto src={p.foto} alt={p.nome} className="transition-transform duration-300 group-hover:scale-[1.03]" />
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3.5">
                <p className="text-muted-foreground text-[12px]">{[p.categoria, p.material].filter(Boolean).join(' · ')}</p>
                <p className="text-[14.5px] leading-snug font-medium">{p.nome}</p>
                {p.preco_dia && (
                    <p className="mt-auto pt-1 text-[14px]">
                        <span className="font-semibold tabular-nums">{formatNumero(p.preco_dia)} MT</span>
                        <span className="text-muted-foreground text-[12.5px]"> / dia, com IVA</span>
                    </p>
                )}
                <Disponibilidade n={p.disponivel} />
            </div>
        </Link>
    );
}
