import { describe, expect, it } from 'vitest';
import { esFechaValida, tiempoRelativo } from './tiempoRelativo';

const ahora = new Date(2026, 8, 21, 18, 0, 0); // 21 sept 2026, 18:00 local
const hace = (ms: number) => new Date(ahora.getTime() - ms).toISOString();
const MIN = 60_000;

describe('tiempoRelativo', () => {
  it('menos de un minuto es «Ahora mismo»', () => {
    expect(tiempoRelativo(hace(20_000), ahora)).toBe('Ahora mismo');
  });

  it('un reloj adelantado no da tiempos negativos', () => {
    expect(tiempoRelativo(hace(-5 * MIN), ahora)).toBe('Ahora mismo');
  });

  it('minutos y horas del mismo día', () => {
    expect(tiempoRelativo(hace(5 * MIN), ahora)).toBe('Hace 5 min');
    expect(tiempoRelativo(hace(59 * MIN), ahora)).toBe('Hace 59 min');
    expect(tiempoRelativo(hace(3 * 60 * MIN), ahora)).toBe('Hace 3 h');
  });

  it('el día de calendario anterior es «Ayer», aunque sean pocas horas', () => {
    const anoche = new Date(2026, 8, 20, 23, 0).toISOString();
    expect(tiempoRelativo(anoche, new Date(2026, 8, 21, 1, 30))).toBe('Ayer');
  });

  it('días de la última semana y fecha a partir de ahí', () => {
    expect(tiempoRelativo(new Date(2026, 8, 18, 12).toISOString(), ahora)).toBe('Hace 3 días');
    expect(tiempoRelativo(new Date(2026, 8, 3, 12).toISOString(), ahora)).toBe('3 sept');
    expect(tiempoRelativo(new Date(2025, 11, 24, 12).toISOString(), ahora)).toBe('24 dic 2025');
  });

  it('lo guardado no se queda en «Ahora mismo» con el paso del tiempo', () => {
    const creado = ahora.toISOString();
    expect(tiempoRelativo(creado, ahora)).toBe('Ahora mismo');
    expect(tiempoRelativo(creado, new Date(ahora.getTime() + 2 * 24 * 60 * MIN))).toBe('Hace 2 días');
  });

  it('un texto que no es fecha no rompe', () => {
    expect(tiempoRelativo('Ahora mismo', ahora)).toBe('');
  });
});

describe('esFechaValida', () => {
  it('distingue ISO de los textos antiguos', () => {
    expect(esFechaValida('2026-09-21T10:00:00.000Z')).toBe(true);
    expect(esFechaValida('Hace 10 min')).toBe(false);
    expect(esFechaValida(undefined)).toBe(false);
  });
});
