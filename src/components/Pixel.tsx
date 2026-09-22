/**
 * Piezas pixel de la identidad de Huecko: iconos dibujados en rejilla, la marca
 * y el mosaico de los paneles oscuros.
 *
 * Los iconos se escriben como filas de texto (`#` pinta, `.` no) en vez de como
 * SVG exportado: así se pueden leer y retocar aquí mismo, y todos comparten el
 * mismo grosor de trazo —una celda—, que es lo que los hace parecer de la misma
 * familia.
 */

const ICONOS = {
  taza: [
    '.##########...',
    '.#........###.',
    '.#........#.#.',
    '.#........#.#.',
    '.#........###.',
    '.#........#...',
    '..#......#....',
    '...######.....',
  ],
  auriculares: [
    '...######...',
    '..#......#..',
    '.#........#.',
    '.#........#.',
    '###......###',
    '###......###',
    '###......###',
    '.##......##.',
  ],
  calendario: [
    '..#....#..',
    '##########',
    '#........#',
    '##########',
    '#........#',
    '#.##..##.#',
    '#.##..##.#',
    '#........#',
    '##########',
  ],
} as const;

export type NombreIconoPixel = keyof typeof ICONOS;

/** Convierte las filas en un único `path`, fundiendo las celdas contiguas de
 *  cada fila en un rectángulo: menos nodos y sin costuras entre celdas. */
function trazar(filas: readonly string[]): string {
  let d = '';
  filas.forEach((fila, y) => {
    let x = 0;
    while (x < fila.length) {
      if (fila[x] !== '#') {
        x++;
        continue;
      }
      let largo = 1;
      while (fila[x + largo] === '#') largo++;
      d += `M${x} ${y}h${largo}v1h-${largo}z`;
      x += largo;
    }
  });
  return d;
}

/**
 * Icono pixel. Toma el color del texto (`currentColor`) y el alto de `size`;
 * el ancho sale de la proporción de la rejilla.
 */
export function PixelIcon({
  name,
  size = 24,
  className = '',
  title,
}: {
  name: NombreIconoPixel;
  size?: number;
  className?: string;
  /** Sin `title` el icono es decorativo y se oculta a los lectores de pantalla. */
  title?: string;
}) {
  const filas = ICONOS[name];
  const ancho = filas[0].length;
  const alto = filas.length;

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      height={size}
      width={(size * ancho) / alto}
      className={`pixel shrink-0 ${className}`}
      fill="currentColor"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={trazar(filas)} />
    </svg>
  );
}

/** La «H» de la marca, la misma geometría que el favicon. */
export function HueckoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center bg-ink ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 16 16" width={size} height={size} className="pixel" fill="var(--color-cream)">
        <path d="M4 3h2v4h4V3h2v10h-2V9H6v4H4z" />
      </svg>
    </span>
  );
}

type Celda = { x: number; y: number; fill: string };

/** Pseudoaleatorio de semilla fija (Park–Miller): mismo dibujo en cada visita. */
function generarCeldas(columnas: number, filas: number): Celda[] {
  let semilla = 7;
  const azar = () => {
    semilla = (semilla * 16807) % 2147483647;
    return semilla / 2147483647;
  };

  const celdas: Celda[] = [];
  for (let y = 0; y < filas; y++) {
    for (let x = 0; x < columnas; x++) {
      const r = azar();
      if (r > 0.965) celdas.push({ x, y, fill: 'rgb(125 148 96 / 0.2)' });
      else if (r > 0.55) celdas.push({ x, y, fill: `rgb(255 255 255 / ${(0.01 + (r - 0.55) * 0.055).toFixed(3)})` });
    }
  }
  return celdas;
}

/**
 * Mosaico de celdas de tinta, como el fondo de los stickers redondos oscuros.
 *
 * No es ruido: son celdas de un horario (días en columnas, horas en filas)
 * y unas pocas, en oliva, son los huecos libres. Se genera con una semilla fija
 * para que el dibujo sea el mismo en cada visita y no «baile» al recargar.
 */
export function PixelMosaic({
  columnas = 14,
  filas = 20,
  className = '',
}: {
  columnas?: number;
  filas?: number;
  className?: string;
}) {
  const celdas = generarCeldas(columnas, filas);

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${columnas} ${filas}`}
      preserveAspectRatio="xMidYMid slice"
      className={`pixel pointer-events-none absolute inset-0 h-full w-full ${className}`}
    >
      {celdas.map((c) => (
        <rect key={`${c.x}-${c.y}`} x={c.x} y={c.y} width="1" height="1" fill={c.fill} />
      ))}
    </svg>
  );
}
