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
    codigo: string | null;
    /** Código que o próximo produto desta categoria vai receber (SOF-004) */
    proximo: string | null;
    descricao: string | null;
    produtos: number;
}

interface Material {
    id: number;
    nome: string;
    produtos: number;
}

interface Props {
    categorias: Categoria[];
    semCategoria: number;
    materiais: Material[];
}

export default function Categorias({ categorias, semCategoria, materiais }: Props) {
    const pode = usePode();
    const gerir = pode('produtos.gerir');
    const [aEditar, setAEditar] = useState<number | null>(null);
    const [aApagar, setAApagar] = useState<Categoria | null>(null);
    const nova = useForm({ nome: '', codigo: '', descricao: '' });

    function criar(e: FormEvent) {
        e.preventDefault();
        nova.post('/produtos/categorias', { preserveScroll: true, onSuccess: () => nova.reset() });
    }

    const mover = (c: Categoria, direcao: 'anterior' | 'seguinte') =>
        router.put(`/produtos/categorias/${c.id}/mover`, { direcao }, { preserveScroll: true, preserveState: true });

    return (
        <AppLayout>
            <Head title="Categorias e materiais" />
            <Link href="/produtos" className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-[13px]">
                <ChevronLeft className="size-3.5" />
                Produtos e serviços
            </Link>
            <TituloPagina
                titulo="Categorias e materiais"
                descricao="As categorias agrupam os produtos nas listas e na loja, pela ordem desta lista. O código da categoria dá o código de cada produto novo: SOF-001, SOF-002…"
            />

            <h2 className="mb-3 text-[15px] font-semibold">Categorias</h2>
            {gerir && (
                <form onSubmit={criar} className="painel mb-4 grid gap-3 p-4 sm:grid-cols-[minmax(0,14rem)_7rem_1fr_auto] sm:items-start">
                    <div>
                        <Input
                            value={nova.data.nome}
                            onChange={(e) => nova.setData('nome', e.target.value)}
                            placeholder="Nome (ex.: Sofás)"
                            aria-label="Nome"
                        />
                        <InputError message={nova.errors.nome} />
                    </div>
                    <div>
                        <Input
                            value={nova.data.codigo}
                            onChange={(e) => nova.setData('codigo', e.target.value.toUpperCase())}
                            placeholder="Código (SOF)"
                            aria-label="Código"
                            maxLength={6}
                            className="font-mono uppercase"
                        />
                        <InputError message={nova.errors.codigo} />
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
                    <Button type="submit" disabled={nova.processing || nova.data.nome.trim() === '' || nova.data.codigo.trim() === ''}>
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
                            <th>Código</th>
                            <th>Próximo produto</th>
                            <th>Descrição</th>
                            <th className="text-right">Produtos</th>
                            {gerir && <th className="w-24" />}
                        </tr>
                    </thead>
                    <tbody>
                        {categorias.length === 0 && <LinhaVazia colunas={gerir ? 7 : 5} texto="Ainda não há categorias" />}
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
                                    <td className="font-mono text-[13px]">{c.codigo ?? '—'}</td>
                                    <td className="text-muted-foreground font-mono text-[13px]">{c.proximo ?? '—'}</td>
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

            <p className="text-muted-foreground mt-3 text-[13px]">
                Mudar o código de uma categoria só afecta os produtos registados a seguir; os que já existem mantêm o seu código.
                {semCategoria > 0 && (
                    <>
                        {' '}
                        <Link href="/produtos?categoria=sem" className="text-foreground hover:underline">
                            {semCategoria} produto{semCategoria === 1 ? '' : 's'} sem categoria
                        </Link>
                        : na loja aparecem no fim.
                    </>
                )}
            </p>

            <Materiais materiais={materiais} gerir={gerir} />

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
    const form = useForm({ nome: c.nome, codigo: c.codigo ?? '', descricao: c.descricao ?? '' });

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
                    value={form.data.codigo}
                    onChange={(e) => form.setData('codigo', e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && guardar()}
                    aria-label="Código"
                    maxLength={6}
                    className="h-8 w-24 font-mono uppercase"
                />
                <InputError message={form.errors.codigo} />
            </td>
            <td />
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

/** Materiais do produto (Napa, Tecido, Lã...): uma lista simples, para filtrar nas listas e no catálogo */
function Materiais({ materiais, gerir }: { materiais: Material[]; gerir: boolean }) {
    const novo = useForm({ nome: '' });
    const [aEditar, setAEditar] = useState<number | null>(null);
    const [aApagar, setAApagar] = useState<Material | null>(null);

    function criar(e: FormEvent) {
        e.preventDefault();
        novo.post('/produtos/materiais', { preserveScroll: true, onSuccess: () => novo.reset() });
    }

    return (
        <section className="mt-8">
            <h2 className="mb-1 text-[15px] font-semibold">Materiais</h2>
            <p className="text-muted-foreground mb-3 text-[13px]">
                De que é feito o produto (por exemplo, um sofá de napa ou de tecido). Escolhe-se na ficha do produto.
            </p>
            {gerir && (
                <form onSubmit={criar} className="mb-4 flex max-w-md items-start gap-2">
                    <div className="flex-1">
                        <Input
                            value={novo.data.nome}
                            onChange={(e) => novo.setData('nome', e.target.value)}
                            placeholder="Novo material"
                            aria-label="Novo material"
                        />
                        <InputError message={novo.errors.nome} />
                    </div>
                    <Button type="submit" variant="outline" disabled={novo.processing || novo.data.nome.trim() === ''}>
                        <Plus className="size-4" />
                        Adicionar
                    </Button>
                </form>
            )}
            <div className="painel max-w-md overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th className="text-right">Produtos</th>
                            {gerir && <th className="w-24" />}
                        </tr>
                    </thead>
                    <tbody>
                        {materiais.length === 0 && <LinhaVazia colunas={gerir ? 3 : 2} texto="Ainda não há materiais" />}
                        {materiais.map((m) =>
                            aEditar === m.id ? (
                                <EdicaoMaterial key={m.id} material={m} onFechar={() => setAEditar(null)} />
                            ) : (
                                <tr key={m.id}>
                                    <td className="font-medium">{m.nome}</td>
                                    <td className="text-right tabular-nums">{m.produtos}</td>
                                    {gerir && (
                                        <td>
                                            <div className="flex justify-end">
                                                <BotaoPequeno rotulo="Modificar" onClick={() => setAEditar(m.id)}>
                                                    <Pencil className="size-3.5" />
                                                </BotaoPequeno>
                                                <BotaoPequeno
                                                    rotulo={m.produtos > 0 ? 'Está em produtos: mude-os antes de apagar' : 'Apagar'}
                                                    disabled={m.produtos > 0}
                                                    onClick={() => setAApagar(m)}
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
            <Confirmar
                aberto={aApagar !== null}
                titulo={`Apagar o material ${aApagar?.nome ?? ''}?`}
                descricao="Esta acção não se pode desfazer."
                textoConfirmar="Apagar"
                perigo
                onConfirmar={() =>
                    aApagar && router.delete(`/produtos/materiais/${aApagar.id}`, { preserveScroll: true, onFinish: () => setAApagar(null) })
                }
                onFechar={() => setAApagar(null)}
            />
        </section>
    );
}

function EdicaoMaterial({ material: m, onFechar }: { material: Material; onFechar: () => void }) {
    const form = useForm({ nome: m.nome });
    const guardar = () => form.put(`/produtos/materiais/${m.id}`, { preserveScroll: true, onSuccess: onFechar });

    return (
        <tr>
            <td>
                <Input
                    value={form.data.nome}
                    onChange={(e) => form.setData('nome', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && guardar()}
                    aria-label="Nome do material"
                    className="h-8"
                    autoFocus
                />
                <InputError message={form.errors.nome} />
            </td>
            <td className="text-right tabular-nums">{m.produtos}</td>
            <td>
                <div className="flex justify-end gap-1">
                    <Button size="sm" onClick={guardar} disabled={form.processing}>
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
