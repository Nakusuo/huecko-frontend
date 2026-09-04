/**
 * Rutas del backend, en un solo sitio.
 *
 * Se escriben SIN el prefijo base: ese lo aporta `VITE_API_URL`
 * (p. ej. `/api` en desarrollo vía proxy, o `https://…/api` en producción).
 *
 * Marcadas con ✅ las que hoy existen en `huecko-backend`; con ⏳ las que el
 * frontend ya sabe consumir pero el backend todavía no expone (mientras tanto
 * el frontend cae a su modo demo). Ver `docs/INTEGRACION_BACKEND.md`.
 */

export const endpoints = {
  /** ⏳ Spring Security + JWT aún no está en el backend. */
  auth: {
    login: '/auth/login',
    register: '/auth/register',
  },

  /** ⏳ Perfil y preferencias del usuario autenticado. */
  me: '/me',

  /** ✅ BloqueHorarioController. */
  schedule: {
    blocks: (usuarioId: string) => `/usuarios/${usuarioId}/bloques-horario`,
    block: (usuarioId: string, bloqueId: string) =>
      `/usuarios/${usuarioId}/bloques-horario/${bloqueId}`,
    drafts: (usuarioId: string) => `/usuarios/${usuarioId}/bloques-horario/borradores`,
  },

  /** ⏳ Módulo 2: grupos y cruce de disponibilidad. */
  groups: {
    list: '/grupos',
    detail: (grupoId: string) => `/grupos/${grupoId}`,
    join: '/grupos/join',
    availability: (grupoId: string) => `/grupos/${grupoId}/disponibilidad`,
  },
} as const;
