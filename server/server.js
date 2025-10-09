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

// Decide proveedor (OpenAI oficial o Azure Foundry) y crea cliente
const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT;
const AZURE_API_KEY = process.env.AZURE_API_KEY;
const AZURE_DEPLOYMENT = process.env.AZURE_DEPLOYMENT;

let openai;
if (AZURE_ENDPOINT && AZURE_API_KEY) {
  // Aseguramos que baseURL termine en '/'
  const base = AZURE_ENDPOINT.endsWith('/') ? AZURE_ENDPOINT : AZURE_ENDPOINT + '/';
  openai = new OpenAI({ baseURL: base, apiKey: AZURE_API_KEY });
  console.log('[MindCare] Configurado para usar Azure Foundry (endpoint):', base);
  if (!AZURE_DEPLOYMENT) console.warn('[MindCare] AZURE_DEPLOYMENT no está definido en .env');
} else {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  if (!OPENAI_API_KEY) console.warn('[MindCare] FALTA OPENAI_API_KEY en .env y no se detectó Azure.');
  else console.log('[MindCare] Configurado para usar OpenAI oficial.');
}

// Health endpoint opcional
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    provider: AZURE_API_KEY && AZURE_ENDPOINT ? 'azure' : 'openai',
    hasKey: !!(process.env.OPENAI_API_KEY || (AZURE_API_KEY && AZURE_ENDPOINT)),
    model: AZURE_DEPLOYMENT || process.env.OPENAI_MODEL || 'gpt-4o-mini',
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
    // Note: authentication is enforced client-side as a flag (frontend must require sign-in)
    // Validación básica antes de llamar al servicio (OpenAI o Azure)
    if (!process.env.OPENAI_API_KEY && !(AZURE_API_KEY && AZURE_ENDPOINT && AZURE_DEPLOYMENT)) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.write(`data: ${JSON.stringify({ delta: 'Config error: falta credenciales de OpenAI o Azure en el servidor.' })}\n\n`);
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
      // El field "model" para Azure debe recibir el nombre del deployment
      const model = AZURE_DEPLOYMENT || process.env.OPENAI_MODEL || 'gpt-4o-mini';

      const stream = await openai.chat.completions.create({
        model,
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
  console.error('[MindCare] API error:', status, msg);

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

// Endpoint para buscar centros cercanos (proxy a Overpass API de OpenStreetMap)
app.get('/api/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const radius = parseInt(req.query.radius, 10) || 5000; // metros

    if (!lat || !lon) return res.status(400).json({ error: 'Missing lat/lon' });

    // Overpass QL: buscamos centros relacionados con salud y filtramos por keywords relevantes a salud mental
    const query = `[
      out:json][timeout:25];(
        node(around:${radius},${lat},${lon})["amenity"~"clinic|hospital|doctors|social_facility|healthcare"];
        way(around:${radius},${lat},${lon})["amenity"~"clinic|hospital|doctors|social_facility|healthcare"];
        relation(around:${radius},${lat},${lon})["amenity"~"clinic|hospital|doctors|social_facility|healthcare"];
      );out center tags;`;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const response = await fetch(overpassUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => '');
      return res.status(502).json({ error: 'Overpass error', detail: txt });
    }

    const json = await response.json();
    const elements = json.elements || [];

    // Simplify results
    // Simplify and filter by mental-health related keywords (in name or tags)
    function haversineDistance(lat1, lon1, lat2, lon2) {
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371000; // meters
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    const keywords = ['mental', 'psy', 'psic', 'counsel', 'salud mental', 'psiquiatr', 'psicolog'];

    const rawPlaces = elements.map(el => {
      const tags = el.tags || {};
      const name = tags.name || '';
      const address = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(', ');
      const phone = tags.phone || tags['contact:phone'] || tags['telephone'] || null;
      const opening = tags.opening_hours || null;
      const plat = el.lat || el.center?.lat;
      const plon = el.lon || el.center?.lon;
      const text = (name + ' ' + (tags.amenity||'') + ' ' + (tags.healthcare||'') + ' ' + (tags.servicetype||'') + ' ' + (tags['description']||'')).toLowerCase();
      const containsKeyword = keywords.some(k => text.includes(k));
      return { id: el.id, name, address, phone, opening, lat: plat, lon: plon, text, containsKeyword };
    }).filter(p => p.name && p.lat && p.lon && p.containsKeyword);

    // Deduplicate by name+address
    const seen = new Map();
    const dedup = [];
    for (const p of rawPlaces) {
      const key = `${p.name}||${p.address}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        p.distance = haversineDistance(lat, lon, p.lat, p.lon);
        dedup.push(p);
      }
    }

    // Sort by distance
    dedup.sort((a,b) => a.distance - b.distance);

    res.json(dedup);
  } catch (err) {
    console.error('Nearby error', err);
    res.status(500).json({ error: 'internal' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`MindCare AI corriendo en http://localhost:${port}`);
});
