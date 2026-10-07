import { sugerenciaDe } from '../lib/sugerenciaIA';
import type { VotacionExpres } from '../types/incidents.types';

/**
 * Lo que sugiere la IA en una votación exprés.
 *
 * Va marcado como automático y como consejo: si pareciera la opción
 * «correcta», el grupo votaría por inercia en vez de decidir. Por lo mismo
 * no se resalta el botón de esa opción.
 */
export function SugerenciaIA({ votacion }: { votacion: VotacionExpres }) {
  const sugerencia = sugerenciaDe(votacion);
  if (!sugerencia) return null;

  return (
    <aside
      aria-label="Sugerencia automática"
      className="mx-3 mb-2 flex items-start gap-2 rounded-xl bg-surface-container-lowest/70 px-3 py-2 sm:mx-4"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[1rem] text-primary">
        auto_awesome
      </span>
      <p className="text-xs text-on-surface-variant">
        <span className="font-bold text-on-surface">Sugerencia automática: {sugerencia.titulo}.</span>{' '}
        Porque {sugerencia.razon}.{' '}
        <span className="text-on-surface-variant/75">Es solo un consejo; decide el grupo.</span>
      </p>
    </aside>
  );
}
