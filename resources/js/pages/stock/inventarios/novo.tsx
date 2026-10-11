import { TituloPagina } from '@/components/erp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft, LoaderCircle, Printer } from 'lucide-react';
import { Fragment, useMemo, type FormEvent } from 'react';

interface Linha {
    id: number;
    referencia: string;
    nome: string;
    categoria: string;
    total: number;
    fora: number;
}

type Dados = { contagens: Record<string, string>; nota: string };

export default function NovoInventario({ produtos }: { produtos: Linha[] }) {
    const { data, setData, post, processing, errors } = useForm<Dados>({ contagens: {}, nota: '' });
    const erros = errors as Record<string, string | undefined>;

    const grupos = useMemo(() => {
        const mapa = new Map<string, Linha[]>();
        for (const p of produtos) mapa.set(p.categoria, [...(mapa.get(p.categoria) ?? []), p]);
        return [...mapa.entries()];
    }, [produtos]);

    const contados = Object.values(data.contagens).filter((v) => v !== '').length;
    const comDiferenca = produtos.filter((p) => {
        const v = data.contagens[p.id];
        return v !== undefined && v !== '' && Number(v) !== p.total - p.fora;
    }).length;

    function escrever(id: number, valor: string) {
        setData('contagens', { ...data.contagens, [id]: valor.replace(/[^\d]/g, '') });
    }

    function submeter(e: FormEvent) {
        e.preventDefault();
        post('/stock/inventarios');
    }

    return (
        <AppLayout>
            <Head title="Novo inventário" />
            <Link
                href="/stock/inventarios"
                className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-[13px] print:hidden"
            >
                <ChevronLeft className="size-3.5" />
                Inventários
            </Link>
            <TituloPagina
                titulo="Novo inventário"
                descricao="Conte as peças que estão no armazém e escreva o número. As peças alugadas somam-se sozinhas. Deixe em branco o que não contou."
                accoes={
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
                        <Printer className="size-4" />
                        Imprimir folha de contagem
                    </Button>
                }
            />

            <form onSubmit={submeter}>
                <div className="painel overflow-x-auto">
                    <table className="tabela">
                        <thead>
                            <tr>
                                <th className="min-w-64">Produto</th>
                                <th className="text-right">No sistema</th>
                                <th className="text-right">Alugadas</th>
                                <th className="text-right">Devia estar no armazém</th>
                                <th className="w-36 text-right">Contadas no armazém</th>
                                <th className="text-right print:hidden">Diferença</th>
                            </tr>
                        </thead>
                        <tbody>
                            {grupos.map(([categoria, linhas]) => (
                                <Fragment key={categoria}>
                                    <tr>
                                        <td colSpan={6} className="bg-muted text-muted-foreground py-1.5 text-[12.5px] font-medium">
                                            {categoria}
                                        </td>
                                    </tr>
                                    {linhas.map((p) => {
                                        const esperado = p.total - p.fora;
                                        const valor = data.contagens[p.id] ?? '';
                                        const diferenca = valor === '' ? null : Number(valor) - esperado;
                                        return (
                                            <tr key={p.id}>
                                                <td>
                                                    <span className="font-medium">{p.nome}</span>
                                                    <span className="text-muted-foreground ml-2 text-[12.5px]">{p.referencia}</span>
                                                </td>
                                                <td className="text-right tabular-nums">{p.total}</td>
                                                <td className="text-muted-foreground text-right tabular-nums">{p.fora}</td>
                                                <td className="text-right font-medium tabular-nums">{esperado}</td>
                                                <td className="text-right">
                                                    <Input
                                                        value={valor}
                                                        onChange={(e) => escrever(p.id, e.target.value)}
                                                        inputMode="numeric"
                                                        aria-label={`Contadas de ${p.referencia}`}
                                                        className="ml-auto h-8 w-24 text-right print:border-black"
                                                    />
                                                    {erros[`contagens.${p.id}`] && (
                                                        <p className="text-destructive text-xs">{erros[`contagens.${p.id}`]}</p>
                                                    )}
                                                </td>
                                                <td
                                                    className={cn(
                                                        'text-right font-medium tabular-nums print:hidden',
                                                        diferenca !== null && diferenca < 0 && 'text-red-600 dark:text-red-400',
                                                        diferenca !== null && diferenca > 0 && 'text-green-700 dark:text-green-400',
                                                    )}
                                                >
                                                    {diferenca === null ? (
                                                        ''
                                                    ) : diferenca === 0 ? (
                                                        <span className="text-muted-foreground">certo</span>
                                                    ) : (
                                                        `${diferenca > 0 ? '+' : ''}${diferenca}`
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="painel mt-4 grid gap-3 p-4 print:hidden">
                    <label className="grid gap-1.5 text-[13.5px]">
                        <span className="text-muted-foreground">Nota (opcional)</span>
                        <Input
                            value={data.nota}
                            onChange={(e) => setData('nota', e.target.value)}
                            maxLength={255}
                            placeholder="Ex.: contagem de fim de mês, armazém da Matola"
                        />
                    </label>
                    {(erros.stock || erros.contagens) && <p className="text-destructive text-[13px]">{erros.stock || erros.contagens}</p>}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-muted-foreground text-[13px]">
                            {contados} de {produtos.length} produto(s) contado(s)
                            {comDiferenca > 0 && (
                                <>
                                    {' '}
                                    · <span className="text-foreground font-medium">{comDiferenca} com diferença</span> (o total será corrigido)
                                </>
                            )}
                        </p>
                        <Button type="submit" disabled={processing || contados === 0}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Gravar inventário
                        </Button>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
