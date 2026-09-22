import type { CSSProperties } from 'react';
import { HueckoMark, PixelIcon, PixelMosaic } from './Pixel';
import { EtiquetaSticker, SelloCircular, StickerRedondo } from './Stickers';

/**
 * Columna de marca de las pantallas de acceso.
 *
 * Vivía duplicada en `LoginPage` y `RegisterPage`, con el mismo contenido
 * escrito dos veces. Ahora es una sola pieza.
 *
 * Tres decisiones de diseño:
 *
 * 1. **Sin testimonio.** Había una cita de «María C., estudiante
 *    universitaria» que nadie dijo nunca. Una reseña inventada en la pantalla
 *    de acceso es lo primero que resta credibilidad a un producto.
 *
 * 2. **Sin orbes difuminados.** Tres círculos borrosos flotando es el fondo
 *    por defecto de cualquier plantilla. En su lugar hay un mosaico pixel que
 *    es una semana de horario, con unos pocos huecos libres en oliva.
 *
 * 3. **Alineado a la izquierda.** El texto centrado obliga al ojo a buscar el
 *    inicio de cada línea. En una columna estrecha con cuatro puntos que se
 *    leen en vertical, el borde izquierdo es el que ordena.
 */

const CAPACIDADES = [
  {
    icon: 'calendar_month',
    titulo: 'Tu horario, una sola vez',
    detalle: 'A mano o subiendo una foto del horario.',
  },
  {
    icon: 'grid_view',
    titulo: 'Los huecos que sí coinciden',
    detalle: 'El cruce del grupo, con el umbral que decidas.',
  },
  {
    icon: 'how_to_vote',
    titulo: 'Se decide votando',
    detalle: 'Y al cerrar el plazo, queda confirmado solo.',
  },
];

/**
 * @param className Colocación. La aporta quien lo usa porque en las pantallas de
 *   acceso el panel no ocupa un hueco de la maquetación: se desplaza por encima
 *   de los dos formularios (ver `AuthPage`).
 * @param style Ancho y desplazamiento, que se calculan en tiempo de ejecución.
 */
export function BrandingPanel({
  className = '',
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <aside
      style={style}
      className={
        'on-brand relative flex flex-col justify-between overflow-hidden bg-ink ' +
        'p-10 xl:p-14 text-cream ' +
        className
      }
    >
      <PixelMosaic />

      <div className="relative z-10 flex items-center gap-3">
        <HueckoMark size={44} className="ring-1 ring-cream/20" />
        <span className="font-headline text-2xl text-cream">Huecko</span>
      </div>

      <div className="relative z-10 max-w-sm">
        <h1 className="font-headline text-4xl xl:text-5xl leading-[1.08] text-cream">
          Coordinar horarios sin discutirlo en el grupo.
        </h1>

        <ul className="mt-10 space-y-6">
          {CAPACIDADES.map((c) => (
            <li key={c.titulo} className="flex gap-3.5">
              <span
                aria-hidden="true"
                className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-olive"
              >
                {c.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-cream">{c.titulo}</span>
                <span className="block text-sm text-cream/70">{c.detalle}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Los stickers solo caben en pantallas altas; en las bajas se quitan
          antes que apretar el texto, que es lo que informa. */}
      <div
        aria-hidden="true"
        className="relative z-10 hidden flex-wrap items-center gap-4 [@media(min-height:820px)]:flex"
      >
        <div className="flex flex-col items-start gap-2">
          <EtiquetaSticker codigo="404" texto="hueco no encontrado" giro={-2} retardo={120} />
          <EtiquetaSticker codigo="200" texto="plan confirmado" tono="oliva" giro={1.5} retardo={220} className="ml-5" />
        </div>
        <SelloCircular arriba="Huecko · café" abajo="modo grupo" giro={-8} retardo={320}>
          <PixelIcon name="taza" size={20} className="text-olive" />
        </SelloCircular>
        <StickerRedondo tono="oliva" size={72} giro={6} retardo={420}>
          <PixelIcon name="auriculares" size={30} />
        </StickerRedondo>
      </div>

      <p className="relative z-10 text-xs text-cream/60">
        Tus bloques de horario son privados: el grupo solo ve cuándo estás libre.
      </p>
    </aside>
  );
}

/** Marca compacta para móvil, donde la columna de arriba no se muestra. */
export function MobileLogo() {
  return (
    <div className="mb-7 flex items-center gap-2.5 lg:hidden">
      <HueckoMark size={36} />
      <span className="font-headline text-xl text-on-surface">Huecko</span>
    </div>
  );
}
