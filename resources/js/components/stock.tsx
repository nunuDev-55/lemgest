/**
 * Peças do módulo de stock usadas em várias páginas: nome e cor de cada tipo de movimento,
 * tabela de movimentos e janela para registar um movimento.
 */
import { Estado, LinhaVazia, type CorEstado } from '@/components/erp';
import { Escolher, type OpcaoEscolha } from '@/components/escolher';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatData } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type FormEvent, type ReactNode } from 'react';

export interface Movimento {
    id: number;
    tipo: TipoMovimento;
    tipo_nome: string;
    quantidade: number;
    delta_total: number;
    delta_fora: number;
    total_depois: number;
    fora_depois: number;
    data: string;
    devolucao_prevista: string | null;
    pendente: number;
    atrasada: boolean;
    saida_id: number | null;
    terceiro: { id: number; nome: string } | null;
    motivo: string | null;
    origem: { label: string; href: string } | null;
    utilizador: string;
    produto?: { id: number; referencia: string; nome: string };
}

export type TipoMovimento = 'inicial' | 'entrada' | 'saida' | 'devolucao' | 'abate' | 'ajuste' | 'anulacao';

const CORES: Record<TipoMovimento, CorEstado> = {
    inicial: 'cinza',
    entrada: 'verde',
    saida: 'laranja',
    devolucao: 'azul',
    abate: 'vermelho',
    ajuste: 'roxo',
    anulacao: 'cinza',
};

export function EtiquetaMovimento({ movimento }: { movimento: Pick<Movimento, 'tipo' | 'tipo_nome'> }) {
    return <Estado cor={CORES[movimento.tipo] ?? 'cinza'}>{movimento.tipo_nome}</Estado>;
}

/** Quantidade com sinal, do ponto de vista do armazém: "+20" entra, "−20" sai */
export function QuantidadeMovimento({ movimento: m }: { movimento: Movimento }) {
    const sinal = m.tipo === 'ajuste' ? (m.delta_total >= 0 ? '+' : '−') : ['saida', 'abate', 'anulacao'].includes(m.tipo) ? '−' : '+';
    return (
        <span className={cn('font-medium tabular-nums', sinal === '−' ? 'text-foreground' : 'text-green-700 dark:text-green-400')}>
            {sinal}
            {m.quantidade}
        </span>
    );
}

/** Data de hoje no fuso de quem está a usar (não em UTC) */
export function hojeLocal(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Texto curto com o detalhe de um movimento: cliente, motivo, documento de origem, devolução prevista */
function Detalhe({ m }: { m: Movimento }) {
    const partes: ReactNode[] = [];
    if (m.terceiro) {
        partes.push(
            <Link key="t" href={`/terceiros/${m.terceiro.id}`} className="hover:underline">
                {m.terceiro.nome}
            </Link>,
        );
    }
    if (m.motivo) partes.push(<span key="m">{m.motivo}</span>);
    if (m.origem) {
        partes.push(
            <Link key="o" href={m.origem.href} className="text-primary hover:underline">
                {m.origem.label}
            </Link>,
        );
    }
    return (
        <div className="min-w-48">
            {partes.length > 0 ? (
                <div className="flex flex-wrap gap-x-1.5">
                    {partes.map((p, i) => (
                        <span key={i} className="inline-flex gap-x-1.5">
                            {i > 0 && <span className="text-muted-foreground">·</span>}
                            {p}
                        </span>
                    ))}
                </div>
            ) : (
                <span className="text-muted-foreground">—</span>
            )}
            {m.tipo === 'saida' && (
                <div className="text-muted-foreground text-[12.5px]">
                    {m.pendente > 0 ? (
                        <>
                            {m.pendente} por voltar
                            {m.devolucao_prevista && (
                                <span className={cn(m.atrasada && 'font-medium text-red-600 dark:text-red-400')}>
                                    {' '}
                                    · prevista {formatData(m.devolucao_prevista)}
                                    {m.atrasada && ' (atrasada)'}
                                </span>
                            )}
                        </>
                    ) : (
                        'Todas voltaram'
                    )}
                </div>
            )}
        </div>
    );
}

export function TabelaMovimentos({ movimentos, comProduto = false }: { movimentos: Movimento[]; comProduto?: boolean }) {
    return (
        <table className="tabela">
            <thead>
                <tr>
                    <th>Data</th>
                    {comProduto && <th>Produto</th>}
                    <th>Movimento</th>
                    <th className="text-right">Qtd.</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Alugadas</th>
                    <th>Detalhe</th>
                    <th>Por</th>
                </tr>
            </thead>
            <tbody>
                {movimentos.length === 0 && <LinhaVazia colunas={comProduto ? 8 : 7} texto="Ainda não há movimentos" />}
                {movimentos.map((m) => (
                    <tr key={m.id}>
                        <td className="whitespace-nowrap tabular-nums">{formatData(m.data)}</td>
                        {comProduto && m.produto && (
                            <td className="max-w-56">
                                <Link href={`/produtos/${m.produto.id}#stock`} className="hover:underline">
                                    <span className="line-clamp-1 font-medium">{m.produto.nome}</span>
                                </Link>
                                <span className="text-muted-foreground text-[12.5px]">{m.produto.referencia}</span>
                            </td>
                        )}
                        <td>
                            <EtiquetaMovimento movimento={m} />
                        </td>
                        <td className="text-right">
                            <QuantidadeMovimento movimento={m} />
                        </td>
                        <td className="text-right tabular-nums">{m.total_depois}</td>
                        <td className="text-muted-foreground text-right tabular-nums">{m.fora_depois}</td>
                        <td>
                            <Detalhe m={m} />
                        </td>
                        <td className="text-muted-foreground whitespace-nowrap">{m.utilizador}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/* ---------------------------------------------------------------- Registar movimento */

export type TipoManual = 'entrada' | 'saida' | 'devolucao' | 'abate' | 'ajuste';

const TITULOS: Record<TipoManual, { titulo: string; descricao: string; botao: string }> = {
    entrada: {
        titulo: 'Entrada de material',
        descricao: 'Peças novas que passam a ser da LemServ (compra fora do módulo Compras, oferta…).',
        botao: 'Registar entrada',
    },
    saida: { titulo: 'Saída para aluguer', descricao: 'Peças que saem do armazém para um cliente ou evento.', botao: 'Registar saída' },
    devolucao: { titulo: 'Devolução', descricao: 'Peças que voltam ao armazém. Escolha a saída de onde vêm.', botao: 'Registar devolução' },
    abate: { titulo: 'Perda ou dano', descricao: 'Peças partidas, perdidas ou não devolvidas, que deixam de contar.', botao: 'Abater peças' },
    ajuste: {
        titulo: 'Ajustar quantidade',
        descricao: 'Conte as peças que estão no armazém. As que estão alugadas somam-se automaticamente ao total.',
        botao: 'Guardar contagem',
    },
};

export interface ProdutoStock {
    id: number;
    referencia: string;
    nome: string;
    total: number;
    fora: number;
    disponivel: number;
}

export function DialogoMovimento({
    tipo,
    produto,
    saidasAbertas,
    clientes,
    saidaInicial,
    onFechar,
}: {
    tipo: TipoManual | null;
    produto: ProdutoStock;
    saidasAbertas: Movimento[];
    clientes: OpcaoEscolha[];
    saidaInicial?: number | null;
    onFechar: () => void;
}) {
    return (
        <Dialog open={tipo !== null} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-lg">
                {tipo && (
                    <FormularioMovimento
                        key={`${tipo}-${saidaInicial ?? ''}`}
                        tipo={tipo}
                        produto={produto}
                        saidasAbertas={saidasAbertas}
                        clientes={clientes}
                        saidaInicial={saidaInicial ?? null}
                        onFechar={onFechar}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}

function Campo({ id, rotulo, ajuda, erro, children }: { id?: string; rotulo: string; ajuda?: string; erro?: string; children: ReactNode }) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id}>{rotulo}</Label>
            {children}
            {ajuda && <p className="text-muted-foreground text-xs">{ajuda}</p>}
            <InputError message={erro} />
        </div>
    );
}

type DadosMovimento = {
    tipo: TipoManual;
    produto_id: number;
    quantidade: string;
    data: string;
    devolucao_prevista: string;
    terceiro_id: string | null;
    saida_id: string;
    motivo: string;
};

function FormularioMovimento({
    tipo,
    produto: p,
    saidasAbertas,
    clientes,
    saidaInicial,
    onFechar,
}: {
    tipo: TipoManual;
    produto: ProdutoStock;
    saidasAbertas: Movimento[];
    clientes: OpcaoEscolha[];
    saidaInicial: number | null;
    onFechar: () => void;
}) {
    const hoje = hojeLocal();
    const primeiraSaida = saidaInicial ?? (saidasAbertas.length === 1 ? saidasAbertas[0].id : null);
    const { data, setData, post, processing, errors } = useForm<DadosMovimento>({
        tipo,
        produto_id: p.id,
        quantidade:
            tipo === 'ajuste'
                ? String(p.disponivel)
                : tipo === 'devolucao' && primeiraSaida
                  ? String(saidasAbertas.find((s) => s.id === primeiraSaida)?.pendente ?? '')
                  : '',
        data: hoje,
        devolucao_prevista: '',
        terceiro_id: null,
        saida_id: tipo === 'devolucao' || (tipo === 'abate' && saidaInicial) ? (primeiraSaida ? String(primeiraSaida) : '') : '',
        motivo: '',
    });
    const erroStock = (errors as Record<string, string | undefined>).stock;
    const t = TITULOS[tipo];
    const saida = saidasAbertas.find((s) => String(s.id) === data.saida_id) ?? null;
    const doAluguer = tipo === 'abate' && data.saida_id !== '';

    function submeter(e: FormEvent) {
        e.preventDefault();
        post('/stock/movimentos', { preserveScroll: true, preserveState: true, onSuccess: onFechar });
    }

    const escolherSaida = (id: string) => {
        setData((d) => ({
            ...d,
            saida_id: id,
            quantidade: tipo === 'devolucao' ? String(saidasAbertas.find((s) => String(s.id) === id)?.pendente ?? d.quantidade) : d.quantidade,
        }));
    };

    const listaSaidas = (
        <Campo id="saida_id" rotulo="Saída" erro={errors.saida_id}>
            {saidasAbertas.length === 0 ? (
                <p className="text-muted-foreground text-[13px]">Não há peças deste produto fora do armazém.</p>
            ) : (
                <div className="grid max-h-48 gap-1.5 overflow-y-auto">
                    {saidasAbertas.map((s) => (
                        <label
                            key={s.id}
                            className={cn(
                                'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-[13px]',
                                data.saida_id === String(s.id) && 'border-foreground',
                            )}
                        >
                            <input
                                type="radio"
                                name="saida"
                                checked={data.saida_id === String(s.id)}
                                onChange={() => escolherSaida(String(s.id))}
                                className="mt-0.5 accent-[var(--primary)]"
                            />
                            <span className="min-w-0">
                                <span className="font-medium">
                                    {s.pendente} por voltar · saiu {formatData(s.data)}
                                </span>
                                <span className="text-muted-foreground block">
                                    {[s.terceiro?.nome, s.motivo].filter(Boolean).join(' · ') || 'Sem cliente indicado'}
                                    {s.devolucao_prevista && (
                                        <span className={cn(s.atrasada && 'text-red-600 dark:text-red-400')}>
                                            {' '}
                                            · prevista {formatData(s.devolucao_prevista)}
                                        </span>
                                    )}
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </Campo>
    );

    return (
        <form onSubmit={submeter} className="grid gap-4">
            <DialogHeader>
                <DialogTitle>{t.titulo}</DialogTitle>
                <DialogDescription>
                    {p.referencia} · {p.nome}
                </DialogDescription>
            </DialogHeader>

            <p className="text-muted-foreground -mt-2 text-[13px]">{t.descricao}</p>

            <div className="bg-muted grid grid-cols-3 rounded-md border text-center text-[12.5px]">
                <div className="px-2 py-2">
                    <div className="text-muted-foreground">Total</div>
                    <div className="text-[15px] font-semibold tabular-nums">{p.total}</div>
                </div>
                <div className="border-x px-2 py-2">
                    <div className="text-muted-foreground">Alugadas</div>
                    <div className="text-[15px] font-semibold tabular-nums">{p.fora}</div>
                </div>
                <div className="px-2 py-2">
                    <div className="text-muted-foreground">No armazém</div>
                    <div className="text-[15px] font-semibold tabular-nums">{p.disponivel}</div>
                </div>
            </div>

            {tipo === 'devolucao' && listaSaidas}

            {tipo === 'abate' && (
                <div className="grid gap-2">
                    <Label>De onde</Label>
                    <div className="flex flex-wrap gap-4 text-[13.5px]">
                        <label className="flex items-center gap-2">
                            <input type="radio" checked={!doAluguer} onChange={() => setData('saida_id', '')} className="accent-[var(--primary)]" />
                            Do armazém
                        </label>
                        <label className={cn('flex items-center gap-2', saidasAbertas.length === 0 && 'opacity-50')}>
                            <input
                                type="radio"
                                checked={doAluguer}
                                disabled={saidasAbertas.length === 0}
                                onChange={() => setData('saida_id', String(saidasAbertas[0]?.id ?? ''))}
                                className="accent-[var(--primary)]"
                            />
                            De um aluguer (não voltaram)
                        </label>
                    </div>
                    {doAluguer && listaSaidas}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                    id="quantidade"
                    rotulo={tipo === 'ajuste' ? 'Contadas no armazém' : 'Quantidade'}
                    ajuda={
                        tipo === 'saida'
                            ? `Há ${p.disponivel} no armazém.`
                            : tipo === 'devolucao' && saida
                              ? `Faltam voltar ${saida.pendente}.`
                              : tipo === 'ajuste'
                                ? `Novo total: ${(Number(data.quantidade) || 0) + p.fora}${p.fora > 0 ? ` (com as ${p.fora} alugadas)` : ''}.`
                                : undefined
                    }
                    erro={errors.quantidade}
                >
                    <Input
                        id="quantidade"
                        value={data.quantidade}
                        onChange={(e) => setData('quantidade', e.target.value.replace(/[^\d]/g, ''))}
                        inputMode="numeric"
                        className="text-right"
                        autoFocus
                    />
                </Campo>
                <Campo id="data" rotulo="Data" erro={errors.data}>
                    <Input id="data" type="date" value={data.data} max={hoje} onChange={(e) => setData('data', e.target.value)} />
                </Campo>
            </div>

            {tipo === 'saida' && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Campo id="devolucao_prevista" rotulo="Devolução prevista" erro={errors.devolucao_prevista}>
                            <Input
                                id="devolucao_prevista"
                                type="date"
                                value={data.devolucao_prevista}
                                min={data.data}
                                onChange={(e) => setData('devolucao_prevista', e.target.value)}
                            />
                        </Campo>
                        <Campo id="terceiro_id" rotulo="Cliente" erro={errors.terceiro_id}>
                            <Escolher
                                id="terceiro_id"
                                opcoes={clientes}
                                valor={data.terceiro_id}
                                onChange={(v) => setData('terceiro_id', v)}
                                placeholder="Opcional"
                                permitirLimpar
                            />
                        </Campo>
                    </div>
                </>
            )}

            <Campo
                id="motivo"
                rotulo={tipo === 'saida' ? 'Evento ou local' : tipo === 'abate' || tipo === 'ajuste' ? 'Motivo' : 'Observação'}
                erro={errors.motivo}
            >
                <Input
                    id="motivo"
                    value={data.motivo}
                    onChange={(e) => setData('motivo', e.target.value)}
                    maxLength={190}
                    placeholder={
                        tipo === 'saida'
                            ? 'Ex.: Casamento no Hotel Polana'
                            : tipo === 'abate'
                              ? 'Ex.: partidas na montagem'
                              : tipo === 'ajuste'
                                ? 'Ex.: contagem de fim de mês'
                                : tipo === 'entrada'
                                  ? 'Ex.: compra no mercado Xipamanine'
                                  : 'Opcional'
                    }
                />
            </Campo>

            {erroStock && <p className="text-destructive rounded-md border border-current/30 px-3 py-2 text-[13px]">{erroStock}</p>}

            <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={onFechar}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={processing || (tipo === 'devolucao' && !data.saida_id)}>
                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                    {t.botao}
                </Button>
            </DialogFooter>
        </form>
    );
}
