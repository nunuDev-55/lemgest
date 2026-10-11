<?php

namespace App\Http\Requests\Administracao;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Validação comum a criar e a editar um utilizador. */
class GuardarUtilizadorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // a permissão já é verificada na rota (can:utilizadores.gerir)
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var User|null $utilizador */
        $utilizador = $this->route('utilizador');
        $aEditar = $utilizador !== null;

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:190', Rule::unique('users', 'email')->ignore($utilizador?->id)],
            'phone' => ['nullable', 'string', 'regex:/^(\+?258)?\s?8[2-7]\s?\d{3}\s?\d{4}$/'],
            'perfil' => ['required', 'string', Rule::exists('roles', 'name')->where('guard_name', 'web')],
            'password' => [$aEditar ? 'nullable' : 'required', 'confirmed', Password::defaults()],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'name' => 'nome',
            'email' => 'e-mail',
            'phone' => 'telefone',
            'perfil' => 'perfil',
            'password' => 'senha',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'phone.regex' => 'Indique um número moçambicano válido, por exemplo 84 123 4567.',
        ];
    }
}
