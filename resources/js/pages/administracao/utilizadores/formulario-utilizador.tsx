import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler, useEffect } from 'react';
import { type Utilizador } from './index';

type Campos = {
    name: string;
    email: string;
    phone: string;
    perfil: string;
    password: string;
    password_confirmation: string;
};

interface Props {
    aberto: boolean;
    utilizador: Utilizador | null; // null = novo utilizador
    perfis: string[];
    onFechar: () => void;
}

export function FormularioUtilizador({ aberto, utilizador, perfis, onFechar }: Props) {
    const aEditar = utilizador !== null;
    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<Campos>({
        name: '',
        email: '',
        phone: '',
        perfil: '',
        password: '',
        password_confirmation: '',
    });

    // Preenche o formulário sempre que abre (vazio para novo, com os dados para editar)
    useEffect(() => {
        if (!aberto) return;
        clearErrors();
        setData({
            name: utilizador?.name ?? '',
            email: utilizador?.email ?? '',
            phone: utilizador?.phone ?? '',
            perfil: utilizador?.perfil ?? '',
            password: '',
            password_confirmation: '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [aberto, utilizador]);

    const submeter: FormEventHandler = (e) => {
        e.preventDefault();
        const opcoes = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onFechar();
            },
        };
        if (aEditar) {
            put(route('utilizadores.update', utilizador.id), opcoes);
        } else {
            post(route('utilizadores.store'), opcoes);
        }
    };

    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{aEditar ? 'Editar utilizador' : 'Novo utilizador'}</DialogTitle>
                    <DialogDescription>
                        {aEditar ? 'Altere os dados ou o perfil de acesso.' : 'A pessoa entra no LemGest com este e-mail e a senha que definir.'}
                    </DialogDescription>
                </DialogHeader>

                <form id="form-utilizador" onSubmit={submeter} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nome completo</Label>
                        <Input
                            id="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            autoFocus
                            placeholder="Ex.: Ana Macuácua"
                        />
                        <InputError message={errors.name} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                placeholder="nome@empresa.co.mz"
                            />
                            <InputError message={errors.email} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone">Telefone (opcional)</Label>
                            <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} placeholder="84 123 4567" />
                            <InputError message={errors.phone} />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="perfil">Perfil de acesso</Label>
                        <Select value={data.perfil} onValueChange={(v) => setData('perfil', v)}>
                            <SelectTrigger id="perfil">
                                <SelectValue placeholder="Escolha o perfil" />
                            </SelectTrigger>
                            <SelectContent>
                                {perfis.map((p) => (
                                    <SelectItem key={p} value={p}>
                                        {p}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.perfil} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="password">{aEditar ? 'Nova senha' : 'Senha'}</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder={aEditar ? 'Deixe vazio para manter' : 'Mínimo 8 caracteres'}
                            />
                            <InputError message={errors.password} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">Confirmar senha</Label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                autoComplete="new-password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                            />
                        </div>
                    </div>
                </form>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={onFechar} disabled={processing}>
                        Cancelar
                    </Button>
                    <Button type="submit" form="form-utilizador" disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        {aEditar ? 'Guardar alterações' : 'Criar utilizador'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
