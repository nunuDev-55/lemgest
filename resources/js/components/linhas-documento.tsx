import { Escolher } from '@/components/escolher';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { formatNumero, formatQuantidade } from '@/lib/format';
import { router, useForm } from '@inertiajs/react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { FormEventHandler, useState, type ReactNode } from 'react';

export interface LinhaDocumento {
    id: number;
    produto_id: number | null;
    descricao: string;
    quantidade: string;
    unidade: string | null;
    /** Só nos documentos com dias (reservas) */
    dias?: number;
    preco_unitario: string;
    desconto: string;
    taxa_iva: string;
    total_sem_iva: string;
    total: string;
}

export interface ProdutoVenda {
    id: number;
    referencia: string;
    nome: string;
    preco: string;
    taxa_iva: string;
    unidade: string;
    tipo: string;
}

const TAXAS = ['16.00', '5.00', '0.00'];
const campo = 'border-input bg-card focus-visible:ring-ring h-8 w-full rounded border px-2 text-[13px] outline-none focus-visible:ring-2';

function precoComIva(pu: string, iva: string) {
    return (Number(pu) * (1 + Number(iva) / 100)).toFixed(2);
}

/**
 * Tabela de linhas de um documento (orçamento, encomenda, factura, reserva). No rascunho permite acrescentar, alterar e remover linhas.
 * Com "comDias" (reservas), cada linha tem dias de aluguer: total = quantidade × dias × preço por dia − desconto.
 */
export function LinhasDocumento({
    urlBase,
    linhas,
    produtos,
    editavel,
    comDias = false,
    extra,
}: {
    urlBase: string;
    linhas: LinhaDocumento[];
    produtos: ProdutoVenda[];
    editavel: boolean;
    comDias?: boolean;
    /** Conteúdo extra por baixo da descrição de cada linha (ex.: aviso de stock) */
    extra?: (linha: LinhaDocumento) => ReactNode;
}) {
    const [aEditar, setAEditar] = useState<number | null>(null);
    const colunas = (comDias ? 8 : 7) + (editavel ? 1 : 0);

    return (
        <div className="painel overflow-x-auto">
            <table className="tabela">
                <thead>
                    <tr>
                        <th className="min-w-64">Descrição</th>
                        <th className="text-right">IVA</th>
                        <th className="text-right">{comDias ? 'Preço/dia (sem IVA)' : 'P.U. (sem IVA)'}</th>
                        <th className="text-right">{comDias ? 'Preço/dia (IVA inc.)' : 'P.U. (IVA inc.)'}</th>
                        <th className="text-right">Qtd.</th>
                        {comDias && <th className="text-right">Dias</th>}
                        <th className="text-right">Desc.</th>
                        <th className="text-right">Total (sem IVA)</th>
                        {editavel && <th className="w-20" />}
                    </tr>
                </thead>
                <tbody>
                    {linhas.length === 0 && (
                        <tr>
                            <td colSpan={colunas} className="text-muted-foreground py-6 text-center italic">
                                {editavel ? 'Ainda sem linhas. Use o formulário abaixo para acrescentar produtos ou serviços.' : 'Sem linhas.'}
                            </td>
                        </tr>
                    )}
                    {linhas.map((l) =>
                        aEditar === l.id ? (
                            <EditarLinha key={l.id} urlBase={urlBase} linha={l} comDias={comDias} onFechar={() => setAEditar(null)} />
                        ) : (
                            <tr key={l.id}>
                                <td className="whitespace-pre-line">
                                    {l.descricao}
                                    {extra?.(l)}
                                </td>
                                <td className="text-right tabular-nums">{Number(l.taxa_iva)}%</td>
                                <td className="text-right tabular-nums">{formatNumero(l.preco_unitario)}</td>
                                <td className="text-muted-foreground text-right tabular-nums">
                                    {formatNumero(precoComIva(l.preco_unitario, l.taxa_iva))}
                                </td>
                                <td className="text-right tabular-nums">
                                    {formatQuantidade(l.quantidade)}
                                    {l.unidade && l.unidade !== 'un' && <span className="text-muted-foreground"> {l.unidade}</span>}
                                </td>
                                {comDias && <td className="text-right tabular-nums">{l.dias ?? 1}</td>}
                                <td className="text-right tabular-nums">{Number(l.desconto) > 0 ? `${Number(l.desconto)}%` : ''}</td>
                                <td className="text-right font-medium tabular-nums">{formatNumero(l.total_sem_iva)}</td>
                                {editavel && (
                                    <td className="text-right whitespace-nowrap">
                                        <button
                                            type="button"
                                            onClick={() => setAEditar(l.id)}
                                            className="text-muted-foreground hover:text-primary p-1"
                                            title="Alterar linha"
                                            aria-label="Alterar linha"
                                        >
                                            <Pencil className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => router.delete(`${urlBase}/linhas/${l.id}`, { preserveScroll: true })}
                                            className="text-muted-foreground hover:text-destructive p-1"
                                            title="Remover linha"
                                            aria-label="Remover linha"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ),
                    )}
                </tbody>
                {editavel && <NovaLinha urlBase={urlBase} produtos={produtos} comDias={comDias} colunas={colunas} />}
            </table>
        </div>
    );
}

function NovaLinha({ urlBase, produtos, comDias, colunas }: { urlBase: string; produtos: ProdutoVenda[]; comDias: boolean; colunas: number }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        produto_id: '',
        descricao: '',
        taxa_iva: '16.00',
        preco_unitario: '',
        quantidade: '1',
        dias: '',
        desconto: '',
    });

    function escolherProduto(valor: string | null) {
        const p = produtos.find((x) => String(x.id) === valor);
        setData((d) => ({
            ...d,
            produto_id: valor ?? '',
            descricao: p ? `${p.referencia} - ${p.nome}` : d.descricao,
            preco_unitario: p ? p.preco : d.preco_unitario,
            taxa_iva: p ? p.taxa_iva : d.taxa_iva,
        }));
    }

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post(`${urlBase}/linhas`, { preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <tbody>
            <tr className="bg-accent/40">
                <td colSpan={colunas} className="!bg-accent/40 px-3 pt-3 pb-1 text-xs font-semibold">
                    Acrescentar linha — escolha um produto/serviço do catálogo ou escreva uma descrição livre
                </td>
            </tr>
            <tr>
                <td className="!bg-accent/40 align-top">
                    <form id="nova-linha" onSubmit={submeter} className="grid gap-1.5">
                        <Escolher
                            opcoes={produtos.map((p) => ({
                                valor: String(p.id),
                                label: `${p.referencia} - ${p.nome}`,
                                detalhe: `${formatNumero(p.preco)} MT`,
                            }))}
                            valor={data.produto_id || null}
                            onChange={escolherProduto}
                            placeholder="Produto ou serviço do catálogo (opcional)"
                            permitirLimpar
                        />
                        <textarea
                            rows={2}
                            value={data.descricao}
                            onChange={(e) => setData('descricao', e.target.value)}
                            placeholder="Descrição"
                            aria-label="Descrição"
                            className="border-input bg-card focus-visible:ring-ring w-full rounded border px-2 py-1 text-[13px] outline-none focus-visible:ring-2"
                        />
                        <InputError message={errors.descricao || errors.produto_id} />
                    </form>
                </td>
                <td className="!bg-accent/40 align-top">
                    <select
                        form="nova-linha"
                        value={data.taxa_iva}
                        onChange={(e) => setData('taxa_iva', e.target.value)}
                        className={`${campo} min-w-20`}
                        aria-label="IVA"
                    >
                        {TAXAS.map((t) => (
                            <option key={t} value={t}>
                                {Number(t)}%
                            </option>
                        ))}
                    </select>
                </td>
                <td className="!bg-accent/40 align-top">
                    <input
                        form="nova-linha"
                        value={data.preco_unitario}
                        onChange={(e) => setData('preco_unitario', e.target.value)}
                        inputMode="decimal"
                        placeholder="0,00"
                        className={`${campo} text-right`}
                        aria-label="Preço unitário sem IVA"
                    />
                    <InputError message={errors.preco_unitario} />
                </td>
                <td className="!bg-accent/40" />
                <td className="!bg-accent/40 align-top">
                    <input
                        form="nova-linha"
                        value={data.quantidade}
                        onChange={(e) => setData('quantidade', e.target.value)}
                        inputMode="decimal"
                        className={`${campo} w-20 text-right`}
                        aria-label="Quantidade"
                    />
                    <InputError message={errors.quantidade} />
                </td>
                {comDias && (
                    <td className="!bg-accent/40 align-top">
                        <input
                            form="nova-linha"
                            value={data.dias}
                            onChange={(e) => setData('dias', e.target.value.replace(/[^\d]/g, ''))}
                            inputMode="numeric"
                            placeholder="auto"
                            title="Em branco: os dias da reserva no material de aluguer, 1 nos serviços"
                            className={`${campo} w-16 text-right`}
                            aria-label="Dias"
                        />
                        <InputError message={errors.dias} />
                    </td>
                )}
                <td className="!bg-accent/40 align-top">
                    <input
                        form="nova-linha"
                        value={data.desconto}
                        onChange={(e) => setData('desconto', e.target.value)}
                        inputMode="decimal"
                        placeholder="%"
                        className={`${campo} w-16 text-right`}
                        aria-label="Desconto em percentagem"
                    />
                    <InputError message={errors.desconto} />
                </td>
                <td colSpan={2} className="!bg-accent/40 text-right align-top">
                    <Button form="nova-linha" type="submit" size="sm" disabled={processing}>
                        <Plus className="size-4" />
                        Adicionar
                    </Button>
                </td>
            </tr>
        </tbody>
    );
}

function EditarLinha({ urlBase, linha, comDias, onFechar }: { urlBase: string; linha: LinhaDocumento; comDias: boolean; onFechar: () => void }) {
    const { data, setData, put, processing, errors } = useForm({
        descricao: linha.descricao,
        taxa_iva: Number(linha.taxa_iva).toFixed(2),
        preco_unitario: linha.preco_unitario,
        quantidade: String(Number(linha.quantidade)),
        dias: String(linha.dias ?? 1),
        desconto: Number(linha.desconto) > 0 ? String(Number(linha.desconto)) : '',
    });

    function guardar() {
        put(`${urlBase}/linhas/${linha.id}`, { preserveScroll: true, onSuccess: onFechar });
    }

    return (
        <tr className="bg-accent/50">
            <td className="!bg-accent/50">
                <textarea
                    rows={2}
                    value={data.descricao}
                    onChange={(e) => setData('descricao', e.target.value)}
                    aria-label="Descrição"
                    className="border-input bg-card w-full rounded border px-2 py-1 text-[13px]"
                />
                <InputError message={errors.descricao} />
            </td>
            <td className="!bg-accent/50">
                <select value={data.taxa_iva} onChange={(e) => setData('taxa_iva', e.target.value)} className={`${campo} min-w-20`} aria-label="IVA">
                    {TAXAS.map((t) => (
                        <option key={t} value={t}>
                            {Number(t)}%
                        </option>
                    ))}
                </select>
            </td>
            <td className="!bg-accent/50">
                <input
                    value={data.preco_unitario}
                    onChange={(e) => setData('preco_unitario', e.target.value)}
                    className={`${campo} text-right`}
                    aria-label="Preço unitário"
                />
                <InputError message={errors.preco_unitario} />
            </td>
            <td className="!bg-accent/50" />
            <td className="!bg-accent/50">
                <input
                    value={data.quantidade}
                    onChange={(e) => setData('quantidade', e.target.value)}
                    className={`${campo} w-20 text-right`}
                    aria-label="Quantidade"
                />
                <InputError message={errors.quantidade} />
            </td>
            {comDias && (
                <td className="!bg-accent/50">
                    <input
                        value={data.dias}
                        onChange={(e) => setData('dias', e.target.value.replace(/[^\d]/g, ''))}
                        className={`${campo} w-16 text-right`}
                        aria-label="Dias"
                    />
                    <InputError message={errors.dias} />
                </td>
            )}
            <td className="!bg-accent/50">
                <input
                    value={data.desconto}
                    onChange={(e) => setData('desconto', e.target.value)}
                    className={`${campo} w-16 text-right`}
                    aria-label="Desconto"
                />
            </td>
            <td className="!bg-accent/50" />
            <td className="!bg-accent/50 text-right whitespace-nowrap">
                <button
                    type="button"
                    onClick={guardar}
                    disabled={processing}
                    className="p-1 text-emerald-600 hover:text-emerald-700"
                    title="Guardar"
                    aria-label="Guardar linha"
                >
                    <Check className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={onFechar}
                    className="text-muted-foreground hover:text-foreground p-1"
                    title="Cancelar"
                    aria-label="Cancelar"
                >
                    <X className="size-4" />
                </button>
            </td>
        </tr>
    );
}
