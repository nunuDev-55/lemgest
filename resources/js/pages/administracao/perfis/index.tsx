import { CabecalhoPagina } from '@/components/cabecalho-pagina';
import { Confirmar } from '@/components/confirmar';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Crown, LoaderCircle, Lock, Plus, Save, ShieldCheck, Trash2, Users } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useState } from 'react';

interface Perfil {
    id: number;
    name: string;
    utilizadores: number;
    permissoes: string[];
    sistema: boolean;
    acessoTotal: boolean;
}

interface Modulo {
    chave: string;
    label: string;
    permissoes: { nome: string; label: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administração', href: '/administracao/utilizadores' },
    { title: 'Perfis e permissões', href: '/administracao/perfis' },
];

export default function PerfisIndex({ perfis, catalogo }: { perfis: Perfil[]; catalogo: Modulo[] }) {
    const [seleccionadoId, setSeleccionadoId] = useState<number>(() => perfis.find((p) => !p.acessoTotal)?.id ?? perfis[0]?.id);
    const [novoAberto, setNovoAberto] = useState(false);
    const [aApagar, setAApagar] = useState<Perfil | null>(null);
    const [aApagarProcessar, setAApagarProcessar] = useState(false);
    const [nomeNovo, setNomeNovo] = useState<string | null>(null);

    // Depois de criar um perfil, fica logo seleccionado para escolher as permissões
    useEffect(() => {
        const criado = nomeNovo ? perfis.find((p) => p.name === nomeNovo) : undefined;
        if (criado) {
            setSeleccionadoId(criado.id);
            setNomeNovo(null);
        }
    }, [perfis, nomeNovo]);

    const seleccionado = perfis.find((p) => p.id === seleccionadoId) ?? perfis[0];
    const form = useForm<{ permissoes: string[] }>({ permissoes: seleccionado?.permissoes ?? [] });

    // Ao mudar de perfil (ou depois de guardar), o formulário passa a mostrar as permissões desse perfil
    useEffect(() => {
        form.setData('permissoes', seleccionado?.permissoes ?? []);
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seleccionado?.id, seleccionado?.permissoes.join(',')]);

    const alterado = useMemo(() => {
        const a = [...(seleccionado?.permissoes ?? [])].sort().join(',');
        const b = [...form.data.permissoes].sort().join(',');
        return a !== b;
    }, [seleccionado, form.data.permissoes]);

    function alternar(nome: string, marcado: boolean) {
        form.setData('permissoes', marcado ? [...form.data.permissoes, nome] : form.data.permissoes.filter((p) => p !== nome));
    }

    function alternarModulo(modulo: Modulo, marcado: boolean) {
        const nomes = modulo.permissoes.map((p) => p.nome);
        const semModulo = form.data.permissoes.filter((p) => !nomes.includes(p));
        form.setData('permissoes', marcado ? [...semModulo, ...nomes] : semModulo);
    }

    function guardar() {
        form.put(route('perfis.update', seleccionado.id), { preserveScroll: true });
    }

    function apagar() {
        if (!aApagar) return;
        setAApagarProcessar(true);
        router.delete(route('perfis.destroy', aApagar.id), {
            preserveScroll: true,
            onSuccess: () => setSeleccionadoId(perfis.find((p) => !p.acessoTotal && p.id !== aApagar.id)?.id ?? perfis[0].id),
            onFinish: () => {
                setAApagarProcessar(false);
                setAApagar(null);
            },
        });
    }

    if (!seleccionado) return null;
    const bloqueado = seleccionado.acessoTotal;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Perfis e permissões" />
            <div className="flex flex-1 flex-col gap-4">
                <CabecalhoPagina
                    titulo="Perfis e permissões"
                    descricao="Defina o que cada perfil pode ver e fazer. As alterações aplicam-se a todos os utilizadores do perfil."
                    icone={ShieldCheck}
                    accoes={
                        <Button onClick={() => setNovoAberto(true)}>
                            <Plus className="size-4" />
                            Novo perfil
                        </Button>
                    }
                />

                <div className="grid flex-1 gap-4 lg:grid-cols-[18rem_1fr]">
                    {/* Lista de perfis */}
                    <nav className="flex flex-col gap-px self-start rounded-lg border p-1.5" aria-label="Perfis">
                        {perfis.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setSeleccionadoId(p.id)}
                                aria-current={p.id === seleccionado.id ? 'true' : undefined}
                                className={cn(
                                    'flex items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                                    p.id === seleccionado.id ? 'bg-accent' : 'hover:bg-muted',
                                )}
                            >
                                <div className="text-muted-foreground flex size-7 shrink-0 items-center justify-center">
                                    {p.acessoTotal ? <Crown className="size-4" /> : <ShieldCheck className="size-4" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13.5px] font-medium">{p.name}</p>
                                    <p className="text-muted-foreground text-[12px]">
                                        {p.acessoTotal ? 'Acesso total' : `${p.permissoes.length} permissões`} · {p.utilizadores}{' '}
                                        {p.utilizadores === 1 ? 'utilizador' : 'utilizadores'}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </nav>

                    {/* Permissões do perfil seleccionado */}
                    <section className="flex flex-col rounded-lg border">
                        <header className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-[16px] font-semibold">{seleccionado.name}</h2>
                                <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                                    <Users className="size-3.5" />
                                    {seleccionado.utilizadores} {seleccionado.utilizadores === 1 ? 'utilizador' : 'utilizadores'} com este perfil
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {!seleccionado.sistema && (
                                    <Button variant="outline" onClick={() => setAApagar(seleccionado)} className="hover:text-destructive">
                                        <Trash2 className="size-4" />
                                        Apagar perfil
                                    </Button>
                                )}
                                {!bloqueado && (
                                    <Button onClick={guardar} disabled={!alterado || form.processing}>
                                        {form.processing ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                                        Guardar permissões
                                    </Button>
                                )}
                            </div>
                        </header>

                        {bloqueado && (
                            <div className="bg-muted m-5 mb-0 flex items-start gap-3 rounded-md border p-4 text-[13.5px]">
                                <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                                <p>
                                    O <strong>Administrador</strong> tem sempre acesso a tudo, incluindo os módulos que forem criados no futuro. Por
                                    segurança, as suas permissões não se podem retirar.
                                </p>
                            </div>
                        )}

                        <div className="grid gap-4 p-5 xl:grid-cols-2">
                            {catalogo.map((modulo) => {
                                const nomes = modulo.permissoes.map((p) => p.nome);
                                const marcadas = bloqueado ? nomes.length : nomes.filter((n) => form.data.permissoes.includes(n)).length;
                                const todas = marcadas === nomes.length;
                                return (
                                    <fieldset key={modulo.chave} className="rounded-md border p-4">
                                        <legend className="sr-only">{modulo.label}</legend>
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <p className="text-[13.5px] font-medium">{modulo.label}</p>
                                            <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
                                                <Checkbox
                                                    checked={todas ? true : marcadas > 0 ? 'indeterminate' : false}
                                                    disabled={bloqueado}
                                                    onCheckedChange={(v) => alternarModulo(modulo, v === true)}
                                                    aria-label={`Todas as permissões de ${modulo.label}`}
                                                />
                                                Todas
                                            </label>
                                        </div>
                                        <div className="grid gap-2.5">
                                            {modulo.permissoes.map((p) => (
                                                <label key={p.nome} className="flex cursor-pointer items-center gap-3 text-sm">
                                                    <Checkbox
                                                        checked={bloqueado || form.data.permissoes.includes(p.nome)}
                                                        disabled={bloqueado}
                                                        onCheckedChange={(v) => alternar(p.nome, v === true)}
                                                    />
                                                    {p.label}
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                );
                            })}
                        </div>
                        {form.errors.permissoes && <InputError className="px-5 pb-4" message={form.errors.permissoes} />}
                    </section>
                </div>
            </div>

            <NovoPerfil aberto={novoAberto} onFechar={() => setNovoAberto(false)} onCriado={setNomeNovo} />

            <Confirmar
                aberto={aApagar !== null}
                titulo={`Apagar o perfil ${aApagar?.name}?`}
                descricao="O perfil só pode ser apagado se não tiver utilizadores. Esta acção não se pode desfazer."
                textoConfirmar="Apagar"
                perigo
                aProcessar={aApagarProcessar}
                onConfirmar={apagar}
                onFechar={() => setAApagar(null)}
            />
        </AppLayout>
    );
}

function NovoPerfil({ aberto, onFechar, onCriado }: { aberto: boolean; onFechar: () => void; onCriado: (nome: string) => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({ name: '' });

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('perfis.store'), {
            preserveScroll: true,
            onSuccess: () => {
                onCriado(data.name.trim());
                reset();
                onFechar();
            },
        });
    };

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Novo perfil</DialogTitle>
                    <DialogDescription>Por exemplo: Motorista, Recepção, Contabilista. Depois escolhe as permissões.</DialogDescription>
                </DialogHeader>
                <form id="form-perfil" onSubmit={submeter} className="grid gap-2">
                    <Label htmlFor="nome-perfil">Nome do perfil</Label>
                    <Input id="nome-perfil" value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
                    <InputError message={errors.name} />
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-perfil" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Criar perfil
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
