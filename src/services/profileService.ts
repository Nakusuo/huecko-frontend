import { apiClient, isApiEnabled } from '../lib/apiClient';
import { actualizarCuentaDemo } from './authService';
import type { AuthUser } from '../types/auth.types';
import type { UserProfileData, UpdateProfilePayload } from '../types/profile.types';

export const profileService = {
  /**
   * Obtiene el perfil del usuario autenticado. En modo demo no hay servidor:
   * devuelve `null` y manda lo que ya tiene la sesión.
   */
  async getProfile(): Promise<UserProfileData | null> {
    if (!isApiEnabled) {
      return null;
    }

    const { data } = await apiClient.get<UserProfileData>('/me');
    return data;
  },

  /**
   * Guarda nombre y correo. Lanza con el mensaje del servidor si no se pudo
   * (p. ej. «El correo ya está en uso»). En demo aplica la misma regla sobre
   * las cuentas guardadas en este navegador.
   */
  async updateProfile(payload: Required<UpdateProfilePayload>, usuarioActual: AuthUser): Promise<AuthUser> {
    if (!isApiEnabled) {
      return actualizarCuentaDemo(usuarioActual, payload);
    }

    const { data } = await apiClient.patch<UserProfileData>('/me', payload);
    return data;
  },
};
