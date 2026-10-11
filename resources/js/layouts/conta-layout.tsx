import { Notificacoes } from '@/components/notificacoes';
import { cn } from '@/lib/utils';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import { type ReactNode } from 'react';

/** Dados públicos da LemServ e quem entrou, partilhados nas páginas /conta */
export interface DadosConta {
    cliente: { id: number; nome: string; email: string } | null;
    loja: {
        nome: string;
        nome_comercial: string | null;
        telemovel: string | null;
        telefone: string | null;
        email: string | null;
        logotipo: string;
    } | null;
    [key: string]: unknown;
}

function Marca() {
    const { loja } = usePage<DadosConta>().props;
    return (
        <Link href="/conta" className="flex items-center gap-3" aria-label="LemServ, área do cliente">
            <img src={loja?.logotipo ?? '/img/lemservices-logo.png'} alt="" className="h-9 w-auto max-w-24 object-contain" />
            <span className="flex flex-col leading-tight">
                <span className="text-[15px] font-semibold">{loja?.nome_comercial ?? 'LemServ'}</span>
                <span className="text-muted-foreground text-[12px]">Lounge e Outdoor</span>
            </span>
        </Link>
    );
}

function Contactos() {
    const { loja } = usePage<DadosConta>().props;
    const telefone = loja?.telemovel ?? loja?.telefone;
    return (
        <p className="text-muted-foreground text-center text-[12.5px]">
            {[loja?.nome_comercial ?? 'LemServ', 'Matola, Moçambique', telefone, loja?.email].filter(Boolean).join(' · ')}
        </p>
    );
}

/** Entrar, registar e recuperar a senha: um cartão ao centro */
export function ContaEntradaLayout({
    titulo,
    descricao,
    children,
    largo,
}: {
    titulo: string;
    descricao?: ReactNode;
    children: ReactNode;
    largo?: boolean;
}) {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center px-4 py-10">
            <Head title={titulo} />
            <div className={cn('w-full', largo ? 'max-w-[560px]' : 'max-w-[400px]')}>
                <div className="mb-7 flex flex-col items-center gap-5 text-center">
                    <Marca />
                    <div className="flex flex-col gap-1.5">
                        <h1 className="text-[22px] font-semibold tracking-[-0.015em]">{titulo}</h1>
                        {descricao && <p className="text-muted-foreground text-[14px]">{descricao}</p>}
                    </div>
                </div>
                <div className="bg-card rounded-lg border p-6">{children}</div>
                <div className="mt-6">
                    <Contactos />
                </div>
            </div>
            <Notificacoes />
        </div>
    );
}

const MENU = [
    { label: 'Início', href: '/conta', exacto: true },
    { label: 'Reservas', href: '/conta/reservas' },
    { label: 'Facturas', href: '/conta/facturas' },
    { label: 'Os meus dados', href: '/conta/dados' },
];

/** Área do cliente: cabeçalho com a marca e o menu; o conteúdo numa coluna central */
export default function ContaLayout({ titulo, children }: { titulo: string; children: ReactNode }) {
    const { cliente } = usePage<DadosConta>().props;
    const caminho = typeof window !== 'undefined' ? window.location.pathname : '';
    const activo = (href: string, exacto?: boolean) => (exacto ? caminho === href : caminho === href || caminho.startsWith(`${href}/`));

    return (
        <div className="bg-background flex min-h-svh flex-col">
            <Head title={titulo} />
            <header className="bg-background/95 sticky top-0 z-30 border-b backdrop-blur">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 md:px-6">
                    <Marca />
                    <div className="flex items-center gap-3">
                        <span className="text-muted-foreground hidden text-[13px] sm:inline">{cliente?.nome}</span>
                        <button
                            type="button"
                            onClick={() => router.post('/conta/sair')}
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px]"
                        >
                            <LogOut className="size-4" />
                            Sair
                        </button>
                    </div>
                </div>
                <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 md:px-5" aria-label="Área do cliente">
                    {MENU.map((m) => (
                        <Link
                            key={m.href}
                            href={m.href}
                            className={cn(
                                '-mb-px border-b-2 px-2.5 pt-1 pb-2.5 text-[13.5px] whitespace-nowrap',
                                activo(m.href, m.exacto)
                                    ? 'border-foreground text-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground border-transparent',
                            )}
                        >
                            {m.label}
                        </Link>
                    ))}
                </nav>
            </header>
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-7 md:px-6">{children}</main>
            <footer className="border-t py-5">
                <Contactos />
            </footer>
            <Notificacoes />
        </div>
    );
}
