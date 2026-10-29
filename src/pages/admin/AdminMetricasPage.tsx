import { useState } from 'react';
import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import { ErrorCarga, SinServidor } from '../../components/admin/Estados';
import { ColumnasSerie } from '../../components/admin/Graficos';
import { useCarga } from '../../hooks/useCarga';
import { isApiEnabled } from '../../lib/apiClient';
import { adminService } from '../../services/adminService';
import type { MetricasAdmin } from '../../types/admin.types';

const REFRESCO_MS = 10_000;

/** Por encima de esto, la tarjeta de errores se marca: algo falla más de lo normal. */
const UMBRAL_ERRORES = 1;

function Cifra({ titulo, valor, unidad, nota, alerta }: {
  titulo: string;
  valor: string;
  unidad?: string;
  nota: string;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
      <p className="text-xs text-on-surface-variant">{titulo}</p>
      <p className="mt-1 font-headline text-3xl tabular-nums text-on-surface">
        {valor}
        {unidad && <span className="ml-1 text-sm text-on-surface-variant">{unidad}</span>}
      </p>
      <p className={`mt-1 flex items-center gap-1 text-2xs ${alerta ? 'font-semibold text-error' : 'text-on-surface-variant'}`}>
        {alerta && <span aria-hidden="true" className="material-symbols-outlined text-[14px]">warning</span>}
        {nota}
      </p>
    </div>
  );
}

function Contenido({ m }: { m: MetricasAdmin }) {
  const r = m.resumen;
  const memoria = Math.round((100 * m.jvm.memoriaUsadaMb) / Math.max(1, m.jvm.memoriaMaximaMb));

  return (
    <div className="animate-fade-in space-y-8">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen">
        <Cifra titulo="Último minuto" valor={String(r.peticionesUltimoMinuto)} unidad="pet." nota={`${r.peticiones} desde que arrancó`} />
        <Cifra titulo="Tiempo medio de respuesta" valor={String(r.mediaMs)} unidad="ms" nota="Media de todas las peticiones" />
        <Cifra
          titulo="Errores del servidor (5xx)"
          valor={`${r.porcentajeErrores}%`}
          nota={r.errores === 0 ? 'Ninguno desde el arranque' : `${r.errores} en total · mira «Fallos»`}
          alerta={r.porcentajeErrores >= UMBRAL_ERRORES}
        />
        <Cifra
          titulo="Errores del cliente (4xx)"
          valor={String(r.erroresCliente)}
          nota="Datos no válidos, sin permiso o no encontrado"
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <ColumnasSerie
          titulo={`Peticiones cada ${m.intervaloSegundos} s`}
          puntos={m.serie.map((p) => ({ momento: p.momento, valor: p.peticiones }))}
          unidad="peticiones"
          vacio="Los primeros puntos llegan a los 20 s del arranque."
        />
        <ColumnasSerie
          titulo="Tiempo medio de respuesta"
          puntos={m.serie.map((p) => ({ momento: p.momento, valor: Math.round(p.mediaMs) }))}
          unidad="ms"
          vacio="Los primeros puntos llegan a los 20 s del arranque."
        />
      </section>

      <section>
        <h2 className="font-headline text-xl text-on-surface">Endpoints más usados</h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          p95: el 95 % de las peticiones tardó menos que esto. Es mejor guía que la media, que esconde las lentas.
        </p>
        {m.rutas.length === 0 ? (
          <p className="mt-4 text-sm text-on-surface-variant">Todavía no ha llegado ninguna petición.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container text-2xs uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th scope="col" className="px-4 py-2.5">Endpoint</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Peticiones</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Errores 5xx</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Media</th>
                  <th scope="col" className="px-4 py-2.5 text-right">p95</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Máx.</th>
                </tr>
              </thead>
              <tbody>
                {m.rutas.map((ruta) => (
                  <tr key={`${ruta.metodo} ${ruta.uri}`} className="border-t border-outline-variant/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-on-surface">
                      <span className="mr-2 font-bold text-on-surface-variant">{ruta.metodo}</span>
                      {ruta.uri}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{ruta.peticiones}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${ruta.errores > 0 ? 'font-semibold text-error' : ''}`}>
                      {ruta.errores}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{ruta.mediaMs} ms</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{ruta.p95Ms} ms</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-on-surface-variant">{ruta.maxMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-headline text-xl text-on-surface">Proceso de la API</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 text-sm md:grid-cols-4">
          {[
            ['Memoria', `${m.jvm.memoriaUsadaMb} / ${m.jvm.memoriaMaximaMb} MB (${memoria}%)`],
            ['CPU', `${m.jvm.cpu}%`],
            ['Hilos', String(m.jvm.hilos)],
            ['Arrancó', new Date(m.jvm.arranque).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })],
          ].map(([etiqueta, valor]) => (
            <div key={etiqueta}>
              <dt className="text-xs text-on-surface-variant">{etiqueta}</dt>
              <dd className="font-semibold tabular-nums text-on-surface">{valor}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-2xs text-on-surface-variant">
          Medido con Spring Boot Actuator (Micrometer). Se guarda en memoria la última media hora: al reiniciar la API
          empieza de cero. No cuenta las consultas de salud ni las de esta página.
        </p>
      </section>
    </div>
  );
}

export default function AdminMetricasPage() {
  const [automatico, setAutomatico] = useState(true);
  const { datos, error, cargando, recargar } = useCarga(
    adminService.getMetricas,
    isApiEnabled && automatico ? REFRESCO_MS : null
  );

  return (
    <>
      <CabeceraAdmin titulo="Métricas" bajada="Cuántas peticiones recibe la API, cuántas fallan y cuánto tardan, en vivo.">
        {isApiEnabled && (
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-on-surface-variant">
              <input
                type="checkbox"
                checked={automatico}
                onChange={(e) => setAutomatico(e.target.checked)}
                className="accent-primary"
              />
              Actualizar cada 10 s
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
              Actualizar
            </button>
          </div>
        )}
      </CabeceraAdmin>

      {!isApiEnabled ? (
        <SinServidor que="las métricas" />
      ) : (
        <>
          {error && <ErrorCarga mensaje={error} onReintentar={recargar} />}
          {!datos && !error && (
            <div aria-busy="true" aria-label="Cargando" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-container" />
              ))}
            </div>
          )}
          {datos && <Contenido m={datos} />}
        </>
      )}
    </>
  );
}
