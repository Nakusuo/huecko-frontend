import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiError, isApiEnabled } from '../lib/apiClient';
import { groupsService } from '../services/groupsService';
import { eventsService } from '../services/eventsService';
import { useIncidentsStore } from './incidentsStore';
import {
  plansService,
  type CrearPlanPayload,
  type ReproponerPayload,
} from '../services/plansService';
import type {
  Group,
  GroupAvailability,
  GroupMember,
  PlanProposal,
  PlanIncidence,
  TimeWindowProposal,
} from '../types/groups.types';
import type { DayOfWeek } from '../types/schedule.types';
import type { Criticidad } from '../types/incidents.types';
import { colorByIndex } from '../theme/palette';
import { useAuthStore } from './authStore';

/** Si una tardanza llega sin minutos, se asume lo mismo que propone el formulario. */
const MINUTOS_TARDANZA_POR_DEFECTO = 15;

export type { Group, GroupMember, PlanProposal, PlanIncidence, TimeWindowProposal, DayOfWeek };

/** Lo que la interfaz necesita saber después de reportar una incidencia. */
export interface ResultadoIncidencia {
  /** `true` si el plan pasó a re-coordinación. */
  replantea: boolean;
  /** Veredicto del servidor; `null` en modo demo o si fue una tardanza. */
  criticidad: Criticidad | null;
  razon?: string;
}

/** Resultado de dar de alta varios correos a la vez. */
export interface ResultadoAltas {
  /** No hay ninguna cuenta con ese correo (404). */
  sinCuenta: string[];
  /** Fallaron por otro motivo (red, permisos…). */
  fallidos: string[];
}

export interface GroupOccupiedSlot {
  id: string;
  userEmail: string;
  userName: string;
  userColor: string;
  day: DayOfWeek;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "10:00"
  title: string;
}

interface GroupsState {
  groups: Group[];
  selectedGroupId: string | null;
  occupiedSlots: GroupOccupiedSlot[];
  groupProposals: PlanProposal[];
  /**
   * Cruce calculado por el backend, por grupo (RF-05). Vacío en modo demo, y
   * entonces la UI cae a su cálculo local sobre `occupiedSlots`.
   */
  availability: Record<string, GroupAvailability>;
  isLoading: boolean;
  /**
   * `true` cuando ya llegó al menos una respuesta del servidor (o en modo
   * demo). Permite distinguir «aún cargando» de «ese grupo no existe».
   */
  groupsLoaded: boolean;
  syncError: string | null;

  setSelectedGroupId: (id: string) => void;
  clearSyncError: () => void;
  /** Vuelve al estado inicial. Se llama al cerrar sesión (ver `lib/sesion.ts`). */
  reset: () => void;
  fetchGroupsFromServer: () => Promise<void>;
  fetchAvailability: (groupId: string, threshold?: number) => Promise<void>;
  fetchProposals: (groupId: string) => Promise<void>;
  createGroup: (nombre: string, descripcion: string, umbralDisponibilidad: number, userEmail: string, userName: string) => Promise<Group>;
  addMemberByEmail: (groupId: string, email: string) => Promise<boolean>;
  /**
   * Da de alta varios correos y nunca lanza: devuelve cuáles no tienen cuenta
   * y cuáles fallaron por otro motivo, para que la interfaz lo explique.
   */
  addMembersByEmail: (groupId: string, emails: string[]) => Promise<ResultadoAltas>;
  updateGroupThreshold: (groupId: string, threshold: number) => Promise<void>;
  toggleMemberEssential: (groupId: string, memberEmail: string) => Promise<void>;

  /**
   * `backendPayload` lleva la propuesta ya en el formato del Módulo 3 (fechas
   * concretas e instante de cierre). Va aparte del objeto de demo porque son
   * dos formas distintas del mismo plan: la de la UI razona en días de la
   * semana, y la del backend necesita fechas.
   */
  addProposal: (proposal: Omit<PlanProposal, 'id'>, backendPayload?: CrearPlanPayload) => Promise<void>;
  /** Devuelve `false` si el servidor no guardó el voto (el motivo queda en `syncError`). */
  voteProposalWindow: (proposalId: string, windowId: string, userEmail: string) => Promise<boolean>;
  /**
   * Tras un REAGENDAR: el plan vuelve a votarse con ventanas nuevas. Como
   * `addProposal`, lleva las ventanas en el formato de la UI y, aparte, el
   * payload del backend. Con backend el error sube para verlo en el formulario.
   */
  reproponerPlan: (
    proposalId: string,
    ventanas: TimeWindowProposal[],
    plazoVotacion: string,
    backendPayload?: ReproponerPayload
  ) => Promise<void>;
  /** Devuelve el estado en que quedó el plan, o `null` si no se pudo cerrar. */
  closeVotingManually: (proposalId: string) => Promise<PlanProposal['estado'] | null>;
  /**
   * Con backend, si el servidor rechaza el aviso el error sube: la página
   * tiene que decírselo a quien reporta, no fingir que se envió.
   */
  reportIncident: (
    proposalId: string,
    incidence: Omit<PlanIncidence, 'id' | 'fechaReporte'>
  ) => Promise<ResultadoIncidencia>;
  voteReplanification: (proposalId: string, action: 'cancel' | 'reschedule' | 'keep', userEmail: string) => Promise<void>;
  /** Devuelve `false` si el servidor no lo retiró (el motivo queda en `syncError`). */
  withdrawIncident: (proposalId: string, userEmail: string) => Promise<boolean>;
}

const INITIAL_GROUPS: Group[] = [
  {
    id: '1',
    nombre: 'Grupo Universitario - Ing. Software',
    descripcion: 'Coordinación para proyecto final, entregables y sesiones de estudio de fin de ciclo.',
    creadoPor: 'alex.rodriguez@huecko.com',
    umbralDisponibilidad: 80,
    miembros: [
      { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R. (Tú)', isEssential: true, color: colorByIndex(0), status: 'confirmado' },
      { email: 'maria.c@huecko.com', nombre: 'María C.', isEssential: true, color: colorByIndex(1), status: 'confirmado' },
      { email: 'sam.p@huecko.com', nombre: 'Sam P.', isEssential: false, color: colorByIndex(2), status: 'confirmado' },
      { email: 'lucia.t@huecko.com', nombre: 'Lucía T.', isEssential: false, color: colorByIndex(3), status: 'confirmado' },
      { email: 'diego.r@huecko.com', nombre: 'Diego R.', isEssential: false, color: colorByIndex(4), status: 'pendiente' },
    ],
  },
  {
    id: '2',
    nombre: 'Amigos de Fin de Semana',
    descripcion: 'Pichangas de fútbol, asados de domingo, salidas y cumpleaños del grupo.',
    creadoPor: 'carlos.m@huecko.com',
    umbralDisponibilidad: 70,
    miembros: [
      { email: 'carlos.m@huecko.com', nombre: 'Carlos M.', isEssential: true, color: colorByIndex(5), status: 'confirmado' },
      { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R. (Tú)', isEssential: false, color: colorByIndex(0), status: 'confirmado' },
      { email: 'jorge.l@huecko.com', nombre: 'Jorge L.', isEssential: false, color: colorByIndex(6), status: 'confirmado' },
      { email: 'valeria.v@huecko.com', nombre: 'Valeria V.', isEssential: false, color: colorByIndex(7), status: 'confirmado' },
    ],
  },
];

const INITIAL_OCCUPIED_SLOTS: GroupOccupiedSlot[] = [
  { id: '101', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: colorByIndex(1), day: 'Lun', startTime: '08:00', endTime: '12:00', title: 'Clase Redes' },
  { id: '102', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: colorByIndex(2), day: 'Lun', startTime: '09:00', endTime: '13:00', title: 'Prácticas Pro' },
  { id: '103', userEmail: 'lucia.t@huecko.com', userName: 'Lucía T.', userColor: colorByIndex(3), day: 'Mar', startTime: '08:00', endTime: '11:00', title: 'Laboratorio' },
  { id: '104', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: colorByIndex(1), day: 'Mar', startTime: '14:00', endTime: '18:00', title: 'Turno Tarde' },
  { id: '105', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: colorByIndex(2), day: 'Mié', startTime: '08:00', endTime: '10:30', title: 'Cálculo' },
  { id: '106', userEmail: 'lucia.t@huecko.com', userName: 'Lucía T.', userColor: colorByIndex(3), day: 'Jue', startTime: '10:00', endTime: '14:00', title: 'Inglés VI' },
  { id: '107', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: colorByIndex(1), day: 'Vie', startTime: '08:00', endTime: '11:00', title: 'Arquitectura' },
  { id: '108', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: colorByIndex(2), day: 'Vie', startTime: '11:00', endTime: '15:00', title: 'Trabajo' },
  { id: '109', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: colorByIndex(0), day: 'Lun', startTime: '08:00', endTime: '11:00', title: 'Universidad' },
  { id: '110', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: colorByIndex(0), day: 'Mié', startTime: '08:00', endTime: '10:00', title: 'Universidad' },
  { id: '111', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: colorByIndex(0), day: 'Vie', startTime: '08:00', endTime: '11:00', title: 'Universidad' },
];

const INITIAL_PROPOSALS: PlanProposal[] = [
  {
    id: 'prop-1',
    groupId: '1',
    titulo: 'Reunión de Trabajo de Grado & Cierre',
    lugar: 'Biblioteca Central / Google Meet',
    creadoPor: 'Alex R.',
    plazoVotacion: 'Finalizada',
    estado: 'en_recoordinacion',
    ventanasSugeridas: [
      { id: 'w1', dia: 'Mié', horaInicio: '11:00', horaFin: '13:00', disponibilidadPorcentaje: 100, votosUsuarios: ['alex.rodriguez@huecko.com', 'maria.c@huecko.com', 'sam.p@huecko.com'] },
    ],
    incidencias: [
      {
        id: 'inc-1',
        userEmail: 'maria.c@huecko.com',
        userName: 'María C.',
        tipo: 'falta',
        motivo: 'Tengo un cruce de examen de laboratorio a última hora.',
        fechaReporte: 'Hace 10 min',
      },
    ],
    votosReplanificacion: { cancel: [], reschedule: ['maria.c@huecko.com'], keep: [] },
  },
  {
    id: 'prop-2',
    groupId: '2',
    titulo: 'Pichanga & Parrilla de Domingo',
    lugar: 'Canchas El Golazo',
    creadoPor: 'Carlos M.',
    plazoVotacion: 'Cierra hoy a las 20:00',
    estado: 'propuesto',
    ventanasSugeridas: [
      { id: 'w-101', dia: 'Sáb', horaInicio: '16:00', horaFin: '18:00', disponibilidadPorcentaje: 85, votosUsuarios: ['alex.rodriguez@huecko.com', 'carlos.m@huecko.com'] },
      { id: 'w-102', dia: 'Dom', horaInicio: '11:00', horaFin: '13:00', disponibilidadPorcentaje: 100, votosUsuarios: ['carlos.m@huecko.com'] },
      { id: 'w-103', dia: 'Dom', horaInicio: '15:00', horaFin: '17:00', disponibilidadPorcentaje: 70, votosUsuarios: [] },
    ],
    votosReplanificacion: { cancel: [], reschedule: [], keep: [] },
  },
  {
    id: 'prop-3',
    groupId: '1',
    titulo: 'Reunión de Avance de Tesis',
    lugar: 'Google Meet / Biblioteca',
    creadoPor: 'Alex R.',
    plazoVotacion: 'Cierra mañana a las 12:00',
    estado: 'propuesto',
    ventanasSugeridas: [
      { id: 'w-201', dia: 'Mié', horaInicio: '14:00', horaFin: '16:00', disponibilidadPorcentaje: 100, votosUsuarios: ['sam.p@huecko.com'] },
      { id: 'w-202', dia: 'Jue', horaInicio: '10:00', horaFin: '12:00', disponibilidadPorcentaje: 75, votosUsuarios: ['alex.rodriguez@huecko.com'] },
    ],
    votosReplanificacion: { cancel: [], reschedule: [], keep: [] },
  },
];

/**
 * Cierra la votación exprés en cuanto hay mayoría y aplica lo decidido.
 *
 * Antes los votos solo se acumulaban: nadie decidía nada, el plan se quedaba
 * en re-coordinación indefinidamente y quien había avisado podía volver a
 * avisar, lo que reabría la votación una y otra vez.
 *
 * En caso de empate gana la opción menos disruptiva: mantener antes que
 * reprogramar, y reprogramar antes que cancelar.
 */
function resolverVotacionExpres(proposal: PlanProposal, miembros: number): PlanProposal {
  if (miembros <= 0) return proposal;

  const votos = proposal.votosReplanificacion ?? { cancel: [], reschedule: [], keep: [] };
  const emitidos = votos.cancel.length + votos.reschedule.length + votos.keep.length;
  const mayoria = Math.min(Math.floor(miembros / 2) + 1, miembros);
  if (emitidos < mayoria) return proposal;

  const preferencia = [
    ['keep', votos.keep.length],
    ['reschedule', votos.reschedule.length],
    ['cancel', votos.cancel.length],
  ] as const;
  const [ganadora] = preferencia.reduce((mejor, actual) => (actual[1] > mejor[1] ? actual : mejor));

  const ESTADO_POR_OPCION: Record<typeof ganadora, PlanProposal['estado']> = {
    cancel: 'cancelado',
    reschedule: 'propuesto',
    keep: 'confirmado',
  };
  const estado = ESTADO_POR_OPCION[ganadora];

  return {
    ...proposal,
    estado,
    votosReplanificacion: { cancel: [], reschedule: [], keep: [] },
    incidencias: (proposal.incidencias ?? []).map((i) => ({ ...i, resuelta: true })),
    /* Reprogramar es volver a elegir hora: los votos de la ronda anterior ya
       no dicen nada sobre las ventanas nuevas. */
    ventanasSugeridas:
      ganadora === 'reschedule'
        ? proposal.ventanasSugeridas.map((v) => ({ ...v, votosUsuarios: [] }))
        : proposal.ventanasSugeridas,
  };
}

/**
 * Cada cambio local de la lista de grupos (crear, añadir integrante, cerrar
 * sesión) sube este número. Una respuesta de `fetchGroupsFromServer` que salió
 * antes se descarta al llegar: si no, podía borrar el grupo recién creado o,
 * tras cambiar de cuenta, meter los grupos de la cuenta anterior.
 */
let generacionGrupos = 0;
/** La petición de grupos en curso, para no lanzar dos a la vez. */
let cargaDeGruposEnCurso: Promise<void> | null = null;
/** Identifica esa petición; `reset` lo borra para que su respuesta se ignore. */
let turnoDeCarga: symbol | null = null;

/**
 * Estado de partida. Los datos de ejemplo solo existen en modo demo: con
 * backend conectado, alguien recién llegado no debe ver grupos ajenos ni
 * siquiera durante el instante que tarda la primera carga.
 */
function estadoInicial() {
  return {
    groups: isApiEnabled ? [] : INITIAL_GROUPS,
    selectedGroupId: isApiEnabled ? null : '1',
    occupiedSlots: isApiEnabled ? [] : INITIAL_OCCUPIED_SLOTS,
    groupProposals: isApiEnabled ? [] : INITIAL_PROPOSALS,
    availability: {},
    isLoading: false,
    groupsLoaded: !isApiEnabled,
    syncError: null,
  };
}

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set, get) => ({
      ...estadoInicial(),

      setSelectedGroupId: (id) => set({ selectedGroupId: id }),

      clearSyncError: () => set({ syncError: null }),

      reset: () => {
        generacionGrupos++;
        cargaDeGruposEnCurso = null;
        turnoDeCarga = null;
        set(estadoInicial());
      },

      /**
       * En modo conectado la lista del servidor SUSTITUYE a la local, incluso
       * si viene vacía: antes se conservaban los grupos de demo cuando el
       * servidor no devolvía ninguno, así que alguien recién registrado veía
       * grupos a los que no pertenece.
       */
      fetchGroupsFromServer: () => {
        if (!isApiEnabled) return Promise.resolve();
        if (cargaDeGruposEnCurso) return cargaDeGruposEnCurso;

        const generacion = generacionGrupos;
        const turno = Symbol('carga-de-grupos');
        turnoDeCarga = turno;
        set({ isLoading: true, syncError: null });

        const carga = (async () => {
          try {
            const serverGroups = await groupsService.getGroups();
            // Se cerró sesión mientras tanto: la respuesta es de otra cuenta.
            if (turnoDeCarga !== turno) return;

            set((state) => {
              /* Si mientras llegaba la respuesta se creó un grupo o se añadió
                 a alguien, la versión local es más nueva que la del servidor
                 y se conserva. */
              const cambiosLocales = generacion !== generacionGrupos;
              const locales = new Map(state.groups.map((g) => [g.id, g]));
              const groups = cambiosLocales
                ? [
                    ...serverGroups.map((g) => locales.get(g.id) ?? g),
                    ...state.groups.filter((g) => !serverGroups.some((sg) => sg.id === g.id)),
                  ]
                : serverGroups;

              return {
                groups,
                selectedGroupId: groups.some((g) => g.id === state.selectedGroupId)
                  ? state.selectedGroupId
                  : groups[0]?.id ?? null,
                isLoading: false,
                groupsLoaded: true,
              };
            });

            /* Los planes de cada grupo alimentan el panel de inicio (próximo
               evento, votaciones pendientes). Sin esto solo aparecían tras
               abrir cada grupo por separado. */
            await Promise.all(get().groups.map((g) => get().fetchProposals(g.id)));
          } catch (error) {
            if (turnoDeCarga !== turno) return;
            const msg = error instanceof Error ? error.message : 'Error al conectar grupos con el servidor';
            set({ syncError: msg, isLoading: false, groupsLoaded: true });
          } finally {
            if (turnoDeCarga === turno) {
              turnoDeCarga = null;
              cargaDeGruposEnCurso = null;
            }
          }
        })();

        cargaDeGruposEnCurso = carga;
        return carga;
      },

      /**
       * RF-05 / RF-07. Se vuelve a pedir en cada apertura del panel y tras
       * cambiar el umbral: el backend lo recalcula sobre los bloques vigentes,
       * así que nunca se sirve un cruce viejo.
       */
      fetchAvailability: async (groupId, threshold) => {
        if (!isApiEnabled) return;

        try {
          const cruce = await groupsService.getAvailability(groupId, threshold);
          set((state) => ({ availability: { ...state.availability, [groupId]: cruce } }));
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Error al calcular la disponibilidad';
          set({ syncError: msg });
        }
      },

      createGroup: async (nombre, descripcion, umbralDisponibilidad, userEmail, userName) => {
        if (isApiEnabled) {
          const created = await groupsService.createGroup({
            nombre,
            descripcion,
            umbral_disponibilidad: umbralDisponibilidad,
          });
          generacionGrupos++;
          set((state) => ({
            groups: [...state.groups, created],
            selectedGroupId: created.id,
          }));
          return created;
        }

        {
          const newGroup: Group = {
            id: `group-${Date.now()}`,
            nombre,
            descripcion,
            creadoPor: userEmail,
            umbralDisponibilidad,
            miembros: [
              { email: userEmail, nombre: userName, isEssential: true, color: colorByIndex(0), status: 'confirmado' },
            ],
          };
          set((state) => ({
            groups: [...state.groups, newGroup],
            selectedGroupId: newGroup.id,
          }));
          return newGroup;
        }
      },

      /**
       * Da de alta a alguien en el grupo, por correo.
       *
       * Sustituye a `joinGroupByCode`. El cambio no es solo de dato: antes
       * quien entraba era quien tenía el código, ahora es el organizador quien
       * decide. Por eso recibe el grupo: ya no hay que buscarlo por una cadena.
       *
       * Devuelve `false` si no hay ninguna cuenta con ese correo (404), que es
       * un caso normal que la interfaz sabe explicar. Cualquier otro fallo sube.
       */
      addMemberByEmail: async (groupId, email) => {
        if (isApiEnabled) {
          try {
            const actualizado = await groupsService.addMember(groupId, email);
            generacionGrupos++;
            set((state) => ({
              groups: state.groups.map((g) => (g.id === groupId ? actualizado : g)),
            }));
            return true;
          } catch (error) {
            if (error instanceof ApiError && error.status === 404) return false;
            throw error;
          }
        }

        // Modo demo: se añade con los datos que hay, sin comprobar cuentas.
        const grupo = get().groups.find((g) => g.id === groupId);
        if (!grupo) return false;
        if (grupo.miembros.some((m) => m.email === email)) return true;

        const nuevos: GroupMember[] = [
          ...grupo.miembros,
          {
            email,
            nombre: email.split('@')[0],
            isEssential: false,
            color: colorByIndex(grupo.miembros.length),
            status: 'confirmado',
          },
        ];
        set((s) => ({
          groups: s.groups.map((g) => (g.id === groupId ? { ...g, miembros: nuevos } : g)),
        }));
        return true;
      },

      addMembersByEmail: async (groupId, emails) => {
        const resultado: ResultadoAltas = { sinCuenta: [], fallidos: [] };

        /* En serie y no con Promise.all: cada alta devuelve el grupo entero y
           en paralelo la última respuesta en llegar pisaría a las demás. */
        for (const email of emails) {
          try {
            const ok = await get().addMemberByEmail(groupId, email);
            if (!ok) resultado.sinCuenta.push(email);
          } catch {
            resultado.fallidos.push(email);
          }
        }

        return resultado;
      },

      /**
       * RF-06. Se aplica en local primero para que el deslizador responda al
       * instante, igual que hace la rejilla de horario, y el cruce se vuelve a
       * pedir después porque el umbral cambia qué casillas cumplen (RF-07).
       */
      updateGroupThreshold: async (groupId, threshold) => {
        const anterior = get().groups.find((g) => g.id === groupId)?.umbralDisponibilidad;

        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? { ...g, umbralDisponibilidad: threshold } : g)),
        }));

        if (!isApiEnabled) return;

        try {
          await groupsService.updateGroup(groupId, { umbral_disponibilidad: threshold });
          await get().fetchAvailability(groupId);
        } catch (error) {
          // El servidor mandó (p. ej. 403 si quien lo mueve no es el
          // organizador): se deshace el cambio para no dejar en pantalla un
          // umbral que nadie más ve.
          if (anterior != null) {
            set((state) => ({
              groups: state.groups.map((g) =>
                g.id === groupId ? { ...g, umbralDisponibilidad: anterior } : g
              ),
            }));
          }
          set({ syncError: error instanceof Error ? error.message : 'No se pudo guardar el umbral' });
        }
      },

      toggleMemberEssential: async (groupId, memberEmail) => {
        const group = get().groups.find((g) => g.id === groupId);
        const member = group?.miembros.find((m) => m.email === memberEmail);
        if (!member) return;

        const nuevoEstado = !member.isEssential;
        const userId = member.userId ?? member.id;

        if (isApiEnabled && userId) {
          try {
            const actualizado = await groupsService.updateMember(groupId, userId, {
              esImprescindible: nuevoEstado,
            });
            set((state) => ({
              groups: state.groups.map((g) => (g.id === groupId ? actualizado : g)),
            }));
            return;
          } catch (error) {
            set({
              syncError:
                error instanceof Error ? error.message : 'No se pudo actualizar al integrante',
            });
            return;
          }
        }

        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g;
            const updatedMembers = g.miembros.map((m) =>
              m.email === memberEmail ? { ...m, isEssential: nuevoEstado } : m
            );
            return { ...g, miembros: updatedMembers };
          }),
        }));
      },

      /**
       * RF-08 a RF-10. Los planes de un grupo sustituyen a los que hubiera de
       * ese mismo grupo; los de los demas se dejan intactos, porque cada grupo
       * se consulta por separado.
       */
      fetchProposals: async (groupId) => {
        if (!isApiEnabled) return;

        const miembros = get().groups.find((g) => g.id === groupId)?.miembros ?? [];
        try {
          const planes = await plansService.getPlans(groupId, miembros);
          set((state) => {
            /* Los avisos propios solo viven en el cliente (el backend no los
               devuelve con el plan). Se conservan al recargar: si no, «Ya
               avisaste» desaparecía y se podía volver a avisar. */
            const anteriores = new Map(state.groupProposals.map((p) => [p.id, p]));
            const conAvisos = planes.map((plan) => {
              const anterior = anteriores.get(plan.id);
              if (!anterior?.incidencias) return plan;

              /* Si el plan vuelve a votación después de haber estado confirmado
                 o en re-coordinación, es una ronda nueva (se repropusieron
                 fechas): los avisos de la fecha anterior quedan resueltos. Sin
                 esto, quien avisó seguía viendo "Ya avisaste" y no podía avisar
                 de la fecha nueva. */
              const rondaNueva = plan.estado === 'propuesto' && anterior.estado !== 'propuesto';
              return {
                ...plan,
                incidencias: rondaNueva
                  ? anterior.incidencias.map((i) => ({ ...i, resuelta: true }))
                  : anterior.incidencias,
              };
            });
            return {
              groupProposals: [
                ...conAvisos,
                ...state.groupProposals.filter((p) => p.groupId !== groupId),
              ],
            };
          });
        } catch (error) {
          set({
            syncError: error instanceof Error ? error.message : 'No se pudieron cargar los planes',
          });
        }
      },

      addProposal: async (proposalData, backendPayload) => {
        if (isApiEnabled && backendPayload) {
          const miembros = get().groups.find((g) => g.id === proposalData.groupId)?.miembros ?? [];
          // Sin capturar el error: el backend rechaza las ventanas que no
          // cumplen el umbral (RF-08) y ese mensaje tiene que llegar a quien
          // propone, no perderse en un fallback silencioso.
          const creado = await plansService.createPlan(proposalData.groupId, backendPayload, miembros);
          set((state) => ({ groupProposals: [creado, ...state.groupProposals] }));
          return;
        }

        set((state) => ({
          groupProposals: [
            { ...proposalData, id: `prop-${Date.now()}` },
            ...state.groupProposals,
          ],
        }));
      },

      /**
       * RF-09. Pulsar una ventana alterna el voto: si ya estaba marcada, se
       * retira. El backend responde con el plan entero ya recontado, asi que
       * no hace falta recalcular el recuento en el cliente.
       */
      voteProposalWindow: async (proposalId, windowId, userEmail) => {
        const plan = get().groupProposals.find((p) => p.id === proposalId);
        const yaVotada = plan?.ventanasSugeridas
          .find((w) => w.id === windowId)
          ?.votosUsuarios.includes(userEmail) ?? false;

        if (isApiEnabled) {
          const miembros = get().groups.find((g) => g.id === plan?.groupId)?.miembros ?? [];
          try {
            const actualizado = yaVotada
              ? await plansService.removeVote(proposalId, windowId, miembros)
              : await plansService.vote(proposalId, windowId, miembros);
            set((state) => ({
              groupProposals: state.groupProposals.map((p) =>
                p.id === proposalId ? { ...p, ...actualizado } : p
              ),
            }));
            return true;
          } catch (error) {
            set({
              syncError: error instanceof Error ? error.message : 'No se pudo registrar tu voto',
            });
            return false;
          }
        }

        set((state) => ({
          groupProposals: state.groupProposals.map((p) => {
            if (p.id !== proposalId || p.estado === 'confirmado') return p;
            const updatedWindows = p.ventanasSugeridas.map((w) => {
              if (w.id === windowId) {
                const newVotes = yaVotada
                  ? w.votosUsuarios.filter((e) => e !== userEmail)
                  : [...w.votosUsuarios, userEmail];
                return { ...w, votosUsuarios: newVotes };
              }
              return w;
            });
            return { ...p, ventanasSugeridas: updatedWindows };
          }),
        }));
        return true;
      },

      reproponerPlan: async (proposalId, ventanas, plazoVotacion, backendPayload) => {
        /* Los avisos y los votos de re-coordinación eran de la ronda anterior:
           con fechas nuevas no dicen nada, así que se descartan. */
        const nuevaRonda = (p: PlanProposal, cambios: Partial<PlanProposal>): PlanProposal => ({
          ...p,
          ...cambios,
          incidencias: (p.incidencias ?? []).map((i) => ({ ...i, resuelta: true })),
          votosReplanificacion: { cancel: [], reschedule: [], keep: [] },
        });

        if (isApiEnabled && backendPayload) {
          const plan = get().groupProposals.find((p) => p.id === proposalId);
          const miembros = get().groups.find((g) => g.id === plan?.groupId)?.miembros ?? [];
          // Sin capturar: si alguna ventana no cumple el umbral, el motivo del
          // servidor tiene que verse en el formulario.
          const actualizado = await plansService.repropose(proposalId, backendPayload, miembros);
          set((state) => ({
            groupProposals: state.groupProposals.map((p) =>
              p.id === proposalId ? nuevaRonda(p, actualizado) : p
            ),
          }));
          return;
        }

        set((state) => ({
          groupProposals: state.groupProposals.map((p) =>
            p.id === proposalId
              ? nuevaRonda(p, {
                  estado: 'propuesto',
                  plazoVotacion,
                  ventanasSugeridas: ventanas.map((v) => ({ ...v, votosUsuarios: [] })),
                })
              : p
          ),
        }));
      },

      closeVotingManually: async (proposalId) => {
        if (isApiEnabled) {
          const plan = get().groupProposals.find((p) => p.id === proposalId);
          const miembros = get().groups.find((g) => g.id === plan?.groupId)?.miembros ?? [];
          try {
            const cerrado = await plansService.closeVoting(proposalId, miembros);
            // El estado lo decide el servidor: si nadie voto, el plan queda
            // CANCELADO y no confirmado (RF-10).
            set((state) => ({
              groupProposals: state.groupProposals.map((p) =>
                p.id === proposalId ? { ...p, ...cerrado } : p
              ),
            }));
            return cerrado.estado;
          } catch (error) {
            set({
              syncError: error instanceof Error ? error.message : 'No se pudo cerrar la votación',
            });
            return null;
          }
        }

        set((state) => ({
          groupProposals: state.groupProposals.map((p) =>
            p.id === proposalId ? { ...p, estado: 'confirmado' } : p
          ),
        }));
        return 'confirmado';
      },

      reportIncident: async (proposalId, incidenceData) => {
        const esTardanza = incidenceData.tipo === 'tardanza';

        /* Una tardanza es Módulo 4: avisa, pero el plan sigue en pie (RF-13).
           Solo una ausencia puede replantearlo, y con backend eso lo decide el
           servidor (RF-16 y RF-19). En modo demo no hay quien decida y se
           mantiene la simulación: toda ausencia replantea. */
        let resultado: ResultadoIncidencia = {
          replantea: !esTardanza,
          criticidad: null,
        };

        if (isApiEnabled) {
          // Sin try/catch a propósito: si el servidor rechaza el aviso, la
          // página tiene que enterarse y no aplicar nada en local.
          // Se pasa por `incidentsStore` y no directo al servicio: así el
          // retraso o la votación exprés aparecen al momento en el panel del
          // evento, sin esperar al WebSocket.
          const incidencias = useIncidentsStore.getState();
          if (esTardanza) {
            await incidencias.reportarRetraso(
              proposalId,
              incidenceData.minutosTardanza ?? MINUTOS_TARDANZA_POR_DEFECTO
            );
          } else {
            const res = await incidencias.reportarImprevisto(proposalId, incidenceData.motivo);
            resultado = {
              replantea: res?.votacion != null,
              criticidad: res?.criticidad ?? null,
              razon: res?.razon,
            };
          }
        }

        /* Con backend el plan sigue CONFIRMADO mientras la votación exprés está
           abierta: el servidor solo lo cambia al cerrarla (y llega por
           WebSocket). Cambiarlo aquí escondía el evento del panel de inicio
           justo cuando había que votar. En modo demo no hay servidor y se
           simula la re-coordinación en local. */
        const replanteaEnLocal = resultado.replantea && !isApiEnabled;

        set((state) => {
          const newIncidence: PlanIncidence = {
            ...incidenceData,
            id: `inc-${Date.now()}`,
            fechaReporte: 'Ahora',
          };
          return {
            groupProposals: state.groupProposals.map((p) => {
              if (p.id !== proposalId) return p;

              // Sobre un plan cancelado ya no hay nada que avisar.
              if (p.estado === 'cancelado') return p;

              const current = p.incidencias || [];
              /* Una incidencia abierta por persona. Sin esta guarda, quien
                 avisa puede volver a avisar en cuanto ha votado, y el plan no
                 sale nunca de la re-coordinación. */
              const yaAviso = current.some(
                (i) => i.userEmail === incidenceData.userEmail && !i.resuelta
              );
              if (yaAviso) return p;

              return {
                ...p,
                estado:
                  replanteaEnLocal && p.estado === 'confirmado' ? 'en_recoordinacion' : p.estado,
                incidencias: [newIncidence, ...current],
              };
            }),
          };
        });

        return resultado;
      },

      voteReplanification: async (proposalId, action, userEmail) => {
        if (isApiEnabled) {
          try {
            await eventsService.voteExpress(proposalId, action);
          } catch (error) {
            // Un voto que el servidor no guardó no se pinta: nadie más lo vería.
            set({
              syncError: error instanceof Error ? error.message : 'No se pudo registrar tu voto',
            });
            return;
          }
        }

        set((state) => ({
          groupProposals: state.groupProposals.map((p) => {
            if (p.id !== proposalId) return p;
            // Solo se vota mientras hay algo que decidir.
            if (p.estado !== 'en_recoordinacion') return p;

            const currentVotes = p.votosReplanificacion || { cancel: [], reschedule: [], keep: [] };

            const cleanCancel = currentVotes.cancel.filter((e) => e !== userEmail);
            const cleanReschedule = currentVotes.reschedule.filter((e) => e !== userEmail);
            const cleanKeep = currentVotes.keep.filter((e) => e !== userEmail);

            if (action === 'cancel') cleanCancel.push(userEmail);
            if (action === 'reschedule') cleanReschedule.push(userEmail);
            if (action === 'keep') cleanKeep.push(userEmail);

            const conVoto: PlanProposal = {
              ...p,
              votosReplanificacion: {
                cancel: cleanCancel,
                reschedule: cleanReschedule,
                keep: cleanKeep,
              },
            };

            const miembros = state.groups.find((g) => g.id === p.groupId)?.miembros.length ?? 0;
            return resolverVotacionExpres(conVoto, miembros);
          }),
        }));
      },

      withdrawIncident: async (proposalId, userEmail) => {
        const aviso = get()
          .groupProposals.find((p) => p.id === proposalId)
          ?.incidencias?.find((i) => i.userEmail === userEmail && !i.resuelta);

        /* Una tardanza vive en el servidor (Módulo 4) y se retira allí. Si el
           servidor no la retira, tampoco se quita de la pantalla: el resto del
           grupo seguiría viéndola. */
        /* Una ausencia ya reportada no se puede retirar: el backend no tiene
           ese endpoint y la votación que abrió sigue para todo el grupo.
           Quitarla solo de esta pantalla sería mentir. */
        if (isApiEnabled && aviso && aviso.tipo !== 'tardanza') {
          set({
            syncError:
              'Una ausencia ya reportada no se puede retirar. Si al final puedes ir, vota «Mantener» en la votación del plan.',
          });
          return false;
        }

        if (isApiEnabled && aviso?.tipo === 'tardanza') {
          try {
            const usuarioId = useAuthStore.getState().user?.id ?? '';
            await useIncidentsStore.getState().retirarRetraso(proposalId, usuarioId);
          } catch (error) {
            set({
              syncError: error instanceof Error ? error.message : 'No se pudo retirar el aviso',
            });
            return false;
          }
        }

        set((state) => ({
          groupProposals: state.groupProposals.map((p) => {
            if (p.id !== proposalId) return p;

            const restantes = (p.incidencias || []).filter(
              (i) => !(i.userEmail === userEmail && !i.resuelta)
            );
            const quedanAbiertas = restantes.some((i) => !i.resuelta);

            /* Si era el único aviso abierto, el plan vuelve a estar confirmado
               y la votación desaparece: votar sobre un problema retirado no
               decide nada. */
            return {
              ...p,
              incidencias: restantes,
              estado:
                !quedanAbiertas && p.estado === 'en_recoordinacion' ? 'confirmado' : p.estado,
              votosReplanificacion: quedanAbiertas
                ? p.votosReplanificacion
                : { cancel: [], reschedule: [], keep: [] },
            };
          }),
        }));
        return true;
      },
    }),
    {
      name: 'huecko-groups',
      /* Solo los datos. Carga, errores y el cruce son de esta sesión: un
         `isLoading: true` guardado dejaría la pantalla cargando para siempre
         al volver a abrir la app. */
      partialize: (state) => ({
        groups: state.groups,
        selectedGroupId: state.selectedGroupId,
        occupiedSlots: state.occupiedSlots,
        groupProposals: state.groupProposals,
      }),
    }
  )
);
