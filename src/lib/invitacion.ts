/**
 * Enlace de invitación para el QR: abre «Unirme con código» con el código ya
 * escrito. Si quien lo escanea no ha iniciado sesión, el login lo devuelve
 * aquí después (ver `destinoTrasLogin`).
 */
export function enlaceDeInvitacion(codigo: string, origen: string): string {
  return `${origen.replace(/\/+$/, '')}/groups?unirse=${encodeURIComponent(codigo)}`;
}

/**
 * El código que trae la URL, si parece uno. Se filtra lo que no sea letra o
 * número para no rellenar el formulario con cualquier cosa que alguien meta
 * en un enlace; el servidor valida igual.
 */
export function codigoDelEnlace(valor: string | null): string | null {
  if (!valor) return null;
  const limpio = valor.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16);
  return limpio.length >= 4 ? limpio : null;
}
