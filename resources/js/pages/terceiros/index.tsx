import {
    BotaoLink,
    ColunaOrdenavel,
    Estado,
    FiltroEscolha,
    FiltroTexto,
    LinhaVazia,
    PorPagina,
    TituloPagina,
    useListaFiltros,
    type OrdenacaoLista,
} from '@/components/erp';
import { Paginacao } from '@/components/paginacao';
import { Button } from '@/components/ui/button';
import { usePode } from '@/hooks/use-pode';
import AppLayout from '@/layouts/app-layout';
import { type Paginado } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Building2, FilterX, Plus } from 'lucide-react';

interface Linha {
    id: number;
    nome: string;
    nome_alternativo: string | null;
    codigo_cliente: string | null;
    codigo_fornecedor: string | null;
    cidade: string | null;
    provincia: string | null;
    telefone: string | null;
    nuit: string | null;
    natureza: string[];
    activo: boolean;
}

interface Props {
    terceiros: Paginado<Linha>;
    filtros: Record<string, string | undefined>;
    ordenacao: OrdenacaoLista;
}

const TITULOS: Record<string, [string, string]> = {
    clientes: ['Clientes', 'cliente'],
    potenciais: ['Potenciais clientes', 'potencial'],
    fornecedores: ['Fornecedores', 'fornecedor'],
};

const COR_NATUREZA: Record<string, 'verde' | 'azul' | 'roxo'> = { Cliente: 'verde', Potencial: 'azul', Fornecedor: 'roxo' };

export default function TerceirosIndex({ terceiros, filtros, ordenacao }: Props) {
    const pode = usePode();
    const lista = useListaFiltros('/terceiros', filtros, ordenacao);
    const [titulo, natureza] = TITULOS[filtros.natureza ?? ''] ?? ['Terceiros', ''];

    return (
        <AppLayout>
            <Head title={titulo} />
            <TituloPagina
                icone={Building2}
                titulo={titulo}
                contagem={terceiros.total}
                accoes={
                    <>
                        {lista.temFiltros && (
                            <Button variant="outline" size="sm" onClick={lista.limpar}>
                                <FilterX className="size-4" />
                                Limpar filtros
                            </Button>
                        )}
                        {pode('terceiros.gerir') && (
                            <BotaoLink href={`/terceiros/novo${natureza ? `?natureza=${natureza}` : ''}`} icone={Plus}>
                                {natureza === 'fornecedor'
                                    ? 'Novo fornecedor'
                                    : natureza === 'potencial'
                                      ? 'Novo potencial cliente'
                                      : natureza === 'cliente'
                                        ? 'Novo cliente'
                                        : 'Novo terceiro'}
                            </BotaoLink>
                        )}
                    </>
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
                                <FiltroTexto rotulo="código" valor={lista.valores.codigo} onChange={(v) => lista.escrever('codigo', v)} />
                            </th>
                            <th>
                                <FiltroTexto rotulo="cidade" valor={lista.valores.cidade} onChange={(v) => lista.escrever('cidade', v)} />
                            </th>
                            <th>
                                <FiltroTexto rotulo="telefone" valor={lista.valores.telefone} onChange={(v) => lista.escrever('telefone', v)} />
                            </th>
                            <th>
                                <FiltroTexto rotulo="NUIT" valor={lista.valores.nuit} onChange={(v) => lista.escrever('nuit', v)} />
                            </th>
                            <th>
                                <FiltroEscolha
                                    rotulo="tipo"
                                    valor={lista.valores.natureza}
                                    onChange={(v) => lista.escolher('natureza', v)}
                                    opcoes={[
                                        { valor: 'clientes', label: 'Clientes' },
                                        { valor: 'potenciais', label: 'Potenciais' },
                                        { valor: 'fornecedores', label: 'Fornecedores' },
                                    ]}
                                />
                            </th>
                            <th>
                                <FiltroEscolha
                                    rotulo="estado"
                                    valor={lista.valores.estado}
                                    onChange={(v) => lista.escolher('estado', v)}
                                    opcoes={[
                                        { valor: 'activos', label: 'Aberto' },
                                        { valor: 'encerrados', label: 'Encerrado' },
                                    ]}
                                />
                            </th>
                        </tr>
                        <tr>
                            <ColunaOrdenavel coluna="nome" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Nome do terceiro
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="codigo" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Código cliente / fornecedor
                            </ColunaOrdenavel>
                            <ColunaOrdenavel coluna="cidade" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                Localidade
                            </ColunaOrdenavel>
                            <th>Telefone</th>
                            <ColunaOrdenavel coluna="nuit" ordenacao={ordenacao} onOrdenar={lista.ordenar}>
                                NUIT
                            </ColunaOrdenavel>
                            <th>Tipo</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {terceiros.data.length === 0 && <LinhaVazia colunas={7} />}
                        {terceiros.data.map((t) => (
                            <tr key={t.id}>
                                <td>
                                    <Link href={`/terceiros/${t.id}`} className="text-primary font-semibold hover:underline">
                                        {t.nome}
                                    </Link>
                                    {t.nome_alternativo && <span className="text-muted-foreground"> ({t.nome_alternativo})</span>}
                                </td>
                                <td className="text-muted-foreground tabular-nums">
                                    {[t.codigo_cliente, t.codigo_fornecedor].filter(Boolean).join(' / ')}
                                </td>
                                <td>{[t.cidade, t.provincia].filter(Boolean).join(', ')}</td>
                                <td className="tabular-nums">{t.telefone}</td>
                                <td className="tabular-nums">{t.nuit}</td>
                                <td>
                                    <div className="flex flex-wrap gap-1">
                                        {t.natureza.map((n) => (
                                            <Estado key={n} cor={COR_NATUREZA[n] ?? 'cinza'}>
                                                {n}
                                            </Estado>
                                        ))}
                                    </div>
                                </td>
                                <td>{t.activo ? <Estado cor="verde">Aberto</Estado> : <Estado cor="vermelho">Encerrado</Estado>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Paginacao pagina={terceiros} nome="terceiros" extra={<PorPagina valor={terceiros.per_page} onChange={lista.porPagina} />} />
        </AppLayout>
    );
}
