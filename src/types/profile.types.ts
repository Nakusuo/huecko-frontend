/**
 * Perfil tal como lo devuelve `GET/PATCH /api/me` (`UsuarioResponse` en el
 * backend). El servidor no guarda nada más: ni zona horaria, ni preferencias
 * de notificaciones, ni foto.
 */
export interface UserProfileData {
  id: string;
  nombre: string;
  email: string;
  creado_en: string;
}

/** Cuerpo de `PATCH /api/me` (`ActualizarPerfilRequest`): los nulos no se tocan. */
export interface UpdateProfilePayload {
  nombre?: string;
  email?: string;
}

/**
 * Ajustes que solo existen en este navegador, guardados por cuenta. La interfaz
 * los etiqueta como «solo en este dispositivo» para no prometer lo que el
 * servidor no hace.
 */
export interface PreferenciasLocales {
  /** Foto reducida a 256 px, como data URL. */
  avatarUrl?: string;
  /** Mostrar en la campana los avisos de retrasos, bajas y votaciones exprés. */
  alertasRetrasos: boolean;
}
