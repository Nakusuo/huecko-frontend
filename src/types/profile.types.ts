export interface UserProfileData {
  id?: string;
  nombre: string;
  email: string;
  avatarUrl?: string;
  timezone: string;
  compartirDetallesHorario: boolean;
  notificacionesEmail: boolean;
  notificacionesWebSockets: boolean;
  creado_en?: string;
}

export interface UpdateProfilePayload {
  nombre?: string;
  timezone?: string;
  compartir_detalles_horario?: boolean;
  notificaciones_email?: boolean;
  notificaciones_websockets?: boolean;
}
