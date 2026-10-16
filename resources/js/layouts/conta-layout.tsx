import { Notificacoes } from '@/components/notificacoes';
import { useFotosSite } from '@/components/site';
import { cn } from '@/lib/utils';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, LogOut } from 'lucide-react';
import { type ReactNode } from 'react';
import SiteLayout, { Marca, useSempreClaro, type DadosSite } from './site-layout';

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
    // Foto de fundo: uma das fotos da capa do site (Administração → Site e galeria)
    const capas = useFotosSite().capa;
    const foto = capas[1] ?? capas[0] ?? null;

    return (
        <div className="site relative flex min-h-screen flex-col overflow-hidden bg-[var(--tinta)]">
            <Head title={`${titulo} · LemServ`} />
            {/* A foto ocupa o ecrã todo; o formulário fica num cartão por cima */}
            {foto && <img src={foto.grande} alt="" className="absolute inset-0 size-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--tinta)]/75 via-[var(--tinta)]/45 to-[var(--tinta)]/85" />

            <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 md:px-8">
                <Marca />
                <Link href="/" className="maiusculas-pequenas inline-flex items-center gap-1.5 text-[#efe6da]/80 hover:text-white">
                    <ChevronLeft className="size-3.5" />
                    Voltar ao site
                </Link>
            </div>

            <div className="relative flex flex-1 items-center justify-center px-4 py-8">
                <div
                    className={cn(
                        'bg-background text-foreground w-full rounded-[6px] p-5 shadow-2xl shadow-black/40 sm:p-9',
                        largo ? 'max-w-[600px]' : 'max-w-[440px]',
                    )}
                >
                    <h1 className="font-titulo text-[36px] leading-[1.05] font-medium tracking-[-0.01em]">{titulo}</h1>
                    {descricao && <p className="text-muted-foreground mt-2 text-[14.5px] leading-relaxed">{descricao}</p>}
                    <div className="mt-7">{children}</div>
                </div>
            </div>

            <p className="relative px-5 pb-6 text-center text-[12.5px] text-[#efe6da]/60">
                {[nome, 'Matola, Moçambique', telefone, loja?.email].filter(Boolean).join(' · ')}
            </p>
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
                {/* A linha de baixo é uma sombra interior: o separador activo tapa-a sem sair da barra (assim o Windows não mostra setas de deslocamento) */}
                <nav
                    className="mt-4 flex gap-1 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    aria-label="Área do cliente"
                >
                    {MENU.filter((m) => pode(m.permissao)).map((m) => (
                        <Link
                            key={m.href}
                            href={m.href}
                            className={cn(
                                'border-b-2 px-3 pt-1 pb-3 text-[14px] whitespace-nowrap',
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
