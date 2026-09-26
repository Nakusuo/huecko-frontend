import { describe, expect, it } from 'vitest';
import { esAdmin, esRutaAdmin, inicioDe } from './rol';

const usuario = { id: '1', nombre: 'Ana', email: 'ana@huecko.com', creado_en: '' };

describe('rol de sistema', () => {
  it('sin rol (sesión antigua) es una cuenta normal', () => {
    expect(esAdmin(usuario)).toBe(false);
    expect(esAdmin(null)).toBe(false);
    expect(inicioDe(usuario)).toBe('/dashboard');
  });

  it('el admin empieza en su panel', () => {
    const admin = { ...usuario, rolSistema: 'ADMIN' as const };
    expect(esAdmin(admin)).toBe(true);
    expect(inicioDe(admin)).toBe('/admin');
  });

  it('reconoce las rutas del panel', () => {
    expect(esRutaAdmin('/admin')).toBe(true);
    expect(esRutaAdmin('/admin/usuarios')).toBe(true);
    expect(esRutaAdmin('/administracion')).toBe(false);
    expect(esRutaAdmin('/dashboard')).toBe(false);
  });
});
