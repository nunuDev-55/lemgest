import { Notificacoes } from '@/components/notificacoes';
import { cn } from '@/lib/utils';
import { Head, Link, usePage } from '@inertiajs/react';
import { Mail, MapPin, MessageCircle, Phone, ShoppingBag, UserRound } from 'lucide-react';
import { type ReactNode } from 'react';

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
    [key: string]: unknown;
}

/** "+258 84 122 1986" → "https://wa.me/258841221986" */
export function linkWhatsApp(numero: string | null | undefined, texto?: string): string | null {
    const digitos = (numero ?? '').replace(/\D/g, '');
    if (digitos.length < 9) return null;
    const completo = digitos.length === 9 ? `258${digitos}` : digitos;
    return `https://wa.me/${completo}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

export function useSite() {
    const props = usePage<DadosSite>().props;
    const pode = (permissao: string) => (props.cliente?.permissoes ?? []).includes(permissao);
    return { ...props, pode };
}

/** Site público e catálogo: cabeçalho com a marca, o catálogo e a conta; rodapé com os contactos */
export default function SiteLayout({ titulo, children, largo }: { titulo: string; children: ReactNode; largo?: boolean }) {
    const { loja, cliente, carrinho, pode } = useSite();
    const caminho = typeof window !== 'undefined' ? window.location.pathname : '';
    const nome = loja?.nome_comercial ?? 'LemServ';

    return (
        <div className="bg-background text-foreground flex min-h-svh flex-col">
            <Head title={titulo} />
            <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
                    <Link href="/" className="flex items-center gap-3" aria-label={`${nome}, página inicial`}>
                        <img src={loja?.logotipo ?? '/img/lemservices-logo.png'} alt="" className="h-9 w-auto max-w-24 object-contain" />
                        <span className="hidden flex-col leading-tight sm:flex">
                            <span className="text-[15px] font-semibold">{nome}</span>
                            <span className="text-muted-foreground text-[12px]">Lounge e Outdoor</span>
                        </span>
                    </Link>
                    <nav className="flex items-center gap-1 text-[13.5px]" aria-label="Site">
                        <Link
                            href="/catalogo"
                            className={cn(
                                'rounded-md px-2.5 py-1.5',
                                caminho.startsWith('/catalogo') && !caminho.startsWith('/catalogo/reserva')
                                    ? 'text-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Catálogo
                        </Link>
                        <a href="/#contactos" className="text-muted-foreground hover:text-foreground hidden rounded-md px-2.5 py-1.5 sm:inline">
                            Contactos
                        </a>
                        {cliente ? (
                            <>
                                {pode('loja.reservar') && (
                                    <Link
                                        href="/catalogo/reserva"
                                        className="hover:bg-muted relative inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5"
                                        aria-label={`A minha reserva, ${carrinho} peças`}
                                    >
                                        <ShoppingBag className="size-4" />
                                        <span className="hidden sm:inline">Reserva</span>
                                        {carrinho > 0 && (
                                            <span className="bg-primary text-primary-foreground min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-medium tabular-nums">
                                                {carrinho}
                                            </span>
                                        )}
                                    </Link>
                                )}
                                <Link href="/conta" className="hover:bg-muted inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5">
                                    <UserRound className="size-4" />
                                    <span className="hidden sm:inline">{cliente.nome.split(' ')[0]}</span>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/conta/entrar" className="text-muted-foreground hover:text-foreground rounded-md px-2.5 py-1.5">
                                    Entrar
                                </Link>
                                <Link href="/conta/registar" className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 font-medium">
                                    Criar conta
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            <main className={cn('mx-auto w-full flex-1 px-4 md:px-6', largo ? 'max-w-6xl' : 'max-w-5xl')}>{children}</main>

            <Rodape />
            <Notificacoes />
        </div>
    );
}

function Rodape() {
    const { loja } = useSite();
    const whatsapp = linkWhatsApp(loja?.telemovel ?? loja?.telefone, 'Olá LemServ, gostaria de informações sobre aluguer.');
    const telefones = [loja?.telefone, loja?.telemovel].filter(Boolean).join(' · ');

    return (
        <footer id="contactos" className="bg-muted/40 mt-16 border-t">
            <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-[13.5px] md:grid-cols-3 md:px-6">
                <div>
                    <p className="text-[15px] font-semibold">{loja?.nome_comercial ?? 'LemServ'}</p>
                    <p className="text-muted-foreground mt-1">Aluguer de mobiliário lounge, tendas e decoração para eventos.</p>
                </div>
                <ul className="grid gap-2">
                    {telefones && (
                        <li className="flex items-center gap-2">
                            <Phone className="text-muted-foreground size-4" />
                            {telefones}
                        </li>
                    )}
                    {loja?.email && (
                        <li className="flex items-center gap-2">
                            <Mail className="text-muted-foreground size-4" />
                            <a href={`mailto:${loja.email}`} className="hover:underline">
                                {loja.email}
                            </a>
                        </li>
                    )}
                    {(loja?.morada || loja?.cidade) && (
                        <li className="flex items-center gap-2">
                            <MapPin className="text-muted-foreground size-4" />
                            {[loja?.morada, loja?.cidade].filter(Boolean).join(', ')}
                        </li>
                    )}
                </ul>
                <div className="md:text-right">
                    {whatsapp && (
                        <a
                            href={whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:bg-background inline-flex items-center gap-2 rounded-md border px-3 py-2 font-medium"
                        >
                            <MessageCircle className="size-4" />
                            Falar no WhatsApp
                        </a>
                    )}
                </div>
            </div>
            <p className="text-muted-foreground border-t py-4 text-center text-[12px]">
                © {new Date().getFullYear()} {loja?.nome ?? 'LemServ'} · Matola, Moçambique
            </p>
        </footer>
    );
}
