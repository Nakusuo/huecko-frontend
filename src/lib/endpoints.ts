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

  /**
   * ✅ PlanController (Módulo 3).
   *
   * Listar y crear cuelgan del grupo, porque un plan no existe fuera de uno.
   * Las de un plan concreto no lo repiten: el plan ya sabe a qué grupo
   * pertenece, y arrastrar el `grupoId` abriría la puerta a que los dos
   * identificadores no coincidieran.
   */
  plans: {
    byGroup: (grupoId: string) => `/grupos/${grupoId}/planes`,
    detail: (planId: string) => `/planes/${planId}`,
    vote: (planId: string, ventanaId: string) => `/planes/${planId}/ventanas/${ventanaId}/voto`,
    close: (planId: string) => `/planes/${planId}/cerrar`,
  },

  /**
   * ✅ RetrasoController (Módulo 4) e ImprevistoController (Módulo 5).
   *
   * Cuelgan del plan y no del grupo: un retraso o una ausencia siempre lo son
   * respecto de un evento concreto, y el plan ya sabe a qué grupo pertenece.
   */
  incidents: {
    /** RF-14: estado de puntualidad de todos. */
    retrasos: (planId: string) => `/planes/${planId}/retrasos`,
    /** RF-12: el mío. `PUT` porque repetirlo corrige, no acumula. */
    miRetraso: (planId: string) => `/planes/${planId}/retrasos/mio`,
    /** RF-15: reportar que no podré ir. */
    imprevistos: (planId: string) => `/planes/${planId}/imprevistos`,
    /** RF-17: la votación exprés abierta. Devuelve 204 si no hay ninguna. */
    votacionExpres: (planId: string) => `/planes/${planId}/votacion-expres`,
    votoExpres: (planId: string) => `/planes/${planId}/votacion-expres/voto`,
  },

  /**
   * ✅ WebSocketConfig (RNF-05).
   *
   * No se pide con axios: lo abre `lib/realtime.ts` con SockJS. Se apunta aquí
   * para que las rutas del backend sigan estando todas en un mismo sitio.
   *
   * El JWT viaja en la cabecera del frame CONNECT, no en la URL.
   */
  realtime: {
    /** Handshake de SockJS. */
    endpoint: '/ws',
    /** Topic al que se suscribe cada grupo. */
    topicGrupo: (grupoId: string) => `/topic/grupos/${grupoId}`,
  },
} as const;
