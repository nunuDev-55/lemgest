<?php

namespace App\Http\Controllers\Conta;

use App\Http\Controllers\Controller;
use App\Services\ContasCliente;
use App\Support\Opcoes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/** Registo de clientes: o pedido fica à espera de aprovação da LemServ (D7) */
class RegistoController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('conta/registar', [
            'provincias' => Opcoes::paraSelect(Opcoes::PROVINCIAS),
        ]);
    }

    public function store(Request $request, ContasCliente $contas): RedirectResponse
    {
        $request->merge([
            'telemovel' => self::telemovel((string) $request->input('telemovel')),
            'nuit' => preg_replace('/\D/', '', (string) $request->input('nuit')) ?: null,
            'email' => mb_strtolower(trim((string) $request->input('email'))),
        ]);

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:190'],
            'telemovel' => ['required', 'regex:/^\+258 8[2-7] \d{3} \d{4}$/'],
            'email' => ['required', 'email', 'max:190', Rule::unique('contas_cliente', 'email')],
            'nuit' => ['nullable', 'digits:9'],
            'provincia' => ['required', Rule::in(array_keys(Opcoes::PROVINCIAS))],
            'cidade' => ['required', 'string', 'max:100'],
            'bairro' => ['nullable', 'string', 'max:100'],
            'morada' => ['nullable', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ], [
            'telemovel.regex' => 'Escreva um número de telemóvel de Moçambique, por exemplo 84 123 4567.',
            'email.unique' => 'Já existe uma conta com este e-mail. Entre, ou peça uma senha nova.',
            'nuit.digits' => 'O NUIT tem 9 dígitos.',
        ], [
            'telemovel' => 'telemóvel', 'provincia' => 'província', 'morada' => 'rua e número', 'password' => 'senha',
        ]);

        $contas->registar($dados);

        return to_route('conta.entrar')->with('status', 'Pedido de conta enviado. A LemServ vai confirmar os seus dados e depois já pode entrar.');
    }

    /** "84 123 4567", "+258841234567" ou "258 84 123 4567" → "+258 84 123 4567" (outros formatos ficam como estão) */
    public static function telemovel(string $numero): string
    {
        $digitos = preg_replace('/\D/', '', $numero);
        if (strlen($digitos) === 12 && str_starts_with($digitos, '258')) {
            $digitos = substr($digitos, 3);
        }

        return strlen($digitos) === 9
            ? '+258 '.substr($digitos, 0, 2).' '.substr($digitos, 2, 3).' '.substr($digitos, 5)
            : trim($numero);
    }
}
