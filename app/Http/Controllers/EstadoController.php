<?php

namespace App\Http\Controllers;

use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Usado pelo ecrã de arranque (instalacao/arranque.html): devolve uma imagem de 1×1 píxel
 * só quando o sistema e a base de dados estão prontos. O ecrã vai pedindo esta imagem
 * até ela chegar e então abre o LemGest.
 */
class EstadoController extends Controller
{
    private const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

    public function __invoke(): Response
    {
        try {
            DB::select('select 1');
        } catch (Throwable) {
            abort(503);
        }

        return response(base64_decode(self::PIXEL), 200, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'no-store',
        ]);
    }
}
