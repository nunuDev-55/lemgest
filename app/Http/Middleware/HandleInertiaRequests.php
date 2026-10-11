<?php

namespace App\Http\Middleware;

use App\Support\Definicoes;
use App\Support\Permissoes;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // Utilizador da equipa (guarda "web"); os clientes da loja vão em "cliente", mais abaixo
        $user = $request->user('web');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user?->only(['id', 'name', 'email', 'phone', 'avatar']),
                'perfil' => $user?->getRoleNames()->first(),
                // O frontend usa esta lista para mostrar ou esconder menus e botões.
                // A protecção verdadeira está sempre no backend (rotas e controladores).
                'permissoes' => $user === null ? [] : ($user->isAdministrador()
                    ? Permissoes::todas()
                    : $user->getAllPermissions()->pluck('name')->values()->all()),
            ],
            // Área do cliente: quem entrou e os dados públicos da LemServ (só nas páginas /conta)
            'cliente' => fn () => $request->is('conta', 'conta/*') ? Auth::guard('cliente')->user()?->only(['id', 'nome', 'email']) : null,
            'loja' => fn () => $request->is('conta', 'conta/*') ? Arr::only(app(Definicoes::class)->empresa(), ['nome', 'nome_comercial', 'telemovel', 'telefone', 'email', 'logotipo']) : null,
            'flash' => [
                'sucesso' => fn () => $request->session()->get('sucesso'),
                'erro' => fn () => $request->session()->get('erro'),
            ],
        ];
    }
}
