# Contrato HTTP del frontend Huecko

Prefijo: `/api/v1`. Salvo autenticación, todas las rutas requieren `Authorization: Bearer <jwt>` y responden JSON. Errores: `{ "message": "texto para el usuario" }`.

## Autenticación

| Método y ruta | Cuerpo | Respuesta 200/201 |
| --- | --- | --- |
| `POST /auth/register` | `{nombre,email,password}` | `{token,user}` |
| `POST /auth/login` | `{email,password}` | `{token,user}` |

`user`: `{id,nombre,email,creado_en}`.

## Perfil y disponibilidad

| Método y ruta | Propósito |
| --- | --- |
| `GET /me` | Perfil y preferencias del usuario. |
| `PATCH /me` | Actualiza nombre, zona horaria, privacidad y preferencias de notificación. |
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
