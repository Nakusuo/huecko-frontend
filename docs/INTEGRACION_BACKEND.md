# Conectar el frontend con `huecko-backend`

Estado a 4 de septiembre de 2026. Este documento describe **cómo se enciende la
conexión**, **qué quedó cableado** y **qué falta del lado del backend**.
El contrato objetivo completo sigue en [`API_CONTRACT.md`](API_CONTRACT.md).

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

### Probar sin Spring Boot

Mientras el backend no arranca, hay un servidor de mentira que imita sus rutas:

```bash
npm run dev:stub
```

Levanta `http://localhost:8080` con `/api/auth/login`, `/api/auth/register` y el
CRUD de `bloques-horario` en memoria. Con `VITE_API_URL=/api` la app funciona
contra él de punta a punta.

---

## 2. Qué quedó cableado

| Pieza | Archivo | Estado |
| --- | --- | --- |
| Cliente HTTP, JWT, errores, 401 | `src/lib/apiClient.ts` | ✅ |
| Mapa de rutas | `src/lib/endpoints.ts` | ✅ |
| Proxy de desarrollo | `vite.config.ts` | ✅ |
| Autenticación | `src/services/authService.ts` | ✅ (ya existía) |
| **Horario: CRUD + OCR en borrador** | `src/services/scheduleService.ts` | ✅ verificado contra el stub |
| Sincronización de la rejilla | `src/store/scheduleStore.ts` | ✅ |
| Carga inicial al entrar a la zona privada | `src/routes/ProtectedRoute.tsx` | ✅ |
| Dashboard, grupos, planes, votos, perfil | `dashboardService`, `groupsStore`, `profileStore` | ⏳ siguen simulados |

### Cómo sincroniza el horario

El store aplica el cambio **en local primero** (la rejilla responde al instante)
y empuja al backend en segundo plano. En vez de exponer un `create/update/delete`
que obligaría a tocar todos los componentes, `syncSlots(previo, nuevo)` calcula
el diff entre las dos versiones de la rejilla y emite las peticiones que toquen.
Los ids provisionales del cliente se reemplazan por los que devuelve el servidor.

Comprobado extremo a extremo contra el stub: `GET` (confirmados + borradores),
`POST`, `PUT` y `DELETE`, con el reemplazo de id incluido.

### Traducción de formatos

El frontend y el backend no hablan igual; `scheduleService` traduce:

| Frontend (`TimeSlot`) | Backend (`BloqueHorario`) |
| --- | --- |
| `day: 'Lun' … 'Dom'` | `diaSemana: 1 … 7` |
| `type: 'recurrente' \| 'puntual'` | `tipo: 'RECURRENTE' \| 'PUNTUAL'` |
| `startTime: "08:00"` | `horaInicio: "08:00:00"` (`LocalTime`) |
| `title` | `etiqueta` |
| `isOcrImported` | `fuente: 'OCR'` + `estado: 'BORRADOR'` |

---

## 3. Lo que falta en el backend

Ordenado por lo que bloquea antes.

### 3.1 El proyecto todavía no es ejecutable

`huecko-backend` contiene solo los `.java`, sueltos en la raíz del repo. Para
arrancar hace falta:

- `pom.xml` (o `build.gradle`) con Spring Boot, Web, Validation, Data MongoDB,
  Data JPA, PostgreSQL driver y Lombok.
- Mover las clases a `src/main/java/com/huecko/backend/…` — el `package` que
  declaran ya asume esa ruta.
- `src/main/resources/application.yml` con las dos conexiones (Mongo y Postgres)
  y `server.port: 8080`.

### 3.2 No hay autenticación

El frontend ya llama a `POST /api/auth/login` y `POST /api/auth/register`
esperando `{token, user:{id,nombre,email,creado_en}}`, y manda
`Authorization: Bearer <jwt>` en todo lo demás. Falta Spring Security + JWT.

Mientras tanto: cualquier backend que devuelva ese JSON en esas dos rutas
desbloquea al frontend (es justo lo que hace el stub).

### 3.3 Decidir un solo prefijo

Hay tres versiones circulando:

- `BloqueHorarioController` → `/api/usuarios/{usuarioId}/bloques-horario`
- `API_CONTRACT.md` → `/api/v1/schedule/blocks`
- `endpoints.ts` → sigue **al controlador**, porque es el código que existe.

Hay que elegir uno. Si el backend adopta `/api/v1`, basta con cambiar
`src/lib/endpoints.ts` y la variable `VITE_API_URL`; el resto del frontend no se
entera.

### 3.4 `usuarioId` viaja por la URL

El controlador lo recibe como `@PathVariable` — y su propio comentario dice que
es temporal. Hoy el frontend manda el `id` del usuario logueado. Cuando exista
JWT, el backend debe tomarlo del token (`@AuthenticationPrincipal`) y las rutas
pasarán a `/api/bloques-horario`; se ajusta en `endpoints.ts` y en
`scheduleService`, en un único sitio cada uno.

### 3.5 Campos que el frontend usa y el backend no guarda

`BloqueHorario` no tiene dónde persistir:

- **color** del bloque (`customColor`),
- **categoría/etiqueta** (`tag`: Clase, Trabajo, Personal…) separada del título,
- **rango de fechas** de un evento puntual (`specificEndDate`).

Como parche, `scheduleService` conserva esos valores desde el estado local en
cada recarga y deriva un color estable del título cuando no hay nada guardado.
Es un apaño: si el usuario entra desde otro dispositivo, los pierde. Lo correcto
es añadir `color`, `categoria` y `fechaFin` al documento.

### 3.6 Endpoints que el frontend ya sabe consumir y aún no existen

- `GET /me`, `PATCH /me` — perfil y preferencias.
- Módulo de grupos: `/grupos`, `/grupos/{id}/disponibilidad`, invitaciones.
- Planes, ventanas, votos, retrasos, imprevistos y votación exprés.
- OCR en servidor: hoy se hace **en el navegador** con `tesseract.js` y solo se
  envía el resultado como bloques normales.
- WebSocket/STOMP en `/topic/groups/{groupId}` para tiempo real.

### 3.7 CORS (solo si no se usa el proxy)

En despliegue, o si alguien apunta `VITE_API_URL` directo a `http://localhost:8080`,
el backend necesita permitir el origen del frontend, `Authorization` entre las
cabeceras y los métodos `GET, POST, PUT, DELETE, PATCH`.

---

## 4. Formato de error

`GlobalExceptionHandler` responde `{timestamp, error, mensaje}`. El cliente lee
`mensaje`, luego `message`, luego `error`, así que también entiende los errores
de Spring Security y de validación. Si no hay respuesta del servidor, muestra
qué URL intentó y sugiere revisar que el backend esté encendido.
