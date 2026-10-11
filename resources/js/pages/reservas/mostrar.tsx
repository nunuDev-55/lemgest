import { Confirmar } from '@/components/confirmar';
import { Bloco, CabecalhoFicha, Campo, Campos, Estado, EstadoReserva, ObjectosRelacionados, Separadores, type Relacionado } from '@/components/erp';
import InputError from '@/components/input-error';
import { LinhasDocumento, type LinhaDocumento, type ProdutoVenda } from '@/components/linhas-documento';
import { datasEvento, textoTransporte, type ReservaResumo } from '@/components/reserva';
import { hojeLocal } from '@/components/stock';
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
import { ClipboardList, FilePlus2, LoaderCircle, Pencil, Truck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Terceiro {
    id: number;
    nome: string;
    codigo_cliente: string | null;
    telefone: string | null;
    telemovel: string | null;
    email: string | null;
}

interface Reserva extends ReservaResumo {
    origem: string;
    contacto_local: string | null;
    nota_publica: string | null;
    nota_privada: string | null;
    total_sem_iva: string;
    total_iva: string;
    confirmada_em: string | null;
    confirmada_por: string | null;
    entregue_em: string | null;
    devolvida_em: string | null;
    motivo_cancelamento: string | null;
    facturada: boolean;
    terceiro: Terceiro;
    linhas: LinhaDocumento[];
}

interface Material {
    linha_id: number;
    descricao: string;
    saiu: number;
    devolvidas: number;
    perdidas: number;
    por_voltar: number;
}

interface Props {
    reserva: Reserva;
    stock: Record<string, { pedidas: number; livres: number; falta: number }>;
    material: Material[];
    produtos: ProdutoVenda[];
    relacionados: Relacionado[];
    eventos: Evento[];
}

type Dialogo = 'entregar' | 'devolver' | 'cancelar' | 'confirmar' | null;

export default function FichaReserva({ reserva: r, stock, material, produtos, relacionados, eventos }: Props) {
    const pode = usePode();
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const [separador, setSeparador] = useState('reserva');
    const [dialogo, setDialogo] = useState<Dialogo>(null);
    const [aProcessar, setAProcessar] = useState(false);
    const editavel = (r.estado === 'pedido' || r.estado === 'confirmada') && pode('reservas.criar');
    const faltas = Object.values(stock).filter((s) => s.falta > 0).length;
    const comMaterial = r.linhas.some((l) => stock[l.id]);

    const accao = (url: string, dados: Record<string, string> = {}) => {
        setAProcessar(true);
        router.post(url, dados, { preserveScroll: true, onFinish: () => setAProcessar(false), onSuccess: () => setDialogo(null) });
    };

    return (
        <AppLayout>
            <Head title={r.numero} />
            <CabecalhoFicha
                referencia={r.numero}
                estado={
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                        <EstadoReserva estado={r.estado} atrasada={r.atrasada} />
                        {r.facturada && <Estado cor="verde">Facturada</Estado>}
                    </div>
                }
                titulo={
                    <Link href={`/terceiros/${r.terceiro.id}`} className="hover:underline">
                        {r.terceiro.nome}
                    </Link>
                }
                subtitulo={`Evento ${datasEvento(r)}${r.local ? ` · ${r.local}` : ''}`}
                voltar={{ href: '/reservas', label: 'Reservas' }}
            />

            {/* Acções conforme o estado */}
            <div className="mb-5 flex flex-wrap gap-2">
                {r.estado === 'pedido' && pode('reservas.confirmar') && (
                    <Button size="sm" onClick={() => setDialogo('confirmar')} disabled={r.linhas.length === 0 || faltas > 0}>
                        Confirmar reserva
                    </Button>
                )}
                {r.estado === 'confirmada' && pode('reservas.entregar') && (
                    <Button size="sm" onClick={() => setDialogo('entregar')}>
                        <Truck className="size-4" />
                        Registar saída
                    </Button>
                )}
                {r.estado === 'entregue' && pode('reservas.entregar') && (
                    <Button size="sm" onClick={() => setDialogo('devolver')}>
                        Registar devolução
                    </Button>
                )}
                {['confirmada', 'entregue', 'devolvida'].includes(r.estado) && !r.facturada && pode('facturas.criar') && (
                    <Button
                        size="sm"
                        variant={r.estado === 'devolvida' ? 'default' : 'outline'}
                        onClick={() => accao(`/reservas/${r.id}/factura`)}
                        disabled={aProcessar}
                    >
                        <FilePlus2 className="size-4" />
                        Criar factura
                    </Button>
                )}
                {editavel && (
                    <Button size="sm" variant="outline" asChild>
                        <Link href={`/reservas/${r.id}/editar`}>
                            <Pencil className="size-4" />
                            Modificar
                        </Link>
                    </Button>
                )}
                {r.estado !== 'cancelada' && (
                    <Button size="sm" variant="outline" asChild>
                        <a href={`/reservas/${r.id}/lista`} target="_blank" rel="noreferrer">
                            <ClipboardList className="size-4" />
                            Lista para a equipa
                        </a>
                    </Button>
                )}
                {r.estado === 'confirmada' && pode('reservas.confirmar') && (
                    <Button size="sm" variant="ghost" onClick={() => accao(`/reservas/${r.id}/pedido`)} disabled={aProcessar}>
                        Voltar a pedido
                    </Button>
                )}
                {(r.estado === 'pedido' || r.estado === 'confirmada') && pode('reservas.confirmar') && (
                    <Button size="sm" variant="ghost" className="hover:text-destructive" onClick={() => setDialogo('cancelar')}>
                        Cancelar reserva
                    </Button>
                )}
                {r.estado === 'cancelada' && pode('reservas.confirmar') && (
                    <Button size="sm" variant="outline" onClick={() => accao(`/reservas/${r.id}/reabrir`)} disabled={aProcessar}>
                        Reabrir como pedido
                    </Button>
                )}
            </div>

            {errors.reserva && <p className="text-destructive mb-4 rounded-md border border-current/30 px-4 py-3 text-[13.5px]">{errors.reserva}</p>}
            {r.estado === 'pedido' && faltas > 0 && (
                <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                    Falta material para estas datas em {faltas} linha(s). Ajuste as quantidades ou as datas antes de confirmar.
                </p>
            )}
            {r.estado === 'pedido' && faltas === 0 && comMaterial && (
                <p className="text-muted-foreground mb-4 text-[13px]">
                    Um pedido não prende o material: só ao confirmar fica guardado para estas datas.
                </p>
            )}

            <Separadores
                itens={[
                    { id: 'reserva', label: 'Reserva' },
                    ...(material.length > 0 ? [{ id: 'material', label: 'Saída e devolução' }] : []),
                    { id: 'eventos', label: 'Eventos' },
                ]}
                activo={separador}
                onMudar={setSeparador}
            />

            {separador === 'reserva' && (
                <>
                    <div className="mb-4 grid gap-4 lg:grid-cols-2">
                        <Campos>
                            <Campo rotulo="Evento">{datasEvento(r)}</Campo>
                            <Campo rotulo="Entrega">{formatData(r.data_entrega)}</Campo>
                            <Campo rotulo="Recolha">{formatData(r.data_recolha)}</Campo>
                            <Campo rotulo="Dias a cobrar">{r.dias}</Campo>
                            <Campo rotulo="Transporte">{textoTransporte(r)}</Campo>
                            <Campo rotulo="Tema de cores">{r.tema}</Campo>
                        </Campos>
                        <Campos>
                            <Campo rotulo="Cliente">
                                <Link href={`/terceiros/${r.terceiro.id}`} className="hover:underline">
                                    {r.terceiro.nome}
                                </Link>
                            </Campo>
                            <Campo rotulo="Telemóvel">{r.terceiro.telemovel ?? r.terceiro.telefone}</Campo>
                            <Campo rotulo="Local">{r.local}</Campo>
                            <Campo rotulo="Contacto no local">{r.contacto_local}</Campo>
                            <Campo rotulo="Origem">{r.origem === 'loja' ? 'Loja online' : 'Balcão'}</Campo>
                            <Campo rotulo="Confirmada">
                                {r.confirmada_em ? `${formatDataHora(r.confirmada_em)}${r.confirmada_por ? ` por ${r.confirmada_por}` : ''}` : null}
                            </Campo>
                            {r.estado === 'cancelada' && <Campo rotulo="Motivo do cancelamento">{r.motivo_cancelamento}</Campo>}
                        </Campos>
                    </div>

                    <LinhasDocumento
                        urlBase={`/reservas/${r.id}`}
                        linhas={r.linhas}
                        produtos={produtos}
                        editavel={editavel}
                        comDias
                        extra={(l) => {
                            const s = stock[l.id];
                            if (!s) return null;
                            return s.falta > 0 ? (
                                <span className="mt-0.5 block text-[12.5px] font-medium text-red-600 dark:text-red-400">
                                    Faltam {s.falta} · só há {s.livres} livre(s) nestas datas
                                </span>
                            ) : (
                                <span className="text-muted-foreground mt-0.5 block text-[12.5px]">{s.livres} livre(s) nestas datas</span>
                            );
                        }}
                    />

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
                        <div className="grid content-start gap-4">
                            {r.nota_publica && (
                                <Bloco titulo="Observações">
                                    <p className="px-4 py-3 text-[13.5px] whitespace-pre-line">{r.nota_publica}</p>
                                </Bloco>
                            )}
                            {r.nota_privada && (
                                <Bloco titulo="Nota interna">
                                    <p className="px-4 py-3 text-[13.5px] whitespace-pre-line">{r.nota_privada}</p>
                                </Bloco>
                            )}
                        </div>
                        <Campos>
                            <Campo rotulo="Total sem IVA">{formatNumero(r.total_sem_iva)} MT</Campo>
                            <Campo rotulo="IVA">{formatNumero(r.total_iva)} MT</Campo>
                            <Campo rotulo="Total" destaque>
                                {formatNumero(r.total)} MT
                            </Campo>
                        </Campos>
                    </div>
                </>
            )}

            {separador === 'material' && (
                <Bloco titulo="Material da reserva">
                    <table className="tabela">
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th className="text-right">Saiu</th>
                                <th className="text-right">Voltou</th>
                                <th className="text-right">Perdido ou danificado</th>
                                <th className="text-right">Por voltar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {material.map((m) => (
                                <tr key={m.linha_id}>
                                    <td>{m.descricao}</td>
                                    <td className="text-right tabular-nums">{m.saiu}</td>
                                    <td className="text-right tabular-nums">{m.devolvidas}</td>
                                    <td className={cn('text-right tabular-nums', m.perdidas > 0 && 'font-medium text-red-600 dark:text-red-400')}>
                                        {m.perdidas}
                                    </td>
                                    <td className="text-right font-medium tabular-nums">{m.por_voltar}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Bloco>
            )}

            {separador === 'reserva' && relacionados.length > 0 && <ObjectosRelacionados itens={relacionados} />}

            {separador === 'eventos' && <TabelaEventos eventos={eventos} />}

            <Confirmar
                aberto={dialogo === 'confirmar'}
                titulo={`Confirmar a reserva ${r.numero}?`}
                descricao={`O material fica guardado de ${formatData(r.data_entrega)} a ${formatData(r.data_recolha)} e deixa de estar disponível para outras reservas nessas datas.`}
                textoConfirmar="Confirmar"
                aProcessar={aProcessar}
                onConfirmar={() => accao(`/reservas/${r.id}/confirmar`)}
                onFechar={() => setDialogo(null)}
            />

            {/* Montados só quando abertos: cada vez começam com os valores actuais */}
            {dialogo === 'entregar' && <DialogoEntregar reserva={r} aberto onFechar={() => setDialogo(null)} />}
            {dialogo === 'devolver' && <DialogoDevolver reserva={r} material={material} aberto onFechar={() => setDialogo(null)} />}
            {dialogo === 'cancelar' && <DialogoCancelar reserva={r} aberto onFechar={() => setDialogo(null)} />}
        </AppLayout>
    );
}

/* ---------------------------------------------------------------- Diálogos */

function DialogoEntregar({ reserva: r, aberto, onFechar }: { reserva: Reserva; aberto: boolean; onFechar: () => void }) {
    const hoje = hojeLocal();
    const { data, setData, post, processing, errors } = useForm({ data: hoje });

    function submeter(e: FormEvent) {
        e.preventDefault();
        post(`/reservas/${r.id}/entregar`, { preserveScroll: true, onSuccess: onFechar });
    }

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submeter} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Registar a saída do material</DialogTitle>
                        <DialogDescription>
                            {r.numero} · {r.terceiro.nome}. O material sai do armazém e conta como alugado até à recolha ({formatData(r.data_recolha)}
                            ).
                        </DialogDescription>
                    </DialogHeader>
                    <ul className="bg-muted max-h-56 overflow-y-auto rounded-md border text-[13px]">
                        {r.linhas.map((l) => (
                            <li key={l.id} className="flex justify-between gap-3 border-b px-3 py-1.5 last:border-0">
                                <span className="min-w-0 truncate">{l.descricao}</span>
                                <span className="font-medium tabular-nums">{Number(l.quantidade)}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="grid gap-1.5">
                        <Label htmlFor="data-saida">Data da saída</Label>
                        <Input
                            id="data-saida"
                            type="date"
                            value={data.data}
                            max={hoje}
                            onChange={(e) => setData('data', e.target.value)}
                            className="w-44"
                        />
                        <InputError message={errors.data} />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onFechar}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Registar saída
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

type DadosDevolucao = { data: string; nota: string; linhas: Record<string, { devolvidas: string; perdidas: string }> };

function DialogoDevolver({
    reserva: r,
    material,
    aberto,
    onFechar,
}: {
    reserva: Reserva;
    material: Material[];
    aberto: boolean;
    onFechar: () => void;
}) {
    const hoje = hojeLocal();
    const porVoltar = material.filter((m) => m.por_voltar > 0);
    const { data, setData, post, processing, errors } = useForm<DadosDevolucao>({
        data: hoje,
        nota: '',
        linhas: Object.fromEntries(porVoltar.map((m) => [String(m.linha_id), { devolvidas: String(m.por_voltar), perdidas: '0' }])),
    });

    function mudar(id: number, campo: 'devolvidas' | 'perdidas', valor: string) {
        setData('linhas', { ...data.linhas, [id]: { ...data.linhas[id], [campo]: valor.replace(/[^\d]/g, '') } });
    }

    function submeter(e: FormEvent) {
        e.preventDefault();
        post(`/reservas/${r.id}/devolucao`, { preserveScroll: true, onSuccess: onFechar });
    }

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-2xl">
                <form onSubmit={submeter} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Registar a devolução</DialogTitle>
                        <DialogDescription>
                            Conte o material que voltou. As peças que não voltaram ou chegaram estragadas sem conserto são abatidas ao stock. Pode
                            registar em várias vezes.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="tabela">
                            <thead>
                                <tr>
                                    <th>Material</th>
                                    <th className="text-right">Por voltar</th>
                                    <th className="w-24 text-right">Voltaram</th>
                                    <th className="w-28 text-right">Perdidas / danificadas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {porVoltar.map((m) => {
                                    const v = data.linhas[m.linha_id];
                                    const soma = (Number(v?.devolvidas) || 0) + (Number(v?.perdidas) || 0);
                                    return (
                                        <tr key={m.linha_id}>
                                            <td>
                                                {m.descricao}
                                                {soma > m.por_voltar && (
                                                    <span className="block text-[12px] text-red-600 dark:text-red-400">
                                                        Mais do que as {m.por_voltar} por voltar
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-right font-medium tabular-nums">{m.por_voltar}</td>
                                            <td className="text-right">
                                                <Input
                                                    value={v?.devolvidas ?? ''}
                                                    onChange={(e) => mudar(m.linha_id, 'devolvidas', e.target.value)}
                                                    inputMode="numeric"
                                                    aria-label={`Voltaram: ${m.descricao}`}
                                                    className="ml-auto h-8 w-20 text-right"
                                                />
                                            </td>
                                            <td className="text-right">
                                                <Input
                                                    value={v?.perdidas ?? ''}
                                                    onChange={(e) => mudar(m.linha_id, 'perdidas', e.target.value)}
                                                    inputMode="numeric"
                                                    aria-label={`Perdidas: ${m.descricao}`}
                                                    className="ml-auto h-8 w-20 text-right"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-[11rem_1fr]">
                        <div className="grid gap-1.5">
                            <Label htmlFor="data-devolucao">Data</Label>
                            <Input id="data-devolucao" type="date" value={data.data} max={hoje} onChange={(e) => setData('data', e.target.value)} />
                            <InputError message={errors.data} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="nota-devolucao">Observação</Label>
                            <Input
                                id="nota-devolucao"
                                value={data.nota}
                                onChange={(e) => setData('nota', e.target.value)}
                                placeholder="Ex.: 2 cadeiras partidas no transporte"
                                maxLength={150}
                            />
                        </div>
                    </div>
                    {(errors as Record<string, string | undefined>).reserva && (
                        <p className="text-destructive text-[13px]">{(errors as Record<string, string | undefined>).reserva}</p>
                    )}
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onFechar}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Registar devolução
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DialogoCancelar({ reserva: r, aberto, onFechar }: { reserva: Reserva; aberto: boolean; onFechar: () => void }) {
    const { data, setData, post, processing } = useForm({ motivo: '' });

    function submeter(e: FormEvent) {
        e.preventDefault();
        post(`/reservas/${r.id}/cancelar`, { preserveScroll: true, onSuccess: onFechar });
    }

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submeter} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Cancelar a reserva {r.numero}?</DialogTitle>
                        <DialogDescription>O material deixa de estar guardado para estas datas. Pode reabrir a reserva mais tarde.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <Label htmlFor="motivo">Motivo (opcional)</Label>
                        <Input
                            id="motivo"
                            value={data.motivo}
                            onChange={(e) => setData('motivo', e.target.value)}
                            placeholder="Ex.: o cliente adiou o evento"
                            maxLength={190}
                        />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onFechar}>
                            Voltar
                        </Button>
                        <Button type="submit" variant="destructive" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Cancelar reserva
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
