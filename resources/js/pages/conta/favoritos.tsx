import { CartaoProduto, type ProdutoLoja } from '@/components/site';
import ContaLayout from '@/layouts/conta-layout';
import { Link } from '@inertiajs/react';
import { Heart } from 'lucide-react';

/** A minha conta → Favoritos: as peças guardadas com o coração (♡) no catálogo */
export default function Favoritos({ produtos }: { produtos: ProdutoLoja[] }) {
    return (
        <ContaLayout titulo="Favoritos">
            <h1 className="font-titulo mb-1 text-[28px] tracking-[-0.015em]">Os meus favoritos</h1>
            <p className="text-muted-foreground mb-6 text-[14px]">
                As peças que guardou no catálogo. Junte-as à sua reserva com o "+" quando decidir.
            </p>

            {produtos.length === 0 ? (
                <div className="rounded-xl border px-4 py-14 text-center">
                    <Heart className="text-muted-foreground mx-auto size-7" strokeWidth={1.5} />
                    <p className="mt-3 text-[14.5px] font-medium">Ainda não guardou peças.</p>
                    <p className="text-muted-foreground mt-1 text-[13.5px]">No catálogo, toque no coração de uma peça para a guardar aqui.</p>
                    <Link
                        href="/catalogo"
                        className="maiusculas-pequenas mt-6 inline-flex rounded-[3px] bg-[var(--tinta)] px-5 py-3.5 font-medium text-[#efe6da]"
                    >
                        Ir ao catálogo
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-10 md:grid-cols-3">
                    {produtos.map((p) => (
                        <CartaoProduto key={p.id} p={p} />
                    ))}
                </div>
            )}
        </ContaLayout>
    );
}
