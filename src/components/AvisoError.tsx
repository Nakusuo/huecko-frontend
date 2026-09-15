interface Props {
  mensaje: string;
  onCerrar: () => void;
}

/**
 * Aviso de que algo no llegó al servidor.
 *
 * Va arriba del contenido y no en un toast que desaparece solo: si un voto o un
 * cambio no se guardó, quien lo hizo tiene que verlo aunque haya apartado la
 * vista un momento.
 */
export function AvisoError({ mensaje, onCerrar }: Props) {
  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[20px] shrink-0">
        error
      </span>
      <p className="flex-1">{mensaje}</p>
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar aviso"
        className="shrink-0 cursor-pointer rounded-md p-0.5 transition-colors hover:bg-on-error-container/10"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
          close
        </span>
      </button>
    </div>
  );
}
