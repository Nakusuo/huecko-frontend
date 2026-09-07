import { describe, expect, it, vi, afterEach } from 'vitest';
import { fechaParaDia, normalizeTime, numberToDay } from './plansService';

/**
 * La traducción entre el vocabulario de la interfaz y el del backend.
 *
 * La UI razona en días de la semana («Mié») y el backend en fechas concretas.
 * Aquí es donde se pasa de uno a otro, y un error se manifiesta como una
 * propuesta rechazada con un mensaje que no explica nada.
 */

describe('numberToDay', () => {
  it('traduce el día ISO: 1 es lunes y 7 es domingo', () => {
    expect(numberToDay(1)).toBe('Lun');
    expect(numberToDay(3)).toBe('Mié');
    expect(numberToDay(7)).toBe('Dom');
  });

  it('un valor fuera de rango cae a lunes en vez de devolver undefined', () => {
    expect(numberToDay(0)).toBe('Lun');
    expect(numberToDay(8)).toBe('Lun');
    expect(numberToDay(-1)).toBe('Lun');
  });
});

describe('normalizeTime', () => {
  it('recorta los segundos del LocalTime del backend', () => {
    expect(normalizeTime('16:00:00')).toBe('16:00');
    expect(normalizeTime('16:00')).toBe('16:00');
  });
});

describe('fechaParaDia', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Fija el reloj a un lunes, para que los cálculos sean deterministas. */
  function hoyEs(iso: string) {
    const [a, m, d] = iso.split('-').map(Number);
    vi.useFakeTimers();
    vi.setSystemTime(new Date(a, m - 1, d, 9, 0, 0));
  }

  it('el lunes de la semana es el propio lunes', () => {
    hoyEs('2026-09-14'); // lunes
    expect(fechaParaDia('2026-09-14', 'Lun')).toBe('2026-09-14');
  });

  it('cuenta los días desde el lunes', () => {
    hoyEs('2026-09-14');
    expect(fechaParaDia('2026-09-14', 'Mié')).toBe('2026-09-16');
    expect(fechaParaDia('2026-09-14', 'Dom')).toBe('2026-09-20');
  });

  it('un día que ya pasó salta a la semana siguiente', () => {
    // El heatmap muestra la semana en curso; si hoy es jueves y la ventana es
    // del martes, proponerla daría una fecha pasada y el backend la rechaza.
    hoyEs('2026-09-17'); // jueves
    expect(fechaParaDia('2026-09-14', 'Mar')).toBe('2026-09-22');
  });

  it('el día de hoy NO salta: todavía queda jornada por delante', () => {
    hoyEs('2026-09-17');
    expect(fechaParaDia('2026-09-14', 'Jue')).toBe('2026-09-17');
  });

  it('rellena mes y día a dos dígitos', () => {
    hoyEs('2026-01-05');
    expect(fechaParaDia('2026-01-05', 'Lun')).toBe('2026-01-05');
  });

  it('cruza el cambio de mes sin descuadrarse', () => {
    hoyEs('2026-09-28'); // lunes
    expect(fechaParaDia('2026-09-28', 'Vie')).toBe('2026-10-02');
  });

  it('un día desconocido cae al lunes en vez de dar NaN', () => {
    hoyEs('2026-09-14');
    // @ts-expect-error se comprueba a propósito el valor que no existe
    expect(fechaParaDia('2026-09-14', 'Xxx')).toBe('2026-09-14');
  });
});
