import { apiClient } from './apiClient';
import { endpoints } from './endpoints';

/** Lado de la foto que se sube. El servidor la rehace igual a 256 px (FotosDePerfil). */
export const LADO_FOTO = 256;
/** Antes de reducirla: una foto de cámara rara vez pasa de esto. */
export const MAX_BYTES_ORIGINAL = 15 * 1024 * 1024;

/**
 * Redibuja la foto elegida en un canvas y la devuelve en JPEG.
 *
 * Redibujarla deja fuera sus metadatos (el GPS de una foto de celular) y la
 * pone derecha según cómo se tomó; el servidor la vuelve a rehacer igual, por
 * si acaso. Con `cuadrada` recorta al centro, para que las fotos verticales
 * no salgan deformadas en el círculo del avatar.
 */
function redibujar(file: File, opciones: { lado: number; cuadrada: boolean; calidad: number }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const recorte = Math.min(image.width, image.height);
      const [origenAncho, origenAlto] = opciones.cuadrada ? [recorte, recorte] : [image.width, image.height];
      const escala = Math.min(1, opciones.lado / Math.max(origenAncho, origenAlto));
      const canvas = document.createElement('canvas');
      canvas.width = opciones.cuadrada ? opciones.lado : Math.max(1, Math.round(origenAncho * escala));
      canvas.height = opciones.cuadrada ? opciones.lado : Math.max(1, Math.round(origenAlto * escala));

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('El navegador no pudo procesar la imagen.'));
        return;
      }
      context.drawImage(
        image,
        (image.width - origenAncho) / 2,
        (image.height - origenAlto) / 2,
        origenAncho,
        origenAlto,
        0,
        0,
        canvas.width,
        canvas.height
      );
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo preparar la foto.'))),
        'image/jpeg',
        opciones.calidad
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`No se pudo leer «${file.name}». Prueba con una foto en JPG o PNG.`));
    };

    image.src = objectUrl;
  });
}

/** Foto de perfil: un cuadrado de 256 px. */
export function reducirFoto(file: File): Promise<Blob> {
  return redibujar(file, { lado: LADO_FOTO, cuadrada: true, calidad: 0.85 });
}

/** Lado largo de una foto de álbum al subirla. El servidor la deja en 1280. */
export const LADO_ALBUM = 1600;

/** Foto de álbum: entera, con el lado largo a 1600 px (unos 300 KB). */
export function reducirParaAlbum(file: File): Promise<Blob> {
  return redibujar(file, { lado: LADO_ALBUM, cuadrada: false, calidad: 0.82 });
}

/* Los mismos topes que el servidor: 10 fotos por envío y 6 MB por petición. */
export const FOTOS_POR_ENVIO = 10;
const BYTES_POR_ENVIO = 4.5 * 1024 * 1024;

/** Reparte las fotos en envíos que el servidor acepta: diez como mucho y sin pasar de 4,5 MB. */
export function enEnvios<T extends { size: number }>(fotos: T[]): T[][] {
  const envios: T[][] = [];
  let actual: T[] = [];
  let bytes = 0;
  for (const foto of fotos) {
    if (actual.length > 0 && (actual.length >= FOTOS_POR_ENVIO || bytes + foto.size > BYTES_POR_ENVIO)) {
      envios.push(actual);
      actual = [];
      bytes = 0;
    }
    actual.push(foto);
    bytes += foto.size;
  }
  if (actual.length > 0) envios.push(actual);
  return envios;
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
  albumEnCurso.clear();
  albumListas.clear();
}

/* ------------------------------------------------------------------ *
 * Fotos de álbum: no cambian nunca (si se borran, desaparecen), así que
 * cada una se descarga una vez por sesión.
 * ------------------------------------------------------------------ */

const albumEnCurso = new Map<string, Promise<string>>();
const albumListas = new Map<string, string>();

/** La URL si ya se descargó, para pintarla sin parpadeo. */
export function fotoDeAlbumYaCargada(ruta: string): string | undefined {
  return albumListas.get(ruta);
}

/** `ruta` es la de la API (`endpoints.album.foto` o `.miniatura`). */
export function urlDeFotoDeAlbum(ruta: string): Promise<string> {
  const existente = albumEnCurso.get(ruta);
  if (existente) return existente;
  const peticion = apiClient.get<Blob>(ruta, { responseType: 'blob' }).then(({ data }) => {
    const url = URL.createObjectURL(data);
    albumListas.set(ruta, url);
    return url;
  });
  peticion.catch(() => albumEnCurso.delete(ruta));
  albumEnCurso.set(ruta, peticion);
  return peticion;
}

/** Al borrar una foto: que no se quede ocupando memoria. */
export function olvidarFotoDeAlbum(...rutas: string[]): void {
  for (const ruta of rutas) {
    const url = albumListas.get(ruta);
    if (url) URL.revokeObjectURL(url);
    albumListas.delete(ruta);
    albumEnCurso.delete(ruta);
  }
}
