import { LinhaForm, TituloPagina } from '@/components/erp';
import { Escolher } from '@/components/escolher';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FileSignature, LoaderCircle, PackageCheck, UserPlus } from 'lucide-react';
import { FormEventHandler } from 'react';

type Opcao = { valor: string; label: string };

export interface ClienteDoc {
    id: number;
    nome: string;
    codigo: string | null;
    termos_pagamento: string;
    metodo_pagamento: string | null;
}

export interface PropsFormularioDocumento {
    documento: {
        id: number;
        referencia: string;
        terceiro_id: number;
        data: string;
        validade_dias?: number;
        data_entrega: string | null;
        termos_pagamento: string;
        metodo_pagamento: string | null;
        ref_cliente: string | null;
        nota_publica: string | null;
        nota_privada: string | null;
    } | null;
    clientes: ClienteDoc[];
    clienteId: number | null;
    hoje: string;
    /** Validade dos orçamentos novos (Configuração → Documentos) */
    validadeOmissao?: number;
    opcoes: { termosPagamento: Opcao[]; metodosPagamento: Opcao[] };
}

const sel = 'border-input bg-card focus-visible:ring-ring h-9 w-full max-w-72 rounded-md border px-2 text-sm outline-none focus-visible:ring-2';
const area = 'border-input bg-card focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2';

/** Cabeçalho de um orçamento ou de uma encomenda (criar e modificar), com os campos do Dolibarr. */
export function FormularioDocumento({
    tipo,
    documento: d,
    clientes,
    clienteId,
    hoje,
    validadeOmissao,
    opcoes,
}: PropsFormularioDocumento & { tipo: 'orcamento' | 'encomenda' }) {
    const orcamento = tipo === 'orcamento';
    const base = orcamento ? '/orcamentos' : '/encomendas';
    const inicial = clientes.find((c) => c.id === (d?.terceiro_id ?? clienteId));

    const { data, setData, post, put, processing, errors, transform } = useForm({
        terceiro_id: inicial ? String(inicial.id) : '',
        data: d?.data ?? hoje,
        validade_dias: String(d?.validade_dias ?? validadeOmissao ?? 30),
        data_entrega: d?.data_entrega ?? '',
        termos_pagamento: d?.termos_pagamento ?? inicial?.termos_pagamento ?? 'pronto',
        metodo_pagamento: d?.metodo_pagamento ?? inicial?.metodo_pagamento ?? '',
        ref_cliente: d?.ref_cliente ?? '',
        nota_publica: d?.nota_publica ?? '',
        nota_privada: d?.nota_privada ?? '',
    });

    function escolherCliente(valor: string | null) {
        const c = clientes.find((x) => String(x.id) === valor);
        setData((v) => ({
            ...v,
            terceiro_id: valor ?? '',
            termos_pagamento: c?.termos_pagamento ?? v.termos_pagamento,
            metodo_pagamento: c?.metodo_pagamento ?? v.metodo_pagamento,
        }));
    }

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        // A validade só existe nos orçamentos
        transform(({ validade_dias, ...resto }) => (orcamento ? { ...resto, validade_dias } : resto));
        if (d) put(`${base}/${d.id}`);
        else post(base);
    };

    const titulo = d ? `Modificar ${d.referencia}` : orcamento ? 'Novo orçamento' : 'Nova encomenda de venda';

    return (
        <AppLayout>
            <Head title={titulo} />
            <TituloPagina
                icone={orcamento ? FileSignature : PackageCheck}
                titulo={titulo}
                descricao={d ? undefined : 'Criado em rascunho; acrescenta as linhas e valida no fim.'}
            />

            <form onSubmit={submeter} className="max-w-4xl">
                <div className="painel">
                    <LinhaForm rotulo="Cliente" htmlFor="cliente" obrigatorio>
                        <div className="flex gap-2">
                            <Escolher
                                id="cliente"
                                className="flex-1"
                                opcoes={clientes.map((c) => ({ valor: String(c.id), label: c.nome, detalhe: c.codigo ?? undefined }))}
                                valor={data.terceiro_id || null}
                                onChange={escolherCliente}
                                placeholder="Escreva o nome do cliente"
                            />
                            <Button asChild variant="outline" size="icon" title="Novo cliente">
                                <Link href={`/terceiros/novo?natureza=${orcamento ? 'potencial' : 'cliente'}`} aria-label="Criar novo cliente">
                                    <UserPlus className="size-4" />
                                </Link>
                            </Button>
                        </div>
                        <InputError message={errors.terceiro_id} />
                    </LinhaForm>

                    <LinhaForm rotulo="Data" htmlFor="data" obrigatorio>
                        <Input id="data" type="date" value={data.data} onChange={(e) => setData('data', e.target.value)} className="max-w-48" />
                        <InputError message={errors.data} />
                    </LinhaForm>

                    {orcamento && (
                        <LinhaForm
                            rotulo="Duração da validade"
                            htmlFor="validade"
                            obrigatorio
                            ajuda="Depois desta data o orçamento aberto aparece como expirado."
                        >
                            <div className="flex items-center gap-2">
                                <Input
                                    id="validade"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={data.validade_dias}
                                    onChange={(e) => setData('validade_dias', e.target.value)}
                                    className="max-w-24"
                                />
                                <span className="text-muted-foreground text-[13px]">dias</span>
                            </div>
                            <InputError message={errors.validade_dias} />
                        </LinhaForm>
                    )}

                    <LinhaForm rotulo={orcamento ? 'Data de entrega / do evento' : 'Data prevista de entrega'} htmlFor="data_entrega">
                        <Input
                            id="data_entrega"
                            type="date"
                            value={data.data_entrega}
                            onChange={(e) => setData('data_entrega', e.target.value)}
                            className="max-w-48"
                        />
                        <InputError message={errors.data_entrega} />
                    </LinhaForm>

                    <LinhaForm rotulo="Termos de pagamento" htmlFor="termos" obrigatorio>
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

                    <LinhaForm rotulo="Referência do cliente" htmlFor="ref_cliente" ajuda="Nº do pedido ou da requisição do cliente, se houver.">
                        <Input
                            id="ref_cliente"
                            value={data.ref_cliente}
                            onChange={(e) => setData('ref_cliente', e.target.value)}
                            className="max-w-72"
                        />
                    </LinhaForm>

                    <LinhaForm rotulo="Nota (pública)" htmlFor="nota_publica" ajuda="Aparece no documento impresso.">
                        <textarea
                            id="nota_publica"
                            rows={3}
                            value={data.nota_publica}
                            onChange={(e) => setData('nota_publica', e.target.value)}
                            className={area}
                        />
                    </LinhaForm>

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
