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
  /** ✅ AuthController + Spring Security con JWT. */
  auth: {
    login: '/auth/login',
    register: '/auth/register',
  },

  /** ✅ MeController. */
  me: '/me',

  /** ✅ BloqueHorarioController. */
  schedule: {
    blocks: (usuarioId: string) => `/usuarios/${usuarioId}/bloques-horario`,
    block: (usuarioId: string, bloqueId: string) =>
      `/usuarios/${usuarioId}/bloques-horario/${bloqueId}`,
    drafts: (usuarioId: string) => `/usuarios/${usuarioId}/bloques-horario/borradores`,
  },

  /**
   * ✅ GrupoController (Módulo 2).
   *
   * Aquí el usuario NO viaja por la URL: el backend lo saca del JWT. Por eso
   * no hay ningún `usuarioId` en las rutas de listado, a diferencia de las de
   * horario, donde todavía es un `@PathVariable` temporal.
   */
  groups: {
    list: '/grupos',
    detail: (grupoId: string) => `/grupos/${grupoId}`,
    join: '/grupos/unirse',
    member: (grupoId: string, usuarioId: string) => `/grupos/${grupoId}/miembros/${usuarioId}`,
    availability: (grupoId: string) => `/grupos/${grupoId}/disponibilidad`,
  },

  /** ⏳ Módulos 3–5: planes, votaciones, retrasos e imprevistos. */
  events: {
    byGroup: (grupoId: string) => `/grupos/${grupoId}/eventos`,
  },
} as const;
