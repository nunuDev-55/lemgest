import { ListaReservas, type ReservaCliente } from '@/components/conta';
import { Paginacao } from '@/components/paginacao';
import ContaLayout from '@/layouts/conta-layout';
import { type Paginado } from '@/types';

export default function ReservasCliente({ reservas }: { reservas: Paginado<ReservaCliente> }) {
    return (
        <ContaLayout titulo="As minhas reservas">
            <h1 className="mb-5 text-[22px] font-semibold tracking-[-0.015em]">As minhas reservas</h1>
            <ListaReservas reservas={reservas.data} vazio="Ainda não fez nenhuma reserva." />
            {reservas.last_page > 1 && <Paginacao pagina={reservas} nome="reservas" />}
        </ContaLayout>
    );
}
