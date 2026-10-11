<?php

namespace App\Http\Controllers\Administracao;

use App\Http\Controllers\Controller;
use App\Models\FotoSite;
use App\Services\FotosSite;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Administração → Site e galeria: as fotos de eventos que aparecem no site (capa, galeria...) */
class FotoSiteController extends Controller
{
    public function __construct(private readonly FotosSite $fotos) {}

    public function index(): Response
    {
        return Inertia::render('administracao/site/index', [
            'fotos' => FotoSite::query()->ordenadas()->get()->map(fn (FotoSite $f) => [
                'id' => $f->id,
                'legenda' => $f->legenda,
                'mini' => $f->url('mini'),
                'media' => $f->url('media'),
                'capa' => $f->capa,
                'visivel' => $f->visivel,
                'horizontal' => $f->largura >= $f->altura,
                'largura' => $f->largura,
                'altura' => $f->altura,
            ]),
            'maximo' => FotoSite::MAXIMO,
            'maximoCapa' => FotoSite::MAXIMO_CAPA,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'fotos' => ['required', 'array', 'min:1', 'max:20'],
            'fotos.*' => ['file', 'mimes:jpg,jpeg,png,webp', 'max:15360'],
        ], [
            'fotos.required' => 'Escolha pelo menos uma foto.',
            'fotos.max' => 'No máximo 20 fotos de cada vez.',
            'fotos.*.mimes' => 'Só se aceitam fotos JPG, PNG ou WebP.',
            'fotos.*.max' => 'Cada foto pode ter no máximo 15 MB.',
            'fotos.*.file' => 'Uma das fotos não chegou bem. Tente de novo.',
        ]);

        $n = 0;
        foreach ($request->file('fotos') as $ficheiro) {
            $this->fotos->adicionar($ficheiro->getRealPath(), $ficheiro->getClientOriginalName(), null, $request->user('web'));
            $n++;
        }

        return back()->with('sucesso', $n === 1 ? 'Foto adicionada. Escreva a legenda.' : "{$n} fotos adicionadas. Escreva as legendas.");
    }

    public function update(Request $request, FotoSite $foto): RedirectResponse
    {
        $dados = $request->validate([
            'legenda' => ['sometimes', 'required', 'string', 'max:190'],
            'capa' => ['sometimes', 'boolean'],
            'visivel' => ['sometimes', 'boolean'],
        ], ['legenda.required' => 'Escreva o que se vê na foto (ajuda quem não a pode ver e os motores de busca).']);

        $this->fotos->alterar($foto, $dados);

        return back();
    }

    public function mover(Request $request, FotoSite $foto): RedirectResponse
    {
        $direcao = $request->validate(['direcao' => ['required', Rule::in(['anterior', 'seguinte'])]])['direcao'];
        $this->fotos->mover($foto, $direcao);

        return back();
    }

    public function destroy(FotoSite $foto): RedirectResponse
    {
        $this->fotos->apagar($foto);

        return back()->with('sucesso', 'Foto apagada.');
    }
}
