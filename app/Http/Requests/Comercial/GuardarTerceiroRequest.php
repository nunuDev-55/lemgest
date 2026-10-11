<?php

namespace App\Http\Requests\Comercial;

use App\Support\Opcoes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class GuardarTerceiroRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // permissão verificada na rota
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nuit' => $this->filled('nuit') ? preg_replace('/\D/', '', (string) $this->input('nuit')) : null,
            'e_cliente' => $this->boolean('e_cliente'),
            'e_potencial' => $this->boolean('e_potencial'),
            'e_fornecedor' => $this->boolean('e_fornecedor'),
            'sujeito_iva' => $this->boolean('sujeito_iva'),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $telefone = ['nullable', 'string', 'max:30', 'regex:/^[+\d\s()\-]{6,30}$/'];

        return [
            'nome' => ['required', 'string', 'max:190'],
            'nome_alternativo' => ['nullable', 'string', 'max:190'],
            'e_cliente' => ['boolean'],
            'e_potencial' => ['boolean'],
            'e_fornecedor' => ['boolean'],
            'tipo_entidade' => ['nullable', Rule::in(array_keys(Opcoes::TIPOS_ENTIDADE))],
            'nuit' => ['nullable', 'digits:9'],
            'sujeito_iva' => ['boolean'],
            'morada' => ['nullable', 'string', 'max:255'],
            'codigo_postal' => ['nullable', 'string', 'max:20'],
            'cidade' => ['nullable', 'string', 'max:100'],
            'provincia' => ['nullable', Rule::in(array_keys(Opcoes::PROVINCIAS))],
            'pais' => ['required', Rule::in(array_keys(Opcoes::PAISES))],
            'telefone' => $telefone,
            'telemovel' => $telefone,
            'email' => ['nullable', 'email', 'max:190'],
            'website' => ['nullable', 'string', 'max:190'],
            'termos_pagamento' => ['required', Rule::in(array_keys(Opcoes::TERMOS_PAGAMENTO))],
            'metodo_pagamento' => ['nullable', Rule::in(array_keys(Opcoes::METODOS_PAGAMENTO))],
            'nota_publica' => ['nullable', 'string', 'max:5000'],
            'nota_privada' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator) {
                if (! $this->boolean('e_cliente') && ! $this->boolean('e_potencial') && ! $this->boolean('e_fornecedor')) {
                    $validator->errors()->add('e_cliente', 'Indique se é cliente, potencial cliente e/ou fornecedor.');
                }
                if (in_array($this->input('tipo_entidade'), ['empresa', 'estado', 'ong'], true) && $this->input('pais') === 'MZ' && ! $this->filled('nuit')) {
                    $validator->errors()->add('nuit', 'Empresas, Estado e ONG moçambicanas precisam de NUIT para serem facturadas.');
                }
            },
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'nome' => 'nome do terceiro',
            'nuit' => 'NUIT',
            'pais' => 'país',
            'provincia' => 'província',
            'termos_pagamento' => 'termos de pagamento',
            'metodo_pagamento' => 'método de pagamento',
            'telemovel' => 'telemóvel',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'nuit.digits' => 'O NUIT tem 9 dígitos.',
            'telefone.regex' => 'Telefone inválido.',
            'telemovel.regex' => 'Telemóvel inválido.',
        ];
    }
}
