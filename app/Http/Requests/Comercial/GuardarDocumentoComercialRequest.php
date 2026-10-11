<?php

namespace App\Http\Requests\Comercial;

use App\Support\Opcoes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Cabeçalho de orçamentos e encomendas (criar e modificar). */
class GuardarDocumentoComercialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $orcamento = $this->routeIs('orcamentos.*');

        return [
            'terceiro_id' => ['required', 'integer', Rule::exists('terceiros', 'id')],
            'data' => ['required', 'date'],
            'validade_dias' => $orcamento ? ['required', 'integer', 'min:1', 'max:365'] : ['prohibited'],
            'data_entrega' => ['nullable', 'date', 'after_or_equal:data'],
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
            'validade_dias' => 'duração da validade',
            'data_entrega' => 'data de entrega',
            'termos_pagamento' => 'termos de pagamento',
            'metodo_pagamento' => 'método de pagamento',
            'ref_cliente' => 'referência do cliente',
        ];
    }
}
