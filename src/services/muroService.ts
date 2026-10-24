import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { useGroupsStore } from '../store/groupsStore';
import type { EntradaMuro, Muro } from '../types/muro.types';

/**
 * En demo el muro se arma con los planes de ejemplo. No hay fechas reales de
 * cuándo se propusieron, así que se reparten hacia atrás desde ahora.
 */
function muroDemo(grupoId: string): Muro {
  const planes = useGroupsStore.getState().groupProposals.filter((p) => p.groupId === grupoId);
  const ahora = Date.now();
  const entradas: EntradaMuro[] = planes.flatMap((p, i) => {
    const ventana = p.ventanasSugeridas.find((v) => v.id === p.ventanaConfirmadaId) ?? null;
    const comun = { planId: p.id, titulo: p.titulo, cantidad: null, fotoIds: null, personas: null };
    const propuesto: EntradaMuro = {
      ...comun, tipo: 'PLAN_PROPUESTO', ocurridoEn: new Date(ahora - (i + 1) * 86_400_000).toISOString(),
      actor: { usuarioId: p.creadoPorId ?? p.creadoPor, nombre: p.creadoPor, fotoActualizadaEn: null },
      fecha: null, horaInicio: null,
    };
    if (p.estado !== 'confirmado') return [propuesto];
    return [{
      ...comun, tipo: 'PLAN_CONFIRMADO' as const, ocurridoEn: new Date(ahora - (i + 1) * 86_400_000 + 3_600_000).toISOString(),
      actor: null, fecha: ventana?.fecha ?? null, horaInicio: ventana?.horaInicio ?? null,
    }, propuesto];
  });
  return { entradas: entradas.sort((a, b) => b.ocurridoEn.localeCompare(a.ocurridoEn)), siguiente: null };
}

export const muroService = {
  async muro(grupoId: string, antes?: string): Promise<Muro> {
    if (!isApiEnabled) return muroDemo(grupoId);
    const { data } = await apiClient.get<Muro>(endpoints.muro(grupoId), { params: antes ? { antes } : undefined });
    return data;
  },
};
