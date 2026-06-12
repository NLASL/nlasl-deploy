// ============================================================
// ADMIN PANEL - EXTENSIÓN BESTRETA
// Afegir DESPRÉS de admin-panel.v1.js a index.html
// ============================================================

// ============================================================
// BESTRETA - VISTA PRINCIPAL
// ============================================================

async function mostrarVistaBestreta() {
    if (!fruites || fruites.length === 0) {
        await carregarDadesCollita();
    }
    await carregarDadesPreus();

    const container = document.getElementById('view-container');
    const campanyaActual = obtenirCampanyaActual();

    let html = '<div class="vista-bestreta">';
    html += '<h2>💰 Gestió de Bestretes</h2>';

    // Filtre campanya + botó nova bestreta
    html += '<div style="display:flex;gap:15px;align-items:center;margin-bottom:20px;">';
    html += '<button class="btn btn-success" onclick="obrirModalNovabestreta()">➕ Nova Bestreta</button>';
    html += '<label style="font-weight:500;">Campanya:</label>';
    html += '<select id="filtre-campanya-bestreta" onchange="mostrarVistaBestreta()" style="padding:8px;border:1px solid #ddd;border-radius:4px;">';
    [2024, 2025, 2026, 2027].forEach(function(c) {
        const sel = c === campanyaActual ? ' selected' : '';
        html += '<option value="' + c + '"' + sel + '>' + c + '</option>';
    });
    html += '<option value="">Totes</option>';
    html += '</select>';
    html += '</div>';

    // Filtre
    const campanyaFiltre = document.getElementById('filtre-campanya-bestreta')?.value;
    const bestrestesFiltrades = campanyaFiltre
        ? preusAnuals.filter(function(b) { return b.campanya == campanyaFiltre; })
        : preusAnuals;

    // Taula bestretes
    html += '<table class="data-table" style="width: 100%;">';
    html += '<thead><tr>';
    html += '<th>Campanya</th>';
    html += '<th>Fruita</th>';
    html += '<th>Preu Unitari (€/kg)</th>';
    html += '<th>Data Inici</th>';
    html += '<th>Data Final</th>';
    html += '<th>Accions</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    if (bestrestesFiltrades.length === 0) {
        html += '<tr><td colspan="6" style="text-align: center; padding: 20px;">No hi ha bestretes per aquesta campanya</td></tr>';
    } else {
        bestrestesFiltrades.forEach(function(bestreta) {
            const fruita = fruites.find(function(f) { return f.id === bestreta.fruita_id; });

            html += '<tr>';
            html += '<td>' + bestreta.campanya + '</td>';
            html += '<td>' + (fruita ? fruita.nom : '-') + '</td>';
            html += '<td>' + arrodonarPreu(bestreta.bestreta_preu_unitari) + '</td>';
            html += '<td>' + formatData(bestreta.bestreta_data_inici) + '</td>';
            html += '<td>' + formatData(bestreta.bestreta_data_final) + '</td>';
            html += '<td>';
            html += '<button class="btn btn-sm btn-primary" onclick="obrirModalEditarBestreta(\'' + bestreta.id + '\')">✏️ Editar</button> ';
            html += '<button class="btn btn-sm btn-danger" onclick="eliminarBestreraConfirm(\'' + bestreta.id + '\')">🗑️ Eliminar</button>';
            html += '</td>';
            html += '</tr>';
        });
    }

    html += '</tbody></table>';
    html += '</div>';

    container.innerHTML = html;
}

// ============================================================
// MODAL NOVA BESTRETA
// ============================================================

function obrirModalNovabestreta() {
    if (!currentUserProfile || currentUserProfile.role !== 'admin') {
        mostrarNotificacio('Accés denegat', 'error');
        return;
    }

    // Eliminar modal anterior si existeix
    const anterior = document.getElementById('modal-nova-bestreta');
    if (anterior) anterior.remove();

    const campanyaActual = obtenirCampanyaActual();

    const modal = document.createElement('div');
    modal.id = 'modal-nova-bestreta';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="tancarModal('modal-nova-bestreta')">&times;</span>
            <h2>➕ Nova Bestreta</h2>

            <form id="form-nova-bestreta" onsubmit="guardarNovabestreta(event)">
                <div class="form-group">
                    <label>Campanya *</label>
                    <select id="bestreta-campanya" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        ${[2024,2025,2026,2027].map(c => `<option value="${c}"${c === campanyaActual ? ' selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Fruita *</label>
                    <select id="bestreta-fruita" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        <option value="">Selecciona una fruita</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Preu Unitari (€/kg) *</label>
                    <input type="number" id="bestreta-preu" placeholder="0.000" step="0.001" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>

                <div class="form-group">
                    <label>Data Inici *</label>
                    <input type="date" id="bestreta-data-inici" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>

                <div class="form-group">
                    <label>Data Final *</label>
                    <input type="date" id="bestreta-data-final" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>

                <div style="margin-top:20px;">
                    <button type="submit" class="btn btn-success">💾 Guardar Bestreta</button>
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nova-bestreta')" style="margin-left:10px;">Cancel·lar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Omplir select de fruites
    const select = document.getElementById('bestreta-fruita');
    fruites.forEach(function(f) {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = f.nom;
        select.appendChild(option);
    });
}

async function guardarNovabestreta(event) {
    event.preventDefault();

    try {
        const campanya = parseInt(document.getElementById('bestreta-campanya').value);
        const fruitaId = document.getElementById('bestreta-fruita').value;
        const preu = parseFloat(document.getElementById('bestreta-preu').value);
        const dataInici = document.getElementById('bestreta-data-inici').value;
        const dataFinal = document.getElementById('bestreta-data-final').value;

        if (!fruitaId || !preu || !dataInici || !dataFinal) {
            mostrarNotificacio('Completa tots els camps', 'error');
            return;
        }

        await crearPreuBestreta({
            campanya: campanya,
            fruita_id: fruitaId,
            bestreta_preu_unitari: preu,
            bestreta_data_inici: dataInici,
            bestreta_data_final: dataFinal,
            created_by: currentUser ? currentUser.id : null
        });

        mostrarNotificacio('✅ Bestreta creada correctament', 'success');
        tancarModal('modal-nova-bestreta');
        mostrarVistaBestreta();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL EDITAR BESTRETA
// ============================================================

async function obrirModalEditarBestreta(id) {
    if (!currentUserProfile || currentUserProfile.role !== 'admin') {
        mostrarNotificacio('Accés denegat', 'error');
        return;
    }

    await carregarDadesPreus();
    const bestreta = preusAnuals.find(function(b) { return b.id === id; });
    if (!bestreta) {
        mostrarNotificacio('Bestreta no trobada', 'error');
        return;
    }

    // Eliminar modal anterior si existeix
    const anterior = document.getElementById('modal-editar-bestreta');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-editar-bestreta';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="tancarModal('modal-editar-bestreta')">&times;</span>
            <h2>✏️ Editar Bestreta</h2>

            <form id="form-editar-bestreta" onsubmit="guardarEdicionBestreta(event, '${id}')">
                <div class="form-group">
                    <label>Fruita</label>
                    <select id="edit-bestreta-fruita" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                    </select>
                </div>

                <div class="form-group">
                    <label>Preu Unitari (€/kg)</label>
                    <input type="number" id="edit-bestreta-preu" step="0.001" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>

                <div class="form-group">
                    <label>Data Inici</label>
                    <input type="date" id="edit-bestreta-data-inici" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>

                <div class="form-group">
                    <label>Data Final</label>
                    <input type="date" id="edit-bestreta-data-final" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>

                <div style="margin-top:20px;">
                    <button type="submit" class="btn btn-success">💾 Guardar Canvis</button>
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-editar-bestreta')" style="margin-left:10px;">Cancel·lar</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    // Omplir select de fruites
    const select = document.getElementById('edit-bestreta-fruita');
    fruites.forEach(function(f) {
        const option = document.createElement('option');
        option.value = f.id;
        option.textContent = f.nom;
        if (f.id === bestreta.fruita_id) option.selected = true;
        select.appendChild(option);
    });

    document.getElementById('edit-bestreta-preu').value = bestreta.bestreta_preu_unitari;
    document.getElementById('edit-bestreta-data-inici').value = bestreta.bestreta_data_inici;
    document.getElementById('edit-bestreta-data-final').value = bestreta.bestreta_data_final;
}

async function guardarEdicionBestreta(event, id) {
    event.preventDefault();

    try {
        const fruitaId = document.getElementById('edit-bestreta-fruita').value;
        const preu = parseFloat(document.getElementById('edit-bestreta-preu').value);
        const dataInici = document.getElementById('edit-bestreta-data-inici').value;
        const dataFinal = document.getElementById('edit-bestreta-data-final').value;

        await actualitzarPreuBestreta(id, {
            fruita_id: fruitaId,
            bestreta_preu_unitari: preu,
            bestreta_data_inici: dataInici,
            bestreta_data_final: dataFinal
        });

        mostrarNotificacio('✅ Bestreta actualitzada correctament', 'success');
        tancarModal('modal-editar-bestreta');
        mostrarVistaBestreta();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ELIMINAR BESTRETA
// ============================================================

function eliminarBestreraConfirm(id) {
    if (confirm('Estàs segur que vols eliminar aquesta bestreta?')) {
        eliminarBesstreta(id);
    }
}

async function eliminarBesstreta(id) {
    try {
        await eliminarPreuBestreta(id);
        mostrarNotificacio('✅ Bestreta eliminada correctament', 'success');
        mostrarVistaBestreta();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// INICIALITZACIÓ
// ============================================================

console.log('✅ Admin Panel - Bestreta extension carregat');