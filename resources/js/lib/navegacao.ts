import {
    CalendarDays,
    FileSignature,
    History,
    LayoutDashboard,
    Package,
    Receipt,
    Settings2,
    ShieldCheck,
    ShoppingCart,
    TrendingUp,
    UserCog,
    Users,
    type LucideIcon,
} from 'lucide-react';

/**
 * Menu lateral do LemGest: grupos de entradas; cada entrada só aparece a quem tem a permissão.
 * Uma entrada pode ter sub-entradas, mostradas por baixo dela quando se está nessa secção.
 */

export interface SubItemNav {
    label: string;
    href: string;
    permissao?: string | string[];
    /** Endereços que pertencem a esta sub-entrada (por omissão, o próprio href) */
    prefixos?: string[];
}

export interface ItemNav {
    label: string;
    href: string;
    icone: LucideIcon;
    /** Permissão (ou lista: basta uma) para ver a entrada */
    permissao?: string | string[];
    /** Endereços que pertencem a esta entrada */
    prefixos: string[];
    subitens?: SubItemNav[];
}

export interface GrupoNav {
    titulo?: string;
    itens: ItemNav[];
}

export const NAVEGACAO: GrupoNav[] = [
    {
        itens: [
            { label: 'Visão geral', href: '/painel', icone: LayoutDashboard, prefixos: ['/painel'] },
            // Só para a gestão: facturado, recebido, compras e resultado
            { label: 'Resultados', href: '/resultados', icone: TrendingUp, permissao: 'resultados.ver', prefixos: ['/resultados'] },
        ],
    },
    {
        titulo: 'Comercial',
        itens: [
            {
                label: 'Reservas',
                href: '/reservas',
                icone: CalendarDays,
                permissao: 'reservas.ver',
                prefixos: ['/reservas'],
                subitens: [
                    { label: 'Lista', href: '/reservas' },
                    { label: 'Calendário', href: '/reservas/calendario' },
                ],
            },
            { label: 'Orçamentos', href: '/orcamentos', icone: FileSignature, permissao: 'orcamentos.ver', prefixos: ['/orcamentos'] },
            {
                label: 'Facturas',
                href: '/facturas',
                icone: Receipt,
                permissao: ['facturas.ver', 'pagamentos.ver'],
                prefixos: ['/facturas', '/notas-credito', '/pagamentos'],
                subitens: [
                    { label: 'Facturas', href: '/facturas', permissao: 'facturas.ver' },
                    { label: 'Pagamentos recebidos', href: '/pagamentos', permissao: 'pagamentos.ver' },
                ],
            },
            {
                label: 'Clientes e fornecedores',
                href: '/terceiros',
                icone: Users,
                permissao: 'terceiros.ver',
                prefixos: ['/terceiros', '/contactos', '/contas-clientes'],
                subitens: [
                    { label: 'Clientes e fornecedores', href: '/terceiros', prefixos: ['/terceiros', '/contactos'] },
                    { label: 'Contas de clientes', href: '/contas-clientes', permissao: 'terceiros.contas' },
                ],
            },
        ],
    },
    {
        titulo: 'Inventário',
        itens: [
            {
                label: 'Produtos e stock',
                href: '/produtos',
                icone: Package,
                permissao: ['produtos.ver', 'stock.ver'],
                prefixos: ['/produtos', '/stock'],
                subitens: [
                    { label: 'Produtos e serviços', href: '/produtos' },
                    { label: 'Disponibilidade por data', href: '/stock/disponibilidade', permissao: 'stock.ver' },
                    { label: 'Movimentos', href: '/stock/movimentos', permissao: 'stock.ver' },
                    { label: 'Inventários', href: '/stock/inventarios', permissao: 'stock.ver' },
                    { label: 'Categorias e materiais', href: '/produtos/categorias' },
                ],
            },
            {
                label: 'Compras',
                href: '/encomendas-fornecedor',
                icone: ShoppingCart,
                permissao: 'compras.ver',
                prefixos: ['/encomendas-fornecedor', '/facturas-fornecedor', '/pagamentos-fornecedor'],
                subitens: [
                    { label: 'Encomendas a fornecedores', href: '/encomendas-fornecedor' },
                    { label: 'Facturas de fornecedores', href: '/facturas-fornecedor' },
                    { label: 'Pagamentos a fornecedores', href: '/pagamentos-fornecedor' },
                ],
            },
        ],
    },
    {
        titulo: 'Administração',
        itens: [
            {
                label: 'Configuração',
                href: '/administracao/configuracao/empresa',
                icone: Settings2,
                permissao: 'configuracao.gerir',
                prefixos: ['/administracao/configuracao'],
                subitens: [
                    { label: 'Empresa', href: '/administracao/configuracao/empresa' },
                    { label: 'Documentos', href: '/administracao/configuracao/documentos' },
                    { label: 'Numeração', href: '/administracao/configuracao/numeracao' },
                ],
            },
            {
                label: 'Utilizadores',
                href: '/administracao/utilizadores',
                icone: UserCog,
                permissao: 'utilizadores.ver',
                prefixos: ['/administracao/utilizadores'],
            },
            {
                label: 'Perfis e permissões',
                href: '/administracao/perfis',
                icone: ShieldCheck,
                permissao: 'perfis.gerir',
                prefixos: ['/administracao/perfis'],
            },
            {
                label: 'Auditoria',
                href: '/administracao/auditoria',
                icone: History,
                permissao: 'auditoria.ver',
                prefixos: ['/administracao/auditoria'],
            },
        ],
    },
];

/** Acções rápidas da pesquisa (Ctrl+K) */
export const ACCOES_RAPIDAS: { label: string; href: string; permissao: string }[] = [
    { label: 'Nova reserva', href: '/reservas/nova', permissao: 'reservas.criar' },
    { label: 'Calendário de reservas', href: '/reservas/calendario', permissao: 'reservas.ver' },
    { label: 'Nova factura', href: '/facturas/nova', permissao: 'facturas.criar' },
    { label: 'Novo orçamento', href: '/orcamentos/novo', permissao: 'orcamentos.criar' },
    { label: 'Novo cliente', href: '/terceiros/novo?natureza=cliente', permissao: 'terceiros.gerir' },
    { label: 'Novo produto', href: '/produtos/novo?tipo=produto', permissao: 'produtos.gerir' },
    { label: 'Ver disponibilidade por data', href: '/stock/disponibilidade', permissao: 'stock.ver' },
    { label: 'Fazer inventário', href: '/stock/inventarios/novo', permissao: 'stock.inventariar' },
    { label: 'Nova encomenda a fornecedor', href: '/encomendas-fornecedor/nova', permissao: 'compras.criar' },
    { label: 'Lançar factura de fornecedor', href: '/facturas-fornecedor/nova', permissao: 'compras.criar' },
];

function pertence(caminho: string, prefixo: string): boolean {
    return caminho === prefixo || caminho.startsWith(`${prefixo}/`);
}

/** A entrada do menu onde se está (a de prefixo mais comprido que coincide com o endereço) */
export function itemActivo(caminho: string): ItemNav | null {
    let melhor: ItemNav | null = null;
    let tamanho = 0;
    for (const grupo of NAVEGACAO) {
        for (const item of grupo.itens) {
            for (const p of item.prefixos) {
                if (pertence(caminho, p) && p.length > tamanho) {
                    melhor = item;
                    tamanho = p.length;
                }
            }
        }
    }
    return melhor;
}

/** A sub-entrada onde se está, dentro da entrada activa */
export function subItemActivo(item: ItemNav, caminho: string): string | null {
    let melhor: string | null = null;
    let tamanho = 0;
    for (const s of item.subitens ?? []) {
        for (const p of s.prefixos ?? [s.href]) {
            if (pertence(caminho, p) && p.length > tamanho) {
                melhor = s.href;
                tamanho = p.length;
            }
        }
    }
    return melhor;
}
