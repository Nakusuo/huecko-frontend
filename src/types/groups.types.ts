import type { DayOfWeek } from './schedule.types';

export interface GroupMember {
  id?: string;
  userId?: string;
  email: string;
  nombre: string;
  isEssential: boolean;
  color: string;
  /** `ADMIN` es el valor histórico del modo demo; el backend dice `ORGANIZADOR`. */
  rol?: 'ADMIN' | 'ORGANIZADOR' | 'MIEMBRO';
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

export interface SuggestedWindow {
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

/* ------------------------------------------------------------------ *
 * Contrato del backend (com.huecko.backend.grupo)
 *
 * Espejo literal de los DTO de Java. La traducción a los tipos de arriba
 * vive en `services/groupsService`, igual que `scheduleService` hace con
 * los bloques de horario.
 * ------------------------------------------------------------------ */

export type RolMiembro = 'ORGANIZADOR' | 'MIEMBRO';

/** Espejo de `MiembroResponse`. */
export interface MiembroResponse {
  usuarioId: string;
  nombre: string;
  email: string;
  rol: RolMiembro;
  esImprescindible: boolean;
}

/** Espejo de `GrupoResponse`. */
export interface GrupoResponse {
  id: string;
  nombre: string;
  descripcion: string | null;
  codigoInvitacion: string;
  creadoPor: string;
  umbralDisponibilidad: number;
  creadoEn: string;
  miembros: MiembroResponse[];
}

/** Espejo de `CeldaDisponibilidadResponse`. Solo recuentos: nunca etiquetas (RNF-02). */
export interface CeldaDisponibilidadResponse {
  /** 1 = lunes … 7 = domingo. */
  diaSemana: number;
  /** Hora de inicio de la franja: 14 significa 14:00–15:00. */
  hora: number;
  disponibles: number;
  totalMiembros: number;
  porcentaje: number;
  cumpleUmbral: boolean;
}

/** Espejo de `VentanaSugeridaResponse`. */
export interface VentanaSugeridaResponse {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  disponibilidadPorcentaje: number;
  miembrosDisponibles: number;
  totalMiembros: number;
}

/** Espejo de `DisponibilidadResponse`. */
export interface DisponibilidadResponse {
  grupoId: string;
  umbral: number;
  totalMiembros: number;
  semanaDesde: string;
  semanaHasta: string;
  horaDesde: number;
  horaHasta: number;
  celdas: CeldaDisponibilidadResponse[];
  ventanasSugeridas: VentanaSugeridaResponse[];
}

/**
 * El cruce ya traducido a los días que usa la rejilla.
 *
 * `cells` se indexa por `"Lun-14"` para que la UI resuelva una casilla en
 * tiempo constante: el heatmap pinta 84 casillas y buscarlas con `.find()`
 * en un array sería recorrerlo 84 veces por render.
 */
export interface GroupAvailability {
  threshold: number;
  membersCount: number;
  weekFrom: string;
  hourFrom: number;
  hourTo: number;
  cells: Record<string, { freeCount: number; freePercentage: number; meetsThreshold: boolean }>;
  windows: SuggestedWindow[];
}
