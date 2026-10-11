import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContaEntradaLayout } from '@/layouts/conta-layout';
import { Link, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type FormEvent } from 'react';

export default function Entrar({ estado }: { estado?: string | null }) {
    const { data, setData, post, processing, errors, reset } = useForm({ email: '', password: '' });

    function submeter(e: FormEvent) {
        e.preventDefault();
        post('/conta/entrar', { onFinish: () => reset('password') });
    }

    return (
        <ContaEntradaLayout titulo="Entrar na sua conta" descricao="Veja os preços, a disponibilidade e as suas reservas.">
            {estado && (
                <p className="mb-4 rounded-md border border-green-300 bg-green-50 px-3 py-2.5 text-[13.5px] text-green-900 dark:border-green-900 dark:bg-green-950/50 dark:text-green-200">
                    {estado}
                </p>
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
                <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">Senha</Label>
                        <Link href="/conta/recuperar" className="text-muted-foreground hover:text-foreground text-[13px]">
                            Esqueceu-se da senha?
                        </Link>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                    <InputError message={errors.password} />
                </div>
                <Button
                    type="submit"
                    className="mt-1 h-11 w-full rounded-full bg-[var(--tinta)] text-white hover:bg-[var(--tinta)]/90"
                    disabled={processing}
                >
                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                    Entrar
                </Button>
            </form>
            <p className="text-muted-foreground mt-5 text-center text-[13.5px]">
                Ainda não tem conta?{' '}
                <Link href="/conta/registar" className="text-foreground font-medium underline-offset-4 hover:underline">
                    Criar conta
                </Link>
            </p>
        </ContaEntradaLayout>
    );
}
