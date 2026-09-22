/**
 * «Hace 5 min», «Ayer», «3 sept»… calculado al pintar.
 *
 * Los avisos guardaban el texto ya formateado («Ahora mismo») y, como se
 * persisten, días después seguían diciendo «Ahora mismo». Ahora se guarda la
 * fecha en ISO y el texto se calcula cada vez contra la hora actual.
 */

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

/** Medianoche local del día de `fecha`, para comparar días de calendario. */
function inicioDelDia(fecha: Date): number {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime();
}

export function tiempoRelativo(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';

  // Un reloj algo adelantado en otro sitio no debe dar «Hace -2 min».
  const diferencia = Math.max(0, ahora.getTime() - fecha.getTime());

  if (diferencia < MINUTO) return 'Ahora mismo';
  if (diferencia < HORA) return `Hace ${Math.floor(diferencia / MINUTO)} min`;

  const dias = Math.round((inicioDelDia(ahora) - inicioDelDia(fecha)) / DIA);
  if (dias === 0) return `Hace ${Math.floor(diferencia / HORA)} h`;
  if (dias === 1) return 'Ayer';
  if (dias < 7) return `Hace ${dias} días`;

  const diaMes = `${fecha.getDate()} ${MESES[fecha.getMonth()]}`;
  return fecha.getFullYear() === ahora.getFullYear() ? diaMes : `${diaMes} ${fecha.getFullYear()}`;
}

/** ¿Es una fecha ISO (o al menos algo que `Date` entiende)? */
export function esFechaValida(texto: unknown): texto is string {
  return typeof texto === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(texto) && !Number.isNaN(Date.parse(texto));
}
