import type { Location } from 'react-router-dom';

/**
 * Adónde volver tras entrar.
 *
 * `ProtectedRoute` manda al login con `state.from` = la página que se pedía
 * (por ejemplo, al expirar la sesión en mitad de un grupo). Solo se aceptan
 * rutas internas de la zona privada: nunca otra vez /login o /register.
 */
export function destinoTrasLogin(state: unknown, porDefecto = '/dashboard'): string {
  const from = (state as { from?: Partial<Location> } | null)?.from;
  const ruta = typeof from?.pathname === 'string' ? from.pathname : '';
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta === '/login' || ruta === '/register') {
    return porDefecto;
  }
  return `${ruta}${from?.search ?? ''}${from?.hash ?? ''}`;
}
