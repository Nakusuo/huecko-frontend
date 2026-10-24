import { apiClient } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { dayFromIsoDate, normalizeTime } from '../lib/formatoBackend';
import type { TimeWindowProposal } from '../types/groups.types';

/**
 * Planes con Huecko IA, como en la app móvil: un borrador a partir de una frase.
 *
 * El backend manda la IA a elegir entre los huecos reales del grupo y valida lo
 * que vuelve, así que cada opción del borrador cumple el umbral del grupo y el
 * plazo cierra antes de la primera. Aquí solo se traduce al formato del
 * formulario; nada se guarda hasta que la persona envía la propuesta.
 */

export type CategoriaPlan = 'ESTUDIO' | 'REUNION' | 'COMIDA' | 'DEPORTE' | 'SALIDA' | 'OTRO';

export const NOMBRE_CATEGORIA: Record<CategoriaPlan, string> = {
  ESTUDIO: 'Estudio',
  REUNION: 'Reunión',
  COMIDA: 'Comida',
  DEPORTE: 'Deporte',
  SALIDA: 'Salida',
  OTRO: 'Otro',
};

/** Una opción tal como llega del backend (`LocalTime` puede venir con segundos). */
export interface VentanaIaDto {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  disponibilidadPorcentaje: number;
}

interface BorradorPlanDto {
  titulo: string;
  categoria: CategoriaPlan;
  lugar: string | null;
  ventanas: VentanaIaDto[];
  plazoVotacion: string;
}

export interface BorradorPlan {
  titulo: string;
  categoria: CategoriaPlan;
  lugar: string | null;
  /** De 0 a 3. Con menos de 2 hay que completar antes de enviar. */
  ventanas: TimeWindowProposal[];
  /** Instante ISO sugerido; siempre antes de la primera opción. */
  plazoVotacion: string;
}

/** La IA tarda más que una petición normal: el backend la espera hasta 30 s. */
const ESPERA_IA_MS = 45_000;

export function ventanaDesdeIa(ventana: VentanaIaDto): TimeWindowProposal {
  const horaInicio = normalizeTime(ventana.horaInicio);
  const horaFin = normalizeTime(ventana.horaFin);
  return {
    id: `ia-${ventana.fecha}-${horaInicio}-${horaFin}`,
    dia: dayFromIsoDate(ventana.fecha),
    fecha: ventana.fecha,
    horaInicio,
    horaFin,
    disponibilidadPorcentaje: ventana.disponibilidadPorcentaje,
    votosUsuarios: [],
  };
}

export async function redactarBorrador(grupoId: string, texto: string): Promise<BorradorPlan> {
  const { data } = await apiClient.post<BorradorPlanDto>(
    endpoints.ia.borradorPlan(grupoId),
    { texto },
    { timeout: ESPERA_IA_MS }
  );
  return {
    titulo: data.titulo,
    categoria: data.categoria in NOMBRE_CATEGORIA ? data.categoria : 'OTRO',
    lugar: data.lugar,
    ventanas: (data.ventanas ?? []).map(ventanaDesdeIa),
    plazoVotacion: data.plazoVotacion,
  };
}

const seSolapan = (a: TimeWindowProposal, b: TimeWindowProposal) =>
  a.fecha === b.fecha && a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;

/**
 * Las opciones de la IA y, si no llegan a `minimo`, las sugeridas que no
 * choquen con ellas. Un plan se vota entre 2 y 5 opciones, y la IA puede
 * devolver menos (o ninguna) si nada encaja con lo que se le pidió.
 */
export function completarOpciones(
  propias: TimeWindowProposal[],
  sugeridas: TimeWindowProposal[],
  minimo = 2,
  maximo = 5
): TimeWindowProposal[] {
  const opciones = propias.slice(0, maximo);
  for (const sugerida of sugeridas) {
    if (opciones.length >= minimo) break;
    if (!opciones.some((o) => seSolapan(o, sugerida))) opciones.push(sugerida);
  }
  return opciones;
}
