import { Confirmar } from '@/components/confirmar';
import {
    Bloco,
    BotoesAccao,
    CabecalhoFicha,
    Campo,
    Campos,
    Estado,
    EstadoEncomendaFornecedor,
    EstadoFactura,
    EstadoFacturaFornecedor,
    EstadoOrcamento,
    EstadoReserva,
    Separadores,
} from '@/components/erp';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { formatData, formatNumero } from '@/lib/format';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    Building2,
    CalendarPlus,
    FileInput,
    FilePlus2,
    FileSignature,
    LoaderCircle,
    Lock,
    LockOpen,
    Pencil,
    ShoppingCart,
    Trash2,
    UserPlus,
} from 'lucide-react';
import { FormEventHandler, useEffect, useState, type ReactNode } from 'react';

interface Contacto {
    id: number;
    nome: string;
    cargo: string | null;
    telefone: string | null;
    telemovel: string | null;
    email: string | null;
    nota: string | null;
    activo: boolean;
}

interface Props {
    terceiro: {
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
        activo: boolean;
        natureza: string[];
    };
    resumo: { facturado: string; por_receber: string; numero_facturas: number; orcamentos: string; reservas: string };
    facturas: { id: number; referencia: string; data: string; total: string; estado: string; vencida: boolean }[];
    orcamentos: { id: number; referencia: string; data: string; total: string; estado: string; expirado: boolean }[];
    reservas: { id: number; referencia: string; data: string; total: string; estado: string; atrasada: boolean }[];
    contasLoja: { email: string; estado: string; ultimo_acesso_em: string | null }[];
    contactos: Contacto[];
    /** Separador "Fornecedor": só vem quando o terceiro é fornecedor e o utilizador vê as compras */
    fornecedor: {
        resumo: { encomendas_abertas: string; comprado: string; por_pagar: string };
        encomendas: { id: number; referencia: string; data: string; total: string; estado: string; facturada: boolean; atrasada: boolean }[];
        facturas: { id: number; referencia: string; ref_fornecedor: string; data: string; total: string; estado: string; vencida: boolean }[];
    } | null;
}

export default function FichaTerceiro({ terceiro: t, resumo, facturas, orcamentos, reservas, contasLoja, contactos, fornecedor }: Props) {
    const pode = usePode();
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [separador, setSeparador] = useState(() => new URLSearchParams(window.location.search).get('separador') ?? 'terceiro');
    const [apagar, setApagar] = useState(false);
    const [contacto, setContacto] = useState<Contacto | 'novo' | null>(null);
    const [apagarContacto, setApagarContacto] = useState<Contacto | null>(null);
    const ehCliente = t.e_cliente || t.e_potencial;

    return (
        <AppLayout>
            <Head title={t.nome} />
            <CabecalhoFicha
                icone={Building2}
                referencia={t.nome}
                titulo={t.nome_alternativo}
                subtitulo={[t.codigo_cliente, t.codigo_fornecedor].filter(Boolean).join(' · ') || undefined}
                estado={
                    <div className="flex flex-wrap gap-1">
                        {t.natureza.map((n) => (
                            <Estado key={n} cor={n === 'Cliente' ? 'verde' : n === 'Fornecedor' ? 'roxo' : 'azul'}>
                                {n}
                            </Estado>
                        ))}
                        {t.activo ? <Estado cor="verde">Aberto</Estado> : <Estado cor="vermelho">Encerrado</Estado>}
                    </div>
                }
                voltar={{ href: '/terceiros' }}
            />

            {errors.terceiro && (
                <div
                    role="alert"
                    className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
                >
                    {errors.terceiro}
                </div>
            )}

            <Separadores
                activo={separador}
                onMudar={setSeparador}
                itens={[
                    { id: 'terceiro', label: 'Terceiro' },
                    { id: 'contactos', label: 'Contactos / Endereços', contagem: contactos.length },
                    ...(ehCliente ? [{ id: 'cliente', label: 'Cliente', contagem: resumo.numero_facturas }] : []),
                    ...(fornecedor ? [{ id: 'fornecedor', label: 'Fornecedor', contagem: fornecedor.facturas.length }] : []),
                    { id: 'notas', label: 'Notas', contagem: (t.nota_publica ? 1 : 0) + (t.nota_privada ? 1 : 0) },
                ]}
            />

            {separador === 'terceiro' && (
                <>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Campos>
                            <Campo rotulo="Código cliente">{t.codigo_cliente}</Campo>
                            <Campo rotulo="Código fornecedor">{t.codigo_fornecedor}</Campo>
                            <Campo rotulo="Tipo de entidade">{t.tipo_entidade}</Campo>
                            <Campo rotulo="NUIT" destaque>
                                {t.nuit}
                            </Campo>
                            <Campo rotulo="Sujeito a IVA">{t.sujeito_iva ? 'Sim' : 'Não'}</Campo>
                            <Campo rotulo="Termos de pagamento">{t.termos_pagamento}</Campo>
                            <Campo rotulo="Método de pagamento">{t.metodo_pagamento}</Campo>
                        </Campos>
                        <Campos>
                            <Campo rotulo="Morada">{t.morada}</Campo>
                            <Campo rotulo="Localidade">{[t.codigo_postal, t.cidade].filter(Boolean).join(' ')}</Campo>
                            <Campo rotulo="Província / País">{[t.provincia, t.pais].filter(Boolean).join(', ')}</Campo>
                            <Campo rotulo="Telefone">{t.telefone}</Campo>
                            <Campo rotulo="Telemóvel">{t.telemovel}</Campo>
                            <Campo rotulo="E-mail">
                                {t.email && (
                                    <a href={`mailto:${t.email}`} className="text-primary hover:underline">
                                        {t.email}
                                    </a>
                                )}
                            </Campo>
                            <Campo rotulo="Website">{t.website}</Campo>
                        </Campos>
                    </div>
                    <BotoesAccao>
                        {pode('terceiros.gerir') && (
                            <>
                                <Button variant="outline" asChild>
                                    <Link href={`/terceiros/${t.id}/editar`}>
                                        <Pencil className="size-4" />
                                        Modificar
                                    </Link>
                                </Button>
                                <Button variant="outline" onClick={() => router.post(`/terceiros/${t.id}/estado`, {}, { preserveScroll: true })}>
                                    {t.activo ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
                                    {t.activo ? 'Encerrar' : 'Reabrir'}
                                </Button>
                            </>
                        )}
                        {pode('terceiros.apagar') && (
                            <Button variant="outline" onClick={() => setApagar(true)} className="hover:text-destructive">
                                <Trash2 className="size-4" />
                                Eliminar
                            </Button>
                        )}
                    </BotoesAccao>
                </>
            )}

            {separador === 'contactos' && (
                <Bloco
                    titulo={`Contactos / Endereços (${contactos.length})`}
                    accoes={
                        pode('terceiros.gerir') && (
                            <Button size="sm" onClick={() => setContacto('novo')}>
                                <UserPlus className="size-4" />
                                Novo contacto
                            </Button>
                        )
                    }
                >
                    <table className="tabela">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Cargo</th>
                                <th>Telefone</th>
                                <th>Telemóvel</th>
                                <th>E-mail</th>
                                <th>Estado</th>
                                {pode('terceiros.gerir') && <th className="w-16" />}
                            </tr>
                        </thead>
                        <tbody>
                            {contactos.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-muted-foreground py-8 text-center italic">
                                        Ainda sem contactos. Acrescente as pessoas com quem fala nesta empresa.
                                    </td>
                                </tr>
                            )}
                            {contactos.map((c) => (
                                <tr key={c.id}>
                                    <td className="font-medium">
                                        {c.nome}
                                        {c.nota && <span className="text-muted-foreground block text-xs font-normal">{c.nota}</span>}
                                    </td>
                                    <td>{c.cargo}</td>
                                    <td className="tabular-nums">{c.telefone}</td>
                                    <td className="tabular-nums">{c.telemovel}</td>
                                    <td>
                                        {c.email && (
                                            <a href={`mailto:${c.email}`} className="text-primary hover:underline">
                                                {c.email}
                                            </a>
                                        )}
                                    </td>
                                    <td>{c.activo ? <Estado cor="verde">Activo</Estado> : <Estado cor="cinza">Inactivo</Estado>}</td>
                                    {pode('terceiros.gerir') && (
                                        <td className="text-right whitespace-nowrap">
                                            <button
                                                type="button"
                                                onClick={() => setContacto(c)}
                                                className="text-muted-foreground hover:text-primary p-1"
                                                aria-label={`Alterar ${c.nome}`}
                                            >
                                                <Pencil className="size-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setApagarContacto(c)}
                                                className="text-muted-foreground hover:text-destructive p-1"
                                                aria-label={`Apagar ${c.nome}`}
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </Bloco>
            )}

            {separador === 'cliente' && (
                <>
                    <div className="grid gap-4 lg:grid-cols-[19rem_1fr]">
                        <Campos className="self-start">
                            <Campo rotulo="Orçamentos (abertos / assinados)">{formatNumero(resumo.orcamentos)} MT</Campo>
                            <Campo rotulo="Reservas em curso">{formatNumero(resumo.reservas)} MT</Campo>
                            <Campo rotulo="Facturado (sem IVA)">{formatNumero(resumo.facturado)} MT</Campo>
                            <Campo rotulo="Restante a receber" destaque>
                                {formatNumero(resumo.por_receber)} MT
                            </Campo>
                            {contasLoja.length > 0 && (
                                <Campo rotulo="Conta na loja">
                                    {contasLoja.map((c) => (
                                        <Link
                                            key={c.email}
                                            href={`/contas-clientes?estado=todas&pesquisa=${encodeURIComponent(c.email)}`}
                                            className="block hover:underline"
                                        >
                                            <Estado cor={c.estado === 'activa' ? 'verde' : c.estado === 'pendente' ? 'laranja' : 'cinza'}>
                                                {c.email}
                                            </Estado>
                                        </Link>
                                    ))}
                                </Campo>
                            )}
                        </Campos>
                        <div className="grid gap-4">
                            <ListaCurta
                                titulo="Últimos orçamentos"
                                base="/orcamentos"
                                todos={`/orcamentos?cliente=${encodeURIComponent(t.nome)}`}
                                linhas={orcamentos}
                                estado={(o) => <EstadoOrcamento estado={o.estado} expirado={o.expirado} />}
                            />
                            {pode('reservas.ver') && (
                                <ListaCurta
                                    titulo="Últimas reservas"
                                    base="/reservas"
                                    todos={`/reservas?pesquisa=${encodeURIComponent(t.nome)}`}
                                    linhas={reservas}
                                    estado={(r) => <EstadoReserva estado={r.estado} atrasada={r.atrasada} />}
                                />
                            )}
                            <ListaCurta
                                titulo="Últimas facturas"
                                base="/facturas"
                                todos={`/facturas?cliente=${encodeURIComponent(t.nome)}`}
                                linhas={facturas}
                                estado={(f) => <EstadoFactura estado={f.estado} vencida={f.vencida} />}
                            />
                        </div>
                    </div>
                    {t.activo && (
                        <BotoesAccao>
                            {pode('orcamentos.criar') && (
                                <Button variant="outline" asChild>
                                    <Link href={`/orcamentos/novo?terceiro=${t.id}`}>
                                        <FileSignature className="size-4" />
                                        Criar orçamento
                                    </Link>
                                </Button>
                            )}
                            {pode('reservas.criar') && (
                                <Button variant="outline" asChild>
                                    <Link href={`/reservas/nova?terceiro=${t.id}`}>
                                        <CalendarPlus className="size-4" />
                                        Nova reserva
                                    </Link>
                                </Button>
                            )}
                            {t.e_cliente && pode('facturas.criar') && (
                                <Button asChild>
                                    <Link href={`/facturas/nova?terceiro=${t.id}`}>
                                        <FilePlus2 className="size-4" />
                                        Criar factura
                                    </Link>
                                </Button>
                            )}
                        </BotoesAccao>
                    )}
                </>
            )}

            {separador === 'fornecedor' && fornecedor && (
                <>
                    <div className="grid gap-4 lg:grid-cols-[19rem_1fr]">
                        <Campos className="self-start">
                            <Campo rotulo="Encomendas em curso (sem IVA)">{formatNumero(fornecedor.resumo.encomendas_abertas)} MT</Campo>
                            <Campo rotulo="Comprado (sem IVA)">{formatNumero(fornecedor.resumo.comprado)} MT</Campo>
                            <Campo rotulo="Restante a pagar" destaque>
                                {formatNumero(fornecedor.resumo.por_pagar)} MT
                            </Campo>
                        </Campos>
                        <div className="grid gap-4">
                            <ListaCurta
                                titulo="Últimas encomendas a este fornecedor"
                                base="/encomendas-fornecedor"
                                todos={`/encomendas-fornecedor?cliente=${encodeURIComponent(t.nome)}`}
                                linhas={fornecedor.encomendas}
                                estado={(e) => <EstadoEncomendaFornecedor estado={e.estado} facturada={e.facturada} atrasada={e.atrasada} />}
                            />
                            <ListaCurta
                                titulo="Últimas facturas deste fornecedor"
                                base="/facturas-fornecedor"
                                todos={`/facturas-fornecedor?cliente=${encodeURIComponent(t.nome)}`}
                                linhas={fornecedor.facturas}
                                estado={(f) => <EstadoFacturaFornecedor estado={f.estado} vencida={f.vencida} />}
                            />
                        </div>
                    </div>
                    {t.activo && pode('compras.criar') && (
                        <BotoesAccao>
                            <Button variant="outline" asChild>
                                <Link href={`/facturas-fornecedor/nova?terceiro=${t.id}`}>
                                    <FileInput className="size-4" />
                                    Lançar factura de fornecedor
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={`/encomendas-fornecedor/nova?terceiro=${t.id}`}>
                                    <ShoppingCart className="size-4" />
                                    Criar encomenda a fornecedor
                                </Link>
                            </Button>
                        </BotoesAccao>
                    )}
                </>
            )}

            {separador === 'notas' && (
                <div className="grid gap-4 lg:grid-cols-2">
                    <Bloco titulo="Nota pública">
                        <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                            {t.nota_publica || <span className="text-muted-foreground italic">Sem nota</span>}
                        </p>
                    </Bloco>
                    <Bloco titulo="Nota interna">
                        <p className="min-h-24 p-3 text-[13px] whitespace-pre-line">
                            {t.nota_privada || <span className="text-muted-foreground italic">Sem nota</span>}
                        </p>
                    </Bloco>
                </div>
            )}

            <FormularioContacto terceiroId={t.id} contacto={contacto} onFechar={() => setContacto(null)} />

            <Confirmar
                aberto={apagarContacto !== null}
                titulo={`Apagar o contacto ${apagarContacto?.nome}?`}
                descricao="Esta acção não se pode desfazer."
                textoConfirmar="Apagar"
                perigo
                onConfirmar={() =>
                    apagarContacto &&
                    router.delete(`/contactos/${apagarContacto.id}`, { preserveScroll: true, onFinish: () => setApagarContacto(null) })
                }
                onFechar={() => setApagarContacto(null)}
            />
            <Confirmar
                aberto={apagar}
                titulo={`Eliminar ${t.nome}?`}
                descricao="Só é possível se não tiver facturas nem pagamentos. Se tiver, encerre-o em vez de o eliminar."
                textoConfirmar="Eliminar"
                perigo
                onConfirmar={() => router.delete(`/terceiros/${t.id}`, { onFinish: () => setApagar(false) })}
                onFechar={() => setApagar(false)}
            />
        </AppLayout>
    );
}

function ListaCurta<T extends { id: number; referencia: string; data: string; total: string }>({
    titulo,
    base,
    todos,
    linhas,
    estado,
}: {
    titulo: string;
    base: string;
    todos: string;
    linhas: T[];
    estado: (l: T) => ReactNode;
}) {
    return (
        <Bloco
            titulo={titulo}
            accoes={
                <Link href={todos} className="text-primary text-xs hover:underline">
                    Ver todos
                </Link>
            }
        >
            <table className="tabela">
                <tbody>
                    {linhas.length === 0 && (
                        <tr>
                            <td className="text-muted-foreground py-4 text-center italic">Nenhum</td>
                        </tr>
                    )}
                    {linhas.map((l) => (
                        <tr key={l.id}>
                            <td>
                                <Link href={`${base}/${l.id}`} className="text-primary font-medium hover:underline">
                                    {l.referencia}
                                </Link>
                            </td>
                            <td className="tabular-nums">{formatData(l.data)}</td>
                            <td className="text-right tabular-nums">{formatNumero(l.total)}</td>
                            <td>{estado(l)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Bloco>
    );
}

function FormularioContacto({ terceiroId, contacto, onFechar }: { terceiroId: number; contacto: Contacto | 'novo' | null; onFechar: () => void }) {
    const aEditar = contacto !== null && contacto !== 'novo';
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<{
        nome: string;
        cargo: string;
        telefone: string;
        telemovel: string;
        email: string;
        nota: string;
        activo: boolean;
    }>({
        nome: '',
        cargo: '',
        telefone: '',
        telemovel: '',
        email: '',
        nota: '',
        activo: true,
    });

    useEffect(() => {
        if (contacto === null) return;
        clearErrors();
        const c = contacto === 'novo' ? null : contacto;
        setData({
            nome: c?.nome ?? '',
            cargo: c?.cargo ?? '',
            telefone: c?.telefone ?? '',
            telemovel: c?.telemovel ?? '',
            email: c?.email ?? '',
            nota: c?.nota ?? '',
            activo: c?.activo ?? true,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contacto]);

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        const opcoes = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onFechar();
            },
        };
        if (aEditar) put(`/contactos/${contacto.id}`, opcoes);
        else post(`/terceiros/${terceiroId}/contactos`, opcoes);
    };

    return (
        <Dialog open={contacto !== null} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{aEditar ? 'Alterar contacto' : 'Novo contacto'}</DialogTitle>
                    <DialogDescription>Pessoa de contacto nesta empresa.</DialogDescription>
                </DialogHeader>
                <form id="form-contacto" onSubmit={submeter} className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="grid gap-1.5">
                            <Label htmlFor="c-nome">Nome</Label>
                            <Input id="c-nome" value={data.nome} onChange={(e) => setData('nome', e.target.value)} autoFocus />
                            <InputError message={errors.nome} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="c-cargo">Cargo</Label>
                            <Input
                                id="c-cargo"
                                value={data.cargo}
                                onChange={(e) => setData('cargo', e.target.value)}
                                placeholder="Ex.: Gestora de eventos"
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="c-tel">Telefone</Label>
                            <Input id="c-tel" value={data.telefone} onChange={(e) => setData('telefone', e.target.value)} />
                            <InputError message={errors.telefone} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="c-tlm">Telemóvel (WhatsApp)</Label>
                            <Input id="c-tlm" value={data.telemovel} onChange={(e) => setData('telemovel', e.target.value)} />
                            <InputError message={errors.telemovel} />
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="c-email">E-mail</Label>
                        <Input id="c-email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="c-nota">Nota</Label>
                        <textarea
                            id="c-nota"
                            rows={2}
                            value={data.nota}
                            onChange={(e) => setData('nota', e.target.value)}
                            className="border-input bg-card rounded-md border px-3 py-2 text-sm"
                        />
                    </div>
                    <label className="flex items-center gap-2 text-[13px]">
                        <input
                            type="checkbox"
                            checked={data.activo}
                            onChange={(e) => setData('activo', e.target.checked)}
                            className="accent-[var(--primary)]"
                        />
                        Activo
                    </label>
                </form>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-contacto" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {aEditar ? 'Guardar' : 'Acrescentar contacto'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
