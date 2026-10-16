import { formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, ImageOff } from 'lucide-react';
import { useState, type ReactNode } from 'react';

/** Material como o site e o catálogo o mostram (o preço e a disponibilidade só vêm para clientes com sessão e para a equipa) */
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

/** Foto de evento gerida em Administração → Site e galeria */
export interface FotoSite {
    id: number;
    legenda: string;
    grande: string;
    media: string;
    capa: boolean;
    horizontal: boolean;
}

/** As fotos visíveis do site, pela ordem escolhida no LemGest, e as que servem cada parte da página */
export function useFotosSite() {
    const fotos = usePage<{ fotosSite?: FotoSite[] }>().props.fotosSite ?? [];
    const marcadas = fotos.filter((f) => f.capa);
    const capa = (marcadas.length > 0 ? marcadas : fotos).slice(0, 3);
    const outras = fotos.filter((f) => !capa.includes(f));
    return {
        todas: fotos,
        capa,
        pequena: outras[0] ?? fotos[0] ?? null,
        banner: outras.find((f) => f.horizontal) ?? fotos.find((f) => f.horizontal) ?? fotos[0] ?? null,
        galeria: fotos.slice(0, 12),
        /** Foto n.º i, às voltas (para dar uma foto a cada categoria sem foto) */
        porIndice: (i: number) => (fotos.length > 0 ? fotos[i % fotos.length] : null),
    };
}

/** Foto que aparece com um esbatimento suave quando acaba de carregar */
export function Foto({ src, alt, className, prioridade }: { src: string | null; alt: string; className?: string; prioridade?: boolean }) {
    const [carregada, setCarregada] = useState(false);
    return src ? (
        <img
            src={src}
            alt={alt}
            loading={prioridade ? 'eager' : 'lazy'}
            onLoad={() => setCarregada(true)}
            ref={(img) => {
                // Já estava na cache do navegador
                if (img?.complete && img.naturalWidth > 0 && !carregada) setCarregada(true);
            }}
            className={cn(
                'size-full bg-[var(--areia)] object-cover transition-opacity duration-500',
                carregada ? 'opacity-100' : 'opacity-0',
                className,
            )}
        />
    ) : (
        <div className={cn('text-muted-foreground flex size-full items-center justify-center bg-[var(--areia)]', className)} aria-hidden="true">
            <ImageOff className="size-6 opacity-40" />
        </div>
    );
}

/** Pequeno título por cima do título da secção ("— O nosso material") */
export function Etiqueta({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p className={cn('maiusculas-pequenas mb-4 flex items-center gap-3 font-medium text-[#9c7a45]', className)}>
            <span className="h-px w-6 bg-current opacity-60" aria-hidden="true" />
            {children}
        </p>
    );
}

export function TituloSeccao({
    etiqueta,
    titulo,
    accao,
    className,
}: {
    etiqueta?: string;
    titulo: ReactNode;
    accao?: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('mb-8 flex flex-wrap items-end justify-between gap-4', className)}>
            <div>
                {etiqueta && <Etiqueta>{etiqueta}</Etiqueta>}
                <h2 className="font-titulo max-w-xl text-[34px] leading-[1.05] font-medium tracking-[-0.01em] md:text-[46px]">{titulo}</h2>
            </div>
            {accao}
        </div>
    );
}

/** "12 livres nessas datas" / "Esgotado nessas datas" */
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
        <Link href={`/catalogo/${p.id}${sufixo}`} className="group flex flex-col">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[var(--areia)]">
                <Foto src={p.foto} alt={p.nome} className="transition-transform duration-500 group-hover:scale-[1.04]" />
                <span className="maiusculas-pequenas absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-between rounded-[3px] bg-[var(--tinta)]/90 px-3 py-2.5 text-[10.5px] text-[#efe6da] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    Ver a peça
                    <ArrowUpRight className="size-3.5" />
                </span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 pt-3">
                <p className="maiusculas-pequenas text-muted-foreground text-[10.5px]">{[p.categoria, p.material].filter(Boolean).join(' · ')}</p>
                <p className="font-titulo text-[21px] leading-snug font-medium">{p.nome}</p>
                {p.preco_dia && (
                    <p className="text-[14px]">
                        <span className="font-semibold tabular-nums">{formatNumero(p.preco_dia)} MT</span>
                        <span className="text-muted-foreground text-[12.5px]"> / dia, com IVA</span>
                    </p>
                )}
                <Disponibilidade n={p.disponivel} />
            </div>
        </Link>
    );
}
