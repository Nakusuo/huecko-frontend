import { describe, expect, it } from 'vitest';
import { cuantasFotos, fechaDelPlan } from './album';
import { enEnvios } from './fotos';

describe('fechaDelPlan', () => {
  it('no cambia de día por leer la fecha como UTC', () => {
    expect(fechaDelPlan('2026-10-23', '18:00:00')).toMatch(/23/);
    expect(fechaDelPlan('2026-10-23', '18:00:00')).toMatch(/· 18:00$/);
  });

  it('sin fecha lo dice', () => {
    expect(fechaDelPlan(null, null)).toBe('Sin fecha');
  });
});

describe('cuantasFotos', () => {
  it('cuenta en singular y en plural', () => {
    expect([0, 1, 4].map(cuantasFotos)).toEqual(['Aún sin fotos', '1 foto', '4 fotos']);
  });
});

describe('enEnvios', () => {
  const foto = (kb: number) => ({ size: kb * 1024 });

  it('no pasa de diez fotos por envío', () => {
    expect(enEnvios(Array.from({ length: 23 }, () => foto(100))).map((e) => e.length)).toEqual([10, 10, 3]);
  });

  it('corta antes de pasar de 4,5 MB, aunque sean menos de diez', () => {
    expect(enEnvios([foto(2000), foto(2000), foto(2000)]).map((e) => e.length)).toEqual([2, 1]);
  });

  it('una sola foto grande va sola', () => {
    expect(enEnvios([foto(6000)]).map((e) => e.length)).toEqual([1]);
  });
});
