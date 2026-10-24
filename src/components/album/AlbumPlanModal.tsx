import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { FotoDeAlbum } from './FotoDeAlbum';
import { VisorFotos } from './VisorFotos';
import { useCarga } from '../../hooks/useCarga';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import { cuantasFotos, fechaDelPlan } from '../../lib/album';
import { isApiEnabled } from '../../lib/apiClient';
import { MAX_BYTES_ORIGINAL, reducirParaAlbum } from '../../lib/fotos';
import { alRecibirEvento } from '../../lib/realtime';
import { albumService } from '../../services/albumService';
import type { AlbumPlan } from '../../types/album.types';

type Progreso = { fase: 'preparando' | 'subiendo'; hechas: number; total: number };

/** Por qué no se pueden subir fotos ahora, en palabras de la persona. */
function motivoSinSubir(album: AlbumPlan): string {
  if (album.restantesGrupo === 0) return 'El álbum del grupo está lleno. Borren alguna foto para subir más.';
  if (album.restantesMias === 0) return 'Ya subiste tus 10 fotos de este plan.';
  return 'Las fotos se suben cuando el plan ya empezó.';
}

/** El álbum de un plan: subir fotos, verlas en cuadrícula y abrirlas en grande. */
export function AlbumPlanModal({ planId, onCerrar }: { planId: string; onCerrar: () => void }) {
  const { datos: album, setDatos, error, cargando, recargar } = useCarga<AlbumPlan>(() => albumService.delPlan(planId));
  const [visor, setVisor] = useState<number | null>(null);
  const [progreso, setProgreso] = useState<Progreso | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  useModalDismiss(visor === null, onCerrar);

  // Si alguien del grupo sube o borra fotos de este plan, se ve al momento.
  useEffect(
    () =>
      alRecibirEvento((evento) => {
        if (evento.tipo === 'ALBUM_ACTUALIZADO' && (evento.datos as { planId?: string }).planId === planId) recargar();
      }),
    [planId, recargar]
  );

  const elegir = async (e: ChangeEvent<HTMLInputElement>) => {
    const elegidas = Array.from(e.target.files ?? []);
    // Permite volver a elegir las mismas si algo falló.
    e.target.value = '';
    if (!album || elegidas.length === 0) return;
    setAviso(null);

    const imagenes = elegidas.filter((f) => f.type.startsWith('image/') && f.size <= MAX_BYTES_ORIGINAL);
    const cupo = Math.min(album.restantesMias, album.restantesGrupo);
    const aSubir = imagenes.slice(0, cupo);
    const avisos: string[] = [];
    if (imagenes.length < elegidas.length) avisos.push('Algunas no eran imágenes o pesaban más de 15 MB.');
    if (aSubir.length < imagenes.length) avisos.push(`Solo cabían ${cupo}: se subieron las primeras.`);
    if (aSubir.length === 0) {
      setAviso(avisos.join(' ') || motivoSinSubir(album));
      return;
    }

    try {
      // Se reducen en el navegador antes de enviarlas: así cada una pesa unos 300 KB.
      const reducidas: Blob[] = [];
      for (const [i, foto] of aSubir.entries()) {
        setProgreso({ fase: 'preparando', hechas: i, total: aSubir.length });
        reducidas.push(await reducirParaAlbum(foto));
      }
      setProgreso({ fase: 'subiendo', hechas: 0, total: reducidas.length });
      const actualizado = await albumService.subir(planId, reducidas, (hechas) =>
        setProgreso({ fase: 'subiendo', hechas, total: reducidas.length })
      );
      setDatos(actualizado);
      if (avisos.length) setAviso(avisos.join(' '));
    } catch (err) {
      setAviso(err instanceof Error ? err.message : 'No se pudieron subir las fotos. Inténtalo de nuevo.');
      recargar();
    } finally {
      setProgreso(null);
    }
  };

  const borrada = (fotoId: string) => {
    if (!album) return;
    const fotos = album.fotos.filter((f) => f.id !== fotoId);
    setDatos({ ...album, fotos });
    setVisor(fotos.length === 0 ? null : Math.min(visor ?? 0, fotos.length - 1));
    recargar();
  };

  /* Directo en <body>: se abre desde «Recuerdos», una sección con animación
     de entrada, y dentro de ella el modal quedaba debajo del resto de la
     página (la animación crea su propia capa y el z-index no sale de ahí). */
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="album-plan-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-4 animate-scrim-in"
      onClick={(e) => e.target === e.currentTarget && visor === null && onCerrar()}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface elev-3 animate-modal-in">
        <div className="flex items-start justify-between gap-3 border-b border-outline-variant/60 p-5">
          <div className="min-w-0">
            <h2 id="album-plan-titulo" className="font-headline text-xl font-bold text-on-surface flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-primary">photo_library</span>
              <span className="truncate">{album?.titulo ?? 'Álbum del plan'}</span>
            </h2>
            {album && (
              <p className="text-xs text-on-surface-variant">
                {fechaDelPlan(album.fecha, album.horaInicio)} · {cuantasFotos(album.fotos.length)}
              </p>
            )}
          </div>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="cursor-pointer text-on-surface-variant hover:text-on-surface">
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {cargando && !album && <p className="text-xs text-on-surface-variant" aria-live="polite">Abriendo el álbum…</p>}
          {error && !album && <p role="alert" className="text-xs font-medium text-error">{error}</p>}

          {album && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-lowest border border-outline-variant/60 p-3">
                {album.puedeSubir ? (
                  <p className="text-2xs text-on-surface-variant">
                    Puedes subir {album.restantesMias} más · quedan {album.restantesGrupo} en el álbum del grupo.
                    Solo las ve tu grupo.
                  </p>
                ) : (
                  <p className="text-2xs text-on-surface-variant">{motivoSinSubir(album)}</p>
                )}
                {album.puedeSubir && (
                  <>
                    <input ref={entrada} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void elegir(e)} />
                    <button
                      type="button"
                      disabled={progreso !== null}
                      onClick={() => entrada.current?.click()}
                      className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-on-secondary hover:bg-secondary-hover cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                      {progreso
                        ? `${progreso.fase === 'preparando' ? 'Preparando' : 'Subiendo'} ${Math.min(progreso.hechas + (progreso.fase === 'preparando' ? 1 : 0), progreso.total)} de ${progreso.total}…`
                        : 'Añadir fotos'}
                    </button>
                  </>
                )}
              </div>

              {!isApiEnabled && (
                <p className="text-2xs text-on-surface-variant">En modo demo las fotos solo duran hasta que recargues la página.</p>
              )}
              {aviso && <p role="alert" className="text-xs font-medium text-on-warning-container">{aviso}</p>}

              {album.fotos.length === 0 ? (
                <p className="py-8 text-center text-sm text-on-surface-variant">
                  {album.puedeSubir ? 'Aún no hay fotos de este plan. ¡Sube las primeras!' : 'Aún no hay fotos de este plan.'}
                </p>
              ) : (
                <ul className="grid grid-cols-3 sm:grid-cols-4 gap-1.5" aria-label="Fotos del plan">
                  {album.fotos.map((foto, i) => (
                    <li key={foto.id}>
                      <button
                        type="button"
                        onClick={() => setVisor(i)}
                        aria-label={`Ver la foto ${i + 1}, de ${foto.autorNombre}`}
                        className="block w-full overflow-hidden rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-secondary"
                      >
                        <FotoDeAlbum fotoId={foto.id} variante="miniatura" alt="" className="aspect-square w-full object-cover transition-transform hover:scale-105" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {album && visor !== null && (
        <VisorFotos
          fotos={album.fotos}
          indice={visor}
          titulo={album.titulo}
          onCambiar={setVisor}
          onCerrar={() => setVisor(null)}
          onBorrada={borrada}
        />
      )}
    </div>,
    document.body
  );
}
