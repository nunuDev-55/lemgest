import { useAppearance } from '@/hooks/use-appearance';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';

/** Mostra como notificação as mensagens 'sucesso' e 'erro' que o backend envia depois de cada acção. */
export function Notificacoes() {
    const { flash } = usePage<SharedData>().props;
    const { appearance } = useAppearance();

    useEffect(() => {
        if (flash.sucesso) toast.success(flash.sucesso);
        if (flash.erro) toast.error(flash.erro);
    }, [flash]);

    return (
        <Toaster
            position="top-right"
            theme={appearance}
            richColors
            closeButton
            toastOptions={{ classNames: { toast: 'glass-strong !rounded-lg font-sans' } }}
        />
    );
}
