import type { PerfilSocial } from '../types/auth.types';

/* Los mismos límites que `PerfilSocialRequest` en el backend. */
export const MAX_CARRERA = 80;
export const MAX_BIO = 160;
export const MAX_INTERESES = 8;
export const MAX_INTERES = 24;
export const CICLOS = Array.from({ length: 14 }, (_, i) => i + 1);

/** Sin comas: el backend guarda los intereses juntos, separados por comas. */
const INTERES_VALIDO = /^[\p{L}\p{N} .+#&'-]+$/u;

const limpiar = (texto: string) => texto.trim().replace(/\s+/g, ' ');

/**
 * Añade un interés a la lista. Devuelve la lista nueva o el motivo por el que
 * no se puede, para enseñarlo junto al campo.
 */
export function agregarInteres(lista: string[], texto: string): { lista: string[] } | { error: string } {
  const interes = limpiar(texto);
  if (!interes) return { error: 'Escribe un interés.' };
  if (interes.length > MAX_INTERES) return { error: `Cada interés puede tener hasta ${MAX_INTERES} caracteres.` };
  if (!INTERES_VALIDO.test(interes)) return { error: 'Solo letras, números y espacios.' };
  if (lista.some((i) => i.toLowerCase() === interes.toLowerCase())) return { error: 'Ya lo tienes en la lista.' };
  if (lista.length >= MAX_INTERESES) return { error: `Como mucho ${MAX_INTERESES} intereses.` };
  return { lista: [...lista, interes] };
}

/** Lo que se envía: textos recortados y los vacíos como `null`, igual que los guarda el backend. */
export function perfilParaGuardar(perfil: PerfilSocial): PerfilSocial {
  const texto = (valor: string | null) => (valor && limpiar(valor) ? limpiar(valor) : null);
  return {
    carrera: texto(perfil.carrera),
    ciclo: perfil.ciclo,
    bio: texto(perfil.bio),
    intereses: perfil.intereses,
  };
}
