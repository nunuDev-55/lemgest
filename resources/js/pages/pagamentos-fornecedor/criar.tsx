import { LinhaForm, TituloPagina } from '@/components/erp';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatNumero } from '@/lib/format';
import { Head, Link, useForm } from '@inertiajs/react';
import { CreditCard, LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

interface Props {
    factura: {
        id: number;
        referencia: string;
        ref_fornecedor: string;
        data: string;
        data_vencimento: string | null;
        total: string;
        total_pago: string;
        em_falta: string;
        metodo_pagamento: string | null;
        fornecedor: string;
    };
    hoje: string;
    metodos: { valor: string; label: string }[];
}

export default function NovoPagamentoFornecedor({ factura: f, hoje, metodos }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        data: hoje,
        metodo: f.metodo_pagamento ?? 'transferencia',
        numero_documento: '',
        comentario: '',
        valor: Number(f.em_falta).toFixed(2).replace('.', ','),
    });

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post(`/facturas-fornecedor/${f.id}/pagamento`);
    };
    const sel = 'border-input bg-card h-9 w-full max-w-72 rounded-md border px-2 text-sm';

    return (
        <AppLayout>
            <Head title="Registar pagamento a fornecedor" />
            <TituloPagina icone={CreditCard} titulo="Registar pagamento a fornecedor" />

            <form onSubmit={submeter} className="max-w-4xl">
                <div className="painel">
                    <LinhaForm rotulo="Fornecedor">
                        <p className="pt-2 text-[13px] font-medium">{f.fornecedor}</p>
                    </LinhaForm>
                    <LinhaForm rotulo="Data" htmlFor="data" obrigatorio>
                        <Input
                            id="data"
                            type="date"
                            value={data.data}
                            max={hoje}
                            onChange={(e) => setData('data', e.target.value)}
                            className="max-w-48"
                        />
                        <InputError message={errors.data} />
                    </LinhaForm>
                    <LinhaForm rotulo="Método de pagamento" htmlFor="metodo" obrigatorio>
                        <select id="metodo" value={data.metodo} onChange={(e) => setData('metodo', e.target.value)} className={sel}>
                            {metodos.map((m) => (
                                <option key={m.valor} value={m.valor}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.metodo} />
                    </LinhaForm>
                    <LinhaForm
                        rotulo="Número"
                        htmlFor="numero_documento"
                        ajuda="Nº do cheque, da transferência ou o código da transacção M-Pesa / e-Mola."
                    >
                        <Input
                            id="numero_documento"
                            value={data.numero_documento}
                            onChange={(e) => setData('numero_documento', e.target.value)}
                            className="max-w-72"
                        />
                    </LinhaForm>
                    <LinhaForm rotulo="Comentários" htmlFor="comentario">
                        <textarea
                            id="comentario"
                            rows={2}
                            value={data.comentario}
                            onChange={(e) => setData('comentario', e.target.value)}
                            className="border-input bg-card w-full rounded-md border px-3 py-2 text-sm"
                        />
                    </LinhaForm>
                </div>

                <div className="painel mt-4 overflow-x-auto">
                    <table className="tabela">
                        <thead>
                            <tr>
                                <th>Factura</th>
                                <th>Nº do fornecedor</th>
                                <th>Vencimento</th>
                                <th className="text-right">Montante (IVA inc.)</th>
                                <th className="text-right">Já pago</th>
                                <th className="text-right">Restante</th>
                                <th className="text-right">Montante a pagar</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="font-semibold">{f.referencia}</td>
                                <td>{f.ref_fornecedor}</td>
                                <td>{formatData(f.data_vencimento)}</td>
                                <td className="text-right tabular-nums">{formatNumero(f.total)}</td>
                                <td className="text-right tabular-nums">{formatNumero(f.total_pago)}</td>
                                <td className="text-right font-medium tabular-nums">{formatNumero(f.em_falta)}</td>
                                <td className="w-44 text-right">
                                    <Input
                                        value={data.valor}
                                        onChange={(e) => setData('valor', e.target.value)}
                                        inputMode="decimal"
                                        className="h-8 text-right"
                                        aria-label="Montante a pagar"
                                    />
                                    <InputError message={errors.valor} />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <p className="text-muted-foreground px-3 py-2 text-xs">
                        Quando o pagamento cobre todo o restante, a factura passa automaticamente a “Paga”.
                    </p>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    <Button type="submit" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Registar pagamento
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={`/facturas-fornecedor/${f.id}`}>Cancelar</Link>
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
