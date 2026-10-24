import { useEffect, useState } from 'react';
import { Avatar } from './Avatar';
import { useCarga } from '../hooks/useCarga';
import { horaCorta } from '../lib/libreAhora';
import { alRecibirEvento } from '../lib/realtime';
import { llegadasService } from '../services/llegadasService';
import type { Llegadas } from '../types/llegada.types';

/**
 * «Llegué» en la tarjeta de un plan confirmado: se marca desde media hora
 * antes hasta una hora después de que termine (lo decide el servidor), y
 * enseña quién llegó. Pasado el plan, queda como «Estuvieron».
 */
export function LlegadaPlan({ planId }: { planId: string }) {
  const { datos, setDatos, recargar } = useCarga<Llegadas>(() => llegadasService.ver(planId));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si se abre más tarde, una sola recarga a esa hora (y no una cada minuto).
  const abre = datos?.estado === 'ANTES' ? datos.abre : null;
  useEffect(() => {
    if (!abre) return;
    const espera = new Date(abre).getTime() - Date.now();
    // setTimeout no admite esperas de días: más allá de 12 h basta con la próxima visita.
    if (espera > 12 * 3_600_000) return;
    const id = window.setTimeout(recargar, Math.max(0, espera) + 1000);
    return () => window.clearTimeout(id);
  }, [abre, recargar]);

  // Quien llega aparece al momento en la tarjeta de los demás.
  useEffect(
    () =>
      alRecibirEvento((evento) => {
        if (evento.tipo === 'LLEGADA' && (evento.datos as { planId?: string }).planId === planId) recargar();
      }),
    [planId, recargar]
  );

  const actuar = async (accion: () => Promise<Llegadas>) => {
    setEnviando(true);
    setError(null);
    try {
      setDatos(await accion());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (!datos || datos.estado === 'SIN_FECHA' || (datos.estado !== 'ABIERTA' && datos.llegadas.length === 0)) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container-lowest border border-outline-variant/60 px-3 py-2">
      {datos.llegadas.length > 0 ? (
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex -space-x-1.5">
            {datos.llegadas.slice(0, 5).map((l) => (
              <span key={l.usuarioId} title={`${l.nombre} · ${horaCorta(l.llegoEn)}`} className="rounded-full ring-2 ring-surface-container-lowest">
                <Avatar nombre={l.nombre} usuarioId={l.usuarioId} fotoActualizadaEn={l.fotoActualizadaEn} className="size-6 text-2xs" />
              </span>
            ))}
          </span>
          <p className="min-w-0 truncate text-2xs text-on-surface-variant">
            <span className="font-semibold text-on-surface">{datos.estado === 'CERRADA' ? 'Estuvieron' : 'Ya llegaron'}:</span>{' '}
            {datos.llegadas.map((l) => l.nombre.split(' ')[0]).join(', ')}
          </p>
        </div>
      ) : (
        <p className="text-2xs text-on-surface-variant">¿Ya estás ahí? Avisa al grupo.</p>
      )}

      {datos.estado === 'ABIERTA' &&
        (datos.yaLlegue ? (
          <span className="flex items-center gap-2 text-2xs">
            <span className="flex items-center gap-0.5 font-semibold text-success">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
              Llegaste
            </span>
            <button
              type="button"
              onClick={() => void actuar(() => llegadasService.quitar(planId))}
              disabled={enviando}
              className="text-on-surface-variant underline hover:text-on-surface cursor-pointer disabled:opacity-60"
            >
              Deshacer
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void actuar(() => llegadasService.marcar(planId))}
            disabled={enviando}
            className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-on-secondary hover:bg-secondary-hover cursor-pointer disabled:opacity-60"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">where_to_vote</span>
            Llegué
          </button>
        ))}
      {error && <p role="alert" className="w-full text-2xs text-error">{error}</p>}
    </div>
  );
}
