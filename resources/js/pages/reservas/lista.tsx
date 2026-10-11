import { type Empresa } from '@/components/documento-impresso';
import { datasEvento, type ReservaResumo } from '@/components/reserva';
import { formatData, formatQuantidade } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Linha {
    id: number;
    descricao: string;
    quantidade: string;
    unidade: string | null;
    material: boolean;
}

interface Props {
    reserva: ReservaResumo & {
        contacto_local: string | null;
        nota_publica: string | null;
        terceiro: { nome: string; telemovel: string | null; telefone: string | null };
        linhas: Linha[];
    };
    empresa: Empresa;
}

/**
 * Lista para a equipa: o material a carregar e a conferir na volta, sem preços.
 * Imprime-se em A4 ou usa-se no telemóvel (os vistos ficam só neste aparelho; não se gravam).
 */
export default function ListaEquipa({ reserva: r, empresa }: Props) {
    const [vistos, setVistos] = useState<Record<string, boolean>>({});
    const material = r.linhas.filter((l) => l.material);
    const servicos = r.linhas.filter((l) => !l.material);

    useEffect(() => {
        document.documentElement.classList.remove('dark');
    }, []);

    const alternar = (chave: string) => setVistos((v) => ({ ...v, [chave]: !v[chave] }));

    const Visto = ({ chave, rotulo }: { chave: string; rotulo: string }) => (
        <button
            type="button"
            onClick={() => alternar(chave)}
            aria-pressed={!!vistos[chave]}
            aria-label={rotulo}
            className={cn(
                'mx-auto flex size-6 items-center justify-center rounded border-2 border-neutral-400 text-[13px] font-bold',
                vistos[chave] && 'border-[#6e2a63] bg-[#6e2a63] text-white',
            )}
        >
            {vistos[chave] ? '✓' : ''}
        </button>
    );

    return (
        <>
            <Head title={`${r.numero} — lista para a equipa`} />
            <style>{`
                @page { size: A4; margin: 12mm; }
                @media print { .nao-imprimir { display: none !important; } body { background: #fff !important; } }
            `}</style>

            <div className="nao-imprimir sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-4 py-2 text-[13px] text-neutral-600">
                <span>Lista sem preços, para quem carrega e entrega.</span>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-md bg-[#6e2a63] px-3 py-1.5 font-medium text-white"
                >
                    <Printer className="size-4" />
                    Imprimir
                </button>
            </div>

            <main className="mx-auto max-w-3xl bg-white px-4 py-6 text-[14px] text-neutral-900 sm:px-8">
                <header className="mb-5 flex items-start justify-between gap-4 border-b-2 border-[#6e2a63] pb-3">
                    <div>
                        <p className="text-[12px] tracking-wide text-neutral-500 uppercase">{empresa.nome_comercial ?? empresa.nome}</p>
                        <h1 className="text-[20px] font-bold">Reserva {r.numero}</h1>
                        <p className="text-neutral-700">{r.terceiro.nome}</p>
                    </div>
                    <img src={empresa.logotipo} alt="" className="h-14 w-auto max-w-32 object-contain" />
                </header>

                <dl className="mb-6 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {[
                        ['Evento', datasEvento(r)],
                        ['Entrega', formatData(r.data_entrega)],
                        ['Recolha', formatData(r.data_recolha)],
                        ['Transporte', r.transporte ? 'Sim, a LemServ leva e recolhe' : 'Não, o cliente levanta'],
                        ['Local', r.local ?? '—'],
                        ['Contacto no local', r.contacto_local ?? (r.terceiro.telemovel || r.terceiro.telefone || '—')],
                        ['Tema de cores', r.tema ?? '—'],
                    ].map(([rotulo, valor]) => (
                        <div key={rotulo} className="grid grid-cols-[8.5rem_1fr] gap-2">
                            <dt className="text-neutral-500">{rotulo}</dt>
                            <dd className="font-medium">{valor}</dd>
                        </div>
                    ))}
                </dl>

                <h2 className="mb-2 text-[15px] font-semibold">Material ({material.reduce((n, l) => n + Number(l.quantidade), 0)} peças)</h2>
                <table className="mb-6 w-full border-collapse text-[14px]">
                    <thead>
                        <tr className="border-b-2 border-neutral-300 text-left text-[12.5px] text-neutral-500">
                            <th className="py-2 pr-2 font-medium">Material</th>
                            <th className="w-16 py-2 text-right font-medium">Qtd.</th>
                            <th className="w-16 py-2 text-center font-medium">Saiu</th>
                            <th className="w-16 py-2 text-center font-medium">Voltou</th>
                        </tr>
                    </thead>
                    <tbody>
                        {material.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-4 text-center text-neutral-500">
                                    Sem material nesta reserva.
                                </td>
                            </tr>
                        )}
                        {material.map((l) => (
                            <tr key={l.id} className="border-b border-neutral-200">
                                <td className="py-2.5 pr-2">{l.descricao}</td>
                                <td className="py-2.5 text-right text-[16px] font-bold tabular-nums">{formatQuantidade(l.quantidade)}</td>
                                <td className="py-2.5">
                                    <Visto chave={`s${l.id}`} rotulo={`Saiu: ${l.descricao}`} />
                                </td>
                                <td className="py-2.5">
                                    <Visto chave={`v${l.id}`} rotulo={`Voltou: ${l.descricao}`} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {servicos.length > 0 && (
                    <>
                        <h2 className="mb-2 text-[15px] font-semibold">Serviços</h2>
                        <ul className="mb-6 list-disc pl-5">
                            {servicos.map((l) => (
                                <li key={l.id}>
                                    {l.descricao}
                                    {Number(l.quantidade) !== 1 && (
                                        <span className="text-neutral-500">
                                            {' '}
                                            × {formatQuantidade(l.quantidade)}
                                            {l.unidade && l.unidade !== 'un' && l.unidade !== 'srv' ? ` ${l.unidade}` : ''}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </>
                )}

                {r.nota_publica && (
                    <>
                        <h2 className="mb-1 text-[15px] font-semibold">Observações</h2>
                        <p className="mb-6 whitespace-pre-line text-neutral-700">{r.nota_publica}</p>
                    </>
                )}

                <div className="mt-10 grid gap-8 text-[12.5px] text-neutral-500 sm:grid-cols-2">
                    <p className="border-t border-neutral-400 pt-1">Entregue por / data</p>
                    <p className="border-t border-neutral-400 pt-1">Recebido pelo cliente</p>
                </div>
            </main>
        </>
    );
}
