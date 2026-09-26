export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
}

/**
 * Rol en la plataforma. No es el rol dentro de un grupo (`RolMiembro`): un
 * `ADMIN` opera Huecko y no participa en grupos.
 */
export type RolSistema = 'USUARIO' | 'ADMIN';

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  creado_en: string;
  /** Opcional: las sesiones guardadas antes de existir el rol no lo traen. Sin él, `USUARIO`. */
  rolSistema?: RolSistema;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
