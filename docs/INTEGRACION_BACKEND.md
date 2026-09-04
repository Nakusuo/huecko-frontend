# Conectar el frontend con `huecko-backend`

Estado a 4 de septiembre de 2026. Este documento describe **cómo se enciende la
conexión**, **qué quedó cableado** y **qué falta del lado del backend**.
El contrato objetivo completo sigue en [`API_CONTRACT.md`](API_CONTRACT.md).

> **Novedad de esta versión:** `huecko-backend` ya es un proyecto ejecutable
> (Maven + Docker Compose) y expone autenticación con JWT. Lo que antes solo se
> podía probar contra el stub ahora funciona contra el backend real.

---

## 1. Encender la conexión

La app tiene dos modos y el interruptor es una sola variable, `VITE_API_URL`:

| Valor | Modo | Qué pasa |
| --- | --- | --- |
| vacía | **Demo** | Datos simulados. Login con `alex.rodriguez@huecko.com` / `demo1234`. No necesita servidor. |
| `/api` | **Conectado (desarrollo)** | El navegador pide al mismo origen y el proxy de Vite reenvía a `VITE_BACKEND_PROXY`. **No hace falta CORS.** |
| `https://…/api` | **Conectado (despliegue)** | Llamada directa. El backend **sí** debe permitir CORS del origen del frontend. |

```bash
# 1. copia la plantilla
cp .env.example .env.local

# 2. descomenta / ajusta
VITE_API_URL=/api
VITE_BACKEND_PROXY=http://localhost:8080

# 3. arranca
npm run dev
```

`.env.local` está ignorado por git (`*.local` en `.gitignore`), así que cada
persona apunta a donde necesite sin pisar a los demás.

### Levantar el backend real

En el repositorio `huecko-backend`:

```bash
cp .env.example .env
docker compose up -d     # Postgres 16 + Mongo 7
mvn spring-boot:run      # API en http://localhost:8080
```

Al arrancar en el perfil `dev` se siembran usuarios, un grupo y horarios de
ejemplo. Las credenciales son **las mismas que las del modo demo**, así que la
app se comporta igual conectada que desconectada:

| Correo | Contraseña |
| --- | --- |
| `alex.rodriguez@huecko.com` | `demo1234` |
| `diana.torres@huecko.com` | `demo1234` |

### Probar sin Spring Boot

Si no quieres levantar Docker, hay un servidor de mentira que imita las mismas
rutas:

```bash
npm run dev:stub
```

Levanta `http://localhost:8080` con `/api/auth/login`, `/api/auth/register`,
`/api/me`, `/api/actuator/health` y el CRUD de `bloques-horario` en memoria. Con
`VITE_API_URL=/api` la app funciona contra él de punta a punta.

Se mantiene a propósito como espejo del backend real: **si cambia el contrato,
hay que cambiar `tools/stub-backend.mjs` con él.**

---

## 2. Qué quedó cableado

| Pieza | Archivo | Estado |
| --- | --- | --- |
| Cliente HTTP, JWT, errores, 401 | `src/lib/apiClient.ts` | ✅ |
| Mapa de rutas | `src/lib/endpoints.ts` | ✅ |
| Proxy de desarrollo | `vite.config.ts` | ✅ |
| Autenticación | `src/services/authService.ts` | ✅ contra el backend real |
| **Horario: CRUD + OCR en borrador** | `src/services/scheduleService.ts` | ✅ incluidos color, categoría y rango de fechas |
| Sincronización de la rejilla | `src/store/scheduleStore.ts` | ✅ |
| Carga inicial al entrar a la zona privada | `src/routes/ProtectedRoute.tsx` | ✅ |
| Dashboard, grupos, planes, votos, perfil | `dashboardService`, `groupsStore`, `profileStore` | ⏳ siguen simulados |

### Cómo sincroniza el horario

El store aplica el cambio **en local primero** (la rejilla responde al instante)
y empuja al backend en segundo plano. En vez de exponer un `create/update/delete`
que obligaría a tocar todos los componentes, `syncSlots(previo, nuevo)` calcula
el diff entre las dos versiones de la rejilla y emite las peticiones que toquen.
Los ids provisionales del cliente se reemplazan por los que devuelve el servidor.

### Traducción de formatos

El frontend y el backend no hablan igual; `scheduleService` traduce:

| Frontend (`TimeSlot`) | Backend (`BloqueHorario`) |
| --- | --- |
| `day: 'Lun' … 'Dom'` | `diaSemana: 1 … 7` |
| `type: 'recurrente' \| 'puntual'` | `tipo: 'RECURRENTE' \| 'PUNTUAL'` |
| `startTime: "08:00"` | `horaInicio: "08:00:00"` (`LocalTime`) |
| `title` | `etiqueta` |
| `tag` | `categoria` |
| `customColor` | `color` |
| `specificEndDate` | `fechaFin` |
| `isOcrImported` | `fuente: 'OCR'` (+ `estado: 'BORRADOR'` al crearlo) |

`fechaFin` solo viaja en los bloques puntuales: el backend rechaza una `fechaFin`
sin `fecha`.

---

## 3. Lo que falta en el backend

Ordenado por lo que bloquea antes.

### 3.1 Módulos aún sin endpoints ⏳

Es lo único que hoy obliga a que partes de la app sigan simuladas:

- `/grupos`, `/grupos/{id}/disponibilidad`, invitaciones (Módulo 2).
- Planes, ventanas, votos, retrasos, imprevistos y votación exprés.
- OCR en servidor: hoy se hace **en el navegador** con `tesseract.js`; solo se
  envía el resultado, marcado con `fuente: 'OCR'` para que nazca como borrador.
- WebSocket/STOMP en `/topic/groups/{groupId}` para tiempo real.

Las tablas `grupos` y `miembros_grupo` ya existen en Postgres y el seeder las
llena, así que el trabajo pendiente es la capa REST, no el modelo.

### 3.2 `usuarioId` sigue viajando por la URL ⚠️

`BloqueHorarioController` mantiene `/api/usuarios/{usuarioId}/bloques-horario`,
pero **ya no se fía de ese valor**: comprueba que coincida con el del JWT y
responde `403` si no. La ruta se conserva solo para no romper el frontend.

Lo limpio es pasar a `/api/bloques-horario` y tomar el id únicamente del token.
Cuando se haga, en el frontend solo cambian `endpoints.ts` y `scheduleService.ts`.

### 3.3 Perfil conectado ⏳

`GET /api/me` y `PATCH /api/me` ya existen en el backend, pero `profileStore`
sigue trabajando con datos simulados. Conectarlo es el siguiente paso corto.

### 3.4 Prefijo de rutas: decidido ✅

Había tres versiones circulando (`/api/usuarios/…`, `/api/v1/schedule/blocks` de
`API_CONTRACT.md`, y lo que declara `endpoints.ts`). Se adopta **el del
controlador**, que es el código que existe: `/api` como base, sin `/v1`.
`API_CONTRACT.md` está pendiente de actualizarse a esta decisión.

### 3.5 Esquema y migraciones ⚠️

El backend arranca con `ddl-auto: update`, es decir, Hibernate crea y modifica
las tablas solo. Sirve mientras el modelo se mueve, pero antes de desplegar hay
que pasar a `validate` y llevar el esquema con Flyway o Liquibase. El perfil
`prod` ya usa `validate`; falta escribir las migraciones.

---

## 4. Formato de error

Toda respuesta de error del backend sale igual, incluidas las de Spring Security:

```json
{ "timestamp": "2026-09-04T18:20:11Z", "error": "Solicitud inválida", "mensaje": "horaFin debe ser posterior a horaInicio" }
```

El cliente lee `mensaje`, luego `message`, luego `error`. Si no hay respuesta del
servidor, muestra qué URL intentó y sugiere revisar que el backend esté encendido.

Códigos que devuelve el módulo de horario:

| Código | Cuándo |
| --- | --- |
| `400` | Datos incoherentes (`horaFin` anterior a `horaInicio`, recurrente sin `diaSemana`…) |
| `401` | Sin token o token caducado. El cliente cierra sesión y manda al login. |
| `403` | El bloque, o el `usuarioId` de la ruta, es de otra persona. |
| `404` | El bloque no existe. |
