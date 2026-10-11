import { Confirmar } from '@/components/confirmar';
import {
    Bloco,
    BotoesAccao,
    CabecalhoFicha,
    Campo,
    Campos,
    EstadoEncomenda,
    ObjectosRelacionados,
    Separadores,
    type Relacionado,
} from '@/components/erp';
import { LinhasDocumento, type LinhaDocumento, type ProdutoVenda } from '@/components/linhas-documento';
import { TabelaEventos } from '@/components/tabela-eventos';
import { Button } from '@/components/ui/button';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatDataHora, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Ban, CheckCircle2, FileText, PackageCheck, Pencil, Printer, ReceiptText, RotateCcw, Trash2, Truck, Undo2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    documento: {
        id: number;
        referencia: string;
        numero: string | null;
        estado: string;
        facturada: boolean;
        atrasada: boolean;
        data: string;
        data_entrega: string | null;
        entregue_em: string | null;
        termos_pagamento_nome: string;
        metodo_pagamento_nome: string | null;
        ref_cliente: string | null;
        nota_publica: string | null;
        nota_privada: string | null;
        total_sem_iva: string;
        total_iva: string;
        total: string;
        validada_em: string | null;
        validada_por: string | null;
        terceiro: { id: number; nome: string; nuit: string | null };
        linhas: LinhaDocumento[];
    };
    relacionados: Relacionado[];
    produtos: ProdutoVenda[];
    eventos: { id: number; data: string; descricao: string; utilizador: string }[];
}

export default function FichaEncomenda({ documento: e, relacionados, produtos, eventos }: Props) {
    const pode = usePode();
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [separador, setSeparador] = useState('encomenda');
    const [dialogo, setDialogo] = useState<'validar' | 'apagar' | 'anular' | null>(null);
    const [aProcessar, setAProcessar] = useState(false);
    const url = `/encomendas/${e.id}`;
    const activa = e.estado === 'validada' || e.estado === 'entregue';

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
            <Head title={`${e.referencia} — Encomenda`} />
            <CabecalhoFicha
                icone={PackageCheck}
                referencia={e.referencia}
                titulo={
                    <Link href={`/terceiros/${e.terceiro.id}`} className="text-primary hover:underline">
                        {e.terceiro.nome}
                    </Link>
                }
                subtitulo={
                    <>
                        {e.ref_cliente && <>Ref. cliente: {e.ref_cliente} · </>}
                        {e.terceiro.nuit ? `NUIT ${e.terceiro.nuit}` : 'Sem NUIT'}
                        {e.validada_em && (
                            <>
                                {' '}
                                · Validada por {e.validada_por} em {formatDataHora(e.validada_em)}
                            </>
                        )}
                    </>
                }
                estado={<EstadoEncomenda estado={e.estado} facturada={e.facturada} atrasada={e.atrasada} />}
                voltar={{ href: '/encomendas' }}
            />

            {errors.encomenda && (
                <div
                    role="alert"
                    className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                >
                    {errors.encomenda}
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
                            <Campo rotulo="Data prevista de entrega">
                                <span className={cn(e.atrasada && 'font-semibold text-red-600 dark:text-red-400')}>
                                    {formatData(e.data_entrega)}
                                    {e.atrasada && ' (atrasada)'}
                                </span>
                            </Campo>
                            <Campo rotulo="Entregue em">{e.entregue_em ? formatDataHora(e.entregue_em) : null}</Campo>
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
                        comDias
                        editavel={e.estado === 'rascunho' && pode('encomendas.criar')}
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
                        {e.estado === 'rascunho' && pode('encomendas.criar') && (
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
                        {e.estado === 'rascunho' && pode('encomendas.validar') && (
                            <Button onClick={() => setDialogo('validar')} disabled={e.linhas.length === 0}>
                                <CheckCircle2 className="size-4" />
                                Validar
                            </Button>
                        )}
                        {e.estado === 'validada' && !e.facturada && pode('encomendas.criar') && (
                            <Button variant="outline" onClick={() => accao('rascunho')} disabled={aProcessar}>
                                <Undo2 className="size-4" />
                                Modificar (voltar a rascunho)
                            </Button>
                        )}
                        {e.estado === 'validada' && !e.facturada && pode('encomendas.fechar') && (
                            <Button variant="outline" onClick={() => setDialogo('anular')}>
                                <Ban className="size-4" />
                                Anular
                            </Button>
                        )}
                        {(e.estado === 'entregue' || e.estado === 'anulada') && pode('encomendas.fechar') && (
                            <Button variant="outline" onClick={() => accao('reabrir')} disabled={aProcessar}>
                                <RotateCcw className="size-4" />
                                Reabrir
                            </Button>
                        )}
                        {activa && !e.facturada && pode('facturas.criar') && (
                            <Button variant="outline" onClick={() => accao('facturada')} disabled={aProcessar}>
                                <FileText className="size-4" />
                                Classificar como facturada
                            </Button>
                        )}
                        {e.estado === 'validada' && pode('encomendas.fechar') && (
                            <Button variant="outline" onClick={() => accao('entregar')} disabled={aProcessar}>
                                <Truck className="size-4" />
                                Classificar como entregue
                            </Button>
                        )}
                        {activa && !e.facturada && pode('facturas.criar') && (
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
                    <Bloco titulo="Nota pública">
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
                descricao={`A encomenda recebe o número definitivo. Total: ${formatNumero(e.total)} MT (IVA incluído).`}
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
        </AppLayout>
    );
}
