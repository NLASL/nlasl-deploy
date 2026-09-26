// calculadora_v1.js
// Calculadora flotant global (SAO — Sistema Agrari Òptim / Quadern de Camp)
// Adaptada del widget original de GACO. Obrir amb Alt+K o clic al botó;
// insereix el resultat al darrer camp enfocat, o el copia al porta-retalls.
// Script clàssic (sense import/export) per seguir la convenció de la resta
// de fitxers del projecte (app_v8.js, collita_v1.js, etc.).

(function () {
  'use strict';

  let panelEl = null;
  let displayEl = null;
  let lastFocusedInput = null;
  let current = '0';
  let justEvaluated = false;

  function esCampValid(el) {
    return el && el.tagName === 'INPUT' &&
      (el.type === 'number' || el.type === 'text' || el.type === '');
  }

  // Recorda sempre el darrer input vàlid enfocat, encara que després
  // el focus passi a la calculadora.
  document.addEventListener('focusin', (e) => {
    if (esCampValid(e.target)) lastFocusedInput = e.target;
  });

  function formatCaES(n) {
    if (!isFinite(n)) return 'Error';
    return n.toLocaleString('ca-ES', { minimumFractionDigits: 0, maximumFractionDigits: 6 });
  }

  function evaluar(expr) {
    // Només dígits, operadors bàsics, punt i parèntesis. Res de codi arbitrari.
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) return NaN;
    try {
      // eslint-disable-next-line no-new-func
      return Function('"use strict"; return (' + expr + ')')();
    } catch {
      return NaN;
    }
  }

  function actualitzarDisplay() {
    displayEl.textContent = current;
  }

  function premeTecla(t) {
    if (t === 'C') {
      current = '0';
      justEvaluated = false;
    } else if (t === '⌫') {
      current = current.length > 1 ? current.slice(0, -1) : '0';
    } else if (t === '=') {
      const resultat = evaluar(current);
      current = isNaN(resultat) ? 'Error' : String(resultat);
      justEvaluated = true;
    } else {
      if (justEvaluated && !'+-*/'.includes(t)) current = '0';
      justEvaluated = false;
      if (current === '0' && !'.+-*/'.includes(t)) current = t;
      else current += t;
    }
    actualitzarDisplay();
  }

  function valorNumeric() {
    const v = evaluar(current);
    return isNaN(v) ? null : v;
  }

  function inserirAlCamp() {
    const v = valorNumeric();
    if (v === null || !lastFocusedInput) return;
    const el = lastFocusedInput;
    el.value = el.type === 'number' ? String(v) : formatCaES(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.focus();
    tancarCalculadora();
  }

  async function copiarResultat() {
    const v = valorNumeric();
    if (v === null) return;
    try {
      await navigator.clipboard.writeText(String(v));
      displayEl.classList.add('sao-calc-copiat');
      setTimeout(() => displayEl.classList.remove('sao-calc-copiat'), 400);
    } catch {
      // clipboard no disponible (context no segur, etc.) — no fem res més
    }
  }

  function crearPanell() {
    const el = document.createElement('div');
    el.className = 'sao-calc-panel';
    el.innerHTML = `
      <div class="sao-calc-header">
        <span>Calculadora</span>
        <button type="button" class="sao-calc-close" aria-label="Tancar">×</button>
      </div>
      <div class="sao-calc-display">0</div>
      <div class="sao-calc-grid">
        ${['7','8','9','/','4','5','6','*','1','2','3','-','C','0','.','+']
          .map(t => `<button type="button" data-key="${t}">${t}</button>`).join('')}
        <button type="button" data-key="⌫" class="sao-calc-wide">⌫</button>
        <button type="button" data-key="=" class="sao-calc-wide sao-calc-eq">=</button>
      </div>
      <div class="sao-calc-actions">
        <button type="button" class="sao-calc-insert">Inserir al camp</button>
        <button type="button" class="sao-calc-copy">Copiar</button>
      </div>
    `;
    document.body.appendChild(el);

    // Evita que un clic dins la calculadora es propagui fins al listener
    // "clic fora tanca el modal" que pugui tenir el gestor de modals.
    el.addEventListener('click', (e) => e.stopPropagation());
    el.addEventListener('mousedown', (e) => e.stopPropagation());

    displayEl = el.querySelector('.sao-calc-display');
    el.querySelector('.sao-calc-close').addEventListener('click', tancarCalculadora);
    el.querySelector('.sao-calc-insert').addEventListener('click', inserirAlCamp);
    el.querySelector('.sao-calc-copy').addEventListener('click', copiarResultat);
    el.querySelectorAll('[data-key]').forEach(btn => {
      btn.addEventListener('click', () => premeTecla(btn.dataset.key));
    });
    return el;
  }

  function crearBotoFlotant() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sao-calc-fab';
    btn.title = 'Calculadora (Alt+K)';
    btn.textContent = '🧮';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCalculadora();
    });
    document.body.appendChild(btn);
  }

  function obrirCalculadora() {
    if (!panelEl) panelEl = crearPanell();
    current = '0';
    justEvaluated = false;
    actualitzarDisplay();
    panelEl.classList.add('active');
  }

  function tancarCalculadora() {
    if (panelEl) panelEl.classList.remove('active');
  }

  function toggleCalculadora() {
    if (panelEl && panelEl.classList.contains('active')) tancarCalculadora();
    else obrirCalculadora();
  }

  function initCalculadora() {
    crearBotoFlotant();
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCalculadora();
      } else if (e.key === 'Escape' && panelEl && panelEl.classList.contains('active')) {
        // Si hi ha un modal obert que també escolta Escape a document,
        // aturem la propagació: amb la calculadora oberta, Escape només
        // la tanca a ella (cal un segon Escape per tancar el modal de sota).
        e.stopPropagation();
        tancarCalculadora();
      }
    }, true); // fase de captura: ens assegurem d'executar-nos abans que l'escHandler del modal
  }

  // Exposem les funcions globalment seguint el patró de la resta de l'app
  // (tancarModal, mostrarNotificacio, etc. també són globals).
  window.obrirCalculadora = obrirCalculadora;
  window.tancarCalculadora = tancarCalculadora;
  window.toggleCalculadora = toggleCalculadora;
  window.initCalculadora = initCalculadora;

  // Auto-inicialització en carregar el DOM (no cal cridar-ho manualment
  // des d'app_v8.js, però la funció queda disponible per si es vol reiniciar).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalculadora);
  } else {
    initCalculadora();
  }
})();
