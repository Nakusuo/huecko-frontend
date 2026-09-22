import type { Group, GroupMember, RolMiembro } from '../types/groups.types';

/**
 * Reglas de la gestión de grupos que no dependen de React ni del store.
 *
 * Viven aquí para que la creación de un grupo y la edición de sus integrantes
 * validen los correos igual, y para poder probar sin pantalla qué cambios
 * salen de comparar el formulario con el grupo guardado.
 */

/* ------------------------------------------------------------------ *
 * Correos
 * ------------------------------------------------------------------ */

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** El backend busca las cuentas sin distinguir mayúsculas: aquí tampoco. */
export function normalizarCorreo(correo: string): string {
  return correo.trim().toLowerCase();
}

export function esCorreoValido(correo: string): boolean {
  return FORMATO_CORREO.test(normalizarCorreo(correo));
}

/**
 * Comprueba un correo antes de añadirlo a una lista de altas.
 *
 * Devuelve el correo normalizado o el motivo por el que no vale. Un correo con
 * mal formato no llega a enviarse: antes acababa en la lista de «fallidos»
 * como si hubiera sido culpa del servidor.
 */
export function validarCorreoNuevo(
  texto: string,
  yaEnLaLista: readonly string[],
  correoPropio?: string,
): { correo: string } | { error: string } {
  const correo = normalizarCorreo(texto);
  if (!correo) return { error: 'Escribe un correo.' };
  if (!FORMATO_CORREO.test(correo)) return { error: 'Ese correo no tiene un formato válido.' };
  if (correoPropio && correo === normalizarCorreo(correoPropio)) {
    return { error: 'Ese es tu correo: ya formas parte del grupo.' };
  }
  if (yaEnLaLista.some((c) => normalizarCorreo(c) === correo)) {
    return { error: 'Ese correo ya está en la lista.' };
  }
  return { correo };
}

/* ------------------------------------------------------------------ *
 * Roles
 * ------------------------------------------------------------------ */

/**
 * Rol de un integrante. `ADMIN` es el nombre antiguo del modo demo; y un
 * integrante sin rol (datos de demo guardados antes de que existiera) organiza
 * si es quien creó el grupo.
 */
export function rolDe(grupo: Pick<Group, 'creadoPor'>, miembro: GroupMember): RolMiembro {
  if (miembro.rol === 'ORGANIZADOR' || miembro.rol === 'ADMIN') return 'ORGANIZADOR';
  if (miembro.rol === 'MIEMBRO') return 'MIEMBRO';
  return normalizarCorreo(miembro.email) === normalizarCorreo(grupo.creadoPor) ? 'ORGANIZADOR' : 'MIEMBRO';
}

export function esOrganizador(grupo: Pick<Group, 'creadoPor'>, miembro: GroupMember): boolean {
  return rolDe(grupo, miembro) === 'ORGANIZADOR';
}

/**
 * El integrante que corresponde a quien usa la app: por id con backend (el
 * correo de la cuenta podría haber cambiado) y por correo en el modo demo.
 */
export function miembroActual(
  grupo: Pick<Group, 'miembros'>,
  usuario: { id?: string | null; email?: string | null },
): GroupMember | undefined {
  const correo = usuario.email ? normalizarCorreo(usuario.email) : '';
  return grupo.miembros.find(
    (m) =>
      (usuario.id != null && usuario.id !== '' && (m.userId ?? m.id) === usuario.id) ||
      (correo !== '' && normalizarCorreo(m.email) === correo),
  );
}

export function cuantosOrganizadores(grupo: Pick<Group, 'creadoPor' | 'miembros'>): number {
  return grupo.miembros.filter((m) => esOrganizador(grupo, m)).length;
}

/* ------------------------------------------------------------------ *
 * Cambios del formulario de integrantes
 * ------------------------------------------------------------------ */

export interface BorradorGrupo {
  nombre: string;
  descripcion: string;
  umbral: number;
  miembros: GroupMember[];
}

export interface CambioDeMiembro {
  email: string;
  nombre: string;
  rol?: RolMiembro;
  isEssential?: boolean;
}

export interface CambiosDeGrupo {
  /** Solo los campos que cambiaron; `null` si ninguno. */
  datos: { nombre?: string; descripcion?: string; umbralDisponibilidad?: number } | null;
  /** Primero los ascensos a organizador: si no, bajar de rol a otro podía dejar el grupo sin nadie al mando. */
  cambios: CambioDeMiembro[];
  bajas: GroupMember[];
  altas: GroupMember[];
}

/**
 * Qué hay que pedirle al servidor para que el grupo quede como el borrador.
 *
 * Antes el formulario solo guardaba el umbral y las altas: quitar a alguien,
 * renombrar, cambiar la descripción o marcar imprescindible se perdía sin
 * aviso al cerrar.
 */
export function calcularCambios(original: Group, borrador: BorradorGrupo): CambiosDeGrupo {
  const datos: NonNullable<CambiosDeGrupo['datos']> = {};
  const nombre = borrador.nombre.trim();
  const descripcion = borrador.descripcion.trim();
  if (nombre && nombre !== original.nombre) datos.nombre = nombre;
  if (descripcion !== (original.descripcion ?? '').trim()) datos.descripcion = descripcion;
  if (borrador.umbral !== original.umbralDisponibilidad) datos.umbralDisponibilidad = borrador.umbral;

  const enBorrador = new Map(borrador.miembros.map((m) => [normalizarCorreo(m.email), m]));
  const enOriginal = new Map(original.miembros.map((m) => [normalizarCorreo(m.email), m]));

  const bajas = original.miembros.filter((m) => !enBorrador.has(normalizarCorreo(m.email)));
  const altas = borrador.miembros.filter((m) => !enOriginal.has(normalizarCorreo(m.email)));

  const cambios: CambioDeMiembro[] = [];
  for (const antes of original.miembros) {
    const despues = enBorrador.get(normalizarCorreo(antes.email));
    if (!despues) continue;

    const cambio: CambioDeMiembro = { email: antes.email, nombre: antes.nombre };
    const rolAntes = rolDe(original, antes);
    const rolDespues = rolDe(original, despues);
    if (rolAntes !== rolDespues) cambio.rol = rolDespues;
    if (antes.isEssential !== despues.isEssential) cambio.isEssential = despues.isEssential;
    if (cambio.rol !== undefined || cambio.isEssential !== undefined) cambios.push(cambio);
  }
  const peso = (c: CambioDeMiembro) => (c.rol === 'ORGANIZADOR' ? 0 : c.rol === 'MIEMBRO' ? 2 : 1);
  cambios.sort((a, b) => peso(a) - peso(b));

  return { datos: Object.keys(datos).length > 0 ? datos : null, cambios, bajas, altas };
}

export function hayCambios(cambios: CambiosDeGrupo): boolean {
  return (
    cambios.datos !== null ||
    cambios.cambios.length > 0 ||
    cambios.bajas.length > 0 ||
    cambios.altas.length > 0
  );
}
