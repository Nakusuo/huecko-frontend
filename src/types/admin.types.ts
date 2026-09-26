import type { RolSistema } from './auth.types';

/** Espejo de `ResumenAdminResponse` del backend. Solo cifras agregadas. */

export type EstadoPlanAdmin = 'PROPUESTO' | 'CONFIRMADO' | 'CANCELADO' | 'EN_RECOORDINACION';
export type OpcionVotacion = 'CANCELAR' | 'REAGENDAR' | 'MANTENER';

export interface SemanaAdmin {
  /** Lunes de la semana, `YYYY-MM-DD`. */
  inicio: string;
  altas: number;
  planesPropuestos: number;
  planesConfirmados: number;
}

export interface ResumenAdmin {
  generadoEn: string;
  usuarios: { total: number; nuevos7d: number; activos30d: number; conHorario: number; admins: number };
  grupos: { total: number; activos30d: number; miembrosMedio: number; sinPlanes: number };
  planes: {
    total: number;
    porEstado: Record<EstadoPlanAdmin, number>;
    /** Entre 0 y 1. `null` si ningún plan se ha cerrado todavía. */
    tasaConcrecion: number | null;
  };
  imprevistos: {
    ausencias: number;
    ausenciasCriticas: number;
    retrasos: number;
    minutosRetrasoMedio: number | null;
    votacionesAbiertas: number;
    votacionesCerradasRecientes: number;
    resultados: Record<OpcionVotacion, number>;
    /** Las votaciones cerradas se borran a estos días: sus cifras no son históricas. */
    diasRetencion: number;
  };
  /** Las últimas 8 semanas, de la más antigua a la actual. */
  semanas: SemanaAdmin[];
}

/** Espejo de `UsuarioAdminResponse`: la cuenta y cuánto la usa, nada de su horario. */
export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rolSistema: RolSistema;
  creadoEn: string;
  suspendido: boolean;
  grupos: number;
  planesPropuestos: number;
  /** `null` si nunca hizo nada en la app. */
  ultimaActividad: string | null;
}

/** Espejo de `GrupoAdminResponse`: metadatos y actividad, sin integrantes ni planes por dentro. */
export interface GrupoAdmin {
  id: string;
  nombre: string;
  creadoEn: string | null;
  organizadores: string[];
  miembros: number;
  umbralDisponibilidad: number;
  planes: number;
  planesPorEstado: Record<EstadoPlanAdmin, number>;
  imprevistos: number;
  /** `null` si nunca pasó nada en el grupo tras crearlo. */
  ultimaActividad: string | null;
}
