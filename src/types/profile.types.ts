import type { AuthUser, PerfilSocial } from './auth.types';

/**
 * Perfil tal como lo devuelve `GET/PATCH /api/me` (`UsuarioResponse` en el
 * backend): la cuenta, el perfil social y la fecha de la última foto. Ni zona
 * horaria ni preferencias de notificaciones: esas viven en este navegador.
 */
export type UserProfileData = AuthUser & PerfilSocial;

/** Cuerpo de `PATCH /api/me` (`ActualizarPerfilRequest`): los nulos no se tocan. */
export interface UpdateProfilePayload {
  nombre?: string;
  email?: string;
  /** Solo al cambiar el correo: el servidor la exige (el correo es la llave de la cuenta). */
  passwordActual?: string;
}

/** Espejo de `PerfilPublicoService.Insignia`, de la más fácil a la más difícil. */
export type Insignia = 'PRIMER_PLAN' | 'HABITUAL' | 'PUNTUAL' | 'ORGANIZA';

/** `GET /api/me/logros`. Los números solo los ves tú; a los demás les llegan las insignias. */
export interface Logros {
  /** Planes confirmados que ya empezaron y a los que no avisaste que faltarías. */
  planesVividos: number;
  /** De esos, a los que no avisaste de un retraso. */
  aTiempo: number;
  /** Planes que propusiste y no se cancelaron. */
  propuestos: number;
  insignias: Insignia[];
}

/**
 * `GET /api/usuarios/{id}/perfil`: la tarjeta de alguien con quien compartes
 * un grupo. Nada de su horario (RNF-02).
 */
export interface PerfilPublico extends PerfilSocial {
  usuarioId: string;
  nombre: string;
  fotoActualizadaEn: string | null;
  enHueckoDesde: string;
  /** Los grupos que tienen en común; todos los tuyos si miras tu propia tarjeta. */
  gruposEnComun: string[];
  /** Planes a los que fueron los dos. `null` en tu propia tarjeta. */
  planesJuntos: number | null;
  insignias: Insignia[];
}

/**
 * Ajustes que solo existen en este navegador, guardados por cuenta. La interfaz
 * los etiqueta como «solo en este dispositivo» para no prometer lo que el
 * servidor no hace.
 */
export interface PreferenciasLocales {
  /**
   * Foto reducida a 256 px, como data URL. Solo en modo demo, o la que alguien
   * guardó antes de que el servidor guardara fotos (el perfil le ofrece subirla).
   */
  avatarUrl?: string;
  /** Mostrar en la campana los avisos de retrasos, bajas y votaciones exprés. */
  alertasRetrasos: boolean;
}
