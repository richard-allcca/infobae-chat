# Infobae Chat

Interfaz web de chat construida con React, TypeScript y Vite. Se conecta con la API de conversaciones de Infobae para crear y recuperar chats, enviar mensajes en streaming y mostrar las fuentes de las respuestas.

## Funcionalidades

- Pedir un acceso local antes de mostrar el chat. La sesión queda en el navegador y se cierra desde la barra lateral.
- Crear conversaciones y volver a abrir conversaciones recientes.
- Recibir respuestas progresivamente mediante Server-Sent Events (SSE).
- Mostrar, en desarrollo, el razonamiento y las herramientas que informa el backend.
- Renderizar las respuestas del asistente como Markdown y sus fuentes como cards con imagen.
- Informar estados de pensamiento, búsqueda y lectura, errores y opción para reintentar.
- Enviar mensajes de hasta 2.000 caracteres. `Enter` envía el mensaje y `Shift+Enter` inserta un salto de línea.

## Requisitos

- Node.js 20 o posterior y npm.
- Acceso a la API de chat y los valores de configuración correspondientes.

## Desarrollo local

1. Instala las dependencias:

   ```sh
   npm install
   ```

2. Crea el archivo local de variables de entorno:

   ```powershell
   Copy-Item .env.example .env
   ```

   Configura los valores requeridos en `.env` según el entorno al que tengas acceso.

3. Inicia el servidor de desarrollo:

   ```sh
   npm run dev
   ```

Vite muestra en la terminal la dirección local para abrir la aplicación. En desarrollo, las solicitudes a `/api` se reenvían al backend configurado en `vite.config.ts`.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `VITE_API_TOKEN` | Token de autorización que el cliente envía como `Bearer`. |
| `VITE_PRODUCT_ID` | Identificador del producto en la API. |
| `VITE_API_BASE_URL` | Base de la API. Si se deja vacía, la aplicación usa `/api`. |

Vite incorpora las variables `VITE_*` en el código del navegador. No guardes secretos de servidor en estas variables ni uses un token privilegiado en un despliegue público. Para producción, configura un backend o proxy seguro y establece `VITE_API_BASE_URL` para apuntar a él.

## Acceso temporal

La pantalla de inicio valida en el navegador el usuario `admin@infobae.com` y la contraseña `infobae-chat`. La sesión se guarda en `localStorage` y no se envía al backend. Estas credenciales no están en variables `VITE_*`.

Ese acceso solo oculta la interfaz. No protege la API: el token `VITE_API_TOKEN` sigue autorizando las solicitudes. Reemplazarlo por un proveedor real, como Google para correos `@infobae.com`, requiere un backend que verifique la identidad y emita la sesión.

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Vite en modo desarrollo. |
| `npm run build` | Comprueba los tipos de TypeScript y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente la última compilación de `dist/`. |
| `npm run lint` | Ejecuta ESLint sobre el proyecto. |

## Estructura

```text
src/
  api/chat.ts                          Cliente REST y lector del stream SSE
  auth/session.ts                      Acceso local y sesión del navegador
  activity.ts                          Asociación de llamadas y resultados de herramientas
  components/LoginView/                Pantalla de inicio de sesión
  components/Sidebar/                  Conversaciones recientes y cierre de sesión
  components/ChatView/                 Hilo, depuración y cards de fuentes
  App.tsx                              Estado y coordinación del chat
  types.ts                             Tipos de API y de la interfaz
docs/
  ai-sdk.md                            Detalles del protocolo SSE y la decisión de no usar AI SDK
```

## API de chat

El cliente usa el prefijo `/v1/chat/{productId}`. Para listar, crear y abrir conversaciones consume endpoints REST. Los mensajes se envían a `/conversations/{id}/messages` con un cuerpo `{ "text": "..." }` y el header `X-Debug: true`. La respuesta es un stream SSE propio con eventos `status`, `delta`, `sources`, `debug`, `error` y `done`.

`debug` solo lo emite el backend de desarrollo. El cliente muestra el razonamiento y abre un panel por cada herramienta: primero en Running, con sus parámetros, y después en Completed, con el resultado asociado por `toolCallId`. Los eventos o etapas que no reconoce se ignoran. Las fuentes llegan con imagen y se muestran como cards.

En desarrollo, el proxy de Vite elimina el prefijo `/api` y reenvía las solicitudes al backend definido en `vite.config.ts`. En otros entornos, `VITE_API_BASE_URL` debe apuntar a una base que exponga esos endpoints y permita el acceso desde el navegador. La implementación y sus diferencias con el protocolo de AI SDK están descritas en [docs/ai-sdk.md](docs/ai-sdk.md).
