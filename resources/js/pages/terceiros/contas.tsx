import { Estado, FiltroTexto, LinhaVazia, TituloPagina, useListaFiltros, type CorEstado } from '@/components/erp';
import InputError from '@/components/input-error';
import { Paginacao } from '@/components/paginacao';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { formatRelativo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Paginado } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Sugestao {
    id: number;
    nome: string;
    codigo: string | null;
    telemovel: string | null;
    email: string | null;
    nuit: string | null;
}

interface Conta {
    id: number;
    nome: string;
    email: string;
    telemovel: string;
    nuit: string | null;
    local: string;
    estado: 'pendente' | 'activa' | 'recusada' | 'suspensa';
    motivo: string | null;
    pedido_em: string | null;
    aprovada_em: string | null;
    aprovada_por: string | null;
    ultimo_acesso_em: string | null;
    terceiro: { id: number; nome: string; codigo: string | null } | null;
    sugestoes: Sugestao[];
}

interface Props {
    contas: Paginado<Conta>;
    filtros: { estado: string | null; pesquisa: string | null };
    pendentes: number;
}

const ESTADOS: { valor: Conta['estado']; label: string; cor: CorEstado }[] = [
    { valor: 'pendente', label: 'Por aprovar', cor: 'laranja' },
    { valor: 'activa', label: 'Activa', cor: 'verde' },
    { valor: 'suspensa', label: 'Suspensa', cor: 'vermelho' },
    { valor: 'recusada', label: 'Recusada', cor: 'cinza' },
];

export default function ContasClientes({ contas, filtros, pendentes }: Props) {
    // O objecto dos filtros vem do servidor e mantém-se o mesmo entre desenhos (um objecto novo a cada desenho fazia a lista recomeçar sem fim)
    const lista = useListaFiltros('/contas-clientes', filtros as unknown as Record<string, string | undefined>);
    const [aprovar, setAprovar] = useState<Conta | null>(null);
    const [motivo, setMotivo] = useState<{ conta: Conta; accao: 'recusar' | 'suspender' } | null>(null);

    return (
        <AppLayout>
            <Head title="Contas de clientes" />
            <TituloPagina
                titulo="Contas de clientes"
                contagem={contas.total}
                descricao="Pedidos de conta feitos pelos clientes. A conta só entra na área do cliente depois de aprovada e ligada a uma ficha de cliente."
            />

            <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1">
                    {[{ valor: '', label: 'Todas' }, ...ESTADOS].map((e) => {
                        const activo = (filtros.estado ?? '') === e.valor;
                        return (
                            <button
                                key={e.label}
                                type="button"
                                onClick={() => lista.escolher('estado', e.valor || 'todas')}
                                className={cn(
                                    'h-8 rounded-md px-3 text-[13px]',
                                    activo
                                        ? 'bg-foreground text-background font-medium'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                                )}
                            >
                                {e.label}
                                {e.valor === 'pendente' && pendentes > 0 && <span className="ml-1.5 tabular-nums">{pendentes}</span>}
                            </button>
                        );
                    })}
                </div>
                <FiltroTexto
                    rotulo="nome, e-mail ou telemóvel"
                    valor={lista.valores.pesquisa}
                    onChange={(v) => lista.escrever('pesquisa', v)}
                    className="w-60 max-w-full"
                />
            </div>

            <div className="painel overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Contactos</th>
                            <th>Morada</th>
                            <th>Estado</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {contas.data.length === 0 && <LinhaVazia colunas={5} texto="Nenhuma conta" />}
                        {contas.data.map((c) => {
                            const estado = ESTADOS.find((e) => e.valor === c.estado)!;
                            return (
                                <tr key={c.id}>
                                    <td className="min-w-48">
                                        <span className="font-medium">{c.nome}</span>
                                        <div className="text-muted-foreground text-[12.5px]">
                                            {c.terceiro ? (
                                                <Link href={`/terceiros/${c.terceiro.id}`} className="hover:text-foreground hover:underline">
                                                    Ficha {c.terceiro.codigo ?? c.terceiro.nome}
                                                </Link>
                                            ) : (
                                                <>Pediu {formatRelativo(c.pedido_em)}</>
                                            )}
                                            {c.nuit && <> · NUIT {c.nuit}</>}
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap">
                                        <div>{c.telemovel}</div>
                                        <div className="text-muted-foreground text-[12.5px]">{c.email}</div>
                                    </td>
                                    <td className="text-muted-foreground max-w-64">{c.local || '—'}</td>
                                    <td>
                                        <Estado cor={estado.cor}>{estado.label}</Estado>
                                        <div className="text-muted-foreground text-[12.5px]">
                                            {c.estado === 'activa' &&
                                                (c.ultimo_acesso_em ? `Entrou ${formatRelativo(c.ultimo_acesso_em)}` : 'Ainda não entrou')}
                                            {(c.estado === 'recusada' || c.estado === 'suspensa') && c.motivo}
                                        </div>
                                    </td>
                                    <td className="text-right whitespace-nowrap">
                                        {c.estado === 'pendente' && (
                                            <>
                                                <Button size="sm" onClick={() => setAprovar(c)}>
                                                    Aprovar
                                                </Button>{' '}
                                                <Button size="sm" variant="ghost" onClick={() => setMotivo({ conta: c, accao: 'recusar' })}>
                                                    Recusar
                                                </Button>
                                            </>
                                        )}
                                        {c.estado === 'recusada' && (
                                            <Button size="sm" variant="outline" onClick={() => setAprovar(c)}>
                                                Aprovar
                                            </Button>
                                        )}
                                        {c.estado === 'activa' && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="hover:text-destructive"
                                                onClick={() => setMotivo({ conta: c, accao: 'suspender' })}
                                            >
                                                Suspender
                                            </Button>
                                        )}
                                        {c.estado === 'suspensa' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => router.post(`/contas-clientes/${c.id}/reactivar`, {}, { preserveScroll: true })}
                                            >
                                                Reactivar
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <Paginacao pagina={contas} nome="contas" />

            {aprovar && <DialogoAprovar conta={aprovar} onFechar={() => setAprovar(null)} />}
            {motivo && <DialogoMotivo conta={motivo.conta} accao={motivo.accao} onFechar={() => setMotivo(null)} />}
        </AppLayout>
    );
}

/** Aprovar: criar a ficha de cliente com os dados do pedido, ou ligar a uma ficha que já existe */
function DialogoAprovar({ conta: c, onFechar }: { conta: Conta; onFechar: () => void }) {
    const { data, setData, post, processing, errors } = useForm<{ terceiro_id: string }>({
        terceiro_id: c.sugestoes.length > 0 ? String(c.sugestoes[0].id) : '',
    });

    function submeter(e: FormEvent) {
        e.preventDefault();
        post(`/contas-clientes/${c.id}/aprovar`, { preserveScroll: true, onSuccess: onFechar });
    }

    const opcao = (valor: string, titulo: string, detalhe: string) => (
        <label
            key={valor || 'nova'}
            className={cn('flex cursor-pointer gap-3 rounded-md border px-3 py-2.5 text-[13.5px]', data.terceiro_id === valor && 'border-foreground')}
        >
            <input
                type="radio"
                name="ficha"
                checked={data.terceiro_id === valor}
                onChange={() => setData('terceiro_id', valor)}
                className="mt-1 accent-[var(--primary)]"
            />
            <span>
                <span className="font-medium">{titulo}</span>
                <span className="text-muted-foreground block text-[12.5px]">{detalhe}</span>
            </span>
        </label>
    );

    return (
        <Dialog open onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={submeter} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>Aprovar a conta de {c.nome}</DialogTitle>
                        <DialogDescription>
                            {c.telemovel} · {c.email}
                            {c.nuit && <> · NUIT {c.nuit}</>}
                        </DialogDescription>
                    </DialogHeader>
                    {c.sugestoes.length > 0 && (
                        <p className="text-[13.5px]">
                            Encontrámos fichas com o mesmo NUIT, e-mail ou telemóvel. Se for a mesma pessoa, ligue a conta à ficha para não repetir o
                            cliente.
                        </p>
                    )}
                    <div className="grid gap-2">
                        {c.sugestoes.map((s) =>
                            opcao(
                                String(s.id),
                                `Ligar a ${s.nome}${s.codigo ? ` (${s.codigo})` : ''}`,
                                [s.telemovel, s.email, s.nuit && `NUIT ${s.nuit}`].filter(Boolean).join(' · '),
                            ),
                        )}
                        {opcao('', 'Criar ficha de cliente nova', 'Com o nome, contactos e morada do pedido.')}
                    </div>
                    <InputError message={errors.terceiro_id || (errors as Record<string, string | undefined>).conta} />
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onFechar}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            Aprovar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DialogoMotivo({ conta: c, accao, onFechar }: { conta: Conta; accao: 'recusar' | 'suspender'; onFechar: () => void }) {
    const { data, setData, post, processing } = useForm({ motivo: '' });
    const recusar = accao === 'recusar';

    function submeter(e: FormEvent) {
        e.preventDefault();
        post(`/contas-clientes/${c.id}/${accao}`, { preserveScroll: true, onSuccess: onFechar });
    }

    return (
        <Dialog open onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submeter} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>{recusar ? `Recusar o pedido de ${c.nome}?` : `Suspender a conta de ${c.nome}?`}</DialogTitle>
                        <DialogDescription>
                            {recusar
                                ? 'O cliente não poderá entrar. Pode aprovar o pedido mais tarde.'
                                : 'O cliente deixa de poder entrar até a conta ser reactivada.'}{' '}
                            O motivo é mostrado ao cliente quando tenta entrar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <Label htmlFor="motivo">Motivo (opcional)</Label>
                        <Input id="motivo" value={data.motivo} onChange={(e) => setData('motivo', e.target.value)} maxLength={255} />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" onClick={onFechar}>
                            Voltar
                        </Button>
                        <Button type="submit" variant="destructive" disabled={processing}>
                            {processing && <LoaderCircle className="size-4 animate-spin" />}
                            {recusar ? 'Recusar' : 'Suspender'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
