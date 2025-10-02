# MindCare AI (demo local)
Sitio estático con un widget de chat que transmite respuestas de OpenAI en tiempo real mediante un backend Node.js que oculta tu API key.

## Requisitos
- Node.js 18+
- Una API key válida de OpenAI

## Configuración
1. Clona/extrae este proyecto.
2. Copia `.env.example` a `.env` y actualiza el valor de `OPENAI_API_KEY`:
```
OPENAI_API_KEY=tu_api_key_aqui
# Opcional: cambia el modelo
OPENAI_MODEL=gpt-4o-mini
PORT=3000
```
3. Instala dependencias:
```
npm install
```
4. Inicia el servidor:
```
npm run dev
```
5. Abre http://localhost:3000 en tu navegador.

## Notas
- El endpoint `/api/chat` hace streaming usando Server-Sent Events.
- El cliente consume los fragmentos y los va mostrando en el chat.
- Este proyecto es solo para demostración y **no sustituye** apoyo profesional.
