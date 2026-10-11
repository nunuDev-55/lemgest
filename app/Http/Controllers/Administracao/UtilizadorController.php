<?php

namespace App\Http\Controllers\Administracao;

use App\Http\Controllers\Controller;
use App\Http\Requests\Administracao\GuardarUtilizadorRequest;
use App\Models\User;
use App\Services\UtilizadorService;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UtilizadorController extends Controller
{
    public function __construct(private readonly UtilizadorService $service) {}

    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'pesquisa' => ['nullable', 'string', 'max:100'],
            'perfil' => ['nullable', 'string', 'max:50'],
            'estado' => ['nullable', 'in:activos,inactivos'],
        ]);

        $utilizadores = User::query()
            ->with('roles:id,name')
            ->when($filtros['pesquisa'] ?? null, function ($query, string $texto) {
                $termo = Pesquisa::like($texto);
                $query->where(fn ($q) => $q->where('name', 'like', $termo)
                    ->orWhere('email', 'like', $termo)
                    ->orWhere('phone', 'like', $termo));
            })
            ->when($filtros['perfil'] ?? null, fn ($query, string $perfil) => $query->role($perfil))
            ->when($filtros['estado'] ?? null, fn ($query, string $estado) => $query->where('active', $estado === 'activos'))
            ->orderBy('name')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'active' => $u->active,
                'perfil' => $u->roles->first()?->name,
                'last_login_at' => $u->last_login_at?->toIso8601String(),
            ]);

        return Inertia::render('administracao/utilizadores/index', [
            'utilizadores' => $utilizadores,
            'filtros' => (object) $filtros,
            'perfis' => Role::orderBy('name')->pluck('name'),
            'resumo' => [
                'total' => User::count(),
                'activos' => User::where('active', true)->count(),
                'inactivos' => User::where('active', false)->count(),
            ],
        ]);
    }

    public function store(GuardarUtilizadorRequest $request): RedirectResponse
    {
        $user = $this->service->criar($request->validated());

        return back()->with('sucesso', "Utilizador {$user->name} criado.");
    }

    public function update(GuardarUtilizadorRequest $request, User $utilizador): RedirectResponse
    {
        $this->service->actualizar($utilizador, $request->validated());

        return back()->with('sucesso', 'Alterações guardadas.');
    }

    public function alternarEstado(Request $request, User $utilizador): RedirectResponse
    {
        $this->service->alternarEstado($utilizador, $request->user());

        return back()->with('sucesso', $utilizador->active
            ? "{$utilizador->name} foi activado."
            : "{$utilizador->name} foi desactivado e as suas sessões foram terminadas.");
    }
}
