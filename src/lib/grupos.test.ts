import { describe, expect, it } from 'vitest';
import type { Group, GroupMember } from '../types/groups.types';
import { calcularCambios, esOrganizador, hayCambios, miembroActual, rolDe, validarCorreoNuevo } from './grupos';

const miembro = (email: string, extra: Partial<GroupMember> = {}): GroupMember => ({
  email,
  nombre: email.split('@')[0],
  isEssential: false,
  color: '#000',
  rol: 'MIEMBRO',
  ...extra,
});

const GRUPO: Group = {
  id: 'g',
  nombre: 'Proyecto',
  descripcion: 'Entregas',
  creadoPor: 'ana@x.com',
  umbralDisponibilidad: 80,
  miembros: [
    miembro('ana@x.com', { rol: 'ORGANIZADOR', userId: 'u-ana' }),
    miembro('beto@x.com', { userId: 'u-beto' }),
    miembro('caro@x.com', { userId: 'u-caro' }),
  ],
};

const borradorDe = (grupo: Group) => ({
  nombre: grupo.nombre,
  descripcion: grupo.descripcion,
  umbral: grupo.umbralDisponibilidad,
  miembros: grupo.miembros.map((m) => ({ ...m })),
});

describe('validarCorreoNuevo', () => {
  it('normaliza espacios y mayúsculas', () => {
    expect(validarCorreoNuevo('  Dani@X.com ', [])).toEqual({ correo: 'dani@x.com' });
  });

  it('rechaza un formato inválido en vez de dejarlo para el servidor', () => {
    expect(validarCorreoNuevo('dani@x', [])).toEqual({ error: 'Ese correo no tiene un formato válido.' });
  });

  it('rechaza repetidos sin distinguir mayúsculas', () => {
    expect(validarCorreoNuevo('BETO@x.com', ['beto@x.com'])).toHaveProperty('error');
  });

  it('avisa si es el correo propio', () => {
    expect(validarCorreoNuevo('Ana@x.com', [], 'ana@x.com')).toEqual({
      error: 'Ese es tu correo: ya formas parte del grupo.',
    });
  });
});

describe('roles', () => {
  it('ADMIN del demo cuenta como organizador', () => {
    expect(rolDe(GRUPO, miembro('z@x.com', { rol: 'ADMIN' }))).toBe('ORGANIZADOR');
  });

  it('sin rol, organiza quien creó el grupo', () => {
    expect(esOrganizador(GRUPO, miembro('ana@x.com', { rol: undefined }))).toBe(true);
    expect(esOrganizador(GRUPO, miembro('beto@x.com', { rol: undefined }))).toBe(false);
  });

  it('encuentra al usuario por id o, en demo, por correo', () => {
    expect(miembroActual(GRUPO, { id: 'u-beto', email: 'otro@x.com' })?.email).toBe('beto@x.com');
    expect(miembroActual(GRUPO, { email: 'CARO@x.com' })?.email).toBe('caro@x.com');
    expect(miembroActual(GRUPO, { id: 'nadie' })).toBeUndefined();
  });
});

describe('calcularCambios', () => {
  it('sin tocar nada no hay cambios', () => {
    expect(hayCambios(calcularCambios(GRUPO, borradorDe(GRUPO)))).toBe(false);
  });

  it('detecta nombre, descripción y umbral', () => {
    const cambios = calcularCambios(GRUPO, {
      ...borradorDe(GRUPO),
      nombre: ' Proyecto final ',
      descripcion: '',
      umbral: 60,
    });
    expect(cambios.datos).toEqual({ nombre: 'Proyecto final', descripcion: '', umbralDisponibilidad: 60 });
  });

  it('detecta bajas, altas, imprescindibles y roles', () => {
    const borrador = borradorDe(GRUPO);
    borrador.miembros = [
      borrador.miembros[0],
      { ...borrador.miembros[1], isEssential: true, rol: 'ORGANIZADOR' },
      miembro('dani@x.com', { isEssential: true }),
    ];

    const cambios = calcularCambios(GRUPO, borrador);
    expect(cambios.bajas.map((m) => m.email)).toEqual(['caro@x.com']);
    expect(cambios.altas.map((m) => m.email)).toEqual(['dani@x.com']);
    expect(cambios.cambios).toEqual([
      { email: 'beto@x.com', nombre: 'beto', rol: 'ORGANIZADOR', isEssential: true },
    ]);
  });

  it('los ascensos van antes que los descensos', () => {
    const grupo: Group = {
      ...GRUPO,
      miembros: [GRUPO.miembros[0], miembro('beto@x.com', { rol: 'ORGANIZADOR' }), GRUPO.miembros[2]],
    };
    const borrador = borradorDe(grupo);
    borrador.miembros[1].rol = 'MIEMBRO';
    borrador.miembros[2].rol = 'ORGANIZADOR';

    expect(calcularCambios(grupo, borrador).cambios.map((c) => c.rol)).toEqual(['ORGANIZADOR', 'MIEMBRO']);
  });
});
