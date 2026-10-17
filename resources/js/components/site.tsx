import { useSite } from '@/layouts/site-layout';
import { formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, router, usePage } from '@inertiajs/react';
import { ArrowUpRight, Check, ChevronLeft, ChevronRight, Hammer, Heart, ImageOff, LoaderCircle, Plus, Sparkles, Truck } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Material como o site e o catálogo o mostram (o preço e a disponibilidade só vêm para clientes com sessão e para a equipa) */
export interface ProdutoLoja {
    id: number;
    nome: string;
    categoria: string | null;
    material: string | null;
    descricao: string | null;
    foto: string | null;
    foto_grande?: string | null;
    /** A foto é ao alto (ou quadrada); as deitadas mostram-se inteiras nas molduras ao alto */
    foto_ao_alto?: boolean | null;
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
    // As molduras largas (faixa e fim da página) levam fotos deitadas, cada uma a sua
    const deitadas = [...outras, ...capa].filter((f) => f.horizontal);
    return {
        todas: fotos,
        capa,
        pequena: outras[0] ?? fotos[0] ?? null,
        banner: deitadas[0] ?? fotos[0] ?? null,
        fim: deitadas[1] ?? deitadas[0] ?? fotos[0] ?? null,
        /** Até 24: a página mostra 12 e o resto com "Ver mais fotos" */
        galeria: fotos.slice(0, 24),
        /** Foto n.º i, às voltas (para dar uma foto a cada categoria sem foto); com aoAlto, só entre as fotos ao alto, se as houver */
        porIndice: (i: number, aoAlto = false) => {
            const lista = aoAlto && fotos.some((f) => !f.horizontal) ? fotos.filter((f) => !f.horizontal) : fotos;
            return lista.length > 0 ? lista[i % lista.length] : null;
        },
    };
}

/**
 * Fotos de ponta a ponta (capa, fundo de "Entrar"): num ecrã ao alto (telemóvel) só as fotos ao alto e num ecrã deitado
 * (computador) só as deitadas, para não se perder metade de cada foto no corte. Sem nenhuma da orientação certa, usa todas.
 */
export function useFotosDoEcra(fotos: FotoSite[]) {
    const [aoAlto, setAoAlto] = useState(() => typeof window !== 'undefined' && window.matchMedia('(orientation: portrait)').matches);
    useEffect(() => {
        const consulta = window.matchMedia('(orientation: portrait)');
        const mudar = () => setAoAlto(consulta.matches);
        // Ao rodar o telemóvel ou mudar o tamanho da janela (nem todos os navegadores avisam pela consulta)
        consulta.addEventListener('change', mudar);
        window.addEventListener('resize', mudar);
        return () => {
            consulta.removeEventListener('change', mudar);
            window.removeEventListener('resize', mudar);
        };
    }, []);
    const certas = fotos.filter((f) => f.horizontal !== aoAlto);
    return certas.length > 0 ? certas : fotos;
}

/**
 * Foto que aparece com um esbatimento suave quando acaba de carregar. Com "inteira" (foto deitada numa moldura ao alto),
 * mostra-se a foto toda por cima de uma cópia desfocada que enche a moldura, em vez de lhe cortar os lados.
 */
export function Foto({
    src,
    alt,
    className,
    prioridade,
    inteira,
}: {
    src: string | null;
    alt: string;
    className?: string;
    prioridade?: boolean;
    inteira?: boolean;
}) {
    const [carregada, setCarregada] = useState(false);
    if (!src) {
        return (
            <div className={cn('text-muted-foreground flex size-full items-center justify-center bg-[var(--areia)]', className)} aria-hidden="true">
                <ImageOff className="size-6 opacity-40" />
            </div>
        );
    }
    const foto = (
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
                'size-full transition-opacity duration-500',
                inteira ? 'relative object-contain' : 'bg-[var(--areia)] object-cover',
                carregada ? 'opacity-100' : 'opacity-0',
                className,
            )}
        />
    );
    if (!inteira) return foto;
    return (
        <div className="relative size-full overflow-hidden bg-[var(--areia)]">
            <img
                src={src}
                alt=""
                aria-hidden="true"
                loading={prioridade ? 'eager' : 'lazy'}
                className="absolute inset-0 size-full scale-125 object-cover opacity-70 blur-2xl"
            />
            {foto}
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

/** Coração (♡) para guardar a peça em A minha conta → Favoritos; muda logo, sem esperar pelo servidor */
function BotaoFavorito({ p, className }: { p: ProdutoLoja; className?: string }) {
    const { favoritos } = useSite();
    const pagina = usePage().component;
    const [aMudar, setAMudar] = useState<boolean | null>(null);
    const guardado = aMudar ?? (favoritos ?? []).includes(p.id);

    function alternar() {
        setAMudar(!guardado);
        router.post(
            `/catalogo/favoritos/${p.id}`,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                // Na lista de favoritos a página recarrega toda (a peça sai da lista); no resto, só os favoritos e o aviso
                ...(pagina === 'conta/favoritos' ? {} : { only: ['favoritos', 'flash'] }),
                onFinish: () => setAMudar(null),
            },
        );
    }

    return (
        <button
            type="button"
            onClick={alternar}
            aria-pressed={guardado}
            aria-label={guardado ? `Tirar ${p.nome} dos favoritos` : `Guardar ${p.nome} nos favoritos`}
            className={cn(
                'flex size-9 items-center justify-center rounded-full bg-white/90 text-[var(--tinta)] shadow-sm backdrop-blur transition-transform hover:scale-105',
                className,
            )}
        >
            <Heart className={cn('size-[18px] transition-colors', guardado && 'fill-[#b4233c] text-[#b4233c]')} strokeWidth={1.8} />
        </button>
    );
}

/** "+": junta 1 peça à reserva sem abrir a ficha (as datas e a quantidade acertam-se em "A minha reserva") */
function BotaoJuntar({ p }: { p: ProdutoLoja }) {
    const [estado, setEstado] = useState<'parado' | 'a-juntar' | 'junto'>('parado');

    useEffect(() => {
        if (estado !== 'junto') return;
        const t = setTimeout(() => setEstado('parado'), 1600);
        return () => clearTimeout(t);
    }, [estado]);

    function juntar() {
        router.post(
            '/catalogo/reserva/linhas',
            { produto_id: p.id, quantidade: 1 },
            {
                preserveScroll: true,
                preserveState: true,
                only: ['carrinho', 'flash'],
                onStart: () => setEstado('a-juntar'),
                onSuccess: () => setEstado('junto'),
                onError: () => setEstado('parado'),
            },
        );
    }

    return (
        <button
            type="button"
            onClick={juntar}
            disabled={estado === 'a-juntar'}
            aria-label={`Juntar 1 ${p.nome} à reserva`}
            title="Juntar à reserva"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--tinta)] text-[#efe6da] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
            {estado === 'a-juntar' ? (
                <LoaderCircle className="size-4 animate-spin" />
            ) : estado === 'junto' ? (
                <Check className="size-4" />
            ) : (
                <Plus className="size-4" />
            )}
        </button>
    );
}

export function CartaoProduto({ p }: { p: ProdutoLoja }) {
    const { cliente, pode } = useSite();
    const ficha = `/catalogo/${p.id}`;
    return (
        <article className="group flex flex-col">
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[var(--areia)]">
                {/* A foto e o nome levam à ficha; o coração e o "+" são botões à parte */}
                <Link href={ficha} tabIndex={-1} aria-hidden="true" className="block size-full">
                    <Foto
                        src={p.foto}
                        alt=""
                        inteira={p.foto_ao_alto === false}
                        className="transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <span className="maiusculas-pequenas absolute inset-x-3 bottom-3 hidden translate-y-2 items-center justify-between rounded-[3px] bg-[var(--tinta)]/90 px-3 py-2.5 text-[10.5px] text-[#efe6da] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
                        Ver a peça
                        <ArrowUpRight className="size-3.5" />
                    </span>
                </Link>
                {cliente && pode('loja.catalogo') && <BotaoFavorito p={p} className="absolute top-2.5 right-2.5" />}
            </div>
            <div className="flex items-start gap-2 pt-3">
                <Link href={ficha} className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="maiusculas-pequenas text-muted-foreground truncate text-[10px] sm:text-[10.5px]">
                        {[p.categoria, p.material].filter(Boolean).join(' · ')}
                    </span>
                    <span className="font-titulo text-[18px] leading-snug font-medium break-words sm:text-[21px]">{p.nome}</span>
                    {p.preco_dia && (
                        <span className="text-[13px] sm:text-[14px]">
                            <span className="font-semibold tabular-nums">{formatNumero(p.preco_dia)} MT</span>
                            <span className="text-muted-foreground text-[12px] sm:text-[12.5px]"> / dia, com IVA</span>
                        </span>
                    )}
                    <Disponibilidade n={p.disponivel} />
                </Link>
                {cliente && pode('loja.reservar') && p.preco_dia && <BotaoJuntar p={p} />}
            </div>
        </article>
    );
}

const SELOS = [
    { icone: Hammer, titulo: 'Fabrico próprio', texto: 'Feito pela LemServ' },
    { icone: Truck, titulo: 'Entrega e montagem', texto: 'Em Maputo e Matola' },
    { icone: Sparkles, titulo: 'Limpo e revisto', texto: 'Antes de cada evento' },
];

/** Selos de confiança: o que a LemServ garante em todas as peças */
export function SelosConfianca({ className }: { className?: string }) {
    return (
        <ul className={cn('grid grid-cols-3 gap-2 sm:gap-4', className)}>
            {SELOS.map((s) => (
                <li
                    key={s.titulo}
                    className="flex flex-col items-center gap-1.5 rounded-xl border bg-[var(--card)] px-2 py-3 text-center sm:flex-row sm:gap-3 sm:px-4 sm:py-4 sm:text-left"
                >
                    <s.icone className="size-5 shrink-0 text-[#9c7a45]" strokeWidth={1.6} />
                    <span>
                        <span className="block text-[12.5px] leading-tight font-medium sm:text-[14px]">{s.titulo}</span>
                        <span className="text-muted-foreground text-[11.5px] sm:text-[12.5px]">{s.texto}</span>
                    </span>
                </li>
            ))}
        </ul>
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
