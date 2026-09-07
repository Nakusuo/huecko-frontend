import type { AppNotification } from '../store/notificationStore';
import type { PlanConfirmadoDatos, RealtimeEvent } from '../types/realtime.types';

/**
 * De un evento del canal en tiempo real al aviso que ve el usuario.
 *
 * Vive aquí y no dentro de `useTiempoReal` porque es la parte que se puede
 * equivocar en silencio: si el backend añade un tipo y aquí no se contempla,
 * el evento se ignora sin que nada falle. Fuera del hook se puede probar.
 */

export interface AvisoDeEvento {
  type: AppNotification['type'];
  title: string;
  description: string;
}

/** `null` = este tipo no produce aviso (o no se reconoce). */
export function avisoDeEvento(evento: RealtimeEvent): AvisoDeEvento | null {
  const d = evento.datos as Record<string, unknown>;

  switch (evento.tipo) {
    case 'PLAN_CONFIRMADO':
      return {
        type: 'confirmation',
        title: 'Plan confirmado',
        description: descripcionDePlanConfirmado(evento.datos as unknown as PlanConfirmadoDatos),
      };

    case 'PLAN_CANCELADO':
      return {
        type: 'system',
        title: 'Plan cancelado',
        description: `"${String(d.titulo ?? 'El plan')}" se canceló: nadie votó antes del plazo.`,
      };

    case 'RETRASO_REPORTADO':
      // Retirar un aviso no genera notificación: quien llega a tiempo al final
      // no tiene por qué aparecer en la bandeja de nadie.
      if (d.retirado === true) return null;
      return {
        type: 'incident',
        title: 'Alguien llega tarde',
        description: `${d.nombreUsuario} llegará ${d.minutosEstimados} min tarde a "${d.tituloPlan}".`,
      };

    case 'AUSENCIA_REPORTADA':
      return {
        type: 'incident',
        title: 'Baja en el plan',
        description: d.motivo
          ? `${d.nombreUsuario} no irá a "${d.tituloPlan}": ${d.motivo}`
          : `${d.nombreUsuario} no irá a "${d.tituloPlan}".`,
      };

    case 'VOTACION_EXPRES_ABIERTA':
      return {
        type: 'incident',
        title: 'Hay que decidir',
        description: `${d.nombreReporta} no podrá ir a "${d.tituloPlan}". Vota antes de que venza el plazo.`,
      };

    case 'VOTACION_EXPRES_CERRADA':
      return {
        type: 'confirmation',
        title: 'Decisión tomada',
        description: descripcionDeCierreExpres(d),
      };

    default:
      return null;
  }
}

export function descripcionDePlanConfirmado(datos: PlanConfirmadoDatos): string {
  const cuando = formatearFechaHora(datos.fecha, datos.horaInicio, datos.horaFin);
  return datos.lugar
    ? `"${datos.titulo}" queda el ${cuando} en ${datos.lugar}.`
    : `"${datos.titulo}" queda el ${cuando}.`;
}

/** «Decisión tomada» sin decir cuál no sirve de nada. */
export function descripcionDeCierreExpres(datos: Record<string, unknown>): string {
  const titulo = String(datos.tituloPlan ?? 'El plan');
  const porDefecto = datos.porDefecto === true ? ' (nadie votó a tiempo)' : '';

  switch (datos.resultado) {
    case 'MANTENER':
      return `"${titulo}" sigue en pie${porDefecto}.`;
    case 'REAGENDAR':
      return `"${titulo}" vuelve a coordinación: hay que buscar otra fecha${porDefecto}.`;
    case 'CANCELAR':
      return `"${titulo}" se canceló${porDefecto}.`;
    default:
      return `Se cerró la votación de "${titulo}"${porDefecto}.`;
  }
}

/**
 * `2026-09-16` + `16:00` → `mié 16 de sep, 16:00–18:00`.
 *
 * Se construye la fecha con partes sueltas y no con `new Date(iso)`: un
 * `"2026-09-16"` a secas se interpreta como UTC y en Lima (GMT-5) mostraría el
 * día anterior.
 */
export function formatearFechaHora(fecha: string, horaInicio: string, horaFin: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const local = new Date(anio, mes - 1, dia);

  const texto = local.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return `${texto}, ${recortarHora(horaInicio)}–${recortarHora(horaFin)}`;
}

/** `16:00:00` → `16:00`. El backend serializa LocalTime con segundos si los hay. */
export function recortarHora(hora: string): string {
  return hora.slice(0, 5);
}
