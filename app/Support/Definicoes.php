<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Configuração guardada na tabela `definicoes` (dados da empresa, textos dos documentos...).
 *
 * Enquanto uma chave não for gravada vale o valor inicial (config/lemgest.php).
 * Registada como "scoped" no AppServiceProvider: a tabela é lida uma vez por pedido.
 */
class Definicoes
{
    /** Chaves aceites e o seu valor inicial */
    public static function iniciais(): array
    {
        $empresa = config('lemgest.empresa');

        // Um valor vazio no .env (EMPRESA_NUIT=) conta como "não preenchido"
        return array_map(fn ($v) => blank($v) ? null : (string) $v, [
            'empresa.nome' => $empresa['nome'],
            'empresa.nome_comercial' => $empresa['nome_comercial'] ?? null,
            'empresa.forma_juridica' => $empresa['forma_juridica'] ?? null,
            'empresa.nuit' => $empresa['nuit'],
            'empresa.nuel' => null,
            'empresa.capital_social' => null,
            'empresa.actividade' => $empresa['actividade'] ?? null,
            'empresa.morada' => $empresa['morada'],
            'empresa.cidade' => $empresa['cidade'] ?? null,
            'empresa.provincia' => $empresa['provincia'],
            'empresa.pais' => 'MZ',
            'empresa.telefone' => $empresa['telefone'],
            'empresa.telemovel' => null,
            'empresa.email' => $empresa['email'],
            'empresa.website' => null,
            'empresa.logotipo' => null,
            'documentos.dados_pagamento' => $empresa['banco'],
            'documentos.rodape_factura' => null,
            'documentos.rodape_orcamento' => 'Orçamento sujeito a confirmação. Para aceitar, assine e devolva este documento ou responda por e-mail/WhatsApp.',
            'documentos.rodape_encomenda' => null,
            'documentos.validade_orcamento' => '30',
            'reservas.transporte_minimo' => '3000',
            'reservas.transporte_maximo' => '5000',
        ]);
    }

    /** @var array<string, string|null>|null */
    private ?array $valores = null;

    /** @return array<string, string|null> */
    public function todas(): array
    {
        return $this->valores ??= array_replace(
            self::iniciais(),
            DB::table('definicoes')->pluck('valor', 'chave')->all(),
        );
    }

    public function obter(string $chave, ?string $omissao = null): ?string
    {
        return $this->todas()[$chave] ?? $omissao;
    }

    /**
     * Grava os valores e devolve só os que mudaram: chave => [antes, depois].
     *
     * @param  array<string, string|null>  $valores
     * @return array<string, array{0: string|null, 1: string|null}>
     */
    public function guardar(array $valores): array
    {
        $actuais = $this->todas();
        $mudaram = [];

        foreach ($valores as $chave => $valor) {
            if (! array_key_exists($chave, self::iniciais())) {
                throw new \InvalidArgumentException("Definição desconhecida: {$chave}");
            }
            $valor = $valor === null || trim($valor) === '' ? null : trim($valor);
            if ($valor !== ($actuais[$chave] ?? null)) {
                $mudaram[$chave] = [$actuais[$chave] ?? null, $valor];
            }
        }

        if ($mudaram !== []) {
            $agora = now();
            DB::table('definicoes')->upsert(
                collect($mudaram)->map(fn ($par, $chave) => ['chave' => $chave, 'valor' => $par[1], 'created_at' => $agora, 'updated_at' => $agora])->values()->all(),
                ['chave'],
                ['valor', 'updated_at'],
            );
            $this->valores = null;
        }

        return $mudaram;
    }

    /** Dados da empresa para o cabeçalho e o rodapé dos documentos impressos. */
    public function empresa(): array
    {
        $d = $this->todas();
        $provincia = $d['empresa.provincia'];

        return [
            'nome' => $d['empresa.nome'],
            'nome_comercial' => $d['empresa.nome_comercial'],
            'forma_juridica' => Opcoes::FORMAS_JURIDICAS[$d['empresa.forma_juridica'] ?? ''] ?? null,
            'nuit' => $d['empresa.nuit'],
            'nuel' => $d['empresa.nuel'],
            'capital_social' => $d['empresa.capital_social'],
            'morada' => $d['empresa.morada'],
            'cidade' => $d['empresa.cidade'],
            // Aceita o código (MZ-L) e, por compatibilidade, o nome que vinha da configuração inicial
            'provincia' => $provincia ? (Opcoes::PROVINCIAS[$provincia] ?? $provincia) : null,
            'pais' => Opcoes::PAISES[$d['empresa.pais'] ?? 'MZ'] ?? $d['empresa.pais'],
            'telefone' => $d['empresa.telefone'],
            'telemovel' => $d['empresa.telemovel'],
            'email' => $d['empresa.email'],
            'website' => $d['empresa.website'],
            'logotipo' => $this->urlLogotipo(),
            'dados_pagamento' => $d['documentos.dados_pagamento'],
        ];
    }

    /** Texto livre do fim de cada tipo de documento (factura, orcamento, encomenda). */
    public function rodape(string $tipo): ?string
    {
        return $this->obter("documentos.rodape_{$tipo}");
    }

    public function validadeOrcamento(): int
    {
        return max(1, (int) $this->obter('documentos.validade_orcamento', '30'));
    }

    /** @return array{minimo: string, maximo: string} Intervalo da taxa de transporte das reservas (MT, sem IVA) */
    public function transporte(): array
    {
        $minimo = number_format((float) $this->obter('reservas.transporte_minimo', '3000'), 2, '.', '');
        $maximo = number_format((float) $this->obter('reservas.transporte_maximo', '5000'), 2, '.', '');

        return ['minimo' => $minimo, 'maximo' => max($minimo, $maximo)];
    }

    /** Logótipo carregado pela empresa ou, se não houver, o logótipo original da LemServ. */
    public function urlLogotipo(): string
    {
        $caminho = $this->obter('empresa.logotipo');

        return $caminho ? '/empresa/logotipo?v='.substr(md5($caminho), 0, 8) : '/img/lemservices-logo.png';
    }

    /** Campos em falta que o Início deve assinalar ao administrador. */
    public function emFalta(): array
    {
        $d = $this->todas();

        return array_keys(array_filter([
            'NUIT' => blank($d['empresa.nuit']),
            'morada' => blank($d['empresa.morada']),
            'telefone' => blank($d['empresa.telefone']) && blank($d['empresa.telemovel']),
        ]));
    }
}
