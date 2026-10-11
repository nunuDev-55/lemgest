import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/**
 * Diz se o utilizador tem uma permissão (ou, com uma lista, pelo menos uma delas),
 * para mostrar ou esconder menus e botões.
 * É só conforto visual: o backend verifica sempre a permissão em cada pedido.
 */
export function usePode() {
    const { permissoes } = usePage<SharedData>().props.auth;

    return (permissao?: string | string[]) =>
        permissao === undefined || (Array.isArray(permissao) ? permissao.some((p) => permissoes.includes(p)) : permissoes.includes(permissao));
}
