import { useEffect, useState } from 'react';
import { isApiEnabled } from '../lib/apiClient';
import { fotoYaCargada, urlDeFoto } from '../lib/fotos';
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
