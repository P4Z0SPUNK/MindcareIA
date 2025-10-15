// public/js/account.js
import { onAuthChange } from './firebase-client.js';

function renderUser(user) {
  const container = document.getElementById('user-info');
  const activitySection = document.getElementById('mi-actividad');
  const activityList = document.getElementById('activity-list');

  if (!container) return;

  if (!user) {
    container.innerHTML = '<p class="muted">No has iniciado sesi\u00f3n.</p>';
    if (activitySection) activitySection.style.display = 'none';
    return;
  }

  // Mostrar información básica del usuario proveniente de Google
  const html = `
    <div class="user-row">
      <img src="${user.photoURL || '/img/avatar.png'}" alt="avatar" class="avatar" />
      <div>
        <div class="h4">${user.displayName || 'Usuario'}</div>
        <div class="muted">${user.email || ''}</div>
      </div>
    </div>
  `;
  container.innerHTML = html;

  // Mostrar actividad (por ahora leemos del localStorage como ejemplo)
  const raw = localStorage.getItem('mindcare:activity');
  let items = [];
  try { items = raw ? JSON.parse(raw) : []; } catch { items = []; }

  if (activityList) {
    activityList.innerHTML = '';
    if (!items.length) {
      activityList.innerHTML = '<p class="muted">Aún no hay actividad.</p>';
    } else {
      items.forEach(it => {
        const card = document.createElement('article');
        card.className = 'card';
        card.innerHTML = `<strong>${it.title}</strong><p class="muted">${it.when}</p><p>${it.summary}</p>`;
        activityList.appendChild(card);
      });
    }
    activitySection.style.display = 'block';
  }
}

onAuthChange(user => {
  renderUser(user);
});

console.log('[MindCare] account.js cargado');