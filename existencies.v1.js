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
    html += '</div></div>';

    // Filtres
    html += '<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px;">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:15px;">';
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
            .select('*');
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

console.log('✅ Existències v1 carregat');