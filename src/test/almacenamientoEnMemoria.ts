/**
 * `localStorage` en memoria para las pruebas.
 *
 * Las pruebas corren en el entorno `node`, donde según la versión de Node
 * `localStorage` no existe o existe a medias. Los stores con `persist` lo leen
 * al importarse, así que esto se instala antes de importar cualquier store.
 */
export function instalarAlmacenamientoEnMemoria(): void {
  const datos = new Map<string, string>();
  const almacenamiento: Storage = {
    get length() {
      return datos.size;
    },
    clear: () => datos.clear(),
    getItem: (clave) => datos.get(clave) ?? null,
    key: (indice) => [...datos.keys()][indice] ?? null,
    removeItem: (clave) => {
      datos.delete(clave);
    },
    setItem: (clave, valor) => {
      datos.set(clave, String(valor));
    },
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: almacenamiento,
    configurable: true,
    writable: true,
  });
}
