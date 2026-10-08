// ============================================================
// FACTURES TEMPORERS - UI v1
// Quadern de Camp NLASL
//
// Afegir a index.html DESPRÉS de app_v8.js:
//   <script src="factures-temporers-ui_v1.js"></script>
//
// Botó al menú Consums (després de Factures Aigua):
//   <button class="nav-btn" onclick="carregarVistaFacturesTemporers()">👥 Factures Temporers</button>
//
// Depèn de: supabaseClient, currentUser, currentUserProfile, hasPermission(),
//           mostrarNotificacio(), formatData() (globals d'app_v8.js / auth)
//
// Campanya = any calendari del mes de servei (ho calcula el trigger de la BD).
// ============================================================

// ---- Constants fàcils de canviar ----
// Semàfor de desviació entre hores registrades (control horari) i facturades (%)
const FT_SEMAFOR = { verd: 3, taronja: 8 };   // <=3 verd, 3-8 taronja, >8 vermell
const FT_PROVEIDOR_DEFECTE = 'Segre Fruits i Secció de Crèdit SCCL';
const FT_ARTICLE_DEFECTE = '7020010';
const FT_IVA_DEFECTE = 10;
const FT_TOLERANCIA_IMPORT = 0.02;            // € de diferència admesa hores x preu vs net

// ---- Estat ----
let ftFactures = [];
let ftRegistrat = {};      // mes_servei -> { hores, cost, grups: [...] }
let ftPanellToken = 0;     // per ignorar respostes antigues del panell del modal

// ============================================================
// UTILITATS
// ============================================================

function ftEsc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Arrodoniment a 2 decimals evitant errors de coma flotant (4968.145 -> 4968.15)
function ftArrodonir(n) {
    return Math.round(n * 100 + 1e-6) / 100;
}

function ftNum(n, dec) {
    dec = (dec == null) ? 2 : dec;
    return Number(n || 0).toLocaleString('ca-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function ftFormatMes(dataStr) {
    if (!dataStr) return '-';
    const mesos = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol',
                   'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
    const p = String(dataStr).split('-');
    return mesos[parseInt(p[1], 10) - 1] + ' ' + p[0];
}

function ftRol() {
    return (typeof currentUserProfile !== 'undefined' && currentUserProfile) ? currentUserProfile.role : '';
}

function ftSemafor(devPct) {
    if (devPct == null || isNaN(devPct)) return { icona: '⚪', color: '#999' };
    const a = Math.abs(devPct);
    if (a <= FT_SEMAFOR.verd) return { icona: '🟢', color: '#2e7d32' };
    if (a <= FT_SEMAFOR.taronja) return { icona: '🟠', color: '#e65100' };
    return { icona: '🔴', color: '#c62828' };
}

function ftSigne(n, dec) {
    return (n > 0 ? '+' : '') + ftNum(n, dec);
}

// Hores/cost registrats al control horari per un mes (RPC)
async function ftObtenirRegistrat(mesServei) {
    const { data, error } = await supabaseClient.rpc('get_hores_temporers_mes', { p_mes: mesServei });
    if (error) throw error;
    const grups = (data || []).map(function(g) {
        return {
            nom: g.nom,
            registres: Number(g.registres) || 0,
            hores: parseFloat(g.hores_registrades) || 0,
            cost: parseFloat(g.cost_registrat) || 0
        };
    });
    return {
        hores: grups.reduce(function(s, g) { return s + g.hores; }, 0),
        cost: grups.reduce(function(s, g) { return s + g.cost; }, 0),
        grups: grups
    };
}

// ============================================================
// VISTA PRINCIPAL
// ============================================================

async function carregarVistaFacturesTemporers() {
    if (typeof vistaActual !== 'undefined') vistaActual = 'factures-temporers';
    const container = document.getElementById('view-container');

    if (['admin', 'editor', 'soci'].indexOf(ftRol()) === -1) {
        container.innerHTML = '<div style="padding:40px;text-align:center;"><h2>🔒 Sense permisos</h2>' +
            '<p>Aquesta pantalla només és accessible per a administradors, editors i socis.</p></div>';
        return;
    }

    const podeCrear = hasPermission('insert');
    const anyActual = new Date().getFullYear();

    let html = '<div class="view-factures-temporers">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">';
    html += '<h2>👥 Factures Temporers</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="ftObrirModal()">➕ Nova Factura</button>';
    }
    html += '</div>';

    // Filtre campanya (any calendari)
    html += '<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px;display:flex;gap:15px;align-items:flex-end;flex-wrap:wrap;">';
    html += '<div><label style="display:block;font-size:12px;margin-bottom:4px;">Campanya (any calendari)</label>';
    html += '<select id="ft-filtre-any" onchange="ftCarregarTaula()" style="padding:8px;border:1px solid #ddd;border-radius:4px;">';
    for (let a = anyActual + 1; a >= anyActual - 4; a--) {
        html += '<option value="' + a + '"' + (a === anyActual ? ' selected' : '') + '>' + a + '</option>';
    }
    html += '</select></div>';
    html += '<div style="font-size:12px;color:#666;max-width:520px;">La factura és la xifra real (és el que es paga). ' +
            'Les hores del control horari només serveixen per contrastar. ' +
            'Semàfor: 🟢 ≤' + FT_SEMAFOR.verd + '% · 🟠 ≤' + FT_SEMAFOR.taronja + '% · 🔴 >' + FT_SEMAFOR.taronja + '%.</div>';
    html += '</div>';

    html += '<div id="ft-resum" style="margin-bottom:20px;"></div>';

    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Mes servei</th><th>Nº Factura</th><th style="text-align:right;">Hores fact.</th>' +
            '<th style="text-align:right;">Hores reg.</th><th style="text-align:right;">Dif.</th><th>Semàfor</th>' +
            '<th style="text-align:right;">€/h</th><th style="text-align:right;">Import net</th>' +
            '<th style="text-align:right;">Total</th><th>Accions</th></tr></thead>';
    html += '<tbody id="ft-tbody"><tr><td colspan="10">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';

    container.innerHTML = html;
    await ftCarregarTaula();
}

async function ftCarregarTaula() {
    const tbody = document.getElementById('ft-tbody');
    if (!tbody) return;
    const any = parseInt(document.getElementById('ft-filtre-any').value, 10);

    try {
        const { data, error } = await supabaseClient
            .from('factures_temporers')
            .select('*')
            .eq('eliminat', false)
            .eq('campanya', any)
            .order('mes_servei', { ascending: false });
        if (error) throw error;
        ftFactures = data || [];

        // Hores registrades de cada mes facturat (en paral·lel)
        ftRegistrat = {};
        await Promise.all(ftFactures.map(async function(f) {
            ftRegistrat[f.mes_servei] = await ftObtenirRegistrat(f.mes_servei);
        }));

        ftPintarTaula();
    } catch (error) {
        console.error('Error carregant factures temporers:', error);
        tbody.innerHTML = '<tr><td colspan="10">Error: ' + ftEsc(error.message) + '</td></tr>';
    }
}

function ftPintarTaula() {
    const tbody = document.getElementById('ft-tbody');
    const resum = document.getElementById('ft-resum');
    if (!tbody) return;

    if (ftFactures.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No hi ha factures d\'aquesta campanya</td></tr>';
        if (resum) resum.innerHTML = '';
        return;
    }

    const podeEditar = hasPermission('update');
    const podeEliminar = hasPermission('delete');

    let totFact = 0, totReg = 0, totNet = 0, totTotal = 0, totCostReg = 0;

    let files = ftFactures.map(function(f) {
        const reg = ftRegistrat[f.mes_servei] || { hores: 0, cost: 0 };
        const hFact = parseFloat(f.hores_facturades) || 0;
        const net = parseFloat(f.import_net) || 0;
        const total = parseFloat(f.import_total) || 0;
        const dif = reg.hores - hFact;
        const dev = hFact > 0 ? (dif / hFact) * 100 : null;
        const sem = ftSemafor(dev);

        totFact += hFact; totReg += reg.hores; totNet += net; totTotal += total; totCostReg += reg.cost;

        let accions = '<button class="btn btn-sm btn-primary" onclick="ftObrirModal(\'' + f.id + '\', true)">👁️</button> ';
        if (podeEditar) accions += '<button class="btn btn-sm btn-secondary" onclick="ftObrirModal(\'' + f.id + '\')">✏️</button> ';
        if (podeEliminar) accions += '<button class="btn btn-sm btn-danger" onclick="ftEliminar(\'' + f.id + '\')">🗑️</button>';

        return '<tr>' +
            '<td><strong>' + ftEsc(ftFormatMes(f.mes_servei)) + '</strong></td>' +
            '<td>' + ftEsc(f.num_factura) + '</td>' +
            '<td style="text-align:right;">' + ftNum(hFact) + '</td>' +
            '<td style="text-align:right;">' + ftNum(reg.hores) + '</td>' +
            '<td style="text-align:right;color:' + sem.color + ';">' + ftSigne(dif) + (dev != null ? ' (' + ftSigne(dev, 1) + '%)' : '') + '</td>' +
            '<td style="text-align:center;font-size:18px;">' + sem.icona + '</td>' +
            '<td style="text-align:right;">' + ftNum(f.preu_hora) + '</td>' +
            '<td style="text-align:right;">' + ftNum(net) + ' €</td>' +
            '<td style="text-align:right;"><strong>' + ftNum(total) + ' €</strong></td>' +
            '<td>' + accions + '</td></tr>';
    }).join('');

    // Fila de totals
    const devTot = totFact > 0 ? ((totReg - totFact) / totFact) * 100 : null;
    const semTot = ftSemafor(devTot);
    files += '<tr style="background:#f1f8e9;font-weight:bold;">' +
        '<td colspan="2">TOTAL (' + ftFactures.length + ' mes' + (ftFactures.length > 1 ? 'os' : '') + ')</td>' +
        '<td style="text-align:right;">' + ftNum(totFact) + '</td>' +
        '<td style="text-align:right;">' + ftNum(totReg) + '</td>' +
        '<td style="text-align:right;color:' + semTot.color + ';">' + ftSigne(totReg - totFact) +
            (devTot != null ? ' (' + ftSigne(devTot, 1) + '%)' : '') + '</td>' +
        '<td style="text-align:center;font-size:18px;">' + semTot.icona + '</td>' +
        '<td style="text-align:right;">' + (totFact > 0 ? ftNum(totNet / totFact) : '-') + '</td>' +
        '<td style="text-align:right;">' + ftNum(totNet) + ' €</td>' +
        '<td style="text-align:right;">' + ftNum(totTotal) + ' €</td><td></td></tr>';

    tbody.innerHTML = files;

    // Targetes de resum
    const sobrecost = totCostReg - totNet;
    if (resum) {
        resum.innerHTML =
            '<div style="display:flex;gap:15px;flex-wrap:wrap;">' +
            '<div style="background:#e8f5e9;padding:12px;border-radius:8px;">💶 Cost facturat (net): <strong>' + ftNum(totNet) + ' €</strong></div>' +
            '<div style="background:#e3f2fd;padding:12px;border-radius:8px;">⏱️ Hores facturades: <strong>' + ftNum(totFact) + ' h</strong></div>' +
            '<div style="background:#fff3e0;padding:12px;border-radius:8px;">📋 Cost segons registre: <strong>' + ftNum(totCostReg) + ' €</strong></div>' +
            '<div style="background:' + semTot.color + '1a;padding:12px;border-radius:8px;">' + semTot.icona +
                ' Sobrecost del registre: <strong>' + ftSigne(sobrecost) + ' €</strong>' +
                (devTot != null ? ' (' + ftSigne(devTot, 1) + '% hores)' : '') + '</div>' +
            '</div>';
    }
}

// ============================================================
// MODAL (flotant, z-index alt per no quedar tapat per la capçalera)
// ============================================================

function ftAssegurarModal() {
    if (document.getElementById('ft-modal')) return;

    const inp = 'width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;';
    let h = '<div id="ft-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);' +
            'z-index:2147483647;overflow:auto;padding:20px;box-sizing:border-box;">';
    h += '<div style="background:white;max-width:760px;margin:20px auto;border-radius:12px;padding:24px;position:relative;">';
    h += '<span onclick="ftTancarModal()" style="position:absolute;right:16px;top:10px;font-size:28px;cursor:pointer;">&times;</span>';
    h += '<h2 id="ft-modal-titol">Nova Factura Temporers</h2>';
    h += '<form id="ft-form" onsubmit="ftGuardar(event)">';
    h += '<input type="hidden" id="ft-id">';

    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:10px;">';
    h += '<div class="form-group"><label>Nº Factura *</label><input type="text" id="ft-num" required style="' + inp + '"></div>';
    h += '<div class="form-group"><label>Data factura *</label><input type="date" id="ft-data-factura" required style="' + inp + '"></div>';
    h += '<div class="form-group"><label>Mes de servei *</label><input type="month" id="ft-mes" required onchange="ftActualitzarPanell()" style="' + inp + '"></div>';
    h += '</div>';

    h += '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:15px;margin-bottom:10px;">';
    h += '<div class="form-group"><label>Proveïdor</label><input type="text" id="ft-proveidor" style="' + inp + '"></div>';
    h += '<div class="form-group"><label>Article</label><input type="text" id="ft-article" style="' + inp + '"></div>';
    h += '<div class="form-group"><label>Albarà</label><input type="text" id="ft-albara" style="' + inp + '"></div>';
    h += '</div>';

    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:10px;">';
    h += '<div class="form-group"><label>Hores facturades *</label><input type="number" id="ft-hores" required min="0" step="0.01" oninput="ftRecalcular(true);ftActualitzarPanell()" style="' + inp + '"></div>';
    h += '<div class="form-group"><label>Preu €/h *</label><input type="number" id="ft-preu" required min="0" step="0.0001" oninput="ftRecalcular(true)" style="' + inp + '"></div>';
    h += '<div class="form-group"><label>Data venciment</label><input type="date" id="ft-venciment" style="' + inp + '"></div>';
    h += '</div>';

    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:15px;margin-bottom:10px;">';
    h += '<div class="form-group"><label>Import net € *</label><input type="number" id="ft-net" required min="0" step="0.01" oninput="ftRecalcular(false);ftActualitzarPanell()" style="' + inp + '"></div>';
    h += '<div class="form-group"><label>IVA %</label><input type="number" id="ft-iva-pct" min="0" step="0.01" oninput="ftRecalcular(false)" style="' + inp + '"></div>';
    h += '<div class="form-group"><label>IVA €</label><input type="number" id="ft-iva" readonly style="' + inp + 'background:#f5f5f5;"></div>';
    h += '<div class="form-group"><label>Total €</label><input type="number" id="ft-total" readonly style="' + inp + 'background:#f5f5f5;font-weight:bold;"></div>';
    h += '</div>';

    h += '<div id="ft-panell" style="margin:10px 0 15px 0;"></div>';

    h += '<div class="form-group"><label>Observacions</label><textarea id="ft-obs" rows="2" style="' + inp + '"></textarea></div>';
    h += '<div class="form-actions" style="margin-top:15px;display:flex;gap:10px;justify-content:flex-end;">';
    h += '<button type="button" class="btn btn-secondary" onclick="ftTancarModal()">Cancel·lar</button>';
    h += '<button type="submit" class="btn btn-primary" id="ft-btn-guardar">Guardar</button>';
    h += '</div></form></div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
}

function ftTancarModal() {
    const m = document.getElementById('ft-modal');
    if (m) m.style.display = 'none';
}

function ftObrirModal(id, soloLectura) {
    ftAssegurarModal();
    document.getElementById('ft-form').reset();
    document.getElementById('ft-id').value = '';
    document.getElementById('ft-panell').innerHTML = '';

    const f = id ? ftFactures.find(function(x) { return x.id === id; }) : null;
    const camps = ['ft-num', 'ft-data-factura', 'ft-mes', 'ft-proveidor', 'ft-article', 'ft-albara',
                   'ft-hores', 'ft-preu', 'ft-venciment', 'ft-net', 'ft-iva-pct', 'ft-obs'];

    if (f) {
        document.getElementById('ft-modal-titol').textContent = soloLectura ? 'Veure Factura Temporers' : 'Editar Factura Temporers';
        document.getElementById('ft-id').value = f.id;
        document.getElementById('ft-num').value = f.num_factura || '';
        document.getElementById('ft-data-factura').value = f.data_factura || '';
        document.getElementById('ft-mes').value = (f.mes_servei || '').slice(0, 7);
        document.getElementById('ft-proveidor').value = f.proveidor || '';
        document.getElementById('ft-article').value = f.article || '';
        document.getElementById('ft-albara').value = f.albara || '';
        document.getElementById('ft-hores').value = f.hores_facturades;
        document.getElementById('ft-preu').value = f.preu_hora;
        document.getElementById('ft-venciment').value = f.data_venciment || '';
        document.getElementById('ft-net').value = f.import_net;
        document.getElementById('ft-iva-pct').value = f.iva_pct;
        document.getElementById('ft-obs').value = f.observacions || '';
        ftRecalcular(false);
    } else {
        document.getElementById('ft-modal-titol').textContent = 'Nova Factura Temporers';
        document.getElementById('ft-proveidor').value = FT_PROVEIDOR_DEFECTE;
        document.getElementById('ft-article').value = FT_ARTICLE_DEFECTE;
        document.getElementById('ft-iva-pct').value = FT_IVA_DEFECTE;
        document.getElementById('ft-data-factura').value = new Date().toISOString().split('T')[0];
        // Mes de servei suggerit: el mes anterior (la factura arriba a principis del mes següent)
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        document.getElementById('ft-mes').value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        ftRecalcular(true);
    }

    camps.forEach(function(c) { document.getElementById(c).disabled = !!soloLectura; });
    document.getElementById('ft-btn-guardar').style.display = soloLectura ? 'none' : 'inline-block';
    document.getElementById('ft-modal').style.display = 'block';
    ftActualitzarPanell();
}

// Recalcula imports. Si desdeHoresPreu = true recalcula també el net (hores x preu).
function ftRecalcular(desdeHoresPreu) {
    const hores = parseFloat(document.getElementById('ft-hores').value) || 0;
    const preu = parseFloat(document.getElementById('ft-preu').value) || 0;
    if (desdeHoresPreu && hores > 0 && preu > 0) {
        document.getElementById('ft-net').value = ftArrodonir(hores * preu).toFixed(2);
    }
    const net = parseFloat(document.getElementById('ft-net').value) || 0;
    const ivaPct = parseFloat(document.getElementById('ft-iva-pct').value) || 0;
    const iva = ftArrodonir(net * ivaPct / 100);
    document.getElementById('ft-iva').value = iva.toFixed(2);
    document.getElementById('ft-total').value = ftArrodonir(net + iva).toFixed(2);
}

// Panell: contrasta hores facturades amb les registrades al control horari
async function ftActualitzarPanell() {
    const panell = document.getElementById('ft-panell');
    const mes = document.getElementById('ft-mes').value;
    if (!panell) return;
    if (!mes) { panell.innerHTML = ''; return; }

    const token = ++ftPanellToken;
    try {
        const reg = await ftObtenirRegistrat(mes + '-01');
        if (token !== ftPanellToken) return;   // ha arribat una resposta més nova

        const hFact = parseFloat(document.getElementById('ft-hores').value) || 0;
        const net = parseFloat(document.getElementById('ft-net').value) || 0;
        const dif = reg.hores - hFact;
        const dev = hFact > 0 ? (dif / hFact) * 100 : null;
        const sem = ftSemafor(dev);

        let h = '<div style="background:#f5f5f5;border-left:4px solid ' + sem.color + ';padding:12px;border-radius:6px;font-size:13px;">';
        h += '<strong>📋 Control horari de ' + ftEsc(ftFormatMes(mes + '-01')) + ':</strong> ' + ftNum(reg.hores) + ' h · ' + ftNum(reg.cost) + ' €';
        if (reg.grups.length) {
            h += '<br><span style="color:#666;">' + reg.grups.map(function(g) {
                return ftEsc(g.nom) + ': ' + ftNum(g.hores) + ' h (' + g.registres + ' reg.)';
            }).join(' · ') + '</span>';
        } else {
            h += '<br><span style="color:#c62828;">No hi ha registres de temporers aquest mes.</span>';
        }
        if (hFact > 0) {
            h += '<br>' + sem.icona + ' Diferència vs facturat: <strong style="color:' + sem.color + ';">' + ftSigne(dif) + ' h' +
                 (dev != null ? ' (' + ftSigne(dev, 1) + '%)' : '') + '</strong>';
            if (net > 0) h += ' · sobrecost del registre: <strong>' + ftSigne(reg.cost - net) + ' €</strong>';
        }
        h += '</div>';
        panell.innerHTML = h;
    } catch (error) {
        if (token !== ftPanellToken) return;
        panell.innerHTML = '<div style="color:#c62828;font-size:13px;">No s\'ha pogut consultar el control horari: ' + ftEsc(error.message) + '</div>';
    }
}

// ============================================================
// GUARDAR / ELIMINAR
// ============================================================

async function ftGuardar(event) {
    event.preventDefault();

    const id = document.getElementById('ft-id').value;
    const mes = document.getElementById('ft-mes').value;           // YYYY-MM
    const hores = parseFloat(document.getElementById('ft-hores').value);
    const preu = parseFloat(document.getElementById('ft-preu').value);
    const net = parseFloat(document.getElementById('ft-net').value);

    if (!mes || isNaN(hores) || isNaN(preu) || isNaN(net)) {
        mostrarNotificacio('Cal omplir mes de servei, hores, preu i import net', 'error');
        return;
    }

    // Avís si hores x preu no quadra amb el net
    const esperat = ftArrodonir(hores * preu);
    if (Math.abs(esperat - net) > FT_TOLERANCIA_IMPORT) {
        if (!confirm('⚠️ Hores × preu = ' + ftNum(esperat) + ' € però l\'import net és ' + ftNum(net) + ' €.\n\nVols guardar igualment?')) {
            return;
        }
    }

    const dades = {
        num_factura: document.getElementById('ft-num').value.trim(),
        data_factura: document.getElementById('ft-data-factura').value,
        mes_servei: mes + '-01',                                     // la campanya la calcula el trigger
        proveidor: document.getElementById('ft-proveidor').value.trim() || FT_PROVEIDOR_DEFECTE,
        article: document.getElementById('ft-article').value.trim() || null,
        albara: document.getElementById('ft-albara').value.trim() || null,
        hores_facturades: hores,
        preu_hora: preu,
        import_net: net,
        iva_pct: parseFloat(document.getElementById('ft-iva-pct').value) || 0,
        import_iva: parseFloat(document.getElementById('ft-iva').value) || 0,
        import_total: parseFloat(document.getElementById('ft-total').value) || 0,
        data_venciment: document.getElementById('ft-venciment').value || null,
        observacions: document.getElementById('ft-obs').value.trim() || null
    };

    try {
        if (id) {
            dades.modificat_per = currentUser ? currentUser.id : null;
            dades.modificat_at = new Date().toISOString();
            const { error } = await supabaseClient.from('factures_temporers').update(dades).eq('id', id);
            if (error) throw error;
            mostrarNotificacio('Factura actualitzada', 'success');
        } else {
            dades.creat_per = currentUser ? currentUser.id : null;
            const { error } = await supabaseClient.from('factures_temporers').insert([dades]);
            if (error) throw error;
            mostrarNotificacio('Factura creada', 'success');
        }

        ftTancarModal();

        // Si la factura és d'una altra campanya, canviar el filtre perquè es vegi
        const campanyaFactura = parseInt(mes.slice(0, 4), 10);
        const sel = document.getElementById('ft-filtre-any');
        if (sel && parseInt(sel.value, 10) !== campanyaFactura) sel.value = String(campanyaFactura);
        await ftCarregarTaula();

    } catch (error) {
        console.error('Error guardant factura temporers:', error);
        if (error.code === '23505') {
            mostrarNotificacio('Ja existeix una factura amb aquest número', 'error');
        } else {
            mostrarNotificacio('Error: ' + error.message, 'error');
        }
    }
}

// Esborrat lògic (eliminat = true), com la resta de mòduls
async function ftEliminar(id) {
    if (!confirm('Segur que vols eliminar aquesta factura?')) return;
    try {
        const { error } = await supabaseClient
            .from('factures_temporers')
            .update({
                eliminat: true,
                eliminat_per: currentUser ? currentUser.id : null,
                eliminat_at: new Date().toISOString()
            })
            .eq('id', id);
        if (error) throw error;
        mostrarNotificacio('Factura eliminada', 'success');
        await ftCarregarTaula();
    } catch (error) {
        console.error('Error eliminant factura temporers:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

console.log('✅ Factures temporers UI v1 carregat');
