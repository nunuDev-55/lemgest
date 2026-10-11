<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\Permissoes;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, LogsActivity, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'active',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password_changed_at' => 'datetime',
            'password' => 'hashed',
            'active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        // Qualquer caminho que mude a senha (registo, administrador, o próprio, recuperação) fica com data.
        static::saving(function (User $user) {
            if ($user->isDirty('password')) {
                $user->password_changed_at = now();
            }
        });
    }

    /** Auditoria: regista só os campos que mudaram (nunca a senha). */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('utilizadores')
            ->logOnly(['name', 'email', 'phone', 'active'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $evento) => match ($evento) {
                'created' => 'Utilizador criado',
                'updated' => 'Utilizador alterado',
                'deleted' => 'Utilizador apagado',
                default => $evento,
            });
    }

    public function isAdministrador(): bool
    {
        return $this->hasRole(Permissoes::ADMINISTRADOR);
    }

    /** @param Builder<User> $query */
    public function scopeAdministradoresActivos(Builder $query): void
    {
        $query->where('active', true)->role(Permissoes::ADMINISTRADOR);
    }
}
