// ============================================================
// FACTURES-AIGUA-UI_V1.JS
// Pantalla d'alta i llistat de factures d'aigua ASG (Segarra-Garrigues)
// Patró: pinta directament a #view-container, botó propi al menú
// (igual que mostrarVistaBestreta()), sense tocar canviarVista()
// ============================================================

console.log('💧 Inicialitzant Factures Aigua ASG...');

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

    html += '<div id="form-factura-aigua-container" style="margin-bottom:20px;"></div>';

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

    await carregarTaulaFacturesAigua();
}

// ============================================================
// LLISTAT + VALIDACIÓ DE CONSUM
// ============================================================

async function carregarTaulaFacturesAigua() {
    const tbody = document.getElementById('tbody-factures-aigua');
    if (!tbody) return;

    try {
        const { data: factures, error } = await supabaseClient
            .from('factures_aigua_asg')
            .select('*, reg_configuracio(nom_finca)')
            .order('campanya', { ascending: false })
            .order('periode_inicial', { ascending: false });

        if (error) throw error;

        if (!factures || factures.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9">Encara no hi ha factures registrades.</td></tr>';
            return;
        }

        // Validar consum de totes les factures en paral·lel (RPC)
        const validacions = await Promise.all(
            factures.map(f => validarConsumFactura(f.num_explotacio, f.periode_inicial, f.periode_final, f.consum_m3_factura))
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
            html += `<td style="text-align:right;">${f.consum_m3_factura.toLocaleString('ca-ES')}</td>`;
            html += `<td style="text-align:right;">${v.consumReal.toLocaleString('ca-ES', {maximumFractionDigits:1})}</td>`;
            html += `<td>${badgeValidacio}</td>`;
            html += `<td style="text-align:right;">${f.total_asg.toLocaleString('ca-ES', {minimumFractionDigits:2})}</td>`;
            html += `<td style="text-align:right;">${f.total_comunitat.toLocaleString('ca-ES', {minimumFractionDigits:2})}</td>`;
            html += `<td style="text-align:right;font-weight:bold;">${f.import_total.toLocaleString('ca-ES', {minimumFractionDigits:2})}</td>`;
            html += `<td><button class="btn btn-secondary" onclick="obrirFormFacturaAigua(${f.id})" style="padding:4px 10px;">✏️</button></td>`;
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
async function validarConsumFactura(numExplotacio, periodeInicial, periodeFinal, consumFacturat) {
    try {
        const { data, error } = await supabaseClient
            .rpc('get_consum_reg_periode', {
                p_num_explotacio: numExplotacio,
                p_data_inici: periodeInicial,
                p_data_fi: periodeFinal
            });
        if (error) throw error;

        const consumReal = data || 0;
        const diferencia = consumFacturat - consumReal;
        const marge = Math.max(30, consumFacturat * 0.01);

        return {
            consumReal,
            diferencia,
            coincideix: Math.abs(diferencia) <= marge
        };
    } catch (e) {
        console.warn('No s\'ha pogut validar consum:', e.message);
        return { consumReal: 0, diferencia: 0, coincideix: true }; // no bloquejar la vista si falla el RPC
    }
}

// ============================================================
// FORMULARI ALTA / EDICIÓ
// ============================================================

async function obrirFormFacturaAigua(idFactura) {
    const container = document.getElementById('form-factura-aigua-container');
    if (!container) return;

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

    let html = `<div style="background:#f5f5f5;border-radius:8px;padding:20px;">`;
    html += `<h3>${idFactura ? 'Editar' : 'Nova'} factura d'aigua</h3>`;
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
    html += `<div><label>Lectura inicial</label><input type="number" id="fa-lectura-inicial" value="${f.lectura_inicial || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Lectura final</label><input type="number" id="fa-lectura-final" value="${f.lectura_final || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Consum facturat (m³)</label><input type="number" id="fa-consum-factura" value="${f.consum_m3_factura || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Regularització (m³)</label><input type="number" id="fa-regularitzacio" value="${f.regularitzacio_m3 || 0}" style="width:100%;padding:8px;"></div>`;
    html += '</div>';
    html += '<button class="btn btn-secondary" onclick="comprovarConsumForm()" style="margin-bottom:16px;">🔍 Comprovar amb consum real (reg)</button>';
    html += '<div id="fa-resultat-validacio" style="margin-bottom:16px;"></div>';

    html += '<h4>Bloc ASG — Aigües del Segarra-Garrigues, SA</h4>';
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px;">';
    html += `<div><label>Import consum (€)</label><input type="number" step="0.01" id="fa-import-consum" value="${f.import_consum || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Preu unitari consum (€/m³)</label><input type="number" step="0.0001" id="fa-preu-consum" value="${f.preu_unitari_consum || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Import tarifa fixa (€)</label><input type="number" step="0.01" id="fa-import-tarifa" value="${f.import_tarifa_fixa || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Preu unitari tarifa fixa (€/ha)</label><input type="number" step="0.01" id="fa-preu-tarifa" value="${f.preu_unitari_tarifa_fixa || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Deducció estalvi energia (€)</label><input type="number" step="0.01" id="fa-deduccio" value="${f.deduccio_estalvi_energia || 0}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>IVA (€)</label><input type="number" step="0.01" id="fa-iva" value="${f.iva || 0}" style="width:100%;padding:8px;"></div>`;
    html += '</div>';

    html += '<h4>Bloc Comunitat General de Regants</h4>';
    html += '<div style="background:#fff3e0;padding:8px;border-radius:4px;font-size:12px;margin-bottom:8px;">';
    html += '⚠️ El total d\'aquest bloc pot ser positiu (any sec) o negatiu (any humit, bonificacions superen cànons). Introdueix els imports amb el signe tal com surt a la factura.';
    html += '</div>';
    html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">';
    html += `<div><label>Cànon funcionament (€)</label><input type="number" step="0.01" id="fa-canon" value="${f.canon_funcionament || ''}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Bonificació CRSG (€)</label><input type="number" step="0.01" id="fa-bonificacio" value="${f.bonificacio_crsg || 0}" style="width:100%;padding:8px;"></div>`;
    html += `<div><label>Reducció CGRCSG (€)</label><input type="number" step="0.01" id="fa-reduccio" value="${f.reduccio_cgrcsg || 0}" style="width:100%;padding:8px;"></div>`;
    html += '</div>';

    html += '<div style="display:flex;gap:10px;">';
    html += `<button class="btn btn-primary" onclick="guardarFacturaAigua()">💾 Guardar</button>`;
    html += `<button class="btn btn-secondary" onclick="document.getElementById('form-factura-aigua-container').innerHTML=''">Cancel·lar</button>`;
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
}

// ============================================================
// SIMULACIÓ DE FACTURA PENDENT (consum real reg + tarifes vigents)
// ============================================================

async function obrirFormSimulacio() {
    const container = document.getElementById('form-factura-aigua-container');
    if (!container) return;

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

    container.innerHTML = html;
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
        document.getElementById('form-factura-aigua-container').innerHTML = '';
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
    const resultatDiv = document.getElementById('fa-resultat-validacio');

    if (!numExplotacio || !periodeInicial || !periodeFinal) {
        resultatDiv.innerHTML = '<span style="color:#e65100;">Omple finca i període abans de comprovar.</span>';
        return;
    }

    resultatDiv.innerHTML = 'Comprovant...';
    const v = await validarConsumFactura(numExplotacio, periodeInicial, periodeFinal, consumFacturat);

    if (v.coincideix) {
        resultatDiv.innerHTML = `<span style="color:#2e7d32;font-weight:bold;">✅ Consum coincident — reg: ${v.consumReal.toLocaleString('ca-ES', {maximumFractionDigits:1})} m³ (diferència: ${v.diferencia.toFixed(1)} m³)</span>`;
    } else {
        resultatDiv.innerHTML = `<span style="color:#e65100;font-weight:bold;">⚠️ Diferència notable — reg: ${v.consumReal.toLocaleString('ca-ES', {maximumFractionDigits:1})} m³ vs factura: ${consumFacturat} m³ (diferència: ${v.diferencia.toFixed(1)} m³). Revisa si falten dies a 'reg' per aquest període.</span>`;
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
        document.getElementById('form-factura-aigua-container').innerHTML = '';
        await carregarTaulaFacturesAigua();

    } catch (error) {
        console.error('❌ Error guardant factura aigua:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

console.log('✅ Factures Aigua UI carregat');
