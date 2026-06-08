// ============================================================
// AGROSEGURO MODALS v1
// Modals NOVA i EDITAR pòlissa amb validacions
// ============================================================

// ============================================================
// MODAL NOVA PÒLISSA
// ============================================================

function obrirModalNovaPolissa() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-nova-polissa';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>➕ Nova Pòlissa</h2>
                <button class="modal-close" onclick="tancarModal('modal-nova-polissa')">✕</button>
            </div>
            
            <div class="modal-body">
                <form id="form-nova-polissa" onsubmit="guardarNovaPolissa(event)">
                    
                    <!-- DADES BASIQUES -->
                    <fieldset>
                        <legend>📋 Dades Pòlissa</legend>
                        
                        <div class="form-group">
                            <label for="nova-campanya">Campanya:</label>
                            <input 
                                type="number" 
                                id="nova-campanya" 
                                name="campanya" 
                                value="${new Date().getFullYear()}"
                                required
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="nova-num-polissa">Número Pòlissa:</label>
                            <input 
                                type="text" 
                                id="nova-num-polissa" 
                                name="num_polissa" 
                                placeholder="Ex: M263662-5"
                                required
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="nova-ref-collectiu">Referència Collectiva:</label>
                            <input 
                                type="text" 
                                id="nova-ref-collectiu" 
                                name="ref_collectiu" 
                                placeholder="Ex: 1732473-1"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label for="nova-num-rebut">Número Rebut:</label>
                            <input 
                                type="text" 
                                id="nova-num-rebut" 
                                name="num_rebut" 
                                placeholder="Ex: 1186280"
                            >
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="nova-linia">Linia:</label>
                                <select id="nova-linia" name="linia" required>
                                    <option value="">- Selecciona -</option>
                                    <option value="FRUTALAS">🍑 FRUTALAS</option>
                                    <option value="CEREAL">🌾 CEREAL</option>
                                    <option value="OLIVERA">🫒 OLIVERA</option>
                                    <option value="ALTRA">📋 ALTRA</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="nova-pla">Pla:</label>
                                <input 
                                    type="text" 
                                    id="nova-pla" 
                                    name="pla" 
                                    placeholder="Ex: 2024"
                                >
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="nova-categoria">Categoria:</label>
                                <select id="nova-categoria" name="categoria" required>
                                    <option value="PRINCIPAL">PRINCIPAL</option>
                                    <option value="COMPLEMENTARIA">COMPLEMENTARIA</option>
                                </select>
                            </div>
                        </div>
                    </fieldset>
                    
                    <!-- DATES -->
                    <fieldset>
                        <legend>📅 Dates</legend>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="nova-data-vigor">Data Vigor:</label>
                                <input 
                                    type="date" 
                                    id="nova-data-vigor" 
                                    name="data_vigor"
                                    required
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="nova-data-venciment">Data Venciment:</label>
                                <input 
                                    type="date" 
                                    id="nova-data-venciment" 
                                    name="data_venciment"
                                >
                            </div>
                        </div>
                    </fieldset>
                    
                    <!-- FINANCES -->
                    <fieldset>
                        <legend>💰 Finances</legend>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="nova-prima-comercial">Prima Comercial (€):</label>
                                <input 
                                    type="number" 
                                    id="nova-prima-comercial" 
                                    name="prima_comercial" 
                                    step="0.01"
                                    min="0"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="nova-prima-neta">Prima Neta (€):</label>
                                <input 
                                    type="number" 
                                    id="nova-prima-neta" 
                                    name="prima_neta" 
                                    step="0.01"
                                    min="0"
                                >
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="nova-subvencio-enesa">Subvencio ENESA (€):</label>
                                <input 
                                    type="number" 
                                    id="nova-subvencio-enesa" 
                                    name="subvencio_enesa" 
                                    step="0.01"
                                    min="0"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="nova-subvencio-ca">Subvencio CA (€):</label>
                                <input 
                                    type="number" 
                                    id="nova-subvencio-ca" 
                                    name="subvencio_ca" 
                                    step="0.01"
                                    min="0"
                                >
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="nova-cost-tomador">Cost Tomador (€):</label>
                                <input 
                                    type="number" 
                                    id="nova-cost-tomador" 
                                    name="cost_tomador" 
                                    step="0.01"
                                    min="0"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="nova-capital-assegurat">Capital Assegurat (€):</label>
                                <input 
                                    type="number" 
                                    id="nova-capital-assegurat" 
                                    name="capital_assegurat_total" 
                                    step="0.01"
                                    min="0"
                                    required
                                >
                            </div>
                        </div>
                    </fieldset>
                    
                    <!-- PRODUCCIÓ -->
                    <fieldset>
                        <legend>🌾 Producció</legend>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="nova-produccio-kg">Producció Total (kg):</label>
                                <input 
                                    type="number" 
                                    id="nova-produccio-kg" 
                                    name="produccio_total_kg" 
                                    step="0.01"
                                    min="0"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="nova-superficie-ha">Superfície Total (Ha):</label>
                                <input 
                                    type="number" 
                                    id="nova-superficie-ha" 
                                    name="superficie_total_ha" 
                                    step="0.01"
                                    min="0"
                                >
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="nova-num-parcelles">Número de Parcel·les:</label>
                            <input 
                                type="number" 
                                id="nova-num-parcelles" 
                                name="num_parcelles" 
                                min="0"
                            >
                        </div>
                    </fieldset>
                    
                    <!-- OBSERVACIONS -->
                    <fieldset>
                        <legend>📝 Observacions</legend>
                        
                        <div class="form-group">
                            <label for="nova-observacions">Observacions:</label>
                            <textarea 
                                id="nova-observacions" 
                                name="observacions"
                                rows="3"
                                placeholder="Notes addicionals..."
                            ></textarea>
                        </div>
                    </fieldset>
                    
                </form>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nova-polissa')">
                    Cancelar
                </button>
                <button type="submit" form="form-nova-polissa" class="btn btn-primary">
                    ✅ Guardar Pòlissa
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) tancarModal('modal-nova-polissa');
    });
}

// ============================================================
// MODAL EDITAR PÒLISSA
// ============================================================

async function obrirModalEditarPolissa(polissaId) {
    try {
        // Carregà pòlissa
        const polissa = polissesCache.find(p => p.id === polissaId);
        if (!polissa) throw new Error('Pòlissa no trobada');
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-editar-polissa';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✏️ Editar Pòlissa — ${polissa.num_polissa}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-editar-polissa')">✕</button>
                </div>
                
                <div class="modal-body">
                    <form id="form-editar-polissa" onsubmit="guardarEdicionPolissa(event, '${polissaId}')">
                        
                        <!-- DADES BASIQUES -->
                        <fieldset>
                            <legend>📋 Dades Pòlissa</legend>
                            
                            <div class="form-group">
                                <label for="edit-campanya">Campanya:</label>
                                <input 
                                    type="number" 
                                    id="edit-campanya" 
                                    name="campanya" 
                                    value="${polissa.campanya}"
                                    required
                                    readonly
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-num-polissa">Número Pòlissa:</label>
                                <input 
                                    type="text" 
                                    id="edit-num-polissa" 
                                    name="num_polissa" 
                                    value="${polissa.num_polissa}"
                                    required
                                    readonly
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-ref-collectiu">Referència Collectiva:</label>
                                <input 
                                    type="text" 
                                    id="edit-ref-collectiu" 
                                    name="ref_collectiu" 
                                    value="${polissa.ref_collectiu || ''}"
                                >
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-num-rebut">Número Rebut:</label>
                                <input 
                                    type="text" 
                                    id="edit-num-rebut" 
                                    name="num_rebut" 
                                    value="${polissa.num_rebut || ''}"
                                >
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-linia">Linia:</label>
                                    <select id="edit-linia" name="linia" required>
                                        <option value="FRUTALAS" ${polissa.linia === 'FRUTALAS' ? 'selected' : ''}>🍑 FRUTALAS</option>
                                        <option value="CEREAL" ${polissa.linia === 'CEREAL' ? 'selected' : ''}>🌾 CEREAL</option>
                                        <option value="OLIVERA" ${polissa.linia === 'OLIVERA' ? 'selected' : ''}>🫒 OLIVERA</option>
                                        <option value="ALTRA" ${polissa.linia === 'ALTRA' ? 'selected' : ''}>📋 ALTRA</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-pla">Pla:</label>
                                    <input 
                                        type="text" 
                                        id="edit-pla" 
                                        name="pla" 
                                        value="${polissa.pla || ''}"
                                    >
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-categoria">Categoria:</label>
                                    <select id="edit-categoria" name="categoria" required>
                                        <option value="PRINCIPAL" ${polissa.categoria === 'PRINCIPAL' ? 'selected' : ''}>PRINCIPAL</option>
                                        <option value="COMPLEMENTARIA" ${polissa.categoria === 'COMPLEMENTARIA' ? 'selected' : ''}>COMPLEMENTARIA</option>
                                    </select>
                                </div>
                            </div>
                        </fieldset>
                        
                        <!-- DATES -->
                        <fieldset>
                            <legend>📅 Dates</legend>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-data-vigor">Data Vigor:</label>
                                    <input 
                                        type="date" 
                                        id="edit-data-vigor" 
                                        name="data_vigor"
                                        value="${polissa.data_vigor || ''}"
                                        required
                                    >
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-data-venciment">Data Venciment:</label>
                                    <input 
                                        type="date" 
                                        id="edit-data-venciment" 
                                        name="data_venciment"
                                        value="${polissa.data_venciment || ''}"
                                    >
                                </div>
                            </div>
                        </fieldset>
                        
                        <!-- FINANCES -->
                        <fieldset>
                            <legend>💰 Finances</legend>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-prima-comercial">Prima Comercial (€):</label>
                                    <input 
                                        type="number" 
                                        id="edit-prima-comercial" 
                                        name="prima_comercial" 
                                        step="0.01"
                                        min="0"
                                        value="${polissa.prima_comercial || ''}"
                                    >
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-prima-neta">Prima Neta (€):</label>
                                    <input 
                                        type="number" 
                                        id="edit-prima-neta" 
                                        name="prima_neta" 
                                        step="0.01"
                                        min="0"
                                        value="${polissa.prima_neta || ''}"
                                    >
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-subvencio-enesa">Subvencio ENESA (€):</label>
                                    <input 
                                        type="number" 
                                        id="edit-subvencio-enesa" 
                                        name="subvencio_enesa" 
                                        step="0.01"
                                        min="0"
                                        value="${polissa.subvencio_enesa || ''}"
                                    >
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-subvencio-ca">Subvencio CA (€):</label>
                                    <input 
                                        type="number" 
                                        id="edit-subvencio-ca" 
                                        name="subvencio_ca" 
                                        step="0.01"
                                        min="0"
                                        value="${polissa.subvencio_ca || ''}"
                                    >
                                </div>
                            </div>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-cost-tomador">Cost Tomador (€):</label>
                                    <input 
                                        type="number" 
                                        id="edit-cost-tomador" 
                                        name="cost_tomador" 
                                        step="0.01"
                                        min="0"
                                        value="${polissa.cost_tomador || ''}"
                                    >
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-capital-assegurat">Capital Assegurat (€):</label>
                                    <input 
                                        type="number" 
                                        id="edit-capital-assegurat" 
                                        name="capital_assegurat_total" 
                                        step="0.01"
                                        min="0"
                                        value="${polissa.capital_assegurat_total || ''}"
                                        required
                                    >
                                </div>
                            </div>
                        </fieldset>
                        
                        <!-- PRODUCCIÓ -->
                        <fieldset>
                            <legend>🌾 Producció</legend>
                            
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="edit-produccio-kg">Producció Total (kg):</label>
                                    <input 
                                        type="number" 
                                        id="edit-produccio-kg" 
                                        name="produccio_total_kg" 
                                        step="0.01"
                                        min="0"
                                        value="${polissa.produccio_total_kg || ''}"
                                    >
                                </div>
                                
                                <div class="form-group">
                                    <label for="edit-superficie-ha">Superfície Total (Ha):</label>
                                    <input 
                                        type="number" 
                                        id="edit-superficie-ha" 
                                        name="superficie_total_ha" 
                                        step="0.01"
                                        min="0"
                                        value="${polissa.superficie_total_ha || ''}"
                                    >
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label for="edit-num-parcelles">Número de Parcel·les:</label>
                                <input 
                                    type="number" 
                                    id="edit-num-parcelles" 
                                    name="num_parcelles" 
                                    min="0"
                                    value="${polissa.num_parcelles || ''}"
                                >
                            </div>
                        </fieldset>
                        
                        <!-- OBSERVACIONS -->
                        <fieldset>
                            <legend>📝 Observacions</legend>
                            
                            <div class="form-group">
                                <label for="edit-observacions">Observacions:</label>
                                <textarea 
                                    id="edit-observacions" 
                                    name="observacions"
                                    rows="3"
                                >${polissa.observacions || ''}</textarea>
                            </div>
                        </fieldset>
                        
                    </form>
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-editar-polissa')">
                        Cancelar
                    </button>
                    <button type="submit" form="form-editar-polissa" class="btn btn-primary">
                        ✅ Guardar Canvis
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) tancarModal('modal-editar-polissa');
        });
        
    } catch (error) {
        mostrarNotificacio('Error obrint modal: ' + error.message, 'error');
    }
}

// ============================================================
// GUARDAR NOVA PÒLISSA
// ============================================================

async function guardarNovaPolissa(event) {
    event.preventDefault();
    
    try {
        const form = document.getElementById('form-nova-polissa');
        const dades = new FormData(form);
        
        // Construir objecte pòlissa
        const polissa = {
            campanya: parseInt(dades.get('campanya')),
            num_polissa: dades.get('num_polissa'),
            ref_collectiu: dades.get('ref_collectiu') || null,
            num_rebut: dades.get('num_rebut') || null,
            linia: dades.get('linia'),
            pla: dades.get('pla') || null,
            categoria: dades.get('categoria'),
            data_vigor: dades.get('data_vigor') || null,
            data_venciment: dades.get('data_venciment') || null,
            prima_comercial: parseFloat(dades.get('prima_comercial')) || 0,
            prima_neta: parseFloat(dades.get('prima_neta')) || 0,
            subvencio_enesa: parseFloat(dades.get('subvencio_enesa')) || 0,
            subvencio_ca: parseFloat(dades.get('subvencio_ca')) || 0,
            cost_tomador: parseFloat(dades.get('cost_tomador')) || 0,
            capital_assegurat_total: parseFloat(dades.get('capital_assegurat_total')),
            produccio_total_kg: parseFloat(dades.get('produccio_total_kg')) || null,
            superficie_total_ha: parseFloat(dades.get('superficie_total_ha')) || null,
            num_parcelles: parseInt(dades.get('num_parcelles')) || null,
            observacions: dades.get('observacions') || null
        };
        
        // Validacions
        if (!polissa.num_polissa) throw new Error('Número de pòlissa obligatori');
        if (!polissa.linia) throw new Error('Linia obligatoria');
        if (polissa.capital_assegurat_total <= 0) throw new Error('Capital assegurat ha de ser > 0');
        
        // Crear a Supabase
        const novaPolissa = await createPolissa(polissa);
        
        mostrarNotificacio('✅ Pòlissa creada correctament', 'success');
        tancarModal('modal-nova-polissa');
        
        // Recarregar vista
        await mostrarVistaAgroseguro();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// GUARDAR EDICIO PÒLISSA
// ============================================================

async function guardarEdicionPolissa(event, polissaId) {
    event.preventDefault();
    
    try {
        const form = document.getElementById('form-editar-polissa');
        const dades = new FormData(form);
        
        // Construir objecte actualització
        const polissa = {
            ref_collectiu: dades.get('ref_collectiu') || null,
            num_rebut: dades.get('num_rebut') || null,
            linia: dades.get('linia'),
            pla: dades.get('pla') || null,
            categoria: dades.get('categoria'),
            data_vigor: dades.get('data_vigor') || null,
            data_venciment: dades.get('data_venciment') || null,
            prima_comercial: parseFloat(dades.get('prima_comercial')) || 0,
            prima_neta: parseFloat(dades.get('prima_neta')) || 0,
            subvencio_enesa: parseFloat(dades.get('subvencio_enesa')) || 0,
            subvencio_ca: parseFloat(dades.get('subvencio_ca')) || 0,
            cost_tomador: parseFloat(dades.get('cost_tomador')) || 0,
            capital_assegurat_total: parseFloat(dades.get('capital_assegurat_total')),
            produccio_total_kg: parseFloat(dades.get('produccio_total_kg')) || null,
            superficie_total_ha: parseFloat(dades.get('superficie_total_ha')) || null,
            num_parcelles: parseInt(dades.get('num_parcelles')) || null,
            observacions: dades.get('observacions') || null
        };
        
        // Validacions
        if (!polissa.linia) throw new Error('Linia obligatoria');
        if (polissa.capital_assegurat_total <= 0) throw new Error('Capital assegurat ha de ser > 0');
        
        // Actualitzar a Supabase
        await updatePolissa(polissaId, polissa);
        
        mostrarNotificacio('✅ Pòlissa actualitzada correctament', 'success');
        tancarModal('modal-editar-polissa');
        
        // Recarregar vista
        await mostrarVistaAgroseguro();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ESTILS MODAL FORMS (afegir a agroseguro-styles.css o inline)
// ============================================================

// Els estils estan a agroseguro-styles.css
// Afegir si no existeixen:
/*
fieldset {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 15px;
}

legend {
    padding: 0 10px;
    font-weight: 600;
    color: var(--verde-principal);
}

.form-group {
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
}

.form-group label {
    font-weight: 500;
    margin-bottom: 4px;
    font-size: 13px;
    color: var(--gris-fosc);
}

.form-group input,
.form-group select,
.form-group textarea {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: var(--verde-principal);
    box-shadow: 0 0 0 3px rgba(45, 80, 22, 0.1);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}

.btn-primary {
    background-color: var(--verde-principal);
    color: white;
}

.btn-primary:hover {
    background-color: #1f3a0d;
}
*/

console.log('✅ Agroseguro Modals v1 carregat');
