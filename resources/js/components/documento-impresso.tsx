import { type LinhaDocumento } from '@/components/linhas-documento';
import { formatNumero, formatQuantidade } from '@/lib/format';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

/** Dados vindos de Administração → Configuração → Empresa / Organização */
export interface Empresa {
    nome: string;
    nome_comercial: string | null;
    forma_juridica: string | null;
    nuit: string | null;
    nuel: string | null;
    capital_social: string | null;
    morada: string | null;
    cidade: string | null;
    provincia: string | null;
    pais: string | null;
    telefone: string | null;
    telemovel: string | null;
    email: string | null;
    website: string | null;
    logotipo: string;
    dados_pagamento: string | null;
}

interface Props {
    titulo: string; // FACTURA, ORÇAMENTO, ENCOMENDA
    referencia: string;
    marca?: string; // "Original", "PAGA", "ANULADA"...
    destinatario: string; // "Factura para", "Orçamento para"...
    empresa: Empresa;
    terceiro: { nome: string; morada: string | null; cidade: string | null; provincia: string | null; nuit: string | null };
    campos: [string, string][];
    linhas: LinhaDocumento[];
    totais: { sem_iva: string; iva: string; total: string; rotuloTotal?: string };
    extraTotais?: ReactNode;
    nota?: string | null;
    /** Texto livre do fim do documento (Configuração → Documentos) */
    rodape?: string | null;
}

/** Documento em A4 (factura, orçamento, encomenda) para imprimir ou guardar como PDF no navegador. */
export function DocumentoImpresso({
    titulo,
    referencia,
    marca,
    destinatario,
    empresa,
    terceiro,
    campos,
    linhas,
    totais,
    extraTotais,
    nota,
    rodape,
}: Props) {
    useEffect(() => {
        // Sempre em fundo branco, mesmo com o tema escuro ligado
        document.documentElement.classList.remove('dark');
    }, []);

    const localidade = [empresa.cidade, empresa.provincia, empresa.pais].filter(Boolean).join(', ');
    const telefones = [empresa.telefone, empresa.telemovel].filter(Boolean).join(' · ');
    // Linha legal do rodapé, como nas facturas moçambicanas: firma, forma jurídica, NUIT, NUEL e capital social
    const identificacaoLegal = [
        empresa.nome,
        empresa.forma_juridica,
        empresa.nuit && `NUIT ${empresa.nuit}`,
        empresa.nuel && `NUEL ${empresa.nuel}`,
        empresa.capital_social && `Capital social ${empresa.capital_social}`,
    ]
        .filter(Boolean)
        .join(' · ');

    // Coluna "Dias" só quando algum aluguer é de mais de um dia
    const comDias = linhas.some((l) => (l.dias ?? 1) > 1);

    const resumoIva = Object.entries(
        linhas.reduce<Record<string, { base: number; iva: number }>>((acc, l) => {
            const t = Number(l.taxa_iva).toString();
            acc[t] ??= { base: 0, iva: 0 };
            acc[t].base += Number(l.total_sem_iva);
            acc[t].iva += Number(l.total) - Number(l.total_sem_iva);
            return acc;
        }, {}),
    );

    return (
        <>
            <Head title={`${referencia} — impressão`} />
            <style>{`
                @page { size: A4; margin: 14mm; }
                @media print { .nao-imprimir { display: none !important; } body { background: #fff !important; } .folha { box-shadow: none !important; margin: 0 !important; } }
            `}</style>

            <div className="nao-imprimir sticky top-0 z-10 flex items-center justify-center gap-3 border-b bg-white px-4 py-2 text-sm text-neutral-700">
                Use “Guardar como PDF” na janela de impressão para enviar o documento por e-mail.
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-md bg-[#6e2a63] px-3 py-1.5 font-medium text-white"
                >
                    <Printer className="size-4" />
                    Imprimir
                </button>
            </div>

            <div className="folha mx-auto my-6 min-h-[297mm] w-[210mm] max-w-full bg-white p-[14mm] text-[12px] text-neutral-900 shadow-lg">
                <header className="flex items-start justify-between gap-6 border-b-2 border-[#6e2a63] pb-4">
                    <div className="flex items-start gap-3">
                        <img
                            src={empresa.logotipo}
                            alt={empresa.nome_comercial ?? empresa.nome}
                            className="h-24 w-auto max-w-44 shrink-0 object-contain"
                        />
                        <div>
                            <p className="text-lg font-bold">{empresa.nome}</p>
                            {empresa.morada && <p>{empresa.morada}</p>}
                            {localidade && <p>{localidade}</p>}
                            {telefones && <p>Tel.: {telefones}</p>}
                            {(empresa.email || empresa.website) && <p>{[empresa.email, empresa.website].filter(Boolean).join(' · ')}</p>}
                            <p className="font-semibold">NUIT: {empresa.nuit ?? '—'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-bold tracking-wide text-[#6e2a63]">{titulo}</p>
                        <p className="text-base font-semibold">{referencia}</p>
                        {marca && <p className="mt-1 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">{marca}</p>}
                    </div>
                </header>

                <section className="mt-5 grid grid-cols-2 gap-6">
                    <div className="rounded border border-neutral-300 p-3">
                        <p className="mb-1 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">{destinatario}</p>
                        <p className="text-sm font-bold">{terceiro.nome}</p>
                        {terceiro.morada && <p>{terceiro.morada}</p>}
                        {(terceiro.cidade || terceiro.provincia) && <p>{[terceiro.cidade, terceiro.provincia].filter(Boolean).join(', ')}</p>}
                        <p className="font-semibold">NUIT: {terceiro.nuit ?? '—'}</p>
                    </div>
                    <table className="self-start text-[12px]">
                        <tbody>
                            {campos.map(([k, v]) => (
                                <tr key={k}>
                                    <td className="py-0.5 pr-4 text-neutral-500">{k}</td>
                                    <td className="py-0.5 font-medium">{v}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                <table className="mt-6 w-full border-collapse text-[11.5px]">
                    <thead>
                        <tr className="bg-[#6e2a63] text-white">
                            <th className="px-2 py-1.5 text-left font-semibold">Descrição</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Qtd.</th>
                            {comDias && <th className="px-2 py-1.5 text-right font-semibold">Dias</th>}
                            <th className="px-2 py-1.5 text-right font-semibold">{comDias ? 'P.U./dia (sem IVA)' : 'P.U. (sem IVA)'}</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Desc.</th>
                            <th className="px-2 py-1.5 text-right font-semibold">IVA</th>
                            <th className="px-2 py-1.5 text-right font-semibold">Total (sem IVA)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {linhas.map((l) => (
                            <tr key={l.id} className="border-b border-neutral-200">
                                <td className="px-2 py-1.5 whitespace-pre-line">{l.descricao}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{formatQuantidade(l.quantidade)}</td>
                                {comDias && <td className="px-2 py-1.5 text-right tabular-nums">{l.dias ?? 1}</td>}
                                <td className="px-2 py-1.5 text-right tabular-nums">{formatNumero(l.preco_unitario)}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{Number(l.desconto) > 0 ? `${Number(l.desconto)}%` : ''}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{Number(l.taxa_iva)}%</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{formatNumero(l.total_sem_iva)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <section className="mt-5 flex justify-between gap-6">
                    <div className="flex-1">
                        <table className="text-[11px]">
                            <thead>
                                <tr className="text-neutral-500">
                                    <th className="pr-4 text-left font-medium">Taxa IVA</th>
                                    <th className="pr-4 text-right font-medium">Base</th>
                                    <th className="text-right font-medium">IVA</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resumoIva.map(([taxa, v]) => (
                                    <tr key={taxa}>
                                        <td className="pr-4">{taxa}%</td>
                                        <td className="pr-4 text-right tabular-nums">{formatNumero(v.base)}</td>
                                        <td className="text-right tabular-nums">{formatNumero(v.iva)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {nota && <p className="mt-4 text-[11px] whitespace-pre-line">{nota}</p>}
                    </div>
                    <table className="w-72 text-[12px]">
                        <tbody>
                            <tr>
                                <td className="py-1 text-neutral-600">Total sem IVA</td>
                                <td className="py-1 text-right tabular-nums">{formatNumero(totais.sem_iva)} MT</td>
                            </tr>
                            <tr>
                                <td className="py-1 text-neutral-600">IVA</td>
                                <td className="py-1 text-right tabular-nums">{formatNumero(totais.iva)} MT</td>
                            </tr>
                            <tr className="border-t-2 border-[#6e2a63] text-sm font-bold">
                                <td className="py-1.5">{totais.rotuloTotal ?? 'Total'}</td>
                                <td className="py-1.5 text-right tabular-nums">{formatNumero(totais.total)} MT</td>
                            </tr>
                            {extraTotais}
                        </tbody>
                    </table>
                </section>

                <footer className="mt-10 border-t border-neutral-300 pt-3 text-[10.5px] text-neutral-500">
                    {rodape && <p className="mb-1 whitespace-pre-line">{rodape}</p>}
                    {empresa.dados_pagamento && (
                        <p className="mb-1 whitespace-pre-line">
                            <span className="font-semibold text-neutral-700">Pagamento: </span>
                            {empresa.dados_pagamento}
                        </p>
                    )}
                    <p>{identificacaoLegal}</p>
                    <p>Documento processado por computador — LemGest.</p>
                </footer>
            </div>
        </>
    );
}
