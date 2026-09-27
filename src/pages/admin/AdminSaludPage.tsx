import { useState } from 'react';
import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import { ErrorCarga, InsigniaSalud, SinServidor } from '../../components/admin/Estados';
import { useCarga } from '../../hooks/useCarga';
import { adminService } from '../../services/adminService';
import { isApiEnabled } from '../../lib/apiClient';
import { tiempoRelativo } from '../../lib/tiempoRelativo';
import type { EstadoSalud, SaludAdmin, TareaSalud } from '../../types/admin.types';

const REFRESCO_MS = 15_000;

const TITULAR: Record<EstadoSalud, { texto: string; clase: string; icon: string }> = {
  OK: { texto: 'Todo funciona', clase: 'border-success/30 bg-success-container text-on-success-container', icon: 'check_circle' },
  DEGRADADO: {
    texto: 'Funciona, pero algo necesita atención',
    clase: 'border-warning/30 bg-warning-container text-on-warning-container',
    icon: 'warning',
  },
  CAIDO: { texto: 'Hay una pieza caída', clase: 'border-error/30 bg-error-container text-on-error-container', icon: 'error' },
};

function duracion(segundos: number): string {
  const d = Math.floor(segundos / 86_400);
  const h = Math.floor((segundos % 86_400) / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

const cadaCuanto = (ms: number) => (ms % 60_000 === 0 ? `cada ${ms / 60_000} min` : `cada ${Math.round(ms / 1000)} s`);

function Tarea({ tarea }: { tarea: TareaSalud }) {
  return (
    <li className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-on-surface">{tarea.nombre}</h3>
          <p className="mt-0.5 text-xs text-on-surface-variant">{tarea.descripcion}</p>
        </div>
        {tarea.activa ? <InsigniaSalud estado={tarea.estado} /> : (
          <span className="shrink-0 rounded-lg bg-surface-container-high px-2 py-0.5 text-2xs font-semibold text-on-surface-variant">
            Desactivada
          </span>
        )}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-on-surface-variant">Última pasada</dt>
          <dd className="font-semibold text-on-surface">
            {tarea.ultimaEjecucion ? tiempoRelativo(tarea.ultimaEjecucion) : 'Aún no'}
          </dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Frecuencia</dt>
          <dd className="font-semibold text-on-surface">{cadaCuanto(tarea.intervaloMs)}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Pasadas</dt>
          <dd className="font-semibold tabular-nums text-on-surface">{tarea.ejecuciones}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Atrasadas</dt>
          <dd className={`font-semibold tabular-nums ${tarea.atrasadas > 0 ? 'text-error' : 'text-on-surface'}`}>
            {tarea.atrasadas}
          </dd>
        </div>
      </dl>

      {tarea.atrasadas > 0 && (
        <p className="mt-3 text-xs text-on-surface">
          Hay {tarea.atrasadas} {tarea.atrasadas === 1 ? 'votación vencida' : 'votaciones vencidas'} que siguen abiertas:
          la tarea no las está cerrando.
        </p>
      )}
      {tarea.ultimoError && (
        <p className="mt-3 rounded-lg bg-error-container px-3 py-2 text-xs text-on-error-container">
          Último fallo {tarea.ultimoErrorEn ? tiempoRelativo(tarea.ultimoErrorEn).toLowerCase() : ''}: {tarea.ultimoError}
          {tarea.fallidosTotales > 1 && ` (${tarea.fallidosTotales} en total)`}
        </p>
      )}
    </li>
  );
}

function Contenido({ salud }: { salud: SaludAdmin }) {
  const titular = TITULAR[salud.estado];
  const app = salud.aplicacion;

  return (
    <div className="animate-fade-in">
      <div role="status" className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${titular.clase}`}>
        <span aria-hidden="true" className="material-symbols-outlined">{titular.icon}</span>
        <span className="font-semibold">{titular.texto}</span>
        <span className="ml-auto text-xs opacity-80">Comprobado {tiempoRelativo(salud.generadoEn).toLowerCase()}</span>
      </div>

      <section className="mt-8">
        <h2 className="font-headline text-xl text-on-surface">Servicios</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {salud.componentes.map((c) => (
            <li key={c.clave} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-on-surface">{c.nombre}</h3>
                <InsigniaSalud estado={c.estado} />
              </div>
              <p className="mt-1 text-xs text-on-surface-variant">{c.detalle}</p>
              {c.latenciaMs !== null && (
                <p className="mt-3 font-headline text-2xl tabular-nums text-on-surface">
                  {c.latenciaMs} <span className="text-sm text-on-surface-variant">ms</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-headline text-xl text-on-surface">Tareas automáticas</h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          Cuentan desde que arrancó el backend. Si una se detiene, los planes se quedan sin cerrar y nadie se entera:
          por eso se vigilan aquí.
        </p>
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {salud.tareas.map((t) => (
            <Tarea key={t.clave} tarea={t} />
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-headline text-xl text-on-surface">Proceso</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 text-sm md:grid-cols-4">
          {[
            ['Versión', app.version],
            ['Perfil', app.perfiles.join(', ') || '(ninguno)'],
            ['Encendido', duracion(app.segundosEncendida)],
            ['Memoria', `${app.memoriaUsadaMb} / ${app.memoriaMaximaMb} MB`],
            ['Java', app.java],
            ['Zona horaria', app.zonaHoraria],
            ['Arrancó', new Date(app.arranque).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })],
          ].map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt className="text-xs text-on-surface-variant">{etiqueta}</dt>
              <dd className="font-semibold text-on-surface">{valor}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export default function AdminSaludPage() {
  const [automatico, setAutomatico] = useState(true);
  const { datos, error, cargando, recargar } = useCarga(
    adminService.getSalud,
    isApiEnabled && automatico ? REFRESCO_MS : null
  );

  return (
    <>
      <CabeceraAdmin titulo="Salud" bajada="Si el backend, sus bases y sus tareas automáticas están funcionando ahora mismo.">
        {isApiEnabled && (
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <input
                type="checkbox"
                checked={automatico}
                onChange={(e) => setAutomatico(e.target.checked)}
                className="accent-primary"
              />
              Actualizar cada 15 s
            </label>
            <button
              type="button"
              onClick={recargar}
              disabled={cargando}
              className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60 active:scale-95"
            >
              <span aria-hidden="true" className={`material-symbols-outlined text-[18px] ${cargando ? 'animate-spin' : ''}`}>
                refresh
              </span>
              Comprobar
            </button>
          </div>
        )}
      </CabeceraAdmin>

      {!isApiEnabled ? (
        <SinServidor que="la salud" />
      ) : (
        <>
          {error && <ErrorCarga mensaje={error} onReintentar={recargar} />}
          {!datos && !error && (
            <div aria-busy="true" aria-label="Comprobando" className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-container" />
              ))}
            </div>
          )}
          {datos && <Contenido salud={datos} />}
        </>
      )}
    </>
  );
}
