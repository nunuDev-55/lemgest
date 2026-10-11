import { ListaFacturas, ListaReservas, type FacturaCliente, type ReservaCliente } from '@/components/conta';
import ContaLayout, { type DadosConta } from '@/layouts/conta-layout';
import { Link, usePage } from '@inertiajs/react';

/** proximas e porPagar vêm a null quando o perfil Cliente não dá acesso a reservas ou a facturas */
export default function InicioCliente({ proximas, porPagar }: { proximas: ReservaCliente[] | null; porPagar: FacturaCliente[] | null }) {
    const { cliente, loja } = usePage<DadosConta>().props;
    const primeiroNome = cliente?.nome.split(' ')[0];
    const contacto = loja?.telemovel ?? loja?.telefone;

    return (
        <ContaLayout titulo="A sua conta">
            <h1 className="font-titulo mb-1 text-[28px] tracking-[-0.015em]">Olá, {primeiroNome}</h1>
            <p className="text-muted-foreground mb-7 text-[14px]">
                Esta é a sua conta na LemServ.
                {contacto && <> Para qualquer dúvida, fale connosco: {contacto}.</>}
            </p>

            {proximas && (
                <section className="mb-8">
                    <div className="mb-3 flex items-baseline justify-between">
                        <h2 className="text-[15px] font-semibold">Próximas reservas</h2>
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
                        <h2 className="text-[15px] font-semibold">Facturas por pagar</h2>
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
