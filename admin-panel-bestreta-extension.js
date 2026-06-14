// ============================================================
// ADMIN PANEL - EXTENSIÓN BESTRETA
// Afegir DESPRÉS de admin-panel.v1.js a index.html
// ============================================================

async function mostrarVistaBestreta() {
    if (!fruites || fruites.length === 0) await carregarDadesCollita();
    await carregarDadesPreus();

    const container = document.getElementById('view-container');
    const campanyaActual = obtenirCampanyaActual();

    // Llegir campanya del filtre si ja existeix
    const campanyaFiltre = parseInt(document.getElementById('filtre-campanya-bestreta')?.value) || campanyaActual;

    let html = '<div class="vista-bestreta">';
    html += '<h2>💰 Gestió de Bestretes</h2>';

    // Filtre campanya + botó nova bestreta
    html += '<div style="display:flex;gap:15px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">';
    html += '<button class="btn btn-success" onclick="obrirModalNovabestreta()">➕ Nova Bestreta</button>';
    html += '<label style="font-weight:500;">Campanya:</label>';
    html += '<select id="filtre-campanya-bestreta" onchange="mostrarVistaBestreta()" style="padding:8px;border:1px solid #ddd;border-radius:4px;">';
    [2024, 2025, 2026, 2027].forEach(function(c) {
        const sel = c === campanyaFiltre ? ' selected' : '';
        html += '<option value="' + c + '"' + sel + '>' + c + '</option>';
    });
    html += '</select>';
    html += '</div>';

    // Filtrar per campanya
    const bestrestesFiltrades = preusAnuals.filter(function(b) {
        return b.campanya === campanyaFiltre;
    });

    // Agrupar per fruita
    const perFruita = {};
    bestrestesFiltrades.forEach(function(b) {
        const fruita = fruites.find(function(f) { return f.id === b.fruita_id; });
        const nomFruita = fruita ? fruita.nom : '-';
        if (!perFruita[nomFruita]) perFruita[nomFruita] = [];
        perFruita[nomFruita].push(b);
    });

    if (bestrestesFiltrades.length === 0) {
        html += '<p style="color:#999;text-align:center;padding:30px;">No hi ha bestretes per la campanya ' + campanyaFiltre + '</p>';
        html += '</div>';
        container.innerHTML = html;
        return;
    }

    // Una taula per fruita
    Object.keys(perFruita).sort().forEach(function(nomFruita) {
        const bestretes = perFruita[nomFruita].sort(function(a, b) {
            return a.num_bestreta - b.num_bestreta;
        });

        const colorFruita = nomFruita === 'Albercoc' ? '#f39c12' :
                            nomFruita === 'Nectarina' ? '#e74c3c' :
                            nomFruita === 'Préssec Pla' ? '#e91e8c' : '#27ae60';

        html += '<div style="margin-bottom:25px;">';
        html += '<h3 style="color:' + colorFruita + ';margin-bottom:10px;">🍑 ' + nomFruita + '</h3>';
        html += '<table class="data-table" style="width:100%;">';
        html += '<thead><tr>';
        html += '<th>Nº</th>';
        html += '<th>Preu (€/kg)</th>';
        html += '<th>Data Inici</th>';
        html += '<th>Data Final</th>';
        html += '<th>Estat</th>';
        html += '<th>Accions</th>';
        html += '</tr></thead><tbody>';

        const avui = new Date();
        bestretes.forEach(function(b) {
            const dataFinal = new Date(b.bestreta_data_final);
            const dataInici = new Date(b.bestreta_data_inici);
            let estat = '';
            if (avui < dataInici) {
                estat = '<span style="background:#9e9e9e;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">🔜 Pendent</span>';
            } else if (avui > dataFinal) {
                estat = '<span style="background:#27ae60;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">✅ Tancada</span>';
            } else {
                estat = '<span style="background:#ff9800;color:white;padding:3px 8px;border-radius:4px;font-size:12px;">⏳ Provisional</span>';
            }

            html += '<tr>';
            html += '<td><strong>' + b.num_bestreta + 'ª</strong></td>';
            html += '<td>' + parseFloat(b.bestreta_preu_unitari).toFixed(3) + '</td>';
            html += '<td>' + formatData(b.bestreta_data_inici) + '</td>';
            html += '<td>' + formatData(b.bestreta_data_final) + '</td>';
            html += '<td>' + estat + '</td>';
            html += '<td>';
            html += '<button class="btn btn-sm btn-primary" onclick="obrirModalEditarBestreta(\'' + b.id + '\')">✏️</button> ';
            html += '<button class="btn btn-sm btn-danger" onclick="eliminarBestreraConfirm(\'' + b.id + '\')">🗑️</button>';
            html += '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div>';
    });

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

    const anterior = document.getElementById('modal-nova-bestreta');
    if (anterior) anterior.remove();

    const campanyaActual = obtenirCampanyaActual();
    const campanyaFiltre = parseInt(document.getElementById('filtre-campanya-bestreta')?.value) || campanyaActual;

    // Calcular num_bestreta suggerit per cada fruita
    const suggeriments = {};
    fruites.forEach(function(f) {
        const bestresFruita = preusAnuals.filter(function(b) {
            return b.fruita_id === f.id && b.campanya === campanyaFiltre;
        });
        suggeriments[f.id] = bestresFruita.length + 1;
    });

    // Calcular dates suggerides (període actual)
    const avui = new Date();
    let mesInici, anyInici, mesFinal, anyFinal;
    if (avui.getDate() >= 21) {
        mesInici = avui.getMonth() + 1;
        anyInici = avui.getFullYear();
    } else {
        mesInici = avui.getMonth();
        anyInici = mesInici === 0 ? avui.getFullYear() - 1 : avui.getFullYear();
        if (mesInici === 0) mesInici = 12;
    }
    mesFinal = mesInici === 12 ? 1 : mesInici + 1;
    anyFinal = mesInici === 12 ? anyInici + 1 : anyInici;

    const dataIniciSug = anyInici + '-' + String(mesInici).padStart(2,'0') + '-21';
    const dataFinalSug = anyFinal + '-' + String(mesFinal).padStart(2,'0') + '-20';

    const modal = document.createElement('div');
    modal.id = 'modal-nova-bestreta';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <span class="close" onclick="tancarModal('modal-nova-bestreta')">&times;</span>
            <h2>➕ Nova Bestreta ${campanyaFiltre}</h2>
            <form id="form-nova-bestreta" onsubmit="guardarNovabestreta(event)">
                <div class="form-group">
                    <label>Campanya *</label>
                    <select id="bestreta-campanya" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        ${[2024,2025,2026,2027].map(c => `<option value="${c}"${c === campanyaFiltre ? ' selected' : ''}>${c}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Fruita *</label>
                    <select id="bestreta-fruita" required onchange="actualitzarNumBestreta()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        <option value="">Selecciona una fruita</option>
                        ${fruites.map(f => `<option value="${f.id}" data-num="${suggeriments[f.id] || 1}">${f.nom}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Nº Bestreta *</label>
                    <input type="number" id="bestreta-num" min="1" max="5" value="1" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
                <div class="form-group">
                    <label>Preu Unitari (€/kg) *</label>
                    <input type="number" id="bestreta-preu" placeholder="0.000" step="0.001" required style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
                <div class="form-group">
                    <label>Data Inici *</label>
                    <input type="date" id="bestreta-data-inici" required value="${dataIniciSug}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
                <div class="form-group">
                    <label>Data Final *</label>
                    <input type="date" id="bestreta-data-final" required value="${dataFinalSug}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
                <div style="margin-top:20px;">
                    <button type="submit" class="btn btn-success">💾 Guardar Bestreta</button>
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nova-bestreta')" style="margin-left:10px;">Cancel·lar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

function actualitzarNumBestreta() {
    const select = document.getElementById('bestreta-fruita');
    const opt = select.options[select.selectedIndex];
    const num = opt ? (opt.getAttribute('data-num') || 1) : 1;
    document.getElementById('bestreta-num').value = num;
}

async function guardarNovabestreta(event) {
    event.preventDefault();
    try {
        const campanya = parseInt(document.getElementById('bestreta-campanya').value);
        const fruitaId = document.getElementById('bestreta-fruita').value;
        const numBestreta = parseInt(document.getElementById('bestreta-num').value);
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
            num_bestreta: numBestreta,
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
    if (!bestreta) { mostrarNotificacio('Bestreta no trobada', 'error'); return; }

    const anterior = document.getElementById('modal-editar-bestreta');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-editar-bestreta';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:500px;">
            <span class="close" onclick="tancarModal('modal-editar-bestreta')">&times;</span>
            <h2>✏️ Editar Bestreta</h2>
            <form id="form-editar-bestreta" onsubmit="guardarEdicionBestreta(event, '${id}')">
                <div class="form-group">
                    <label>Fruita</label>
                    <select id="edit-bestreta-fruita" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                        ${fruites.map(f => `<option value="${f.id}"${f.id === bestreta.fruita_id ? ' selected' : ''}>${f.nom}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Nº Bestreta</label>
                    <input type="number" id="edit-bestreta-num" min="1" max="5" value="${bestreta.num_bestreta || 1}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
                <div class="form-group">
                    <label>Preu Unitari (€/kg)</label>
                    <input type="number" id="edit-bestreta-preu" step="0.001" value="${bestreta.bestreta_preu_unitari}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
                <div class="form-group">
                    <label>Data Inici</label>
                    <input type="date" id="edit-bestreta-data-inici" value="${bestreta.bestreta_data_inici}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
                <div class="form-group">
                    <label>Data Final</label>
                    <input type="date" id="edit-bestreta-data-final" value="${bestreta.bestreta_data_final}" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">
                </div>
                <div style="margin-top:20px;">
                    <button type="submit" class="btn btn-success">💾 Guardar Canvis</button>
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-editar-bestreta')" style="margin-left:10px;">Cancel·lar</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

async function guardarEdicionBestreta(event, id) {
    event.preventDefault();
    try {
        await actualitzarPreuBestreta(id, {
            fruita_id: document.getElementById('edit-bestreta-fruita').value,
            num_bestreta: parseInt(document.getElementById('edit-bestreta-num').value),
            bestreta_preu_unitari: parseFloat(document.getElementById('edit-bestreta-preu').value),
            bestreta_data_inici: document.getElementById('edit-bestreta-data-inici').value,
            bestreta_data_final: document.getElementById('edit-bestreta-data-final').value
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

console.log('✅ Admin Panel - Bestreta extension carregat');
