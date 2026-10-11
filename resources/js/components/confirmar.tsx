import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoaderCircle } from 'lucide-react';

interface Props {
    aberto: boolean;
    titulo: string;
    descricao: string;
    textoConfirmar: string;
    perigo?: boolean;
    aProcessar?: boolean;
    onConfirmar: () => void;
    onFechar: () => void;
}

/** Pergunta antes de acções com consequências (desactivar, apagar, emitir). */
export function Confirmar({ aberto, titulo, descricao, textoConfirmar, perigo = false, aProcessar = false, onConfirmar, onFechar }: Props) {
    return (
        <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{titulo}</DialogTitle>
                    <DialogDescription>{descricao}</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onFechar} disabled={aProcessar}>
                        Cancelar
                    </Button>
                    <Button variant={perigo ? 'destructive' : 'default'} onClick={onConfirmar} disabled={aProcessar}>
                        {aProcessar && <LoaderCircle className="size-4 animate-spin" />}
                        {textoConfirmar}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
