import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { Confirmar } from '@/components/confirmar';
import { Estado } from '@/components/erp';
import { EstadoVazio } from '@/components/estado-vazio';
import { Paginacao } from '@/components/paginacao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInitials } from '@/hooks/use-initials';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatRelativo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type Paginado, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Pencil, Power, Search, UserPlus, Users, UserX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FormularioUtilizador } from './formulario-utilizador';

export interface Utilizador {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    active: boolean;
    perfil: string | null;
    last_login_at: string | null;
}

interface Filtros {
    pesquisa?: string;
    perfil?: string;
    estado?: string;
}

interface Props {
    utilizadores: Paginado<Utilizador>;
    filtros: Filtros;
    perfis: string[];
    resumo: { total: number; activos: number; inactivos: number };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administração', href: '/administracao/utilizadores' },
    { title: 'Utilizadores', href: '/administracao/utilizadores' },
];

const TODOS = 'todos';

export default function UtilizadoresIndex({ utilizadores, filtros, perfis, resumo }: Props) {
    const pode = usePode();
    const iniciais = useInitials();
    const { auth } = usePage<SharedData>().props;

    const [pesquisa, setPesquisa] = useState(filtros.pesquisa ?? '');
    const [formAberto, setFormAberto] = useState(false);
    const [aEditar, setAEditar] = useState<Utilizador | null>(null);
    const [aAlternar, setAAlternar] = useState<Utilizador | null>(null);
    const [aProcessar, setAProcessar] = useState(false);
    const primeiraVez = useRef(true);

    function filtrar(novos: Filtros) {
        const juntos = { ...filtros, pesquisa, ...novos };
        const limpos = Object.fromEntries(Object.entries(juntos).filter(([, v]) => v !== '' && v !== undefined && v !== TODOS));
        router.get(route('utilizadores.index'), limpos, { preserveState: true, preserveScroll: true, replace: true });
    }

    // Pesquisa enquanto escreve (espera 350 ms depois da última tecla)
    useEffect(() => {
        if (primeiraVez.current) {
            primeiraVez.current = false;
            return;
        }
        const t = setTimeout(() => filtrar({ pesquisa }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pesquisa]);

    function abrirNovo() {
        setAEditar(null);
        setFormAberto(true);
    }

    function abrirEditar(u: Utilizador) {
        setAEditar(u);
        setFormAberto(true);
    }

    function alternarEstado() {
        if (!aAlternar) return;
        setAProcessar(true);
        router.post(
            route('utilizadores.estado', aAlternar.id),
            {},
            {
                preserveScroll: true,
                onError: (erros) => toast.error(erros.estado ?? 'Não foi possível alterar o estado.'),
                onFinish: () => {
                    setAProcessar(false);
                    setAAlternar(null);
                },
            },
        );
    }

    const temFiltros = Boolean(filtros.pesquisa || filtros.perfil || filtros.estado);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Utilizadores" />
            <div className="flex flex-1 flex-col gap-4">
                <CabecalhoPagina
                    titulo="Utilizadores"
                    descricao={`${resumo.total} no total · ${resumo.activos} ${resumo.activos === 1 ? 'activo' : 'activos'} · ${resumo.inactivos} ${resumo.inactivos === 1 ? 'inactivo' : 'inactivos'}`}
                    icone={Users}
                    accoes={
                        pode('utilizadores.gerir') && (
                            <Button size="sm" onClick={abrirNovo}>
                                <UserPlus className="size-4" />
                                Novo utilizador
                            </Button>
                        )
                    }
                />

                <section className="flex flex-col gap-2 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            value={pesquisa}
                            onChange={(e) => setPesquisa(e.target.value)}
                            placeholder="Pesquisar por nome, e-mail ou telefone"
                            className="pl-9"
                            aria-label="Pesquisar utilizadores"
                        />
                    </div>
                    <Select value={filtros.perfil ?? TODOS} onValueChange={(v) => filtrar({ perfil: v })}>
                        <SelectTrigger className="md:w-52" aria-label="Filtrar por perfil">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={TODOS}>Todos os perfis</SelectItem>
                            {perfis.map((p) => (
                                <SelectItem key={p} value={p}>
                                    {p}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filtros.estado ?? TODOS} onValueChange={(v) => filtrar({ estado: v })}>
                        <SelectTrigger className="md:w-40" aria-label="Filtrar por estado">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={TODOS}>Todos</SelectItem>
                            <SelectItem value="activos">Activos</SelectItem>
                            <SelectItem value="inactivos">Inactivos</SelectItem>
                        </SelectContent>
                    </Select>
                    {temFiltros && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setPesquisa('');
                                router.get(route('utilizadores.index'), {}, { preserveState: true, replace: true });
                            }}
                        >
                            <X className="size-4" />
                            Limpar
                        </Button>
                    )}
                </section>

                <section className="overflow-hidden rounded-lg border">
                    {utilizadores.data.length === 0 ? (
                        <EstadoVazio
                            icone={temFiltros ? Search : Users}
                            titulo={temFiltros ? 'Nenhum utilizador encontrado' : 'Ainda não há utilizadores'}
                            descricao={temFiltros ? 'Experimente outra pesquisa ou limpe os filtros.' : undefined}
                        />
                    ) : (
                        <>
                            {/* Computador: tabela */}
                            <table className="tabela hidden md:table">
                                <thead>
                                    <tr>
                                        <th>Utilizador</th>
                                        <th>Telefone</th>
                                        <th>Perfil</th>
                                        <th>Estado</th>
                                        <th>Último acesso</th>
                                        <th>
                                            <span className="sr-only">Acções</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {utilizadores.data.map((u) => (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <Avatar nome={u.name} iniciais={iniciais(u.name)} activo={u.active} />
                                                    <div className="min-w-0">
                                                        <p className="truncate font-medium">
                                                            {u.name}
                                                            {u.id === auth.user.id && (
                                                                <span className="text-muted-foreground font-normal"> (você)</span>
                                                            )}
                                                        </p>
                                                        <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-muted-foreground">{u.phone ?? '—'}</td>
                                            <td>
                                                <PerfilBadge perfil={u.perfil} />
                                            </td>
                                            <td>
                                                <EstadoBadge activo={u.active} />
                                            </td>
                                            <td className="text-muted-foreground">{formatRelativo(u.last_login_at)}</td>
                                            <td>
                                                <Accoes u={u} euProprio={u.id === auth.user.id} onEditar={abrirEditar} onAlternar={setAAlternar} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Telemóvel: cartões */}
                            <ul className="divide-y md:hidden">
                                {utilizadores.data.map((u) => (
                                    <li key={u.id} className="flex items-start gap-3 p-4">
                                        <Avatar nome={u.name} iniciais={iniciais(u.name)} activo={u.active} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">{u.name}</p>
                                            <p className="text-muted-foreground truncate text-xs">{u.email}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <PerfilBadge perfil={u.perfil} />
                                                <EstadoBadge activo={u.active} />
                                            </div>
                                            <p className="text-muted-foreground mt-2 text-xs">Último acesso: {formatRelativo(u.last_login_at)}</p>
                                        </div>
                                        <Accoes u={u} euProprio={u.id === auth.user.id} onEditar={abrirEditar} onAlternar={setAAlternar} />
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </section>

                <Paginacao pagina={utilizadores} nome="utilizadores" />
            </div>

            <FormularioUtilizador aberto={formAberto} utilizador={aEditar} perfis={perfis} onFechar={() => setFormAberto(false)} />

            <Confirmar
                aberto={aAlternar !== null}
                titulo={aAlternar?.active ? `Desactivar ${aAlternar?.name}?` : `Activar ${aAlternar?.name}?`}
                descricao={
                    aAlternar?.active
                        ? 'A pessoa deixa de conseguir entrar e as sessões abertas são terminadas. Os registos que criou mantêm-se.'
                        : 'A pessoa volta a conseguir entrar com o seu e-mail e senha.'
                }
                textoConfirmar={aAlternar?.active ? 'Desactivar' : 'Activar'}
                perigo={aAlternar?.active}
                aProcessar={aProcessar}
                onConfirmar={alternarEstado}
                onFechar={() => setAAlternar(null)}
            />
        </AppLayout>
    );
}

function Avatar({ nome, iniciais, activo }: { nome: string; iniciais: string; activo: boolean }) {
    return (
        <div
            className={cn(
                'bg-secondary flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                activo ? 'text-foreground' : 'text-muted-foreground',
            )}
            title={nome}
        >
            {iniciais}
        </div>
    );
}

function PerfilBadge({ perfil }: { perfil: string | null }) {
    return <span className={cn(!perfil && 'text-muted-foreground')}>{perfil ?? 'Sem perfil'}</span>;
}

function EstadoBadge({ activo }: { activo: boolean }) {
    return <Estado cor={activo ? 'verde' : 'cinza'}>{activo ? 'Activo' : 'Inactivo'}</Estado>;
}

function Accoes({
    u,
    euProprio,
    onEditar,
    onAlternar,
}: {
    u: Utilizador;
    euProprio: boolean;
    onEditar: (u: Utilizador) => void;
    onAlternar: (u: Utilizador) => void;
}) {
    const pode = usePode();
    return (
        <div className="flex justify-end gap-1">
            {pode('utilizadores.gerir') && (
                <Button variant="ghost" size="icon" onClick={() => onEditar(u)} title="Editar" aria-label={`Editar ${u.name}`}>
                    <Pencil className="size-4" />
                </Button>
            )}
            {pode('utilizadores.desactivar') && !euProprio && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAlternar(u)}
                    title={u.active ? 'Desactivar' : 'Activar'}
                    aria-label={u.active ? `Desactivar ${u.name}` : `Activar ${u.name}`}
                    className={u.active ? 'hover:text-destructive' : 'hover:text-emerald-600'}
                >
                    {u.active ? <UserX className="size-4" /> : <Power className="size-4" />}
                </Button>
            )}
        </div>
    );
}
