# Huecko — Frontend

SPA en React + TypeScript para coordinar disponibilidad, planes, votaciones e
imprevistos entre amigos. Es el cliente de [`huecko-backend`](https://github.com/Nakusuo/huecko-backend)
y funciona también sin él, en modo demostración.

El problema que resuelve: cuadrar una quedada entre varias personas se atasca en
horarios incompatibles, respuestas tardías y bajas de último minuto. Huecko cruza
las agendas, propone las ventanas donde cabe todo el mundo y, cuando alguien se
cae, abre una votación exprés con plazo en vez de dejar el plan en el aire.

## Instalación

Requiere **Node.js 20+** y npm.

```bash
git clone https://github.com/Nakusuo/huecko-frontend.git
cd huecko-frontend
npm install
npm run dev
```

La app queda en `http://localhost:5173`.

### Entornos

Vite carga un archivo de variables según el modo en que se arranca:

| Archivo | Modo | `VITE_API_URL` | Resultado |
|---|---|---|---|
| `.env.development` | `npm run dev` | `/api` | Conectado a Spring Boot a través del proxy de Vite. |
| `.env.production` | `npm run build` | vacía (la define Vercel) | Conectado al backend desplegado, o demo si no hay URL. |
| `.env.demo` | `npm run dev:demo` | vacía | Demostración con datos simulados, sin servidor. |

`.env.example` documenta todas las variables. Para cambiar algo solo en tu
máquina, crea `.env.development.local`, que git ignora.

### Modo conectado

`npm run dev` espera el backend en `http://localhost:8080` (ver
[`huecko-backend`](https://github.com/Nakusuo/huecko-backend)). Con
`VITE_API_URL=/api` el navegador pide al mismo origen y Vite reenvía a Spring
Boot, así que no hace falta configurar CORS en desarrollo. El cliente añade solo
la cabecera `Authorization: Bearer <JWT>`.

Para probar el modo conectado sin levantar Spring Boot hay un backend de mentira:

```bash
npm run dev:stub
```

### Modo demostración (sin servidor)

```bash
npm run dev:demo
```

Arranca con datos simulados. Entra con `alex.rodriguez@huecko.com` / `demo1234`.

Para el panel de administración, `admin@huecko.com` / `admin1234`. Es la misma
cuenta que crea el seed del backend en desarrollo.

### Roles

Cada cuenta tiene un rol de plataforma (`rolSistema`), distinto del rol dentro
de un grupo:

| Rol | Entra a | Zona |
|---|---|---|
| `USUARIO` | `/dashboard` | Horario, grupos, planes y perfil. |
| `ADMIN` | `/admin` | Panel propio (resumen, usuarios, grupos). No tiene horario ni grupos. |

Cada rol queda redirigido fuera de la zona del otro. La interfaz solo decide qué
se enseña: quien protege los datos es el backend, que responde 403 en
`/api/admin/**` a una cuenta normal.

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente, conectado al backend. |
| `npm run dev:demo` | Servidor de desarrollo en modo demostración, sin backend. |
| `npm run build` | Comprueba tipos (`tsc -b`) y compila a `dist/`. |
| `npm run preview` | Sirve lo compilado, para revisar el build de producción. |
| `npm run test` | Pasa la batería de pruebas una vez. |
| `npm run test:watch` | Las pruebas en modo vigilancia. |
| `npm run lint` | Analiza el código con Oxlint. |
| `npm run dev:stub` | Backend simulado para probar el modo conectado. |

## Tecnologías usadas

| Área | Herramienta | Por qué |
|---|---|---|
| Lenguaje | **TypeScript** | Los contratos con el backend se comprueban al compilar, no en ejecución. |
| Framework | **React 19** | Componentes y reactividad. |
| Empaquetador | **Vite 8** | Arranque y recarga rápidos; el proxy evita configurar CORS. |
| Rutas | **React Router 7** | Rutas anidadas y protegidas. |
| Estado global | **Zustand 5** | Stores pequeños e independientes, con persistencia en `localStorage`. |
| Estilos | **Tailwind CSS 4** | Diseño responsivo *mobile-first* sobre una paleta propia. |
| Peticiones HTTP | **Axios** | Interceptores para el JWT y para traducir los errores del servidor. |
| Formularios | **React Hook Form + Zod** | Validación declarativa, con el mismo esquema para tipos y reglas. |
| Tiempo real | **STOMP sobre SockJS** | Avisos del servidor sin sondeo, con reserva a *long polling*. |
| OCR | **Tesseract.js + pdf.js** | Importar el horario desde una captura o un PDF. |
| Pruebas | **Vitest** | Mismo motor que Vite, sin configuración aparte. |
| Análisis estático | **Oxlint** | Reglas de React y TypeScript. |

## Estructura

```
src/
├── components/   Piezas reutilizables (Navbar, modales, avisos…)
├── pages/        Una por vista; `auth/` agrupa login y registro
├── routes/       Definición de rutas y guardia de sesión
├── store/        Estado global con Zustand
├── services/     Llamadas al backend, una por módulo
├── hooks/        Lógica reutilizable (tiempo real, avisos, modales)
├── lib/          Cliente HTTP, endpoints, sesión, utilidades
├── types/        Tipos compartidos
└── theme/        Paleta y escala tipográfica
```

## Alcance implementado

- Autenticación, registro, rutas protegidas y perfil/preferencias.
- Bloques recurrentes y puntuales, edición, eliminación e importación OCR en borrador.
- Grupos, código de invitación, umbral de disponibilidad y heatmap semanal.
- Propuestas con 2–5 ventanas, votación, confirmación, retrasos e imprevistos/votación exprés.
- Notificaciones y UI responsiva para móvil y escritorio.

## Documentación

- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) — contrato que implementa Spring Boot.
- [`docs/INTEGRACION_BACKEND.md`](docs/INTEGRACION_BACKEND.md) — estado real de la integración.

## Flujo de trabajo

`main` (estable) ← `develop` (integración) ← `feat/*`, `fix/*`, `docs/*`.
Los commits siguen [Conventional Commits](https://www.conventionalcommits.org/es/).
