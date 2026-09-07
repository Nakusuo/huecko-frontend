import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { apiBaseUrl, isApiEnabled } from './apiClient';
import { useAuthStore } from '../store/authStore';
import type { RealtimeEvent, RealtimeStatus } from '../types/realtime.types';

/**
 * Cliente STOMP sobre WebSocket (RNF-05).
 *
 * Una sola conexión para toda la aplicación, con una suscripción por grupo.
 * Abrir una conexión por vista dejaría sockets huérfanos cada vez que el
 * usuario navega, y el backend acabaría con más sesiones abiertas que
 * usuarios.
 *
 * En modo demo (`VITE_API_URL` vacía) no se conecta nada: no hay servidor al
 * que hablar y los reintentos llenarían la consola de errores.
 */

const ENDPOINT = `${apiBaseUrl || '/api'}/ws`;

/** Espera antes de reintentar. Cinco segundos: el free tier tarda en despertar. */
const REINTENTO_MS = 5_000;

type Escucha = (evento: RealtimeEvent) => void;
type EscuchaEstado = (estado: RealtimeStatus) => void;

let cliente: Client | null = null;
let estado: RealtimeStatus = 'desconectado';

/** Suscripciones STOMP vivas, por id de grupo. */
const suscripciones = new Map<string, StompSubscription>();
/** Grupos que la aplicación quiere escuchar, aunque todavía no haya conexión. */
const gruposDeseados = new Set<string>();

const escuchas = new Set<Escucha>();
const escuchasEstado = new Set<EscuchaEstado>();

function destinoDeGrupo(grupoId: string): string {
  return `/topic/grupos/${grupoId}`;
}

function cambiarEstado(nuevo: RealtimeStatus) {
  if (estado === nuevo) return;
  estado = nuevo;
  escuchasEstado.forEach((fn) => fn(nuevo));
}

function repartir(mensaje: IMessage) {
  let evento: RealtimeEvent;
  try {
    evento = JSON.parse(mensaje.body) as RealtimeEvent;
  } catch {
    // Un mensaje ilegible no debe tumbar la conexión: se ignora.
    return;
  }
  escuchas.forEach((fn) => fn(evento));
}

function suscribirPendientes() {
  if (!cliente?.connected) return;
  gruposDeseados.forEach((grupoId) => {
    if (suscripciones.has(grupoId)) return;
    suscripciones.set(grupoId, cliente!.subscribe(destinoDeGrupo(grupoId), repartir));
  });
}

/**
 * Abre la conexión si hace falta. Idempotente: llamarla dos veces no crea dos
 * sockets.
 *
 * El token va en la cabecera del CONNECT, no en la URL, porque un token en el
 * query string acaba en los logs del servidor.
 */
export function conectarTiempoReal(): void {
  if (!isApiEnabled) return;

  const token = useAuthStore.getState().token;
  if (!token) return;

  if (cliente) {
    // Ya hay cliente: si estaba parado por un logout previo, se reactiva.
    if (!cliente.active) cliente.activate();
    return;
  }

  cambiarEstado('conectando');

  cliente = new Client({
    // SockJS y no WebSocket a pelo: el backend registra el endpoint con
    // `withSockJS()`, y algunas redes cortan el upgrade a WebSocket (RNF-08).
    webSocketFactory: () => new SockJS(ENDPOINT) as WebSocket,
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: REINTENTO_MS,
    // Latido en los dos sentidos: sin él, un proxy que corta la conexión en
    // silencio dejaría al cliente creyendo que sigue conectado.
    heartbeatIncoming: 10_000,
    heartbeatOutgoing: 10_000,
    onConnect: () => {
      cambiarEstado('conectado');
      suscripciones.clear(); // tras reconectar, las viejas ya no sirven
      suscribirPendientes();
    },
    onWebSocketClose: () => cambiarEstado('conectando'),
    onStompError: () => cambiarEstado('desconectado'),
  });

  cliente.activate();
}

/** Cierra la conexión y olvida las suscripciones. Se llama al cerrar sesión. */
export function desconectarTiempoReal(): void {
  gruposDeseados.clear();
  suscripciones.clear();
  cambiarEstado('desconectado');

  if (cliente) {
    void cliente.deactivate();
    cliente = null;
  }
}

/**
 * Declara interés en un grupo. Si aún no hay conexión, queda anotado y se
 * suscribe en cuanto la haya.
 */
export function escucharGrupo(grupoId: string): void {
  gruposDeseados.add(grupoId);
  suscribirPendientes();
}

export function dejarDeEscucharGrupo(grupoId: string): void {
  gruposDeseados.delete(grupoId);
  suscripciones.get(grupoId)?.unsubscribe();
  suscripciones.delete(grupoId);
}

/** Registra un consumidor de eventos. Devuelve la función para darse de baja. */
export function alRecibirEvento(fn: Escucha): () => void {
  escuchas.add(fn);
  return () => escuchas.delete(fn);
}

export function alCambiarEstado(fn: EscuchaEstado): () => void {
  escuchasEstado.add(fn);
  fn(estado); // el que se apunta quiere saber el estado actual, no el siguiente
  return () => escuchasEstado.delete(fn);
}

export function estadoTiempoReal(): RealtimeStatus {
  return estado;
}
