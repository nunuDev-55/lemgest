import { Confirmar } from '@/components/confirmar';
import {
    Bloco,
    BotoesAccao,
    CabecalhoFicha,
    Campo,
    Campos,
    EstadoNotaCredito,
    ObjectosRelacionados,
    Separadores,
    type Relacionado,
} from '@/components/erp';
import InputError from '@/components/input-error';
import { LinhasDocumento, type LinhaDocumento, type ProdutoVenda } from '@/components/linhas-documento';
import { TabelaEventos, type Evento } from '@/components/tabela-eventos';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatDataHora, formatNumero } from '@/lib/format';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Banknote, CheckCircle2, Info, LoaderCircle, Pencil, Printer, ReceiptText, Trash2, TriangleAlert } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Opcao = { valor: string; label: string };

export interface NotaCreditoFicha {
    id: number;
    referencia: string;
    numero: string | null;
    estado: string;
    data: string;
    motivo: string;
    nota_publica: string | null;
    nota_privada: string | null;
    total_sem_iva: string;
    total_iva: string;
    total: string;
    valor_abatido: string;
    valor_reembolso: string;
    reembolsado_em: string | null;
    reembolso_metodo: string | null;
    reembolso_referencia: string | null;
    validada_em: string | null;
    validada_por: string | null;
    factura: { id: number; numero: string; data: string; total: string; em_falta: string; creditavel: string | null };
    terceiro: {
        id: number;
        nome: string;
        codigo_cliente: string | null;
        nuit: string | null;
        morada: string | null;
        cidade: string | null;
        provincia: string | null;
    };
    linhas: LinhaDocumento[];
}

interface Props {
    nota: NotaCreditoFicha;
    produtos: ProdutoVenda[];
    eventos: Evento[];
    relacionados: Relacionado[];
    motivos: string[];
    metodos: Opcao[];
}

const area = 'border-input bg-card w-full rounded-md border px-3 py-2 text-sm';

export default function FichaNotaCredito({ nota: n, produtos, eventos, relacionados, motivos, metodos }: Props) {
    const pode = usePode();
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [separador, setSeparador] = useState('nota');
    const [dialogo, setDialogo] = useState<'validar' | 'apagar' | 'modificar' | 'reembolso' | null>(null);
    const [aProcessar, setAProcessar] = useState(false);

    const rascunho = n.estado === 'rascunho';
    const porReembolsar = n.estado === 'validada' && Number(n.valor_reembolso) > 0;
    const excede = rascunho && n.factura.creditavel !== null && Number(n.total) > Number(n.factura.creditavel);

    function accao(url: string) {
        setAProcessar(true);
        router.post(
            url,
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
            <Head title={`${n.referencia} — Nota de crédito`} />

            <CabecalhoFicha
                icone={ReceiptText}
                referencia={n.referencia}
                titulo={
                    <Link href={`/terceiros/${n.terceiro.id}`} className="text-primary hover:underline">
                        {n.terceiro.nome}
                    </Link>
                }
                subtitulo={
                    <>
                        Corrige a factura{' '}
                        <Link href={`/facturas/${n.factura.id}`} className="text-primary font-medium hover:underline">
                            {n.factura.numero}
                        </Link>{' '}
                        de {formatData(n.factura.data)}
                        {n.validada_em && (
                            <>
                                {' '}
                                · Validada por {n.validada_por} em {formatDataHora(n.validada_em)}
                            </>
                        )}
                    </>
                }
                estado={<EstadoNotaCredito estado={n.estado} />}
                voltar={{ href: '/notas-credito' }}
            />

            {errors.nota && (
                <div
                    role="alert"
                    className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                >
                    {errors.nota}
                </div>
            )}

            <Separadores
                activo={separador}
                onMudar={setSeparador}
                itens={[
                    { id: 'nota', label: 'Nota de crédito' },
                    { id: 'notas', label: 'Notas', contagem: (n.nota_publica ? 1 : 0) + (n.nota_privada ? 1 : 0) },
                    { id: 'eventos', label: 'Eventos', contagem: eventos.length },
                ]}
            />

            {separador === 'nota' && (
                <>
                    <div className="mb-4 grid gap-4 lg:grid-cols-2">
                        <Campos>
                            <Campo rotulo="Tipo">Nota de crédito</Campo>
                            <Campo rotulo="Data">{formatData(n.data)}</Campo>
                            <Campo rotulo="Factura corrigida">
                                <Link href={`/facturas/${n.factura.id}`} className="text-primary hover:underline">
                                    {n.factura.numero}
                                </Link>{' '}
                                <span className="text-muted-foreground">({formatNumero(n.factura.total)} MT)</span>
                            </Campo>
                            <Campo rotulo="Motivo">{n.motivo}</Campo>
                        </Campos>

                        <div className="flex flex-col gap-4">
                            <Campos>
                                <Campo rotulo="Valor (sem IVA)">{formatNumero(n.total_sem_iva)} MT</Campo>
                                <Campo rotulo="Montante do IVA">{formatNumero(n.total_iva)} MT</Campo>
                                <Campo rotulo="Montante a creditar (IVA inc.)" destaque>
                                    {formatNumero(n.total)} MT
                                </Campo>
                            </Campos>

                            {rascunho && n.factura.creditavel !== null && (
                                <div
                                    className={
                                        excede
                                            ? 'flex gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-[13px] text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
                                            : 'painel text-muted-foreground flex gap-2 p-3 text-[13px]'
                                    }
                                >
                                    {excede ? (
                                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                                    ) : (
                                        <Info className="text-primary mt-0.5 size-4 shrink-0" />
                                    )}
                                    <p>
                                        Ainda se pode creditar até <strong>{formatNumero(n.factura.creditavel)} MT</strong> nesta factura
                                        {Number(n.factura.em_falta) > 0 && <> (faltam pagar {formatNumero(n.factura.em_falta)} MT)</>}.{' '}
                                        {excede
                                            ? 'Reduza as quantidades ou os preços antes de validar.'
                                            : 'Ao validar, o valor abate primeiro no que falta pagar; o resto fica para reembolsar ao cliente.'}
                                    </p>
                                </div>
                            )}

                            {!rascunho && (
                                <Bloco titulo="Aplicação do crédito">
                                    <table className="tabela">
                                        <tbody>
                                            <tr>
                                                <td>Abatido na factura {n.factura.numero}</td>
                                                <td className="text-right tabular-nums">{formatNumero(n.valor_abatido)}</td>
                                            </tr>
                                            <tr>
                                                <td>A reembolsar ao cliente</td>
                                                <td className="text-right tabular-nums">{formatNumero(n.valor_reembolso)}</td>
                                            </tr>
                                            {n.reembolsado_em && (
                                                <tr>
                                                    <td colSpan={2} className="text-muted-foreground">
                                                        Reembolsado em {formatData(n.reembolsado_em)} por {n.reembolso_metodo}
                                                        {n.reembolso_referencia && <> · {n.reembolso_referencia}</>}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </Bloco>
                            )}
                        </div>
                    </div>

                    <LinhasDocumento
                        urlBase={`/notas-credito/${n.id}`}
                        linhas={n.linhas}
                        produtos={produtos}
                        comDias
                        editavel={rascunho && pode('facturas.criar')}
                    />

                    <BotoesAccao>
                        {!rascunho && (
                            <Button variant="outline" asChild>
                                <a href={`/notas-credito/${n.id}/imprimir`} target="_blank" rel="noreferrer">
                                    <Printer className="size-4" />
                                    Imprimir / PDF
                                </a>
                            </Button>
                        )}
                        {rascunho && pode('facturas.criar') && (
                            <>
                                <Button variant="outline" onClick={() => setDialogo('modificar')}>
                                    <Pencil className="size-4" />
                                    Modificar
                                </Button>
                                <Button variant="outline" onClick={() => setDialogo('apagar')} className="hover:text-destructive">
                                    <Trash2 className="size-4" />
                                    Eliminar
                                </Button>
                            </>
                        )}
                        {rascunho && pode('facturas.validar') && (
                            <Button
                                onClick={() => setDialogo('validar')}
                                disabled={n.linhas.length === 0 || excede}
                                title={
                                    n.linhas.length === 0
                                        ? 'Acrescente pelo menos uma linha'
                                        : excede
                                          ? 'O total passa do que se pode creditar'
                                          : undefined
                                }
                            >
                                <CheckCircle2 className="size-4" />
                                Validar
                            </Button>
                        )}
                        {porReembolsar && pode('pagamentos.registar') && (
                            <Button onClick={() => setDialogo('reembolso')}>
                                <Banknote className="size-4" />
                                Registar reembolso
                            </Button>
                        )}
                    </BotoesAccao>

                    <ObjectosRelacionados itens={relacionados} />
                </>
            )}

            {separador === 'notas' && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Bloco titulo="Nota pública (aparece no documento)">
                        <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                            {n.nota_publica || <span className="text-muted-foreground italic">Sem nota</span>}
                        </p>
                    </Bloco>
                    <Bloco titulo="Nota interna">
                        <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                            {n.nota_privada || <span className="text-muted-foreground italic">Sem nota</span>}
                        </p>
                    </Bloco>
                </div>
            )}

            {separador === 'eventos' && <TabelaEventos eventos={eventos} />}

            <Confirmar
                aberto={dialogo === 'validar'}
                titulo={`Validar a nota de crédito ${n.referencia}?`}
                descricao={`Recebe o número definitivo, deixa de poder ser alterada e credita ${formatNumero(n.total)} MT na factura ${n.factura.numero}.`}
                textoConfirmar="Validar"
                aProcessar={aProcessar}
                onConfirmar={() => accao(`/notas-credito/${n.id}/validar`)}
                onFechar={() => setDialogo(null)}
            />
            <Confirmar
                aberto={dialogo === 'apagar'}
                titulo={`Eliminar o rascunho ${n.referencia}?`}
                descricao="O rascunho e as suas linhas são apagados. A factura não é alterada."
                textoConfirmar="Eliminar"
                perigo
                aProcessar={aProcessar}
                onConfirmar={() => {
                    setAProcessar(true);
                    router.delete(`/notas-credito/${n.id}`, { onFinish: () => setAProcessar(false) });
                }}
                onFechar={() => setDialogo(null)}
            />
            {rascunho && <Modificar aberto={dialogo === 'modificar'} nota={n} motivos={motivos} onFechar={() => setDialogo(null)} />}
            {porReembolsar && <Reembolso aberto={dialogo === 'reembolso'} nota={n} metodos={metodos} onFechar={() => setDialogo(null)} />}
        </AppLayout>
    );
}

function Modificar({ aberto, nota, motivos, onFechar }: { aberto: boolean; nota: NotaCreditoFicha; motivos: string[]; onFechar: () => void }) {
    const { data, setData, put, processing, errors } = useForm({
        data: nota.data,
        motivo: nota.motivo,
        nota_publica: nota.nota_publica ?? '',
        nota_privada: nota.nota_privada ?? '',
    });
    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        put(`/notas-credito/${nota.id}`, { preserveScroll: true, onSuccess: onFechar });
    };

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Modificar {nota.referencia}</DialogTitle>
                    <DialogDescription>Só é possível enquanto a nota de crédito está em rascunho.</DialogDescription>
                </DialogHeader>
                <form id="form-modificar-nc" onSubmit={submeter} className="grid gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="nc-data">Data</Label>
                        <Input id="nc-data" type="date" value={data.data} onChange={(e) => setData('data', e.target.value)} className="max-w-48" />
                        <InputError message={errors.data} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="nc-motivo">Motivo</Label>
                        <Input id="nc-motivo" list="nc-motivos" value={data.motivo} onChange={(e) => setData('motivo', e.target.value)} />
                        <datalist id="nc-motivos">
                            {motivos.map((m) => (
                                <option key={m} value={m} />
                            ))}
                        </datalist>
                        <InputError message={errors.motivo} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="nc-np">Nota pública</Label>
                        <textarea
                            id="nc-np"
                            rows={2}
                            value={data.nota_publica}
                            onChange={(e) => setData('nota_publica', e.target.value)}
                            className={area}
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="nc-ni">Nota interna</Label>
                        <textarea
                            id="nc-ni"
                            rows={2}
                            value={data.nota_privada}
                            onChange={(e) => setData('nota_privada', e.target.value)}
                            className={area}
                        />
                    </div>
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-modificar-nc" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Reembolso({ aberto, nota, metodos, onFechar }: { aberto: boolean; nota: NotaCreditoFicha; metodos: Opcao[]; onFechar: () => void }) {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data, setData, post, processing, errors } = useForm({ data: hoje, metodo: 'mpesa', referencia: '' });
    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post(`/notas-credito/${nota.id}/reembolso`, { preserveScroll: true, onSuccess: onFechar });
    };

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Registar reembolso de {formatNumero(nota.valor_reembolso)} MT</DialogTitle>
                    <DialogDescription>Devolução ao cliente {nota.terceiro.nome}. A nota de crédito fica fechada.</DialogDescription>
                </DialogHeader>
                <form id="form-reembolso" onSubmit={submeter} className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="r-data">Data</Label>
                            <Input id="r-data" type="date" value={data.data} max={hoje} onChange={(e) => setData('data', e.target.value)} />
                            <InputError message={errors.data} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="r-metodo">Método</Label>
                            <select
                                id="r-metodo"
                                value={data.metodo}
                                onChange={(e) => setData('metodo', e.target.value)}
                                className="border-input bg-card h-9 w-full rounded-md border px-2 text-sm"
                            >
                                {metodos.map((m) => (
                                    <option key={m.valor} value={m.valor}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.metodo} />
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="r-ref">Referência (nº da transacção ou do cheque)</Label>
                        <Input id="r-ref" value={data.referencia} onChange={(e) => setData('referencia', e.target.value)} />
                        <InputError message={errors.referencia} />
                    </div>
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-reembolso" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Registar reembolso
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
