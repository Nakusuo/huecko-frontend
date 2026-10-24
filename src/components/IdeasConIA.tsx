import { formatearVentana } from '../lib/planes';
import { useCarga } from '../hooks/useCarga';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { ICONO_CATEGORIA, mensajeDeFalloIA, NOMBRE_CATEGORIA, pedirIdeas } from '../services/planesIaService';
import type { IdeaPlan } from '../services/planesIaService';

/**
 * «Ideas con Huecko IA», como en la app móvil: tres planes pensados para los
 * huecos libres del grupo. «Usar» abre «Proponer plan» con la idea escrita;
 * nada se crea hasta que la persona lo envía.
 *
 * Las ideas se piden al abrir y se olvidan al cerrar: volver a abrir trae
 * otras, que es justo lo que busca quien no se decide.
 */
export function IdeasConIA({
  grupoId,
  onUsar,
  onCerrar,
}: {
  grupoId: string;
  onUsar: (idea: IdeaPlan) => void;
  onCerrar: () => void;
}) {
  // Un reintento fallido no borra las ideas que ya había (useCarga las conserva).
  const { datos: ideas, error, cargando: buscando, recargar } = useCarga(() =>
    pedirIdeas(grupoId).catch((fallo: unknown) => {
      throw new Error(mensajeDeFalloIA(fallo));
    })
  );
  useModalDismiss(true, onCerrar);

  return (
    <div role="dialog" aria-modal="true" aria-label="Ideas con Huecko IA" className="fixed inset-0 z-50 bg-scrim/50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl p-6 w-full max-w-lg elev-3 overflow-y-auto max-h-[90vh] animate-modal-in">
        <div className="flex justify-between items-start mb-4 pb-2 border-b border-outline-variant/60">
          <div>
            <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 font-headline">
              <span aria-hidden="true" className="material-symbols-outlined text-primary">auto_awesome</span>
              Ideas con Huecko IA
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">Planes pensados para los huecos libres reales del grupo.</p>
          </div>
          <button aria-label="Cerrar" onClick={onCerrar} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </div>

        {buscando && !ideas && (
          <div className="py-10 flex flex-col items-center gap-3 text-xs text-on-surface-variant" aria-live="polite">
            <span aria-hidden="true" className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
            Buscando ideas para el grupo…
          </div>
        )}

        {error && (
          <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-error bg-error-container/40 border border-error/30 rounded-xl px-3.5 py-2.5">
            <span>{error}</span>
            <button type="button" onClick={recargar} disabled={buscando} className="font-bold underline cursor-pointer disabled:opacity-50">
              Reintentar
            </button>
          </div>
        )}

        {ideas && (
          <ul className="space-y-3">
            {ideas.map((idea) => (
              <li key={idea.titulo} className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/60 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
                    <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-primary">
                      {ICONO_CATEGORIA[idea.categoria]}
                    </span>
                    {idea.titulo}
                  </h3>
                  <span className="shrink-0 px-2 py-0.5 rounded-lg bg-surface-container text-2xs font-bold text-on-surface-variant">
                    {NOMBRE_CATEGORIA[idea.categoria]}
                  </span>
                </div>
                {idea.lugar && <p className="text-xs text-on-surface-variant">{idea.lugar}</p>}
                <p className="text-xs font-semibold text-on-surface">
                  {idea.ventana ? formatearVentana(idea.ventana) : 'Sin horario: elige uno al proponer el plan.'}
                </p>
                <p className="text-xs text-on-surface-variant">{idea.razon}</p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onUsar(idea)}
                    aria-label={`Usar «${idea.titulo}»`}
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px]">edit_note</span>
                    Usar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-2xs text-on-surface-variant">
          Son sugerencias de Huecko IA: al usarlas puedes cambiar todo antes de proponer el plan.
        </p>
      </div>
    </div>
  );
}
