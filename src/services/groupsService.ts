import { apiClient, isApiEnabled } from '../lib/apiClient';
import type {
  Group,
  CreateGroupPayload,
  JoinGroupPayload,
  HeatmapAvailabilityResponse,
} from '../types/groups.types';

export const groupsService = {
  /**
   * Obtiene la lista de grupos a los que pertenece el usuario autenticado.
   */
  async getGroups(): Promise<Group[]> {
    if (!isApiEnabled) {
      return [];
    }

    try {
      const { data } = await apiClient.get<Group[]>('/groups');
      return data;
    } catch (error) {
      console.warn('[groupsService] Error al obtener grupos del servidor:', error);
      throw error;
    }
  },

  /**
   * Crea un nuevo grupo en el backend.
   */
  async createGroup(payload: CreateGroupPayload): Promise<Group> {
    if (!isApiEnabled) {
      throw new Error('API no habilitada.');
    }

    const { data } = await apiClient.post<Group>('/groups', payload);
    return data;
  },

  /**
   * Unirse a un grupo mediante código de invitación.
   */
  async joinGroup(payload: JoinGroupPayload): Promise<Group> {
    if (!isApiEnabled) {
      throw new Error('API no habilitada.');
    }

    const { data } = await apiClient.post<Group>('/groups/join', payload);
    return data;
  },

  /**
   * Actualiza propiedades del grupo (nombre, descripción, umbral).
   */
  async updateGroup(groupId: string, payload: Partial<CreateGroupPayload>): Promise<Group> {
    if (!isApiEnabled) {
      throw new Error('API no habilitada.');
    }

    const { data } = await apiClient.patch<Group>(`/groups/${groupId}`, payload);
    return data;
  },

  /**
   * Obtiene el cruce inteligente de disponibilidad y el heatmap para un grupo.
   */
  async getAvailabilityHeatmap(groupId: string, threshold = 80): Promise<HeatmapAvailabilityResponse> {
    if (!isApiEnabled) {
      throw new Error('API no habilitada.');
    }

    const { data } = await apiClient.get<HeatmapAvailabilityResponse>(
      `/groups/${groupId}/availability?threshold=${threshold}`
    );
    return data;
  },

  /**
   * Actualiza el rol o criticidad (es_imprescindible) de un miembro del grupo.
   */
  async updateMemberRole(
    groupId: string,
    userId: string,
    payload: { es_imprescindible?: boolean; rol?: 'ADMIN' | 'MIEMBRO' }
  ): Promise<void> {
    if (!isApiEnabled) {
      return;
    }

    await apiClient.patch(`/groups/${groupId}/members/${userId}`, payload);
  },
};
