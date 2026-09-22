import { beforeEach, describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/** Modo demo: guardar el perfil actualiza la sesión y la cuenta demo. */
vi.stubEnv('VITE_API_URL', '');
instalarAlmacenamientoEnMemoria();
const { useAuthStore } = await import('./authStore');
const { useProfileStore, preferenciasDe } = await import('./profileStore');
const { leerCuentasDemo, DEMO_CREDENTIALS } = await import('../services/authService');

const cuenta = { id: 'u-1', nombre: 'Lucía', email: 'lucia@correo.com', creado_en: '' };

describe('authStore.setUser', () => {
  it('cambia los datos de la cuenta sin tocar la sesión', () => {
    useAuthStore.getState().login(cuenta, 'tok');
    useAuthStore.getState().setUser({ ...cuenta, nombre: 'Lucía P.' });
    const s = useAuthStore.getState();
    expect(s.user?.nombre).toBe('Lucía P.');
    expect(s.token).toBe('tok');
    expect(s.isAuthenticated).toBe(true);
  });

  it('sin sesión no resucita un usuario', () => {
    useAuthStore.getState().logout();
    useAuthStore.getState().setUser(cuenta);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('expirar la sesión la cierra y lo recuerda hasta volver a entrar', () => {
    useAuthStore.getState().login(cuenta, 'tok');
    useAuthStore.getState().expirarSesion();
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: false, token: null, sesionExpirada: true });
    useAuthStore.getState().login(cuenta, 'tok2');
    expect(useAuthStore.getState().sesionExpirada).toBe(false);
  });
});

describe('profileStore.guardarPerfil (demo)', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().login(cuenta, 'tok');
  });

  it('guarda nombre y correo, y la sesión (Navbar, saludo) refleja el cambio', async () => {
    await useProfileStore.getState().guardarPerfil({ nombre: '  Lucía Pérez ', email: ' LuciaP@Correo.com ' });
    expect(useAuthStore.getState().user).toMatchObject({ id: 'u-1', nombre: 'Lucía Pérez', email: 'luciap@correo.com' });
    expect(leerCuentasDemo().find((c) => c.id === 'u-1')?.email).toBe('luciap@correo.com');
    expect(useProfileStore.getState().isSaving).toBe(false);
  });

  it('si el correo está en uso lanza el error y no cambia nada', async () => {
    await expect(
      useProfileStore.getState().guardarPerfil({ nombre: 'Lucía', email: DEMO_CREDENTIALS.email })
    ).rejects.toThrow('El correo ya está en uso');
    expect(useAuthStore.getState().user?.email).toBe('lucia@correo.com');
    expect(useProfileStore.getState().isSaving).toBe(false);
  });

  it('un nombre de solo espacios no se envía', async () => {
    await expect(useProfileStore.getState().guardarPerfil({ nombre: '   ', email: 'a@b.com' })).rejects.toThrow('nombre');
  });
});

describe('preferencias locales', () => {
  it('son por cuenta y sobreviven al cerrar sesión', () => {
    useAuthStore.getState().login(cuenta, 'tok');
    useProfileStore.getState().setPreferencias({ alertasRetrasos: false, avatarUrl: 'data:image/jpeg;base64,xx' });

    useAuthStore.getState().logout();
    useProfileStore.getState().reset();
    useAuthStore.getState().login({ ...cuenta, id: 'u-2' }, 'tok');
    expect(preferenciasDe(useProfileStore.getState().preferencias, 'u-2')).toEqual({ alertasRetrasos: true });

    expect(preferenciasDe(useProfileStore.getState().preferencias, 'u-1')).toEqual({
      alertasRetrasos: false,
      avatarUrl: 'data:image/jpeg;base64,xx',
    });
  });
});
