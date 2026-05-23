// ============================================================
// EXISTÈNCIES v1 - Gestió d'estoc de productes
// ============================================================

async function carregarVistaExistencies() {
    const container = document.getElementById('view-container');

    let html = '<div class="view-existencies">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:20px;">';
    html += '<h2>📦 Existències</h2>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<button class="btn btn-secondary" onclick="obrirModalInventariInicial()">📋 Inventari Inicial</button>';
    html += '<button class="btn btn-secondary" onclick="obrirModalAjust()">🔧 Ajust Estoc</button>';
	html += '<button class="btn btn-success" onclick="exportarExistenciesExcel()">📥 Exportar Excel</button>';
	html += '<button class="btn btn-warning" onclick="document.getElementById(\'input-inventari-fisic\').click()">📤 Importar Inventari</button>';
	html += '<input type="file" id="input-inventari-fisic" accept=".xlsx,.xls" style="display:none;" onchange="importarInventariFisic(event)">';
    html += '</div></div>';

    // Filtres
    html += '<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px;">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:15px;">';
    html += '<div><label>Tipus</label><select id="exist-filtre-tipus" onchange="carregarTaulaExistencies()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">';
    html += '<option value="">Tots</option>';
    html += '<option value="fitosanitari">Fitosanitaris</option>';
    html += '<option value="fertilitzant">Fertilitzants</option>';
    html += '</select></div>';
    html += '<div><label>Producte</label><input type="text" id="exist-filtre-producte" oninput="filtrarTaulaExistencies()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="Cerca producte..."></div>';
    html += '<div style="align-self:end;"><button class="btn btn-secondary" onclick="netejarFiltresExistencies()">🗑️ Netejar</button></div>';
    html += '</div></div>';

    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Producte</th><th>Tipus</th><th>Unitat</th><th>Entrades</th><th>Sortides</th><th>Estoc Actual</th><th>Estat</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-existencies"><tr><td colspan="8">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
	
	html += '<div><label>Estat</label><select id="exist-filtre-estat" onchange="filtrarTaulaExistencies()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">';
	html += '<option value="amb_estoc" selected>Amb estoc</option>';
	html += '<option value="tots">Tots els productes</option>';
	html += '<option value="sense_estoc">Sense estoc</option>';
	html += '<option value="negatiu">Estoc negatiu</option>';
	html += '</select></div>';

    container.innerHTML = html;
    await carregarTaulaExistencies();
}

let existenciesTotes = [];

async function carregarTaulaExistencies() {
    const tbody = document.getElementById('tbody-existencies');
    if (!tbody) return;

    try {
        const tipus = document.getElementById('exist-filtre-tipus')?.value;

        // Obtenir tots els moviments
        const { data: moviments, error } = await supabaseClient
			.from('estoc_moviments')
			.select('*')
			.eq('estat', 'actiu');
        if (error) throw error;

        // Calcular estoc per producte
        const estocs = {};
        moviments.forEach(function(m) {
            const key = m.producte_id + '_' + m.tipus_producte;
            if (!estocs[key]) {
                estocs[key] = {
                    producte_id: m.producte_id,
                    tipus_producte: m.tipus_producte,
                    entrades: 0,
                    sortides: 0,
                    unitat: m.unitat
                };
            }
            if (parseFloat(m.quantitat) > 0) {
                estocs[key].entrades += parseFloat(m.quantitat);
            } else {
                estocs[key].sortides += Math.abs(parseFloat(m.quantitat));
            }
        });

        // Combinar amb productes
        existenciesTotes = Object.values(estocs).map(function(e) {
            let producte = null;
            if (e.tipus_producte === 'fitosanitari') {
                producte = fitosanitaris.find(function(f) { return f.id === e.producte_id; });
            } else if (e.tipus_producte === 'fertilitzant') {
                producte = fertilitzants.find(function(f) { return f.id === e.producte_id; });
            }
            return {
                ...e,
                nom: producte ? producte.nom : 'Desconegut',
                unitat_stock: producte ? (producte.unitat_stock || 'L') : 'L',
                estoc: e.entrades - e.sortides
            };
        });

        // Afegir productes sense moviments
        const totsProductes = [
            ...fitosanitaris.map(function(f) { return { ...f, tipus_producte: 'fitosanitari' }; }),
            ...fertilitzants.map(function(f) { return { ...f, tipus_producte: 'fertilitzant' }; })
        ];

        totsProductes.forEach(function(p) {
            const key = p.id + '_' + p.tipus_producte;
            const existeix = existenciesTotes.find(function(e) { return e.producte_id === p.id; });
            if (!existeix) {
                existenciesTotes.push({
                    producte_id: p.id,
                    tipus_producte: p.tipus_producte,
                    nom: p.nom,
                    unitat_stock: p.unitat_stock || 'L',
                    entrades: 0,
                    sortides: 0,
                    estoc: 0
                });
            }
        });

        existenciesTotes.sort(function(a, b) { return a.nom.localeCompare(b.nom); });

        if (tipus) {
            existenciesTotes = existenciesTotes.filter(function(e) { return e.tipus_producte === tipus; });
        }

        filtrarTaulaExistencies();

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8">Error: ' + error.message + '</td></tr>';
    }
}

function filtrarTaulaExistencies() {
    const tbody = document.getElementById('tbody-existencies');
    if (!tbody) return;

    const cerca = document.getElementById('exist-filtre-producte')?.value?.trim().toLowerCase();
    let registres = existenciesTotes;
    if (cerca) {
        registres = registres.filter(function(e) { return e.nom.toLowerCase().includes(cerca); });
    }

    if (registres.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hi ha productes</td></tr>';
        return;
    }

	const estat = document.getElementById('exist-filtre-estat')?.value;
	if (estat === 'amb_estoc') {
		registres = registres.filter(function(e) { return e.estoc > 0; });
	} else if (estat === 'sense_estoc') {
		registres = registres.filter(function(e) { return e.estoc === 0; });
	} else if (estat === 'negatiu') {
		registres = registres.filter(function(e) { return e.estoc < 0; });
}

    tbody.innerHTML = registres.map(function(e) {
        const estoc = parseFloat(e.estoc) || 0;
        let estat = '';
        if (estoc < 0) {
            estat = '<span style="color:#f44336;font-weight:bold;">⚠️ Negatiu</span>';
        } else if (estoc === 0) {
            estat = '<span style="color:#ff9800;">⚪ Sense estoc</span>';
        } else {
            estat = '<span style="color:#4caf50;">✅ OK</span>';
        }

        return '<tr>' +
            '<td><strong>' + e.nom + '</strong></td>' +
            '<td>' + (e.tipus_producte === 'fitosanitari' ? '🌱 Fitosanitari' : '🌾 Fertilitzant') + '</td>' +
            '<td>' + (e.unitat_stock || 'L') + '</td>' +
            '<td style="color:#4caf50;">' + e.entrades.toFixed(2) + '</td>' +
            '<td style="color:#f44336;">' + e.sortides.toFixed(2) + '</td>' +
            '<td><strong>' + estoc.toFixed(2) + '</strong></td>' +
            '<td>' + estat + '</td>' +
            '<td><button class="btn btn-sm btn-primary" onclick="veureMovimentsProducte(\'' + e.producte_id + '\',\'' + e.tipus_producte + '\')">📋</button></td>' +
            '</tr>';
    }).join('');
}

function netejarFiltresExistencies() {
    document.getElementById('exist-filtre-producte').value = '';
    document.getElementById('exist-filtre-tipus').value = '';
    carregarTaulaExistencies();
}

async function veureMovimentsProducte(producteId, tipusProducte) {
    const { data, error } = await supabaseClient
        .from('estoc_moviments')
        .select('*')
        .eq('producte_id', producteId)
        .order('data', { ascending: false });
    if (error) { mostrarNotificacio('Error: ' + error.message, 'error'); return; }

    let producte = null;
    if (tipusProducte === 'fitosanitari') {
        producte = fitosanitaris.find(function(f) { return f.id === producteId; });
    } else {
        producte = fertilitzants.find(function(f) { return f.id === producteId; });
    }

    const nomProducte = producte ? producte.nom : 'Desconegut';
    const unitatStock = producte ? (producte.unitat_stock || 'L') : 'L';

    let html = '<div id="modal-moviments" class="modal" style="display:block;">';
    html += '<div class="modal-content" style="max-width:700px;">';
    html += '<span class="close" onclick="document.getElementById(\'modal-moviments\').remove()">&times;</span>';
    html += '<h2>📋 Moviments — ' + nomProducte + '</h2>';
    html += '<table class="data-table"><thead><tr>';
    html += '<th>Data</th><th>Tipus</th><th>Quantitat</th><th>Observacions</th>';
    html += '</tr></thead><tbody>';

    let saldo = 0;
    data.slice().reverse().forEach(function(m) {
        saldo += parseFloat(m.quantitat);
    });

    if (data.length === 0) {
        html += '<tr><td colspan="4" class="empty-state">Sense moviments</td></tr>';
    } else {
        data.forEach(function(m) {
            const qtitat = parseFloat(m.quantitat);
            const color = qtitat > 0 ? '#4caf50' : '#f44336';
            const tipusText = {
                'compra': '🛒 Compra',
                'tractament': '🌱 Tractament',
                'fertilitzacio': '🌾 Fertilització',
                'inventari_inicial': '📋 Inventari inicial',
                'ajust': '🔧 Ajust',
                'perdua': '❌ Pèrdua'
            }[m.tipus_moviment] || m.tipus_moviment;

            html += '<tr>' +
                '<td>' + formatData(m.data) + '</td>' +
                '<td>' + tipusText + '</td>' +
                '<td style="color:' + color + ';font-weight:bold;">' + (qtitat > 0 ? '+' : '') + qtitat.toFixed(2) + ' ' + unitatStock + '</td>' +
                '<td>' + (m.observacions || '-') + '</td>' +
                '</tr>';
        });
    }

    html += '</tbody></table>';
    html += '<p style="text-align:right;margin-top:10px;"><strong>Estoc actual: ' + saldo.toFixed(2) + ' ' + unitatStock + '</strong></p>';
    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

async function obrirModalInventariInicial() {
    let modal = document.getElementById('modal-inventari-inicial');
    if (!modal) {
        const div = document.createElement('div');
        div.innerHTML = 
            '<div id="modal-inventari-inicial" class="modal" style="display:none;">' +
            '<div class="modal-content" style="max-width:500px;">' +
            '<span class="close" onclick="tancarModal(\'modal-inventari-inicial\')">&times;</span>' +
            '<h2>📋 Inventari Inicial</h2>' +
            '<form id="form-inventari" onsubmit="guardarInventariInicial(event)">' +
            '<div class="form-group"><label>Tipus Producte *</label>' +
            '<select id="inv-tipus" required onchange="carregarProductesInventari()">' +
            '<option value="">Seleccionar...</option>' +
            '<option value="fitosanitari">Fitosanitari</option>' +
            '<option value="fertilitzant">Fertilitzant</option>' +
            '</select></div>' +
            '<div class="form-group"><label>Producte *</label>' +
            '<select id="inv-producte" required><option value="">Seleccionar tipus primer...</option></select></div>' +
            '<div class="form-group"><label>Data *</label><input type="date" id="inv-data" required value="' + new Date().toISOString().split('T')[0] + '"></div>' +
            '<div class="form-group"><label>Quantitat *</label>' +
            '<div style="display:flex;gap:10px;">' +
            '<input type="number" id="inv-quantitat" required min="0" step="0.001" style="flex:2;">' +
            '<span id="inv-unitat" style="align-self:center;font-weight:bold;">L</span>' +
            '</div></div>' +
            '<div class="form-group"><label>Observacions</label><textarea id="inv-observacions" rows="2"></textarea></div>' +
            '<div class="form-actions">' +
            '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-inventari-inicial\')">Cancel·lar</button>' +
            '<button type="submit" class="btn btn-primary">Guardar</button>' +
            '</div></form></div></div>';
        document.body.appendChild(div.firstElementChild);
        modal = document.getElementById('modal-inventari-inicial');
    }
    modal.style.display = 'block';
}

function carregarProductesInventari() {
    const tipus = document.getElementById('inv-tipus').value;
    const select = document.getElementById('inv-producte');
    select.innerHTML = '<option value="">Seleccionar...</option>';
    const llista = tipus === 'fitosanitari' ? fitosanitaris : fertilitzants;
    llista.slice().sort(function(a, b) { return a.nom.localeCompare(b.nom); }).forEach(function(p) {
        select.innerHTML += '<option value="' + p.id + '">' + p.nom + '</option>';
    });
    select.onchange = function() {
        const producte = llista.find(function(p) { return p.id === select.value; });
        if (producte) document.getElementById('inv-unitat').textContent = producte.unitat_stock || 'L';
    };
}

async function guardarInventariInicial(event) {
    event.preventDefault();
    const tipus = document.getElementById('inv-tipus').value;
    const producteId = document.getElementById('inv-producte').value;
    const data = document.getElementById('inv-data').value;
    const quantitat = parseFloat(document.getElementById('inv-quantitat').value);
    const observacions = document.getElementById('inv-observacions').value.trim();

    const producte = (tipus === 'fitosanitari' ? fitosanitaris : fertilitzants).find(function(p) { return p.id === producteId; });

    try {
        const { error } = await supabaseClient.from('estoc_moviments').insert([{
            data: data,
            producte_id: producteId,
            tipus_producte: tipus,
            tipus_moviment: 'inventari_inicial',
            quantitat: quantitat,
            unitat: producte ? (producte.unitat_stock || 'L') : 'L',
            observacions: observacions || 'Inventari inicial',
            creat_per: currentUser ? currentUser.id : null
        }]);
        if (error) throw error;
        mostrarNotificacio('✅ Inventari inicial guardat', 'success');
        tancarModal('modal-inventari-inicial');
        await carregarTaulaExistencies();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function obrirModalAjust() {
    let modal = document.getElementById('modal-ajust');
    if (!modal) {
        const div = document.createElement('div');
        div.innerHTML =
            '<div id="modal-ajust" class="modal" style="display:none;">' +
            '<div class="modal-content" style="max-width:500px;">' +
            '<span class="close" onclick="tancarModal(\'modal-ajust\')">&times;</span>' +
            '<h2>🔧 Ajust d\'Estoc</h2>' +
            '<form id="form-ajust" onsubmit="guardarAjust(event)">' +
            '<div class="form-group"><label>Tipus Producte *</label>' +
            '<select id="ajust-tipus" required onchange="carregarProductesAjust()">' +
            '<option value="">Seleccionar...</option>' +
            '<option value="fitosanitari">Fitosanitari</option>' +
            '<option value="fertilitzant">Fertilitzant</option>' +
            '</select></div>' +
            '<div class="form-group"><label>Producte *</label>' +
            '<select id="ajust-producte" required><option value="">Seleccionar tipus primer...</option></select></div>' +
            '<div class="form-group"><label>Data *</label><input type="date" id="ajust-data" required value="' + new Date().toISOString().split('T')[0] + '"></div>' +
            '<div class="form-group"><label>Tipus Ajust *</label>' +
            '<select id="ajust-tipus-mov" required>' +
            '<option value="ajust">🔧 Ajust inventari</option>' +
            '<option value="perdua">❌ Pèrdua/Merma</option>' +
            '</select></div>' +
            '<div class="form-group"><label>Quantitat (+ entrada / - sortida) *</label>' +
            '<div style="display:flex;gap:10px;">' +
            '<input type="number" id="ajust-quantitat" required step="0.001" style="flex:2;">' +
            '<span id="ajust-unitat" style="align-self:center;font-weight:bold;">L</span>' +
            '</div></div>' +
            '<div class="form-group"><label>Observacions *</label><textarea id="ajust-observacions" rows="2" required></textarea></div>' +
            '<div class="form-actions">' +
            '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-ajust\')">Cancel·lar</button>' +
            '<button type="submit" class="btn btn-primary">Guardar</button>' +
            '</div></form></div></div>';
        document.body.appendChild(div.firstElementChild);
        modal = document.getElementById('modal-ajust');
    }
    modal.style.display = 'block';
}

function carregarProductesAjust() {
    const tipus = document.getElementById('ajust-tipus').value;
    const select = document.getElementById('ajust-producte');
    select.innerHTML = '<option value="">Seleccionar...</option>';
    const llista = tipus === 'fitosanitari' ? fitosanitaris : fertilitzants;
    llista.slice().sort(function(a, b) { return a.nom.localeCompare(b.nom); }).forEach(function(p) {
        select.innerHTML += '<option value="' + p.id + '">' + p.nom + '</option>';
    });
    select.onchange = function() {
        const producte = llista.find(function(p) { return p.id === select.value; });
        if (producte) document.getElementById('ajust-unitat').textContent = producte.unitat_stock || 'L';
    };
}

async function guardarAjust(event) {
    event.preventDefault();
    const tipus = document.getElementById('ajust-tipus').value;
    const producteId = document.getElementById('ajust-producte').value;
    const data = document.getElementById('ajust-data').value;
    const tipusMov = document.getElementById('ajust-tipus-mov').value;
    const quantitat = parseFloat(document.getElementById('ajust-quantitat').value);
    const observacions = document.getElementById('ajust-observacions').value.trim();

    const producte = (tipus === 'fitosanitari' ? fitosanitaris : fertilitzants).find(function(p) { return p.id === producteId; });

    try {
        const { error } = await supabaseClient.from('estoc_moviments').insert([{
            data: data,
            producte_id: producteId,
            tipus_producte: tipus,
            tipus_moviment: tipusMov,
            quantitat: quantitat,
            unitat: producte ? (producte.unitat_stock || 'L') : 'L',
            observacions: observacions,
            creat_per: currentUser ? currentUser.id : null
        }]);
        if (error) throw error;
        mostrarNotificacio('✅ Ajust guardat', 'success');
        tancarModal('modal-ajust');
        await carregarTaulaExistencies();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// EXPORTACIÓ MILLORADA - Substituir exportarExistenciesExcel()
// ============================================================
 
function exportarExistenciesExcel() {
    const cerca = document.getElementById('exist-filtre-producte')?.value?.trim().toLowerCase();
    const tipus = document.getElementById('exist-filtre-tipus')?.value;
    const estat = document.getElementById('exist-filtre-estat')?.value;
 
    let dadesExport = existenciesTotes;
 
    if (cerca) dadesExport = dadesExport.filter(e => e.nom.toLowerCase().includes(cerca));
    if (tipus) dadesExport = dadesExport.filter(e => e.tipus_producte === tipus);
    if (estat === 'amb_estoc') dadesExport = dadesExport.filter(e => e.estoc > 0);
    else if (estat === 'sense_estoc') dadesExport = dadesExport.filter(e => e.estoc === 0);
    else if (estat === 'negatiu') dadesExport = dadesExport.filter(e => e.estoc < 0);
 
    if (dadesExport.length === 0) {
        mostrarNotificacio('⚠️ No hi ha dades per exportar', 'warning');
        return;
    }
 
    const wb = XLSX.utils.book_new();
    const wsData = [
        // Capçalera
        ['Producte', 'Tipus', 'Unitat', 'Entrades', 'Sortides', 'Estoc App', 'Estoc Físic', 'Diferència', 'Observacions']
    ];
 
    // Dades
    dadesExport.forEach(function(e) {
        wsData.push([
            e.nom,
            e.tipus_producte === 'fitosanitari' ? 'Fitosanitari' : 'Fertilitzant',
            e.unitat_stock || e.unitat || 'L',
            parseFloat(e.entrades.toFixed(3)),
            parseFloat(e.sortides.toFixed(3)),
            parseFloat(e.estoc.toFixed(3)),
            '',   // Estoc Físic - omplir a mà
            '',   // Diferència - fórmula
            ''    // Observacions - omplir a mà
        ]);
    });
 
    const ws = XLSX.utils.aoa_to_sheet(wsData);
 
    // ✅ Afegir fórmules de diferència (Estoc Físic - Estoc App)
    // Columna G = Estoc Físic (index 6), Columna F = Estoc App (index 5), Columna H = Diferència (index 7)
    for (let i = 1; i < wsData.length; i++) {
        const row = i + 1; // Excel és 1-indexat i fila 1 és capçalera
        const cellRef = XLSX.utils.encode_cell({ r: i, c: 7 }); // Columna H
        ws[cellRef] = { f: 'G' + row + '-F' + row };            // =G2-F2
    }
 
    // Amplada columnes
    ws['!cols'] = [
        { wch: 35 }, // Producte
        { wch: 15 }, // Tipus
        { wch: 8 },  // Unitat
        { wch: 12 }, // Entrades
        { wch: 12 }, // Sortides
        { wch: 12 }, // Estoc App
        { wch: 12 }, // Estoc Físic
        { wch: 12 }, // Diferència
        { wch: 25 }  // Observacions
    ];
 
    XLSX.utils.book_append_sheet(wb, ws, 'Inventari');
 
    const avui = new Date().toISOString().split('T')[0];
    const tipusText = estat === 'amb_estoc' ? 'positiu' :
                      estat === 'negatiu' ? 'negatiu' :
                      estat === 'sense_estoc' ? 'zero' : 'tots';
    XLSX.writeFile(wb, 'inventari_' + tipusText + '_' + avui + '.xlsx');
 
    mostrarNotificacio('✅ Excel exportat: ' + dadesExport.length + ' productes', 'success');
}
 
// ============================================================
// IMPORTACIÓ INVENTARI FÍSIC
// ============================================================
 
// Afegir botó a la vista existències (a carregarVistaExistencies):
// html += '<button class="btn btn-warning" onclick="document.getElementById(\'input-inventari-fisic\').click()">📤 Importar Inventari</button>';
// html += '<input type="file" id="input-inventari-fisic" accept=".xlsx,.xls" style="display:none;" onchange="importarInventariFisic(event)">';
 
async function importarInventariFisic(event) {
    const file = event.target.files[0];
    if (!file) return;
 
    try {
        mostrarNotificacio('⏳ Llegint Excel...', 'info');
 
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const dades = XLSX.utils.sheet_to_json(ws);
 
        console.log('📊 Dades importades:', dades.length, 'files');
        console.log('Primer registre:', dades[0]);
 
        // Filtrar files amb Estoc Físic informat
        const dadesAmbFisic = dades.filter(function(row) {
            return row['Estoc Físic'] !== undefined && 
                   row['Estoc Físic'] !== '' && 
                   row['Estoc Físic'] !== null &&
                   !isNaN(parseFloat(row['Estoc Físic']));
        });
 
        if (dadesAmbFisic.length === 0) {
            mostrarNotificacio('⚠️ No hi ha dades d\'Estoc Físic al fitxer', 'warning');
            event.target.value = '';
            return;
        }
 
        // Mostrar previsualització
        mostrarPrevisualitzacioInventari(dadesAmbFisic);
 
    } catch (error) {
        console.error('Error important inventari:', error);
        mostrarNotificacio('❌ Error llegint Excel: ' + error.message, 'error');
    }
 
    event.target.value = '';
}
 
function mostrarPrevisualitzacioInventari(dades) {
    // Calcular ajustos necessaris
    const ajustos = dades.map(function(row) {
        const estocApp = parseFloat(row['Estoc App']) || 0;
        const estocFisic = parseFloat(row['Estoc Físic']);
        const diferencia = estocFisic - estocApp;
        return {
            producte: row['Producte'],
            tipus: row['Tipus'],
            unitat: row['Unitat'] || 'L',
            estocApp: estocApp,
            estocFisic: estocFisic,
            diferencia: parseFloat(diferencia.toFixed(3)),
            observacions: row['Observacions'] || '',
            teCanvi: Math.abs(diferencia) > 0.001
        };
    });
 
    const ambCanvis = ajustos.filter(a => a.teCanvi);
    const senseCanvis = ajustos.filter(a => !a.teCanvi);
 
    // Crear modal de previsualització
    let modal = document.getElementById('modal-inventari-fisic');
    if (modal) modal.remove();
 
    modal = document.createElement('div');
    modal.id = 'modal-inventari-fisic';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; display:flex; align-items:center; justify-content:center;';
 
    let html = '<div style="background:white; border-radius:12px; padding:25px; width:95%; max-width:900px; max-height:90vh; overflow-y:auto;">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">';
    html += '<h3 style="margin:0;">📦 Previsualització Inventari Físic</h3>';
    html += '<button onclick="document.getElementById(\'modal-inventari-fisic\').remove()" style="background:none; border:none; font-size:1.5em; cursor:pointer;">✕</button>';
    html += '</div>';
 
    // Resum
    html += '<div style="display:flex; gap:15px; margin-bottom:20px; flex-wrap:wrap;">';
    html += '<div style="background:#e8f5e9; border:2px solid #27ae60; border-radius:8px; padding:12px; flex:1;">';
    html += '<strong style="color:#27ae60;">✅ Sense canvis: ' + senseCanvis.length + '</strong></div>';
    html += '<div style="background:#fff3e0; border:2px solid #f39c12; border-radius:8px; padding:12px; flex:1;">';
    html += '<strong style="color:#f39c12;">⚠️ Amb ajust: ' + ambCanvis.length + '</strong></div>';
    html += '</div>';
 
    if (ambCanvis.length === 0) {
        html += '<p style="text-align:center; color:#27ae60; font-size:1.2em;">✅ L\'estoc físic coincideix amb l\'app. No cal fer ajustos!</p>';
    } else {
        html += '<p style="color:#666; margin-bottom:10px;">Els següents productes tindran un ajust d\'estoc:</p>';
        html += '<table class="data-table" style="width:100%; margin-bottom:20px;">';
        html += '<thead><tr>';
        html += '<th>Producte</th><th>Unitat</th>';
        html += '<th style="text-align:right;">Estoc App</th>';
        html += '<th style="text-align:right;">Estoc Físic</th>';
        html += '<th style="text-align:right;">Ajust</th>';
        html += '<th>Observacions</th>';
        html += '</tr></thead><tbody>';
 
        ambCanvis.forEach(function(a) {
            const colorDif = a.diferencia > 0 ? '#27ae60' : '#e74c3c';
            const signe = a.diferencia > 0 ? '+' : '';
            html += '<tr>';
            html += '<td><strong>' + a.producte + '</strong></td>';
            html += '<td>' + a.unitat + '</td>';
            html += '<td style="text-align:right;">' + a.estocApp.toFixed(3) + '</td>';
            html += '<td style="text-align:right; font-weight:bold;">' + a.estocFisic.toFixed(3) + '</td>';
            html += '<td style="text-align:right; color:' + colorDif + '; font-weight:bold;">' + signe + a.diferencia.toFixed(3) + '</td>';
            html += '<td style="font-size:0.85em; color:#666;">' + (a.observacions || '-') + '</td>';
            html += '</tr>';
        });
 
        html += '</tbody></table>';
 
        // Botons
        html += '<div style="display:flex; gap:10px; justify-content:flex-end;">';
        html += '<button class="btn btn-secondary" onclick="document.getElementById(\'modal-inventari-fisic\').remove()">❌ Cancel·lar</button>';
        html += '<button class="btn btn-success" onclick="confirmarAjustosInventari(' + JSON.stringify(ambCanvis).replace(/'/g, "\\'") + ')">✅ Confirmar ' + ambCanvis.length + ' ajustos</button>';
        html += '</div>';
    }
 
    html += '</div>';
    modal.innerHTML = html;
    document.body.appendChild(modal);
 
    modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
    });
}
 
async function confirmarAjustosInventari(ajustos) {
    try {
        mostrarNotificacio('⏳ Aplicant ajustos...', 'info');
 
        const avui = new Date().toISOString().split('T')[0];
        let ajustsFets = 0;
        let errors = 0;
 
        for (let i = 0; i < ajustos.length; i++) {
            const ajust = ajustos[i];
 
            // Buscar producte_id pel nom
            let producteId = null;
            let tipusProducte = null;
 
            const fitosanitari = fitosanitaris.find(f => f.nom === ajust.producte);
            const fertilitzant = fertilitzants.find(f => f.nom === ajust.producte);
 
            if (fitosanitari) {
                producteId = fitosanitari.id;
                tipusProducte = 'fitosanitari';
            } else if (fertilitzant) {
                producteId = fertilitzant.id;
                tipusProducte = 'fertilitzant';
            }
 
            if (!producteId) {
                console.warn('⚠️ Producte no trobat:', ajust.producte);
                errors++;
                continue;
            }
 
            // Crear moviment d'ajust
            const moviment = {
                data: avui,
                producte_id: producteId,
                tipus_producte: tipusProducte,
                tipus_moviment: 'ajust_inventari',
                quantitat: ajust.diferencia,  // positiu = entrada, negatiu = sortida
                unitat: ajust.unitat,
                observacions: 'Inventari físic: ' + (ajust.observacions || 'Ajust manual'),
                creat_per: currentUser ? currentUser.id : null,
                estat: 'actiu'
            };
 
            const { error } = await supabaseClient
                .from('estoc_moviments')
                .insert([moviment]);
 
            if (error) {
                console.error('Error inserint ajust:', error);
                errors++;
            } else {
                ajustsFets++;
            }
        }
 
        // Tancar modal
        const modal = document.getElementById('modal-inventari-fisic');
        if (modal) modal.remove();
 
        if (errors > 0) {
            mostrarNotificacio('⚠️ ' + ajustsFets + ' ajustos aplicats, ' + errors + ' errors', 'warning');
        } else {
            mostrarNotificacio('✅ ' + ajustsFets + ' ajustos d\'inventari aplicats correctament', 'success');
        }
 
        // Recarregar existències
        await carregarTaulaExistencies();
 
    } catch (error) {
        console.error('Error aplicant ajustos:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

console.log('✅ Existències v1 carregat');