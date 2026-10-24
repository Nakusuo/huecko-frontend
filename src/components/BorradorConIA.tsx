import { useState } from 'react';
import { ApiError } from '../lib/apiClient';
import { NOMBRE_CATEGORIA, redactarBorrador } from '../services/planesIaService';
import type { BorradorPlan, CategoriaPlan } from '../services/planesIaService';

const MAX_TEXTO = 500;

/**
 * «Redactar con Huecko IA» en el formulario de «Proponer plan», como en la
 * app móvil: la persona cuenta el plan con sus palabras y el formulario se
 * rellena con huecos reales del grupo.
 *
 * Solo rellena: el plan no se crea hasta que la persona lo revisa y lo envía.
 * Si la IA falla, el formulario queda como estaba.
 */
export function BorradorConIA({
  grupoId,
  onBorrador,
}: {
  grupoId: string;
  onBorrador: (borrador: BorradorPlan) => void;
}) {
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<CategoriaPlan | null>(null);

  const listo = texto.trim().length >= 3 && !pensando;

  const redactar = async () => {
    if (!listo) return;
    setPensando(true);
    setError(null);
    try {
      const borrador = await redactarBorrador(grupoId, texto.trim());
      setCategoria(borrador.categoria);
      onBorrador(borrador);
    } catch (fallo) {
      // El 503 o el 429 del backend ya traen un mensaje para la persona; un
      // corte de red o de tiempo, no.
      setError(
        fallo instanceof ApiError && !fallo.isNetworkError && fallo.message
          ? fallo.message
          : 'Huecko IA no respondió a tiempo. Inténtalo de nuevo o rellena el plan a mano.'
      );
    } finally {
      setPensando(false);
    }
  };

  return (
    <section
      aria-label="Redactar con Huecko IA"
      className="rounded-xl border border-primary/30 bg-surface-container-lowest p-3 space-y-2"
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className="material-symbols-outlined text-[1.1rem] text-primary">
          auto_awesome
        </span>
        <div>
          <h3 className="text-xs font-bold text-on-surface">Redactar con Huecko IA</h3>
          <p className="text-2xs text-on-surface-variant">
            Cuenta el plan con tus palabras y Huecko IA rellenará el formulario con huecos reales del grupo.
            Revísalo antes de enviarlo.
          </p>
        </div>
      </div>

      <label className="sr-only" htmlFor="borrador-ia">
        Describe tu plan
      </label>
      <textarea
        id="borrador-ia"
        rows={2}
        maxLength={MAX_TEXTO}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          // Enter redacta; Mayús+Enter salta de línea.
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void redactar();
          }
        }}
        placeholder="Repaso de cálculo de 2 horas el viernes en la tarde, en la biblioteca"
        className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-surface text-on-surface placeholder-outline text-xs focus:outline-none focus:border-secondary resize-none"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-2xs text-on-surface-variant" aria-live="polite">
          {categoria && !pensando ? `Categoría sugerida: ${NOMBRE_CATEGORIA[categoria]}` : ''}
        </span>
        <button
          type="button"
          onClick={() => void redactar()}
          disabled={!listo}
          className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span aria-hidden="true" className={`material-symbols-outlined text-[16px] ${pensando ? 'animate-spin' : ''}`}>
            {pensando ? 'progress_activity' : 'edit_note'}
          </span>
          {pensando ? 'Pensando…' : 'Rellenar con IA'}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-2xs text-error">
          {error}
        </p>
      )}
    </section>
  );
}
