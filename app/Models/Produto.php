<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Produto extends Model
{
    use HasFactory, LogsActivity;

    protected $table = 'produtos';

    /** Matéria-prima: o que a LemServ compra para fabricar o seu material (não se aluga nem tem peças em stock) */
    public const MATERIA = 'materia';

    public const TIPOS = [
        'produto' => 'Produto',
        'servico' => 'Serviço',
        self::MATERIA => 'Matéria-prima',
    ];

    protected $fillable = [
        'referencia', 'tipo', 'nome', 'categoria_id', 'material_id', 'descricao', 'preco', 'taxa_iva', 'unidade',
        'preco_compra', 'em_venda', 'em_compra',
        // quantidade_total e quantidade_fora só mudam por movimentos de stock (App\Services\Stock)
        'em_aluguer', 'preco_aluguer',
        'na_loja', 'loja_destaque', 'loja_ordem', 'loja_descricao',
    ];

    protected function casts(): array
    {
        return [
            'preco' => 'decimal:2',
            'taxa_iva' => 'decimal:2',
            'preco_compra' => 'decimal:2',
            'preco_aluguer' => 'decimal:2',
            'em_venda' => 'boolean',
            'em_compra' => 'boolean',
            'em_aluguer' => 'boolean',
            'quantidade_total' => 'integer',
            'quantidade_fora' => 'integer',
            'na_loja' => 'boolean',
            'loja_destaque' => 'boolean',
            'loja_ordem' => 'integer',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }

    /** Fotos pela ordem escolhida (a principal é a capa nas listas e na loja, esteja onde estiver) */
    /** @return BelongsTo<Material, $this> */
    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    public function fotos(): HasMany
    {
        return $this->hasMany(ProdutoFoto::class)->orderBy('posicao')->orderBy('id');
    }

    public function movimentos(): HasMany
    {
        return $this->hasMany(MovimentoStock::class);
    }

    /** Peças no armazém agora (as que a LemServ tem menos as que estão alugadas) */
    public function disponivelAgora(): int
    {
        return max(0, $this->quantidade_total - $this->quantidade_fora);
    }

    public function fotoPrincipal(): HasOne
    {
        return $this->hasOne(ProdutoFoto::class)->where('principal', true);
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('produtos')
            ->logOnly([
                'referencia', 'nome', 'categoria_id', 'material_id', 'preco', 'taxa_iva', 'em_venda', 'em_compra',
                'em_aluguer', 'preco_aluguer', 'quantidade_total', 'na_loja', 'loja_destaque',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn (string $e) => match ($e) {
                'created' => $this->tipo === 'servico' ? 'Serviço criado' : 'Produto criado',
                'updated' => $this->tipo === 'servico' ? 'Serviço alterado' : 'Produto alterado',
                'deleted' => $this->tipo === 'servico' ? 'Serviço apagado' : 'Produto apagado',
                default => $e,
            });
    }

    /** Preço com IVA, para mostrar nas listas */
    public function precoComIva(): string
    {
        return self::comIva($this->preco, $this->taxa_iva);
    }

    /** Preço por dia com IVA (null se não se aluga) */
    public function precoAluguerComIva(): ?string
    {
        return $this->preco_aluguer === null ? null : self::comIva($this->preco_aluguer, $this->taxa_iva);
    }

    /**
     * Preço proposto nas linhas de orçamentos, encomendas e facturas.
     * Um produto de aluguer propõe o preço por dia (até a etapa 5 trazer os dias, a linha vale 1 dia).
     */
    public function precoDocumento(): string
    {
        return $this->em_aluguer && $this->preco_aluguer !== null ? $this->preco_aluguer : $this->preco;
    }

    private static function comIva(string $preco, string $taxa): string
    {
        return bcadd($preco, bcdiv(bcmul($preco, $taxa, 6), '100', 6), 2);
    }
}
