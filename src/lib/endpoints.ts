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

  /**
   * ✅ MeController y UsuarioController: perfil social, foto y logros. La foto
   * y la tarjeta de otra persona solo responden si compartes un grupo con ella.
   */
  perfil: {
    social: '/me/perfil',
    miFoto: '/me/foto',
    logros: '/me/logros',
    publico: (usuarioId: string) => `/usuarios/${usuarioId}/perfil`,
    foto: (usuarioId: string) => `/usuarios/${usuarioId}/foto`,
  },

  /** ✅ LibreAhoraController: GET el estado, PUT «Estoy libre», DELETE para quitarlo. */
  libreAhora: '/me/libre-ahora',

  /** ✅ MuroController: `?antes=` con el `siguiente` de la página anterior. */
  muro: (grupoId: string) => `/grupos/${grupoId}/muro`,

  /** ✅ LlegadaController: GET el estado, PUT «Llegué», DELETE para deshacerlo. */
  llegadas: (planId: string) => `/planes/${planId}/llegadas`,

  /** ✅ AlbumController: solo para la gente del grupo (si no, 404). */
  album: {
    grupo: (grupoId: string) => `/grupos/${grupoId}/album`,
    /** GET el álbum del plan; POST multipart (partes «fotos») para subir. */
    plan: (planId: string) => `/planes/${planId}/fotos`,
    /** GET la foto, DELETE para borrarla. */
    foto: (fotoId: string) => `/fotos/${fotoId}`,
    miniatura: (fotoId: string) => `/fotos/${fotoId}/miniatura`,
    /** PUT para poner la reacción, DELETE para quitarla. */
    reaccion: (fotoId: string, reaccion: string) => `/fotos/${fotoId}/reacciones/${reaccion}`,
    /** GET los comentarios, POST `{texto}` para comentar. */
    comentarios: (fotoId: string) => `/fotos/${fotoId}/comentarios`,
    comentario: (comentarioId: string) => `/comentarios/${comentarioId}`,
  },

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
    /** Entrar con el código de invitación (`{codigo}`). */
    unirse: '/grupos/unirse',
    /** POST: código nuevo; DELETE: desactivarlo. Solo quien organiza. */
    codigo: (grupoId: string) => `/grupos/${grupoId}/codigo`,
    /** Alta de integrante por correo, decidida por quien organiza. */
    miembros: (grupoId: string) => `/grupos/${grupoId}/miembros`,
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
    /** Vuelve a votar con opciones nuevas un plan en re-coordinación. */
    reschedule: (planId: string) => `/planes/${planId}/reagendar`,
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
    /** Quién avisó de que no irá, crítico o no. */
    ausencias: (planId: string) => `/planes/${planId}/ausencias`,
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

  /**
   * ✅ IaController: funciones de IA que pide la persona (traídas de la app
   * móvil). Cada una gasta cupo; si la IA no responde llega un 503 y la
   * pantalla sigue sin ella.
   */
  ia: {
    estado: '/ia/estado',
    /** Multipart con el campo `imagen`. No guarda nada. */
    escaneoHorario: '/ia/horario/escaneo',
    /** `{texto}` → borrador para «Proponer plan». No guarda nada. */
    borradorPlan: (grupoId: string) => `/grupos/${grupoId}/ia/borrador-plan`,
    /** Sin cuerpo → 3 ideas de plan para los huecos del grupo. No guarda nada. */
    ideasPlan: (grupoId: string) => `/grupos/${grupoId}/ia/ideas-plan`,
    /** Sin cuerpo → cómo va la votación de un plan. No cambia nada. */
    resumenVotacion: (planId: string) => `/planes/${planId}/ia/resumen`,
  },

  /** ✅ AdminController. Solo cuentas ADMIN; una cuenta normal recibe 403. */
  admin: {
    resumen: '/admin/resumen',
    /** Uso de Huecko IA por función en el último mes. */
    ia: '/admin/ia',
    pendientes: '/admin/pendientes',
    salud: '/admin/salud',
    fallos: '/admin/fallos',
    estadoFallo: (id: string) => `/admin/fallos/${id}/estado`,
    reportes: '/admin/reportes',
    estadoReporte: (id: string) => `/admin/reportes/${id}/estado`,
    suspensionReporte: (id: string) => `/admin/reportes/${id}/suspension`,
    /** GET para verla, DELETE para quitarla: la foto de la cuenta que señala un reporte de conducta. */
    fotoReporte: (id: string) => `/admin/reportes/${id}/foto`,
    logs: '/admin/consola/logs',
    configuracion: '/admin/consola/configuracion',
  },

  /** ✅ ReporteController. Cualquier cuenta: «Reportar un problema» y errores del navegador. */
  reportes: {
    crear: '/reportes',
    errores: '/reportes/errores',
  },
} as const;
