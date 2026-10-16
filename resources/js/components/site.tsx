import { formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

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
    const capa = (marcadas.length > 0 ? marcadas : fotos).slice(0, 6);
    const outras = fotos.filter((f) => !capa.includes(f));
    return {
        todas: fotos,
        capa,
        pequena: outras[0] ?? fotos[0] ?? null,
        banner: outras.find((f) => f.horizontal) ?? fotos.find((f) => f.horizontal) ?? fotos[0] ?? null,
        /** Até 24: a página mostra 12 e o resto com "Ver mais fotos" */
        galeria: fotos.slice(0, 24),
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

export function CartaoProduto({ p }: { p: ProdutoLoja }) {
    return (
        <Link href={`/catalogo/${p.id}`} className="group flex flex-col">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[var(--areia)]">
                <Foto src={p.foto} alt={p.nome} className="transition-transform duration-500 group-hover:scale-[1.04]" />
                <span className="maiusculas-pequenas absolute inset-x-3 bottom-3 hidden translate-y-2 items-center justify-between rounded-[3px] bg-[var(--tinta)]/90 px-3 py-2.5 text-[10.5px] text-[#efe6da] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
                    Ver a peça
                    <ArrowUpRight className="size-3.5" />
                </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-3">
                <p className="maiusculas-pequenas text-muted-foreground truncate text-[10px] sm:text-[10.5px]">
                    {[p.categoria, p.material].filter(Boolean).join(' · ')}
                </p>
                <p className="font-titulo text-[18px] leading-snug font-medium break-words sm:text-[21px]">{p.nome}</p>
                {p.preco_dia && (
                    <p className="text-[13px] sm:text-[14px]">
                        <span className="font-semibold tabular-nums">{formatNumero(p.preco_dia)} MT</span>
                        <span className="text-muted-foreground text-[12px] sm:text-[12.5px]"> / dia, com IVA</span>
                    </p>
                )}
                <Disponibilidade n={p.disponivel} />
            </div>
        </Link>
    );
}

/**
 * Peças numa fila que desliza para a esquerda e a direita: com o dedo no telemóvel, com as setas no computador.
 * Mostra cerca de 1,4 cartões no telemóvel, 2 no tablet, 3 e 4 nos ecrãs maiores.
 */
export function CarrosselProdutos({
    produtos,
    etiqueta,
    titulo,
    accao,
    className,
}: {
    produtos: ProdutoLoja[];
    etiqueta?: string;
    titulo: ReactNode;
    accao?: ReactNode;
    className?: string;
}) {
    const fila = useRef<HTMLDivElement>(null);
    const [noInicio, setNoInicio] = useState(true);
    const [noFim, setNoFim] = useState(false);

    useEffect(() => {
        const el = fila.current;
        if (!el) return;
        const actualizar = () => {
            setNoInicio(el.scrollLeft <= 4);
            setNoFim(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
        };
        actualizar();
        el.addEventListener('scroll', actualizar, { passive: true });
        window.addEventListener('resize', actualizar);
        return () => {
            el.removeEventListener('scroll', actualizar);
            window.removeEventListener('resize', actualizar);
        };
    }, [produtos.length]);

    const mover = (sentido: 1 | -1) => fila.current?.scrollBy({ left: sentido * fila.current.clientWidth * 0.85, behavior: 'smooth' });
    const seta =
        'flex size-11 items-center justify-center rounded-full border border-[var(--tinta)]/20 bg-card transition-opacity hover:bg-muted disabled:opacity-30';

    if (produtos.length === 0) return null;

    return (
        <section className={className} aria-label={typeof titulo === 'string' ? titulo : etiqueta}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    {etiqueta && <Etiqueta>{etiqueta}</Etiqueta>}
                    <h2 className="font-titulo max-w-xl text-[30px] leading-[1.05] font-medium tracking-[-0.01em] md:text-[42px]">{titulo}</h2>
                </div>
                <div className="flex items-center gap-4">
                    {accao}
                    <div className="hidden gap-2 md:flex">
                        <button type="button" onClick={() => mover(-1)} disabled={noInicio} aria-label="Ver as peças anteriores" className={seta}>
                            <ChevronLeft className="size-4" />
                        </button>
                        <button type="button" onClick={() => mover(1)} disabled={noFim} aria-label="Ver mais peças" className={seta}>
                            <ChevronRight className="size-4" />
                        </button>
                    </div>
                </div>
            </div>
            <div
                ref={fila}
                className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
            >
                {produtos.map((p) => (
                    <div key={p.id} className="w-[70%] shrink-0 snap-start sm:w-[42%] md:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)]">
                        <CartaoProduto p={p} />
                    </div>
                ))}
            </div>
        </section>
    );
}
