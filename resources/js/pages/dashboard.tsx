import { Bloco, BotaoLink, TituloPagina } from '@/components/erp';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatDataHora, formatDataLonga, formatNumero } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Plus } from 'lucide-react';

/** ["NUIT", "morada"] → "NUIT e morada" */
function juntar(itens: string[]) {
    return itens.length < 2 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

interface LinhaCaixa {
    label: string;
    valor: number | string;
    href: string;
    dinheiro?: boolean;
    alerta?: string | null;
    hrefAlerta?: string;
}

interface Caixa {
    id: string;
    titulo: string;
    href: string;
    linhas: LinhaCaixa[];
}

interface Props {
    /** Dados da empresa por preencher (só chega a quem pode configurar) */
    configuracaoEmFalta: string[];
    emAtraso: number;
    caixas: Caixa[];
    login: { nome: string; perfil: string | null; anterior: string | null; ipAnterior: string | null; senhaAlterada: string | null };
    naoPagas: {
        linhas: { id: number; referencia: string; cliente: string; em_falta: string; vencimento: string | null; vencida: boolean }[];
        total: string;
    } | null;
    devedores: { id: number; nome: string; n: number; em_falta: string }[] | null;
}

const ligacao = 'font-medium hover:underline underline-offset-2';

function VerTodos({ href }: { href: string }) {
    return (
        <Link href={href} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[13px]">
            Ver todas
            <ArrowRight className="size-3.5" />
        </Link>
    );
}

function Vazio({ colunas = 1, texto }: { colunas?: number; texto: string }) {
    return (
        <tr>
            <td colSpan={colunas} className="text-muted-foreground py-8 text-center">
                {texto}
            </td>
        </tr>
    );
}

export default function Inicio(props: Props) {
    const { configuracaoEmFalta, emAtraso, caixas, login, naoPagas, devedores } = props;
    const pode = usePode();
    const hoje = formatDataLonga().replace(/^./, (c) => c.toUpperCase());

    return (
        <AppLayout>
            <Head title="Visão geral" />
            <TituloPagina
                titulo="Visão geral"
                descricao={emAtraso > 0 ? `${hoje} · ${emAtraso} ${emAtraso === 1 ? 'documento em atraso' : 'documentos em atraso'}` : hoje}
                accoes={
                    <>
                        {pode('facturas.criar') && (
                            <BotaoLink href="/facturas/nova" variante="outline">
                                Nova factura
                            </BotaoLink>
                        )}
                        {pode('reservas.criar') && (
                            <BotaoLink href="/reservas/nova" icone={Plus}>
                                Nova reserva
                            </BotaoLink>
                        )}
                    </>
                }
            />

            {configuracaoEmFalta.length > 0 && (
                <div className="mb-6 flex flex-col gap-2 rounded-lg border px-4 py-3 text-[13.5px] sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2.5">
                        <span className="size-[7px] shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                        <span>Dados da empresa incompletos: falta {juntar(configuracaoEmFalta)}. Aparecem nas facturas e orçamentos.</span>
                    </p>
                    <Link href="/administracao/configuracao/empresa" className={cn(ligacao, 'shrink-0')}>
                        Completar agora
                    </Link>
                </div>
            )}

            {/* Resumo por área: uma grelha de células separadas por linhas finas */}
            {caixas.length > 0 && (
                <section aria-label="Resumo" className="grelha-celulas mb-8 grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))]">
                    {caixas.map((c) => (
                        <div key={c.id} className="bg-card flex flex-col gap-2.5 px-5 py-4">
                            <Link href={c.href} className="text-muted-foreground hover:text-foreground w-fit text-[13px]">
                                {c.titulo}
                            </Link>
                            <ul className="flex flex-col gap-1.5 text-[13.5px]">
                                {c.linhas.map((l) => (
                                    <li key={l.label} className="flex items-baseline justify-between gap-3">
                                        <Link href={l.href} className="underline-offset-2 hover:underline">
                                            {l.label}
                                        </Link>
                                        <span className="flex items-baseline gap-2 whitespace-nowrap">
                                            {l.alerta && (
                                                <Link
                                                    href={l.hrefAlerta ?? l.href}
                                                    className="text-[12.5px] text-red-600 hover:underline dark:text-red-400"
                                                >
                                                    {l.alerta}
                                                </Link>
                                            )}
                                            <span className="font-semibold tabular-nums">{l.dinheiro ? `${formatNumero(l.valor)} MT` : l.valor}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>
            )}

            <div className="grid gap-x-6 gap-y-8 lg:grid-cols-2">
                {naoPagas && (
                    <section>
                        <div className="mb-3 flex items-baseline justify-between">
                            <h2 className="text-[15px] font-semibold">Por receber</h2>
                            <VerTodos href="/facturas?estado=validada&ordem=vencimento&dir=asc" />
                        </div>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="tabela">
                                <thead>
                                    <tr>
                                        <th>Factura</th>
                                        <th>Vencimento</th>
                                        <th className="text-right">Restante</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {naoPagas.linhas.length === 0 && <Vazio colunas={3} texto="Nenhuma factura por receber" />}
                                    {naoPagas.linhas.map((f) => (
                                        <tr key={f.id}>
                                            <td>
                                                <Link href={`/facturas/${f.id}`} className={ligacao}>
                                                    {f.cliente}
                                                </Link>
                                                <span className="text-muted-foreground block font-mono text-[12px]">{f.referencia}</span>
                                            </td>
                                            <td className={cn('whitespace-nowrap', f.vencida && 'text-red-600 dark:text-red-400')}>
                                                {formatData(f.vencimento)}
                                            </td>
                                            <td className="text-right whitespace-nowrap">{formatNumero(f.em_falta)} MT</td>
                                        </tr>
                                    ))}
                                </tbody>
                                {naoPagas.linhas.length > 0 && (
                                    <tfoot>
                                        <tr className="font-semibold">
                                            <td colSpan={2} className="px-4 py-2.5">
                                                Total por receber
                                            </td>
                                            <td className="px-4 py-2.5 text-right tabular-nums">{formatNumero(naoPagas.total)} MT</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </section>
                )}

                {devedores && (
                    <section>
                        <h2 className="mb-3 text-[15px] font-semibold">Clientes com mais por receber</h2>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="tabela">
                                <tbody>
                                    {devedores.length === 0 && <Vazio texto="Nenhum cliente com valores em aberto" />}
                                    {devedores.map((d) => (
                                        <tr key={d.id}>
                                            <td>
                                                <Link href={`/terceiros/${d.id}`} className={ligacao}>
                                                    {d.nome}
                                                </Link>
                                            </td>
                                            <td className="text-muted-foreground text-right whitespace-nowrap">
                                                {d.n} {d.n === 1 ? 'factura' : 'facturas'}
                                            </td>
                                            <td className="text-right font-medium whitespace-nowrap">{formatNumero(d.em_falta)} MT</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <Bloco titulo="A sua sessão">
                    <dl className="ficha">
                        <div>
                            <dt>Utilizador</dt>
                            <dd>
                                {login.nome}
                                {login.perfil && <span className="text-muted-foreground"> · {login.perfil}</span>}
                            </dd>
                        </div>
                        <div>
                            <dt>Entrada anterior</dt>
                            <dd>
                                {login.anterior ? (
                                    <>
                                        {formatDataHora(login.anterior)}
                                        {login.ipAnterior && <span className="text-muted-foreground"> · IP {login.ipAnterior}</span>}
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">Primeira entrada</span>
                                )}
                            </dd>
                        </div>
                        <div>
                            <dt>Senha alterada em</dt>
                            <dd>{login.senhaAlterada ? formatDataHora(login.senhaAlterada) : <span className="text-muted-foreground">—</span>}</dd>
                        </div>
                    </dl>
                </Bloco>
            </div>
        </AppLayout>
    );
}
