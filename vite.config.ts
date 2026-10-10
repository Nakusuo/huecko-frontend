import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

/* `npm run preview` sirve la build con las mismas cabeceras que Vercel (CSP
   incluida), leídas de vercel.json. Así una CSP que rompa algo se ve en local
   y no en producción. */
function cabecerasDeVercel(): Record<string, string> {
  const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf-8')) as {
    headers?: { source: string; headers: { key: string; value: string }[] }[]
  }
  const generales = vercel.headers?.find((h) => h.source === '/(.*)')?.headers ?? []
  return Object.fromEntries(generales.map((h) => [h.key, h.value]))
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  /* Proxy de desarrollo: con VITE_API_URL=/api el navegador pide al mismo
     origen y Vite reenvía a Spring Boot, así no hace falta configurar CORS
     en el backend mientras se desarrolla. */
  const backendTarget = env.VITE_BACKEND_PROXY || 'http://localhost:8080'
  const proxy = {
    '/api': {
      target: backendTarget,
      changeOrigin: true,
      /* RNF-05: sin `ws` el proxy no reenvía el upgrade y SockJS se queda
         cayendo a sondeo largo, que sí funciona pero enmascara si el
         WebSocket real está roto. */
      ws: true,
    },
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    /* sockjs-client espera la variable `global` de Node, que en el navegador
       no existe. Sin esto revienta al importarlo, no al conectar, así que el
       fallo aparecería como una pantalla en blanco. */
    define: {
      global: 'globalThis',
    },
    server: { proxy },
    preview: { proxy, headers: cabecerasDeVercel() },
  }
})
