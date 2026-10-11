import AppLogoIcon from '@/components/app-logo-icon';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Notificacoes } from '@/components/notificacoes';
import { PesquisaRapida } from '@/components/pesquisa-rapida';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { usePode } from '@/hooks/use-pode';
import { itemActivo, NAVEGACAO, subItemActivo } from '@/lib/navegacao';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronsUpDown, ExternalLink, Menu, Search, Store } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
    /** Mantido por compatibilidade com as páginas antigas; o título da página já indica onde se está. */
    breadcrumbs?: BreadcrumbItem[];
}

/**
 * Esqueleto de todas as páginas autenticadas: menu lateral à esquerda (no telemóvel, numa gaveta),
 * barra fina no topo com a pesquisa rápida (Ctrl+K) e o conteúdo.
 */
export default function AppLayout({ children }: Props) {
    const [pesquisa, setPesquisa] = useState(false);

    useEffect(() => {
        const atalho = (e: globalThis.KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setPesquisa((v) => !v);
            }
        };
        window.addEventListener('keydown', atalho);
        return () => window.removeEventListener('keydown', atalho);
    }, []);

    return (
        <div className="flex min-h-svh">
            <aside className="bg-sidebar sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r lg:flex print:hidden">
                <MenuLateral />
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
                <header className="bg-background/95 sticky top-0 z-30 flex h-14 items-center gap-2 border-b px-3 backdrop-blur md:px-6 print:hidden">
                    <Sheet>
                        <SheetTrigger
                            className="hover:bg-accent flex size-9 items-center justify-center rounded-md lg:hidden"
                            aria-label="Abrir menu"
                        >
                            <Menu className="size-5" />
                        </SheetTrigger>
                        <SheetContent side="left" className="bg-sidebar flex w-72 flex-col p-0">
                            <SheetTitle className="sr-only">Menu</SheetTitle>
                            <MenuLateral />
                        </SheetContent>
                    </Sheet>
                    <button
                        type="button"
                        onClick={() => setPesquisa(true)}
                        className="text-muted-foreground hover:bg-muted flex h-9 w-full max-w-72 items-center gap-2 rounded-md border px-2.5 text-[13px]"
                    >
                        <Search className="size-4" aria-hidden="true" />
                        <span className="flex-1 text-left">Ir para…</span>
                        <kbd className="hidden rounded border px-1.5 font-mono text-[11px] sm:inline">Ctrl K</kbd>
                    </button>
                    <div className="ml-auto">
                        <AppearanceToggleDropdown />
                    </div>
                </header>
                <main className="mx-auto w-full max-w-[1400px] min-w-0 flex-1 px-4 py-6 md:px-8 md:py-7 print:max-w-none print:p-0">{children}</main>
            </div>
            <PesquisaRapida aberta={pesquisa} onMudar={setPesquisa} />
            <Notificacoes />
        </div>
    );
}

function MenuLateral() {
    const { url, props } = usePage<SharedData>();
    const pode = usePode();
    const iniciais = useInitials();
    const caminho = url.split('?')[0];
    const activo = itemActivo(caminho);
    const subActivo = activo ? subItemActivo(activo, caminho) : null;

    return (
        <>
            <Link href="/painel" className="flex h-14 shrink-0 items-center gap-2.5 px-4" aria-label="LemGest — visão geral">
                <AppLogoIcon className="size-7" />
                <span className="flex flex-col leading-tight">
                    <span className="text-[14px] font-semibold">LemServ</span>
                    <span className="text-muted-foreground text-[12px]">LemGest</span>
                </span>
            </Link>

            <nav className="flex-1 overflow-y-auto px-2.5 pb-4" aria-label="Menu principal">
                {NAVEGACAO.map((grupo, g) => {
                    const itens = grupo.itens.filter((i) => pode(i.permissao));
                    if (itens.length === 0) return null;
                    return (
                        <div key={grupo.titulo ?? g} className={cn(g > 0 && 'mt-5')}>
                            {grupo.titulo && <p className="text-muted-foreground px-2 pb-1.5 text-[12px] font-medium">{grupo.titulo}</p>}
                            <ul className="flex flex-col gap-px">
                                {itens.map((item) => {
                                    const eActivo = activo?.href === item.href;
                                    const subitens = (item.subitens ?? []).filter((s) => pode(s.permissao));
                                    return (
                                        <li key={item.href}>
                                            <Link
                                                href={item.href}
                                                className={cn(
                                                    'flex h-8 items-center gap-2.5 rounded-md px-2 text-[13.5px] transition-colors',
                                                    eActivo
                                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                                        : 'text-sidebar-foreground hover:bg-sidebar-accent/70',
                                                )}
                                                aria-current={eActivo && !subActivo ? 'page' : undefined}
                                            >
                                                <item.icone className={cn('size-4', eActivo ? 'text-foreground' : 'text-muted-foreground')} />
                                                {item.label}
                                            </Link>
                                            {eActivo && subitens.length > 0 && (
                                                <ul className="mt-px mb-1 ml-[17px] flex flex-col gap-px border-l pl-2.5">
                                                    {subitens.map((s) => (
                                                        <li key={s.href}>
                                                            <Link
                                                                href={s.href}
                                                                className={cn(
                                                                    'flex h-7 items-center rounded-md px-2 text-[13px]',
                                                                    subActivo === s.href
                                                                        ? 'text-foreground font-medium'
                                                                        : 'text-muted-foreground hover:text-foreground',
                                                                )}
                                                                aria-current={subActivo === s.href ? 'page' : undefined}
                                                            >
                                                                {s.label}
                                                            </Link>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                })}
            </nav>

            <div className="shrink-0 border-t p-2.5">
                {pode('loja.ver') && (
                    <a
                        href="/catalogo"
                        target="_blank"
                        rel="noopener"
                        className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent mb-1 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px]"
                        title="Abre o site e o catálogo noutro separador, com os preços como um cliente os vê"
                    >
                        <Store className="size-4" />
                        Ver a loja
                        <ExternalLink className="ml-auto size-3.5 opacity-60" />
                    </a>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger className="hover:bg-sidebar-accent flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left">
                        <span className="bg-sidebar-accent text-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold">
                            {iniciais(props.auth.user.name)}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col leading-tight">
                            <span className="truncate text-[13px] font-medium">{props.auth.user.name}</span>
                            <span className="text-muted-foreground truncate text-[12px]">{props.auth.user.email}</span>
                        </span>
                        <ChevronsUpDown className="text-muted-foreground size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-60">
                        <UserMenuContent user={props.auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    );
}
