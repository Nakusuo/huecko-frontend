import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { vigilarSesion } from './lib/sesion'
import { instalarCapturaErrores } from './lib/capturaErrores'
import { reportesService } from './services/reportesService'
import { useAuthStore } from './store/authStore'

// Antes de pintar nada: si hay datos guardados de otra cuenta, se descartan.
vigilarSesion()

// Los errores de JavaScript sin capturar llegan a la bandeja de fallos del admin.
// El endpoint pide sesión: sin ella no se envían.
instalarCapturaErrores(
  (error) => void reportesService.enviarErrorCliente(error),
  () => useAuthStore.getState().isAuthenticated,
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
