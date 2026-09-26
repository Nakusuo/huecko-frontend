import { describe, expect, it } from 'vitest';
import { filtrarGrupos, grupoActivo } from './adminGrupos';
import type { GrupoAdmin } from '../types/admin.types';

const AHORA = new Date('2026-09-25T12:00:00Z');

const grupo = (parcial: Partial<GrupoAdmin>): GrupoAdmin => ({
  id: parcial.nombre ?? 'g',
  nombre: 'G',
  creadoEn: null,
  organizadores: [],
  miembros: 2,
  umbralDisponibilidad: 80,
  planes: 0,
  planesPorEstado: { PROPUESTO: 0, CONFIRMADO: 0, CANCELADO: 0, EN_RECOORDINACION: 0 },
  imprevistos: 0,
  ultimaActividad: null,
  ...parcial,
});

const futbol = grupo({ nombre: 'Fútbol', organizadores: ['Ana'], planes: 3, ultimaActividad: '2026-09-20T00:00:00Z' });
const tesis = grupo({ nombre: 'Tesis', organizadores: ['Beto'], planes: 1, ultimaActividad: '2026-06-01T00:00:00Z' });
const nuevo = grupo({ nombre: 'Nuevo', organizadores: ['Ana'] });

describe('filtro de grupos del panel', () => {
  it('activo = algo pasó en 30 días', () => {
    expect(grupoActivo(futbol, AHORA)).toBe(true);
    expect(grupoActivo(tesis, AHORA)).toBe(false);
    expect(grupoActivo(nuevo, AHORA)).toBe(false);
  });

  it('busca por grupo u organizador, sin tildes', () => {
    expect(filtrarGrupos([futbol, tesis, nuevo], 'futbol', 'todos', AHORA)).toEqual([futbol]);
    expect(filtrarGrupos([futbol, tesis, nuevo], 'ana', 'todos', AHORA)).toEqual([futbol, nuevo]);
  });

  it('filtra activos, dormidos y sin planes', () => {
    const todos = [futbol, tesis, nuevo];
    expect(filtrarGrupos(todos, '', 'activos', AHORA)).toEqual([futbol]);
    expect(filtrarGrupos(todos, '', 'dormidos', AHORA)).toEqual([tesis, nuevo]);
    expect(filtrarGrupos(todos, '', 'sinPlanes', AHORA)).toEqual([nuevo]);
  });
});
