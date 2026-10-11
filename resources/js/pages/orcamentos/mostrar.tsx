import { Confirmar } from '@/components/confirmar';
import {
    Bloco,
    BotoesAccao,
    CabecalhoFicha,
    Campo,
    Campos,
    EstadoOrcamento,
    ObjectosRelacionados,
    Separadores,
    type Relacionado,
} from '@/components/erp';
import InputError from '@/components/input-error';
import { LinhasDocumento, type LinhaDocumento, type ProdutoVenda } from '@/components/linhas-documento';
import { TabelaEventos } from '@/components/tabela-eventos';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatDataHora, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarPlus,
    CheckCircle2,
    FileSignature,
    FileText,
    LoaderCircle,
    Lock,
    Pencil,
    Printer,
    ReceiptText,
    RotateCcw,
    Trash2,
    Undo2,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface Props {
    documento: {
        id: number;
        referencia: string;
        numero: string | null;
        estado: string;
        data: string;
        validade_dias: number;
        data_fim_validade: string | null;
        expirado: boolean;
        data_entrega: string | null;
        termos_pagamento_nome: string;
        metodo_pagamento_nome: string | null;
        ref_cliente: string | null;
        nota_publica: string | null;
        nota_privada: string | null;
        nota_fecho: string | null;
        total_sem_iva: string;
        total_iva: string;
        total: string;
        validado_em: string | null;
        validado_por: string | null;
        terceiro: { id: number; nome: string; nuit: string | null };
        linhas: LinhaDocumento[];
    };
    relacionados: Relacionado[];
    produtos: ProdutoVenda[];
    eventos: { id: number; data: string; descricao: string; utilizador: string }[];
}

export default function FichaOrcamento({ documento: o, relacionados, produtos, eventos }: Props) {
    const pode = usePode();
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [separador, setSeparador] = useState('orcamento');
    const [dialogo, setDialogo] = useState<'validar' | 'apagar' | 'fechar' | 'reserva' | null>(null);
    const [aProcessar, setAProcessar] = useState(false);
    const url = `/orcamentos/${o.id}`;

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
            <Head title={`${o.referencia} — Orçamento`} />
            <CabecalhoFicha
                icone={FileSignature}
                referencia={o.referencia}
                titulo={
                    <Link href={`/terceiros/${o.terceiro.id}`} className="text-primary hover:underline">
                        {o.terceiro.nome}
                    </Link>
                }
                subtitulo={
                    <>
                        {o.ref_cliente && <>Ref. cliente: {o.ref_cliente} · </>}
                        {o.terceiro.nuit ? `NUIT ${o.terceiro.nuit}` : 'Sem NUIT'}
                        {o.validado_em && (
                            <>
                                {' '}
                                · Validado por {o.validado_por} em {formatDataHora(o.validado_em)}
                            </>
                        )}
                    </>
                }
                estado={<EstadoOrcamento estado={o.estado} expirado={o.expirado} />}
                voltar={{ href: '/orcamentos' }}
            />

            {errors.orcamento && (
                <div
                    role="alert"
                    className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                >
                    {errors.orcamento}
                </div>
            )}

            <Separadores
                activo={separador}
                onMudar={setSeparador}
                itens={[
                    { id: 'orcamento', label: 'Orçamento' },
                    { id: 'notas', label: 'Notas', contagem: (o.nota_publica ? 1 : 0) + (o.nota_privada ? 1 : 0) },
                    { id: 'eventos', label: 'Eventos', contagem: eventos.length },
                ]}
            />

            {separador === 'orcamento' && (
                <>
                    <div className="mb-4 grid gap-4 lg:grid-cols-2">
                        <Campos>
                            <Campo rotulo="Data">{formatData(o.data)}</Campo>
                            <Campo rotulo="Duração da validade">{o.validade_dias} dias</Campo>
                            <Campo rotulo="Válido até">
                                <span className={cn(o.expirado && 'font-semibold text-red-600 dark:text-red-400')}>
                                    {formatData(o.data_fim_validade)}
                                    {o.expirado && ' (expirado)'}
                                </span>
                            </Campo>
                            <Campo rotulo="Data de entrega / do evento">{formatData(o.data_entrega)}</Campo>
                            <Campo rotulo="Termos de pagamento">{o.termos_pagamento_nome}</Campo>
                            <Campo rotulo="Método de pagamento">{o.metodo_pagamento_nome}</Campo>
                            {o.nota_fecho && <Campo rotulo="Nota do fecho">{o.nota_fecho}</Campo>}
                        </Campos>
                        <Campos>
                            <Campo rotulo="Valor (sem IVA)">{formatNumero(o.total_sem_iva)} MT</Campo>
                            <Campo rotulo="Montante do IVA">{formatNumero(o.total_iva)} MT</Campo>
                            <Campo rotulo="Montante (IVA inc.)" destaque>
                                {formatNumero(o.total)} MT
                            </Campo>
                        </Campos>
                    </div>

                    <LinhasDocumento
                        urlBase={url}
                        linhas={o.linhas}
                        produtos={produtos}
                        comDias
                        editavel={o.estado === 'rascunho' && pode('orcamentos.criar')}
                    />

                    <BotoesAccao>
                        {o.estado !== 'rascunho' && (
                            <Button variant="outline" asChild>
                                <a href={`${url}/imprimir`} target="_blank" rel="noreferrer">
                                    <Printer className="size-4" />
                                    Imprimir / PDF
                                </a>
                            </Button>
                        )}
                        {o.estado === 'rascunho' && pode('orcamentos.criar') && (
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
                        {o.estado === 'rascunho' && pode('orcamentos.validar') && (
                            <Button onClick={() => setDialogo('validar')} disabled={o.linhas.length === 0}>
                                <CheckCircle2 className="size-4" />
                                Validar
                            </Button>
                        )}
                        {o.estado === 'aberto' && pode('orcamentos.criar') && (
                            <Button variant="outline" onClick={() => accao('rascunho')} disabled={aProcessar}>
                                <Undo2 className="size-4" />
                                Modificar (voltar a rascunho)
                            </Button>
                        )}
                        {o.estado === 'aberto' && pode('orcamentos.fechar') && (
                            <Button onClick={() => setDialogo('fechar')}>
                                <Lock className="size-4" />
                                Fechar (assinado / não assinado)
                            </Button>
                        )}
                        {(o.estado === 'assinado' || o.estado === 'recusado') && pode('orcamentos.fechar') && (
                            <Button variant="outline" onClick={() => accao('reabrir')} disabled={aProcessar}>
                                <RotateCcw className="size-4" />
                                Reabrir
                            </Button>
                        )}
                        {o.estado === 'assinado' && pode('orcamentos.fechar') && (
                            <Button variant="outline" onClick={() => accao('facturado')} disabled={aProcessar}>
                                <FileText className="size-4" />
                                Classificar como facturado
                            </Button>
                        )}
                        {o.estado === 'assinado' && pode('reservas.criar') && (
                            <Button variant="outline" onClick={() => setDialogo('reserva')}>
                                <CalendarPlus className="size-4" />
                                Criar reserva
                            </Button>
                        )}
                        {o.estado === 'assinado' && pode('facturas.criar') && (
                            <Button onClick={() => accao('factura')} disabled={aProcessar}>
                                <ReceiptText className="size-4" />
                                Criar factura
                            </Button>
                        )}
                    </BotoesAccao>

                    <ObjectosRelacionados itens={relacionados} />
                </>
            )}

            {separador === 'notas' && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Bloco titulo="Nota pública (aparece no orçamento)">
                        <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                            {o.nota_publica || <span className="text-muted-foreground italic">Sem nota</span>}
                        </p>
                    </Bloco>
                    <Bloco titulo="Nota interna">
                        <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                            {o.nota_privada || <span className="text-muted-foreground italic">Sem nota</span>}
                        </p>
                    </Bloco>
                </div>
            )}

            {separador === 'eventos' && <TabelaEventos eventos={eventos} />}

            <Confirmar
                aberto={dialogo === 'validar'}
                titulo={`Validar o orçamento ${o.referencia}?`}
                descricao={`O orçamento recebe o número definitivo e fica aberto para o cliente assinar. Total: ${formatNumero(o.total)} MT (IVA incluído).`}
                textoConfirmar="Validar"
                aProcessar={aProcessar}
                onConfirmar={() => accao('validar')}
                onFechar={() => setDialogo(null)}
            />
            <Confirmar
                aberto={dialogo === 'apagar'}
                titulo={`Eliminar o rascunho ${o.referencia}?`}
                descricao="O rascunho e as suas linhas são apagados."
                textoConfirmar="Eliminar"
                perigo
                aProcessar={aProcessar}
                onConfirmar={() => router.delete(url)}
                onFechar={() => setDialogo(null)}
            />
            <FecharOrcamento aberto={dialogo === 'fechar'} url={url} referencia={o.referencia} onFechar={() => setDialogo(null)} />
            {dialogo === 'reserva' && (
                <CriarReserva url={url} referencia={o.referencia} dataEvento={o.data_entrega} onFechar={() => setDialogo(null)} />
            )}
        </AppLayout>
    );
}

function FecharOrcamento({ aberto, url, referencia, onFechar }: { aberto: boolean; url: string; referencia: string; onFechar: () => void }) {
    const { data, setData, post, processing, errors } = useForm<{ assinado: boolean; nota: string }>({ assinado: true, nota: '' });
    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post(`${url}/fechar`, { preserveScroll: true, onSuccess: onFechar });
    };

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Fechar o orçamento {referencia}</DialogTitle>
                    <DialogDescription>Indique a resposta do cliente.</DialogDescription>
                </DialogHeader>
                <form id="form-fechar" onSubmit={submeter} className="grid gap-3 text-[13px]">
                    {[
                        [true, 'Assinado — o cliente aceitou', 'Pode depois criar a encomenda ou a factura.'],
                        [false, 'Não assinado — o cliente recusou', 'O orçamento fica fechado; pode ser reaberto.'],
                    ].map(([valor, titulo, ajuda]) => (
                        <label
                            key={String(valor)}
                            className={cn('flex cursor-pointer gap-3 rounded-md border p-3', data.assinado === valor && 'border-primary bg-accent')}
                        >
                            <input
                                type="radio"
                                name="assinado"
                                checked={data.assinado === valor}
                                onChange={() => setData('assinado', valor as boolean)}
                                className="mt-0.5 accent-[var(--primary)]"
                            />
                            <span>
                                <span className="block font-semibold">{titulo as string}</span>
                                <span className="text-muted-foreground">{ajuda as string}</span>
                            </span>
                        </label>
                    ))}
                    <label className="grid gap-1.5">
                        <span>Nota (opcional)</span>
                        <textarea
                            rows={2}
                            value={data.nota}
                            onChange={(e) => setData('nota', e.target.value)}
                            className="border-input bg-card rounded-md border px-3 py-2 text-sm"
                        />
                    </label>
                    <InputError message={errors.nota} />
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-fechar" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Orçamento aceite → reserva com as mesmas linhas. Pergunta as datas do evento (entrega e recolha ajustam-se depois na reserva). */
function CriarReserva({
    url,
    referencia,
    dataEvento,
    onFechar,
}: {
    url: string;
    referencia: string;
    dataEvento: string | null;
    onFechar: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm({ data_evento: dataEvento ?? '', data_fim_evento: dataEvento ?? '' });

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post(`${url}/reserva`, { onSuccess: onFechar });
    };

    return (
        <Dialog open onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submeter} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Criar reserva a partir de {referencia}</DialogTitle>
                        <DialogDescription>
                            A reserva fica como pedido, com as mesmas linhas e preços. Depois confirma-se, quando houver material para as datas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <label htmlFor="r-evento" className="text-[13.5px] font-medium">
                            Evento
                        </label>
                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                            <input
                                id="r-evento"
                                type="date"
                                value={data.data_evento}
                                onChange={(e) =>
                                    setData((d) => ({
                                        ...d,
                                        data_evento: e.target.value,
                                        data_fim_evento:
                                            !d.data_fim_evento || d.data_fim_evento < e.target.value ? e.target.value : d.data_fim_evento,
                                    }))
                                }
                                className="border-input bg-card h-9 rounded-md border px-2.5"
                            />
                            <span className="text-muted-foreground">até</span>
                            <input
                                type="date"
                                aria-label="Fim do evento"
                                value={data.data_fim_evento}
                                min={data.data_evento || undefined}
                                onChange={(e) => setData('data_fim_evento', e.target.value)}
                                className="border-input bg-card h-9 rounded-md border px-2.5"
                            />
                        </div>
                        <InputError
                            message={errors.data_evento || errors.data_fim_evento || (errors as Record<string, string | undefined>).orcamento}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onFechar}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing || !data.data_evento}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Criar reserva
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
