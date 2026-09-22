import { create } from 'zustand';
import { incidentsService } from '../services/incidentsService';
import { isApiEnabled } from '../lib/apiClient';
import { useAuthStore } from './authStore';
import type {
  Ausencia,
  OpcionExpres,
  ResultadoReporte,
  Retraso,
  VotacionExpres,
} from '../types/incidents.types';

/**
 * Estado de los Módulos 4 y 5, indexado por plan.
 *
 * Va aparte de `groupsStore` a propósito: aquello guarda la coordinación —
 * grupos, disponibilidad, propuestas— y esto guarda lo que pasa el día del
 * evento. Mezclarlos obligaría a recargar todo el grupo cada vez que alguien
 * avisa de diez minutos de retraso.
 *
 * No se persiste en localStorage: un retraso caduca con el evento, y mostrar
 * el de la semana pasada al abrir la app sería peor que no mostrar nada.
 */

interface IncidentsState {
  /** planId → retrasos reportados. */
  retrasos: Record<string, Retraso[]>;
  /** planId → quién avisó de que no irá. */
  ausencias: Record<string, Ausencia[]>;
  /** planId → votación exprés abierta, o `null` si no hay. */
  votaciones: Record<string, VotacionExpres | null>;
  cargando: Record<string, boolean>;
  error: string | null;

  cargarPlan: (planId: string) => Promise<void>;
  reportarRetraso: (planId: string, minutos: number) => Promise<void>;
  retirarRetraso: (planId: string, usuarioId: string) => Promise<void>;
  /** Devuelve el veredicto del servidor, o `null` en modo demo. */
  reportarImprevisto: (planId: string, motivo: string) => Promise<ResultadoReporte | null>;
  votarExpres: (planId: string, opcion: OpcionExpres) => Promise<void>;
  /** Tras reprogramar un plan, lo avisado sobre la fecha anterior deja de valer. */
  olvidarPlan: (planId: string) => void;

  /* Entradas desde el canal en tiempo real. No llaman a la API: el evento ya
     trae lo necesario, y volver a pedirlo multiplicaría las peticiones por el
     número de personas conectadas. */
  aplicarRetrasoRemoto: (planId: string, retraso: Retraso | null, usuarioId: string) => void;
  aplicarVotacionAbierta: (planId: string) => Promise<void>;
  aplicarVotacionCerrada: (planId: string) => void;

  limpiarError: () => void;

  /** Vuelve al estado inicial. Se llama al cerrar sesión. */
  reset: () => void;
}

const ESTADO_INICIAL = {
  retrasos: {},
  ausencias: {},
  votaciones: {},
  cargando: {},
  error: null,
};

export const useIncidentsStore = create<IncidentsState>()((set) => ({
  ...ESTADO_INICIAL,

  cargarPlan: async (planId) => {
    set((s) => ({ cargando: { ...s.cargando, [planId]: true }, error: null }));
    try {
      // En paralelo: son dos módulos independientes y encadenarlos solo
      // sumaría latencia.
      const [retrasos, votacion, ausencias] = await Promise.all([
        incidentsService.listarRetrasos(planId),
        incidentsService.votacionAbierta(planId),
        // Las ausencias informan, no bloquean: si no llegan, el resto del
        // panel se pinta igual.
        incidentsService.listarAusencias(planId).catch(() => [] as Ausencia[]),
      ]);
      set((s) => ({
        retrasos: { ...s.retrasos, [planId]: retrasos },
        ausencias: { ...s.ausencias, [planId]: ausencias },
        votaciones: { ...s.votaciones, [planId]: votacion },
        cargando: { ...s.cargando, [planId]: false },
      }));
    } catch {
      set((s) => ({
        cargando: { ...s.cargando, [planId]: false },
        error: 'No se pudo cargar el estado del evento.',
      }));
    }
  },

  reportarRetraso: async (planId, minutos) => {
    const reportado = await incidentsService.reportarRetraso(planId, minutos);
    if (!reportado) return;
    set((s) => ({
      retrasos: {
        ...s.retrasos,
        [planId]: reemplazar(s.retrasos[planId], reportado),
      },
    }));
  },

  retirarRetraso: async (planId, usuarioId) => {
    await incidentsService.retirarRetraso(planId);
    set((s) => ({
      retrasos: {
        ...s.retrasos,
        [planId]: (s.retrasos[planId] ?? []).filter((r) => r.usuarioId !== usuarioId),
      },
    }));
  },

  reportarImprevisto: async (planId, motivo) => {
    const resultado = await incidentsService.reportarImprevisto(planId, motivo);
    if (!resultado) return null;
    const ausencias = await incidentsService.listarAusencias(planId).catch(() => null);
    const usuarioYo = miIdentificador();
    set((s) => ({
      votaciones: resultado.votacion ? { ...s.votaciones, [planId]: resultado.votacion } : s.votaciones,
      ausencias: ausencias ? { ...s.ausencias, [planId]: ausencias } : s.ausencias,
      // Quien no va no llega tarde: el servidor ya borró su retraso.
      retrasos: usuarioYo
        ? { ...s.retrasos, [planId]: (s.retrasos[planId] ?? []).filter((r) => r.usuarioId !== usuarioYo) }
        : s.retrasos,
    }));
    return resultado;
  },

  votarExpres: async (planId, opcion) => {
    const actualizada = await incidentsService.votarExpres(planId, opcion);
    if (!actualizada) return;
    // Si este voto completó la votación, ya está cerrada: no queda nada que votar.
    set((s) => ({
      votaciones: { ...s.votaciones, [planId]: actualizada.estado === 'CERRADA' ? null : actualizada },
    }));
  },

  olvidarPlan: (planId) => {
    set((s) => ({
      retrasos: { ...s.retrasos, [planId]: [] },
      ausencias: { ...s.ausencias, [planId]: [] },
      votaciones: { ...s.votaciones, [planId]: null },
    }));
  },

  aplicarRetrasoRemoto: (planId, retraso, usuarioId) => {
    set((s) => {
      const actuales = s.retrasos[planId] ?? [];
      const siguientes = retraso
        ? reemplazar(actuales, retraso)
        : actuales.filter((r) => r.usuarioId !== usuarioId);
      return { retrasos: { ...s.retrasos, [planId]: siguientes } };
    });
  },

  aplicarVotacionAbierta: async (planId) => {
    // Aquí sí se pide: el evento avisa de que hay votación, pero el recuento y
    // "mi voto" dependen de quién pregunta y no pueden viajar en un topic
    // compartido por todo el grupo.
    // Llega desde el canal en tiempo real, donde nadie espera la promesa: el
    // fallo se guarda aquí en vez de quedar como un rechazo sin manejar.
    try {
      const votacion = await incidentsService.votacionAbierta(planId);
      set((s) => ({ votaciones: { ...s.votaciones, [planId]: votacion } }));
    } catch {
      set({ error: 'Se abrió una votación, pero no se pudo cargar. Recarga la página.' });
    }
  },

  aplicarVotacionCerrada: (planId) => {
    set((s) => ({ votaciones: { ...s.votaciones, [planId]: null } }));
  },

  limpiarError: () => set({ error: null }),

  reset: () => set(ESTADO_INICIAL),
}));

/**
 * Cómo me identifican retrasos y ausencias: el UUID con backend, el correo en
 * demo (el simulador no tiene UUID de nadie más que del usuario de ejemplo).
 */
export function miIdentificador(): string {
  const user = useAuthStore.getState().user;
  return (isApiEnabled ? user?.id : user?.email) ?? 'alex.rodriguez@huecko.com';
}

/** Sustituye el retraso de esa persona, o lo añade si es el primero. */
function reemplazar(actuales: Retraso[] | undefined, nuevo: Retraso): Retraso[] {
  const lista = actuales ?? [];
  const indice = lista.findIndex((r) => r.usuarioId === nuevo.usuarioId);
  if (indice < 0) return [...lista, nuevo];
  const copia = [...lista];
  copia[indice] = nuevo;
  return copia;
}
