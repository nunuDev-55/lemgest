import { CartaoProduto, Etiqueta, Foto, TituloSeccao, useFotosSite, type ProdutoLoja } from '@/components/site';
import { VisorFotos } from '@/components/visor-fotos';
import SiteLayout, { linkWhatsApp, useSite } from '@/layouts/site-layout';
import { formatNumero, formatValor } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight, ArrowUpRight, CalendarCheck, Expand, Hammer, MessageCircle, Palette, Plus, Search, Truck } from 'lucide-react';
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
    transporte: { minimo: string; maximo: string };
}

const VANTAGENS = [
    { icone: Hammer, titulo: 'Fabrico próprio', texto: 'O nosso material é feito por nós' },
    { icone: Truck, titulo: 'Entrega e montagem', texto: 'Levamos, montamos e recolhemos' },
    { icone: Palette, titulo: 'O seu tema de cores', texto: 'Almofadas e mesas a combinar' },
    { icone: CalendarCheck, titulo: 'Reserva online', texto: 'Veja o que está livre nas suas datas' },
];

const PASSOS = [
    { icone: Search, titulo: 'Escolha no catálogo', texto: 'Veja o material, o preço por dia e o que está livre nas datas do seu evento.' },
    { icone: CalendarCheck, titulo: 'Peça a reserva', texto: 'Diga as datas, o local e se quer transporte. Fica tudo guardado na sua conta.' },
    { icone: Truck, titulo: 'A LemServ confirma', texto: 'Confirmamos a disponibilidade e a taxa de transporte, entregamos e recolhemos.' },
];

/** Página inicial pública da LemServ */
export default function Inicio({ destaques, categorias, servicos, transporte }: Props) {
    const { loja, cliente } = useSite();
    // Fotos geridas em Administração → Site e galeria (a capa vai alternando entre as marcadas)
    const { capa: CAPAS, pequena: CAPA_PEQUENA, banner: BANNER, galeria: GALERIA, porIndice } = useFotosSite();
    const [capa, setCapa] = useState(0);
    const [visor, setVisor] = useState<number | null>(null);

    // A capa muda de foto a cada 6 segundos (não muda para quem pediu menos movimento no sistema)
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (CAPAS.length < 2) return;
        const t = setInterval(() => setCapa((c) => (c + 1) % CAPAS.length), 6000);
        return () => clearInterval(t);
    }, [CAPAS.length]);

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
    const whatsapp = linkWhatsApp(loja?.telemovel ?? loja?.telefone, 'Olá LemServ, gostaria de um orçamento para um evento.');
    const destaque = destaques.find((d) => d.foto) ?? destaques[0];

    return (
        <SiteLayout titulo="LemServ · Lounge e Outdoor">
            {/* Capa */}
            <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-10 pb-16 md:px-8 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
                <div>
                    <Etiqueta>Aluguer para eventos · Maputo e Matola</Etiqueta>
                    <h1 className="font-titulo text-[44px] leading-[1.02] tracking-[-0.02em] md:text-[64px]">Lounge que transforma o seu evento.</h1>
                    <p className="text-muted-foreground mt-6 max-w-lg text-[16.5px] leading-relaxed">
                        Sofás, puffs, tendas e decoração para casamentos, aniversários e eventos de empresa. Fabricamos o nosso material e tratamos de
                        tudo: entrega, montagem e recolha.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href="/catalogo"
                            className="inline-flex items-center gap-2 rounded-full bg-[var(--tinta)] px-6 py-3 text-[14px] font-medium text-white"
                        >
                            Ver o catálogo
                            <ArrowRight className="size-4" />
                        </Link>
                        <a
                            href="#eventos"
                            className="hover:bg-muted inline-flex items-center gap-2 rounded-full border border-[var(--tinta)]/20 px-6 py-3 text-[14px] font-medium"
                        >
                            Ver eventos
                        </a>
                    </div>
                    <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t pt-6 text-[13px]">
                        {[
                            ['Fabrico', 'próprio'],
                            ['Entrega', 'e montagem'],
                            ['Maputo', 'e Matola'],
                        ].map(([a, b]) => (
                            <div key={a}>
                                <dt className="font-titulo text-[22px]">{a}</dt>
                                <dd className="text-muted-foreground">{b}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
                <div className="relative">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-[var(--areia)] lg:aspect-[5/6]">
                        {CAPAS.map((f, i) => (
                            <img
                                key={f.id}
                                src={f.grande}
                                alt={i === capa ? f.legenda : ''}
                                aria-hidden={i !== capa}
                                fetchPriority={i === 0 ? 'high' : 'low'}
                                className={cn(
                                    'absolute inset-0 size-full object-cover transition-opacity duration-[1200ms] ease-out',
                                    i === capa ? 'opacity-100' : 'opacity-0',
                                )}
                            />
                        ))}
                        <div className="absolute top-5 right-5 flex gap-1.5">
                            {CAPAS.map((f, i) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setCapa(i)}
                                    aria-label={`Mostrar a foto ${i + 1}`}
                                    className={cn('h-1.5 rounded-full bg-white transition-all', i === capa ? 'w-6' : 'w-1.5 opacity-60')}
                                />
                            ))}
                        </div>
                    </div>
                    <Link
                        href="/catalogo"
                        className="absolute bottom-5 left-5 flex max-w-[260px] items-center gap-3 rounded-2xl bg-white/95 p-2.5 pr-4 shadow-lg backdrop-blur sm:-left-8"
                    >
                        {CAPA_PEQUENA && <img src={CAPA_PEQUENA.media} alt="" className="size-16 rounded-xl object-cover" />}
                        <span className="text-[13px] leading-snug">
                            <span className="text-muted-foreground block text-[11px] tracking-[0.12em] uppercase">Colecção</span>
                            <span className="font-titulo text-[16px]">Sofás curvos e bouclé</span>
                        </span>
                        <ArrowUpRight className="ml-auto size-4 shrink-0" />
                    </Link>
                </div>
            </section>

            {/* Vantagens */}
            <section className="border-y bg-[var(--muted)]/60">
                <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-8">
                    {VANTAGENS.map((v) => (
                        <li key={v.titulo} className="flex items-start gap-3">
                            <v.icone className="text-primary mt-0.5 size-5 shrink-0" strokeWidth={1.6} />
                            <span>
                                <span className="block text-[14px] font-medium">{v.titulo}</span>
                                <span className="text-muted-foreground text-[13px]">{v.texto}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            {/* Categorias */}
            {categorias.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8">
                    <TituloSeccao
                        etiqueta="O nosso material"
                        titulo="Encontre inspiração para cada evento"
                        accao={
                            <Link
                                href="/catalogo"
                                className="inline-flex items-center gap-1.5 text-[14px] font-medium underline-offset-4 hover:underline"
                            >
                                Ver todo o catálogo
                                <ArrowRight className="size-4" />
                            </Link>
                        }
                    />
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {categorias.slice(0, 4).map((c, i) => (
                            <Link key={c.id} href={`/catalogo?categoria=${c.id}`} className="group relative aspect-[3/4] overflow-hidden rounded-2xl">
                                <Foto
                                    src={c.foto ?? porIndice(i * 5 + 4)?.media ?? null}
                                    alt={c.nome}
                                    className="transition-transform duration-500 group-hover:scale-[1.04]"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
                                <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-white">
                                    <span>
                                        <span className="font-titulo block text-[22px]">{c.nome}</span>
                                        <span className="text-[12.5px] text-white/80">
                                            {c.n} {c.n === 1 ? 'modelo' : 'modelos'}
                                        </span>
                                    </span>
                                    <span className="flex size-9 items-center justify-center rounded-full bg-white text-[var(--tinta)]">
                                        <ArrowUpRight className="size-4" />
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Produto em destaque */}
            {destaque && (
                <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8">
                    <div className="grid overflow-hidden rounded-[28px] bg-[var(--areia)]/60 md:grid-cols-[1fr_1.2fr_1fr]">
                        <div className="flex flex-col justify-center p-8 md:p-10">
                            <Etiqueta>Feito por nós</Etiqueta>
                            <h2 className="font-titulo text-[30px] leading-[1.1]">Material que dá carácter ao espaço</h2>
                            <p className="text-muted-foreground mt-4 text-[14.5px] leading-relaxed">
                                Cada peça é fabricada e cuidada pela LemServ, em napa, tecido ou lã, e chega limpa e pronta a montar.
                            </p>
                        </div>
                        <div className="aspect-square md:aspect-auto">
                            <Foto src={destaque.foto ?? porIndice(12)?.grande ?? null} alt={destaque.nome} />
                        </div>
                        <div className="flex flex-col justify-center gap-3 p-8 md:p-10">
                            <p className="text-muted-foreground text-[12px] tracking-[0.12em] uppercase">
                                {[destaque.categoria, destaque.material].filter(Boolean).join(' · ')}
                            </p>
                            <p className="font-titulo text-[26px] leading-tight">{destaque.nome}</p>
                            {destaque.descricao && (
                                <p className="text-muted-foreground line-clamp-3 text-[14px] leading-relaxed">{destaque.descricao}</p>
                            )}
                            {destaque.preco_dia ? (
                                <p className="text-[18px] font-semibold tabular-nums">
                                    {formatNumero(destaque.preco_dia)} MT <span className="text-muted-foreground text-[13px] font-normal">/ dia</span>
                                </p>
                            ) : (
                                !cliente && <p className="text-muted-foreground text-[13px]">Entre na sua conta para ver o preço por dia.</p>
                            )}
                            <Link
                                href={`/catalogo/${destaque.id}`}
                                className="mt-2 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--tinta)] px-5 py-2.5 text-[13.5px] font-medium text-white"
                            >
                                Ver a peça
                                <ArrowRight className="size-4" />
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* Mais pedidos */}
            {destaques.length > 1 && (
                <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8">
                    <TituloSeccao etiqueta="Em destaque" titulo="Os mais pedidos para eventos" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
                        {destaques.slice(0, 4).map((p) => (
                            <CartaoProduto key={p.id} p={p} />
                        ))}
                    </div>
                </section>
            )}

            {/* Banner */}
            <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8">
                <div className="relative overflow-hidden rounded-[28px] bg-[var(--tinta)] text-white">
                    {BANNER && <img src={BANNER.grande} alt={BANNER.legenda} className="absolute inset-0 size-full object-cover opacity-55" />}
                    <div className="absolute inset-0 bg-gradient-to-r from-[var(--tinta)] via-[var(--tinta)]/70 to-transparent" />
                    <div className="relative max-w-xl p-8 md:p-14">
                        <Etiqueta className="text-white/80">Casamentos · Aniversários · Empresas</Etiqueta>
                        <h2 className="font-titulo text-[34px] leading-[1.08] md:text-[44px]">Do primeiro sofá à última almofada</h2>
                        <p className="mt-4 text-[15px] leading-relaxed text-white/80">
                            Diga-nos o local, as datas e o tema de cores. Nós levamos o material, montamos tudo antes do evento e recolhemos no fim.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link
                                href={cliente ? '/catalogo' : '/conta/registar'}
                                className="rounded-full bg-white px-6 py-3 text-[14px] font-medium text-[var(--tinta)]"
                            >
                                {cliente ? 'Escolher no catálogo' : 'Criar conta e reservar'}
                            </Link>
                            {whatsapp && (
                                <a
                                    href={whatsapp}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-[14px] font-medium"
                                >
                                    <MessageCircle className="size-4" />
                                    Pedir orçamento
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Galeria de eventos */}
            <section id="eventos" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8">
                <TituloSeccao etiqueta="Eventos que montámos" titulo="Cada evento com a sua cara" />
                <div className="columns-2 gap-4 md:columns-4 [&>*]:mb-4">
                    {GALERIA.map((f, i) => (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => setVisor(i)}
                            className="group relative block w-full break-inside-avoid overflow-hidden rounded-2xl bg-[var(--areia)]"
                            aria-label={`Ver em grande: ${f.legenda}`}
                        >
                            <img
                                src={f.media}
                                alt={f.legenda}
                                loading="lazy"
                                className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <span className="absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-full bg-white/90 opacity-0 transition-opacity group-hover:opacity-100">
                                <Expand className="size-4" />
                            </span>
                        </button>
                    ))}
                </div>
                <VisorFotos fotos={GALERIA.map((f) => ({ src: f.grande, alt: f.legenda }))} indice={visor} onMudar={setVisor} />
            </section>

            {/* Como reservar */}
            <section id="como-reservar" className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-20 md:px-8">
                <TituloSeccao etiqueta="Como reservar" titulo="Três passos até ao seu evento" />
                <ol className="grid gap-4 md:grid-cols-3">
                    {PASSOS.map((p, i) => (
                        <li key={p.titulo} className="bg-card rounded-2xl border p-7">
                            <div className="flex items-center justify-between">
                                <p.icone className="text-primary size-6" strokeWidth={1.6} />
                                <span className="font-titulo text-muted-foreground text-[34px] leading-none">0{i + 1}</span>
                            </div>
                            <p className="font-titulo mt-6 text-[20px]">{p.titulo}</p>
                            <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">{p.texto}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {/* Serviços */}
            {servicos.length > 0 && (
                <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8">
                    <TituloSeccao etiqueta="Serviços" titulo="Também tratamos de" />
                    <ul className="grid gap-4 md:grid-cols-3">
                        {servicos.map((s) => (
                            <li key={s.id} className="border-t pt-5">
                                <p className="font-titulo text-[20px]">{s.nome.replace(/\s*\(.*\)$/, '')}</p>
                                {s.descricao && <p className="text-muted-foreground mt-2 text-[14px] leading-relaxed">{s.descricao}</p>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Perguntas frequentes */}
            <section id="perguntas" className="mx-auto grid max-w-7xl scroll-mt-24 gap-10 px-4 pt-20 md:px-8 lg:grid-cols-[1fr_1.6fr]">
                <div>
                    <Etiqueta>Perguntas frequentes</Etiqueta>
                    <h2 className="font-titulo text-[30px] leading-[1.1] tracking-[-0.01em] md:text-[38px]">O que costumam perguntar-nos</h2>
                    <p className="text-muted-foreground mt-4 max-w-sm text-[15px] leading-relaxed">
                        Tem outra dúvida? Fale connosco pelo WhatsApp: respondemos o mais depressa possível.
                    </p>
                    {whatsapp && (
                        <a
                            href={whatsapp}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--tinta)]/20 px-5 py-2.5 text-[14px] font-medium hover:bg-white"
                        >
                            <MessageCircle className="size-4" />
                            Perguntar no WhatsApp
                        </a>
                    )}
                </div>
                <div className="divide-y border-y">
                    {perguntas.map((q) => (
                        <details key={q.p} className="group">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[16px] font-medium [&::-webkit-details-marker]:hidden">
                                {q.p}
                                <Plus className="size-5 shrink-0 transition-transform duration-200 group-open:rotate-45" strokeWidth={1.6} />
                            </summary>
                            <p className="text-muted-foreground -mt-1 pr-10 pb-5 text-[14.5px] leading-relaxed">{q.r}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* Chamada final */}
            {!cliente && (
                <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8">
                    <div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-[var(--areia)]/70 p-8 md:flex-row md:items-center md:p-12">
                        <div>
                            <h2 className="font-titulo text-[30px] leading-tight">Tem um evento em vista?</h2>
                            <p className="text-muted-foreground mt-2 text-[15px]">
                                Crie a sua conta para ver os preços, a disponibilidade e pedir a reserva online.
                            </p>
                        </div>
                        <Link href="/conta/registar" className="shrink-0 rounded-full bg-[var(--tinta)] px-6 py-3 text-[14px] font-medium text-white">
                            Criar conta grátis
                        </Link>
                    </div>
                </section>
            )}
        </SiteLayout>
    );
}
