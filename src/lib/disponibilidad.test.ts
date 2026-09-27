import { describe, expect, it } from 'vitest';
import { calcularCelda, ocupaLaFranja } from './disponibilidad';

const bloque = (persona: string, startTime: string, endTime: string) => ({ persona, startTime, endTime });

describe('ocupaLaFranja', () => {
  it('mide el solape en minutos', () => {
    expect(ocupaLaFranja(bloque('a', '08:00', '10:30'), 10)).toBe(true);
    expect(ocupaLaFranja(bloque('a', '10:45', '12:00'), 10)).toBe(true);
  });

  it('tocarse no es solaparse', () => {
    expect(ocupaLaFranja(bloque('a', '08:00', '10:00'), 10)).toBe(false);
    expect(ocupaLaFranja(bloque('a', '11:00', '12:00'), 10)).toBe(false);
  });

  it('un fin a medianoche o anterior al inicio llega hasta el final del día', () => {
    expect(ocupaLaFranja(bloque('a', '18:00', '00:00'), 19)).toBe(true);
    expect(ocupaLaFranja(bloque('a', '18:00', '02:00'), 19)).toBe(true);
  });
});

describe('calcularCelda', () => {
  const grupo = ['ana@x.com', 'beto@x.com', 'caro@x.com', 'dani@x.com'];

  it('dos bloques solapados de la misma persona cuentan una vez', () => {
    const celda = calcularCelda(
      grupo,
      [bloque('ana@x.com', '09:00', '11:00'), bloque('ana@x.com', '10:00', '12:00')],
      10,
      50,
    );
    expect(celda.libres).toBe(3);
    expect(celda.ocupadas).toEqual(['ana@x.com']);
  });

  it('nunca da libres negativos', () => {
    const celda = calcularCelda(
      ['ana@x.com'],
      [bloque('ana@x.com', '09:00', '11:00'), bloque('ana@x.com', '10:00', '12:00'), bloque('ana@x.com', '10:15', '10:45')],
      10,
      50,
    );
    expect(celda.libres).toBe(0);
    expect(celda.porcentaje).toBe(0);
  });

  it('ignora los bloques de quien no está en el grupo y compara correos sin mayúsculas', () => {
    const celda = calcularCelda(
      grupo,
      [bloque('otro@x.com', '10:00', '11:00'), bloque('BETO@x.com', '10:00', '11:00')],
      10,
      50,
    );
    expect(celda.libres).toBe(3);
  });

  it('decide el umbral con la fracción exacta, no con el porcentaje redondeado', () => {
    const once = Array.from({ length: 11 }, (_, i) => `p${i}@x.com`);
    const ocupados = once.slice(0, 5).map((p) => bloque(p, '10:00', '11:00'));
    const celda = calcularCelda(once, ocupados, 10, 55);
    expect(celda.libres).toBe(6);
    expect(celda.porcentaje).toBe(54);
    expect(celda.cumpleUmbral).toBe(false);
    expect(calcularCelda(once, ocupados, 10, 54).cumpleUmbral).toBe(true);
  });

  it('sin integrantes no hay NaN ni hueco', () => {
    expect(calcularCelda([], [], 10, 50)).toEqual({
      libres: 0,
      total: 0,
      porcentaje: 0,
      cumpleUmbral: false,
      ocupadas: [],
    });
  });

  it('con todo el grupo libre cumple incluso la unanimidad', () => {
    const celda = calcularCelda(grupo, [], 10, 100);
    expect(celda).toMatchObject({ libres: 4, total: 4, porcentaje: 100, cumpleUmbral: true });
  });
});
