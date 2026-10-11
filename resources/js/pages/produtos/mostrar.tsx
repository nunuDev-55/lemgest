import { Confirmar } from '@/components/confirmar';
import { Bloco, BotoesAccao, CabecalhoFicha, Campo, Campos, Estado, EstadoReserva, Separadores } from '@/components/erp';
import { type OpcaoEscolha } from '@/components/escolher';
import { DialogoMovimento, TabelaMovimentos, type Movimento, type TipoManual } from '@/components/stock';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ImageIcon, ImagePlus, LoaderCircle, Pencil, Star, Trash2 } from 'lucide-react';
import { useRef, useState, type DragEvent, type ReactNode } from 'react';

interface Foto {
    id: number;
    mini: string;
    media: string;
    grande: string;
    nome: string | null;
    largura: number;
    altura: number;
    bytes: number;
    principal: boolean;
}

interface Produto {
    id: number;
    referencia: string;
    tipo: 'produto' | 'servico' | 'materia';
    nome: string;
    categoria: string | null;
    material: string | null;
    descricao: string | null;
    preco: string;
    preco_com_iva: string;
    taxa_iva: string;
    unidade: string;
    preco_compra: string | null;
    em_venda: boolean;
    em_compra: boolean;
    em_aluguer: boolean;
    preco_aluguer: string | null;
    preco_aluguer_com_iva: string | null;
    quantidade_total: number;
    na_loja: boolean;
    loja_destaque: boolean;
    loja_ordem: number;
    loja_descricao: string | null;
    fotos: Foto[];
}

interface DadosStock {
    total: number;
    fora: number;
    disponivel: number;
    saidas_abertas: Movimento[];
    movimentos: Movimento[];
    n_movimentos: number;
    reservadas: number;
    proximas_reservas: {
        id: number;
        numero: string;
        estado: string;
        cliente: string;
        quantidade: number;
        data_entrega: string;
        data_recolha: string;
    }[];
}

interface Props {
    produto: Produto;
    usos: number;
    maximoFotos: number;
    stock: DadosStock | null;
    clientes: OpcaoEscolha[];
}

type Separador = 'ficha' | 'stock' | 'fotos' | 'loja';

export default function FichaProduto({ produto: p, usos, maximoFotos, stock, clientes }: Props) {
    const pode = usePode();
    const [apagar, setApagar] = useState(false);
    const [separador, setSeparador] = useState<Separador>(() => {
        const h = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
        return h === 'fotos' || h === 'loja' || (h === 'stock' && stock) ? (h as Separador) : 'ficha';
    });
    const servico = p.tipo === 'servico';
    const materia = p.tipo === 'materia';
    const nomeTipo = servico ? 'Serviço' : materia ? 'Matéria-prima' : 'Produto';
    const principal = p.fotos.find((f) => f.principal) ?? null;
    const margem =
        p.preco_compra && Number(p.preco_compra) > 0 && Number(p.preco) > 0
            ? ((Number(p.preco) - Number(p.preco_compra)) / Number(p.preco)) * 100
            : null;

    return (
        <AppLayout>
            <Head title={p.referencia} />
            <CabecalhoFicha
                referencia={p.referencia}
                titulo={p.nome}
                subtitulo={[nomeTipo, p.categoria, p.material].filter(Boolean).join(' · ')}
                estado={
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {p.em_aluguer && <Estado cor="verde">Aluguer</Estado>}
                        {p.em_venda && <Estado cor="azul">Venda</Estado>}
                        {p.na_loja && <Estado cor="roxo">Na loja</Estado>}
                        {materia && <Estado cor="azul">Compra-se</Estado>}
                        {!materia && !p.em_aluguer && !p.em_venda && <Estado cor="cinza">Inactivo</Estado>}
                    </div>
                }
                voltar={{ href: `/produtos?tipo=${p.tipo}` }}
            />

            <Separadores
                itens={[
                    { id: 'ficha', label: 'Ficha' },
                    ...(stock ? [{ id: 'stock', label: 'Stock' }] : []),
                    { id: 'fotos', label: 'Fotos', contagem: p.fotos.length },
                    ...(materia ? [] : [{ id: 'loja', label: 'Loja' }]),
                ]}
                activo={separador}
                onMudar={(id) => {
                    setSeparador(id as Separador);
                    window.history.replaceState(window.history.state, '', id === 'ficha' ? window.location.pathname : `#${id}`);
                }}
            />

            {separador === 'ficha' && (
                <>
                    <div className="grid items-start gap-4 md:grid-cols-[200px_1fr] xl:grid-cols-[240px_1fr_1fr]">
                        <button
                            type="button"
                            onClick={() => setSeparador('fotos')}
                            className="bg-muted group relative aspect-square w-full max-w-[260px] overflow-hidden rounded-lg border md:max-w-none"
                            aria-label={principal ? 'Ver fotos' : 'Adicionar fotos'}
                        >
                            {principal ? (
                                <img src={principal.media} alt={p.nome} className="size-full object-cover" />
                            ) : (
                                <span className="text-muted-foreground flex size-full flex-col items-center justify-center gap-2 text-[13px]">
                                    <ImageIcon className="size-6 opacity-50" />
                                    {pode('produtos.gerir') ? 'Adicionar fotos' : 'Sem fotos'}
                                </span>
                            )}
                        </button>
                        <Campos>
                            <Campo rotulo="Ref.">{p.referencia}</Campo>
                            <Campo rotulo="Nome">{p.nome}</Campo>
                            <Campo rotulo="Tipo">{nomeTipo}</Campo>
                            <Campo rotulo="Categoria">{p.categoria}</Campo>
                            {!servico && <Campo rotulo="Material">{p.material}</Campo>}
                            <Campo rotulo="Unidade">{p.unidade}</Campo>
                            <Campo rotulo="Usado em facturas">{usos > 0 ? `${usos} linha${usos === 1 ? '' : 's'}` : 'Ainda não'}</Campo>
                        </Campos>
                        <Campos className="md:col-span-2 xl:col-span-1">
                            <Campo rotulo="Aluguer por dia">
                                {p.em_aluguer && p.preco_aluguer !== null ? (
                                    <>
                                        {formatNumero(p.preco_aluguer)} MT
                                        <span className="text-muted-foreground"> · {formatNumero(p.preco_aluguer_com_iva ?? 0)} com IVA</span>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">Não se aluga</span>
                                )}
                            </Campo>
                            <Campo rotulo="Preço de venda">
                                {p.em_venda ? (
                                    <>
                                        {formatNumero(p.preco)} MT
                                        <span className="text-muted-foreground"> · {formatNumero(p.preco_com_iva)} com IVA</span>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">Não se vende</span>
                                )}
                            </Campo>
                            <Campo rotulo="Taxa de IVA">{Number(p.taxa_iva)}%</Campo>
                            <Campo rotulo="Preço de compra">{p.preco_compra ? `${formatNumero(p.preco_compra)} MT` : null}</Campo>
                            {p.em_venda && (
                                <Campo rotulo="Margem na venda">{margem !== null ? `${margem.toFixed(1).replace('.', ',')}%` : null}</Campo>
                            )}
                            <Campo rotulo="Compra-se a fornecedores">{p.em_compra ? 'Sim' : 'Não'}</Campo>
                        </Campos>
                    </div>

                    {p.descricao && (
                        <Bloco titulo="Notas internas" className="mt-4">
                            <p className="px-4 py-3 text-[13.5px] whitespace-pre-line">{p.descricao}</p>
                        </Bloco>
                    )}
                </>
            )}

            {separador === 'stock' && stock && <SeparadorStock produto={p} stock={stock} clientes={clientes} />}

            {separador === 'fotos' && <GaleriaFotos produto={p} maximo={maximoFotos} podeGerir={pode('produtos.gerir')} />}

            {separador === 'loja' && <SeparadorLoja produto={p} principal={principal} />}

            {pode('produtos.gerir') && (
                <BotoesAccao>
                    <Button variant="outline" asChild>
                        <Link href={`/produtos/${p.id}/editar`}>
                            <Pencil className="size-4" />
                            Modificar
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setApagar(true)}
                        className="hover:text-destructive"
                        disabled={usos > 0}
                        title={usos > 0 ? 'Já foi usado em facturas' : undefined}
                    >
                        <Trash2 className="size-4" />
                        Eliminar
                    </Button>
                </BotoesAccao>
            )}

            <Confirmar
                aberto={apagar}
                titulo={`Eliminar ${p.referencia}?`}
                descricao="O produto e as suas fotos são apagados. Esta acção não se pode desfazer."
                textoConfirmar="Eliminar"
                perigo
                onConfirmar={() => router.delete(`/produtos/${p.id}`, { onFinish: () => setApagar(false) })}
                onFechar={() => setApagar(false)}
            />
        </AppLayout>
    );
}

/* ---------------------------------------------------------------- Stock */

function SeparadorStock({ produto: p, stock, clientes }: { produto: Produto; stock: DadosStock; clientes: OpcaoEscolha[] }) {
    const pode = usePode();
    const [tipo, setTipo] = useState<TipoManual | null>(null);
    const [saidaEscolhida, setSaidaEscolhida] = useState<number | null>(null);
    const atrasadas = stock.saidas_abertas.filter((s) => s.atrasada).reduce((n, s) => n + s.pendente, 0);
    const abrir = (t: TipoManual, saida: number | null = null) => {
        setSaidaEscolhida(saida);
        setTipo(t);
    };

    return (
        <div className="grid gap-4">
            <section className="grelha-celulas grid grid-cols-2 sm:grid-cols-4">
                {[
                    { label: 'Total', valor: stock.total, nota: 'peças da LemServ' },
                    {
                        label: 'Alugadas agora',
                        valor: stock.fora,
                        nota: atrasadas > 0 ? `${atrasadas} em atraso` : 'fora do armazém',
                        alerta: atrasadas > 0,
                    },
                    { label: 'No armazém', valor: stock.disponivel, nota: 'prontas a sair' },
                    { label: 'Reservadas', valor: stock.reservadas, nota: 'em reservas confirmadas' },
                ].map((c) => (
                    <div key={c.label} className="bg-card px-4 py-3">
                        <p className="text-muted-foreground text-[13px]">{c.label}</p>
                        <p className="text-xl font-semibold tabular-nums">{c.valor ?? '—'}</p>
                        <p className={cn('text-[12.5px]', c.alerta ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
                            {c.nota}
                        </p>
                    </div>
                ))}
            </section>

            {(pode('stock.movimentar') || pode('stock.inventariar')) && (
                <div className="flex flex-wrap gap-2">
                    {pode('stock.movimentar') && (
                        <>
                            <Button size="sm" onClick={() => abrir('saida')} disabled={stock.disponivel === 0}>
                                Saída para aluguer
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => abrir('devolucao')} disabled={stock.saidas_abertas.length === 0}>
                                Devolução
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => abrir('entrada')}>
                                Entrada
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => abrir('abate')} disabled={stock.total === 0}>
                                Perda ou dano
                            </Button>
                        </>
                    )}
                    {pode('stock.inventariar') && (
                        <Button size="sm" variant="ghost" onClick={() => abrir('ajuste')}>
                            Ajustar quantidade
                        </Button>
                    )}
                </div>
            )}

            {stock.saidas_abertas.length > 0 && (
                <Bloco titulo={`Fora do armazém (${stock.fora})`}>
                    <table className="tabela">
                        <thead>
                            <tr>
                                <th>Saiu</th>
                                <th>Cliente / evento</th>
                                <th className="text-right">Por voltar</th>
                                <th>Devolução prevista</th>
                                {pode('stock.movimentar') && <th />}
                            </tr>
                        </thead>
                        <tbody>
                            {stock.saidas_abertas.map((s) => (
                                <tr key={s.id}>
                                    <td className="whitespace-nowrap tabular-nums">{formatData(s.data)}</td>
                                    <td>
                                        {[s.terceiro?.nome, s.motivo].filter(Boolean).join(' · ') || <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="text-right font-medium tabular-nums">{s.pendente}</td>
                                    <td className="whitespace-nowrap">
                                        {s.devolucao_prevista ? (
                                            s.atrasada ? (
                                                <Estado cor="vermelho">{formatData(s.devolucao_prevista)} · atrasada</Estado>
                                            ) : (
                                                <span className="tabular-nums">{formatData(s.devolucao_prevista)}</span>
                                            )
                                        ) : (
                                            <span className="text-muted-foreground">Sem data</span>
                                        )}
                                    </td>
                                    {pode('stock.movimentar') && (
                                        <td className="text-right whitespace-nowrap">
                                            <Button size="sm" variant="ghost" onClick={() => abrir('devolucao', s.id)}>
                                                Registar devolução
                                            </Button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Bloco>
            )}

            {stock.proximas_reservas.length > 0 && (
                <Bloco titulo="Próximas reservas">
                    <table className="tabela">
                        <thead>
                            <tr>
                                <th>Reserva</th>
                                <th>Cliente</th>
                                <th>Entrega → recolha</th>
                                <th className="text-right">Peças</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stock.proximas_reservas.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <Link href={`/reservas/${r.id}`} className="text-primary font-medium hover:underline">
                                            {r.numero}
                                        </Link>
                                    </td>
                                    <td>{r.cliente}</td>
                                    <td className="whitespace-nowrap tabular-nums">
                                        {formatData(r.data_entrega)} → {formatData(r.data_recolha)}
                                    </td>
                                    <td className="text-right font-medium tabular-nums">{r.quantidade}</td>
                                    <td>
                                        <EstadoReserva estado={r.estado} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Bloco>
            )}

            <Bloco
                titulo="Movimentos"
                accoes={
                    stock.n_movimentos > stock.movimentos.length && (
                        <Link href={`/stock/movimentos?produto=${p.id}`} className="text-muted-foreground hover:text-foreground text-[13px]">
                            Ver todos ({stock.n_movimentos})
                        </Link>
                    )
                }
            >
                <TabelaMovimentos movimentos={stock.movimentos} />
            </Bloco>

            <DialogoMovimento
                tipo={tipo}
                produto={{ id: p.id, referencia: p.referencia, nome: p.nome, total: stock.total, fora: stock.fora, disponivel: stock.disponivel }}
                saidasAbertas={stock.saidas_abertas}
                clientes={clientes}
                saidaInicial={saidaEscolhida}
                onFechar={() => setTipo(null)}
            />
        </div>
    );
}

/* ---------------------------------------------------------------- Fotos */

function tamanhoFicheiro(bytes: number): string {
    return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function GaleriaFotos({ produto: p, maximo, podeGerir }: { produto: Produto; maximo: number; podeGerir: boolean }) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const entrada = useRef<HTMLInputElement>(null);
    const [progresso, setProgresso] = useState<number | null>(null);
    const [porCima, setPorCima] = useState(false);
    const [aApagar, setAApagar] = useState<Foto | null>(null);
    const [aVer, setAVer] = useState<number | null>(null);
    const livres = maximo - p.fotos.length;
    const erro = Object.entries(errors).find(([campo]) => campo === 'fotos' || campo.startsWith('fotos.'))?.[1];

    function carregar(lista: FileList | null) {
        if (!lista || lista.length === 0) return;
        const fotos = Array.from(lista).slice(0, Math.max(livres, 0));
        if (fotos.length === 0) return;
        router.post(
            `/produtos/${p.id}/fotos`,
            { fotos },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onProgress: (e) => setProgresso(e?.percentage ?? null),
                onFinish: () => {
                    setProgresso(null);
                    if (entrada.current) entrada.current.value = '';
                },
            },
        );
    }

    function largar(e: DragEvent) {
        e.preventDefault();
        setPorCima(false);
        if (podeGerir) carregar(e.dataTransfer.files);
    }

    const accao = (url: string, dados: Record<string, string> = {}) => router.put(url, dados, { preserveScroll: true, preserveState: true });
    const aCarregar = progresso !== null;
    const vista = aVer !== null ? p.fotos[aVer] : null;

    return (
        <Bloco
            titulo={`Fotos (${p.fotos.length} de ${maximo})`}
            accoes={
                podeGerir && (
                    <Button size="sm" onClick={() => entrada.current?.click()} disabled={aCarregar || livres <= 0}>
                        {aCarregar ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                        Adicionar fotos
                    </Button>
                )
            }
        >
            <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => carregar(e.target.files)} />

            <div
                className="p-4"
                onDragOver={(e) => {
                    if (!podeGerir) return;
                    e.preventDefault();
                    setPorCima(true);
                }}
                onDragLeave={() => setPorCima(false)}
                onDrop={largar}
            >
                {erro && <p className="text-destructive mb-3 text-[13px]">{erro}</p>}
                {aCarregar && (
                    <div className="mb-3">
                        <div className="text-muted-foreground mb-1 text-[12.5px]">
                            A carregar e a reduzir as fotos… {progresso ? `${Math.round(progresso)}%` : ''}
                        </div>
                        <div className="bg-muted h-1 overflow-hidden rounded-full">
                            <div className="bg-primary h-full transition-[width]" style={{ width: `${progresso ?? 5}%` }} />
                        </div>
                    </div>
                )}

                {p.fotos.length === 0 ? (
                    <button
                        type="button"
                        disabled={!podeGerir || aCarregar}
                        onClick={() => entrada.current?.click()}
                        className={cn(
                            'text-muted-foreground flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-14 text-center text-[13.5px] transition-colors',
                            porCima && 'border-primary bg-muted',
                            podeGerir && 'hover:bg-muted',
                        )}
                    >
                        <ImagePlus className="size-6 opacity-60" />
                        {podeGerir ? (
                            <>
                                <span className="text-foreground font-medium">Arraste as fotos para aqui ou clique para escolher</span>
                                <span className="text-[12.5px]">No telemóvel, pode tirar a foto na hora.</span>
                            </>
                        ) : (
                            'Este produto ainda não tem fotos.'
                        )}
                    </button>
                ) : (
                    <ul
                        className={cn(
                            'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4',
                            porCima && 'ring-primary rounded-lg ring-2 ring-offset-4',
                        )}
                    >
                        {p.fotos.map((f, i) => (
                            <li key={f.id} className="overflow-hidden rounded-lg border">
                                <button
                                    type="button"
                                    onClick={() => setAVer(i)}
                                    className="bg-muted relative block aspect-square w-full"
                                    aria-label={`Ver foto ${i + 1}`}
                                >
                                    <img src={f.media} alt={`${p.nome}, foto ${i + 1}`} loading="lazy" className="size-full object-cover" />
                                    {f.principal && (
                                        <span className="bg-background/95 absolute top-2 left-2 rounded px-1.5 py-0.5 text-[11.5px] font-medium">
                                            Principal
                                        </span>
                                    )}
                                </button>
                                {podeGerir && (
                                    <div className="flex items-center justify-between gap-1 border-t px-1.5 py-1">
                                        <BotaoIcone
                                            rotulo={f.principal ? 'É a foto principal' : 'Tornar principal'}
                                            disabled={f.principal}
                                            onClick={() => accao(`/produtos/${p.id}/fotos/${f.id}/principal`)}
                                            className={cn(f.principal && 'text-foreground disabled:opacity-100')}
                                        >
                                            <Star className={cn('size-3.5', f.principal && 'fill-current')} />
                                        </BotaoIcone>
                                        <div className="flex items-center">
                                            <BotaoIcone
                                                rotulo="Mover para trás"
                                                disabled={i === 0}
                                                onClick={() => accao(`/produtos/${p.id}/fotos/${f.id}/mover`, { direcao: 'anterior' })}
                                            >
                                                <ChevronLeft className="size-3.5" />
                                            </BotaoIcone>
                                            <BotaoIcone
                                                rotulo="Mover para a frente"
                                                disabled={i === p.fotos.length - 1}
                                                onClick={() => accao(`/produtos/${p.id}/fotos/${f.id}/mover`, { direcao: 'seguinte' })}
                                            >
                                                <ChevronRight className="size-3.5" />
                                            </BotaoIcone>
                                            <BotaoIcone rotulo="Apagar foto" onClick={() => setAApagar(f)} className="hover:text-destructive">
                                                <Trash2 className="size-3.5" />
                                            </BotaoIcone>
                                        </div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {podeGerir && (
                    <p className="text-muted-foreground mt-3 text-[12.5px]">
                        JPG, PNG ou WebP, até 15 MB cada. As fotos são reduzidas automaticamente para carregarem depressa no telemóvel. A principal
                        aparece nas listas e na loja.
                    </p>
                )}
            </div>

            <Dialog open={vista !== null} onOpenChange={(v) => !v && setAVer(null)}>
                <DialogContent className="max-w-[min(96vw,1100px)] gap-3 p-3 sm:max-w-[min(96vw,1100px)]">
                    <DialogTitle className="sr-only">{p.nome}</DialogTitle>
                    <DialogDescription className="sr-only">Foto ampliada</DialogDescription>
                    {vista && (
                        <>
                            <img src={vista.grande} alt={p.nome} className="bg-muted max-h-[78vh] w-full rounded object-contain" />
                            <div className="flex items-center justify-between text-[13px]">
                                <Button variant="ghost" size="sm" disabled={aVer === 0} onClick={() => setAVer((n) => (n ?? 1) - 1)}>
                                    <ChevronLeft className="size-4" />
                                    Anterior
                                </Button>
                                <span className="text-muted-foreground text-center tabular-nums">
                                    {(aVer ?? 0) + 1} de {p.fotos.length}
                                    <span className="hidden sm:inline">
                                        {' '}
                                        · {vista.largura}×{vista.altura} · {tamanhoFicheiro(vista.bytes)}
                                        {vista.nome && ` · ${vista.nome}`}
                                    </span>
                                </span>
                                <Button variant="ghost" size="sm" disabled={aVer === p.fotos.length - 1} onClick={() => setAVer((n) => (n ?? 0) + 1)}>
                                    Seguinte
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Confirmar
                aberto={aApagar !== null}
                titulo="Apagar esta foto?"
                descricao={
                    aApagar?.principal && p.fotos.length > 1
                        ? 'É a foto principal: a seguinte passa a ser a principal.'
                        : 'Esta acção não se pode desfazer.'
                }
                textoConfirmar="Apagar"
                perigo
                onConfirmar={() =>
                    aApagar &&
                    router.delete(`/produtos/${p.id}/fotos/${aApagar.id}`, {
                        preserveScroll: true,
                        preserveState: true,
                        onFinish: () => setAApagar(null),
                    })
                }
                onFechar={() => setAApagar(null)}
            />
        </Bloco>
    );
}

function BotaoIcone({
    rotulo,
    onClick,
    disabled,
    className,
    children,
}: {
    rotulo: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={rotulo}
            aria-label={rotulo}
            className={cn(
                'text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30',
                className,
            )}
        >
            {children}
        </button>
    );
}

/* ---------------------------------------------------------------- Loja */

function SeparadorLoja({ produto: p, principal }: { produto: Produto; principal: Foto | null }) {
    const servico = p.tipo === 'servico';
    const faltas: string[] = [];
    if (!principal) faltas.push('uma foto');
    if (!servico && !p.em_aluguer) faltas.push('estar marcado para aluguer');
    if (!servico && p.em_aluguer && (p.preco_aluguer === null || Number(p.preco_aluguer) <= 0)) faltas.push('o preço por dia');

    const precoCliente = servico ? (p.em_venda ? p.preco_com_iva : null) : p.em_aluguer ? p.preco_aluguer_com_iva : null;

    return (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
            <div className="grid gap-4">
                <Campos>
                    <Campo rotulo="Mostrar na loja">{p.na_loja ? <Estado cor="roxo">Sim</Estado> : <Estado cor="cinza">Não</Estado>}</Campo>
                    <Campo rotulo="Em destaque">{p.loja_destaque ? 'Sim' : 'Não'}</Campo>
                    <Campo rotulo="Posição">{p.loja_ordem > 0 ? p.loja_ordem : 'Ordem do nome'}</Campo>
                    <Campo rotulo="Categoria na loja">{p.categoria ?? 'Sem categoria'}</Campo>
                </Campos>

                {p.na_loja && faltas.length > 0 && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
                        Está marcado para a loja, mas falta {faltas.join(' e ')}. Sem isso, não aparece aos clientes.
                    </div>
                )}

                <Bloco titulo="Descrição para o cliente">
                    {p.loja_descricao ? (
                        <p className="px-4 py-3 text-[13.5px] whitespace-pre-line">{p.loja_descricao}</p>
                    ) : (
                        <p className="text-muted-foreground px-4 py-3 text-[13.5px]">Sem descrição. A loja mostra só o nome.</p>
                    )}
                </Bloco>
            </div>

            <div className="w-full max-w-[320px]">
                <p className="text-muted-foreground mb-2 text-[12.5px] font-medium">Como o cliente vê</p>
                <article className="bg-card overflow-hidden rounded-xl border">
                    <div className="bg-muted relative aspect-[4/3]">
                        {principal ? (
                            <img src={principal.media} alt={p.nome} className="size-full object-cover" />
                        ) : (
                            <span className="text-muted-foreground/50 flex size-full items-center justify-center">
                                <ImageIcon className="size-7" />
                            </span>
                        )}
                        {p.loja_destaque && (
                            <span className="bg-background/95 absolute top-2.5 left-2.5 rounded px-1.5 py-0.5 text-[11.5px] font-medium">
                                Destaque
                            </span>
                        )}
                    </div>
                    <div className="grid gap-1 p-4">
                        {p.categoria && <span className="text-muted-foreground text-[12px]">{p.categoria}</span>}
                        <h3 className="text-[15px] leading-snug font-semibold">{p.nome}</h3>
                        {p.loja_descricao && <p className="text-muted-foreground line-clamp-2 text-[13px]">{p.loja_descricao}</p>}
                        <p className="mt-2 text-[15px] font-semibold tabular-nums">
                            {precoCliente !== null ? (
                                <>
                                    {formatNumero(precoCliente)} MT
                                    {!servico && <span className="text-muted-foreground text-[13px] font-normal"> / dia</span>}
                                </>
                            ) : (
                                <span className="text-muted-foreground text-[13px] font-normal">Preço sob consulta</span>
                            )}
                        </p>
                        <span className="text-muted-foreground text-[11.5px]">IVA incluído</span>
                    </div>
                </article>
            </div>
        </div>
    );
}
