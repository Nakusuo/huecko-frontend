import { useEffect, useState } from 'react';
import { AlbumPlanModal } from './AlbumPlanModal';
import { FotoDeAlbum } from './FotoDeAlbum';
import { useCarga } from '../../hooks/useCarga';
import { cuantasFotos, fechaDelPlan } from '../../lib/album';
import { alRecibirEvento } from '../../lib/realtime';
import { albumService } from '../../services/albumService';
import type { AlbumGrupo } from '../../types/album.types';

/**
 * «Recuerdos»: un álbum por cada plan que el grupo ya vivió. Solo lo ve el
 * grupo, y se actualiza al momento cuando alguien sube o borra fotos.
 */
export function RecuerdosDelGrupo({ grupoId }: { grupoId: string }) {
  const { datos: album, error, cargando, recargar } = useCarga<AlbumGrupo>(() => albumService.album(grupoId));
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(
    () =>
      alRecibirEvento((evento) => {
        if (evento.tipo === 'ALBUM_ACTUALIZADO' && evento.grupoId === grupoId) recargar();
      }),
    [grupoId, recargar]
  );

  return (
    <section aria-labelledby="recuerdos-titulo" className="bg-surface-container-low rounded-2xl p-6 md:p-8 elev-1 animate-fade-in">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-outline-variant/60 pb-4">
        <div>
          <h2 id="recuerdos-titulo" className="text-2xl font-bold text-on-surface font-headline flex items-center gap-2">
            <span aria-hidden="true" className="material-symbols-outlined text-primary">photo_library</span>
            Recuerdos
          </h2>
          <p className="text-xs text-on-surface-variant">Las fotos de los planes que ya vivieron. Solo las ve el grupo.</p>
        </div>
        {album && album.planes.length > 0 && (
          <p className="text-2xs text-on-surface-variant tabular-nums">
            {album.usadas} de {album.maximo} fotos del grupo
          </p>
        )}
      </div>

      {cargando && !album && <p className="text-xs text-on-surface-variant" aria-live="polite">Cargando los recuerdos…</p>}
      {error && !album && (
        <p role="alert" className="text-xs font-medium text-error">
          {error}{' '}
          <button type="button" onClick={recargar} className="underline cursor-pointer">Reintentar</button>
        </p>
      )}

      {album && album.planes.length === 0 && (
        <p className="py-6 text-center text-sm text-on-surface-variant">
          Cuando vivan su primer plan, aquí guardarán sus fotos.
        </p>
      )}

      {album && album.planes.length > 0 && (
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {album.planes.map((plan) => (
            <li key={plan.planId}>
              <button
                type="button"
                onClick={() => setAbierto(plan.planId)}
                className="group block w-full overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-left cursor-pointer hover:border-secondary"
              >
                {plan.portadaId ? (
                  <FotoDeAlbum
                    fotoId={plan.portadaId}
                    variante="miniatura"
                    alt=""
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <span className="flex aspect-square w-full items-center justify-center bg-surface-container text-on-surface-variant">
                    <span aria-hidden="true" className="material-symbols-outlined text-[40px]">add_photo_alternate</span>
                  </span>
                )}
                <span className="block p-2.5">
                  <span className="block truncate text-sm font-semibold text-on-surface">{plan.titulo}</span>
                  <span className="block text-2xs text-on-surface-variant">{fechaDelPlan(plan.fecha, plan.horaInicio)}</span>
                  <span className="block text-2xs font-semibold text-primary">{cuantasFotos(plan.fotos)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <AlbumPlanModal
          planId={abierto}
          onCerrar={() => {
            setAbierto(null);
            recargar();
          }}
        />
      )}
    </section>
  );
}
