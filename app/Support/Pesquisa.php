<?php

namespace App\Support;

final class Pesquisa
{
    /** Prepara texto do utilizador para um LIKE '%...%', tratando % e _ como letras normais. */
    public static function like(string $texto): string
    {
        return '%'.addcslashes(trim($texto), '\\%_').'%';
    }
}
