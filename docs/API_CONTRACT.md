# Contrato HTTP del frontend Huecko

Prefijo: `/api/v1`. Salvo autenticación, todas las rutas requieren `Authorization: Bearer <jwt>` y responden JSON. Errores: `{ "message": "texto para el usuario" }`.

## Autenticación

| Método y ruta | Cuerpo | Respuesta 200/201 |
| --- | --- | --- |
| `POST /auth/register` | `{nombre,email,password}` | `201 {requiereVerificacion,desafio,email}`: se envía un código al correo |
| `POST /auth/verificar-correo` | `{desafio,codigo}` | `{token,user}` |
| `POST /auth/reenviar-codigo` | `{desafio}` | `204`; `429` si no ha pasado un minuto |
| `POST /auth/login` | `{email,password}` | `{token,user}`, `{requiereVerificacion,desafio,email}` si el correo no está confirmado, o `{requiereDosPasos,desafio,metodo,correo?}` |
| `POST /auth/dos-pasos` | `{desafio,codigo}` | `{token,user}` |
| `GET /auth/google` | — | `{clientId}`; `null` si el backend no tiene Google configurado (no se muestra el botón) |
| `POST /auth/google` | `{credential}` (ID token del botón de Google) | `{token,user}` o `{requiereDosPasos,desafio,metodo,correo?}`; nunca pide verificar el correo |

`user`: `{id,nombre,email,creado_en,emailVerificado,dosPasosActivo,dosPasosMetodo,tienePassword}`.
`tienePassword: false` es una cuenta creada con Google: al desactivar los dos pasos
no se pide contraseña (se manda `password: ""`).

**Google:** el botón es el oficial de Google Identity Services
(`https://accounts.google.com/gsi/client`, cargado solo cuando hace falta). Solo
aparece con backend y `clientId`. La CSP de la web debe permitir
`https://accounts.google.com/gsi/` en `script-src`, `style-src`, `connect-src` y
`frame-src` (ya está en `vercel.json`; en Render, en `render.yaml` del backend).

Los códigos del correo tienen 4 caracteres sin 0/O/1/I/L (`8JR6`), caducan a los
10 minutos y uno nuevo anula el anterior. El de dos pasos es de 6 dígitos con
`metodo: APP` y de 4 caracteres con `metodo: CORREO` (`correo` llega enmascarado,
`al***@gmail.com`); en los dos casos vale un código de respaldo (`XXXX-XXXX`).

### Verificación en dos pasos de la propia cuenta

| Método y ruta | Propósito |
| --- | --- |
| `GET /me/dos-pasos` | `{activo,codigosRespaldoRestantes,activadoEn,metodo}`. |
| `POST /me/dos-pasos/iniciar`, `POST /me/dos-pasos/activar` | Con app: secreto y QR, y activar con el primer código. |
| `POST /me/dos-pasos/correo/iniciar`, `POST /me/dos-pasos/correo/activar` | Con correo: manda un código (`204`) y activar con él. |
| `POST /me/dos-pasos/enviar-codigo` | Con correo ya activo: manda un código para regenerar o desactivar. |
| `POST /me/dos-pasos/codigos-respaldo`, `POST /me/dos-pasos/desactivar` | Otros 10 códigos de respaldo; quitarla (`{password,codigo}`). |

## Perfil y disponibilidad

| Método y ruta | Propósito |
| --- | --- |
| `GET /me` | Cuenta, perfil social y fecha de la última foto. |
| `PATCH /me` | Actualiza nombre y correo (el correo pide la contraseña actual). |
| `PUT /me/perfil` | Carrera, ciclo, frase e intereses; reemplaza todo. |
| `PUT /me/foto`, `DELETE /me/foto` | Sube (multipart, campo `foto`) o quita la foto de perfil. |
| `GET /me/logros` | Planes vividos, a tiempo, propuestos e insignias. Solo para ti. |
| `GET /usuarios/:id/perfil`, `GET /usuarios/:id/foto` | Tarjeta y foto de alguien con quien compartes un grupo; si no, `404`. |
| `GET /me/libre-ahora` | Tu aviso, si tienes clase ahora, hasta cuándo estás libre según tu horario y, por grupo, cuántos no tienen clase y quiénes avisaron. |
| `PUT /me/libre-ahora`, `DELETE /me/libre-ahora` | «Estoy libre» (`{hasta?, nota?}`) y quitarlo. |
| `GET /grupos/:id/album` | Planes vividos del grupo con su número de fotos y portada; uso del tope del grupo. |
| `GET /planes/:id/fotos`, `POST /planes/:id/fotos` | Álbum de un plan; subir fotos (multipart, partes `fotos`, hasta 10). |
| `GET /fotos/:id`, `GET /fotos/:id/miniatura`, `DELETE /fotos/:id` | Una foto (1280 px) o su miniatura (320 px); borrarla. |
| `PUT /fotos/:id/reacciones/:reaccion`, `DELETE …` | Poner o quitar ❤️ 😂 🔥 😮 👏 (`CORAZON`, `RISA`, `FUEGO`, `ASOMBRO`, `APLAUSO`). |
| `GET /fotos/:id/comentarios`, `POST …` (`{texto}`), `DELETE /comentarios/:id` | Comentarios de una foto. |
| `GET /planes/:id/llegadas`, `PUT …`, `DELETE …` | «Llegué»: si se puede marcar ahora (lo decide el servidor), quiénes llegaron y si a tiempo. |
| `GET /grupos/:id/muro?antes=` | Muro del grupo, 20 entradas por página; `siguiente` para pedir las anteriores. |
| `GET /schedule/blocks` | Devuelve los bloques del usuario. |
| `POST /schedule/blocks` | Crea bloque manual. |
| `PATCH /schedule/blocks/:id` | Edita bloque. |
| `DELETE /schedule/blocks/:id` | Elimina bloque. |
| `POST /schedule/ocr` | `multipart/form-data`, campo `file`; devuelve borradores OCR. |
| `POST /schedule/ocr/confirm` | Confirma los borradores revisados por el usuario. |

Bloque: `{id,tipo:"recurrente"|"puntual"|"borrador_ocr",dia_semana?,fecha?,hora_inicio,hora_fin,etiqueta,fuente}`. Los detalles de otros usuarios nunca se devuelven en el heatmap.

## Grupos y cruce de disponibilidad

| Método y ruta | Propósito |
| --- | --- |
| `GET /groups` | Grupos del usuario y sus integrantes. |
| `POST /groups` | Crea grupo: `{nombre,descripcion,umbral_disponibilidad,miembros?}`. |
| `PATCH /groups/:id` | Edita nombre, descripción o umbral. |
| `POST /groups/join` | `{codigo_invitacion}`. |
| `GET /groups/:id/availability?threshold=80` | Heatmap y ventanas sugeridas. |
| `PATCH /groups/:id/members/:userId` | Actualiza `es_imprescindible` o rol. |

Heatmap: `{threshold,members_count,cells:[{day,hour,available_count,availability_percentage,meets_threshold}],suggested_windows:[...]}`.

## Planes, votos e incidencias

| Método y ruta | Propósito |
| --- | --- |
| `GET /groups/:id/events` | Planes, votaciones y eventos del grupo. |
| `POST /groups/:id/events` | Crea propuesta con `titulo`, `lugar?`, `fecha_cierre` y 2–5 `ventanas`. |
| `POST /events/:id/votes` | `{window_id}`; el backend debe permitir o retirar el voto según configuración. |
| `POST /events/:id/close-voting` | Cierra, desempata y confirma la ventana ganadora. |
| `POST /events/:id/delays` | `{minutes}`. |
| `POST /events/:id/incidents` | `{reason?}`; responde criticidad y, si aplica, la votación exprés. |
| `POST /express-votes/:id/votes` | `{choice:"cancel"|"reschedule"|"keep"}`. |

Evento: `{id,group_id,title,location?,status,windows,voting_deadline,confirmed_window?,attendees,incidents?}`. Estados: `propuesto`, `confirmado`, `cancelado`, `en_recoordinacion`.

## Tiempo real

WebSocket/STOMP debe publicar por grupo en `/topic/groups/{groupId}`. Tipos de evento: `delay_reported`, `incident_reported`, `express_vote_opened`, `vote_updated`, `event_confirmed`, `event_cancelled`. Cada mensaje debe incluir `{type,groupId,payload,createdAt}`.
