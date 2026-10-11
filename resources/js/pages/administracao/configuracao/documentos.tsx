import { Bloco, LinhaForm, TituloPagina } from '@/components/erp';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { FileText, LoaderCircle, Save } from 'lucide-react';
import { FormEventHandler } from 'react';

interface Props {
    documentos: {
        dados_pagamento: string;
        rodape_factura: string;
        rodape_orcamento: string;
        rodape_encomenda: string;
        validade_orcamento: number;
    };
}

const area = 'border-input bg-card focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2';

/** Textos livres e opções dos documentos (no Dolibarr ficam na configuração de cada módulo). */
export default function ConfiguracaoDocumentos({ documentos }: Props) {
    const { data, setData, put, processing, errors, isDirty } = useForm({
        ...documentos,
        validade_orcamento: String(documentos.validade_orcamento),
    });

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        put('/administracao/configuracao/documentos', { preserveScroll: true });
    };

    const texto = (campo: 'dados_pagamento' | 'rodape_factura' | 'rodape_orcamento' | 'rodape_encomenda', linhas = 3) => (
        <>
            <textarea
                id={campo}
                rows={linhas}
                value={data[campo]}
                onChange={(e) => setData(campo, e.target.value)}
                className={area}
                maxLength={500}
            />
            <p className="text-muted-foreground mt-0.5 text-right text-[11px] tabular-nums">{data[campo].length}/500</p>
            <InputError message={errors[campo]} />
        </>
    );

    return (
        <AppLayout>
            <Head title="Documentos" />
            <TituloPagina
                icone={FileText}
                titulo="Documentos"
                descricao="Textos que aparecem no fim das facturas, orçamentos e encomendas impressos, e opções por omissão."
            />

            <form onSubmit={submeter} className="max-w-5xl space-y-4">
                <Bloco titulo="Em todos os documentos">
                    <LinhaForm
                        rotulo="Dados para pagamento"
                        htmlFor="dados_pagamento"
                        ajuda="Como o cliente pode pagar: número M-Pesa ou e-Mola, banco e conta. Aparece no rodapé de todos os documentos."
                    >
                        {texto('dados_pagamento')}
                    </LinhaForm>
                </Bloco>

                <Bloco titulo="Facturas">
                    <LinhaForm
                        rotulo="Texto no fim da factura"
                        htmlFor="rodape_factura"
                        ajuda="Ex.: condições de pagamento, multa por atraso, agradecimento."
                    >
                        {texto('rodape_factura')}
                    </LinhaForm>
                </Bloco>

                <Bloco titulo="Orçamentos">
                    <LinhaForm
                        rotulo="Validade por omissão"
                        htmlFor="validade_orcamento"
                        obrigatorio
                        ajuda="Dias de validade propostos em cada orçamento novo."
                    >
                        <div className="flex items-center gap-2">
                            <Input
                                id="validade_orcamento"
                                type="number"
                                min={1}
                                max={365}
                                value={data.validade_orcamento}
                                onChange={(e) => setData('validade_orcamento', e.target.value)}
                                className="w-24"
                            />
                            <span className="text-muted-foreground text-[13px]">dias</span>
                        </div>
                        <InputError message={errors.validade_orcamento} />
                    </LinhaForm>
                    <LinhaForm rotulo="Texto no fim do orçamento" htmlFor="rodape_orcamento">
                        {texto('rodape_orcamento')}
                    </LinhaForm>
                </Bloco>

                <Bloco titulo="Encomendas de venda">
                    <LinhaForm rotulo="Texto no fim da encomenda" htmlFor="rodape_encomenda">
                        {texto('rodape_encomenda')}
                    </LinhaForm>
                </Bloco>

                <div className="flex justify-center pb-2">
                    <Button type="submit" disabled={processing || !isDirty}>
                        {processing ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
                        Guardar
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}
