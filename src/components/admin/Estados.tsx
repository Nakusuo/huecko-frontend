import type { ReactNode } from 'react';
import type { EstadoRevision, EstadoSalud } from '../../types/admin.types';

/*
 * Los estados llevan siempre icono y palabra, nunca solo color: se leen igual
 * en blanco y negro o con daltonismo.
 */

const SALUD: Record<EstadoSalud, { texto: string; icon: string; clase: string }> = {
  OK: { texto: 'Funciona', icon: 'check_circle', clase: 'bg-success-container text-on-success-container' },
  DEGRADADO: { texto: 'Con problemas', icon: 'warning', clase: 'bg-warning-container text-on-warning-container' },
  CAIDO: { texto: 'Caído', icon: 'error', clase: 'bg-error-container text-on-error-container' },
};

export function InsigniaSalud({ estado }: { estado: EstadoSalud }) {
  const { texto, icon, clase } = SALUD[estado];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-2xs font-semibold ${clase}`}>
      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">{icon}</span>
      {texto}
    </span>
  );
}

const REVISION: Record<EstadoRevision, { texto: string; icon: string; clase: string }> = {
  NUEVO: { texto: 'Nuevo', icon: 'fiber_new', clase: 'bg-ink text-olive' },
  REVISADO: { texto: 'Revisado', icon: 'visibility', clase: 'bg-surface-container-high text-on-surface' },
  RESUELTO: { texto: 'Resuelto', icon: 'task_alt', clase: 'bg-success-container text-on-success-container' },
};

export function InsigniaRevision({ estado }: { estado: EstadoRevision }) {
  const { texto, icon, clase } = REVISION[estado];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-2xs font-semibold ${clase}`}>
      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">{icon}</span>
      {texto}
    </span>
  );
}

/** Pasar a otro estado: los botones que tienen sentido desde el actual. */
export function AccionesRevision({
  estado,
  ocupado,
  onCambiar,
}: {
  estado: EstadoRevision;
  ocupado: boolean;
  onCambiar: (estado: EstadoRevision) => void;
}) {
  const boton = (destino: EstadoRevision, texto: string, principal = false) => (
    <button
      key={destino}
      type="button"
      disabled={ocupado}
      onClick={() => onCambiar(destino)}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 active:scale-95 ${
        principal
          ? 'bg-primary text-on-primary hover:bg-primary-hover'
          : 'border border-outline-variant text-on-surface hover:bg-surface-container-high'
      }`}
    >
      {texto}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-1.5">
      {estado === 'NUEVO' && boton('REVISADO', 'Marcar revisado')}
      {estado !== 'RESUELTO' && boton('RESUELTO', 'Resolver', true)}
      {estado === 'RESUELTO' && boton('NUEVO', 'Reabrir')}
    </div>
  );
}

/** Para salud y consola en modo demo: miden un servidor que no hay. */
export function SinServidor({ que }: { que: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-outline-variant bg-surface-container p-10 text-center">
      <div className="mb-3 flex h-12 w-12 -rotate-3 items-center justify-center bg-ink text-olive shadow-md">
        <span aria-hidden="true" className="material-symbols-outlined text-[24px]">cloud_off</span>
      </div>
      <p className="font-semibold text-on-surface">Esta sección necesita el backend</p>
      <p className="mt-1 max-w-sm text-sm text-on-surface-variant">
        En modo demo no hay un servidor del que mostrar {que}. Arranca la app con <code>npm run dev</code> y el
        backend levantado.
      </p>
    </div>
  );
}

export function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <div role="alert" className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
      <span>{mensaje}</span>
      <button type="button" onClick={onReintentar} className="font-semibold underline">
        Reintentar
      </button>
    </div>
  );
}

/** Pastillas de filtro de una sola elección. */
export function Filtro<T extends string>({
  etiqueta,
  opciones,
  valor,
  onCambiar,
}: {
  etiqueta: string;
  opciones: { valor: T; texto: ReactNode }[];
  valor: T;
  onCambiar: (valor: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-1.5">
      {opciones.map((o) => (
        <button
          key={o.valor}
          type="button"
          role="radio"
          aria-checked={valor === o.valor}
          onClick={() => onCambiar(o.valor)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            valor === o.valor
              ? 'bg-primary text-on-primary'
              : 'border border-outline-variant text-on-surface-variant hover:text-on-surface'
          }`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}
