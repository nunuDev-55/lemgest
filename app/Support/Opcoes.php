<?php

namespace App\Support;

/**
 * Listas fixas usadas nos formulários (equivalente aos "dicionários" do Dolibarr).
 */
final class Opcoes
{
    /** código => [rótulo, dias até ao vencimento] */
    public const TERMOS_PAGAMENTO = [
        'pronto' => ['Pronto pagamento', 0],
        '7d' => ['7 dias', 7],
        '15d' => ['15 dias', 15],
        '30d' => ['30 dias', 30],
        '45d' => ['45 dias', 45],
        '60d' => ['60 dias', 60],
        '90d' => ['90 dias', 90],
    ];

    public const METODOS_PAGAMENTO = [
        'numerario' => 'Numerário',
        'mpesa' => 'M-Pesa',
        'emola' => 'e-Mola',
        'mkesh' => 'mKesh',
        'transferencia' => 'Transferência bancária',
        'cartao' => 'Cartão (POS)',
        'cheque' => 'Cheque',
    ];

    public const TIPOS_ENTIDADE = [
        'particular' => 'Particular',
        'empresa' => 'Empresa',
        'estado' => 'Estado / instituição pública',
        'ong' => 'ONG',
    ];

    /** Formas jurídicas do Código Comercial moçambicano */
    public const FORMAS_JURIDICAS = [
        'eni' => 'Empresário em nome individual',
        'lda' => 'Sociedade por quotas (Lda)',
        'su_lda' => 'Sociedade unipessoal por quotas (SU, Lda)',
        'sa' => 'Sociedade anónima (SA)',
        'outra' => 'Outra',
    ];

    /** ISO 3166-2:MZ */
    public const PROVINCIAS = [
        'MZ-MPM' => 'Maputo Cidade',
        'MZ-L' => 'Maputo Província',
        'MZ-G' => 'Gaza',
        'MZ-I' => 'Inhambane',
        'MZ-S' => 'Sofala',
        'MZ-B' => 'Manica',
        'MZ-T' => 'Tete',
        'MZ-Q' => 'Zambézia',
        'MZ-N' => 'Nampula',
        'MZ-P' => 'Cabo Delgado',
        'MZ-A' => 'Niassa',
    ];

    public const PAISES = [
        'MZ' => 'Moçambique',
        'ZA' => 'África do Sul',
        'SZ' => 'Essuatíni',
        'ZW' => 'Zimbabué',
        'MW' => 'Malawi',
        'TZ' => 'Tanzânia',
        'ZM' => 'Zâmbia',
        'PT' => 'Portugal',
        'BR' => 'Brasil',
        'AO' => 'Angola',
        'CN' => 'China',
        'AE' => 'Emirados Árabes Unidos',
    ];

    /** Taxas de IVA em vigor em Moçambique */
    public const TAXAS_IVA = ['16.00' => '16%', '5.00' => '5%', '0.00' => '0% (isento)'];

    public const UNIDADES = [
        'un' => 'Unidade',
        'h' => 'Hora',
        'dia' => 'Dia',
        'kg' => 'Quilograma',
        'm' => 'Metro',
        'm2' => 'Metro quadrado',
        'cx' => 'Caixa',
        'srv' => 'Serviço',
    ];

    /**
     * Converte uma lista código => rótulo no formato usado pelos selects do frontend.
     *
     * @param  array<string, string|array{0: string, 1: int}>  $lista
     * @return list<array{valor: string, label: string}>
     */
    public static function paraSelect(array $lista): array
    {
        $saida = [];
        foreach ($lista as $valor => $label) {
            $saida[] = ['valor' => (string) $valor, 'label' => is_array($label) ? $label[0] : $label];
        }

        return $saida;
    }

    /** Todas as listas de uma vez, para enviar aos formulários. */
    public static function todas(): array
    {
        return [
            'termosPagamento' => self::paraSelect(self::TERMOS_PAGAMENTO),
            'metodosPagamento' => self::paraSelect(self::METODOS_PAGAMENTO),
            'tiposEntidade' => self::paraSelect(self::TIPOS_ENTIDADE),
            'provincias' => self::paraSelect(self::PROVINCIAS),
            'paises' => self::paraSelect(self::PAISES),
            'taxasIva' => self::paraSelect(self::TAXAS_IVA),
            'unidades' => self::paraSelect(self::UNIDADES),
        ];
    }
}
