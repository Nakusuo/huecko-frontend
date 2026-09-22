import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../types/auth.types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  /**
   * `true` cuando la sesión se cerró sola porque el servidor respondió 401.
   * El login lo usa para explicar por qué se ha vuelto a la pantalla de acceso;
   * se apaga al entrar de nuevo.
   */
  sesionExpirada: boolean;
  login: (user: AuthUser, token: string) => void;
  /**
   * Cambia los datos de la cuenta sin tocar la sesión. Lo usa el perfil tras
   * guardar, para que la barra de navegación y los saludos muestren ya el
   * nombre nuevo.
   */
  setUser: (user: AuthUser) => void;
  logout: () => void;
  /** Cierra la sesión porque el token ya no vale (401). */
  expirarSesion: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      sesionExpirada: false,

      login: (user, token) =>
        set({ user, token, isAuthenticated: true, sesionExpirada: false }),

      setUser: (user) =>
        set((state) => (state.isAuthenticated ? { user } : {})),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false, sesionExpirada: false }),

      expirarSesion: () =>
        set({ user: null, token: null, isAuthenticated: false, sesionExpirada: true }),
    }),
    {
      name: 'huecko-auth', // clave en localStorage
      /* `sesionExpirada` no se guarda: recargar la página de acceso ya no
         necesita la explicación. */
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
