# Huecko — Frontend

SPA React + TypeScript para coordinar disponibilidad, planes, votaciones e imprevistos entre amigos.

## Desarrollo

```bash
npm install
npm run dev
```

Sin variables de entorno la app opera en modo demostración. Para conectarla al backend, copia `.env.example` a `.env` y define `VITE_API_URL` (por ejemplo `http://localhost:8080/api/v1`). El cliente agrega automáticamente `Authorization: Bearer <JWT>`.

## Alcance implementado

- Autenticación, registro, rutas protegidas y perfil/preferencias.
- Bloques recurrentes y puntuales, edición, eliminación e importación OCR en borrador.
- Grupos, código de invitación, umbral de disponibilidad y heatmap semanal.
- Propuestas con 2–5 ventanas, votación, confirmación, retrasos e imprevistos/votación exprés.
- Notificaciones y UI responsive para móvil y escritorio.

El contrato que debe implementar Spring Boot está en [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).

## Nota de plantilla

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
