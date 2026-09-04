/**
 * Paleta de categorías de Huecko.
 *
 * Estos colores son DATOS, no cromo de interfaz: identifican bloques de horario,
 * materias y miembros de un grupo. Por eso viven aquí y no en `@theme`, que
 * gobierna los roles de la interfaz (primary, surface, outline…).
 *
 * Antes existían cuatro listas distintas —SchedulePage, GroupsPage y dos dentro
 * de ocrService— tres de ellas con los colores saturados por defecto de
 * Tailwind, que chocaban con la paleta sage. Esta es la única fuente de verdad.
 *
 * Cada tono está oscurecido a propósito hasta pasar 4.5:1 sobre fondo claro:
 * el color se pinta también como TEXTO del bloque, no solo como borde y relleno.
 */

export interface CategoryColor {
  name: string;
  hex: string;
}

export const CATEGORY_COLORS: CategoryColor[] = [
  { name: 'Bosque', hex: '#47624e' },
  { name: 'Pizarra', hex: '#4c6070' },
  { name: 'Arcilla', hex: '#8d5540' },
  { name: 'Oliva', hex: '#71713f' },
  { name: 'Ciruela', hex: '#614a5f' },
  { name: 'Terracota', hex: '#8f4a41' },
  { name: 'Índigo', hex: '#4b5279' },
  { name: 'Cobre', hex: '#74572f' },
];

/** Solo los hex, para asignación cíclica. */
export const CATEGORY_HEXES: string[] = CATEGORY_COLORS.map((c) => c.hex);

/** Color por defecto de un bloque nuevo. Es el primer swatch que ve el usuario,
 *  de modo que el valor inicial siempre coincide con una opción ofrecida. */
export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0].hex;

/** Devuelve un color estable por índice, dando la vuelta al final de la lista. */
export function colorByIndex(index: number): string {
  return CATEGORY_HEXES[index % CATEGORY_HEXES.length];
}

/**
 * Materias reconocidas por el OCR. Mantener la misma materia siempre del mismo
 * color ayuda a leer la rejilla semanal de un vistazo.
 */
export const SUBJECT_COLORS: Record<string, string> = {
  // Ciencias exactas
  matemática: '#4c6070',
  matematica: '#4c6070',
  matemáticas: '#4c6070',
  matematicas: '#4c6070',
  cálculo: '#4c6070',
  calculo: '#4c6070',
  álgebra: '#4c6070',
  algebra: '#4c6070',
  estadística: '#4b5279',
  estadistica: '#4b5279',
  física: '#8f4a41',
  fisica: '#8f4a41',
  química: '#47624e',
  quimica: '#47624e',

  // Computación
  algoritmos: '#614a5f',
  programación: '#4b5279',
  programacion: '#4b5279',
  software: '#8d5540',
  redes: '#47624e',
  sistemas: '#4c6070',
  base: '#4c6070',
  datos: '#4c6070',
  inteligencia: '#614a5f',
  artificial: '#614a5f',

  // Humanidades y otros
  comunicación: '#8d5540',
  comunicacion: '#8d5540',
  historia: '#74572f',
  'formación cívica': '#8f4a41',
  'formacion civica': '#8f4a41',
  civica: '#8f4a41',
  'educación física': '#8f4a41',
  'educacion fisica': '#8f4a41',
  educación: '#8f4a41',
  inglés: '#4b5279',
  ingles: '#4b5279',
  artística: '#614a5f',
  artistica: '#614a5f',
  biblioteca: '#71713f',
};
