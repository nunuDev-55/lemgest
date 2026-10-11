import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface OpcaoEscolha {
    valor: string;
    label: string;
    detalhe?: string;
}

interface Props {
    id?: string;
    opcoes: OpcaoEscolha[];
    valor: string | null;
    onChange: (valor: string | null) => void;
    placeholder?: string;
    vazio?: string;
    permitirLimpar?: boolean;
    className?: string;
}

/** Campo de escolha com pesquisa (escreve-se parte do nome e a lista filtra). */
export function Escolher({
    id,
    opcoes,
    valor,
    onChange,
    placeholder = 'Escolher…',
    vazio = 'Nada encontrado',
    permitirLimpar = false,
    className,
}: Props) {
    const [aberto, setAberto] = useState(false);
    const [texto, setTexto] = useState('');
    const [destaque, setDestaque] = useState(0);
    const caixa = useRef<HTMLDivElement>(null);
    const entrada = useRef<HTMLInputElement>(null);
    const listaId = useId();

    const seleccionada = opcoes.find((o) => o.valor === valor) ?? null;
    const filtradas = useMemo(() => {
        const t = texto
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .toLowerCase();
        if (!t) return opcoes.slice(0, 200);
        return opcoes
            .filter((o) =>
                `${o.label} ${o.detalhe ?? ''}`
                    .normalize('NFD')
                    .replace(/\p{Diacritic}/gu, '')
                    .toLowerCase()
                    .includes(t),
            )
            .slice(0, 200);
    }, [opcoes, texto]);

    useEffect(() => {
        function fora(e: MouseEvent) {
            if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
        }
        document.addEventListener('mousedown', fora);
        return () => document.removeEventListener('mousedown', fora);
    }, []);

    function escolher(o: OpcaoEscolha) {
        onChange(o.valor);
        setAberto(false);
        setTexto('');
    }

    function teclas(e: React.KeyboardEvent) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setAberto(true);
            setDestaque((d) => Math.min(d + 1, filtradas.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setDestaque((d) => Math.max(d - 1, 0));
        } else if (e.key === 'Enter' && aberto) {
            e.preventDefault();
            if (filtradas[destaque]) escolher(filtradas[destaque]);
        } else if (e.key === 'Escape') {
            setAberto(false);
        }
    }

    return (
        <div ref={caixa} className={cn('relative', className)}>
            <div
                className={cn('border-input bg-card flex h-9 w-full items-center rounded-md border px-3 text-sm', aberto && 'ring-ring ring-2')}
                onClick={() => {
                    setAberto(true);
                    entrada.current?.focus();
                }}
            >
                <input
                    ref={entrada}
                    id={id}
                    role="combobox"
                    aria-expanded={aberto}
                    aria-controls={listaId}
                    aria-autocomplete="list"
                    className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent outline-none"
                    placeholder={seleccionada ? seleccionada.label : placeholder}
                    value={aberto ? texto : (seleccionada?.label ?? '')}
                    onChange={(e) => {
                        setTexto(e.target.value);
                        setDestaque(0);
                        setAberto(true);
                    }}
                    onFocus={() => setAberto(true)}
                    onKeyDown={teclas}
                />
                {permitirLimpar && seleccionada ? (
                    <button
                        type="button"
                        aria-label="Limpar"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                        }}
                    >
                        <X className="size-4" />
                    </button>
                ) : (
                    <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                )}
            </div>
            {aberto && (
                <ul id={listaId} role="listbox" className="glass-strong absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md p-1 text-sm">
                    {filtradas.length === 0 && <li className="text-muted-foreground px-3 py-2 text-xs">{vazio}</li>}
                    {filtradas.map((o, i) => (
                        <li
                            key={o.valor}
                            role="option"
                            aria-selected={o.valor === valor}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                escolher(o);
                            }}
                            onMouseEnter={() => setDestaque(i)}
                            className={cn(
                                'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5',
                                i === destaque && 'bg-accent text-accent-foreground',
                            )}
                        >
                            <Check className={cn('size-4 shrink-0', o.valor === valor ? 'opacity-100' : 'opacity-0')} />
                            <span className="min-w-0 flex-1 truncate">{o.label}</span>
                            {o.detalhe && <span className="text-muted-foreground shrink-0 text-xs">{o.detalhe}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
