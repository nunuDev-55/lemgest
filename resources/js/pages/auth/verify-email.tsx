// Components
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <AuthLayout title="Confirmar e-mail" description="Confirme o seu e-mail clicando no link que acabámos de lhe enviar.">
            <Head title="Confirmação de e-mail" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    Foi enviado um novo link de confirmação para o e-mail que indicou no registo.
                </div>
            )}

            <form onSubmit={submit} className="space-y-6 text-center">
                <Button disabled={processing} variant="secondary">
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Reenviar e-mail de confirmação
                </Button>

                <TextLink href={route('logout')} method="post" className="mx-auto block text-sm">
                    Terminar sessão
                </TextLink>
            </form>
        </AuthLayout>
    );
}
