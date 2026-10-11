import { FormularioCompra, type PropsFormularioCompra } from '@/components/formulario-compra';

export default function FormularioFacturaFornecedor(props: PropsFormularioCompra) {
    return <FormularioCompra tipo="factura" {...props} />;
}
