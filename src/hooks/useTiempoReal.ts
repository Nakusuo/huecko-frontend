import { useEffect, useState } from 'react';
import {
  alCambiarEstado,
  alRecibirEvento,
  conectarTiempoReal,
  desconectarTiempoReal,
  dejarDeEscucharGrupo,
  escucharGrupo,
} from '../lib/realtime';
import { isApiEnabled } from '../lib/apiClient';
import { useAuthStore } from '../store/authStore';
import { useGroupsStore } from '../store/groupsStore';
import { useNotificationStore } from '../store/notificationStore';
import { useIncidentsStore } from '../store/incidentsStore';
import { useProfileStore } from '../store/profileStore';
import type { PlanConfirmadoDatos, RealtimeEvent, RealtimeStatus } from '../types/realtime.types';

/**
 * Conecta la aplicación al canal en tiempo real y traduce cada evento a algo
 * visible (RNF-05).
 *
 * Va montado una sola vez, en `ProtectedRoute`, y no en cada página: si cada
 * vista abriera su propia conexión, navegar dejaría sockets huérfanos.
 *
 * Respeta el interruptor `notificacionesWebSockets` del perfil. Hasta ahora ese
 * ajuste existía en la interfaz sin estar conectado a nada.
 */
export function useTiempoReal(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activado = useProfileStore((s) => s.profile.notificacionesWebSockets);
  const groups = useGroupsStore((s) => s.groups);
  const fetchProposals = useGroupsStore((s) => s.fetchProposals);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const aplicarRetrasoRemoto = useIncidentsStore((s) => s.aplicarRetrasoRemoto);
  const aplicarVotacionAbierta = useIncidentsStore((s) => s.aplicarVotacionAbierta);
  const aplicarVotacionCerrada = useIncidentsStore((s) => s.aplicarVotacionCerrada);

  // --- conexión ---
  useEffect(() => {
    if (!isApiEnabled || !isAuthenticated || !activado) {
      desconectarTiempoReal();
      return;
    }
    conectarTiempoReal();
    return () => desconectarTiempoReal();
  }, [isAuthenticated, activado]);

  // --- una suscripción por grupo ---
  useEffect(() => {
    if (!isApiEnabled || !isAuthenticated || !activado) return;

    const ids = groups.map((g) => g.id);
    ids.forEach(escucharGrupo);
    return () => ids.forEach(dejarDeEscucharGrupo);
  }, [groups, isAuthenticated, activado]);

  // --- del evento a la interfaz ---
  useEffect(() => {
    if (!isApiEnabled) return;

    return alRecibirEvento((evento: RealtimeEvent) => {
      switch (evento.tipo) {
        case 'PLAN_CONFIRMADO': {
          const datos = evento.datos as unknown as PlanConfirmadoDatos;
          addNotification({
            type: 'confirmation',
            title: 'Plan confirmado',
            description: descripcionDePlanConfirmado(datos),
            groupId: evento.grupoId,
          });
          // El aviso dice la fecha, pero la vista del grupo sigue mostrando la
          // votación abierta hasta que se recarguen las propuestas.
          void fetchProposals(evento.grupoId);
          break;
        }

        case 'PLAN_CANCELADO': {
          addNotification({
            type: 'system',
            title: 'Plan cancelado',
            description: `"${String(evento.datos.titulo ?? 'El plan')}" se canceló: nadie votó antes del plazo.`,
            groupId: evento.grupoId,
          });
          void fetchProposals(evento.grupoId);
          break;
        }

        /* --- Módulo 4 --- */

        case 'RETRASO_REPORTADO': {
          const d = evento.datos as Record<string, unknown>;
          const planId = String(d.planId);
          const usuarioId = String(d.usuarioId);

          if (d.retirado === true) {
            aplicarRetrasoRemoto(planId, null, usuarioId);
            break;
          }

          aplicarRetrasoRemoto(planId, {
            usuarioId,
            nombreUsuario: String(d.nombreUsuario ?? 'Alguien'),
            minutosEstimados: Number(d.minutosEstimados ?? 0),
            reportadoEn: evento.ocurridoEn,
            corregido: false,
          }, usuarioId);

          addNotification({
            type: 'incident',
            title: 'Alguien llega tarde',
            description: `${d.nombreUsuario} llegará ${d.minutosEstimados} min tarde a "${d.tituloPlan}".`,
            groupId: evento.grupoId,
          });
          break;
        }

        /* --- Módulo 5 --- */

        case 'AUSENCIA_REPORTADA': {
          const d = evento.datos as Record<string, unknown>;
          addNotification({
            type: 'incident',
            title: 'Baja en el plan',
            description: d.motivo
              ? `${d.nombreUsuario} no irá a "${d.tituloPlan}": ${d.motivo}`
              : `${d.nombreUsuario} no irá a "${d.tituloPlan}".`,
            groupId: evento.grupoId,
          });
          break;
        }

        case 'VOTACION_EXPRES_ABIERTA': {
          const d = evento.datos as Record<string, unknown>;
          // Se pide al servidor en vez de construirla del evento: el recuento y
          // "mi voto" dependen de quién pregunta, y el topic es del grupo entero.
          void aplicarVotacionAbierta(String(d.planId));
          addNotification({
            type: 'incident',
            title: 'Hay que decidir',
            description: `${d.nombreReporta} no podrá ir a "${d.tituloPlan}". Vota antes de que venza el plazo.`,
            groupId: evento.grupoId,
          });
          break;
        }

        case 'VOTACION_EXPRES_CERRADA': {
          const d = evento.datos as Record<string, unknown>;
          const planId = String(d.planId);
          aplicarVotacionCerrada(planId);
          void fetchProposals(evento.grupoId);
          addNotification({
            type: 'confirmation',
            title: 'Decisión tomada',
            description: descripcionDeCierreExpres(d),
            groupId: evento.grupoId,
          });
          break;
        }

        default:
          break;
      }
    });
  }, [addNotification, fetchProposals, aplicarRetrasoRemoto, aplicarVotacionAbierta, aplicarVotacionCerrada]);
}

/** Estado de la conexión, para pintarlo donde haga falta. */
export function useEstadoTiempoReal() {
  const [estado, setEstado] = useState<RealtimeStatus>('desconectado');
  useEffect(() => alCambiarEstado(setEstado), []);
  return estado;
}

function descripcionDePlanConfirmado(datos: PlanConfirmadoDatos): string {
  const cuando = formatearFechaHora(datos.fecha, datos.horaInicio, datos.horaFin);
  return datos.lugar
    ? `"${datos.titulo}" queda el ${cuando} en ${datos.lugar}.`
    : `"${datos.titulo}" queda el ${cuando}.`;
}

/**
 * `2026-09-16` + `16:00` → `mié 16 de sep, 16:00–18:00`.
 *
 * Se construye la fecha con partes sueltas y no con `new Date(iso)`: un
 * `"2026-09-16"` a secas se interpreta como UTC y en Lima (GMT-5) mostraría el
 * día anterior.
 */
function formatearFechaHora(fecha: string, horaInicio: string, horaFin: string): string {
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
function recortarHora(hora: string): string {
  return hora.slice(0, 5);
}

/** «Decisión tomada» sin decir cuál no sirve de nada. */
function descripcionDeCierreExpres(datos: Record<string, unknown>): string {
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
