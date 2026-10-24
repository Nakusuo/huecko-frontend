import { DAY_ORDER } from './formatoBackend';
import type { GroupOccupiedSlot } from '../store/groupsStore';
import type { Group } from '../types/groups.types';
import type { LibreAhora } from '../types/libre.types';

/* Los mismos límites que `LibreAhoraService` en el backend. */
export const MIN_MINUTOS = 10;
export const MAX_HORAS = 12;
export const MAX_NOTA = 60;
const FIN_DEL_DIA = '22:00';

/** «16:00». */
export function horaCorta(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export interface OpcionHasta {
  valor: string;
  texto: string;
}

/**
 * Hasta cuándo se puede avisar: lo que dice tu horario y unas cuantas horas
 * redondas. Todas entre 10 minutos y 12 horas, sin repetidas.
 */
export function opcionesHasta(ahora: Date, sugerencia: string | null): OpcionHasta[] {
  const minimo = ahora.getTime() + MIN_MINUTOS * 60_000;
  const maximo = ahora.getTime() + MAX_HORAS * 3_600_000;
  const opciones: OpcionHasta[] = [];
  const vistas = new Set<string>();
  const agregar = (fecha: Date, texto: string) => {
    const t = fecha.getTime();
    const clave = horaCorta(fecha.toISOString());
    if (t < minimo || t > maximo || vistas.has(clave)) return;
    vistas.add(clave);
    opciones.push({ valor: fecha.toISOString(), texto });
  };

  if (sugerencia) {
    agregar(new Date(sugerencia), `Hasta las ${horaCorta(sugerencia)} (según tu horario)`);
  }
  for (const horas of [1, 2, 3, 4]) {
    const fecha = new Date(ahora.getTime() + horas * 3_600_000);
    agregar(fecha, `${horas} ${horas === 1 ? 'hora' : 'horas'} (hasta las ${horaCorta(fecha.toISOString())})`);
  }
  return opciones;
}

/* ------------------------------------------------------------------ *
 * Modo demo
 * ------------------------------------------------------------------ */

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** Si a esa hora del día tiene un bloque, con la misma regla que el backend. */
function enClaseDemo(slots: GroupOccupiedSlot[], email: string, ahora: Date): boolean {
  const dia = DAY_ORDER[(ahora.getDay() + 6) % 7];
  const minuto = ahora.getHours() * 60 + ahora.getMinutes();
  return slots.some((s) => {
    if (s.userEmail.toLowerCase() !== email.toLowerCase() || s.day !== dia) return false;
    const inicio = minutos(s.startTime);
    const fin = minutos(s.endTime) <= inicio ? 24 * 60 : minutos(s.endTime);
    return inicio <= minuto && minuto < fin;
  });
}

function sugerenciaDemo(slots: GroupOccupiedSlot[], email: string, ahora: Date): string | null {
  if (enClaseDemo(slots, email, ahora)) return null;
  const dia = DAY_ORDER[(ahora.getDay() + 6) % 7];
  const minuto = ahora.getHours() * 60 + ahora.getMinutes();
  const siguientes = slots
    .filter((s) => s.userEmail.toLowerCase() === email.toLowerCase() && s.day === dia && minutos(s.startTime) > minuto)
    .map((s) => minutos(s.startTime));
  const fin = siguientes.length ? Math.min(...siguientes) : minutos(FIN_DEL_DIA);
  const hasta = new Date(ahora);
  hasta.setHours(Math.floor(fin / 60), fin % 60, 0, 0);
  // De noche el horario ya no dice nada (igual que el backend).
  if (hasta.getTime() < ahora.getTime() + MIN_MINUTOS * 60_000) return null;
  return hasta.toISOString();
}

/** Personas de ejemplo que «avisaron» en la demo: así la tarjeta no sale vacía en una presentación. */
const AVISOS_DEMO: { email: string; nombre: string; minutos: number; nota: string }[] = [
  { email: 'maria.c@huecko.com', nombre: 'María C.', minutos: 95, nota: 'En la cafetería del pabellón B' },
  { email: 'carlos.m@huecko.com', nombre: 'Carlos M.', minutos: 150, nota: 'Pichanga en la losa' },
];

/** Redondea a los 5 minutos siguientes, como haría alguien al elegir una hora. */
function enCincoMinutos(fecha: Date): Date {
  const redonda = new Date(fecha);
  redonda.setSeconds(0, 0);
  redonda.setMinutes(Math.ceil(redonda.getMinutes() / 5) * 5);
  return redonda;
}

export function libreAhoraDemo(entrada: {
  grupos: Group[];
  slots: GroupOccupiedSlot[];
  miEmail: string;
  miAviso: LibreAhora['yo'];
  ahora: Date;
}): LibreAhora {
  const { grupos, slots, miEmail, miAviso, ahora } = entrada;
  const vigente = miAviso && new Date(miAviso.hasta).getTime() > ahora.getTime() ? miAviso : null;
  return {
    yo: vigente,
    enClase: enClaseDemo(slots, miEmail, ahora),
    sugerencia: sugerenciaDemo(slots, miEmail, ahora),
    grupos: grupos.map((g) => ({
      grupoId: g.id,
      nombre: g.nombre,
      sinClase: g.miembros.filter((m) => !enClaseDemo(slots, m.email, ahora)).length,
      total: g.miembros.length,
      personas: AVISOS_DEMO.filter((a) => g.miembros.some((m) => m.email.toLowerCase() === a.email)).map((a) => ({
        usuarioId: a.email,
        nombre: a.nombre,
        fotoActualizadaEn: null,
        hasta: enCincoMinutos(new Date(ahora.getTime() + a.minutos * 60_000)).toISOString(),
        nota: a.nota,
      })),
    })),
  };
}
