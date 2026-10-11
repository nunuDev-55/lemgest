<?php

namespace App\Services;

use App\Contracts\DocumentoComLinhas;
use App\Models\Factura;
use App\Models\MovimentoStock;
use App\Models\Orcamento;
use App\Models\Produto;
use App\Models\Reserva;
use App\Models\ReservaLinha;
use App\Models\User;
use App\Support\Definicoes;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Reservas de aluguer (etapa 4 do roadmap).
 *
 * pedido (não prende material) → confirmada (prende o material para as datas) → entregue (sai do stock)
 * → devolvida (voltou tudo, ou o que faltou foi abatido). pedido/confirmada → cancelada → (reabrir) pedido.
 * Até à entrega podem mudar as datas e as linhas; numa reserva confirmada, cada mudança volta a verificar o stock.
 */
class ReservaService extends DocumentoComercialService
{
    public const DESCRICAO_TRANSPORTE = 'Transporte (entrega e recolha)';

    public function __construct(
        Numeracao $numeracao,
        LinhasDocumento $linhas,
        private readonly Stock $stock,
        private readonly Disponibilidade $disponibilidade,
    ) {
        parent::__construct($numeracao, $linhas);
    }

    protected function chave(): string
    {
        return 'reserva';
    }

    protected function nome(): string
    {
        return 'reserva';
    }

    /** @param array<string, mixed> $dados */
    public function criar(array $dados, User $autor, string $origem = 'balcao'): Reserva
    {
        $this->garantirTerceiro((int) $dados['terceiro_id'], aceitaPotencial: true);

        return DB::transaction(function () use ($dados, $autor, $origem) {
            $r = new Reserva($dados);
            $r->numero = $this->numeracao->proximo('reserva');
            $r->estado = Reserva::PEDIDO;
            $r->origem = $origem;
            $r->criado_por = $autor->id;
            $r->save();
            $this->sincronizarTransporte($r);

            $this->registar($r, 'created', "Reserva {$r->numero} criada (pedido)");

            return $r;
        });
    }

    /**
     * Datas, local, tema... Se os dias a cobrar mudarem, as linhas que tinham os dias antigos passam aos novos.
     *
     * @param  array<string, mixed>  $dados
     */
    public function actualizarCabecalho(Reserva $r, array $dados): Reserva
    {
        $this->garantirRascunho($r);
        if ((int) $dados['terceiro_id'] !== $r->terceiro_id) {
            $this->garantirTerceiro((int) $dados['terceiro_id'], aceitaPotencial: true);
        }

        return DB::transaction(function () use ($r, $dados) {
            $diasAntes = $r->dias;
            $r->fill($dados)->save();

            if ($r->dias !== $diasAntes) {
                // Só o material de aluguer; serviços (transporte, montagem) mantêm os seus dias
                foreach ($r->linhas()->where('dias', $diasAntes)->with('produto')->get() as $linha) {
                    if ($linha->produto?->tipo === 'produto' && $linha->produto->em_aluguer) {
                        $linha->dias = $r->dias;
                        $this->linhas->calcular($linha);
                        $linha->save();
                    }
                }
                $this->linhas->recalcular($r);
            }
            $this->sincronizarTransporte($r);
            $this->garantirStockSeConfirmada($r);

            return $r;
        });
    }

    /** @param array<string, mixed> $dados */
    public function adicionarLinha(Model&DocumentoComLinhas $doc, array $dados): Model
    {
        $this->garantirPecasInteiras($dados['produto_id'] ?? null, $dados['quantidade']);

        return DB::transaction(function () use ($doc, $dados) {
            $linha = parent::adicionarLinha($doc, $dados);
            $this->garantirStockSeConfirmada($doc);

            return $linha;
        });
    }

    /** @param array<string, mixed> $dados */
    public function actualizarLinha(Model&DocumentoComLinhas $doc, Model $linha, array $dados): Model
    {
        $this->garantirQueNaoETransporte($linha);
        $this->garantirPecasInteiras($linha->produto_id, $dados['quantidade']);

        return DB::transaction(function () use ($doc, $linha, $dados) {
            $linha = parent::actualizarLinha($doc, $linha, $dados);
            $this->garantirStockSeConfirmada($doc);

            return $linha;
        });
    }

    public function removerLinha(Model&DocumentoComLinhas $doc, Model $linha): void
    {
        $this->garantirQueNaoETransporte($linha);
        parent::removerLinha($doc, $linha);
    }

    /** Confirmar: a LemServ aceita o pedido e o material fica preso para as datas */
    public function confirmar(Reserva $r, User $quem): Reserva
    {
        $this->garantirEstado($r, [Reserva::PEDIDO], 'Só um pedido pode ser confirmado.');
        $this->garantirLinhas($r);
        if ($r->transporte && $r->taxa_transporte === null) {
            $t = app(Definicoes::class)->transporte();
            throw ValidationException::withMessages([
                'reserva' => 'Falta a taxa de transporte (de '.number_format((float) $t['minimo'], 0, ',', ' ').' a '.number_format((float) $t['maximo'], 0, ',', ' ').' MT). Modifique a reserva e indique-a antes de confirmar.',
            ]);
        }

        return DB::transaction(function () use ($r, $quem) {
            $r = Reserva::lockForUpdate()->findOrFail($r->id);
            $this->garantirEstado($r, [Reserva::PEDIDO], 'Só um pedido pode ser confirmado.');
            $this->garantirStock($r);

            $r->estado = Reserva::CONFIRMADA;
            $r->confirmada_em = now();
            $r->confirmada_por = $quem->id;
            $r->save();
            $this->registar($r, 'confirmada', "Reserva {$r->numero} confirmada");

            return $r;
        });
    }

    /** Uma reserva confirmada volta a pedido (deixa de prender o material) */
    public function voltarAPedido(Reserva $r): Reserva
    {
        $this->garantirEstado($r, [Reserva::CONFIRMADA], 'Só uma reserva confirmada (ainda não entregue) pode voltar a pedido.');
        $r->estado = Reserva::PEDIDO;
        $r->confirmada_em = null;
        $r->confirmada_por = null;
        $r->save();
        $this->registar($r, 'pedido', "Reserva {$r->numero} voltou a pedido");

        return $r;
    }

    /** Entrega: cada linha de material sai do stock, com a devolução prevista para o dia da recolha */
    public function entregar(Reserva $r, User $quem, ?string $data = null): Reserva
    {
        $this->garantirEstado($r, [Reserva::CONFIRMADA], 'Só uma reserva confirmada pode ser entregue. Confirme-a primeiro.');

        return $this->comErrosDeStock(fn () => DB::transaction(function () use ($r, $quem, $data) {
            $r = Reserva::lockForUpdate()->findOrFail($r->id);
            $this->garantirEstado($r, [Reserva::CONFIRMADA], 'Só uma reserva confirmada pode ser entregue.');
            $data ??= today()->toDateString();
            $prevista = max($r->data_recolha->toDateString(), $data);

            foreach ($r->linhas()->with('produto')->get() as $linha) {
                if (! $linha->temStock() || $linha->pecas() < 1) {
                    continue;
                }
                $saida = $this->stock->saida($linha->produto, $linha->pecas(), [
                    'data' => $data,
                    'devolucao_prevista' => $prevista,
                    'terceiro_id' => $r->terceiro_id,
                    'motivo' => "Reserva {$r->numero}",
                ], $quem, $r);
                $linha->movimento_saida_id = $saida->id;
                $linha->save();
            }

            $r->estado = Reserva::ENTREGUE;
            $r->entregue_em = now();
            $r->save();
            $this->registar($r, 'entregue', "Reserva {$r->numero}: material entregue");

            return $r;
        }));
    }

    /**
     * Devolução, de uma vez ou aos poucos. Por linha: peças que voltaram e peças perdidas ou danificadas (abatidas).
     * Quando já não falta nada, a reserva fica devolvida.
     *
     * @param  array<int, array{devolvidas?: int|string|null, perdidas?: int|string|null}>  $porLinha  reserva_linha_id => quantidades
     */
    public function registarDevolucao(Reserva $r, array $porLinha, User $quem, ?string $data = null, ?string $nota = null): Reserva
    {
        $this->garantirEstado($r, [Reserva::ENTREGUE], 'Só se regista a devolução de uma reserva entregue.');

        return $this->comErrosDeStock(fn () => DB::transaction(function () use ($r, $porLinha, $quem, $data, $nota) {
            $r = Reserva::lockForUpdate()->findOrFail($r->id);
            $linhas = $r->linhas()->with(['produto', 'movimentoSaida'])->get()->keyBy('id');
            $houve = false;

            foreach ($porLinha as $id => $q) {
                $linha = $linhas->get((int) $id);
                $devolvidas = (int) ($q['devolvidas'] ?? 0);
                $perdidas = (int) ($q['perdidas'] ?? 0);
                if ($linha === null || $linha->movimentoSaida === null || ($devolvidas === 0 && $perdidas === 0)) {
                    continue;
                }
                if ($devolvidas < 0 || $perdidas < 0) {
                    throw ValidationException::withMessages(['reserva' => 'As quantidades não podem ser negativas.']);
                }
                if ($devolvidas > 0) {
                    $this->stock->devolucao($linha->movimentoSaida, $devolvidas, ['data' => $data, 'motivo' => $nota], $quem);
                }
                if ($perdidas > 0) {
                    $this->stock->abate($linha->produto, $perdidas, [
                        'data' => $data,
                        'motivo' => $nota ? "Reserva {$r->numero}: {$nota}" : "Reserva {$r->numero}: não devolvidas ou danificadas",
                    ], $quem, $linha->movimentoSaida->fresh());
                }
                $houve = true;
            }

            if (! $houve) {
                throw ValidationException::withMessages(['reserva' => 'Indique quantas peças voltaram (ou se perderam) em pelo menos uma linha.']);
            }

            $faltam = MovimentoStock::whereIn('id', $linhas->pluck('movimento_saida_id')->filter())->sum('pendente');
            if ((int) $faltam === 0) {
                $r->estado = Reserva::DEVOLVIDA;
                $r->devolvida_em = now();
                $r->save();
                $this->registar($r, 'devolvida', "Reserva {$r->numero}: material devolvido");
            } else {
                $this->registar($r, 'devolucao', "Reserva {$r->numero}: devolução parcial ({$faltam} peça(s) ainda fora)");
            }

            return $r;
        }));
    }

    /**
     * Orçamento aceite → reserva (pedido) com as mesmas linhas, preços e dias.
     *
     * @param  array<string, mixed>  $datas  data_evento, data_fim_evento, data_entrega, data_recolha, dias
     */
    public function criarAPartirDe(Orcamento $o, array $datas, User $autor): Reserva
    {
        return DB::transaction(function () use ($o, $datas, $autor) {
            $r = $this->criar([
                'terceiro_id' => $o->terceiro_id,
                ...$datas,
                'nota_publica' => $o->nota_publica,
                'nota_privada' => $o->nota_privada,
            ], $autor);
            $r->orcamento_id = $o->id;
            $r->save();
            $this->linhas->copiar($o, $r);

            return $r->fresh();
        });
    }

    /**
     * "Criar factura": rascunho de factura com as linhas da reserva (quantidade × dias × preço por dia).
     * Pode facturar-se antes do evento (pagamento adiantado) ou depois; uma reserva só tem uma factura activa.
     */
    public function criarFactura(Reserva $r, User $autor): Factura
    {
        $this->garantirEstado($r, [Reserva::CONFIRMADA, Reserva::ENTREGUE, Reserva::DEVOLVIDA], 'Só se factura uma reserva confirmada, entregue ou devolvida.');
        $this->garantirLinhas($r);
        $existente = $r->facturas()->where('estado', '!=', Factura::ABANDONADA)->first();
        if ($existente !== null) {
            throw ValidationException::withMessages(['reserva' => "Esta reserva já tem a factura {$existente->referencia()}."]);
        }

        $factura = app(FacturaService::class)->criarAPartirDe($r, $autor);
        $this->registar($r, 'factura', "Factura {$factura->referencia()} criada a partir da reserva {$r->numero}");

        return $factura;
    }

    public function cancelar(Reserva $r, ?string $motivo): Reserva
    {
        $this->garantirEstado($r, [Reserva::PEDIDO, Reserva::CONFIRMADA], 'Só se cancela uma reserva que ainda não foi entregue.');
        $r->estado = Reserva::CANCELADA;
        $r->cancelada_em = now();
        $r->motivo_cancelamento = $motivo;
        $r->save();
        $this->registar($r, 'cancelada', "Reserva {$r->numero} cancelada".($motivo ? " — {$motivo}" : ''));

        return $r;
    }

    /** Uma reserva cancelada volta a pedido */
    public function reabrir(Reserva $r): Reserva
    {
        $this->garantirEstado($r, [Reserva::CANCELADA], 'Só uma reserva cancelada pode ser reaberta.');
        $r->estado = Reserva::PEDIDO;
        $r->cancelada_em = null;
        $r->motivo_cancelamento = null;
        $r->save();
        $this->registar($r, 'reaberta', "Reserva {$r->numero} reaberta (pedido)");

        return $r;
    }

    /**
     * Para cada linha de material: quantas peças pede e quantas estão livres no período da reserva (sem contar com ela).
     *
     * @return array<int, array{pedidas: int, livres: int, falta: int}> por reserva_linha_id
     */
    public function verificarStock(Reserva $r): array
    {
        $linhas = $r->linhas()->with('produto')->get()->filter(fn (ReservaLinha $l) => $l->temStock());
        if ($linhas->isEmpty()) {
            return [];
        }

        $contas = $this->disponibilidade->noPeriodo(
            $linhas->pluck('produto')->unique('id')->values(),
            CarbonImmutable::parse($r->data_entrega),
            CarbonImmutable::parse($r->data_recolha),
            $r->id,
        );

        // Várias linhas do mesmo produto somam-se
        $pedidasPorProduto = $linhas->groupBy('produto_id')->map(fn ($ls) => $ls->sum(fn (ReservaLinha $l) => $l->pecas()));
        $resultado = [];
        foreach ($linhas as $l) {
            $livres = $contas[$l->produto_id]['disponivel'];
            $resultado[$l->id] = [
                'pedidas' => $l->pecas(),
                'livres' => $livres,
                'falta' => max(0, $pedidasPorProduto[$l->produto_id] - $livres),
            ];
        }

        return $resultado;
    }

    /* ------------------------------------------------------------ */

    /**
     * O transporte é um requisito da reserva: com transporte e taxa definida, o sistema mantém uma linha
     * "Transporte (entrega e recolha)" com essa taxa (1 vez, não por dia), para entrar nos totais e na factura.
     */
    private function sincronizarTransporte(Reserva $r): void
    {
        $linha = $r->linhas()->where('e_transporte', true)->first();

        if (! $r->transporte || $r->taxa_transporte === null) {
            if ($linha !== null) {
                $this->linhas->remover($r, $linha);
            }

            return;
        }

        if ($linha === null) {
            $linha = $this->linhas->adicionar($r, [
                'descricao' => self::DESCRICAO_TRANSPORTE,
                'quantidade' => '1',
                'dias' => 1,
                'preco_unitario' => (string) $r->taxa_transporte,
                'taxa_iva' => '16.00',
            ]);
            $linha->e_transporte = true;
            $linha->save();
        } elseif (bccomp((string) $linha->preco_unitario, (string) $r->taxa_transporte, 2) !== 0) {
            $this->linhas->actualizar($r, $linha, [
                'quantidade' => '1',
                'dias' => 1,
                'preco_unitario' => (string) $r->taxa_transporte,
                'taxa_iva' => (string) $linha->taxa_iva,
            ]);
        }
    }

    private function garantirQueNaoETransporte(Model $linha): void
    {
        if ($linha instanceof ReservaLinha && $linha->e_transporte) {
            throw ValidationException::withMessages([
                'reserva' => 'A linha do transporte muda-se em "Modificar", nos campos Transporte e Taxa de transporte.',
            ]);
        }
    }

    protected function garantirRascunho(DocumentoComLinhas $doc): void
    {
        if (! $doc->eRascunho()) {
            throw ValidationException::withMessages([
                'reserva' => "A reserva {$doc->referencia()} já não se pode alterar (o material já saiu ou a reserva foi cancelada).",
            ]);
        }
    }

    /** O material de aluguer conta-se em peças inteiras */
    private function garantirPecasInteiras(int|string|null $produtoId, mixed $quantidade): void
    {
        if ($produtoId === null || Produto::whereKey($produtoId)->value('tipo') !== 'produto') {
            return;
        }
        if (bccomp((string) $quantidade, (string) (int) $quantidade, 3) !== 0) {
            throw ValidationException::withMessages(['quantidade' => 'O material aluga-se em peças inteiras.']);
        }
    }

    private function garantirStockSeConfirmada(Model $r): void
    {
        if ($r instanceof Reserva && $r->estado === Reserva::CONFIRMADA) {
            $this->garantirStock($r);
        }
    }

    /** Bloqueia se faltar material no período (diz o quê e quanto) */
    private function garantirStock(Reserva $r): void
    {
        $faltas = collect($this->verificarStock($r))->filter(fn ($v) => $v['falta'] > 0);
        if ($faltas->isEmpty()) {
            return;
        }

        $nomes = ReservaLinha::with('produto:id,referencia')->whereKey($faltas->keys())->get()
            ->unique('produto_id')
            ->map(fn (ReservaLinha $l) => "{$l->produto->referencia} (faltam {$faltas[$l->id]['falta']}, livres {$faltas[$l->id]['livres']})")
            ->implode(', ');

        throw ValidationException::withMessages([
            'reserva' => "Não há material suficiente de {$r->data_entrega->format('d/m')} a {$r->data_recolha->format('d/m')}: {$nomes}.",
        ]);
    }

    /** As regras do stock respondem no campo "stock"; a ficha da reserva mostra os erros do campo "reserva" */
    private function comErrosDeStock(callable $accao): mixed
    {
        try {
            return $accao();
        } catch (ValidationException $erro) {
            $mensagens = $erro->errors();
            if (! isset($mensagens['stock'])) {
                throw $erro;
            }
            throw ValidationException::withMessages(['reserva' => $mensagens['stock'][0]]);
        }
    }

    /** @param array<string, mixed> $extra */
    protected function registar(Model $doc, string $evento, string $descricao, array $extra = []): void
    {
        activity('reservas')->performedOn($doc)->event($evento)->withProperties($extra)->log($descricao);
    }
}
