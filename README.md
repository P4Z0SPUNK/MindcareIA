# MindCare AI — demo local

MindCare AI es un proyecto educativo para ofrecer apoyo informativo de salud mental mediante un asistente conversacional. Incluye:

- Frontend estático (carpeta `public/`) con widget de chat y búsqueda de centros de ayuda cercanos.
- Backend Node.js (Express) que actúa como proxy a Azure AI Foundry y a la Overpass API (OpenStreetMap).

IMPORTANTE: Este proyecto es educativo y no reemplaza atención profesional.

Requisitos

- Node.js 18+
- Una cuenta/clave de Azure AI Foundry (opcional para pruebas)

Variables de entorno
Copiar `.env.example` a `.env` y completar las variables necesarias:

```bash
# Azure Foundry / Azure OpenAI
AZURE_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/openai/v1/
AZURE_API_KEY=YOUR_AZURE_API_KEY
AZURE_DEPLOYMENT=ChatBotLuka
AZURE_API_VERSION=2025-01-01-preview

PORT=3000
```

Nota: para pruebas locales puedes mantener la clave en `.env`, pero en producción usa Secret Manager / Key Vault.

Instalación y ejecución local

1. Instala dependencias:

```bash
npm install
```

1. Ejecuta la app en modo desarrollo:

```bash
npm run dev
```

1. Abre tu navegador en `http://localhost:3000`

Qué incluye

- Chat con streaming (Server-Sent Events) hacia el frontend.
- Login con Google (Firebase Auth) — actualmente el login actúa como bandera en el frontend para habilitar el chat.
- Búsqueda de centros de ayuda cercanos mediante geolocalización y Overpass (OpenStreetMap).

APIs utilizadas

- Azure AI Foundry / Azure OpenAI: proveedor de modelos de lenguaje (deployment). El backend usa el SDK `openai` apuntando al `AZURE_ENDPOINT` y al `AZURE_DEPLOYMENT` para generar respuestas en streaming (completions/chat). Más info: [Azure OpenAI documentation](https://learn.microsoft.com/azure/cognitive-services/openai/).

- Overpass API (OpenStreetMap): servicio público que permite consultas espaciales (Overpass QL). El backend consulta `https://overpass-api.de/api/interpreter` para obtener nodos/ways/relations cercanos a la ubicación del usuario y filtra por etiquetas relacionadas con salud mental.

- Firebase Authentication (Web SDK): se usa el cliente de Firebase en el frontend para permitir inicio de sesión con Google (solo como flag para habilitar el chat en la UI). Archivo: `public/js/firebase-client.js`. Documentación: [Firebase Auth (Web)](https://firebase.google.com/docs/auth/web).

- openai (npm): librería cliente para Node.js usada en el backend para comunicarse con OpenAI o con Azure OpenAI cuando se configura `baseURL`. El código utiliza streaming (iterador async) para retransmitir fragmentos al cliente via SSE.

Firebase (Hosting + Auth)

- El cliente de Firebase se encuentra en `public/js/firebase-client.js`. Asegúrate de habilitar Google Sign‑In en Firebase Console (Authentication → Sign‑in method) y añadir `localhost` en dominios autorizados.
- Para Hosting: inicializa con `firebase init hosting` y despliega con `firebase deploy --only hosting`.

Despliegue recomendado para el backend

- Para producción (streaming SSE) se recomienda desplegar el backend en **Cloud Run** (o servicio equivalente que soporte conexiones largas).
- Al desplegar, inyecta `AZURE_API_KEY` desde un gestor de secretos y configura `GOOGLE_APPLICATION_CREDENTIALS` si vas a usar Firebase Admin en el backend.


Estructura del proyecto (actualizada)

- `public/` - frontend estático
  - `index.html` — HTML principal
  - `css/` — estilos
    - `styles.css`
  - `js/` — scripts del frontend (módulos ES)
    - `chat.js` — lógica del widget de chat (streaming SSE)
    - `nearby.js` — búsqueda y render de centros cercanos
    - `firebase-client.js` — helper de Firebase (sign-in, sign-out, onAuthChange)

- `server/` - backend
  - `server.js` — servidor Express principal (rutas: `/api/chat`, `/api/nearby`)
  - `authMiddleware.js` — verificación opcional de ID tokens (si quieres protección server-side)

- `.env.example` — variables de entorno necesarias

Licencia y atribución

Este repositorio incluye una licencia con cláusula de atribución educativa. Consulta `LICENSE.md`.

Auteurs / Autores

- [P4Z0SPUNK](https://github.com/P4Z0SPUNK)
- [ItielSanzAXO](https://github.com/ItielSanzAXO)
