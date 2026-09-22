import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Un aviso que se borra solo pasado un rato.
 *
 * Existe porque el patrón escrito a mano —`setEstado(algo)` y un `setTimeout`
 * suelto para volver a `null`— tiene dos fallos que solo se notan en uso real:
 *
 * 1. **Los avisos se cortan entre sí.** Cada llamada programaba su propio
 *    temporizador sin cancelar el anterior, así que dos acciones seguidas (crear
 *    un bloque y borrarlo, por ejemplo) hacían que el temporizador del primer
 *    aviso borrara el segundo a mitad de camino. El segundo duraba lo que le
 *    quedaba al primero, no lo suyo.
 * 2. **El temporizador sobrevivía a la pantalla.** Si el componente se
 *    desmontaba antes de que venciera, el `setTimeout` seguía vivo y acababa
 *    escribiendo en un componente que ya no estaba.
 *
 * Aquí solo hay un temporizador: cada aviso nuevo cancela el que hubiera, y al
 * desmontar se cancela el que quede.
 *
 * @param duracionMs Cuánto permanece visible.
 * @returns `[aviso, mostrar]` — el aviso actual (`null` si no hay) y la función
 *          para lanzar uno nuevo.
 */
export function useAvisoEfimero<T>(duracionMs = 3500) {
  const [aviso, setAviso] = useState<T | null>(null);
  const temporizador = useRef<number | null>(null);

  const cancelar = useCallback(() => {
    if (temporizador.current !== null) {
      window.clearTimeout(temporizador.current);
      temporizador.current = null;
    }
  }, []);

  const mostrar = useCallback(
    (valor: T) => {
      cancelar();
      setAviso(valor);
      temporizador.current = window.setTimeout(() => {
        temporizador.current = null;
        setAviso(null);
      }, duracionMs);
    },
    [cancelar, duracionMs],
  );

  useEffect(() => cancelar, [cancelar]);

  return [aviso, mostrar] as const;
}
