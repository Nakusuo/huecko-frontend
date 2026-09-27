import type { Location } from 'react-router-dom';
import { esRutaAdmin, INICIO_ADMIN, INICIO_USUARIO } from '../lib/rol';

/**
 * Adónde volver tras entrar.
 *
 * `ProtectedRoute` manda al login con `state.from` = la página que se pedía
 * (por ejemplo, al expirar la sesión en mitad de un grupo). Solo se aceptan
 * rutas internas de la zona privada: nunca otra vez /login o /register.
 *
 * Cada rol tiene su zona: el admin vuelve solo a páginas de `/admin` y una
 * cuenta normal nunca a ellas. Si no, un admin que entraba desde un enlace a
 * un grupo acababa en una pantalla que no es la suya.
 */
export function destinoTrasLogin(state: unknown, admin = false): string {
  const porDefecto = admin ? INICIO_ADMIN : INICIO_USUARIO;
  const from = (state as { from?: Partial<Location> } | null)?.from;
  const ruta = typeof from?.pathname === 'string' ? from.pathname : '';
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta === '/login' || ruta === '/register') {
    return porDefecto;
  }
  if (esRutaAdmin(ruta) !== admin) return porDefecto;
  return `${ruta}${from?.search ?? ''}${from?.hash ?? ''}`;
}
