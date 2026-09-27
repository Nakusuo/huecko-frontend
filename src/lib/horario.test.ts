import { describe, expect, it } from 'vitest';
import {
  buscarSolape,
  describirBloque,
  diaDeFecha,
  etiquetaSemana,
  fechaLocalIso,
  fechasDeSemana,
  inicioDeSemana,
  ocupaFecha,
  rangoRejilla,
  separarRepetidos,
  seSolapan,
  validarBloque,
  type BloqueUbicable,
} from './horario';

/* 2026-09-21 es lunes. Las fechas de las pruebas giran alrededor de esa semana
   para que se pueda comprobar a mano con un calendario. */

const rec = (day: BloqueUbicable['day'], startTime: string, endTime: string): BloqueUbicable => ({
  day,
  startTime,
  endTime,
  type: 'recurrente',
  frequency: 'semanal',
});

const pun = (specificDate: string, startTime: string, endTime: string, specificEndDate?: string): BloqueUbicable => ({
  day: diaDeFecha(specificDate),
  startTime,
  endTime,
  type: 'puntual',
  frequency: 'unica',
  specificDate,
  specificEndDate,
});

describe('fechas locales', () => {
  it('da la fecha del reloj local aunque en UTC ya sea mañana', () => {
    // 21 de septiembre a las 23:30 hora local: en Lima, en UTC ya es día 22.
    expect(fechaLocalIso(new Date(2026, 8, 21, 23, 30))).toBe('2026-09-21');
  });

  it('ubica el día de la semana y el lunes de la semana', () => {
    expect(diaDeFecha('2026-09-21')).toBe('Lun');
    expect(diaDeFecha('2026-09-27')).toBe('Dom');
    expect(inicioDeSemana('2026-09-27')).toBe('2026-09-21');
    expect(inicioDeSemana('2026-09-21')).toBe('2026-09-21');
  });

  it('recorre la semana cruzando de mes', () => {
    const semana = fechasDeSemana('2026-09-28');
    expect(semana[0]).toEqual({ day: 'Lun', fecha: '2026-09-28' });
    expect(semana[6]).toEqual({ day: 'Dom', fecha: '2026-10-04' });
    expect(etiquetaSemana('2026-09-28')).toBe('28 sep – 4 oct 2026');
    expect(etiquetaSemana('2026-09-21')).toBe('21 – 27 sep 2026');
  });
});

describe('ocupaFecha', () => {
  it('un recurrente ocupa su día todas las semanas', () => {
    const lunes = rec('Lun', '08:00', '10:00');
    expect(ocupaFecha(lunes, '2026-09-21')).toBe(true);
    expect(ocupaFecha(lunes, '2027-01-04')).toBe(true);
    expect(ocupaFecha(lunes, '2026-09-22')).toBe(false);
  });

  it('un puntual solo ocupa su fecha, no el mismo día de otras semanas', () => {
    const cita = pun('2026-09-23', '09:00', '10:00');
    expect(ocupaFecha(cita, '2026-09-23')).toBe(true);
    expect(ocupaFecha(cita, '2026-09-30')).toBe(false);
    expect(ocupaFecha(cita, '2026-09-16')).toBe(false);
  });

  it('un rango ocupa cada día que cubre, bordes incluidos', () => {
    const viaje = pun('2026-09-25', '08:00', '20:00', '2026-09-28');
    expect(['2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28'].every((f) => ocupaFecha(viaje, f))).toBe(true);
    expect(ocupaFecha(viaje, '2026-09-24')).toBe(false);
    expect(ocupaFecha(viaje, '2026-09-29')).toBe(false);
  });
});

describe('seSolapan', () => {
  it('recurrente contra recurrente: mismo día y horas cruzadas', () => {
    expect(seSolapan(rec('Lun', '08:00', '11:00'), rec('Lun', '10:00', '12:00'))).toBe(true);
    expect(seSolapan(rec('Lun', '08:00', '11:00'), rec('Mar', '10:00', '12:00'))).toBe(false);
  });

  it('tocarse en el borde no es solaparse', () => {
    expect(seSolapan(rec('Lun', '08:00', '10:00'), rec('Lun', '10:00', '12:00'))).toBe(false);
    expect(seSolapan(pun('2026-09-21', '08:00', '10:00'), rec('Lun', '10:00', '12:00'))).toBe(false);
  });

  it('un duplicado exacto se solapa', () => {
    expect(seSolapan(rec('Mié', '13:00', '15:30'), rec('Mié', '13:00', '15:30'))).toBe(true);
  });

  it('puntual contra puntual: solo si los rangos de fechas se cruzan', () => {
    expect(seSolapan(pun('2026-09-21', '08:00', '10:00'), pun('2026-09-28', '08:00', '10:00'))).toBe(false);
    expect(
      seSolapan(pun('2026-09-21', '08:00', '10:00', '2026-09-25'), pun('2026-09-25', '09:00', '11:00'))
    ).toBe(true);
    expect(
      seSolapan(pun('2026-09-21', '08:00', '10:00', '2026-09-24'), pun('2026-09-25', '09:00', '11:00'))
    ).toBe(false);
  });

  it('recurrente contra puntual: si algún día del rango cae en ese día de la semana', () => {
    // Del miércoles 23 al viernes 25: cubre Mié, Jue y Vie.
    const viaje = pun('2026-09-23', '09:00', '12:00', '2026-09-25');
    expect(seSolapan(viaje, rec('Jue', '10:00', '11:00'))).toBe(true);
    expect(seSolapan(rec('Jue', '10:00', '11:00'), viaje)).toBe(true);
    expect(seSolapan(viaje, rec('Lun', '10:00', '11:00'))).toBe(false);
    // Un rango de más de una semana cubre todos los días.
    expect(seSolapan(pun('2026-09-01', '09:00', '12:00', '2026-09-30'), rec('Dom', '10:00', '11:00'))).toBe(true);
  });

  it('buscarSolape ignora el bloque que se está editando', () => {
    const existentes = [{ id: 'a', ...rec('Lun', '08:00', '10:00') }];
    expect(buscarSolape(rec('Lun', '09:00', '11:00'), existentes, 'a')).toBeNull();
    expect(buscarSolape(rec('Lun', '09:00', '11:00'), existentes)?.id).toBe('a');
  });

  it('describe el choque con título, día y horas', () => {
    expect(describirBloque({ title: 'Cálculo II', ...rec('Lun', '08:00', '11:00') })).toBe(
      '«Cálculo II» (Lun 08:00–11:00)'
    );
    expect(describirBloque({ title: 'Viaje', ...pun('2026-09-23', '08:00', '20:00', '2026-09-25') })).toBe(
      '«Viaje» (23/09 al 25/09 08:00–20:00)'
    );
  });

  it('separarRepetidos descarta lo que ya está y lo repetido dentro del lote', () => {
    const existentes = [rec('Lun', '08:00', '10:00')];
    const lote = [rec('Lun', '08:00', '10:00'), rec('Mar', '08:00', '10:00'), rec('Mar', '09:00', '11:00')];
    const { aceptados, descartados } = separarRepetidos(lote, existentes);
    expect(aceptados).toEqual([lote[1]]);
    expect(descartados).toHaveLength(2);
  });
});

describe('validarBloque', () => {
  const base = { title: 'Clase', ...rec('Lun', '08:00', '10:00') };

  it('acepta un bloque correcto', () => {
    expect(validarBloque(base)).toBeNull();
  });

  it('exige un título que no sea solo espacios', () => {
    expect(validarBloque({ ...base, title: '   ' })).not.toBeNull();
  });

  it('rechaza fin igual o anterior al inicio y explica lo de medianoche', () => {
    expect(validarBloque({ ...base, startTime: '10:00', endTime: '10:00' })).not.toBeNull();
    expect(validarBloque({ ...base, startTime: '22:00', endTime: '02:00' })).toMatch(/divídelo en dos bloques/);
  });

  it('con rango activo pide fecha de fin y que no sea anterior a la de inicio', () => {
    const cita = { title: 'Viaje', ...pun('2026-09-23', '08:00', '10:00') };
    expect(validarBloque(cita)).toBeNull();
    expect(validarBloque(cita, { rangoActivo: true })).not.toBeNull();
    expect(validarBloque({ ...cita, specificEndDate: '2026-09-22' }, { rangoActivo: true })).not.toBeNull();
    expect(validarBloque({ ...cita, specificEndDate: '2026-09-23' }, { rangoActivo: true })).toBeNull();
  });
});

describe('rangoRejilla', () => {
  it('se queda en 08–20 si todo cabe', () => {
    expect(rangoRejilla([{ startTime: '09:00', endTime: '18:00' }])).toEqual({ inicio: 8, fin: 20 });
  });

  it('se amplía a horas pares para los bloques de fuera', () => {
    expect(
      rangoRejilla([
        { startTime: '06:30', endTime: '08:00' },
        { startTime: '20:00', endTime: '21:15' },
      ])
    ).toEqual({ inicio: 6, fin: 22 });
    expect(rangoRejilla([{ startTime: '07:00', endTime: '23:30' }])).toEqual({ inicio: 6, fin: 24 });
  });
});
