import { describe, expect, it } from 'vitest';
import { destinoTrasLogin } from './destino';

describe('destinoTrasLogin', () => {
  it('vuelve a la página que se pedía, con su query', () => {
    expect(destinoTrasLogin({ from: { pathname: '/groups/42', search: '?tab=planes', hash: '' } })).toBe(
      '/groups/42?tab=planes'
    );
  });

  it('sin origen, al dashboard', () => {
    expect(destinoTrasLogin(null)).toBe('/dashboard');
    expect(destinoTrasLogin({})).toBe('/dashboard');
  });

  it('nunca a otra pantalla de acceso ni fuera de la app', () => {
    expect(destinoTrasLogin({ from: { pathname: '/login' } })).toBe('/dashboard');
    expect(destinoTrasLogin({ from: { pathname: '/register' } })).toBe('/dashboard');
    expect(destinoTrasLogin({ from: { pathname: '//evil.example' } })).toBe('/dashboard');
    expect(destinoTrasLogin({ from: { pathname: 'https://evil.example' } })).toBe('/dashboard');
  });
});

describe('destinoTrasLogin según el rol', () => {
  it('el admin va a su panel, no al dashboard', () => {
    expect(destinoTrasLogin(null, true)).toBe('/admin');
  });

  it('el admin vuelve a la página del panel que pedía', () => {
    expect(destinoTrasLogin({ from: { pathname: '/admin/usuarios', search: '?q=ana' } }, true)).toBe(
      '/admin/usuarios?q=ana'
    );
  });

  it('cada rol se queda en su zona', () => {
    expect(destinoTrasLogin({ from: { pathname: '/groups/42' } }, true)).toBe('/admin');
    expect(destinoTrasLogin({ from: { pathname: '/admin' } })).toBe('/dashboard');
    expect(destinoTrasLogin({ from: { pathname: '/admin/grupos' } })).toBe('/dashboard');
  });

  it('una ruta que solo empieza igual no es del panel', () => {
    expect(destinoTrasLogin({ from: { pathname: '/administracion' } }, true)).toBe('/admin');
  });
});
