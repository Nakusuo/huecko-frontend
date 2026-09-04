import { apiClient, isApiEnabled } from '../lib/apiClient';
import type { UserProfileData, UpdateProfilePayload } from '../types/profile.types';

export const profileService = {
  /**
   * Obtiene el perfil y preferencias del usuario autenticado.
   */
  async getProfile(): Promise<UserProfileData | null> {
    if (!isApiEnabled) {
      return null;
    }

    try {
      const { data } = await apiClient.get<UserProfileData>('/me');
      return data;
    } catch (error) {
      console.warn('[profileService] Error al obtener perfil:', error);
      throw error;
    }
  },

  /**
   * Actualiza los datos de perfil y preferencias del usuario.
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfileData> {
    if (!isApiEnabled) {
      throw new Error('API no habilitada.');
    }

    const { data } = await apiClient.patch<UserProfileData>('/me', payload);
    return data;
  },
};
