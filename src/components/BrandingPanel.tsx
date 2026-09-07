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
 *    por defecto de cualquier plantilla. En su lugar hay una rejilla de
 *    horario, que es literalmente el objeto del producto.
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

export function BrandingPanel() {
  return (
    <aside className="on-brand relative hidden lg:flex lg:w-[44%] xl:w-2/5 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-deep via-primary-hover to-primary p-10 xl:p-14 text-white">
      <RejillaHorario />

      <div className="relative z-10 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-white/12">
          <span className="text-2xl font-black tracking-tighter text-white">H</span>
        </div>
        <span className="font-headline text-2xl font-bold tracking-tight text-white">Huecko</span>
      </div>

      <div className="relative z-10 max-w-sm">
        <h1 className="font-headline text-4xl xl:text-5xl font-bold leading-[1.08] tracking-tight text-white">
          Coordinar horarios sin discutirlo en el grupo.
        </h1>

        <ul className="mt-10 space-y-6">
          {CAPACIDADES.map((c) => (
            <li key={c.titulo} className="flex gap-3.5">
              <span
                aria-hidden="true"
                className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-primary-container"
              >
                {c.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{c.titulo}</span>
                <span className="block text-sm text-primary-container/85">{c.detalle}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-primary-container/70">
        Tus bloques de horario son privados: el grupo solo ve cuándo estás libre.
      </p>
    </aside>
  );
}

/**
 * Rejilla de horario del fondo.
 *
 * Es la textura del propio producto —columnas de días, filas de horas— y no un
 * adorno genérico. Va muy tenue: tiene que leerse como papel pautado, no como
 * un patrón.
 */
function RejillaHorario() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.07]"
      style={{
        backgroundImage:
          'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
        backgroundSize: '88px 56px',
        maskImage: 'radial-gradient(120% 90% at 20% 15%, #000 30%, transparent 78%)',
        WebkitMaskImage: 'radial-gradient(120% 90% at 20% 15%, #000 30%, transparent 78%)',
      }}
    />
  );
}

/** Marca compacta para móvil, donde la columna de arriba no se muestra. */
export function MobileLogo() {
  return (
    <div className="mb-7 flex items-center gap-2.5 lg:hidden">
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary">
        <span className="text-lg font-black text-on-primary">H</span>
      </div>
      <span className="font-headline text-xl font-bold tracking-tight text-on-surface">Huecko</span>
    </div>
  );
}
