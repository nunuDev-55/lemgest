<?php

namespace App\Http\Requests\Facturacao;

use App\Http\Requests\Comercial\GuardarProdutoRequest;
use App\Support\Opcoes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegistarPagamentoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['valor' => GuardarProdutoRequest::numero($this->input('valor'))]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'data' => ['required', 'date', 'before_or_equal:today'],
            'metodo' => ['required', Rule::in(array_keys(Opcoes::METODOS_PAGAMENTO))],
            'valor' => ['required', 'numeric', 'gt:0'],
            'numero_documento' => ['nullable', 'string', 'max:60'],
            'remetente' => ['nullable', 'string', 'max:120'],
            'comentario' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['metodo' => 'método de pagamento', 'numero_documento' => 'número', 'valor' => 'montante'];
    }
}
