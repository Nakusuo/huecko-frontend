export type DayOfWeek = 'Lun' | 'Mar' | 'Mié' | 'Jue' | 'Vie' | 'Sáb' | 'Dom';

export type TipoBloqueApi = 'RECURRENTE' | 'PUNTUAL';
export type FuenteBloqueApi = 'MANUAL' | 'OCR';
export type EstadoBloqueApi = 'BORRADOR' | 'CONFIRMADO';

export interface BloqueHorarioRequest {
  tipo: TipoBloqueApi;
  diaSemana?: number | null; // 1 = Lunes ... 7 = Domingo
  fecha?: string | null;     // YYYY-MM-DD
  horaInicio: string;        // HH:mm o HH:mm:ss
  horaFin: string;           // HH:mm o HH:mm:ss
  etiqueta?: string;
}

export interface BloqueHorarioResponse {
  id: string;
  usuarioId: string;
  tipo: TipoBloqueApi;
  diaSemana?: number | null;
  fecha?: string | null;
  horaInicio: string;
  horaFin: string;
  etiqueta?: string;
  fuente: FuenteBloqueApi;
  estado: EstadoBloqueApi;
}

export interface TimeSlot {
  id: string;
  title: string;
  day: DayOfWeek;
  startTime: string; // e.g. "08:00"
  endTime: string;   // e.g. "11:00"
  colorClass: string;
  textColorClass: string;
  customColor?: string;
  type?: 'recurrente' | 'puntual';
  tag?: string;
  frequency?: 'semanal' | 'unica';
  specificDate?: string;
  specificEndDate?: string;
  isOcrImported?: boolean;
  estado?: 'borrador' | 'confirmado';
}

const DAY_OF_WEEK_MAP: Record<DayOfWeek, number> = {
  Lun: 1,
  Mar: 2,
  Mié: 3,
  Jue: 4,
  Vie: 5,
  Sáb: 6,
  Dom: 7,
};

const NUMBER_TO_DAY_MAP: Record<number, DayOfWeek> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
  7: 'Dom',
};

export function dayOfWeekToDayNumber(day: DayOfWeek): number {
  return DAY_OF_WEEK_MAP[day] ?? 1;
}

export function dayNumberToDayOfWeek(num?: number | null): DayOfWeek {
  if (!num) return 'Lun';
  return NUMBER_TO_DAY_MAP[num] ?? 'Lun';
}

export function normalizeTimeForApi(timeStr: string): string {
  if (!timeStr) return '08:00:00';
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  }
  if (parts.length === 3) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  }
  return timeStr;
}

export function normalizeTimeForUi(timeStr: string): string {
  if (!timeStr) return '08:00';
  const parts = timeStr.trim().split(':');
  return `${parts[0].padStart(2, '0')}:${(parts[1] || '00').padStart(2, '0')}`;
}

export function toBloqueHorarioRequest(slot: Partial<TimeSlot>): BloqueHorarioRequest {
  const isRecurrente = slot.type === 'recurrente' || slot.frequency === 'semanal' || !slot.specificDate;
  return {
    tipo: isRecurrente ? 'RECURRENTE' : 'PUNTUAL',
    diaSemana: isRecurrente && slot.day ? dayOfWeekToDayNumber(slot.day) : null,
    fecha: !isRecurrente ? (slot.specificDate || new Date().toISOString().split('T')[0]) : null,
    horaInicio: normalizeTimeForApi(slot.startTime || '08:00'),
    horaFin: normalizeTimeForApi(slot.endTime || '09:00'),
    etiqueta: slot.title || slot.tag || 'Sin etiqueta',
  };
}

export function toTimeSlot(dto: BloqueHorarioResponse): TimeSlot {
  const isRecurrente = dto.tipo === 'RECURRENTE';
  return {
    id: dto.id,
    title: dto.etiqueta || 'Bloque Horario',
    day: isRecurrente ? dayNumberToDayOfWeek(dto.diaSemana) : 'Lun',
    startTime: normalizeTimeForUi(dto.horaInicio),
    endTime: normalizeTimeForUi(dto.horaFin),
    colorClass: '',
    textColorClass: '',
    customColor: '#3b82f6',
    type: isRecurrente ? 'recurrente' : 'puntual',
    tag: dto.etiqueta,
    frequency: isRecurrente ? 'semanal' : 'unica',
    specificDate: dto.fecha || undefined,
    isOcrImported: dto.fuente === 'OCR',
    estado: dto.estado === 'BORRADOR' ? 'borrador' : 'confirmado',
  };
}
