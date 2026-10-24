import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { insigniasConocidas } from '../lib/insignias';
import { logrosDemo } from '../lib/perfilesDemo';
import { actualizarCuentaDemo, actualizarPerfilSocialDemo, esCuentaEjemplo } from './authService';
import type { AuthUser, PerfilSocial } from '../types/auth.types';
import type { Logros, PerfilPublico, UserProfileData, UpdateProfilePayload } from '../types/profile.types';

/** El servidor manda `null` o nada en lo que no está relleno; aquí siempre hay una lista. */
function conIntereses<T extends { intereses?: string[] | null }>(datos: T): T & { intereses: string[] } {
  return { ...datos, intereses: datos.intereses ?? [] };
}

export const profileService = {
  /**
   * Obtiene el perfil del usuario autenticado. En modo demo no hay servidor:
   * devuelve `null` y manda lo que ya tiene la sesión.
   */
  async getProfile(): Promise<UserProfileData | null> {
    if (!isApiEnabled) {
      return null;
    }

    const { data } = await apiClient.get<UserProfileData>(endpoints.me);
    return conIntereses(data);
  },

  /**
   * Guarda nombre y correo. Lanza con el mensaje del servidor si no se pudo
   * (p. ej. «El correo ya está en uso»). En demo aplica la misma regla sobre
   * las cuentas guardadas en este navegador.
   */
  async updateProfile(
    payload: Required<Pick<UpdateProfilePayload, 'nombre' | 'email'>> & Pick<UpdateProfilePayload, 'passwordActual'>,
    usuarioActual: AuthUser,
  ): Promise<AuthUser> {
    if (!isApiEnabled) {
      return actualizarCuentaDemo(usuarioActual, payload);
    }

    const { data } = await apiClient.patch<UserProfileData>(endpoints.me, payload);
    return conIntereses(data);
  },

  /** Carrera, ciclo, frase e intereses: reemplaza todo lo anterior. */
  async guardarPerfilSocial(perfil: PerfilSocial, usuarioActual: AuthUser): Promise<AuthUser> {
    if (!isApiEnabled) {
      return actualizarPerfilSocialDemo(usuarioActual, perfil);
    }

    const { data } = await apiClient.put<UserProfileData>(endpoints.perfil.social, perfil);
    return conIntereses(data);
  },

  /**
   * Sube la foto, ya reducida (ver `reducirFoto`). Solo con backend: en demo
   * la foto se queda en este navegador.
   */
  async subirFoto(foto: Blob): Promise<UserProfileData> {
    const formulario = new FormData();
    formulario.append('foto', foto, 'foto.jpg');
    // Sin esta cabecera axios convierte el FormData en JSON (su cabecera por defecto).
    const { data } = await apiClient.put<UserProfileData>(endpoints.perfil.miFoto, formulario, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return conIntereses(data);
  },

  async quitarFoto(): Promise<UserProfileData> {
    const { data } = await apiClient.delete<UserProfileData>(endpoints.perfil.miFoto);
    return conIntereses(data);
  },

  async getLogros(usuarioActual: AuthUser): Promise<Logros> {
    if (!isApiEnabled) {
      return logrosDemo(esCuentaEjemplo(usuarioActual));
    }

    const { data } = await apiClient.get<Logros>(endpoints.perfil.logros);
    return { ...data, insignias: insigniasConocidas(data.insignias) };
  },

  /** La tarjeta de alguien con quien compartes un grupo. Solo con backend. */
  async getPerfilPublico(usuarioId: string): Promise<PerfilPublico> {
    const { data } = await apiClient.get<PerfilPublico>(endpoints.perfil.publico(usuarioId));
    return { ...conIntereses(data), insignias: insigniasConocidas(data.insignias) };
  },
};
