import { beforeEach, describe, expect, it } from 'vitest';
import type { OpcionExpres } from '../types/incidents.types';
import {
  configurarSimulador,
  listarAusencias,
  listarRetrasos,
  reiniciarSimulador,
  reportarImprevisto,
  reportarRetraso,
  votacionAbierta,
  votarExpres,
  type ContextoPlanDemo,
} from './simuladorIncidencias';

/**
 * El simulador del modo demo tiene que decidir lo mismo que el backend. Cada
 * prueba es una regla de `ImprevistoService` o `RetrasoService`.
 */

let yo = { email: 'ana@huecko.com', nombre: 'Ana' };
let reloj = new Date(2026, 8, 24, 12, 0);
let cerrados: Array<[string, OpcionExpres]> = [];
let plan: ContextoPlanDemo;

const MIEMBROS = [
  { email: 'ana@huecko.com', nombre: 'Ana', isEssential: true },
  { email: 'beto@huecko.com', nombre: 'Beto', isEssential: false },
  { email: 'caro@huecko.com', nombre: 'Caro', isEssential: false },
  { email: 'dani@huecko.com', nombre: 'Dani', isEssential: false },
];

beforeEach(() => {
  yo = { email: 'ana@huecko.com', nombre: 'Ana' };
  reloj = new Date(2026, 8, 24, 12, 0);
  cerrados = [];
  plan = {
    tituloPlan: 'Repaso',
    estado: 'confirmado',
    inicio: new Date(2026, 8, 24, 20, 0),
    miembros: MIEMBROS,
  };
  configurarSimulador({
    contexto: () => plan,
    yo: () => yo,
    alCerrar: (planId, resultado) => cerrados.push([planId, resultado]),
    ahora: () => reloj,
  });
  reiniciarSimulador();
});

const como = (email: string) => {
  yo = { email, nombre: email.split('@')[0] };
};

describe('ausencias', () => {
  it('una ausencia no crítica se registra sin abrir votación', () => {
    como('beto@huecko.com');
    const res = reportarImprevisto('p', 'Examen');
    expect(res.criticidad).toBe('NO_CRITICA');
    expect(res.votacion).toBeNull();
    expect(listarAusencias('p')).toHaveLength(1);
  });

  it('no se puede avisar dos veces en el mismo plan', () => {
    como('beto@huecko.com');
    reportarImprevisto('p', '');
    expect(() => reportarImprevisto('p', '')).toThrow(/Ya avisaste/);
  });

  it('la ausencia de una persona imprescindible abre votación y no puede votarla', () => {
    const res = reportarImprevisto('p', 'Enfermedad');
    expect(res.criticidad).toBe('CRITICA');
    expect(res.votacion?.puedoVotar).toBe(false);
    expect(res.votacion?.miembrosDelGrupo).toBe(3);
    expect(() => votarExpres('p', 'CANCELAR')).toThrow(/no vota/);
  });

  it('la votación no dura más allá del inicio del plan', () => {
    plan.inicio = new Date(2026, 8, 24, 12, 20);
    const res = reportarImprevisto('p', '');
    expect(new Date(res.votacion!.expiraEn).getTime()).toBe(plan.inicio.getTime());
  });

  it('solo en planes confirmados', () => {
    plan.estado = 'propuesto';
    expect(() => reportarImprevisto('p', '')).toThrow(/confirmado/);
  });
});

describe('votación exprés', () => {
  beforeEach(() => {
    reportarImprevisto('p', 'Enfermedad');
  });

  it('cierra en cuanto vota todo el que puede, con la opción más votada', () => {
    como('beto@huecko.com');
    votarExpres('p', 'CANCELAR');
    como('caro@huecko.com');
    votarExpres('p', 'CANCELAR');
    como('dani@huecko.com');
    const final = votarExpres('p', 'MANTENER');
    expect(final.estado).toBe('CERRADA');
    expect(cerrados).toEqual([['p', 'CANCELAR']]);
  });

  it('en empate gana la opción más conservadora', () => {
    como('beto@huecko.com');
    votarExpres('p', 'CANCELAR');
    como('caro@huecko.com');
    votarExpres('p', 'REAGENDAR');
    reloj = new Date(reloj.getTime() + 2 * 3_600_000);
    expect(votacionAbierta('p')).toBeNull();
    expect(cerrados).toEqual([['p', 'REAGENDAR']]);
  });

  it('sin quórum se aplica el resultado por defecto aunque alguien votara', () => {
    como('beto@huecko.com');
    votarExpres('p', 'CANCELAR');
    reloj = new Date(reloj.getTime() + 2 * 3_600_000);
    expect(votacionAbierta('p')).toBeNull();
    expect(cerrados).toEqual([['p', 'MANTENER']]);
  });
});

describe('retrasos', () => {
  it('solo en las 24 horas previas', () => {
    plan.inicio = new Date(2026, 8, 27, 20, 0);
    expect(() => reportarRetraso('p', 10)).toThrow(/24 horas/);
  });

  it('corregir un retraso lo sustituye y lo marca', () => {
    reportarRetraso('p', 10);
    const corregido = reportarRetraso('p', 20);
    expect(corregido.corregido).toBe(true);
    expect(listarRetrasos('p')).toHaveLength(1);
  });

  it('avisar de que no vas borra tu retraso, y ya no puedes avisar otro', () => {
    como('beto@huecko.com');
    reportarRetraso('p', 10);
    reportarImprevisto('p', '');
    expect(listarRetrasos('p')).toHaveLength(0);
    expect(() => reportarRetraso('p', 10)).toThrow(/no irás/);
  });
});
