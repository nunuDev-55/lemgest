<?php

namespace App\Http\Requests\Aluguer;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Cabeçalho de uma reserva. Só a data do evento é obrigatória: o fim do evento, a entrega e a recolha
 * são, por omissão, o próprio dia do evento; os dias a cobrar são os dias do evento.
 */
class GuardarReservaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $evento = $this->input('data_evento');
        $fim = $this->filled('data_fim_evento') ? $this->input('data_fim_evento') : $evento;

        $dados = [
            'transporte' => $this->boolean('transporte'),
            'data_fim_evento' => $fim,
            'data_entrega' => $this->filled('data_entrega') ? $this->input('data_entrega') : $evento,
            'data_recolha' => $this->filled('data_recolha') ? $this->input('data_recolha') : $fim,
        ];
        if (! $this->filled('dias') && $evento && $fim && strtotime((string) $evento) && strtotime((string) $fim)) {
            $dados['dias'] = max(1, (int) CarbonImmutable::parse($evento)->diffInDays(CarbonImmutable::parse($fim)) + 1);
        }
        $this->merge($dados);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'terceiro_id' => ['required', 'integer', Rule::exists('terceiros', 'id')],
            'data_evento' => ['required', 'date'],
            'data_fim_evento' => ['required', 'date', 'after_or_equal:data_evento'],
            'data_entrega' => ['required', 'date', 'before_or_equal:data_evento'],
            'data_recolha' => ['required', 'date', 'after_or_equal:data_fim_evento'],
            'dias' => ['required', 'integer', 'min:1', 'max:365'],
            'local' => ['nullable', 'string', 'max:255'],
            'contacto_local' => ['nullable', 'string', 'max:120'],
            'transporte' => ['boolean'],
            'tema' => ['nullable', 'string', 'max:120'],
            'nota_publica' => ['nullable', 'string', 'max:5000'],
            'nota_privada' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'terceiro_id' => 'cliente',
            'data_evento' => 'data do evento',
            'data_fim_evento' => 'fim do evento',
            'data_entrega' => 'data de entrega',
            'data_recolha' => 'data de recolha',
            'dias' => 'dias a cobrar',
            'contacto_local' => 'contacto no local',
            'nota_publica' => 'observações',
            'nota_privada' => 'nota interna',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'data_fim_evento.after_or_equal' => 'O fim do evento não pode ser antes do início.',
            'data_entrega.before_or_equal' => 'A entrega tem de ser no dia do evento ou antes.',
            'data_recolha.after_or_equal' => 'A recolha tem de ser no último dia do evento ou depois.',
        ];
    }
}
