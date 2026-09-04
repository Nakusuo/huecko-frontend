import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { useAuthStore } from '../store/authStore';
import { colorByIndex } from '../theme/palette';
import type {
  BloqueHorarioRequest,
  BloqueHorarioResponse,
  DayOfWeek,
  TimeSlot,
} from '../types/schedule.types';

/**
 * Puente entre la rejilla del frontend (`TimeSlot`) y el módulo de horario del
 * backend (`BloqueHorario`). Todo el trabajo sucio de traducción vive aquí:
 * el store no sabe nada de `diaSemana` ni de mayúsculas en los enums.
 */

/** El backend numera 1 = lunes … 7 = domingo. */
const DAY_ORDER: DayOfWeek[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function dayToNumber(day: DayOfWeek): number {
  const index = DAY_ORDER.indexOf(day);
  return index >= 0 ? index + 1 : 1;
}

function numberToDay(diaSemana: number | null | undefined): DayOfWeek {
  if (!diaSemana || diaSemana < 1 || diaSemana > 7) return 'Lun';
  return DAY_ORDER[diaSemana - 1];
}

/** El backend serializa `LocalTime` como "HH:mm" o "HH:mm:ss"; la rejilla usa "HH:mm". */
function normalizeTime(value: string | null | undefined): string {
  if (!value) return '00:00';
  return value.slice(0, 5);
}

/** Día de la semana (1-7) de una fecha ISO, para poder ubicar un bloque puntual. */
function dayFromIsoDate(fecha: string): DayOfWeek {
  const [year, month, day] = fecha.split('-').map(Number);
  const jsDay = new Date(year, (month ?? 1) - 1, day ?? 1).getDay(); // 0 = domingo
  return DAY_ORDER[(jsDay + 6) % 7];
}

/** Color estable a partir del título, para bloques que llegan del servidor sin metadatos locales. */
function colorForTitle(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) hash = (hash * 31 + title.charCodeAt(i)) >>> 0;
  return colorByIndex(hash);
}

function currentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null;
}

/* ------------------------------------------------------------------ *
 * Traducción
 * ------------------------------------------------------------------ */

/**
 * El backend ya persiste `color`, `categoria` y `fechaFin`, así que son la
 * fuente de verdad. `previous` (el bloque que ya estaba en el store con ese id)
 * queda solo como red: cubre los bloques creados antes de que existieran esos
 * campos, que llegan con ellos a null.
 */
export function toTimeSlot(bloque: BloqueHorarioResponse, previous?: TimeSlot): TimeSlot {
  const title = bloque.etiqueta?.trim() || previous?.title || 'Bloque sin título';
  const isPuntual = bloque.tipo === 'PUNTUAL';

  return {
    id: bloque.id,
    title,
    day: isPuntual && bloque.fecha ? dayFromIsoDate(bloque.fecha) : numberToDay(bloque.diaSemana),
    startTime: normalizeTime(bloque.horaInicio),
    endTime: normalizeTime(bloque.horaFin),
    customColor: bloque.color ?? previous?.customColor ?? colorForTitle(title),
    type: isPuntual ? 'puntual' : 'recurrente',
    tag: bloque.categoria ?? previous?.tag,
    frequency: isPuntual ? 'unica' : 'semanal',
    specificDate: bloque.fecha ?? previous?.specificDate,
    specificEndDate: bloque.fechaFin ?? previous?.specificEndDate,
    isOcrImported: bloque.fuente === 'OCR' || previous?.isOcrImported,
  };
}

export function toBloqueRequest(slot: TimeSlot): BloqueHorarioRequest {
  const isPuntual = slot.type === 'puntual' || slot.frequency === 'unica';

  return {
    tipo: isPuntual ? 'PUNTUAL' : 'RECURRENTE',
    diaSemana: isPuntual ? null : dayToNumber(slot.day),
    fecha: isPuntual ? (slot.specificDate ?? null) : null,
    // El backend rechaza una fechaFin sin fecha, así que solo viaja en puntuales.
    fechaFin: isPuntual ? (slot.specificEndDate ?? null) : null,
    horaInicio: normalizeTime(slot.startTime),
    horaFin: normalizeTime(slot.endTime),
    etiqueta: slot.title,
    categoria: slot.tag ?? null,
    color: slot.customColor ?? null,
    fuente: slot.isOcrImported ? 'OCR' : 'MANUAL',
  };
}

/* ------------------------------------------------------------------ *
 * Operaciones
 * ------------------------------------------------------------------ */

/**
 * Trae los bloques confirmados y los borradores de OCR del usuario.
 * `existing` son los bloques que ya tiene el store, para conservar metadatos.
 */
export async function fetchSlots(existing: TimeSlot[] = []): Promise<TimeSlot[]> {
  const usuarioId = currentUserId();
  if (!isApiEnabled || !usuarioId) return existing;

  const [confirmados, borradores] = await Promise.all([
    apiClient.get<BloqueHorarioResponse[]>(endpoints.schedule.blocks(usuarioId)),
    apiClient.get<BloqueHorarioResponse[]>(endpoints.schedule.drafts(usuarioId)),
  ]);

  const previousById = new Map(existing.map((slot) => [slot.id, slot]));

  return [...confirmados.data, ...borradores.data].map((bloque) =>
    toTimeSlot(bloque, previousById.get(bloque.id))
  );
}

async function createBlock(usuarioId: string, slot: TimeSlot): Promise<string> {
  const { data } = await apiClient.post<BloqueHorarioResponse>(
    endpoints.schedule.blocks(usuarioId),
    toBloqueRequest(slot)
  );
  return data.id;
}

async function updateBlock(usuarioId: string, slot: TimeSlot): Promise<void> {
  await apiClient.put(endpoints.schedule.block(usuarioId, slot.id), toBloqueRequest(slot));
}

async function deleteBlock(usuarioId: string, bloqueId: string): Promise<void> {
  await apiClient.delete(endpoints.schedule.block(usuarioId, bloqueId));
}

/** Dos bloques son iguales para el backend si su request serializa igual. */
function hasServerRelevantChange(before: TimeSlot, after: TimeSlot): boolean {
  return JSON.stringify(toBloqueRequest(before)) !== JSON.stringify(toBloqueRequest(after));
}

/**
 * Sincroniza contra el backend la diferencia entre dos versiones de la rejilla.
 *
 * Se calcula el diff en vez de exponer un create/update/delete por separado
 * porque las páginas ya mutan el horario con `setSlots(prev => …)`; así el
 * store sincroniza cualquier cambio sin tocar los componentes.
 *
 * Devuelve el mapa `idLocal → idDelServidor` de los bloques recién creados.
 */
export async function syncSlots(
  previous: TimeSlot[],
  next: TimeSlot[]
): Promise<Record<string, string>> {
  const usuarioId = currentUserId();
  const idMap: Record<string, string> = {};
  if (!isApiEnabled || !usuarioId) return idMap;

  const previousById = new Map(previous.map((slot) => [slot.id, slot]));
  const nextIds = new Set(next.map((slot) => slot.id));

  for (const slot of previous) {
    if (!nextIds.has(slot.id)) await deleteBlock(usuarioId, slot.id);
  }

  for (const slot of next) {
    const before = previousById.get(slot.id);
    if (!before) {
      idMap[slot.id] = await createBlock(usuarioId, slot);
    } else if (hasServerRelevantChange(before, slot)) {
      await updateBlock(usuarioId, slot);
    }
  }

  return idMap;
}
