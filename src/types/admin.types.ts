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

/* ------------------------------------------------------------------ *
 * Salud (`SaludResponse`)
 * ------------------------------------------------------------------ */

/** El peor gana: con una base caída el sistema está caído aunque lo demás vaya bien. */
export type EstadoSalud = 'OK' | 'DEGRADADO' | 'CAIDO';

export interface ComponenteSalud {
  clave: string;
  nombre: string;
  estado: EstadoSalud;
  /** `null` si no se llegó a medir (no respondió). */
  latenciaMs: number | null;
  detalle: string;
}

export interface TareaSalud {
  clave: string;
  nombre: string;
  descripcion: string;
  activa: boolean;
  intervaloMs: number;
  estado: EstadoSalud;
  /** Elementos que ya deberían haberse procesado y siguen ahí. Sana = 0. */
  atrasadas: number;
  /** Desde que arrancó el backend. */
  ejecuciones: number;
  ultimaEjecucion: string | null;
  duracionMs: number | null;
  ultimosProcesados: number;
  fallidosTotales: number;
  ultimoError: string | null;
  ultimoErrorEn: string | null;
}

export interface SaludAdmin {
  estado: EstadoSalud;
  generadoEn: string;
  componentes: ComponenteSalud[];
  tareas: TareaSalud[];
  aplicacion: {
    version: string;
    perfiles: string[];
    arranque: string;
    segundosEncendida: number;
    java: string;
    memoriaUsadaMb: number;
    memoriaMaximaMb: number;
    zonaHoraria: string;
  };
}

/* ------------------------------------------------------------------ *
 * Fallos y reportes
 * ------------------------------------------------------------------ */

export type EstadoRevision = 'NUEVO' | 'REVISADO' | 'RESUELTO';

/** SERVIDOR = error 500 del backend; CLIENTE = error del navegador; TAREA = tarea programada. */
export type OrigenFallo = 'SERVIDOR' | 'CLIENTE' | 'TAREA';

export interface FalloAdmin {
  id: string;
  origen: OrigenFallo;
  tipo: string;
  mensaje: string;
  /** Endpoint, página o tarea donde ocurrió, con los ids ya sustituidos por `{id}`. */
  ubicacion: string;
  traza: string | null;
  navegador: string | null;
  ocurrencias: number;
  primeraVez: string;
  ultimaVez: string;
  estado: EstadoRevision;
  /** Volvió a ocurrir después de darlo por resuelto. */
  reabierto: boolean;
}

/** FALLO = algo de la app no funciona; CONDUCTA = problema con otra cuenta. */
export type TipoReporte = 'FALLO' | 'CONDUCTA';

export interface ReporteAdmin {
  id: string;
  tipo: TipoReporte;
  descripcion: string;
  ruta: string | null;
  navegador: string | null;
  autorNombre: string;
  autorEmail: string;
  cuentaReportadaNombre: string | null;
  cuentaReportadaEmail: string | null;
  /** Estado actual de la cuenta señalada. `null` si no es de conducta o ya no existe. */
  cuentaReportadaSuspendida: boolean | null;
  estado: EstadoRevision;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PendientesAdmin {
  fallosNuevos: number;
  reportesNuevos: number;
}

/* ------------------------------------------------------------------ *
 * Consola
 * ------------------------------------------------------------------ */

export type NivelLog = 'ERROR' | 'WARN' | 'INFO';

export interface EventoLog {
  /** Crece siempre: se pide «lo posterior a X» y nunca llega una línea dos veces. */
  id: number;
  momento: string;
  nivel: NivelLog;
  logger: string;
  hilo: string;
  mensaje: string;
  excepcion: string | null;
}

export interface PaginaLogs {
  eventos: EventoLog[];
  ultimoId: number;
  capacidad: number;
}

export interface PropiedadConfig {
  grupo: string;
  clave: string;
  valor: string;
  descripcion: string;
}
