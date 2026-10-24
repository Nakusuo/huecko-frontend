import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { blobADataUrl, enEnvios, olvidarFotoDeAlbum } from '../lib/fotos';
import { useAuthStore } from '../store/authStore';
import { useGroupsStore } from '../store/groupsStore';
import type { AlbumGrupo, AlbumPlan, FotoAlbum } from '../types/album.types';
import type { PlanProposal } from '../types/groups.types';

/* ------------------------------------------------------------------ *
 * Modo demo: las fotos se quedan en la memoria de la página (no caben en
 * localStorage), así que al recargar desaparecen. La interfaz lo dice.
 * ------------------------------------------------------------------ */

export const MAX_DEMO = { porPersona: 10, porGrupo: 60 };
const fotosDemo = new Map<string, { foto: FotoAlbum; url: string; grupoId: string }[]>();

/** La URL de una foto del modo demo (una data URL), o `undefined`. */
export function fotoDemo(fotoId: string): string | undefined {
  for (const lista of fotosDemo.values()) {
    const encontrada = lista.find((f) => f.foto.id === fotoId);
    if (encontrada) return encontrada.url;
  }
  return undefined;
}

function confirmadosDemo(grupoId: string): PlanProposal[] {
  return useGroupsStore.getState().groupProposals.filter((p) => p.groupId === grupoId && p.estado === 'confirmado');
}

function ventanaElegida(plan: PlanProposal) {
  return plan.ventanasSugeridas.find((v) => v.id === plan.ventanaConfirmadaId) ?? null;
}

function albumPlanDemo(planId: string): AlbumPlan {
  const plan = useGroupsStore.getState().groupProposals.find((p) => p.id === planId);
  if (!plan) throw new Error('El plan no existe o no perteneces a su grupo');
  const yo = useAuthStore.getState().user;
  const lista = fotosDemo.get(planId) ?? [];
  const delGrupo = [...fotosDemo.values()].flat().filter((f) => f.grupoId === plan.groupId).length;
  const mias = lista.filter((f) => f.foto.autorId === yo?.id).length;
  const ventana = ventanaElegida(plan);
  return {
    planId,
    grupoId: plan.groupId,
    titulo: plan.titulo,
    fecha: ventana?.fecha ?? null,
    horaInicio: ventana?.horaInicio ?? null,
    puedeSubir: plan.estado === 'confirmado' && mias < MAX_DEMO.porPersona && delGrupo < MAX_DEMO.porGrupo,
    restantesMias: MAX_DEMO.porPersona - mias,
    restantesGrupo: MAX_DEMO.porGrupo - delGrupo,
    fotos: lista.map((f) => f.foto),
  };
}

export const albumService = {
  async album(grupoId: string): Promise<AlbumGrupo> {
    if (!isApiEnabled) {
      const planes = confirmadosDemo(grupoId).map((p) => {
        const lista = fotosDemo.get(p.id) ?? [];
        const ventana = ventanaElegida(p);
        return {
          planId: p.id,
          titulo: p.titulo,
          fecha: ventana?.fecha ?? null,
          horaInicio: ventana?.horaInicio ?? null,
          fotos: lista.length,
          portadaId: lista[0]?.foto.id ?? null,
        };
      });
      const usadas = [...fotosDemo.values()].flat().filter((f) => f.grupoId === grupoId).length;
      return { usadas, maximo: MAX_DEMO.porGrupo, planes };
    }
    const { data } = await apiClient.get<AlbumGrupo>(endpoints.album.grupo(grupoId));
    return data;
  },

  async delPlan(planId: string): Promise<AlbumPlan> {
    if (!isApiEnabled) return albumPlanDemo(planId);
    const { data } = await apiClient.get<AlbumPlan>(endpoints.album.plan(planId));
    return data;
  },

  /**
   * Sube fotos ya reducidas (ver `reducirParaAlbum`), en tantos envíos como
   * hagan falta. Avisa del progreso con las que ya entraron.
   */
  async subir(planId: string, fotos: Blob[], alAvanzar?: (subidas: number) => void): Promise<AlbumPlan> {
    if (!isApiEnabled) {
      const plan = albumPlanDemo(planId);
      const yo = useAuthStore.getState().user;
      const lista = fotosDemo.get(planId) ?? [];
      for (const [i, foto] of fotos.entries()) {
        lista.push({
          grupoId: plan.grupoId,
          url: await blobADataUrl(foto),
          foto: {
            id: `demo-${Date.now()}-${i}`,
            autorId: yo?.id ?? 'demo',
            autorNombre: yo?.nombre ?? 'Tú',
            ancho: 0,
            alto: 0,
            subidaEn: new Date().toISOString(),
            puedeBorrar: true,
          },
        });
        alAvanzar?.(i + 1);
      }
      fotosDemo.set(planId, lista);
      return albumPlanDemo(planId);
    }

    let resultado: AlbumPlan | null = null;
    let subidas = 0;
    for (const envio of enEnvios(fotos)) {
      const formulario = new FormData();
      envio.forEach((foto, i) => formulario.append('fotos', foto, `foto-${subidas + i + 1}.jpg`));
      // Sin esta cabecera axios convierte el FormData en JSON (su cabecera por defecto).
      const { data } = await apiClient.post<AlbumPlan>(endpoints.album.plan(planId), formulario, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60_000,
      });
      resultado = data;
      subidas += envio.length;
      alAvanzar?.(subidas);
    }
    if (!resultado) throw new Error('Elige al menos una foto.');
    return resultado;
  },

  async borrar(fotoId: string): Promise<void> {
    if (!isApiEnabled) {
      for (const [planId, lista] of fotosDemo) {
        fotosDemo.set(planId, lista.filter((f) => f.foto.id !== fotoId));
      }
      return;
    }
    await apiClient.delete(endpoints.album.foto(fotoId));
    olvidarFotoDeAlbum(endpoints.album.foto(fotoId), endpoints.album.miniatura(fotoId));
  },
};
