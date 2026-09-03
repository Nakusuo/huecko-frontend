import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DayOfWeek = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

export interface GroupMember {
  email: string;
  nombre: string;
  isEssential: boolean;
  color: string;
  status: 'confirmado' | 'pendiente';
}

export interface Group {
  id: string;
  nombre: string;
  descripcion: string;
  codigoInvitacion: string;
  creadoPor: string;
  umbralDisponibilidad: number;
  miembros: GroupMember[];
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

export interface TimeWindowProposal {
  id: string;
  dia: DayOfWeek;
  horaInicio: string;
  horaFin: string;
  disponibilidadPorcentaje: number;
  votosUsuarios: string[];
}

export interface PlanIncidence {
  id: string;
  userEmail: string;
  userName: string;
  tipo: 'falta' | 'tardanza' | 'imprevisto';
  motivo: string;
  minutosTardanza?: number;
  fechaReporte: string;
}

export interface PlanProposal {
  id: string;
  groupId: string;
  titulo: string;
  lugar?: string;
  creadoPor: string;
  plazoVotacion: string;
  estado: 'propuesto' | 'confirmado' | 'cancelado' | 'en_recoordinacion';
  ventanasSugeridas: TimeWindowProposal[];
  incidencias?: PlanIncidence[];
  votosReplanificacion?: { cancel: string[]; reschedule: string[]; keep: string[] };
}

interface GroupsState {
  groups: Group[];
  selectedGroupId: string | null;
  occupiedSlots: GroupOccupiedSlot[];
  groupProposals: PlanProposal[];

  setSelectedGroupId: (id: string) => void;
  createGroup: (nombre: string, descripcion: string, umbralDisponibilidad: number, userEmail: string, userName: string) => Group;
  joinGroupByCode: (codigo: string, userEmail: string, userName: string) => boolean;
  updateGroupThreshold: (groupId: string, threshold: number) => void;
  toggleMemberEssential: (groupId: string, memberEmail: string) => void;

  addProposal: (proposal: Omit<PlanProposal, 'id'>) => void;
  voteProposalWindow: (proposalId: string, windowId: string, userEmail: string) => void;
  closeVotingManually: (proposalId: string) => void;

  reportIncident: (proposalId: string, incidence: Omit<PlanIncidence, 'id' | 'fechaReporte'>) => void;
  voteReplanification: (proposalId: string, action: 'cancel' | 'reschedule' | 'keep', userEmail: string) => void;
}

const INITIAL_GROUPS: Group[] = [
  {
    id: '1',
    nombre: 'Grupo Universitario - Ing. Software',
    descripcion: 'Coordinación de horarios de clases y trabajos en grupo del ciclo.',
    codigoInvitacion: 'HUECKO-78A9',
    creadoPor: 'alex.rodriguez@huecko.com',
    umbralDisponibilidad: 100,
    miembros: [
      { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R.', isEssential: true, color: '#8b5cf6', status: 'confirmado' },
      { email: 'maria.c@huecko.com', nombre: 'María C.', isEssential: false, color: '#ec4899', status: 'confirmado' },
      { email: 'sam.p@huecko.com', nombre: 'Sam P.', isEssential: false, color: '#3b82f6', status: 'confirmado' },
    ],
  },
  {
    id: '2',
    nombre: 'Amigos de Fin de Semana',
    descripcion: 'Salidas, viajes y actividades deportivas.',
    codigoInvitacion: 'HUECKO-34X2',
    creadoPor: 'alex.rodriguez@huecko.com',
    umbralDisponibilidad: 80,
    miembros: [
      { email: 'alex.rodriguez@huecko.com', nombre: 'Alex R.', isEssential: true, color: '#8b5cf6', status: 'confirmado' },
      { email: 'carlos.m@huecko.com', nombre: 'Carlos M.', isEssential: false, color: '#10b981', status: 'confirmado' },
      { email: 'lucia.g@huecko.com', nombre: 'Lucía G.', isEssential: true, color: '#f59e0b', status: 'pendiente' },
    ],
  },
];

const INITIAL_OCCUPIED_SLOTS: GroupOccupiedSlot[] = [
  { id: '101', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: '#8b5cf6', day: 'Lun', startTime: '08:00', endTime: '11:00', title: 'Clase Algoritmos' },
  { id: '102', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: '#ec4899', day: 'Lun', startTime: '10:00', endTime: '13:00', title: 'Trabajo Remoto' },
  { id: '103', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: '#3b82f6', day: 'Lun', startTime: '14:00', endTime: '18:00', title: 'Gimnasio & Estudio' },
  { id: '104', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: '#8b5cf6', day: 'Mar', startTime: '10:00', endTime: '14:00', title: 'Turno Trabajo' },
  { id: '105', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: '#3b82f6', day: 'Mar', startTime: '08:00', endTime: '12:00', title: 'Clase Física' },
  { id: '106', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: '#8b5cf6', day: 'Mié', startTime: '08:00', endTime: '10:00', title: 'Universidad' },
  { id: '107', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: '#ec4899', day: 'Mié', startTime: '08:00', endTime: '11:00', title: 'Reunión Equipo' },
  { id: '108', userEmail: 'sam.p@huecko.com', userName: 'Sam P.', userColor: '#3b82f6', day: 'Mié', startTime: '15:00', endTime: '18:00', title: 'Clase Inglés' },
  { id: '109', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: '#8b5cf6', day: 'Jue', startTime: '10:00', endTime: '14:00', title: 'Turno Trabajo' },
  { id: '110', userEmail: 'maria.c@huecko.com', userName: 'María C.', userColor: '#ec4899', day: 'Jue', startTime: '12:00', endTime: '16:00', title: 'Cita Médica' },
  { id: '111', userEmail: 'alex.rodriguez@huecko.com', userName: 'Alex R.', userColor: '#8b5cf6', day: 'Vie', startTime: '08:00', endTime: '11:00', title: 'Universidad' },
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

      setSelectedGroupId: (id) => set({ selectedGroupId: id }),

      createGroup: (nombre, descripcion, umbralDisponibilidad, userEmail, userName) => {
        const newGroup: Group = {
          id: `group-${Date.now()}`,
          nombre,
          descripcion,
          codigoInvitacion: `HUECKO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          creadoPor: userEmail,
          umbralDisponibilidad,
          miembros: [
            { email: userEmail, nombre: userName, isEssential: true, color: '#8b5cf6', status: 'confirmado' },
          ],
        };
        set((state) => ({
          groups: [...state.groups, newGroup],
          selectedGroupId: newGroup.id,
        }));
        return newGroup;
      },

      joinGroupByCode: (codigo, userEmail, userName) => {
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
          { email: userEmail, nombre: userName, isEssential: false, color: '#10b981', status: 'confirmado' },
        ];

        set((s) => ({
          groups: s.groups.map((g) => (g.id === targetGroup.id ? { ...g, miembros: updatedMembers } : g)),
          selectedGroupId: targetGroup.id,
        }));
        return true;
      },

      updateGroupThreshold: (groupId, threshold) =>
        set((state) => ({
          groups: state.groups.map((g) => (g.id === groupId ? { ...g, umbralDisponibilidad: threshold } : g)),
        })),

      toggleMemberEssential: (groupId, memberEmail) =>
        set((state) => ({
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g;
            const updatedMembers = g.miembros.map((m) =>
              m.email === memberEmail ? { ...m, isEssential: !m.isEssential } : m
            );
            return { ...g, miembros: updatedMembers };
          }),
        })),

      addProposal: (proposalData) =>
        set((state) => ({
          groupProposals: [
            { ...proposalData, id: `prop-${Date.now()}` },
            ...state.groupProposals,
          ],
        })),

      voteProposalWindow: (proposalId, windowId, userEmail) =>
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
        })),

      closeVotingManually: (proposalId) =>
        set((state) => ({
          groupProposals: state.groupProposals.map((p) =>
            p.id === proposalId ? { ...p, estado: 'confirmado' } : p
          ),
        })),

      reportIncident: (proposalId, incidenceData) =>
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
        }),

      voteReplanification: (proposalId, action, userEmail) =>
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
        })),
    }),
    {
      name: 'huecko-groups',
    }
  )
);
