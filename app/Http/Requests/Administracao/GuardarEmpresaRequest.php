<?php

namespace App\Http\Requests\Administracao;

use App\Support\Opcoes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GuardarEmpresaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // permissão verificada na rota
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'nuit' => $this->filled('nuit') ? preg_replace('/\D/', '', (string) $this->input('nuit')) : null,
            'remover_logotipo' => $this->boolean('remover_logotipo'),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $telefone = ['nullable', 'string', 'max:30', 'regex:/^[+\d\s()\-]{6,30}$/'];

        return [
            'nome' => ['required', 'string', 'max:190'],
            'nome_comercial' => ['nullable', 'string', 'max:190'],
            'forma_juridica' => ['nullable', Rule::in(array_keys(Opcoes::FORMAS_JURIDICAS))],
            'nuit' => ['nullable', 'digits:9'],
            'nuel' => ['nullable', 'string', 'max:30'],
            'capital_social' => ['nullable', 'string', 'max:50'],
            'actividade' => ['nullable', 'string', 'max:190'],
            'morada' => ['nullable', 'string', 'max:255'],
            'cidade' => ['nullable', 'string', 'max:100'],
            'provincia' => ['nullable', Rule::in(array_keys(Opcoes::PROVINCIAS))],
            'pais' => ['required', Rule::in(array_keys(Opcoes::PAISES))],
            'telefone' => $telefone,
            'telemovel' => $telefone,
            'email' => ['nullable', 'email', 'max:190'],
            'website' => ['nullable', 'string', 'max:190'],
            // Sem SVG: um SVG pode trazer código que corre no navegador
            'logotipo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048', 'dimensions:max_width=4000,max_height=4000'],
            'remover_logotipo' => ['boolean'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'nome' => 'nome da empresa',
            'nuit' => 'NUIT',
            'nuel' => 'NUEL',
            'pais' => 'país',
            'provincia' => 'província',
            'telemovel' => 'telemóvel',
            'logotipo' => 'logótipo',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'nuit.digits' => 'O NUIT tem 9 dígitos.',
            'telefone.regex' => 'Telefone inválido.',
            'telemovel.regex' => 'Telemóvel inválido.',
            'logotipo.mimes' => 'O logótipo tem de ser PNG, JPG ou WebP.',
            'logotipo.max' => 'O logótipo não pode passar de 2 MB.',
        ];
    }
}
