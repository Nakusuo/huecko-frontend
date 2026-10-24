import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { useAuthStore } from '../store/authStore';
import { useGroupsStore } from '../store/groupsStore';
import type { Llegadas } from '../types/llegada.types';

/* En demo no hay hora real del plan: un plan confirmado siempre admite
   «Llegué», y lo marcado vive en la memoria de la página. */
const llegadasDemo = new Map<string, Llegadas['llegadas']>();

function estadoDemo(planId: string): Llegadas {
  const plan = useGroupsStore.getState().groupProposals.find((p) => p.id === planId);
  const yo = useAuthStore.getState().user;
  const lista = llegadasDemo.get(planId) ?? [];
  return {
    estado: plan?.estado === 'confirmado' ? 'ABIERTA' : 'SIN_FECHA',
    abre: null,
    cierra: null,
    yaLlegue: lista.some((l) => l.usuarioId === yo?.id),
    llegadas: lista,
  };
}

export const llegadasService = {
  async ver(planId: string): Promise<Llegadas> {
    if (!isApiEnabled) return estadoDemo(planId);
    const { data } = await apiClient.get<Llegadas>(endpoints.llegadas(planId));
    return data;
  },

  async marcar(planId: string): Promise<Llegadas> {
    if (!isApiEnabled) {
      const yo = useAuthStore.getState().user;
      const lista = llegadasDemo.get(planId) ?? [];
      if (yo && !lista.some((l) => l.usuarioId === yo.id)) {
        llegadasDemo.set(planId, [
          ...lista,
          { usuarioId: yo.id, nombre: yo.nombre, fotoActualizadaEn: null, llegoEn: new Date().toISOString(), aTiempo: true },
        ]);
      }
      return estadoDemo(planId);
    }
    const { data } = await apiClient.put<Llegadas>(endpoints.llegadas(planId));
    return data;
  },

  async quitar(planId: string): Promise<Llegadas> {
    if (!isApiEnabled) {
      const yo = useAuthStore.getState().user;
      llegadasDemo.set(planId, (llegadasDemo.get(planId) ?? []).filter((l) => l.usuarioId !== yo?.id));
      return estadoDemo(planId);
    }
    const { data } = await apiClient.delete<Llegadas>(endpoints.llegadas(planId));
    return data;
  },
};
