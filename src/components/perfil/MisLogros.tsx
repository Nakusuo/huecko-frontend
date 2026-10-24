import { useCarga } from '../../hooks/useCarga';
import { INSIGNIAS, ORDEN_INSIGNIAS } from '../../lib/insignias';
import { profileService } from '../../services/profileService';
import { useAuthStore } from '../../store/authStore';
import type { Logros } from '../../types/profile.types';

/**
 * Tus logros: los números solo los ves tú; tus grupos ven las insignias en tu
 * tarjeta. Las que faltan se enseñan apagadas con lo que piden, para que se
 * entienda cómo conseguirlas.
 */
export function MisLogros() {
  const user = useAuthStore((s) => s.user);
  const { datos: logros, error, cargando } = useCarga<Logros>(() =>
    user ? profileService.getLogros(user) : Promise.reject(new Error('No hay ninguna sesión abierta.'))
  );

  const cifras = logros
    ? [
        { valor: logros.planesVividos, texto: logros.planesVividos === 1 ? 'plan vivido' : 'planes vividos' },
        { valor: logros.aTiempo, texto: 'a tiempo' },
        { valor: logros.propuestos, texto: logros.propuestos === 1 ? 'propuesto' : 'propuestos' },
      ]
    : [];

  return (
    <div className="bg-surface-container-lowest elev-1 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant/60">
        <span aria-hidden="true" className="material-symbols-outlined text-primary">military_tech</span>
        Tus logros
      </h3>

      {cargando && <p className="text-xs text-on-surface-variant" aria-live="polite">Contando tus planes…</p>}
      {error && <p role="alert" className="text-xs font-medium text-error">{error}</p>}

      {logros && (
        <>
          <dl className="grid grid-cols-3 gap-2 mb-4">
            {cifras.map((c) => (
              <div key={c.texto} className="rounded-xl bg-surface px-2 py-3 text-center border border-outline-variant/60">
                <dd className="font-headline text-2xl font-bold text-on-surface tabular-nums">{c.valor}</dd>
                <dt className="text-2xs text-on-surface-variant">{c.texto}</dt>
              </div>
            ))}
          </dl>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Insignias">
            {ORDEN_INSIGNIAS.map((codigo) => {
              const ganada = logros.insignias.includes(codigo);
              const { titulo, detalle, icono } = INSIGNIAS[codigo];
              return (
                <li
                  key={codigo}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    ganada ? 'border-primary/30 bg-primary-container/40' : 'border-outline-variant/60 opacity-60'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined text-[22px] ${ganada ? 'text-primary' : 'text-on-surface-variant'}`}
                  >
                    {ganada ? icono : 'lock'}
                  </span>
                  <span>
                    <span className="block text-xs font-semibold text-on-surface">
                      {titulo}
                      <span className="sr-only">{ganada ? ' (conseguida)' : ' (pendiente)'}</span>
                    </span>
                    <span className="block text-2xs text-on-surface-variant">{detalle}</span>
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-2xs text-on-surface-variant">
            Cuentan los planes confirmados que ya empezaron y a los que no avisaste que faltarías. Tus grupos solo
            ven tus insignias, nunca estos números.
          </p>
        </>
      )}
    </div>
  );
}
