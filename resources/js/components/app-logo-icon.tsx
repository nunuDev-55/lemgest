import { cn } from '@/lib/utils';
import { ImgHTMLAttributes } from 'react';

/** Borboleta do logótipo original da LemServ (recortada de public/img/lemservices-logo.png). */
export default function AppLogoIcon({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img src="/img/lemservices-marca.png" alt="" aria-hidden="true" draggable={false} className={cn('object-contain', className)} {...props} />
    );
}

/** Logótipo completo da LemServ: borboleta, "LemServ", "Primamos pela qualidade e conforto", "Lounge e Outdoor". */
export function LogoLemServ({ className, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/img/lemservices-logo.png"
            alt="LemServ — Lounge e Outdoor"
            draggable={false}
            className={cn('object-contain', className)}
            {...props}
        />
    );
}
