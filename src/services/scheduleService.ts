import { apiClient, isApiEnabled } from '../lib/apiClient';
import {
  type TimeSlot,
  type BloqueHorarioRequest,
  type BloqueHorarioResponse,
  toBloqueHorarioRequest,
  toTimeSlot,
} from '../types/schedule.types';

/**
 * Servicio de comunicación con el backend para la gestión de bloques horarios (MongoDB/Spring Boot)
 */
export const scheduleService = {
  /**
   * Obtiene la lista de bloques de horario confirmados de un usuario.
   */
  async getConfirmedBlocks(userId: string): Promise<TimeSlot[]> {
    if (!isApiEnabled) {
      return [];
    }

    try {
      // Intenta primero la ruta directa de usuarios, y si no, la ruta de contrato /schedule/blocks
      const url = userId ? `/usuarios/${userId}/bloques-horario` : '/schedule/blocks';
      const { data } = await apiClient.get<BloqueHorarioResponse[]>(url);
      return data.map(toTimeSlot);
    } catch (error) {
      console.warn('[scheduleService] Error al obtener bloques confirmados del servidor:', error);
      throw error;
    }
  },

  /**
   * Obtiene la bandeja de borradores pendientes de revisión OCR.
   */
  async getDraftBlocks(userId: string): Promise<TimeSlot[]> {
    if (!isApiEnabled) {
      return [];
    }

    try {
      const url = userId ? `/usuarios/${userId}/bloques-horario/borradores` : '/schedule/ocr/drafts';
      const { data } = await apiClient.get<BloqueHorarioResponse[]>(url);
      return data.map(toTimeSlot);
    } catch (error) {
      console.warn('[scheduleService] Error al obtener borradores OCR del servidor:', error);
      throw error;
    }
  },

  /**
   * Crea un nuevo bloque de horario manual (recurrente o puntual) en MongoDB.
   */
  async createBlock(userId: string, slot: Omit<TimeSlot, 'id'>): Promise<TimeSlot> {
    const payload: BloqueHorarioRequest = toBloqueHorarioRequest(slot);

    if (!isApiEnabled) {
      // Mock ID
      return {
        ...slot,
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
    }

    const url = userId ? `/usuarios/${userId}/bloques-horario` : '/schedule/blocks';
    const { data } = await apiClient.post<BloqueHorarioResponse>(url, payload);
    return toTimeSlot(data);
  },

  /**
   * Actualiza un bloque de horario existente o confirma un borrador.
   */
  async updateBlock(userId: string, blockId: string, slot: Partial<TimeSlot>): Promise<TimeSlot> {
    const payload: BloqueHorarioRequest = toBloqueHorarioRequest(slot);

    if (!isApiEnabled) {
      return {
        ...(slot as TimeSlot),
        id: blockId,
      };
    }

    const url = userId ? `/usuarios/${userId}/bloques-horario/${blockId}` : `/schedule/blocks/${blockId}`;
    const { data } = await apiClient.put<BloqueHorarioResponse>(url, payload);
    return toTimeSlot(data);
  },

  /**
   * Elimina un bloque de horario por ID.
   */
  async deleteBlock(userId: string, blockId: string): Promise<void> {
    if (!isApiEnabled) {
      return;
    }

    const url = userId ? `/usuarios/${userId}/bloques-horario/${blockId}` : `/schedule/blocks/${blockId}`;
    await apiClient.delete(url);
  },

  /**
   * Confirma múltiples borradores generados por OCR.
   */
  async confirmMultipleDrafts(userId: string, slots: Partial<TimeSlot>[]): Promise<TimeSlot[]> {
    const results: TimeSlot[] = [];
    for (const slot of slots) {
      if (slot.id) {
        const confirmed = await this.updateBlock(userId, slot.id, slot);
        results.push(confirmed);
      } else {
        const created = await this.createBlock(userId, slot as Omit<TimeSlot, 'id'>);
        results.push(created);
      }
    }
    return results;
  }
};
