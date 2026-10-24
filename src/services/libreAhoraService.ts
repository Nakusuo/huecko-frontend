import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { libreAhoraDemo } from '../lib/libreAhora';
import { useAuthStore } from '../store/authStore';
import { useGroupsStore } from '../store/groupsStore';
import type { LibreAhora } from '../types/libre.types';

/* En demo tu aviso se guarda en este navegador. */
const CLAVE_DEMO = 'huecko-libre-demo';

function leerAvisoDemo(): LibreAhora['yo'] {
  try {
    const datos: unknown = JSON.parse(localStorage.getItem(CLAVE_DEMO) ?? 'null');
    if (datos && typeof datos === 'object' && typeof (datos as { hasta?: unknown }).hasta === 'string') {
      const { hasta, nota } = datos as { hasta: string; nota?: unknown };
      return { hasta, nota: typeof nota === 'string' ? nota : null };
    }
  } catch {
    // Sin almacenamiento, sin aviso.
  }
  return null;
}

function guardarAvisoDemo(aviso: LibreAhora['yo']): void {
  try {
    if (aviso) localStorage.setItem(CLAVE_DEMO, JSON.stringify(aviso));
    else localStorage.removeItem(CLAVE_DEMO);
  } catch {
    // Dura lo que dure la página.
  }
}

function estadoDemo(): LibreAhora {
  const { groups, occupiedSlots } = useGroupsStore.getState();
  return libreAhoraDemo({
    grupos: groups,
    slots: occupiedSlots,
    miEmail: useAuthStore.getState().user?.email ?? '',
    miAviso: leerAvisoDemo(),
    ahora: new Date(),
  });
}

export const libreAhoraService = {
  async estado(): Promise<LibreAhora> {
    if (!isApiEnabled) return estadoDemo();
    const { data } = await apiClient.get<LibreAhora>(endpoints.libreAhora);
    return data;
  },

  /** «Estoy libre». Sin `hasta`, el servidor usa tu horario (hasta tu siguiente clase de hoy). */
  async marcar(hasta: string | null, nota: string | null): Promise<LibreAhora> {
    if (!isApiEnabled) {
      const estado = estadoDemo();
      const fin = hasta ?? estado.sugerencia ?? new Date(Date.now() + 3_600_000).toISOString();
      guardarAvisoDemo({ hasta: fin, nota: nota?.trim() || null });
      return estadoDemo();
    }
    const { data } = await apiClient.put<LibreAhora>(endpoints.libreAhora, { hasta, nota: nota?.trim() || null });
    return data;
  },

  async quitar(): Promise<LibreAhora> {
    if (!isApiEnabled) {
      guardarAvisoDemo(null);
      return estadoDemo();
    }
    const { data } = await apiClient.delete<LibreAhora>(endpoints.libreAhora);
    return data;
  },
};
