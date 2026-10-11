<?php

namespace App\Http\Requests\Comercial;

use Illuminate\Foundation\Http\FormRequest;

class GuardarContactoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['activo' => $this->has('activo') ? $this->boolean('activo') : true]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $telefone = ['nullable', 'string', 'max:30', 'regex:/^[+\d\s()\-]{6,30}$/'];

        return [
            'nome' => ['required', 'string', 'max:190'],
            'cargo' => ['nullable', 'string', 'max:120'],
            'telefone' => $telefone,
            'telemovel' => $telefone,
            'email' => ['nullable', 'email', 'max:190'],
            'nota' => ['nullable', 'string', 'max:2000'],
            'activo' => ['boolean'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['nome' => 'nome', 'telemovel' => 'telemóvel'];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['telefone.regex' => 'Telefone inválido.', 'telemovel.regex' => 'Telemóvel inválido.'];
    }
}
