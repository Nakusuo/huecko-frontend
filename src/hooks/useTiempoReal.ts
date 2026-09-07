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
import type { RealtimeEvent, RealtimeStatus } from '../types/realtime.types';
import { avisoDeEvento } from '../lib/eventoTexto';

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
      /* El texto del aviso se arma fuera del hook, en `lib/eventoTexto`, donde
         sí se puede probar. Aquí queda solo el efecto: qué se recarga y qué se
         guarda en los stores. */
      const aviso = avisoDeEvento(evento);
      if (aviso) {
        addNotification({ ...aviso, groupId: evento.grupoId });
      }

      const d = evento.datos as Record<string, unknown>;

      switch (evento.tipo) {
        case 'PLAN_CONFIRMADO':
        case 'PLAN_CANCELADO':
          // El aviso ya dice la fecha, pero la vista del grupo seguiría
          // mostrando la votación abierta hasta recargar las propuestas.
          void fetchProposals(evento.grupoId);
          break;

        case 'RETRASO_REPORTADO': {
          const planId = String(d.planId);
          const usuarioId = String(d.usuarioId);
          aplicarRetrasoRemoto(
            planId,
            d.retirado === true
              ? null
              : {
                  usuarioId,
                  nombreUsuario: String(d.nombreUsuario ?? 'Alguien'),
                  minutosEstimados: Number(d.minutosEstimados ?? 0),
                  reportadoEn: evento.ocurridoEn,
                  corregido: false,
                },
            usuarioId,
          );
          break;
        }

        case 'VOTACION_EXPRES_ABIERTA':
          // Se pide al servidor en vez de construirla del evento: el recuento y
          // "mi voto" dependen de quién pregunta, y el topic es del grupo entero.
          void aplicarVotacionAbierta(String(d.planId));
          break;

        case 'VOTACION_EXPRES_CERRADA':
          aplicarVotacionCerrada(String(d.planId));
          void fetchProposals(evento.grupoId);
          break;

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
