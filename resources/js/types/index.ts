import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
    perfil: string | null;
    permissoes: string[];
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Permissão necessária para ver o item no menu */
    permissao?: string;
}

export interface Flash {
    sucesso?: string | null;
    erro?: string | null;
}

export interface SharedData {
    name: string;
    auth: Auth;
    flash: Flash;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string;
    email_verified_at?: string | null;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown; // This allows for additional properties...
}

/** Resposta paginada do Laravel (->paginate()) */
export interface Paginado<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}
