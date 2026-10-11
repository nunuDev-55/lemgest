import { Bloco, LinhaForm, TituloPagina } from '@/components/erp';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Building, ImageUp, LoaderCircle, Save } from 'lucide-react';
import { FormEventHandler, useEffect, useMemo, useRef } from 'react';

type Opcao = { valor: string; label: string };

// "type" e não "interface": o useForm do Inertia exige um tipo com assinatura de índice
type DadosEmpresa = {
    nome: string;
    nome_comercial: string;
    forma_juridica: string;
    nuit: string;
    nuel: string;
    capital_social: string;
    actividade: string;
    morada: string;
    cidade: string;
    provincia: string;
    pais: string;
    telefone: string;
    telemovel: string;
    email: string;
    website: string;
};

interface Props {
    empresa: DadosEmpresa;
    logotipo: { url: string; proprio: boolean };
    opcoes: { provincias: Opcao[]; paises: Opcao[]; formasJuridicas: Opcao[] };
}

type Formulario = DadosEmpresa & { logotipo: File | null; remover_logotipo: boolean };

const sel = 'border-input bg-card focus-visible:ring-ring h-9 w-full max-w-80 rounded-md border px-2 text-sm outline-none focus-visible:ring-2';
const area = 'border-input bg-card focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2';

/** Administração → Configuração → Empresa / Organização (como "Empresa/Organização" na configuração do Dolibarr). */
export default function ConfiguracaoEmpresa({ empresa, logotipo, opcoes }: Props) {
    const ficheiro = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors, isDirty } = useForm<Formulario>({
        ...empresa,
        logotipo: null,
        remover_logotipo: false,
    });

    // Pré-visualização do ficheiro escolhido antes de o enviar
    const previsao = useMemo(() => (data.logotipo ? URL.createObjectURL(data.logotipo) : null), [data.logotipo]);
    useEffect(() => {
        return () => {
            if (previsao) URL.revokeObjectURL(previsao);
        };
    }, [previsao]);

    const logotipoMostrado = previsao ?? (data.remover_logotipo ? '/img/lemservices-logo.png' : logotipo.url);

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        post('/administracao/configuracao/empresa', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setData((v) => ({ ...v, logotipo: null, remover_logotipo: false }));
                if (ficheiro.current) ficheiro.current.value = '';
            },
        });
    };

    const provinciaNome = opcoes.provincias.find((p) => p.valor === data.provincia)?.label;
    const paisNome = opcoes.paises.find((p) => p.valor === data.pais)?.label;

    return (
        <AppLayout>
            <Head title="Empresa / Organização" />
            <TituloPagina
                icone={Building}
                titulo="Empresa / Organização"
                descricao="Dados que aparecem no cabeçalho e no rodapé das facturas, orçamentos e encomendas."
            />

            <form onSubmit={submeter} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-4">
                    <Bloco titulo="Identidade">
                        <LinhaForm rotulo="Nome / Razão social" htmlFor="nome" obrigatorio>
                            <Input id="nome" value={data.nome} onChange={(e) => setData('nome', e.target.value)} />
                            <InputError message={errors.nome} />
                        </LinhaForm>
                        <LinhaForm
                            rotulo="Nome comercial"
                            htmlFor="nome_comercial"
                            ajuda="O nome por que os clientes conhecem a empresa (ex.: LemServ)."
                        >
                            <Input id="nome_comercial" value={data.nome_comercial} onChange={(e) => setData('nome_comercial', e.target.value)} />
                            <InputError message={errors.nome_comercial} />
                        </LinhaForm>
                        <LinhaForm rotulo="Actividade" htmlFor="actividade">
                            <Input
                                id="actividade"
                                value={data.actividade}
                                onChange={(e) => setData('actividade', e.target.value)}
                                placeholder="Ex.: aluguer de equipamento para eventos, lounge e outdoor"
                            />
                        </LinhaForm>
                        <LinhaForm rotulo="Morada" htmlFor="morada">
                            <textarea id="morada" rows={2} value={data.morada} onChange={(e) => setData('morada', e.target.value)} className={area} />
                            <InputError message={errors.morada} />
                        </LinhaForm>
                        <LinhaForm rotulo="Cidade" htmlFor="cidade">
                            <Input id="cidade" value={data.cidade} onChange={(e) => setData('cidade', e.target.value)} className="max-w-80" />
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
                            <InputError message={errors.pais || errors.provincia} />
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
                                    placeholder="E-mail"
                                    aria-label="E-mail"
                                />
                                <Input
                                    value={data.website}
                                    onChange={(e) => setData('website', e.target.value)}
                                    placeholder="www…"
                                    aria-label="Website"
                                />
                            </div>
                            <InputError message={errors.email || errors.website} />
                        </LinhaForm>
                    </Bloco>

                    <Bloco titulo="Identificação legal">
                        <LinhaForm
                            rotulo="NUIT"
                            htmlFor="nuit"
                            ajuda="Número Único de Identificação Tributária, 9 dígitos. Obrigatório nas facturas."
                        >
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
                        <LinhaForm rotulo="NUEL" htmlFor="nuel" ajuda="Número Único da Entidade Legal (registo na Conservatória).">
                            <Input id="nuel" value={data.nuel} onChange={(e) => setData('nuel', e.target.value)} className="max-w-60" />
                            <InputError message={errors.nuel} />
                        </LinhaForm>
                        <LinhaForm rotulo="Forma jurídica" htmlFor="forma_juridica">
                            <select
                                id="forma_juridica"
                                value={data.forma_juridica}
                                onChange={(e) => setData('forma_juridica', e.target.value)}
                                className={sel}
                            >
                                <option value="">—</option>
                                {opcoes.formasJuridicas.map((o) => (
                                    <option key={o.valor} value={o.valor}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </LinhaForm>
                        <LinhaForm rotulo="Capital social" htmlFor="capital_social">
                            <Input
                                id="capital_social"
                                value={data.capital_social}
                                onChange={(e) => setData('capital_social', e.target.value)}
                                className="max-w-60"
                                placeholder="Ex.: 20 000,00 MT"
                            />
                            <InputError message={errors.capital_social} />
                        </LinhaForm>
                    </Bloco>

                    <Bloco titulo="Logótipo">
                        <LinhaForm
                            rotulo="Logótipo dos documentos"
                            htmlFor="logotipo"
                            ajuda="PNG, JPG ou WebP até 2 MB. De preferência com fundo transparente."
                        >
                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex h-24 w-44 items-center justify-center rounded-md border bg-white p-2">
                                    <img src={logotipoMostrado} alt="Logótipo" className="max-h-full max-w-full object-contain" />
                                </div>
                                <div className="space-y-2">
                                    <input
                                        ref={ficheiro}
                                        id="logotipo"
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={(e) => setData((v) => ({ ...v, logotipo: e.target.files?.[0] ?? null, remover_logotipo: false }))}
                                        className="file:bg-muted file:text-foreground block text-[13px] file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-[13px]"
                                    />
                                    {logotipo.proprio && !data.logotipo && (
                                        <label className="flex items-center gap-2 text-[13px]">
                                            <Checkbox
                                                checked={data.remover_logotipo}
                                                onCheckedChange={(v) => setData('remover_logotipo', v === true)}
                                            />
                                            Voltar ao logótipo original da LemServ
                                        </label>
                                    )}
                                </div>
                            </div>
                            <InputError message={errors.logotipo} />
                        </LinhaForm>
                    </Bloco>

                    <div className="flex justify-center gap-2 pb-2">
                        <Button type="submit" disabled={processing || !isDirty}>
                            {processing ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                            Guardar
                        </Button>
                    </div>
                </div>

                <aside className="xl:sticky xl:top-4 xl:self-start">
                    <Bloco titulo="Como aparece nos documentos">
                        <div className="bg-white p-4 text-[11.5px] leading-snug text-neutral-900">
                            <div className="flex items-start gap-3 border-b-2 border-[#6e2a63] pb-3">
                                <img src={logotipoMostrado} alt="" className="h-14 w-auto max-w-24 shrink-0 object-contain" />
                                <div className="min-w-0">
                                    <p className="truncate text-[13px] font-bold">{data.nome || 'Nome da empresa'}</p>
                                    {data.morada && <p className="whitespace-pre-line">{data.morada}</p>}
                                    <p>{[data.cidade, data.pais === 'MZ' ? provinciaNome : null, paisNome].filter(Boolean).join(', ')}</p>
                                    {(data.telefone || data.telemovel) && <p>Tel.: {[data.telefone, data.telemovel].filter(Boolean).join(' · ')}</p>}
                                    {data.email && <p className="truncate">{data.email}</p>}
                                    <p className="font-semibold">NUIT: {data.nuit || <span className="font-normal text-red-600">em falta</span>}</p>
                                </div>
                            </div>
                            <p className="mt-3 text-[10px] text-neutral-500">
                                {[
                                    data.nome,
                                    opcoes.formasJuridicas.find((f) => f.valor === data.forma_juridica)?.label,
                                    data.nuit && `NUIT ${data.nuit}`,
                                    data.nuel && `NUEL ${data.nuel}`,
                                    data.capital_social && `Capital social ${data.capital_social}`,
                                ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </p>
                        </div>
                    </Bloco>
                    {data.logotipo && (
                        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                            <ImageUp className="size-3.5" />O novo logótipo só fica gravado depois de carregar em Guardar.
                        </p>
                    )}
                </aside>
            </form>
        </AppLayout>
    );
}
