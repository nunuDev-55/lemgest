import { FormularioCompra, type PropsFormularioCompra } from '@/components/formulario-compra';

export default function FormularioEncomendaFornecedor(props: PropsFormularioCompra) {
    return <FormularioCompra tipo="encomenda" {...props} />;
}
