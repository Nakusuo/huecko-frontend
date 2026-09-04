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
    server: {
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
