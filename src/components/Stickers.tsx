import { useId, type CSSProperties, type ReactNode } from 'react';

/**
 * Stickers: las etiquetas y sellos de la identidad visual.
 *
 * Son decoración de marca, no controles. Van ocultos a los lectores de
 * pantalla salvo que el texto aporte algo que no esté ya en la página.
 */

type Tono = 'crema' | 'tinta' | 'oliva';

const FONDO: Record<Tono, string> = {
  crema: 'bg-cream text-ink',
  tinta: 'bg-ink text-cream',
  oliva: 'bg-olive text-ink',
};

/** Giro y retardo de entrada: cada sticker se pega un poco torcido y a su
 *  tiempo, como si alguien los fuera colocando uno a uno. */
function pegado(giro: number, retardo: number): CSSProperties {
  return { ['--giro' as string]: `${giro}deg`, animationDelay: `${retardo}ms` };
}

/** Etiqueta rectangular: «404 / smalltalk not found». */
export function EtiquetaSticker({
  codigo,
  texto,
  tono = 'crema',
  giro = 0,
  retardo = 0,
  className = '',
}: {
  codigo?: string;
  texto: ReactNode;
  tono?: Tono;
  giro?: number;
  retardo?: number;
  className?: string;
}) {
  return (
    <span
      style={pegado(giro, retardo)}
      className={`animate-sticker-in inline-flex flex-col px-4 py-2.5 shadow-md ${FONDO[tono]} ${className}`}
    >
      {codigo && (
        <span className="font-headline text-2xl leading-none tracking-[0.14em]">{codigo}</span>
      )}
      <span className="mt-1 font-headline text-sm leading-tight tracking-[0.12em]">{texto}</span>
    </span>
  );
}

/** Sticker redondo con un icono o una palabra en el centro. */
export function StickerRedondo({
  children,
  tono = 'tinta',
  size = 88,
  giro = 0,
  retardo = 0,
  className = '',
}: {
  children: ReactNode;
  tono?: Tono;
  size?: number;
  giro?: number;
  retardo?: number;
  className?: string;
}) {
  return (
    <span
      style={{ ...pegado(giro, retardo), width: size, height: size }}
      className={`animate-sticker-in inline-flex shrink-0 items-center justify-center rounded-full shadow-md ${FONDO[tono]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Sello circular con texto que recorre el borde, arriba y abajo, y una pieza en
 * el centro —como «NOTALK COFFEE · MODO SILENCIO»—.
 */
export function SelloCircular({
  arriba,
  abajo,
  children,
  size = 112,
  giro = 0,
  retardo = 0,
  className = '',
}: {
  arriba: string;
  abajo: string;
  children: ReactNode;
  size?: number;
  giro?: number;
  retardo?: number;
  className?: string;
}) {
  // Ids propios: dos sellos en la misma página no deben compartir el trazado.
  const id = useId();
  return (
    <span
      style={{ ...pegado(giro, retardo), width: size, height: size }}
      className={`animate-sticker-in relative inline-flex shrink-0 items-center justify-center rounded-full bg-ink text-cream shadow-md ${className}`}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          {/* El texto de arriba corre por el arco superior en sentido horario;
              el de abajo, por el inferior en sentido contrario, para que ninguno
              quede cabeza abajo. */}
          <path id={`${id}-arriba`} d="M 16 50 A 34 34 0 0 1 84 50" />
          <path id={`${id}-abajo`} d="M 12 50 A 38 38 0 0 0 88 50" />
        </defs>
        <text className="rotulo" fontSize="8.5" fill="currentColor" letterSpacing="1.6">
          <textPath href={`#${id}-arriba`} startOffset="50%" textAnchor="middle">
            {arriba}
          </textPath>
        </text>
        <text className="rotulo" fontSize="8.5" fill="currentColor" letterSpacing="1.6">
          <textPath href={`#${id}-abajo`} startOffset="50%" textAnchor="middle">
            {abajo}
          </textPath>
        </text>
        <circle cx="11" cy="50" r="2" fill="currentColor" />
        <circle cx="89" cy="50" r="2" fill="currentColor" />
      </svg>
      {children}
    </span>
  );
}
