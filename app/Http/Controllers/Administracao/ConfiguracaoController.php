<?php

namespace App\Http\Controllers\Administracao;

use App\Http\Controllers\Controller;
use App\Http\Requests\Administracao\GuardarEmpresaRequest;
use App\Http\Requests\Comercial\GuardarProdutoRequest;
use App\Services\Numeracao;
use App\Support\Definicoes;
use App\Support\Opcoes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** Administração → Configuração: empresa, textos dos documentos e numeração (docs/analise-dolibarr/05-configuracao.md). */
class ConfiguracaoController extends Controller
{
    /** Nome legível de cada série de numeração */
    private const SERIES = [
        'factura' => 'Facturas a clientes',
        'nota_credito' => 'Notas de crédito',
        'orcamento' => 'Orçamentos',
        'encomenda' => 'Encomendas de venda',
        'reserva' => 'Reservas de aluguer',
        'pagamento' => 'Pagamentos recebidos',
        'cliente' => 'Códigos de cliente',
        'fornecedor' => 'Códigos de fornecedor',
        'encomenda_fornecedor' => 'Encomendas a fornecedores',
        'factura_fornecedor' => 'Facturas de fornecedores (nº interno)',
        'pagamento_fornecedor' => 'Pagamentos a fornecedores',
    ];

    public function __construct(private readonly Definicoes $definicoes) {}

    public function empresa(): Response
    {
        $d = $this->definicoes->todas();
        $campos = collect($d)->filter(fn ($v, $chave) => str_starts_with($chave, 'empresa.') && $chave !== 'empresa.logotipo');

        return Inertia::render('administracao/configuracao/empresa', [
            'empresa' => $campos->mapWithKeys(fn ($v, $chave) => [substr($chave, 8) => $v ?? '']),
            'logotipo' => ['url' => $this->definicoes->urlLogotipo(), 'proprio' => filled($d['empresa.logotipo'])],
            'opcoes' => [
                'provincias' => Opcoes::paraSelect(Opcoes::PROVINCIAS),
                'paises' => Opcoes::paraSelect(Opcoes::PAISES),
                'formasJuridicas' => Opcoes::paraSelect(Opcoes::FORMAS_JURIDICAS),
            ],
        ]);
    }

    public function guardarEmpresa(GuardarEmpresaRequest $request): RedirectResponse
    {
        $dados = collect($request->safe()->except(['logotipo', 'remover_logotipo']))
            ->mapWithKeys(fn ($v, $campo) => ["empresa.{$campo}" => $v === null ? null : (string) $v])
            ->all();

        $anterior = $this->definicoes->obter('empresa.logotipo');
        if ($request->hasFile('logotipo')) {
            $dados['empresa.logotipo'] = $request->file('logotipo')->store('empresa', 'local');
        } elseif ($request->boolean('remover_logotipo')) {
            $dados['empresa.logotipo'] = null;
        }

        $mudaram = $this->definicoes->guardar($dados);

        if (array_key_exists('empresa.logotipo', $mudaram) && $anterior) {
            Storage::disk('local')->delete($anterior);
        }

        $this->registar($mudaram, 'Dados da empresa alterados');

        return back()->with('sucesso', $mudaram === [] ? 'Nada foi alterado.' : 'Dados da empresa guardados.');
    }

    public function documentos(): Response
    {
        $d = $this->definicoes->todas();

        return Inertia::render('administracao/configuracao/documentos', [
            'documentos' => [
                'dados_pagamento' => $d['documentos.dados_pagamento'] ?? '',
                'rodape_factura' => $d['documentos.rodape_factura'] ?? '',
                'rodape_orcamento' => $d['documentos.rodape_orcamento'] ?? '',
                'rodape_encomenda' => $d['documentos.rodape_encomenda'] ?? '',
                'validade_orcamento' => $this->definicoes->validadeOrcamento(),
                'transporte_minimo' => $this->definicoes->transporte()['minimo'],
                'transporte_maximo' => $this->definicoes->transporte()['maximo'],
            ],
        ]);
    }

    public function guardarDocumentos(Request $request): RedirectResponse
    {
        foreach (['transporte_minimo', 'transporte_maximo'] as $campo) {
            if ($request->filled($campo)) {
                $request->merge([$campo => GuardarProdutoRequest::numero((string) $request->input($campo))]);
            }
        }
        $dados = $request->validate([
            'dados_pagamento' => ['nullable', 'string', 'max:500'],
            'rodape_factura' => ['nullable', 'string', 'max:500'],
            'rodape_orcamento' => ['nullable', 'string', 'max:500'],
            'rodape_encomenda' => ['nullable', 'string', 'max:500'],
            'validade_orcamento' => ['required', 'integer', 'min:1', 'max:365'],
            'transporte_minimo' => ['sometimes', 'required', 'numeric', 'min:0', 'max:1000000'],
            'transporte_maximo' => ['sometimes', 'required', 'numeric', 'gte:transporte_minimo', 'max:1000000'],
        ], ['transporte_maximo.gte' => 'O máximo não pode ser menor do que o mínimo.'], [
            'dados_pagamento' => 'dados para pagamento',
            'validade_orcamento' => 'validade dos orçamentos',
            'transporte_minimo' => 'taxa mínima de transporte',
            'transporte_maximo' => 'taxa máxima de transporte',
        ]);

        // A taxa de transporte é das reservas; o resto, dos documentos
        $mudaram = $this->definicoes->guardar(
            collect($dados)->mapWithKeys(fn ($v, $campo) => [
                (str_starts_with($campo, 'transporte_') ? 'reservas.' : 'documentos.').$campo => $v === null ? null : (string) $v,
            ])->all(),
        );
        $this->registar($mudaram, 'Textos e opções dos documentos alterados');

        return back()->with('sucesso', $mudaram === [] ? 'Nada foi alterado.' : 'Opções dos documentos guardadas.');
    }

    public function numeracao(): Response
    {
        $ano = (int) now()->format('Y');
        $usados = DB::table('numeracoes')->where('ano', $ano)->pluck('ultimo', 'serie');

        return Inertia::render('administracao/configuracao/numeracao', [
            'ano' => $ano,
            'series' => collect(Numeracao::FORMATOS)->map(function (array $formato, string $serie) use ($ano, $usados) {
                $ultimo = (int) ($usados[$serie] ?? 0);

                return [
                    'serie' => $serie,
                    'nome' => self::SERIES[$serie] ?? $serie,
                    'formato' => $formato[0],
                    'quantos' => $ultimo,
                    'ultimo' => $ultimo > 0 ? Numeracao::formatar($serie, $ano, $ultimo) : null,
                    'proximo' => Numeracao::formatar($serie, $ano, $ultimo + 1),
                ];
            })->values(),
        ]);
    }

    /** O logótipo fica fora da pasta pública e é servido aqui (vai nos documentos impressos e na área do cliente). */
    public function logotipo(): BinaryFileResponse|RedirectResponse
    {
        $caminho = $this->definicoes->obter('empresa.logotipo');

        if (! $caminho || ! Storage::disk('local')->exists($caminho)) {
            return redirect('/img/lemservices-logo.png');
        }

        return response()->file(Storage::disk('local')->path($caminho), [
            'Cache-Control' => 'public, max-age=604800',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** @param array<string, array{0: string|null, 1: string|null}> $mudaram */
    private function registar(array $mudaram, string $descricao): void
    {
        if ($mudaram === []) {
            return;
        }

        $curta = fn (string $chave) => substr($chave, strpos($chave, '.') + 1);
        $texto = fn (string $chave, ?string $v) => $chave === 'empresa.logotipo' ? ($v ? 'carregado' : 'original') : $v;

        activity('configuracao')
            ->event('updated')
            ->withProperties([
                'old' => collect($mudaram)->mapWithKeys(fn ($par, $chave) => [$curta($chave) => $texto($chave, $par[0])])->all(),
                'attributes' => collect($mudaram)->mapWithKeys(fn ($par, $chave) => [$curta($chave) => $texto($chave, $par[1])])->all(),
            ])
            ->log($descricao);
    }
}
