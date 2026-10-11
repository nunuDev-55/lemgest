import { Notificacoes } from '@/components/notificacoes';
import { cn } from '@/lib/utils';
import { Head, Link, usePage } from '@inertiajs/react';
import { Mail, MapPin, Menu, MessageCircle, Phone, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

/** Dados partilhados nas páginas públicas (site, catálogo, área do cliente) */
export interface DadosSite {
    cliente: { id: number; nome: string; email: string; permissoes: string[] } | null;
    loja: {
        nome: string;
        nome_comercial: string | null;
        telemovel: string | null;
        telefone: string | null;
        email: string | null;
        morada: string | null;
        cidade: string | null;
        logotipo: string;
    } | null;
    carrinho: number;
    /** Alguém da equipa a ver a loja a partir do LemGest (vê os preços, não reserva) */
    equipa: { nome: string } | null;
    [key: string]: unknown;
}

/** "+258 84 122 1986" → "https://wa.me/258841221986" */
export function linkWhatsApp(numero: string | null | undefined, texto?: string): string | null {
    const digitos = (numero ?? '').replace(/\D/g, '');
    if (digitos.length < 9) return null;
    const completo = digitos.length === 9 ? `258${digitos}` : digitos;
    return `https://wa.me/${completo}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

/** O site e a área do cliente são sempre claros, mesmo com o tema escuro do LemGest ligado (volta ao sair) */
export function useSempreClaro() {
    useEffect(() => {
        const raiz = document.documentElement;
        const tinhaEscuro = raiz.classList.contains('dark');
        raiz.classList.remove('dark');
        return () => {
            if (tinhaEscuro) raiz.classList.add('dark');
        };
    }, []);
}

export function useSite() {
    const props = usePage<DadosSite>().props;
    const pode = (permissao: string) => (props.cliente?.permissoes ?? []).includes(permissao);
    return { ...props, pode };
}

const LIGACOES = [
    { label: 'Início', href: '/' },
    { label: 'Catálogo', href: '/catalogo' },
    { label: 'Eventos', href: '/#eventos' },
    { label: 'Como reservar', href: '/#como-reservar' },
    { label: 'Contactos', href: '#contactos' },
];

/** Site público e catálogo: tons quentes e sempre claros, com a cor ameixa da LemServ */
export default function SiteLayout({ titulo, children }: { titulo: string; children: ReactNode }) {
    const { loja, cliente, carrinho, pode, equipa } = useSite();
    const [menu, setMenu] = useState(false);
    const caminho = typeof window !== 'undefined' ? window.location.pathname : '';
    const nome = loja?.nome_comercial ?? 'LemServ';
    const whatsapp = linkWhatsApp(loja?.telemovel ?? loja?.telefone, 'Olá LemServ, gostaria de informações sobre aluguer.');

    useSempreClaro();

    const activo = (href: string) => (href === '/' ? caminho === '/' : href.startsWith('/') && !href.includes('#') && caminho.startsWith(href));

    return (
        <div className="site bg-background text-foreground flex min-h-svh flex-col">
            <Head title={titulo} />
            {equipa && !cliente && (
                <div className="bg-primary text-primary-foreground px-4 py-1.5 text-center text-[12.5px]">
                    Está a ver a loja como equipa ({equipa.nome}): vê os preços e a disponibilidade como um cliente.{' '}
                    <a href="/painel" className="font-medium underline underline-offset-2">
                        Voltar ao LemGest
                    </a>
                </div>
            )}
            <div className="hidden bg-[var(--tinta)] px-4 py-2 text-[12.5px] text-white/80 sm:block">
                <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                    <span>Entregamos, montamos e recolhemos em Maputo e Matola</span>
                    {whatsapp && (
                        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
                            <MessageCircle className="size-3.5" />
                            Fale connosco no WhatsApp
                        </a>
                    )}
                </div>
            </div>

            <header className="bg-background/90 sticky top-0 z-30 border-b backdrop-blur">
                <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
                    <Link href="/" className="flex items-center gap-3" aria-label={`${nome}, página inicial`}>
                        <img src={loja?.logotipo ?? '/img/lemservices-logo.png'} alt="" className="h-11 w-auto max-w-28 object-contain" />
                        <span className="flex flex-col leading-none">
                            <span className="font-titulo text-[20px] font-medium tracking-[-0.01em]">{nome}</span>
                            <span className="text-muted-foreground mt-1 text-[10.5px] tracking-[0.18em] uppercase">Lounge e Outdoor</span>
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-7 text-[14px] lg:flex" aria-label="Site">
                        {LIGACOES.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={cn(
                                    'hover:text-foreground transition-colors',
                                    activo(l.href) ? 'text-foreground font-medium' : 'text-muted-foreground',
                                )}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-1">
                        <Link href="/catalogo" className="hover:bg-muted rounded-full p-2.5" aria-label="Procurar no catálogo">
                            <Search className="size-[18px]" />
                        </Link>
                        <Link
                            href={cliente ? '/conta' : '/conta/entrar'}
                            className="hover:bg-muted rounded-full p-2.5"
                            aria-label={cliente ? 'A minha conta' : 'Entrar'}
                        >
                            <UserRound className="size-[18px]" />
                        </Link>
                        {cliente && pode('loja.reservar') && (
                            <Link
                                href="/catalogo/reserva"
                                className="hover:bg-muted relative rounded-full p-2.5"
                                aria-label={`A minha reserva, ${carrinho} peças`}
                            >
                                <ShoppingBag className="size-[18px]" />
                                {carrinho > 0 && (
                                    <span className="bg-primary text-primary-foreground absolute top-0.5 right-0.5 min-w-[18px] rounded-full px-1 text-center text-[10.5px] leading-[18px] font-semibold tabular-nums">
                                        {carrinho}
                                    </span>
                                )}
                            </Link>
                        )}
                        {!cliente && (
                            <Link
                                href="/conta/registar"
                                className="ml-2 hidden rounded-full bg-[var(--tinta)] px-4 py-2 text-[13px] font-medium text-white md:inline-block"
                            >
                                Criar conta
                            </Link>
                        )}
                        <button
                            type="button"
                            onClick={() => setMenu((m) => !m)}
                            className="hover:bg-muted rounded-full p-2.5 lg:hidden"
                            aria-label="Menu"
                            aria-expanded={menu}
                        >
                            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
                {menu && (
                    <nav className="border-t px-4 py-3 lg:hidden" aria-label="Site (telemóvel)">
                        {LIGACOES.map((l) => (
                            <Link key={l.href} href={l.href} onClick={() => setMenu(false)} className="block rounded-md px-2 py-2.5 text-[15px]">
                                {l.label}
                            </Link>
                        ))}
                        {!cliente && (
                            <Link
                                href="/conta/registar"
                                className="mt-2 block rounded-full bg-[var(--tinta)] px-4 py-2.5 text-center text-[14px] font-medium text-white"
                            >
                                Criar conta
                            </Link>
                        )}
                    </nav>
                )}
            </header>

            <main className="flex-1">{children}</main>

            <Rodape />
            <Notificacoes />
        </div>
    );
}

function Rodape() {
    const { loja, cliente } = useSite();
    const whatsapp = linkWhatsApp(loja?.telemovel ?? loja?.telefone, 'Olá LemServ, gostaria de informações sobre aluguer.');
    const telefones = [loja?.telefone, loja?.telemovel].filter(Boolean).join(' · ');
    const coluna = 'grid content-start gap-2.5 text-[14px] text-white/70';

    return (
        <footer id="contactos" className="mt-24 bg-[var(--tinta)] text-white">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.3fr] md:px-8">
                <div>
                    <p className="font-titulo text-[24px]">{loja?.nome_comercial ?? 'LemServ'}</p>
                    <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-white/70">
                        Mobiliário lounge, tendas e decoração para casamentos, aniversários e eventos de empresa. Fabrico próprio.
                    </p>
                </div>
                <div className={coluna}>
                    <p className="mb-1 text-[12px] tracking-[0.16em] text-white uppercase">Loja</p>
                    <Link href="/catalogo" className="hover:text-white">
                        Catálogo
                    </Link>
                    <Link href="/#eventos" className="hover:text-white">
                        Eventos
                    </Link>
                    <Link href="/#como-reservar" className="hover:text-white">
                        Como reservar
                    </Link>
                </div>
                <div className={coluna}>
                    <p className="mb-1 text-[12px] tracking-[0.16em] text-white uppercase">Conta</p>
                    {cliente ? (
                        <Link href="/conta" className="hover:text-white">
                            A minha conta
                        </Link>
                    ) : (
                        <>
                            <Link href="/conta/entrar" className="hover:text-white">
                                Entrar
                            </Link>
                            <Link href="/conta/registar" className="hover:text-white">
                                Criar conta
                            </Link>
                        </>
                    )}
                </div>
                <div className={coluna}>
                    <p className="mb-1 text-[12px] tracking-[0.16em] text-white uppercase">Contactos</p>
                    {telefones && (
                        <span className="flex items-center gap-2">
                            <Phone className="size-4" />
                            {telefones}
                        </span>
                    )}
                    {loja?.email && (
                        <a href={`mailto:${loja.email}`} className="flex items-center gap-2 hover:text-white">
                            <Mail className="size-4" />
                            {loja.email}
                        </a>
                    )}
                    {(loja?.morada || loja?.cidade) && (
                        <span className="flex items-center gap-2">
                            <MapPin className="size-4" />
                            {[loja?.morada, loja?.cidade].filter(Boolean).join(', ')}
                        </span>
                    )}
                    {whatsapp && (
                        <a
                            href={whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-[var(--tinta)]"
                        >
                            <MessageCircle className="size-4" />
                            Falar no WhatsApp
                        </a>
                    )}
                </div>
            </div>
            <p className="border-t border-white/10 py-5 text-center text-[12.5px] text-white/50">
                © {new Date().getFullYear()} {loja?.nome ?? 'LemServ'} · Matola, Moçambique
            </p>
        </footer>
    );
}
