import { useEffect, useMemo, useState } from 'react';
import CabeceraAdmin from '../../components/admin/CabeceraAdmin';
import { AvisoError } from '../../components/AvisoError';
import { adminService } from '../../services/adminService';
import { isApiEnabled } from '../../lib/apiClient';
import { tiempoRelativo } from '../../lib/tiempoRelativo';
import { estaActiva, filtrarUsuarios, type FiltroUsuarios } from '../../lib/adminUsuarios';
import type { UsuarioAdmin } from '../../types/admin.types';

const FILTROS: { valor: FiltroUsuarios; etiqueta: string }[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'activas', etiqueta: 'Activas' },
  { valor: 'inactivas', etiqueta: 'Inactivas' },
  { valor: 'suspendidas', etiqueta: 'Suspendidas' },
];

const fechaAlta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' });

function Estado({ usuario }: { usuario: UsuarioAdmin }) {
  const [texto, clase, icono] = usuario.suspendido
    ? ['Suspendida', 'bg-error-container text-on-error-container', 'block']
    : usuario.rolSistema === 'ADMIN'
      ? ['Admin', 'bg-ink text-olive', 'shield_person']
      : estaActiva(usuario)
        ? ['Activa', 'bg-success-container text-on-success-container', 'check_circle']
        : ['Inactiva', 'bg-surface-container-high text-on-surface-variant', 'bedtime'];
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-2xs font-semibold ${clase}`}>
      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">{icono}</span>
      {texto}
    </span>
  );
}

/**
 * Suspender pide confirmación en la misma fila (echa a alguien de la app);
 * reactivar no, porque deshace algo y no hace daño.
 */
function AccionSuspension({
  usuario,
  ocupado,
  onCambiar,
}: {
  usuario: UsuarioAdmin;
  ocupado: boolean;
  onCambiar: (suspendido: boolean) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);

  if (usuario.rolSistema === 'ADMIN') {
    return <span className="text-2xs text-on-surface-variant">No se puede suspender</span>;
  }

  if (usuario.suspendido) {
    return (
      <button
        type="button"
        disabled={ocupado}
        onClick={() => onCambiar(false)}
        className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60 active:scale-95"
      >
        {ocupado ? 'Reactivando…' : 'Reactivar'}
      </button>
    );
  }

  if (confirmando) {
    return (
      <span className="flex items-center gap-1.5" role="group" aria-label={`Confirmar suspensión de ${usuario.nombre}`}>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => onCambiar(true)}
          className="rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-on-error transition-colors hover:opacity-90 disabled:opacity-60 active:scale-95"
        >
          {ocupado ? 'Suspendiendo…' : 'Sí, suspender'}
        </button>
        <button
          type="button"
          disabled={ocupado}
          onClick={() => setConfirmando(false)}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmando(true)}
      className="rounded-lg border border-error/30 px-3 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error-container active:scale-95"
    >
      Suspender
    </button>
  );
}

export default function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroUsuarios>('todas');
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    adminService.getUsuarios().then(
      (lista) => {
        if (!vigente) return;
        setUsuarios(lista);
        setErrorCarga(null);
      },
      (err: unknown) => {
        if (vigente) setErrorCarga(err instanceof Error ? err.message : 'No se pudo cargar la lista de cuentas.');
      }
    );
    return () => {
      vigente = false;
    };
  }, [version]);

  const visibles = useMemo(() => filtrarUsuarios(usuarios ?? [], busqueda, filtro), [usuarios, busqueda, filtro]);
  const suspendidas = usuarios?.filter((u) => u.suspendido).length ?? 0;

  const cambiar = async (usuario: UsuarioAdmin, suspendido: boolean) => {
    setOcupado(usuario.id);
    setErrorAccion(null);
    try {
      const actualizado = await adminService.cambiarSuspension(usuario.id, suspendido);
      setUsuarios((lista) => lista?.map((u) => (u.id === actualizado.id ? actualizado : u)) ?? null);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : 'No se pudo cambiar el estado de la cuenta.');
    } finally {
      setOcupado(null);
    }
  };

  return (
    <>
      <CabeceraAdmin
        titulo="Usuarios"
        bajada={
          usuarios
            ? `${usuarios.length} cuentas${suspendidas ? `, ${suspendidas} suspendidas` : ''}. Solo datos de la cuenta y cuánto la usa, nunca su horario.`
            : 'Cuentas registradas, su actividad y su estado.'
        }
      />

      {!isApiEnabled && (
        <p className="mb-6 rounded-xl border border-warning/30 bg-warning-container px-4 py-2.5 text-sm text-on-warning-container">
          Modo demo: son las cuentas creadas en este navegador. Sin servidor no hay actividad que medir.
        </p>
      )}

      {errorAccion && <AvisoError mensaje={errorAccion} onCerrar={() => setErrorAccion(null)} />}

      {errorCarga && (
        <div role="alert" className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-on-error-container">
          <span>{errorCarga}</span>
          <button type="button" onClick={() => setVersion((v) => v + 1)} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:w-80">
          <span className="sr-only">Buscar por nombre o correo</span>
          <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">
            search
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-secondary focus:outline-none"
          />
        </label>

        <div role="radiogroup" aria-label="Filtrar cuentas" className="flex flex-wrap gap-1.5">
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

      {!usuarios && !errorCarga && (
        <div aria-busy="true" aria-label="Cargando cuentas" className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-container" />
          ))}
        </div>
      )}

      {usuarios && visibles.length === 0 && (
        <p className="rounded-2xl border border-dashed border-outline-variant bg-surface-container p-8 text-center text-sm text-on-surface-variant">
          Ninguna cuenta coincide con la búsqueda.
        </p>
      )}

      {usuarios && visibles.length > 0 && (
        <>
          {/* Escritorio: tabla. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-outline-variant bg-surface-container-lowest md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container text-xs text-on-surface-variant">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Cuenta</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Alta</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Grupos</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold">Planes</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Última actividad</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold"><span className="sr-only">Acción</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((u) => (
                  <tr key={u.id} className="border-t border-outline-variant animate-fade-in">
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-on-surface">{u.nombre}</span>
                      <span className="block text-xs text-on-surface-variant">{u.email}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{fechaAlta(u.creadoEn)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.grupos}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{u.planesPropuestos}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">
                      {u.ultimaActividad ? tiempoRelativo(u.ultimaActividad) : 'Nunca'}
                    </td>
                    <td className="px-4 py-3"><Estado usuario={u} /></td>
                    <td className="px-4 py-3 text-right">
                      <AccionSuspension usuario={u} ocupado={ocupado === u.id} onCambiar={(s) => void cambiar(u, s)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas, una tabla de siete columnas no cabe. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {visibles.map((u) => (
              <li key={u.id} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 animate-fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-on-surface">{u.nombre}</p>
                    <p className="truncate text-xs text-on-surface-variant">{u.email}</p>
                  </div>
                  <Estado usuario={u} />
                </div>
                <p className="mt-2 text-xs text-on-surface-variant">
                  Alta {fechaAlta(u.creadoEn)} · {u.grupos} grupos · {u.planesPropuestos} planes ·{' '}
                  {u.ultimaActividad ? `activa ${tiempoRelativo(u.ultimaActividad).toLowerCase()}` : 'sin actividad'}
                </p>
                <div className="mt-3">
                  <AccionSuspension usuario={u} ocupado={ocupado === u.id} onCambiar={(s) => void cambiar(u, s)} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
