import { LinhaForm, TituloPagina } from '@/components/erp';
import { Escolher } from '@/components/escolher';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatNumero } from '@/lib/format';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChevronLeft, LoaderCircle, UserPlus } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';

interface Cliente {
    id: number;
    nome: string;
    codigo: string | null;
}

interface Reserva {
    id: number;
    numero: string;
    terceiro_id: number;
    data_evento: string;
    data_fim_evento: string;
    data_entrega: string;
    data_recolha: string;
    dias: number;
    local: string | null;
    contacto_local: string | null;
    transporte: boolean;
    taxa_transporte: string | null;
    tema: string | null;
    nota_publica: string | null;
    nota_privada: string | null;
}

type Dados = {
    terceiro_id: string;
    data_evento: string;
    data_fim_evento: string;
    data_entrega: string;
    data_recolha: string;
    dias: string;
    local: string;
    contacto_local: string;
    transporte: boolean;
    taxa_transporte: string;
    tema: string;
    nota_publica: string;
    nota_privada: string;
};

const area = 'border-input bg-card focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2';

function diasEntre(de: string, ate: string): number {
    if (!de || !ate) return 1;
    const d = (Date.parse(`${ate}T00:00:00`) - Date.parse(`${de}T00:00:00`)) / 86400000;
    return Math.max(1, Math.round(d) + 1);
}

function Seccao({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <section className="painel mb-4">
            <h2 className="border-b px-5 py-3 text-[14px] font-semibold">{titulo}</h2>
            {children}
        </section>
    );
}

export default function FormularioReserva({
    reserva: r,
    clientes,
    clienteId,
    taxaTransporte,
}: {
    reserva: Reserva | null;
    clientes: Cliente[];
    clienteId?: number | null;
    /** Intervalo da taxa (Configuração → Documentos) */
    taxaTransporte: { minimo: string; maximo: string };
}) {
    const aEditar = r !== null;
    const [diasManuais, setDiasManuais] = useState(aEditar && r.dias !== diasEntre(r.data_evento, r.data_fim_evento));
    const { data, setData, post, put, processing, errors } = useForm<Dados>({
        terceiro_id: r ? String(r.terceiro_id) : clienteId ? String(clienteId) : '',
        data_evento: r?.data_evento ?? '',
        data_fim_evento: r?.data_fim_evento ?? '',
        data_entrega: r?.data_entrega ?? '',
        data_recolha: r?.data_recolha ?? '',
        dias: r ? String(r.dias) : '1',
        local: r?.local ?? '',
        contacto_local: r?.contacto_local ?? '',
        transporte: r?.transporte ?? false,
        taxa_transporte: r?.taxa_transporte ?? '',
        tema: r?.tema ?? '',
        nota_publica: r?.nota_publica ?? '',
        nota_privada: r?.nota_privada ?? '',
    });

    /** Ao mudar as datas do evento, as outras acompanham (entrega no dia, recolha no fim), se ainda não fizerem sentido */
    function mudarEvento(campo: 'data_evento' | 'data_fim_evento', valor: string) {
        setData((d) => {
            const n = { ...d, [campo]: valor };
            if (!n.data_fim_evento || n.data_fim_evento < n.data_evento) n.data_fim_evento = n.data_evento;
            if (!n.data_entrega || n.data_entrega > n.data_evento) n.data_entrega = n.data_evento;
            if (!n.data_recolha || n.data_recolha < n.data_fim_evento) n.data_recolha = n.data_fim_evento;
            if (!diasManuais) n.dias = String(diasEntre(n.data_evento, n.data_fim_evento));
            return n;
        });
    }

    function submeter(e: FormEvent) {
        e.preventDefault();
        if (aEditar) put(`/reservas/${r.id}`);
        else post('/reservas');
    }

    const titulo = aEditar ? `Modificar ${r.numero}` : 'Nova reserva';

    return (
        <AppLayout>
            <Head title={titulo} />
            <Link
                href={aEditar ? `/reservas/${r.id}` : '/reservas'}
                className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1 text-[13px]"
            >
                <ChevronLeft className="size-3.5" />
                {aEditar ? r.numero : 'Reservas'}
            </Link>
            <TituloPagina titulo={titulo} descricao={aEditar ? undefined : 'Depois de criar, acrescenta-se o material e os serviços.'} />

            <form onSubmit={submeter} className="max-w-4xl">
                <Seccao titulo="Cliente e datas">
                    <LinhaForm rotulo="Cliente" htmlFor="terceiro_id" obrigatorio>
                        <div className="flex flex-wrap items-center gap-3">
                            <Escolher
                                id="terceiro_id"
                                opcoes={clientes.map((c) => ({ valor: String(c.id), label: c.nome, detalhe: c.codigo ?? undefined }))}
                                valor={data.terceiro_id || null}
                                onChange={(v) => setData('terceiro_id', v ?? '')}
                                placeholder="Escolher cliente…"
                                className="w-full max-w-md"
                            />
                            <Link
                                href="/terceiros/novo?natureza=cliente"
                                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[13px]"
                            >
                                <UserPlus className="size-3.5" />
                                Novo cliente
                            </Link>
                        </div>
                        <InputError message={errors.terceiro_id} />
                    </LinhaForm>
                    <LinhaForm rotulo="Evento" htmlFor="data_evento" obrigatorio ajuda="Para um evento de um só dia, deixe o fim igual ao início.">
                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                            <Input
                                id="data_evento"
                                type="date"
                                value={data.data_evento}
                                onChange={(e) => mudarEvento('data_evento', e.target.value)}
                                className="w-44"
                            />
                            <span className="text-muted-foreground">até</span>
                            <Input
                                type="date"
                                aria-label="Fim do evento"
                                value={data.data_fim_evento}
                                min={data.data_evento}
                                onChange={(e) => mudarEvento('data_fim_evento', e.target.value)}
                                className="w-44"
                            />
                        </div>
                        <InputError message={errors.data_evento || errors.data_fim_evento} />
                    </LinhaForm>
                    <LinhaForm
                        rotulo="Entrega e recolha"
                        htmlFor="data_entrega"
                        ajuda="Quando o material sai e quando volta. Fica preso de um dia ao outro, inclusive."
                    >
                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                            <Input
                                id="data_entrega"
                                type="date"
                                value={data.data_entrega}
                                max={data.data_evento || undefined}
                                onChange={(e) => setData('data_entrega', e.target.value)}
                                className="w-44"
                            />
                            <span className="text-muted-foreground">a</span>
                            <Input
                                type="date"
                                aria-label="Data de recolha"
                                value={data.data_recolha}
                                min={data.data_fim_evento || undefined}
                                onChange={(e) => setData('data_recolha', e.target.value)}
                                className="w-44"
                            />
                        </div>
                        <InputError message={errors.data_entrega || errors.data_recolha} />
                    </LinhaForm>
                    <LinhaForm rotulo="Dias a cobrar" htmlFor="dias" ajuda="Proposto a cada linha de material. Por omissão, os dias do evento.">
                        <Input
                            id="dias"
                            value={data.dias}
                            onChange={(e) => {
                                setDiasManuais(true);
                                setData('dias', e.target.value.replace(/[^\d]/g, ''));
                            }}
                            inputMode="numeric"
                            className="w-24 text-right"
                        />
                        <InputError message={errors.dias} />
                    </LinhaForm>
                </Seccao>

                <Seccao titulo="Local e detalhes">
                    <LinhaForm rotulo="Local do evento" htmlFor="local">
                        <Input
                            id="local"
                            value={data.local}
                            onChange={(e) => setData('local', e.target.value)}
                            placeholder="Ex.: Salão da Igreja, Av. Eduardo Mondlane 1234, Maputo"
                            maxLength={255}
                        />
                        <InputError message={errors.local} />
                    </LinhaForm>
                    <LinhaForm rotulo="Contacto no local" htmlFor="contacto_local">
                        <Input
                            id="contacto_local"
                            value={data.contacto_local}
                            onChange={(e) => setData('contacto_local', e.target.value)}
                            placeholder="Nome e telemóvel de quem recebe o material"
                            maxLength={120}
                        />
                    </LinhaForm>
                    <LinhaForm rotulo="Transporte">
                        <label className="flex w-fit items-center gap-2 pt-2 text-[13.5px]">
                            <Checkbox checked={data.transporte} onCheckedChange={(v) => setData('transporte', v === true)} />A LemServ leva e recolhe
                            o material
                        </label>
                    </LinhaForm>
                    {data.transporte && (
                        <LinhaForm
                            rotulo="Taxa de transporte"
                            htmlFor="taxa_transporte"
                            ajuda={`De ${formatNumero(taxaTransporte.minimo)} a ${formatNumero(taxaTransporte.maximo)} MT, conforme o local. Pode ficar vazia até confirmar a reserva; entra nos totais como uma linha própria.`}
                        >
                            <div className="flex items-center gap-2">
                                <Input
                                    id="taxa_transporte"
                                    inputMode="decimal"
                                    value={data.taxa_transporte}
                                    onChange={(e) => setData('taxa_transporte', e.target.value)}
                                    placeholder={formatNumero(taxaTransporte.minimo)}
                                    className="w-32 text-right"
                                />
                                <span className="text-muted-foreground text-[13px]">MT, sem IVA</span>
                            </div>
                            <InputError message={errors.taxa_transporte} />
                        </LinhaForm>
                    )}
                    <LinhaForm rotulo="Tema de cores" htmlFor="tema">
                        <Input
                            id="tema"
                            value={data.tema}
                            onChange={(e) => setData('tema', e.target.value)}
                            placeholder="Ex.: Branco e dourado"
                            maxLength={120}
                            className="max-w-md"
                        />
                    </LinhaForm>
                    <LinhaForm rotulo="Observações" htmlFor="nota_publica" ajuda="O cliente vê este texto.">
                        <textarea
                            id="nota_publica"
                            rows={3}
                            value={data.nota_publica}
                            onChange={(e) => setData('nota_publica', e.target.value)}
                            className={area}
                        />
                    </LinhaForm>
                    <LinhaForm rotulo="Nota interna" htmlFor="nota_privada" ajuda="Só a equipa vê.">
                        <textarea
                            id="nota_privada"
                            rows={2}
                            value={data.nota_privada}
                            onChange={(e) => setData('nota_privada', e.target.value)}
                            className={area}
                        />
                    </LinhaForm>
                </Seccao>

                {(errors as Record<string, string | undefined>).reserva && (
                    <p className="text-destructive mb-4 text-[13px]">{(errors as Record<string, string | undefined>).reserva}</p>
                )}

                <div className="flex gap-2">
                    <Button type="submit" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {aEditar ? 'Guardar' : 'Criar reserva'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={aEditar ? `/reservas/${r.id}` : '/reservas'}>Cancelar</Link>
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
