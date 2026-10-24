import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { ReportarProblemaModal } from './ReportarProblema';
import { useCarga } from '../hooks/useCarga';
import { useModalDismiss } from '../hooks/useModalDismiss';
import { isApiEnabled } from '../lib/apiClient';
import { INSIGNIAS, textoCiclo } from '../lib/insignias';
import { logrosDemo, perfilDemo } from '../lib/perfilesDemo';
import { esCuentaEjemplo, normalizarEmail } from '../services/authService';
import { profileService } from '../services/profileService';
import { useAuthStore } from '../store/authStore';
import { useGroupsStore } from '../store/groupsStore';
import { usePreferenciasLocales } from '../store/profileStore';
import type { AuthUser } from '../types/auth.types';
import type { Group } from '../types/groups.types';
import type { PerfilPublico } from '../types/profile.types';

/** Lo que ya se sabe de la persona antes de pedir su tarjeta: sale de la lista de integrantes. */
export interface PersonaDelGrupo {
  nombre: string;
  email?: string;
  usuarioId?: string;
  fotoActualizadaEn?: string | null;
  color?: string;
}

/* Los nombres del modo demo llevan «(Tú)». */
const sinTu = (nombre: string) => nombre.replace(/\s*\(t[uú]\)\s*$/i, '');

/** En demo no hay servidor: la tarjeta sale de la sesión o de los perfiles de ejemplo. */
function tarjetaDemo(persona: PersonaDelGrupo, yo: AuthUser | null, grupos: Group[]): PerfilPublico {
  const email = normalizarEmail(persona.email ?? '');
  if (yo && normalizarEmail(yo.email) === email) {
    return {
      usuarioId: yo.id,
      nombre: yo.nombre,
      carrera: yo.carrera ?? null,
      ciclo: yo.ciclo ?? null,
      bio: yo.bio ?? null,
      intereses: yo.intereses ?? [],
      fotoActualizadaEn: null,
      enHueckoDesde: yo.creado_en,
      gruposEnComun: grupos.map((g) => g.nombre),
      planesJuntos: null,
      insignias: logrosDemo(esCuentaEjemplo(yo)).insignias,
    };
  }
  const perfil = perfilDemo(email);
  return {
    usuarioId: email,
    nombre: sinTu(persona.nombre),
    carrera: perfil.carrera,
    ciclo: perfil.ciclo,
    bio: perfil.bio,
    intereses: perfil.intereses,
    fotoActualizadaEn: null,
    enHueckoDesde: '2026-03-02T00:00:00.000Z',
    gruposEnComun: grupos
      .filter((g) => g.miembros.some((m) => normalizarEmail(m.email) === email))
      .map((g) => g.nombre),
    planesJuntos: perfil.planesJuntos,
    insignias: perfil.insignias,
  };
}

const mesYAnio = (iso: string) =>
  new Date(iso).toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

/**
 * La tarjeta de alguien de tus grupos: foto, carrera, intereses e insignias.
 * Nada de su horario (RNF-02) ni de cuántas veces llegó tarde: solo las
 * insignias que tiene.
 */
export function TarjetaPerfil({ persona, onClose }: { persona: PersonaDelGrupo; onClose: () => void }) {
  const navigate = useNavigate();
  const yo = useAuthStore((s) => s.user);
  const grupos = useGroupsStore((s) => s.groups);
  const { avatarUrl } = usePreferenciasLocales();
  const [reportando, setReportando] = useState(false);

  useModalDismiss(!reportando, onClose);

  const conServidor = isApiEnabled && Boolean(persona.usuarioId);
  const { datos: tarjeta, error, cargando } = useCarga<PerfilPublico>(() =>
    conServidor
      ? profileService.getPerfilPublico(persona.usuarioId as string)
      : Promise.resolve(tarjetaDemo(persona, yo, grupos))
  );

  const esYo = Boolean(yo) && (persona.usuarioId === yo?.id
    || (Boolean(persona.email) && normalizarEmail(persona.email ?? '') === normalizarEmail(yo?.email ?? '')));
  const nombre = tarjeta?.nombre ?? sinTu(persona.nombre);
  const sinPerfil = tarjeta && !tarjeta.carrera && !tarjeta.ciclo && !tarjeta.bio && tarjeta.intereses.length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tarjeta-perfil-nombre"
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/50 p-4 animate-scrim-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-surface p-6 elev-3 animate-modal-in">
        <button
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <span aria-hidden="true" className="material-symbols-outlined">close</span>
        </button>

        <div className="flex flex-col items-center text-center">
          <Avatar
            nombre={nombre}
            usuarioId={persona.usuarioId}
            fotoActualizadaEn={tarjeta?.fotoActualizadaEn ?? persona.fotoActualizadaEn}
            fotoLocal={esYo && !isApiEnabled ? avatarUrl : undefined}
            color={persona.color}
            className="size-24 text-3xl shadow-md"
          />
          <h2 id="tarjeta-perfil-nombre" className="mt-3 font-headline text-xl font-bold text-on-surface">
            {nombre}
          </h2>
          {tarjeta && (tarjeta.carrera || tarjeta.ciclo) && (
            <p className="text-sm text-on-surface-variant">
              {[tarjeta.carrera, tarjeta.ciclo ? textoCiclo(tarjeta.ciclo) : null].filter(Boolean).join(' · ')}
            </p>
          )}
          {tarjeta?.bio && <p className="mt-3 text-sm italic text-on-surface">«{tarjeta.bio}»</p>}
        </div>

        {cargando && (
          <p className="mt-4 text-center text-xs text-on-surface-variant" aria-live="polite">
            Cargando su perfil…
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-center text-xs font-medium text-error">
            {error}
          </p>
        )}

        {tarjeta && (
          <div className="mt-5 space-y-4">
            {sinPerfil && (
              <p className="text-center text-xs text-on-surface-variant">
                {esYo ? 'Aún no completaste tu perfil.' : 'Todavía no completó su perfil.'}
              </p>
            )}

            {tarjeta.intereses.length > 0 && (
              <ul className="flex flex-wrap justify-center gap-1.5" aria-label="Intereses">
                {tarjeta.intereses.map((interes) => (
                  <li
                    key={interes}
                    className="rounded-full bg-secondary-container px-2.5 py-1 text-2xs font-semibold text-on-secondary-container"
                  >
                    {interes}
                  </li>
                ))}
              </ul>
            )}

            {tarjeta.insignias.length > 0 && (
              <ul className="grid grid-cols-2 gap-2" aria-label="Insignias">
                {tarjeta.insignias.map((codigo) => (
                  <li
                    key={codigo}
                    title={INSIGNIAS[codigo].detalle}
                    className="flex items-center gap-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-2.5 py-2"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-[20px] text-primary">
                      {INSIGNIAS[codigo].icono}
                    </span>
                    <span className="text-xs font-semibold text-on-surface">{INSIGNIAS[codigo].titulo}</span>
                  </li>
                ))}
              </ul>
            )}

            <dl className="space-y-1.5 border-t border-outline-variant/60 pt-3 text-xs">
              {tarjeta.planesJuntos !== null && (
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Planes juntos</dt>
                  <dd className="font-semibold tabular-nums text-on-surface">{tarjeta.planesJuntos}</dd>
                </div>
              )}
              {tarjeta.gruposEnComun.length > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-on-surface-variant">{esYo ? 'Tus grupos' : 'En común'}</dt>
                  <dd className="text-right font-medium text-on-surface">{tarjeta.gruposEnComun.join(', ')}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">En Huecko desde</dt>
                <dd className="font-medium text-on-surface">{mesYAnio(tarjeta.enHueckoDesde)}</dd>
              </div>
            </dl>
          </div>
        )}

        <div className="mt-5 flex flex-col items-center gap-2">
          {esYo ? (
            <>
              <p className="text-2xs text-on-surface-variant">Así te ven las personas de tus grupos.</p>
              <button
                type="button"
                onClick={() => navigate('/profile')}
                className="cursor-pointer rounded-xl bg-secondary px-4 py-2 text-xs font-semibold text-on-secondary hover:bg-secondary-hover"
              >
                Editar mi perfil
              </button>
            </>
          ) : (
            persona.email && (
              <button
                type="button"
                onClick={() => setReportando(true)}
                className="flex cursor-pointer items-center gap-1 text-2xs text-on-surface-variant underline hover:text-error"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">flag</span>
                Reportar a esta persona
              </button>
            )
          )}
        </div>
      </div>

      {reportando && persona.email && (
        <ReportarProblemaModal cuentaReportada={persona.email} onClose={() => setReportando(false)} />
      )}
    </div>
  );
}
