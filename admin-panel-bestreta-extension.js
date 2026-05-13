// ============================================================
// ADMIN PANEL - EXTENSIÓN BESTRETA
// Afegir DESPRÉS de admin-panel.v1.js a index.html
// ============================================================

// ============================================================
// BESTRETA - VISTA PRINCIPAL
// ============================================================

async function mostrarVistaBestreta() {
    await carregarDadesPreus();
    
    const container = document.getElementById('view-container');
    
    let html = '<div class="vista-bestreta">';
    html += '<h2>💰 Gestió de Bestretes 2026</h2>';
    
    // Botó nova bestreta
    html += '<div style="margin-bottom: 20px;">';
    html += '<button class="btn btn-success" onclick="obrirModalNovabestreta()">➕ Nova Bestreta</button>';
    html += '</div>';
    
    // Taula bestretes
    html += '<table class="data-table" style="width: 100%;">';
    html += '<thead><tr>';
    html += '<th>Fruita</th>';
    html += '<th>Varietat</th>';
    html += '<th>Preu Unitari (€/kg)</th>';
    html += '<th>Data Inici</th>';
    html += '<th>Data Final</th>';
    html += '<th>Accions</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    if (preusAnuals.length === 0) {
        html += '<tr><td colspan="6" style="text-align: center; padding: 20px;">No hi ha bestretes creades</td></tr>';
    } else {
        preusAnuals.forEach(bestreta => {
            const varietat = varietats.find(v => v.id === bestreta.fruita_varietat_id);
            const fruita = fruites.find(f => f.id === varietat?.fruita_id);
            
            html += '<tr>';
            html += '<td>' + (fruita ? fruita.nom : '-') + '</td>';
            html += '<td>' + (varietat ? varietat.varietat : '-') + '</td>';
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
    
    const modal = document.createElement('div');
    modal.id = 'modal-nova-bestreta';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" onclick="tancarModal('modal-nova-bestreta')">&times;</span>
            <h2>➕ Nova Bestreta 2026</h2>
            
            <form id="form-nova-bestreta" onsubmit="guardarNovabestreta(event)">
                <div class="form-group">
                    <label>Fruita-Varietat <span style="color: red;">*</span></label>
                    <select id="bestreta-fruita-varietat" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Selecciona una varietat</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Preu Unitari (€/kg) <span style="color: red;">*</span></label>
                    <input type="number" id="bestreta-preu" placeholder="0.000" step="0.001" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div class="form-group">
                    <label>Data Inici <span style="color: red;">*</span></label>
                    <input type="date" id="bestreta-data-inici" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div class="form-group">
                    <label>Data Final <span style="color: red;">*</span></label>
                    <input type="date" id="bestreta-data-final" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-top: 20px;">
                    <button type="submit" class="btn btn-success">💾 Guardar Bestreta</button>
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nova-bestreta')" style="margin-left: 10px;">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Omplir select de fruita-varietat
    const select = document.getElementById('bestreta-fruita-varietat');
    varietats.forEach(v => {
        const fruita = fruites.find(f => f.id === v.fruita_id);
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = (fruita ? fruita.nom : '-') + ' / ' + v.varietat;
        select.appendChild(option);
    });
}

async function guardarNovabestreta(event) {
    event.preventDefault();
    
    try {
        const fruitaVarietatId = document.getElementById('bestreta-fruita-varietat').value;
        const preu = parseFloat(document.getElementById('bestreta-preu').value);
        const dataInici = document.getElementById('bestreta-data-inici').value;
        const dataFinal = document.getElementById('bestreta-data-final').value;
        
        if (!fruitaVarietatId || !preu || !dataInici || !dataFinal) {
            mostrarNotificacio('Completa tots els camps', 'error');
            return;
        }
        
        const bestreta = await crearPreuBestreta({
            campanya: 2026,
            fruita_varietat_id: fruitaVarietatId,
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
    const bestreta = preusAnuals.find(b => b.id === id);
    if (!bestreta) {
        mostrarNotificacio('Bestreta no trobada', 'error');
        return;
    }
    
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
                    <label>Fruita-Varietat</label>
                    <select id="edit-bestreta-fruita-varietat" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Preu Unitari (€/kg)</label>
                    <input type="number" id="edit-bestreta-preu" step="0.001" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div class="form-group">
                    <label>Data Inici</label>
                    <input type="date" id="edit-bestreta-data-inici" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div class="form-group">
                    <label>Data Final</label>
                    <input type="date" id="edit-bestreta-data-final" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-top: 20px;">
                    <button type="submit" class="btn btn-success">💾 Guardar Canvis</button>
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-editar-bestreta')" style="margin-left: 10px;">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Omplir selects
    const select = document.getElementById('edit-bestreta-fruita-varietat');
    varietats.forEach(v => {
        const fruita = fruites.find(f => f.id === v.fruita_id);
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = (fruita ? fruita.nom : '-') + ' / ' + v.varietat;
        if (v.id === bestreta.fruita_varietat_id) option.selected = true;
        select.appendChild(option);
    });
    
    document.getElementById('edit-bestreta-preu').value = bestreta.bestreta_preu_unitari;
    document.getElementById('edit-bestreta-data-inici').value = bestreta.bestreta_data_inici;
    document.getElementById('edit-bestreta-data-final').value = bestreta.bestreta_data_final;
}

async function guardarEdicionBestreta(event, id) {
    event.preventDefault();
    
    try {
        const preu = parseFloat(document.getElementById('edit-bestreta-preu').value);
        const dataInici = document.getElementById('edit-bestreta-data-inici').value;
        const dataFinal = document.getElementById('edit-bestreta-data-final').value;
        
        await actualitzarPreuBestreta(id, {
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
    if (confirm('¿Estàs segur que vols eliminar aquesta bestreta?')) {
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
