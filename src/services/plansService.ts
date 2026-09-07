import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import type {
  EstadoPlan,
  GroupMember,
  PlanProposal,
  PlanResponse,
  TimeWindowProposal,
  VentanaPlanResponse,
} from '../types/groups.types';
import type { DayOfWeek } from '../types/schedule.types';

/**
 * Puente entre las propuestas del frontend y el Módulo 3 del backend.
 *
 * Igual que `groupsService`, toda la traducción vive aquí: el store sigue
 * hablando de `ventanasSugeridas` y de correos, y no se entera de que el
 * backend dice `ventanas` y usa UUID.
 */

const DAY_ORDER: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function numberToDay(diaSemana: number): DayOfWeek {
  if (diaSemana < 1 || diaSemana > 7) return 'Lun';
  return DAY_ORDER[diaSemana - 1];
}

export function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

/** El backend usa MAYÚSCULAS; la UI, minúsculas con guion bajo. */
const ESTADOS: Record<EstadoPlan, PlanProposal['estado']> = {
  PROPUESTO: 'propuesto',
  CONFIRMADO: 'confirmado',
  CANCELADO: 'cancelado',
  EN_RECOORDINACION: 'en_recoordinacion',
};

/**
 * Fecha concreta para un día de la semana dentro de la semana del heatmap.
 *
 * Si ese día ya pasó (el heatmap muestra la semana en curso y hoy es jueves,
 * pero la ventana es del martes), se salta a la semana siguiente: el backend
 * rechaza proponer una ventana en una fecha pasada, y con razón.
 */
export function fechaParaDia(lunesISO: string, dia: DayOfWeek): string {
  const indice = Math.max(DAY_ORDER.indexOf(dia), 0);
  const [anio, mes, diaDelMes] = lunesISO.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, diaDelMes + indice);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fecha < hoy) fecha.setDate(fecha.getDate() + 7);

  const dosDigitos = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/* ------------------------------------------------------------------ *
 * Traducción
 * ------------------------------------------------------------------ */

/**
 * El backend identifica a las personas por UUID; la UI las compara por correo
 * desde antes de que hubiera backend. Se traduce aquí en vez de cambiar la UI:
 * el correo es lo que se pinta, y hacer que toda la página razone en UUID solo
 * para volver a resolver el correo al mostrarlo no aporta nada.
 */
function correosDeVotantes(votantes: string[], miembros: GroupMember[]): string[] {
  return votantes.map((usuarioId) => {
    const miembro = miembros.find((m) => (m.userId ?? m.id) === usuarioId);
    return miembro?.email ?? usuarioId;
  });
}

function toWindow(ventana: VentanaPlanResponse, miembros: GroupMember[]): TimeWindowProposal {
  return {
    id: ventana.id,
    dia: numberToDay(ventana.diaSemana),
    fecha: ventana.fecha,
    horaInicio: normalizeTime(ventana.horaInicio),
    horaFin: normalizeTime(ventana.horaFin),
    disponibilidadPorcentaje: ventana.disponibilidadPorcentaje,
    votosUsuarios: correosDeVotantes(ventana.votantes, miembros),
  };
}

function toProposal(plan: PlanResponse, miembros: GroupMember[]): PlanProposal {
  const creador = miembros.find((m) => (m.userId ?? m.id) === plan.creadoPor);

  return {
    id: plan.id,
    groupId: plan.grupoId,
    titulo: plan.titulo,
    lugar: plan.lugar ?? undefined,
    creadoPor: creador?.nombre ?? plan.creadoPor,
    // La votación cerrada se marca con el texto que la UI ya sabe pintar; si
    // sigue abierta viaja el instante ISO y lo formatea la página.
    plazoVotacion: plan.votacionAbierta ? plan.plazoVotacion : 'Finalizada',
    estado: ESTADOS[plan.estado] ?? 'propuesto',
    ventanasSugeridas: plan.ventanas.map((v) => toWindow(v, miembros)),
  };
}

/* ------------------------------------------------------------------ *
 * Servicio
 * ------------------------------------------------------------------ */

export interface CrearPlanPayload {
  titulo: string;
  lugar?: string;
  /** Instante ISO en que se cierra la votación. */
  plazoVotacion: string;
  votosMultiples?: boolean;
  ventanas: Array<{ fecha: string; horaInicio: string; horaFin: string }>;
}

export const plansService = {
  async getPlans(groupId: string, miembros: GroupMember[]): Promise<PlanProposal[]> {
    if (!isApiEnabled) return [];

    const { data } = await apiClient.get<PlanResponse[]>(endpoints.plans.byGroup(groupId));
    return data.map((plan) => toProposal(plan, miembros));
  },

  /** RF-08. El backend rechaza las ventanas que no cumplen el umbral del grupo. */
  async createPlan(
    groupId: string,
    payload: CrearPlanPayload,
    miembros: GroupMember[]
  ): Promise<PlanProposal> {
    if (!isApiEnabled) throw new Error('API no habilitada.');

    const { data } = await apiClient.post<PlanResponse>(endpoints.plans.byGroup(groupId), payload);
    return toProposal(data, miembros);
  },

  /** RF-09. `PUT` porque votar es idempotente: repetirlo deja el mismo estado. */
  async vote(planId: string, windowId: string, miembros: GroupMember[]): Promise<PlanProposal> {
    if (!isApiEnabled) throw new Error('API no habilitada.');

    const { data } = await apiClient.put<PlanResponse>(endpoints.plans.vote(planId, windowId));
    return toProposal(data, miembros);
  },

  async removeVote(planId: string, windowId: string, miembros: GroupMember[]): Promise<PlanProposal> {
    if (!isApiEnabled) throw new Error('API no habilitada.');

    const { data } = await apiClient.delete<PlanResponse>(endpoints.plans.vote(planId, windowId));
    return toProposal(data, miembros);
  },

  /**
   * RF-10, cierre anticipado. Al vencer el plazo el backend cierra solo, sin
   * que nadie tenga que llamar aquí.
   */
  async closeVoting(planId: string, miembros: GroupMember[]): Promise<PlanProposal> {
    if (!isApiEnabled) throw new Error('API no habilitada.');

    const { data } = await apiClient.post<PlanResponse>(endpoints.plans.close(planId));
    return toProposal(data, miembros);
  },
};
