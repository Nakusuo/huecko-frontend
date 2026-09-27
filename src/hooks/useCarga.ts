import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Pide datos al montar y cada vez que se llama a `recargar`.
 *
 * El estado solo cambia al llegar la respuesta, y la de una petición ya
 * superada (o de una página cerrada) se descarta. `cada` repite la petición
 * sola cada tantos milisegundos mientras no sea `null`.
 */
export function useCarga<T>(pedir: () => Promise<T>, cada: number | null = null) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [version, setVersion] = useState(0);

  /* La última `pedir` recibida, sin relanzar la petición cada vez que el
     componente crea una función nueva: solo `version` decide cuándo se pide. */
  const pedirRef = useRef(pedir);
  useEffect(() => {
    pedirRef.current = pedir;
  });

  useEffect(() => {
    let vigente = true;
    pedirRef.current().then(
      (respuesta) => {
        if (!vigente) return;
        setDatos(respuesta);
        setError(null);
        setCargando(false);
      },
      (err: unknown) => {
        if (!vigente) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar.');
        setCargando(false);
      }
    );
    return () => {
      vigente = false;
    };
  }, [version]);

  useEffect(() => {
    if (cada === null) return;
    const id = window.setInterval(() => setVersion((v) => v + 1), cada);
    return () => window.clearInterval(id);
  }, [cada]);

  const recargar = useCallback(() => {
    setCargando(true);
    setVersion((v) => v + 1);
  }, []);

  return { datos, setDatos, error, cargando, recargar };
}
