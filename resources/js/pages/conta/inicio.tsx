import { ListaFacturas, ListaReservas, type FacturaCliente, type ReservaCliente } from '@/components/conta';
import { EVENTOS, fotoEvento } from '@/components/site';
import ContaLayout, { useClientePode, type DadosConta } from '@/layouts/conta-layout';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, ShoppingBag } from 'lucide-react';

/** proximas e porPagar vêm a null quando o perfil Cliente não dá acesso a reservas ou a facturas */
export default function InicioCliente({ proximas, porPagar }: { proximas: ReservaCliente[] | null; porPagar: FacturaCliente[] | null }) {
    const { cliente, loja, carrinho } = usePage<DadosConta>().props;
    const pode = useClientePode();
    const primeiroNome = cliente?.nome.split(' ')[0];
    const contacto = loja?.telemovel ?? loja?.telefone;

    return (
        <ContaLayout titulo="A sua conta">
            <h1 className="font-titulo mb-1 text-[28px] tracking-[-0.015em]">Olá, {primeiroNome}</h1>
            <p className="text-muted-foreground mb-7 text-[14px]">
                Esta é a sua conta na LemServ.
                {contacto && <> Para qualquer dúvida, fale connosco: {contacto}.</>}
            </p>

            {pode('loja.catalogo') && (
                <section className="mb-10 grid overflow-hidden rounded-[24px] bg-[var(--areia)]/60 sm:grid-cols-[1fr_220px]">
                    <div className="p-6 sm:p-8">
                        <p className="font-titulo text-[24px] leading-tight">Planear um novo evento</p>
                        <p className="text-muted-foreground mt-2 max-w-md text-[14px]">
                            Escolha o material no catálogo, veja o que está livre nas suas datas e peça a reserva.
                        </p>
                        <div className="mt-5 flex flex-wrap gap-2">
                            <Link
                                href="/catalogo"
                                className="inline-flex items-center gap-2 rounded-full bg-[var(--tinta)] px-5 py-2.5 text-[13.5px] font-medium text-white"
                            >
                                Ir ao catálogo
                                <ArrowRight className="size-4" />
                            </Link>
                            {pode('loja.reservar') && carrinho > 0 && (
                                <Link
                                    href="/catalogo/reserva"
                                    className="inline-flex items-center gap-2 rounded-full border border-[var(--tinta)]/20 px-5 py-2.5 text-[13.5px] font-medium hover:bg-white"
                                >
                                    <ShoppingBag className="size-4" />
                                    Continuar a minha reserva ({carrinho})
                                </Link>
                            )}
                        </div>
                    </div>
                    <img src={fotoEvento(EVENTOS[6].n)} alt="" className="hidden h-full w-full object-cover sm:block" />
                </section>
            )}
            {proximas && (
                <section className="mb-8">
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="font-titulo text-[20px]">Próximas reservas</h2>
                        <Link href="/conta/reservas" className="text-muted-foreground hover:text-foreground text-[13px]">
                            Ver todas
                        </Link>
                    </div>
                    <ListaReservas reservas={proximas} vazio="Não tem reservas marcadas." />
                </section>
            )}

            {porPagar && (
                <section>
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="font-titulo text-[20px]">Facturas por pagar</h2>
                        <Link href="/conta/facturas" className="text-muted-foreground hover:text-foreground text-[13px]">
                            Ver todas
                        </Link>
                    </div>
                    <ListaFacturas facturas={porPagar} vazio="Não tem facturas por pagar." />
                </section>
            )}
        </ContaLayout>
    );
}
