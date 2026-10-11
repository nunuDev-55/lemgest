<?php

namespace App\Http\Controllers\Administracao;

use App\Http\Controllers\Controller;
use App\Models\ContaCliente;
use App\Support\Permissoes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class PerfilController extends Controller
{
    public function index(): Response
    {
        $perfis = Role::query()
            ->where('guard_name', 'web')
            ->with('permissions:id,name')
            ->withCount('users')
            ->orderByRaw('name = ? desc', [Permissoes::ADMINISTRADOR])
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'utilizadores' => $role->users_count,
                'permissoes' => $role->permissions->pluck('name')->values(),
                'sistema' => Permissoes::eDeSistema($role->name),
                'acessoTotal' => $role->name === Permissoes::ADMINISTRADOR,
                'cliente' => false,
            ]);

        // Perfil Cliente: vale para todas as contas de clientes aprovadas da loja
        $procurar = fn () => Role::where('name', Permissoes::CLIENTE)->where('guard_name', Permissoes::GUARDA_CLIENTE)->with('permissions:id,name')->first();
        $cliente = $procurar();
        if ($cliente === null) {
            Permissoes::sincronizar();
            $cliente = $procurar();
        }
        $perfis->push([
            'id' => $cliente->id,
            'name' => $cliente->name,
            'utilizadores' => ContaCliente::where('estado', ContaCliente::ACTIVA)->count(),
            'permissoes' => $cliente->permissions->pluck('name')->values(),
            'sistema' => true,
            'acessoTotal' => false,
            'cliente' => true,
        ]);

        $paraEcra = fn (array $catalogo) => collect($catalogo)->map(fn (array $modulo, string $chave) => [
            'chave' => $chave,
            'label' => $modulo['label'],
            'permissoes' => collect($modulo['permissoes'])
                ->map(fn (string $label, string $nome) => ['nome' => $nome, 'label' => $label])
                ->values(),
        ])->values();

        return Inertia::render('administracao/perfis/index', [
            'perfis' => $perfis,
            'catalogo' => $paraEcra(Permissoes::CATALOGO),
            'catalogoCliente' => $paraEcra(Permissoes::CATALOGO_CLIENTE),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('roles', 'name')->where('guard_name', 'web'), Rule::notIn([Permissoes::CLIENTE])],
        ], ['name.not_in' => 'Cliente é o perfil das contas da loja. Escolha outro nome.'], ['name' => 'nome do perfil']);

        $role = Role::create(['name' => $dados['name'], 'guard_name' => 'web']);

        activity('perfis')->performedOn($role)->event('created')->log("Perfil criado: {$role->name}");

        return back()->with('sucesso', "Perfil {$role->name} criado. Escolha agora as suas permissões.");
    }

    public function update(Request $request, Role $perfil): RedirectResponse
    {
        abort_if($perfil->name === Permissoes::ADMINISTRADOR, 403, 'O perfil Administrador tem sempre acesso total.');

        $dados = $request->validate([
            'permissoes' => ['present', 'array'],
            'permissoes.*' => ['string', Rule::in($perfil->guard_name === Permissoes::GUARDA_CLIENTE ? Permissoes::todas(Permissoes::CATALOGO_CLIENTE) : Permissoes::todas())],
        ]);

        $antes = $perfil->permissions->pluck('name')->sort()->values()->all();
        $depois = collect($dados['permissoes'])->unique()->sort()->values()->all();

        $perfil->syncPermissions($depois);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        if ($antes !== $depois) {
            activity('perfis')
                ->performedOn($perfil)
                ->event('permissoes')
                ->withProperties([
                    'old' => ['permissoes' => implode(', ', $antes) ?: '(nenhuma)'],
                    'attributes' => ['permissoes' => implode(', ', $depois) ?: '(nenhuma)'],
                ])
                ->log("Permissões do perfil {$perfil->name} alteradas");
        }

        return back()->with('sucesso', "Permissões do perfil {$perfil->name} guardadas.");
    }

    public function destroy(Role $perfil): RedirectResponse
    {
        abort_if(Permissoes::eDeSistema($perfil->name), 403, 'Os perfis do sistema não podem ser apagados.');

        if ($perfil->users()->exists()) {
            return back()->with('erro', "O perfil {$perfil->name} ainda tem utilizadores. Mude-lhes o perfil antes de o apagar.");
        }

        $nome = $perfil->name;
        $perfil->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        activity('perfis')->event('deleted')->withProperties(['perfil' => $nome])->log("Perfil apagado: {$nome}");

        return back()->with('sucesso', "Perfil {$nome} apagado.");
    }
}
