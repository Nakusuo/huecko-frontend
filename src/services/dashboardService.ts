import type {
  DashboardMetrics,
  UpcomingEventDetail,
  DashboardPendingVote,
} from '../types/dashboard.types';

// Mock initial data designed following Stitch mockups & Huecko architecture
const MOCK_METRICS: DashboardMetrics = {
  activeGroupsCount: 4,
  pendingVotesCount: 2,
  freeMatchHoursThisWeek: 14,
  connectedMembersCount: 18,
};

const MOCK_UPCOMING_EVENT: UpcomingEventDetail = {
  id: 'ev-1',
  groupId: '1',
  groupName: 'Grupo Universitario - Ing. Software',
  title: 'Cena de Graduación & Fin de Ciclo',
  description: 'Celebración de fin de curso con el grupo de la universidad para cerrar proyectos.',
  coverImage: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=1200&q=80',
  dayLabel: 'Sábado, 15 de Julio',
  timeRange: '21:00 - 01:00',
  locationName: 'Restaurante El Mirador',
  locationAddress: 'Calle Vista Alegre 12, Centro',
  status: 'confirmado',
  attendees: [
    { email: 'alex.rodriguez@huecko.com', name: 'Tú', status: 'puntual' },
    { email: 'carlos.m@huecko.com', name: 'Carlos M.', status: 'puntual' },
    { email: 'laura.c@huecko.com', name: 'Laura C.', status: 'retrasado', delayMinutes: 15 },
    { email: 'david.m@huecko.com', name: 'David M.', status: 'no_asiste' },
    { email: 'maria.c@huecko.com', name: 'María C.', status: 'puntual', isEssential: true },
    { email: 'sam.p@huecko.com', name: 'Sam P.', status: 'puntual' },
    { email: 'lucia.g@huecko.com', name: 'Lucía G.', status: 'puntual' },
    { email: 'andres.f@huecko.com', name: 'Andrés F.', status: 'puntual' },
  ],
};

const MOCK_PENDING_VOTES: DashboardPendingVote[] = [
  {
    id: 'vote-1',
    groupId: '2',
    groupName: 'Amigos de Fin de Semana',
    title: 'Pichanga & Parrilla de Domingo',
    location: 'Canchas El Golazo',
    deadline: 'Cierra hoy a las 20:00',
    suggestedWindows: [
      {
        id: 'w-101',
        day: 'Sábado',
        timeRange: '16:00 - 18:00',
        freePercentage: 85,
        votesCount: 3,
        hasVoted: true,
      },
      {
        id: 'w-102',
        day: 'Domingo',
        timeRange: '11:00 - 13:00',
        freePercentage: 100,
        votesCount: 4,
        hasVoted: false,
      },
      {
        id: 'w-103',
        day: 'Domingo',
        timeRange: '15:00 - 17:00',
        freePercentage: 70,
        votesCount: 1,
        hasVoted: false,
      },
    ],
  },
  {
    id: 'vote-2',
    groupId: '1',
    groupName: 'Grupo Universitario - Ing. Software',
    title: 'Reunión de Avance de Tesis',
    location: 'Google Meet / Biblioteca',
    deadline: 'Cierra mañana a las 12:00',
    suggestedWindows: [
      {
        id: 'w-201',
        day: 'Miércoles',
        timeRange: '14:00 - 16:00',
        freePercentage: 100,
        votesCount: 2,
        hasVoted: false,
      },
      {
        id: 'w-202',
        day: 'Jueves',
        timeRange: '10:00 - 12:00',
        freePercentage: 75,
        votesCount: 1,
        hasVoted: false,
      },
    ],
  },
];

export const dashboardService = {
  getMetrics: async (): Promise<DashboardMetrics> => {
    // Simula llamada HTTP
    return new Promise((resolve) => setTimeout(() => resolve({ ...MOCK_METRICS }), 150));
  },

  getUpcomingEvent: async (): Promise<UpcomingEventDetail> => {
    return new Promise((resolve) => setTimeout(() => resolve({ ...MOCK_UPCOMING_EVENT }), 150));
  },

  getPendingVotes: async (): Promise<DashboardPendingVote[]> => {
    return new Promise((resolve) => setTimeout(() => resolve([...MOCK_PENDING_VOTES]), 150));
  },

  reportDelay: async (
    _eventId: string,
    minutes: number,
    _userEmail: string
  ): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `Aviso enviado al grupo: llegarás con ${minutes} min de retraso.`,
        });
      }, 200);
    });
  },

  cancelAttendance: async (
    _eventId: string,
    _reason: string,
    _userEmail: string
  ): Promise<{ success: boolean; isCritical: boolean; message: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          isCritical: false,
          message: 'Tu imprevisto ha sido notificado al grupo.',
        });
      }, 200);
    });
  },

  toggleVote: async (
    _voteId: string,
    _windowId: string,
    _userEmail: string
  ): Promise<{ success: boolean }> => {
    return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 150));
  },
};
