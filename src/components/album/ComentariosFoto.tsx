import { useEffect, useState, type FormEvent } from 'react';
import { Avatar } from '../Avatar';
import { useCarga } from '../../hooks/useCarga';
import { MAX_COMENTARIO } from '../../lib/album';
import { alRecibirEvento } from '../../lib/realtime';
import { tiempoRelativo } from '../../lib/tiempoRelativo';
import { albumService } from '../../services/albumService';
import type { ComentarioFoto } from '../../types/album.types';

/**
 * Los comentarios de una foto. Se refrescan solos cuando alguien del grupo
 * comenta o borra uno, y avisan al visor de cuántos hay.
 */
export function ComentariosFoto({ fotoId, onContar }: { fotoId: string; onContar: (total: number) => void }) {
  const { datos: lista, setDatos, error, cargando, recargar } = useCarga<ComentarioFoto[]>(() => albumService.comentarios(fotoId));
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(
    () =>
      alRecibirEvento((evento) => {
        if (evento.tipo === 'FOTO_CONVERSACION' && (evento.datos as { fotoId?: string }).fotoId === fotoId) recargar();
      }),
    [fotoId, recargar]
  );

  const actualizar = (nueva: ComentarioFoto[]) => {
    setDatos(nueva);
    onContar(nueva.length);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      actualizar(await albumService.comentar(fotoId, texto));
      setTexto('');
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : 'No se pudo enviar. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const borrar = async (comentario: ComentarioFoto) => {
    if (!lista) return;
    try {
      await albumService.borrarComentario(fotoId, comentario.id);
      actualizar(lista.filter((c) => c.id !== comentario.id));
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : 'No se pudo borrar el comentario.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface text-on-surface">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {cargando && !lista && <p className="text-xs text-on-surface-variant">Cargando comentarios…</p>}
        {error && !lista && <p role="alert" className="text-xs text-error">{error}</p>}
        {lista && lista.length === 0 && <p className="text-xs text-on-surface-variant">Nadie ha comentado todavía. ¡Sé la primera persona!</p>}
        {lista?.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar nombre={c.autorNombre} usuarioId={c.autorId} fotoActualizadaEn={c.autorFotoActualizadaEn} className="size-7 text-2xs" />
            <div className="min-w-0 flex-1">
              <p className="text-2xs text-on-surface-variant">
                <span className="font-semibold text-on-surface">{c.autorNombre}</span> · {tiempoRelativo(c.creadoEn).toLowerCase()}
              </p>
              <p className="whitespace-pre-line break-words text-sm">{c.texto}</p>
            </div>
            {c.puedeBorrar && (
              <button
                type="button"
                onClick={() => void borrar(c)}
                aria-label={`Borrar el comentario de ${c.autorNombre}`}
                className="self-start rounded p-0.5 text-on-surface-variant hover:text-error cursor-pointer"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={enviar} className="flex gap-2 border-t border-outline-variant/60 p-3">
        <label htmlFor={`comentar-${fotoId}`} className="sr-only">Escribe un comentario</label>
        <input
          id={`comentar-${fotoId}`}
          type="text"
          maxLength={MAX_COMENTARIO}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escribe un comentario…"
          className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm focus:border-secondary focus:outline-none"
        />
        <button
          type="submit"
          disabled={!texto.trim() || enviando}
          aria-label="Enviar comentario"
          className="flex items-center justify-center rounded-xl bg-secondary px-3 text-on-secondary hover:bg-secondary-hover disabled:opacity-50 cursor-pointer"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">send</span>
        </button>
      </form>
      {errorEnvio && <p role="alert" className="px-3 pb-3 text-2xs text-error">{errorEnvio}</p>}
    </div>
  );
}
