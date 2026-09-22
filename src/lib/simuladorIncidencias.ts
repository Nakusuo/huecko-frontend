import type {
  Ausencia,
  OpcionExpres,
  ResultadoReporte,
  Retraso,
  VotacionExpres,
} from '../types/incidents.types';

/**
 * Los Módulos 4 y 5 del backend, reproducidos en el cliente para el modo demo.
 *
 * Antes el demo tenía reglas propias: toda ausencia replanteaba el plan, la
 * votación cerraba al llegar a mayoría sin plazo, quien avisaba podía votar y
 * reabrir la votación una y otra vez. Una demo que se comporta distinto de la
 * app real enseña una app que no existe. Aquí se siguen las mismas reglas que
 * `ImprevistoService` y `RetrasoService`, con el mismo contrato de respuesta,
 * para que la interfaz no distinga un modo del otro.
 */

/** Lo que el simulador necesita saber de un plan y que vive en `groupsStore`. */
export interface ContextoPlanDemo {
  tituloPlan: string;
  estado: 'propuesto' | 'confirmado' | 'cancelado' | 'en_recoordinacion';
  /** Correo de quien lo propuso, si se conoce. */
  creadoPorEmail?: string;
  /** Inicio de la ventana confirmada; `null` si no se sabe. */
  inicio: Date | null;
  miembros: Array<{ email: string; nombre: string; isEssential: boolean; rol?: string }>;
}

export interface ConfiguracionSimulador {
  contexto: (planId: string) => ContextoPlanDemo | null;
  yo: () => { email: string; nombre: string };
  /** Aplica al plan lo que decidió la votación exprés. */
  alCerrar: (planId: string, resultado: OpcionExpres) => void;
  ahora?: () => Date;
}

/** Los mismos valores por defecto que el backend. */
export const MINUTOS_DE_VOTACION = 60;
export const RESULTADO_POR_DEFECTO: OpcionExpres = 'MANTENER';
const MINUTOS_MINIMOS = 5;
const HORAS_ANTES_PARA_RETRASO = 24;

interface VotacionInterna {
  id: string;
  planId: string;
  reportaEmail: string;
  nombreReporta: string;
  motivo: string | null;
  razon: string;
  estado: 'ABIERTA' | 'CERRADA';
  votos: Record<string, OpcionExpres>;
  votantesPosibles: number;
  expiraEn: string;
  resultado: OpcionExpres | null;
  porDefecto: boolean;
}

interface Estado {
  votaciones: Record<string, VotacionInterna>;
  ausencias: Record<string, Ausencia[]>;
  retrasos: Record<string, Retraso[]>;
}

const CLAVE = 'huecko-demo-incidencias';
let config: ConfiguracionSimulador | null = null;
let estado: Estado = leer();

function leer(): Estado {
  try {
    const guardado = globalThis.localStorage?.getItem(CLAVE);
    if (guardado) return JSON.parse(guardado) as Estado;
  } catch {
    // Sin almacenamiento (modo privado, pruebas): se empieza de cero.
  }
  return { votaciones: {}, ausencias: {}, retrasos: {} };
}

function guardar() {
  try {
    globalThis.localStorage?.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    // Igual que al leer: sin almacenamiento, el estado vive en memoria.
  }
}

export function configurarSimulador(nueva: ConfiguracionSimulador) {
  config = nueva;
}

/** Borra todo. Se llama al cerrar sesión y desde las pruebas. */
export function reiniciarSimulador() {
  estado = { votaciones: {}, ausencias: {}, retrasos: {} };
  guardar();
}

function cfg(): ConfiguracionSimulador {
  if (!config) throw new Error('El simulador de incidencias no está configurado.');
  return config;
}

const ahora = () => cfg().ahora?.() ?? new Date();

function planConfirmado(planId: string): ContextoPlanDemo {
  const plan = cfg().contexto(planId);
  if (!plan) throw new Error('No existe ese plan.');
  if (plan.estado !== 'confirmado') {
    throw new Error('Solo se pueden avisar retrasos o imprevistos en un plan confirmado.');
  }
  return plan;
}

/* ------------------------------------------------------------------ *
 * Módulo 4 — retrasos
 * ------------------------------------------------------------------ */

export function reportarRetraso(planId: string, minutos: number): Retraso {
  const plan = planConfirmado(planId);
  const yo = cfg().yo();

  if ((estado.ausencias[planId] ?? []).some((a) => a.usuarioId === yo.email)) {
    throw new Error('Ya avisaste de que no irás a este plan.');
  }
  if (plan.inicio && plan.inicio.getTime() - ahora().getTime() > HORAS_ANTES_PARA_RETRASO * 3_600_000) {
    throw new Error('Solo se puede avisar de un retraso en las 24 horas previas al plan.');
  }

  const anterior = (estado.retrasos[planId] ?? []).find((r) => r.usuarioId === yo.email);
  const retraso: Retraso = {
    usuarioId: yo.email,
    nombreUsuario: yo.nombre,
    minutosEstimados: minutos,
    reportadoEn: ahora().toISOString(),
    corregido: Boolean(anterior),
  };
  estado.retrasos[planId] = [
    ...(estado.retrasos[planId] ?? []).filter((r) => r.usuarioId !== yo.email),
    retraso,
  ];
  guardar();
  return retraso;
}

export function listarRetrasos(planId: string): Retraso[] {
  return estado.retrasos[planId] ?? [];
}

export function retirarRetraso(planId: string) {
  const yo = cfg().yo();
  estado.retrasos[planId] = (estado.retrasos[planId] ?? []).filter((r) => r.usuarioId !== yo.email);
  guardar();
}

/* ------------------------------------------------------------------ *
 * Módulo 5 — imprevistos y votación exprés
 * ------------------------------------------------------------------ */

/** Las tres reglas de `EvaluadorPorReglas`, en el mismo orden. */
function criticidad(plan: ContextoPlanDemo, email: string): string | null {
  if (plan.creadoPorEmail && plan.creadoPorEmail === email) return 'propuso este plan';
  const miembro = plan.miembros.find((m) => m.email === email);
  if (miembro?.isEssential) return 'el grupo lo marcó como imprescindible';
  if (miembro?.rol === 'ORGANIZADOR' || miembro?.rol === 'ADMIN') return 'es organizador del grupo';
  return null;
}

export function reportarImprevisto(planId: string, motivo: string): ResultadoReporte {
  const plan = planConfirmado(planId);
  const yo = cfg().yo();

  if ((estado.ausencias[planId] ?? []).some((a) => a.usuarioId === yo.email)) {
    throw new Error('Ya avisaste de que no irás a este plan.');
  }

  const razon = criticidad(plan, yo.email);
  const texto = motivo.trim() || null;
  estado.ausencias[planId] = [
    ...(estado.ausencias[planId] ?? []),
    { usuarioId: yo.email, nombreUsuario: yo.nombre, motivo: texto, reportadoEn: ahora().toISOString(), critica: razon !== null },
  ];
  // Quien no va no llega tarde.
  estado.retrasos[planId] = (estado.retrasos[planId] ?? []).filter((r) => r.usuarioId !== yo.email);

  if (!razon) {
    guardar();
    return { criticidad: 'NO_CRITICA', razon: 'no cumple ninguna regla de criticidad', votacion: null };
  }

  let votacion = estado.votaciones[planId];
  if (!votacion || votacion.estado === 'CERRADA') {
    const tope = ahora().getTime() + MINUTOS_DE_VOTACION * 60_000;
    const inicio = plan.inicio?.getTime() ?? Infinity;
    const expira = Math.max(Math.min(tope, inicio), ahora().getTime() + MINUTOS_MINIMOS * 60_000);
    votacion = {
      id: `expres-${planId}-${ahora().getTime()}`,
      planId,
      reportaEmail: yo.email,
      nombreReporta: yo.nombre,
      motivo: texto,
      razon,
      estado: 'ABIERTA',
      votos: {},
      votantesPosibles: Math.max(plan.miembros.length - 1, 0),
      expiraEn: new Date(expira).toISOString(),
      resultado: null,
      porDefecto: false,
    };
    estado.votaciones[planId] = votacion;
  }
  guardar();
  return { criticidad: 'CRITICA', razon, votacion: aRespuesta(votacion) };
}

export function listarAusencias(planId: string): Ausencia[] {
  return estado.ausencias[planId] ?? [];
}

/** La votación abierta del plan, cerrándola antes si ya venció. */
export function votacionAbierta(planId: string): VotacionExpres | null {
  const votacion = estado.votaciones[planId];
  if (!votacion || votacion.estado === 'CERRADA') return null;
  if (new Date(votacion.expiraEn) <= ahora()) {
    cerrar(votacion);
    return null;
  }
  return aRespuesta(votacion);
}

export function votarExpres(planId: string, opcion: OpcionExpres): VotacionExpres {
  const votacion = estado.votaciones[planId];
  const yo = cfg().yo();
  if (!votacion || votacion.estado === 'CERRADA' || new Date(votacion.expiraEn) <= ahora()) {
    if (votacion && votacion.estado === 'ABIERTA') cerrar(votacion);
    throw new Error('No hay ninguna votación exprés abierta en este plan.');
  }
  if (votacion.reportaEmail === yo.email) throw new Error('Quien reporta el imprevisto no vota');

  votacion.votos[yo.email] = opcion;
  // Cuando ya votó todo el que podía, esperar al plazo no cambia nada.
  if (Object.keys(votacion.votos).length >= votacion.votantesPosibles) cerrar(votacion);
  guardar();
  return aRespuesta(votacion);
}

/**
 * Mismo cierre que el backend: sin quórum se aplica el resultado por defecto;
 * con quórum gana la más votada y, en empate, la más conservadora.
 */
function cerrar(votacion: VotacionInterna) {
  const recuento = contar(votacion);
  const emitidos = Object.keys(votacion.votos).length;
  const quorum = Math.min(2, votacion.votantesPosibles);

  let resultado: OpcionExpres = RESULTADO_POR_DEFECTO;
  let porDefecto = true;
  if (emitidos > 0 && emitidos >= quorum) {
    porDefecto = false;
    const conservador: OpcionExpres[] = ['MANTENER', 'REAGENDAR', 'CANCELAR'];
    resultado = conservador.reduce((mejor, o) => (recuento[o] > recuento[mejor] ? o : mejor));
  }

  votacion.estado = 'CERRADA';
  votacion.resultado = resultado;
  votacion.porDefecto = porDefecto;
  if (resultado !== 'MANTENER') {
    // Los retrasos se referían a una fecha que ya no vale.
    estado.retrasos[votacion.planId] = [];
  }
  guardar();
  cfg().alCerrar(votacion.planId, resultado);
}

/** Tras reprogramar, lo avisado se refería a la fecha anterior. */
export function olvidarPlan(planId: string) {
  delete estado.votaciones[planId];
  delete estado.ausencias[planId];
  delete estado.retrasos[planId];
  guardar();
}

function contar(votacion: VotacionInterna): Record<OpcionExpres, number> {
  const recuento: Record<OpcionExpres, number> = { MANTENER: 0, REAGENDAR: 0, CANCELAR: 0 };
  for (const opcion of Object.values(votacion.votos)) recuento[opcion]++;
  return recuento;
}

function aRespuesta(votacion: VotacionInterna): VotacionExpres {
  const yo = cfg().yo();
  const abierta = votacion.estado === 'ABIERTA' && new Date(votacion.expiraEn) > ahora();
  return {
    id: votacion.id,
    planId: votacion.planId,
    nombreReporta: votacion.nombreReporta,
    motivo: votacion.motivo,
    criticidad: 'CRITICA',
    razonCriticidad: votacion.razon,
    origenCriticidad: 'REGLAS',
    estado: votacion.estado,
    opciones: ['MANTENER', 'REAGENDAR', 'CANCELAR'],
    recuento: contar(votacion),
    miVoto: votacion.votos[yo.email] ?? null,
    votosEmitidos: Object.keys(votacion.votos).length,
    miembrosDelGrupo: votacion.votantesPosibles,
    expiraEn: votacion.expiraEn,
    resultado: votacion.resultado,
    resultadoPorDefecto: votacion.porDefecto,
    resultadoPorDefectoOpcion: RESULTADO_POR_DEFECTO,
    puedoVotar: abierta && votacion.reportaEmail !== yo.email,
  };
}
