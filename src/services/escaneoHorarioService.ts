import { apiClient, ApiError, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { numberToDay } from '../lib/formatoBackend';
import { colorByIndex } from '../theme/palette';
import type { OcrExtractedSlot } from './ocrService';

/**
 * Leer el horario de una foto, como en la app móvil.
 *
 * Con backend, primero lo intenta Huecko IA (Gemini, vía `huecko-backend`).
 * Si la IA no responde, se acabó el cupo o no está encendida, lo lee el lector
 * del navegador (Tesseract), que es peor pero no depende de nadie, y se avisa
 * de por qué. En modo demo no hay IA: siempre el lector del navegador.
 *
 * Nada se guarda aquí: las filas van al modal de revisión y solo se crean los
 * bloques que la persona confirme.
 */

/** Un bloque de `POST /ia/horario/escaneo` (EscaneoHorarioResponse.Bloque). */
export interface BloqueEscaneadoDto {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  titulo: string;
  /** La IA tuvo que adivinar el día o la hora. */
  dudoso: boolean;
}

export type MotorLectura = 'ia' | 'local';

export interface LecturaHorario {
  slots: OcrExtractedSlot[];
  motor: MotorLectura;
  /** Por qué no se usó la IA, cuando se intentó. */
  aviso?: string;
}

type Progreso = (percent: number, status: string) => void;

/** El backend espera a la IA hasta 30 s; aquí, algo más para no cortar antes que él. */
const ESPERA_IA_MS = 45_000;
/** Como en la app móvil: más resolución no mejora la lectura y la subida pesa más. */
const LADO_MAXIMO = 2000;
const PESO_MAXIMO = 2 * 1024 * 1024;

export const AVISO_SIN_IA = 'Huecko IA no respondió, así que se leyó con el lector del navegador, que se equivoca más.';
export const AVISO_SIN_CUPO = 'Usaste mucho la IA en poco tiempo: esta vez se leyó con el lector del navegador.';

/**
 * Las filas que espera el modal de revisión. Un bloque dudoso sale sin marcar
 * y con su aviso, igual que las filas que el lector local no supo ubicar:
 * presentarlo como seguro colaría en el horario una hora que la IA adivinó.
 */
export function bloquesAFilas(bloques: BloqueEscaneadoDto[], ahora = Date.now()): OcrExtractedSlot[] {
  // Un mismo curso en varios días comparte color, como en el horario.
  const colores = new Map<string, string>();
  return bloques.map((bloque, indice) => {
    const curso = bloque.titulo.trim().toLowerCase();
    if (!colores.has(curso)) colores.set(curso, colorByIndex(colores.size));
    return {
      id: `ia-${ahora}-${indice}`,
      title: bloque.titulo.trim(),
      day: numberToDay(bloque.diaSemana),
      startTime: bloque.horaInicio,
      endTime: bloque.horaFin,
      customColor: colores.get(curso)!,
      selected: !bloque.dudoso,
      tag: 'Clase',
      revisar: bloque.dudoso ? 'Huecko IA no está segura del día o la hora' : undefined,
    };
  });
}

/** Por qué no se usó la IA, en palabras de la persona. `null`: no se debe seguir sin ella. */
export function avisoPorFallo(error: unknown): string | null {
  // Sesión caducada: apiClient ya la cerró y el login lo explica.
  if (error instanceof ApiError && error.status === 401) return null;
  if (error instanceof ApiError && error.status === 429) return AVISO_SIN_CUPO;
  return AVISO_SIN_IA;
}

export async function leerHorario(archivo: File, onProgress?: Progreso): Promise<LecturaHorario> {
  if (!isApiEnabled) {
    return { slots: await leerEnElNavegador(archivo, onProgress), motor: 'local' };
  }
  try {
    return { slots: await leerConIA(archivo, onProgress), motor: 'ia' };
  } catch (error) {
    const aviso = avisoPorFallo(error);
    if (aviso === null) throw error;
    return { slots: await leerEnElNavegador(archivo, onProgress), motor: 'local', aviso };
  }
}

async function leerEnElNavegador(archivo: File, onProgress?: Progreso): Promise<OcrExtractedSlot[]> {
  const { processScheduleOcr } = await import('./ocrService');
  const { slots } = await processScheduleOcr(archivo, onProgress);
  return slots;
}

async function leerConIA(archivo: File, onProgress?: Progreso): Promise<OcrExtractedSlot[]> {
  onProgress?.(10, 'Preparando la imagen...');
  const imagen = await prepararImagen(archivo);

  const datos = new FormData();
  datos.append('imagen', imagen, `horario.${imagen.type === 'image/png' ? 'png' : imagen.type === 'image/webp' ? 'webp' : 'jpg'}`);

  /* La IA no informa de su avance: la barra avanza sola hasta el 90 % para
     que se vea que sigue trabajando, y salta al final cuando responde. */
  let avance = 30;
  onProgress?.(avance, 'Huecko IA está leyendo tu horario. Puede tardar unos segundos...');
  const reloj = setInterval(() => {
    avance = Math.min(90, avance + 3);
    onProgress?.(avance, 'Huecko IA está leyendo tu horario. Puede tardar unos segundos...');
  }, 600);

  try {
    const { data } = await apiClient.post<{ bloques?: BloqueEscaneadoDto[] }>(endpoints.ia.escaneoHorario, datos, {
      // Sin esto, axios convierte el FormData en JSON por la cabecera por
      // defecto del cliente. Con ella, el navegador pone el `boundary`.
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: ESPERA_IA_MS,
    });
    const filas = bloquesAFilas(data.bloques ?? []);
    onProgress?.(100, filas.length ? 'Horario leído. Revisa los bloques antes de guardarlos.' : 'No se encontraron bloques.');
    return filas;
  } finally {
    clearInterval(reloj);
  }
}

/** La IA solo acepta imágenes: un PDF va como su primera página. Las fotos grandes se reducen. */
async function prepararImagen(archivo: File): Promise<Blob> {
  const esPdf = archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
  if (esPdf) {
    const { primeraPaginaComoImagen } = await import('./ocrService');
    return primeraPaginaComoImagen(archivo, LADO_MAXIMO);
  }
  return reducirSiHaceFalta(archivo);
}

async function reducirSiHaceFalta(foto: File): Promise<Blob> {
  const mapa = await createImageBitmap(foto);
  try {
    const lado = Math.max(mapa.width, mapa.height);
    if (lado <= LADO_MAXIMO && foto.size <= PESO_MAXIMO) return foto;

    const escala = Math.min(1, LADO_MAXIMO / lado);
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(mapa.width * escala);
    lienzo.height = Math.round(mapa.height * escala);
    const ctx = lienzo.getContext('2d');
    if (!ctx) return foto;
    ctx.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
    return await new Promise<Blob>((resolver) =>
      lienzo.toBlob((reducida) => resolver(reducida ?? foto), 'image/jpeg', 0.85)
    );
  } finally {
    mapa.close();
  }
}
