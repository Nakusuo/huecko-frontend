/* Solo lo que el panel de inicio rellena de verdad. Antes había campos que
   ninguna fuente daba —imagen de portada, descripción y dirección del
   evento, foto del asistente— y la interfaz pintaba huecos vacíos o una
   imagen rota por ellos; también tipos de métricas y de un onboarding que
   nadie usaba. */

export type AttendeePunctualityStatus = 'puntual' | 'retrasado' | 'no_asiste';

export interface EventAttendee {
  email: string;
  name: string;
  status: AttendeePunctualityStatus;
  delayMinutes?: number; // e.g. 15 for "+15 min"
  isEssential?: boolean;
}

export interface UpcomingEventDetail {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  dayLabel: string; // e.g. "sáb 26 sep"
  timeRange: string; // e.g. "21:00 - 01:00"
  locationName: string;
  status: 'confirmado' | 'en_recoordinacion' | 'cancelado';
  attendees: EventAttendee[];
}

export interface PendingVoteWindow {
  id: string;
  day: string;
  timeRange: string;
  freePercentage: number;
  votesCount: number;
  hasVoted: boolean;
}

export interface DashboardPendingVote {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  location?: string;
  deadline: string; // e.g. "Cierra en 4 horas"
  suggestedWindows: PendingVoteWindow[];
}
