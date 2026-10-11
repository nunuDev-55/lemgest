import { Confirmar } from '@/components/confirmar';
import { TituloPagina } from '@/components/erp';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { Head, router, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, ExternalLink, EyeOff, ImagePlus, LoaderCircle, Star, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

interface Foto {
    id: number;
    legenda: string;
    mini: string;
    media: string;
    capa: boolean;
    visivel: boolean;
    horizontal: boolean;
    largura: number;
    altura: number;
}

interface Props {
    fotos: Foto[];
    maximo: number;
    maximoCapa: number;
}

/** Fotos de eventos do site: as marcadas "Na capa" alternam no topo da página inicial; as visíveis formam a galeria */
export default function SiteEGaleria({ fotos, maximo, maximoCapa }: Props) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const entrada = useRef<HTMLInputElement>(null);
    const [aCarregar, setACarregar] = useState(false);
    const [aApagar, setAApagar] = useState<Foto | null>(null);
    const naCapa = fotos.filter((f) => f.capa).length;
    const livres = maximo - fotos.length;

    function carregar(lista: FileList | null) {
        if (!lista || lista.length === 0) return;
        setACarregar(true);
        router.post(
            '/administracao/site/fotos',
            { fotos: Array.from(lista) },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => {
                    setACarregar(false);
                    if (entrada.current) entrada.current.value = '';
                },
            },
        );
    }

    const alterar = (f: Foto, dados: Partial<Pick<Foto, 'legenda' | 'capa' | 'visivel'>>) =>
        router.put(`/administracao/site/fotos/${f.id}`, dados, { preserveScroll: true, preserveState: true });
    const mover = (f: Foto, direcao: 'anterior' | 'seguinte') =>
        router.put(`/administracao/site/fotos/${f.id}/mover`, { direcao }, { preserveScroll: true, preserveState: true });

    return (
        <AppLayout>
            <Head title="Site e galeria" />
            <TituloPagina
                titulo="Site e galeria"
                contagem={fotos.length}
                descricao={`Fotos de eventos que aparecem no site. As marcadas "Na capa" (até ${maximoCapa}) vão alternando no topo da página inicial; as visíveis formam a galeria "Eventos que montámos", pela ordem desta página.`}
                accoes={
                    <>
                        <Button variant="outline" asChild>
                            <a href="/" target="_blank" rel="noopener">
                                <ExternalLink className="size-4" />
                                Ver o site
                            </a>
                        </Button>
                        <Button onClick={() => entrada.current?.click()} disabled={aCarregar || livres <= 0}>
                            {aCarregar ? <LoaderCircle className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                            Adicionar fotos
                        </Button>
                    </>
                }
            />
            <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => carregar(e.target.files)} />
            <InputError message={errors.fotos || errors['fotos.0'] || errors.capa || errors.legenda} className="mb-3" />

            <p className="text-muted-foreground mb-4 text-[13px]">
                Na capa: {naCapa} de {maximoCapa} · {fotos.length} de {maximo} fotos. Para a faixa larga da página inicial, prefira fotos deitadas
                (horizontais).
            </p>

            {fotos.length === 0 ? (
                <button
                    type="button"
                    onClick={() => entrada.current?.click()}
                    className="text-muted-foreground hover:bg-muted flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-16 text-[14px]"
                >
                    <ImagePlus className="size-6" />
                    Ainda não há fotos. Carregue fotos dos vossos eventos (JPG, PNG ou WebP, até 15 MB cada).
                </button>
            ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {fotos.map((f, i) => (
                        <li key={f.id} className={cn('bg-card overflow-hidden rounded-lg border', !f.visivel && 'opacity-60')}>
                            <div className="bg-muted relative aspect-[4/3]">
                                <img src={f.media} alt={f.legenda} loading="lazy" className="size-full object-cover" />
                                <div className="absolute top-2 left-2 flex gap-1.5">
                                    {f.capa && (
                                        <span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium">
                                            <Star className="size-3" />
                                            Capa
                                        </span>
                                    )}
                                    {!f.visivel && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11.5px] font-medium text-white">
                                            <EyeOff className="size-3" />
                                            Escondida
                                        </span>
                                    )}
                                </div>
                                <span className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white tabular-nums">
                                    {f.horizontal ? 'Deitada' : 'Em pé'} · {f.largura}×{f.altura}
                                </span>
                            </div>
                            <div className="grid gap-3 p-3">
                                <textarea
                                    defaultValue={f.legenda}
                                    rows={2}
                                    maxLength={190}
                                    aria-label="Legenda (o que se vê na foto)"
                                    placeholder="O que se vê na foto"
                                    onBlur={(e) => e.target.value.trim() !== f.legenda && alterar(f, { legenda: e.target.value.trim() })}
                                    className="border-input bg-card focus-visible:ring-ring w-full resize-none rounded-md border px-2.5 py-1.5 text-[13px] outline-none focus-visible:ring-2"
                                />
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <Checkbox
                                            checked={f.capa}
                                            disabled={!f.visivel || (!f.capa && naCapa >= maximoCapa)}
                                            onCheckedChange={(v) => alterar(f, { capa: v === true })}
                                        />
                                        Na capa
                                    </label>
                                    <label className="flex cursor-pointer items-center gap-2">
                                        <Checkbox checked={f.visivel} onCheckedChange={(v) => alterar(f, { visivel: v === true })} />
                                        Visível no site
                                    </label>
                                    <div className="ml-auto flex">
                                        <button
                                            type="button"
                                            onClick={() => mover(f, 'anterior')}
                                            disabled={i === 0}
                                            title="Mais para o início"
                                            aria-label="Mover para trás"
                                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5 disabled:opacity-30"
                                        >
                                            <ArrowLeft className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => mover(f, 'seguinte')}
                                            disabled={i === fotos.length - 1}
                                            title="Mais para o fim"
                                            aria-label="Mover para a frente"
                                            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded p-1.5 disabled:opacity-30"
                                        >
                                            <ArrowRight className="size-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAApagar(f)}
                                            title="Apagar"
                                            aria-label="Apagar foto"
                                            className="text-muted-foreground hover:text-destructive hover:bg-muted rounded p-1.5"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <Confirmar
                aberto={aApagar !== null}
                titulo="Apagar esta foto do site?"
                descricao={
                    'A foto sai do site e é apagada. Esta acção não se pode desfazer (para a tirar só por agora, desmarque "Visível no site").'
                }
                textoConfirmar="Apagar"
                perigo
                onConfirmar={() =>
                    aApagar && router.delete(`/administracao/site/fotos/${aApagar.id}`, { preserveScroll: true, onFinish: () => setAApagar(null) })
                }
                onFechar={() => setAApagar(null)}
            />
        </AppLayout>
    );
}
