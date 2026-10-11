<?php

namespace App\Http\Requests\Facturacao;

use App\Http\Requests\Comercial\GuardarProdutoRequest;
use App\Support\Opcoes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GuardarLinhaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $dados = [];
        foreach (['quantidade', 'preco_unitario', 'desconto'] as $campo) {
            if ($this->filled($campo)) {
                $dados[$campo] = GuardarProdutoRequest::numero($this->input($campo));
            }
        }
        $this->merge($dados);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $aEditar = $this->route('linha') !== null;

        return [
            'produto_id' => ['nullable', 'integer', Rule::exists('produtos', 'id')],
            'descricao' => [$aEditar ? 'required' : 'required_without:produto_id', 'nullable', 'string', 'max:2000'],
            'quantidade' => ['required', 'numeric', 'gt:0', 'max:99999999'],
            'preco_unitario' => [$aEditar ? 'required' : 'required_without:produto_id', 'nullable', 'numeric', 'min:0', 'max:9999999999'],
            'desconto' => ['nullable', 'numeric', 'min:0', 'max:100'],
            // Só os documentos com dias (reservas) o usam
            'dias' => ['nullable', 'integer', 'min:1', 'max:365'],
            'taxa_iva' => [$aEditar ? 'required' : 'required_without:produto_id', 'nullable', Rule::in(array_keys(Opcoes::TAXAS_IVA))],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['descricao' => 'descrição', 'preco_unitario' => 'preço unitário', 'taxa_iva' => 'IVA', 'produto_id' => 'produto'];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'descricao.required_without' => 'Escolha um produto ou escreva uma descrição.',
            'preco_unitario.required_without' => 'Indique o preço unitário.',
            'taxa_iva.required_without' => 'Escolha a taxa de IVA.',
        ];
    }
}
