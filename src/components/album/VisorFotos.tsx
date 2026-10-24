import { useEffect, useState } from 'react';
import { ComentariosFoto } from './ComentariosFoto';
import { FotoDeAlbum } from './FotoDeAlbum';
import { ReportarProblemaModal } from '../ReportarProblema';
import { useFotoDeAlbum } from '../../hooks/useFoto';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { alternarReaccion, REACCIONES } from '../../lib/album';
import { isApiEnabled } from '../../lib/apiClient';
import { tiempoRelativo } from '../../lib/tiempoRelativo';
import { albumService } from '../../services/albumService';
import { useAuthStore } from '../../store/authStore';
import type { FotoAlbum, Reaccion } from '../../types/album.types';

/**
 * Las fotos de un plan a pantalla completa: flechas (o ← →) para pasar,
 * reaccionar y comentar, descargar, borrar la tuya y reportar la de otra
 * persona.
 */
export function VisorFotos({
  fotos,
  indice,
  titulo,
  onCambiar,
  onCerrar,
  onBorrada,
  onActualizar,
}: {
  fotos: FotoAlbum[];
  indice: number;
  titulo: string;
  onCambiar: (indice: number) => void;
  onCerrar: () => void;
  onBorrada: (fotoId: string) => void;
  /** Reacciones o comentarios nuevos de una foto, para que el álbum los cuente. */
  onActualizar: (fotoId: string, cambios: Partial<FotoAlbum>) => void;
}) {
  const yo = useAuthStore((s) => s.user);
  const [reportando, setReportando] = useState(false);
  const [confirmandoBorrar, setConfirmandoBorrar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verComentarios, setVerComentarios] = useState(false);
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

  /* La reacción se ve al momento; si el servidor la rechaza, se deshace. */
  const reaccionar = async (reaccion: Reaccion) => {
    const antes = { reacciones: foto.reacciones, misReacciones: foto.misReacciones };
    const poner = !foto.misReacciones.includes(reaccion);
    const optimista = alternarReaccion(foto, reaccion);
    onActualizar(foto.id, { reacciones: optimista.reacciones, misReacciones: optimista.misReacciones });
    try {
      const real = await albumService.reaccionar(foto.id, reaccion, poner);
      onActualizar(foto.id, { reacciones: real.reacciones, misReacciones: real.misReacciones });
    } catch (err) {
      onActualizar(foto.id, antes);
      setError(err instanceof Error ? err.message : 'No se pudo guardar la reacción.');
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

      <div className="relative flex min-h-0 flex-1">
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

        {/* En el celular los comentarios suben desde abajo; en pantallas grandes van al lado. */}
        {verComentarios && (
          <aside
            aria-label="Comentarios"
            className="absolute inset-x-0 bottom-0 z-10 h-[60%] overflow-hidden rounded-t-2xl md:static md:h-auto md:w-80 md:rounded-none"
          >
            <ComentariosFoto key={foto.id} fotoId={foto.id} onContar={(comentarios) => onActualizar(foto.id, { comentarios })} />
          </aside>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 text-cream">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Reacciones">
          {REACCIONES.map((r) => {
            const cuenta = foto.reacciones[r.codigo] ?? 0;
            const mia = foto.misReacciones.includes(r.codigo);
            return (
              <button
                key={r.codigo}
                type="button"
                onClick={() => void reaccionar(r.codigo)}
                aria-pressed={mia}
                aria-label={`${r.nombre}${cuenta ? ` (${cuenta})` : ''}`}
                title={r.nombre}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm transition-colors cursor-pointer ${
                  mia ? 'bg-cream/25 ring-1 ring-cream/60' : 'bg-cream/10 hover:bg-cream/20'
                }`}
              >
                <span aria-hidden="true">{r.emoji}</span>
                {cuenta > 0 && <span className="text-xs font-semibold tabular-nums">{cuenta}</span>}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setVerComentarios((v) => !v)}
          aria-expanded={verComentarios}
          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer ${
            verComentarios ? 'bg-cream text-ink' : 'bg-cream/10 hover:bg-cream/20'
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">chat_bubble</span>
          {foto.comentarios === 0 ? 'Comentar' : `${foto.comentarios} ${foto.comentarios === 1 ? 'comentario' : 'comentarios'}`}
        </button>
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
