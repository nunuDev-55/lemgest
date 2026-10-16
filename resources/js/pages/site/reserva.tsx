import InputError from '@/components/input-error';
import { Disponibilidade, Foto, type ProdutoLoja } from '@/components/site';
import SiteLayout from '@/layouts/site-layout';
import { formatNumero, formatValor } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link, router, useForm } from '@inertiajs/react';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { useEffect, type FormEvent } from 'react';

interface Linha extends ProdutoLoja {
    quantidade: number;
}

interface Props {
    linhas: Linha[];
    datas: { de?: string; ate?: string };
    transporte: { minimo: string; maximo: string };
    contacto: string;
}

const campo =
    'border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-2.5 text-[13.5px] outline-none focus-visible:ring-2';

function diasEntre(de: string, ate: string): number {
    if (!de) return 1;
    const d = (Date.parse(`${ate || de}T00:00:00`) - Date.parse(`${de}T00:00:00`)) / 86400000;
    return Math.max(1, Math.round(d) + 1);
}

/** A reserva em curso: material escolhido, datas, transporte e local; enviar cria um pedido que a LemServ confirma */
export default function ReservaSite({ linhas, datas, transporte, contacto }: Props) {
    const form = useForm({
        data_evento: datas.de ?? '',
        data_fim_evento: datas.ate ?? '',
        transporte: true as boolean,
        local: '',
        contacto_local: contacto,
        tema: '',
        nota: '',
    });
    const dias = diasEntre(form.data.data_evento, form.data.data_fim_evento);
    const material = linhas.reduce((t, l) => t + Number(l.preco_dia ?? 0) * l.quantidade * dias, 0);
    const erros = form.errors as Record<string, string | undefined>;

    /** Guarda a nova quantidade (entre 1 e 9999) e devolve a que fica */
    function mudarQuantidade(l: Linha, valor: string) {
        const q = Math.max(1, Math.min(9999, Number(valor) || 1));
        if (q !== l.quantidade) router.put(`/catalogo/reserva/linhas/${l.id}`, { quantidade: q }, { preserveScroll: true, preserveState: true });
        return q;
    }

    // Ao escolher as datas, a disponibilidade de cada peça actualiza-se sozinha
    const de = form.data.data_evento;
    const ate = form.data.data_fim_evento;
    useEffect(() => {
        if (!de || (de === (datas.de ?? '') && ate === (datas.ate ?? ''))) return;
        const t = setTimeout(
            () =>
                router.get(
                    '/catalogo/reserva',
                    { de, ate: ate && ate >= de ? ate : undefined },
                    { only: ['linhas', 'datas'], preserveScroll: true, preserveState: true, replace: true },
                ),
            300,
        );
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [de, ate]);

    // Peças pedidas a mais para as datas escolhidas
    const aMais = linhas.filter((l) => l.disponivel !== null && l.disponivel !== undefined && l.quantidade > l.disponivel);

    function enviar(e: FormEvent) {
        e.preventDefault();
        form.post('/catalogo/reserva', { preserveScroll: true });
    }

    return (
        <SiteLayout titulo="A minha reserva · LemServ">
            <div className="mx-auto max-w-6xl px-4 py-10 md:px-8">
                <h1 className="titulo-maiusculo text-[34px] sm:text-[44px]">A minha reserva</h1>
                <p className="text-muted-foreground mt-3 text-[14px]">
                    O pedido não prende o material: a LemServ confirma a disponibilidade e a taxa de transporte e contacta-o.
                </p>

                {linhas.length === 0 ? (
                    <div className="mt-8 rounded-lg border px-4 py-12 text-center">
                        <p className="text-muted-foreground text-[14px]">Ainda não escolheu material.</p>
                        <Link
                            href="/catalogo"
                            className="bg-primary text-primary-foreground mt-4 inline-block rounded-md px-4 py-2 text-[13.5px] font-medium"
                        >
                            Ir ao catálogo
                        </Link>
                    </div>
                ) : (
                    // Colunas que podem encolher: um nome de peça comprido corta-se (…) em vez de alargar a página no telemóvel
                    <form onSubmit={enviar} className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                        <div className="grid grid-cols-1 gap-6">
                            <section className="grid gap-4">
                                <h2 className="font-titulo text-[24px] font-medium">Quando é o evento?</h2>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="grid gap-1 text-[13px]">
                                        Primeiro dia
                                        <input
                                            type="date"
                                            value={form.data.data_evento}
                                            onChange={(e) => form.setData('data_evento', e.target.value)}
                                            className={campo}
                                        />
                                        <InputError message={form.errors.data_evento} />
                                    </label>
                                    <label className="grid gap-1 text-[13px]">
                                        Último dia <span className="text-muted-foreground text-[12px]">(se for mais de um dia)</span>
                                        <input
                                            type="date"
                                            value={form.data.data_fim_evento}
                                            min={form.data.data_evento}
                                            onChange={(e) => form.setData('data_fim_evento', e.target.value)}
                                            className={campo}
                                        />
                                        <InputError message={form.errors.data_fim_evento} />
                                    </label>
                                </div>
                            </section>

                            <section>
                                <h2 className="font-titulo mb-3 text-[24px] font-medium">O material</h2>
                                {!de && (
                                    <p className="text-muted-foreground -mt-1 mb-3 text-[13px]">
                                        Escolha as datas do evento para ver quantas peças estão livres.
                                    </p>
                                )}
                                <ul className="bg-card divide-y rounded-2xl border">
                                    {linhas.map((l) => (
                                        // No telemóvel a quantidade fica por baixo do nome (que pode ocupar duas linhas); a partir de 640 px, tudo numa linha
                                        <li
                                            key={l.id}
                                            className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-2 p-3 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center"
                                        >
                                            <Link
                                                href={`/catalogo/${l.id}`}
                                                aria-label={`Ver ${l.nome}`}
                                                className="row-span-2 size-16 overflow-hidden rounded-md sm:row-span-1"
                                            >
                                                <Foto src={l.foto} alt={l.nome} />
                                            </Link>
                                            <div className="min-w-0">
                                                <p className="line-clamp-2 text-[14px] leading-snug font-medium sm:line-clamp-1">{l.nome}</p>
                                                <p className="text-muted-foreground text-[12.5px] tabular-nums">
                                                    {formatNumero(l.preco_dia)} MT / dia
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    // Volta a mostrar a quantidade guardada sempre que ela muda (por exemplo, em "Pedir 20")
                                                    key={l.quantidade}
                                                    type="number"
                                                    min={1}
                                                    max={9999}
                                                    defaultValue={l.quantidade}
                                                    onBlur={(e) => {
                                                        e.target.value = String(mudarQuantidade(l, e.target.value));
                                                    }}
                                                    aria-label={`Quantidade de ${l.nome}`}
                                                    className={cn(campo, 'w-20 text-right')}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => router.delete(`/catalogo/reserva/linhas/${l.id}`, { preserveScroll: true })}
                                                    className="text-muted-foreground hover:text-destructive p-1.5"
                                                    aria-label={`Tirar ${l.nome}`}
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                            {/* O que está livre nas datas escolhidas: por baixo, alinhado com o nome */}
                                            {l.disponivel !== null && l.disponivel !== undefined && (
                                                <div className="col-start-2 sm:col-end-4">
                                                    {l.quantidade > l.disponivel ? (
                                                        <p className="text-[12.5px] text-red-700">
                                                            {l.disponivel === 0
                                                                ? 'Esgotado nessas datas.'
                                                                : `Só ${l.disponivel} livres nessas datas.`}{' '}
                                                            {l.disponivel > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => mudarQuantidade(l, String(l.disponivel))}
                                                                    className="font-medium underline"
                                                                >
                                                                    Pedir {l.disponivel}
                                                                </button>
                                                            )}
                                                        </p>
                                                    ) : (
                                                        <Disponibilidade n={l.disponivel} />
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                <InputError message={erros.linhas} className="mt-2" />
                                <Link href="/catalogo" className="text-muted-foreground hover:text-foreground mt-2 inline-block text-[13px]">
                                    + Juntar mais material
                                </Link>
                            </section>

                            <section className="grid gap-4">
                                <h2 className="font-titulo text-[24px] font-medium">Onde e como</h2>
                                <fieldset className="grid gap-2 text-[13.5px]">
                                    <legend className="mb-1 text-[13px]">Transporte</legend>
                                    <label className="flex items-start gap-2 rounded-md border p-3">
                                        <input
                                            type="radio"
                                            checked={form.data.transporte}
                                            onChange={() => form.setData('transporte', true)}
                                            className="mt-1 accent-[var(--primary)]"
                                        />
                                        <span>
                                            Sim, a LemServ leva e recolhe o material
                                            <span className="text-muted-foreground block text-[12.5px]">
                                                Taxa de {formatValor(transporte.minimo)} a {formatValor(transporte.maximo)} MT, conforme o local
                                                (confirmada pela LemServ).
                                            </span>
                                        </span>
                                    </label>
                                    <label className="flex items-start gap-2 rounded-md border p-3">
                                        <input
                                            type="radio"
                                            checked={!form.data.transporte}
                                            onChange={() => form.setData('transporte', false)}
                                            className="mt-1 accent-[var(--primary)]"
                                        />
                                        <span>Não, levanto e devolvo no armazém da LemServ</span>
                                    </label>
                                </fieldset>

                                <label className="grid gap-1 text-[13px]">
                                    Local do evento{' '}
                                    {form.data.transporte && <span className="text-muted-foreground text-[12px]">(obrigatório com transporte)</span>}
                                    <input
                                        value={form.data.local}
                                        onChange={(e) => form.setData('local', e.target.value)}
                                        placeholder="Ex.: Salão da Igreja, Av. Eduardo Mondlane 1234, Maputo"
                                        maxLength={255}
                                        className={campo}
                                    />
                                    <InputError message={form.errors.local} />
                                </label>
                                <label className="grid gap-1 text-[13px]">
                                    Contacto no local
                                    <input
                                        value={form.data.contacto_local}
                                        onChange={(e) => form.setData('contacto_local', e.target.value)}
                                        maxLength={120}
                                        className={campo}
                                    />
                                </label>
                                <label className="grid gap-1 text-[13px]">
                                    Tema de cores
                                    <input
                                        value={form.data.tema}
                                        onChange={(e) => form.setData('tema', e.target.value)}
                                        placeholder="Ex.: Branco e dourado"
                                        maxLength={120}
                                        className={campo}
                                    />
                                </label>
                                <label className="grid gap-1 text-[13px]">
                                    Observações
                                    <textarea
                                        value={form.data.nota}
                                        onChange={(e) => form.setData('nota', e.target.value)}
                                        rows={3}
                                        maxLength={2000}
                                        className={cn(campo, 'h-auto py-2')}
                                    />
                                </label>
                            </section>
                        </div>

                        <aside className="sticky top-24 rounded-2xl bg-[var(--areia)]/60 p-6 text-[13.5px]">
                            <h2 className="mb-3 text-[15px] font-semibold">Resumo</h2>
                            <dl className="grid gap-2">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Dias</dt>
                                    <dd className="tabular-nums">{dias}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Material</dt>
                                    <dd className="tabular-nums">{formatNumero(material)} MT</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Transporte</dt>
                                    <dd>{form.data.transporte ? 'a confirmar' : '—'}</dd>
                                </div>
                                <div className="mt-1 flex justify-between border-t pt-2 text-[15px] font-semibold">
                                    <dt>Total estimado</dt>
                                    <dd className="tabular-nums">{formatNumero(material)} MT</dd>
                                </div>
                            </dl>
                            <p className="text-muted-foreground mt-2 text-[12px]">
                                Valores com IVA{form.data.transporte ? ', sem a taxa de transporte' : ''}.
                            </p>
                            <button
                                type="submit"
                                disabled={form.processing || aMais.length > 0}
                                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[3px] bg-[var(--tinta)] px-4 py-3 font-medium text-white disabled:opacity-60"
                            >
                                {form.processing && <LoaderCircle className="size-4 animate-spin" />}
                                Enviar pedido de reserva
                            </button>
                        </aside>
                    </form>
                )}
            </div>
        </SiteLayout>
    );
}
