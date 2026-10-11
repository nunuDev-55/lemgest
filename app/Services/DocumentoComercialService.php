<?php

namespace App\Services;

use App\Contracts\DocumentoComLinhas;
use App\Models\Terceiro;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Regras comuns aos documentos do módulo Comércio (orçamentos e encomendas):
 * linhas só se alteram em rascunho e cada acção fica registada na auditoria.
 */
abstract class DocumentoComercialService
{
    public function __construct(
        protected readonly Numeracao $numeracao,
        protected readonly LinhasDocumento $linhas,
    ) {}

    /** Nome do campo de erro e do documento nas mensagens ("orcamento", "encomenda") */
    abstract protected function chave(): string;

    abstract protected function nome(): string;

    /** @param array<string, mixed> $dados */
    public function adicionarLinha(Model&DocumentoComLinhas $doc, array $dados): Model
    {
        $this->garantirRascunho($doc);

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

    protected function garantirRascunho(DocumentoComLinhas $doc): void
    {
        if (! $doc->eRascunho()) {
            throw ValidationException::withMessages([
                $this->chave() => "O {$this->nome()} {$doc->referencia()} não está em rascunho. Use \"Modificar\" para o voltar a rascunho antes de o alterar.",
            ]);
        }
    }

    protected function garantirLinhas(Model&DocumentoComLinhas $doc): void
    {
        if (! $doc->linhas()->exists()) {
            throw ValidationException::withMessages([$this->chave() => "O {$this->nome()} não tem linhas. Acrescente pelo menos um produto ou serviço."]);
        }
    }

    /** @param list<string> $permitidos */
    protected function garantirEstado(Model $doc, array $permitidos, string $mensagem): void
    {
        if (! in_array($doc->estado, $permitidos, true)) {
            throw ValidationException::withMessages([$this->chave() => $mensagem]);
        }
    }

    protected function garantirTerceiro(int $terceiroId, bool $aceitaPotencial): Terceiro
    {
        $t = Terceiro::findOrFail($terceiroId);
        if (! $t->activo) {
            throw ValidationException::withMessages(['terceiro_id' => "{$t->nome} está encerrado."]);
        }
        if (! $t->e_cliente && ! ($aceitaPotencial && $t->e_potencial)) {
            throw ValidationException::withMessages(['terceiro_id' => $aceitaPotencial
                ? "{$t->nome} não é cliente nem potencial cliente."
                : "{$t->nome} não está marcado como cliente."]);
        }

        return $t;
    }

    /** @param array<string, mixed> $extra */
    protected function registar(Model $doc, string $evento, string $descricao, array $extra = []): void
    {
        activity('comercial')->performedOn($doc)->event($evento)->withProperties($extra)->log($descricao);
    }
}
