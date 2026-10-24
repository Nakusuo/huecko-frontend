import { useState } from 'react';
import { mensajeDeFalloIA, resumirVotacion, TEXTO_RECOMENDACION } from '../services/planesIaService';
import type { ResumenVotacion } from '../services/planesIaService';

/**
 * «Resumen con Huecko IA» de la votación de un plan, como en la app móvil.
 *
 * Solo se pide al pulsar (cada resumen gasta cupo de IA) y solo informa:
 * cerrar, esperar o reprogramar lo sigue haciendo quien organiza con los
 * botones de siempre. Por eso la sugerencia no se convierte en un botón.
 */
export function ResumenVotacionIA({ planId }: { planId: string }) {
  const [resumen, setResumen] = useState<ResumenVotacion | null>(null);
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumir = async () => {
    if (pensando) return;
    setPensando(true);
    setError(null);
    try {
      setResumen(await resumirVotacion(planId));
    } catch (fallo) {
      // Si falla al actualizar, se queda el resumen anterior.
      setError(mensajeDeFalloIA(fallo));
    } finally {
      setPensando(false);
    }
  };

  const boton = (
    <button
      type="button"
      onClick={() => void resumir()}
      disabled={pensando}
      className="text-2xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
    >
      <span aria-hidden="true" className={`material-symbols-outlined text-[14px] ${pensando ? 'animate-spin' : ''}`}>
        {pensando ? 'progress_activity' : 'auto_awesome'}
      </span>
      {pensando ? 'Resumiendo…' : resumen ? 'Actualizar resumen' : 'Resumir con Huecko IA'}
    </button>
  );

  return (
    <div className="mb-3">
      {resumen ? (
        <aside
          aria-label="Resumen con Huecko IA"
          className="rounded-xl bg-surface-container-lowest/70 border border-outline-variant/60 px-3 py-2 space-y-1.5"
        >
          <p className="text-xs text-on-surface">{resumen.resumen}</p>
          {resumen.recomendacion && (
            <p className="text-xs text-on-surface-variant">
              <span className="font-bold text-on-surface">Sugerencia: {TEXTO_RECOMENDACION[resumen.recomendacion]}.</span>{' '}
              Porque {resumen.razon}.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-2xs text-on-surface-variant/75">Solo es una sugerencia: Huecko IA no cambia nada del plan.</span>
            {boton}
          </div>
        </aside>
      ) : (
        boton
      )}
      {error && (
        <p role="alert" className="mt-1 text-2xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
