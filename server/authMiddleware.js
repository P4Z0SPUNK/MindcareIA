// server/authMiddleware.js
import admin from 'firebase-admin';
import fs from 'fs';

// Inicializa Firebase Admin SDK
if (!admin.apps.length) {
  // Si se provee la variable GOOGLE_APPLICATION_CREDENTIALS, carga el JSON
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyPath && fs.existsSync(keyPath)) {
    const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(key) });
    console.log('[MindCare] Firebase Admin inicializado con service account.');
  } else {
    // fallback a ADC (usado en Cloud Run cuando la service account está asignada al servicio)
    try {
      admin.initializeApp();
      console.log('[MindCare] Firebase Admin inicializado (Application Default Credentials).');
    } catch (e) {
      console.warn('[MindCare] Firebase Admin no pudo inicializarse automáticamente:', e.message);
    }
  }
}

export async function verifyFirebaseIdToken(req, res, next) {
  const auth = req.headers.authorization || '';
  console.log('[MindCare] auth header:', auth ? 'present' : 'missing');
  const match = auth.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'No token provided' });
  const idToken = match[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log('[MindCare] decoded token uid:', decoded?.uid);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('[MindCare] Invalid Firebase ID token', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}
