<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** E-mail com a ligação para o cliente escolher uma senha nova */
class NovaSenhaCliente extends Notification
{
    public function __construct(public readonly string $token) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = route('conta.nova-senha', ['token' => $this->token, 'email' => $notifiable->getEmailForPasswordReset()]);

        return (new MailMessage)
            ->subject('Nova senha — LemServ')
            ->greeting("Olá {$notifiable->nome},")
            ->line('Recebemos um pedido para mudar a senha da sua conta na LemServ.')
            ->action('Escolher nova senha', $url)
            ->line('A ligação é válida durante 60 minutos. Se não fez este pedido, pode ignorar este e-mail.')
            ->salutation('LemServ — Lounge e Outdoor');
    }
}
