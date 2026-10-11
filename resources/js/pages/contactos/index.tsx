import { ColunaOrdenavel, Estado, FiltroTexto, LinhaVazia, PorPagina, TituloPagina, useListaFiltros, type OrdenacaoLista } from '@/components/erp';
import { Paginacao } from '@/components/paginacao';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type Paginado } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Contact, FilterX } from 'lucide-react';

interface Linha {
    id: number;
    nome: string;
    cargo: string | null;
    telefone: string | null;
    telemovel: string | null;
    email: string | null;
    terceiro: string;
    terceiro_id: number;
    activo: boolean;
}

interface Props {
    contactos: Paginado<Linha>;
    filtros: Record<string, string | undefined>;
    ordenacao: OrdenacaoLista;
}

/** Lista geral de contactos (Contactos / Endereços no Dolibarr). Os contactos criam-se na ficha do terceiro. */
export default function ContactosIndex({ contactos, filtros, ordenacao }: Props) {
    const lista = useListaFiltros('/contactos', filtros, ordenacao);

    return (
        <AppLayout>
            <Head title="Contactos / Endereços" />
            <TituloPagina
                icone={Contact}
                titulo="Contactos / Endereços"
                contagem={contactos.total}
                descricao="Para acrescentar um contacto, abra a ficha do terceiro, separador Contactos."
                accoes={
                    lista.temFiltros && (
                        <Button variant="outline" size="sm" onClick={lista.limpar}>
                            <FilterX className="size-4" />
                            Limpar filtros
                        </Button>
                    )
                }
            />

            <div className="painel overflow-x-auto">
                <table className="tabela">
                    <thead>
                        <tr className="linha-filtros">
                            <th>
                                <FiltroTexto rotulo="nome" valor={lista.valores.nome} onChange={(v) => lista.escrever('nome', v)} />
                            </th>
                            <th>
                                <FiltroTexto rotulo="cargo" valor={lista.valores.cargo} onChange={(v) => lista.escrever('cargo', v)} />
                            </th>
                            <th>
                                <FiltroTexto rotulo="telefone" valor={lista.valores.telefone} onChange={(v) => lista.escrever('telefone', v)} />
                            </th>
                            <th />
                            <th>
                                <FiltroTexto rotulo="e-mail" valor={lista.valores.email} onChange={(v) => lista.escrever('email', v)} />
                            </th>
                            <th>
                                <FiltroTexto rotulo="terceiro" valor={lista.valores.terceiro} onChange={(v) => lista.escrever('terceiro', v)} />
                            </th>
                            <th />
                        </tr>
                        <tr>
                            <ColunaOrdenavel coluna="nome" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Nome
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="cargo" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Cargo
                            </ColunaOrdenavel>
                            <th>Telefone</th>
                            <th>Telemóvel</th>
                            <th>E-mail</th>
                            <ColunaOrdenavel coluna="terceiro" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Terceiro
                            </ColunaOrdenavel>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contactos.data.length === 0 && <LinhaVazia colunas={7} />}
                        {contactos.data.map((c) => (
                            <tr key={c.id}>
                                <td className="font-medium">{c.nome}</td>
                                <td>{c.cargo}</td>
                                <td className="tabular-nums">{c.telefone}</td>
                                <td className="tabular-nums">{c.telemovel}</td>
                                <td>
                                    {c.email && (
                                        <a href={`mailto:${c.email}`} className="text-primary hover:underline">
                                            {c.email}
                                        </a>
                                    )}
                                </td>
                                <td>
                                    <Link href={`/terceiros/${c.terceiro_id}?separador=contactos`} className="text-primary hover:underline">
                                        {c.terceiro}
                                    </Link>
                                </td>
                                <td>{c.activo ? <Estado cor="verde">Activo</Estado> : <Estado cor="cinza">Inactivo</Estado>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Paginacao pagina={contactos} nome="contactos" extra={<PorPagina valor={contactos.per_page} onChange={lista.porPagina} />} />
        </AppLayout>
    );
}
