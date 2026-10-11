<?php

namespace App\Http\Controllers\Comercial;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Categorias de produtos: Lounge, Tendas, Mesas e cadeiras... (a ordem é a da loja) */
class CategoriaController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('produtos/categorias', [
            'categorias' => Categoria::withCount('produtos')->orderBy('ordem')->orderBy('nome')->get()
                ->map(fn (Categoria $c) => [
                    'id' => $c->id,
                    'nome' => $c->nome,
                    'descricao' => $c->descricao,
                    'produtos' => $c->produtos_count,
                ]),
            'semCategoria' => DB::table('produtos')->whereNull('categoria_id')->count(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $this->validar($request);
        $dados['ordem'] = (int) Categoria::max('ordem') + 1;
        $categoria = Categoria::create($dados);

        return back()->with('sucesso', "Categoria {$categoria->nome} criada.");
    }

    public function update(Request $request, Categoria $categoria): RedirectResponse
    {
        $categoria->update($this->validar($request, $categoria));

        return back()->with('sucesso', 'Categoria alterada.');
    }

    public function mover(Request $request, Categoria $categoria): RedirectResponse
    {
        $direcao = $request->validate(['direcao' => ['required', Rule::in(['anterior', 'seguinte'])]])['direcao'];

        DB::transaction(function () use ($categoria, $direcao) {
            $ids = Categoria::orderBy('ordem')->orderBy('nome')->lockForUpdate()->pluck('id')->all();
            $i = array_search($categoria->id, $ids, true);
            $j = $direcao === 'anterior' ? $i - 1 : $i + 1;
            if ($i === false || ! isset($ids[$j])) {
                return;
            }
            [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]];
            foreach ($ids as $posicao => $id) {
                Categoria::whereKey($id)->update(['ordem' => $posicao + 1]);
            }
        });

        return back();
    }

    public function destroy(Categoria $categoria): RedirectResponse
    {
        $n = $categoria->produtos()->count();
        if ($n > 0) {
            return back()->with('erro', "A categoria {$categoria->nome} tem {$n} produto(s). Mude-os de categoria antes de a apagar.");
        }

        $nome = $categoria->nome;
        $categoria->delete();

        return back()->with('sucesso', "Categoria {$nome} apagada.");
    }

    /** @return array{nome: string, descricao: ?string} */
    private function validar(Request $request, ?Categoria $categoria = null): array
    {
        return $request->validate([
            'nome' => ['required', 'string', 'max:80', Rule::unique('categorias', 'nome')->ignore($categoria?->id)],
            'descricao' => ['nullable', 'string', 'max:255'],
        ], [
            'nome.unique' => 'Já existe uma categoria com este nome.',
        ], ['nome' => 'nome', 'descricao' => 'descrição']);
    }
}
