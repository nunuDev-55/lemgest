import { Notificacoes } from '@/components/notificacoes';
import { cn } from '@/lib/utils';
import { Head, Link, usePage } from '@inertiajs/react';
import { House, LayoutGrid, Mail, MapPin, Menu, MessageCircle, Phone, Search, ShoppingBag, UserRound, X } from 'lucide-react';
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
    /** Peças guardadas com o coração (♡) pelo cliente que entrou */
    favoritos: number[];
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
    { label: 'Catálogo', href: '/catalogo' },
    { label: 'Eventos', href: '/#eventos' },
    { label: 'Materiais', href: '/#materiais' },
    { label: 'Como reservar', href: '/#como-reservar' },
    { label: 'Perguntas', href: '/#perguntas' },
    { label: 'Contactos', href: '#contactos' },
];

/** Logótipo: a borboleta da LemServ e o nome em maiúsculas finas (um pouco mais pequeno no telemóvel, para caberem os ícones) */
export function Marca({ claro = false }: { claro?: boolean }) {
    const { loja } = useSite();
    return (
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5" aria-label={`${loja?.nome_comercial ?? 'LemServ'}, página inicial`}>
            <img src="/img/lemservices-marca.png" alt="" className="size-8 object-contain sm:size-9" />
            <span className="flex flex-col leading-none">
                <span
                    className={cn(
                        'font-titulo text-[19px] tracking-[0.12em] uppercase sm:text-[22px] sm:tracking-[0.14em]',
                        claro ? 'text-[var(--tinta)]' : 'text-[#efe6da]',
                    )}
                >
                    {loja?.nome_comercial ?? 'LemServ'}
                </span>
                <span
                    className={cn(
                        'mt-1 text-[8.5px] tracking-[0.2em] whitespace-nowrap uppercase sm:text-[9.5px] sm:tracking-[0.32em]',
                        claro ? 'text-[var(--muted-foreground)]' : 'text-[#a8998b]',
                    )}
                >
                    Lounge e Outdoor
                </span>
            </span>
        </Link>
    );
}

/** Site público e catálogo: cabeçalho e rodapé escuros (castanho e dourado); o conteúdo decide as suas secções */
export default function SiteLayout({ titulo, children }: { titulo: string; children: ReactNode }) {
    const { loja, cliente, carrinho, pode, equipa } = useSite();
    const [menu, setMenu] = useState(false);
    const caminho = typeof window !== 'undefined' ? window.location.pathname : '';
    const whatsapp = linkWhatsApp(loja?.telemovel ?? loja?.telefone, 'Olá LemServ, gostaria de informações sobre aluguer.');

    useSempreClaro();

    const activo = (href: string) => href.startsWith('/') && !href.includes('#') && caminho.startsWith(href);
    const icone = 'rounded-full p-2.5 text-[#efe6da]/85 transition-colors hover:bg-white/10 hover:text-white';

    return (
        <div className="site bg-background text-foreground flex min-h-svh flex-col">
            <Head title={titulo} />
            {equipa && !cliente && (
                <div className="bg-[var(--dourado)] px-4 py-1.5 text-center text-[12.5px] text-[var(--tinta)]">
                    <span className="sm:hidden">A ver a loja como equipa.</span>
                    <span className="hidden sm:inline">Está a ver a loja como equipa ({equipa.nome}): vê os preços como um cliente.</span>{' '}
                    <a href="/painel" className="font-medium underline underline-offset-2">
                        Voltar ao LemGest
                    </a>
                </div>
            )}

            <header className="escuro sticky top-0 z-30 border-b border-white/10">
                <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 md:px-8">
                    <Marca />

                    <nav className="hidden items-center gap-6 xl:flex" aria-label="Site">
                        {LIGACOES.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                className={cn(
                                    'maiusculas-pequenas whitespace-nowrap transition-colors hover:text-white',
                                    activo(l.href) ? 'text-[var(--dourado)]' : 'text-[#efe6da]/75',
                                )}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-0.5">
                        {/* No telemóvel, o catálogo, a conta e a reserva estão na barra de baixo */}
                        <Link href="/catalogo" className={cn(icone, 'hidden md:inline-flex')} aria-label="Procurar no catálogo">
                            <Search className="size-[18px]" strokeWidth={1.6} />
                        </Link>
                        <Link
                            href={cliente ? '/conta' : '/conta/entrar'}
                            className={cn(icone, 'hidden md:inline-flex')}
                            aria-label={cliente ? 'A minha conta' : 'Entrar'}
                        >
                            <UserRound className="size-[18px]" strokeWidth={1.6} />
                        </Link>
                        {cliente && pode('loja.reservar') && (
                            <Link
                                href="/catalogo/reserva"
                                className={cn(icone, 'relative hidden md:inline-flex')}
                                aria-label={`A minha reserva, ${carrinho} ${carrinho === 1 ? 'peça' : 'peças'}`}
                            >
                                <ShoppingBag className="size-[18px]" strokeWidth={1.6} />
                                {carrinho > 0 && (
                                    <span className="absolute top-0.5 right-0.5 min-w-[18px] rounded-full bg-[var(--dourado)] px-1 text-center text-[10.5px] leading-[18px] font-semibold text-[var(--tinta)] tabular-nums">
                                        {carrinho}
                                    </span>
                                )}
                            </Link>
                        )}
                        <Link
                            href={cliente ? '/catalogo' : '/conta/registar'}
                            className="maiusculas-pequenas ml-3 hidden rounded-[3px] bg-[var(--dourado)] px-4 py-2.5 font-medium whitespace-nowrap text-[var(--tinta)] transition-opacity hover:opacity-90 md:inline-block"
                        >
                            {cliente ? 'Ver o catálogo' : 'Criar conta'}
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMenu((m) => !m)}
                            className={cn(icone, 'xl:hidden')}
                            aria-label="Menu"
                            aria-expanded={menu}
                        >
                            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
                        </button>
                    </div>
                </div>
                {menu && (
                    <nav className="border-t border-white/10 px-4 py-3 xl:hidden" aria-label="Site (telemóvel)">
                        {LIGACOES.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                onClick={() => setMenu(false)}
                                className="maiusculas-pequenas block px-2 py-3 text-[#efe6da]/85"
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                )}
            </header>

            <main className="flex-1">{children}</main>

            {/* No telemóvel o rodapé acaba acima da barra de baixo */}
            <div className="pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
                <Rodape />
            </div>
            {whatsapp && (
                <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Falar com a LemServ no WhatsApp"
                    title="Falar no WhatsApp"
                    className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-40 flex size-13 items-center justify-center rounded-full bg-[#1f8f4e] text-white shadow-lg shadow-black/20 transition-transform hover:scale-105 md:right-6 md:bottom-6"
                >
                    <MessageCircle className="size-6" />
                </a>
            )}
            <BarraDeBaixo caminho={caminho} />
            <Notificacoes />
        </div>
    );
}

/** Telemóvel: Início, Catálogo, Reserva e Conta sempre à mão do polegar (como nas lojas online) */
function BarraDeBaixo({ caminho }: { caminho: string }) {
    const { cliente, carrinho, pode, equipa } = useSite();
    // A equipa vê a loja mas não reserva; um visitante que toque em Reserva vai entrar na conta
    const reserva = !(equipa && !cliente) && (!cliente || pode('loja.reservar'));
    const itens = [
        { label: 'Início', href: '/', icone: House, activo: caminho === '/' },
        { label: 'Catálogo', href: '/catalogo', icone: LayoutGrid, activo: caminho === '/catalogo' || /^\/catalogo\/\d+/.test(caminho) },
        ...(reserva ? [{ label: 'Reserva', href: '/catalogo/reserva', icone: ShoppingBag, activo: caminho.startsWith('/catalogo/reserva') }] : []),
        { label: cliente ? 'Conta' : 'Entrar', href: cliente ? '/conta' : '/conta/entrar', icone: UserRound, activo: caminho.startsWith('/conta') },
    ];

    return (
        <nav
            aria-label="Navegação principal"
            className="fixed inset-x-0 bottom-0 z-40 border-t bg-[var(--card)]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_rgb(0_0_0/0.06)] backdrop-blur md:hidden"
        >
            <ul className="mx-auto flex h-16 max-w-md items-stretch">
                {itens.map((i) => (
                    <li key={i.href} className="flex-1">
                        <Link
                            href={i.href}
                            aria-current={i.activo ? 'page' : undefined}
                            className={cn(
                                'relative flex h-full flex-col items-center justify-center gap-1 text-[11px] transition-colors',
                                i.activo ? 'font-medium text-[var(--tinta)]' : 'text-[#7a6c60]',
                            )}
                        >
                            <span className="relative">
                                <i.icone className="size-[22px]" strokeWidth={i.activo ? 2 : 1.6} />
                                {i.href === '/catalogo/reserva' && carrinho > 0 && (
                                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] rounded-full bg-[var(--dourado)] px-1 text-center text-[10.5px] leading-[18px] font-semibold text-[var(--tinta)] tabular-nums">
                                        {carrinho}
                                    </span>
                                )}
                            </span>
                            {i.label}
                            {i.activo && <span className="absolute top-0 h-[2px] w-8 rounded-full bg-[var(--dourado)]" aria-hidden="true" />}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

function Rodape() {
    const { loja, cliente } = useSite();
    const whatsapp = linkWhatsApp(loja?.telemovel ?? loja?.telefone, 'Olá LemServ, gostaria de informações sobre aluguer.');
    const telefones = [loja?.telefone, loja?.telemovel].filter(Boolean).join(' · ');
    const coluna = 'grid content-start gap-3 text-[14px] text-[#efe6da]/70';
    const titulo = 'maiusculas-pequenas mb-1 text-[var(--dourado)]';

    return (
        <footer id="contactos" className="escuro mt-24">
            <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1.5fr_1fr_1fr_1.4fr] md:px-8">
                <div>
                    <Marca />
                    <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-[#efe6da]/65">
                        Mobiliário lounge, tendas e decoração para casamentos, aniversários e eventos de empresa. Fabrico próprio, em Maputo e Matola.
                    </p>
                </div>
                <div className={coluna}>
                    <p className={titulo}>Loja</p>
                    <Link href="/catalogo" className="hover:text-white">
                        Catálogo
                    </Link>
                    <Link href="/#eventos" className="hover:text-white">
                        Eventos
                    </Link>
                    <Link href="/#materiais" className="hover:text-white">
                        Materiais
                    </Link>
                    <Link href="/#como-reservar" className="hover:text-white">
                        Como reservar
                    </Link>
                </div>
                <div className={coluna}>
                    <p className={titulo}>Conta</p>
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
                    <Link href="/#perguntas" className="hover:text-white">
                        Perguntas frequentes
                    </Link>
                </div>
                <div className={coluna}>
                    <p className={titulo}>Contactos</p>
                    {telefones && (
                        <span className="flex items-center gap-2.5">
                            <Phone className="size-4 text-[var(--dourado)]" strokeWidth={1.6} />
                            {telefones}
                        </span>
                    )}
                    {loja?.email && (
                        <a href={`mailto:${loja.email}`} className="flex items-center gap-2.5 hover:text-white">
                            <Mail className="size-4 text-[var(--dourado)]" strokeWidth={1.6} />
                            {loja.email}
                        </a>
                    )}
                    {(loja?.morada || loja?.cidade) && (
                        <span className="flex items-center gap-2.5">
                            <MapPin className="size-4 text-[var(--dourado)]" strokeWidth={1.6} />
                            {[loja?.morada, loja?.cidade].filter(Boolean).join(', ')}
                        </span>
                    )}
                    {whatsapp && (
                        <a
                            href={whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="maiusculas-pequenas mt-2 inline-flex w-fit items-center gap-2 rounded-[3px] border border-[var(--dourado)]/60 px-4 py-2.5 text-[var(--dourado)] hover:bg-[var(--dourado)] hover:text-[var(--tinta)]"
                        >
                            <MessageCircle className="size-4" />
                            Falar no WhatsApp
                        </a>
                    )}
                </div>
            </div>
            <p className="maiusculas-pequenas border-t border-white/10 py-6 text-center text-[10.5px] text-[#efe6da]/40">
                © {new Date().getFullYear()} {loja?.nome ?? 'LemServ'} · Matola, Moçambique
            </p>
        </footer>
    );
}
