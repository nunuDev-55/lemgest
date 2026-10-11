import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { usePode } from '@/hooks/use-pode';
import { ACCOES_RAPIDAS, NAVEGACAO } from '@/lib/navegacao';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { CornerDownLeft, Plus, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

interface Opcao {
    label: string;
    href: string;
    grupo: string;
    accao?: boolean;
}

/** Sem acentos e em minúsculas, para "factura" encontrar "Facturação" e "orcamento" encontrar "Orçamentos" */
function normalizar(texto: string) {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Pesquisa rápida (Ctrl+K): ir para qualquer secção do sistema ou começar um documento novo. */
export function PesquisaRapida({ aberta, onMudar }: { aberta: boolean; onMudar: (v: boolean) => void }) {
    const pode = usePode();
    const [texto, setTexto] = useState('');
    const [indice, setIndice] = useState(0);
    const lista = useRef<HTMLUListElement>(null);

    const opcoes = useMemo<Opcao[]>(() => {
        const todas: Opcao[] = [];
        for (const grupo of NAVEGACAO) {
            for (const item of grupo.itens) {
                if (!pode(item.permissao)) continue;
                todas.push({ label: item.label, href: item.href, grupo: grupo.titulo ?? 'Início' });
                for (const s of item.subitens ?? []) {
                    if (s.href !== item.href && pode(s.permissao)) todas.push({ label: s.label, href: s.href, grupo: item.label });
                }
            }
        }
        for (const a of ACCOES_RAPIDAS) {
            if (pode(a.permissao)) todas.push({ label: a.label, href: a.href, grupo: 'Criar', accao: true });
        }
        return todas;
    }, [pode]);

    const filtradas = useMemo(() => {
        const t = normalizar(texto.trim());
        return t === '' ? opcoes : opcoes.filter((o) => normalizar(`${o.label} ${o.grupo}`).includes(t));
    }, [opcoes, texto]);

    useEffect(() => setIndice(0), [texto]);
    useEffect(() => {
        if (!aberta) setTexto('');
    }, [aberta]);
    useEffect(() => {
        lista.current?.querySelector(`[data-indice="${indice}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [indice]);

    function abrir(o: Opcao) {
        onMudar(false);
        router.visit(o.href);
    }

    function teclas(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setIndice((i) => Math.min(i + 1, filtradas.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setIndice((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && filtradas[indice]) {
            e.preventDefault();
            abrir(filtradas[indice]);
        }
    }

    return (
        <Dialog open={aberta} onOpenChange={onMudar}>
            <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg [&>button]:hidden">
                <DialogTitle className="sr-only">Pesquisa rápida</DialogTitle>
                <div className="flex items-center gap-2 border-b px-3">
                    <Search className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
                    <input
                        autoFocus
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                        onKeyDown={teclas}
                        placeholder="Ir para… ou criar…"
                        aria-label="Pesquisar secções e acções"
                        className="h-12 flex-1 bg-transparent text-[14px] outline-none"
                    />
                </div>
                <ul ref={lista} className="max-h-80 overflow-y-auto p-1.5" role="listbox" aria-label="Resultados">
                    {filtradas.length === 0 && <li className="text-muted-foreground px-3 py-6 text-center text-[13px]">Nada encontrado</li>}
                    {filtradas.map((o, i) => (
                        <li key={`${o.grupo}-${o.href}`} role="option" aria-selected={i === indice}>
                            <button
                                type="button"
                                data-indice={i}
                                onMouseMove={() => setIndice(i)}
                                onClick={() => abrir(o)}
                                className={cn(
                                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13.5px]',
                                    i === indice && 'bg-accent',
                                )}
                            >
                                {o.accao && <Plus className="text-muted-foreground size-4" aria-hidden="true" />}
                                <span className="flex-1">{o.label}</span>
                                <span className="text-muted-foreground text-[12px]">{o.grupo}</span>
                                {i === indice && <CornerDownLeft className="text-muted-foreground size-3.5" aria-hidden="true" />}
                            </button>
                        </li>
                    ))}
                </ul>
            </DialogContent>
        </Dialog>
    );
}
