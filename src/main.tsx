import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { vigilarSesion } from './lib/sesion'

// Antes de pintar nada: si hay datos guardados de otra cuenta, se descartan.
vigilarSesion()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
