import { LinhaForm, TituloPagina } from '@/components/erp';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Building2, LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

type Opcao = { valor: string; label: string };

interface Terceiro {
    id: number;
    nome: string;
    nome_alternativo: string | null;
    e_cliente: boolean;
    e_potencial: boolean;
    e_fornecedor: boolean;
    codigo_cliente: string | null;
    codigo_fornecedor: string | null;
    tipo_entidade: string | null;
    nuit: string | null;
    sujeito_iva: boolean;
    morada: string | null;
    codigo_postal: string | null;
    cidade: string | null;
    provincia: string | null;
    pais: string;
    telefone: string | null;
    telemovel: string | null;
    email: string | null;
    website: string | null;
    termos_pagamento: string;
    metodo_pagamento: string | null;
    nota_publica: string | null;
    nota_privada: string | null;
}

interface Props {
    terceiro: Terceiro | null;
    predefinido: { e_cliente: boolean; e_potencial: boolean; e_fornecedor: boolean } | null;
    opcoes: Record<'termosPagamento' | 'metodosPagamento' | 'tiposEntidade' | 'provincias' | 'paises', Opcao[]>;
}

const sel = 'border-input bg-card focus-visible:ring-ring h-9 w-full max-w-80 rounded-md border px-2 text-sm outline-none focus-visible:ring-2';
const area = 'border-input bg-card focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2';

export default function FormularioTerceiro({ terceiro: t, predefinido, opcoes }: Props) {
    const aEditar = t !== null;
    const { data, setData, post, put, processing, errors } = useForm({
        nome: t?.nome ?? '',
        nome_alternativo: t?.nome_alternativo ?? '',
        e_cliente: t?.e_cliente ?? predefinido?.e_cliente ?? true,
        e_potencial: t?.e_potencial ?? predefinido?.e_potencial ?? false,
        e_fornecedor: t?.e_fornecedor ?? predefinido?.e_fornecedor ?? false,
        tipo_entidade: t?.tipo_entidade ?? 'empresa',
        nuit: t?.nuit ?? '',
        sujeito_iva: t?.sujeito_iva ?? true,
        morada: t?.morada ?? '',
        codigo_postal: t?.codigo_postal ?? '',
        cidade: t?.cidade ?? '',
        provincia: t?.provincia ?? '',
        pais: t?.pais ?? 'MZ',
        telefone: t?.telefone ?? '',
        telemovel: t?.telemovel ?? '',
        email: t?.email ?? '',
        website: t?.website ?? '',
        termos_pagamento: t?.termos_pagamento ?? 'pronto',
        metodo_pagamento: t?.metodo_pagamento ?? '',
        nota_publica: t?.nota_publica ?? '',
        nota_privada: t?.nota_privada ?? '',
    });

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        if (aEditar) put(`/terceiros/${t.id}`);
        else post('/terceiros');
    };

    const titulo = aEditar
        ? `Modificar ${t.nome}`
        : data.e_fornecedor && !data.e_cliente
          ? 'Novo fornecedor'
          : data.e_potencial && !data.e_cliente
            ? 'Novo potencial cliente'
            : 'Novo terceiro (cliente, potencial cliente ou fornecedor)';

    return (
        <AppLayout>
            <Head title={titulo} />
            <TituloPagina icone={Building2} titulo={titulo} />

            <form onSubmit={submeter} className="max-w-5xl">
                <div className="painel">
                    <LinhaForm rotulo="Nome do terceiro" htmlFor="nome" obrigatorio>
                        <Input
                            id="nome"
                            value={data.nome}
                            onChange={(e) => setData('nome', e.target.value)}
                            autoFocus
                            placeholder="Nome da empresa ou da pessoa"
                        />
                        <InputError message={errors.nome} />
                        <Input
                            value={data.nome_alternativo}
                            onChange={(e) => setData('nome_alternativo', e.target.value)}
                            placeholder="Nome comercial / alternativo (opcional)"
                            className="mt-2"
                            aria-label="Nome alternativo"
                        />
                    </LinhaForm>

                    <LinhaForm rotulo="Natureza" obrigatorio>
                        <div className="flex flex-wrap gap-5 pt-2">
                            {(
                                [
                                    ['e_cliente', 'Cliente'],
                                    ['e_potencial', 'Potencial cliente'],
                                    ['e_fornecedor', 'Fornecedor'],
                                ] as const
                            ).map(([campo, label]) => (
                                <label key={campo} className="flex cursor-pointer items-center gap-2 text-[13px]">
                                    <Checkbox checked={data[campo]} onCheckedChange={(v) => setData(campo, v === true)} />
                                    {label}
                                </label>
                            ))}
                        </div>
                        <InputError message={errors.e_cliente} />
                    </LinhaForm>

                    {aEditar && (t.codigo_cliente || t.codigo_fornecedor) && (
                        <LinhaForm rotulo="Códigos">
                            <p className="pt-2 text-[13px]">
                                {t.codigo_cliente && (
                                    <>
                                        Cliente: <strong>{t.codigo_cliente}</strong>{' '}
                                    </>
                                )}
                                {t.codigo_fornecedor && (
                                    <>
                                        Fornecedor: <strong>{t.codigo_fornecedor}</strong>
                                    </>
                                )}
                            </p>
                        </LinhaForm>
                    )}

                    <LinhaForm rotulo="Tipo de entidade" htmlFor="tipo_entidade">
                        <select
                            id="tipo_entidade"
                            value={data.tipo_entidade}
                            onChange={(e) => setData('tipo_entidade', e.target.value)}
                            className={sel}
                        >
                            <option value="">—</option>
                            {opcoes.tiposEntidade.map((o) => (
                                <option key={o.valor} value={o.valor}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </LinhaForm>

                    <LinhaForm rotulo="NUIT" htmlFor="nuit" ajuda="9 dígitos. Obrigatório para empresas, Estado e ONG moçambicanas.">
                        <Input
                            id="nuit"
                            value={data.nuit}
                            onChange={(e) => setData('nuit', e.target.value)}
                            inputMode="numeric"
                            className="max-w-48"
                            placeholder="400 000 000"
                        />
                        <InputError message={errors.nuit} />
                    </LinhaForm>

                    <LinhaForm rotulo="Sujeito a IVA">
                        <label className="flex items-center gap-2 pt-2 text-[13px]">
                            <Checkbox checked={data.sujeito_iva} onCheckedChange={(v) => setData('sujeito_iva', v === true)} />
                            Sim
                        </label>
                    </LinhaForm>

                    <LinhaForm rotulo="Morada" htmlFor="morada">
                        <textarea
                            id="morada"
                            rows={2}
                            value={data.morada}
                            onChange={(e) => setData('morada', e.target.value)}
                            className={area}
                            placeholder="Avenida, número, bairro"
                        />
                    </LinhaForm>

                    <LinhaForm rotulo="Código postal / Localidade">
                        <div className="flex gap-2">
                            <Input
                                value={data.codigo_postal}
                                onChange={(e) => setData('codigo_postal', e.target.value)}
                                className="max-w-28"
                                placeholder="Cód. postal"
                                aria-label="Código postal"
                            />
                            <Input value={data.cidade} onChange={(e) => setData('cidade', e.target.value)} placeholder="Cidade" aria-label="Cidade" />
                        </div>
                    </LinhaForm>

                    <LinhaForm rotulo="País / Província">
                        <div className="flex flex-wrap gap-2">
                            <select value={data.pais} onChange={(e) => setData('pais', e.target.value)} className={sel} aria-label="País">
                                {opcoes.paises.map((o) => (
                                    <option key={o.valor} value={o.valor}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            {data.pais === 'MZ' && (
                                <select
                                    value={data.provincia}
                                    onChange={(e) => setData('provincia', e.target.value)}
                                    className={sel}
                                    aria-label="Província"
                                >
                                    <option value="">Província…</option>
                                    {opcoes.provincias.map((o) => (
                                        <option key={o.valor} value={o.valor}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </LinhaForm>

                    <LinhaForm rotulo="Telefone / Telemóvel">
                        <div className="flex gap-2">
                            <Input
                                value={data.telefone}
                                onChange={(e) => setData('telefone', e.target.value)}
                                placeholder="Telefone"
                                aria-label="Telefone"
                            />
                            <Input
                                value={data.telemovel}
                                onChange={(e) => setData('telemovel', e.target.value)}
                                placeholder="Telemóvel (WhatsApp)"
                                aria-label="Telemóvel"
                            />
                        </div>
                        <InputError message={errors.telefone || errors.telemovel} />
                    </LinhaForm>

                    <LinhaForm rotulo="E-mail / Website">
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="email@empresa.co.mz"
                                aria-label="E-mail"
                            />
                            <Input
                                value={data.website}
                                onChange={(e) => setData('website', e.target.value)}
                                placeholder="www…"
                                aria-label="Website"
                            />
                        </div>
                        <InputError message={errors.email} />
                    </LinhaForm>

                    <LinhaForm rotulo="Termos de pagamento" htmlFor="termos" ajuda="Usados por defeito nas novas facturas deste cliente.">
                        <select
                            id="termos"
                            value={data.termos_pagamento}
                            onChange={(e) => setData('termos_pagamento', e.target.value)}
                            className={sel}
                        >
                            {opcoes.termosPagamento.map((o) => (
                                <option key={o.valor} value={o.valor}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </LinhaForm>

                    <LinhaForm rotulo="Método de pagamento" htmlFor="metodo">
                        <select
                            id="metodo"
                            value={data.metodo_pagamento}
                            onChange={(e) => setData('metodo_pagamento', e.target.value)}
                            className={sel}
                        >
                            <option value="">—</option>
                            {opcoes.metodosPagamento.map((o) => (
                                <option key={o.valor} value={o.valor}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </LinhaForm>

                    <LinhaForm rotulo="Nota pública" htmlFor="nota_publica">
                        <textarea
                            id="nota_publica"
                            rows={2}
                            value={data.nota_publica}
                            onChange={(e) => setData('nota_publica', e.target.value)}
                            className={area}
                        />
                    </LinhaForm>
                    <LinhaForm rotulo="Nota interna" htmlFor="nota_privada">
                        <textarea
                            id="nota_privada"
                            rows={2}
                            value={data.nota_privada}
                            onChange={(e) => setData('nota_privada', e.target.value)}
                            className={area}
                        />
                    </LinhaForm>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    <Button type="submit" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {aEditar ? 'Guardar' : 'Criar terceiro'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={aEditar ? `/terceiros/${t.id}` : '/terceiros'}>Cancelar</Link>
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
