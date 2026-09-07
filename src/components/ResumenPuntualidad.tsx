import type { Retraso } from '../types/incidents.types';

/**
 * Estado de puntualidad del evento (RF-14).
 *
 * El criterio de HU-12 es «de un vistazo, sin leer todo el historial del
 * chat», así que se ordena por minutos de mayor a menor: quien más tarda es
 * quien condiciona si se empieza o se espera, y es lo primero que se busca.
 *
 * Los minutos van en `tabular-nums` para que la columna no baile al
 * actualizarse en vivo.
 */

interface Props {
  retrasos: Retraso[];
  /** Para marcar la fila propia sin depender del nombre. */
  usuarioId?: string;
  cargando?: boolean;
}

export function ResumenPuntualidad({ retrasos, usuarioId, cargando = false }: Props) {
  if (cargando) {
    return (
      <p className="py-2 text-xs text-on-surface-variant" aria-live="polite">
        Comprobando quién llega tarde…
      </p>
    );
  }

  if (retrasos.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-success-container/50 px-3 py-2.5">
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[1.125rem] text-on-success-container"
        >
          schedule
        </span>
        <p className="text-xs font-semibold text-on-success-container">
          Nadie ha avisado de retrasos.
        </p>
      </div>
    );
  }

  const ordenados = [...retrasos].sort((a, b) => b.minutosEstimados - a.minutosEstimados);
  const peor = ordenados[0].minutosEstimados;

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-on-surface-variant">
        <strong className="font-bold text-on-surface tabular-nums">{ordenados.length}</strong>
        {ordenados.length === 1 ? ' persona llega tarde' : ' personas llegan tarde'}
        {' · el mayor retraso es de '}
        <strong className="font-bold text-on-surface tabular-nums">{peor} min</strong>
      </p>

      <ul className="space-y-1">
        {ordenados.map((retraso) => {
          const soyYo = retraso.usuarioId === usuarioId;
          return (
            <li
              key={retraso.usuarioId}
              className="flex items-center gap-2.5 rounded-xl bg-surface-container-lowest px-3 py-2"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-warning-container text-2xs font-bold text-on-warning-container">
                {retraso.nombreUsuario.charAt(0).toUpperCase()}
              </span>

              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-on-surface">
                {soyYo ? 'Tú' : retraso.nombreUsuario}
                {retraso.corregido && (
                  <span className="ml-1.5 text-2xs font-normal text-on-surface-variant">
                    (corregido)
                  </span>
                )}
              </span>

              <span className="shrink-0 rounded-lg bg-warning-container px-2 py-0.5 text-2xs font-bold tabular-nums text-on-warning-container">
                +{retraso.minutosEstimados} min
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
