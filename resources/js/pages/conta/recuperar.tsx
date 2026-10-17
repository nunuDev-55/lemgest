import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContaEntradaLayout } from '@/layouts/conta-layout';
import { Link, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type FormEvent } from 'react';

export default function Recuperar({ estado }: { estado?: string | null }) {
    const { data, setData, post, processing, errors } = useForm({ email: '' });

    function submeter(e: FormEvent) {
        e.preventDefault();
        post('/conta/recuperar');
    }

    return (
        <ContaEntradaLayout
            titulo="Esqueceu-se da senha?"
            descricao="Escreva o e-mail da sua conta. Enviamos uma ligação para escolher uma senha nova."
        >
            {estado && (
                <p className="mb-4 rounded-md border border-green-300/40 bg-green-400/15 px-3 py-2.5 text-[13.5px] text-green-100">{estado}</p>
            )}
            <form onSubmit={submeter} className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        autoFocus
                        required
                    />
                    <InputError message={errors.email} />
                </div>
                <Button
                    type="submit"
                    className="maiusculas-pequenas h-11 w-full rounded-[3px] bg-[var(--dourado)] font-medium text-[var(--tinta)] hover:bg-[var(--dourado)]/90"
                    disabled={processing}
                >
                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                    Enviar ligação
                </Button>
            </form>
            <p className="text-muted-foreground mt-5 text-center text-[13.5px]">
                <Link href="/conta/entrar" className="hover:text-foreground">
                    Voltar a entrar
                </Link>
            </p>
        </ContaEntradaLayout>
    );
}
