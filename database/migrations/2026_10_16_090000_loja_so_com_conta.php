<?php

use App\Models\FotoSite;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * - "Ver a loja" deixa de vir com o Gestor: por agora só o Administrador; ele dá-a a outros perfis se quiser.
 * - A capa do site passa a alternar até 6 fotos: juntam-se fotos deitadas (horizontais) até completar 6.
 */
return new class extends Migration
{
    public function up(): void
    {
        Role::where('name', 'Gestor')->where('guard_name', 'web')->first()?->revokePermissionTo('loja.ver');
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $faltam = 6 - FotoSite::where('capa', true)->count();
        if ($faltam > 0) {
            FotoSite::where('capa', false)->where('visivel', true)->whereColumn('largura', '>', 'altura')
                ->orderBy('posicao')->orderBy('id')->limit($faltam)->get()
                ->each(fn (FotoSite $f) => $f->update(['capa' => true]));
        }
    }

    public function down(): void
    {
        //
    }
};
