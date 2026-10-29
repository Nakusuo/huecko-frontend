# Despliegue

El manual completo para publicar Huecko (web, API e IA en Render, Postgres en
Supabase y Mongo en Atlas) vive en el repo del backend, junto a `render.yaml`:

**[huecko-backend/docs/DESPLIEGUE.md](https://github.com/Nakusuo/huecko-backend/blob/main/docs/DESPLIEGUE.md)**

Y cómo cubre el proyecto cada tema del sílabo del curso:
**[huecko-backend/docs/CUMPLIMIENTO_SILABO.md](https://github.com/Nakusuo/huecko-backend/blob/main/docs/CUMPLIMIENTO_SILABO.md)**

Lo que toca a este repo:

- **Render, sitio estático `huecko-web`:** lo crea el Blueprint de
  `huecko-backend` con `npm ci && npm run build` y publica `dist/`. Las rutas
  caen en `index.html` (rewrite) para que React Router funcione al recargar.
- **`VITE_API_URL`** en `huecko-web`: `https://huecko-api.onrender.com/api`.
  Se lee al construir: después de cambiarla hay que volver a desplegar. Sin
  ella la web sale en modo demostración.
- **Cabeceras y CSP:** las de `vercel.json`, copiadas en `render.yaml` del
  backend. Si cambias la CSP en un sitio, cámbiala también en el otro. Solo deja
  hablar con la API en `https://*.onrender.com` y `wss://*.onrender.com`.
- **Vercel** sigue siendo una alternativa: `vercel.json` ya tiene el rewrite y
  las cabeceras.
- **Probar las cabeceras en local** antes de publicarlas: `npm run build` y
  `npm run preview`, que sirve la build con las mismas cabeceras.
