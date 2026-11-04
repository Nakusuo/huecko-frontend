import { useEffect, useRef, useState } from 'react';
import { ESPERA_REENVIO_MS } from '../../services/authService';

const ESPERA_S = ESPERA_REENVIO_MS / 1000;

/**
 * Botón «Reenviar código» con su cuenta atrás de un minuto.
 *
 * Arranca contando porque al llegar a la pantalla el código acaba de salir:
 * pedir otro en el mismo segundo solo daría un 429 del backend. `accion` es lo
 * que manda el código (en el login, `reenviarCodigo(desafio)`).
 */
export function useReenvio<T>(accion: () => Promise<T>) {
  const [restante, setRestante] = useState(ESPERA_S);
  const [reenviando, setReenviando] = useState(false);
  // La última versión de `accion`, sin que cambiar de función reinicie nada.
  const ultima = useRef(accion);
  useEffect(() => {
    ultima.current = accion;
  });

  useEffect(() => {
    if (restante <= 0) return;
    const id = window.setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [restante]);

  /** Los errores (429, desafío caducado) los muestra quien llama. */
  const reenviar = async (): Promise<T> => {
    setReenviando(true);
    try {
      const resultado = await ultima.current();
      setRestante(ESPERA_S);
      return resultado;
    } finally {
      setReenviando(false);
    }
  };

  /** Para cuando el código se acaba de mandar por otro camino (al entrar en un paso). */
  const reiniciar = () => setRestante(ESPERA_S);

  const texto = reenviando ? 'Enviando…' : restante > 0 ? `Reenviar código en ${restante} s` : 'Reenviar código';

  return { restante, reenviando, puedeReenviar: restante <= 0 && !reenviando, reenviar, reiniciar, texto };
}
