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
    
    // AGRUPAR per campanya
    const bestretesPorCampanya = {};
    preusAnuals.forEach(b => {
        if (!bestretesPorCampanya[b.campanya]) {
            bestretesPorCampanya[b.campanya] = [];
        }
        bestretesPorCampanya[b.campanya].push(b);
    });
    
    const campanyes = Object.keys(bestretesPorCampanya).sort().reverse();
    const campanyaActual = obtenirCampanyaActual();
    
    let html = '<div class="vista-bestreta">';
    html += '<h2>💰 Gestió de Bestretes</h2>';
    
    // Botó nova bestreta
    html += '<div style="margin-bottom: 20px;">';
    html += '<button class="btn btn-success" onclick="obrirModalNovabestreta()">➕ Nova Bestreta</button>';
    html += '</div>';
    
    if (campanyes.length === 0) {
        html += '<p style="text-align: center; color: #999;">No hi ha bestretes creades</p>';
    } else {
        // Mostrar per campanya
        campanyes.forEach(campanya => {
            const bestretes = bestretesPorCampanya[campanya];
            const esActual = parseInt(campanya) === campanyaActual ? ' (Actual)' : '';
            
            html += '<h3 style="margin-top: 30px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">Campanya ' + campanya + esActual + '</h3>';
            
            html += '<table class="data-table" style="width: 100%; margin-bottom: 20px;">';
            html += '<thead><tr>';
            html += '<th>Fruita</th>';
            html += '<th>Campanya</th>';
            html += '<th>Preu Unitari (€/kg)</th>';
            html += '<th>Data Inici</th>';
            html += '<th>Data Final</th>';
            html += '<th>Accions</th>';
            html += '</tr></thead>';
            html += '<tbody>';
            
            bestretes.forEach(bestreta => {
                const fruita = fruites.find(f => f.id === bestreta.fruita_id);
                
                html += '<tr>';
                html += '<td>' + (fruita ? fruita.nom : '-') + '</td>';
                html += '<td>' + bestreta.campanya + '</td>';
                html += '<td>' + arrodonarPreu(bestreta.bestreta_preu_unitari) + '</td>';
                html += '<td>' + formatData(bestreta.bestreta_data_inici) + '</td>';
                html += '<td>' + formatData(bestreta.bestreta_data_final) + '</td>';
                html += '<td>';
                html += '<button class="btn btn-sm btn-primary" onclick="obrirModalEditarBestreta(\'' + bestreta.id + '\')">✏️ Editar</button> ';
                html += '<button class="btn btn-sm btn-danger" onclick="eliminarBestreraConfirm(\'' + bestreta.id + '\')">🗑️ Eliminar</button>';
                html += '</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table>';
        });
    }
    
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
    
    // NETEJAR MODAL ANTERIOR SI EXISTEIX
    const modalAnterior = document.getElementById('modal-nova-bestreta');
    if (modalAnterior) {
        modalAnterior.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'modal-nova-bestreta';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.style.zIndex = '1000';
    
    const closeModal = function() {
        modal.style.display = 'none';
        modal.remove();
    };
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <span class="close" style="cursor: pointer;">&times;</span>
            <h2>➕ Nova Bestreta</h2>
            
            <form id="form-nova-bestreta">
                <div style="background: #fff3cd; padding: 10px; border-radius: 4px; margin-bottom: 15px;">
                    <strong>ℹ️ Campanya:</strong> S'assignarà automàticament segons la data d'inici
                </div>
                
                <div class="form-group">
                    <label>Fruita <span style="color: red;">*</span></label>
                    <select id="bestreta-fruita" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="">Selecciona una fruita</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Preu Unitari (€/kg) <span style="color: red;">*</span></label>
                    <input type="number" id="bestreta-preu" placeholder="0.000" step="0.001" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div class="form-group">
                    <label>Data Inici <span style="color: red;">*</span></label>
                    <input type="date" id="bestreta-data-inici" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <small style="color: #666;">La campanya es detectarà automàticament</small>
                </div>
                
                <div class="form-group">
                    <label>Data Final <span style="color: red;">*</span></label>
                    <input type="date" id="bestreta-data-final" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                
                <div style="margin-top: 20px;">
                    <button type="submit" class="btn btn-success" style="cursor: pointer;">💾 Guardar Bestreta</button>
                    <button type="button" class="btn btn-secondary" style="margin-left: 10px; cursor: pointer;">Cancelar</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // EVENT CLOSE X
    modal.querySelector('.close').onclick = closeModal;
    
    // EVENT BOTÓ CANCELAR
    modal.querySelector('button[type="button"]').onclick = closeModal;
    
    // EVENT FORM SUBMIT
    modal.querySelector('#form-nova-bestreta').onsubmit = function(event) {
        event.preventDefault();
        guardarNovabestreta(event);
    };
    
    // EVENT CLICK FORA DEL MODAL
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeModal();
        }
    };
    
    // OMPLIR SELECT DE FRUITA
    const select = document.getElementById('bestreta-fruita');
    if (select && fruites && fruites.length > 0) {
        fruites.forEach(f => {
            const option = document.createElement('option');
            option.value = f.id;
            option.textContent = f.nom;
            select.appendChild(option);
        });
    } else {
        console.warn('⚠️ Error: fruites no carregades o select no existent');
    }
}

async function guardarNovabestreta(event) {
    event.preventDefault();
    
    try {
        const fruitaId = document.getElementById('bestreta-fruita').value;
        const preu = parseFloat(document.getElementById('bestreta-preu').value);
        const dataInici = document.getElementById('bestreta-data-inici').value;
        const dataFinal = document.getElementById('bestreta-data-final').value;
        
        if (!fruitaId || !preu || !dataInici || !dataFinal) {
            mostrarNotificacio('Completa tots els camps', 'error');
            return;
        }
        
        // DETECTAR CAMPANYA PER DATA INICI (NO PER DATA ACTUAL)
        const campanya = obtenirCampanyaPerDates(dataInici);
        console.log('📅 Data inici: ' + dataInici + ' → Campanya detectada: ' + campanya);
        
        const bestreta = await crearPreuBestreta({
            campanya: campanya,
            fruita_id: fruitaId,
            bestreta_preu_unitari: preu,
            bestreta_data_inici: dataInici,
            bestreta_data_final: dataFinal,
            created_by: currentUser ? currentUser.id : null
        });
        
        mostrarNotificacio('✅ Bestreta ' + campanya + ' creada correctament', 'success');
        tancarModal('modal-nova-bestreta');
        
        // ⭐ RECARREGAR LA VISTA (ja ho fa crearPreuBestreta, però per seguretat)
        await mostrarVistaBestreta();
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
                    <label>Fruita</label>
                    <select id="edit-bestreta-fruita" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
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
    
    // Omplir select de fruita
    const select = document.getElementById('edit-bestreta-fruita');
    fruites.forEach(f => {
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
        
        // ⭐ RECARREGAR LA VISTA (ja ho fa actualitzarPreuBestreta, però per seguretat)
        await mostrarVistaBestreta();
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
        eliminarBestreta(id);
    }
}

async function eliminarBestreta(id) {
    try {
        await eliminarPreuBestreta(id);
        mostrarNotificacio('✅ Bestreta eliminada correctament', 'success');
        
        // ⭐ RECARREGAR LA VISTA (ja ho fa eliminarPreuBestreta, però per seguretat)
        await mostrarVistaBestreta();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// INICIALITZACIÓ
// ============================================================

console.log('✅ Admin Panel - Bestreta extension carregat');
