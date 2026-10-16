import { CartaoProduto, Etiqueta, Foto, TituloSeccao, useFotosSite, type ProdutoLoja } from '@/components/site';
import { VisorFotos } from '@/components/visor-fotos';
import SiteLayout, { linkWhatsApp, useSite } from '@/layouts/site-layout';
import { formatNumero, formatValor } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowRight,
    ArrowUpRight,
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    Expand,
    Gem,
    Hammer,
    MessageCircle,
    Palette,
    Plus,
    Search,
    Truck,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface Categoria {
    id: number;
    nome: string;
    descricao: string | null;
    n: number;
    foto: string | null;
}

interface Props {
    destaques: ProdutoLoja[];
    categorias: Categoria[];
    servicos: { id: number; nome: string; descricao: string | null }[];
    materiais: { id: number; nome: string; n: number }[];
    transporte: { minimo: string; maximo: string };
}

const VANTAGENS = [
    { icone: Hammer, titulo: 'Fabrico próprio', texto: 'Feito pela LemServ' },
    { icone: Gem, titulo: 'Materiais de qualidade', texto: 'Napa, tecido e bouclé' },
    { icone: Truck, titulo: 'Entrega e montagem', texto: 'Maputo e Matola' },
    { icone: Palette, titulo: 'O seu tema de cores', texto: 'Tudo a combinar' },
];

const PASSOS = [
    { icone: Search, titulo: 'Escolha no catálogo', texto: 'Veja o material, o preço por dia e o que está livre nas datas do seu evento.' },
    { icone: CalendarCheck, titulo: 'Peça a reserva', texto: 'Diga as datas, o local e se quer transporte. Fica tudo guardado na sua conta.' },
    { icone: Truck, titulo: 'A LemServ confirma', texto: 'Confirmamos a disponibilidade e a taxa de transporte, entregamos e recolhemos.' },
];

/** Texturas tiradas das fotos da LemServ (public/img/materiais), pelo nome do material */
function textura(nome: string): string | null {
    const chave = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (chave.includes('napa') || chave.includes('pele')) return '/img/materiais/napa.webp';
    if (chave.includes('la') || chave.includes('boucle')) return '/img/materiais/la.webp';
    if (chave.includes('veludo')) return '/img/materiais/veludo.webp';
    if (chave.includes('tecido') || chave.includes('linho')) return '/img/materiais/tecido.webp';
    return null;
}

const botaoDourado =
    'maiusculas-pequenas inline-flex items-center gap-2 rounded-[3px] bg-[var(--dourado)] px-6 py-3.5 font-medium text-[var(--tinta)] transition-opacity hover:opacity-90';
const botaoContorno =
    'maiusculas-pequenas inline-flex items-center gap-2 rounded-[3px] border border-[#efe6da]/35 px-6 py-3.5 font-medium text-[#efe6da] transition-colors hover:bg-white/10';
const doisDigitos = (n: number) => String(n).padStart(2, '0');
/** Colunas da grelha conforme o número de cartões (2, 3 ou 4), sem deixar espaços vazios */
const colunas = (n: number) => (n >= 4 ? 'md:grid-cols-4' : n === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2');

/** Página inicial pública da LemServ: capa e destaques escuros (Novaire), resto claro (Livora) */
export default function Inicio({ destaques, categorias, servicos, materiais, transporte }: Props) {
    const { loja, cliente } = useSite();
    const { capa: capas, banner, galeria, porIndice } = useFotosSite();
    const [capa, setCapa] = useState(0);
    const [destaque, setDestaque] = useState(0);
    const [visor, setVisor] = useState<number | null>(null);
    const whatsapp = linkWhatsApp(loja?.telemovel ?? loja?.telefone, 'Olá LemServ, gostaria de um orçamento para um evento.');
    const pecas = destaques.filter((d) => d.foto).slice(0, 4);
    const peca = pecas[destaque] ?? null;
    const fotoFinal = porIndice(7);

    // A capa muda de foto a cada 7 segundos (não muda para quem pediu menos movimento no sistema)
    useEffect(() => {
        if (capas.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const t = setInterval(() => setCapa((c) => (c + 1) % capas.length), 7000);
        return () => clearInterval(t);
    }, [capas.length]);

    const perguntas = [
        {
            p: 'Como faço uma reserva?',
            r: 'Crie a sua conta (a LemServ aprova-a), escolha o material no catálogo e junte-o à sua reserva. Indique as datas, o local e se quer transporte, e envie o pedido. A LemServ confirma a disponibilidade e contacta-o.',
        },
        {
            p: 'Os preços são por dia?',
            r: 'Sim. Cada peça tem um preço por dia, já com IVA. Num evento de vários dias, o preço multiplica pelos dias. Os preços aparecem no catálogo quando entra na sua conta.',
        },
        {
            p: 'Quanto custa o transporte?',
            r: `A LemServ leva e recolhe o material. A taxa vai de ${formatValor(transporte.minimo)} a ${formatValor(transporte.maximo)} MT, conforme o local, e é confirmada com a reserva. Também pode levantar e devolver no nosso armazém.`,
        },
        {
            p: 'Com quanta antecedência devo reservar?',
            r: 'Pelo site, pelo menos um dia antes. O material só fica guardado para si quando a LemServ confirma a reserva, por isso, para casamentos e eventos grandes, quanto antes melhor.',
        },
        {
            p: 'Posso escolher as cores?',
            r: 'Sim. Diga-nos o tema de cores ao pedir a reserva e combinamos as almofadas, as mesas e a decoração.',
        },
        {
            p: 'Como pago?',
            r: 'Depois de confirmada a reserva, a LemServ envia-lhe a factura com os dados para pagamento. Cada pagamento tem o seu recibo, que pode ver na sua conta.',
        },
    ];

    return (
        <SiteLayout titulo="LemServ · Lounge e Outdoor">
            {/* ======== Parte escura ======== */}
            <div className="escuro">
                {/* Capa: foto de ponta a ponta */}
                <section className="relative flex min-h-[600px] items-center overflow-hidden md:h-[calc(100svh-76px)] md:max-h-[860px]">
                    {capas.map((f, i) => (
                        <img
                            key={f.id}
                            src={f.grande}
                            alt={i === capa ? f.legenda : ''}
                            aria-hidden={i !== capa}
                            fetchPriority={i === 0 ? 'high' : 'low'}
                            className={cn(
                                'absolute inset-0 size-full object-cover transition-all duration-[1600ms] ease-out',
                                i === capa ? 'scale-100 opacity-100' : 'scale-[1.04] opacity-0',
                            )}
                        />
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--tinta)] via-[var(--tinta)]/75 to-[var(--tinta)]/10" />
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--tinta)] to-transparent" />

                    <div className="relative mx-auto w-full max-w-7xl px-4 py-20 md:px-8">
                        <p className="maiusculas-pequenas text-[var(--dourado)]">LemServ · Lounge e Outdoor</p>
                        <h1 className="titulo-maiusculo mt-6 max-w-3xl text-[46px] md:text-[80px]">
                            Mobiliário que
                            <br />
                            faz o seu evento.
                        </h1>
                        <p className="mt-6 max-w-md text-[16px] leading-relaxed text-[#efe6da]/75">
                            Sofás, puffs, tendas e decoração para casamentos, aniversários e eventos de empresa, em Maputo e Matola. Fabricamos o
                            nosso material e tratamos de tudo.
                        </p>
                        <div className="mt-9 flex flex-wrap gap-3">
                            <Link href="/catalogo" className={botaoDourado}>
                                Ver o catálogo
                            </Link>
                            <a href="#eventos" className={botaoContorno}>
                                Ver eventos
                            </a>
                        </div>
                        <a
                            href="#vantagens"
                            className="maiusculas-pequenas mt-14 hidden items-center gap-2 text-[#efe6da]/60 hover:text-white md:inline-flex"
                        >
                            Descer
                            <ArrowDown className="size-3.5" />
                        </a>
                    </div>

                    {capas.length > 1 && (
                        <div className="absolute right-4 bottom-8 flex items-center gap-4 md:right-8">
                            <span className="maiusculas-pequenas text-[#efe6da]/70 tabular-nums">
                                {doisDigitos(capa + 1)} / {doisDigitos(capas.length)}
                            </span>
                            <div className="flex gap-1.5">
                                {capas.map((f, i) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        onClick={() => setCapa(i)}
                                        aria-label={`Mostrar a foto ${i + 1}`}
                                        className={cn('h-[2px] transition-all', i === capa ? 'w-10 bg-[var(--dourado)]' : 'w-5 bg-white/40')}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                {/* Vantagens */}
                <section id="vantagens" className="border-y border-white/10">
                    <ul className="mx-auto grid max-w-7xl grid-cols-2 px-4 md:grid-cols-4 md:px-8">
                        {VANTAGENS.map((v, i) => (
                            <li
                                key={v.titulo}
                                className={cn('flex flex-col items-center gap-2 px-3 py-8 text-center', i > 0 && 'md:border-l md:border-white/10')}
                            >
                                <v.icone className="size-6 text-[var(--dourado)]" strokeWidth={1.3} />
                                <span className="maiusculas-pequenas mt-1 text-[#efe6da]">{v.titulo}</span>
                                <span className="text-[13px] text-[#efe6da]/55">{v.texto}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Colecções (categorias) */}
                {categorias.length > 0 && (
                    <section className="mx-auto grid max-w-7xl gap-10 px-4 py-24 md:px-8 lg:grid-cols-[1fr_2.6fr] lg:items-center">
                        <div>
                            <p className="maiusculas-pequenas text-[var(--dourado)]">As nossas colecções</p>
                            <h2 className="titulo-maiusculo mt-5 text-[40px] md:text-[52px]">
                                Material
                                <br />
                                para cada
                                <br />
                                evento.
                            </h2>
                            <Link
                                href="/catalogo"
                                className="maiusculas-pequenas mt-8 inline-flex items-center gap-2 text-[#efe6da]/80 hover:text-white"
                            >
                                Ver todo o catálogo
                                <ArrowRight className="size-3.5" />
                            </Link>
                        </div>
                        <div className={cn('grid grid-cols-2 gap-3', colunas(Math.min(4, categorias.length)))}>
                            {categorias.slice(0, 4).map((c, i) => (
                                <Link
                                    key={c.id}
                                    href={`/catalogo?categoria=${c.id}`}
                                    className="group flex flex-col overflow-hidden rounded-[4px] bg-[var(--tinta-2)] ring-1 ring-white/10"
                                >
                                    <div className="aspect-[4/5] overflow-hidden">
                                        <Foto
                                            src={c.foto ?? porIndice(i * 5 + 4)?.media ?? null}
                                            alt={c.nome}
                                            className="transition-transform duration-700 group-hover:scale-[1.05]"
                                        />
                                    </div>
                                    <div className="flex items-start justify-between gap-2 p-4">
                                        <span>
                                            <span className="titulo-maiusculo block text-[20px]">{c.nome}</span>
                                            <span className="text-[12.5px] text-[#efe6da]/55">
                                                {c.n} {c.n === 1 ? 'modelo' : 'modelos'}
                                            </span>
                                        </span>
                                        <ArrowRight className="mt-1 size-4 shrink-0 text-[var(--dourado)] transition-transform group-hover:translate-x-1" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* Peça em destaque (01 / 04) */}
                {peca && (
                    <section className="border-t border-white/10 bg-[var(--tinta-2)]">
                        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 md:px-8 lg:grid-cols-[1.2fr_1fr]">
                            <div className="aspect-[4/3] overflow-hidden rounded-[4px]">
                                <Foto key={peca.id} src={peca.foto} alt={peca.nome} prioridade />
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <p className="maiusculas-pequenas text-[var(--dourado)]">Em destaque</p>
                                    <span className="maiusculas-pequenas text-[#efe6da]/60 tabular-nums">
                                        {doisDigitos(destaque + 1)} / {doisDigitos(pecas.length)}
                                    </span>
                                </div>
                                <h2 className="titulo-maiusculo mt-5 text-[36px] md:text-[46px]">{peca.nome}</h2>
                                {peca.descricao && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#efe6da]/70">{peca.descricao}</p>}
                                <dl className="mt-7 grid grid-cols-3 border-y border-white/10 py-4 text-[13px]">
                                    {[
                                        ['Categoria', peca.categoria ?? '—'],
                                        ['Material', peca.material ?? '—'],
                                        ['Preço por dia', peca.preco_dia ? `${formatNumero(peca.preco_dia)} MT` : 'Com conta'],
                                    ].map(([k, v], i) => (
                                        <div key={k} className={cn('px-3 first:pl-0', i > 0 && 'border-l border-white/10')}>
                                            <dt className="text-[11.5px] text-[#efe6da]/50">{k}</dt>
                                            <dd className="mt-1 font-medium">{v}</dd>
                                        </div>
                                    ))}
                                </dl>
                                <div className="mt-8 flex items-center justify-between gap-4">
                                    <Link href={`/catalogo/${peca.id}`} className={botaoContorno}>
                                        Ver a peça
                                    </Link>
                                    {pecas.length > 1 && (
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDestaque((d) => (d - 1 + pecas.length) % pecas.length)}
                                                aria-label="Peça anterior"
                                                className="flex size-11 items-center justify-center rounded-full border border-white/20 hover:bg-white/10"
                                            >
                                                <ChevronLeft className="size-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDestaque((d) => (d + 1) % pecas.length)}
                                                aria-label="Peça seguinte"
                                                className="flex size-11 items-center justify-center rounded-full border border-white/20 hover:bg-white/10"
                                            >
                                                <ChevronRight className="size-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Os nossos materiais */}
                {materiais.length > 0 && (
                    <section
                        id="materiais"
                        className="mx-auto grid max-w-7xl scroll-mt-24 gap-10 px-4 py-24 md:px-8 lg:grid-cols-[1fr_2.6fr] lg:items-center"
                    >
                        <div>
                            <p className="maiusculas-pequenas text-[var(--dourado)]">Os nossos materiais</p>
                            <h2 className="titulo-maiusculo mt-5 text-[40px] md:text-[48px]">
                                Texturas
                                <br />
                                que se sentem.
                            </h2>
                            <p className="mt-5 max-w-xs text-[14.5px] leading-relaxed text-[#efe6da]/65">
                                Fabricamos em napa, tecido e bouclé, e limpamos e revemos cada peça antes do seu evento.
                            </p>
                        </div>
                        <div className={cn('grid grid-cols-2 gap-3', colunas(Math.min(4, materiais.length)))}>
                            {materiais.slice(0, 4).map((m) => {
                                const imagem = textura(m.nome);
                                const conteudo = (
                                    <>
                                        <div className="aspect-[3/4] overflow-hidden">
                                            {imagem ? (
                                                <img
                                                    src={imagem}
                                                    alt={`Textura: ${m.nome}`}
                                                    loading="lazy"
                                                    className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                                                />
                                            ) : (
                                                <div className="size-full bg-gradient-to-br from-[#3a2d25] to-[#1c1411]" />
                                            )}
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
                                            <span className="titulo-maiusculo block text-[20px]">{m.nome}</span>
                                            {m.n > 0 && (
                                                <span className="text-[12px] text-[#efe6da]/70">
                                                    {m.n} {m.n === 1 ? 'peça' : 'peças'}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                );
                                return m.n > 0 ? (
                                    <Link
                                        key={m.id}
                                        href={`/catalogo?material=${m.id}`}
                                        className="group relative overflow-hidden rounded-[4px] ring-1 ring-white/10"
                                    >
                                        {conteudo}
                                    </Link>
                                ) : (
                                    <div key={m.id} className="group relative overflow-hidden rounded-[4px] ring-1 ring-white/10">
                                        {conteudo}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>

            {/* ======== Parte clara ======== */}

            {/* Mais pedidos */}
            {destaques.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8">
                    <TituloSeccao
                        etiqueta="Em destaque"
                        titulo="Os mais pedidos para eventos"
                        accao={
                            <Link href="/catalogo" className="maiusculas-pequenas inline-flex items-center gap-2 font-medium hover:underline">
                                Ver todo o catálogo
                                <ArrowRight className="size-3.5" />
                            </Link>
                        }
                    />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4">
                        {destaques.slice(0, 4).map((p) => (
                            <CartaoProduto key={p.id} p={p} />
                        ))}
                    </div>
                </section>
            )}

            {/* Faixa colorida (estilo Livora), na cor da LemServ */}
            <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8">
                <div className="relative grid overflow-hidden rounded-2xl bg-[var(--ameixa)] text-[#f6f1ea] md:grid-cols-[1fr_1.2fr]">
                    <div className="relative z-10 p-8 md:p-14">
                        <Etiqueta className="text-[var(--dourado)]">Casamentos · Aniversários · Empresas</Etiqueta>
                        <h2 className="font-titulo text-[38px] leading-[1.05] font-medium md:text-[50px]">Do primeiro sofá à última almofada</h2>
                        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#f6f1ea]/75">
                            Diga-nos o local, as datas e o tema de cores. Levamos o material, montamos tudo antes do evento e recolhemos no fim.
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Link href={cliente ? '/catalogo' : '/conta/registar'} className={botaoDourado}>
                                {cliente ? 'Escolher no catálogo' : 'Criar conta e reservar'}
                            </Link>
                            {whatsapp && (
                                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={botaoContorno}>
                                    <MessageCircle className="size-4" />
                                    Pedir orçamento
                                </a>
                            )}
                        </div>
                    </div>
                    {banner && (
                        <div className="relative min-h-[260px]">
                            <img src={banner.grande} alt={banner.legenda} loading="lazy" className="absolute inset-0 size-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-r from-[var(--ameixa)] via-transparent to-transparent" />
                        </div>
                    )}
                </div>
            </section>

            {/* Galeria de eventos */}
            {galeria.length > 0 && (
                <section id="eventos" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-24 md:px-8">
                    <TituloSeccao etiqueta="Eventos que montámos" titulo="Cada evento com a sua cara" />
                    <div className="columns-2 gap-3 md:columns-4 [&>*]:mb-3">
                        {galeria.map((f, i) => (
                            <button
                                key={f.id}
                                type="button"
                                onClick={() => setVisor(i)}
                                className="group relative block w-full break-inside-avoid overflow-hidden rounded-xl bg-[var(--areia)]"
                                aria-label={`Ver em grande: ${f.legenda}`}
                            >
                                <img
                                    src={f.media}
                                    alt={f.legenda}
                                    loading="lazy"
                                    className="w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                                />
                                <span className="absolute inset-0 flex items-end bg-gradient-to-t from-black/55 via-transparent to-transparent p-4 text-left text-[13px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                                    <span className="flex-1">{f.legenda}</span>
                                    <Expand className="size-4 shrink-0" />
                                </span>
                            </button>
                        ))}
                    </div>
                    <VisorFotos fotos={galeria.map((f) => ({ src: f.grande, alt: f.legenda }))} indice={visor} onMudar={setVisor} />
                </section>
            )}

            {/* Como reservar */}
            <section id="como-reservar" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-24 md:px-8">
                <TituloSeccao etiqueta="Como reservar" titulo="Três passos até ao seu evento" />
                <ol className="grid gap-4 md:grid-cols-3">
                    {PASSOS.map((p, i) => (
                        <li key={p.titulo} className="bg-card rounded-xl border p-8">
                            <div className="flex items-center justify-between">
                                <p.icone className="size-6 text-[#9c7a45]" strokeWidth={1.4} />
                                <span className="font-titulo text-[44px] leading-none text-[var(--areia)]">{doisDigitos(i + 1)}</span>
                            </div>
                            <p className="font-titulo mt-6 text-[24px] font-medium">{p.titulo}</p>
                            <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">{p.texto}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Serviços */}
            {servicos.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8">
                    <TituloSeccao etiqueta="Serviços" titulo="Também tratamos de" />
                    <ul className="grid gap-6 md:grid-cols-3">
                        {servicos.map((s) => (
                            <li key={s.id} className="border-t border-[var(--tinta)]/15 pt-5">
                                <p className="font-titulo text-[24px] font-medium">{s.nome.replace(/\s*\(.*\)$/, '')}</p>
                                {s.descricao && <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">{s.descricao}</p>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Perguntas frequentes */}
            <section id="perguntas" className="mx-auto grid max-w-7xl scroll-mt-24 gap-10 px-4 pt-24 md:px-8 lg:grid-cols-[1fr_1.6fr]">
                <div>
                    <Etiqueta>Perguntas frequentes</Etiqueta>
                    <h2 className="font-titulo text-[34px] leading-[1.05] font-medium md:text-[46px]">O que costumam perguntar-nos</h2>
                    <p className="text-muted-foreground mt-4 max-w-sm text-[15px] leading-relaxed">
                        Tem outra dúvida? Fale connosco pelo WhatsApp: respondemos o mais depressa possível.
                    </p>
                    {whatsapp && (
                        <a
                            href={whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="maiusculas-pequenas mt-7 inline-flex items-center gap-2 rounded-[3px] bg-[var(--tinta)] px-5 py-3.5 font-medium text-[#efe6da]"
                        >
                            <MessageCircle className="size-4" />
                            Perguntar no WhatsApp
                        </a>
                    )}
                </div>
                <div className="divide-y divide-[var(--tinta)]/12 border-y border-[var(--tinta)]/12">
                    {perguntas.map((q) => (
                        <details key={q.p} className="group">
                            <summary className="font-titulo flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[21px] font-medium [&::-webkit-details-marker]:hidden">
                                {q.p}
                                <Plus
                                    className="size-5 shrink-0 text-[#9c7a45] transition-transform duration-200 group-open:rotate-45"
                                    strokeWidth={1.4}
                                />
                            </summary>
                            <p className="text-muted-foreground -mt-1 pr-10 pb-5 text-[14.5px] leading-relaxed">{q.r}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* Chamada final (estilo Livora) */}
            {!cliente && (
                <section className="mx-auto max-w-7xl px-4 pt-24 md:px-8">
                    <div className="grid items-center overflow-hidden rounded-2xl bg-[var(--areia)]/70 md:grid-cols-[1.3fr_1fr]">
                        <div className="p-8 md:p-12">
                            <h2 className="font-titulo text-[34px] leading-tight font-medium">Tem um evento em vista?</h2>
                            <p className="text-muted-foreground mt-2 text-[15px]">
                                Crie a sua conta para ver os preços, a disponibilidade e pedir a reserva online.
                            </p>
                            <Link
                                href="/conta/registar"
                                className="maiusculas-pequenas mt-6 inline-flex items-center gap-2 rounded-[3px] bg-[var(--tinta)] px-6 py-3.5 font-medium text-[#efe6da]"
                            >
                                Criar conta grátis
                                <ArrowUpRight className="size-3.5" />
                            </Link>
                        </div>
                        {fotoFinal && (
                            <img src={fotoFinal.media} alt="" loading="lazy" className="hidden h-full max-h-72 w-full object-cover md:block" />
                        )}
                    </div>
                </section>
            )}
        </SiteLayout>
    );
}
