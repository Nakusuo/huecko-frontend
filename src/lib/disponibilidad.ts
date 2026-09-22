import { aMinutos } from './horario';

/**
 * Cruce de disponibilidad del grupo, en el cliente.
 *
 * Es el mismo algoritmo que `CalculadoraDisponibilidad` del backend, escrito
 * para el modo demo: sin servidor alguien tiene que calcular el heatmap, y si
 * lo hace con otras reglas la demo enseña huecos que la app conectada no
 * daría. Antes el cálculo local contaba bloques y no personas, truncaba los
 * minutos y decidía el umbral con el porcentaje redondeado.
 *
 * Con backend conectado esto NO se usa: allí manda el cruce del servidor.
 */

/** Franja que dibuja el heatmap, igual que en el backend (la última casilla es 19:00–20:00). */
export const HORA_DESDE = 8;
export const HORA_HASTA = 20;

const FIN_DEL_DIA = 24 * 60;

/** Un bloque ocupado de alguien, ya ubicado en el día que se está mirando. */
export interface BloqueDePersona {
  /** Quién está ocupado. Se compara sin distinguir mayúsculas (es un correo). */
  persona: string;
  startTime: string;
  endTime: string;
}

export interface CeldaCalculada {
  libres: number;
  total: number;
  /** Entero y hacia abajo: 6 de 11 es un 54 %, no un 55 %. */
  porcentaje: number;
  cumpleUmbral: boolean;
  /** Quiénes están ocupados en la franja, sin repetir. */
  ocupadas: string[];
}

const clave = (persona: string) => persona.trim().toLowerCase();

/**
 * ¿Pisa el bloque la franja `[hora, hora + 1)`? Se mide en minutos: un bloque
 * que acaba a las 10:30 ocupa la franja de las 10.
 *
 * Una hora de fin vacía, a medianoche o anterior al inicio se lee como «hasta
 * el final del día», que es como la interpreta el backend.
 */
export function ocupaLaFranja(bloque: Pick<BloqueDePersona, 'startTime' | 'endTime'>, hora: number): boolean {
  const inicio = bloque.startTime ? aMinutos(bloque.startTime) : 0;
  let fin = bloque.endTime ? aMinutos(bloque.endTime) : FIN_DEL_DIA;
  if (fin <= inicio) fin = FIN_DEL_DIA;

  const desde = hora * 60;
  return inicio < desde + 60 && fin > desde;
}

/**
 * Libres y ocupados de una franja de una hora.
 *
 * - Cuenta personas, no bloques: dos bloques solapados de la misma persona
 *   son una sola ausencia.
 * - Solo cuentan los bloques de quien está en `personas`.
 * - El umbral se decide con la fracción exacta (`libres·100 ≥ umbral·total`).
 * - Sin integrantes no hay hueco que ofrecer: 0 %, sin cumplir el umbral.
 */
export function calcularCelda(
  personas: readonly string[],
  bloquesDelDia: readonly BloqueDePersona[],
  hora: number,
  umbral: number,
): CeldaCalculada {
  const integrantes = new Set(personas.map(clave));
  const total = integrantes.size;

  if (total === 0) {
    return { libres: 0, total: 0, porcentaje: 0, cumpleUmbral: false, ocupadas: [] };
  }

  const ocupadas = new Set<string>();
  for (const bloque of bloquesDelDia) {
    const persona = clave(bloque.persona);
    if (integrantes.has(persona) && ocupaLaFranja(bloque, hora)) ocupadas.add(persona);
  }

  const libres = total - ocupadas.size;
  return {
    libres,
    total,
    porcentaje: Math.floor((libres * 100) / total),
    cumpleUmbral: libres * 100 >= umbral * total,
    ocupadas: [...ocupadas],
  };
}
