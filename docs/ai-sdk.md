# Por qué esta app no usa AI SDK

El POST `/v1/chat/{productId}/conversations/{id}/messages` responde con Server-Sent Events propios. [AI SDK](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) (`useChat` de `@ai-sdk/react`) espera otro contrato. Esta app lee el stream con `fetch` en `src/api/chat.ts`.

## El protocolo no coincide

AI SDK, con `DefaultChatTransport`, hace POST a un único endpoint (por defecto `/api/chat`) y manda el historial completo de mensajes. La respuesta tiene que ser su data stream y llevar el header `x-vercel-ai-ui-message-stream: v1`:

```
data: {"type":"text-delta","id":"...","delta":"Hello"}
data: [DONE]
```

Infobae hace tres cosas distintas:

- El id de la conversación va en la URL, no en un chat único.
- El body es solo `{ "text": "..." }`. El backend arma el historial. No hay que reenviar los mensajes anteriores.
- Los eventos tienen nombre y un JSON propio:

| Evento Infobae | Data | Equivalente en AI SDK |
| --- | --- | --- |
| `status` | `{"stage":"thinking"}`, `{"stage":"searching"}` o `{"stage":"reading"}` | No existe en el text stream. Habría que emitir un `data-status`. |
| `delta` | `{"text":"..."}` | `text-delta`, y el campo se llama `delta`, no `text`. |
| `sources` | `{"sources":[...]}` sin `position` (el índice es la posición). Cada fuente puede traer `image`. | `source-url` por cada fuente. |
| `debug` | `reasoning`, `tool-call` o `tool-result`. Solo en dev y si el request manda `X-Debug: true`. | No forma parte del text stream. |
| `error` | `{"code":"GENERATION_FAILED","message":"..."}` | `{"type":"error","errorText":"..."}`. |
| `done` | `{}` | `finish` y después `data: [DONE]`. |

`TextStreamChatTransport` tampoco sirve: solo concatena texto plano. `status`, `sources` y `error` se perderían, y el cuerpo de cada `delta` es JSON, no el fragmento de Markdown.

Errores 400, 401, 404 y 429 llegan como JSON antes de que abra el stream. El transporte por defecto del SDK interpreta un 200 con su protocolo de eventos, no ese JSON.

## Qué implicaría usar el SDK igual

Un `ChatTransport` propio tendría que hacer el POST a Infobae, parsear estos eventos y traducirlos a `UIMessageChunk`. El parser SSE hay que escribirlo igual: el SDK no reconoce `event: delta`.

Listar, crear y abrir una conversación siguen fuera de `useChat`. Esos tres endpoints son REST. Al abrir un chat del historial habría que volcar el `GET` en `setMessages`, porque el hook no conoce ese detalle.

Un proxy que reescriba el SSE al protocolo del SDK permitiría usar `DefaultChatTransport`, pero duplica el contrato en un proceso intermedio. Para esta app el único cliente es el navegador, así que la traducción no ahorra código.

Eventos o valores de `stage` que no estén en la tabla hay que ignorarlos. Un adaptador que falle ante un evento nuevo rompería el chat cuando el backend agregue uno.
