import { LinhaForm, TituloPagina } from '@/components/erp';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatNumero } from '@/lib/format';
import { Head, Link, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, type ReactNode } from 'react';

type Opcao = { valor: string; label: string };

interface Produto {
    id: number;
    referencia: string;
    tipo: 'produto' | 'servico';
    nome: string;
    categoria_id: number | null;
    descricao: string | null;
    preco: string;
    taxa_iva: string;
    unidade: string;
    preco_compra: string | null;
    em_venda: boolean;
    em_compra: boolean;
    em_aluguer: boolean;
    preco_aluguer: string | null;
    quantidade_total: number;
    quantidade_fora: number;
    na_loja: boolean;
    loja_destaque: boolean;
    loja_ordem: number;
    loja_descricao: string | null;
}

interface Props {
    produto: Produto | null;
    tipo: 'produto' | 'servico';
    opcoes: { taxasIva: Opcao[]; unidades: Opcao[] };
    categorias: Opcao[];
}

const sel = 'border-input bg-card focus-visible:ring-ring h-9 w-full max-w-60 rounded-md border px-2 text-sm outline-none focus-visible:ring-2';
const areaTexto = 'border-input bg-card focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2';

/** Converte "1 500,50" em número para mostrar a pré-visualização do preço com IVA */
function paraNumero(v: string): number {
    const limpo = v.replace(/\s/g, '');
    return Number(limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo) || 0;
}

/** Bloco do formulário com título */
function Seccao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: ReactNode }) {
    return (
        <section className="painel mb-4">
            <header className="border-b px-5 py-3">
                <h2 className="text-[14px] font-semibold">{titulo}</h2>
                {descricao && <p className="text-muted-foreground mt-0.5 text-[12.5px]">{descricao}</p>}
            </header>
            {children}
        </section>
    );
}

function CampoPreco({
    id,
    valor,
    onChange,
    sufixo,
    comIva,
}: {
    id: string;
    valor: string;
    onChange: (v: string) => void;
    sufixo: string;
    comIva?: number;
}) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <Input
                id={id}
                value={valor}
                onChange={(e) => onChange(e.target.value)}
                inputMode="decimal"
                className="max-w-40 text-right"
                placeholder="0,00"
            />
            <span className="text-muted-foreground text-[13px]">{sufixo}</span>
            {comIva !== undefined && <span className="text-muted-foreground text-[13px]">· {formatNumero(comIva)} MT com IVA</span>}
        </div>
    );
}

export default function FormularioProduto({ produto: p, tipo, opcoes, categorias }: Props) {
    const aEditar = p !== null;
    const { data, setData, post, put, processing, errors } = useForm({
        referencia: p?.referencia ?? '',
        tipo: p?.tipo ?? tipo,
        nome: p?.nome ?? '',
        categoria_id: p?.categoria_id ? String(p.categoria_id) : '',
        descricao: p?.descricao ?? '',
        taxa_iva: p?.taxa_iva ?? '16.00',
        unidade: p?.unidade ?? (tipo === 'servico' ? 'srv' : 'un'),
        em_aluguer: p?.em_aluguer ?? tipo === 'produto',
        preco_aluguer: p?.preco_aluguer ?? '',
        quantidade_total: p ? String(p.quantidade_total) : '',
        em_venda: p?.em_venda ?? tipo === 'servico',
        preco: p ? p.preco : '',
        em_compra: p?.em_compra ?? false,
        preco_compra: p?.preco_compra ?? '',
        na_loja: p?.na_loja ?? false,
        loja_destaque: p?.loja_destaque ?? false,
        loja_ordem: p ? String(p.loja_ordem) : '0',
        loja_descricao: p?.loja_descricao ?? '',
    });
    const servico = data.tipo === 'servico';
    const factorIva = 1 + Number(data.taxa_iva) / 100;

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        if (aEditar) put(`/produtos/${p.id}`);
        else post('/produtos');
    };

    const titulo = aEditar ? `Modificar ${p.referencia}` : servico ? 'Novo serviço' : 'Novo produto';

    return (
        <AppLayout>
            <Head title={titulo} />
            <TituloPagina titulo={titulo} />

            <form onSubmit={submeter} className="max-w-4xl">
                <Seccao titulo="Identificação">
                    <LinhaForm
                        rotulo="Ref."
                        htmlFor="referencia"
                        obrigatorio
                        ajuda="Código curto e único, sem espaços. Ex.: SOFA-RET, ALM-01, TRANSP."
                    >
                        <Input
                            id="referencia"
                            value={data.referencia}
                            onChange={(e) => setData('referencia', e.target.value.toUpperCase())}
                            className="max-w-60"
                            autoFocus={!aEditar}
                        />
                        <InputError message={errors.referencia} />
                    </LinhaForm>
                    <LinhaForm rotulo="Tipo">
                        <div className="flex gap-5 pt-2 text-[13.5px]">
                            {(['produto', 'servico'] as const).map((t) => (
                                <label key={t} className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="radio"
                                        name="tipo"
                                        checked={data.tipo === t}
                                        onChange={() => setData('tipo', t)}
                                        className="accent-[var(--primary)]"
                                    />
                                    {t === 'produto' ? 'Produto (material)' : 'Serviço'}
                                </label>
                            ))}
                        </div>
                    </LinhaForm>
                    <LinhaForm rotulo="Nome" htmlFor="nome" obrigatorio>
                        <Input
                            id="nome"
                            value={data.nome}
                            onChange={(e) => setData('nome', e.target.value)}
                            placeholder={servico ? 'Ex.: Transporte e montagem' : 'Ex.: Sofá rectangular branco'}
                        />
                        <InputError message={errors.nome} />
                    </LinhaForm>
                    <LinhaForm rotulo="Categoria" htmlFor="categoria_id">
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                id="categoria_id"
                                value={data.categoria_id}
                                onChange={(e) => setData('categoria_id', e.target.value)}
                                className={sel}
                            >
                                <option value="">Sem categoria</option>
                                {categorias.map((c) => (
                                    <option key={c.valor} value={c.valor}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                            <Link
                                href="/produtos/categorias"
                                className="text-muted-foreground hover:text-foreground text-[13px] underline-offset-4 hover:underline"
                            >
                                Gerir categorias
                            </Link>
                        </div>
                        <InputError message={errors.categoria_id} />
                    </LinhaForm>
                    <LinhaForm rotulo="Unidade" htmlFor="unidade">
                        <select id="unidade" value={data.unidade} onChange={(e) => setData('unidade', e.target.value)} className={sel}>
                            {opcoes.unidades.map((o) => (
                                <option key={o.valor} value={o.valor}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </LinhaForm>
                    <LinhaForm rotulo="Notas internas" htmlFor="descricao" ajuda="Só a equipa vê. Para o texto da loja, use a secção Loja.">
                        <textarea
                            id="descricao"
                            rows={3}
                            value={data.descricao}
                            onChange={(e) => setData('descricao', e.target.value)}
                            className={areaTexto}
                        />
                    </LinhaForm>
                </Seccao>

                <Seccao titulo="Preços e quantidade" descricao="Preços em meticais, sem IVA. A taxa de IVA aplica-se a todos.">
                    <LinhaForm rotulo="Taxa de IVA" htmlFor="taxa_iva">
                        <select
                            id="taxa_iva"
                            value={data.taxa_iva}
                            onChange={(e) => setData('taxa_iva', e.target.value)}
                            className={`${sel} max-w-40`}
                        >
                            {opcoes.taxasIva.map((o) => (
                                <option key={o.valor} value={o.valor}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.taxa_iva} />
                    </LinhaForm>
                    <LinhaForm rotulo="Aluguer" htmlFor="preco_aluguer" obrigatorio={data.em_aluguer}>
                        <label className="mb-2.5 flex w-fit items-center gap-2 pt-2 text-[13.5px]">
                            <Checkbox checked={data.em_aluguer} onCheckedChange={(v) => setData('em_aluguer', v === true)} />
                            Aluga-se
                        </label>
                        {data.em_aluguer && (
                            <CampoPreco
                                id="preco_aluguer"
                                valor={data.preco_aluguer}
                                onChange={(v) => setData('preco_aluguer', v)}
                                sufixo="MT por dia"
                                comIva={paraNumero(data.preco_aluguer) * factorIva}
                            />
                        )}
                        <InputError message={errors.preco_aluguer} />
                    </LinhaForm>
                    <LinhaForm rotulo="Venda" htmlFor="preco" obrigatorio={data.em_venda}>
                        <label className="mb-2.5 flex w-fit items-center gap-2 pt-2 text-[13.5px]">
                            <Checkbox checked={data.em_venda} onCheckedChange={(v) => setData('em_venda', v === true)} />
                            Vende-se
                        </label>
                        {data.em_venda && (
                            <CampoPreco
                                id="preco"
                                valor={data.preco}
                                onChange={(v) => setData('preco', v)}
                                sufixo={`MT por ${opcoes.unidades.find((u) => u.valor === data.unidade)?.label.toLowerCase() ?? 'unidade'}`}
                                comIva={paraNumero(data.preco) * factorIva}
                            />
                        )}
                        <InputError message={errors.preco} />
                    </LinhaForm>
                    <LinhaForm
                        rotulo="Compra"
                        htmlFor="preco_compra"
                        ajuda="Opcional. Serve para as encomendas a fornecedores e para calcular margens."
                    >
                        <label className="mb-2.5 flex w-fit items-center gap-2 pt-2 text-[13.5px]">
                            <Checkbox checked={data.em_compra} onCheckedChange={(v) => setData('em_compra', v === true)} />
                            Compra-se a fornecedores
                        </label>
                        <CampoPreco id="preco_compra" valor={data.preco_compra} onChange={(v) => setData('preco_compra', v)} sufixo="MT" />
                        <InputError message={errors.preco_compra} />
                    </LinhaForm>
                    {!servico && !aEditar && (
                        <LinhaForm
                            rotulo="Quantidade inicial"
                            htmlFor="quantidade_total"
                            ajuda="Quantas peças a LemServ já tem. Depois, a quantidade muda pelos movimentos de stock (entradas, saídas, devoluções, inventário)."
                        >
                            <Input
                                id="quantidade_total"
                                value={data.quantidade_total}
                                onChange={(e) => setData('quantidade_total', e.target.value.replace(/[^\d]/g, ''))}
                                inputMode="numeric"
                                className="max-w-28 text-right"
                                placeholder="0"
                            />
                            <InputError message={errors.quantidade_total} />
                        </LinhaForm>
                    )}
                    {!servico && aEditar && (
                        <LinhaForm rotulo="Quantidade">
                            <p className="pt-2 text-[13.5px]">
                                <span className="font-medium tabular-nums">{p.quantidade_total}</span> peça(s)
                                {p.quantidade_fora > 0 && <span className="text-muted-foreground">, {p.quantidade_fora} alugada(s) agora</span>}.{' '}
                                <Link
                                    href={`/produtos/${p.id}#stock`}
                                    className="text-muted-foreground hover:text-foreground underline underline-offset-4"
                                >
                                    Muda-se no separador Stock
                                </Link>
                            </p>
                        </LinhaForm>
                    )}
                </Seccao>

                <Seccao titulo="Loja" descricao="O que o cliente vê no site e na loja de aluguer.">
                    <LinhaForm rotulo="Mostrar na loja">
                        <div className="flex flex-wrap gap-5 pt-2 text-[13.5px]">
                            <label className="flex items-center gap-2">
                                <Checkbox checked={data.na_loja} onCheckedChange={(v) => setData('na_loja', v === true)} />
                                Mostrar aos clientes
                            </label>
                            <label className="flex items-center gap-2">
                                <Checkbox checked={data.loja_destaque} onCheckedChange={(v) => setData('loja_destaque', v === true)} />
                                Em destaque
                            </label>
                        </div>
                    </LinhaForm>
                    <LinhaForm
                        rotulo="Posição"
                        htmlFor="loja_ordem"
                        ajuda="Os números mais baixos aparecem primeiro dentro da categoria. Com 0, segue a ordem do nome."
                    >
                        <Input
                            id="loja_ordem"
                            value={data.loja_ordem}
                            onChange={(e) => setData('loja_ordem', e.target.value.replace(/[^\d]/g, ''))}
                            inputMode="numeric"
                            className="max-w-28 text-right"
                        />
                        <InputError message={errors.loja_ordem} />
                    </LinhaForm>
                    <LinhaForm
                        rotulo="Descrição para o cliente"
                        htmlFor="loja_descricao"
                        ajuda="Medidas, cores, material, para quantas pessoas… Se ficar vazia, a loja mostra só o nome."
                    >
                        <textarea
                            id="loja_descricao"
                            rows={4}
                            value={data.loja_descricao}
                            onChange={(e) => setData('loja_descricao', e.target.value)}
                            className={areaTexto}
                            maxLength={2000}
                        />
                        <InputError message={errors.loja_descricao} />
                    </LinhaForm>
                </Seccao>

                {!aEditar && <p className="text-muted-foreground mb-4 text-[13px]">As fotos adicionam-se na ficha, depois de criar.</p>}

                <div className="flex gap-2">
                    <Button type="submit" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {aEditar ? 'Guardar' : 'Criar'}
                    </Button>
                    <Button type="button" variant="outline" asChild>
                        <Link href={aEditar ? `/produtos/${p.id}` : '/produtos'}>Cancelar</Link>
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
