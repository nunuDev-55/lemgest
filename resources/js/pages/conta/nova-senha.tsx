import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContaEntradaLayout } from '@/layouts/conta-layout';
import { useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type FormEvent } from 'react';

export default function NovaSenha({ token, email }: { token: string; email: string }) {
    const { data, setData, post, processing, errors } = useForm({ token, email, password: '', password_confirmation: '' });

    function submeter(e: FormEvent) {
        e.preventDefault();
        post('/conta/nova-senha');
    }

    return (
        <ContaEntradaLayout titulo="Escolher senha nova">
            <form onSubmit={submeter} className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required />
                    <InputError message={errors.email} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="password">Senha nova</Label>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        required
                        autoFocus
                    />
                    <InputError message={errors.password} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="password_confirmation">Repetir a senha</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                </div>
                <Button
                    type="submit"
                    className="h-11 w-full rounded-[3px] bg-[var(--tinta)] text-white hover:bg-[var(--tinta)]/90"
                    disabled={processing}
                >
                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                    Guardar senha
                </Button>
            </form>
        </ContaEntradaLayout>
    );
}
