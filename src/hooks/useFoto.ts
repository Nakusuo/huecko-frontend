import { useEffect, useState } from 'react';
import { isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';
import { fotoDeAlbumYaCargada, fotoYaCargada, urlDeFoto, urlDeFotoDeAlbum } from '../lib/fotos';
import { fotoDemo } from '../services/albumService';
import type { VarianteFoto } from '../types/album.types';
import { useAuthStore } from '../store/authStore';
import { usePreferenciasLocales } from '../store/profileStore';

/**
 * La foto de alguien, descargada con su token (ver `lib/fotos.ts`). Mientras
 * no llega, o si no tiene, `undefined`.
 */
export function useFoto(usuarioId?: string, version?: string | null): string | undefined {
  const clave = isApiEnabled && usuarioId && version ? `${usuarioId}@${version}` : null;
  const [cargada, setCargada] = useState<{ clave: string; url: string } | null>(null);

  useEffect(() => {
    if (!clave || !usuarioId || !version) return;
    let vigente = true;
    urlDeFoto(usuarioId, version).then(
      (url) => vigente && setCargada({ clave, url }),
      // Sin foto (o sin permiso) se queda la inicial; no es un error que enseñar.
      () => undefined
    );
    return () => {
      vigente = false;
    };
  }, [clave, usuarioId, version]);

  if (!clave || !usuarioId || !version) return undefined;
  return cargada?.clave === clave ? cargada.url : fotoYaCargada(usuarioId, version);
}

/** Si la cuenta abierta tiene foto que enseñar, para decidir cómo pintar un botón. */
export function useTengoFoto(): boolean {
  const version = useAuthStore((s) => s.user?.fotoActualizadaEn);
  const { avatarUrl } = usePreferenciasLocales();
  return isApiEnabled ? Boolean(version) : Boolean(avatarUrl);
}

/**
 * Una foto de álbum (o su miniatura), descargada con el token. En demo es la
 * data URL guardada en memoria. Mientras no llega, `undefined`.
 */
export function useFotoDeAlbum(fotoId: string | null, variante: VarianteFoto): string | undefined {
  const ruta = fotoId && isApiEnabled
    ? variante === 'miniatura' ? endpoints.album.miniatura(fotoId) : endpoints.album.foto(fotoId)
    : null;
  const [cargada, setCargada] = useState<{ ruta: string; url: string } | null>(null);

  useEffect(() => {
    if (!ruta) return;
    let vigente = true;
    urlDeFotoDeAlbum(ruta).then(
      (url) => vigente && setCargada({ ruta, url }),
      () => undefined
    );
    return () => {
      vigente = false;
    };
  }, [ruta]);

  if (!fotoId) return undefined;
  if (!isApiEnabled) return fotoDemo(fotoId);
  if (!ruta) return undefined;
  return cargada?.ruta === ruta ? cargada.url : fotoDeAlbumYaCargada(ruta);
}
