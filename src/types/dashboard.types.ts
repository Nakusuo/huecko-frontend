export interface DashboardMetrics {
  activeGroupsCount: number;
  pendingVotesCount: number;
  freeMatchHoursThisWeek: number;
  connectedMembersCount: number;
}

export type AttendeePunctualityStatus = 'puntual' | 'retrasado' | 'no_asiste';

export interface EventAttendee {
  email: string;
  name: string;
  avatarUrl?: string;
  status: AttendeePunctualityStatus;
  delayMinutes?: number; // e.g. 15 for "+15 min"
  isEssential?: boolean;
}

export interface UpcomingEventDetail {
  id: string;
  groupId: string;
  groupName: string;
  title: string;
  description?: string;
  coverImage?: string;
  dayLabel: string; // e.g. "Mañana, 09:00 - 13:00" or "Sábado, 15 de Julio"
  timeRange: string; // e.g. "21:00 - 01:00"
  locationName: string;
  locationAddress?: string;
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

export interface OnboardingState {
  step: 1 | 2 | 3 | 4;
  availabilityType: 'estudiante' | 'trabajador' | 'mixto' | 'custom';
  groupAction: 'create' | 'join';
  newGroupName: string;
  newGroupDescription: string;
  newGroupThreshold: number;
  joinGroupCode: string;
  generatedInvitationCode?: string;
}
