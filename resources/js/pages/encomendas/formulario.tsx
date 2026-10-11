import { FormularioDocumento, type PropsFormularioDocumento } from '@/components/formulario-documento';

export default function FormularioEncomenda(props: PropsFormularioDocumento) {
    return <FormularioDocumento tipo="encomenda" {...props} />;
}
