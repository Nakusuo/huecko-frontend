# Despliegue

El manual completo para publicar Huecko (frontend en Vercel, API e IA en
Render, Postgres en Neon y Mongo en Atlas) vive en el repo del backend, junto
a `render.yaml`:

**[huecko-backend/docs/DESPLIEGUE.md](https://github.com/Nakusuo/huecko-backend/blob/main/docs/DESPLIEGUE.md)**

Lo que toca a este repo:

- **Vercel:** proyecto con framework Vite y rama de producción `main`.
- **`VITE_API_URL`** en el entorno Production de Vercel:
  `https://huecko-api.onrender.com/api`. Se lee al construir: después de
  cambiarla hay que redesplegar. Sin ella la web sale en modo demostración.
- **Cabeceras y CSP** en `vercel.json`. La CSP solo deja hablar con la API en
  `https://*.onrender.com` y `wss://*.onrender.com`; si la API cambia de
  dominio, añádelo a `connect-src`.
- **Probar las cabeceras en local** antes de publicarlas: `npm run build` y
  `npm run preview`, que sirve la build con las mismas cabeceras que Vercel.
