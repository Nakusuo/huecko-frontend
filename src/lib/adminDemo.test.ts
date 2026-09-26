import { describe, expect, it } from 'vitest';
import { resumenDemo } from './adminDemo';

describe('resumen de ejemplo del modo demo', () => {
  it('termina en la semana actual, empezando en lunes', () => {
    // Jueves 24 de septiembre de 2026.
    const { semanas } = resumenDemo(new Date(2026, 8, 24, 12));
    expect(semanas).toHaveLength(8);
    expect(semanas.at(-1)?.inicio).toBe('2026-09-21');
    expect(semanas[0].inicio).toBe('2026-08-03');
  });

  it('un domingo pertenece a la semana que empezó el lunes anterior', () => {
    expect(resumenDemo(new Date(2026, 8, 27, 12)).semanas.at(-1)?.inicio).toBe('2026-09-21');
  });

  it('las cifras son coherentes entre sí', () => {
    const r = resumenDemo();
    const suma = Object.values(r.planes.porEstado).reduce((a, b) => a + b, 0);
    expect(suma).toBe(r.planes.total);
    expect(r.usuarios.activos30d).toBeLessThanOrEqual(r.usuarios.total);
  });
});
