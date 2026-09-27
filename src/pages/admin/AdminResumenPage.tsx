import { useEffect, useState } from 'react';
import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import Indicador from '../../components/admin/Indicador';
import { BarrasHorizontales, ColumnasSemanales } from '../../components/admin/Graficos';
import { adminService } from '../../services/adminService';
import { isApiEnabled } from '../../lib/apiClient';
import { tiempoRelativo } from '../../lib/tiempoRelativo';
import type { EstadoPlanAdmin, OpcionVotacion, ResumenAdmin, SemanaAdmin } from '../../types/admin.types';

const ESTADOS: { clave: EstadoPlanAdmin; etiqueta: string }[] = [
  { clave: 'CONFIRMADO', etiqueta: 'Confirmados' },
  { clave: 'PROPUESTO', etiqueta: 'En votación' },
  { clave: 'EN_RECOORDINACION', etiqueta: 'Reagendándose' },
  { clave: 'CANCELADO', etiqueta: 'Cancelados' },
];

const OPCIONES: { clave: OpcionVotacion; etiqueta: string }[] = [
  { clave: 'MANTENER', etiqueta: 'Se mantuvo' },
  { clave: 'REAGENDAR', etiqueta: 'Se reagendó' },
  { clave: 'CANCELAR', etiqueta: 'Se canceló' },
];

const porcentaje = (parte: number, total: number) => (total === 0 ? '0 %' : `${Math.round((parte / total) * 100)} %`);

const serie = (semanas: SemanaAdmin[], campo: keyof Omit<SemanaAdmin, 'inicio'>) =>
  semanas.map((s) => ({ inicio: s.inicio, valor: s[campo] }));

function Seccion({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-headline text-xl text-on-surface">{titulo}</h2>
      {nota && <p className="mt-1 text-xs text-on-surface-variant">{nota}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AdminResumenPage() {
  const [resumen, setResumen] = useState<ResumenAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  /* Cada «Actualizar» sube la versión y el efecto vuelve a pedir. El estado
     solo cambia al llegar la respuesta, y una respuesta de una versión ya
     superada (o de una página cerrada) se descarta. */
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    adminService
      .getResumen()
      .then(
        (datos) => {
          if (!vigente) return;
          setResumen(datos);
          setError(null);
        },
        (err: unknown) => {
          if (vigente) setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen.');
        },
      )
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [version]);

  const cargar = () => {
    setCargando(true);
    setVersion((v) => v + 1);
  };

  const botonActualizar = (
    <button
      type="button"
      onClick={cargar}
      disabled={cargando}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60 active:scale-95"
    >
      <span aria-hidden="true" className={`material-symbols-outlined text-[18px] ${cargando ? 'animate-spin' : ''}`}>
        refresh
      </span>
      {cargando ? 'Actualizando…' : 'Actualizar'}
    </button>
  );

  return (
    <>
      <CabeceraAdmin titulo="Resumen" bajada="Cómo se está usando Huecko. Solo cifras agregadas: ninguna agenda ni plan por dentro.">
        {botonActualizar}
      </CabeceraAdmin>

      {!isApiEnabled && (
        <p className="mb-6 rounded-xl border border-warning/30 bg-warning-container px-4 py-2.5 text-sm text-on-warning-container">
          Modo demo: estas cifras son de ejemplo, no hay un servidor que medir.
        </p>
      )}

      {error && (
        <div role="alert" className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
          <span>{error}</span>
          <button type="button" onClick={cargar} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      {!resumen && cargando && <EsqueletoResumen />}

      {resumen && (
        <div className={`animate-fade-in transition-opacity ${cargando ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Indicador
              icon="person"
              etiqueta="Cuentas"
              valor={resumen.usuarios.total}
              detalle={`+${resumen.usuarios.nuevos7d} en los últimos 7 días`}
            />
            <Indicador
              icon="bolt"
              etiqueta="Activas (30 días)"
              valor={resumen.usuarios.activos30d}
              detalle={`${porcentaje(resumen.usuarios.activos30d, resumen.usuarios.total)} de las cuentas`}
            />
            <Indicador
              icon="groups"
              etiqueta="Grupos"
              valor={resumen.grupos.total}
              detalle={`${resumen.grupos.activos30d} con actividad este mes`}
            />
            <Indicador
              icon="task_alt"
              etiqueta="Planes que se concretan"
              valor={resumen.planes.tasaConcrecion === null ? '—' : `${Math.round(resumen.planes.tasaConcrecion * 100)} %`}
              detalle={
                resumen.planes.tasaConcrecion === null
                  ? 'Aún no se ha cerrado ningún plan'
                  : 'De los planes cerrados, los confirmados'
              }
            />
          </div>

          <Seccion titulo="Actividad por semana" nota="Últimas 8 semanas. Pasa el cursor por una barra para ver su cifra.">
            <div className="grid gap-3 md:grid-cols-3">
              <ColumnasSemanales titulo="Cuentas nuevas" puntos={serie(resumen.semanas, 'altas')} />
              <ColumnasSemanales titulo="Planes propuestos" puntos={serie(resumen.semanas, 'planesPropuestos')} />
              <ColumnasSemanales titulo="Planes confirmados" puntos={serie(resumen.semanas, 'planesConfirmados')} />
            </div>
            <TablaSemanas semanas={resumen.semanas} />
          </Seccion>

          <div className="grid gap-x-8 lg:grid-cols-2">
            <Seccion titulo="Planes por estado" nota={`${resumen.planes.total} planes en total.`}>
              <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
                <BarrasHorizontales
                  filas={ESTADOS.map((e) => ({ etiqueta: e.etiqueta, valor: resumen.planes.porEstado[e.clave] }))}
                />
              </div>
            </Seccion>

            <Seccion titulo="Uso del producto">
              <div className="grid grid-cols-2 gap-3">
                <Indicador
                  icon="calendar_month"
                  etiqueta="Con horario cargado"
                  valor={porcentaje(resumen.usuarios.conHorario, resumen.usuarios.total)}
                  detalle={`${resumen.usuarios.conHorario} de ${resumen.usuarios.total} cuentas`}
                />
                <Indicador
                  icon="diversity_3"
                  etiqueta="Tamaño medio de grupo"
                  valor={resumen.grupos.miembrosMedio.toLocaleString('es-PE')}
                  detalle={`${resumen.grupos.sinPlanes} grupos sin ningún plan`}
                />
              </div>
            </Seccion>
          </div>

          <Seccion
            titulo="Imprevistos"
            nota={`Las votaciones exprés cerradas se borran a los ${resumen.imprevistos.diasRetencion} días: sus resultados son de ese periodo.`}
          >
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
              <Indicador
                icon="event_busy"
                etiqueta="Ausencias avisadas"
                valor={resumen.imprevistos.ausencias}
                detalle={`${resumen.imprevistos.ausenciasCriticas} críticas`}
              />
              <Indicador
                icon="schedule"
                etiqueta="Retrasos avisados"
                valor={resumen.imprevistos.retrasos}
                detalle={
                  resumen.imprevistos.minutosRetrasoMedio === null
                    ? 'Sin retrasos'
                    : `${resumen.imprevistos.minutosRetrasoMedio.toLocaleString('es-PE')} min de media`
                }
              />
              <Indicador
                icon="how_to_vote"
                etiqueta="Votaciones abiertas"
                valor={resumen.imprevistos.votacionesAbiertas}
                detalle="Ahora mismo"
              />
              <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
                <p className="mb-3 text-xs font-semibold text-on-surface-variant">
                  Resultado de {resumen.imprevistos.votacionesCerradasRecientes} votaciones recientes
                </p>
                <BarrasHorizontales
                  filas={OPCIONES.map((o) => ({ etiqueta: o.etiqueta, valor: resumen.imprevistos.resultados[o.clave] }))}
                />
              </div>
            </div>
          </Seccion>

          <p className="mt-10 text-xs text-on-surface-variant">
            Calculado {tiempoRelativo(resumen.generadoEn).toLowerCase()}.
          </p>
        </div>
      )}
    </>
  );
}

/** Las mismas cifras que las columnas, para quien no puede o no quiere leer el gráfico. */
function TablaSemanas({ semanas }: { semanas: SemanaAdmin[] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-on-surface-variant hover:text-on-surface">
        Ver como tabla
      </summary>
      <div className="mt-2 overflow-x-auto rounded-xl border border-outline-variant">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container text-xs text-on-surface-variant">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Semana del</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Cuentas nuevas</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Planes propuestos</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">Planes confirmados</th>
            </tr>
          </thead>
          <tbody>
            {semanas.map((s) => (
              <tr key={s.inicio} className="border-t border-outline-variant">
                <td className="px-3 py-1.5">
                  {new Date(`${s.inicio}T12:00:00`).toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{s.altas}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{s.planesPropuestos}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{s.planesConfirmados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function EsqueletoResumen() {
  return (
    <div aria-busy="true" aria-label="Cargando el resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-container" />
      ))}
    </div>
  );
}
