<?php

namespace App\Http\Requests\Facturacao;

use App\Support\Opcoes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Cabeçalho da factura (criar e modificar rascunho). */
class GuardarFacturaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'terceiro_id' => ['required', 'integer', Rule::exists('terceiros', 'id')],
            'data' => ['required', 'date', 'before_or_equal:'.now()->addYear()->toDateString()],
            'termos_pagamento' => ['required', Rule::in(array_keys(Opcoes::TERMOS_PAGAMENTO))],
            'metodo_pagamento' => ['nullable', Rule::in(array_keys(Opcoes::METODOS_PAGAMENTO))],
            'ref_cliente' => ['nullable', 'string', 'max:100'],
            'nota_publica' => ['nullable', 'string', 'max:5000'],
            'nota_privada' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'terceiro_id' => 'cliente',
            'data' => 'data da factura',
            'termos_pagamento' => 'termos de pagamento',
            'metodo_pagamento' => 'método de pagamento',
            'ref_cliente' => 'nº requisição',
        ];
    }
}
