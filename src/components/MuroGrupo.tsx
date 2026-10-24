import { useEffect, useState } from 'react';
import { Avatar } from './Avatar';
import { FotoDeAlbum } from './album/FotoDeAlbum';
import { useCarga } from '../hooks/useCarga';
import { textoDeEntrada } from '../lib/muro';
import { alRecibirEvento } from '../lib/realtime';
import { tiempoRelativo } from '../lib/tiempoRelativo';
import { muroService } from '../services/muroService';
import type { RealtimeEventType } from '../types/realtime.types';
import type { Muro } from '../types/muro.types';

/** Lo que cambia el muro: al llegar cualquiera de estos, se vuelve a pedir. */
const CAMBIAN_EL_MURO: RealtimeEventType[] = [
  'PLAN_PROPUESTO', 'PLAN_CONFIRMADO', 'PLAN_CANCELADO', 'PLAN_REAGENDADO', 'ALBUM_ACTUALIZADO', 'LLEGADA', 'MIEMBRO_UNIDO',
];

/**
 * El muro del grupo: quién entró, qué planes se propusieron y confirmaron,
 * quién subió fotos y quiénes llegaron. Sin ausencias ni retrasos: el muro es
 * para lo que hace el grupo, no para señalar a nadie.
 */
export function MuroGrupo({ grupoId, onAbrirAlbum }: { grupoId: string; onAbrirAlbum: (planId: string) => void }) {
  const { datos: muro, setDatos, error, cargando, recargar } = useCarga<Muro>(() => muroService.muro(grupoId));
  const [cargandoMas, setCargandoMas] = useState(false);

  useEffect(
    () =>
      alRecibirEvento((evento) => {
        if (evento.grupoId === grupoId && CAMBIAN_EL_MURO.includes(evento.tipo)) recargar();
      }),
    [grupoId, recargar]
  );

  const verMas = async () => {
    if (!muro?.siguiente) return;
    setCargandoMas(true);
    try {
      const anteriores = await muroService.muro(grupoId, muro.siguiente);
      setDatos({ entradas: [...muro.entradas, ...anteriores.entradas], siguiente: anteriores.siguiente });
    } finally {
      setCargandoMas(false);
    }
  };

  return (
    <section aria-labelledby="muro-titulo" className="bg-surface-container-low rounded-2xl p-6 md:p-8 elev-1 animate-fade-in">
      <div className="mb-5 border-b border-outline-variant/60 pb-4">
        <h2 id="muro-titulo" className="text-2xl font-bold text-on-surface font-headline flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-primary">dynamic_feed</span>
          Muro del grupo
        </h2>
        <p className="text-xs text-on-surface-variant">Lo que han ido haciendo juntos. Se actualiza solo.</p>
      </div>

      {cargando && !muro && <p className="text-xs text-on-surface-variant" aria-live="polite">Cargando el muro…</p>}
      {error && !muro && (
        <p role="alert" className="text-xs font-medium text-error">
          {error}{' '}
          <button type="button" onClick={recargar} className="underline cursor-pointer">Reintentar</button>
        </p>
      )}
      {muro && muro.entradas.length === 0 && (
        <p className="py-6 text-center text-sm text-on-surface-variant">Aún no hay nada en el muro. Propongan un plan para estrenarlo.</p>
      )}

      {muro && muro.entradas.length > 0 && (
        <ol className="relative space-y-4 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-outline-variant/60">
          {muro.entradas.map((e) => {
            const { icono, texto } = textoDeEntrada(e);
            const quienes = e.actor ? [e.actor] : (e.personas ?? []);
            return (
              <li key={`${e.tipo}-${e.planId ?? ''}-${e.ocurridoEn}`} className="relative flex gap-3">
                <span aria-hidden="true" className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest border border-outline-variant/60 text-primary">
                  <span className="material-symbols-outlined text-[18px]">{icono}</span>
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {quienes.length > 0 && (
                      <span className="flex -space-x-1.5">
                        {quienes.slice(0, 4).map((p) => (
                          <span key={p.usuarioId} className="rounded-full ring-2 ring-surface-container-low">
                            <Avatar nombre={p.nombre} usuarioId={p.usuarioId} fotoActualizadaEn={p.fotoActualizadaEn} className="size-6 text-2xs" />
                          </span>
                        ))}
                      </span>
                    )}
                    <p className="text-sm text-on-surface">{texto}</p>
                  </div>
                  <p className="text-2xs text-on-surface-variant">{tiempoRelativo(e.ocurridoEn)}</p>
                  {e.fotoIds && e.fotoIds.length > 0 && e.planId && (
                    <button
                      type="button"
                      onClick={() => onAbrirAlbum(e.planId as string)}
                      aria-label={`Ver las fotos de «${e.titulo ?? 'el plan'}»`}
                      className="mt-2 flex gap-1.5 cursor-pointer rounded-lg focus-visible:ring-2 focus-visible:ring-secondary"
                    >
                      {e.fotoIds.map((id) => (
                        <FotoDeAlbum key={id} fotoId={id} variante="miniatura" alt="" className="size-16 rounded-lg object-cover sm:size-20" />
                      ))}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {muro?.siguiente && (
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => void verMas()}
            disabled={cargandoMas}
            className="rounded-xl border border-outline-variant px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer disabled:opacity-60"
          >
            {cargandoMas ? 'Cargando…' : 'Ver más'}
          </button>
        </div>
      )}
    </section>
  );
}
