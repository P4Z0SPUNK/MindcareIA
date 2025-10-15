// public/js/auth-ui.js
import { onAuthChange, signInWithGoogle, signOutUser, auth } from './firebase-client.js';

// Mantiene sincronizada la UI de autenticación (botones y enlaces)
function updateAuthUI(user) {
  // Sólo manipulamos los controles presentes en la página Mi Cuenta.
  const signInLocal = document.getElementById('sign-in-local');
  const signOutLocal = document.getElementById('sign-out-local');

  const signed = !!user;
  if (signInLocal) signInLocal.style.display = signed ? 'none' : 'inline-block';
  if (signOutLocal) signOutLocal.style.display = signed ? 'inline-block' : 'none';

  // Si no hay sesión, ocultamos cualquier info sensible que pudiera haber quedado en DOM
  if (!signed) {
    const userInfo = document.getElementById('user-info');
    if (userInfo) userInfo.innerHTML = '<p class="muted">No has iniciado sesión.</p>';
  }
}

// Listeners
// Controles locales en Mi Cuenta
const signInLocal = document.getElementById('sign-in-local');
if (signInLocal) signInLocal.addEventListener('click', async () => {
  await signInWithGoogle();
  // al iniciar sesión, la página account.js reaccionará vía onAuthChange
});

const signOutLocal = document.getElementById('sign-out-local');
if (signOutLocal) signOutLocal.addEventListener('click', async () => {
  await signOutUser();
  // Reemplazar el estado del historial para evitar que volver muestre contenido con sesión
  try { history.replaceState({}, '', '/pages/index.html'); } catch (e) {}
  // después de cerrar sesión desde la página Mi Cuenta, redirigimos al inicio
  window.location.href = '/pages/index.html';
});

onAuthChange(user => {
  updateAuthUI(user);
});

console.log('[MindCare] auth-ui.js cargado');

// Asegurarse de actualizar la UI cuando el usuario navega con back/forward (bfcache / pageshow)
window.addEventListener('pageshow', () => {
  try {
    // Si el usuario llega a Mi Cuenta pero no hay sesión, forzamos que vea el estado de no-login
    const inAccount = location.pathname.endsWith('/mi-cuenta.html') || location.pathname.endsWith('/mi-cuenta');
    const user = auth.currentUser;
    if (!user && inAccount) {
      // Forzamos recargar la página para evitar que bfcache muestre datos antiguos
      // Esto también asegura que los controles de Mi Cuenta muestren "Iniciar sesión"
      // Hacemos un reload suave sólo si la página estuvo en cache
      if (performance && performance.getEntriesByType) {
        // simple heuristic: reload una sola vez
        if (!sessionStorage.getItem('mi-cuenta-reloaded')) {
          sessionStorage.setItem('mi-cuenta-reloaded', '1');
          window.location.reload();
          return;
        }
      }
      updateAuthUI(null);
    } else {
      updateAuthUI(user);
    }
  } catch (e) {
    // noop
  }
});