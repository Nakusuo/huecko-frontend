import { useMemo, useState } from 'react';
import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import { AccionesRevision, ErrorCarga, Filtro, InsigniaRevision } from '../../components/admin/Estados';
import { AvisoError } from '../../components/AvisoError';
import { useCarga } from '../../hooks/useCarga';
import { adminService } from '../../services/adminService';
import { isApiEnabled } from '../../lib/apiClient';
import { tiempoRelativo } from '../../lib/tiempoRelativo';
import { filtrarPorEstado, navegadorCorto, type FiltroBandeja } from '../../lib/bandejaFiltros';
import type { EstadoRevision, FalloAdmin, OrigenFallo, ReporteAdmin } from '../../types/admin.types';

type Pestana = 'reportes' | 'automaticos';

const ORIGEN: Record<OrigenFallo, { texto: string; icon: string }> = {
  SERVIDOR: { texto: 'Servidor', icon: 'dns' },
  CLIENTE: { texto: 'Navegador', icon: 'web' },
  TAREA: { texto: 'Tarea automática', icon: 'schedule' },
};

const FILTROS: { valor: FiltroBandeja; texto: string }[] = [
  { valor: 'pendientes', texto: 'Pendientes' },
  { valor: 'resueltos', texto: 'Resueltos' },
  { valor: 'todos', texto: 'Todos' },
];

function Contador({ n }: { n: number }) {
  if (n === 0) return null;
  return <span className="rounded-md bg-ink px-1.5 text-2xs font-bold text-olive tabular-nums">{n}</span>;
}

/* ------------------------------ Reportes ------------------------------ */

/**
 * La única acción sobre una cuenta que tiene el admin. Suspender pide
 * confirmación; reactivar no, porque deshace y no hace daño.
 */
function AccionCuenta({
  reporte,
  ocupado,
  onCambiar,
}: {
  reporte: ReporteAdmin;
  ocupado: boolean;
  onCambiar: (suspendido: boolean) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);
  if (reporte.cuentaReportadaSuspendida === null) {
    return <span className="text-2xs text-on-surface-variant">La cuenta ya no existe</span>;
  }
  if (reporte.cuentaReportadaSuspendida) {
    return (
      <button
        type="button"
        disabled={ocupado}
        onClick={() => onCambiar(false)}
        className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-high disabled:opacity-60"
      >
        {ocupado ? 'Reactivando…' : 'Reactivar cuenta'}
      </button>
    );
  }
  if (confirmando) {
    return (
      <span className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Confirmar suspensión">
        <span className="text-xs text-on-surface">No podrá entrar hasta que la reactives.</span>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onCambiar(true)}
          className="rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-on-error disabled:opacity-60"
        >
          {ocupado ? 'Suspendiendo…' : 'Sí, suspender'}
        </button>
        <button type="button" onClick={() => setConfirmando(false)} className="px-2 py-1.5 text-xs font-semibold text-on-surface-variant">
          No
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error-container"
    >
      Suspender cuenta
    </button>
  );
}

function TarjetaReporte({
  reporte,
  ocupado,
  onEstado,
  onSuspension,
}: {
  reporte: ReporteAdmin;
  ocupado: boolean;
  onEstado: (estado: EstadoRevision) => void;
  onSuspension: (suspendido: boolean) => void;
}) {
  const conducta = reporte.tipo === 'CONDUCTA';
  return (
    <li className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface">
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
            {conducta ? 'person_alert' : 'bug_report'}
          </span>
          {conducta ? 'Problema con otra persona' : 'Algo no funciona'}
        </span>
        <InsigniaRevision estado={reporte.estado} />
        <span className="ml-auto text-2xs text-on-surface-variant">{tiempoRelativo(reporte.creadoEn)}</span>
      </div>

      <p className="mt-3 whitespace-pre-line text-sm text-on-surface">{reporte.descripcion}</p>

      <p className="mt-3 text-xs text-on-surface-variant">
        De {reporte.autorNombre} ({reporte.autorEmail})
        {reporte.ruta && <> · en <code>{reporte.ruta}</code></>}
        {navegadorCorto(reporte.navegador) && <> · {navegadorCorto(reporte.navegador)}</>}
      </p>

      {conducta && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-container px-3 py-2">
          <span className="text-xs text-on-surface">
            Sobre <strong>{reporte.cuentaReportadaNombre}</strong> ({reporte.cuentaReportadaEmail})
            {reporte.cuentaReportadaSuspendida && <span className="ml-1 font-semibold text-error">· suspendida</span>}
          </span>
          <AccionCuenta reporte={reporte} ocupado={ocupado} onCambiar={onSuspension} />
        </div>
      )}

      <div className="mt-3 border-t border-outline-variant pt-3">
        <AccionesRevision estado={reporte.estado} ocupado={ocupado} onCambiar={onEstado} />
      </div>
    </li>
  );
}

/* ------------------------------- Fallos ------------------------------- */

function TarjetaFallo({
  fallo,
  ocupado,
  onEstado,
}: {
  fallo: FalloAdmin;
  ocupado: boolean;
  onEstado: (estado: EstadoRevision) => void;
}) {
  const origen = ORIGEN[fallo.origen];
  return (
    <li className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">{origen.icon}</span>
          {origen.texto}
        </span>
        <InsigniaRevision estado={fallo.estado} />
        {fallo.reabierto && (
          <span className="rounded-lg bg-warning-container px-2 py-0.5 text-2xs font-semibold text-on-warning-container">
            Volvió a ocurrir
          </span>
        )}
        <span className="ml-auto text-2xs text-on-surface-variant">
          {fallo.ocurrencias} {fallo.ocurrencias === 1 ? 'vez' : 'veces'} · última {tiempoRelativo(fallo.ultimaVez).toLowerCase()}
        </span>
      </div>

      <p className="mt-3 break-words font-mono text-sm font-semibold text-on-surface">
        {fallo.tipo.split('.').pop()}
      </p>
      <p className="mt-1 break-words text-sm text-on-surface">{fallo.mensaje}</p>
      <p className="mt-2 text-xs text-on-surface-variant">
        En <code>{fallo.ubicacion}</code>
        {navegadorCorto(fallo.navegador) && <> · {navegadorCorto(fallo.navegador)}</>}
        {' · '}primera vez {tiempoRelativo(fallo.primeraVez).toLowerCase()}
      </p>

      {fallo.traza && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-on-surface-variant hover:text-on-surface">
            Ver traza
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-ink p-3 text-2xs leading-relaxed text-cream">
            {fallo.traza}
          </pre>
        </details>
      )}

      <div className="mt-3 border-t border-outline-variant pt-3">
        <AccionesRevision estado={fallo.estado} ocupado={ocupado} onCambiar={onEstado} />
      </div>
    </li>
  );
}

/* ------------------------------- Página ------------------------------- */

export default function AdminFallosPage() {
  const [pestana, setPestana] = useState<Pestana>('reportes');
  const [filtro, setFiltro] = useState<FiltroBandeja>('pendientes');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const reportes = useCarga(adminService.getReportes);
  const fallos = useCarga(adminService.getFallos);

  const visiblesReportes = useMemo(() => filtrarPorEstado(reportes.datos ?? [], filtro), [reportes.datos, filtro]);
  const visiblesFallos = useMemo(() => filtrarPorEstado(fallos.datos ?? [], filtro), [fallos.datos, filtro]);
  const nuevosReportes = reportes.datos?.filter((r) => r.estado === 'NUEVO').length ?? 0;
  const nuevosFallos = fallos.datos?.filter((f) => f.estado === 'NUEVO').length ?? 0;

  /** Aplica la acción y sustituye la fila por la que devuelve el servidor. */
  async function actuar<T extends { id: string }>(
    id: string,
    accion: () => Promise<T>,
    setDatos: (f: (lista: T[] | null) => T[] | null) => void
  ) {
    setOcupado(id);
    setErrorAccion(null);
    try {
      const actualizado = await accion();
      setDatos((lista) => lista?.map((x) => (x.id === actualizado.id ? actualizado : x)) ?? null);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo aplicar el cambio.');
    } finally {
      setOcupado(null);
    }
  }

  const activa = pestana === 'reportes' ? reportes : fallos;
  const vacia = pestana === 'reportes' ? visiblesReportes.length === 0 : visiblesFallos.length === 0;

  return (
    <>
      <CabeceraAdmin
        titulo="Fallos"
        bajada="Lo que las personas reportan y los errores que la app registra sola. Se agrupan: mil errores iguales son una fila."
      >
        <button
          type="button"
          onClick={() => {
            reportes.recargar();
            fallos.recargar();
          }}
          className="flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high active:scale-95"
        >
          <span aria-hidden="true" className={`material-symbols-outlined text-[18px] ${activa.cargando ? 'animate-spin' : ''}`}>
            refresh
          </span>
          Actualizar
        </button>
      </CabeceraAdmin>

      {!isApiEnabled && (
        <p className="mb-6 rounded-xl border border-warning/30 bg-warning-container px-4 py-2.5 text-sm text-on-warning-container">
          Modo demo: aquí llegan los reportes y errores de este navegador. Prueba con «Reportar un problema» desde una
          cuenta normal.
        </p>
      )}

      {errorAccion && <AvisoError mensaje={errorAccion} onCerrar={() => setErrorAccion(null)} />}

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label="Bandeja" className="flex gap-1 rounded-xl bg-surface-container p-1">
          {(
            [
              ['reportes', 'Reportes de personas', nuevosReportes],
              ['automaticos', 'Errores automáticos', nuevosFallos],
            ] as const
          ).map(([valor, texto, nuevos]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={pestana === valor}
              onClick={() => setPestana(valor)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                pestana === valor ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {texto}
              <Contador n={nuevos} />
            </button>
          ))}
        </div>
        <Filtro etiqueta="Filtrar por estado" opciones={FILTROS} valor={filtro} onCambiar={setFiltro} />
      </div>

      {activa.error && <ErrorCarga mensaje={activa.error} onReintentar={activa.recargar} />}

      {!activa.datos && !activa.error && (
        <div aria-busy="true" aria-label="Cargando" className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-container" />
          ))}
        </div>
      )}

      {activa.datos && vacia && (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-outline-variant bg-surface-container p-10 text-center">
          <span aria-hidden="true" className="material-symbols-outlined mb-2 text-[28px] text-on-surface-variant">
            inbox
          </span>
          <p className="text-sm text-on-surface-variant">
            {filtro === 'pendientes' ? 'Nada pendiente. Todo al día.' : 'No hay nada aquí.'}
          </p>
        </div>
      )}

      {pestana === 'reportes' && visiblesReportes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {visiblesReportes.map((r) => (
            <TarjetaReporte
              key={r.id}
              reporte={r}
              ocupado={ocupado === r.id}
              onEstado={(estado) => void actuar(r.id, () => adminService.cambiarEstadoReporte(r.id, estado), reportes.setDatos)}
              onSuspension={(s) => void actuar(r.id, () => adminService.suspensionDesdeReporte(r.id, s), reportes.setDatos)}
            />
          ))}
        </ul>
      )}

      {pestana === 'automaticos' && visiblesFallos.length > 0 && (
        <ul className="flex flex-col gap-3">
          {visiblesFallos.map((f) => (
            <TarjetaFallo
              key={f.id}
              fallo={f}
              ocupado={ocupado === f.id}
              onEstado={(estado) => void actuar(f.id, () => adminService.cambiarEstadoFallo(f.id, estado), fallos.setDatos)}
            />
          ))}
        </ul>
      )}
    </>
  );
}
