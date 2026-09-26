import type { ReactNode } from 'react';

/** Cifra suelta: cuando el dato es un número, no hace falta un gráfico. */
export default function Indicador({
  etiqueta,
  valor,
  detalle,
  icon,
}: {
  etiqueta: string;
  valor: ReactNode;
  detalle?: ReactNode;
  icon: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant">
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">{icon}</span>
        {etiqueta}
      </span>
      <span className="font-headline text-3xl leading-tight text-on-surface tabular-nums">{valor}</span>
      {detalle && <span className="text-xs text-on-surface-variant">{detalle}</span>}
    </div>
  );
}
