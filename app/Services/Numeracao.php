<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Numeração sequencial sem saltos nem repetidos.
 *
 * O número é reservado com SELECT ... FOR UPDATE: dois utilizadores a validar ao mesmo tempo
 * esperam um pelo outro e recebem números diferentes. Tem de ser chamado dentro da transacção
 * que grava o documento, para que um erro desfaça também a reserva do número.
 */
class Numeracao
{
    /** Formatos de cada série. {ano} e {n} são substituídos. */
    public const FORMATOS = [
        'factura' => ['FT{ano}/{n}', 4],
        'nota_credito' => ['NC{ano}/{n}', 4],
        'orcamento' => ['OR{ano}/{n}', 4],
        'encomenda' => ['EN{ano}/{n}', 4],
        'reserva' => ['AL{ano}/{n}', 4],
        'pagamento' => ['PG{ano}/{n}', 4],
        'cliente' => ['CL{ano}-{n}', 4],
        'fornecedor' => ['FO{ano}-{n}', 4],
        'encomenda_fornecedor' => ['EF{ano}/{n}', 4],
        'factura_fornecedor' => ['FF{ano}/{n}', 4],
        'pagamento_fornecedor' => ['PF{ano}/{n}', 4],
    ];

    public function proximo(string $serie, ?int $ano = null): string
    {
        $ano ??= (int) now()->format('Y');

        if (DB::transactionLevel() === 0) {
            throw new \LogicException('A numeração tem de ser pedida dentro de uma transacção.');
        }

        DB::table('numeracoes')->insertOrIgnore([
            'serie' => $serie, 'ano' => $ano, 'ultimo' => 0, 'created_at' => now(), 'updated_at' => now(),
        ]);

        $linha = DB::table('numeracoes')->where('serie', $serie)->where('ano', $ano)->lockForUpdate()->first();
        $numero = $linha->ultimo + 1;

        DB::table('numeracoes')->where('id', $linha->id)->update(['ultimo' => $numero, 'updated_at' => now()]);

        return self::formatar($serie, $ano, $numero);
    }

    /**
     * Número para um documento com data, garantindo que a numeração segue as datas:
     * dentro da mesma série e ano, um documento não pode ter data anterior à do último já numerado.
     *
     * Reserva primeiro o número (o que bloqueia a série até ao fim da transacção) e só depois compara as datas,
     * por isso duas validações ao mesmo tempo não escapam à regra. Se a data falhar, a transacção desfaz a reserva.
     *
     * @param  class-string<Model>  $modelo  Factura, NotaCredito...
     * @param  string  $campoErro  campo onde a ficha mostra o erro ('factura', 'nota')
     * @param  string  $documento  nome nas mensagens ("factura", "nota de crédito")
     */
    public function proximoEmOrdem(string $serie, string $modelo, CarbonInterface $data, ?int $ignorarId, string $campoErro, string $documento): string
    {
        $numero = $this->proximo($serie, (int) $data->format('Y'));

        $posterior = $modelo::query()
            ->whereNotNull('numero')
            ->when($ignorarId, fn ($q, $id) => $q->whereKeyNot($id))
            ->whereYear('data', $data->year)
            ->whereDate('data', '>', $data->toDateString())
            ->orderByDesc('data')
            ->orderByDesc('numero')
            ->first(['numero', 'data']);

        if ($posterior !== null) {
            $ultima = $posterior->data->format('d/m/Y');
            throw ValidationException::withMessages([$campoErro => "A data da {$documento} ({$data->format('d/m/Y')}) não pode ser anterior à da última {$documento} validada"
                ." ({$posterior->numero}, de {$ultima}): a numeração tem de seguir as datas. Mude a data para {$ultima} ou depois."]);
        }

        return $numero;
    }

    public static function formatar(string $serie, int $ano, int $numero): string
    {
        [$formato, $digitos] = self::FORMATOS[$serie] ?? ['{n}', 4];

        return strtr($formato, ['{ano}' => (string) $ano, '{n}' => str_pad((string) $numero, $digitos, '0', STR_PAD_LEFT)]);
    }
}
