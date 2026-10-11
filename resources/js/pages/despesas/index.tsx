import { Confirmar } from '@/components/confirmar';
import {
    ColunaOrdenavel,
    FiltroEscolha,
    FiltroTexto,
    LinhaVazia,
    PorPagina,
    TituloPagina,
    useListaFiltros,
    type OrdenacaoLista,
} from '@/components/erp';
import InputError from '@/components/input-error';
import { Paginacao } from '@/components/paginacao';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatNumero } from '@/lib/format';
import { type Paginado } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FilterX, LoaderCircle, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { useState, type FormEvent } from 'react';

type Opcao = { valor: string; label: string };

interface Despesa {
    id: number;
    data: string;
    categoria: string;
    categoria_nome: string;
    descricao: string;
    valor: string;
    metodo: string;
    metodo_nome: string;
    autor: string | null;
}

interface Props {
    despesas: Paginado<Despesa>;
    filtros: Record<string, string | undefined>;
    ordenacao: OrdenacaoLista;
    total: string;
    categorias: Opcao[];
    metodos: Opcao[];
}

const sel = 'border-input bg-card focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2';
const hoje = () => new Date().toLocaleDateString('en-CA');

/** Despesas do dia-a-dia: com as compras de matéria-prima, são os gastos que os Resultados comparam com os ganhos */
export default function Despesas({ despesas, filtros, ordenacao, total, categorias, metodos }: Props) {
    const pode = usePode();
    const registar = pode('despesas.registar');
    const lista = useListaFiltros('/despesas', filtros, ordenacao);
    const [aEditar, setAEditar] = useState<Despesa | 'nova' | null>(null);
    const [aApagar, setAApagar] = useState<Despesa | null>(null);
    const colunas = registar ? 6 : 5;

    return (
        <AppLayout>
            <Head title="Despesas" />
            <TituloPagina
                icone={Wallet}
                titulo="Despesas"
                contagem={despesas.total}
                descricao={
                    <>
                        Combustível, salários, renda, energia… As compras de matéria-prima ficam nas{' '}
                        <Link href="/facturas-fornecedor" className="text-foreground hover:underline">
                            facturas de fornecedores
                        </Link>
                        . Juntas, são os gastos dos Resultados.
                    </>
                }
                accoes={
                    <>
                        {lista.temFiltros && (
                            <Button variant="outline" size="sm" onClick={lista.limpar}>
                                <FilterX className="size-4" />
                                Limpar filtros
                            </Button>
                        )}
                        {registar && (
                            <Button onClick={() => setAEditar('nova')}>
                                <Plus className="size-4" />
                                Registar despesa
                            </Button>
                        )}
                    </>
                }
            />

            <div className="painel overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr className="linha-filtros">
                            <th>
                                <div className="flex gap-1">
                                    <input
                                        type="date"
                                        aria-label="Desde a data"
                                        value={lista.valores.de ?? ''}
                                        onChange={(e) => lista.escolher('de', e.target.value)}
                                        className="border-input bg-card h-7 w-full rounded border px-1 text-xs font-normal"
                                    />
                                    <input
                                        type="date"
                                        aria-label="Até à data"
                                        value={lista.valores.ate ?? ''}
                                        onChange={(e) => lista.escolher('ate', e.target.value)}
                                        className="border-input bg-card h-7 w-full rounded border px-1 text-xs font-normal"
                                    />
                                </div>
                            </th>
                            <th>
                                <FiltroEscolha
                                    rotulo="categoria"
                                    valor={lista.valores.categoria}
                                    onChange={(v) => lista.escolher('categoria', v)}
                                    opcoes={categorias}
                                    todos="Todas"
                                />
                            </th>
                            <th>
                                <FiltroTexto rotulo="descrição" valor={lista.valores.pesquisa} onChange={(v) => lista.escrever('pesquisa', v)} />
                            </th>
                            <th />
                            <th />
                            {registar && <th />}
                        </tr>
                        <tr>
                            <ColunaOrdenavel coluna="data" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Data
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="categoria" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Categoria
                            </ColunaOrdenavel>
                            <th>Descrição</th>
                            <th>Pago com</th>
                            <ColunaOrdenavel coluna="valor" ordenacao={ordenacao} onOrdenar={lista.ordenar} className="text-right">
                                Valor
                            </ColunaOrdenavel>
                            {registar && <th className="w-20" />}
                        </tr>
                    </thead>
                    <tbody>
                        {despesas.data.length === 0 && <LinhaVazia colunas={colunas} texto="Ainda não há despesas registadas" />}
                        {despesas.data.map((d) => (
                            <tr key={d.id}>
                                <td className="whitespace-nowrap tabular-nums">{formatData(d.data)}</td>
                                <td>{d.categoria_nome}</td>
                                <td>
                                    {d.descricao}
                                    {d.autor && <div className="text-muted-foreground text-[12px]">Registada por {d.autor}</div>}
                                </td>
                                <td className="text-muted-foreground">{d.metodo_nome}</td>
                                <td className="text-right font-medium tabular-nums">{formatNumero(d.valor)}</td>
                                {registar && (
                                    <td className="text-right whitespace-nowrap">
                                        <button
                                            type="button"
                                            onClick={() => setAEditar(d)}
                                            className="text-muted-foreground hover:text-primary p-1"
                                            title="Alterar"
                                            aria-label="Alterar despesa"
                                        >
                                            <Pencil className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAApagar(d)}
                                            className="text-muted-foreground hover:text-destructive p-1"
                                            title="Apagar"
                                            aria-label="Apagar despesa"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    {despesas.data.length > 0 && (
                        <tfoot>
                            <tr className="bg-muted font-semibold">
                                <td colSpan={4} className="px-3 py-2">
                                    Total {lista.temFiltros ? 'filtrado' : ''}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatNumero(total)}</td>
                                {registar && <td />}
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <Paginacao pagina={despesas} nome="despesas" extra={<PorPagina valor={despesas.per_page} onChange={lista.porPagina} />} />

            {aEditar !== null && (
                <FormularioDespesa
                    despesa={aEditar === 'nova' ? null : aEditar}
                    categorias={categorias}
                    metodos={metodos}
                    onFechar={() => setAEditar(null)}
                />
            )}
            <Confirmar
                aberto={aApagar !== null}
                titulo="Apagar esta despesa?"
                descricao={aApagar ? `${aApagar.descricao}, ${formatNumero(aApagar.valor)} MT. Fica registado na auditoria.` : ''}
                textoConfirmar="Apagar"
                perigo
                onConfirmar={() => aApagar && router.delete(`/despesas/${aApagar.id}`, { preserveScroll: true, onFinish: () => setAApagar(null) })}
                onFechar={() => setAApagar(null)}
            />
        </AppLayout>
    );
}

function FormularioDespesa({
    despesa: d,
    categorias,
    metodos,
    onFechar,
}: {
    despesa: Despesa | null;
    categorias: Opcao[];
    metodos: Opcao[];
    onFechar: () => void;
}) {
    const form = useForm({
        data: d?.data ?? hoje(),
        categoria: d?.categoria ?? categorias[0]?.valor ?? '',
        descricao: d?.descricao ?? '',
        valor: d?.valor ?? '',
        metodo: d?.metodo ?? 'numerario',
    });

    function submeter(e: FormEvent) {
        e.preventDefault();
        const opcoes = { preserveScroll: true, onSuccess: onFechar };
        if (d) form.put(`/despesas/${d.id}`, opcoes);
        else form.post('/despesas', opcoes);
    }

    return (
        <Dialog open onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{d ? 'Alterar despesa' : 'Registar despesa'}</DialogTitle>
                    <DialogDescription>Registe a despesa depois de paga, com o valor total pago.</DialogDescription>
                </DialogHeader>
                <form id="form-despesa" onSubmit={submeter} className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="data">Data</Label>
                        <Input id="data" type="date" value={form.data.data} max={hoje()} onChange={(e) => form.setData('data', e.target.value)} />
                        <InputError message={form.errors.data} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="categoria">Categoria</Label>
                        <select
                            id="categoria"
                            value={form.data.categoria}
                            onChange={(e) => form.setData('categoria', e.target.value)}
                            className={sel}
                        >
                            {categorias.map((c) => (
                                <option key={c.valor} value={c.valor}>
                                    {c.label}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.categoria} />
                    </div>
                    <div className="grid gap-1.5 sm:col-span-2">
                        <Label htmlFor="descricao">Descrição</Label>
                        <Input
                            id="descricao"
                            value={form.data.descricao}
                            onChange={(e) => form.setData('descricao', e.target.value)}
                            placeholder="Ex.: Gasóleo da carrinha, entrega em Maputo"
                            maxLength={190}
                            autoFocus
                        />
                        <InputError message={form.errors.descricao} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="valor">Valor pago (MT)</Label>
                        <Input
                            id="valor"
                            inputMode="decimal"
                            value={form.data.valor}
                            onChange={(e) => form.setData('valor', e.target.value)}
                            placeholder="0,00"
                            className="text-right"
                        />
                        <InputError message={form.errors.valor} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="metodo">Pago com</Label>
                        <select id="metodo" value={form.data.metodo} onChange={(e) => form.setData('metodo', e.target.value)} className={sel}>
                            {metodos.map((m) => (
                                <option key={m.valor} value={m.valor}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                        <InputError message={form.errors.metodo} />
                    </div>
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={form.processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-despesa" disabled={form.processing}>
                        {form.processing && <LoaderCircle className="size-4 animate-spin" />}
                        {d ? 'Guardar' : 'Registar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
