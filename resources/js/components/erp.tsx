/**
 * Peças de interface comuns a todas as páginas, ao estilo de um ERP (Dolibarr):
 * título de página, estados, cabeçalho de ficha, separadores, campos, botões e listas.
 */
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/* ---------------------------------------------------------------- Título */

export function TituloPagina({
    titulo,
    contagem,
    descricao,
    accoes,
}: {
    /** Já não é desenhado (o menu lateral mostra onde se está); mantido para as páginas existentes */
    icone?: LucideIcon;
    titulo: string;
    contagem?: number;
    descricao?: string;
    accoes?: ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
                <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">
                    {titulo}
                    {contagem !== undefined && <span className="text-muted-foreground ml-2 text-[15px] font-normal tabular-nums">{contagem}</span>}
                </h1>
                {descricao && <p className="text-muted-foreground text-[13.5px]">{descricao}</p>}
            </div>
            {accoes && <div className="flex flex-wrap gap-2">{accoes}</div>}
        </div>
    );
}

/* ---------------------------------------------------------------- Estados */

/** Cor do ponto de cada estado; o texto fica sempre na cor normal (estados discretos, sem "pílulas" coloridas) */
const CORES_ESTADO = {
    cinza: 'bg-neutral-400 dark:bg-neutral-500',
    laranja: 'bg-amber-500',
    verde: 'bg-green-600 dark:bg-green-500',
    vermelho: 'bg-red-600 dark:bg-red-500',
    azul: 'bg-blue-600 dark:bg-blue-500',
    roxo: 'bg-primary dark:bg-[#c77bb8]',
} as const;

export type CorEstado = keyof typeof CORES_ESTADO;

export function Estado({ cor, children, className }: { cor: CorEstado; children: ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap', className)}>
            <span className={cn('size-[7px] shrink-0 rounded-full', CORES_ESTADO[cor])} aria-hidden="true" />
            {children}
        </span>
    );
}

/** Estado de uma factura, com os mesmos nomes do Dolibarr */
export function EstadoFactura({ estado, vencida, parcial }: { estado: string; vencida?: boolean; parcial?: boolean }) {
    if (estado === 'rascunho') return <Estado cor="cinza">Rascunho</Estado>;
    if (estado === 'paga') return <Estado cor="verde">Paga</Estado>;
    if (estado === 'abandonada') return <Estado cor="cinza">Abandonada</Estado>;
    if (vencida) return <Estado cor="vermelho">Vencida</Estado>;
    if (parcial) return <Estado cor="azul">Paga em parte</Estado>;
    return <Estado cor="laranja">Pendente de cobrança</Estado>;
}

/* ---------------------------------------------------------------- Fichas */

export function CabecalhoFicha({
    referencia,
    titulo,
    subtitulo,
    estado,
    voltar,
}: {
    /** Já não é desenhado; mantido para as páginas existentes */
    icone?: LucideIcon;
    referencia: string;
    titulo?: ReactNode;
    subtitulo?: ReactNode;
    estado?: ReactNode;
    voltar?: { href: string; label?: string };
}) {
    return (
        <div className="mb-6 flex flex-col gap-2">
            {voltar && (
                <Link href={voltar.href} className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-[13px]">
                    <ChevronLeft className="size-3.5" />
                    {voltar.label ?? 'Voltar à lista'}
                </Link>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">{referencia}</h1>
                {estado}
            </div>
            {titulo && <div className="text-[14px] font-medium">{titulo}</div>}
            {subtitulo && <div className="text-muted-foreground text-[13px]">{subtitulo}</div>}
        </div>
    );
}

export function Separadores({
    itens,
    activo,
    onMudar,
}: {
    itens: { id: string; label: string; contagem?: number }[];
    activo: string;
    onMudar: (id: string) => void;
}) {
    return (
        <div className="mb-5 flex gap-5 overflow-x-auto overflow-y-hidden border-b" role="tablist">
            {itens.map((s) => (
                <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={s.id === activo}
                    onClick={() => onMudar(s.id)}
                    className={cn(
                        '-mb-px border-b-2 pb-2.5 text-[13.5px] whitespace-nowrap transition-colors',
                        s.id === activo
                            ? 'border-foreground text-foreground font-medium'
                            : 'text-muted-foreground hover:text-foreground border-transparent',
                    )}
                >
                    {s.label}
                    {s.contagem !== undefined && s.contagem > 0 && (
                        <span className="text-muted-foreground ml-1.5 font-normal tabular-nums">{s.contagem}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

/** Lista de campos "rótulo: valor" de uma ficha */
export function Campos({ children, className }: { children: ReactNode; className?: string }) {
    return <dl className={cn('ficha painel', className)}>{children}</dl>;
}

export function Campo({ rotulo, children, destaque }: { rotulo: string; children?: ReactNode; destaque?: boolean }) {
    return (
        <div>
            <dt>{rotulo}</dt>
            <dd className={cn(destaque && 'font-semibold')}>
                {children === null || children === undefined || children === '' ? <span className="text-muted-foreground/60">—</span> : children}
            </dd>
        </div>
    );
}

/** Caixa com título, para agrupar blocos dentro de uma ficha */
export function Bloco({ titulo, accoes, children, className }: { titulo?: ReactNode; accoes?: ReactNode; children: ReactNode; className?: string }) {
    return (
        <section className={cn('painel overflow-hidden', className)}>
            {(titulo || accoes) && (
                <header className="flex min-h-11 items-center justify-between gap-2 border-b px-4 py-2">
                    <h2 className="text-[14px] font-semibold">{titulo}</h2>
                    {accoes}
                </header>
            )}
            {/* No telemóvel, tabelas mais largas do que o ecrã deslizam para o lado em vez de ficarem cortadas */}
            <div className="overflow-x-auto">{children}</div>
        </section>
    );
}

/** Fila de botões de acção no fim da ficha (como os botões do Dolibarr) */
export function BotoesAccao({ children }: { children: ReactNode }) {
    return <div className="my-4 flex flex-wrap justify-end gap-2">{children}</div>;
}

/** Linha de formulário: rótulo à esquerda, campo à direita */
export function LinhaForm({
    rotulo,
    htmlFor,
    obrigatorio,
    children,
    ajuda,
}: {
    rotulo: string;
    htmlFor?: string;
    obrigatorio?: boolean;
    children: ReactNode;
    ajuda?: string;
}) {
    return (
        <div className="grid gap-1.5 border-b border-[var(--linha-suave)] px-5 py-3.5 last:border-0 md:grid-cols-[14rem_1fr] md:items-start md:gap-6">
            <label htmlFor={htmlFor} className={cn('text-muted-foreground pt-2 text-[13.5px]', obrigatorio && 'text-foreground font-medium')}>
                {rotulo}
                {obrigatorio && <span className="text-destructive"> *</span>}
            </label>
            <div className="min-w-0">
                {children}
                {ajuda && <p className="text-muted-foreground mt-1 text-xs">{ajuda}</p>}
            </div>
        </div>
    );
}

/* ---------------------------------------------------------------- Listas */

export interface OrdenacaoLista {
    ordem: string;
    dir: 'asc' | 'desc';
}

/**
 * Filtros e ordenação de uma lista, guardados no endereço (?nome=...&ordem=...).
 * Os campos de texto esperam 400 ms depois da última tecla antes de pesquisar.
 */
export function useListaFiltros<F extends Record<string, string | undefined>>(rota: string, filtros: F, ordenacao?: OrdenacaoLista) {
    const [valores, setValores] = useState<Record<string, string>>(() => ({ ...(filtros as Record<string, string>) }));
    const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setValores({ ...(filtros as Record<string, string>) });
    }, [filtros]);

    function navegar(novos: Record<string, string | undefined>) {
        const params = Object.fromEntries(Object.entries(novos).filter(([, v]) => v !== undefined && v !== '' && v !== 'todos'));
        router.get(rota, params, { preserveState: true, preserveScroll: true, replace: true });
    }

    function base() {
        const p: Record<string, string | undefined> = { ...valores };
        if (ordenacao) {
            p.ordem = ordenacao.ordem;
            p.dir = ordenacao.dir;
        }
        const porPagina = new URLSearchParams(window.location.search).get('por_pagina');
        if (porPagina) p.por_pagina = porPagina;
        return p;
    }

    return {
        valores,
        /** Muda um filtro de texto (pesquisa depois de uma pausa) */
        escrever(campo: string, valor: string) {
            setValores((v) => ({ ...v, [campo]: valor }));
            if (temporizador.current) clearTimeout(temporizador.current);
            temporizador.current = setTimeout(() => navegar({ ...base(), [campo]: valor }), 400);
        },
        /** Muda um filtro de escolha (pesquisa logo) */
        escolher(campo: string, valor: string) {
            setValores((v) => ({ ...v, [campo]: valor }));
            navegar({ ...base(), [campo]: valor });
        },
        ordenar(coluna: string) {
            const dir = ordenacao?.ordem === coluna && ordenacao.dir === 'asc' ? 'desc' : 'asc';
            navegar({ ...base(), ordem: coluna, dir });
        },
        porPagina(n: string) {
            navegar({ ...base(), por_pagina: n });
        },
        limpar() {
            setValores({});
            router.get(rota, {}, { preserveState: true, replace: true });
        },
        temFiltros: Object.values(filtros).some((v) => v !== undefined && v !== ''),
    };
}

export function ColunaOrdenavel({
    coluna,
    ordenacao,
    onOrdenar,
    children,
    className,
}: {
    coluna: string;
    ordenacao: OrdenacaoLista;
    onOrdenar: (coluna: string) => void;
    children: ReactNode;
    className?: string;
}) {
    const activa = ordenacao.ordem === coluna;
    const Icone = !activa ? ArrowUpDown : ordenacao.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
        <th className={className} aria-sort={activa ? (ordenacao.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button
                type="button"
                onClick={() => onOrdenar(coluna)}
                className={cn('hover:text-foreground inline-flex items-center gap-1', activa && 'text-foreground')}
            >
                {children}
                <Icone className={cn('size-3', !activa && 'opacity-40')} />
            </button>
        </th>
    );
}

/** Campo de filtro dentro do cabeçalho da tabela */
export function FiltroTexto({
    valor,
    onChange,
    rotulo,
    className,
}: {
    valor?: string;
    onChange: (v: string) => void;
    rotulo: string;
    className?: string;
}) {
    return (
        <input
            value={valor ?? ''}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Filtrar por ${rotulo}`}
            placeholder="Filtrar…"
            className={cn(
                'border-input bg-card focus-visible:ring-ring placeholder:text-muted-foreground/70 h-8 w-full min-w-16 rounded-md border px-2 text-[12.5px] font-normal outline-none focus-visible:ring-2',
                className,
            )}
        />
    );
}

export function FiltroEscolha({
    valor,
    onChange,
    opcoes,
    rotulo,
    todos = 'Todos',
}: {
    valor?: string;
    onChange: (v: string) => void;
    opcoes: { valor: string; label: string }[];
    rotulo: string;
    /** Texto da opção sem filtro */
    todos?: string;
}) {
    return (
        <Select value={valor || 'todos'} onValueChange={onChange}>
            <SelectTrigger className="h-8 min-w-28 text-[12.5px] font-normal" aria-label={`Filtrar por ${rotulo}`}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="todos">{todos}</SelectItem>
                {opcoes.map((o) => (
                    <SelectItem key={o.valor} value={o.valor}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

export function PorPagina({ valor, onChange }: { valor: number; onChange: (v: string) => void }) {
    return (
        <label className="text-muted-foreground flex items-center gap-2 text-xs">
            Por página
            <select value={valor} onChange={(e) => onChange(e.target.value)} className="border-input bg-card h-7 rounded border px-1.5 text-xs">
                {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                        {n}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function LinhaVazia({ colunas, texto = 'Nenhum registo encontrado' }: { colunas: number; texto?: string }) {
    return (
        <tr>
            <td colSpan={colunas} className="text-muted-foreground py-12 text-center">
                {texto}
            </td>
        </tr>
    );
}

export function BotaoLink({
    href,
    icone: Icone,
    children,
    variante = 'default',
}: {
    href: string;
    icone?: LucideIcon;
    children: ReactNode;
    variante?: 'default' | 'outline';
}) {
    return (
        <Button asChild size="sm" variant={variante}>
            <Link href={href}>
                {Icone && <Icone className="size-4" />}
                {children}
            </Link>
        </Button>
    );
}

/** Estado de um orçamento (nomes do Dolibarr) */
export function EstadoOrcamento({ estado, expirado }: { estado: string; expirado?: boolean }) {
    if (estado === 'rascunho') return <Estado cor="cinza">Rascunho</Estado>;
    if (estado === 'aberto') return expirado ? <Estado cor="vermelho">Aberto — expirado</Estado> : <Estado cor="laranja">Aberto</Estado>;
    if (estado === 'assinado') return <Estado cor="azul">Assinado (por facturar)</Estado>;
    if (estado === 'recusado') return <Estado cor="cinza">Não assinado</Estado>;
    return <Estado cor="verde">Facturado</Estado>;
}

/** Estado de uma encomenda de venda (nomes do Dolibarr), com a marca "facturada" */
export function EstadoEncomenda({ estado, facturada, atrasada }: { estado: string; facturada?: boolean; atrasada?: boolean }) {
    const base =
        estado === 'rascunho' ? (
            <Estado cor="cinza">Rascunho</Estado>
        ) : estado === 'validada' ? (
            atrasada ? (
                <Estado cor="vermelho">Validada — atrasada</Estado>
            ) : (
                <Estado cor="laranja">Validada</Estado>
            )
        ) : estado === 'entregue' ? (
            <Estado cor="azul">Entregue</Estado>
        ) : (
            <Estado cor="cinza">Anulada</Estado>
        );
    return (
        <span className="inline-flex flex-wrap gap-1">
            {base}
            {facturada && <Estado cor="verde">Facturada</Estado>}
        </span>
    );
}

/** Estado de uma nota de crédito */
/** Estado de uma reserva de aluguer */
export function EstadoReserva({ estado, atrasada }: { estado: string; atrasada?: boolean }) {
    if (estado === 'pedido') return <Estado cor="laranja">Pedido</Estado>;
    if (estado === 'confirmada') return <Estado cor="azul">Confirmada</Estado>;
    if (estado === 'entregue') return atrasada ? <Estado cor="vermelho">Recolha em atraso</Estado> : <Estado cor="roxo">Entregue</Estado>;
    if (estado === 'devolvida') return <Estado cor="verde">Devolvida</Estado>;
    return <Estado cor="cinza">Cancelada</Estado>;
}

export function EstadoNotaCredito({ estado }: { estado: string }) {
    if (estado === 'rascunho') return <Estado cor="cinza">Rascunho</Estado>;
    if (estado === 'validada') return <Estado cor="laranja">Por reembolsar</Estado>;
    return <Estado cor="verde">Fechada</Estado>;
}

/** Estado de uma encomenda a fornecedor (nomes do Dolibarr), com a marca "facturada" */
export function EstadoEncomendaFornecedor({ estado, facturada, atrasada }: { estado: string; facturada?: boolean; atrasada?: boolean }) {
    const base =
        estado === 'rascunho' ? (
            <Estado cor="cinza">Rascunho</Estado>
        ) : estado === 'validada' ? (
            <Estado cor="laranja">Validada</Estado>
        ) : estado === 'encomendada' ? (
            atrasada ? (
                <Estado cor="vermelho">Encomendada — atrasada</Estado>
            ) : (
                <Estado cor="azul">Encomendada</Estado>
            )
        ) : estado === 'recebida' ? (
            <Estado cor="verde">Recebida</Estado>
        ) : (
            <Estado cor="cinza">Anulada</Estado>
        );
    return (
        <span className="inline-flex flex-wrap gap-1">
            {base}
            {facturada && <Estado cor="roxo">Facturada</Estado>}
        </span>
    );
}

/** Estado de uma factura de fornecedor */
export function EstadoFacturaFornecedor({ estado, vencida, parcial }: { estado: string; vencida?: boolean; parcial?: boolean }) {
    if (estado === 'rascunho') return <Estado cor="cinza">Rascunho</Estado>;
    if (estado === 'paga') return <Estado cor="verde">Paga</Estado>;
    if (estado === 'abandonada') return <Estado cor="cinza">Abandonada</Estado>;
    if (vencida) return <Estado cor="vermelho">Vencida</Estado>;
    if (parcial) return <Estado cor="azul">Paga em parte</Estado>;
    return <Estado cor="laranja">Por pagar</Estado>;
}

export interface Relacionado {
    tipo: 'orcamento' | 'reserva' | 'encomenda' | 'factura' | 'nota_credito' | 'encomenda_fornecedor' | 'factura_fornecedor';
    id: number;
    referencia: string;
    data: string;
    total_sem_iva: string;
    estado: string;
}

const ROTULO_TIPO: Record<Relacionado['tipo'], [string, string]> = {
    orcamento: ['Orçamento', '/orcamentos'],
    reserva: ['Reserva', '/reservas'],
    encomenda: ['Encomenda de venda', '/encomendas'],
    factura: ['Factura a cliente', '/facturas'],
    nota_credito: ['Nota de crédito', '/notas-credito'],
    encomenda_fornecedor: ['Encomenda a fornecedor', '/encomendas-fornecedor'],
    factura_fornecedor: ['Factura de fornecedor', '/facturas-fornecedor'],
};

/** Documentos ligados a este (orçamento → reserva → factura → nota de crédito) */
export function ObjectosRelacionados({ itens }: { itens: Relacionado[] }) {
    return (
        <Bloco titulo="Objectos relacionados" className="mt-4">
            <table className="tabela">
                <thead>
                    <tr>
                        <th>Tipo</th>
                        <th>Ref.</th>
                        <th>Data</th>
                        <th className="text-right">Valor (sem IVA)</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {itens.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-muted-foreground italic">
                                Nenhum
                            </td>
                        </tr>
                    )}
                    {itens.map((r) => {
                        const [rotulo, base] = ROTULO_TIPO[r.tipo];
                        return (
                            <tr key={`${r.tipo}-${r.id}`}>
                                <td>{rotulo}</td>
                                <td>
                                    <Link href={`${base}/${r.id}`} className="text-primary font-medium hover:underline">
                                        {r.referencia}
                                    </Link>
                                </td>
                                <td className="tabular-nums">{r.data.split('-').reverse().join('/')}</td>
                                <td className="text-right tabular-nums">
                                    {Number(r.total_sem_iva).toLocaleString('pt-PT', { minimumFractionDigits: 2, useGrouping: 'always' })}
                                </td>
                                <td>
                                    {r.tipo === 'orcamento' ? (
                                        <EstadoOrcamento estado={r.estado} />
                                    ) : r.tipo === 'reserva' ? (
                                        <EstadoReserva estado={r.estado} />
                                    ) : r.tipo === 'encomenda' ? (
                                        <EstadoEncomenda estado={r.estado} />
                                    ) : r.tipo === 'nota_credito' ? (
                                        <EstadoNotaCredito estado={r.estado} />
                                    ) : r.tipo === 'encomenda_fornecedor' ? (
                                        <EstadoEncomendaFornecedor estado={r.estado} />
                                    ) : r.tipo === 'factura_fornecedor' ? (
                                        <EstadoFacturaFornecedor estado={r.estado} />
                                    ) : (
                                        <EstadoFactura estado={r.estado} />
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </Bloco>
    );
}
