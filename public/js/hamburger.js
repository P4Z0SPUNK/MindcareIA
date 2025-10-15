// public/js/hamburger.js
export function initHamburger() {
  const btn = document.getElementById('hamburger-btn');
  const nav = document.getElementById('primary-nav');
  if (!btn || !nav) return;

  function open() {
    btn.setAttribute('aria-expanded', 'true');
    btn.classList.add('is-active');
    nav.classList.add('open');
    document.body.classList.add('nav-open');
  }
  function close() {
    btn.setAttribute('aria-expanded', 'false');
    btn.classList.remove('is-active');
    nav.classList.remove('open');
    document.body.classList.remove('nav-open');
  }
  function toggle() {
    if (nav.classList.contains('open')) close(); else open();
  }

  btn.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });

  // cerrar al click fuera
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && e.target !== btn) close();
  });

  // cerrar al pulsar un enlace
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => close()));
}

// auto-init si se importa directamente
if (typeof window !== 'undefined') {
  // esperar a que header esté en DOM
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { try { initHamburger(); } catch {} }, 50);
  });
}
