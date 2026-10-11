import { Notificacoes } from '@/components/notificacoes';
import { useFotosSite } from '@/components/site';
import { cn } from '@/lib/utils';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, LogOut } from 'lucide-react';
import { type ReactNode } from 'react';
import SiteLayout, { useSempreClaro, type DadosSite } from './site-layout';

/** Dados públicos da LemServ e quem entrou, partilhados nas páginas /conta (os mesmos do site) */
export type DadosConta = DadosSite;

/** Entrar, registar e recuperar a senha: formulário à esquerda e uma foto de evento à direita */
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
    useSempreClaro();
    const { loja } = usePage<DadosConta>().props;
    const nome = loja?.nome_comercial ?? 'LemServ';
    const telefone = loja?.telemovel ?? loja?.telefone;
    // Foto ao lado dos formulários: a primeira da capa do site
    const foto = useFotosSite().capa[0] ?? null;

    return (
        <div className="site bg-background text-foreground grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
            <Head title={`${titulo} · LemServ`} />
            <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3" aria-label={`${nome}, página inicial`}>
                        <img src={loja?.logotipo ?? '/img/lemservices-logo.png'} alt="" className="h-10 w-auto max-w-24 object-contain" />
                        <span className="font-titulo text-[19px]">{nome}</span>
                    </Link>
                    <Link href="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[13px]">
                        <ChevronLeft className="size-3.5" />
                        Voltar ao site
                    </Link>
                </div>

                <div className={cn('mx-auto flex w-full flex-1 flex-col justify-center py-10', largo ? 'max-w-[560px]' : 'max-w-[400px]')}>
                    <h1 className="font-titulo text-[34px] leading-[1.1] tracking-[-0.015em]">{titulo}</h1>
                    {descricao && <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">{descricao}</p>}
                    <div className="mt-8">{children}</div>
                </div>

                <p className="text-muted-foreground text-[12.5px]">
                    {[nome, 'Matola, Moçambique', telefone, loja?.email].filter(Boolean).join(' · ')}
                </p>
            </div>

            <div className="relative hidden p-4 lg:block">
                <div className="relative h-full overflow-hidden rounded-[28px]">
                    {foto && <img src={foto.grande} alt={foto.legenda} className="absolute inset-0 size-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <div className="absolute inset-x-10 bottom-10 text-white">
                        <p className="font-titulo text-[34px] leading-[1.1]">Do primeiro sofá à última almofada.</p>
                        <p className="mt-3 max-w-md text-[15px] text-white/80">
                            Veja os preços, a disponibilidade nas suas datas e peça a reserva online. Nós tratamos do resto.
                        </p>
                    </div>
                </div>
            </div>
            <Notificacoes />
        </div>
    );
}

/** Cada entrada só aparece se o perfil Cliente der a permissão (a protecção verdadeira está nas rotas) */
const MENU: { label: string; href: string; exacto?: boolean; permissao?: string }[] = [
    { label: 'Início', href: '/conta', exacto: true },
    { label: 'Reservas', href: '/conta/reservas', permissao: 'conta.reservas' },
    { label: 'Facturas e recibos', href: '/conta/facturas', permissao: 'conta.documentos' },
    { label: 'Os meus dados', href: '/conta/dados' },
];

export function useClientePode() {
    const { cliente } = usePage<DadosConta>().props;
    return (permissao?: string) => !permissao || (cliente?.permissoes ?? []).includes(permissao);
}

/** Área do cliente: dentro do site (mesmo cabeçalho e rodapé), com os separadores da conta */
export default function ContaLayout({ titulo, children }: { titulo: string; children: ReactNode }) {
    const { cliente } = usePage<DadosConta>().props;
    const pode = useClientePode();
    const caminho = typeof window !== 'undefined' ? window.location.pathname : '';
    const activo = (href: string, exacto?: boolean) => (exacto ? caminho === href : caminho === href || caminho.startsWith(`${href}/`));

    return (
        <SiteLayout titulo={`${titulo} · LemServ`}>
            <div className="mx-auto w-full max-w-5xl px-4 pt-10 md:px-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <p className="text-primary text-[12px] font-medium tracking-[0.16em] uppercase">A minha conta</p>
                        <p className="text-muted-foreground mt-1 text-[13.5px]">{cliente?.nome}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.post('/conta/sair')}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px]"
                    >
                        <LogOut className="size-4" />
                        Sair
                    </button>
                </div>
                <nav className="mt-4 flex gap-1 overflow-x-auto border-b" aria-label="Área do cliente">
                    {MENU.filter((m) => pode(m.permissao)).map((m) => (
                        <Link
                            key={m.href}
                            href={m.href}
                            className={cn(
                                '-mb-px border-b-2 px-3 pt-1 pb-3 text-[14px] whitespace-nowrap',
                                activo(m.href, m.exacto)
                                    ? 'border-[var(--tinta)] font-medium text-[var(--tinta)]'
                                    : 'text-muted-foreground hover:text-foreground border-transparent',
                            )}
                        >
                            {m.label}
                        </Link>
                    ))}
                </nav>
                <div className="py-8">{children}</div>
            </div>
        </SiteLayout>
    );
}
