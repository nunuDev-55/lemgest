<?php

namespace App\Support;

use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Catálogo de permissões e perfis do LemGest.
 *
 * É a única fonte de verdade: cada módulo novo acrescenta aqui as suas permissões
 * e o comando `php artisan db:seed` (ou o primeiro registo) sincroniza a base de dados.
 */
final class Permissoes
{
    public const ADMINISTRADOR = 'Administrador';

    /** Perfil de todas as contas de clientes da loja (guarda própria: nunca abre o sistema interno) */
    public const CLIENTE = 'Cliente';

    public const GUARDA_CLIENTE = 'cliente';

    /**
     * Permissões agrupadas por módulo, na ordem em que aparecem no ecrã de perfis.
     *
     * @var array<string, array{label: string, permissoes: array<string, string>}>
     */
    public const CATALOGO = [
        'terceiros' => [
            'label' => 'Terceiros (clientes e fornecedores)',
            'permissoes' => [
                'terceiros.ver' => 'Ver terceiros',
                'terceiros.gerir' => 'Criar e editar terceiros',
                'terceiros.apagar' => 'Apagar terceiros',
                'terceiros.contas' => 'Aprovar e gerir as contas de clientes da loja',
            ],
        ],
        'produtos' => [
            'label' => 'Produtos e serviços',
            'permissoes' => [
                'produtos.ver' => 'Ver produtos e serviços',
                'produtos.gerir' => 'Criar, editar e apagar produtos e serviços',
            ],
        ],
        'stock' => [
            'label' => 'Stock',
            'permissoes' => [
                'stock.ver' => 'Ver quantidades, movimentos e disponibilidade',
                'stock.movimentar' => 'Registar entradas, saídas para aluguer, devoluções e perdas',
                'stock.inventariar' => 'Fazer inventários e ajustar quantidades',
            ],
        ],
        'reservas' => [
            'label' => 'Reservas de aluguer',
            'permissoes' => [
                'reservas.ver' => 'Ver reservas e o calendário',
                'reservas.criar' => 'Criar e alterar reservas (pedidos e confirmadas)',
                'reservas.confirmar' => 'Confirmar, cancelar e reabrir reservas',
                'reservas.entregar' => 'Registar a saída e a devolução do material',
            ],
        ],
        'orcamentos' => [
            'label' => 'Orçamentos',
            'permissoes' => [
                'orcamentos.ver' => 'Ver orçamentos',
                'orcamentos.criar' => 'Criar e alterar orçamentos em rascunho',
                'orcamentos.validar' => 'Validar orçamentos (atribuir número)',
                'orcamentos.fechar' => 'Fechar orçamentos (assinado / não assinado) e reabrir',
            ],
        ],
        'encomendas' => [
            'label' => 'Encomendas de venda',
            'permissoes' => [
                'encomendas.ver' => 'Ver encomendas',
                'encomendas.criar' => 'Criar e alterar encomendas em rascunho',
                'encomendas.validar' => 'Validar encomendas (atribuir número)',
                'encomendas.fechar' => 'Classificar encomendas como entregues, anular e reabrir',
            ],
        ],
        'facturas' => [
            'label' => 'Facturas a clientes',
            'permissoes' => [
                'facturas.ver' => 'Ver facturas',
                'facturas.criar' => 'Criar e alterar rascunhos de facturas',
                'facturas.validar' => 'Validar facturas (atribuir número)',
                'facturas.abandonar' => 'Classificar facturas como abandonadas',
                'pagamentos.ver' => 'Ver pagamentos recebidos',
                'pagamentos.registar' => 'Registar pagamentos de clientes',
            ],
        ],
        'compras' => [
            'label' => 'Compras a fornecedores',
            'permissoes' => [
                'compras.ver' => 'Ver encomendas, facturas e pagamentos a fornecedores',
                'compras.criar' => 'Criar e alterar rascunhos de encomendas e facturas de fornecedor',
                'compras.validar' => 'Validar, encomendar e anular encomendas; validar e abandonar facturas de fornecedor',
                'compras.receber' => 'Classificar encomendas a fornecedor como recebidas',
                'compras.pagar' => 'Registar pagamentos a fornecedores',
            ],
        ],
        'resultados' => [
            'label' => 'Resultados',
            'permissoes' => [
                'resultados.ver' => 'Ver os resultados (facturado, recebido, compras e resultado)',
            ],
        ],
        'utilizadores' => [
            'label' => 'Utilizadores',
            'permissoes' => [
                'utilizadores.ver' => 'Ver utilizadores',
                'utilizadores.gerir' => 'Criar e editar utilizadores',
                'utilizadores.desactivar' => 'Activar e desactivar utilizadores',
            ],
        ],
        'configuracao' => [
            'label' => 'Configuração',
            'permissoes' => [
                'configuracao.gerir' => 'Alterar os dados da empresa, os textos dos documentos e ver a numeração',
            ],
        ],
        'perfis' => [
            'label' => 'Perfis e permissões',
            'permissoes' => [
                'perfis.gerir' => 'Gerir perfis e permissões',
            ],
        ],
        'auditoria' => [
            'label' => 'Auditoria',
            'permissoes' => [
                'auditoria.ver' => 'Ver o registo de auditoria',
            ],
        ],
    ];

    /**
     * Permissões do perfil Cliente (contas aprovadas da loja). O site público vê-se sempre, mesmo sem conta.
     *
     * @var array<string, array{label: string, permissoes: array<string, string>}>
     */
    public const CATALOGO_CLIENTE = [
        'loja' => [
            'label' => 'Catálogo e reservas',
            'permissoes' => [
                'loja.catalogo' => 'Ver o catálogo com preços e disponibilidade',
                'loja.reservar' => 'Pedir reservas pelo catálogo',
            ],
        ],
        'conta' => [
            'label' => 'Área do cliente',
            'permissoes' => [
                'conta.reservas' => 'Ver as suas reservas',
                'conta.documentos' => 'Ver e imprimir as suas facturas e recibos',
            ],
        ],
    ];

    /** O que o perfil Cliente traz de origem: ver o catálogo e reservar (facturas e recibos ligam-se à parte) */
    public const PERFIL_CLIENTE_INICIAL = ['loja.catalogo', 'loja.reservar', 'conta.reservas'];

    /**
     * Perfis criados na instalação e as permissões que trazem de origem.
     * O Administrador não precisa de lista: tem acesso a tudo (ver AppServiceProvider).
     *
     * @var array<string, list<string>>
     */
    public const PERFIS_INICIAIS = [
        self::ADMINISTRADOR => [],
        'Gestor' => [
            'utilizadores.ver', 'auditoria.ver', 'terceiros.ver', 'terceiros.gerir', 'terceiros.contas', 'produtos.ver', 'produtos.gerir',
            'facturas.ver', 'facturas.criar', 'facturas.validar', 'facturas.abandonar', 'pagamentos.ver', 'pagamentos.registar',
            'orcamentos.ver', 'orcamentos.criar', 'orcamentos.validar', 'orcamentos.fechar',
            'encomendas.ver', 'encomendas.criar', 'encomendas.validar', 'encomendas.fechar',
            'compras.ver', 'compras.criar', 'compras.validar', 'compras.receber', 'compras.pagar',
            'stock.ver', 'stock.movimentar', 'stock.inventariar',
            'reservas.ver', 'reservas.criar', 'reservas.confirmar', 'reservas.entregar',
            'resultados.ver',
        ],
        'Comercial' => [
            'reservas.ver', 'reservas.criar', 'reservas.confirmar', 'terceiros.contas',
            'terceiros.ver', 'terceiros.gerir', 'produtos.ver', 'stock.ver', 'facturas.ver', 'facturas.criar',
            'orcamentos.ver', 'orcamentos.criar', 'orcamentos.validar', 'orcamentos.fechar',
            'encomendas.ver', 'encomendas.criar', 'encomendas.validar',
        ],
        'Financeiro' => [
            'terceiros.ver', 'terceiros.gerir', 'produtos.ver', 'stock.ver', 'reservas.ver', 'facturas.ver', 'facturas.criar', 'facturas.validar',
            'facturas.abandonar', 'pagamentos.ver', 'pagamentos.registar', 'orcamentos.ver', 'encomendas.ver',
            'compras.ver', 'compras.criar', 'compras.validar', 'compras.pagar',
        ],
        'Armazém' => [
            'produtos.ver', 'produtos.gerir', 'stock.ver', 'stock.movimentar', 'stock.inventariar', 'reservas.ver', 'reservas.entregar',
            'encomendas.ver', 'encomendas.fechar', 'compras.ver', 'compras.criar', 'compras.receber',
        ],
        'Equipa de montagem' => ['encomendas.ver', 'stock.ver', 'reservas.ver', 'reservas.entregar'],
    ];

    /** @return list<string> */
    public static function todas(array $catalogo = self::CATALOGO): array
    {
        $todas = [];
        foreach ($catalogo as $modulo) {
            array_push($todas, ...array_keys($modulo['permissoes']));
        }

        return $todas;
    }

    /**
     * Cria as permissões que faltam e os perfis iniciais. Pode correr várias vezes.
     * Nunca retira permissões que o administrador tenha dado entretanto.
     */
    public static function sincronizar(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $existentes = Permission::where('guard_name', 'web')->pluck('name')->all();
        $novas = array_values(array_diff(self::todas(), $existentes));

        foreach ($novas as $nome) {
            Permission::findOrCreate($nome, 'web');
        }

        foreach (self::PERFIS_INICIAIS as $perfil => $permissoes) {
            $role = Role::where('name', $perfil)->where('guard_name', 'web')->first();
            if ($role === null) {
                Role::create(['name' => $perfil, 'guard_name' => 'web'])->givePermissionTo($permissoes);
            } else {
                // Perfil que já existia: recebe só as permissões acabadas de criar (módulos novos).
                $role->givePermissionTo(array_values(array_intersect($permissoes, $novas)));
            }
        }

        // Perfil Cliente: permissões próprias, na guarda dos clientes
        $existentes = Permission::where('guard_name', self::GUARDA_CLIENTE)->pluck('name')->all();
        $novas = array_values(array_diff(self::todas(self::CATALOGO_CLIENTE), $existentes));
        foreach ($novas as $nome) {
            Permission::findOrCreate($nome, self::GUARDA_CLIENTE);
        }
        $cliente = Role::where('name', self::CLIENTE)->where('guard_name', self::GUARDA_CLIENTE)->first();
        if ($cliente === null) {
            Role::create(['name' => self::CLIENTE, 'guard_name' => self::GUARDA_CLIENTE])->givePermissionTo(self::PERFIL_CLIENTE_INICIAL);
        } else {
            $cliente->givePermissionTo(array_values(array_intersect(self::PERFIL_CLIENTE_INICIAL, $novas)));
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** Perfis que vêm com o sistema e não se podem apagar nem mudar de nome. */
    public static function eDeSistema(string $perfil): bool
    {
        return array_key_exists($perfil, self::PERFIS_INICIAIS) || $perfil === self::CLIENTE;
    }

    /** @return list<string> O que as contas de clientes podem fazer neste momento */
    public static function doCliente(): array
    {
        return Role::where('name', self::CLIENTE)->where('guard_name', self::GUARDA_CLIENTE)->first()
            ?->permissions->pluck('name')->values()->all() ?? [];
    }
}
