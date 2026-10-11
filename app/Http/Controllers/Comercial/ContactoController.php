<?php

namespace App\Http\Controllers\Comercial;

use App\Http\Controllers\Controller;
use App\Http\Requests\Comercial\GuardarContactoRequest;
use App\Models\Contacto;
use App\Models\Terceiro;
use App\Support\Ordenacao;
use App\Support\Pesquisa;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Contactos / Endereços: pessoas de contacto dos terceiros. */
class ContactoController extends Controller
{
    public function index(Request $request): Response
    {
        $filtros = $request->validate([
            'nome' => ['nullable', 'string', 'max:100'],
            'cargo' => ['nullable', 'string', 'max:100'],
            'terceiro' => ['nullable', 'string', 'max:100'],
            'telefone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'string', 'max:100'],
        ]);

        $query = Contacto::query()
            ->join('terceiros', 'terceiros.id', '=', 'contactos.terceiro_id')
            ->select('contactos.*', 'terceiros.nome as terceiro_nome')
            ->when($filtros['nome'] ?? null, fn ($q, $t) => $q->where('contactos.nome', 'like', Pesquisa::like($t)))
            ->when($filtros['cargo'] ?? null, fn ($q, $t) => $q->where('contactos.cargo', 'like', Pesquisa::like($t)))
            ->when($filtros['terceiro'] ?? null, fn ($q, $t) => $q->where('terceiros.nome', 'like', Pesquisa::like($t)))
            ->when($filtros['telefone'] ?? null, fn ($q, $t) => $q->where(fn ($q) => $q->where('contactos.telefone', 'like', Pesquisa::like($t))->orWhere('contactos.telemovel', 'like', Pesquisa::like($t))))
            ->when($filtros['email'] ?? null, fn ($q, $t) => $q->where('contactos.email', 'like', Pesquisa::like($t)));

        $ordenacao = Ordenacao::aplicar($query, $request, ['nome' => 'contactos.nome', 'terceiro' => 'terceiros.nome', 'cargo' => 'contactos.cargo'], 'nome');

        return Inertia::render('contactos/index', [
            'contactos' => $query->paginate(Ordenacao::porPagina($request))->withQueryString()->through(fn (Contacto $c) => [
                'id' => $c->id,
                'nome' => $c->nome,
                'cargo' => $c->cargo,
                'telefone' => $c->telefone,
                'telemovel' => $c->telemovel,
                'email' => $c->email,
                'terceiro' => $c->terceiro_nome,
                'terceiro_id' => $c->terceiro_id,
                'activo' => $c->activo,
            ]),
            'filtros' => (object) $filtros,
            'ordenacao' => $ordenacao,
        ]);
    }

    public function store(GuardarContactoRequest $request, Terceiro $terceiro): RedirectResponse
    {
        $terceiro->contactos()->create($request->validated());

        return back()->with('sucesso', 'Contacto acrescentado.');
    }

    public function update(GuardarContactoRequest $request, Contacto $contacto): RedirectResponse
    {
        $contacto->update($request->validated());

        return back()->with('sucesso', 'Contacto alterado.');
    }

    public function destroy(Contacto $contacto): RedirectResponse
    {
        $contacto->delete();

        return back()->with('sucesso', "Contacto {$contacto->nome} apagado.");
    }
}
