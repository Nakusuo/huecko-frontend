import { describe, expect, it } from 'vitest';
import { agregarInteres, MAX_INTERESES, perfilParaGuardar } from './perfilSocial';
import { insigniasConocidas, insigniasDe } from './insignias';

describe('agregarInteres', () => {
  it('limpia los espacios y lo añade al final', () => {
    expect(agregarInteres(['Café'], '  Fútbol   sala ')).toEqual({ lista: ['Café', 'Fútbol sala'] });
  });

  it('no repite un interés aunque cambien las mayúsculas', () => {
    expect(agregarInteres(['Fútbol'], 'fútbol')).toEqual({ error: 'Ya lo tienes en la lista.' });
  });

  it('rechaza comas, vacíos y textos largos, como el backend', () => {
    expect(agregarInteres([], 'café, té')).toHaveProperty('error');
    expect(agregarInteres([], '   ')).toHaveProperty('error');
    expect(agregarInteres([], 'x'.repeat(25))).toHaveProperty('error');
    expect(agregarInteres([], 'C++')).toEqual({ lista: ['C++'] });
  });

  it(`no pasa de ${MAX_INTERESES}`, () => {
    const llena = Array.from({ length: MAX_INTERESES }, (_, i) => `Tema ${i}`);
    expect(agregarInteres(llena, 'Uno más')).toHaveProperty('error');
  });
});

describe('perfilParaGuardar', () => {
  it('manda los textos vacíos como null', () => {
    expect(perfilParaGuardar({ carrera: '  ', ciclo: null, bio: ' Hola  mundo ', intereses: [] })).toEqual({
      carrera: null,
      ciclo: null,
      bio: 'Hola mundo',
      intereses: [],
    });
  });
});

describe('insignias', () => {
  it('siguen las mismas reglas que el backend', () => {
    expect(insigniasDe(0, 0, 0)).toEqual([]);
    expect(insigniasDe(3, 3, 0)).toEqual(['PRIMER_PLAN', 'PUNTUAL']);
    expect(insigniasDe(3, 2, 0)).toEqual(['PRIMER_PLAN']);
    expect(insigniasDe(10, 9, 3)).toEqual(['PRIMER_PLAN', 'HABITUAL', 'PUNTUAL', 'ORGANIZA']);
  });

  it('ignoran códigos que este frontend aún no conoce', () => {
    expect(insigniasConocidas(['ORGANIZA', 'NUEVA', 'PRIMER_PLAN'])).toEqual(['PRIMER_PLAN', 'ORGANIZA']);
  });
});
