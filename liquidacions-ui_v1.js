// ============================================================
// LIQUIDACIONS-UI.V1.JS - Vista Liquidacions Collita
// Segueix els mateixos patrons que collita-ui_v1.js
// (modal via document.createElement, tancarModal(), .data-table)
// ============================================================

let liquidacioCampanyaActiva = null;
let liquidacioModalId = null; // id de la liquidació oberta al modal (null = nova)

// ============================================================
// VISTA PRINCIPAL — LLISTA
// ============================================================

async function mostrarVistaLiquidacions() {
    const container = document.getElementById('view-container');
    if (!container) return;

    const ara = new Date();
    const mes = ara.getMonth() + 1;
    const campanyadefecte = mes >= 10 ? ara.getFullYear() + 1 : ara.getFullYear();
    if (!liquidacioCampanyaActiva) liquidacioCampanyaActiva = campanyadefecte;

    let html = '<div class="vista-liquidacions">';
    html += '<h2>💰 Collita - Liquidacions</h2>';

    // Navegació - botons (mateix patró que Entrades/Escandalls)
    html += '<div style="margin-bottom:15px; border-bottom:2px solid #ddd; padding-bottom:10px;">';
    html += '<button class="btn btn-primary" onclick="obrirModalLiquidacio()" style="margin-right:10px;">➕ Nova Liquidació</button>';
    html += '<button class="btn btn-secondary" onclick="canviarVistaCollita(\'entrades\')" style="margin-right:10px;">← Entrades</button>';
    html += '<button class="btn btn-secondary" onclick="canviarVistaCollita(\'escandalls\')">→ Escandalls</button>';
    html += '</div>';

    // Filtres
    html += '<div style="display:flex; gap:15px; align-items:flex-end; margin-bottom:15px; flex-wrap:wrap; background:#f5f5f5; padding:12px; border-radius:8px;">';
    html += '<div><label style="display:block; font-size:0.85em; margin-bottom:3px;"><strong>Campanya</strong></label>';
    html += '<select id="filtre-campanya-liquidacio" onchange="liquidacioCampanyaActiva=parseInt(this.value);mostrarTaulaLiquidacions();" style="padding:6px; border-radius:4px; border:1px solid #ddd;">';
    [campanyadefecte, campanyadefecte - 1, campanyadefecte - 2].forEach(function(c) {
        html += '<option value="' + c + '"' + (c === liquidacioCampanyaActiva ? ' selected' : '') + '>' + c + '</option>';
    });
    html += '</select></div>';
    html += '</div>';

    html += '<div id="liquidacions-content"></div>';
    html += '</div>';

    container.innerHTML = html;
    await mostrarTaulaLiquidacions();
}

async function mostrarTaulaLiquidacions() {
    const content = document.getElementById('liquidacions-content');
    if (!content) return;

    content.innerHTML = '<p>⏳ Carregant liquidacions...</p>';

    try {
        const liquidacions = await getLiquidacions({ campanya: liquidacioCampanyaActiva });

        if (liquidacions.length === 0) {
            content.innerHTML = '<p style="color:#888;">No hi ha liquidacions per aquesta campanya.</p>';
            return;
        }

        let html = '<table class="data-table" style="width:100%;">';
        html += '<thead><tr>';
        html += '<th>Fruita / Varietat</th><th>Data liquidació</th>';
        html += '<th style="text-align:right;">Kg total</th>';
        html += '<th style="text-align:right;">Import brut</th>';
        html += '<th style="text-align:right;">Bestretes</th>';
        html += '<th style="text-align:right;">Net a pagar</th>';
        html += '<th>Estat</th><th>Accions</th>';
        html += '</tr></thead><tbody>';

        liquidacions.forEach(function(liq) {
            const fruita = (typeof fruites !== 'undefined' ? fruites.find(function(f) { return f.id === liq.fruita_id; }) : null);
            const varietat = (typeof varietats !== 'undefined' ? varietats.find(function(v) { return v.id === liq.varietat_id; }) : null);
            const nomFruita = fruita ? fruita.nom : '—';
            const nomVarietat = varietat ? varietat.varietat : 'Totes';
            const colorEstat = liq.estat === 'tancada' ? '#2d5016' : '#b8860b';

            html += '<tr>';
            html += '<td>' + nomFruita + ' / ' + nomVarietat + '</td>';
            html += '<td>' + formatData(liq.data_liquidacio) + '</td>';
            html += '<td style="text-align:right;">' + Number(liq.kg_total).toLocaleString('ca-ES') + '</td>';
            html += '<td style="text-align:right;">' + Number(liq.import_brut).toFixed(2) + ' €</td>';
            html += '<td style="text-align:right;">' + Number(liq.import_bestretes).toFixed(2) + ' €</td>';
            html += '<td style="text-align:right;"><strong>' + Number(liq.import_net).toFixed(2) + ' €</strong></td>';
            html += '<td><span style="color:' + colorEstat + ';font-weight:600;">' + liq.estat + '</span></td>';
            html += '<td><button class="btn btn-secondary" onclick="obrirModalLiquidacio(\'' + liq.id + '\')">✏️ Obrir</button></td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        content.innerHTML = html;
    } catch (error) {
        content.innerHTML = '<p style="color:#c0392b;">Error carregant liquidacions.</p>';
        console.error(error);
    }
}

// ============================================================
// MODAL CAPÇALERA + LÍNIES
// (mateix patró que modal-nova-entrada-cereal a collita-ui_v1.js)
// ============================================================

async function obrirModalLiquidacio(id) {
    id = id || null;
    liquidacioModalId = id;
    const liquidacio = id ? await getLiquidacio(id) : null;
    const linies = id ? await getLiquidacioLinies(id) : [];

    const opcionsFruites = (typeof fruites !== 'undefined' ? fruites : [])
        .map(function(f) { return '<option value="' + f.id + '"' + (liquidacio && liquidacio.fruita_id === f.id ? ' selected' : '') + '>' + f.nom + '</option>'; })
        .join('');

    const anterior = document.getElementById('modal-liquidacio');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-liquidacio';
    modal.className = 'modal';
    modal.style.display = 'block';

    let linesHtml = '';
    if (liquidacio) {
        linesHtml = `
            <div id="liquidacio-totals-resum" style="display:flex;gap:20px;margin:15px 0;padding:10px;background:#f5f5f5;border-radius:6px;">
                <span>Kg total: <strong>${liquidacio.kg_total}</strong></span>
                <span>Import brut: <strong>${Number(liquidacio.import_brut).toFixed(2)} €</strong></span>
                <span>Net a pagar: <strong>${Number(liquidacio.import_net).toFixed(2)} €</strong></span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                <h4 style="margin:0;">Línies (calibre / qualitat / preu)</h4>
                <div>
                    <button class="btn btn-info" onclick="generarLiniesDesEscandall()" style="margin-right:8px;">⚙️ Generar des d'escandalls</button>
                    <button class="btn btn-secondary" onclick="afegirLiniaManualForm()">+ Línia manual</button>
                </div>
            </div>
            <table class="data-table" style="width:100%;">
                <thead><tr><th>Qualitat</th><th>Calibre</th><th>FNC</th><th style="text-align:right;">Kg</th><th style="text-align:right;">Preu/kg</th><th style="text-align:right;">Import</th><th></th></tr></thead>
                <tbody id="liquidacio-linies-tbody">${ordenarLiniesLiquidacio(linies).map(renderFilaLinia).join('')}</tbody>
            </table>
            <div style="text-align:right;margin-top:10px;">
                <button class="btn btn-primary" onclick="guardarTotsElsPreus()">💾 Guardar tots els preus</button>
            </div>
            <div id="fila-nova-linia-container"></div>
        `;
    } else {
        linesHtml = '<p style="color:#888;margin-top:15px;">Guarda la capçalera per poder afegir línies.</p>';
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width:900px;max-height:85vh;overflow-y:auto;margin-top:20px;margin-bottom:20px;">
            <span class="close" onclick="tancarModal('modal-liquidacio')">&times;</span>
            <h2>💰 ${id ? 'Editar' : 'Nova'} Liquidació</h2>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
                <div class="form-group">
                    <label>Campanya *</label>
                    <input type="number" id="liq-campanya" value="${liquidacio ? liquidacio.campanya : liquidacioCampanyaActiva}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
                <div class="form-group">
                    <label>Fruita *</label>
                    <select id="liq-fruita" onchange="onCanviFruitaLiquidacio()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        <option value="">-- Selecciona --</option>
                        ${opcionsFruites}
                    </select>
                </div>
                <div class="form-group">
                    <label>Varietat</label>
                    <select id="liq-varietat" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        <option value="">Totes / no aplica</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Data liquidació *</label>
                    <input type="date" id="liq-data" value="${liquidacio ? liquidacio.data_liquidacio : ''}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
                <div class="form-group">
                    <label>Import bestretes (€)</label>
                    <div style="display:flex;gap:8px;">
                        <input type="number" step="0.01" id="liq-bestretes" value="${liquidacio ? liquidacio.import_bestretes : 0}" style="flex:1;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        <button type="button" class="btn btn-secondary" onclick="proposarImportBestretes()">↻</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Estat</label>
                    <select id="liq-estat" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        <option value="provisional" ${liquidacio && liquidacio.estat === 'provisional' ? 'selected' : ''}>Provisional</option>
                        <option value="tancada" ${liquidacio && liquidacio.estat === 'tancada' ? 'selected' : ''}>Tancada</option>
                    </select>
                </div>
            </div>
            <div class="form-group" style="margin-top:10px;">
                <label>Notes</label>
                <textarea id="liq-notes" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" rows="2">${liquidacio ? (liquidacio.notes || '') : ''}</textarea>
            </div>

            ${linesHtml}

            <div style="margin-top:20px;text-align:right;border-top:1px solid #ddd;padding-top:15px;">
                <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-liquidacio')" style="margin-right:10px;">Cancel·lar</button>
                ${id ? '<button type="button" class="btn btn-danger" onclick="confirmarEliminarLiquidacio(\'' + id + '\')" style="margin-right:10px;">Eliminar</button>' : ''}
                <button type="button" class="btn btn-primary" onclick="guardarCapcaleraLiquidacio()">Guardar capçalera</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    if (liquidacio && liquidacio.fruita_id) {
        onCanviFruitaLiquidacio(liquidacio.varietat_id);
    }
}

function calibreValorNumeric(calibre) {
    if (!calibre) return -1;
    const match = String(calibre).match(/\d+/);
    return match ? parseInt(match[0]) : -1;
}

function ordenarLiniesLiquidacio(linies) {
    const comercials = linies.filter(function(l) { return l.qualitat_nom !== 'NO_COMERCIAL' && l.qualitat_nom !== 'INDUSTRIA'; });
    const noComercials = linies.filter(function(l) { return l.qualitat_nom === 'NO_COMERCIAL'; });
    const industria = linies.filter(function(l) { return l.qualitat_nom === 'INDUSTRIA'; });

    comercials.sort(function(a, b) {
        if (a.qualitat_nom !== b.qualitat_nom) return a.qualitat_nom.localeCompare(b.qualitat_nom);
        return calibreValorNumeric(b.calibre) - calibreValorNumeric(a.calibre); // descendent
    });

    noComercials.sort(function(a, b) {
        return (a.fnc_tipus || '').localeCompare(b.fnc_tipus || ''); // ascendent: DEFECTES, IMMADUR, MADUR, PEDRA, PETIT
    });

    return comercials.concat(noComercials, industria);
}

function renderFilaLinia(l) {
    return `
        <tr data-linia-id="${l.id}">
            <td>${l.qualitat_nom}</td>
            <td>${l.calibre || '—'}</td>
            <td>${l.fnc_tipus || '—'}</td>
            <td style="text-align:right;">${l.kg}</td>
            <td style="text-align:right;">
                <input type="number" step="0.0001" class="input-preu-linia" data-linia-id="${l.id}" value="${l.preu_unitari}" style="width:90px;padding:4px;border:1px solid #ddd;border-radius:4px;text-align:right;">
            </td>
            <td style="text-align:right;">${Number(l.import).toFixed(2)} €</td>
            <td><button class="btn btn-danger" onclick="eliminarLinia('${l.id}')" style="padding:4px 8px;">🗑️</button></td>
        </tr>
    `;
}

async function guardarTotsElsPreus() {
    const inputs = document.querySelectorAll('#liquidacio-linies-tbody .input-preu-linia');
    if (inputs.length === 0) return;

    const actualitzacions = [];
    inputs.forEach(function(input) {
        const preu = parseFloat(input.value);
        if (!isNaN(preu)) {
            actualitzacions.push(updateLiquidacioLinia(input.dataset.liniaId, { preu_unitari: preu, editat_manualment: true }));
        }
    });

    try {
        await Promise.all(actualitzacions);
        mostrarNotificacio('Preus actualitzats', 'success');
        await refrescarLiniesModal();
    } catch (error) {
        mostrarNotificacio('Error guardant preus: ' + error.message, 'error');
        console.error(error);
    }
}

// Refresca només la taula de línies i els totals, sense recarregar tot el modal
// (evita el salt de pantalla de tancar/reobrir)
async function refrescarLiniesModal() {
    if (!liquidacioModalId) return;
    const liquidacio = await getLiquidacio(liquidacioModalId);
    const linies = await getLiquidacioLinies(liquidacioModalId);

    const totalsEl = document.getElementById('liquidacio-totals-resum');
    if (totalsEl) {
        totalsEl.innerHTML = `
            <span>Kg total: <strong>${liquidacio.kg_total}</strong></span>
            <span>Import brut: <strong>${Number(liquidacio.import_brut).toFixed(2)} €</strong></span>
            <span>Net a pagar: <strong>${Number(liquidacio.import_net).toFixed(2)} €</strong></span>
        `;
    }

    const tbody = document.getElementById('liquidacio-linies-tbody');
    if (tbody) {
        tbody.innerHTML = ordenarLiniesLiquidacio(linies).map(renderFilaLinia).join('');
    }
}

function onCanviFruitaLiquidacio(varietatSeleccionada) {
    varietatSeleccionada = varietatSeleccionada || null;
    const fruitaId = document.getElementById('liq-fruita').value;
    const selectVarietat = document.getElementById('liq-varietat');
    if (!fruitaId || typeof varietats === 'undefined') return;

    const varietatsFruita = varietats.filter(function(v) { return v.fruita_id === fruitaId; });
    selectVarietat.innerHTML = '<option value="">Totes / no aplica</option>' +
        varietatsFruita.map(function(v) {
            return '<option value="' + v.id + '"' + (varietatSeleccionada === v.id ? ' selected' : '') + '>' + v.varietat + '</option>';
        }).join('');
}

// ============================================================
// GUARDAR CAPÇALERA
// ============================================================

async function guardarCapcaleraLiquidacio() {
    const dades = {
        campanya: parseInt(document.getElementById('liq-campanya').value),
        fruita_id: document.getElementById('liq-fruita').value,
        varietat_id: document.getElementById('liq-varietat').value || null,
        data_liquidacio: document.getElementById('liq-data').value,
        import_bestretes: parseFloat(document.getElementById('liq-bestretes').value) || 0,
        estat: document.getElementById('liq-estat').value,
        notes: document.getElementById('liq-notes').value
    };

    if (!dades.fruita_id || !dades.data_liquidacio) {
        mostrarNotificacio('Fruita i data de liquidació són obligatoris', 'warning');
        return;
    }

    try {
        if (liquidacioModalId) {
            await updateLiquidacio(liquidacioModalId, dades);
            mostrarNotificacio('Liquidació actualitzada', 'success');
        } else {
            const nova = await createLiquidacio(dades);
            mostrarNotificacio('Liquidació creada. Ara pots afegir línies.', 'success');
            liquidacioModalId = nova.id;
        }
        tancarModal('modal-liquidacio');
        await obrirModalLiquidacio(liquidacioModalId);
        await mostrarTaulaLiquidacions();
    } catch (error) {
        mostrarNotificacio('Error guardant la liquidació: ' + error.message, 'error');
        console.error(error);
    }
}

async function confirmarEliminarLiquidacio(id) {
    if (!confirm('Segur que vols eliminar aquesta liquidació i totes les seves línies?')) return;
    try {
        await deleteLiquidacio(id);
        mostrarNotificacio('Liquidació eliminada', 'success');
        tancarModal('modal-liquidacio');
        await mostrarTaulaLiquidacions();
    } catch (error) {
        mostrarNotificacio('Error eliminant: ' + error.message, 'error');
    }
}

// ============================================================
// PROPOSTA AUTOMÀTICA D'IMPORT BESTRETES
// (collita_bestretes és per collita_entrada_id, no capçalera mensual)
// ============================================================

async function proposarImportBestretes() {
    const campanya = parseInt(document.getElementById('liq-campanya').value);
    const fruitaId = document.getElementById('liq-fruita').value;
    const varietatId = document.getElementById('liq-varietat').value || null;

    if (!campanya || !fruitaId) {
        mostrarNotificacio('Selecciona campanya i fruita primer', 'warning');
        return;
    }

    try {
        // Any agrícola oct(campanya-1) → set(campanya), mateix criteri que obtenirTodasEntradas()
        const dataInici = (campanya - 1) + '-10-01';
        const dataFi = campanya + '-09-30';

        let queryEntrades = supabaseClient
            .from('collita_entrada')
            .select('id')
            .eq('estat', 'actiu')
            .gte('data', dataInici)
            .lte('data', dataFi);

        if (varietatId) {
            queryEntrades = queryEntrades.eq('fruita_varietat_id', varietatId);
        } else if (typeof varietats !== 'undefined') {
            const varietatsFruita = varietats.filter(function(v) { return v.fruita_id === fruitaId; }).map(function(v) { return v.id; });
            queryEntrades = queryEntrades.in('fruita_varietat_id', varietatsFruita);
        }

        const { data: entrades, error: errEnt } = await queryEntrades;
        if (errEnt) throw errEnt;

        if (!entrades || entrades.length === 0) {
            document.getElementById('liq-bestretes').value = '0.00';
            mostrarNotificacio('No hi ha entrades per aquesta campanya/varietat', 'info');
            return;
        }

        const { data: bestretes, error: errBes } = await supabaseClient
            .from('collita_bestretes')
            .select('import_bestreta')
            .in('collita_entrada_id', entrades.map(function(e) { return e.id; }));
        if (errBes) throw errBes;

        const total = (bestretes || []).reduce(function(sum, b) { return sum + Number(b.import_bestreta || 0); }, 0);
        document.getElementById('liq-bestretes').value = total.toFixed(2);
        mostrarNotificacio('Proposat: ' + total.toFixed(2) + ' € (revisa abans de guardar)', 'info');
    } catch (error) {
        mostrarNotificacio('No s\'ha pogut calcular la proposta de bestretes: ' + error.message, 'error');
        console.error(error);
    }
}

// Troba la fila de collita_preus_anuals que representa el preu de liquidació
// (data_liquidacio informada; si n'hi ha diverses, la més recent per created_at)
async function obtenirPreusAnualsIdLiquidacio(campanya, fruitaId) {
    const { data, error } = await supabaseClient
        .from('collita_preus_anuals')
        .select('id, data_liquidacio, created_at')
        .eq('campanya', campanya)
        .eq('fruita_id', fruitaId)
        .not('data_liquidacio', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error obtenint preus_anuals per liquidació:', error);
        return null;
    }
    return (data && data[0]) ? data[0].id : null;
}

// ============================================================
// GENERAR LÍNIES DES D'ESCANDALLS
// ============================================================

async function generarLiniesDesEscandall() {
    if (!liquidacioModalId) {
        mostrarNotificacio('Guarda primer la capçalera', 'warning');
        return;
    }
    const campanya = parseInt(document.getElementById('liq-campanya').value);
    const fruitaId = document.getElementById('liq-fruita').value;
    const varietatId = document.getElementById('liq-varietat').value || null;

    if (!varietatId) {
        mostrarNotificacio('Selecciona una varietat concreta (collita_escandall es filtra per fruita_varietat_id)', 'warning');
        return;
    }
    if (!confirm('Això afegirà línies noves agregades des dels escandalls d\'aquesta campanya/varietat. Continuar?')) return;

    try {
        const dataInici = (campanya - 1) + '-10-01';
        const dataFi = campanya + '-09-30';

        const { data: escandalls, error: errEsc } = await supabaseClient
            .from('collita_escandall')
            .select(`
                id, qualitat_reclassificada,
                collita_escandall_calibres (calibre, pes_kg),
                collita_escandall_no_comercial (classificacio, pes_kg),
                collita_escandall_industria (pes_kg)
            `)
            .eq('fruita_varietat_id', varietatId)
            .eq('estat', 'actiu')
            .gte('data', dataInici)
            .lte('data', dataFi);
        if (errEsc) throw errEsc;

        if (!escandalls || escandalls.length === 0) {
            mostrarNotificacio('No s\'han trobat escandalls per aquesta campanya/varietat', 'warning');
            return;
        }

        const agCalibres = {};
        const agNoComercial = {};
        let kgIndustria = 0;

        escandalls.forEach(function(esc) {
            const qualitat = esc.qualitat_reclassificada || 'SENSE_QUALIFICAR';
            (esc.collita_escandall_calibres || []).forEach(function(c) {
                const clau = qualitat + '|' + c.calibre;
                if (!agCalibres[clau]) agCalibres[clau] = { qualitat_nom: qualitat, calibre: c.calibre, kg: 0 };
                agCalibres[clau].kg += Number(c.pes_kg || 0);
            });
            (esc.collita_escandall_no_comercial || []).forEach(function(nc) {
                if (!agNoComercial[nc.classificacio]) agNoComercial[nc.classificacio] = { fnc_tipus: nc.classificacio, kg: 0 };
                agNoComercial[nc.classificacio].kg += Number(nc.pes_kg || 0);
            });
            (esc.collita_escandall_industria || []).forEach(function(ind) {
                kgIndustria += Number(ind.pes_kg || 0);
            });
        });

        const preusAnualsId = await obtenirPreusAnualsIdLiquidacio(campanya, fruitaId);
        let preusCalibres = [], preusNoComercial = [], preusIndustria = [];
        if (preusAnualsId) {
            const [rCal, rNc, rInd] = await Promise.all([
                supabaseClient.from('collita_preus_liquidacio_calibres').select('*').eq('preus_anuals_id', preusAnualsId),
                supabaseClient.from('collita_preus_liquidacio_no_comercial').select('*').eq('preus_anuals_id', preusAnualsId).eq('fruita_varietat_id', varietatId),
                supabaseClient.from('collita_preus_liquidacio_industria').select('*').eq('preus_anuals_id', preusAnualsId).eq('fruita_varietat_id', varietatId)
            ]);
            preusCalibres = rCal.data || [];
            preusNoComercial = rNc.data || [];
            preusIndustria = rInd.data || [];
        } else {
            mostrarNotificacio('No s\'ha trobat preu de liquidació configurat per aquesta campanya/fruita — línies creades a 0€', 'warning');
        }

        let liniesCreades = 0;
        for (const clau in agCalibres) {
            const ag = agCalibres[clau];
            const preuCfg = preusCalibres.find(function(p) { return p.calibre === ag.calibre; });
            await createLiquidacioLinia({
                liquidacio_id: liquidacioModalId,
                qualitat_nom: ag.qualitat_nom,
                calibre: ag.calibre,
                kg: ag.kg,
                preu_unitari: preuCfg ? preuCfg.preu_unitari : 0,
                editat_manualment: false
            });
            liniesCreades++;
        }
        for (const clau in agNoComercial) {
            const ag = agNoComercial[clau];
            const preuCfg = preusNoComercial.find(function(p) { return p.classificacio === ag.fnc_tipus; });
            await createLiquidacioLinia({
                liquidacio_id: liquidacioModalId,
                qualitat_nom: 'NO_COMERCIAL',
                fnc_tipus: ag.fnc_tipus,
                kg: ag.kg,
                preu_unitari: preuCfg ? preuCfg.preu_unitari : 0,
                editat_manualment: false
            });
            liniesCreades++;
        }
        if (kgIndustria > 0) {
            const preuCfg = preusIndustria[0];
            await createLiquidacioLinia({
                liquidacio_id: liquidacioModalId,
                qualitat_nom: 'INDUSTRIA',
                kg: kgIndustria,
                preu_unitari: preuCfg ? preuCfg.preu_unitari : 0,
                editat_manualment: false
            });
            liniesCreades++;
        }

        mostrarNotificacio(liniesCreades + ' línies generades des dels escandalls', 'success');
        await refrescarLiniesModal();
    } catch (error) {
        mostrarNotificacio('Error generant línies des d\'escandalls: ' + error.message, 'error');
        console.error(error);
    }
}

// ============================================================
// LÍNIA MANUAL
// ============================================================

function afegirLiniaManualForm() {
    const container = document.getElementById('fila-nova-linia-container');
    container.innerHTML = `
        <div style="display:flex;gap:8px;margin-top:10px;padding:10px;background:#f5f5f5;border-radius:6px;flex-wrap:wrap;">
            <input type="text" id="nova-linia-qualitat" placeholder="Qualitat" style="padding:6px;border:1px solid #ddd;border-radius:4px;flex:1;min-width:120px;">
            <input type="text" id="nova-linia-calibre" placeholder="Calibre" style="padding:6px;border:1px solid #ddd;border-radius:4px;width:100px;">
            <input type="text" id="nova-linia-fnc" placeholder="FNC (opcional)" style="padding:6px;border:1px solid #ddd;border-radius:4px;width:120px;">
            <input type="number" step="0.01" id="nova-linia-kg" placeholder="Kg" style="padding:6px;border:1px solid #ddd;border-radius:4px;width:100px;">
            <input type="number" step="0.0001" id="nova-linia-preu" placeholder="Preu/kg" style="padding:6px;border:1px solid #ddd;border-radius:4px;width:100px;">
            <button class="btn btn-primary" onclick="guardarLiniaManual()">Afegir</button>
            <button class="btn btn-secondary" onclick="document.getElementById('fila-nova-linia-container').innerHTML=''">Cancel·lar</button>
        </div>
    `;
}

async function guardarLiniaManual() {
    const qualitat = document.getElementById('nova-linia-qualitat').value.trim();
    const kg = parseFloat(document.getElementById('nova-linia-kg').value);
    const preu = parseFloat(document.getElementById('nova-linia-preu').value);

    if (!qualitat || isNaN(kg) || isNaN(preu)) {
        mostrarNotificacio('Qualitat, kg i preu són obligatoris', 'warning');
        return;
    }

    try {
        await createLiquidacioLinia({
            liquidacio_id: liquidacioModalId,
            qualitat_nom: qualitat,
            calibre: document.getElementById('nova-linia-calibre').value.trim() || null,
            fnc_tipus: document.getElementById('nova-linia-fnc').value.trim() || null,
            kg: kg,
            preu_unitari: preu,
            editat_manualment: true
        });
        mostrarNotificacio('Línia afegida', 'success');
        document.getElementById('fila-nova-linia-container').innerHTML = '';
        await refrescarLiniesModal();
    } catch (error) {
        mostrarNotificacio('Error afegint línia: ' + error.message, 'error');
        console.error(error);
    }
}

async function eliminarLinia(liniaId) {
    if (!confirm('Eliminar aquesta línia?')) return;
    try {
        await deleteLiquidacioLinia(liniaId);
        mostrarNotificacio('Línia eliminada', 'success');
        await refrescarLiniesModal();
    } catch (error) {
        mostrarNotificacio('Error eliminant línia: ' + error.message, 'error');
    }
}

console.log('✅ Liquidacions UI v1 carregat');
