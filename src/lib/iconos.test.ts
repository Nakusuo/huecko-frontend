import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * index.html pide a Google solo los iconos de `icon_names`. Un icono que no
 * esté en esa lista se vería como su nombre en texto («notifications»), así
 * que aquí se comprueba que cada icono escrito en el código está en la lista.
 */

const raiz = join(__dirname, '..', '..');
const html = readFileSync(join(raiz, 'index.html'), 'utf8');
const lista = new Set((/icon_names=([a-z0-9_,]+)/.exec(html)?.[1] ?? '').split(','));

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.tsx?$/.test(nombre) && !nombre.includes('.test.') ? [ruta] : [];
  });
}

/** Lo que va dentro de un `<span className="material-symbols-outlined …">icono</span>`. */
function iconosEscritos(): Map<string, string> {
  const encontrados = new Map<string, string>();
  for (const ruta of archivos(join(raiz, 'src'))) {
    const texto = readFileSync(ruta, 'utf8');
    for (const m of texto.matchAll(/material-symbols-outlined[^>]*>\s*([a-z][a-z0-9_]*)\s*</g)) {
      encontrados.set(m[1], ruta);
    }
  }
  return encontrados;
}

describe('iconos de Material Symbols', () => {
  it('la lista de index.html está en orden alfabético (lo exige Google)', () => {
    const nombres = [...lista];
    expect(nombres).toEqual([...nombres].sort());
  });

  it('cada icono escrito en el código está en la lista de index.html', () => {
    const faltan = [...iconosEscritos()].filter(([icono]) => !lista.has(icono));
    expect(faltan).toEqual([]);
  });
});
