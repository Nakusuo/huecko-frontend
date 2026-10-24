import { useEffect, useState } from 'react';
import { FotoDeAlbum } from './FotoDeAlbum';
import { ReportarProblemaModal } from '../ReportarProblema';
import { useFotoDeAlbum } from '../../hooks/useFoto';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { isApiEnabled } from '../../lib/apiClient';
import { tiempoRelativo } from '../../lib/tiempoRelativo';
import { albumService } from '../../services/albumService';
import { useAuthStore } from '../../store/authStore';
import type { FotoAlbum } from '../../types/album.types';

/**
 * Las fotos de un plan a pantalla completa: flechas (o ← →) para pasar,
 * descargar, borrar la tuya y reportar la de otra persona.
 */
export function VisorFotos({
  fotos,
  indice,
  titulo,
  onCambiar,
  onCerrar,
  onBorrada,
}: {
  fotos: FotoAlbum[];
  indice: number;
  titulo: string;
  onCambiar: (indice: number) => void;
  onCerrar: () => void;
  onBorrada: (fotoId: string) => void;
}) {
  const yo = useAuthStore((s) => s.user);
  const [reportando, setReportando] = useState(false);
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const foto = fotos[indice];
  const completa = useFotoDeAlbum(foto?.id ?? null, 'completa');

  useModalDismiss(!reportando, onCerrar);

  const anterior = indice > 0 ? indice - 1 : null;
  const siguiente = indice < fotos.length - 1 ? indice + 1 : null;

  useEffect(() => {
    if (reportando) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && anterior !== null) onCambiar(anterior);
      if (e.key === 'ArrowRight' && siguiente !== null) onCambiar(siguiente);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [anterior, siguiente, onCambiar, reportando]);

  if (!foto) return null;
  const esMia = foto.autorId === yo?.id;

  const borrar = async () => {
    setBorrando(true);
    setError(null);
    try {
      await albumService.borrar(foto.id);
      setConfirmandoBorrar(false);
      onBorrada(foto.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar la foto.');
    } finally {
      setBorrando(false);
    }
  };

  const flecha = 'absolute top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-full bg-ink/60 text-cream hover:bg-ink cursor-pointer';

  return (
    <div role="dialog" aria-modal="true" aria-label={`Fotos de «${titulo}»`} className="fixed inset-0 z-[70] flex flex-col bg-ink animate-scrim-in">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-cream">
        <p className="min-w-0 truncate text-sm font-semibold">
          {titulo} <span className="font-normal opacity-70 tabular-nums">· {indice + 1} de {fotos.length}</span>
        </p>
        <button type="button" aria-label="Cerrar" onClick={onCerrar} className="cursor-pointer rounded-full p-1.5 hover:bg-cream/10">
          <span aria-hidden="true" className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {completa ? (
          <img src={completa} alt={`Foto de ${foto.autorNombre}`} className="max-h-full max-w-full object-contain" />
        ) : (
          // Mientras llega la grande, la miniatura que ya está descargada.
          <FotoDeAlbum fotoId={foto.id} variante="miniatura" alt="" className="h-64 w-64 object-cover opacity-60" />
        )}
        {anterior !== null && (
          <button type="button" aria-label="Foto anterior" onClick={() => onCambiar(anterior)} className={`${flecha} left-3`}>
            <span aria-hidden="true" className="material-symbols-outlined">chevron_left</span>
          </button>
        )}
        {siguiente !== null && (
          <button type="button" aria-label="Foto siguiente" onClick={() => onCambiar(siguiente)} className={`${flecha} right-3`}>
            <span aria-hidden="true" className="material-symbols-outlined">chevron_right</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-cream">
        <p className="text-xs">
          <span className="font-semibold">{esMia ? 'Tú' : foto.autorNombre}</span>
          <span className="opacity-70"> · {tiempoRelativo(foto.subidaEn).toLowerCase()}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {completa && (
            <a
              href={completa}
              download={`huecko-${titulo.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-')}-${indice + 1}.jpg`}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-cream/10"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">download</span>
              Descargar
            </a>
          )}
          {foto.puedeBorrar &&
            (confirmandoBorrar ? (
              <span className="flex items-center gap-1.5" role="group" aria-label="Confirmar que se borra la foto">
                <button
                  type="button"
                  onClick={() => void borrar()}
                  disabled={borrando}
                  className="rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-on-error disabled:opacity-60"
                >
                  {borrando ? 'Borrando…' : 'Sí, borrarla'}
                </button>
                <button type="button" onClick={() => setConfirmandoBorrar(false)} className="px-2 py-1.5 text-xs font-semibold">
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmandoBorrar(true)}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-cream/10 cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">delete</span>
                Borrar
              </button>
            ))}
          {!esMia && isApiEnabled && (
            <button
              type="button"
              onClick={() => setReportando(true)}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-cream/10 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">flag</span>
              Reportar
            </button>
          )}
        </div>
        {error && <p role="alert" className="w-full text-xs text-error-container">{error}</p>}
      </div>

      {reportando && <ReportarProblemaModal fotoReportada={foto.id} onClose={() => setReportando(false)} />}
    </div>
  );
}
