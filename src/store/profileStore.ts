import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { profileService } from '../services/profileService';
import type { UserProfileData } from '../types/profile.types';

export type { UserProfileData };

interface ProfileState {
  profile: UserProfileData;
  isLoading: boolean;
  syncError: string | null;
  fetchProfile: () => Promise<void>;
  updateProfile: (updated: Partial<UserProfileData>) => Promise<void>;
}

const INITIAL_PROFILE: UserProfileData = {
  nombre: 'Alex Rodríguez',
  email: 'alex.rodriguez@huecko.com',
  timezone: 'America/Lima (GMT-5)',
  compartirDetallesHorario: false,
  notificacionesEmail: true,
  notificacionesWebSockets: true,
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: INITIAL_PROFILE,
      isLoading: false,
      syncError: null,

      fetchProfile: async () => {
        set({ isLoading: true, syncError: null });
        try {
          const remote = await profileService.getProfile();
          if (remote) {
            set((state) => ({
              profile: { ...state.profile, ...remote },
              isLoading: false,
            }));
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Error al cargar perfil';
          set({ syncError: msg, isLoading: false });
        }
      },

      updateProfile: async (updated) => {
        set((state) => ({
          profile: { ...state.profile, ...updated },
        }));

        try {
          await profileService.updateProfile({
            nombre: updated.nombre,
            timezone: updated.timezone,
            compartir_detalles_horario: updated.compartirDetallesHorario,
            notificaciones_email: updated.notificacionesEmail,
            notificaciones_websockets: updated.notificacionesWebSockets,
          });
        } catch {
          // Mantener cambios locales offline
        }
      },
    }),
    {
      name: 'huecko-profile',
    }
  )
);
