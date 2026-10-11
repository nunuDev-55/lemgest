import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';
import { initializeTheme } from './hooks/use-appearance';

declare global {
    const route: typeof routeFn;
}

const appName = import.meta.env.VITE_APP_NAME || 'LemGest';

createInertiaApp({
    // As páginas do site já trazem o nome da LemServ; as do sistema interno levam "- LemGest"
    title: (title) => (title.includes('LemServ') ? title : `${title} - ${appName}`),
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    // Barra fina no topo enquanto se muda de página (cor da marca, visível no tema claro e no escuro)
    progress: {
        color: '#b0579f',
        delay: 150,
    },
});

// This will set light / dark mode on load...
initializeTheme();
