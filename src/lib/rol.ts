import type { AuthUser } from '../types/auth.types';

export const INICIO_USUARIO = '/dashboard';
export const INICIO_ADMIN = '/admin';

export const esAdmin = (user: AuthUser | null | undefined): boolean => user?.rolSistema === 'ADMIN';

/** La portada de cada rol: el admin no tiene dashboard, horario ni grupos. */
export const inicioDe = (user: AuthUser | null | undefined): string => (esAdmin(user) ? INICIO_ADMIN : INICIO_USUARIO);

/** `/admin` y lo que cuelga de él; `/administracion` no cuenta. */
export const esRutaAdmin = (ruta: string): boolean => ruta === INICIO_ADMIN || ruta.startsWith(`${INICIO_ADMIN}/`);
