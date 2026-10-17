import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContaEntradaLayout } from '@/layouts/conta-layout';
import { Link, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type FormEvent, type ReactNode } from 'react';

type Opcao = { valor: string; label: string };

function Campo({
    id,
    rotulo,
    erro,
    ajuda,
    children,
    className,
}: {
    id: string;
    rotulo: string;
    erro?: string;
    ajuda?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={`grid content-start gap-1.5 ${className ?? ''}`}>
            <Label htmlFor={id}>{rotulo}</Label>
            {children}
            {ajuda && <p className="text-muted-foreground text-xs">{ajuda}</p>}
            <InputError message={erro} />
        </div>
    );
}

export default function Registar({ provincias }: { provincias: Opcao[] }) {
    const { data, setData, post, processing, errors } = useForm({
        nome: '',
        telemovel: '',
        email: '',
        nuit: '',
        provincia: 'MZ-L',
        cidade: '',
        bairro: '',
        morada: '',
        password: '',
        password_confirmation: '',
    });

    function submeter(e: FormEvent) {
        e.preventDefault();
        post('/conta/registar');
    }

    return (
        <ContaEntradaLayout
            largo
            titulo="Criar conta"
            descricao="Com a conta, acompanha as suas reservas e facturas. A LemServ confirma os seus dados antes do primeiro acesso."
        >
            <form onSubmit={submeter} className="grid gap-4 sm:grid-cols-2">
                <Campo id="nome" rotulo="Nome completo" erro={errors.nome} className="sm:col-span-2">
                    <Input id="nome" autoComplete="name" value={data.nome} onChange={(e) => setData('nome', e.target.value)} required autoFocus />
                </Campo>
                <Campo id="telemovel" rotulo="Telemóvel (WhatsApp)" erro={errors.telemovel}>
                    <Input
                        id="telemovel"
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="84 123 4567"
                        value={data.telemovel}
                        onChange={(e) => setData('telemovel', e.target.value)}
                        required
                    />
                </Campo>
                <Campo id="email" rotulo="E-mail" erro={errors.email}>
                    <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                    />
                </Campo>
                <Campo id="nuit" rotulo="NUIT (opcional)" erro={errors.nuit} ajuda="Para as facturas saírem com o seu NUIT.">
                    <Input id="nuit" inputMode="numeric" value={data.nuit} onChange={(e) => setData('nuit', e.target.value)} maxLength={11} />
                </Campo>
                <Campo id="provincia" rotulo="Província" erro={errors.provincia}>
                    <select
                        id="provincia"
                        value={data.provincia}
                        onChange={(e) => setData('provincia', e.target.value)}
                        className="border-input bg-card focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
                    >
                        {provincias.map((p) => (
                            <option key={p.valor} value={p.valor}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </Campo>
                <Campo id="cidade" rotulo="Cidade" erro={errors.cidade}>
                    <Input
                        id="cidade"
                        autoComplete="address-level2"
                        placeholder="Ex.: Matola"
                        value={data.cidade}
                        onChange={(e) => setData('cidade', e.target.value)}
                        required
                    />
                </Campo>
                <Campo id="bairro" rotulo="Bairro" erro={errors.bairro}>
                    <Input id="bairro" placeholder="Ex.: Matola G" value={data.bairro} onChange={(e) => setData('bairro', e.target.value)} />
                </Campo>
                <Campo id="morada" rotulo="Rua e número" erro={errors.morada} className="sm:col-span-2">
                    <Input
                        id="morada"
                        autoComplete="street-address"
                        placeholder="Ex.: Rua 4, casa 12"
                        value={data.morada}
                        onChange={(e) => setData('morada', e.target.value)}
                    />
                </Campo>
                <Campo id="password" rotulo="Senha" erro={errors.password} ajuda="Pelo menos 8 caracteres.">
                    <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        required
                    />
                </Campo>
                <Campo id="password_confirmation" rotulo="Repetir a senha">
                    <Input
                        id="password_confirmation"
                        type="password"
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        required
                    />
                </Campo>
                <Button
                    type="submit"
                    className="maiusculas-pequenas mt-1 h-11 w-full rounded-[3px] bg-[var(--dourado)] font-medium text-[var(--tinta)] hover:bg-[var(--dourado)]/90 sm:col-span-2"
                    disabled={processing}
                >
                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                    Pedir conta
                </Button>
            </form>
            <p className="text-muted-foreground mt-5 text-center text-[13.5px]">
                Já tem conta?{' '}
                <Link href="/conta/entrar" className="text-foreground font-medium underline-offset-4 hover:underline">
                    Entrar
                </Link>
            </p>
        </ContaEntradaLayout>
    );
}
