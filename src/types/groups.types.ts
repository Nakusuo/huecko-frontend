import type { DayOfWeek } from './schedule.types';

export interface GroupMember {
  id?: string;
  userId?: string;
  email: string;
  nombre: string;
  isEssential: boolean;
  color: string;
  rol?: 'ADMIN' | 'MIEMBRO';
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

export interface CreateGroupPayload {
  nombre: string;
  descripcion?: string;
  umbral_disponibilidad?: number;
}

export interface JoinGroupPayload {
  codigo_invitacion: string;
}

export interface HeatmapCell {
  day: DayOfWeek | string;
  hour: number;
  available_count: number;
  availability_percentage: number;
  meets_threshold: boolean;
}

export interface SuggestedWindow {
  id: string;
  dia: DayOfWeek;
  horaInicio: string;
  horaFin: string;
  disponibilidadPorcentaje: number;
  votosUsuarios: string[];
}

export interface HeatmapAvailabilityResponse {
  threshold: number;
  members_count: number;
  cells: HeatmapCell[];
  suggested_windows: SuggestedWindow[];
}

export interface PlanIncidence {
  id: string;
  userEmail: string;
  userName: string;
  tipo: 'falta' | 'tardanza' | 'imprevisto';
  motivo: string;
  minutosTardanza?: number;
  fechaReporte: string;
  criticidad?: 'BAJA' | 'MEDIA' | 'ALTA';
  /** Deja de estar abierta cuando la votación exprés decide qué hacer. */
  resuelta?: boolean;
}

export interface TimeWindowProposal {
  id: string;
  dia: DayOfWeek;
  horaInicio: string;
  horaFin: string;
  disponibilidadPorcentaje: number;
  votosUsuarios: string[];
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
