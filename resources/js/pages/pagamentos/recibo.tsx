import { DocumentoImpresso, type Empresa } from '@/components/documento-impresso';
import { formatData, formatNumero } from '@/lib/format';

interface Recibo {
    numero: string;
    data: string;
    valor: string;
    valor_extenso: string;
    metodo: string;
    numero_documento: string | null;
    terceiro: { nome: string; morada: string | null; cidade: string | null; provincia: string | null; nuit: string | null };
    facturas: { numero: string; data: string; total: string; valor: string }[];
}

/** Recibo de um pagamento recebido, em A4 (a equipa e o cliente vêem o mesmo documento) */
export default function ImprimirRecibo({ recibo: r, empresa }: { recibo: Recibo; empresa: Empresa }) {
    return (
        <DocumentoImpresso
            titulo="RECIBO"
            referencia={r.numero}
            marca="Original"
            destinatario="Recebemos de"
            empresa={empresa}
            terceiro={r.terceiro}
            campos={[
                ['Data do pagamento', formatData(r.data)],
                ['Forma de pagamento', r.metodo],
                ...(r.numero_documento ? ([['Nº do comprovativo', r.numero_documento]] as [string, string][]) : []),
            ]}
            corpo={
                <>
                    <p className="mt-6 rounded border border-neutral-300 bg-neutral-50 px-4 py-3 text-[13px] leading-relaxed">
                        Recebemos de <strong>{r.terceiro.nome}</strong> a quantia de{' '}
                        <strong className="tabular-nums">{formatNumero(r.valor)} MT</strong> (
                        <span className="first-letter:uppercase">{r.valor_extenso}</span>),
                        {r.facturas.length === 1 ? ' para pagamento da factura abaixo.' : ' para pagamento das facturas abaixo.'}
                    </p>

                    {/* No telemóvel, uma linha por factura (ao imprimir fica a tabela) */}
                    <ul className="telemovel:block mt-6 hidden divide-y divide-neutral-200 border-y border-neutral-200">
                        {r.facturas.map((f) => (
                            <li key={f.numero} className="flex items-end justify-between gap-3 py-3">
                                <span>
                                    <span className="block font-medium">Factura {f.numero}</span>
                                    <span className="text-[12px] text-neutral-600">
                                        {formatData(f.data)} · total {formatNumero(f.total)} MT
                                    </span>
                                </span>
                                <span className="shrink-0 text-right">
                                    <span className="block text-[11px] text-neutral-500">Pago agora</span>
                                    <span className="font-medium tabular-nums">{formatNumero(f.valor)} MT</span>
                                </span>
                            </li>
                        ))}
                    </ul>

                    <table className="telemovel:hidden mt-6 w-full border-collapse text-[11.5px]">
                        <thead>
                            <tr className="bg-[#6e2a63] text-white">
                                <th className="px-2 py-1.5 text-left font-semibold">Factura</th>
                                <th className="px-2 py-1.5 text-left font-semibold">Data</th>
                                <th className="px-2 py-1.5 text-right font-semibold">Total da factura</th>
                                <th className="px-2 py-1.5 text-right font-semibold">Valor pago agora</th>
                            </tr>
                        </thead>
                        <tbody>
                            {r.facturas.map((f) => (
                                <tr key={f.numero} className="border-b border-neutral-200">
                                    <td className="px-2 py-1.5 font-medium">{f.numero}</td>
                                    <td className="px-2 py-1.5 tabular-nums">{formatData(f.data)}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{formatNumero(f.total)} MT</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{formatNumero(f.valor)} MT</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <section className="mt-5 flex justify-end">
                        <table className="telemovel:w-full telemovel:text-[13px] w-72 text-[12px]">
                            <tbody>
                                <tr className="border-t-2 border-[#6e2a63] text-sm font-bold">
                                    <td className="py-1.5">Total recebido</td>
                                    <td className="py-1.5 text-right tabular-nums">{formatNumero(r.valor)} MT</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <div className="telemovel:mt-12 telemovel:gap-6 mt-16 grid grid-cols-2 gap-16 text-center text-[11px] text-neutral-600">
                        <div className="border-t border-neutral-400 pt-1">Assinatura e carimbo da LemServ</div>
                        <div className="border-t border-neutral-400 pt-1">Assinatura do cliente</div>
                    </div>
                </>
            }
        />
    );
}
