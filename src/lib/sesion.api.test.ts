import { describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/** Con backend: salir vacía los datos de la cuenta. */
vi.stubEnv('VITE_API_URL', '/api');
instalarAlmacenamientoEnMemoria();
const { useAuthStore } = await import('../store/authStore');
const { useGroupsStore } = await import('../store/groupsStore');
const { useNotificationStore } = await import('../store/notificationStore');
const { useIncidentsStore } = await import('../store/incidentsStore');
const { vigilarSesion } = await import('./sesion');

const cuenta = { id: 'a', nombre: 'Usuario A', email: 'a@huecko.com', creado_en: '' };

describe('vigilarSesion (con backend)', () => {
  vigilarSesion();

  it('al cerrar sesión no quedan grupos, avisos ni errores de la cuenta', () => {
    useAuthStore.getState().login(cuenta, 'token-a');
    useGroupsStore.setState({
      groups: [{ id: 'g', nombre: 'De A', descripcion: '', creadoPor: 'a', umbralDisponibilidad: 80, miembros: [] }],
      syncError: 'de la cuenta A',
    });
    useNotificationStore.getState().addNotification({ title: 'x', description: 'y', type: 'system' });
    useIncidentsStore.setState({ error: 'de la cuenta A' });

    useAuthStore.getState().logout();

    expect(useGroupsStore.getState().groups).toEqual([]);
    expect(useGroupsStore.getState().syncError).toBeNull();
    expect(useNotificationStore.getState().notifications).toEqual([]);
    expect(useIncidentsStore.getState().error).toBeNull();
    expect(localStorage.getItem('huecko-sesion-dueno')).toBeNull();
  });
});
