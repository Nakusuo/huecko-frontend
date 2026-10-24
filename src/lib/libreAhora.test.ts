import { describe, expect, it } from 'vitest';
import { horaCorta, libreAhoraDemo, opcionesHasta } from './libreAhora';
import type { GroupOccupiedSlot } from '../store/groupsStore';
import type { Group } from '../types/groups.types';

/** Jueves 22 de octubre de 2026, 11:30 (hora local). */
const JUEVES = new Date(2026, 9, 22, 11, 30);
const a = (h: number, m = 0) => new Date(2026, 9, 22, h, m).toISOString();

describe('opcionesHasta', () => {
  it('empieza por lo que dice tu horario y sigue con horas redondas', () => {
    const opciones = opcionesHasta(JUEVES, a(14));

    expect(opciones.map((o) => o.texto)).toEqual([
      'Hasta las 14:00 (según tu horario)',
      '1 hora (hasta las 12:30)',
      '2 horas (hasta las 13:30)',
      '3 horas (hasta las 14:30)',
      '4 horas (hasta las 15:30)',
    ]);
  });

  it('no repite una hora ni ofrece una que ya casi pasó', () => {
    expect(opcionesHasta(JUEVES, a(12, 30)).map((o) => horaCorta(o.valor))).toEqual(['12:30', '13:30', '14:30', '15:30']);
    expect(opcionesHasta(JUEVES, a(11, 35))[0].texto).toBe('1 hora (hasta las 12:30)');
  });

  it('en clase (sin sugerencia) empieza por una hora', () => {
    expect(opcionesHasta(JUEVES, null)[0].texto).toBe('1 hora (hasta las 12:30)');
  });
});

describe('libreAhoraDemo', () => {
  const grupo: Group = {
    id: '1',
    nombre: 'Proyecto',
    descripcion: '',
    creadoPor: 'alex@h.com',
    umbralDisponibilidad: 80,
    miembros: [
      { email: 'alex@h.com', nombre: 'Alex', isEssential: true, color: '#000' },
      { email: 'maria.c@huecko.com', nombre: 'María C.', isEssential: false, color: '#000' },
      { email: 'sam@h.com', nombre: 'Sam', isEssential: false, color: '#000' },
    ],
  };
  const slot = (userEmail: string, startTime: string, endTime: string): GroupOccupiedSlot => ({
    id: `${userEmail}-${startTime}`, userEmail, userName: userEmail, userColor: '#000', day: 'Jue', startTime, endTime, title: 'Clase',
  });

  it('cuenta quién no tiene clase y solo nombra a quien «avisó»', () => {
    const estado = libreAhoraDemo({
      grupos: [grupo],
      slots: [slot('sam@h.com', '11:00', '13:00'), slot('alex@h.com', '15:00', '17:00')],
      miEmail: 'alex@h.com',
      miAviso: null,
      ahora: JUEVES,
    });

    expect(estado.grupos[0].sinClase).toBe(2);
    expect(estado.grupos[0].personas.map((p) => p.nombre)).toEqual(['María C.']);
    expect(estado.enClase).toBe(false);
    expect(estado.sugerencia).toBe(a(15));
  });

  it('un aviso propio que ya venció no cuenta', () => {
    const estado = libreAhoraDemo({
      grupos: [],
      slots: [],
      miEmail: 'alex@h.com',
      miAviso: { hasta: a(11), nota: null },
      ahora: JUEVES,
    });

    expect(estado.yo).toBeNull();
    expect(estado.sugerencia).toBe(a(22));
  });

  it('de noche no sugiere nada', () => {
    const noche = new Date(2026, 9, 22, 22, 51);
    expect(libreAhoraDemo({ grupos: [], slots: [], miEmail: 'alex@h.com', miAviso: null, ahora: noche }).sugerencia).toBeNull();
  });
});
