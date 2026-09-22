import { describe, expect, it } from 'vitest';
import type { TimeSlot } from '../types/schedule.types';
import {
  bloquesDemoDeLaSemana,
  cruceLocal,
  horasCoincidentesRestantes,
  mejorVentanaFutura,
  type CruceSemanal,
} from './huecosSemana';

/** Semana del lunes 21 de septiembre de 2026. «Ahora» es el miércoles 23 a las 12:00. */
const LUNES = '2026-09-21';
const AHORA = new Date(2026, 8, 23, 12, 0);

const cumple = { freeCount: 3, freePercentage: 100, meetsThreshold: true };
const noCumple = { freeCount: 1, freePercentage: 33, meetsThreshold: false };

function cruce(cells: CruceSemanal['cells'], windows: CruceSemanal['windows'] = []): CruceSemanal {
  return { weekFrom: LUNES, cells, windows };
}

describe('horasCoincidentesRestantes', () => {
  it('cuenta solo las casillas que cumplen el umbral y aún no han empezado', () => {
    const c = cruce({
      'Lun-10': cumple, // lunes: ya pasó
      'Mié-11': cumple, // hoy, antes de las 12: ya empezó
      'Mié-12': cumple, // hoy, empieza ahora: cuenta
      'Mié-13': noCumple,
      'Vie-18': cumple,
    });
    expect(horasCoincidentesRestantes([c], AHORA)).toBe(2);
  });

  it('la misma hora libre en dos grupos cuenta una sola vez', () => {
    const a = cruce({ 'Jue-16': cumple, 'Jue-17': cumple });
    const b = cruce({ 'Jue-17': cumple, 'Sáb-10': cumple });
    expect(horasCoincidentesRestantes([a, b], AHORA)).toBe(3);
  });

  it('sin cruces no hay horas', () => {
    expect(horasCoincidentesRestantes([], AHORA)).toBe(0);
  });
});

describe('mejorVentanaFutura', () => {
  const ventana = (id: string, dia: 'Lun' | 'Jue' | 'Vie', inicio: string, fin: string, porcentaje: number) => ({
    id, dia, horaInicio: inicio, horaFin: fin, disponibilidadPorcentaje: porcentaje, votosUsuarios: [],
  });

  it('descarta las pasadas y elige la de más disponibilidad', () => {
    const c = cruce({}, [
      ventana('pasada', 'Lun', '10:00', '12:00', 100),
      ventana('jue', 'Jue', '16:00', '18:00', 80),
      ventana('vie', 'Vie', '10:00', '12:00', 90),
    ]);
    const mejor = mejorVentanaFutura(c, AHORA);
    expect(mejor?.id).toBe('vie');
    expect(mejor?.fecha).toBe('2026-09-25');
  });

  it('a igualdad de disponibilidad gana la más temprana', () => {
    const c = cruce({}, [
      ventana('vie', 'Vie', '10:00', '12:00', 90),
      ventana('jue', 'Jue', '16:00', '18:00', 90),
    ]);
    expect(mejorVentanaFutura(c, AHORA)?.id).toBe('jue');
  });

  it('sin ventanas futuras devuelve null', () => {
    expect(mejorVentanaFutura(cruce({}, [ventana('pasada', 'Lun', '10:00', '12:00', 100)]), AHORA)).toBeNull();
  });
});

describe('cruceLocal', () => {
  it('marca las casillas por el umbral del grupo y agrupa las horas seguidas en ventanas', () => {
    const bloques = new Map([
      ['Lun' as const, [{ persona: 'b@x.com', startTime: '08:00', endTime: '10:30' }]],
    ]);
    const c = cruceLocal(['a@x.com', 'b@x.com'], bloques, 100, LUNES);

    expect(c.cells['Lun-9'].meetsThreshold).toBe(false);
    expect(c.cells['Lun-10'].meetsThreshold).toBe(false); // acaba a las 10:30: ocupa la franja
    expect(c.cells['Lun-11']).toEqual({ freeCount: 2, freePercentage: 100, meetsThreshold: true });

    const lunes = c.windows.filter((w) => w.dia === 'Lun');
    expect(lunes).toHaveLength(1);
    expect(lunes[0]).toMatchObject({ horaInicio: '11:00', horaFin: '20:00', disponibilidadPorcentaje: 100 });
  });

  it('con un umbral más bajo la misma casilla sí cumple', () => {
    const bloques = new Map([['Mar' as const, [{ persona: 'b@x.com', startTime: '14:00', endTime: '15:00' }]]]);
    const c = cruceLocal(['a@x.com', 'b@x.com'], bloques, 50, LUNES);
    expect(c.cells['Mar-14']).toEqual({ freeCount: 1, freePercentage: 50, meetsThreshold: true });
  });
});

describe('bloquesDemoDeLaSemana', () => {
  const slot = (parcial: Partial<TimeSlot>): TimeSlot => ({
    id: 's', title: 'Clase', day: 'Lun', startTime: '08:00', endTime: '10:00',
    tag: 'Clase', type: 'recurrente', frequency: 'semanal', ...parcial,
  } as TimeSlot);

  it('toma lo mío de «Mi horario» y no de los datos de ejemplo', () => {
    const porDia = bloquesDemoDeLaSemana(
      [
        { userEmail: 'yo@x.com', day: 'Lun', startTime: '12:00', endTime: '13:00' },
        { userEmail: 'otra@x.com', day: 'Lun', startTime: '09:00', endTime: '10:00' },
      ],
      [slot({ day: 'Lun', startTime: '15:00', endTime: '16:00' })],
      'yo@x.com',
      LUNES,
    );
    expect(porDia.get('Lun')).toEqual([
      { persona: 'otra@x.com', startTime: '09:00', endTime: '10:00' },
      { persona: 'yo@x.com', startTime: '15:00', endTime: '16:00' },
    ]);
  });

  it('un borrador de OCR sin revisar no bloquea', () => {
    const porDia = bloquesDemoDeLaSemana([], [slot({ isOcrImported: true, confirmado: false })], 'yo@x.com', LUNES);
    expect(porDia.get('Lun')).toBeUndefined();
  });
});
