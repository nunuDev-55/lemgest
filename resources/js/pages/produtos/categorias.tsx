import { Confirmar } from '@/components/confirmar';
import { LinhaVazia, TituloPagina } from '@/components/erp';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ChevronLeft, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

interface Categoria {
    id: number;
    nome: string;
    descricao: string | null;
    produtos: number;
}

interface Props {
    categorias: Categoria[];
    semCategoria: number;
}

export default function Categorias({ categorias, semCategoria }: Props) {
    const pode = usePode();
    const gerir = pode('produtos.gerir');
    const [aEditar, setAEditar] = useState<number | null>(null);
    const [aApagar, setAApagar] = useState<Categoria | null>(null);
    const nova = useForm({ nome: '', descricao: '' });

    function criar(e: FormEvent) {
        e.preventDefault();
        nova.post('/produtos/categorias', { preserveScroll: true, onSuccess: () => nova.reset() });
    }

    const mover = (c: Categoria, direcao: 'anterior' | 'seguinte') =>
        router.put(`/produtos/categorias/${c.id}/mover`, { direcao }, { preserveScroll: true, preserveState: true });

    return (
        <AppLayout>
            <Head title="Categorias" />
            <Link href="/produtos" className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-[13px]">
                <ChevronLeft className="size-3.5" />
                Produtos e serviços
            </Link>
            <TituloPagina
                titulo="Categorias"
                contagem={categorias.length}
                descricao="Agrupam os produtos nas listas e na loja. A ordem desta lista é a ordem da loja."
            />

            {gerir && (
                <form onSubmit={criar} className="painel mb-4 grid gap-3 p-4 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-start">
                    <div>
                        <Input
                            value={nova.data.nome}
                            onChange={(e) => nova.setData('nome', e.target.value)}
                            placeholder="Nome da nova categoria"
                            aria-label="Nome"
                        />
                        <InputError message={nova.errors.nome} />
                    </div>
                    <div>
                        <Input
                            value={nova.data.descricao}
                            onChange={(e) => nova.setData('descricao', e.target.value)}
                            placeholder="Descrição curta (opcional)"
                            aria-label="Descrição"
                        />
                        <InputError message={nova.errors.descricao} />
                    </div>
                    <Button type="submit" disabled={nova.processing || nova.data.nome.trim() === ''}>
                        {nova.processing ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
                        Adicionar
                    </Button>
                </form>
            )}

            <div className="painel overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr>
                            {gerir && <th className="w-20">Ordem</th>}
                            <th>Nome</th>
                            <th>Descrição</th>
                            <th className="text-right">Produtos</th>
                            {gerir && <th className="w-24" />}
                        </tr>
                    </thead>
                    <tbody>
                        {categorias.length === 0 && <LinhaVazia colunas={gerir ? 5 : 3} texto="Ainda não há categorias" />}
                        {categorias.map((c, i) =>
                            aEditar === c.id ? (
                                <LinhaEdicao key={c.id} categoria={c} onFechar={() => setAEditar(null)} />
                            ) : (
                                <tr key={c.id}>
                                    {gerir && (
                                        <td>
                                            <div className="flex">
                                                <BotaoPequeno rotulo="Subir" disabled={i === 0} onClick={() => mover(c, 'anterior')}>
                                                    <ArrowUp className="size-3.5" />
                                                </BotaoPequeno>
                                                <BotaoPequeno
                                                    rotulo="Descer"
                                                    disabled={i === categorias.length - 1}
                                                    onClick={() => mover(c, 'seguinte')}
                                                >
                                                    <ArrowDown className="size-3.5" />
                                                </BotaoPequeno>
                                            </div>
                                        </td>
                                    )}
                                    <td className="font-medium">{c.nome}</td>
                                    <td className="text-muted-foreground">{c.descricao ?? '—'}</td>
                                    <td className="text-right tabular-nums">
                                        {c.produtos > 0 ? (
                                            <Link href={`/produtos?categoria=${c.id}`} className="text-primary hover:underline">
                                                {c.produtos}
                                            </Link>
                                        ) : (
                                            <span className="text-muted-foreground">0</span>
                                        )}
                                    </td>
                                    {gerir && (
                                        <td>
                                            <div className="flex justify-end">
                                                <BotaoPequeno rotulo="Modificar" onClick={() => setAEditar(c.id)}>
                                                    <Pencil className="size-3.5" />
                                                </BotaoPequeno>
                                                <BotaoPequeno
                                                    rotulo={c.produtos > 0 ? 'Tem produtos: mude-os de categoria antes de apagar' : 'Apagar'}
                                                    disabled={c.produtos > 0}
                                                    onClick={() => setAApagar(c)}
                                                    className="hover:text-destructive"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </BotaoPequeno>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>
            </div>

            {semCategoria > 0 && (
                <p className="text-muted-foreground mt-3 text-[13px]">
                    <Link href="/produtos?categoria=sem" className="text-foreground hover:underline">
                        {semCategoria} produto{semCategoria === 1 ? '' : 's'} sem categoria
                    </Link>
                    . Na loja aparecem no fim.
                </p>
            )}

            <Confirmar
                aberto={aApagar !== null}
                titulo={`Apagar a categoria ${aApagar?.nome ?? ''}?`}
                descricao="Esta acção não se pode desfazer."
                textoConfirmar="Apagar"
                perigo
                onConfirmar={() =>
                    aApagar && router.delete(`/produtos/categorias/${aApagar.id}`, { preserveScroll: true, onFinish: () => setAApagar(null) })
                }
                onFechar={() => setAApagar(null)}
            />
        </AppLayout>
    );
}

function LinhaEdicao({ categoria: c, onFechar }: { categoria: Categoria; onFechar: () => void }) {
    const form = useForm({ nome: c.nome, descricao: c.descricao ?? '' });

    function guardar(e?: FormEvent) {
        e?.preventDefault();
        form.put(`/produtos/categorias/${c.id}`, { preserveScroll: true, onSuccess: onFechar });
    }

    return (
        <tr>
            <td />
            <td>
                <Input
                    value={form.data.nome}
                    onChange={(e) => form.setData('nome', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && guardar()}
                    aria-label="Nome"
                    className="h-8"
                    autoFocus
                />
                <InputError message={form.errors.nome} />
            </td>
            <td>
                <Input
                    value={form.data.descricao}
                    onChange={(e) => form.setData('descricao', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && guardar()}
                    aria-label="Descrição"
                    className="h-8"
                />
            </td>
            <td className="text-right tabular-nums">{c.produtos}</td>
            <td>
                <div className="flex justify-end gap-1">
                    <Button size="sm" onClick={() => guardar()} disabled={form.processing}>
                        Guardar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onFechar}>
                        Cancelar
                    </Button>
                </div>
            </td>
        </tr>
    );
}

function BotaoPequeno({
    rotulo,
    onClick,
    disabled,
    className,
    children,
}: {
    rotulo: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={rotulo}
            aria-label={rotulo}
            className={`text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30 ${className ?? ''}`}
        >
            {children}
        </button>
    );
}
