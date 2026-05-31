// fertilitzants-tecnics-ui_v1.js — Gestió dades tècniques fertilitzants
// Quadern de Camp NLASL · v1.0
// Depèn de: fertilitzants_v1.js, supabase-client_v5.js, app_v8.js

'use strict';

// ─────────────────────────────────────────────
// ESTAT LOCAL
// ─────────────────────────────────────────────

let _ftLlista        = [];   // fertilitzants_complet
let _ftActiu         = null; // fertilitzant en edició
let _ftMapaResultats = [];   // resultats cerca MAPA
let _ftCercaText     = '';   // text filtre llista principal

// ─────────────────────────────────────────────
// PUNT D'ENTRADA
// ─────────────────────────────────────────────

async function carregarVistaFertilitzantsTecnics() {
  const container = document.getElementById('view-container');
  if (!container) return;

  container.innerHTML = renderEsqueletTecnics();
  injectarEstilsFertTecnics();

  try {
    _ftLlista = await Fertilitzants.getComplet();
    renderTaulaFertTecnics();
  } catch (e) {
    container.innerHTML = `<p class="error-msg">Error carregant dades: ${e.message}</p>`;
  }
}

// ─────────────────────────────────────────────
// ESQUELET
// ─────────────────────────────────────────────

function renderEsqueletTecnics() {
  return `
  <div class="ft-wrap">
    <div class="ft-header">
      <div class="ft-header-esq">
        <button class="btn-ghost btn-sm" onclick="canviarVista('fertilitzants')">
          ← Tornar
        </button>
        <h2 class="ft-titol">Dades tècniques fertilitzants</h2>
      </div>
      <div class="ft-header-dret">
        ${hasPermission('insert') ? `
        <button class="btn-secondary btn-sm" onclick="obrirModalSincronitzar()">
          <i class="ti ti-refresh"></i> Sincronitzar MAPA
        </button>
        <button class="btn-secondary btn-sm" onclick="obrirModalImportacioMapa()">
          <i class="ti ti-file-import"></i> Actualitzar registre MAPA
        </button>` : ''}
      </div>
    </div>

    <div class="ft-stats" id="ft-stats"></div>

    <div class="ft-cerca-wrap">
      <input type="text" id="ft-cerca" class="form-input ft-cerca-input"
             placeholder="Cercar producte..."
             oninput="filtrarFertTecnics(this.value)" style="border:2px solid #888 !important; background:#fff !important; color:#111 !important; padding:8px 12px !important; border-radius:6px !important; width:320px !important;">
    </div>

    <div id="ft-taula-wrap"></div>
  </div>

  <!-- Modal dades tècniques + cerca MAPA -->
  <div id="modal-ft" class="modal" style="display:none" role="dialog" aria-modal="true">
    <div class="modal-overlay" onclick="tancarModalFT()"></div>
    <div class="modal-box modal-box--xl">
      <div class="modal-header">
        <h2 id="modal-ft-titol">Dades tècniques</h2>
        <button class="modal-close" onclick="tancarModalFT()">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="modal-body" id="modal-ft-body"></div>
    </div>
  </div>

  <!-- Modal importació MAPA -->
  <div id="modal-import-mapa" class="modal" style="display:none" role="dialog" aria-modal="true">
    <div class="modal-overlay" onclick="tancarModalImportMapa()"></div>
    <div class="modal-box modal-box--lg">
      <div class="modal-header">
        <h2>Actualitzar registre MAPA</h2>
        <button class="modal-close" onclick="tancarModalImportMapa()">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="modal-body" id="modal-import-body">
        ${renderFormImportMapa()}
      </div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────

function renderStatsFT() {
  const el = document.getElementById('ft-stats');
  if (!el) return;

  const total       = _ftLlista.length;
  const ambTecnic   = _ftLlista.filter(f => f.solubilitat && f.solubilitat !== 'desconeguda').length;
  const ambPreu     = _ftLlista.filter(f => f.preu_efectiu).length;
  const ambMapa     = _ftLlista.filter(f => f.registre_mapa).length;

  el.innerHTML = `
  <div class="ft-stats-grid">
    <div class="ft-stat">
      <div class="ft-stat-val">${total}</div>
      <div class="ft-stat-lab">Total productes</div>
    </div>
    <div class="ft-stat ft-stat--ok">
      <div class="ft-stat-val">${ambTecnic}</div>
      <div class="ft-stat-lab">Amb dades tècniques</div>
    </div>
    <div class="ft-stat ft-stat--warn">
      <div class="ft-stat-val">${total - ambTecnic}</div>
      <div class="ft-stat-lab">Pendents completar</div>
    </div>
    <div class="ft-stat">
      <div class="ft-stat-val">${ambPreu}</div>
      <div class="ft-stat-lab">Amb preu</div>
    </div>
    <div class="ft-stat">
      <div class="ft-stat-val">${ambMapa}</div>
      <div class="ft-stat-lab">Vinculats MAPA</div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────
// TAULA PRINCIPAL
// ─────────────────────────────────────────────

function renderTaulaFertTecnics() {
  renderStatsFT();

  const el = document.getElementById('ft-taula-wrap');
  if (!el) return;

  const text  = _ftCercaText.toLowerCase();
  const llista = text
    ? _ftLlista.filter(f => f.nom.toLowerCase().includes(text) ||
                            (f.fabricant||'').toLowerCase().includes(text))
    : _ftLlista;

  if (llista.length === 0) {
    el.innerHTML = `<p class="ft-buit">Cap producte trobat.</p>`;
    return;
  }

  const files = llista.map(f => {
    const estat   = estatTecnic(f);
    const costN   = f.n > 0 && f.preu_efectiu
      ? (parseFloat(f.preu_efectiu) / (f.n / 100)).toFixed(2) + '€'
      : '—';
    const costK   = f.k > 0 && f.preu_efectiu
      ? (parseFloat(f.preu_efectiu) / (f.k / 100)).toFixed(2) + '€'
      : '—';

    return `
    <tr class="ft-fila">
      <td class="ft-td">
        <div class="ft-nom">${f.nom}</div>
        <div class="ft-fab">${f.fabricant || f.tipus || ''}</div>
      </td>
      <td class="ft-td ft-td--center">
        <span class="ft-estat ft-estat--${estat.cls}">${estat.label}</span>
      </td>
      <td class="ft-td ft-td--num">${f.n ?? 0}–${f.p ?? 0}–${f.k ?? 0}</td>
      <td class="ft-td">${f.solubilitat || '—'}</td>
      <td class="ft-td">${f.forma_presentacio || '—'}</td>
      <td class="ft-td ft-td--num">
        ${f.preu_efectiu
          ? `${parseFloat(f.preu_efectiu).toFixed(2)}€
             <small class="ft-preu-origen">(${f.preu_origen})</small>`
          : '<span class="ft-buit-val">—</span>'}
      </td>
      <td class="ft-td ft-td--num">${costN}</td>
      <td class="ft-td ft-td--num">${costK}</td>
      <td class="ft-td ft-td--num">
        ${f.registre_mapa
          ? `<span class="ft-mapa-badge" title="${f.registre_mapa}">MAPA ✓</span>`
          : '<span class="ft-buit-val">—</span>'}
      </td>
      <td class="ft-td ft-td--accions">
        ${hasPermission('update') ? `
        <button class="btn-icon" onclick="obrirModalFT('${f.id}')" title="Editar dades tècniques">
          <i class="ti ti-edit"></i>
        </button>` : ''}
        ${f.fitxa_tecnica_url ? `
        <a class="btn-icon" href="${f.fitxa_tecnica_url}" target="_blank" title="Fitxa tècnica">
          <i class="ti ti-external-link"></i>
        </a>` : ''}
      </td>
    </tr>`;
  }).join('');

  el.innerHTML = `
  <div class="ft-taula-scroll">
    <table class="ft-taula">
      <thead>
        <tr>
          <th>Producte</th>
          <th>Estat</th>
          <th>NPK</th>
          <th>Solubilitat</th>
          <th>Forma</th>
          <th>Preu €/kg</th>
          <th title="Cost per kg de Nitrogen">€/kg N</th>
          <th title="Cost per kg de K₂O">€/kg K</th>
          <th>MAPA</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${files}</tbody>
    </table>
  </div>`;
}

function filtrarFertTecnics(text) {
  _ftCercaText = text;
  renderTaulaFertTecnics();
}

function estatTecnic(f) {
  const teCamps = f.solubilitat && f.solubilitat !== 'desconeguda';
  const tePreu  = !!f.preu_efectiu;
  const teMapa  = !!f.registre_mapa;

  if (teCamps && tePreu && teMapa) return { cls: 'complet',   label: 'Complet' };
  if (teCamps && tePreu)           return { cls: 'ok',        label: 'Ok' };
  if (teCamps || tePreu)           return { cls: 'parcial',   label: 'Parcial' };
  return                                  { cls: 'buit',      label: 'Pendent' };
}

// ─────────────────────────────────────────────
// MODAL DADES TÈCNIQUES + CERCA MAPA
// ─────────────────────────────────────────────

async function obrirModalFT(fertilitzantId) {
  const modal = document.getElementById('modal-ft');
  const body  = document.getElementById('modal-ft-body');
  const titol = document.getElementById('modal-ft-titol');
  if (!modal) return;

  body.innerHTML = '<p class="loading-msg"><i class="ti ti-loader ti-spin"></i> Carregant...</p>';
  modal.style.display = 'flex';

  try {
    const f      = await Fertilitzants.getById(fertilitzantId);
    const tecnic = await Fertilitzants.getTecnic(fertilitzantId);
    _ftActiu     = f;
    titol.textContent = f.nom;

    // Suggerir preu des de compres
    let preuSuggerit = null;
    if (!f.preu_kg_manual && !tecnic?.preu_kg) {
      preuSuggerit = await Fertilitzants.getDarrerPreuCompra(fertilitzantId);
    }

    body.innerHTML = renderFormFT(f, tecnic, preuSuggerit);
    _ftMapaResultats = [];
  } catch (e) {
    body.innerHTML = `<p class="error-msg">Error: ${e.message}</p>`;
  }
}

function renderFormFT(f, t, preuSuggerit) {
  const v   = (camp, def = '') => t?.[camp] ?? def;
  const modes = v('modes_aplicacio', []);

  return `
  <!-- Secció cerca MAPA -->
  <div class="ft-mapa-cerca-wrap">
    <div class="ft-mapa-cerca-titol">
      <i class="ti ti-database-search"></i>
      Cerca al registre MAPA
    </div>
    <div class="ft-mapa-cerca-row">
      <input type="text" id="ft-mapa-query"
             class="form-input ft-mapa-input"
             placeholder="Nom comercial o núm. registre (ex: F0000004/2016)"
             value="${ftEscapeHtml(f.nom)}"
             onkeydown="if(event.key==='Enter')cercarAlMapa()">
      <button class="btn-primary btn-sm" onclick="cercarAlMapa()">
        <i class="ti ti-search"></i> Cercar
      </button>
    </div>
    <div id="ft-mapa-resultats"></div>
  </div>

  <form id="form-ft" onsubmit="guardarFT(event)">

    <!-- Preu -->
    <fieldset class="form-fieldset">
      <legend>Preu de referència</legend>
      <div class="form-row">
        <div class="form-grup">
          <label class="form-label">Preu €/kg</label>
          <input id="ft-preu-kg" type="number" step="0.0001" min="0"
                 class="form-input"
                 value="${f?.preu_kg_manual ?? t?.preu_kg ?? ''}"
                 placeholder="0.0000">
          ${preuSuggerit ? `
          <small class="preu-suggerit">
            Darrera compra: <strong>${parseFloat(preuSuggerit.preu).toFixed(2)}€/kg</strong>
            (${formatData(preuSuggerit.data_albara)})
            <button type="button" class="btn-link btn-xs"
              onclick="document.getElementById('ft-preu-kg').value='${parseFloat(preuSuggerit.preu).toFixed(4)}'">
              Usar
            </button>
          </small>` : ''}
        </div>
        <div class="form-grup">
          <label class="form-label">Data referència</label>
          <input type="date" id="ft-preu-data" class="form-input"
                 value="${f?.preu_kg_manual_data ?? t?.preu_kg_data ?? ''}">
        </div>
      </div>
    </fieldset>

    <!-- Nutrients secundaris -->
    <fieldset class="form-fieldset">
      <legend>Nutrients secundaris (%)</legend>
      <div class="form-row form-row--4">
        <div class="form-grup">
          <label class="form-label">CaO %</label>
          <input type="number" step="0.01" min="0" class="form-input" name="ca" value="${v('ca',0)}">
        </div>
        <div class="form-grup">
          <label class="form-label">MgO %</label>
          <input type="number" step="0.01" min="0" class="form-input" name="mg" value="${v('mg',0)}">
        </div>
        <div class="form-grup">
          <label class="form-label">SO₃ %</label>
          <input type="number" step="0.01" min="0" class="form-input" name="s" value="${v('s',0)}">
        </div>
        <div class="form-grup">
          <label class="form-label">M. orgànica %</label>
          <input type="number" step="0.01" min="0" class="form-input"
                 name="materia_organica" value="${v('materia_organica','')}">
        </div>
      </div>
    </fieldset>

    <!-- Nitrogen detall -->
    <fieldset class="form-fieldset">
      <legend>Nitrogen — formes (%)</legend>
      <div class="form-row form-row--4">
        <div class="form-grup">
          <label class="form-label">N nítric</label>
          <input type="number" step="0.01" min="0" class="form-input"
                 name="n_nitric" value="${v('n_nitric','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">N amoniacal</label>
          <input type="number" step="0.01" min="0" class="form-input"
                 name="n_amoniacal" value="${v('n_amoniacal','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">N ureic</label>
          <input type="number" step="0.01" min="0" class="form-input"
                 name="n_ureic" value="${v('n_ureic','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">N orgànic</label>
          <input type="number" step="0.01" min="0" class="form-input"
                 name="n_organic" value="${v('n_organic','')}">
        </div>
      </div>
    </fieldset>

    <!-- Micronutrients -->
    <fieldset class="form-fieldset">
      <legend>Micronutrients (%)</legend>
      <div class="form-row form-row--4">
        <div class="form-grup">
          <label class="form-label">Fe total</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="fe_total" value="${v('fe_total','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">B total</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="b_total" value="${v('b_total','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Mn total</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="mn_total" value="${v('mn_total','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Zn total</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="zn_total" value="${v('zn_total','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Mo total</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="mo_total" value="${v('mo_total','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Cu total</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="cu_total" value="${v('cu_total','')}">
        </div>
      </div>
    </fieldset>

    <!-- Metalls pesants -->
    <fieldset class="form-fieldset">
      <legend>Metalls pesants (mg/kg MS) — obligatori per productes orgànics</legend>
      <div class="form-row form-row--4">
        <div class="form-grup">
          <label class="form-label">Cd (Cadmi)</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="cd_cadmi" value="${v('cd_cadmi','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Pb (Plom)</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="pb_plom" value="${v('pb_plom','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Hg (Mercuri)</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="hg_mercuri" value="${v('hg_mercuri','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Cr total (Crom)</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="cr_crom_total" value="${v('cr_crom_total','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Ni (Níquel)</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="ni_niquel" value="${v('ni_niquel','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Zn (Cinc)</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="zn_cinc_metal" value="${v('zn_cinc_metal','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Cu (Coure)</label>
          <input type="number" step="0.001" min="0" class="form-input"
                 name="cu_coure_metal" value="${v('cu_coure_metal','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">Classificació Annex V</label>
          <input type="text" class="form-input"
                 name="classificacio_annex5" value="${ftEscapeHtml(v('classificacio_annex5',''))}">
        </div>
      </div>
    </fieldset>

    <!-- Fisicoquímic -->
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
                 name="ph_minim" value="${v('ph_minim','')}">
        </div>
        <div class="form-grup">
          <label class="form-label">pH màxim</label>
          <input type="number" step="0.1" min="0" max="14" class="form-input"
                 name="ph_maxim" value="${v('ph_maxim','')}">
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
        <div class="form-grup">
          <label class="form-label">Humitat màxima %</label>
          <input type="number" step="0.1" min="0" class="form-input"
                 name="humitat_max" value="${v('humitat_max','')}">
        </div>
      </div>
    </fieldset>

    <!-- Modes aplicació -->
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
      <legend>Identificació registral</legend>
      <div class="form-row form-row--2">
        <div class="form-grup">
          <label class="form-label">Fabricant</label>
          <input type="text" class="form-input" name="fabricant"
                 value="${ftEscapeHtml(v('fabricant',''))}">
        </div>
        <div class="form-grup">
          <label class="form-label">Núm. registre MAPA</label>
          <input type="text" class="form-input" name="registre_mapa"
                 id="ft-registre-mapa"
                 value="${ftEscapeHtml(v('registre_mapa',''))}">
        </div>
      </div>
      <div class="form-grup">
        <label class="form-label">URL fitxa tècnica fabricant</label>
        <div style="display:flex; gap:8px;">
          <input type="url" class="form-input" name="fitxa_tecnica_url"
                 value="${ftEscapeHtml(v('fitxa_tecnica_url',''))}"
                 placeholder="https://...">
          ${v('fitxa_tecnica_url') ? `
          <a href="${ftEscapeHtml(v('fitxa_tecnica_url'))}" target="_blank"
             class="btn-secondary btn-sm">
            <i class="ti ti-external-link"></i>
          </a>` : ''}
        </div>
      </div>
    </fieldset>

    <div class="modal-footer">
      <button type="button" class="btn-secondary" onclick="tancarModalFT()">Cancel·lar</button>
      <button type="submit" class="btn-primary" id="btn-guardar-ft">
        <i class="ti ti-device-floppy"></i> Guardar
      </button>
    </div>
  </form>`;
}

// ─────────────────────────────────────────────
// CERCA AL MAPA
// ─────────────────────────────────────────────

async function cercarAlMapa() {
  const query = document.getElementById('ft-mapa-query')?.value?.trim();
  const el    = document.getElementById('ft-mapa-resultats');
  if (!query || !el) return;

  el.innerHTML = '<p class="loading-msg"><i class="ti ti-loader ti-spin"></i> Cercant...</p>';

  try {
    // Primer: cerca per registre_mapa exacte
    let { data, error } = await supabaseClient
      .from('fertilitzants_mapa')
      .select('*')
      .ilike('registre_mapa', `%${query}%`)
      .limit(5);

    if (error) throw error;

    // Si no hi ha resultats per registre, cerca per nom
    if (!data || data.length === 0) {
      const res = await supabaseClient
        .from('fertilitzants_mapa')
        .select('*')
        .ilike('nom_comercial', `%${query}%`)
        .limit(8);
      if (res.error) throw res.error;
      data = res.data;
    }

    _ftMapaResultats = data || [];
    renderResultatsMapa();
  } catch (e) {
    el.innerHTML = `<p class="error-msg">Error cercant: ${e.message}</p>`;
  }
}

function renderResultatsMapa() {
  const el = document.getElementById('ft-mapa-resultats');
  if (!el) return;

  if (_ftMapaResultats.length === 0) {
    el.innerHTML = `
    <div class="ft-mapa-buit">
      <i class="ti ti-mood-sad"></i>
      Cap resultat al registre MAPA. El producte pot ser d'importació (sense registre espanyol).
      Pots omplir les dades manualment des de la fitxa tècnica del fabricant.
    </div>`;
    return;
  }

  const cards = _ftMapaResultats.map((m, i) => `
  <div class="ft-mapa-card" onclick="aplicarDadesMapa(${i})">
    <div class="ft-mapa-card-top">
      <span class="ft-mapa-registre">${m.registre_mapa || '—'}</span>
      <span class="ft-mapa-tipus">${(m.tipus_producte||'').substring(0,40)}</span>
    </div>
    <div class="ft-mapa-nom">${m.nom_comercial}</div>
    <div class="ft-mapa-fab">${m.fabricant || '—'}</div>
    <div class="ft-mapa-npk">
      <span class="npk-pill-sm npk-n">N ${m.n_total ?? '—'}%</span>
      <span class="npk-pill-sm npk-p">P ${m.p_total ?? '—'}%</span>
      <span class="npk-pill-sm npk-k">K ${m.k_total ?? '—'}%</span>
      ${m.ca_total ? `<span class="npk-pill-sm npk-ca">Ca ${m.ca_total}%</span>` : ''}
      ${m.hidrosoluble ? '<span class="ft-hidro-badge">Hidrosoluble</span>' : ''}
    </div>
    <div class="ft-mapa-apply-hint">Clic per aplicar aquestes dades →</div>
  </div>`).join('');

  el.innerHTML = `
  <div class="ft-mapa-resultats-wrap">
    <p class="ft-mapa-hint">${_ftMapaResultats.length} resultat(s) — selecciona per autocompletar el formulari:</p>
    <div class="ft-mapa-cards">${cards}</div>
  </div>`;
}

function aplicarDadesMapa(idx) {
  const m    = _ftMapaResultats[idx];
  const form = document.getElementById('form-ft');
  if (!m || !form) return;

  // Helper per assignar valor a input/select per name
  const set = (name, val) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el && val !== null && val !== undefined) el.value = val;
  };

  // NPK principals → actualitzar fertilitzants base (via camp ocult)
  // (els camps n, p, k estan a la taula principal, no a tecnics)
  // Els guardem en data attributes per processar al guardar
  form.dataset.mapaId   = m.id;
  form.dataset.mapaN    = m.n_total ?? '';
  form.dataset.mapaP    = m.p_total ?? '';
  form.dataset.mapaK    = m.k_total ?? '';

  // Dades tècniques
  set('ca',                   m.ca_total);
  set('mg',                   m.mg_total);
  set('s',                    m.s_total);
  set('materia_organica',     m.materia_organica);
  set('n_nitric',             m.n_nitric);
  set('n_amoniacal',          m.n_amoniacal);
  set('n_ureic',              m.n_ureic);
  set('n_organic',            m.n_organic);
  set('fe_total',             m.fe_total);
  set('b_total',              m.b_total);
  set('mn_total',             m.mn_total);
  set('zn_total',             m.zn_total);
  set('mo_total',             m.mo_total);
  set('cu_total',             m.cu_total);
  set('cd_cadmi',             m.cd);
  set('pb_plom',              m.pb);
  set('hg_mercuri',           m.hg);
  set('cr_crom_total',        m.cr_total);
  set('ni_niquel',            m.ni);
  set('zn_cinc_metal',        m.zn_metal);
  set('cu_coure_metal',       m.cu_metal);
  set('classificacio_annex5', m.classificacio_annex5);
  set('ph_minim',             m.ph_minim);
  set('ph_maxim',             m.ph_maxim);
  set('forma_presentacio',    m.forma_presentacio);
  set('humitat_max',          m.humitat_max);
  set('fabricant',            m.fabricant);
  set('registre_mapa',        m.registre_mapa);

  // Solubilitat
  if (m.hidrosoluble) {
    const selSol = form.querySelector('[name="solubilitat"]');
    if (selSol) selSol.value = 'total';
  }

  // Modes aplicació
  const checkboxes = form.querySelectorAll('[name="modes_aplicacio"]');
  checkboxes.forEach(cb => { cb.checked = false; });
  if (m.modes_aplicacio && Array.isArray(m.modes_aplicacio)) {
    const modesLower = m.modes_aplicacio.map(x => x.toLowerCase());
    checkboxes.forEach(cb => {
      if (modesLower.some(mo => mo.includes(cb.value.toLowerCase()) ||
                                cb.value.toLowerCase().includes(mo.split(' ')[0]))) {
        cb.checked = true;
      }
    });
    // Fertirrigació: detectar per modo empleo
    const modeText = (m.modes_aplicacio.join(' ')).toLowerCase();
    if (modeText.includes('fertirri')) {
      const cbFerri = form.querySelector('[name="modes_aplicacio"][value="fertirrigació"]');
      if (cbFerri) cbFerri.checked = true;
    }
  }

  // Tancar resultats i mostrar confirmació
  const resEl = document.getElementById('ft-mapa-resultats');
  if (resEl) {
    resEl.innerHTML = `
    <div class="ft-mapa-aplicat">
      <i class="ti ti-circle-check"></i>
      Dades de <strong>${m.nom_comercial}</strong> (${m.registre_mapa}) aplicades al formulari.
      Revisa i guarda.
    </div>`;
  }
}

// ─────────────────────────────────────────────
// GUARDAR
// ─────────────────────────────────────────────

async function guardarFT(event) {
  event.preventDefault();
  if (!_ftActiu) return;

  const btn  = document.getElementById('btn-guardar-ft');
  const form = document.getElementById('form-ft');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader ti-spin"></i> Guardant...';

  try {
    const fd    = new FormData(form);
    const dades = Object.fromEntries(fd);

    // Modes aplicació
    dades.modes_aplicacio = [...form.querySelectorAll('[name="modes_aplicacio"]:checked')]
      .map(cb => cb.value);

    // Netejar buits → null
    ['ph_minim','ph_maxim','materia_organica','humitat_max',
     'n_nitric','n_amoniacal','n_ureic','n_organic',
     'fe_total','b_total','mn_total','zn_total','mo_total','cu_total',
     'cd_cadmi','pb_plom','hg_mercuri','cr_crom_total','ni_niquel',
     'zn_cinc_metal','cu_coure_metal',
     'registre_mapa','fabricant','fitxa_tecnica_url',
     'classificacio_annex5'].forEach(c => {
      if (dades[c] === '') dades[c] = null;
    });

    // Upsert dades tècniques
    await Fertilitzants.upsertTecnic(_ftActiu.id, dades);

    // Actualitzar preu si s'ha introduït
    const preuKg = document.getElementById('ft-preu-kg')?.value;
    if (preuKg) {
      await Fertilitzants.actualitzarPreu(_ftActiu.id, parseFloat(preuKg));
    }

    // Si venia del MAPA, actualitzar NPK base si estaven buits
    const mapaN = form.dataset.mapaN;
    const mapaP = form.dataset.mapaP;
    const mapaK = form.dataset.mapaK;
    if ((mapaN || mapaP || mapaK) && (!_ftActiu.n || !_ftActiu.p || !_ftActiu.k)) {
      const actualitzacio = {};
      if (mapaN && !_ftActiu.n) actualitzacio.n = parseFloat(mapaN);
      if (mapaP && !_ftActiu.p) actualitzacio.p = parseFloat(mapaP);
      if (mapaK && !_ftActiu.k) actualitzacio.k = parseFloat(mapaK);
      if (Object.keys(actualitzacio).length) {
        await supabaseClient
          .from('fertilitzants')
          .update(actualitzacio)
          .eq('id', _ftActiu.id);
      }
    }

    mostrarNotificacio(`${_ftActiu.nom} — dades tècniques guardades`, 'success');
    tancarModalFT();
    _ftLlista = await Fertilitzants.getComplet();
    renderTaulaFertTecnics();

  } catch (e) {
    mostrarNotificacio(`Error guardant: ${e.message}`, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-device-floppy"></i> Guardar';
  }
}

function tancarModalFT() {
  const modal = document.getElementById('modal-ft');
  if (modal) modal.style.display = 'none';
  _ftActiu         = null;
  _ftMapaResultats = [];
}

// ─────────────────────────────────────────────
// MODAL IMPORTACIÓ MAPA (actualització periòdica)
// ─────────────────────────────────────────────

function renderFormImportMapa() {
  return `
  <div class="import-info">
    <p>Aquesta funció actualitza la taula de referència <strong>fertilitzants_mapa</strong>
    amb un nou Excel descarregat del registre oficial MAPA.</p>
    <p class="import-url">
      Font: <a href="https://www.mapa.gob.es/es/agricultura/temas/medios-de-produccion/productos-fertilizantes/registro-productos-fertilizantes/"
               target="_blank">Registre MAPA <i class="ti ti-external-link"></i></a>
    </p>
    <ol class="import-passos">
      <li>Descarrega l'Excel actualitzat del registre MAPA</li>
      <li>Selecciona'l aquí</li>
      <li>L'app processarà i actualitzarà els registres</li>
    </ol>
  </div>
  <div class="form-grup" style="margin-bottom:1rem;">
    <label class="form-label">Fitxer Excel MAPA (.xlsx)</label>
    <div class="ft-file-wrap">
      <label class="ft-file-label">
        <i class="ti ti-file-spreadsheet"></i>
        <span id="ft-file-nom">Seleccionar fitxer Excel...</span>
        <input type="file" id="inp-excel-mapa" accept=".xlsx" style="display:none"
               onchange="previsualitzarImportMapa(this); document.getElementById('ft-file-nom').textContent = this.files[0]?.name || 'Seleccionar fitxer Excel...'">
      </label>
    </div>
  </div>
  <div id="import-preview"></div>
  <div class="modal-footer">
    <button type="button" class="btn-secondary" onclick="tancarModalImportMapa()">Cancel·lar</button>
    <button type="button" class="btn-primary" id="btn-import-mapa"
            onclick="executarImportMapa()" disabled>
      <i class="ti ti-upload"></i> Importar
    </button>
  </div>`;
}

function obrirModalImportacioMapa() {
  const modal = document.getElementById('modal-import-mapa');
  const body  = document.getElementById('modal-import-body');
  if (!modal) return;
  body.innerHTML = renderFormImportMapa();
  modal.style.display = 'flex';
}

function tancarModalImportMapa() {
  const modal = document.getElementById('modal-import-mapa');
  if (modal) modal.style.display = 'none';
}

// Variable global per guardar dades processades de l'Excel
let _importMapaDades = [];

async function previsualitzarImportMapa(input) {
  const file    = input.files[0];
  const preview = document.getElementById('import-preview');
  const btn     = document.getElementById('btn-import-mapa');
  if (!file || !preview) return;

  preview.innerHTML = '<p class="loading-msg"><i class="ti ti-loader ti-spin"></i> Processant Excel...</p>';
  btn.disabled = true;

  try {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
    const ab   = await file.arrayBuffer();
    const wb   = XLSX.read(ab, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const raw  = XLSX.utils.sheet_to_json(ws, { header: 1 });

    const headers = raw[0];
    const data    = raw.slice(1);

    // Mateixos filtres que el script Python
    const filtrats = data.filter(r => {
      const mode  = String(r[22] || '').toLowerCase();
      const hidro = String(r[28] || '').trim().toLowerCase();
      const tipus = String(r[4]  || '').toLowerCase();
      return (mode.includes('fertirri') || ['si','sí','s'].includes(hidro))
             && !tipus.includes('enmienda');
    });

    _importMapaDades = filtrats.map(r => mapExcelRowToMapa(r));

    preview.innerHTML = `
    <div class="import-preview-ok">
      <i class="ti ti-circle-check"></i>
      <strong>${_importMapaDades.length} registres</strong> processats
      (filtrats de ${data.length} totals).
      <br>Clic a "Importar" per actualitzar la taula.
    </div>`;
    btn.disabled = false;

  } catch (e) {
    preview.innerHTML = `<p class="error-msg">Error processant Excel: ${e.message}</p>`;
  }
}

function mapExcelRowToMapa(r) {
  const n  = (i) => { const v = r[i]; if (v==null||v==='') return null; return parseFloat(String(v).replace(',','.')); };
  const t  = (i) => { const v = r[i]; if (v==null||v==='') return null; return String(v).trim(); };
  const b  = (i) => { const v = r[i]; if (!v) return null; return ['si','sí','s'].includes(String(v).trim().toLowerCase()); };
  const modes = (t(22)||'').split(',').map(m=>m.trim()).filter(Boolean);

  return {
    clave_mapa: r[0] ? parseInt(r[0]) : null,
    url_mapa: t(1), registre_mapa: t(2), nom_comercial: t(3),
    tipus_producte: t(4), fabricant: t(5), materies_primeres: t(6),
    cd: n(7), cu_metal: n(8), ni: n(9), pb: n(10), zn_metal: n(11),
    hg: n(12), cr_total: n(13), classificacio_annex5: t(14),
    materia_organica: n(15), clorurs: n(16), humitat_max: n(17),
    conductivitat: n(18), ph: t(19), forma_presentacio: t(21),
    modes_aplicacio: modes, carboni_organic: n(23), extracte_humic: n(24),
    acids_humics: n(25), relacio_cn: n(26), solubilitat_pct: n(27),
    hidrosoluble: b(28), acids_fulvics: n(29), densitat: n(30),
    envasat: t(35), cr_vi: n(36), n_total: n(37), n_soluble: n(38),
    n_organic: n(39), p_total: n(41), p_soluble: n(42),
    k_total: n(43), k_soluble: n(44), n_amoniacal: n(47),
    s_total: n(49), s_soluble: n(50), na_total: n(51),
    ca_total: n(53), ca_soluble: n(54), mg_total: n(55), mg_soluble: n(56),
    ph_minim: n(57), ph_maxim: n(58), n_nitric: n(59), n_ureic: n(61),
    fe_total: n(65), fe_soluble: n(66), b_total: n(67), b_soluble: n(68),
    cu_total: n(69), cu_soluble: n(70), mn_total: n(71), mn_soluble: n(72),
    zn_total: n(73), zn_soluble: n(74), mo_total: n(77), mo_soluble: n(78),
    data_importacio: new Date().toISOString().split('T')[0],
  };
}

async function executarImportMapa() {
  if (!_importMapaDades.length) return;
  const btn = document.getElementById('btn-import-mapa');
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader ti-spin"></i> Important...';

  try {
    // Upsert en blocs de 100
    const BLOC = 100;
    let processats = 0;
    for (let i = 0; i < _importMapaDades.length; i += BLOC) {
      const bloc = _importMapaDades.slice(i, i + BLOC);
      const { error } = await supabaseClient
        .from('fertilitzants_mapa')
        .upsert(bloc, { onConflict: 'registre_mapa' });
      if (error) throw error;
      processats += bloc.length;
      btn.innerHTML = `<i class="ti ti-loader ti-spin"></i> ${processats}/${_importMapaDades.length}...`;
    }

    mostrarNotificacio(`Registre MAPA actualitzat: ${processats} productes`, 'success');
    tancarModalImportMapa();
  } catch (e) {
    mostrarNotificacio(`Error important: ${e.message}`, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-upload"></i> Importar';
  }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function ftEscapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────

function injectarEstilsFertTecnics() {
  if (document.getElementById('style-ft')) return;
  const s = document.createElement('style');
  s.id = 'style-ft';
  s.textContent = `
    .ft-wrap { padding:1rem; max-width:1300px; }
    .ft-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; gap:12px; }
    .ft-header-esq { display:flex; align-items:center; gap:12px; }
    .ft-titol { font-size:1.3rem; font-weight:600; }
    .ft-buit { text-align:center; color:var(--color-text-secondary); padding:2rem; }
    .ft-buit-val { color:var(--color-text-secondary); }

    /* Stats */
    .ft-stats-grid { display:flex; gap:10px; margin-bottom:1rem; flex-wrap:wrap; }
    .ft-stat { background:var(--color-background-secondary); border-radius:var(--border-radius-md);
               padding:.6rem 1rem; min-width:100px; }
    .ft-stat--ok   { background:var(--color-background-success); }
    .ft-stat--warn { background:var(--color-background-warning); }
    .ft-stat-val { font-size:1.4rem; font-weight:600; }
    .ft-stat-lab { font-size:11px; color:var(--color-text-secondary); }

    /* Cerca */
    .ft-cerca-wrap { margin-bottom:1rem; }
    .ft-cerca-input { max-width:320px; background:var(--color-background-primary) !important; color:var(--color-text-primary) !important; border:2px solid var(--color-border-secondary) !important; border-radius:var(--border-radius-md) !important; padding:8px 12px !important; }
    .ft-cerca-input:focus { border-color:var(--color-border-info) !important; outline:none !important; }

    /* Taula */
    .ft-taula-scroll { overflow-x:auto; }
    .ft-taula { width:100%; border-collapse:collapse; font-size:13px; }
    .ft-taula thead th { text-align:left; padding:8px 10px;
                         border-bottom:2px solid var(--color-border-secondary);
                         font-size:12px; color:var(--color-text-secondary);
                         font-weight:500; white-space:nowrap; }
    .ft-fila:hover { background:var(--color-background-secondary); }
    .ft-td { padding:9px 10px; border-bottom:1px solid var(--color-border-tertiary); }
    .ft-td--center { text-align:center; }
    .ft-td--num { text-align:right; font-variant-numeric:tabular-nums; }
    .ft-td--accions { text-align:right; white-space:nowrap; }
    .ft-nom { font-weight:500; font-size:13px; }
    .ft-fab { font-size:11px; color:var(--color-text-secondary); }
    .ft-preu-origen { color:var(--color-text-secondary); }
    .ft-mapa-badge { font-size:11px; background:var(--color-background-success);
                     color:var(--color-text-success); padding:2px 6px;
                     border-radius:var(--border-radius-md); }

    /* Estat */
    .ft-estat { font-size:11px; padding:3px 8px; border-radius:var(--border-radius-md);
                font-weight:500; }
    .ft-estat--complet { background:var(--color-background-success); color:var(--color-text-success); }
    .ft-estat--ok      { background:var(--color-background-info);    color:var(--color-text-info); }
    .ft-estat--parcial { background:var(--color-background-warning);  color:var(--color-text-warning); }
    .ft-estat--buit    { background:var(--color-background-secondary);color:var(--color-text-secondary); }

    /* Cerca MAPA */
    .ft-mapa-cerca-wrap { background:var(--color-background-secondary);
                          border-radius:var(--border-radius-lg); padding:1rem 1.1rem;
                          margin-bottom:1.25rem; border-left:3px solid var(--color-border-info); }
    .ft-mapa-cerca-titol { font-size:13px; font-weight:500; margin-bottom:.75rem;
                           color:var(--color-text-primary); display:flex; align-items:center; gap:6px; }
    .ft-mapa-cerca-row { display:flex; gap:8px; margin-bottom:.75rem; }
    .ft-mapa-input { flex:1; }
    .ft-mapa-hint { font-size:12px; color:var(--color-text-secondary); margin-bottom:8px; }
    .ft-mapa-cards { display:flex; flex-wrap:wrap; gap:10px; }
    .ft-mapa-card { background:var(--color-background-primary); border:1px solid var(--color-border-secondary);
                    border-radius:var(--border-radius-md); padding:.75rem; cursor:pointer;
                    min-width:200px; max-width:280px; flex:1;
                    transition:border-color .15s, box-shadow .15s; }
    .ft-mapa-card:hover { border-color:var(--color-border-info);
                          box-shadow:0 2px 8px rgba(0,0,0,.08); }
    .ft-mapa-card-top { display:flex; justify-content:space-between; margin-bottom:4px; }
    .ft-mapa-registre { font-size:11px; color:var(--color-text-info); font-family:var(--font-mono); }
    .ft-mapa-tipus { font-size:10px; color:var(--color-text-secondary); text-align:right; }
    .ft-mapa-nom { font-weight:500; font-size:13px; margin-bottom:2px; }
    .ft-mapa-fab { font-size:11px; color:var(--color-text-secondary); margin-bottom:8px; }
    .ft-mapa-npk { display:flex; flex-wrap:wrap; gap:4px; }
    .ft-mapa-apply-hint { font-size:11px; color:var(--color-text-info);
                          margin-top:8px; font-style:italic; }
    .ft-mapa-buit { font-size:13px; color:var(--color-text-secondary);
                    padding:.75rem; display:flex; gap:8px; align-items:flex-start; }
    .ft-mapa-aplicat { background:var(--color-background-success); color:var(--color-text-success);
                       padding:.75rem; border-radius:var(--border-radius-md); font-size:13px;
                       display:flex; align-items:center; gap:8px; }
    .ft-hidro-badge { font-size:10px; background:var(--color-background-info);
                      color:var(--color-text-info); padding:2px 6px;
                      border-radius:var(--border-radius-md); }
    .npk-pill-sm { font-size:11px; padding:2px 6px; border-radius:var(--border-radius-md);
                   font-weight:500; }

    /* Modal text força visible */
    .modal-box, .modal-box * { color:var(--color-text-primary); }
    .modal-box p, .modal-box li, .modal-box label { color:var(--color-text-primary) !important; }
    .modal-body { padding:1.25rem; background:var(--color-background-primary); }

    /* Selector fitxer personalitzat */
    .ft-file-wrap { margin-top:4px; }
    .ft-file-label { display:inline-flex; align-items:center; gap:8px; cursor:pointer;
                     background:var(--color-background-secondary);
                     border:2px dashed var(--color-border-secondary);
                     border-radius:var(--border-radius-md);
                     padding:.75rem 1.25rem; font-size:13px;
                     color:var(--color-text-primary);
                     transition:border-color .15s; }
    .ft-file-label:hover { border-color:var(--color-border-info); }

    /* Import info text */
    .import-info p, .import-info li { color:var(--color-text-primary) !important; font-size:13px; }
    .import-url a { color:var(--color-text-info); }
    .import-url { margin:.5rem 0; }
    .import-passos { margin:.5rem 0 .5rem 1.2rem; }
    .import-passos li { margin-bottom:4px; }
    .import-preview-ok { background:var(--color-background-success); color:var(--color-text-success);
                         padding:.75rem 1rem; border-radius:var(--border-radius-md);
                         font-size:13px; display:flex; align-items:center; gap:8px;
                         line-height:1.5; margin-top:.5rem; }

    /* Modal base */
    .modal { display:none; position:fixed; inset:0; z-index:9999;
             align-items:center; justify-content:center; }
    .modal-overlay { position:absolute; inset:0; background:rgba(0,0,0,.7); }
    .modal-box { position:relative; background:var(--color-background-primary);
                 border-radius:var(--border-radius-lg); width:min(700px,95vw);
                 max-height:90vh; overflow-y:auto;
                 box-shadow:0 8px 32px rgba(0,0,0,.25); z-index:10000; }
    .modal-box--lg  { width:min(600px,95vw); }
    .modal-box--xl  { width:min(900px,96vw); }
    .modal-header { display:flex; justify-content:space-between; align-items:center;
                    padding:1rem 1.25rem; border-bottom:1px solid var(--color-border-tertiary);
                    position:sticky; top:0; background:var(--color-background-primary); z-index:10001; }
    .modal-header h2 { font-size:16px; font-weight:600; }
    .modal-close { background:none; border:none; cursor:pointer; font-size:18px;
                   color:var(--color-text-secondary); padding:4px; }
    .modal-body { padding:1.25rem; }
    .modal-footer { display:flex; justify-content:flex-end; gap:8px;
                    padding-top:1rem; margin-top:1rem;
                    border-top:1px solid var(--color-border-tertiary); }

    @media (max-width:768px) {
      .ft-stats-grid { gap:6px; }
      .ft-stat { min-width:80px; }
      .ft-mapa-cards { flex-direction:column; }
    }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────
// SINCRONITZACIÓ AUTOMÀTICA TOTS ELS PRODUCTES
// ─────────────────────────────────────────────

async function sincronitzarAmbMapa() {
  const btn = document.getElementById('btn-sincronitzar');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader ti-spin"></i> Sincronitzant...'; }

  try {
    // 1. Carregar tots els fertilitzants del catàleg
    const fertilitzants = await Fertilitzants.getComplet();
    let coincidencies = 0;
    let actualitzats  = 0;
    let senseMatch    = [];

    const log = document.getElementById('sinc-log');

    for (const f of fertilitzants) {
      // 2. Cerca al MAPA: primer per registre, si no per nom
      let mapaData = null;

      if (f.registre_mapa) {
        const { data } = await supabaseClient
          .from('fertilitzants_mapa')
          .select('*')
          .ilike('registre_mapa', f.registre_mapa)
          .maybeSingle();
        mapaData = data;
      }

      if (!mapaData) {
        // Cerca per nom normalitzat (eliminar espais extra, majúscules)
        const nomNet = f.nom.trim().toUpperCase();
        const { data } = await supabaseClient
          .from('fertilitzants_mapa')
          .select('*')
          .ilike('nom_comercial', nomNet)
          .maybeSingle();
        mapaData = data;
      }

      if (!mapaData) {
        // Cerca parcial per les primeres paraules del nom
        const primeresPaula = f.nom.trim().split(' ').slice(0, 3).join(' ');
        const { data } = await supabaseClient
          .from('fertilitzants_mapa')
          .select('*')
          .ilike('nom_comercial', `%${primeresPaula}%`)
          .limit(1)
          .maybeSingle();
        mapaData = data;
      }

      if (!mapaData) {
        senseMatch.push(f.nom);
        if (log) log.innerHTML += `<div class="sinc-miss">✗ ${f.nom} — sense coincidència MAPA</div>`;
        continue;
      }

      coincidencies++;

      // 3. Construir payload per a fertilitzants_tecnics
      const dades = {
        ca:                   mapaData.ca_total,
        mg:                   mapaData.mg_total,
        s:                    mapaData.s_total,
        materia_organica:     mapaData.materia_organica,
        n_nitric:             mapaData.n_nitric,
        n_amoniacal:          mapaData.n_amoniacal,
        n_ureic:              mapaData.n_ureic,
        n_organic:            mapaData.n_organic,
        fe_total:             mapaData.fe_total,
        fe_soluble:           mapaData.fe_soluble,
        b_total:              mapaData.b_total,
        b_soluble:            mapaData.b_soluble,
        mn_total:             mapaData.mn_total,
        mn_soluble:           mapaData.mn_soluble,
        zn_total:             mapaData.zn_total,
        zn_soluble:           mapaData.zn_soluble,
        mo_total:             mapaData.mo_total,
        mo_soluble:           mapaData.mo_soluble,
        cu_total:             mapaData.cu_total,
        cu_soluble:           mapaData.cu_soluble,
        cd_cadmi:             mapaData.cd,
        pb_plom:              mapaData.pb,
        hg_mercuri:           mapaData.hg,
        cr_crom_total:        mapaData.cr_total,
        cr_crom_vi:           mapaData.cr_vi,
        ni_niquel:            mapaData.ni,
        zn_cinc_metal:        mapaData.zn_metal,
        cu_coure_metal:       mapaData.cu_metal,
        classificacio_annex5: mapaData.classificacio_annex5,
        ph_minim:             mapaData.ph_minim,
        ph_maxim:             mapaData.ph_maxim,
        forma_presentacio:    mapaData.forma_presentacio,
        humitat_max:          mapaData.humitat_max,
        fabricant:            mapaData.fabricant,
        registre_mapa:        mapaData.registre_mapa,
        fitxa_tecnica_url:    mapaData.url_mapa,
        solubilitat:          mapaData.hidrosoluble ? 'total' : 'desconeguda',
        modes_aplicacio:      mapaData.modes_aplicacio || [],
        carboni_organic:      mapaData.carboni_organic,
        humitat_max:          mapaData.humitat_max,
      };

      // Detectar fertirrigació des de modes_aplicacio
      const modeText = (mapaData.modes_aplicacio || []).join(' ').toLowerCase();
      if (modeText.includes('fertirri') && !dades.modes_aplicacio.includes('fertirrigació')) {
        dades.modes_aplicacio.push('fertirrigació');
      }

      await Fertilitzants.upsertTecnic(f.id, dades);

      // Actualitzar NPK base si estaven buits
      const actualitzacioBase = {};
      if (mapaData.n_total && !f.n) actualitzacioBase.n = mapaData.n_total;
      if (mapaData.p_total && !f.p) actualitzacioBase.p = mapaData.p_total;
      if (mapaData.k_total && !f.k) actualitzacioBase.k = mapaData.k_total;
      if (Object.keys(actualitzacioBase).length) {
        await supabaseClient.from('fertilitzants').update(actualitzacioBase).eq('id', f.id);
      }

      actualitzats++;
      if (log) log.innerHTML += `<div class="sinc-ok">✓ ${f.nom} → ${mapaData.nom_comercial} (${mapaData.registre_mapa})</div>`;
    }

    // Resum final
    if (log) {
      log.innerHTML += `
      <div class="sinc-resum">
        <strong>Sincronització completada:</strong>
        ${actualitzats} actualitzats · ${senseMatch.length} sense coincidència MAPA
      </div>`;
    }

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-refresh"></i> Sincronitzar de nou'; }

    // Recarregar llista
    _ftLlista = await Fertilitzants.getComplet();
    renderTaulaFertTecnics();

  } catch (e) {
    mostrarNotificacio(`Error sincronitzant: ${e.message}`, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-refresh"></i> Sincronitzar amb MAPA'; }
  }
}

async function obrirModalSincronitzar() {
  const container = document.getElementById('view-container');

  // Insertar modal si no existeix
  if (!document.getElementById('modal-sinc')) {
    const div = document.createElement('div');
    div.innerHTML = `
    <div id="modal-sinc" class="modal" style="display:none" role="dialog" aria-modal="true">
      <div class="modal-overlay" onclick="tancarModalSinc()"></div>
      <div class="modal-box modal-box--lg">
        <div class="modal-header">
          <h2>Sincronitzar amb registre MAPA</h2>
          <button class="modal-close" onclick="tancarModalSinc()"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <p style="font-size:13px; margin-bottom:1rem;">
            Cerca coincidències entre els teus <strong>${_ftLlista.length} fertilitzants</strong>
            i el registre MAPA. Actualitza automàticament solubilitat, forma, NPK secundari,
            micronutrients, metalls pesants i número de registre.
          </p>
          <p style="font-size:12px; color:var(--color-text-secondary); margin-bottom:1rem;">
            <i class="ti ti-info-circle"></i>
            Productes d'importació sense registre espanyol (ex: POLY-FEED) quedaran sense match.
          </p>
          <div id="sinc-log" class="sinc-log"></div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="tancarModalSinc()">Tancar</button>
            <button class="btn-primary" id="btn-sincronitzar" onclick="sincronitzarAmbMapa()">
              <i class="ti ti-refresh"></i> Sincronitzar amb MAPA
            </button>
          </div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(div.firstElementChild);

    // Afegir CSS log si no existeix
    if (!document.getElementById('style-sinc')) {
      const s = document.createElement('style');
      s.id = 'style-sinc';
      s.textContent = `
        .sinc-log { max-height:300px; overflow-y:auto; font-size:12px; font-family:var(--font-mono);
                    background:var(--color-background-secondary); border-radius:var(--border-radius-md);
                    padding:.75rem; margin-bottom:1rem; }
        .sinc-ok   { color:var(--color-text-success); margin-bottom:3px; }
        .sinc-miss { color:var(--color-text-secondary); margin-bottom:3px; }
        .sinc-resum { margin-top:1rem; padding:.75rem; background:var(--color-background-primary);
                      border-radius:var(--border-radius-md); border-top:2px solid var(--color-border-secondary); }
      `;
      document.head.appendChild(s);
    }
  }

  document.getElementById('modal-sinc').style.display = 'flex';
}

function tancarModalSinc() {
  const modal = document.getElementById('modal-sinc');
  if (modal) modal.style.display = 'none';
}