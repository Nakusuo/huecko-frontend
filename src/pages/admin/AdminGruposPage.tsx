import { useEffect, useMemo, useState } from 'react';
import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import { adminService } from '../../services/adminService';
import { isApiEnabled } from '../../lib/apiClient';
import { tiempoRelativo } from '../../lib/tiempoRelativo';
import { filtrarGrupos, grupoActivo, type FiltroGrupos } from '../../lib/adminGrupos';
import type { GrupoAdmin } from '../../types/admin.types';

const FILTROS: { valor: FiltroGrupos; etiqueta: string }[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'activos', etiqueta: 'Activos' },
  { valor: 'dormidos', etiqueta: 'Sin actividad' },
  { valor: 'sinPlanes', etiqueta: 'Sin planes' },
];

/** Un número con su rótulo debajo, dentro de la tarjeta. */
function Dato({ valor, etiqueta }: { valor: number | string; etiqueta: string }) {
  return (
    <div>
      <dd className="font-headline text-xl tabular-nums text-on-surface">{valor}</dd>
      <dt className="text-2xs text-on-surface-variant">{etiqueta}</dt>
    </div>
  );
}

function TarjetaGrupo({ grupo }: { grupo: GrupoAdmin }) {
  const activo = grupoActivo(grupo);
  const { CONFIRMADO, CANCELADO, PROPUESTO, EN_RECOORDINACION } = grupo.planesPorEstado;
  const enCurso = PROPUESTO + EN_RECOORDINACION;

  return (
    <li className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate font-headline text-lg text-on-surface">{grupo.nombre}</h2>
          <p className="truncate text-xs text-on-surface-variant">
            {grupo.organizadores.length > 0 ? `Organiza ${grupo.organizadores.join(', ')}` : 'Sin organizador'}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-2xs font-semibold ${
            activo ? 'bg-success-container text-on-success-container' : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
            {activo ? 'check_circle' : 'bedtime'}
          </span>
          {activo ? 'Activo' : 'Sin actividad'}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        <Dato valor={grupo.miembros} etiqueta="integrantes" />
        <Dato valor={grupo.planes} etiqueta="planes" />
        <Dato valor={grupo.imprevistos} etiqueta="imprevistos" />
      </dl>

      <p className="mt-3 text-xs text-on-surface-variant">
        {grupo.planes === 0
          ? 'Todavía no ha propuesto ningún plan.'
          : `${CONFIRMADO} confirmados · ${enCurso} en curso · ${CANCELADO} cancelados`}
      </p>

      <p className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant pt-3 text-2xs text-on-surface-variant">
        <span>Umbral {grupo.umbralDisponibilidad} %</span>
        <span>
          {grupo.ultimaActividad ? `Movimiento ${tiempoRelativo(grupo.ultimaActividad).toLowerCase()}` : 'Sin movimiento'}
        </span>
      </p>
    </li>
  );
}

export default function AdminGruposPage() {
  const [grupos, setGrupos] = useState<GrupoAdmin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroGrupos>('todos');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    adminService.getGrupos().then(
      (lista) => {
        if (!vigente) return;
        setGrupos(lista);
        setError(null);
      },
      (err: unknown) => {
        if (vigente) setError(err instanceof Error ? err.message : 'No se pudo cargar la lista de grupos.');
      }
    );
    return () => {
      vigente = false;
    };
  }, [version]);

  const visibles = useMemo(() => filtrarGrupos(grupos ?? [], busqueda, filtro), [grupos, busqueda, filtro]);

  return (
    <>
      <CabeceraAdmin
        titulo="Grupos"
        bajada={
          grupos
            ? `${grupos.length} grupos. Actividad y tamaño, sin ver agendas, integrantes ni planes por dentro.`
            : 'Grupos de la plataforma y su actividad. Sin ver agendas ni planes por dentro.'
        }
      />

      {!isApiEnabled && (
        <p className="mb-6 rounded-xl border border-warning/30 bg-warning-container px-4 py-2.5 text-sm text-on-warning-container">
          Modo demo: son los grupos guardados en este navegador. Sin servidor no hay fechas de actividad.
        </p>
      )}

      {error && (
        <div role="alert" className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
          <span>{error}</span>
          <button type="button" onClick={() => setVersion((v) => v + 1)} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:w-80">
          <span className="sr-only">Buscar por grupo u organizador</span>
          <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
            search
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por grupo u organizador"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-secondary focus:outline-none"
          />
        </label>

        <div role="radiogroup" aria-label="Filtrar grupos" className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              role="radio"
              aria-checked={filtro === f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filtro === f.valor
                  ? 'bg-primary text-on-primary'
                  : 'border border-outline-variant text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {!grupos && !error && (
        <div aria-busy="true" aria-label="Cargando grupos" className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-2xl bg-surface-container" />
          ))}
        </div>
      )}

      {grupos && visibles.length === 0 && (
        <p className="rounded-2xl border border-dashed border-outline-variant bg-surface-container p-8 text-center text-sm text-on-surface-variant">
          {grupos.length === 0 ? 'Todavía no hay grupos en la plataforma.' : 'Ningún grupo coincide con la búsqueda.'}
        </p>
      )}

      {grupos && visibles.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visibles.map((g) => (
            <TarjetaGrupo key={g.id} grupo={g} />
          ))}
        </ul>
      )}
    </>
  );
}
