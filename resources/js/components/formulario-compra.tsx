import { LinhaForm, TituloPagina } from '@/components/erp';
import { Escolher } from '@/components/escolher';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FileInput, LoaderCircle, ShoppingCart, UserPlus } from 'lucide-react';
import { FormEventHandler } from 'react';

type Opcao = { valor: string; label: string };

export interface FornecedorDoc {
    id: number;
    nome: string;
    codigo: string | null;
    termos_pagamento: string;
    metodo_pagamento: string | null;
}

export interface PropsFormularioCompra {
    documento: {
        id: number;
        referencia: string;
        terceiro_id: number;
        data: string;
        data_entrega?: string | null;
        ref_fornecedor: string | null;
        termos_pagamento: string;
        metodo_pagamento: string | null;
        nota_publica?: string | null;
        nota_privada: string | null;
    } | null;
    fornecedores: FornecedorDoc[];
    fornecedorId: number | null;
    hoje: string;
    opcoes: { termosPagamento: Opcao[]; metodosPagamento: Opcao[] };
}

const sel = 'border-input bg-card focus-visible:ring-ring h-9 w-full max-w-72 rounded-md border px-2 text-sm outline-none focus-visible:ring-2';
const area = 'border-input bg-card focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2';

/** Cabeçalho de uma encomenda a fornecedor ou de uma factura de fornecedor (criar e modificar). */
export function FormularioCompra({
    tipo,
    documento: d,
    fornecedores,
    fornecedorId,
    hoje,
    opcoes,
}: PropsFormularioCompra & { tipo: 'encomenda' | 'factura' }) {
    const encomenda = tipo === 'encomenda';
    const base = encomenda ? '/encomendas-fornecedor' : '/facturas-fornecedor';
    const inicial = fornecedores.find((f) => f.id === (d?.terceiro_id ?? fornecedorId));

    const { data, setData, post, put, processing, errors, transform } = useForm({
        terceiro_id: inicial ? String(inicial.id) : '',
        ref_fornecedor: d?.ref_fornecedor ?? '',
        data: d?.data ?? hoje,
        data_entrega: d?.data_entrega ?? '',
        termos_pagamento: d?.termos_pagamento ?? inicial?.termos_pagamento ?? 'pronto',
        metodo_pagamento: d?.metodo_pagamento ?? inicial?.metodo_pagamento ?? '',
        nota_publica: d?.nota_publica ?? '',
        nota_privada: d?.nota_privada ?? '',
    });

    function escolherFornecedor(valor: string | null) {
        const f = fornecedores.find((x) => String(x.id) === valor);
        setData((v) => ({
            ...v,
            terceiro_id: valor ?? '',
            termos_pagamento: f?.termos_pagamento ?? v.termos_pagamento,
            metodo_pagamento: f?.metodo_pagamento ?? v.metodo_pagamento,
        }));
    }

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        // A data de entrega e a nota pública só existem nas encomendas
        transform(({ data_entrega, nota_publica, ...resto }) => (encomenda ? { ...resto, data_entrega, nota_publica } : resto));
        if (d) put(`${base}/${d.id}`);
        else post(base);
    };

    const titulo = d ? `Modificar ${d.referencia}` : encomenda ? 'Nova encomenda a fornecedor' : 'Nova factura de fornecedor';

    return (
        <AppLayout>
            <Head title={titulo} />
            <TituloPagina
                icone={encomenda ? ShoppingCart : FileInput}
                titulo={titulo}
                descricao={
                    d
                        ? undefined
                        : encomenda
                          ? 'Criada em rascunho; acrescente o que vai encomendar e valide no fim.'
                          : 'Lance a factura tal como o fornecedor a emitiu: o número dele, a data e as linhas.'
                }
            />

            <form onSubmit={submeter} className="max-w-4xl">
                <div className="painel">
                    <LinhaForm rotulo="Fornecedor" htmlFor="fornecedor" obrigatorio>
                        <div className="flex gap-2">
                            <Escolher
                                id="fornecedor"
                                className="flex-1"
                                opcoes={fornecedores.map((f) => ({ valor: String(f.id), label: f.nome, detalhe: f.codigo ?? undefined }))}
                                valor={data.terceiro_id || null}
                                onChange={escolherFornecedor}
                                placeholder="Escreva o nome do fornecedor"
                            />
                            <Button asChild variant="outline" size="icon" title="Novo fornecedor">
                                <Link href="/terceiros/novo?natureza=fornecedor" aria-label="Criar novo fornecedor">
                                    <UserPlus className="size-4" />
                                </Link>
                            </Button>
                        </div>
                        <InputError message={errors.terceiro_id} />
                    </LinhaForm>

                    <LinhaForm
                        rotulo={encomenda ? 'Referência do fornecedor' : 'Nº da factura do fornecedor'}
                        htmlFor="ref_fornecedor"
                        obrigatorio={!encomenda}
                        ajuda={
                            encomenda
                                ? 'Nº da proposta ou cotação do fornecedor, se houver.'
                                : 'O número que está na factura que o fornecedor entregou. Não se pode lançar a mesma factura duas vezes.'
                        }
                    >
                        <Input
                            id="ref_fornecedor"
                            value={data.ref_fornecedor}
                            onChange={(e) => setData('ref_fornecedor', e.target.value)}
                            className="max-w-72"
                        />
                        <InputError message={errors.ref_fornecedor} />
                    </LinhaForm>

                    <LinhaForm rotulo={encomenda ? 'Data da encomenda' : 'Data da factura'} htmlFor="data" obrigatorio>
                        <Input id="data" type="date" value={data.data} onChange={(e) => setData('data', e.target.value)} className="max-w-48" />
                        <InputError message={errors.data} />
                    </LinhaForm>

                    {encomenda && (
                        <LinhaForm rotulo="Data prevista de entrega" htmlFor="data_entrega" ajuda="Quando o fornecedor disse que entrega.">
                            <Input
                                id="data_entrega"
                                type="date"
                                value={data.data_entrega}
                                onChange={(e) => setData('data_entrega', e.target.value)}
                                className="max-w-48"
                            />
                            <InputError message={errors.data_entrega} />
                        </LinhaForm>
                    )}

                    <LinhaForm
                        rotulo="Termos de pagamento"
                        htmlFor="termos"
                        obrigatorio
                        ajuda={encomenda ? undefined : 'O vencimento da factura calcula-se a partir da data e destes termos.'}
                    >
                        <select
                            id="termos"
                            value={data.termos_pagamento}
                            onChange={(e) => setData('termos_pagamento', e.target.value)}
                            className={sel}
                        >
                            {opcoes.termosPagamento.map((o) => (
                                <option key={o.valor} value={o.valor}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </LinhaForm>

                    <LinhaForm rotulo="Método de pagamento" htmlFor="metodo">
                        <select
                            id="metodo"
                            value={data.metodo_pagamento}
                            onChange={(e) => setData('metodo_pagamento', e.target.value)}
                            className={sel}
                        >
                            <option value="">—</option>
                            {opcoes.metodosPagamento.map((o) => (
                                <option key={o.valor} value={o.valor}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </LinhaForm>

                    {encomenda && (
                        <LinhaForm rotulo="Nota (pública)" htmlFor="nota_publica" ajuda="Aparece na encomenda impressa enviada ao fornecedor.">
                            <textarea
                                id="nota_publica"
                                rows={3}
                                value={data.nota_publica}
                                onChange={(e) => setData('nota_publica', e.target.value)}
                                className={area}
                            />
                        </LinhaForm>
                    )}

                    <LinhaForm rotulo="Nota (interna)" htmlFor="nota_privada">
                        <textarea
                            id="nota_privada"
                            rows={2}
                            value={data.nota_privada}
                            onChange={(e) => setData('nota_privada', e.target.value)}
                            className={area}
                        />
                    </LinhaForm>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    <Button type="submit" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {d ? 'Guardar' : 'Criar rascunho'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={d ? `${base}/${d.id}` : base}>Cancelar</Link>
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
