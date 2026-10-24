import { describe, expect, it } from 'vitest';
import { listaDeNombres, textoDeEntrada } from './muro';
import type { EntradaMuro } from '../types/muro.types';

const base: EntradaMuro = {
  tipo: 'PLAN_PROPUESTO', ocurridoEn: '2026-10-24T20:00:00Z', actor: { usuarioId: 'u-1', nombre: 'Ana Pérez', fotoActualizadaEn: null },
  planId: 'p-1', titulo: 'Pichanga', fecha: null, horaInicio: null, cantidad: null, fotoIds: null, personas: null,
};

describe('muro', () => {
  it('dice quién hizo qué, con el nombre de pila', () => {
    expect(textoDeEntrada(base).texto).toBe('Ana propuso «Pichanga»');
    expect(textoDeEntrada({ ...base, tipo: 'FOTOS_SUBIDAS', cantidad: 3 }).texto).toBe('Ana subió 3 fotos de «Pichanga»');
    expect(textoDeEntrada({ ...base, tipo: 'MIEMBRO_UNIDO' }).texto).toBe('Ana se unió al grupo');
  });

  it('la confirmación lleva la fecha del plan', () => {
    expect(textoDeEntrada({ ...base, tipo: 'PLAN_CONFIRMADO', actor: null, fecha: '2026-10-24', horaInicio: '18:00:00' }).texto)
      .toMatch(/^Se confirmó «Pichanga» para el .*24.* · 18:00$/);
  });

  it('las llegadas juntan los nombres', () => {
    const personas = ['Ana', 'Beto', 'Carla', 'Dani'].map((nombre, i) => ({ usuarioId: `u-${i}`, nombre, fotoActualizadaEn: null }));
    expect(textoDeEntrada({ ...base, tipo: 'LLEGARON', actor: null, personas: personas.slice(0, 1) }).texto).toBe('Ana llegó a «Pichanga»');
    expect(textoDeEntrada({ ...base, tipo: 'LLEGARON', actor: null, personas }).texto).toBe('Ana, Beto y 2 más llegaron a «Pichanga»');
    expect(listaDeNombres(['Ana López', 'Beto'])).toBe('Ana y Beto');
  });
});
