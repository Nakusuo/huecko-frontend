import { useState } from 'react';
import { useModalDismiss } from '../hooks/useModalDismiss';

/**
 * Crear un grupo, con sus integrantes iniciales.
 *
 * Es la primera mitad del modelo de acceso que sustituyó al código de
 * invitación: **la gente entra porque alguien la mete**, aquí al crear el
 * grupo y después desde la ficha de integrantes. No hay una cadena que
 * reenviar por chat y que abra la puerta a quien la vea.
 *
 * El correo se acumula en una lista antes de enviar, en vez de dar de alta uno
 * a uno: al crear un grupo se piensa en el conjunto de personas, no en una
 * sucesión de altas.
 */

export interface DatosGrupoNuevo {
  nombre: string;
  descripcion: string;
  umbral: number;
  /** Correos de quienes entran junto al creador. */
  correos: string[];
}

interface Props {
  title: string;
  onClose: () => void;
  onSubmit: (datos: DatosGrupoNuevo) => Promise<void>;
}

const UMBRAL_POR_DEFECTO = 80;

export function CrearGrupoModal({ title, onClose, onSubmit }: Props) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [umbral, setUmbral] = useState(UMBRAL_POR_DEFECTO);
  const [correos, setCorreos] = useState<string[]>([]);
  const [correoNuevo, setCorreoNuevo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useModalDismiss(true, onClose);

  function agregarCorreo() {
    const limpio = correoNuevo.trim().toLowerCase();
    if (!limpio) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
      setError('Ese correo no tiene un formato válido.');
      return;
    }
    if (correos.includes(limpio)) {
      setError('Ese correo ya está en la lista.');
      return;
    }

    setCorreos([...correos, limpio]);
    setCorreoNuevo('');
    setError(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim() || enviando) return;

    setEnviando(true);
    setError(null);
    try {
      await onSubmit({ nombre: nombre.trim(), descripcion: descripcion.trim(), umbral, correos });
    } catch {
      setError('No se pudo crear el grupo. Vuelve a intentarlo.');
      setEnviando(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crear-grupo-titulo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-4 animate-scrim-in"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 elev-3 animate-modal-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="crear-grupo-titulo" className="font-headline text-xl font-bold text-on-surface">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="cursor-pointer text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <span aria-hidden="true" className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={enviar} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="grupo-nombre" className="block text-xs font-semibold text-on-surface-variant">
              Nombre del grupo *
            </label>
            <input
              id="grupo-nombre"
              type="text"
              required
              autoFocus
              placeholder="Proyecto Integrador, Viaje de verano…"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:border-secondary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="grupo-desc" className="block text-xs font-semibold text-on-surface-variant">
              Descripción
            </label>
            <textarea
              id="grupo-desc"
              rows={2}
              placeholder="Para qué es este grupo."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:border-secondary focus:outline-none"
            />
          </div>

          {/* Umbral */}
          <div className="space-y-2 rounded-xl bg-surface-container-lowest p-4 elev-0">
            <div className="flex items-center justify-between">
              <label htmlFor="grupo-umbral" className="text-xs font-semibold text-on-surface">
                Umbral mínimo de coincidencia
              </label>
              <span className="rounded-lg bg-primary-container px-2 py-0.5 text-2xs font-bold tabular-nums text-on-primary-container">
                {umbral}%
              </span>
            </div>
            <input
              id="grupo-umbral"
              type="range"
              min={50}
              max={100}
              step={5}
              value={umbral}
              onChange={(e) => setUmbral(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <p className="text-2xs text-on-surface-variant">
              Una franja cuenta como hueco del grupo cuando al menos este porcentaje está libre.
              Con 100 hace falta unanimidad.
            </p>
          </div>

          {/* Integrantes iniciales */}
          <div className="space-y-2">
            <label htmlFor="grupo-correo" className="block text-xs font-semibold text-on-surface-variant">
              Integrantes
            </label>

            <div className="flex gap-2">
              <input
                id="grupo-correo"
                type="email"
                placeholder="correo@huecko.com"
                value={correoNuevo}
                onChange={(e) => setCorreoNuevo(e.target.value)}
                onKeyDown={(e) => {
                  // Enter añade a la lista, no envía el formulario: si no,
                  // escribir un correo y pulsar Enter crearía el grupo sin él.
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    agregarCorreo();
                  }
                }}
                className="min-w-0 flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-2.5 text-sm text-on-surface placeholder-outline focus:border-secondary focus:outline-none"
              />
              <button
                type="button"
                onClick={agregarCorreo}
                className="shrink-0 cursor-pointer rounded-xl bg-surface-container px-4 py-2.5 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container-high active:scale-95"
              >
                Añadir
              </button>
            </div>

            {correos.length > 0 && (
              <ul className="flex flex-wrap gap-1.5 pt-1">
                {correos.map((correo) => (
                  <li key={correo}>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container py-1 pl-2.5 pr-1.5 text-2xs text-on-surface">
                      {correo}
                      <button
                        type="button"
                        aria-label={`Quitar ${correo}`}
                        onClick={() => setCorreos(correos.filter((c) => c !== correo))}
                        className="cursor-pointer rounded text-on-surface-variant transition-colors hover:text-error"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-2xs text-on-surface-variant">
              Tienen que tener cuenta en Huecko. Después puedes añadir o quitar gente desde los
              integrantes del grupo.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-xs font-semibold text-error">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl px-4 py-2.5 text-xs font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!nombre.trim() || enviando}
              className="cursor-pointer rounded-xl bg-secondary px-5 py-2.5 text-xs font-bold text-on-secondary transition-colors hover:bg-secondary-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviando ? 'Creando…' : 'Crear grupo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
