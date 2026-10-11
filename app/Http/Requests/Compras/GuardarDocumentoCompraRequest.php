<?php

namespace App\Http\Requests\Compras;

use App\Models\FacturaFornecedor;
use App\Support\Opcoes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Cabeçalho de uma encomenda a fornecedor ou de uma factura de fornecedor. */
class GuardarDocumentoCompraRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // permissão verificada na rota
    }

    private function eFactura(): bool
    {
        return $this->routeIs('facturas-fornecedor.*');
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $comuns = [
            'terceiro_id' => ['required', 'integer', Rule::exists('terceiros', 'id')],
            'data' => ['required', 'date'],
            'termos_pagamento' => ['required', Rule::in(array_keys(Opcoes::TERMOS_PAGAMENTO))],
            'metodo_pagamento' => ['nullable', Rule::in(array_keys(Opcoes::METODOS_PAGAMENTO))],
            'nota_privada' => ['nullable', 'string', 'max:5000'],
        ];

        if ($this->eFactura()) {
            /** @var FacturaFornecedor|null $actual */
            $actual = $this->route('facturaFornecedor');

            return [
                ...$comuns,
                // O mesmo nº de factura do mesmo fornecedor não pode ser lançado duas vezes
                'ref_fornecedor' => [
                    'required', 'string', 'max:60',
                    Rule::unique('facturas_fornecedor', 'ref_fornecedor')->where('terceiro_id', $this->integer('terceiro_id'))->ignore($actual?->id),
                ],
            ];
        }

        return [
            ...$comuns,
            'data_entrega' => ['nullable', 'date', 'after_or_equal:data'],
            'ref_fornecedor' => ['nullable', 'string', 'max:60'],
            'nota_publica' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'terceiro_id' => 'fornecedor',
            'data_entrega' => 'data prevista de entrega',
            'ref_fornecedor' => $this->eFactura() ? 'nº da factura do fornecedor' : 'referência do fornecedor',
            'termos_pagamento' => 'termos de pagamento',
            'metodo_pagamento' => 'método de pagamento',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'ref_fornecedor.unique' => 'Esta factura deste fornecedor já foi lançada.',
            'ref_fornecedor.required' => 'Indique o número da factura do fornecedor (vem no documento que ele entregou).',
        ];
    }
}
