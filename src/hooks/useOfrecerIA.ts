import { useEffect, useState } from 'react';
import { apiClient, isApiEnabled } from '../lib/apiClient';
import { endpoints } from '../lib/endpoints';

/** Estados de VigiaIA en el backend. */
type EstadoIA = 'DESACTIVADA' | 'SIN_COMPROBAR' | 'ACTIVA' | 'SIN_GEMINI' | 'SIN_RESPUESTA';

/** Una sola consulta por sesión de página: el backend solo lo comprueba cada 10 minutos. */
let consulta: Promise<EstadoIA | null> | null = null;

function consultarEstado(): Promise<EstadoIA | null> {
  consulta ??= apiClient
    .get<{ estado: EstadoIA }>(endpoints.ia.estado)
    .then(({ data }) => data.estado)
    .catch(() => null);
  return consulta;
}

/**
 * Si conviene ofrecer las funciones de Huecko IA que pide la persona.
 *
 * Se ocultan cuando el backend dice que están apagadas o que la IA no tiene
 * clave de Gemini: ofrecerlas sería invitar a un error seguro. Si la IA solo
 * «no respondió» la última vez, se ofrecen igual (puede haber despertado) y la
 * pantalla explica el fallo si se repite. En modo demo no hay IA.
 */
export function useOfrecerIA(): boolean {
  const [estado, setEstado] = useState<EstadoIA | null>(null);

  useEffect(() => {
    if (!isApiEnabled) return;
    let vigente = true;
    void consultarEstado().then((valor) => {
      if (vigente) setEstado(valor);
    });
    return () => {
      vigente = false;
    };
  }, []);

  return isApiEnabled && estado !== 'DESACTIVADA' && estado !== 'SIN_GEMINI';
}
