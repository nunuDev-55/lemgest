import { FiltroEscolha, FiltroTexto, LinhaVazia, TituloPagina, useListaFiltros } from '@/components/erp';
import { MiniaturaProduto } from '@/components/foto-produto';
import { hojeLocal } from '@/components/stock';
import AppLayout from '@/layouts/app-layout';
import { formatData } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router, usePage } from '@inertiajs/react';

type Opcao = { valor: string; label: string };

interface Linha {
    id: number;
    referencia: string;
    nome: string;
    categoria: string | null;
    foto: string | null;
    total: number;
    ocupado: number;
    disponivel: number;
    dia_mais_cheio: string | null;
}

interface Props {
    periodo: { de: string; ate: string; dias: number };
    filtros: Record<string, string | undefined>;
    categorias: Opcao[];
    linhas: Linha[];
}

const campoData = 'border-input bg-card focus-visible:ring-ring h-9 rounded-md border px-2.5 text-[13.5px] outline-none focus-visible:ring-2';

function somarDias(iso: string, n: number): string {
    const [a, m, d] = iso.split('-').map(Number);
    const data = new Date(a, m - 1, d + n);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

/** Próximo sábado e domingo (o fim-de-semana desta semana, se ainda não acabou) */
function fimDeSemana(hoje: string): [string, string] {
    const [a, m, d] = hoje.split('-').map(Number);
    const diaSemana = new Date(a, m - 1, d).getDay(); // 0 = domingo
    if (diaSemana === 0) return [hoje, hoje];
    const sabado = somarDias(hoje, 6 - diaSemana);
    return [sabado, somarDias(sabado, 1)];
}

export default function Disponibilidade({ periodo, filtros, categorias, linhas }: Props) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const lista = useListaFiltros('/stock/disponibilidade', filtros);
    const hoje = hojeLocal();

    function mudarPeriodo(de: string, ate: string) {
        const params = Object.fromEntries(
            Object.entries({ ...lista.valores, de, ate: ate < de ? de : ate }).filter(([, v]) => v !== undefined && v !== '' && v !== 'todos'),
        );
        router.get('/stock/disponibilidade', params, { preserveState: true, preserveScroll: true, replace: true });
    }

    const atalhos: { label: string; de: string; ate: string }[] = [
        { label: 'Hoje', de: hoje, ate: hoje },
        { label: 'Amanhã', de: somarDias(hoje, 1), ate: somarDias(hoje, 1) },
        { label: 'Fim-de-semana', de: fimDeSemana(hoje)[0], ate: fimDeSemana(hoje)[1] },
        { label: 'Próximos 7 dias', de: hoje, ate: somarDias(hoje, 6) },
    ];

    return (
        <AppLayout>
            <Head title="Disponibilidade" />
            <TituloPagina titulo="Disponibilidade por data" descricao="Quantas peças de cada produto estão livres em todos os dias do período." />

            <div className="painel mb-4 grid gap-3 p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <label className="grid gap-1 text-[12.5px]">
                        <span className="text-muted-foreground">De</span>
                        <input
                            type="date"
                            value={periodo.de}
                            min={hoje}
                            onChange={(e) => e.target.value && mudarPeriodo(e.target.value, periodo.ate)}
                            className={campoData}
                        />
                    </label>
                    <label className="grid gap-1 text-[12.5px]">
                        <span className="text-muted-foreground">Até</span>
                        <input
                            type="date"
                            value={periodo.ate}
                            min={periodo.de}
                            onChange={(e) => e.target.value && mudarPeriodo(periodo.de, e.target.value)}
                            className={campoData}
                        />
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {atalhos.map((a) => {
                            const activo = a.de === periodo.de && a.ate === periodo.ate;
                            return (
                                <button
                                    key={a.label}
                                    type="button"
                                    onClick={() => mudarPeriodo(a.de, a.ate)}
                                    className={cn(
                                        'h-9 rounded-md px-3 text-[13px]',
                                        activo
                                            ? 'bg-foreground text-background font-medium'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                                    )}
                                >
                                    {a.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {(errors.de || errors.ate) && <p className="text-destructive text-[13px]">{errors.de || errors.ate}</p>}
                <p className="text-muted-foreground text-[13px]">
                    {periodo.de === periodo.ate ? (
                        <>
                            Dia <span className="text-foreground font-medium">{formatData(periodo.de)}</span>.
                        </>
                    ) : (
                        <>
                            De <span className="text-foreground font-medium">{formatData(periodo.de)}</span> a{' '}
                            <span className="text-foreground font-medium">{formatData(periodo.ate)}</span> ({periodo.dias} dias).
                        </>
                    )}{' '}
                    Conta as peças alugadas que ainda não voltaram (até ao dia previsto de devolução, inclusive). As reservas entram quando o módulo
                    de reservas estiver pronto.
                </p>
            </div>

            <div className="painel overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr className="linha-filtros">
                            <th>
                                <FiltroTexto
                                    rotulo="nome ou referência"
                                    valor={lista.valores.pesquisa}
                                    onChange={(v) => lista.escrever('pesquisa', v)}
                                    className="max-w-64"
                                />
                            </th>
                            <th>
                                <FiltroEscolha
                                    rotulo="categoria"
                                    valor={lista.valores.categoria}
                                    onChange={(v) => lista.escolher('categoria', v)}
                                    opcoes={[...categorias, { valor: 'sem', label: 'Sem categoria' }]}
                                />
                            </th>
                            <th colSpan={3} />
                        </tr>
                        <tr>
                            <th className="min-w-64">Produto</th>
                            <th>Categoria</th>
                            <th className="text-right">Total</th>
                            <th className="text-right">Ocupadas</th>
                            <th className="text-right">Livres</th>
                        </tr>
                    </thead>
                    <tbody>
                        {linhas.length === 0 && <LinhaVazia colunas={5} texto="Nenhum produto de aluguer encontrado" />}
                        {linhas.map((l) => (
                            <tr key={l.id}>
                                <td>
                                    <Link href={`/produtos/${l.id}#stock`} className="group flex items-center gap-3">
                                        <MiniaturaProduto src={l.foto} nome={l.nome} className="size-10" />
                                        <span className="min-w-0">
                                            <span className="line-clamp-1 font-medium group-hover:underline">{l.nome}</span>
                                            <span className="text-muted-foreground text-[12.5px]">{l.referencia}</span>
                                        </span>
                                    </Link>
                                </td>
                                <td className="text-muted-foreground whitespace-nowrap">{l.categoria ?? '—'}</td>
                                <td className="text-right tabular-nums">{l.total}</td>
                                <td className="text-right tabular-nums">
                                    {l.ocupado > 0 ? (
                                        <span title={l.dia_mais_cheio ? `Dia mais ocupado: ${formatData(l.dia_mais_cheio)}` : undefined}>
                                            {l.ocupado}
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground/60">0</span>
                                    )}
                                </td>
                                <td
                                    className={cn(
                                        'text-right text-[15px] font-semibold tabular-nums',
                                        l.disponivel === 0 && 'text-red-600 dark:text-red-400',
                                    )}
                                >
                                    {l.disponivel}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}
