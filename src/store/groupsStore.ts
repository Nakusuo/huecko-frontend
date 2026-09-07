import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiError, isApiEnabled } from '../lib/apiClient';
import { groupsService } from '../services/groupsService';
import { eventsService } from '../services/eventsService';
import { plansService, type CrearPlanPayload } from '../services/plansService';
import type {
  Group,
  GroupAvailability,
  GroupMember,
  PlanProposal,
  PlanIncidence,
  TimeWindowProposal,
} from '../types/groups.types';
import type { DayOfWeek } from '../types/schedule.types';
import { colorByIndex } from '../theme/palette';

export type { Group, GroupMember, PlanProposal, PlanIncidence, TimeWindowProposal, DayOfWeek };

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
  syncError: string | null;

  setSelectedGroupId: (id: string) => void;
  fetchGroupsFromServer: () => Promise<void>;
  fetchAvailability: (groupId: string, threshold?: number) => Promise<void>;
  fetchProposals: (groupId: string) => Promise<void>;
  createGroup: (nombre: string, descripcion: string, umbralDisponibilidad: number, userEmail: string, userName: string) => Promise<Group>;
  addMemberByEmail: (groupId: string, email: string) => Promise<boolean>;
  updateGroupThreshold: (groupId: string, threshold: number) => Promise<void>;
  toggleMemberEssential: (groupId: string, memberEmail: string) => Promise<void>;

  /**
   * `backendPayload` lleva la propuesta ya en el formato del Módulo 3 (fechas
   * concretas e instante de cierre). Va aparte del objeto de demo porque son
   * dos formas distintas del mismo plan: la de la UI razona en días de la
   * semana, y la del backend necesita fechas.
   */
  addProposal: (proposal: Omit<PlanProposal, 'id'>, backendPayload?: CrearPlanPayload) => Promise<void>;
  voteProposalWindow: (proposalId: string, windowId: string, userEmail: string) => Promise<void>;
  closeVotingManually: (proposalId: string) => Promise<void>;
  reportIncident: (proposalId: string, incidence: Omit<PlanIncidence, 'id' | 'fechaReporte'>) => Promise<void>;
  voteReplanification: (proposalId: string, action: 'cancel' | 'reschedule' | 'keep', userEmail: string) => Promise<void>;
  withdrawIncident: (proposalId: string, userEmail: string) => void;
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

  const estado: PlanProposal['estado'] =
    ganadora === 'cancel' ? 'cancelado' : ganadora === 'reschedule' ? 'propuesto' : 'confirmado';

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

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set, get) => ({
      groups: INITIAL_GROUPS,
      selectedGroupId: '1',
      occupiedSlots: INITIAL_OCCUPIED_SLOTS,
      groupProposals: INITIAL_PROPOSALS,
      availability: {},
      isLoading: false,
      syncError: null,

      setSelectedGroupId: (id) => set({ selectedGroupId: id }),

      /**
       * En modo conectado la lista del servidor SUSTITUYE a la local, incluso
       * si viene vacía: antes se conservaban los grupos de demo cuando el
       * servidor no devolvía ninguno, así que alguien recién registrado veía
       * grupos a los que no pertenece.
       */
      fetchGroupsFromServer: async () => {
        if (!isApiEnabled) return;

        set({ isLoading: true, syncError: null });
        try {
          const serverGroups = await groupsService.getGroups();
          set((state) => ({
            groups: serverGroups,
            selectedGroupId: serverGroups.some((g) => g.id === state.selectedGroupId)
              ? state.selectedGroupId
              : serverGroups[0]?.id ?? null,
            isLoading: false,
          }));
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Error al conectar grupos con el servidor';
          set({ syncError: msg, isLoading: false });
        }
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
          set((state) => ({
            groupProposals: [
              ...planes,
              ...state.groupProposals.filter((p) => p.groupId !== groupId),
            ],
          }));
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
          } catch (error) {
            set({
              syncError: error instanceof Error ? error.message : 'No se pudo registrar tu voto',
            });
          }
          return;
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
          } catch (error) {
            set({
              syncError: error instanceof Error ? error.message : 'No se pudo cerrar la votacion',
            });
          }
          return;
        }

        set((state) => ({
          groupProposals: state.groupProposals.map((p) =>
            p.id === proposalId ? { ...p, estado: 'confirmado' } : p
          ),
        }));
      },

      reportIncident: async (proposalId, incidenceData) => {
        /* RF-16: la criticidad la decide el servidor, no el cliente. En modo
           demo no hay servidor y `criticidad` viene nula: entonces se conserva
           el comportamiento anterior, que asumía que toda baja replantea. */
        let replantea = true;
        try {
          const res = await eventsService.reportIncident(proposalId, {
            reason: incidenceData.motivo,
            type: incidenceData.tipo,
            // El numero va explicito: antes se sacaba de la frase "Llegara con 20
            // minutos de retraso" con una expresion regular.
            minutos: incidenceData.minutosTardanza,
          });
          /* RF-19: una baja NO crítica no reabre la coordinación. Antes de
             tener las reglas en el servidor, cualquier aviso mandaba el plan a
             re-coordinación, y bastaba con que faltara alguien prescindible
             para dejar en el aire un plan que seguía en pie. */
          if (res.criticidad !== null) replantea = res.abrioVotacion;
        } catch {
          // Sin servidor se mantiene la simulación local.
        }

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
                  replantea && p.estado === 'confirmado' ? 'en_recoordinacion' : p.estado,
                incidencias: [newIncidence, ...current],
              };
            }),
          };
        });
      },

      voteReplanification: async (proposalId, action, userEmail) => {
        try {
          await eventsService.voteExpress(proposalId, action);
        } catch {
          // Fallback
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

      withdrawIncident: (proposalId, userEmail) => {
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
      },
    }),
    {
      name: 'huecko-groups',
    }
  )
);
