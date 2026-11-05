/** Margen para decidir si Google acaba de crear la cuenta o ya existía. */
const MARGEN_CUENTA_NUEVA_MS = 5 * 60 * 1000;

/**
 * Si la cuenta se creó hace un momento. Entrar con Google desde el registro
 * puede dar una cuenta nueva (va a la bienvenida) o una que ya existía con
 * ese correo (va a donde iría tras el login).
 */
export const esCuentaRecienCreada = (creadoEn: string | undefined, ahora = Date.now()): boolean => {
  const momento = creadoEn ? Date.parse(creadoEn) : NaN;
  return Number.isFinite(momento) && ahora - momento >= -60_000 && ahora - momento < MARGEN_CUENTA_NUEVA_MS;
};
