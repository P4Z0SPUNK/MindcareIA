// public/js/chat.js

// ====== SELECTORES BÁSICOS ======
const widget = document.getElementById('chat-widget');
const openBtn = document.getElementById('openChat');
const closeBtn = document.getElementById('closeChat');

const chat = document.getElementById('messages'); // contenedor de burbujas
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');

const quickLinks = document.querySelectorAll('button.link'); // botones con data-msg en "Servicios"

const history = []; // [{role:'user'|'assistant', content:'...'}]

// ====== UTILIDADES UI ======
function openChat() {
  if (!widget) return;
  widget.classList.remove('hidden');
  widget.setAttribute('aria-hidden', 'false');
  if (input) input.focus();
}

function closeChat() {
  if (!widget) return;
  widget.classList.add('hidden');
  widget.setAttribute('aria-hidden', 'true');
}

// Crea la estructura .msg.(user|ai) > .bubble y devuelve el nodo .bubble
function addBubble(text, who = 'user') {
  const row = document.createElement('div');
  row.className = `msg ${who === 'user' ? 'user' : 'ai'}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  row.appendChild(bubble);
  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;

  return bubble; // devolvemos la burbuja para ir agregando texto durante el streaming
}

// ====== EVENT LISTENERS PARA ABRIR/CERRAR ======
if (openBtn) openBtn.addEventListener('click', openChat);
if (closeBtn) closeBtn.addEventListener('click', closeChat);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeChat(); });

// ====== QUICK ACTIONS (botones en "Servicios") ======
quickLinks.forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = btn.getAttribute('data-msg') || '';
    openChat();
    if (preset) {
      input.value = preset;
      form.requestSubmit(); // dispara el submit del formulario
    }
  });
});

import { getIdToken, onAuthChange, signInWithGoogle, signOutUser } from './firebase-client.js';

// Disable chat UI if not authenticated
let isAuthed = false;
onAuthChange(user => {
  isAuthed = !!user;
  // show sign-in button if not authed
  const signInBtn = document.getElementById('sign-in-btn');
  if (signInBtn) signInBtn.style.display = isAuthed ? 'none' : 'inline-block';
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) signOutBtn.style.display = isAuthed ? 'inline-block' : 'none';
  const chatControls = document.getElementById('chat-controls');
  if (chatControls) chatControls.style.display = isAuthed ? 'block' : 'none';
});

// Sign-in button handler (if present)
const signInBtn = document.getElementById('sign-in-btn');
if (signInBtn) signInBtn.addEventListener('click', async () => {
  await signInWithGoogle();
});

// Sign-out button handler
const signOutBtn = document.getElementById('sign-out-btn');
if (signOutBtn) signOutBtn.addEventListener('click', async () => {
  await signOutUser();
});

// ====== LÓGICA DE CHAT CON STREAMING ======
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  // pinta usuario
  addBubble(text, 'user');
  input.value = '';

  // burbuja vacía para el bot (con '...' inicial)
  const botBubble = addBubble('...', 'ai');

  history.push({ role: 'user', content: text });

  try {
    if (!isAuthed) {
      botBubble.textContent = 'Necesitas iniciar sesión para usar el chatbot.';
      return;
    }

    // Authentication is a client-side flag only; we do not send ID tokens to the server.
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history }),
    });

    if (!resp.ok || !resp.body) {
      botBubble.textContent = 'Lo siento, hubo un problema. Intenta de nuevo.';
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let acc = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });

      // SSE: fragmentos separados por doble salto de línea
      const parts = acc.split('\n\n');
      acc = parts.pop() || '';
      for (const p of parts) {
        if (!p.startsWith('data:')) continue;
        const payload = p.slice(5).trim();
        if (payload === '[DONE]') continue;

        try {
          const { delta, error } = JSON.parse(payload);
          if (error) {
            botBubble.textContent = 'Lo siento, hubo un problema con el servicio.';
            break;
          }
          if (delta) {
            if (botBubble.textContent === '...') botBubble.textContent = '';
            botBubble.textContent += delta;
            chat.scrollTop = chat.scrollHeight;
          }
        } catch {
          // ignoramos líneas keep-alive o parsing parcial
        }
      }
    }

    history.push({ role: 'assistant', content: botBubble.textContent });
  } catch (err) {
    console.error('[MindCare] error', err);
    botBubble.textContent = 'Lo siento, hubo un problema de conexión.';
  }
});

// ====== LOG DE CARGA ======
console.log('[MindCare] chat.js cargado');
