import { FormularioDocumento, type PropsFormularioDocumento } from '@/components/formulario-documento';

export default function FormularioOrcamento(props: PropsFormularioDocumento) {
    return <FormularioDocumento tipo="orcamento" {...props} />;
}
