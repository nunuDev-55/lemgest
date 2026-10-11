<?php

namespace App\Services;

use App\Contracts\DocumentoComLinhas;
use App\Models\Produto;
use App\Models\Terceiro;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Regras comuns aos documentos de compra (encomendas e facturas de fornecedor):
 * o terceiro tem de ser fornecedor activo, as linhas só se alteram em rascunho
 * e cada acção fica na auditoria (módulo "compras").
 */
abstract class DocumentoCompraService
{
    public function __construct(
        protected readonly Numeracao $numeracao,
        protected readonly LinhasDocumento $linhas,
    ) {}

    /** Campo de erro e nome do documento nas mensagens */
    abstract protected function chave(): string;

    abstract protected function nome(): string;

    /** @param array<string, mixed> $dados */
    public function adicionarLinha(Model&DocumentoComLinhas $doc, array $dados): Model
    {
        $this->garantirRascunho($doc);
        // A LemServ fabrica o seu material: nas compras só entram matérias-primas (ou linhas livres)
        if (! empty($dados['produto_id']) && Produto::whereKey($dados['produto_id'])->value('tipo') !== Produto::MATERIA) {
            throw ValidationException::withMessages([
                'produto_id' => 'Nas compras só entram matérias-primas (tecido, napa, espuma…). As peças fabricadas entram no stock como "Entrada".',
            ]);
        }

        return $this->linhas->adicionar($doc, $dados);
    }

    /** @param array<string, mixed> $dados */
    public function actualizarLinha(Model&DocumentoComLinhas $doc, Model $linha, array $dados): Model
    {
        $this->garantirRascunho($doc);

        return $this->linhas->actualizar($doc, $linha, $dados);
    }

    public function removerLinha(Model&DocumentoComLinhas $doc, Model $linha): void
    {
        $this->garantirRascunho($doc);
        $this->linhas->remover($doc, $linha);
    }

    protected function garantirFornecedor(int $terceiroId): Terceiro
    {
        $t = Terceiro::findOrFail($terceiroId);
        if (! $t->e_fornecedor) {
            throw ValidationException::withMessages(['terceiro_id' => "{$t->nome} não está marcado como fornecedor."]);
        }
        if (! $t->activo) {
            throw ValidationException::withMessages(['terceiro_id' => "{$t->nome} está encerrado."]);
        }

        return $t;
    }

    protected function garantirRascunho(DocumentoComLinhas $doc): void
    {
        if (! $doc->eRascunho()) {
            throw ValidationException::withMessages([$this->chave() => "A {$this->nome()} {$doc->referencia()} já não está em rascunho e não pode ser alterada."]);
        }
    }

    protected function garantirLinhas(Model&DocumentoComLinhas $doc): void
    {
        if (! $doc->linhas()->exists()) {
            throw ValidationException::withMessages([$this->chave() => "A {$this->nome()} não tem linhas. Acrescente pelo menos um produto ou serviço."]);
        }
    }

    /** @param list<string> $permitidos */
    protected function garantirEstado(Model $doc, array $permitidos, string $mensagem): void
    {
        if (! in_array($doc->estado, $permitidos, true)) {
            throw ValidationException::withMessages([$this->chave() => $mensagem]);
        }
    }

    /** @param array<string, mixed> $extra */
    protected function registar(Model $doc, string $evento, string $descricao, array $extra = []): void
    {
        activity('compras')->performedOn($doc)->event($evento)->withProperties($extra)->log($descricao);
    }
}
