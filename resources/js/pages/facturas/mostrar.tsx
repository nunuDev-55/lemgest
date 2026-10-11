import { Confirmar } from '@/components/confirmar';
import {
    Bloco,
    BotoesAccao,
    CabecalhoFicha,
    Campo,
    Campos,
    EstadoFactura,
    ObjectosRelacionados,
    Separadores,
    type Relacionado,
} from '@/components/erp';
import { Escolher } from '@/components/escolher';
import InputError from '@/components/input-error';
import { LinhasDocumento, type LinhaDocumento, type ProdutoVenda } from '@/components/linhas-documento';
import { TabelaEventos, type Evento } from '@/components/tabela-eventos';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatDataHora, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Ban, CheckCircle2, CreditCard, LoaderCircle, MessageCircle, Pencil, Printer, Receipt, ReceiptText, RotateCcw, Trash2 } from 'lucide-react';
import { FormEventHandler, useState } from 'react';
import { type ClienteSelect, type OpcaoSelect } from './criar';

export interface FacturaFicha {
    id: number;
    referencia: string;
    numero: string | null;
    estado: string;
    vencida: boolean;
    data: string;
    data_vencimento: string | null;
    termos_pagamento: string;
    termos_pagamento_nome: string;
    metodo_pagamento: string | null;
    metodo_pagamento_nome: string | null;
    ref_cliente: string | null;
    nota_publica: string | null;
    nota_privada: string | null;
    motivo_abandono: string | null;
    total_sem_iva: string;
    total_iva: string;
    total: string;
    total_pago: string;
    total_creditado: string;
    em_falta: string;
    validada_em: string | null;
    validada_por: string | null;
    terceiro: {
        id: number;
        nome: string;
        codigo_cliente: string | null;
        nuit: string | null;
        morada: string | null;
        cidade: string | null;
        provincia: string | null;
        telefone: string | null;
        telemovel: string | null;
        email: string | null;
    };
    linhas: LinhaDocumento[];
    /** Factura de um aluguer: a reserva e o período */
    aluguer: {
        id: number;
        numero: string;
        data_evento: string;
        data_fim_evento: string;
        data_entrega: string;
        data_recolha: string;
        local: string | null;
    } | null;
    pagamentos: { id: number; numero: string; data: string; metodo: string; numero_documento: string | null; valor: string }[];
}

interface Props {
    factura: FacturaFicha;
    produtos: ProdutoVenda[];
    clientes: ClienteSelect[];
    eventos: Evento[];
    relacionados: Relacionado[];
    /** Quanto ainda se pode creditar e se já há um rascunho de nota de crédito */
    /** activas: a LemServ pode desligar as notas de crédito (config lemgest.notas_credito) */
    notaCredito: { activas: boolean; creditavel: string; rascunho: { id: number; referencia: string } | null; motivos: string[] };
    opcoes: { termosPagamento: OpcaoSelect[]; metodosPagamento: OpcaoSelect[] };
}

/** Número para o WhatsApp: 84 123 4567 → 258841234567 */
function numeroWhatsApp(t: string | null): string | null {
    if (!t) return null;
    const d = t.replace(/\D/g, '');
    if (d.length === 9 && d.startsWith('8')) return `258${d}`;
    return d.length >= 11 ? d : null;
}

export default function FichaFactura({ factura: f, produtos, clientes, eventos, relacionados, notaCredito, opcoes }: Props) {
    const pode = usePode();
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [separador, setSeparador] = useState(() => new URLSearchParams(window.location.search).get('separador') ?? 'factura');
    const [dialogo, setDialogo] = useState<'validar' | 'apagar' | 'modificar' | 'abandonar' | 'nota_credito' | null>(null);
    const temNotasCredito = relacionados.some((r) => r.tipo === 'nota_credito');
    const podeCreditar =
        (notaCredito.activas || notaCredito.rascunho !== null) &&
        (f.estado === 'validada' || f.estado === 'paga') &&
        Number(notaCredito.creditavel) > 0 &&
        pode('facturas.criar');
    const [aProcessar, setAProcessar] = useState(false);

    const rascunho = f.estado === 'rascunho';
    const pendente = f.estado === 'validada';
    const whatsapp = numeroWhatsApp(f.terceiro.telemovel ?? f.terceiro.telefone);
    const textoWhatsApp = encodeURIComponent(
        `Olá ${f.terceiro.nome}, segue a factura ${f.referencia} no valor de ${formatNumero(f.total)} MT, com vencimento a ${formatData(f.data_vencimento)}. Obrigado.`,
    );

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
            <Head title={`${f.referencia} — Factura`} />

            <CabecalhoFicha
                icone={Receipt}
                referencia={f.referencia}
                titulo={
                    <>
                        <Link href={`/terceiros/${f.terceiro.id}`} className="text-primary hover:underline">
                            {f.terceiro.nome}
                        </Link>{' '}
                        <Link
                            href={`/facturas?cliente=${encodeURIComponent(f.terceiro.nome)}`}
                            className="text-muted-foreground text-xs hover:underline"
                        >
                            (outras facturas)
                        </Link>
                    </>
                }
                subtitulo={
                    <>
                        {f.ref_cliente && <>Nº requisição: {f.ref_cliente} · </>}
                        {f.terceiro.nuit ? `NUIT ${f.terceiro.nuit}` : 'Cliente sem NUIT'}
                        {f.validada_em && (
                            <>
                                {' '}
                                · Validada por {f.validada_por} em {formatDataHora(f.validada_em)}
                            </>
                        )}
                    </>
                }
                estado={<EstadoFactura estado={f.estado} vencida={f.vencida} parcial={pendente && Number(f.total_pago) > 0} />}
                voltar={{ href: '/facturas' }}
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
                    { id: 'factura', label: 'Factura' },
                    { id: 'notas', label: 'Notas', contagem: (f.nota_publica ? 1 : 0) + (f.nota_privada ? 1 : 0) },
                    { id: 'eventos', label: 'Eventos', contagem: eventos.length },
                ]}
            />

            {separador === 'factura' && (
                <>
                    <div className="mb-4 grid gap-4 lg:grid-cols-2">
                        <Campos>
                            <Campo rotulo="Tipo">Factura normal</Campo>
                            <Campo rotulo="Data da factura">{formatData(f.data)}</Campo>
                            <Campo rotulo="Termos de pagamento">{f.termos_pagamento_nome}</Campo>
                            <Campo rotulo="Pagamento devido em">
                                <span className={cn(f.vencida && 'font-semibold text-red-600 dark:text-red-400')}>
                                    {formatData(f.data_vencimento)}
                                    {f.vencida && ' (vencida)'}
                                </span>
                            </Campo>
                            <Campo rotulo="Método de pagamento">{f.metodo_pagamento_nome}</Campo>
                            <Campo rotulo="Nº requisição / ordem de compra">{f.ref_cliente}</Campo>
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
                                <Bloco titulo="Pagamentos">
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
                                            {Number(f.total_creditado) > 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-3 py-1.5 text-right">
                                                        Notas de crédito
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatNumero(f.total_creditado)}</td>
                                                </tr>
                                            )}
                                            <tr>
                                                <td colSpan={3} className="px-3 py-1.5 text-right">
                                                    Facturado
                                                </td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">{formatNumero(f.total)}</td>
                                            </tr>
                                            <tr className="bg-muted font-semibold">
                                                <td colSpan={3} className="px-3 py-1.5 text-right">
                                                    Restante a receber
                                                </td>
                                                <td
                                                    className={cn(
                                                        'px-3 py-1.5 text-right tabular-nums',
                                                        Number(f.em_falta) > 0 && pendente && 'text-red-600 dark:text-red-400',
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

                    <LinhasDocumento
                        urlBase={`/facturas/${f.id}`}
                        linhas={f.linhas}
                        produtos={produtos}
                        comDias
                        editavel={rascunho && pode('facturas.criar')}
                    />

                    <BotoesAccao>
                        {pendente && whatsapp && (
                            <Button variant="outline" asChild>
                                <a href={`https://wa.me/${whatsapp}?text=${textoWhatsApp}`} target="_blank" rel="noreferrer">
                                    <MessageCircle className="size-4" />
                                    Enviar por WhatsApp
                                </a>
                            </Button>
                        )}
                        {!rascunho && (
                            <Button variant="outline" asChild>
                                <a href={`/facturas/${f.id}/imprimir`} target="_blank" rel="noreferrer">
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
                                disabled={f.linhas.length === 0}
                                title={f.linhas.length === 0 ? 'Acrescente pelo menos uma linha' : undefined}
                            >
                                <CheckCircle2 className="size-4" />
                                Validar
                            </Button>
                        )}
                        {podeCreditar &&
                            (notaCredito.rascunho ? (
                                <Button variant="outline" asChild>
                                    <Link href={`/notas-credito/${notaCredito.rascunho.id}`}>
                                        <ReceiptText className="size-4" />
                                        Continuar nota de crédito {notaCredito.rascunho.referencia}
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={() => setDialogo('nota_credito')}>
                                    <ReceiptText className="size-4" />
                                    Criar nota de crédito
                                </Button>
                            ))}
                        {pendente && pode('facturas.abandonar') && Number(f.total_pago) === 0 && !temNotasCredito && (
                            <Button variant="outline" onClick={() => setDialogo('abandonar')}>
                                <Ban className="size-4" />
                                Classificar como abandonada
                            </Button>
                        )}
                        {f.estado === 'abandonada' && pode('facturas.abandonar') && (
                            <Button variant="outline" onClick={() => accao(`/facturas/${f.id}/reabrir`)} disabled={aProcessar}>
                                <RotateCcw className="size-4" />
                                Reabrir
                            </Button>
                        )}
                        {pendente && pode('pagamentos.registar') && (
                            <Button asChild>
                                <Link href={`/facturas/${f.id}/pagamento`}>
                                    <CreditCard className="size-4" />
                                    Inserir pagamento
                                </Link>
                            </Button>
                        )}
                    </BotoesAccao>

                    {relacionados.length > 0 && <ObjectosRelacionados itens={relacionados} />}
                </>
            )}

            {separador === 'notas' && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Bloco titulo="Nota pública (aparece na factura)">
                        <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                            {f.nota_publica || <span className="text-muted-foreground italic">Sem nota</span>}
                        </p>
                    </Bloco>
                    <Bloco titulo="Nota interna">
                        <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                            {f.nota_privada || <span className="text-muted-foreground italic">Sem nota</span>}
                        </p>
                    </Bloco>
                </div>
            )}

            {separador === 'eventos' && <TabelaEventos eventos={eventos} />}

            <Confirmar
                aberto={dialogo === 'validar'}
                titulo={`Validar a factura ${f.referencia}?`}
                descricao={`A factura recebe o número definitivo e deixa de poder ser alterada. Total: ${formatNumero(f.total)} MT (IVA incluído).`}
                textoConfirmar="Validar"
                aProcessar={aProcessar}
                onConfirmar={() => accao(`/facturas/${f.id}/validar`)}
                onFechar={() => setDialogo(null)}
            />
            <Confirmar
                aberto={dialogo === 'apagar'}
                titulo={`Eliminar o rascunho ${f.referencia}?`}
                descricao="O rascunho e as suas linhas são apagados. Esta acção não se pode desfazer."
                textoConfirmar="Eliminar"
                perigo
                aProcessar={aProcessar}
                onConfirmar={() => {
                    setAProcessar(true);
                    router.delete(`/facturas/${f.id}`, { onFinish: () => setAProcessar(false) });
                }}
                onFechar={() => setDialogo(null)}
            />
            <Abandonar aberto={dialogo === 'abandonar'} factura={f} onFechar={() => setDialogo(null)} />
            {podeCreditar && !notaCredito.rascunho && (
                <CriarNotaCredito
                    aberto={dialogo === 'nota_credito'}
                    factura={f}
                    creditavel={notaCredito.creditavel}
                    motivos={notaCredito.motivos}
                    onFechar={() => setDialogo(null)}
                />
            )}
            {rascunho && (
                <Modificar aberto={dialogo === 'modificar'} factura={f} clientes={clientes} opcoes={opcoes} onFechar={() => setDialogo(null)} />
            )}
        </AppLayout>
    );
}

/** "Criar nota de crédito": pede o motivo e se copia as linhas da factura (como a opção do Dolibarr) */
function CriarNotaCredito({
    aberto,
    factura,
    creditavel,
    motivos,
    onFechar,
}: {
    aberto: boolean;
    factura: FacturaFicha;
    creditavel: string;
    motivos: string[];
    onFechar: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm<{ motivo: string; copiar_linhas: boolean }>({ motivo: '', copiar_linhas: true });
    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post(`/facturas/${factura.id}/nota-credito`);
    };

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Nota de crédito para {factura.referencia}</DialogTitle>
                    <DialogDescription>
                        Corrige esta factura no todo ou em parte. Pode creditar até {formatNumero(creditavel)} MT. A nota nasce em rascunho, para
                        ajustar as linhas antes de validar.
                    </DialogDescription>
                </DialogHeader>
                <form id="form-nota-credito" onSubmit={submeter} className="grid gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="nc-motivo">Motivo</Label>
                        <Input
                            id="nc-motivo"
                            list="nc-motivos"
                            value={data.motivo}
                            onChange={(e) => setData('motivo', e.target.value)}
                            placeholder="Escolha ou escreva o motivo"
                            autoFocus
                        />
                        <datalist id="nc-motivos">
                            {motivos.map((m) => (
                                <option key={m} value={m} />
                            ))}
                        </datalist>
                        <InputError message={errors.motivo} />
                    </div>
                    <label className="flex items-start gap-2 text-[13px]">
                        <Checkbox checked={data.copiar_linhas} onCheckedChange={(v) => setData('copiar_linhas', v === true)} className="mt-0.5" />
                        <span>
                            Copiar todas as linhas da factura
                            <span className="text-muted-foreground block text-xs">
                                Desmarque para creditar só um valor (por exemplo, um desconto) com uma linha nova.
                            </span>
                        </span>
                    </label>
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-nota-credito" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Criar rascunho
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Abandonar({ aberto, factura, onFechar }: { aberto: boolean; factura: FacturaFicha; onFechar: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({ motivo: '' });
    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post(`/facturas/${factura.id}/abandonar`, {
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
                    <DialogTitle>Classificar {factura.referencia} como abandonada</DialogTitle>
                    <DialogDescription>A factura deixa de contar como valor a receber. Pode ser reaberta mais tarde.</DialogDescription>
                </DialogHeader>
                <form id="form-abandonar" onSubmit={submeter} className="grid gap-2">
                    <Label htmlFor="motivo">Motivo</Label>
                    <textarea
                        id="motivo"
                        rows={3}
                        value={data.motivo}
                        onChange={(e) => setData('motivo', e.target.value)}
                        placeholder="Ex.: o cliente cancelou o evento"
                        className="border-input bg-card w-full rounded-md border px-3 py-2 text-sm"
                    />
                    <InputError message={errors.motivo} />
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-abandonar" variant="destructive" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Classificar como abandonada
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function Modificar({
    aberto,
    factura,
    clientes,
    opcoes,
    onFechar,
}: {
    aberto: boolean;
    factura: FacturaFicha;
    clientes: ClienteSelect[];
    opcoes: { termosPagamento: OpcaoSelect[]; metodosPagamento: OpcaoSelect[] };
    onFechar: () => void;
}) {
    const { data, setData, put, processing, errors } = useForm({
        terceiro_id: String(factura.terceiro.id),
        data: factura.data,
        termos_pagamento: factura.termos_pagamento,
        metodo_pagamento: factura.metodo_pagamento ?? '',
        ref_cliente: factura.ref_cliente ?? '',
        nota_publica: factura.nota_publica ?? '',
        nota_privada: factura.nota_privada ?? '',
    });
    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        put(`/facturas/${factura.id}`, { preserveScroll: true, onSuccess: onFechar });
    };
    const sel = 'border-input bg-card h-9 w-full rounded-md border px-2 text-sm';

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Modificar {factura.referencia}</DialogTitle>
                    <DialogDescription>Só é possível enquanto a factura está em rascunho.</DialogDescription>
                </DialogHeader>
                <form id="form-modificar" onSubmit={submeter} className="grid gap-3">
                    <div className="grid gap-1.5">
                        <Label>Cliente</Label>
                        <Escolher
                            opcoes={clientes.map((c) => ({ valor: String(c.id), label: c.nome, detalhe: c.codigo ?? undefined }))}
                            valor={data.terceiro_id}
                            onChange={(v) => setData('terceiro_id', v ?? '')}
                        />
                        <InputError message={errors.terceiro_id} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="m-data">Data</Label>
                            <Input id="m-data" type="date" value={data.data} onChange={(e) => setData('data', e.target.value)} />
                            <InputError message={errors.data} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="m-ref">Nº requisição</Label>
                            <Input id="m-ref" value={data.ref_cliente} onChange={(e) => setData('ref_cliente', e.target.value)} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="m-termos">Termos de pagamento</Label>
                            <select
                                id="m-termos"
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
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="m-metodo">Método de pagamento</Label>
                            <select
                                id="m-metodo"
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
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="m-np">Nota pública</Label>
                        <textarea
                            id="m-np"
                            rows={2}
                            value={data.nota_publica}
                            onChange={(e) => setData('nota_publica', e.target.value)}
                            className="border-input bg-card rounded-md border px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="m-ni">Nota interna</Label>
                        <textarea
                            id="m-ni"
                            rows={2}
                            value={data.nota_privada}
                            onChange={(e) => setData('nota_privada', e.target.value)}
                            className="border-input bg-card rounded-md border px-3 py-2 text-sm"
                        />
                    </div>
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-modificar" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
