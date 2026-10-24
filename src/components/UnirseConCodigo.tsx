import { useState } from 'react';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { useGroupsStore } from '../store/groupsStore';
import type { Group } from '../types/groups.types';

/**
 * «Unirme con código», como en la app móvil: quien organiza un grupo pasa su
 * código y aquí se escribe. Se aceptan minúsculas, espacios y guiones (el
 * servidor los quita), así que se puede pegar tal como llegó por chat.
 */
export function UnirseConCodigo({
  onUnido,
  onCerrar,
  codigoInicial,
}: {
  onUnido: (grupo: Group, yaEstabas: boolean) => void;
  onCerrar: () => void;
  /** El que trae el enlace de un QR: se rellena, pero entrar sigue siendo decisión de quien lo escanea. */
  codigoInicial?: string;
}) {
  const joinByCode = useGroupsStore((s) => s.joinByCode);
  const [codigo, setCodigo] = useState(codigoInicial ?? '');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useModalDismiss(true, onCerrar);

  const listo = codigo.trim().length >= 4 && !enviando;

  const unirme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listo) return;
    setEnviando(true);
    setError(null);
    try {
      const { grupo, yaEstabas } = await joinByCode(codigo.trim());
      onUnido(grupo, yaEstabas);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo entrar al grupo. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Unirme con código" className="fixed inset-0 z-50 bg-scrim/50 flex items-center justify-center p-4">
      <form onSubmit={unirme} className="bg-surface rounded-2xl p-6 w-full max-w-sm elev-3 animate-modal-in space-y-4">
        <div>
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 font-headline">
            <span aria-hidden="true" className="material-symbols-outlined text-primary">vpn_key</span>
            Unirme con código
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Escribe el código de invitación que te pasó quien organiza el grupo.
          </p>
        </div>

        <label className="block">
          <span className="sr-only">Código de invitación</span>
          <input
            autoFocus
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase());
              setError(null);
            }}
            maxLength={32}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Ej. HUECKO26"
            className="w-full px-3.5 py-3 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface placeholder-outline text-lg font-mono tracking-[0.2em] text-center focus:outline-none focus:border-secondary"
          />
        </label>

        {error && (
          <p role="alert" className="text-xs text-error bg-error-container/40 border border-error/30 rounded-xl px-3.5 py-2.5">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!listo}
            className="px-5 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? 'Entrando…' : 'Unirme'}
          </button>
        </div>
      </form>
    </div>
  );
}
