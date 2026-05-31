// fertilitzants-ui_v1.js — UI mòdul fertilitzants
// Quadern de Camp NLASL · v1.0
// Depèn de: fertilitzants_v1.js (window.Fertilitzants), supabase-client_v5.js, app_v8.js

'use strict';

// ─────────────────────────────────────────────
// ESTAT LOCAL DEL MÒDUL
// ─────────────────────────────────────────────

let _fertilitzants     = [];   // cache llista completa
let _seleccionats      = new Set(); // ids seleccionats per comparar
let _fase              = 'NKP';
let _ordre             = 'puntuacio';
let _nomesFerri        = false;
let _fertilitzantActiu = null; // objecte en edició al modal tècnic

// ─────────────────────────────────────────────
// PUNT D'ENTRADA — cridar des de canviarVista()
// ─────────────────────────────────────────────

async function carregarVistaFertilitzants() {
  const main = document.getElementById('view-container');
  if (!main) return;

  main.innerHTML = renderEsquelet();
  _seleccionats.clear();

  try {
    _fertilitzants = await Fertilitzants.getComplet();
    renderTot();
  } catch (e) {
    main.innerHTML = `<p class="error-msg">Error carregant fertilitzants: ${e.message}</p>`;
  }
}

// ─────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────

function renderEsquelet() {
  return `
  <div id="fert-wrap" class="fert-wrap">
    <div class="fert-header">
      <h1 class="fert-titol">Fertilitzants</h1>
      <div class="fert-header-accions">
        ${hasPermission('insert') ? `<button class="btn-secondary btn-sm" onclick="obrirModalTecnic(null)">
          <i class="ti ti-plus"></i> Nou fertilitzant
        </button>` : ''}
      </div>
    </div>

    <!-- Tabs -->
    <div class="fert-tabs" role="tablist">
      <button class="fert-tab fert-tab--actiu" role="tab" aria-selected="true"
        onclick="canviarTab('comparador', this)" id="tab-comparador">
        <i class="ti ti-chart-bar"></i> Comparador
      </button>
      <button class="fert-tab" role="tab" aria-selected="false"
        onclick="canviarTab('cataleg', this)" id="tab-cataleg">
        <i class="ti ti-list"></i> Catàleg
      </button>
    </div>

    <!-- Contingut tabs -->
    <div id="tab-content-comparador" class="tab-content tab-content--actiu">
      <div id="fert-metriques"></div>
      <div class="fert-filtres" id="fert-filtres"></div>
      <div id="fert-cards"></div>
      <div id="fert-comparativa"></div>
    </div>

    <div id="tab-content-cataleg" class="tab-content" style="display:none">
      <div id="fert-taula"></div>
    </div>
  </div>

  <!-- Modal dades tècniques -->
  <div id="modal-fert-tecnic" class="modal" style="display:none" role="dialog" aria-modal="true">
    <div class="modal-overlay" onclick="tancarModalTecnic()"></div>
    <div class="modal-box modal-box--lg">
      <div class="modal-header">
        <h2 id="modal-fert-titol">Dades tècniques</h2>
        <button class="modal-close" onclick="tancarModalTecnic()" aria-label="Tancar">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="modal-body" id="modal-fert-body"></div>
    </div>
  </div>`;
}

function renderTot() {
  const processats = Fertilitzants.filtrarIOrdenar(_fertilitzants, {
    fase:               _fase,
    ordre:              _ordre,
    nomesFertirrigacio: _nomesFerri,
  });
  const metriques = Fertilitzants.calcularMetriques(_fertilitzants);

  renderMetriques(metriques);
  renderFiltres();
  renderCards(processats);
  renderComparativa();
  renderTaula();
}

// ─────────────────────────────────────────────
// MÈTRIQUES
// ─────────────────────────────────────────────

function renderMetriques(m) {
  const el = document.getElementById('fert-metriques');
  if (!el) return;
  el.innerHTML = `
  <div class="metriques-grid">
    <div class="metrica-card">
      <div class="metrica-label">Productes al catàleg</div>
      <div class="metrica-valor">${m.total}</div>
    </div>
    <div class="metrica-card">
      <div class="metrica-label">Aptes fertirrigació</div>
      <div class="metrica-valor">${m.aptesFerri}</div>
      <div class="metrica-sub">${m.total > 0 ? Math.round((m.aptesFerri/m.total)*100) : 0}% del catàleg</div>
    </div>
    <div class="metrica-card ${m.millorCostN ? '' : 'metrica-card--buit'}">
      <div class="metrica-label">Millor €/kg N</div>
      <div class="metrica-valor">${m.millorCostN ? m.millorCostN.cost.toFixed(2)+'€' : '—'}</div>
      <div class="metrica-sub">${m.millorCostN ? m.millorCostN.nom : 'Sense preus'}</div>
    </div>
    <div class="metrica-card ${m.millorCostK ? '' : 'metrica-card--buit'}">
      <div class="metrica-label">Millor €/kg K₂O</div>
      <div class="metrica-valor">${m.millorCostK ? m.millorCostK.cost.toFixed(2)+'€' : '—'}</div>
      <div class="metrica-sub">${m.millorCostK ? m.millorCostK.nom : 'Sense preus'}</div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// FILTRES
// ─────────────────────────────────────────────

function renderFiltres() {
  const el = document.getElementById('fert-filtres');
  if (!el) return;
  el.innerHTML = `
  <div class="filtres-row">
    <div class="filtre-grup">
      <label class="filtre-label">Fase / necessitat</label>
      <select class="filtre-sel" onchange="canviarFase(this.value)">
        <option value="NKP"          ${_fase==='NKP'?'selected':''}>Equilibrada (NPK)</option>
        <option value="N"            ${_fase==='N'?'selected':''}>Nitrogenada (N dominant)</option>
        <option value="K"            ${_fase==='K'?'selected':''}>Potàssica (K dominant)</option>
        <option value="fertirrigacio"${_fase==='fertirrigacio'?'selected':''}>Fertirrigació</option>
      </select>
    </div>
    <div class="filtre-grup">
      <label class="filtre-label">Ordenar per</label>
      <select class="filtre-sel" onchange="canviarOrdre(this.value)">
        <option value="puntuacio" ${_ordre==='puntuacio'?'selected':''}>Millor puntuació</option>
        <option value="cost_n"    ${_ordre==='cost_n'?'selected':''}>€/kg N</option>
        <option value="cost_k"    ${_ordre==='cost_k'?'selected':''}>€/kg K₂O</option>
        <option value="preu"      ${_ordre==='preu'?'selected':''}>Preu €/kg</option>
      </select>
    </div>
    <div class="filtre-grup filtre-grup--check">
      <label class="filtre-check-label">
        <input type="checkbox" ${_nomesFerri?'checked':''} onchange="canviarFerri(this.checked)">
        Només fertirrigació
      </label>
    </div>
    ${_seleccionats.size > 0 ? `
    <div class="filtre-grup filtre-grup--dreta">
      <button class="btn-ghost btn-sm" onclick="netejarSeleccio()">
        <i class="ti ti-x"></i> Netejar selecció (${_seleccionats.size})
      </button>
    </div>` : ''}
  </div>`;
}

// ─────────────────────────────────────────────
// CARDS COMPARADOR
// ─────────────────────────────────────────────

function renderCards(processats) {
  const el = document.getElementById('fert-cards');
  if (!el) return;

  if (processats.length === 0) {
    el.innerHTML = `<p class="fert-buit">Cap fertilitzant amb els filtres actuals.</p>`;
    return;
  }

  el.innerHTML = `
  <p class="fert-hint">
    <i class="ti ti-hand-click"></i>
    Fes clic a productes per comparar-los (seleccionats: ${_seleccionats.size})
  </p>
  <div class="fert-cards-grid">
    ${processats.map(f => renderCard(f)).join('')}
  </div>`;
}

function renderCard(f) {
  const sel      = _seleccionats.has(f.id);
  const preu     = f.preu_efectiu;
  const costN    = f.costNutrient?.costN;
  const costK    = f.costNutrient?.costK;
  const badgeSol = badgeSolubilitat(f);
  const origenBadge = preu ? badgeOrigenPreu(f.preu_origen) : '';

  return `
  <div class="fert-card ${sel ? 'fert-card--sel' : ''}"
       onclick="toggleSelCard('${f.id}')"
       role="button" tabindex="0"
       aria-pressed="${sel}"
       onkeydown="if(event.key==='Enter'||event.key===' ')toggleSelCard('${f.id}')">

    ${sel ? '<i class="ti ti-check fert-card-check" aria-hidden="true"></i>' : ''}

    <div class="fert-card-top">
      ${badgeSol}
      ${f.apta_fertirrigacio ? '<span class="badge badge-ferri">Fertirrigació</span>' : ''}
    </div>

    <div class="fert-card-nom">${f.nom}</div>
    <div class="fert-card-fab">${f.fabricant || f.tipus || ''}${f.registre_mapa ? ' · MAPA' : ''}</div>

    <div class="npk-row">
      <div class="npk-pill npk-n"><span class="npk-lab">N</span>${f.n ?? 0}%</div>
      <div class="npk-pill npk-p"><span class="npk-lab">P₂O₅</span>${f.p ?? 0}%</div>
      <div class="npk-pill npk-k"><span class="npk-lab">K₂O</span>${f.k ?? 0}%</div>
      ${(f.ca > 0) ? `<div class="npk-pill npk-ca"><span class="npk-lab">Ca</span>${f.ca}%</div>` : ''}
    </div>

    <div class="fert-card-preu">
      ${preu
        ? `<span class="preu-val">${parseFloat(preu).toFixed(2)}€</span>
           <span class="preu-unit">/kg</span>
           ${origenBadge}`
        : `<span class="preu-buit">Sense preu
             ${hasPermission('update') ? `<button class="btn-link btn-xs" onclick="event.stopPropagation();obrirModalPreu('${f.id}','${escapeHtml(f.nom)}')">
               Afegir
             </button>` : ''}
           </span>`
      }
    </div>

    ${preu ? `
    <div class="cost-nutrients">
      ${costN ? `<span class="cost-nut">€/N: ${costN.toFixed(2)}</span>` : ''}
      ${costK ? `<span class="cost-nut">€/K: ${costK.toFixed(2)}</span>` : ''}
    </div>` : ''}

    <div class="adequacio-wrap">
      <div class="adequacio-label">Adequació: ${f.puntuacioPct}%</div>
      <div class="adequacio-bg"><div class="adequacio-fill" style="width:${f.puntuacioPct}%"></div></div>
    </div>

    ${hasPermission('update') ? `
    <button class="btn-ghost btn-xs fert-card-edit"
            onclick="event.stopPropagation();obrirModalTecnic('${f.id}')"
            title="Editar dades tècniques">
      <i class="ti ti-edit"></i>
    </button>` : ''}
  </div>`;
}

// ─────────────────────────────────────────────
// TAULA COMPARATIVA
// ─────────────────────────────────────────────

function renderComparativa() {
  const el = document.getElementById('fert-comparativa');
  if (!el) return;

  if (_seleccionats.size < 2) {
    el.innerHTML = `
    <div class="comparativa-buit">
      <i class="ti ti-table" style="font-size:2rem;opacity:.3"></i>
      <p>Selecciona 2 o més productes per veure la comparativa</p>
    </div>`;
    return;
  }

  const prods = _fertilitzants.filter(f => _seleccionats.has(f.id));
  const files = [
    { label: 'Nitrogen (N %)',       fn: f => f.n ?? 0,          fmt: v => v+'%',          max: true },
    { label: 'Fòsfor (P₂O₅ %)',     fn: f => f.p ?? 0,          fmt: v => v+'%',          max: true },
    { label: 'Potassi (K₂O %)',      fn: f => f.k ?? 0,          fmt: v => v+'%',          max: true },
    { label: 'Calci (CaO %)',        fn: f => f.ca ?? 0,         fmt: v => v+'%',          max: true },
    { label: 'Magnesi (MgO %)',      fn: f => f.mg ?? 0,         fmt: v => v+'%',          max: true },
    { label: 'Sofre (SO₃ %)',        fn: f => f.s ?? 0,          fmt: v => v+'%',          max: true },
    { label: 'Preu €/kg',            fn: f => f.preu_efectiu,    fmt: v => v?parseFloat(v).toFixed(2)+'€':'—', max: false },
    { label: '€/kg N',               fn: f => Fertilitzants.calcularCostNutrient({...f, preu_efectiu: f.preu_efectiu}).costN,
                                                                  fmt: v => v?v.toFixed(2)+'€':'—', max: false },
    { label: '€/kg K₂O',            fn: f => Fertilitzants.calcularCostNutrient({...f, preu_efectiu: f.preu_efectiu}).costK,
                                                                  fmt: v => v?v.toFixed(2)+'€':'—', max: false },
    { label: 'Solubilitat',          fn: f => f.solubilitat,     fmt: v => v||'—',         max: null },
    { label: 'Fertirrigació',        fn: f => f.apta_fertirrigacio, fmt: v => v?'✓ sí':'✗ no', max: null },
    { label: 'Forma',                fn: f => f.forma_presentacio, fmt: v => v||'—',       max: null },
    { label: 'pH (rang)',            fn: f => null,
      fmt: (v, f) => (f.ph_minim||f.ph_maxim) ? `${f.ph_minim??'?'}–${f.ph_maxim??'?'}` : '—', max: null },
    { label: 'Matèria orgànica',     fn: f => f.materia_organica, fmt: v => v?v+'%':'—',   max: true },
    { label: 'Origen preu',          fn: f => f.preu_origen,     fmt: v => v||'—',         max: null },
  ];

  const capçaleres = prods.map(f =>
    `<th class="comp-th">${f.nom}</th>`
  ).join('');

  const files_html = files.map(fila => {
    const vals = prods.map(f => fila.fn(f));
    let bestIdx = -1;

    if (fila.max === true) {
      const nums = vals.map(v => parseFloat(v) || 0);
      const maxVal = Math.max(...nums);
      if (maxVal > 0) bestIdx = nums.indexOf(maxVal);
    } else if (fila.max === false) {
      // mínim és millor (preu, cost)
      const nums = vals.map(v => parseFloat(v) || null);
      const valid = nums.filter(n => n !== null);
      if (valid.length) {
        const minVal = Math.min(...valid);
        bestIdx = nums.indexOf(minVal);
      }
    }

    const cels = prods.map((f, i) => {
      const val     = fila.fn(f);
      const display = fila.fmt.length === 2 ? fila.fmt(val, f) : fila.fmt(val);
      const best    = i === bestIdx ? 'comp-td--best' : '';
      return `<td class="comp-td ${best}">${display}</td>`;
    }).join('');

    return `<tr><td class="comp-td comp-td--label">${fila.label}</td>${cels}</tr>`;
  }).join('');

  el.innerHTML = `
  <div class="comparativa-wrap">
    <h3 class="comparativa-titol">Comparativa (${prods.length} productes)</h3>
    <div class="comparativa-scroll">
      <table class="comp-taula">
        <thead><tr><th class="comp-th comp-th--label"></th>${capçaleres}</tr></thead>
        <tbody>${files_html}</tbody>
      </table>
    </div>
    <p class="comp-llegenda"><span class="comp-best-sample"></span> Millor valor de la fila</p>
  </div>`;
}

// ─────────────────────────────────────────────
// TAB CATÀLEG — llista completa editable
// ─────────────────────────────────────────────

function renderTaula() {
  const el = document.getElementById('fert-taula');
  if (!el) return;

  if (_fertilitzants.length === 0) {
    el.innerHTML = `<p class="fert-buit">Cap fertilitzant al catàleg.</p>`;
    return;
  }

  const files = _fertilitzants.map(f => `
  <tr class="taula-fila">
    <td class="taula-td">${f.nom}</td>
    <td class="taula-td">${f.tipus || '—'}</td>
    <td class="taula-td taula-td--num">${f.n ?? 0}–${f.p ?? 0}–${f.k ?? 0}</td>
    <td class="taula-td">${f.solubilitat || '—'}</td>
    <td class="taula-td">${f.forma_presentacio || '—'}</td>
    <td class="taula-td taula-td--num">
      ${f.preu_efectiu
        ? `${parseFloat(f.preu_efectiu).toFixed(2)}€ <small class="text-muted">(${f.preu_origen})</small>`
        : '<span class="text-muted">—</span>'}
    </td>
    <td class="taula-td taula-td--num">${f.apta_fertirrigacio ? '✓' : ''}</td>
    <td class="taula-td taula-td--accions">
      ${hasPermission('update') ? `
      <button class="btn-icon" onclick="obrirModalTecnic('${f.id}')" title="Editar dades tècniques">
        <i class="ti ti-edit"></i>
      </button>` : ''}
    </td>
  </tr>`).join('');

  el.innerHTML = `
  <div class="taula-wrap">
    <table class="taula">
      <thead>
        <tr>
          <th>Producte</th>
          <th>Tipus</th>
          <th>NPK</th>
          <th>Solubilitat</th>
          <th>Forma</th>
          <th>Preu €/kg</th>
          <th title="Apta fertirrigació">Ferri.</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${files}</tbody>
    </table>
  </div>`;
}

// ─────────────────────────────────────────────
// MODAL DADES TÈCNIQUES
// ─────────────────────────────────────────────

async function obrirModalTecnic(fertilitzantId) {
  const modal = document.getElementById('modal-fert-tecnic');
  const body  = document.getElementById('modal-fert-body');
  const titol = document.getElementById('modal-fert-titol');
  if (!modal) return;

  body.innerHTML = '<p class="loading-msg"><i class="ti ti-loader ti-spin"></i> Carregant...</p>';
  modal.style.display = 'flex';

  try {
    let fertilitzant = null;
    let tecnic       = null;

    if (fertilitzantId) {
      fertilitzant = await Fertilitzants.getById(fertilitzantId);
      tecnic       = await Fertilitzants.getTecnic(fertilitzantId);
      _fertilitzantActiu = fertilitzant;
      titol.textContent  = fertilitzant.nom;

      // Suggerir preu des de compres si no en té
      if (!fertilitzant.preu_kg_manual && !tecnic?.preu_kg) {
        const darrCompra = await Fertilitzants.getDarrerPreuCompra(fertilitzantId);
        if (darrCompra) {
          fertilitzant._preu_suggerit = darrCompra.preu;
          fertilitzant._preu_suggerit_data = darrCompra.data_albara;
        }
      }
    } else {
      titol.textContent  = 'Nou fertilitzant';
      _fertilitzantActiu = null;
    }

    body.innerHTML = renderFormulariTecnic(fertilitzant, tecnic);
  } catch (e) {
    body.innerHTML = `<p class="error-msg">Error: ${e.message}</p>`;
  }
}

function renderFormulariTecnic(f, t) {
  const v = (camp, def = '') => t?.[camp] ?? def;
  const modes = v('modes_aplicacio', []);

  const preusuggerit = f?._preu_suggerit
    ? `<small class="preu-suggerit">
         Darrera compra: <strong>${parseFloat(f._preu_suggerit).toFixed(2)}€/kg</strong>
         (${formatData(f._preu_suggerit_data)})
         <button type="button" class="btn-link btn-xs"
           onclick="document.getElementById('inp-preu-kg').value=${parseFloat(f._preu_suggerit).toFixed(4)}">
           Usar aquest preu
         </button>
       </small>`
    : '';

  return `
  <form id="form-fert-tecnic" onsubmit="guardarTecnic(event)">

    <!-- Preu de referència -->
    <fieldset class="form-fieldset">
      <legend>Preu de referència</legend>
      <div class="form-row">
        <div class="form-grup">
          <label class="form-label">Preu €/kg</label>
          <input id="inp-preu-kg" type="number" step="0.0001" min="0"
                 class="form-input"
                 value="${f?.preu_kg_manual ?? t?.preu_kg ?? ''}"
                 placeholder="0.0000">
          ${preusuggerit}
        </div>
        <div class="form-grup">
          <label class="form-label">Data referència</label>
          <input type="date" id="inp-preu-data" class="form-input"
                 value="${f?.preu_kg_manual_data ?? t?.preu_kg_data ?? ''}">
        </div>
      </div>
    </fieldset>

    <!-- Nutrients secundaris -->
    <fieldset class="form-fieldset">
      <legend>Nutrients secundaris (%)</legend>
      <div class="form-row form-row--4">
        <div class="form-grup">
          <label class="form-label">CaO</label>
          <input type="number" step="0.01" min="0" max="100" class="form-input"
                 name="ca" value="${v('ca', 0)}">
        </div>
        <div class="form-grup">
          <label class="form-label">MgO</label>
          <input type="number" step="0.01" min="0" max="100" class="form-input"
                 name="mg" value="${v('mg', 0)}">
        </div>
        <div class="form-grup">
          <label class="form-label">SO₃</label>
          <input type="number" step="0.01" min="0" max="100" class="form-input"
                 name="s" value="${v('s', 0)}">
        </div>
        <div class="form-grup">
          <label class="form-label">Matèria orgànica %</label>
          <input type="number" step="0.01" min="0" max="100" class="form-input"
                 name="materia_organica" value="${v('materia_organica', '')}">
        </div>
      </div>
    </fieldset>

    <!-- Propietats fisicoquímiques -->
    <fieldset class="form-fieldset">
      <legend>Propietats fisicoquímiques</legend>
      <div class="form-row form-row--3">
        <div class="form-grup">
          <label class="form-label">Solubilitat</label>
          <select class="form-input" name="solubilitat">
            ${Fertilitzants.SOLUBILITAT.map(s =>
              `<option value="${s}" ${v('solubilitat','desconeguda')===s?'selected':''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-grup">
          <label class="form-label">pH mínim</label>
          <input type="number" step="0.1" min="0" max="14" class="form-input"
                 name="ph_minim" value="${v('ph_minim', '')}">
        </div>
        <div class="form-grup">
          <label class="form-label">pH màxim</label>
          <input type="number" step="0.1" min="0" max="14" class="form-input"
                 name="ph_maxim" value="${v('ph_maxim', '')}">
        </div>
      </div>
      <div class="form-row form-row--2">
        <div class="form-grup">
          <label class="form-label">Forma presentació</label>
          <select class="form-input" name="forma_presentacio">
            <option value="">— seleccionar —</option>
            ${Fertilitzants.FORMES.map(fo =>
              `<option value="${fo}" ${v('forma_presentacio')===fo?'selected':''}>${fo}</option>`
            ).join('')}
          </select>
        </div>
      </div>
    </fieldset>

    <!-- Modes d'aplicació -->
    <fieldset class="form-fieldset">
      <legend>Modes d'aplicació</legend>
      <div class="form-checks-row">
        ${Fertilitzants.MODES.map(m => `
        <label class="form-check-label">
          <input type="checkbox" name="modes_aplicacio" value="${m}"
                 ${modes.includes(m) ? 'checked' : ''}>
          ${m}
        </label>`).join('')}
      </div>
    </fieldset>

    <!-- Identificació -->
    <fieldset class="form-fieldset">
      <legend>Identificació</legend>
      <div class="form-row form-row--2">
        <div class="form-grup">
          <label class="form-label">Fabricant</label>
          <input type="text" class="form-input" name="fabricant"
                 value="${escapeHtml(v('fabricant', ''))}">
        </div>
        <div class="form-grup">
          <label class="form-label">Núm. registre MAPA</label>
          <input type="text" class="form-input" name="registre_mapa"
                 value="${escapeHtml(v('registre_mapa', ''))}">
        </div>
      </div>
      <div class="form-grup">
        <label class="form-label">URL fitxa tècnica</label>
        <input type="url" class="form-input" name="fitxa_tecnica_url"
               value="${escapeHtml(v('fitxa_tecnica_url', ''))}"
               placeholder="https://...">
      </div>
    </fieldset>

    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="tancarModalTecnic()">Cancel·lar</button>
      <button type="submit" class="btn-primary" id="btn-guardar-tecnic">
        <i class="ti ti-device-floppy"></i> Guardar
      </button>
    </div>
  </form>`;
}

async function guardarTecnic(event) {
  event.preventDefault();
  if (!_fertilitzantActiu) return;

  const btn  = document.getElementById('btn-guardar-tecnic');
  const form = document.getElementById('form-fert-tecnic');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader ti-spin"></i> Guardant...';

  try {
    const dades = Object.fromEntries(new FormData(form));

    // Modes d'aplicació: multiple checkboxes
    const modesChecked = [...form.querySelectorAll('[name="modes_aplicacio"]:checked')]
      .map(cb => cb.value);
    dades.modes_aplicacio = modesChecked;

    // Netejar camps buits → null
    ['ph_minim','ph_maxim','materia_organica','registre_mapa','fabricant','fitxa_tecnica_url'].forEach(c => {
      if (dades[c] === '') dades[c] = null;
    });

    // Preu manual (camp separat a fertilitzants principal)
    const preuKg   = document.getElementById('inp-preu-kg').value;
    const preuData = document.getElementById('inp-preu-data').value;

    // Upsert dades tècniques
    await Fertilitzants.upsertTecnic(_fertilitzantActiu.id, dades);

    // Actualitzar preu principal si s'ha introduït
    if (preuKg) {
      await Fertilitzants.actualitzarPreu(_fertilitzantActiu.id, parseFloat(preuKg));
    }

    mostrarNotificacio(`Dades tècniques de ${_fertilitzantActiu.nom} guardades`, 'success');
    tancarModalTecnic();

    // Recarregar llista
    _fertilitzants = await Fertilitzants.getComplet();
    renderTot();

  } catch (e) {
    mostrarNotificacio(`Error guardant: ${e.message}`, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-device-floppy"></i> Guardar';
  }
}

function tancarModalTecnic() {
  const modal = document.getElementById('modal-fert-tecnic');
  if (modal) modal.style.display = 'none';
  _fertilitzantActiu = null;
}

// ─────────────────────────────────────────────
// MODAL PREU RÀPID
// ─────────────────────────────────────────────

async function obrirModalPreu(fertilitzantId, nom) {
  const preu = prompt(`Preu €/kg per "${nom}":`);
  if (preu === null || preu === '') return;
  const valor = parseFloat(preu.replace(',', '.'));
  if (isNaN(valor) || valor <= 0) {
    mostrarNotificacio('Preu no vàlid', 'warning');
    return;
  }
  try {
    await Fertilitzants.actualitzarPreu(fertilitzantId, valor);
    mostrarNotificacio(`Preu actualitzat: ${valor.toFixed(2)}€/kg`, 'success');
    _fertilitzants = await Fertilitzants.getComplet();
    renderTot();
  } catch (e) {
    mostrarNotificacio(`Error: ${e.message}`, 'error');
  }
}

// ─────────────────────────────────────────────
// EVENTS FILTRES / SELECCIÓ
// ─────────────────────────────────────────────

function canviarTab(tab, btn) {
  document.querySelectorAll('.fert-tab').forEach(t => {
    t.classList.remove('fert-tab--actiu');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

  btn.classList.add('fert-tab--actiu');
  btn.setAttribute('aria-selected', 'true');
  const content = document.getElementById(`tab-content-${tab}`);
  if (content) content.style.display = 'block';
}

function canviarFase(val) {
  _fase = val;
  renderTot();
}

function canviarOrdre(val) {
  _ordre = val;
  renderTot();
}

function canviarFerri(val) {
  _nomesFerri = val;
  renderTot();
}

function toggleSelCard(id) {
  if (_seleccionats.has(id)) {
    _seleccionats.delete(id);
  } else {
    _seleccionats.add(id);
  }
  renderTot();
}

function netejarSeleccio() {
  _seleccionats.clear();
  renderTot();
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function badgeSolubilitat(f) {
  const sol = f.solubilitat;
  if (!sol || sol === 'desconeguda') return '';
  const cls = sol === 'total' ? 'badge-sol-total'
            : sol === 'parcial' ? 'badge-sol-parcial'
            : 'badge-sol-no';
  return `<span class="badge ${cls}">${sol}</span>`;
}

function badgeOrigenPreu(origen) {
  if (!origen || origen === 'sense preu') return '';
  const cls = origen === 'manual' ? 'badge-preu-manual'
            : origen === 'compres' ? 'badge-preu-compres'
            : 'badge-preu-tecnic';
  const label = origen === 'compres' ? 'compres' : origen;
  return `<span class="badge ${cls} badge-xs">${label}</span>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────
// ESTILS CSS DEL MÒDUL (injectats una sola vegada)
// ─────────────────────────────────────────────

function injectarEstilsFertilitzants() {
  if (document.getElementById('style-fertilitzants')) return;
  const style = document.createElement('style');
  style.id = 'style-fertilitzants';
  style.textContent = `
    .fert-wrap { padding: 1rem; max-width: 1200px; }
    .fert-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .fert-titol { font-size:1.4rem; font-weight:600; }
    .fert-header-accions { display:flex; gap:8px; }

    /* Tabs */
    .fert-tabs { display:flex; gap:4px; border-bottom:1px solid var(--color-border-tertiary); margin-bottom:1rem; }
    .fert-tab { background:none; border:none; padding:8px 16px; cursor:pointer; font-size:14px;
                color:var(--color-text-secondary); border-bottom:2px solid transparent; margin-bottom:-1px; }
    .fert-tab--actiu { color:var(--color-text-primary); border-bottom-color:var(--color-border-info); font-weight:500; }

    /* Mètriques */
    .metriques-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:1.25rem; }
    .metrica-card { background:var(--color-background-secondary); border-radius:var(--border-radius-lg);
                    padding:.75rem 1rem; }
    .metrica-card--buit { opacity:.6; }
    .metrica-label { font-size:12px; color:var(--color-text-secondary); margin-bottom:4px; }
    .metrica-valor { font-size:22px; font-weight:600; color:var(--color-text-primary); }
    .metrica-sub   { font-size:11px; color:var(--color-text-secondary); margin-top:2px; }

    /* Filtres */
    .filtres-row { display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end; margin-bottom:1rem; }
    .filtre-grup { display:flex; flex-direction:column; gap:4px; }
    .filtre-grup--check { justify-content:flex-end; padding-bottom:4px; }
    .filtre-grup--dreta { margin-left:auto; }
    .filtre-label { font-size:12px; color:var(--color-text-secondary); }
    .filtre-sel { font-size:13px; padding:6px 10px; border-radius:var(--border-radius-md);
                  border:1px solid var(--color-border-secondary); background:var(--color-background-primary);
                  color:var(--color-text-primary); }
    .filtre-check-label { font-size:13px; display:flex; align-items:center; gap:6px;
                          color:var(--color-text-primary); cursor:pointer; }
    .fert-hint { font-size:12px; color:var(--color-text-secondary); margin-bottom:.75rem; }
    .fert-buit { color:var(--color-text-secondary); font-size:14px; padding:2rem 0; text-align:center; }

    /* Cards */
    .fert-cards-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:12px;
                       margin-bottom:1.5rem; }
    .fert-card { background:var(--color-background-primary); border:1px solid var(--color-border-tertiary);
                 border-radius:var(--border-radius-lg); padding:1rem; cursor:pointer;
                 position:relative; transition:border-color .15s, box-shadow .15s; outline:none; }
    .fert-card:hover { border-color:var(--color-border-secondary); box-shadow:0 2px 8px rgba(0,0,0,.06); }
    .fert-card:focus-visible { box-shadow:0 0 0 2px var(--color-border-info); }
    .fert-card--sel { border:2px solid var(--color-border-info); background:var(--color-background-info); }
    .fert-card-check { position:absolute; top:10px; right:10px; color:var(--color-text-info); font-size:16px; }
    .fert-card-top { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; min-height:22px; }
    .fert-card-nom { font-size:13px; font-weight:500; color:var(--color-text-primary); margin-bottom:3px;
                     line-height:1.3; }
    .fert-card-fab { font-size:11px; color:var(--color-text-secondary); margin-bottom:10px; }
    .fert-card-edit { position:absolute; bottom:8px; right:8px; opacity:0; transition:opacity .15s; }
    .fert-card:hover .fert-card-edit { opacity:1; }

    /* NPK pills */
    .npk-row { display:flex; gap:5px; margin-bottom:10px; }
    .npk-pill { flex:1; text-align:center; border-radius:var(--border-radius-md);
                padding:3px 0; font-size:12px; font-weight:500; }
    .npk-lab { display:block; font-size:10px; font-weight:400; }
    .npk-n  { background:#E6F1FB; color:#0C447C; }
    .npk-p  { background:#EAF3DE; color:#27500A; }
    .npk-k  { background:#FAEEDA; color:#633806; }
    .npk-ca { background:#F3E6FB; color:#4A0C7C; }

    /* Preu */
    .fert-card-preu { font-size:13px; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
    .preu-val { font-size:15px; font-weight:600; color:var(--color-text-primary); }
    .preu-unit { font-size:11px; color:var(--color-text-secondary); }
    .preu-buit { font-size:12px; color:var(--color-text-secondary); display:flex; align-items:center; gap:6px; }
    .preu-suggerit { display:block; font-size:11px; color:var(--color-text-secondary); margin-top:4px; }

    /* Cost nutrients */
    .cost-nutrients { display:flex; gap:8px; margin-bottom:6px; }
    .cost-nut { font-size:11px; color:var(--color-text-secondary); }

    /* Adequació */
    .adequacio-wrap { margin-top:4px; }
    .adequacio-label { font-size:11px; color:var(--color-text-secondary); margin-bottom:3px; }
    .adequacio-bg { height:4px; background:var(--color-background-secondary); border-radius:2px; }
    .adequacio-fill { height:4px; background:#1D9E75; border-radius:2px; transition:width .3s; }

    /* Badges */
    .badge { display:inline-block; font-size:11px; padding:2px 7px;
             border-radius:var(--border-radius-md); font-weight:500; }
    .badge-xs { font-size:10px; padding:1px 5px; }
    .badge-sol-total   { background:var(--color-background-success); color:var(--color-text-success); }
    .badge-sol-parcial { background:var(--color-background-warning); color:var(--color-text-warning); }
    .badge-sol-no      { background:var(--color-background-secondary); color:var(--color-text-secondary); }
    .badge-ferri       { background:var(--color-background-info); color:var(--color-text-info); }
    .badge-preu-manual  { background:var(--color-background-secondary); color:var(--color-text-secondary); }
    .badge-preu-compres { background:var(--color-background-warning); color:var(--color-text-warning); }
    .badge-preu-tecnic  { background:var(--color-background-info); color:var(--color-text-info); }

    /* Comparativa */
    .comparativa-buit { text-align:center; padding:2rem; color:var(--color-text-secondary);
                        background:var(--color-background-secondary); border-radius:var(--border-radius-lg);
                        margin-bottom:1rem; display:flex; flex-direction:column; align-items:center; gap:8px; }
    .comparativa-wrap { background:var(--color-background-secondary); border-radius:var(--border-radius-lg);
                        padding:1.25rem; margin-bottom:1.5rem; }
    .comparativa-titol { font-size:14px; font-weight:600; margin-bottom:1rem; }
    .comparativa-scroll { overflow-x:auto; }
    .comp-taula { width:100%; border-collapse:collapse; font-size:13px; }
    .comp-th { text-align:left; padding:6px 10px; border-bottom:1px solid var(--color-border-tertiary);
               color:var(--color-text-secondary); font-weight:500; font-size:12px; white-space:nowrap; }
    .comp-th--label { min-width:140px; }
    .comp-td { padding:7px 10px; border-bottom:1px solid var(--color-border-tertiary);
               color:var(--color-text-primary); }
    .comp-td--label { color:var(--color-text-secondary); font-size:12px; white-space:nowrap; }
    .comp-td--best { font-weight:600; color:#0F6E56; }
    .comp-llegenda { font-size:11px; color:var(--color-text-secondary); margin-top:8px;
                     display:flex; align-items:center; gap:6px; }
    .comp-best-sample { display:inline-block; width:12px; height:12px; background:#0F6E56;
                        border-radius:2px; }

    /* Taula catàleg */
    .taula-wrap { overflow-x:auto; }
    .taula { width:100%; border-collapse:collapse; font-size:13px; }
    .taula thead th { text-align:left; padding:8px 12px; border-bottom:2px solid var(--color-border-secondary);
                      font-size:12px; color:var(--color-text-secondary); font-weight:500; white-space:nowrap; }
    .taula-fila:hover { background:var(--color-background-secondary); }
    .taula-td { padding:9px 12px; border-bottom:1px solid var(--color-border-tertiary);
                color:var(--color-text-primary); }
    .taula-td--num { text-align:right; font-variant-numeric:tabular-nums; }
    .taula-td--accions { text-align:right; width:50px; }

    /* Modal */
    .modal { display:none; position:fixed; inset:0; z-index:1000;
             align-items:center; justify-content:center; }
    .modal-overlay { position:absolute; inset:0; background:rgba(0,0,0,.4); }
    .modal-box { position:relative; background:var(--color-background-primary);
                 border-radius:var(--border-radius-lg); width:min(700px,95vw);
                 max-height:90vh; overflow-y:auto; box-shadow:0 8px 32px rgba(0,0,0,.2); }
    .modal-box--lg { width:min(760px,95vw); }
    .modal-header { display:flex; justify-content:space-between; align-items:center;
                    padding:1rem 1.25rem; border-bottom:1px solid var(--color-border-tertiary);
                    position:sticky; top:0; background:var(--color-background-primary); z-index:1; }
    .modal-header h2 { font-size:16px; font-weight:600; }
    .modal-close { background:none; border:none; cursor:pointer; font-size:18px;
                   color:var(--color-text-secondary); padding:4px; }
    .modal-body { padding:1.25rem; }
    .modal-footer { display:flex; justify-content:flex-end; gap:8px;
                    padding-top:1rem; margin-top:1rem;
                    border-top:1px solid var(--color-border-tertiary); }

    /* Formulari */
    .form-fieldset { border:1px solid var(--color-border-tertiary); border-radius:var(--border-radius-md);
                     padding:1rem 1.1rem .75rem; margin-bottom:1rem; }
    .form-fieldset legend { font-size:12px; color:var(--color-text-secondary);
                             font-weight:500; padding:0 6px; }
    .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:.75rem; }
    .form-row--3 { grid-template-columns:1fr 1fr 1fr; }
    .form-row--4 { grid-template-columns:1fr 1fr 1fr 1fr; }
    .form-row--2 { grid-template-columns:1fr 1fr; }
    .form-grup { display:flex; flex-direction:column; gap:4px; }
    .form-label { font-size:12px; color:var(--color-text-secondary); }
    .form-input { padding:7px 10px; border-radius:var(--border-radius-md);
                  border:1px solid var(--color-border-secondary);
                  background:var(--color-background-primary); color:var(--color-text-primary);
                  font-size:13px; width:100%; }
    .form-input:focus { outline:none; border-color:var(--color-border-info); }
    .form-checks-row { display:flex; flex-wrap:wrap; gap:12px; }
    .form-check-label { display:flex; align-items:center; gap:6px; font-size:13px; cursor:pointer; }

    /* Responsive */
    @media (max-width: 768px) {
      .metriques-grid { grid-template-columns:repeat(2,1fr); }
      .fert-cards-grid { grid-template-columns:1fr 1fr; }
      .form-row--4 { grid-template-columns:1fr 1fr; }
      .form-row--3 { grid-template-columns:1fr 1fr; }
    }
    @media (max-width: 480px) {
      .fert-cards-grid { grid-template-columns:1fr; }
      .metriques-grid { grid-template-columns:1fr 1fr; }
    }
  `;
  document.head.appendChild(style);
}

// Injectar estils en carregar el fitxer
injectarEstilsFertilitzants();
