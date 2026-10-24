import { apiClient } from './apiClient';
import { endpoints } from './endpoints';

/** Lado de la foto que se sube. El servidor la rehace igual a 256 px (FotosDePerfil). */
export const LADO_FOTO = 256;
/** Antes de reducirla: una foto de cámara rara vez pasa de esto. */
export const MAX_BYTES_ORIGINAL = 15 * 1024 * 1024;

/**
 * Reduce la foto elegida a un cuadrado de 256 px en JPEG.
 *
 * Recortar al centro evita que las fotos verticales salgan deformadas en el
 * círculo del avatar. Redibujarla en un canvas deja fuera sus metadatos (el
 * GPS de una foto de celular), aunque el servidor vuelve a hacerlo por si acaso.
 */
export function reducirFoto(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = LADO_FOTO;
      canvas.height = LADO_FOTO;

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('El navegador no pudo procesar la imagen.'));
        return;
      }

      const recorte = Math.min(image.width, image.height);
      context.drawImage(
        image,
        (image.width - recorte) / 2,
        (image.height - recorte) / 2,
        recorte,
        recorte,
        0,
        0,
        LADO_FOTO,
        LADO_FOTO
      );
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo preparar la foto.'))),
        'image/jpeg',
        0.85
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen. Prueba con una foto en JPG o PNG.'));
    };

    image.src = objectUrl;
  });
}

/** Para el modo demo, que guarda la foto en este navegador como data URL. */
export function blobADataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    lector.readAsDataURL(blob);
  });
}

/**
 * Data URL → Blob sin `fetch`: la CSP de producción no deja pedir `data:`.
 * Sirve para subir la foto que alguien tenía guardada solo en este navegador.
 */
export function dataUrlABlob(dataUrl: string): Blob {
  const [cabecera, datos = ''] = dataUrl.split(',', 2);
  const tipo = /data:([^;]+)/.exec(cabecera)?.[1] ?? 'image/jpeg';
  const binario = atob(datos);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
}

/* ------------------------------------------------------------------ *
 * Fotos de otras personas
 *
 * No se pueden pedir con un <img src>: la ruta exige el token, que viaja en
 * una cabecera. Se descargan con axios y se enseñan como URL de objeto. Cada
 * foto se pide una vez por versión (la fecha de su último cambio).
 * ------------------------------------------------------------------ */

const enCurso = new Map<string, Promise<string>>();
const listas = new Map<string, string>();

const claveDe = (usuarioId: string, version: string) => `${usuarioId}@${version}`;

/** La URL si ya se descargó, para pintarla sin parpadeo. */
export function fotoYaCargada(usuarioId: string, version: string): string | undefined {
  return listas.get(claveDe(usuarioId, version));
}

export function urlDeFoto(usuarioId: string, version: string): Promise<string> {
  const clave = claveDe(usuarioId, version);
  const existente = enCurso.get(clave);
  if (existente) return existente;

  const peticion = apiClient
    .get<Blob>(endpoints.perfil.foto(usuarioId), { responseType: 'blob', params: { v: version } })
    .then(({ data }) => {
      olvidarVersionesViejas(usuarioId, clave);
      const url = URL.createObjectURL(data);
      listas.set(clave, url);
      return url;
    });
  // Si falla, que la próxima vez se vuelva a intentar.
  peticion.catch(() => enCurso.delete(clave));
  enCurso.set(clave, peticion);
  return peticion;
}

/** Al llegar una foto nueva de alguien, la anterior ya no se va a enseñar. */
function olvidarVersionesViejas(usuarioId: string, actual: string) {
  for (const [clave, url] of listas) {
    if (clave !== actual && clave.startsWith(`${usuarioId}@`)) {
      URL.revokeObjectURL(url);
      listas.delete(clave);
      enCurso.delete(clave);
    }
  }
}

/** Solo para tests. */
export function olvidarFotos(): void {
  enCurso.clear();
  listas.clear();
}
