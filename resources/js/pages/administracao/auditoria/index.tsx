import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { EstadoVazio } from '@/components/estado-vazio';
import { Paginacao } from '@/components/paginacao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { formatDataHora, formatRelativo } from '@/lib/format';
import { type BreadcrumbItem, type Paginado } from '@/types';
import { Head, router } from '@inertiajs/react';
import { ArrowRight, History, KeyRound, LogIn, Pencil, Plus, Power, ShieldCheck, Trash2, UserX, X, type LucideIcon } from 'lucide-react';

interface Registo {
    id: number;
    data: string;
    modulo: string;
    evento: string | null;
    descricao: string;
    utilizador: string;
    registo: string | null;
    alteracoes: { campo: string; antes: string; depois: string }[];
}

interface Filtros {
    utilizador?: string;
    modulo?: string;
    de?: string;
    ate?: string;
}

interface Props {
    registos: Paginado<Registo>;
    filtros: Filtros;
    utilizadores: { id: number; name: string }[];
    modulos: { valor: string; label: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administração', href: '/administracao/utilizadores' },
    { title: 'Auditoria', href: '/administracao/auditoria' },
];

const ICONES: Record<string, LucideIcon> = {
    login: LogIn,
    created: Plus,
    updated: Pencil,
    deleted: Trash2,
    activado: Power,
    desactivado: UserX,
    perfil: ShieldCheck,
    permissoes: KeyRound,
};

const TODOS = 'todos';

export default function AuditoriaIndex({ registos, filtros, utilizadores, modulos }: Props) {
    function filtrar(novos: Filtros) {
        const juntos = { ...filtros, ...novos };
        const limpos = Object.fromEntries(Object.entries(juntos).filter(([, v]) => v !== '' && v !== undefined && v !== TODOS));
        router.get(route('auditoria.index'), limpos, { preserveState: true, preserveScroll: true, replace: true });
    }

    const temFiltros = Boolean(filtros.utilizador || filtros.modulo || filtros.de || filtros.ate);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auditoria" />
            <div className="flex flex-1 flex-col gap-4">
                <CabecalhoPagina
                    titulo="Auditoria"
                    descricao="Tudo o que foi feito no sistema: quem, quando e o que mudou. Os registos não se podem alterar."
                    icone={History}
                />

                <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto] lg:items-end">
                    <div className="grid gap-1.5">
                        <Label className="text-muted-foreground text-xs">Utilizador</Label>
                        <Select value={filtros.utilizador ?? TODOS} onValueChange={(v) => filtrar({ utilizador: v })}>
                            <SelectTrigger aria-label="Filtrar por utilizador">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={TODOS}>Todos os utilizadores</SelectItem>
                                {utilizadores.map((u) => (
                                    <SelectItem key={u.id} value={String(u.id)}>
                                        {u.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-muted-foreground text-xs">Módulo</Label>
                        <Select value={filtros.modulo ?? TODOS} onValueChange={(v) => filtrar({ modulo: v })}>
                            <SelectTrigger aria-label="Filtrar por módulo">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={TODOS}>Todos os módulos</SelectItem>
                                {modulos.map((m) => (
                                    <SelectItem key={m.valor} value={m.valor}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="de" className="text-muted-foreground text-xs">
                            De
                        </Label>
                        <Input id="de" type="date" value={filtros.de ?? ''} onChange={(e) => filtrar({ de: e.target.value })} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="ate" className="text-muted-foreground text-xs">
                            Até
                        </Label>
                        <Input id="ate" type="date" value={filtros.ate ?? ''} onChange={(e) => filtrar({ ate: e.target.value })} />
                    </div>
                    {temFiltros ? (
                        <Button variant="ghost" onClick={() => router.get(route('auditoria.index'), {}, { preserveState: true, replace: true })}>
                            <X className="size-4" />
                            Limpar
                        </Button>
                    ) : (
                        <span className="hidden lg:block" />
                    )}
                </section>

                <section className="rounded-lg border">
                    {registos.data.length === 0 ? (
                        <EstadoVazio
                            icone={History}
                            titulo="Sem registos"
                            descricao={temFiltros ? 'Nada corresponde aos filtros escolhidos.' : undefined}
                        />
                    ) : (
                        <ol className="divide-y">
                            {registos.data.map((r) => {
                                const Icone = ICONES[r.evento ?? ''] ?? History;
                                return (
                                    <li key={r.id} className="flex gap-4 px-4 py-3.5 md:px-5">
                                        <div className="bg-secondary text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
                                            <Icone className="size-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                                                <p className="font-medium">
                                                    {r.descricao}
                                                    {r.registo && <span className="text-muted-foreground font-normal"> · {r.registo}</span>}
                                                </p>
                                                <time
                                                    className="text-muted-foreground shrink-0 text-xs"
                                                    dateTime={r.data}
                                                    title={formatDataHora(r.data)}
                                                >
                                                    {formatRelativo(r.data)}
                                                </time>
                                            </div>
                                            <p className="text-muted-foreground text-xs">
                                                por <span className="text-foreground font-medium">{r.utilizador}</span> · {r.modulo} ·{' '}
                                                {formatDataHora(r.data)}
                                            </p>
                                            {r.alteracoes.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {r.alteracoes.map((a) => (
                                                        <span
                                                            key={a.campo}
                                                            className="bg-muted inline-flex max-w-full flex-wrap items-center gap-1.5 rounded-md border px-2 py-0.5 text-[12.5px]"
                                                        >
                                                            <span className="font-medium">{a.campo}:</span>
                                                            <span className="text-muted-foreground line-through">{a.antes}</span>
                                                            <ArrowRight className="text-muted-foreground size-3" />
                                                            <span>{a.depois}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </section>

                <Paginacao pagina={registos} nome="registos" />
            </div>
        </AppLayout>
    );
}
