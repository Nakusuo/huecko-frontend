import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import AppRouter from './AppRouter';
import { useAuthStore } from '../store/authStore';
import type { AuthUser } from '../types/auth.types';

/**
 * Sin DOM, `<Navigate>` no pinta nada: una redirección se ve como una página
 * vacía. Basta para comprobar que cada rol solo ve su zona.
 *
 * En el render de servidor Zustand lee el estado INICIAL de la tienda (sin
 * sesión), no el actual: sin copiar la sesión ahí, toda ruta privada saldría
 * vacía y las pruebas de «no ve» pasarían por casualidad. Por eso existe la
 * prueba de control con la cuenta normal.
 */
const inicial = useAuthStore.getInitialState();
const sinSesion = { ...inicial };

const pintar = (ruta: string) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[ruta]}>
      <AppRouter />
    </MemoryRouter>,
  );

const entrarComo = (rolSistema: AuthUser['rolSistema']) => {
  useAuthStore.getState().login({ id: 'x', nombre: 'Ana Pérez', email: 'ana@huecko.com', creado_en: '', rolSistema }, 't');
  Object.assign(inicial, useAuthStore.getState());
};

describe('zona de administración', () => {
  afterEach(() => {
    useAuthStore.getState().logout();
    Object.assign(inicial, sinSesion);
  });

  it('el admin ve su panel con su propia navegación', () => {
    entrarComo('ADMIN');
    const html = pintar('/admin');
    expect(html).toContain('Navegación de administración');
    expect(html).toContain('Resumen');
    expect(html).not.toContain('Mis grupos');
  });

  it('las subpáginas del panel existen', () => {
    entrarComo('ADMIN');
    expect(pintar('/admin/usuarios')).toContain('Cuentas registradas');
    expect(pintar('/admin/grupos')).toContain('Grupos de la plataforma');
  });

  it('una cuenta normal no ve el panel', () => {
    entrarComo('USUARIO');
    expect(pintar('/admin')).not.toContain('Navegación de administración');
  });

  it('una sesión antigua sin rol cuenta como normal', () => {
    entrarComo(undefined);
    expect(pintar('/admin')).not.toContain('Navegación de administración');
  });

  it('el admin no entra a la zona de usuario', () => {
    entrarComo('ADMIN');
    expect(pintar('/groups')).toBe('');
    expect(pintar('/dashboard')).toBe('');
  });

  it('la cuenta normal sí ve su zona (control de la prueba anterior)', () => {
    entrarComo('USUARIO');
    expect(pintar('/groups')).toContain('Mis grupos');
  });

  it('sin sesión no se ve el panel', () => {
    expect(pintar('/admin')).toBe('');
  });
});
