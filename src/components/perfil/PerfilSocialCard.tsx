import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAvisoEfimero } from '../../hooks/useAvisoEfimero';
import { textoCiclo } from '../../lib/insignias';
import { agregarInteres, CICLOS, MAX_BIO, MAX_CARRERA, MAX_INTERES, perfilParaGuardar } from '../../lib/perfilSocial';
import { useAuthStore } from '../../store/authStore';
import { useProfileStore } from '../../store/profileStore';
import type { PerfilSocial } from '../../types/auth.types';

const CAMPO =
  'w-full px-3.5 py-2.5 border border-outline-variant rounded-xl bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-secondary';

/**
 * «Cómo te ven tus grupos»: carrera, ciclo, una frase e intereses. Es lo que
 * sale en tu tarjeta cuando alguien de tus grupos toca tu nombre.
 */
export function PerfilSocialCard({ onVerTarjeta }: { onVerTarjeta: () => void }) {
  const user = useAuthStore((s) => s.user);
  const guardarPerfilSocial = useProfileStore((s) => s.guardarPerfilSocial);
  const isSaving = useProfileStore((s) => s.isSaving);

  const actual: PerfilSocial = {
    carrera: user?.carrera ?? null,
    ciclo: user?.ciclo ?? null,
    bio: user?.bio ?? null,
    intereses: user?.intereses ?? [],
  };

  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState<PerfilSocial>(actual);
  const [nuevoInteres, setNuevoInteres] = useState('');
  const [avisoInteres, setAvisoInteres] = useState('');
  const [error, setError] = useState('');
  const [guardado, marcarGuardado] = useAvisoEfimero<true>(3000);

  const vacio = !actual.carrera && !actual.ciclo && !actual.bio && actual.intereses.length === 0;

  const empezar = () => {
    setBorrador(actual);
    setNuevoInteres('');
    setAvisoInteres('');
    setError('');
    setEditando(true);
  };

  const sumarInteres = () => {
    const resultado = agregarInteres(borrador.intereses, nuevoInteres);
    if ('error' in resultado) {
      setAvisoInteres(resultado.error);
      return;
    }
    setBorrador({ ...borrador, intereses: resultado.lista });
    setNuevoInteres('');
    setAvisoInteres('');
  };

  // Enter o coma añaden el interés en vez de enviar el formulario.
  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      sumarInteres();
    }
  };

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    // Lo que quedó escrito sin pulsar «Añadir» también cuenta.
    let intereses = borrador.intereses;
    if (nuevoInteres.trim()) {
      const resultado = agregarInteres(intereses, nuevoInteres);
      if ('error' in resultado) {
        setAvisoInteres(resultado.error);
        return;
      }
      intereses = resultado.lista;
    }
    try {
      await guardarPerfilSocial(perfilParaGuardar({ ...borrador, intereses }));
      setEditando(false);
      marcarGuardado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="bg-surface-container-lowest elev-1 rounded-2xl p-6">
      <div className="flex justify-between items-center gap-3 mb-4 pb-3 border-b border-outline-variant/60">
        <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
          <span aria-hidden="true" className="material-symbols-outlined text-primary">badge</span>
          Cómo te ven tus grupos
        </h3>
        {!editando && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onVerTarjeta}
              className="text-xs font-bold text-on-surface-variant hover:text-on-surface flex items-center gap-1 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">visibility</span>
              Ver mi tarjeta
            </button>
            <button
              type="button"
              onClick={empezar}
              className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">edit</span>
              Editar
            </button>
          </div>
        )}
      </div>

      {guardado && !editando && (
        <p role="status" className="mb-3 text-xs font-semibold text-success flex items-center gap-1">
          <span aria-hidden="true" className="material-symbols-outlined text-[16px]">check_circle</span>
          Guardado. Tus grupos ya lo ven en tu tarjeta.
        </p>
      )}

      {!editando ? (
        vacio ? (
          <p className="text-sm text-on-surface-variant">
            Cuéntale a tus grupos qué estudias y qué te gusta. Lo verán al tocar tu nombre.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            {(actual.carrera || actual.ciclo) && (
              <p className="text-on-surface font-medium">
                {[actual.carrera, actual.ciclo ? textoCiclo(actual.ciclo) : null].filter(Boolean).join(' · ')}
              </p>
            )}
            {actual.bio && <p className="italic text-on-surface">«{actual.bio}»</p>}
            {actual.intereses.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Tus intereses">
                {actual.intereses.map((i) => (
                  <li key={i} className="rounded-full bg-secondary-container px-2.5 py-1 text-2xs font-semibold text-on-secondary-container">
                    {i}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      ) : (
        <form onSubmit={guardar} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="perfil-carrera" className="block text-xs font-medium text-on-surface-variant mb-1.5">Carrera</label>
              <input
                id="perfil-carrera"
                type="text"
                maxLength={MAX_CARRERA}
                placeholder="Ingeniería de Software"
                value={borrador.carrera ?? ''}
                onChange={(e) => setBorrador({ ...borrador, carrera: e.target.value })}
                className={CAMPO}
              />
            </div>
            <div>
              <label htmlFor="perfil-ciclo" className="block text-xs font-medium text-on-surface-variant mb-1.5">Ciclo</label>
              <select
                id="perfil-ciclo"
                value={borrador.ciclo ?? ''}
                onChange={(e) => setBorrador({ ...borrador, ciclo: e.target.value ? Number(e.target.value) : null })}
                className={CAMPO}
              >
                <option value="">Sin indicar</option>
                {CICLOS.map((c) => (
                  <option key={c} value={c}>{textoCiclo(c)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="perfil-bio" className="block text-xs font-medium text-on-surface-variant mb-1.5">Una frase sobre ti</label>
            <textarea
              id="perfil-bio"
              rows={2}
              maxLength={MAX_BIO}
              placeholder="Prefiero estudiar temprano en la biblioteca."
              value={borrador.bio ?? ''}
              onChange={(e) => setBorrador({ ...borrador, bio: e.target.value })}
              aria-describedby="perfil-bio-cuenta"
              className={CAMPO}
            />
            <p id="perfil-bio-cuenta" className="mt-1 text-right text-2xs text-on-surface-variant tabular-nums">
              {(borrador.bio ?? '').length}/{MAX_BIO}
            </p>
          </div>

          <div>
            <label htmlFor="perfil-interes" className="block text-xs font-medium text-on-surface-variant mb-1.5">Intereses</label>
            {borrador.intereses.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Intereses añadidos">
                {borrador.intereses.map((i) => (
                  <li key={i} className="flex items-center gap-1 rounded-full bg-secondary-container pl-2.5 pr-1 py-0.5 text-2xs font-semibold text-on-secondary-container">
                    {i}
                    <button
                      type="button"
                      aria-label={`Quitar ${i}`}
                      onClick={() => setBorrador({ ...borrador, intereses: borrador.intereses.filter((x) => x !== i) })}
                      className="flex cursor-pointer items-center rounded-full p-0.5 hover:bg-on-secondary-container/10"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                id="perfil-interes"
                type="text"
                maxLength={MAX_INTERES}
                placeholder="Fútbol, anime, café…"
                value={nuevoInteres}
                onChange={(e) => {
                  setNuevoInteres(e.target.value);
                  setAvisoInteres('');
                }}
                onKeyDown={alTeclear}
                aria-invalid={Boolean(avisoInteres)}
                aria-describedby={avisoInteres ? 'perfil-interes-aviso' : undefined}
                className={CAMPO}
              />
              <button
                type="button"
                onClick={sumarInteres}
                className="shrink-0 px-4 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface-variant text-xs font-semibold cursor-pointer border border-outline-variant/60"
              >
                Añadir
              </button>
            </div>
            {avisoInteres && (
              <p id="perfil-interes-aviso" role="alert" className="mt-1 text-2xs font-semibold text-error">{avisoInteres}</p>
            )}
          </div>

          {error && (
            <div role="alert" className="px-3 py-2 rounded-xl bg-error-container border border-error/30 text-xs text-error flex items-start gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px] shrink-0">cancel</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setEditando(false)}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest text-xs font-medium cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-on-secondary text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
