import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { profileService } from '../services/profileService';
import { normalizarEmail } from '../services/authService';
import { useAuthStore } from './authStore';
import { isApiEnabled } from '../lib/apiClient';
import { blobADataUrl, dataUrlABlob, reducirFoto } from '../lib/fotos';
import type { AuthUser, PerfilSocial } from '../types/auth.types';
import type { PreferenciasLocales, UserProfileData } from '../types/profile.types';

export type { PreferenciasLocales };

/**
 * Perfil del usuario.
 *
 * Nombre y correo NO se guardan aquí: su única fuente es `authStore.user`, que
 * es lo que pintan la barra de navegación y los saludos. Antes había una copia
 * propia que arrancaba con los datos de «Alex Rodríguez» y se desincronizaba
 * de la cuenta real (en demo, un usuario recién registrado veía el perfil de
 * Alex). Este store se ocupa de traer y guardar esos datos en el servidor, y
 * de las preferencias que solo viven en este navegador.
 */

export const PREFERENCIAS_POR_DEFECTO: PreferenciasLocales = { alertasRetrasos: true };

interface ProfileState {
  isLoading: boolean;
  isSaving: boolean;
  syncError: string | null;
  /**
   * Preferencias locales por id de cuenta. Se guardan aparte de la sesión para
   * que sobrevivan al cerrar sesión: antes, con backend, cada salida las
   * devolvía a los valores por defecto.
   */
  preferencias: Record<string, PreferenciasLocales>;
  /** Trae nombre y correo del servidor y actualiza la sesión. En demo no hace nada. */
  fetchProfile: () => Promise<void>;
  /**
   * Guarda nombre y correo. Espera la respuesta y, si el servidor la rechaza,
   * LANZA con su mensaje: la página solo debe decir «guardado» si lo está.
   */
  guardarPerfil: (datos: { nombre: string; email: string; passwordActual?: string }) => Promise<void>;
  /** Carrera, ciclo, frase e intereses. Lanza con el mensaje del servidor si no se pudo. */
  guardarPerfilSocial: (perfil: PerfilSocial) => Promise<void>;
  /**
   * Reduce la foto y la guarda: en el servidor, donde la ven tus grupos, o en
   * este navegador si es el modo demo. Lanza si no se pudo.
   */
  cambiarFoto: (archivo: File) => Promise<void>;
  quitarFoto: () => Promise<void>;
  /**
   * Sube la foto que esta cuenta tenía guardada solo en este navegador, de
   * antes de que el servidor guardara fotos, y la borra de aquí.
   */
  subirFotoDeEsteDispositivo: () => Promise<void>;
  /** Cambia preferencias locales de la cuenta abierta. */
  setPreferencias: (cambios: Partial<PreferenciasLocales>) => void;
  /** Olvida el estado de carga y errores al cambiar de cuenta. Las preferencias se quedan: son por cuenta. */
  reset: () => void;
}

/** Preferencias de una cuenta, con los valores por defecto si no tiene. */
export function preferenciasDe(
  preferencias: Record<string, PreferenciasLocales>,
  userId: string | undefined
): PreferenciasLocales {
  return { ...PREFERENCIAS_POR_DEFECTO, ...(userId ? preferencias[userId] : undefined) };
}

/** Lo que manda el servidor sobre la cuenta, copiado a la sesión si sigue siendo la misma. */
function aplicarALaSesion(usuario: AuthUser, remoto: AuthUser | UserProfileData): void {
  const { user, setUser } = useAuthStore.getState();
  if (!user || user.id !== usuario.id) return;
  setUser({
    ...user,
    nombre: remoto.nombre,
    email: remoto.email,
    carrera: remoto.carrera ?? null,
    ciclo: remoto.ciclo ?? null,
    bio: remoto.bio ?? null,
    intereses: remoto.intereses ?? [],
    // En demo la foto no viaja con la cuenta: se queda la que hubiera.
    ...(isApiEnabled ? { fotoActualizadaEn: remoto.fotoActualizadaEn ?? null } : {}),
  });
}

function sesionAbierta(): AuthUser {
  const usuario = useAuthStore.getState().user;
  if (!usuario) throw new Error('No hay ninguna sesión abierta.');
  return usuario;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      isLoading: false,
      isSaving: false,
      syncError: null,
      preferencias: {},

      fetchProfile: async () => {
        set({ isLoading: true, syncError: null });
        try {
          const remoto = await profileService.getProfile();
          const user = useAuthStore.getState().user;
          if (remoto && user && remoto.id === user.id) {
            aplicarALaSesion(user, remoto);
          }
          set({ isLoading: false });
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Error al cargar perfil';
          set({ syncError: msg, isLoading: false });
        }
      },

      guardarPerfil: async (datos) => {
        const usuario = useAuthStore.getState().user;
        if (!usuario) throw new Error('No hay ninguna sesión abierta.');

        const nombre = datos.nombre.trim();
        const email = normalizarEmail(datos.email);
        if (!nombre) throw new Error('El nombre no puede estar vacío.');
        if (!email) throw new Error('El correo no puede estar vacío.');

        // El servidor pide la contraseña para cambiar el correo; avisar antes
        // ahorra un viaje. Cambiar solo el nombre no la pide ni la envía.
        const cambiaCorreo = email !== normalizarEmail(usuario.email);
        if (cambiaCorreo && isApiEnabled && !datos.passwordActual) {
          throw new Error('Para cambiar el correo escribe tu contraseña actual.');
        }
        const payload = cambiaCorreo && datos.passwordActual
          ? { nombre, email, passwordActual: datos.passwordActual }
          : { nombre, email };

        set({ isSaving: true });
        try {
          const actualizado = await profileService.updateProfile(payload, usuario);
          // La sesión pudo cambiar mientras tanto (logout, otra cuenta).
          if (useAuthStore.getState().user?.id === usuario.id) {
            useAuthStore.getState().setUser({ ...usuario, nombre: actualizado.nombre, email: actualizado.email });
          }
        } finally {
          set({ isSaving: false });
        }
      },

      guardarPerfilSocial: async (perfil) => {
        const usuario = sesionAbierta();
        set({ isSaving: true });
        try {
          aplicarALaSesion(usuario, await profileService.guardarPerfilSocial(perfil, usuario));
        } finally {
          set({ isSaving: false });
        }
      },

      cambiarFoto: async (archivo) => {
        const usuario = sesionAbierta();
        const foto = await reducirFoto(archivo);
        if (!isApiEnabled) {
          get().setPreferencias({ avatarUrl: await blobADataUrl(foto) });
          return;
        }
        aplicarALaSesion(usuario, await profileService.subirFoto(foto));
      },

      quitarFoto: async () => {
        const usuario = sesionAbierta();
        if (!isApiEnabled) {
          get().setPreferencias({ avatarUrl: undefined });
          return;
        }
        aplicarALaSesion(usuario, await profileService.quitarFoto());
      },

      subirFotoDeEsteDispositivo: async () => {
        const usuario = sesionAbierta();
        const local = preferenciasDe(get().preferencias, usuario.id).avatarUrl;
        if (!local || !isApiEnabled) return;
        aplicarALaSesion(usuario, await profileService.subirFoto(dataUrlABlob(local)));
        get().setPreferencias({ avatarUrl: undefined });
      },

      setPreferencias: (cambios) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId) return;
        set((state) => ({
          preferencias: {
            ...state.preferencias,
            [userId]: { ...preferenciasDe(state.preferencias, userId), ...cambios },
          },
        }));
      },

      reset: () => set({ isLoading: false, isSaving: false, syncError: null }),
    }),
    {
      name: 'huecko-profile',
      version: 1,
      partialize: (state) => ({ preferencias: state.preferencias }),
      /* La versión 0 guardaba un único perfil con zona horaria, «compartir
         detalles» y la foto. De ahí solo se rescata lo que sigue teniendo
         efecto (foto y alertas), asignado a la cuenta abierta. */
      migrate: (persistido) => {
        const viejo = (persistido as { profile?: Record<string, unknown> } | null)?.profile;
        const userId = useAuthStore.getState().user?.id;
        if (!viejo || !userId) return { preferencias: {} };
        return {
          preferencias: {
            [userId]: {
              ...PREFERENCIAS_POR_DEFECTO,
              ...(typeof viejo.avatarUrl === 'string' ? { avatarUrl: viejo.avatarUrl } : {}),
              ...(viejo.notificacionesWebSockets === false ? { alertasRetrasos: false } : {}),
            },
          },
        };
      },
    }
  )
);

/** Preferencias locales de la cuenta abierta. */
export function usePreferenciasLocales(): PreferenciasLocales {
  const userId = useAuthStore((s) => s.user?.id);
  const propias = useProfileStore((s) => (userId ? s.preferencias[userId] : undefined));
  return { ...PREFERENCIAS_POR_DEFECTO, ...propias };
}
