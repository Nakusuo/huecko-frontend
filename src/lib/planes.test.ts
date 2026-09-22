import { describe, expect, it } from 'vitest';
import type { PlanProposal, TimeWindowProposal } from '../types/groups.types';
import {
  elegirGanadora,
  estadoVisible,
  formatearPlazo,
  problemasDePropuesta,
  proximoPlanConfirmado,
  ventanaGanadora,
} from './planes';

/** Jueves 24 de septiembre de 2026, 15:00. */
const AHORA = new Date(2026, 8, 24, 15, 0);

function ventana(id: string, fecha: string, inicio: string, fin: string, votos: string[] = []): TimeWindowProposal {
  return { id, dia: 'Lun', fecha, horaInicio: inicio, horaFin: fin, disponibilidadPorcentaje: 100, votosUsuarios: votos };
}

function plan(parcial: Partial<PlanProposal>): PlanProposal {
  return {
    id: 'p',
    groupId: 'g',
    titulo: 'Plan',
    creadoPor: 'Alex',
    plazoVotacion: 'Finalizada',
    estado: 'confirmado',
    ventanasSugeridas: [],
    ...parcial,
  };
}

describe('elegirGanadora', () => {
  it('gana la más votada, no la primera de la lista', () => {
    const sab = ventana('sab', '2026-09-26', '16:00', '18:00', ['a']);
    const dom = ventana('dom', '2026-09-27', '11:00', '13:00', ['a', 'b', 'c']);
    expect(elegirGanadora([sab, dom], AHORA)?.id).toBe('dom');
  });

  it('en empate gana la más temprana, como en el backend', () => {
    const tarde = ventana('tarde', '2026-09-27', '16:00', '18:00', ['a']);
    const pronto = ventana('pronto', '2026-09-26', '10:00', '12:00', ['b']);
    expect(elegirGanadora([tarde, pronto], AHORA)?.id).toBe('pronto');
  });

  it('sin votos no gana ninguna', () => {
    expect(elegirGanadora([ventana('x', '2026-09-26', '10:00', '12:00')], AHORA)).toBeNull();
  });
});

describe('ventanaGanadora', () => {
  it('usa la que confirmó el servidor aunque no sea la primera', () => {
    const p = plan({
      ventanaConfirmadaId: 'b',
      ventanasSugeridas: [ventana('a', '2026-09-26', '10:00', '12:00'), ventana('b', '2026-09-27', '10:00', '12:00')],
    });
    expect(ventanaGanadora(p, AHORA)?.id).toBe('b');
  });
});

describe('proximoPlanConfirmado', () => {
  it('descarta los planes ya terminados y elige el más cercano', () => {
    const pasado = plan({ id: 'pasado', ventanasSugeridas: [ventana('v1', '2026-09-20', '10:00', '12:00', ['a'])] });
    const lejano = plan({ id: 'lejano', ventanasSugeridas: [ventana('v2', '2026-10-10', '10:00', '12:00', ['a'])] });
    const cercano = plan({ id: 'cercano', ventanasSugeridas: [ventana('v3', '2026-09-25', '10:00', '12:00', ['a'])] });
    expect(proximoPlanConfirmado([pasado, lejano, cercano], AHORA)?.plan.id).toBe('cercano');
  });

  it('un plan que está ocurriendo ahora todavía es el próximo', () => {
    const enCurso = plan({ ventanasSugeridas: [ventana('v', '2026-09-24', '14:00', '16:00', ['a'])] });
    expect(proximoPlanConfirmado([enCurso], AHORA)).not.toBeNull();
  });

  it('ignora propuestos, cancelados y en re-coordinación', () => {
    const v = [ventana('v', '2026-09-25', '10:00', '12:00', ['a'])];
    const otros = (['propuesto', 'cancelado', 'en_recoordinacion'] as const).map((estado) =>
      plan({ estado, ventanasSugeridas: v })
    );
    expect(proximoPlanConfirmado(otros, AHORA)).toBeNull();
  });
});

describe('estadoVisible', () => {
  it('un propuesto con el plazo vencido no se presenta como abierto', () => {
    expect(estadoVisible(plan({ estado: 'propuesto', votacionAbierta: false }))).toBe('cerrando');
    expect(estadoVisible(plan({ estado: 'propuesto', votacionAbierta: true }))).toBe('abierta');
  });

  it('un cancelado se ve como cancelado, no como votación abierta', () => {
    expect(estadoVisible(plan({ estado: 'cancelado' }))).toBe('cancelado');
  });
});

describe('problemasDePropuesta', () => {
  const plazoEn = (horas: number) => new Date(AHORA.getTime() + horas * 3_600_000).toISOString();

  it('una propuesta coherente no tiene problemas', () => {
    const ventanas = [
      { dia: 'Sáb' as const, fecha: '2026-09-26', horaInicio: '10:00', horaFin: '12:00' },
      { dia: 'Dom' as const, fecha: '2026-09-27', horaInicio: '10:00', horaFin: '12:00' },
    ];
    expect(problemasDePropuesta(ventanas, plazoEn(24), AHORA)).toEqual([]);
  });

  it('avisa de una opción de hoy que ya empezó', () => {
    const ventanas = [
      { dia: 'Jue' as const, fecha: '2026-09-24', horaInicio: '11:00', horaFin: '13:00' },
      { dia: 'Sáb' as const, fecha: '2026-09-26', horaInicio: '10:00', horaFin: '12:00' },
    ];
    expect(problemasDePropuesta(ventanas, plazoEn(1), AHORA).join()).toMatch(/ya empezó/);
  });

  it('avisa si la votación cerraría después de la primera opción', () => {
    const ventanas = [
      { dia: 'Vie' as const, fecha: '2026-09-25', horaInicio: '10:00', horaFin: '12:00' },
      { dia: 'Sáb' as const, fecha: '2026-09-26', horaInicio: '10:00', horaFin: '12:00' },
    ];
    expect(problemasDePropuesta(ventanas, plazoEn(24), AHORA).join()).toMatch(/cerraría después/);
  });

  it('avisa de opciones que se solapan el mismo día', () => {
    const ventanas = [
      { dia: 'Sáb' as const, fecha: '2026-09-26', horaInicio: '10:00', horaFin: '12:00' },
      { dia: 'Sáb' as const, fecha: '2026-09-26', horaInicio: '11:00', horaFin: '13:00' },
    ];
    expect(problemasDePropuesta(ventanas, plazoEn(1), AHORA).join()).toMatch(/se solapan/);
  });
});

describe('formatearPlazo', () => {
  it('no deja el ISO crudo', () => {
    expect(formatearPlazo('2026-09-22T18:00:00Z')).not.toContain('T18');
  });

  it('respeta los textos que no son fechas', () => {
    expect(formatearPlazo('Finalizada')).toBe('Finalizada');
  });
});
