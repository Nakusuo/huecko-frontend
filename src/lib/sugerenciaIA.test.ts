import { describe, expect, it } from 'vitest';
import type { VotacionExpres } from '../types/incidents.types';
import { sinPuntoFinal, sugerenciaDe } from './sugerenciaIA';

const base: VotacionExpres = {
  id: 'v1',
  planId: 'p1',
  nombreReporta: 'Ana',
  motivo: 'Tengo las entradas',
  criticidad: 'CRITICA',
  razonCriticidad: 'tiene las entradas',
  origenCriticidad: 'IA',
  estado: 'ABIERTA',
  opciones: ['MANTENER', 'REAGENDAR', 'CANCELAR'],
  recuento: { MANTENER: 0, REAGENDAR: 0, CANCELAR: 0 },
  miVoto: null,
  votosEmitidos: 0,
  miembrosDelGrupo: 4,
  expiraEn: '2026-10-10T20:00:00Z',
  resultado: null,
  resultadoPorDefecto: false,
};

describe('sugerenciaDe', () => {
  it('devuelve la opción con su título y la razón', () => {
    const s = sugerenciaDe({
      ...base,
      recomendacion: 'REAGENDAR',
      razonRecomendacion: ' sin las entradas no se puede entrar ',
    });

    expect(s).toEqual({
      opcion: 'REAGENDAR',
      titulo: 'Reagendar',
      razon: 'sin las entradas no se puede entrar',
    });
  });

  it('no muestra nada si aún no llegó o el servidor no la manda', () => {
    expect(sugerenciaDe(base)).toBeNull();
    expect(sugerenciaDe({ ...base, recomendacion: null, razonRecomendacion: null })).toBeNull();
  });

  it('no muestra una sugerencia sin razón', () => {
    expect(sugerenciaDe({ ...base, recomendacion: 'MANTENER', razonRecomendacion: '  ' })).toBeNull();
  });

  it('desaparece cuando la votación cierra', () => {
    const cerrada = { ...base, estado: 'CERRADA' as const, resultado: 'MANTENER' as const };

    expect(
      sugerenciaDe({ ...cerrada, recomendacion: 'REAGENDAR', razonRecomendacion: 'lo que fuera aquí' }),
    ).toBeNull();
  });
});

describe('sinPuntoFinal', () => {
  it('quita el punto final para que «Porque {razón}.» no acabe en «..»', () => {
    expect(sinPuntoFinal('el grupo ya compró las entradas. ')).toBe('el grupo ya compró las entradas');
    expect(sinPuntoFinal('nadie más lleva coche...')).toBe('nadie más lleva coche');
    expect(sinPuntoFinal('sin punto')).toBe('sin punto');
  });

  it('la razón de la sugerencia ya llega sin punto final', () => {
    const conPunto = { ...base, recomendacion: 'MANTENER' as const, razonRecomendacion: 'faltan dos días.' };
    expect(sugerenciaDe(conPunto)?.razon).toBe('faltan dos días');
  });
});
