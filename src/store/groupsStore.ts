import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { groupsService } from '../services/groupsService';
import { eventsService } from '../services/eventsService';
import type {
  Group,
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
  isLoading: boolean;
  syncError: string | null;

  setSelectedGroupId: (id: string) => void;
  fetchGroupsFromServer: () => Promise<void>;
  createGroup: (nombre: string, descripcion: string, umbralDisponibilidad: number, userEmail: string, userName: string) => Promise<Group>;
  joinGroupByCode: (codigo: string, userEmail: string, userName: string) => Promise<boolean>;
  updateGroupThreshold: (groupId: string, threshold: number) => Promise<void>;
  toggleMemberEssential: (groupId: string, memberEmail: string) => Promise<void>;

  addProposal: (proposal: Omit<PlanProposal, 'id'>) => Promise<void>;
  voteProposalWindow: (proposalId: string, windowId: string, userEmail: string) => Promise<void>;
  closeVotingManually: (proposalId: string) => Promise<void>;
  reportIncident: (proposalId: string, incidence: Omit<PlanIncidence, 'id' | 'fechaReporte'>) => Promise<void>;
  voteReplanification: (proposalId: string, action: 'cancel' | 'reschedule' | 'keep', userEmail: string) => Promise<void>;
}

const INITIAL_GROUPS: Group[] = [
  {
    id: '1',
    nombre: 'Grupo Universitario - Ing. Software',
    descripcion: 'Coordinación para proyecto final, entregables y sesiones de estudio de fin de ciclo.',
    codigoInvitacion: 'UNIV-2026',
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
    codigoInvitacion: 'WEEKEND-99',
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
    estado: 'confirmado',
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

export const useGroupsStore = create<GroupsState>()(
  persist(
    (set, get) => ({
      groups: INITIAL_GROUPS,
      selectedGroupId: '1',
      occupiedSlots: INITIAL_OCCUPIED_SLOTS,
      groupProposals: INITIAL_PROPOSALS,
      isLoading: false,
      syncError: null,

      setSelectedGroupId: (id) => set({ selectedGroupId: id }),

      fetchGroupsFromServer: async () => {
        set({ isLoading: true, syncError: null });
        try {
          const serverGroups = await groupsService.getGroups();
          if (serverGroups && serverGroups.length > 0) {
            set({ groups: serverGroups, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Error al conectar grupos con el servidor';
          set({ syncError: msg, isLoading: false });
        }
      },

      createGroup: async (nombre, descripcion, umbralDisponibilidad, userEmail, userName) => {
        try {
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
        } catch {
          const newGroup: Group = {
            id: `group-${Date.now()}`,
            nombre,
            descripcion,
            codigoInvitacion: `HUECKO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
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

      joinGroupByCode: async (codigo, userEmail, userName) => {
        try {
          const joinedGroup = await groupsService.joinGroup({ codigo_invitacion: codigo });
          set((state) => {
            const exists = state.groups.some((g) => g.id === joinedGroup.id);
            return {
              groups: exists
                ? state.groups.map((g) => (g.id === joinedGroup.id ? joinedGroup : g))
                : [...state.groups, joinedGroup],
              selectedGroupId: joinedGroup.id,
            };
          });
          return true;
        } catch {
          // Fallback local
          const state = get();
          const targetGroup = state.groups.find(
            (g) => g.codigoInvitacion.trim().toUpperCase() === codigo.trim().toUpperCase()
          );
          if (!targetGroup) return false;

          const alreadyMember = targetGroup.miembros.some((m) => m.email === userEmail);
          if (alreadyMember) {
            set({ selectedGroupId: targetGroup.id });
            return true;
          }

          const updatedMembers: GroupMember[] = [
            ...targetGroup.miembros,
            { email: userEmail, nombre: userName, isEssential: false, color: colorByIndex(3), status: 'confirmado' },
          ];

          set((s) => ({
            groups: s.groups.map((g) => (g.id === targetGroup.id ? { ...g, miembros: updatedMembers } : g)),
            selectedGroupId: targetGroup.id,
          }));
          return true;
        }
      },

      updateGroupThreshold: async (groupId, threshold) => {
        try {
          await groupsService.updateGroup(groupId, { umbral_disponibilidad: threshold });
        } catch {
          // Offline fallback
        }
        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? { ...g, umbralDisponibilidad: threshold } : g)),
        }));
      },

      toggleMemberEssential: async (groupId, memberEmail) => {
        const group = get().groups.find((g) => g.id === groupId);
        const member = group?.miembros.find((m) => m.email === memberEmail);
        const newEssentialState = !member?.isEssential;

        try {
          if (member?.userId || member?.id) {
            await groupsService.updateMemberRole(groupId, member.userId || member.id || '', {
              es_imprescindible: newEssentialState,
            });
          }
        } catch {
          // Offline fallback
        }

        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g;
            const updatedMembers = g.miembros.map((m) =>
              m.email === memberEmail ? { ...m, isEssential: !m.isEssential } : m
            );
            return { ...g, miembros: updatedMembers };
          }),
        }));
      },

      addProposal: async (proposalData) => {
        try {
          const created = await eventsService.createProposal(proposalData.groupId, {
            titulo: proposalData.titulo,
            lugar: proposalData.lugar,
            fecha_cierre: proposalData.plazoVotacion,
            ventanas: proposalData.ventanasSugeridas.map((v) => ({
              dia: v.dia,
              hora_inicio: v.horaInicio,
              hora_fin: v.horaFin,
            })),
          });
          set((state) => ({
            groupProposals: [created, ...state.groupProposals],
          }));
        } catch {
          set((state) => ({
            groupProposals: [
              { ...proposalData, id: `prop-${Date.now()}` },
              ...state.groupProposals,
            ],
          }));
        }
      },

      voteProposalWindow: async (proposalId, windowId, userEmail) => {
        try {
          await eventsService.voteWindow(proposalId, windowId);
        } catch {
          // Fallback
        }

        set((state) => ({
          groupProposals: state.groupProposals.map((p) => {
            if (p.id !== proposalId || p.estado === 'confirmado') return p;
            const updatedWindows = p.ventanasSugeridas.map((w) => {
              if (w.id === windowId) {
                const hasVoted = w.votosUsuarios.includes(userEmail);
                const newVotes = hasVoted
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
        try {
          await eventsService.closeVoting(proposalId);
        } catch {
          // Fallback
        }

        set((state) => ({
          groupProposals: state.groupProposals.map((p) =>
            p.id === proposalId ? { ...p, estado: 'confirmado' } : p
          ),
        }));
      },

      reportIncident: async (proposalId, incidenceData) => {
        try {
          await eventsService.reportIncident(proposalId, {
            reason: incidenceData.motivo,
            type: incidenceData.tipo,
          });
        } catch {
          // Fallback
        }

        set((state) => {
          const newIncidence: PlanIncidence = {
            ...incidenceData,
            id: `inc-${Date.now()}`,
            fechaReporte: 'Ahora',
          };
          return {
            groupProposals: state.groupProposals.map((p) => {
              if (p.id === proposalId) {
                const current = p.incidencias || [];
                return {
                  ...p,
                  estado: p.estado === 'confirmado' ? 'en_recoordinacion' : p.estado,
                  incidencias: [newIncidence, ...current],
                };
              }
              return p;
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
            const currentVotes = p.votosReplanificacion || { cancel: [], reschedule: [], keep: [] };

            const cleanCancel = currentVotes.cancel.filter((e) => e !== userEmail);
            const cleanReschedule = currentVotes.reschedule.filter((e) => e !== userEmail);
            const cleanKeep = currentVotes.keep.filter((e) => e !== userEmail);

            if (action === 'cancel') cleanCancel.push(userEmail);
            if (action === 'reschedule') cleanReschedule.push(userEmail);
            if (action === 'keep') cleanKeep.push(userEmail);

            return {
              ...p,
              votosReplanificacion: {
                cancel: cleanCancel,
                reschedule: cleanReschedule,
                keep: cleanKeep,
              },
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
