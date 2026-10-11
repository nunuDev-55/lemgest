<?php

namespace App\Services;

use App\Models\Factura;
use App\Models\NotaCredito;
use App\Models\NotaCreditoLinha;
use App\Models\User;
use App\Support\Opcoes;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Notas de crédito (ver docs/analise-dolibarr/06-notas-credito.md):
 *
 * 1. Nascem a partir de uma factura validada ou paga, em rascunho, com as linhas da factura (ou vazias).
 * 2. No rascunho podem ajustar-se as linhas (para creditar só uma parte).
 * 3. Ao validar recebem o número NC2026/0001; o total não pode passar do que ainda se pode creditar na factura.
 * 4. O valor abate primeiro no que falta pagar da factura; o resto fica "por reembolsar" ao cliente.
 * 5. Registado o reembolso (ou sem nada a reembolsar), a nota fica fechada. Validada, não volta a rascunho.
 */
class NotaCreditoService
{
    public function __construct(
        private readonly Numeracao $numeracao,
        private readonly LinhasDocumento $linhas,
    ) {}

    /** "Criar nota de crédito" na ficha da factura */
    public function criarAPartirDe(Factura $factura, User $autor, string $motivo, bool $copiarLinhas = true, ?string $data = null): NotaCredito
    {
        if (! in_array($factura->estado, [Factura::VALIDADA, Factura::PAGA], true)) {
            throw ValidationException::withMessages(['factura' => 'Só se emite nota de crédito para uma factura validada (pendente de cobrança ou paga).']);
        }
        if (bccomp($factura->creditavel(), '0', 2) <= 0) {
            throw ValidationException::withMessages(['factura' => "A factura {$factura->numero} já foi totalmente creditada."]);
        }
        $rascunho = $factura->notasCredito()->where('estado', NotaCredito::RASCUNHO)->first();
        if ($rascunho !== null) {
            throw ValidationException::withMessages(['factura' => "Já existe o rascunho de nota de crédito {$rascunho->referencia()} para esta factura. Valide-o ou elimine-o primeiro."]);
        }

        return DB::transaction(function () use ($factura, $autor, $motivo, $copiarLinhas, $data) {
            $nc = new NotaCredito(['data' => $data ?? now()->toDateString(), 'motivo' => $motivo]);
            $nc->factura_id = $factura->id;
            $nc->terceiro_id = $factura->terceiro_id;
            $nc->estado = NotaCredito::RASCUNHO;
            $nc->criado_por = $autor->id;
            $nc->save();

            if ($copiarLinhas) {
                $this->linhas->copiar($factura, $nc);
            }

            $this->registar($nc, 'created', "Nota de crédito criada (rascunho) para a factura {$factura->numero}");

            return $nc;
        });
    }

    /** @param array{data: string, motivo: string, nota_publica?: ?string, nota_privada?: ?string} $dados */
    public function actualizarCabecalho(NotaCredito $nc, array $dados): NotaCredito
    {
        $this->garantirRascunho($nc);
        $nc->fill($dados)->save();

        return $nc;
    }

    /** @param array<string, mixed> $dados */
    public function adicionarLinha(NotaCredito $nc, array $dados): NotaCreditoLinha
    {
        $this->garantirRascunho($nc);

        /** @var NotaCreditoLinha */
        return $this->linhas->adicionar($nc, $dados);
    }

    /** @param array<string, mixed> $dados */
    public function actualizarLinha(NotaCreditoLinha $linha, array $dados): NotaCreditoLinha
    {
        $this->garantirRascunho($linha->notaCredito);

        /** @var NotaCreditoLinha */
        return $this->linhas->actualizar($linha->notaCredito, $linha, $dados);
    }

    public function removerLinha(NotaCreditoLinha $linha): void
    {
        $this->garantirRascunho($linha->notaCredito);
        $this->linhas->remover($linha->notaCredito, $linha);
    }

    public function validar(NotaCredito $nc, User $quem): NotaCredito
    {
        $this->garantirRascunho($nc);

        if (! $nc->linhas()->exists()) {
            throw ValidationException::withMessages(['nota' => 'A nota de crédito não tem linhas. Acrescente o que vai ser creditado antes de validar.']);
        }
        if (bccomp((string) $nc->total, '0', 2) <= 0) {
            throw ValidationException::withMessages(['nota' => 'O total da nota de crédito tem de ser maior do que zero.']);
        }

        return DB::transaction(function () use ($nc, $quem) {
            // Bloqueia a nota e a factura: duas validações ao mesmo tempo não podem creditar duas vezes
            $nc = NotaCredito::lockForUpdate()->findOrFail($nc->id);
            $this->garantirRascunho($nc);
            $factura = Factura::lockForUpdate()->findOrFail($nc->factura_id);

            if (! in_array($factura->estado, [Factura::VALIDADA, Factura::PAGA], true)) {
                throw ValidationException::withMessages(['nota' => "A factura {$factura->referencia()} já não está validada nem paga."]);
            }
            $creditavel = $factura->creditavel();
            if (bccomp((string) $nc->total, $creditavel, 2) > 0) {
                throw ValidationException::withMessages(['nota' => 'O total da nota de crédito ('.$this->mt($nc->total).') é maior do que o que ainda se pode creditar na factura '.$factura->numero.' ('.$this->mt($creditavel).').']);
            }

            // Abate primeiro no que falta pagar; o que sobra é devolvido ao cliente
            $emFalta = $factura->estado === Factura::VALIDADA ? $factura->emFalta() : '0.00';
            $abatido = bccomp((string) $nc->total, $emFalta, 2) <= 0 ? (string) $nc->total : $emFalta;
            $reembolso = bcsub((string) $nc->total, $abatido, 2);

            // A numeração segue as datas, como nas facturas
            $nc->numero = $this->numeracao->proximoEmOrdem('nota_credito', NotaCredito::class, $nc->data, $nc->id, 'nota', 'nota de crédito');
            $nc->valor_abatido = $abatido;
            $nc->valor_reembolso = $reembolso;
            $nc->estado = bccomp($reembolso, '0', 2) > 0 ? NotaCredito::VALIDADA : NotaCredito::FECHADA;
            $nc->validada_em = now();
            $nc->validada_por = $quem->id;
            $nc->save();

            $factura->total_creditado = bcadd((string) $factura->total_creditado, $abatido, 2);
            if ($factura->estado === Factura::VALIDADA && bccomp($factura->emFalta(), '0', 2) <= 0) {
                $factura->estado = Factura::PAGA;
            }
            $factura->save();

            $descricao = "Nota de crédito {$nc->numero} validada: {$abatido} MT abatidos na factura {$factura->numero}";
            if (bccomp($reembolso, '0', 2) > 0) {
                $descricao .= ", {$reembolso} MT a reembolsar ao cliente";
            }
            $this->registar($nc, 'validada', $descricao);
            activity('facturas')->performedOn($factura)->event('nota_credito')
                ->log("Nota de crédito {$nc->numero} de {$nc->total} MT".($factura->estado === Factura::PAGA ? ' — factura liquidada' : ''));

            return $nc;
        });
    }

    /** @param array{data: string, metodo: string, referencia?: ?string} $dados */
    public function registarReembolso(NotaCredito $nc, array $dados): NotaCredito
    {
        if (! $nc->porReembolsar()) {
            throw ValidationException::withMessages(['nota' => 'Esta nota de crédito não tem valor por reembolsar.']);
        }

        $nc->reembolsado_em = $dados['data'];
        $nc->reembolso_metodo = $dados['metodo'];
        $nc->reembolso_referencia = $dados['referencia'] ?? null;
        $nc->estado = NotaCredito::FECHADA;
        $nc->save();

        $metodo = Opcoes::METODOS_PAGAMENTO[$nc->reembolso_metodo] ?? $nc->reembolso_metodo;
        $this->registar($nc, 'reembolso', "Reembolso de {$nc->valor_reembolso} MT ao cliente ({$metodo}) — nota de crédito fechada");

        return $nc;
    }

    public function apagar(NotaCredito $nc): void
    {
        $this->garantirRascunho($nc);

        $ref = $nc->referencia();
        $nc->delete();

        activity('facturas')->event('deleted')->withProperties(['documento' => $ref])->log("Rascunho de nota de crédito {$ref} apagado");
    }

    private function garantirRascunho(NotaCredito $nc): void
    {
        if (! $nc->eRascunho()) {
            throw ValidationException::withMessages(['nota' => "A nota de crédito {$nc->referencia()} já foi validada e não pode ser alterada."]);
        }
    }

    private function mt(string|float $valor): string
    {
        return number_format((float) $valor, 2, ',', ' ').' MT';
    }

    private function registar(NotaCredito $nc, string $evento, string $descricao): void
    {
        activity('facturas')->performedOn($nc)->event($evento)->log($descricao);
    }
}
