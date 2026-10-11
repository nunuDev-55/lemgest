<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Permissoes;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Mostra o registo, que só existe no primeiro acesso: cria a conta do administrador.
     * Depois disso, os utilizadores são criados pelo administrador dentro do sistema.
     */
    public function create(): Response|RedirectResponse
    {
        if (User::exists()) {
            return to_route('login');
        }

        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        abort_if(User::exists(), 403, 'O registo só está disponível no primeiro acesso.');

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        // O primeiro utilizador é o administrador do sistema.
        Permissoes::sincronizar();
        $user->assignRole(Permissoes::ADMINISTRADOR);

        event(new Registered($user));

        Auth::login($user);

        return to_route('dashboard');
    }
}
