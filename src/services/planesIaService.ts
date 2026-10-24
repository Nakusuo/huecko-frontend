import { apiClient, ApiError } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { dayFromIsoDate, normalizeTime } from '../lib/formatoBackend';
import type { TimeWindowProposal } from '../types/groups.types';

/**
 * Planes con Huecko IA, como en la app móvil: un borrador a partir de una frase,
 * ideas de plan para los huecos del grupo y un resumen de cómo va la votación.
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

/** Icono de Material Symbols para cada categoría. */
export const ICONO_CATEGORIA: Record<CategoriaPlan, string> = {
  ESTUDIO: 'menu_book',
  REUNION: 'groups',
  COMIDA: 'restaurant',
  DEPORTE: 'sports_soccer',
  SALIDA: 'celebration',
  OTRO: 'lightbulb',
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

/**
 * Qué decir si la IA falla. El 503 o el 429 del backend ya traen un mensaje
 * pensado para la persona; un corte de red o de tiempo, no (el de apiClient
 * habla de URLs y de levantar el backend).
 */
export function mensajeDeFalloIA(fallo: unknown): string {
  return fallo instanceof ApiError && !fallo.isNetworkError && fallo.message
    ? fallo.message
    : 'Huecko IA no respondió a tiempo. Inténtalo de nuevo.';
}

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
    categoria: categoriaConocida(data.categoria),
    lugar: data.lugar,
    ventanas: (data.ventanas ?? []).map(ventanaDesdeIa),
    plazoVotacion: data.plazoVotacion,
  };
}

interface IdeaPlanDto {
  titulo: string;
  categoria: CategoriaPlan;
  lugar: string | null;
  ventana: VentanaIaDto | null;
  razon: string;
}

export interface IdeaPlan {
  titulo: string;
  categoria: CategoriaPlan;
  lugar: string | null;
  /** Las dos primeras horas de un hueco real del grupo, o `null` si la IA no eligió ninguno. */
  ventana: TimeWindowProposal | null;
  razon: string;
}

const categoriaConocida = (categoria: string): CategoriaPlan =>
  categoria in NOMBRE_CATEGORIA ? (categoria as CategoriaPlan) : 'OTRO';

export async function pedirIdeas(grupoId: string): Promise<IdeaPlan[]> {
  const { data } = await apiClient.post<{ ideas?: IdeaPlanDto[] }>(endpoints.ia.ideasPlan(grupoId), undefined, {
    timeout: ESPERA_IA_MS,
  });
  return (data.ideas ?? []).map((idea) => ({
    titulo: idea.titulo,
    categoria: categoriaConocida(idea.categoria),
    lugar: idea.lugar,
    ventana: idea.ventana ? ventanaDesdeIa(idea.ventana) : null,
    razon: idea.razon,
  }));
}

/** Lo que puede hacer quien organiza; el backend solo deja pasar las que admite el estado del plan. */
export type RecomendacionPlan = 'CERRAR' | 'ESPERAR' | 'MANTENER' | 'REPROGRAMAR';

export const TEXTO_RECOMENDACION: Record<RecomendacionPlan, string> = {
  CERRAR: 'Cerrar ya la votación',
  ESPERAR: 'Esperar más votos',
  MANTENER: 'Mantener el plan',
  REPROGRAMAR: 'Buscar otra fecha',
};

export interface ResumenVotacion {
  resumen: string;
  /** `null` si la IA sugirió algo que el plan no admite: se enseña el resumen solo. */
  recomendacion: RecomendacionPlan | null;
  razon: string | null;
}

export async function resumirVotacion(planId: string): Promise<ResumenVotacion> {
  const { data } = await apiClient.post<ResumenVotacion>(endpoints.ia.resumenVotacion(planId), undefined, {
    timeout: ESPERA_IA_MS,
  });
  const conocida = data.recomendacion && data.recomendacion in TEXTO_RECOMENDACION;
  return {
    resumen: data.resumen,
    recomendacion: conocida ? data.recomendacion : null,
    razon: conocida ? data.razon : null,
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
