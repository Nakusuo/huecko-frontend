import { describe, expect, it, vi } from 'vitest';
import { instalarAlmacenamientoEnMemoria } from '../test/almacenamientoEnMemoria';

/**
 * Modo demo. La variable se fija vacía en vez de confiar en que no esté: Vite
 * carga `.env.local` también en los tests, así que con la app apuntando al
 * backend estas pruebas se ejecutaban en modo conectado y comprobaban lo
 * contrario de lo que dicen. Ver `sesion.api.test.ts` para el caso con servidor.
 */
vi.stubEnv('VITE_API_URL', '');
instalarAlmacenamientoEnMemoria();
const { useAuthStore } = await import('../store/authStore');
const { useGroupsStore } = await import('../store/groupsStore');
const { vigilarSesion } = await import('./sesion');

const cuenta = (id: string) => ({ id, nombre: `Usuario ${id}`, email: `${id}@huecko.com`, creado_en: '' });

describe('vigilarSesion (demo)', () => {
  vigilarSesion();

  it('entrar con otra cuenta descarta lo guardado por la anterior', () => {
    useAuthStore.getState().login(cuenta('a'), 'token-a');
    useGroupsStore.setState({ syncError: 'de la cuenta A' });

    useAuthStore.getState().login(cuenta('b'), 'token-b');

    expect(useGroupsStore.getState().syncError).toBeNull();
  });

  it('volver a entrar con la misma cuenta no borra nada', () => {
    useAuthStore.getState().login(cuenta('c'), 'token-c');
    useGroupsStore.setState({ syncError: 'se conserva' });

    useAuthStore.getState().login(cuenta('c'), 'token-c2');

    expect(useGroupsStore.getState().syncError).toBe('se conserva');
  });

  it('en modo demo salir no borra lo que se probó en este navegador', () => {
    useAuthStore.getState().login(cuenta('c'), 'token-c');
    useGroupsStore.setState({ syncError: 'se conserva' });

    useAuthStore.getState().logout();
    useAuthStore.getState().login(cuenta('c'), 'token-c');

    expect(useGroupsStore.getState().syncError).toBe('se conserva');
  });
});
