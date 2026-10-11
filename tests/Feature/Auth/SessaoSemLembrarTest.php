<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class SessaoSemLembrarTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_nunca_fica_lembrado_e_a_sessao_acaba_ao_fechar_a_janela(): void
    {
        $user = $this->administrador();
        $tokenAntes = $user->remember_token;

        $resposta = $this->post('/login', ['email' => $user->email, 'password' => 'password', 'remember' => 'on']);

        $resposta->assertRedirect();
        $this->assertAuthenticatedAs($user);

        // Mesmo que alguém envie "remember", não há cookie de "lembrar-me" nem token novo guardado
        $resposta->assertCookieMissing(Auth::guard('web')->getRecallerName());
        $this->assertSame($tokenAntes, $user->fresh()->remember_token);

        // O cookie da sessão não tem data de validade: desaparece quando a janela é fechada
        $cookie = collect($resposta->headers->getCookies())->firstWhere(fn ($c) => $c->getName() === config('session.cookie'));
        $this->assertNotNull($cookie);
        $this->assertSame(0, $cookie->getExpiresTime());
    }
}
