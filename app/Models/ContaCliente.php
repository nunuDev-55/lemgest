<?php

namespace App\Models;

use App\Notifications\NovaSenhaCliente;
use App\Support\Permissoes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Conta de um cliente na loja (guarda "cliente"). Todas as contas usam o perfil Cliente
 * (Administração → Perfis e permissões), que diz o que podem ver no catálogo e na área do cliente.
 *
 * pendente → (a LemServ aprova) activa → suspensa → activa; pendente → recusada.
 */
class ContaCliente extends Authenticatable
{
    use Notifiable;

    public const PENDENTE = 'pendente';

    public const ACTIVA = 'activa';

    public const RECUSADA = 'recusada';

    public const SUSPENSA = 'suspensa';

    public const ESTADOS = [
        self::PENDENTE => 'Por aprovar',
        self::ACTIVA => 'Activa',
        self::RECUSADA => 'Recusada',
        self::SUSPENSA => 'Suspensa',
    ];

    protected $table = 'contas_cliente';

    protected $fillable = ['nome', 'email', 'telemovel', 'nuit', 'provincia', 'cidade', 'bairro', 'morada', 'password'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'aprovada_em' => 'datetime',
            'ultimo_acesso_em' => 'datetime',
        ];
    }

    /** @return BelongsTo<Terceiro, $this> */
    public function terceiro(): BelongsTo
    {
        return $this->belongsTo(Terceiro::class);
    }

    /** @return BelongsTo<User, $this> */
    public function aprovadaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovada_por');
    }

    /**
     * Peças guardadas com o coração no catálogo (as mais recentes primeiro)
     *
     * @return BelongsToMany<Produto, $this>
     */
    public function favoritos(): BelongsToMany
    {
        return $this->belongsToMany(Produto::class, 'favoritos')->withTimestamps()->orderByPivot('created_at', 'desc');
    }

    public function activa(): bool
    {
        return $this->estado === self::ACTIVA && $this->terceiro_id !== null;
    }

    /** O perfil Cliente dá esta permissão? (catálogo em Permissoes::CATALOGO_CLIENTE) */
    public function pode(string $permissao): bool
    {
        return in_array($permissao, Permissoes::doCliente(), true);
    }

    /** Porque é que a conta não pode entrar (na entrada e a meio da sessão) */
    public function motivoSemAcesso(): string
    {
        $motivo = $this->motivo ? " Motivo: {$this->motivo}." : '';

        return match ($this->estado) {
            self::PENDENTE => 'A sua conta ainda está à espera de aprovação da LemServ. Avisamos logo que estiver pronta.',
            self::RECUSADA => "O pedido de conta não foi aprovado.{$motivo} Para mais informações, fale com a LemServ.",
            self::SUSPENSA => "A sua conta está suspensa.{$motivo} Fale com a LemServ.",
            default => 'Não foi possível entrar. Fale com a LemServ.',
        };
    }

    /** O e-mail de nova senha leva à página dos clientes, não à da equipa */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new NovaSenhaCliente($token));
    }
}
