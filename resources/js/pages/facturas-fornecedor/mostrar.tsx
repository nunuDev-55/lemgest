import { Confirmar } from '@/components/confirmar';
import {
    Bloco,
    BotoesAccao,
    CabecalhoFicha,
    Campo,
    Campos,
    EstadoFacturaFornecedor,
    ObjectosRelacionados,
    Separadores,
    type Relacionado,
} from '@/components/erp';
import InputError from '@/components/input-error';
import { LinhasDocumento, type LinhaDocumento, type ProdutoVenda } from '@/components/linhas-documento';
import { TabelaEventos, type Evento } from '@/components/tabela-eventos';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatDataHora, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Ban, CheckCircle2, CreditCard, FileInput, LoaderCircle, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Props {
    factura: {
        id: number;
        referencia: string;
        numero: string | null;
        ref_fornecedor: string;
        estado: string;
        vencida: boolean;
        data: string;
        data_vencimento: string | null;
        termos_pagamento_nome: string;
        metodo_pagamento_nome: string | null;
        nota_privada: string | null;
        motivo_abandono: string | null;
        total_sem_iva: string;
        total_iva: string;
        total: string;
        total_pago: string;
        em_falta: string;
        validada_em: string | null;
        validada_por: string | null;
        terceiro: { id: number; nome: string; codigo_fornecedor: string | null; nuit: string | null };
        linhas: LinhaDocumento[];
        pagamentos: { id: number; numero: string; data: string; metodo: string; numero_documento: string | null; valor: string }[];
    };
    relacionados: Relacionado[];
    produtos: ProdutoVenda[];
    eventos: Evento[];
}

export default function FichaFacturaFornecedor({ factura: f, relacionados, produtos, eventos }: Props) {
    const pode = usePode();
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [separador, setSeparador] = useState('factura');
    const [dialogo, setDialogo] = useState<'validar' | 'apagar' | 'abandonar' | null>(null);
    const [aProcessar, setAProcessar] = useState(false);
    const url = `/facturas-fornecedor/${f.id}`;
    const rascunho = f.estado === 'rascunho';
    const porPagar = f.estado === 'validada';

    function accao(caminho: string) {
        setAProcessar(true);
        router.post(
            `${url}/${caminho}`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setAProcessar(false);
                    setDialogo(null);
                },
            },
        );
    }

    return (
        <AppLayout>
            <Head title={`${f.referencia} — Factura de fornecedor`} />
            <CabecalhoFicha
                icone={FileInput}
                referencia={f.referencia}
                titulo={
                    <>
                        <Link href={`/terceiros/${f.terceiro.id}?separador=fornecedor`} className="text-primary hover:underline">
                            {f.terceiro.nome}
                        </Link>{' '}
                        <span className="text-muted-foreground text-xs">· factura nº {f.ref_fornecedor}</span>
                    </>
                }
                subtitulo={
                    <>
                        {f.terceiro.nuit ? `NUIT ${f.terceiro.nuit}` : 'Fornecedor sem NUIT'}
                        {f.validada_em && (
                            <>
                                {' '}
                                · Validada por {f.validada_por} em {formatDataHora(f.validada_em)}
                            </>
                        )}
                    </>
                }
                estado={<EstadoFacturaFornecedor estado={f.estado} vencida={f.vencida} parcial={porPagar && Number(f.total_pago) > 0} />}
                voltar={{ href: '/facturas-fornecedor' }}
            />

            {(errors.factura || errors.valor) && (
                <div
                    role="alert"
                    className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                >
                    {errors.factura || errors.valor}
                </div>
            )}

            <Separadores
                activo={separador}
                onMudar={setSeparador}
                itens={[
                    { id: 'factura', label: 'Factura de fornecedor' },
                    { id: 'notas', label: 'Notas', contagem: f.nota_privada ? 1 : 0 },
                    { id: 'eventos', label: 'Eventos', contagem: eventos.length },
                ]}
            />

            {separador === 'factura' && (
                <>
                    <div className="mb-4 grid gap-4 lg:grid-cols-2">
                        <Campos>
                            <Campo rotulo="Nº da factura do fornecedor" destaque>
                                {f.ref_fornecedor}
                            </Campo>
                            <Campo rotulo="Data da factura">{formatData(f.data)}</Campo>
                            <Campo rotulo="Termos de pagamento">{f.termos_pagamento_nome}</Campo>
                            <Campo rotulo="Pagar até">
                                <span className={cn(f.vencida && 'font-semibold text-red-600 dark:text-red-400')}>
                                    {formatData(f.data_vencimento)}
                                    {f.vencida && ' (vencida)'}
                                </span>
                            </Campo>
                            <Campo rotulo="Método de pagamento">{f.metodo_pagamento_nome}</Campo>
                            {f.motivo_abandono && <Campo rotulo="Motivo do abandono">{f.motivo_abandono}</Campo>}
                        </Campos>

                        <div className="flex flex-col gap-4">
                            <Campos>
                                <Campo rotulo="Valor (sem IVA)">{formatNumero(f.total_sem_iva)} MT</Campo>
                                <Campo rotulo="Montante do IVA">{formatNumero(f.total_iva)} MT</Campo>
                                <Campo rotulo="Montante (IVA inc.)" destaque>
                                    {formatNumero(f.total)} MT
                                </Campo>
                            </Campos>

                            {!rascunho && (
                                <Bloco titulo="Pagamentos ao fornecedor">
                                    <table className="tabela">
                                        <thead>
                                            <tr>
                                                <th>Ref.</th>
                                                <th>Data</th>
                                                <th>Tipo</th>
                                                <th className="text-right">Montante</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {f.pagamentos.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="text-muted-foreground italic">
                                                        Ainda sem pagamentos
                                                    </td>
                                                </tr>
                                            )}
                                            {f.pagamentos.map((p) => (
                                                <tr key={p.id}>
                                                    <td className="font-medium">{p.numero}</td>
                                                    <td className="tabular-nums">{formatData(p.data)}</td>
                                                    <td>
                                                        {p.metodo}
                                                        {p.numero_documento && <span className="text-muted-foreground"> · {p.numero_documento}</span>}
                                                    </td>
                                                    <td className="text-right tabular-nums">{formatNumero(p.valor)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="text-[13px]">
                                            <tr>
                                                <td colSpan={3} className="px-3 py-1.5 text-right">
                                                    Já pago
                                                </td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">{formatNumero(f.total_pago)}</td>
                                            </tr>
                                            <tr className="bg-muted font-semibold">
                                                <td colSpan={3} className="px-3 py-1.5 text-right">
                                                    Restante a pagar
                                                </td>
                                                <td
                                                    className={cn(
                                                        'px-3 py-1.5 text-right tabular-nums',
                                                        porPagar && Number(f.em_falta) > 0 && 'text-red-600 dark:text-red-400',
                                                    )}
                                                >
                                                    {formatNumero(f.estado === 'abandonada' ? '0' : f.em_falta)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </Bloco>
                            )}
                        </div>
                    </div>

                    <LinhasDocumento urlBase={url} linhas={f.linhas} produtos={produtos} editavel={rascunho && pode('compras.criar')} />

                    <BotoesAccao>
                        {rascunho && pode('compras.criar') && (
                            <>
                                <Button variant="outline" asChild>
                                    <Link href={`${url}/editar`}>
                                        <Pencil className="size-4" />
                                        Modificar
                                    </Link>
                                </Button>
                                <Button variant="outline" onClick={() => setDialogo('apagar')} className="hover:text-destructive">
                                    <Trash2 className="size-4" />
                                    Eliminar
                                </Button>
                            </>
                        )}
                        {rascunho && pode('compras.validar') && (
                            <Button onClick={() => setDialogo('validar')} disabled={f.linhas.length === 0}>
                                <CheckCircle2 className="size-4" />
                                Validar
                            </Button>
                        )}
                        {porPagar && Number(f.total_pago) === 0 && pode('compras.validar') && (
                            <Button variant="outline" onClick={() => setDialogo('abandonar')}>
                                <Ban className="size-4" />
                                Classificar como abandonada
                            </Button>
                        )}
                        {f.estado === 'abandonada' && pode('compras.validar') && (
                            <Button variant="outline" onClick={() => accao('reabrir')} disabled={aProcessar}>
                                <RotateCcw className="size-4" />
                                Reabrir
                            </Button>
                        )}
                        {porPagar && pode('compras.pagar') && (
                            <Button asChild>
                                <Link href={`${url}/pagamento`}>
                                    <CreditCard className="size-4" />
                                    Registar pagamento
                                </Link>
                            </Button>
                        )}
                    </BotoesAccao>

                    {relacionados.length > 0 && <ObjectosRelacionados itens={relacionados} />}
                </>
            )}

            {separador === 'notas' && (
                <Bloco titulo="Nota interna">
                    <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                        {f.nota_privada || <span className="text-muted-foreground italic">Sem nota</span>}
                    </p>
                </Bloco>
            )}

            {separador === 'eventos' && <TabelaEventos eventos={eventos} />}

            <Confirmar
                aberto={dialogo === 'validar'}
                titulo={`Validar a factura ${f.ref_fornecedor} de ${f.terceiro.nome}?`}
                descricao={`Recebe o número interno e fica por pagar até ${formatData(f.data_vencimento)}. Total: ${formatNumero(f.total)} MT (IVA incluído). Confirme que as linhas batem com o documento do fornecedor.`}
                textoConfirmar="Validar"
                aProcessar={aProcessar}
                onConfirmar={() => accao('validar')}
                onFechar={() => setDialogo(null)}
            />
            <Confirmar
                aberto={dialogo === 'apagar'}
                titulo={`Eliminar o rascunho ${f.referencia}?`}
                descricao="O rascunho e as suas linhas são apagados."
                textoConfirmar="Eliminar"
                perigo
                aProcessar={aProcessar}
                onConfirmar={() => router.delete(url)}
                onFechar={() => setDialogo(null)}
            />
            {porPagar && <Abandonar aberto={dialogo === 'abandonar'} url={url} onFechar={() => setDialogo(null)} />}
        </AppLayout>
    );
}

function Abandonar({ aberto, url, onFechar }: { aberto: boolean; url: string; onFechar: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({ motivo: '' });
    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post(`${url}/abandonar`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onFechar();
            },
        });
    };

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Classificar como abandonada</DialogTitle>
                    <DialogDescription>A factura deixa de contar como valor a pagar. Pode ser reaberta mais tarde.</DialogDescription>
                </DialogHeader>
                <form id="form-abandonar-ff" onSubmit={submeter} className="grid gap-2">
                    <Label htmlFor="motivo-ff">Motivo</Label>
                    <textarea
                        id="motivo-ff"
                        rows={3}
                        value={data.motivo}
                        onChange={(e) => setData('motivo', e.target.value)}
                        placeholder="Ex.: o fornecedor anulou a factura"
                        className="border-input bg-card w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <InputError message={errors.motivo} />
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-abandonar-ff" variant="destructive" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Classificar como abandonada
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
