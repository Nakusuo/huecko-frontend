import { describe, expect, it } from 'vitest';
import { estaActiva, filtrarUsuarios } from './adminUsuarios';
import type { UsuarioAdmin } from '../types/admin.types';

const AHORA = new Date('2026-09-25T12:00:00Z');

const cuenta = (parcial: Partial<UsuarioAdmin>): UsuarioAdmin => ({
  id: parcial.email ?? 'x',
  nombre: 'X',
  email: 'x@h.com',
  rolSistema: 'USUARIO',
  creadoEn: '2026-09-01T00:00:00Z',
  suspendido: false,
  grupos: 0,
  planesPropuestos: 0,
  ultimaActividad: null,
  ...parcial,
});

const jose = cuenta({ nombre: 'José Pérez', email: 'jose@h.com', ultimaActividad: '2026-09-20T00:00:00Z' });
const lucia = cuenta({ nombre: 'Lucía', email: 'lucia@h.com', ultimaActividad: '2026-07-01T00:00:00Z' });
const sam = cuenta({ nombre: 'Sam', email: 'sam@h.com', suspendido: true, ultimaActividad: '2026-09-24T00:00:00Z' });
const todas = [jose, lucia, sam];

describe('filtro de cuentas del panel', () => {
  it('activa = actividad en los últimos 30 días', () => {
    expect(estaActiva(jose, AHORA)).toBe(true);
    expect(estaActiva(lucia, AHORA)).toBe(false);
    expect(estaActiva(cuenta({}), AHORA)).toBe(false);
  });

  it('busca por nombre o correo sin tildes ni mayúsculas', () => {
    expect(filtrarUsuarios(todas, 'JOSE', 'todas', AHORA)).toEqual([jose]);
    expect(filtrarUsuarios(todas, 'lucia@', 'todas', AHORA)).toEqual([lucia]);
    expect(filtrarUsuarios(todas, '  ', 'todas', AHORA)).toEqual(todas);
  });

  it('una suspendida solo aparece en «suspendidas», aunque tenga actividad reciente', () => {
    expect(filtrarUsuarios(todas, '', 'activas', AHORA)).toEqual([jose]);
    expect(filtrarUsuarios(todas, '', 'inactivas', AHORA)).toEqual([lucia]);
    expect(filtrarUsuarios(todas, '', 'suspendidas', AHORA)).toEqual([sam]);
  });
});
