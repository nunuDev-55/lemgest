<?php

namespace App\Http\Controllers\Administracao;

use App\Contracts\DocumentoComLinhas;
use App\Http\Controllers\Controller;
use App\Models\Categoria;
use App\Models\Contacto;
use App\Models\Inventario;
use App\Models\Produto;
use App\Models\Terceiro;
use App\Models\User;
use App\Support\Autor;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class AuditoriaController extends Controller
{
    /** Nomes legíveis dos módulos (log_name) */
    private const MODULOS = [
        'acessos' => 'Acessos',
        'configuracao' => 'Configuração',
        'comercial' => 'Comércio (orçamentos e encomendas)',
        'facturas' => 'Facturas',
        'compras' => 'Compras de matéria-prima',
        'despesas' => 'Despesas',
        'contas' => 'Contas de clientes da loja',
        'terceiros' => 'Terceiros',
        'produtos' => 'Produtos e serviços',
        'stock' => 'Stock',
        'reservas' => 'Reservas de aluguer',
        'utilizadores' => 'Utilizadores',
        'perfis' => 'Perfis e permissões',
    ];

    /** Nomes legíveis dos campos alterados */
    private const CAMPOS = [
        'name' => 'Nome',
        'email' => 'E-mail',
        'phone' => 'Telefone',
        'active' => 'Estado',
        'perfil' => 'Perfil',
        'permissoes' => 'Permissões',
        'nome' => 'Nome',
        'nuit' => 'NUIT',
        'telefone' => 'Telefone',
        'e_cliente' => 'Cliente',
        'e_potencial' => 'Potencial',
        'e_fornecedor' => 'Fornecedor',
        'activo' => 'Estado',
        'referencia' => 'Referência',
        'preco' => 'Preço',
        'taxa_iva' => 'IVA',
        'em_venda' => 'Em venda',
        'em_compra' => 'Em compra',
        'categoria_id' => 'Categoria',
        'em_aluguer' => 'Em aluguer',
        'preco_aluguer' => 'Preço por dia',
        'quantidade_total' => 'Quantidade total',
        'na_loja' => 'Mostrar na loja',
        'loja_destaque' => 'Destaque na loja',
        'descricao' => 'Descrição',
        'valor' => 'Valor',
        'categoria' => 'Categoria',
        'metodo' => 'Forma de pagamento',
        'codigo' => 'Código',
        'material_id' => 'Material',
        'nome_comercial' => 'Nome comercial',
        'forma_juridica' => 'Forma jurídica',
        'nuel' => 'NUEL',
        'capital_social' => 'Capital social',
        'actividade' => 'Actividade',
        'morada' => 'Morada',
        'cidade' => 'Cidade',
        'provincia' => 'Província',
        'pais' => 'País',
        'telemovel' => 'Telemóvel',
        'website' => 'Website',
        'logotipo' => 'Logótipo',
        'dados_pagamento' => 'Dados para pagamento',
        'rodape_factura' => 'Rodapé das facturas',
        'rodape_orcamento' => 'Rodapé dos orçamentos',
        'rodape_encomenda' => 'Rodapé das encomendas',
        'validade_orcamento' => 'Validade dos orçamentos (dias)',
    ];

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'utilizador' => ['nullable', 'integer'],
            'modulo' => ['nullable', 'string', 'in:'.implode(',', array_keys(self::MODULOS))],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date', 'after_or_equal:de'],
        ]);

        $registos = Activity::query()
            ->with(['causer', 'subject'])
            ->when($filtros['utilizador'] ?? null, fn ($q, $id) => $q->where('causer_type', (new User)->getMorphClass())->where('causer_id', $id))
            ->when($filtros['modulo'] ?? null, fn ($q, $modulo) => $q->where('log_name', $modulo))
            ->when($filtros['de'] ?? null, fn ($q, $de) => $q->where('created_at', '>=', Carbon::parse($de)->startOfDay()))
            ->when($filtros['ate'] ?? null, fn ($q, $ate) => $q->where('created_at', '<=', Carbon::parse($ate)->endOfDay()))
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Activity $a) => [
                'id' => $a->id,
                'data' => $a->created_at?->toIso8601String(),
                'modulo' => self::MODULOS[$a->log_name] ?? $a->log_name,
                'evento' => $a->event,
                'descricao' => $a->description,
                'utilizador' => Autor::nome($a->causer),
                'registo' => $this->descreverRegisto($a),
                'alteracoes' => $this->alteracoes($a),
            ]);

        return Inertia::render('administracao/auditoria/index', [
            'registos' => $registos,
            'filtros' => (object) $filtros,
            'utilizadores' => User::orderBy('name')->get(['id', 'name']),
            'modulos' => collect(self::MODULOS)->map(fn ($label, $valor) => ['valor' => $valor, 'label' => $label])->values(),
        ]);
    }

    private function descreverRegisto(Activity $a): ?string
    {
        $subject = $a->subject;

        return match (true) {
            $subject instanceof User => $subject->name,
            $subject instanceof DocumentoComLinhas => $subject->referencia(),
            $subject instanceof Contacto => $subject->nome,
            $subject instanceof Produto => $subject->referencia,
            $subject instanceof Categoria => $subject->nome,
            $subject instanceof Inventario => 'Inventário de '.$subject->data->format('d/m/Y'),
            $subject instanceof Terceiro => $subject->nome,
            $subject !== null && isset($subject->name) => (string) $subject->name,
            default => $a->properties['perfil'] ?? $a->properties['factura'] ?? $a->properties['documento'] ?? null,
        };
    }

    /** @return list<array{campo: string, antes: string, depois: string}> */
    private function alteracoes(Activity $a): array
    {
        $novos = $a->properties['attributes'] ?? [];
        $antigos = $a->properties['old'] ?? [];
        $lista = [];

        foreach ($novos as $campo => $valor) {
            $lista[] = [
                'campo' => self::CAMPOS[$campo] ?? $campo,
                'antes' => $this->formatar($campo, $antigos[$campo] ?? null),
                'depois' => $this->formatar($campo, $valor),
            ];
        }

        return $lista;
    }

    private function formatar(string $campo, mixed $valor): string
    {
        if (in_array($campo, ['e_cliente', 'e_potencial', 'e_fornecedor', 'em_venda', 'em_compra', 'em_aluguer', 'na_loja', 'loja_destaque'], true)) {
            return $valor === null ? '—' : ($valor ? 'Sim' : 'Não');
        }
        if ($campo === 'categoria_id') {
            return $valor === null ? '—' : (Categoria::find($valor)?->nome ?? "#{$valor}");
        }
        if ($campo === 'activo') {
            return $valor === null ? '—' : ($valor ? 'Aberto' : 'Encerrado');
        }
        if ($campo === 'active') {
            return $valor === null ? '—' : ($valor ? 'Activo' : 'Inactivo');
        }

        return $valor === null || $valor === '' ? '—' : (string) $valor;
    }
}
