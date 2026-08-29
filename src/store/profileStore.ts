import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfileData {
  nombre: string;
  email: string;
  avatarUrl?: string;
  timezone: string;
  compartirDetallesHorario: boolean;
  notificacionesEmail: boolean;
  notificacionesWebSockets: boolean;
}

interface ProfileState {
  profile: UserProfileData;
  updateProfile: (updated: Partial<UserProfileData>) => void;
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
      updateProfile: (updated) =>
        set((state) => ({
          profile: { ...state.profile, ...updated },
        })),
    }),
    {
      name: 'huecko-profile',
    }
  )
);
