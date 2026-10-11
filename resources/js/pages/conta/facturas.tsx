import { ListaFacturas, type FacturaCliente } from '@/components/conta';
import { Paginacao } from '@/components/paginacao';
import ContaLayout from '@/layouts/conta-layout';
import { type Paginado } from '@/types';

export default function FacturasCliente({ facturas }: { facturas: Paginado<FacturaCliente> }) {
    return (
        <ContaLayout titulo="As minhas facturas">
            <h1 className="mb-1 text-[22px] font-semibold tracking-[-0.015em]">As minhas facturas</h1>
            <p className="text-muted-foreground mb-5 text-[14px]">Cada factura abre pronta a imprimir ou a guardar em PDF.</p>
            <ListaFacturas facturas={facturas.data} vazio="Ainda não tem facturas." />
            {facturas.last_page > 1 && <Paginacao pagina={facturas} nome="facturas" />}
        </ContaLayout>
    );
}
