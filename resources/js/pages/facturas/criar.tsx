import { LinhaForm, TituloPagina } from '@/components/erp';
import { Escolher } from '@/components/escolher';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FilePlus2, LoaderCircle, UserPlus } from 'lucide-react';
import { FormEventHandler } from 'react';

export interface OpcaoSelect {
    valor: string;
    label: string;
}

export interface ClienteSelect {
    id: number;
    nome: string;
    codigo: string | null;
    termos_pagamento: string;
    metodo_pagamento: string | null;
}

interface Props {
    clientes: ClienteSelect[];
    clienteId: number | null;
    hoje: string;
    opcoes: { termosPagamento: OpcaoSelect[]; metodosPagamento: OpcaoSelect[] };
}

export default function NovaFactura({ clientes, clienteId, hoje, opcoes }: Props) {
    const inicial = clientes.find((c) => c.id === clienteId);
    const { data, setData, post, processing, errors } = useForm({
        terceiro_id: inicial ? String(inicial.id) : '',
        data: hoje,
        termos_pagamento: inicial?.termos_pagamento ?? 'pronto',
        metodo_pagamento: inicial?.metodo_pagamento ?? '',
        ref_cliente: '',
        nota_publica: '',
        nota_privada: '',
    });

    function escolherCliente(valor: string | null) {
        const c = clientes.find((x) => String(x.id) === valor);
        // Como no Dolibarr: os termos e o método de pagamento do cliente passam para a factura
        setData((d) => ({
            ...d,
            terceiro_id: valor ?? '',
            termos_pagamento: c?.termos_pagamento ?? d.termos_pagamento,
            metodo_pagamento: c?.metodo_pagamento ?? d.metodo_pagamento,
        }));
    }

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post('/facturas');
    };

    return (
        <AppLayout>
            <Head title="Nova factura" />
            <TituloPagina icone={FilePlus2} titulo="Nova factura" descricao="A factura é criada em rascunho; acrescenta as linhas e valida no fim." />

            <form onSubmit={submeter}>
                <div className="painel max-w-4xl">
                    <LinhaForm rotulo="Cliente" htmlFor="cliente" obrigatorio>
                        <div className="flex gap-2">
                            <Escolher
                                id="cliente"
                                className="flex-1"
                                opcoes={clientes.map((c) => ({ valor: String(c.id), label: c.nome, detalhe: c.codigo ?? undefined }))}
                                valor={data.terceiro_id || null}
                                onChange={escolherCliente}
                                placeholder="Escreva o nome do cliente"
                                vazio="Nenhum cliente com esse nome"
                            />
                            <Button asChild variant="outline" size="icon" title="Novo cliente">
                                <Link href="/terceiros/novo?natureza=cliente" aria-label="Criar novo cliente">
                                    <UserPlus className="size-4" />
                                </Link>
                            </Button>
                        </div>
                        <InputError message={errors.terceiro_id} />
                    </LinhaForm>

                    <LinhaForm rotulo="Tipo">
                        <p className="pt-2 text-[13px]">Factura normal</p>
                    </LinhaForm>

                    <LinhaForm rotulo="Data da factura" htmlFor="data" obrigatorio>
                        <Input id="data" type="date" value={data.data} onChange={(e) => setData('data', e.target.value)} className="max-w-48" />
                        <InputError message={errors.data} />
                    </LinhaForm>

                    <LinhaForm rotulo="Termos de pagamento" htmlFor="termos" obrigatorio>
                        <Select value={data.termos_pagamento} onValueChange={(v) => setData('termos_pagamento', v)}>
                            <SelectTrigger id="termos" className="max-w-72">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {opcoes.termosPagamento.map((o) => (
                                    <SelectItem key={o.valor} value={o.valor}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.termos_pagamento} />
                    </LinhaForm>

                    <LinhaForm rotulo="Método de pagamento" htmlFor="metodo">
                        <Select value={data.metodo_pagamento || 'nenhum'} onValueChange={(v) => setData('metodo_pagamento', v === 'nenhum' ? '' : v)}>
                            <SelectTrigger id="metodo" className="max-w-72">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="nenhum">—</SelectItem>
                                {opcoes.metodosPagamento.map((o) => (
                                    <SelectItem key={o.valor} value={o.valor}>
                                        {o.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </LinhaForm>

                    <LinhaForm
                        rotulo="Nº requisição / ordem de compra"
                        htmlFor="ref_cliente"
                        ajuda="Referência do documento do cliente; aparece impressa na factura."
                    >
                        <Input
                            id="ref_cliente"
                            value={data.ref_cliente}
                            onChange={(e) => setData('ref_cliente', e.target.value)}
                            className="max-w-72"
                        />
                        <InputError message={errors.ref_cliente} />
                    </LinhaForm>

                    <LinhaForm rotulo="Nota (pública)" htmlFor="nota_publica" ajuda="Aparece na factura impressa.">
                        <textarea
                            id="nota_publica"
                            rows={3}
                            value={data.nota_publica}
                            onChange={(e) => setData('nota_publica', e.target.value)}
                            className="border-input bg-card focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                        />
                    </LinhaForm>

                    <LinhaForm rotulo="Nota (interna)" htmlFor="nota_privada" ajuda="Só visível dentro do LemGest.">
                        <textarea
                            id="nota_privada"
                            rows={3}
                            value={data.nota_privada}
                            onChange={(e) => setData('nota_privada', e.target.value)}
                            className="border-input bg-card focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                        />
                    </LinhaForm>
                </div>

                <div className="mt-4 flex max-w-4xl justify-center gap-2">
                    <Button type="submit" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Criar rascunho
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href="/facturacao">Cancelar</Link>
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
