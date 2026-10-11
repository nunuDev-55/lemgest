<?php

namespace App\Http\Requests\Comercial;

use App\Support\Opcoes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GuardarProdutoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $servico = $this->input('tipo') === 'servico';

        $this->merge([
            'em_venda' => $this->boolean('em_venda'),
            'em_compra' => $this->boolean('em_compra'),
            'em_aluguer' => $this->boolean('em_aluguer'),
            'na_loja' => $this->boolean('na_loja'),
            'loja_destaque' => $this->boolean('loja_destaque'),
            'preco' => $this->filled('preco') ? self::numero($this->input('preco')) : null,
            'preco_compra' => $this->filled('preco_compra') ? self::numero($this->input('preco_compra')) : null,
            'preco_aluguer' => $this->filled('preco_aluguer') ? self::numero($this->input('preco_aluguer')) : null,
            // Um serviço não tem quantidade em armazém
            'quantidade_total' => $servico ? 0 : ($this->filled('quantidade_total') ? self::numero($this->input('quantidade_total')) : 0),
            'loja_ordem' => $this->filled('loja_ordem') ? $this->input('loja_ordem') : 0,
            'categoria_id' => $this->filled('categoria_id') ? $this->input('categoria_id') : null,
        ]);
    }

    /** Aceita "1 500,50" ou "1500.50" */
    public static function numero(mixed $valor): mixed
    {
        if (! is_string($valor)) {
            return $valor;
        }
        $limpo = str_replace([' ', "\u{00A0}"], '', trim($valor));
        if (str_contains($limpo, ',')) {
            $limpo = str_replace(['.', ','], ['', '.'], $limpo);
        }

        return $limpo;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $produto = $this->route('produto');

        return [
            'referencia' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9_.\-\/]+$/', Rule::unique('produtos', 'referencia')->ignore($produto?->id)],
            'tipo' => ['required', Rule::in(['produto', 'servico'])],
            'nome' => ['required', 'string', 'max:190'],
            'categoria_id' => ['nullable', 'integer', Rule::exists('categorias', 'id')],
            'descricao' => ['nullable', 'string', 'max:5000'],
            'taxa_iva' => ['required', Rule::in(array_keys(Opcoes::TAXAS_IVA))],
            'unidade' => ['required', Rule::in(array_keys(Opcoes::UNIDADES))],
            'em_aluguer' => ['boolean'],
            'preco_aluguer' => ['nullable', 'required_if_accepted:em_aluguer', 'numeric', 'min:0', 'max:9999999999'],
            'quantidade_total' => ['integer', 'min:0', 'max:1000000'],
            'em_venda' => ['boolean'],
            'preco' => ['nullable', 'required_if_accepted:em_venda', 'numeric', 'min:0', 'max:9999999999'],
            'em_compra' => ['boolean'],
            'preco_compra' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'na_loja' => ['boolean'],
            'loja_destaque' => ['boolean'],
            'loja_ordem' => ['integer', 'min:0', 'max:9999'],
            'loja_descricao' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** O preço de venda nunca fica vazio na base de dados (vale 0 se o produto só se aluga) */
    public function dados(): array
    {
        $dados = $this->validated();
        $dados['preco'] ??= '0';

        return $dados;
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'referencia' => 'referência',
            'categoria_id' => 'categoria',
            'preco' => 'preço de venda',
            'taxa_iva' => 'taxa de IVA',
            'preco_compra' => 'preço de compra',
            'preco_aluguer' => 'preço por dia',
            'quantidade_total' => 'quantidade',
            'loja_ordem' => 'posição na loja',
            'loja_descricao' => 'descrição para o cliente',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'referencia.regex' => 'A referência só pode ter letras, números e os sinais - _ . /, sem espaços.',
            'preco_aluguer.required_if_accepted' => 'Indique o preço por dia (o produto está marcado para aluguer).',
            'preco.required_if_accepted' => 'Indique o preço de venda (o produto está marcado para venda).',
            'quantidade_total.integer' => 'A quantidade tem de ser um número inteiro.',
        ];
    }
}
