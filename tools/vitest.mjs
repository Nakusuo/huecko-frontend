/**
 * Lanzador de Vitest para `npm test` y `npm run test:watch`.
 *
 * En Windows, si la terminal arranca en `c:\...` (minúscula, como suele hacer
 * VS Code), npm carga la CLI de Vitest por esa ruta mientras que los tests la
 * importan por `C:\...`. Node las trata como dos módulos distintos y todas las
 * suites fallan con "Cannot read properties of undefined (reading 'config')".
 * Cargar la CLI con la letra de unidad en mayúscula deja una sola instancia.
 * En Linux y macOS no cambia nada.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';

const cli = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url));
const cliNormalizada = cli.replace(/^[a-z]:/, (unidad) => unidad.toUpperCase());

await import(pathToFileURL(cliNormalizada).href);
