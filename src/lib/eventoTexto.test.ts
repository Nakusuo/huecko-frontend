import { describe, expect, it } from 'vitest';
import { avisoDeEvento, formatearFechaHora, recortarHora } from './eventoTexto';
import type { RealtimeEvent, RealtimeEventType } from '../types/realtime.types';

/**
 * Las primeras pruebas del frontend.
 *
 * Se empieza por aquí porque es donde un fallo **no da error**: si el backend
 * añade un tipo de evento y esta función no lo contempla, el aviso simplemente
 * no aparece y nadie se entera.
 */

function evento(tipo: RealtimeEventType, datos: Record<string, unknown>): RealtimeEvent {
  return { tipo, grupoId: 'g-1', ocurridoEn: '2026-09-16T21:00:00Z', datos };
}

describe('formatearFechaHora', () => {
  it('no adelanta ni atrasa el día por interpretar la fecha como UTC', () => {
    // `new Date("2026-09-16")` se interpreta como UTC y en Lima (GMT-5)
    // mostraría el 15. Esta trampa ya mordió una vez.
    const texto = formatearFechaHora('2026-09-16', '16:00', '18:00');

    expect(texto).toContain('16');
    expect(texto).not.toContain('15');
  });

  it('recorta los segundos que a veces manda el backend', () => {
    expect(formatearFechaHora('2026-09-16', '16:00:00', '18:30:00')).toContain('16:00–18:30');
  });

  it('recortarHora deja hora y minutos', () => {
    expect(recortarHora('09:05:00')).toBe('09:05');
    expect(recortarHora('09:05')).toBe('09:05');
  });
});

describe('avisoDeEvento', () => {
  it('un plan confirmado dice cuándo y dónde', () => {
    const aviso = avisoDeEvento(evento('PLAN_CONFIRMADO', {
      planId: 'p-1',
      titulo: 'Repaso de Cálculo',
      lugar: 'Biblioteca',
      fecha: '2026-09-16',
      horaInicio: '16:00',
      horaFin: '18:00',
    }));

    expect(aviso?.type).toBe('confirmation');
    expect(aviso?.description).toContain('Repaso de Cálculo');
    expect(aviso?.description).toContain('Biblioteca');
  });

  it('el lugar es opcional y su ausencia no deja un hueco en la frase', () => {
    const aviso = avisoDeEvento(evento('PLAN_CONFIRMADO', {
      planId: 'p-1',
      titulo: 'Cena',
      fecha: '2026-09-16',
      horaInicio: '21:00',
      horaFin: '23:00',
    }));

    expect(aviso?.description).not.toContain('undefined');
    expect(aviso?.description).not.toContain(' en .');
  });

  it('retirar un aviso de retraso NO genera notificación', () => {
    const aviso = avisoDeEvento(evento('RETRASO_REPORTADO', {
      planId: 'p-1',
      usuarioId: 'u-1',
      retirado: true,
    }));

    expect(aviso).toBeNull();
  });

  it('un retraso dice quién y cuántos minutos', () => {
    const aviso = avisoDeEvento(evento('RETRASO_REPORTADO', {
      planId: 'p-1',
      usuarioId: 'u-1',
      nombreUsuario: 'Ana',
      minutosEstimados: 20,
      tituloPlan: 'Cena',
      retirado: false,
    }));

    expect(aviso?.type).toBe('incident');
    expect(aviso?.description).toContain('Ana');
    expect(aviso?.description).toContain('20 min');
  });

  it('una ausencia con motivo lo incluye, y sin motivo no lo finge', () => {
    const con = avisoDeEvento(evento('AUSENCIA_REPORTADA', {
      nombreUsuario: 'Bruno', tituloPlan: 'Cena', motivo: 'Me salió trabajo',
    }));
    const sin = avisoDeEvento(evento('AUSENCIA_REPORTADA', {
      nombreUsuario: 'Bruno', tituloPlan: 'Cena',
    }));

    expect(con?.description).toContain('Me salió trabajo');
    expect(sin?.description).not.toContain('undefined');
    expect(sin?.description).not.toContain(':');
  });

  it('el cierre de la votación exprés dice QUÉ se decidió, no solo que se decidió', () => {
    const mantener = avisoDeEvento(evento('VOTACION_EXPRES_CERRADA', {
      planId: 'p-1', tituloPlan: 'Cena', resultado: 'MANTENER', porDefecto: false,
    }));
    const cancelar = avisoDeEvento(evento('VOTACION_EXPRES_CERRADA', {
      planId: 'p-1', tituloPlan: 'Cena', resultado: 'CANCELAR', porDefecto: false,
    }));

    expect(mantener?.description).toContain('sigue en pie');
    expect(cancelar?.description).toContain('canceló');
  });

  it('avisa cuando el resultado salió por defecto y no de los votos (RF-18)', () => {
    const aviso = avisoDeEvento(evento('VOTACION_EXPRES_CERRADA', {
      planId: 'p-1', tituloPlan: 'Cena', resultado: 'MANTENER', porDefecto: true,
    }));

    expect(aviso?.description).toContain('nadie votó');
  });

  it('un tipo desconocido se ignora en vez de romper', () => {
    const aviso = avisoDeEvento(evento('ALGO_QUE_NO_EXISTE' as RealtimeEventType, {}));

    expect(aviso).toBeNull();
  });

  it('los seis tipos conocidos producen aviso, salvo el retraso retirado', () => {
    const tipos: RealtimeEventType[] = [
      'PLAN_CONFIRMADO',
      'PLAN_CANCELADO',
      'RETRASO_REPORTADO',
      'AUSENCIA_REPORTADA',
      'VOTACION_EXPRES_ABIERTA',
      'VOTACION_EXPRES_CERRADA',
    ];

    // Si el backend añade un tipo y no se refleja aquí, esta prueba no lo caza:
    // lo que caza es que ninguno de los conocidos deje de producir aviso.
    for (const tipo of tipos) {
      const aviso = avisoDeEvento(evento(tipo, {
        planId: 'p-1',
        titulo: 'X',
        tituloPlan: 'X',
        fecha: '2026-09-16',
        horaInicio: '10:00',
        horaFin: '12:00',
      }));
      expect(aviso, `${tipo} no produjo aviso`).not.toBeNull();
    }
  });
});
