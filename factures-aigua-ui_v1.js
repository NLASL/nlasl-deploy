// ============================================================
// FACTURES-AIGUA-UI_V1.JS
// Pantalla d'alta i llistat de factures d'aigua ASG (Segarra-Garrigues)
// Patró: pinta directament a #view-container, botó propi al menú
// (igual que mostrarVistaBestreta()), sense tocar canviarVista()
// ============================================================

console.log('💧 Inicialitzant Factures Aigua ASG...');

// ============================================================
// MODAL GENÈRIC (s'obre sempre a sobre, independent de l'scroll)
// ============================================================

function obrirModalAigua(contingutHtml) {
    tancarModalAigua(); // per si n'hi havia un altre obert

    const overlay = document.createElement('div');
    overlay.id = 'modal-aigua-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 2147483647;
        display: flex; align-items: flex-start; justify-content: center;
        overflow-y: auto; padding: 50px 15px;
    `;
    overlay.onclick = (e) => { if (e.target === overlay) tancarModalAigua(); };

    const box = document.createElement('div');
    box.style.cssText = `
        background: #fff; border-radius: 8px; max-width: 900px; width: 100%;
        position: relative; margin-bottom: 30px;
    `;
    box.innerHTML = `<button onclick="tancarModalAigua()" style="position:absolute;top:10px;right:14px;background:none;border:none;font-size:20px;cursor:pointer;color:#777;">✕</button>` + contingutHtml;

    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function tancarModalAigua() {
    const existent = document.getElementById('modal-aigua-overlay');
    if (existent) existent.remove();
}

// ============================================================
// VISTA PRINCIPAL
// ============================================================

async function mostrarVistaFacturesAigua() {
    const container = document.getElementById('view-container');
    if (!container) return;

    let html = '<div class="view-factures-aigua">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
    html += '<h2>💧 Factures Aigua — Segarra-Garrigues</h2>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<button class="btn btn-secondary" onclick="obrirFormSimulacio()">🔮 Simular pendent</button>';
    html += '<button class="btn btn-primary" onclick="obrirFormFacturaAigua()">➕ Nova Factura</button>';
    html += '</div></div>';

    html += '<div style="display:flex;gap:12px;margin-bottom:16px;align-items:center;">';
    html += '<label style="font-size:13px;color:#555;">Campanya:</label>';
    html += '<select id="filtre-campanya" onchange="carregarTaulaFacturesAigua()" style="padding:6px;"><option value="">Totes</option></select>';
    html += '<label style="font-size:13px;color:#555;">Finca:</label>';
    html += '<select id="filtre-finca" onchange="carregarTaulaFacturesAigua()" style="padding:6px;"><option value="">Totes</option></select>';
    html += '</div>';

    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Finca</th><th>Campanya</th><th>Estat</th><th>Període</th>';
    html += '<th style="text-align:right;">Consum factura (m³)</th>';
    html += '<th style="text-align:right;">Consum reg (m³)</th>';
    html += '<th>Validació</th>';
    html += '<th style="text-align:right;">Total ASG (€)</th>';
    html += '<th style="text-align:right;">Total Comunitat (€)</th>';
    html += '<th style="text-align:right;">Import total (€)</th>';
    html += '<th></th>';
    html += '</tr></thead>';
    html += '<tbody id="tbody-factures-aigua"><tr><td colspan="9">Carregant...</td></tr></tbody>';
    html += '</table></div>';
    html += '</div>';

    container.innerHTML = html;

    await carregarOpcionsFiltres();
    await carregarTaulaFacturesAigua();
}

async function carregarOpcionsFiltres() {
    try {
        const { data: finques } = await supabaseClient
            .from('reg_configuracio')
            .select('num_explotacio, nom_finca')
            .eq('actiu', true)
            .order('nom_finca');

        const selectFinca = document.getElementById('filtre-finca');
        if (selectFinca && finques) {
            selectFinca.innerHTML = '<option value="">Totes</option>' +
                finques.map(fi => `<option value="${fi.num_explotacio}">${fi.nom_finca}</option>`).join('');
        }

        const { data: factures } = await supabaseClient
            .from('factures_aigua_asg')
            .select('campanya');

        const selectCampanya = document.getElementById('filtre-campanya');
        if (selectCampanya && factures) {
            const campanyes = [...new Set(factures.map(f => f.campanya))].sort((a, b) => b - a);
            selectCampanya.innerHTML = '<option value="">Totes</option>' +
                campanyes.map(c => `<option value="${c}">${c}</option>`).join('');
        }
    } catch (error) {
        console.warn('No s\'han pogut carregar els filtres:', error.message);
    }
}

// ============================================================
// LLISTAT + VALIDACIÓ DE CONSUM
// ============================================================

async function carregarTaulaFacturesAigua() {
    const tbody = document.getElementById('tbody-factures-aigua');
    if (!tbody) return;

    try {
        const filtreCampanya = document.getElementById('filtre-campanya')?.value;
        const filtreFinca = document.getElementById('filtre-finca')?.value;

        let query = supabaseClient
            .from('factures_aigua_asg')
            .select('*, reg_configuracio(nom_finca)')
            .order('campanya', { ascending: false })
            .order('periode_inicial', { ascending: false });

        if (filtreCampanya) query = query.eq('campanya', filtreCampanya);
        if (filtreFinca) query = query.eq('num_explotacio', filtreFinca);

        const { data: factures, error } = await query;

        if (error) throw error;

        if (!factures || factures.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9">Encara no hi ha factures registrades.</td></tr>';
            return;
        }

        // Validar consum de totes les factures en paral·lel (RPC)
        // Es compara reg amb (consum facturat + regularització), no només el consum facturat.
        const validacions = await Promise.all(
            factures.map(f => validarConsumFactura(f.num_explotacio, f.periode_inicial, f.periode_final, f.consum_m3_factura, f.regularitzacio_m3))
        );

        let html = '';
        factures.forEach((f, i) => {
            const v = validacions[i];
            const nomFinca = f.reg_configuracio?.nom_finca || f.num_explotacio;
            const badgeValidacio = v.coincideix
                ? '<span style="color:#2e7d32;font-weight:bold;">✅ OK</span>'
                : `<span style="color:#e65100;font-weight:bold;" title="Diferència: ${v.diferencia.toFixed(1)} m³">⚠️ Revisar</span>`;

            const badgeEstat = f.estat === 'simulada'
                ? '<span style="background:#ede7f6;color:#5e35b1;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;">🔮 Simulada</span>'
                : '<span style="background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:bold;">✅ Real</span>';

            html += '<tr>';
            html += `<td><strong>${nomFinca}</strong></td>`;
            html += `<td>${f.campanya}</td>`;
            html += `<td>${badgeEstat}</td>`;
            html += `<td>${formatData(f.periode_inicial)} – ${formatData(f.periode_final)}</td>`;
            const sufixRegularitzacio = f.regularitzacio_m3 ? ` <span style="color:#777;font-size:11px;" title="Inclou regularització de ${f.regularitzacio_m3} m³">(+${f.regularitzacio_m3})</span>` : '';
            html += `<td style="text-align:right;">${f.consum_m3_factura.toLocaleString('ca-ES')}${sufixRegularitzacio}</td>`;
            html += `<td style="text-align:right;">${v.consumReal.toLocaleString('ca-ES', {maximumFractionDigits:1})}</td>`;
            html += `<td>${badgeValidacio}</td>`;
            html += `<td style="text-align:right;">${f.total_asg.toLocaleString('ca-ES', {minimumFractionDigits:2})}</td>`;
            html += `<td style="text-align:right;">${f.total_comunitat.toLocaleString('ca-ES', {minimumFractionDigits:2})}</td>`;
            html += `<td style="text-align:right;font-weight:bold;">${f.import_total.toLocaleString('ca-ES', {minimumFractionDigits:2})}</td>`;
            html += `<td>`;
            html += `<button class="btn btn-secondary" onclick="obrirFormFacturaAigua(${f.id}, true)" style="padding:4px 10px;margin-right:4px;" title="Veure">👁️</button>`;
            html += `<button class="btn btn-secondary" onclick="obrirFormFacturaAigua(${f.id}, false)" style="padding:4px 10px;" title="Editar">✏️</button>`;
            html += `</td>`;
            html += '</tr>';
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error('❌ Error carregant factures aigua:', error);
        tbody.innerHTML = `<tr><td colspan="9">❌ Error: ${error.message}</td></tr>`;
    }
}

// Marge de tolerància: 1% del consum facturat o 30 m³, el que sigui més gran.
// Calibrat amb dades reals (factura 44445: diferència de 24 m³ sobre 6.293,
// deguda a desajust normal entre comptador acumulatiu i telemetria diària,
// no a dades que falten).
//
// IMPORTANT: es compara 'reg' amb (consum_m3_factura + regularitzacio_m3),
// no només amb el consum facturat. La regularització és precisament
// l'ajust que reconcilia la lectura del comptador amb el consum real
// (p.ex. factura Alfés 3 2025: 8.404 + 193 = 8.597, exactament el de 'reg').
async function validarConsumFactura(numExplotacio, periodeInicial, periodeFinal, consumFacturat, regularitzacioM3 = 0) {
    try {
        const { data, error } = await supabaseClient
            .rpc('get_consum_reg_periode', {
                p_num_explotacio: numExplotacio,
                p_data_inici: periodeInicial,
                p_data_fi: periodeFinal
            });
        if (error) throw error;

        const consumReal = data || 0;
        const consumFacturatAjustat = consumFacturat + (regularitzacioM3 || 0);
        const diferencia = consumFacturatAjustat - consumReal;
        const marge = Math.max(30, consumFacturatAjustat * 0.01);

        return {
            consumReal,
            consumFacturatAjustat,
            diferencia,
            coincideix: Math.abs(diferencia) <= marge
        };
    } catch (e) {
        console.warn('No s\'ha pogut validar consum:', e.message);
        return { consumReal: 0, consumFacturatAjustat: consumFacturat, diferencia: 0, coincideix: true };
    }
}

// ============================================================
// FORMULARI ALTA / EDICIÓ
// ============================================================

async function obrirFormFacturaAigua(idFactura, nomesLectura = false) {
    let factura = null;
    if (idFactura) {
        const { data, error } = await supabaseClient
            .from('factures_aigua_asg')
            .select('*')
            .eq('id', idFactura)
            .single();
        if (!error) factura = data;
    }

    // Finques amb contracte ASG (ajusta el filtre si reg_configuracio
    // distingeix explícitament el canal, p.ex. .eq('canal', 'segarra-garrigues')
    const { data: finques } = await supabaseClient
        .from('reg_configuracio')
        .select('num_explotacio, nom_finca')
        .eq('actiu', true)
        .order('nom_finca');

    const f = factura || {};
    const opcionsFinca = (finques || [])
        .map(fi => `<option value="${fi.num_explotacio}" ${fi.num_explotacio === f.num_explotacio ? 'selected' : ''}>${fi.nom_finca}</option>`)
        .join('');

    const titol = nomesLectura ? '👁️ Veure' : (idFactura ? '✏️ Editar' : '➕ Nova');
    let html = `<div style="background:#f5f5f5;border-radius:8px;padding:20px;">`;
    html += `<h3>${titol} factura d'aigua</h3>`;
    html += `<input type="hidden" id="fa-id" value="${idFactura || ''}">`;

    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">';
    html += `<div><label>Finca</label><select id="fa-explotacio" style="width:100%;padding:8px;">${opcionsFinca}</select></div>`;
    html += `<div><label>Data emissió</label><input type="date" id="fa-data-emissio" value="${f.data_emissio || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Data venciment</label><input type="date" id="fa-data-venciment" value="${f.data_venciment || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Període inicial</label><input type="date" id="fa-periode-inicial" value="${f.periode_inicial || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Període final</label><input type="date" id="fa-periode-final" value="${f.periode_final || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Núm. factura ASG</label><input type="text" id="fa-num-asg" value="${f.num_factura_asg || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Núm. factura Comunitat</label><input type="text" id="fa-num-comunitat" value="${f.num_factura_comunitat || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Estat</label><select id="fa-estat" style="width:100%;padding:8px;">`;
    html += `<option value="real" ${(!f.estat || f.estat === 'real') ? 'selected' : ''}>✅ Real (factura oficial)</option>`;
    html += `<option value="simulada" ${f.estat === 'simulada' ? 'selected' : ''}>🔮 Simulada (estimació)</option>`;
    html += `</select></div>`;
    html += '</div>';

    html += '<h4>Lectura i consum</h4>';
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px;">';
    html += `<div><label>Lectura inicial</label><input type="number" id="fa-lectura-inicial" value="${f.lectura_inicial || ''}" oninput="autocalcularConsumFactura()" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Lectura final</label><input type="number" id="fa-lectura-final" value="${f.lectura_final || ''}" oninput="autocalcularConsumFactura()" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Consum facturat (m³) <span style="font-weight:normal;font-size:11px;color:#777;">auto, editable</span></label><input type="number" id="fa-consum-factura" value="${f.consum_m3_factura || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Regularització (m³)</label><input type="number" id="fa-regularitzacio" value="${f.regularitzacio_m3 || 0}" style="width:100%;padding:8px;"></div>`;
    html += '</div>';
    html += '<button class="btn btn-secondary" onclick="comprovarConsumForm()" style="margin-bottom:16px;">🔍 Comprovar amb consum real (reg)</button>';
    html += '<div id="fa-resultat-validacio" style="margin-bottom:16px;"></div>';

    html += '<h4>Bloc ASG — Aigües del Segarra-Garrigues, SA</h4>';
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px;">';
    html += `<div><label>Import consum (€)</label><input type="number" step="0.01" id="fa-import-consum" value="${f.import_consum || ''}" oninput="recalcularTotalsForm()" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Preu unitari consum (€/m³)</label><input type="number" step="0.0001" id="fa-preu-consum" value="${f.preu_unitari_consum || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Import tarifa fixa (€)</label><input type="number" step="0.01" id="fa-import-tarifa" value="${f.import_tarifa_fixa || ''}" oninput="recalcularTotalsForm()" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Preu unitari tarifa fixa (€/ha)</label><input type="number" step="0.01" id="fa-preu-tarifa" value="${f.preu_unitari_tarifa_fixa || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Deducció estalvi energia (€)</label><input type="number" step="0.01" id="fa-deduccio" value="${f.deduccio_estalvi_energia || 0}" oninput="recalcularTotalsForm()" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>IVA (€)</label><input type="number" step="0.01" id="fa-iva" value="${f.iva || 0}" oninput="recalcularTotalsForm()" style="width:100%;padding:8px;"></div>`;
    html += '</div>';
    html += `<div style="text-align:right;font-weight:bold;margin-bottom:16px;">Total ASG: <span id="fa-total-asg-viu">0.00</span> €</div>`;

    html += '<h4>Bloc Comunitat General de Regants</h4>';
    html += '<div style="background:#fff3e0;padding:8px;border-radius:4px;font-size:12px;margin-bottom:8px;">';
    html += '⚠️ El total d\'aquest bloc pot ser positiu (any sec) o negatiu (any humit, bonificacions superen cànons). Introdueix els imports amb el signe tal com surt a la factura.';
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:8px;">';
    html += `<div><label>Cànon funcionament (€)</label><input type="number" step="0.01" id="fa-canon" value="${f.canon_funcionament || ''}" oninput="recalcularTotalsForm()" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Bonificació CRSG (€)</label><input type="number" step="0.01" id="fa-bonificacio" value="${f.bonificacio_crsg || 0}" oninput="recalcularTotalsForm()" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Reducció CGRCSG (€)</label><input type="number" step="0.01" id="fa-reduccio" value="${f.reduccio_cgrcsg || 0}" oninput="recalcularTotalsForm()" style="width:100%;padding:8px;"></div>`;
    html += '</div>';
    html += `<div style="text-align:right;font-weight:bold;margin-bottom:8px;">Total Comunitat: <span id="fa-total-comunitat-viu">0.00</span> €</div>`;
    html += `<div style="text-align:right;font-weight:bold;font-size:16px;background:#f5f5f5;padding:10px;border-radius:6px;margin-bottom:16px;">IMPORT TOTAL FACTURA: <span id="fa-import-total-viu">0.00</span> €</div>`;

    html += '<div style="display:flex;gap:10px;">';
    if (!nomesLectura) {
        html += `<button class="btn btn-primary" onclick="guardarFacturaAigua()">💾 Guardar</button>`;
    }
    html += `<button class="btn btn-secondary" onclick="tancarModalAigua()">${nomesLectura ? 'Tancar' : 'Cancel·lar'}</button>`;
    html += '</div>';
    html += '</div>';

    obrirModalAigua(html);
    recalcularTotalsForm();

    if (nomesLectura) {
        document.querySelectorAll('#modal-aigua-overlay input, #modal-aigua-overlay select')
            .forEach(el => el.disabled = true);
    }
}

// Recalcula Total ASG / Total Comunitat / Import Total en viu,
// mirall exacte de la fórmula del trigger SQL (trg_factures_aigua_calcular).
function recalcularTotalsForm() {
    const num = (id) => parseFloat(document.getElementById(id)?.value) || 0;

    const totalAsg = num('fa-import-consum') + num('fa-import-tarifa') + num('fa-deduccio') + num('fa-iva');
    const totalComunitat = num('fa-canon') + num('fa-bonificacio') + num('fa-reduccio');
    const importTotal = totalAsg + totalComunitat;

    const elAsg = document.getElementById('fa-total-asg-viu');
    const elCom = document.getElementById('fa-total-comunitat-viu');
    const elTot = document.getElementById('fa-import-total-viu');
    if (elAsg) elAsg.textContent = totalAsg.toLocaleString('ca-ES', {minimumFractionDigits:2});
    if (elCom) elCom.textContent = totalComunitat.toLocaleString('ca-ES', {minimumFractionDigits:2});
    if (elTot) elTot.textContent = importTotal.toLocaleString('ca-ES', {minimumFractionDigits:2});
}

// Lectura final - lectura inicial = consum facturat. Es recalcula sol
// cada cop que canvia una lectura, però el camp segueix sent editable
// per si cal ajustar-lo manualment (canvi de comptador, etc.).
function autocalcularConsumFactura() {
    const inicial = parseFloat(document.getElementById('fa-lectura-inicial')?.value);
    const final = parseFloat(document.getElementById('fa-lectura-final')?.value);
    if (!isNaN(inicial) && !isNaN(final)) {
        document.getElementById('fa-consum-factura').value = (final - inicial).toFixed(0);
    }
}

// ============================================================
// SIMULACIÓ DE FACTURA PENDENT (consum real reg + tarifes vigents)
// ============================================================

async function obrirFormSimulacio() {
    const { data: finques } = await supabaseClient
        .from('reg_configuracio')
        .select('num_explotacio, nom_finca')
        .eq('actiu', true)
        .order('nom_finca');

    const opcionsFinca = (finques || [])
        .map(fi => `<option value="${fi.num_explotacio}">${fi.nom_finca}</option>`)
        .join('');

    const avui = new Date().toISOString().split('T')[0];
    const any = new Date().getFullYear();

    let html = '<div style="background:#ede7f6;border-radius:8px;padding:20px;">';
    html += '<h3>🔮 Simular factura pendent</h3>';
    html += '<div style="font-size:12px;color:#5e35b1;margin-bottom:12px;">';
    html += 'Calcula un import estimat a partir del consum real registrat a \'reg\' i les tarifes vigents conegudes. ';
    html += 'Útil per avaluar una campanya en curs abans que arribi la factura oficial (que es factura 2 cops l\'any, 31/07 i 31/12).';
    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">';
    html += `<div><label>Finca</label><select id="sim-explotacio" style="width:100%;padding:8px;">${opcionsFinca}</select></div>`;
    html += `<div><label>Període inicial</label><input type="date" id="sim-periode-inicial" value="${any}-08-01" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Període final (fins avui si no acaba)</label><input type="date" id="sim-periode-final" value="${avui}" style="width:100%;padding:8px;"></div>`;
    html += '</div>';

    html += '<button class="btn btn-secondary" onclick="calcularSimulacio()">🔮 Calcular estimació</button>';
    html += '<div id="sim-resultat" style="margin-top:16px;"></div>';
    html += '</div>';

    obrirModalAigua(html);
}

async function calcularSimulacio() {
    const numExplotacio = document.getElementById('sim-explotacio').value;
    const periodeInicial = document.getElementById('sim-periode-inicial').value;
    const periodeFinal = document.getElementById('sim-periode-final').value;
    const resultatDiv = document.getElementById('sim-resultat');

    resultatDiv.innerHTML = 'Calculant...';

    try {
        const { data, error } = await supabaseClient
            .rpc('simular_factura_aigua', {
                p_num_explotacio: numExplotacio,
                p_periode_inicial: periodeInicial,
                p_periode_final: periodeFinal
            });
        if (error) throw error;

        const r = data[0];
        const avui = new Date().toISOString().split('T')[0];
        const periodeIncomplet = periodeFinal >= avui;

        let html = '';
        if (periodeIncomplet) {
            html += '<div style="background:#fff3e0;padding:8px;border-radius:4px;font-size:12px;margin-bottom:10px;">';
            html += '⚠️ El període encara no ha acabat: el consum és parcial (fins avui), no el total que sortirà a la factura final.';
            html += '</div>';
        }

        html += `<table class="data-table" style="width:100%;margin-bottom:12px;">`;
        html += `<tr><td>Consum real (reg)</td><td style="text-align:right;">${r.consum_m3.toLocaleString('ca-ES',{maximumFractionDigits:1})} m³</td></tr>`;
        html += `<tr><td>Import consum</td><td style="text-align:right;">${r.import_consum.toFixed(2)} €</td></tr>`;
        html += `<tr><td>Tarifa fixa (proporcional)</td><td style="text-align:right;">${r.import_tarifa_fixa.toFixed(2)} €</td></tr>`;
        html += `<tr><td>Deducció estalvi energia</td><td style="text-align:right;">${r.deduccio_estalvi_energia.toFixed(2)} €</td></tr>`;
        html += `<tr><td>IVA</td><td style="text-align:right;">${r.iva.toFixed(2)} €</td></tr>`;
        html += `<tr style="font-weight:bold;"><td>Total ASG (estimat)</td><td style="text-align:right;">${r.total_asg.toFixed(2)} €</td></tr>`;
        html += `<tr><td>Cànon funcionament</td><td style="text-align:right;">${r.canon_funcionament.toFixed(2)} €</td></tr>`;
        html += `<tr><td>Bonificació CRSG</td><td style="text-align:right;">${r.bonificacio_crsg.toFixed(2)} €</td></tr>`;
        html += `<tr><td>Reducció CGRCSG</td><td style="text-align:right;">${r.reduccio_cgrcsg.toFixed(2)} €</td></tr>`;
        html += `<tr style="font-weight:bold;"><td>Total Comunitat (estimat)</td><td style="text-align:right;">${r.total_comunitat.toFixed(2)} €</td></tr>`;
        html += `<tr style="font-weight:bold;background:#f5f5f5;"><td>IMPORT TOTAL ESTIMAT</td><td style="text-align:right;">${r.import_total_estimat.toFixed(2)} €</td></tr>`;
        html += '</table>';
        html += `<div style="font-size:11px;color:#777;margin-bottom:12px;">Tarifa vigent des de ${formatData(r.tarifa_vigent_des)}${r.tarifa_nota ? ' — ' + r.tarifa_nota : ''}. El cànon de comunitat pot variar quan arribi la factura real segons l'any hidrològic.</div>`;

        html += `<button class="btn btn-primary" onclick="guardarSimulacioComFactura(${JSON.stringify({numExplotacio, periodeInicial, periodeFinal, ...r}).replace(/"/g, '&quot;')})">💾 Guardar com a factura simulada</button>`;

        resultatDiv.innerHTML = html;

    } catch (error) {
        console.error('❌ Error simulant factura:', error);
        resultatDiv.innerHTML = `❌ Error: ${error.message}`;
    }
}

async function guardarSimulacioComFactura(r) {
    try {
        const registre = {
            num_explotacio: r.numExplotacio,
            data_emissio: r.periodeFinal, // data de referència, no és emissió real
            periode_inicial: r.periodeInicial,
            periode_final: r.periodeFinal,
            consum_m3_factura: r.consum_m3,
            import_consum: r.import_consum,
            import_tarifa_fixa: r.import_tarifa_fixa,
            deduccio_estalvi_energia: r.deduccio_estalvi_energia,
            iva: r.iva,
            canon_funcionament: r.canon_funcionament,
            bonificacio_crsg: r.bonificacio_crsg,
            reduccio_cgrcsg: r.reduccio_cgrcsg,
            estat: 'simulada'
        };

        const { error } = await supabaseClient.from('factures_aigua_asg').upsert(registre, {
            onConflict: 'num_explotacio,periode_inicial,periode_final'
        });
        if (error) throw error;

        mostrarNotificacio('Simulació guardada — recorda substituir-la per la factura real quan arribi', 'success');
        tancarModalAigua();
        await carregarOpcionsFiltres();
        await carregarTaulaFacturesAigua();

    } catch (error) {
        console.error('❌ Error guardant simulació:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function comprovarConsumForm() {
    const numExplotacio = document.getElementById('fa-explotacio').value;
    const periodeInicial = document.getElementById('fa-periode-inicial').value;
    const periodeFinal = document.getElementById('fa-periode-final').value;
    const consumFacturat = parseFloat(document.getElementById('fa-consum-factura').value) || 0;
    const regularitzacio = parseFloat(document.getElementById('fa-regularitzacio').value) || 0;
    const resultatDiv = document.getElementById('fa-resultat-validacio');

    if (!numExplotacio || !periodeInicial || !periodeFinal) {
        resultatDiv.innerHTML = '<span style="color:#e65100;">Omple finca i període abans de comprovar.</span>';
        return;
    }

    resultatDiv.innerHTML = 'Comprovant...';
    const v = await validarConsumFactura(numExplotacio, periodeInicial, periodeFinal, consumFacturat, regularitzacio);

    if (v.coincideix) {
        resultatDiv.innerHTML = `<span style="color:#2e7d32;font-weight:bold;">✅ Consum coincident — reg: ${v.consumReal.toLocaleString('ca-ES', {maximumFractionDigits:1})} m³ vs facturat+regularització: ${v.consumFacturatAjustat.toLocaleString('ca-ES')} m³ (diferència: ${v.diferencia.toFixed(1)} m³)</span>`;
    } else {
        resultatDiv.innerHTML = `<span style="color:#e65100;font-weight:bold;">⚠️ Diferència notable — reg: ${v.consumReal.toLocaleString('ca-ES', {maximumFractionDigits:1})} m³ vs facturat+regularització: ${v.consumFacturatAjustat.toLocaleString('ca-ES')} m³ (diferència: ${v.diferencia.toFixed(1)} m³). Revisa si falten dies a 'reg' o si la regularització és correcta.</span>`;
    }
}

async function guardarFacturaAigua() {
    try {
        const registre = {
            num_explotacio: document.getElementById('fa-explotacio').value,
            data_emissio: document.getElementById('fa-data-emissio').value,
            data_venciment: document.getElementById('fa-data-venciment').value || null,
            periode_inicial: document.getElementById('fa-periode-inicial').value,
            periode_final: document.getElementById('fa-periode-final').value,
            num_factura_asg: document.getElementById('fa-num-asg').value || null,
            num_factura_comunitat: document.getElementById('fa-num-comunitat').value || null,
            lectura_inicial: parseFloat(document.getElementById('fa-lectura-inicial').value) || null,
            lectura_final: parseFloat(document.getElementById('fa-lectura-final').value) || null,
            consum_m3_factura: parseFloat(document.getElementById('fa-consum-factura').value) || 0,
            regularitzacio_m3: parseFloat(document.getElementById('fa-regularitzacio').value) || 0,
            import_consum: parseFloat(document.getElementById('fa-import-consum').value) || 0,
            preu_unitari_consum: parseFloat(document.getElementById('fa-preu-consum').value) || null,
            import_tarifa_fixa: parseFloat(document.getElementById('fa-import-tarifa').value) || 0,
            preu_unitari_tarifa_fixa: parseFloat(document.getElementById('fa-preu-tarifa').value) || null,
            deduccio_estalvi_energia: parseFloat(document.getElementById('fa-deduccio').value) || 0,
            iva: parseFloat(document.getElementById('fa-iva').value) || 0,
            canon_funcionament: parseFloat(document.getElementById('fa-canon').value) || 0,
            bonificacio_crsg: parseFloat(document.getElementById('fa-bonificacio').value) || 0,
            reduccio_cgrcsg: parseFloat(document.getElementById('fa-reduccio').value) || 0,
            estat: document.getElementById('fa-estat').value
            // total_asg, total_comunitat, import_total i campanya es calculen per trigger
        };

        if (!registre.num_explotacio || !registre.periode_inicial || !registre.periode_final) {
            mostrarNotificacio('Omple finca i període abans de guardar', 'error');
            return;
        }

        const idFactura = document.getElementById('fa-id').value;
        let error;
        if (idFactura) {
            ({ error } = await supabaseClient.from('factures_aigua_asg').update(registre).eq('id', idFactura));
        } else {
            ({ error } = await supabaseClient.from('factures_aigua_asg').insert(registre));
        }

        if (error) throw error;

        mostrarNotificacio('Factura guardada correctament', 'success');
        tancarModalAigua();
        await carregarOpcionsFiltres();
        await carregarTaulaFacturesAigua();

    } catch (error) {
        console.error('❌ Error guardant factura aigua:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

console.log('✅ Factures Aigua UI carregat');
