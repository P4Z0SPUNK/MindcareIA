// server/server.js
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Sanity check de variables de entorno
if (!process.env.OPENAI_API_KEY) {
  console.warn('[MindCare] FALTA OPENAI_API_KEY en .env');
}

// Health endpoint opcional
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasKey: !!process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });
});

const SYSTEM_PROMPT = `
Eres MindCare, un asistente de apoyo emocional para jóvenes. Eres empático, claro y NO eres terapeuta.
- Valida emociones, ofrece psicoeducación ligera y sugiere hábitos saludables.
- Evita diagnósticos o tratamientos. No des consejos médicos/legales.
- Si surge riesgo (p. ej., ideas suicidas, autolesiones), responde de forma prioritaria,
  fomenta buscar ayuda humana inmediata y comparte recursos de crisis.
- Lenguaje: español de México, cálido y respetuoso.
`;

// Desactiva moderación mientras diagnosticamos (para descartar fallos de ese endpoint)
// Si quieres reactivarla luego, vuelve a incluir la función y la llamada.
async function isFlaggedByModeration(_text) {
  return false;
}

app.post('/api/chat', async (req, res) => {
  try {
    // Validación básica antes de llamar a OpenAI
    if (!process.env.OPENAI_API_KEY) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.write(`data: ${JSON.stringify({ delta: 'Config error: falta OPENAI_API_KEY en el servidor.' })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const { history = [] } = req.body;
    const userMsg = history.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

    const flagged = await isFlaggedByModeration(userMsg);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    if (flagged) {
      const crisisMsg =
        "Lamento que estés pasando por un momento tan duro. No estás solo/a.\n\n" +
        "Si corres riesgo inminente, llama a 911 o busca ayuda cercana.\n\n" +
        "En México, Línea de la Vida (24/7): 800 911 2000.";
      res.write(`data: ${JSON.stringify({ delta: crisisMsg })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => ({ role: m.role, content: m.content })),
    ];

    try {
      const stream = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        stream: true,
        temperature: 0.7,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (apiErr) {
      // Log detallado
      const status = apiErr?.status || apiErr?.code || 'unknown';
      const msg = apiErr?.message || apiErr?.error?.message || 'unknown';
      console.error('[MindCare] OpenAI error:', status, msg);

      // Mensaje de error entendible para el usuario
      let hint = 'Problema con el servicio.';
      if (String(status) === '401') hint = 'API key inválida o sin permisos.';
      else if (String(status) === '429') hint = 'Límite de uso alcanzado o billing pendiente.';
      else if (String(status).includes('ENOTFOUND') || String(status).includes('ECONN'))
        hint = 'Error de red al contactar el servicio.';

      res.write(`data: ${JSON.stringify({ delta: `Lo siento, ${hint}` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (err) {
    console.error('Upstream error (no-OpenAI):', err);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.write(`data: ${JSON.stringify({ delta: 'Ocurrió un error inesperado en el servidor.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MindCare AI corriendo en http://localhost:${port}`);
});
