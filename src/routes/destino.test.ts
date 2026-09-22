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
