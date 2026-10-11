import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ContaLayout from '@/layouts/conta-layout';
import { useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { type FormEvent, type ReactNode } from 'react';

type Opcao = { valor: string; label: string };

interface Props {
    conta: {
        nome: string;
        email: string;
        telemovel: string;
        nuit: string | null;
        provincia: string | null;
        cidade: string | null;
        bairro: string | null;
        morada: string | null;
    };
    provincias: Opcao[];
}

function Campo({ id, rotulo, erro, children, className }: { id: string; rotulo: string; erro?: string; children: ReactNode; className?: string }) {
    return (
        <div className={`grid content-start gap-1.5 ${className ?? ''}`}>
            <Label htmlFor={id}>{rotulo}</Label>
            {children}
            <InputError message={erro} />
        </div>
    );
}

export default function DadosCliente({ conta, provincias }: Props) {
    const dados = useForm({
        nome: conta.nome,
        telemovel: conta.telemovel,
        provincia: conta.provincia ?? 'MZ-L',
        cidade: conta.cidade ?? '',
        bairro: conta.bairro ?? '',
        morada: conta.morada ?? '',
    });
    const senha = useForm({ senha_actual: '', password: '', password_confirmation: '' });

    function guardarDados(e: FormEvent) {
        e.preventDefault();
        dados.put('/conta/dados', { preserveScroll: true });
    }

    function guardarSenha(e: FormEvent) {
        e.preventDefault();
        senha.put('/conta/senha', { preserveScroll: true, onSuccess: () => senha.reset() });
    }

    return (
        <ContaLayout titulo="Os meus dados">
            <h1 className="font-titulo mb-5 text-[28px] tracking-[-0.015em]">Os meus dados</h1>

            <form onSubmit={guardarDados} className="mb-8 grid max-w-2xl gap-4 rounded-lg border p-5 sm:grid-cols-2">
                <Campo id="nome" rotulo="Nome completo" erro={dados.errors.nome} className="sm:col-span-2">
                    <Input id="nome" value={dados.data.nome} onChange={(e) => dados.setData('nome', e.target.value)} required />
                </Campo>
                <Campo id="email" rotulo="E-mail">
                    <Input id="email" value={conta.email} disabled />
                </Campo>
                <Campo id="telemovel" rotulo="Telemóvel (WhatsApp)" erro={dados.errors.telemovel}>
                    <Input
                        id="telemovel"
                        type="tel"
                        value={dados.data.telemovel}
                        onChange={(e) => dados.setData('telemovel', e.target.value)}
                        required
                    />
                </Campo>
                <Campo id="provincia" rotulo="Província" erro={dados.errors.provincia}>
                    <select
                        id="provincia"
                        value={dados.data.provincia}
                        onChange={(e) => dados.setData('provincia', e.target.value)}
                        className="border-input bg-card focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
                    >
                        {provincias.map((p) => (
                            <option key={p.valor} value={p.valor}>
                                {p.label}
                            </option>
                        ))}
                    </select>
                </Campo>
                <Campo id="cidade" rotulo="Cidade" erro={dados.errors.cidade}>
                    <Input id="cidade" value={dados.data.cidade} onChange={(e) => dados.setData('cidade', e.target.value)} required />
                </Campo>
                <Campo id="bairro" rotulo="Bairro" erro={dados.errors.bairro}>
                    <Input id="bairro" value={dados.data.bairro} onChange={(e) => dados.setData('bairro', e.target.value)} />
                </Campo>
                <Campo id="morada" rotulo="Rua e número" erro={dados.errors.morada}>
                    <Input id="morada" value={dados.data.morada} onChange={(e) => dados.setData('morada', e.target.value)} />
                </Campo>
                {conta.nuit && (
                    <p className="text-muted-foreground text-[13px] sm:col-span-2">NUIT: {conta.nuit}. Para o mudar, fale com a LemServ.</p>
                )}
                <div className="sm:col-span-2">
                    <Button type="submit" disabled={dados.processing}>
                        {dados.processing && <LoaderCircle className="size-4 animate-spin" />}
                        Guardar dados
                    </Button>
                </div>
            </form>

            <h2 className="mb-3 text-[15px] font-semibold">Mudar a senha</h2>
            <form onSubmit={guardarSenha} className="grid max-w-2xl gap-4 rounded-lg border p-5 sm:grid-cols-2">
                <Campo id="senha_actual" rotulo="Senha actual" erro={senha.errors.senha_actual} className="sm:col-span-2">
                    <Input
                        id="senha_actual"
                        type="password"
                        autoComplete="current-password"
                        value={senha.data.senha_actual}
                        onChange={(e) => senha.setData('senha_actual', e.target.value)}
                        required
                    />
                </Campo>
                <Campo id="password" rotulo="Senha nova" erro={senha.errors.password}>
                    <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        value={senha.data.password}
                        onChange={(e) => senha.setData('password', e.target.value)}
                        required
                    />
                </Campo>
                <Campo id="password_confirmation" rotulo="Repetir a senha nova">
                    <Input
                        id="password_confirmation"
                        type="password"
                        autoComplete="new-password"
                        value={senha.data.password_confirmation}
                        onChange={(e) => senha.setData('password_confirmation', e.target.value)}
                        required
                    />
                </Campo>
                <div className="sm:col-span-2">
                    <Button type="submit" variant="outline" disabled={senha.processing}>
                        {senha.processing && <LoaderCircle className="size-4 animate-spin" />}
                        Mudar senha
                    </Button>
                </div>
            </form>
        </ContaLayout>
    );
}
