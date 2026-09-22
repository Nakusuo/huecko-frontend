import { describe, expect, it, vi } from 'vitest';

/* Los motores de OCR y PDF no hacen falta para probar el análisis del texto, y
   pdfjs espera APIs del navegador que el entorno de pruebas no tiene. */
vi.mock('tesseract.js', () => ({ createWorker: vi.fn() }));
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {}, version: 'test', getDocument: vi.fn() }));

const { formatHourRange, minutesToTime, parseScheduleText } = await import('./ocrService');

describe('formatHourRange', () => {
  it('no deja rangos al revés por la heurística de la tarde', () => {
    // Antes: 6 → 18:00 y 8 → 08:00, un bloque que terminaba antes de empezar.
    expect(formatHourRange('6', undefined, undefined, '8', undefined, undefined)).toEqual(['18:00', '20:00']);
    expect(formatHourRange('5', '30', undefined, '7', undefined, undefined)).toEqual(['17:30', '19:00']);
  });

  it('mantiene los casos que ya iban bien', () => {
    expect(formatHourRange('8', undefined, undefined, '10', undefined, undefined)).toEqual(['08:00', '10:00']);
    expect(formatHourRange('11', undefined, undefined, '1', undefined, undefined)).toEqual(['11:00', '13:00']);
    expect(formatHourRange('2', undefined, undefined, '4', undefined, undefined)).toEqual(['14:00', '16:00']);
  });

  it('respeta un AM/PM explícito', () => {
    expect(formatHourRange('6', undefined, 'am', '8', undefined, 'am')).toEqual(['06:00', '08:00']);
    expect(formatHourRange('3', undefined, 'pm', '5', undefined, undefined)).toEqual(['15:00', '17:00']);
  });
});

describe('minutesToTime', () => {
  it('no da la vuelta a medianoche', () => {
    expect(minutesToTime(23 * 60 + 30 + 60)).toBe('23:59');
    expect(minutesToTime(9 * 60 + 15)).toBe('09:15');
  });
});

describe('parseScheduleText', () => {
  it('una línea con día y hora sale marcada y sin avisos', () => {
    const [fila] = parseScheduleText('Lunes 8:00-10:00 Cálculo');
    expect(fila).toMatchObject({ day: 'Lun', startTime: '08:00', endTime: '10:00', selected: true });
    expect(fila.revisar).toBeUndefined();
  });

  it('no presenta como detectado un día que el texto no dice', () => {
    const [fila] = parseScheduleText('8:00-10:00 Cálculo');
    expect(fila.selected).toBe(false);
    expect(fila.revisar).toBe('día no detectado');
    expect(fila.startTime).toBe('08:00');
  });

  it('una asignatura sin día ni hora sale desmarcada para revisar', () => {
    const filas = parseScheduleText('Algoritmos\nRedes');
    expect(filas.length).toBe(2);
    for (const fila of filas) {
      expect(fila.selected).toBe(false);
      expect(fila.revisar).toBe('día/hora no detectados');
    }
  });
});
