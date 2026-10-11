import { formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
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

/** Fotos de eventos montados pela LemServ (public/img/eventos, em 1280 e 800 px) */
export interface FotoEvento {
    n: string;
    alt: string;
    vertical: boolean;
}

export const EVENTOS: FotoEvento[] = [
    { n: '01-casamento-jardim', alt: 'Casamento no jardim, com arco de flores e sofás curvos brancos', vertical: true },
    { n: '02-tenda-branca', alt: 'Tenda branca com cortinas e lounge em bouclé no jardim', vertical: true },
    { n: '03-tenda-noite', alt: 'Lounge à noite debaixo de uma tenda com lustres', vertical: true },
    { n: '04-vista-mar', alt: 'Lounge com vista para o mar, poltronas brancas e puffs vermelhos', vertical: false },
    { n: '05-mesas-altas-mar', alt: 'Mesas altas brancas e bancos num terraço junto ao mar', vertical: false },
    { n: '06-tenda-vidro', alt: 'Sofás curvos creme numa tenda de vidro', vertical: false },
    { n: '07-sofa-curvo-creme', alt: 'Sofá curvo, puffs e mesas espelhadas em tons creme', vertical: false },
    { n: '08-varanda-boucle', alt: 'Lounge em bouclé branco numa varanda com plantas', vertical: true },
    { n: '09-esplanada-vermelho', alt: 'Esplanada com sofás bouclé e almofadas vermelhas', vertical: true },
    { n: '10-veludo-azul-verde', alt: 'Sofás brancos com mesas de veludo azul e verde', vertical: false },
    { n: '11-jardim-amarelo-azul', alt: 'Sofá branco com almofadas amarelas e azuis no jardim', vertical: false },
    { n: '12-evento-empresa', alt: 'Evento de empresa com sofás brancos e mesa vermelha', vertical: true },
    { n: '13-conjunto-branco', alt: 'Conjunto branco com mesa de centro verde-oliva', vertical: false },
    { n: '14-rosa-veludo', alt: 'Sofá branco com almofadas e mesas de veludo rosa', vertical: true },
    { n: '15-aniversario-rosa', alt: 'Aniversário em rosa e amarelo no jardim', vertical: false },
    { n: '16-piscina-preto', alt: 'Sofá preto curvo junto à piscina, com almofadas douradas', vertical: false },
    { n: '17-sala-preto-branco', alt: 'Sala com sofás brancos, almofadas pretas e mesas lacadas', vertical: true },
    { n: '18-tenda-lilas', alt: 'Tenda branca com almofadas lilás e rosa', vertical: true },
    { n: '19-lounge-rosa-amarelo', alt: 'Lounge colorido com puffs rosa e amarelos', vertical: false },
    { n: '20-terraco-relva', alt: 'Puffs e sofás brancos num terraço relvado', vertical: true },
];

export const fotoEvento = (n: string, tamanho: 'g' | 'm' = 'm') => `/img/eventos/${n}-${tamanho}.webp`;

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
        <p className={cn('text-primary mb-3 flex items-center gap-2 text-[12px] font-medium tracking-[0.16em] uppercase', className)}>{children}</p>
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
                <h2 className="font-titulo max-w-xl text-[30px] leading-[1.1] tracking-[-0.01em] md:text-[38px]">{titulo}</h2>
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
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--areia)]">
                <Foto src={p.foto} alt={p.nome} className="transition-transform duration-500 group-hover:scale-[1.04]" />
                <span className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                    <ArrowUpRight className="size-4" />
                </span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 pt-3">
                <p className="text-muted-foreground text-[12px] tracking-[0.06em] uppercase">
                    {[p.categoria, p.material].filter(Boolean).join(' · ')}
                </p>
                <p className="font-titulo text-[18px] leading-snug">{p.nome}</p>
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
