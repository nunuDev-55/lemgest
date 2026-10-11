import { CartaoProduto, Foto, type ProdutoLoja } from '@/components/site';
import SiteLayout, { linkWhatsApp, useSite } from '@/layouts/site-layout';
import { Link } from '@inertiajs/react';
import { CalendarCheck, MessageCircle, Search, Truck } from 'lucide-react';

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
}

const PASSOS = [
    { icone: Search, titulo: 'Escolha no catálogo', texto: 'Veja o material, os preços por dia e o que está livre nas datas do seu evento.' },
    { icone: CalendarCheck, titulo: 'Peça a reserva', texto: 'Diga as datas, o local e se quer transporte. Fica tudo na sua conta.' },
    { icone: Truck, titulo: 'A LemServ confirma', texto: 'Confirmamos a disponibilidade e a taxa de transporte, entregamos e recolhemos.' },
];

/** Página inicial pública da LemServ */
export default function Inicio({ destaques, categorias, servicos }: Props) {
    const { loja, cliente } = useSite();
    const whatsapp = linkWhatsApp(loja?.telemovel ?? loja?.telefone, 'Olá LemServ, gostaria de informações sobre aluguer.');
    const fotosHero = destaques.filter((d) => d.foto).slice(0, 3);

    return (
        <SiteLayout titulo="LemServ · Lounge e Outdoor" largo>
            <section className="grid items-center gap-10 py-12 md:grid-cols-[1.1fr_1fr] md:py-16">
                <div>
                    <p className="text-primary mb-3 text-[13px] font-medium">Maputo e Matola</p>
                    <h1 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.025em] md:text-[44px]">
                        Lounge e decoração para o seu evento
                    </h1>
                    <p className="text-muted-foreground mt-4 max-w-xl text-[16px] leading-relaxed">
                        Sofás, puffs, tendas e decoração para casamentos, aniversários e eventos de empresa. Fabricamos o nosso próprio material,
                        entregamos, montamos e recolhemos.
                    </p>
                    <div className="mt-7 flex flex-wrap gap-3">
                        <Link href="/catalogo" className="bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-[14px] font-medium">
                            Ver o catálogo
                        </Link>
                        {!cliente && (
                            <Link href="/conta/registar" className="hover:bg-muted rounded-md border px-5 py-2.5 text-[14px] font-medium">
                                Criar conta para reservar
                            </Link>
                        )}
                        {cliente && whatsapp && (
                            <a
                                href={whatsapp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:bg-muted inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-[14px] font-medium"
                            >
                                <MessageCircle className="size-4" />
                                WhatsApp
                            </a>
                        )}
                    </div>
                </div>
                {fotosHero.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {fotosHero.map((p, i) => (
                            <div
                                key={p.id}
                                className={
                                    i === 0 ? 'col-span-2 aspect-[16/9] overflow-hidden rounded-lg' : 'aspect-square overflow-hidden rounded-lg'
                                }
                            >
                                <Foto src={p.foto} alt={p.nome} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-muted/50 flex aspect-[4/3] items-center justify-center rounded-lg">
                        <img src={loja?.logotipo ?? '/img/lemservices-logo.png'} alt="" className="h-32 w-auto object-contain opacity-80" />
                    </div>
                )}
            </section>

            {categorias.length > 0 && (
                <section className="py-8">
                    <h2 className="mb-5 text-[20px] font-semibold tracking-[-0.015em]">O nosso material</h2>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {categorias.map((c) => (
                            <Link key={c.id} href={`/catalogo?categoria=${c.id}`} className="group overflow-hidden rounded-lg border">
                                <div className="aspect-square overflow-hidden">
                                    <Foto src={c.foto} alt={c.nome} className="transition-transform duration-300 group-hover:scale-[1.03]" />
                                </div>
                                <div className="p-3">
                                    <p className="text-[14.5px] font-medium">{c.nome}</p>
                                    <p className="text-muted-foreground text-[12.5px]">
                                        {c.n} {c.n === 1 ? 'modelo' : 'modelos'}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {destaques.length > 0 && (
                <section className="py-8">
                    <div className="mb-5 flex items-baseline justify-between gap-4">
                        <h2 className="text-[20px] font-semibold tracking-[-0.015em]">Em destaque</h2>
                        <Link href="/catalogo" className="text-muted-foreground hover:text-foreground text-[13.5px]">
                            Ver tudo
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        {destaques.map((p) => (
                            <CartaoProduto key={p.id} p={p} />
                        ))}
                    </div>
                </section>
            )}

            <section className="py-8">
                <h2 className="mb-5 text-[20px] font-semibold tracking-[-0.015em]">Como reservar</h2>
                <ol className="grid gap-4 md:grid-cols-3">
                    {PASSOS.map((p, i) => (
                        <li key={p.titulo} className="rounded-lg border p-5">
                            <p.icone className="text-primary mb-3 size-5" />
                            <p className="text-[14.5px] font-medium">
                                {i + 1}. {p.titulo}
                            </p>
                            <p className="text-muted-foreground mt-1 text-[13.5px] leading-relaxed">{p.texto}</p>
                        </li>
                    ))}
                </ol>
            </section>

            {servicos.length > 0 && (
                <section className="py-8">
                    <h2 className="mb-5 text-[20px] font-semibold tracking-[-0.015em]">Serviços</h2>
                    <ul className="grid gap-4 md:grid-cols-3">
                        {servicos.map((s) => (
                            <li key={s.id} className="rounded-lg border p-5">
                                <p className="text-[14.5px] font-medium">{s.nome}</p>
                                {s.descricao && <p className="text-muted-foreground mt-1 text-[13.5px] leading-relaxed">{s.descricao}</p>}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </SiteLayout>
    );
}
