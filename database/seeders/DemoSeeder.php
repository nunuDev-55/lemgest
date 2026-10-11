<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Factura;
use App\Models\Orcamento;
use App\Models\Produto;
use App\Models\Reserva;
use App\Models\Terceiro;
use App\Models\User;
use App\Services\ContasCliente;
use App\Services\EncomendaFornecedorService;
use App\Services\FacturaFornecedorService;
use App\Services\FacturaService;
use App\Services\NotaCreditoService;
use App\Services\OrcamentoService;
use App\Services\ReservaService;
use App\Services\Stock;
use App\Services\TerceiroService;
use App\Support\Permissoes;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Dados FICTÍCIOS para o ambiente de demonstração (base de dados lemgest_demo, http://127.0.0.1:8089).
 * Nunca correr na base de dados real.
 *
 * Entrada: demo@lemgest.test / demo12345 (conta só deste ambiente).
 * Área do cliente (/conta/entrar): nadia@cliente.test / demo12345.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (DB::getDatabaseName() !== 'lemgest_demo') {
            $this->command?->error('O DemoSeeder só corre na base de dados lemgest_demo.');

            return;
        }

        Permissoes::sincronizar();

        $admin = User::firstOrCreate(
            ['email' => 'demo@lemgest.test'],
            ['name' => 'Utilizador Demonstração', 'password' => 'demo12345', 'email_verified_at' => now(), 'active' => true],
        );
        $admin->syncRoles([Permissoes::ADMINISTRADOR]);

        $equipa = [
            ['Ana Macuácua', 'ana@lemgest.test', 'Comercial'],
            ['Carlos Tembe', 'carlos@lemgest.test', 'Financeiro'],
            ['Rita Sitoe', 'rita@lemgest.test', 'Armazém'],
        ];
        foreach ($equipa as [$nome, $email, $perfil]) {
            User::firstOrCreate(['email' => $email], ['name' => $nome, 'password' => 'demo12345', 'active' => true])->syncRoles([$perfil]);
        }

        auth()->login($admin);
        $terceiros = app(TerceiroService::class);
        $stock = app(Stock::class);
        $facturas = app(FacturaService::class);

        $clientes = [];
        foreach ([
            ['IKIGAI LDA', 'empresa', '400502961', 'Av. Armando Tivane nº 196', 'Maputo', 'MZ-MPM', '+258 84 300 1122', '30d', 'transferencia'],
            ['Hotel Costa do Sol', 'empresa', '400118273', 'Av. da Marginal 1240', 'Maputo', 'MZ-MPM', '+258 21 450 115', '30d', 'transferencia'],
            ['Eventos Kanimambo', 'empresa', '401233870', 'Rua da Resistência 45', 'Matola', 'MZ-L', '+258 86 512 3344', '15d', 'mpesa'],
            ['Ministério da Cultura e Turismo', 'estado', '500002318', 'Av. Patrice Lumumba 1217', 'Maputo', 'MZ-MPM', '+258 21 420 300', '60d', 'transferencia'],
            ['Associação Mulheres Unidas', 'ong', '700345911', 'Bairro Liberdade, Q. 12', 'Matola', 'MZ-L', '+258 82 700 4455', 'pronto', 'emola'],
            ['Nádia Cossa', 'particular', null, 'Bairro Triunfo, casa 87', 'Maputo', 'MZ-MPM', '+258 84 901 2233', 'pronto', 'mpesa'],
            ['João Mabunda', 'particular', null, 'Matola G, rua 4', 'Matola', 'MZ-L', '+258 87 223 1100', 'pronto', 'numerario'],
            ['Restaurante Sabores do Índico', 'empresa', '400987652', 'Av. Julius Nyerere 657', 'Maputo', 'MZ-MPM', '+258 84 556 7788', '15d', 'cartao'],
        ] as [$nome, $tipo, $nuit, $morada, $cidade, $prov, $tel, $termos, $metodo]) {
            $clientes[] = $terceiros->criar([
                'nome' => $nome, 'e_cliente' => true, 'tipo_entidade' => $tipo, 'nuit' => $nuit, 'morada' => $morada,
                'cidade' => $cidade, 'provincia' => $prov, 'pais' => 'MZ', 'telemovel' => $tel, 'termos_pagamento' => $termos,
                'metodo_pagamento' => $metodo, 'sujeito_iva' => true, 'activo' => true,
            ], $admin);
        }

        $galp = $terceiros->criar(['nome' => 'Galp Moçambique', 'e_fornecedor' => true, 'tipo_entidade' => 'empresa', 'nuit' => '400033221', 'cidade' => 'Maputo', 'provincia' => 'MZ-MPM', 'pais' => 'MZ', 'termos_pagamento' => '30d', 'activo' => true], $admin);
        $texteis = $terceiros->criar(['nome' => 'Têxteis da Beira', 'e_fornecedor' => true, 'tipo_entidade' => 'empresa', 'nuit' => '400765123', 'cidade' => 'Beira', 'provincia' => 'MZ-S', 'pais' => 'MZ', 'termos_pagamento' => '45d', 'activo' => true], $admin);
        $terceiros->criar(['nome' => 'Casamentos Ndzava', 'e_potencial' => true, 'tipo_entidade' => 'empresa', 'nuit' => '401556677', 'cidade' => 'Maputo', 'provincia' => 'MZ-MPM', 'pais' => 'MZ', 'termos_pagamento' => 'pronto', 'activo' => true], $admin);

        // Catálogo: material de aluguer (preço por dia) e serviços, arrumados por categoria
        $categoria = fn (string $nome) => Categoria::where('nome', $nome)->value('id');
        $catalogo = [];
        foreach ([
            ['SOFA-RET', 'Sofá rectangular branco', 'Lounge', '1500.00', 12, true, 'Sofá de três lugares em pele sintética branca. 200 × 85 cm.'],
            ['SOFA-L', 'Sofá em L lounge', 'Lounge', '2500.00', 6, true, 'Conjunto em L para 5 pessoas, com almofadas. Ideal para zonas VIP.'],
            ['ALM-01', 'Almofadas decorativas', 'Decoração', '100.00', 300, false, 'Almofadas 40 × 40 cm em várias cores, a combinar com o tema do evento.'],
            ['PUFF-01', 'Puff redondo', 'Lounge', '250.00', 40, false, 'Puff de 45 cm de diâmetro, branco ou dourado.'],
            ['MESA-CENT', 'Mesa de centro em madeira', 'Lounge', '600.00', 15, false, null],
            ['TENDA-6X6', 'Tenda 6 × 6 m', 'Tendas', '7500.00', 4, true, 'Tenda branca para cerca de 40 pessoas sentadas, com laterais amovíveis.'],
            ['CAD-TIFF', 'Cadeira Tiffany branca', 'Mesas e cadeiras', '120.00', 250, false, 'Cadeira Tiffany em resina, com almofada de assento.'],
            ['MESA-RED', 'Mesa redonda para 10 pessoas', 'Mesas e cadeiras', '450.00', 25, false, 'Mesa de 180 cm de diâmetro. Toalha à parte.'],
            ['TOALHA-BR', 'Toalha de mesa branca', 'Decoração', '150.00', 60, false, null],
        ] as [$ref, $nome, $cat, $preco, $qtd, $destaque, $texto]) {
            $catalogo[$ref] = Produto::create([
                'referencia' => $ref, 'tipo' => 'produto', 'nome' => $nome, 'categoria_id' => $categoria($cat), 'preco' => '0', 'taxa_iva' => '16.00',
                'unidade' => 'un', 'em_venda' => false, 'em_compra' => true, 'em_aluguer' => true, 'preco_aluguer' => $preco,
                'na_loja' => $ref !== 'TOALHA-BR', 'loja_destaque' => $destaque, 'loja_ordem' => 0, 'loja_descricao' => $texto,
            ]);
            $stock->inicial($catalogo[$ref], $qtd, $admin);
        }
        foreach ([
            ['TRANSP', 'Transporte (ida e volta)', '500.00', 'srv', 'Entrega e recolha do material em Maputo e Matola.'],
            ['MONT', 'Montagem e desmontagem', '2000.00', 'srv', 'A nossa equipa monta tudo antes do evento e recolhe no fim.'],
            ['DECOR', 'Decoração de espaço (por hora)', '850.00', 'h', 'Decoração completa segundo o tema de cores escolhido.'],
        ] as [$ref, $nome, $preco, $un, $texto]) {
            $catalogo[$ref] = Produto::create([
                'referencia' => $ref, 'tipo' => 'servico', 'nome' => $nome, 'categoria_id' => $categoria('Serviços'), 'preco' => $preco, 'taxa_iva' => '16.00',
                'unidade' => $un, 'em_venda' => true, 'em_compra' => false, 'na_loja' => true, 'loja_descricao' => $texto,
            ]);
        }

        // Stock: um aluguer atrasado, um a decorrer, um devolvido em parte e duas cadeiras partidas
        $diaS = fn (int $diasAtras) => CarbonImmutable::today()->subDays($diasAtras)->toDateString();
        $stock->saida($catalogo['SOFA-RET'], 4, ['data' => $diaS(5), 'devolucao_prevista' => $diaS(1), 'terceiro_id' => $clientes[0]->id, 'motivo' => 'Lançamento de produto IKIGAI'], $admin);
        $stock->saida($catalogo['CAD-TIFF'], 150, ['data' => $diaS(1), 'devolucao_prevista' => CarbonImmutable::today()->addDays(2)->toDateString(), 'terceiro_id' => $clientes[1]->id, 'motivo' => 'Casamento no Hotel Costa do Sol'], $admin);
        $mesas = $stock->saida($catalogo['MESA-RED'], 15, ['data' => $diaS(4), 'devolucao_prevista' => $diaS(2), 'terceiro_id' => $clientes[2]->id, 'motivo' => 'Festa Kanimambo'], $admin);
        $stock->devolucao($mesas, 12, ['data' => $diaS(2), 'motivo' => 'Faltam 3 mesas, ficaram no local'], $admin);
        $stock->abate($catalogo['CAD-TIFF'], 2, ['data' => $diaS(3), 'motivo' => 'Partidas na montagem'], $admin);

        // Reservas de aluguer: uma de cada estado
        $reservas = app(ReservaService::class);
        $hoje = CarbonImmutable::today();
        $nova = function (Terceiro $cliente, array $datas, array $extra, array $linhas) use ($reservas, $admin, $catalogo) {
            $r = $reservas->criar(['terceiro_id' => $cliente->id, ...$datas, ...$extra], $admin);
            foreach ($linhas as [$ref, $qtd]) {
                $reservas->adicionarLinha($r, ['produto_id' => $catalogo[$ref]->id, 'quantidade' => (string) $qtd]);
            }

            return $r->fresh();
        };
        $d = fn (int $dias) => $hoje->addDays($dias)->toDateString();

        $casamento = $nova($clientes[1], ['data_evento' => $d(10), 'data_fim_evento' => $d(11), 'data_entrega' => $d(9), 'data_recolha' => $d(12), 'dias' => 2],
            ['local' => 'Hotel Costa do Sol, Av. da Marginal 1240, Maputo', 'contacto_local' => 'Paulo Chissano, +258 82 310 9988', 'transporte' => true, 'tema' => 'Branco e dourado'],
            [['CAD-TIFF', 80], ['MESA-RED', 8], ['TOALHA-BR', 8], ['TRANSP', 1], ['MONT', 1]]);
        $reservas->confirmar($casamento, $admin);

        $nova($clientes[5], ['data_evento' => $d(20), 'data_fim_evento' => $d(20), 'data_entrega' => $d(20), 'data_recolha' => $d(21), 'dias' => 1],
            ['local' => 'Bairro Triunfo, casa 87, Maputo', 'transporte' => true, 'tema' => 'Rosa e branco', 'nota_publica' => 'Aniversário de 30 anos, montagem até às 15h.'],
            [['SOFA-L', 1], ['PUFF-01', 6], ['ALM-01', 20], ['TRANSP', 1]]);

        $feira = $nova($clientes[2], ['data_evento' => $d(-1), 'data_fim_evento' => $d(-1), 'data_entrega' => $d(-2), 'data_recolha' => $d(1), 'dias' => 1],
            ['local' => 'Praça da Juventude, Matola', 'transporte' => true, 'tema' => 'Verde e natural'],
            [['TENDA-6X6', 1], ['CAD-TIFF', 40], ['MONT', 1]]);
        $reservas->entregar($reservas->confirmar($feira, $admin), $admin, $d(-2));

        $jantar = $nova($clientes[0], ['data_evento' => $d(-15), 'data_fim_evento' => $d(-15), 'data_entrega' => $d(-16), 'data_recolha' => $d(-14), 'dias' => 1],
            ['local' => 'Av. Armando Tivane nº 196, Maputo', 'transporte' => false, 'tema' => 'Preto e prata'],
            [['SOFA-RET', 2], ['MESA-CENT', 1]]);
        $jantar = $reservas->entregar($reservas->confirmar($jantar, $admin), $admin, $d(-16));
        $reservas->registarDevolucao($jantar, $jantar->linhas()->pluck('quantidade', 'id')->map(fn ($q) => ['devolvidas' => (int) $q])->all(), $admin, $d(-14));

        // Contas da loja: a Nádia já tem conta aprovada (ligada à sua ficha); outro pedido espera aprovação
        $contas = app(ContasCliente::class);
        $contas->aprovar($contas->registar([
            'nome' => 'Nádia Cossa', 'email' => 'nadia@cliente.test', 'telemovel' => '+258 84 901 2233', 'provincia' => 'MZ-MPM',
            'cidade' => 'Maputo', 'bairro' => 'Triunfo', 'morada' => 'Casa 87', 'password' => 'demo12345',
        ]), $admin, $clientes[5]->id);
        $contas->registar([
            'nome' => 'Lurdes Macamo', 'email' => 'lurdes@cliente.test', 'telemovel' => '+258 86 777 1234', 'provincia' => 'MZ-L',
            'cidade' => 'Matola', 'bairro' => 'Fomento', 'password' => 'demo12345',
        ]);

        // Facturas dos últimos meses em vários estados
        $planos = [
            [0, 150, [['SOFA-RET', 2], ['ALM-01', 20], ['TRANSP', 2]], 'pagar'],
            [1, 120, [['TENDA-6X6', 1], ['MONT', 1], ['TRANSP', 1]], 'pagar'],
            [2, 95, [['SOFA-L', 2], ['PUFF-01', 8], ['MESA-CENT', 2], ['MONT', 1]], 'pagar'],
            [3, 75, [['TENDA-6X6', 2], ['DECOR', 6], ['MONT', 2]], 'parcial'],
            [4, 60, [['SOFA-RET', 1], ['ALM-01', 10]], 'pagar'],
            [0, 40, [['SOFA-L', 1], ['ALM-01', 200], ['TRANSP', 2]], 'validar'],
            [7, 35, [['PUFF-01', 12], ['MESA-CENT', 3], ['TRANSP', 1]], 'abandonar'],
            [5, 20, [['DECOR', 4], ['ALM-01', 30]], 'validar'],
            [1, 8, [['TENDA-6X6', 1], ['SOFA-RET', 3], ['MONT', 1]], 'parcial'],
            [6, 3, [['SOFA-RET', 1], ['TRANSP', 1]], 'validar'],
            [2, 1, [['SOFA-L', 1], ['PUFF-01', 4]], 'rascunho'],
            [0, 0, [['ALM-01', 50]], 'rascunho'],
        ];

        $emitidas = [];
        foreach ($planos as $i => [$c, $diasAtras, $linhas, $destino]) {
            $data = CarbonImmutable::today()->subDays($diasAtras);
            $cliente = $clientes[$c];
            $f = $facturas->criar(['terceiro_id' => $cliente->id, 'data' => $data->toDateString(), 'termos_pagamento' => $cliente->termos_pagamento, 'metodo_pagamento' => $cliente->metodo_pagamento], $admin);
            foreach ($linhas as [$ref, $qtd]) {
                $facturas->adicionarLinha($f, ['produto_id' => $catalogo[$ref]->id, 'quantidade' => (string) $qtd]);
            }
            if ($destino === 'rascunho') {
                continue;
            }
            $f = $facturas->validar($f->fresh(), $admin);
            if ($destino === 'pagar' || $destino === 'parcial') {
                $valor = $destino === 'pagar' ? (string) $f->total : bcdiv((string) $f->total, '2', 2);
                $facturas->registarPagamento($f, ['data' => $data->addDays(min(10, $diasAtras))->toDateString(), 'metodo' => $cliente->metodo_pagamento ?? 'numerario', 'valor' => $valor, 'numero_documento' => 'MP'.random_int(100000, 999999)], $admin);
            }
            if ($destino === 'abandonar') {
                $facturas->abandonar($f, 'Cliente cancelou o evento por causa da chuva');
            }
            $emitidas[$i] = $f;
        }

        // A reserva devolvida factura-se agora (depois das facturas antigas, para a numeração seguir as datas)
        $facturas->validar($reservas->criarFactura($jantar->fresh(), $admin)->fresh(), $admin);

        // Notas de crédito: uma abatida numa factura por pagar, outra por reembolsar numa factura já paga
        $notas = app(NotaCreditoService::class);
        $nc = $notas->criarAPartirDe($emitidas[7]->fresh(), $admin, 'Devolução de material', copiarLinhas: false);
        $notas->adicionarLinha($nc, ['produto_id' => $catalogo['ALM-01']->id, 'quantidade' => '10']);
        $notas->validar($nc->fresh(), $admin);

        $nc = $notas->criarAPartirDe($emitidas[2]->fresh(), $admin, 'Desconto concedido depois da factura', copiarLinhas: false);
        $notas->adicionarLinha($nc, ['descricao' => 'Desconto de fidelização', 'quantidade' => '1', 'preco_unitario' => '1500', 'taxa_iva' => '16.00']);
        $notas->validar($nc->fresh(), $admin);

        // Compras: tecidos (recebidos, facturados e pagos em parte), toalhas (encomendadas e atrasadas) e combustível por pagar
        $dia = fn (int $diasAtras) => CarbonImmutable::today()->subDays($diasAtras)->toDateString();
        $compras = app(EncomendaFornecedorService::class);
        $facturasFornecedor = app(FacturaFornecedorService::class);

        $ef = $compras->criar(['terceiro_id' => $texteis->id, 'data' => $dia(25), 'data_entrega' => $dia(15), 'ref_fornecedor' => 'COT-118'], $admin);
        $compras->adicionarLinha($ef, ['descricao' => 'Capas de almofada em linho 40x40', 'quantidade' => '60', 'preco_unitario' => '180', 'taxa_iva' => '16.00']);
        $compras->adicionarLinha($ef, ['descricao' => 'Tecido branco para sofá (metro)', 'quantidade' => '25', 'preco_unitario' => '450', 'taxa_iva' => '16.00']);
        $ef = $compras->validar($ef->fresh(), $admin);
        $compras->encomendar($ef, $dia(24), 'whatsapp');
        $compras->receber($ef->fresh());
        $ff = $facturasFornecedor->validar($compras->criarFactura($ef->fresh(), 'TB-2026/0457', $admin)->fresh(), $admin);
        $facturasFornecedor->registarPagamento($ff, ['data' => $dia(5), 'metodo' => 'transferencia', 'valor' => '10000', 'numero_documento' => 'TRF-55120'], $admin);

        $ef = $compras->criar(['terceiro_id' => $texteis->id, 'data' => $dia(6), 'data_entrega' => $dia(1)], $admin);
        $compras->adicionarLinha($ef, ['descricao' => 'Toalhas de mesa brancas 3x3 m', 'quantidade' => '30', 'preco_unitario' => '350', 'taxa_iva' => '16.00']);
        $compras->encomendar($compras->validar($ef->fresh(), $admin), $dia(6), 'email');

        $ff = $facturasFornecedor->criar(['terceiro_id' => $galp->id, 'ref_fornecedor' => 'FG-889120', 'data' => $dia(12), 'termos_pagamento' => '30d'], $admin);
        $facturasFornecedor->adicionarLinha($ff, ['descricao' => 'Gasóleo para a viatura de entregas (litros)', 'quantidade' => '120', 'preco_unitario' => '76.50', 'taxa_iva' => '16.00']);
        $facturasFornecedor->validar($ff->fresh(), $admin);

        // Contactos das empresas clientes
        foreach ([
            [0, 'Sónia Mabote', 'Gestora de eventos', '+258 84 555 1234', 'sonia@ikigai.co.mz'],
            [1, 'Paulo Chissano', 'Director de banquetes', '+258 82 310 9988', 'banquetes@costadosol.co.mz'],
            [1, 'Lurdes Nhantumbo', 'Contabilidade', '+258 21 450 116', 'contas@costadosol.co.mz'],
            [2, 'Edson Cumbe', 'Produtor', '+258 86 512 3345', 'edson@kanimambo.co.mz'],
            [3, 'Dra. Amélia Sitoe', 'Chefe de protocolo', '+258 82 400 1200', 'protocolo@mict.gov.mz'],
        ] as [$c, $nome, $cargo, $tlm, $email]) {
            $clientes[$c]->contactos()->create(['nome' => $nome, 'cargo' => $cargo, 'telemovel' => $tlm, 'email' => $email, 'activo' => true]);
        }

        // Orçamentos em vários estados; os aceites passam a reserva (orçamento → reserva → factura)
        $orcamentos = app(OrcamentoService::class);
        $planosOrc = [
            [1, 20, [['TENDA-6X6', 2], ['SOFA-L', 3], ['MONT', 2]], 'reserva'],
            [2, 12, [['SOFA-RET', 4], ['ALM-01', 40], ['TRANSP', 2]], 'reserva'],
            [7, 9, [['PUFF-01', 10], ['MESA-CENT', 4]], 'assinado'],
            [0, 45, [['DECOR', 8], ['TENDA-6X6', 1]], 'aberto'], // já expirado (validade 30 dias)
            [4, 6, [['SOFA-L', 1], ['ALM-01', 15]], 'aberto'],
            [5, 15, [['SOFA-RET', 2], ['TRANSP', 1]], 'recusado'],
            [6, 2, [['MESA-CENT', 2]], 'rascunho'],
        ];
        foreach ($planosOrc as [$c, $diasAtras, $linhas, $destino]) {
            $data = CarbonImmutable::today()->subDays($diasAtras);
            $o = $orcamentos->criar([
                'terceiro_id' => $clientes[$c]->id, 'data' => $data->toDateString(), 'validade_dias' => 30,
                'data_entrega' => $data->addDays(21)->toDateString(), 'termos_pagamento' => $clientes[$c]->termos_pagamento,
            ], $admin);
            foreach ($linhas as [$ref, $qtd]) {
                $orcamentos->adicionarLinha($o, ['produto_id' => $catalogo[$ref]->id, 'quantidade' => (string) $qtd]);
            }
            if ($destino === 'rascunho') {
                continue;
            }
            $o = $orcamentos->validar($o->fresh(), $admin);
            if ($destino === 'recusado') {
                $orcamentos->fechar($o, false, 'Escolheu outro fornecedor');

                continue;
            }
            if ($destino === 'aberto') {
                continue;
            }
            $orcamentos->fechar($o, true, 'Aceite pelo cliente');
            if ($destino === 'reserva') {
                $evento = $o->data_entrega->toDateString();
                $orcamentos->criarReserva($o->fresh(), [
                    'data_evento' => $evento, 'data_fim_evento' => $evento, 'data_entrega' => $evento, 'data_recolha' => $evento, 'dias' => 1,
                ], $admin);
            }
        }

        $this->command?->info('Demonstração pronta: '.Factura::count().' facturas, '.Orcamento::count().' orçamentos, '.Reserva::count().' reservas, '.Produto::count().' produtos/serviços.');
    }
}
