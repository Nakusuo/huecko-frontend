import { useState } from 'react';

/**
 * Gráficos del panel, en HTML y no con una librería: son dos formas simples
 * (columnas por semana y barras horizontales) y así heredan tipografía, tokens
 * y el ancho del contenedor sin configuración.
 *
 * Reglas de todos: una sola serie por gráfico (sin leyenda: el título dice qué
 * es), barras finas con la punta redondeada y la base recta, texto siempre en
 * tinta y nunca en el color del dato, y el valor de cada barra al pasar o
 * enfocar. La tabla equivalente está en la página.
 */

const fechaCorta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });

export interface PuntoSemana {
  inicio: string;
  valor: number;
}

/** Columnas por semana. Rotula solo la semana actual; el resto, al pasar por encima. */
export function ColumnasSemanales({ titulo, puntos }: { titulo: string; puntos: PuntoSemana[] }) {
  const [activo, setActivo] = useState<number | null>(null);
  const maximo = Math.max(1, ...puntos.map((p) => p.valor));
  const ultimo = puntos.length - 1;
  const destacado = activo ?? ultimo;

  return (
    <figure className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-on-surface">{titulo}</span>
        {/* Lectura de la barra activa (o de la semana actual): sustituye al tooltip flotante. */}
        <span className="text-2xs text-on-surface-variant" aria-live="polite">
          {activo === null ? 'Esta semana' : `Semana del ${fechaCorta(puntos[destacado].inicio)}`}:{' '}
          <strong className="font-headline text-sm text-on-surface">{puntos[destacado]?.valor ?? 0}</strong>
        </span>
      </figcaption>

      <div className="relative mt-4 h-28 border-b border-outline-variant" onMouseLeave={() => setActivo(null)}>
        <div className="flex h-full items-end gap-[2px]">
          {puntos.map((p, i) => (
            <button
              key={p.inicio}
              type="button"
              onMouseEnter={() => setActivo(i)}
              onFocus={() => setActivo(i)}
              onBlur={() => setActivo(null)}
              aria-label={`Semana del ${fechaCorta(p.inicio)}: ${p.valor}`}
              // La zona que responde al puntero es toda la columna, no solo la barra.
              className="group flex h-full flex-1 cursor-default items-end justify-center rounded-sm focus-visible:outline-2 focus-visible:outline-secondary"
            >
              <span
                className={`block w-full max-w-6 rounded-t-[4px] transition-opacity ${
                  activo !== null && activo !== i ? 'opacity-40' : ''
                } ${p.valor === 0 ? 'bg-outline-variant' : 'bg-dato'}`}
                // Un cero se ve como una raya en la base: «no hubo nada», no «falta el dato».
                style={{ height: p.valor === 0 ? '2px' : `${Math.max(4, (p.valor / maximo) * 100)}%` }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1.5 flex justify-between text-2xs text-on-surface-variant">
        <span>{puntos[0] && fechaCorta(puntos[0].inicio)}</span>
        <span>{puntos[ultimo] && fechaCorta(puntos[ultimo].inicio)}</span>
      </div>
    </figure>
  );
}

export interface FilaBarra {
  etiqueta: string;
  valor: number;
}

/** Barras horizontales con la etiqueta a la izquierda y el valor en la punta. */
export function BarrasHorizontales({ filas }: { filas: FilaBarra[] }) {
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="flex flex-col gap-2.5">
      {filas.map((f) => (
        <li key={f.etiqueta} className="grid grid-cols-[8.5rem_1fr] items-center gap-3 text-sm">
          <span className="truncate text-on-surface-variant">{f.etiqueta}</span>
          <span className="flex items-center gap-2">
            <span
              className={`block h-3 rounded-r-[4px] ${f.valor === 0 ? 'w-[2px] bg-outline-variant' : 'bg-dato'}`}
              style={f.valor === 0 ? undefined : { width: `${Math.max(2, (f.valor / maximo) * 85)}%` }}
            />
            <span className="font-headline text-sm tabular-nums text-on-surface">{f.valor}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
