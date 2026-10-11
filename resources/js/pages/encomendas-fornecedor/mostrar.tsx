import { Confirmar } from '@/components/confirmar';
import {
    Bloco,
    BotoesAccao,
    CabecalhoFicha,
    Campo,
    Campos,
    EstadoEncomendaFornecedor,
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
import { cn } from '@/lib/utils';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Ban,
    CheckCircle2,
    FileInput,
    FileText,
    LoaderCircle,
    PackageOpen,
    Pencil,
    Printer,
    RotateCcw,
    Send,
    ShoppingCart,
    Trash2,
    Undo2,
} from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Opcao = { valor: string; label: string };

export interface EncomendaFornecedorFicha {
    id: number;
    referencia: string;
    numero: string | null;
    estado: string;
    facturada: boolean;
    atrasada: boolean;
    data: string;
    data_entrega: string | null;
    termos_pagamento_nome: string;
    metodo_pagamento_nome: string | null;
    ref_fornecedor: string | null;
    nota_publica: string | null;
    nota_privada: string | null;
    total_sem_iva: string;
    total_iva: string;
    total: string;
    validada_em: string | null;
    validada_por: string | null;
    encomendada_em: string | null;
    meio_encomenda: string | null;
    recebida_em: string | null;
    terceiro: {
        id: number;
        nome: string;
        codigo_fornecedor: string | null;
        nuit: string | null;
        morada: string | null;
        cidade: string | null;
        provincia: string | null;
    };
    linhas: LinhaDocumento[];
}

interface Props {
    documento: EncomendaFornecedorFicha;
    relacionados: Relacionado[];
    produtos: ProdutoVenda[];
    eventos: Evento[];
    meios: Opcao[];
}

export default function FichaEncomendaFornecedor({ documento: e, relacionados, produtos, eventos, meios }: Props) {
    const pode = usePode();
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [separador, setSeparador] = useState('encomenda');
    const [dialogo, setDialogo] = useState<'validar' | 'apagar' | 'anular' | 'encomendar' | 'factura' | null>(null);
    const [aProcessar, setAProcessar] = useState(false);
    const url = `/encomendas-fornecedor/${e.id}`;
    const enviada = e.estado === 'encomendada' || e.estado === 'recebida';

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
            <Head title={`${e.referencia} — Encomenda a fornecedor`} />
            <CabecalhoFicha
                icone={ShoppingCart}
                referencia={e.referencia}
                titulo={
                    <Link href={`/terceiros/${e.terceiro.id}?separador=fornecedor`} className="text-primary hover:underline">
                        {e.terceiro.nome}
                    </Link>
                }
                subtitulo={
                    <>
                        {e.ref_fornecedor && <>Ref. fornecedor: {e.ref_fornecedor} · </>}
                        {e.terceiro.codigo_fornecedor ?? 'Sem código de fornecedor'}
                        {e.validada_em && (
                            <>
                                {' '}
                                · Validada por {e.validada_por} em {formatDataHora(e.validada_em)}
                            </>
                        )}
                    </>
                }
                estado={<EstadoEncomendaFornecedor estado={e.estado} facturada={e.facturada} atrasada={e.atrasada} />}
                voltar={{ href: '/encomendas-fornecedor' }}
            />

            {(errors.encomenda || errors.ref_fornecedor) && (
                <div
                    role="alert"
                    className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                >
                    {errors.encomenda || errors.ref_fornecedor}
                </div>
            )}

            <Separadores
                activo={separador}
                onMudar={setSeparador}
                itens={[
                    { id: 'encomenda', label: 'Encomenda' },
                    { id: 'notas', label: 'Notas', contagem: (e.nota_publica ? 1 : 0) + (e.nota_privada ? 1 : 0) },
                    { id: 'eventos', label: 'Eventos', contagem: eventos.length },
                ]}
            />

            {separador === 'encomenda' && (
                <>
                    <div className="mb-4 grid gap-4 lg:grid-cols-2">
                        <Campos>
                            <Campo rotulo="Data da encomenda">{formatData(e.data)}</Campo>
                            <Campo rotulo="Entrega prevista">
                                <span className={cn(e.atrasada && 'font-semibold text-red-600 dark:text-red-400')}>
                                    {formatData(e.data_entrega)}
                                    {e.atrasada && ' (atrasada)'}
                                </span>
                            </Campo>
                            <Campo rotulo="Enviada ao fornecedor">
                                {e.encomendada_em ? `${formatData(e.encomendada_em)}${e.meio_encomenda ? ` · ${e.meio_encomenda}` : ''}` : null}
                            </Campo>
                            <Campo rotulo="Recebida em">{e.recebida_em ? formatDataHora(e.recebida_em) : null}</Campo>
                            <Campo rotulo="Termos de pagamento">{e.termos_pagamento_nome}</Campo>
                            <Campo rotulo="Método de pagamento">{e.metodo_pagamento_nome}</Campo>
                            <Campo rotulo="Facturada">{e.facturada ? 'Sim' : 'Não'}</Campo>
                        </Campos>
                        <Campos>
                            <Campo rotulo="Valor (sem IVA)">{formatNumero(e.total_sem_iva)} MT</Campo>
                            <Campo rotulo="Montante do IVA">{formatNumero(e.total_iva)} MT</Campo>
                            <Campo rotulo="Montante (IVA inc.)" destaque>
                                {formatNumero(e.total)} MT
                            </Campo>
                        </Campos>
                    </div>

                    <LinhasDocumento
                        urlBase={url}
                        linhas={e.linhas}
                        produtos={produtos}
                        editavel={e.estado === 'rascunho' && pode('compras.criar')}
                    />

                    <BotoesAccao>
                        {e.estado !== 'rascunho' && (
                            <Button variant="outline" asChild>
                                <a href={`${url}/imprimir`} target="_blank" rel="noreferrer">
                                    <Printer className="size-4" />
                                    Imprimir / PDF
                                </a>
                            </Button>
                        )}
                        {e.estado === 'rascunho' && pode('compras.criar') && (
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
                        {e.estado === 'rascunho' && pode('compras.validar') && (
                            <Button onClick={() => setDialogo('validar')} disabled={e.linhas.length === 0}>
                                <CheckCircle2 className="size-4" />
                                Validar
                            </Button>
                        )}
                        {e.estado === 'validada' && pode('compras.criar') && (
                            <Button variant="outline" onClick={() => accao('rascunho')} disabled={aProcessar}>
                                <Undo2 className="size-4" />
                                Modificar (voltar a rascunho)
                            </Button>
                        )}
                        {(e.estado === 'validada' || e.estado === 'encomendada') && !e.facturada && pode('compras.validar') && (
                            <Button variant="outline" onClick={() => setDialogo('anular')}>
                                <Ban className="size-4" />
                                Anular
                            </Button>
                        )}
                        {(e.estado === 'recebida' || e.estado === 'anulada') && pode('compras.validar') && (
                            <Button variant="outline" onClick={() => accao('reabrir')} disabled={aProcessar}>
                                <RotateCcw className="size-4" />
                                Reabrir
                            </Button>
                        )}
                        {enviada && !e.facturada && pode('compras.criar') && (
                            <Button variant="outline" onClick={() => accao('facturada')} disabled={aProcessar}>
                                <FileText className="size-4" />
                                Classificar como facturada
                            </Button>
                        )}
                        {e.estado === 'validada' && pode('compras.validar') && (
                            <Button onClick={() => setDialogo('encomendar')}>
                                <Send className="size-4" />
                                Encomendar
                            </Button>
                        )}
                        {e.estado === 'encomendada' && pode('compras.receber') && (
                            <Button variant={e.facturada ? 'default' : 'outline'} onClick={() => accao('receber')} disabled={aProcessar}>
                                <PackageOpen className="size-4" />
                                Classificar como recebida
                            </Button>
                        )}
                        {enviada && !e.facturada && pode('compras.criar') && (
                            <Button onClick={() => setDialogo('factura')}>
                                <FileInput className="size-4" />
                                Lançar factura do fornecedor
                            </Button>
                        )}
                    </BotoesAccao>

                    <ObjectosRelacionados itens={relacionados} />
                </>
            )}

            {separador === 'notas' && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Bloco titulo="Nota pública (vai na encomenda impressa)">
                        <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                            {e.nota_publica || <span className="text-muted-foreground italic">Sem nota</span>}
                        </p>
                    </Bloco>
                    <Bloco titulo="Nota interna">
                        <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                            {e.nota_privada || <span className="text-muted-foreground italic">Sem nota</span>}
                        </p>
                    </Bloco>
                </div>
            )}

            {separador === 'eventos' && <TabelaEventos eventos={eventos} />}

            <Confirmar
                aberto={dialogo === 'validar'}
                titulo={`Validar a encomenda ${e.referencia}?`}
                descricao={`A encomenda recebe o número definitivo. Total: ${formatNumero(e.total)} MT (IVA incluído). Depois imprima-a ou envie-a ao fornecedor.`}
                textoConfirmar="Validar"
                aProcessar={aProcessar}
                onConfirmar={() => accao('validar')}
                onFechar={() => setDialogo(null)}
            />
            <Confirmar
                aberto={dialogo === 'anular'}
                titulo={`Anular a encomenda ${e.referencia}?`}
                descricao="A encomenda deixa de contar como pendente. Pode ser reaberta mais tarde."
                textoConfirmar="Anular"
                perigo
                aProcessar={aProcessar}
                onConfirmar={() => accao('anular')}
                onFechar={() => setDialogo(null)}
            />
            <Confirmar
                aberto={dialogo === 'apagar'}
                titulo={`Eliminar o rascunho ${e.referencia}?`}
                descricao="O rascunho e as suas linhas são apagados."
                textoConfirmar="Eliminar"
                perigo
                aProcessar={aProcessar}
                onConfirmar={() => router.delete(url)}
                onFechar={() => setDialogo(null)}
            />
            {e.estado === 'validada' && <Encomendar aberto={dialogo === 'encomendar'} url={url} meios={meios} onFechar={() => setDialogo(null)} />}
            {enviada && !e.facturada && <LancarFactura aberto={dialogo === 'factura'} url={url} encomenda={e} onFechar={() => setDialogo(null)} />}
        </AppLayout>
    );
}

/** "Encomendar": regista quando e como a encomenda foi enviada ao fornecedor */
function Encomendar({ aberto, url, meios, onFechar }: { aberto: boolean; url: string; meios: Opcao[]; onFechar: () => void }) {
    const hoje = new Date().toISOString().slice(0, 10);
    const { data, setData, post, processing, errors } = useForm({ data: hoje, meio: 'whatsapp' });
    const submeter: FormEventHandler = (ev) => {
        ev.preventDefault();
        post(`${url}/encomendar`, { preserveScroll: true, onSuccess: onFechar });
    };

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Encomendar ao fornecedor</DialogTitle>
                    <DialogDescription>Registe quando e como a encomenda foi enviada. A seguir fica à espera de ser recebida.</DialogDescription>
                </DialogHeader>
                <form id="form-encomendar" onSubmit={submeter} className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5">
                        <Label htmlFor="enc-data">Data</Label>
                        <Input id="enc-data" type="date" value={data.data} max={hoje} onChange={(ev) => setData('data', ev.target.value)} />
                        <InputError message={errors.data} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="enc-meio">Meio</Label>
                        <select
                            id="enc-meio"
                            value={data.meio}
                            onChange={(ev) => setData('meio', ev.target.value)}
                            className="border-input bg-card h-9 w-full rounded-md border px-2 text-sm"
                        >
                            {meios.map((m) => (
                                <option key={m.valor} value={m.valor}>
                                    {m.label}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.meio} />
                    </div>
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-encomendar" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Encomendar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** "Lançar factura do fornecedor": cria o rascunho com as linhas da encomenda; pede o nº da factura do fornecedor */
function LancarFactura({
    aberto,
    url,
    encomenda,
    onFechar,
}: {
    aberto: boolean;
    url: string;
    encomenda: EncomendaFornecedorFicha;
    onFechar: () => void;
}) {
    const { data, setData, post, processing, errors } = useForm({ ref_fornecedor: '' });
    const submeter: FormEventHandler = (ev) => {
        ev.preventDefault();
        post(`${url}/factura`, { preserveScroll: true });
    };

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Lançar a factura de {encomenda.terceiro.nome}</DialogTitle>
                    <DialogDescription>
                        Cria um rascunho com as linhas desta encomenda ({formatNumero(encomenda.total)} MT). Confira-o com a factura do fornecedor
                        antes de validar.
                    </DialogDescription>
                </DialogHeader>
                <form id="form-factura-fornecedor" onSubmit={submeter} className="grid gap-1.5">
                    <Label htmlFor="ff-ref">Nº da factura do fornecedor</Label>
                    <Input id="ff-ref" value={data.ref_fornecedor} onChange={(ev) => setData('ref_fornecedor', ev.target.value)} autoFocus />
                    <InputError message={errors.ref_fornecedor} />
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-factura-fornecedor" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Criar rascunho
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
