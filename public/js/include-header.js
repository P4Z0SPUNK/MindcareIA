// public/js/include-header.js
// Pequeño script para incluir /partials/header.html en cada página que lo pida.
export async function includeHeader() {
  try {
    const resp = await fetch('/partials/header.html');
    if (!resp.ok) return;
    const html = await resp.text();
    const container = document.createElement('div');
    container.innerHTML = html;
    // Insertar al inicio del body
    document.body.insertBefore(container, document.body.firstChild);
    // inicializar comportamiento del menú hamburguesa si existe
    try {
      const mod = await import('./hamburger.js');
      if (mod && mod.initHamburger) mod.initHamburger();
    } catch (e) {
      // fall back: no hacemos nada
    }
  } catch (e) {
    console.error('No se pudo cargar header:', e);
  }
}

// Auto-incluir si se importa directamente
if (typeof window !== 'undefined') {
  includeHeader();
}
