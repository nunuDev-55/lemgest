<?php

use App\Http\Controllers\Administracao\AuditoriaController;
use App\Http\Controllers\Administracao\ConfiguracaoController;
use App\Http\Controllers\Administracao\PerfilController;
use App\Http\Controllers\Administracao\UtilizadorController;
use App\Http\Controllers\Aluguer\ReservaController;
use App\Http\Controllers\Comercial\CategoriaController;
use App\Http\Controllers\Comercial\ContaClienteController;
use App\Http\Controllers\Comercial\ContactoController;
use App\Http\Controllers\Comercial\EncomendaController;
use App\Http\Controllers\Comercial\OrcamentoController;
use App\Http\Controllers\Comercial\ProdutoController;
use App\Http\Controllers\Comercial\ProdutoFotoController;
use App\Http\Controllers\Comercial\TerceiroController;
use App\Http\Controllers\Compras\DespesaController;
use App\Http\Controllers\Compras\EncomendaFornecedorController;
use App\Http\Controllers\Compras\FacturaFornecedorController;
use App\Http\Controllers\Compras\PagamentoFornecedorController;
use App\Http\Controllers\EstadoController;
use App\Http\Controllers\Facturacao\FacturaController;
use App\Http\Controllers\Facturacao\NotaCreditoController;
use App\Http\Controllers\Facturacao\PagamentoController;
use App\Http\Controllers\InicioController;
use App\Http\Controllers\ResultadosController;
use App\Http\Controllers\Stock\DisponibilidadeController;
use App\Http\Controllers\Stock\InventarioController;
use App\Http\Controllers\Stock\MovimentoStockController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// A página inicial leva ao painel (ou ao login, se não houver sessão).
Route::redirect('/', '/painel')->name('home');

// Ecrã de arranque da aplicação: "o sistema e a base de dados estão prontos?" (sem sessão nem cookies)
Route::get('estado/pronto.png', EstadoController::class)->withoutMiddleware('web')->name('estado.pronto');

// Cada rota exige a sua permissão (catálogo em App\Support\Permissoes).
// Sistema interno: só a equipa (guarda "web"); os clientes têm a sua área em /conta (routes/conta.php)
Route::middleware(['auth:web'])->group(function () {
    Route::get('painel', InicioController::class)->name('dashboard');
    Route::get('resultados', ResultadosController::class)->middleware('can:resultados.ver')->name('resultados');

    // Terceiros (clientes, potenciais clientes e fornecedores)
    Route::middleware('can:terceiros.ver')->group(function () {
        Route::get('terceiros', [TerceiroController::class, 'index'])->name('terceiros.index');
        Route::get('terceiros/novo', [TerceiroController::class, 'create'])->middleware('can:terceiros.gerir')->name('terceiros.create');
        Route::post('terceiros', [TerceiroController::class, 'store'])->middleware('can:terceiros.gerir')->name('terceiros.store');
        Route::get('terceiros/{terceiro}', [TerceiroController::class, 'show'])->name('terceiros.show');
        Route::get('terceiros/{terceiro}/editar', [TerceiroController::class, 'edit'])->middleware('can:terceiros.gerir')->name('terceiros.edit');
        Route::put('terceiros/{terceiro}', [TerceiroController::class, 'update'])->middleware('can:terceiros.gerir')->name('terceiros.update');
        Route::post('terceiros/{terceiro}/estado', [TerceiroController::class, 'alternarEstado'])->middleware('can:terceiros.gerir')->name('terceiros.estado');
        Route::delete('terceiros/{terceiro}', [TerceiroController::class, 'destroy'])->middleware('can:terceiros.apagar')->name('terceiros.destroy');
    });

    // Produtos e stock (com categorias e fotos)
    Route::middleware('can:produtos.consultar')->group(function () {
        Route::get('produtos/categorias', [CategoriaController::class, 'index'])->name('categorias.index');
        Route::middleware('can:produtos.gerir')->group(function () {
            Route::post('produtos/categorias', [CategoriaController::class, 'store'])->name('categorias.store');
            Route::put('produtos/categorias/{categoria}', [CategoriaController::class, 'update'])->name('categorias.update');
            Route::put('produtos/categorias/{categoria}/mover', [CategoriaController::class, 'mover'])->name('categorias.mover');
            Route::delete('produtos/categorias/{categoria}', [CategoriaController::class, 'destroy'])->name('categorias.destroy');
            Route::post('produtos/materiais', [CategoriaController::class, 'guardarMaterial'])->name('materiais.store');
            Route::put('produtos/materiais/{material}', [CategoriaController::class, 'guardarMaterial'])->name('materiais.update');
            Route::delete('produtos/materiais/{material}', [CategoriaController::class, 'apagarMaterial'])->name('materiais.destroy');

            Route::post('produtos/{produto}/fotos', [ProdutoFotoController::class, 'store'])->name('produtos.fotos.store');
            Route::put('produtos/{produto}/fotos/{foto}/principal', [ProdutoFotoController::class, 'principal'])->name('produtos.fotos.principal');
            Route::put('produtos/{produto}/fotos/{foto}/mover', [ProdutoFotoController::class, 'mover'])->name('produtos.fotos.mover');
            Route::delete('produtos/{produto}/fotos/{foto}', [ProdutoFotoController::class, 'destroy'])->name('produtos.fotos.destroy');
        });
        Route::get('produtos/fotos/{foto}/{tamanho}', [ProdutoFotoController::class, 'mostrar'])->name('produtos.fotos.mostrar');

        Route::get('produtos', [ProdutoController::class, 'index'])->name('produtos.index');
        Route::get('produtos/novo', [ProdutoController::class, 'create'])->middleware('can:produtos.gerir')->name('produtos.create');
        Route::post('produtos', [ProdutoController::class, 'store'])->middleware('can:produtos.gerir')->name('produtos.store');
        Route::get('produtos/{produto}', [ProdutoController::class, 'show'])->name('produtos.show');
        Route::get('produtos/{produto}/editar', [ProdutoController::class, 'edit'])->middleware('can:produtos.gerir')->name('produtos.edit');
        Route::put('produtos/{produto}', [ProdutoController::class, 'update'])->middleware('can:produtos.gerir')->name('produtos.update');
        Route::delete('produtos/{produto}', [ProdutoController::class, 'destroy'])->middleware('can:produtos.gerir')->name('produtos.destroy');
    });

    // Reservas de aluguer: pedido → confirmada → entregue → devolvida
    Route::middleware('can:reservas.ver')->prefix('reservas')->name('reservas.')->controller(ReservaController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('calendario', 'calendario')->name('calendario');
        Route::get('nova', 'create')->middleware('can:reservas.criar')->name('create');
        Route::post('/', 'store')->middleware('can:reservas.criar')->name('store');
        Route::get('{reserva}', 'show')->name('show');
        Route::get('{reserva}/lista', 'lista')->name('lista');
        Route::middleware('can:reservas.criar')->group(function () {
            Route::get('{reserva}/editar', 'edit')->name('edit');
            Route::put('{reserva}', 'update')->name('update');
            Route::post('{reserva}/linhas', 'adicionarLinha')->name('linhas.store');
            Route::put('{reserva}/linhas/{linha}', 'actualizarLinha')->name('linhas.update');
            Route::delete('{reserva}/linhas/{linha}', 'removerLinha')->name('linhas.destroy');
        });
        Route::middleware('can:reservas.confirmar')->group(function () {
            Route::post('{reserva}/confirmar', 'confirmar')->name('confirmar');
            Route::post('{reserva}/pedido', 'voltarAPedido')->name('pedido');
            Route::post('{reserva}/cancelar', 'cancelar')->name('cancelar');
            Route::post('{reserva}/reabrir', 'reabrir')->name('reabrir');
        });
        Route::post('{reserva}/factura', 'criarFactura')->middleware('can:facturas.criar')->name('factura');
        Route::middleware('can:reservas.entregar')->group(function () {
            Route::post('{reserva}/entregar', 'entregar')->name('entregar');
            Route::post('{reserva}/devolucao', 'devolucao')->name('devolucao');
        });
    });

    // Stock: quantidades, movimentos, disponibilidade por data e inventários
    Route::middleware('can:stock.ver')->prefix('stock')->name('stock.')->group(function () {
        // O resumo do stock passou para a lista de produtos
        Route::get('/', fn (Request $request) => to_route('produtos.index', array_filter(['stock' => $request->query('situacao')])))->name('index');
        Route::get('movimentos', [MovimentoStockController::class, 'index'])->name('movimentos.index');
        Route::post('movimentos', [MovimentoStockController::class, 'store'])->name('movimentos.store'); // permissão verificada por tipo
        Route::get('disponibilidade', DisponibilidadeController::class)->name('disponibilidade');
        Route::get('inventarios', [InventarioController::class, 'index'])->name('inventarios.index');
        Route::get('inventarios/novo', [InventarioController::class, 'create'])->middleware('can:stock.inventariar')->name('inventarios.create');
        Route::post('inventarios', [InventarioController::class, 'store'])->middleware('can:stock.inventariar')->name('inventarios.store');
        Route::get('inventarios/{inventario}', [InventarioController::class, 'show'])->name('inventarios.show');
    });

    // Contas de clientes da loja (pedidos de registo para aprovar)
    Route::middleware('can:terceiros.contas')->prefix('contas-clientes')->name('contas-clientes.')->controller(ContaClienteController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('{conta}/aprovar', 'aprovar')->name('aprovar');
        Route::post('{conta}/recusar', 'recusar')->name('recusar');
        Route::post('{conta}/suspender', 'suspender')->name('suspender');
        Route::post('{conta}/reactivar', 'reactivar')->name('reactivar');
    });

    // Contactos / Endereços (pessoas de contacto dos terceiros)
    Route::get('contactos', [ContactoController::class, 'index'])->middleware('can:terceiros.ver')->name('contactos.index');
    Route::middleware('can:terceiros.gerir')->group(function () {
        Route::post('terceiros/{terceiro}/contactos', [ContactoController::class, 'store'])->name('contactos.store');
        Route::put('contactos/{contacto}', [ContactoController::class, 'update'])->name('contactos.update');
        Route::delete('contactos/{contacto}', [ContactoController::class, 'destroy'])->name('contactos.destroy');
    });

    // Comércio: orçamentos e encomendas de venda (as encomendas já não estão no menu: o aluguer usa reservas)
    // As antigas páginas de "área" (resumos ao estilo Dolibarr) repetiam o painel: levam às listas
    Route::redirect('comercial', '/orcamentos');
    Route::redirect('facturacao', '/facturas');
    Route::redirect('compras', '/encomendas-fornecedor');

    Route::middleware('can:orcamentos.ver')->prefix('orcamentos')->name('orcamentos.')->controller(OrcamentoController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('novo', 'create')->middleware('can:orcamentos.criar')->name('create');
        Route::post('/', 'store')->middleware('can:orcamentos.criar')->name('store');
        Route::get('{orcamento}', 'show')->name('show');
        Route::get('{orcamento}/imprimir', 'imprimir')->name('imprimir');
        Route::middleware('can:orcamentos.criar')->group(function () {
            Route::get('{orcamento}/editar', 'edit')->name('edit');
            Route::put('{orcamento}', 'update')->name('update');
            Route::delete('{orcamento}', 'destroy')->name('destroy');
            Route::post('{orcamento}/rascunho', 'voltarARascunho')->name('rascunho');
            Route::post('{orcamento}/linhas', 'adicionarLinha')->name('linhas.store');
            Route::put('{orcamento}/linhas/{linha}', 'actualizarLinha')->name('linhas.update');
            Route::delete('{orcamento}/linhas/{linha}', 'removerLinha')->name('linhas.destroy');
        });
        Route::post('{orcamento}/validar', 'validar')->middleware('can:orcamentos.validar')->name('validar');
        Route::middleware('can:orcamentos.fechar')->group(function () {
            Route::post('{orcamento}/fechar', 'fechar')->name('fechar');
            Route::post('{orcamento}/reabrir', 'reabrir')->name('reabrir');
            Route::post('{orcamento}/facturado', 'classificarFacturado')->name('facturado');
        });
        Route::post('{orcamento}/reserva', 'criarReserva')->middleware('can:reservas.criar')->name('reserva');
        Route::post('{orcamento}/factura', 'criarFactura')->middleware('can:facturas.criar')->name('factura');
    });

    Route::middleware('can:encomendas.ver')->prefix('encomendas')->name('encomendas.')->controller(EncomendaController::class)->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('nova', 'create')->middleware('can:encomendas.criar')->name('create');
        Route::post('/', 'store')->middleware('can:encomendas.criar')->name('store');
        Route::get('{encomenda}', 'show')->name('show');
        Route::get('{encomenda}/imprimir', 'imprimir')->name('imprimir');
        Route::middleware('can:encomendas.criar')->group(function () {
            Route::get('{encomenda}/editar', 'edit')->name('edit');
            Route::put('{encomenda}', 'update')->name('update');
            Route::delete('{encomenda}', 'destroy')->name('destroy');
            Route::post('{encomenda}/rascunho', 'voltarARascunho')->name('rascunho');
            Route::post('{encomenda}/linhas', 'adicionarLinha')->name('linhas.store');
            Route::put('{encomenda}/linhas/{linha}', 'actualizarLinha')->name('linhas.update');
            Route::delete('{encomenda}/linhas/{linha}', 'removerLinha')->name('linhas.destroy');
        });
        Route::post('{encomenda}/validar', 'validar')->middleware('can:encomendas.validar')->name('validar');
        Route::middleware('can:encomendas.fechar')->group(function () {
            Route::post('{encomenda}/entregar', 'entregar')->name('entregar');
            Route::post('{encomenda}/anular', 'anular')->name('anular');
            Route::post('{encomenda}/reabrir', 'reabrir')->name('reabrir');
        });
        Route::post('{encomenda}/facturada', 'classificarFacturada')->middleware('can:facturas.criar')->name('facturada');
        Route::post('{encomenda}/factura', 'criarFactura')->middleware('can:facturas.criar')->name('factura');
    });

    // Facturação | Pagamento
    Route::middleware('can:facturas.ver')->group(function () {
        Route::get('facturas', [FacturaController::class, 'index'])->name('facturas.index');
        Route::get('facturas/nova', [FacturaController::class, 'create'])->middleware('can:facturas.criar')->name('facturas.create');
        Route::post('facturas', [FacturaController::class, 'store'])->middleware('can:facturas.criar')->name('facturas.store');
        Route::get('facturas/{factura}', [FacturaController::class, 'show'])->name('facturas.show');
        Route::get('facturas/{factura}/imprimir', [FacturaController::class, 'imprimir'])->name('facturas.imprimir');

        Route::middleware('can:facturas.criar')->group(function () {
            Route::put('facturas/{factura}', [FacturaController::class, 'update'])->name('facturas.update');
            Route::delete('facturas/{factura}', [FacturaController::class, 'destroy'])->name('facturas.destroy');
            Route::post('facturas/{factura}/linhas', [FacturaController::class, 'adicionarLinha'])->name('facturas.linhas.store');
            Route::put('facturas/{factura}/linhas/{linha}', [FacturaController::class, 'actualizarLinha'])->name('facturas.linhas.update');
            Route::delete('facturas/{factura}/linhas/{linha}', [FacturaController::class, 'removerLinha'])->name('facturas.linhas.destroy');
        });

        Route::post('facturas/{factura}/validar', [FacturaController::class, 'validar'])->middleware('can:facturas.validar')->name('facturas.validar');
        Route::post('facturas/{factura}/abandonar', [FacturaController::class, 'abandonar'])->middleware('can:facturas.abandonar')->name('facturas.abandonar');
        Route::post('facturas/{factura}/reabrir', [FacturaController::class, 'reabrir'])->middleware('can:facturas.abandonar')->name('facturas.reabrir');

        // Notas de crédito: nascem na ficha da factura que corrigem
        Route::post('facturas/{factura}/nota-credito', [NotaCreditoController::class, 'store'])->middleware('can:facturas.criar')->name('notas-credito.store');
        Route::prefix('notas-credito')->name('notas-credito.')->controller(NotaCreditoController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('{notaCredito}', 'show')->name('show');
            Route::get('{notaCredito}/imprimir', 'imprimir')->name('imprimir');
            Route::middleware('can:facturas.criar')->group(function () {
                Route::put('{notaCredito}', 'update')->name('update');
                Route::delete('{notaCredito}', 'destroy')->name('destroy');
                Route::post('{notaCredito}/linhas', 'adicionarLinha')->name('linhas.store');
                Route::put('{notaCredito}/linhas/{linha}', 'actualizarLinha')->name('linhas.update');
                Route::delete('{notaCredito}/linhas/{linha}', 'removerLinha')->name('linhas.destroy');
            });
            Route::post('{notaCredito}/validar', 'validar')->middleware('can:facturas.validar')->name('validar');
            Route::post('{notaCredito}/reembolso', 'reembolsar')->middleware('can:pagamentos.registar')->name('reembolso');
        });

        Route::get('facturas/{factura}/pagamento', [PagamentoController::class, 'create'])->middleware('can:pagamentos.registar')->name('pagamentos.create');
        Route::post('facturas/{factura}/pagamento', [PagamentoController::class, 'store'])->middleware('can:pagamentos.registar')->name('pagamentos.store');
    });
    Route::get('pagamentos', [PagamentoController::class, 'index'])->middleware('can:pagamentos.ver')->name('pagamentos.index');

    // Compras a fornecedores
    Route::middleware('can:compras.ver')->group(function () {
        Route::prefix('encomendas-fornecedor')->name('encomendas-fornecedor.')->controller(EncomendaFornecedorController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('nova', 'create')->middleware('can:compras.criar')->name('create');
            Route::post('/', 'store')->middleware('can:compras.criar')->name('store');
            Route::get('{encomendaFornecedor}', 'show')->name('show');
            Route::get('{encomendaFornecedor}/imprimir', 'imprimir')->name('imprimir');
            Route::middleware('can:compras.criar')->group(function () {
                Route::get('{encomendaFornecedor}/editar', 'edit')->name('edit');
                Route::put('{encomendaFornecedor}', 'update')->name('update');
                Route::delete('{encomendaFornecedor}', 'destroy')->name('destroy');
                Route::post('{encomendaFornecedor}/rascunho', 'voltarARascunho')->name('rascunho');
                Route::post('{encomendaFornecedor}/linhas', 'adicionarLinha')->name('linhas.store');
                Route::put('{encomendaFornecedor}/linhas/{linha}', 'actualizarLinha')->name('linhas.update');
                Route::delete('{encomendaFornecedor}/linhas/{linha}', 'removerLinha')->name('linhas.destroy');
                Route::post('{encomendaFornecedor}/facturada', 'classificarFacturada')->name('facturada');
                Route::post('{encomendaFornecedor}/factura', 'criarFactura')->name('factura');
            });
            Route::middleware('can:compras.validar')->group(function () {
                Route::post('{encomendaFornecedor}/validar', 'validar')->name('validar');
                Route::post('{encomendaFornecedor}/encomendar', 'encomendar')->name('encomendar');
                Route::post('{encomendaFornecedor}/anular', 'anular')->name('anular');
                Route::post('{encomendaFornecedor}/reabrir', 'reabrir')->name('reabrir');
            });
            Route::post('{encomendaFornecedor}/receber', 'receber')->middleware('can:compras.receber')->name('receber');
        });

        Route::prefix('facturas-fornecedor')->name('facturas-fornecedor.')->controller(FacturaFornecedorController::class)->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('nova', 'create')->middleware('can:compras.criar')->name('create');
            Route::post('/', 'store')->middleware('can:compras.criar')->name('store');
            Route::get('{facturaFornecedor}', 'show')->name('show');
            Route::middleware('can:compras.criar')->group(function () {
                Route::get('{facturaFornecedor}/editar', 'edit')->name('edit');
                Route::put('{facturaFornecedor}', 'update')->name('update');
                Route::delete('{facturaFornecedor}', 'destroy')->name('destroy');
                Route::post('{facturaFornecedor}/linhas', 'adicionarLinha')->name('linhas.store');
                Route::put('{facturaFornecedor}/linhas/{linha}', 'actualizarLinha')->name('linhas.update');
                Route::delete('{facturaFornecedor}/linhas/{linha}', 'removerLinha')->name('linhas.destroy');
            });
            Route::middleware('can:compras.validar')->group(function () {
                Route::post('{facturaFornecedor}/validar', 'validar')->name('validar');
                Route::post('{facturaFornecedor}/abandonar', 'abandonar')->name('abandonar');
                Route::post('{facturaFornecedor}/reabrir', 'reabrir')->name('reabrir');
            });
            Route::middleware('can:compras.pagar')->group(function () {
                Route::get('{facturaFornecedor}/pagamento', [PagamentoFornecedorController::class, 'create'])->name('pagamento');
                Route::post('{facturaFornecedor}/pagamento', [PagamentoFornecedorController::class, 'store'])->name('pagamento.store');
            });
        });

        Route::get('pagamentos-fornecedor', [PagamentoFornecedorController::class, 'index'])->name('pagamentos-fornecedor.index');
    });

    // Despesas do dia-a-dia (com as compras, são os gastos dos Resultados)
    Route::middleware('can:despesas.ver')->group(function () {
        Route::get('despesas', [DespesaController::class, 'index'])->name('despesas.index');
        Route::middleware('can:despesas.registar')->group(function () {
            Route::post('despesas', [DespesaController::class, 'store'])->name('despesas.store');
            Route::put('despesas/{despesa}', [DespesaController::class, 'update'])->name('despesas.update');
            Route::delete('despesas/{despesa}', [DespesaController::class, 'destroy'])->name('despesas.destroy');
        });
    });

    // Administração
    Route::prefix('administracao')->group(function () {
        Route::get('utilizadores', [UtilizadorController::class, 'index'])
            ->middleware('can:utilizadores.ver')->name('utilizadores.index');
        Route::post('utilizadores', [UtilizadorController::class, 'store'])
            ->middleware('can:utilizadores.gerir')->name('utilizadores.store');
        Route::put('utilizadores/{utilizador}', [UtilizadorController::class, 'update'])
            ->middleware('can:utilizadores.gerir')->name('utilizadores.update');
        Route::post('utilizadores/{utilizador}/estado', [UtilizadorController::class, 'alternarEstado'])
            ->middleware('can:utilizadores.desactivar')->name('utilizadores.estado');

        Route::middleware('can:perfis.gerir')->group(function () {
            Route::get('perfis', [PerfilController::class, 'index'])->name('perfis.index');
            Route::post('perfis', [PerfilController::class, 'store'])->name('perfis.store');
            Route::put('perfis/{perfil}', [PerfilController::class, 'update'])->name('perfis.update');
            Route::delete('perfis/{perfil}', [PerfilController::class, 'destroy'])->name('perfis.destroy');
        });

        Route::get('auditoria', [AuditoriaController::class, 'index'])
            ->middleware('can:auditoria.ver')->name('auditoria.index');

        Route::middleware('can:configuracao.gerir')->prefix('configuracao')->name('configuracao.')
            ->controller(ConfiguracaoController::class)->group(function () {
                Route::get('empresa', 'empresa')->name('empresa');
                Route::post('empresa', 'guardarEmpresa')->name('empresa.guardar');
                Route::get('documentos', 'documentos')->name('documentos');
                Route::put('documentos', 'guardarDocumentos')->name('documentos.guardar');
                Route::get('numeracao', 'numeracao')->name('numeracao');
            });
    });
});

// Logótipo da empresa: público, porque vai em todos os documentos enviados aos clientes e na área do cliente
Route::get('empresa/logotipo', [ConfiguracaoController::class, 'logotipo'])->name('empresa.logotipo');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/conta.php';
