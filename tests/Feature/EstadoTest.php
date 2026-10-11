<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EstadoTest extends TestCase
{
    use RefreshDatabase;

    public function test_ecra_de_arranque_recebe_imagem_quando_o_sistema_esta_pronto_sem_abrir_sessao(): void
    {
        $this->get('/estado/pronto.png')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertCookieMissing(config('session.cookie'))
            ->assertCookieMissing('XSRF-TOKEN');
    }
}
