# Conectar el frontend con `huecko-backend`

Estado a 6 de septiembre de 2026, contra la rama `develop` del backend. Este
documento describe **cómo se enciende la conexión**, **qué quedó cableado** y
**qué falta**. El contrato objetivo completo sigue en
[`API_CONTRACT.md`](API_CONTRACT.md).

> La versión anterior de este documento describía la rama `main` del backend,
> que se quedó atrás. Lo que decía sobre "el proyecto no es ejecutable" y "no
> hay autenticación" ya no es cierto.

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

### Levantar el backend

En `huecko-backend`, sobre `develop`:

```bash
docker compose up -d     # Postgres + Mongo
./mvnw spring-boot:run   # la API en :8080
```

Al arrancar, el `DemoDataSeeder` deja listos dos usuarios
(`alex.rodriguez@huecko.com` y `diana.torres@huecko.com`, ambos con
`demo1234`) y un grupo con código de invitación **`HUECKO26`**. Detalle
completo en `docs/PUESTA_EN_MARCHA.md` de ese repositorio.

### Probar sin Docker ni Spring Boot

Mientras no haya bases de datos a mano, hay un servidor de mentira que imita
las rutas de horario y autenticación:

```bash
npm run dev:stub
```

No cubre el módulo de grupos: para eso hace falta el backend real.

---

## 2. Qué quedó cableado

| Pieza | Archivo | Estado |
| --- | --- | --- |
| Cliente HTTP, JWT, errores, 401 | `src/lib/apiClient.ts` | ✅ |
| Mapa de rutas | `src/lib/endpoints.ts` | ✅ |
| Proxy de desarrollo | `vite.config.ts` | ✅ |
| Autenticación | `src/services/authService.ts` | ✅ |
| Perfil y preferencias | `src/services/profileService.ts` | ✅ contra `/api/me` |
| Horario: CRUD + OCR en borrador | `src/services/scheduleService.ts` | ✅ |
| Sincronización de la rejilla | `src/store/scheduleStore.ts` | ✅ |
| **Grupos, membresía y cruce de disponibilidad** | `src/services/groupsService.ts` | ✅ |
| **Heatmap del panel de grupo** | `src/pages/GroupsPage.tsx` | ✅ usa el cruce del servidor |
| **Planes, ventanas y votación** | `src/services/plansService.ts` | ✅ |
| Carga inicial al entrar a la zona privada | `src/routes/ProtectedRoute.tsx` | ✅ |
| Retrasos, imprevistos y votación exprés | `eventsService`, `groupsStore` | ⏳ siguen simulados |

### Cómo sincroniza el horario

El store aplica el cambio **en local primero** (la rejilla responde al instante)
y empuja al backend en segundo plano. En vez de exponer un `create/update/delete`
que obligaría a tocar todos los componentes, `syncSlots(previo, nuevo)` calcula
el diff entre las dos versiones de la rejilla y emite las peticiones que toquen.
Los ids provisionales del cliente se reemplazan por los que devuelve el servidor.

### Cómo funciona el cruce de disponibilidad

El cálculo **no se hace en el navegador**: lo hace `CalculadoraDisponibilidad`
en el backend, que es el único lado que ve los horarios de todo el grupo. El
frontend pide `GET /api/grupos/{id}/disponibilidad` y recibe una rejilla de
recuentos más las ventanas que cumplen el umbral.

Dos consecuencias que conviene tener presentes:

- **RNF-02 se cumple por diseño.** La respuesta trae *cuántos* están libres,
  nunca *quiénes* ni con qué bloque. Por eso, en modo conectado,
  `getCellAvailability` devuelve `occupiedMembers` vacío: esa información
  sencillamente no llega, y no debe llegar.
- **El resultado nunca queda viejo (RF-07).** El backend recalcula en cada
  petición sobre los bloques vigentes; no hay nada cacheado. El frontend
  vuelve a pedirlo al cambiar de grupo y al mover el umbral.

El cálculo local sobre `occupiedSlots` sigue en `GroupsPage` y solo entra en
**modo demo**. Ojo: ese cálculo trunca a la hora, así que un bloque de 08:00 a
10:30 lo da libre a las 10:00; el backend lo mide en minutos y lo da ocupado,
que es lo correcto. Los dos modos no coinciden al detalle a propósito.

### Traducción de formatos

El frontend y el backend no hablan igual. `scheduleService` y `groupsService`
son las dos capas donde vive esa traducción; ni los stores ni las páginas
saben nada de los nombres del backend.

| Frontend | Backend |
| --- | --- |
| `day: 'Lun' … 'Dom'` | `diaSemana: 1 … 7` |
| `type: 'recurrente' \| 'puntual'` | `tipo: 'RECURRENTE' \| 'PUNTUAL'` |
| `startTime: "08:00"` | `horaInicio: "08:00:00"` (`LocalTime`) |
| `title` | `etiqueta` |
| `isOcrImported` | `fuente: 'OCR'` + `estado: 'BORRADOR'` |
| `GroupMember.isEssential` | `MiembroResponse.esImprescindible` |
| `GroupMember.color` | *no existe*: se deriva de la posición en la lista |
| `GroupMember.status` | *no existe*: el backend no tiene invitaciones pendientes |
| `TimeWindowProposal.dia` (día de la semana) | `VentanaPlan.fecha` (fecha concreta) |
| `votosUsuarios: string[]` (correos) | `votantes: UUID[]` |
| `estado: 'propuesto'` | `Estado.PROPUESTO` |

El color de cada integrante es una decisión de presentación, no un dato del
dominio, así que el backend no lo guarda. Se deriva de la posición en la lista,
que llega ordenada de forma estable (organizadores primero, luego por nombre),
de modo que a la misma persona le toca siempre el mismo color.

---

## 3. Lo que falta

### 3.1 RF-11: notificar la fecha confirmada

Cuando la votación se cierra, el plan queda confirmado en el backend, pero
**nadie se entera hasta que vuelve a mirar**. Falta el canal de notificaciones
(o el WebSocket de RNF-05) que avise a los integrantes.

### 3.2 Módulos 4 y 5

Retrasos, imprevistos y votación exprés siguen **simulados en `groupsStore`**.
El backend no expone nada de eso todavía: faltan las entidades y la evaluación
de criticidad (RF-16).

### 3.3 OCR en servidor

Hoy el OCR se hace **en el navegador** con `tesseract.js` y solo se envía el
resultado como bloques con `fuente: 'OCR'`, que el backend guarda en estado
`BORRADOR` hasta que el usuario los confirma (RF-03, RNF-06).

### 3.4 Tiempo real

Falta WebSocket/STOMP en `/topic/groups/{groupId}` para RNF-05 (retrasos,
votaciones y confirmaciones propagados en menos de 3 s). Mientras tanto, todo
se refresca al navegar.

### 3.5 `usuarioId` en la URL del módulo de horario

`BloqueHorarioController` sigue recibiendo el `usuarioId` como `@PathVariable`,
y su propio comentario dice que es temporal. El módulo de grupos ya hace lo
correcto: toma la identidad del token con `@AuthenticationPrincipal`. Cuando el
de horario se alinee, las rutas pasarán a `/api/bloques-horario` y se ajusta en
`endpoints.ts` y en `scheduleService`, en un único sitio cada uno.

### 3.6 CORS (solo si no se usa el proxy)

En despliegue, o si alguien apunta `VITE_API_URL` directo a
`http://localhost:8080`, el backend necesita permitir el origen del frontend.
`SecurityConfig` ya lo lee de `huecko.cors.allowed-origins`.

---

## 4. Formato de error

`GlobalExceptionHandler` responde `{timestamp, error, mensaje}`. El cliente lee
`mensaje`, luego `message`, luego `error`, así que también entiende los errores
de Spring Security y de validación. Si no hay respuesta del servidor, muestra
qué URL intentó y sugiere revisar que el backend esté encendido.

Códigos que el módulo de grupos usa y que la UI distingue:

| Código | Cuándo | Qué hace el frontend |
| --- | --- | --- |
| `401` | Token ausente o caducado | Cierra sesión y manda al login |
| `403` | Acción solo para el organizador | Deshace el cambio local y muestra el mensaje |
| `404` | Grupo inexistente, **o al que no perteneces** | «No encontrado» |

El 404 para un grupo ajeno es deliberado del backend: un 403 confirmaría que
ese identificador existe a quien solo está probando identificadores.
