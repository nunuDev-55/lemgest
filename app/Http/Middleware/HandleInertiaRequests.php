<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Loja\PedidoController;
use App\Models\FotoSite;
use App\Support\Definicoes;
use App\Support\Permissoes;
use App\Support\Publico;
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

    /** As páginas públicas (site, catálogo, área do cliente) usam uma página base sem a lista das rotas internas */
    public function rootView(Request $request): string
    {
        return Publico::caminho($request) ? 'loja' : 'app';
    }

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
            // Site, catálogo e área do cliente: quem entrou (conta activa), os contactos públicos da LemServ e a reserva em curso
            'cliente' => fn () => Publico::caminho($request) && ($conta = Auth::guard('cliente')->user()) && $conta->activa()
                ? [...$conta->only(['id', 'nome', 'email']), 'permissoes' => Permissoes::doCliente()]
                : null,
            'loja' => fn () => Publico::caminho($request)
                ? Arr::only(app(Definicoes::class)->empresa(), ['nome', 'nome_comercial', 'telemovel', 'telefone', 'email', 'morada', 'cidade', 'logotipo'])
                : null,
            // Equipa a ver a loja a partir do LemGest (botão "Ver a loja")
            'equipa' => fn () => Publico::caminho($request) && $user?->active && $user->can('loja.ver') ? ['nome' => $user->name] : null,
            'fotosSite' => fn () => Publico::caminho($request) ? FotoSite::where('visivel', true)->ordenadas()->get()->map->paraSite()->values() : [],
            'carrinho' => fn () => Publico::caminho($request) ? PedidoController::pecasNoCarrinho($request) : 0,
            // Peças guardadas com o coração (só os números), para os cartões mostrarem o ♡ cheio
            'favoritos' => fn () => Publico::caminho($request) && ($conta = Auth::guard('cliente')->user()) && $conta->activa() && $conta->pode('loja.catalogo')
                ? $conta->favoritos()->pluck('produtos.id')->all()
                : [],
            'flash' => [
                'sucesso' => fn () => $request->session()->get('sucesso'),
                'erro' => fn () => $request->session()->get('erro'),
            ],
        ];
    }
}
