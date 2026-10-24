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

/** Lo que ve el resto de tus grupos en tu tarjeta (`PUT /api/me/perfil`). Todo opcional. */
export interface PerfilSocial {
  carrera: string | null;
  /** Ciclo académico, de 1 a 14. */
  ciclo: number | null;
  bio: string | null;
  intereses: string[];
}

/* El perfil social y la foto son opcionales: las sesiones guardadas antes de
   que existieran no los traen. */
export interface AuthUser extends Partial<PerfilSocial> {
  id: string;
  nombre: string;
  email: string;
  creado_en: string;
  /** Opcional: las sesiones guardadas antes de existir el rol no lo traen. Sin él, `USUARIO`. */
  rolSistema?: RolSistema;
  /** Cuándo cambió la foto; nulo si no tiene. Sirve de versión para no pedirla dos veces. */
  fotoActualizadaEn?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
