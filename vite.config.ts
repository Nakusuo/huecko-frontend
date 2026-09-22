import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  /* Proxy de desarrollo: con VITE_API_URL=/api el navegador pide al mismo
     origen y Vite reenvía a Spring Boot, así no hace falta configurar CORS
     en el backend mientras se desarrolla. */
  const backendTarget = env.VITE_BACKEND_PROXY || 'http://localhost:8080'

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
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          /* RNF-05: sin `ws` el proxy no reenvía el upgrade y SockJS se queda
             cayendo a sondeo largo, que sí funciona pero enmascara si el
             WebSocket real está roto. */
          ws: true,
        },
      },
    },
  }
})
