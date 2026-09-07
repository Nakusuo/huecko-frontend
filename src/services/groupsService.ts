import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { colorByIndex } from '../theme/palette';
import type {
  CreateGroupPayload,
  DisponibilidadResponse,
  Group,
  GroupAvailability,
  GroupMember,
  GrupoResponse,
  JoinGroupPayload,
  MiembroResponse,
  SuggestedWindow,
} from '../types/groups.types';
import type { DayOfWeek } from '../types/schedule.types';

/**
 * Puente entre los grupos del frontend y el Módulo 2 del backend.
 *
 * Mismo reparto de responsabilidades que en `scheduleService`: toda la
 * traducción vive aquí y el store no sabe nada de `diaSemana`, `esImprescindible`
 * ni de los nombres en español de los DTO de Java.
 */

/** El backend numera 1 = lunes … 7 = domingo. */
const DAY_ORDER: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function numberToDay(diaSemana: number): DayOfWeek {
  if (diaSemana < 1 || diaSemana > 7) return 'Lun';
  return DAY_ORDER[diaSemana - 1];
}

/** El backend serializa `LocalTime` como "HH:mm" o "HH:mm:ss"; la rejilla usa "HH:mm". */
function normalizeTime(value: string): string {
  return value.slice(0, 5);
}

/**
 * Clave con la que la UI localiza una casilla del heatmap.
 *
 * Se exporta porque quien lee el mapa tiene que construir la clave igual que
 * quien lo escribe; duplicar el formato en la página sería el típico sitio
 * donde luego se desincronizan.
 */
export function availabilityKey(day: DayOfWeek | string, hour: number): string {
  return `${day}-${hour}`;
}

/* ------------------------------------------------------------------ *
 * Traducción
 * ------------------------------------------------------------------ */

/**
 * El backend no guarda el color de cada integrante: es una decisión de
 * presentación, no un dato del dominio. Se deriva de la posición en la lista,
 * que llega ordenada de forma estable (organizadores primero, luego por
 * nombre), así que a la misma persona le toca siempre el mismo color.
 */
function toMember(miembro: MiembroResponse, index: number): GroupMember {
  return {
    id: miembro.usuarioId,
    userId: miembro.usuarioId,
    email: miembro.email,
    nombre: miembro.nombre,
    isEssential: miembro.esImprescindible,
    color: colorByIndex(index),
    rol: miembro.rol,
    // El backend no tiene invitaciones pendientes: o eres miembro o no estás.
    status: 'confirmado',
  };
}

function toGroup(grupo: GrupoResponse): Group {
  return {
    id: grupo.id,
    nombre: grupo.nombre,
    descripcion: grupo.descripcion ?? '',
    codigoInvitacion: grupo.codigoInvitacion,
    creadoPor: grupo.creadoPor,
    umbralDisponibilidad: grupo.umbralDisponibilidad,
    miembros: grupo.miembros.map(toMember),
  };
}

function toWindow(ventana: DisponibilidadResponse['ventanasSugeridas'][number]): SuggestedWindow {
  return {
    id: ventana.id,
    dia: numberToDay(ventana.diaSemana),
    horaInicio: normalizeTime(ventana.horaInicio),
    horaFin: normalizeTime(ventana.horaFin),
    disponibilidadPorcentaje: ventana.disponibilidadPorcentaje,
    votosUsuarios: [],
  };
}

function toAvailability(respuesta: DisponibilidadResponse): GroupAvailability {
  const cells: GroupAvailability['cells'] = {};
  for (const celda of respuesta.celdas) {
    cells[availabilityKey(numberToDay(celda.diaSemana), celda.hora)] = {
      freeCount: celda.disponibles,
      freePercentage: celda.porcentaje,
      meetsThreshold: celda.cumpleUmbral,
    };
  }

  return {
    threshold: respuesta.umbral,
    membersCount: respuesta.totalMiembros,
    weekFrom: respuesta.semanaDesde,
    hourFrom: respuesta.horaDesde,
    hourTo: respuesta.horaHasta,
    cells,
    windows: respuesta.ventanasSugeridas.map(toWindow),
  };
}

/* ------------------------------------------------------------------ *
 * Servicio
 * ------------------------------------------------------------------ */

export const groupsService = {
  /** Grupos del usuario del token. El backend no recibe ningún id por la URL. */
  async getGroups(): Promise<Group[]> {
    if (!isApiEnabled) return [];

    const { data } = await apiClient.get<GrupoResponse[]>(endpoints.groups.list);
    return data.map(toGroup);
  },

  async createGroup(payload: CreateGroupPayload): Promise<Group> {
    if (!isApiEnabled) throw new Error('API no habilitada.');

    const { data } = await apiClient.post<GrupoResponse>(endpoints.groups.list, {
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      umbralDisponibilidad: payload.umbral_disponibilidad,
    });
    return toGroup(data);
  },

  async joinGroup(payload: JoinGroupPayload): Promise<Group> {
    if (!isApiEnabled) throw new Error('API no habilitada.');

    const { data } = await apiClient.post<GrupoResponse>(endpoints.groups.join, {
      codigoInvitacion: payload.codigo_invitacion,
    });
    return toGroup(data);
  },

  /** RF-06: cambia el umbral guardado del grupo. Solo lo acepta al organizador. */
  async updateGroup(groupId: string, payload: Partial<CreateGroupPayload>): Promise<Group> {
    if (!isApiEnabled) throw new Error('API no habilitada.');

    const { data } = await apiClient.patch<GrupoResponse>(endpoints.groups.detail(groupId), {
      nombre: payload.nombre,
      descripcion: payload.descripcion,
      umbralDisponibilidad: payload.umbral_disponibilidad,
    });
    return toGroup(data);
  },

  /**
   * RF-05 / RF-06: heatmap y ventanas sugeridas.
   *
   * `threshold` es opcional a propósito: sin él manda el umbral guardado del
   * grupo. Pasarlo permite mirar el cruce con otro porcentaje sin cambiar el
   * ajuste para todo el mundo.
   */
  async getAvailability(groupId: string, threshold?: number): Promise<GroupAvailability> {
    if (!isApiEnabled) throw new Error('API no habilitada.');

    const { data } = await apiClient.get<DisponibilidadResponse>(
      endpoints.groups.availability(groupId),
      { params: threshold == null ? undefined : { umbral: threshold } }
    );
    return toAvailability(data);
  },

  /** HU-14: marcar a alguien como imprescindible, o cambiarle el rol. */
  async updateMember(
    groupId: string,
    userId: string,
    payload: { esImprescindible?: boolean; rol?: 'ORGANIZADOR' | 'MIEMBRO' }
  ): Promise<Group> {
    if (!isApiEnabled) throw new Error('API no habilitada.');

    const { data } = await apiClient.patch<GrupoResponse>(
      endpoints.groups.member(groupId, userId),
      payload
    );
    return toGroup(data);
  },

  /** Salir del grupo, o sacar a alguien si quien pide es el organizador. */
  async removeMember(groupId: string, userId: string): Promise<void> {
    if (!isApiEnabled) return;

    await apiClient.delete(endpoints.groups.member(groupId, userId));
  },
};
