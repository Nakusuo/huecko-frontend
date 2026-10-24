import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { useCarga } from '../hooks/useCarga';
import { horaCorta, MAX_NOTA, opcionesHasta } from '../lib/libreAhora';
import { alRecibirEvento } from '../lib/realtime';
import { libreAhoraService } from '../services/libreAhoraService';
import type { LibreAhora } from '../types/libre.types';

/** El estado y el momento en que se pidió: las horas que se ofrecen se cuentan desde ahí. */
interface Lectura {
  estado: LibreAhora;
  ahora: Date;
}

const leer = async (): Promise<Lectura> => ({ estado: await libreAhoraService.estado(), ahora: new Date() });

/**
 * «¿Quién está libre ahora?».
 *
 * Con nombre solo sale quien lo avisa («Estoy libre»); del resto, cuántos no
 * tienen clase a esta hora, como en el heatmap (RNF-02). Se refresca cada
 * minuto, para que un aviso vencido desaparezca solo, y al momento cuando
 * alguien avisa.
 */
export function LibreAhoraCard() {
  const navigate = useNavigate();
  const { datos, setDatos, error, cargando, recargar } = useCarga<Lectura>(leer, 60_000);
  const [hasta, setHasta] = useState('');
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(
    () =>
      alRecibirEvento((evento) => {
        if (evento.tipo === 'LIBRE_AHORA') recargar();
      }),
    [recargar]
  );

  const actuar = async (accion: () => Promise<LibreAhora>) => {
    setEnviando(true);
    setErrorAccion(null);
    try {
      const estado = await accion();
      setDatos({ estado, ahora: new Date() });
      setNota('');
      setHasta('');
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const avisar = (e: FormEvent) => {
    e.preventDefault();
    void actuar(() => libreAhoraService.marcar(hasta || null, nota || null));
  };

  const estado = datos?.estado;
  const opciones = datos ? opcionesHasta(datos.ahora, datos.estado.sugerencia) : [];

  return (
    <section aria-labelledby="libre-ahora-titulo" className="rounded-2xl bg-surface-container-lowest elev-1 p-5 space-y-4">
      <div>
        <h2 id="libre-ahora-titulo" className="text-lg font-semibold text-on-surface flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-primary">emoji_people</span>
          ¿Quién está libre ahora?
        </h2>
        <p className="text-xs text-on-surface-variant">
          Con nombre solo salen quienes lo avisan. Del resto, cuántos no tienen clase a esta hora.
        </p>
      </div>

      {!estado && cargando && <p className="text-xs text-on-surface-variant" aria-live="polite">Mirando quién anda libre…</p>}
      {error && !estado && (
        <p role="alert" className="text-xs font-medium text-error">
          {error}{' '}
          <button type="button" onClick={recargar} className="underline cursor-pointer">Reintentar</button>
        </p>
      )}

      {estado && (
        <>
          {/* Tu aviso */}
          {estado.yo ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-success-container/60 border border-success/30 px-4 py-3">
              <p className="text-sm text-on-success-container">
                <span className="font-semibold">Avisaste que estás libre hasta las {horaCorta(estado.yo.hasta)}</span>
                {estado.yo.nota && <span> · {estado.yo.nota}</span>}
              </p>
              <button
                type="button"
                onClick={() => void actuar(libreAhoraService.quitar)}
                disabled={enviando}
                className="text-xs font-semibold text-on-success-container underline cursor-pointer disabled:opacity-60"
              >
                Ya no estoy libre
              </button>
            </div>
          ) : (
            <form onSubmit={avisar} className="rounded-xl border border-outline-variant/60 bg-surface p-3 space-y-2">
              {estado.enClase && (
                <p className="text-2xs text-on-surface-variant">Según tu horario ahora tienes clase. Si no es así, avisa igual.</p>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="libre-hasta" className="sr-only">Hasta cuándo</label>
                <select
                  id="libre-hasta"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="sm:w-60 px-3 py-2 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                >
                  {opciones.map((o, i) => (
                    <option key={o.valor} value={i === 0 ? '' : o.valor}>{o.texto}</option>
                  ))}
                </select>
                <label htmlFor="libre-nota" className="sr-only">Dónde estás (opcional)</label>
                <input
                  id="libre-nota"
                  type="text"
                  maxLength={MAX_NOTA}
                  placeholder="¿Dónde? (opcional)"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary"
                />
                <button
                  type="submit"
                  disabled={enviando}
                  className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-sm font-semibold cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[18px]">waving_hand</span>
                  Estoy libre
                </button>
              </div>
              <p className="text-2xs text-on-surface-variant">Tus grupos reciben el aviso al momento. Caduca solo a esa hora.</p>
            </form>
          )}

          {errorAccion && <p role="alert" className="text-xs font-medium text-error">{errorAccion}</p>}

          {/* Tus grupos */}
          {estado.grupos.length === 0 ? (
            <p className="text-xs text-on-surface-variant">Cuando estés en un grupo verás aquí quién anda libre.</p>
          ) : (
            <ul className="space-y-3">
              {estado.grupos.map((g) => (
                <li key={g.grupoId} className="rounded-xl border border-outline-variant/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{g.nombre}</p>
                      <p className="text-2xs text-on-surface-variant tabular-nums">
                        {g.sinClase} de {g.total} sin clase a esta hora
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/groups/${encodeURIComponent(g.grupoId)}?proponer=1`)}
                      className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">add_circle</span>
                      Proponer algo
                    </button>
                  </div>

                  {g.personas.length > 0 ? (
                    <ul className="mt-2 space-y-1.5" aria-label={`Libres en ${g.nombre}`}>
                      {g.personas.map((p) => (
                        <li key={p.usuarioId} className="flex items-center gap-2.5">
                          <Avatar nombre={p.nombre} usuarioId={p.usuarioId} fotoActualizadaEn={p.fotoActualizadaEn} className="size-8 text-xs" />
                          <p className="min-w-0 text-xs text-on-surface">
                            <span className="font-semibold">{p.nombre}</span> está libre hasta las {horaCorta(p.hasta)}
                            {p.nota && <span className="block text-on-surface-variant truncate">{p.nota}</span>}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-2xs text-on-surface-variant">Nadie ha avisado todavía.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
