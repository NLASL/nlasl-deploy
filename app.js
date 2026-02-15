// ============================================================
// APP.JS - Lògica principal aplicació
// Quadern de Camp NLASL - Cloud Version
// ============================================================

// ============================================================
// VARIABLES GLOBALS
// ============================================================

let parcelles = [];
let tractaments = [];
let fertilitzacions = [];
let fitosanitaris = [];
let fertilitzants = [];

let vistaActual = 'dashboard';

// ============================================================
// FUNCIONS UTILITAT
// ============================================================

function generateId() {
    return crypto.randomUUID();
}

function formatData(data) {
    if (!data) return '';
    const d = new Date(data);
    return d.toLocaleDateString('ca-ES');
}

function mostrarNotificacio(missatge, tipus = 'info') {
    const container = document.getElementById('notificacions');
    if (!container) return;
    
    const notif = document.createElement('div');
    notif.className = `notificacio notificacio-${tipus}`;
    notif.textContent = missatge;
    
    container.appendChild(notif);
    
    setTimeout(() => {
        notif.classList.add('notificacio-sortint');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// ============================================================
// NAVEGACIÓ I CANVI DE VISTES
// ============================================================

function canviarVista(vista) {
    vistaActual = vista;
    
    // Actualitzar navegació activa
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-view') === vista) {
            btn.classList.add('active');
        }
    });
    
    // Carregar vista
    const container = document.getElementById('view-container');
    
    switch(vista) {
        case 'dashboard':
            carregarDashboard();
            break;
        case 'parcelles':
            carregarVistaParcelles();
            break;
        case 'tractaments':
            carregarVistaTractaments();
            break;
        case 'fertilitzacions':
            carregarVistaFertilitzacions();
            break;
        case 'productes':
            carregarVistaProductes();
            break;
        default:
            container.innerHTML = '<p>Vista no trobada</p>';
    }
}

// ============================================================
// DASHBOARD
// ============================================================

async function carregarDashboard() {
    const container = document.getElementById('view-container');
    
    // Carregar dades
    try {
        parcelles = await getParcellas();
        tractaments = await getTractaments();
        fertilitzacions = await getFertilitzacions();
        fitosanitaris = await getFitosanitaris();
        fertilitzants = await getFertilitzants();
    } catch (error) {
        console.error('Error carregant dades:', error);
        mostrarNotificacio('Error carregant dades', 'error');
    }
    
    // Estadístiques
    const totalSuperficie = parcelles.reduce((sum, p) => sum + (parseFloat(p.superficie) || 0), 0);
    const totalRegadiu = parcelles.filter(p => p.regadiu).reduce((sum, p) => sum + (parseFloat(p.superficie) || 0), 0);
    const totalSeca = totalSuperficie - totalRegadiu;
    
    const totalTractaments = tractaments.length;
    const totalFertilitzacions = fertilitzacions.length;
    
    const totalFitosanitaris = fitosanitaris.length;
    const totalFertilitzantsDB = fertilitzants.length;
    
   container.innerHTML = `
    <div class="dashboard">
        <h2>📊 Resum General</h2>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">🗺️</div>
                <div class="stat-info">
                    <div class="stat-value">${parcelles.length}</div>
                    <div class="stat-label">Parcel·les</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">📏</div>
                <div class="stat-info">
                    <div class="stat-value">${totalSuperficie.toFixed(2)} Ha</div>
                    <div class="stat-label">Superfície Total</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">💧</div>
                <div class="stat-info">
                    <div class="stat-value">${totalRegadiu.toFixed(2)} Ha</div>
                    <div class="stat-label">Regadiu</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">🌾</div>
                <div class="stat-info">
                    <div class="stat-value">${totalSeca.toFixed(2)} Ha</div>
                    <div class="stat-label">Secà</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">🌱</div>
                <div class="stat-info">
                    <div class="stat-value">${totalTractaments}</div>
                    <div class="stat-label">Tractaments</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">🌿</div>
                <div class="stat-info">
                    <div class="stat-value">${totalFertilitzacions}</div>
                    <div class="stat-label">Fertilitzacions</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">🧪</div>
                <div class="stat-info">
                    <div class="stat-value">${totalFitosanitaris}</div>
                    <div class="stat-label">Fitosanitaris</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">🌱</div>
                <div class="stat-info">
                    <div class="stat-value">${totalFertilitzantsDB}</div>
                    <div class="stat-label">Adobs</div>
                </div>
            </div>
        </div>

        <div class="dashboard-actions">
            <h3>Accions Ràpides</h3>
            <div class="quick-actions">
                <button class="btn btn-primary" onclick="canviarVista('parcelles')">
                    🗺️ Veure Parcel·les
                </button>
                <button class="btn btn-success" onclick="canviarVista('tractaments')">
                    🌱 Nou Tractament
                </button>
                <button class="btn btn-success" onclick="canviarVista('fertilitzacions')">
                    🌿 Nova Fertilització
                </button>
                <button class="btn btn-secondary" onclick="canviarVista('productes')">
                    📦 Gestionar Productes
                </button>
            </div>
        </div>
    </div>
`;

}

// ============================================================
// VISTA PARCEL·LES
// ============================================================

async function carregarVistaParcelles() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');

    container.innerHTML = `
        <div class="view-parcelles">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>🗺️ Parcel·les</h2>
                ${podeCrear ? `
                    <button class="btn btn-primary" onclick="obrirModalParcella()">
                        ➕ Nova Parcel·la
                    </button>
                ` : ''}
            </div>
            
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>SIGPAC</th>
                            <th>Recinte</th>
                            <th>Cultiu</th>
                            <th>Varietat</th>
                            <th>Superfície (Ha)</th>
                            <th>Any Plantació</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-parcelles">
                        <tr><td colspan="8">Carregant...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        ${podeCrear ? crearModalParcella() : ''}
    `;

    await carregarTaulaParcelles();
}

async function carregarTaulaParcelles() {
    const tbody = document.getElementById('tbody-parcelles');
    if (!tbody) return;

    try {
        parcelles = await getParcellas();

        if (parcelles.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">No hi ha parcel·les registrades</td>
                </tr>
            `;
            return;
        }

        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');

        tbody.innerHTML = parcelles.map(p => `
            <tr>
                <td><strong>${p.nom}</strong></td>
                <td>${p.sigpac}</td>
                <td>${p.recinte || '-'}</td>
                <td>${p.cultiu}</td>
                <td>${p.varietat || '-'}</td>
                <td>${p.superficie}</td>
                <td>${p.any_plantacio || '-'}</td>
                <td>
                    ${podeEditar ? `
                        <button class="btn btn-secondary btn-sm" onclick="editarParcella('${p.id}')">✏️</button>
                    ` : ''}
                    ${podeEliminar ? `
                        <button class="btn btn-secondary btn-sm" onclick="eliminarParcellaConfirm('${p.id}')">🗑️</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error carregant parcel·les:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">Error carregant parcel·les</td>
            </tr>
        `;
    }
}

function crearModalParcella() {
    return `
        <div id="modal-parcella" class="modal">
            <div class="modal-content">
                <span class="close" onclick="tancarModal('modal-parcella')">&times;</span>
                <h2 id="modal-parcella-title">Nova Parcel·la</h2>

                <form id="form-parcella" onsubmit="guardarParcella(event)">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Nom:</label>
                            <input type="text" id="parc-nom" required>
                        </div>
                        <div class="form-group">
                            <label>SIGPAC:</label>
                            <input type="text" id="parc-sigpac" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Recinte:</label>
                            <input type="text" id="parc-recinte">
                        </div>
                        <div class="form-group">
                            <label>Cultiu:</label>
                            <input type="text" id="parc-cultiu" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Varietat:</label>
                            <input type="text" id="parc-varietat">
                        </div>
                        <div class="form-group">
                            <label>Superfície (Ha):</label>
                            <input type="number" step="0.01" id="parc-superficie" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Any Plantació:</label>
                            <input type="text" id="parc-any">
                        </div>
                        <div class="form-group">
                            <label>Densitat:</label>
                            <input type="text" id="parc-densitat">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Observacions:</label>
                        <textarea id="parc-observacions" rows="3"></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-parcella')">Cancel·lar</button>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// ============================================================
// FUNCIONS PARCEL·LES (continuació)
// ============================================================

function obrirModalParcella() {
    document.getElementById('modal-parcella-title').textContent = 'Nova Parcel·la';
    document.getElementById('form-parcella').reset();
    document.getElementById('form-parcella').removeAttribute('data-edit-id');
    document.getElementById('modal-parcella').classList.add('active');
}

function tancarModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

async function guardarParcella(event) {
    event.preventDefault();

    const form = event.target;
    const editId = form.getAttribute('data-edit-id');

    const parcellaData = {
        nom: document.getElementById('parc-nom').value,
        sigpac: document.getElementById('parc-sigpac').value,
        recinte: document.getElementById('parc-recinte').value,
        cultiu: document.getElementById('parc-cultiu').value,
        varietat: document.getElementById('parc-varietat').value,
        superficie: parseFloat(document.getElementById('parc-superficie').value),
        any_plantacio: document.getElementById('parc-any').value,
        densitat: document.getElementById('parc-densitat').value,
        observacions: document.getElementById('parc-observacions').value,
        regadiu: false
    };

    try {
        if (editId) {
            await updateParcella(editId, parcellaData);
            mostrarNotificacio('✅ Parcel·la actualitzada correctament', 'success');
        } else {
            await createParcella(parcellaData);
            mostrarNotificacio('✅ Parcel·la creada correctament', 'success');
        }

        tancarModal('modal-parcella');
        await carregarTaulaParcelles();

    } catch (error) {
        console.error('Error guardant parcel·la:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function editarParcella(id) {
    const parcella = parcelles.find(p => p.id === id);
    if (!parcella) return;

    document.getElementById('parc-nom').value = parcella.nom || '';
    document.getElementById('parc-sigpac').value = parcella.sigpac || '';
    document.getElementById('parc-recinte').value = parcella.recinte || '';
    document.getElementById('parc-cultiu').value = parcella.cultiu || '';
    document.getElementById('parc-varietat').value = parcella.varietat || '';
    document.getElementById('parc-superficie').value = parcella.superficie || '';
    document.getElementById('parc-any').value = parcella.any_plantacio || '';
    document.getElementById('parc-densitat').value = parcella.densitat || '';
    document.getElementById('parc-observacions').value = parcella.observacions || '';

    document.getElementById('form-parcella').setAttribute('data-edit-id', id);
    document.getElementById('modal-parcella-title').textContent = '✏️ Editar Parcel·la';
    document.getElementById('modal-parcella').classList.add('active');
}

async function eliminarParcellaConfirm(id) {
    if (confirm('Segur que vols eliminar aquesta parcel·la?')) {
        try {
            await deleteParcella(id);
            mostrarNotificacio('✅ Parcel·la eliminada correctament', 'success');
            await carregarTaulaParcelles();
        } catch (error) {
            console.error('Error eliminant parcel·la:', error);
            mostrarNotificacio('❌ Error: ' + error.message, 'error');
        }
    }
}

// ============================================================
// VISTA TRACTAMENTS
// ============================================================

async function carregarVistaTractaments() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');

    container.innerHTML = `
        <div class="view-tractaments">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>🌱 Tractaments Fitosanitaris</h2>
                ${podeCrear ? `
                    <button class="btn btn-primary" onclick="obrirModalTractament()">
                        ➕ Nou Tractament
                    </button>
                ` : ''}
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Parcel·la</th>
                            <th>Producte</th>
                            <th>Dosi</th>
                            <th>Plaç Seguretat</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-tractaments">
                        <tr><td colspan="6">Carregant...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        ${podeCrear ? crearModalTractament() : ''}
    `;

    await carregarTaulaTractaments();
}

async function carregarTaulaTractaments() {
    const tbody = document.getElementById('tbody-tractaments');
    if (!tbody) return;

    try {
        tractaments = await getTractaments();

        if (tractaments.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" class="empty-state">No hi ha tractaments registrats</td></tr>
            `;
            return;
        }

        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');

        tbody.innerHTML = tractaments.map(t => {
            const parcella = parcelles.find(p => p.id === t.parcella_id);
            const producte = fitosanitaris.find(f => f.id === t.producte_id);

            return `
                <tr>
                    <td>${formatData(t.data)}</td>
                    <td>${parcella ? parcella.nom : '-'}</td>
                    <td>${producte ? producte.nom : '-'}</td>
                    <td>${t.dosi} ${t.unitat}</td>
                    <td>${t.data_limit ? formatData(t.data_limit) : '-'}</td>
                    <td>
                        ${podeEditar ? `
                            <button class="btn btn-secondary btn-sm" onclick="editarTractament('${t.id}')">✏️</button>
                        ` : ''}
                        ${podeEliminar ? `
                            <button class="btn btn-secondary btn-sm" onclick="eliminarTractamentConfirm('${t.id}')">🗑️</button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error carregant tractaments:', error);
        tbody.innerHTML = `
            <tr><td colspan="6" class="empty-state">Error carregant tractaments</td></tr>
        `;
    }
}

function crearModalTractament() {
    return `
        <div id="modal-tractament" class="modal">
            <div class="modal-content">
                <span class="close" onclick="tancarModal('modal-tractament')">&times;</span>
                <h2 id="modal-tractament-title">Nou Tractament</h2>

                <form id="form-tractament" onsubmit="guardarTractament(event)">
                    <div class="form-row">
                        <div class="form-group">
                            <label>Data:</label>
                            <input type="date" id="trac-data" required>
                        </div>
                        <div class="form-group">
                            <label>Parcel·la:</label>
                            <select id="trac-parcella" required>
                                <option value="">Selecciona...</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Producte:</label>
                            <select id="trac-producte" required onchange="actualitzarPlacTractament()">
                                <option value="">Selecciona...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Dosi:</label>
                            <input type="number" step="0.01" id="trac-dosi" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Unitat:</label>
                            <select id="trac-unitat" required>
                                <option value="kg/ha">kg/ha</option>
                                <option value="l/ha">l/ha</option>
                                <option value="g/hl">g/hl</option>
                                <option value="ml/hl">ml/hl</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Plaç Seguretat (dies):</label>
                            <input type="number" id="trac-plac" readonly>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Data Límit Collita:</label>
                        <input type="date" id="trac-data-limit" readonly>
                    </div>

                    <div class="form-group">
                        <label>Observacions:</label>
                        <textarea id="trac-observacions" rows="3"></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-tractament')">Cancel·lar</button>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function obrirModalTractament() {
    document.getElementById('modal-tractament-title').textContent = 'Nou Tractament';
    document.getElementById('form-tractament').reset();
    document.getElementById('form-tractament').removeAttribute('data-edit-id');

    document.getElementById('trac-data').valueAsDate = new Date();

    carregarOpcionsParcelles('trac-parcella');
    carregarOpcionsFitosanitaris();

    document.getElementById('modal-tractament').classList.add('active');
}

function carregarOpcionsParcelles(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = `
        <option value="">Selecciona...</option>
        ${parcelles.map(p => `<option value="${p.id}">${p.nom}</option>`).join('')}
    `;
}

function carregarOpcionsFitosanitaris() {
    const select = document.getElementById('trac-producte');
    if (!select) return;

    select.innerHTML = `
        <option value="">Selecciona...</option>
        ${fitosanitaris.map(f => `<option value="${f.id}">${f.nom}</option>`).join('')}
    `;
}
function actualitzarPlacTractament() {
    const producteId = document.getElementById('trac-producte').value;
    const dataInput = document.getElementById('trac-data').value;

    if (!producteId || !dataInput) return;

    const producte = fitosanitaris.find(f => f.id === producteId);
    if (!producte) return;

    const plac = producte.plac || 0;
    document.getElementById('trac-plac').value = plac;

    // Calcular data límit
    const dataTractament = new Date(dataInput);
    const dataLimit = new Date(dataTractament);
    dataLimit.setDate(dataLimit.getDate() + plac);

    document.getElementById('trac-data-limit').valueAsDate = dataLimit;
}

async function guardarTractament(event) {
    event.preventDefault();

    const form = event.target;
    const editId = form.getAttribute('data-edit-id');

    const tractamentData = {
        data: document.getElementById('trac-data').value,
        parcella_id: document.getElementById('trac-parcella').value,
        producte_id: document.getElementById('trac-producte').value,
        dosi: parseFloat(document.getElementById('trac-dosi').value),
        unitat: document.getElementById('trac-unitat').value,
        data_limit: document.getElementById('trac-data-limit').value,
        observacions: document.getElementById('trac-observacions').value
    };

    try {
        if (editId) {
            await updateTractament(editId, tractamentData);
            mostrarNotificacio('✅ Tractament actualitzat correctament', 'success');
        } else {
            await createTractament(tractamentData);
            mostrarNotificacio('✅ Tractament creat correctament', 'success');
        }

        tancarModal('modal-tractament');
        await carregarTaulaTractaments();

    } catch (error) {
        console.error('Error guardant tractament:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function editarTractament(id) {
    const tractament = tractaments.find(t => t.id === id);
    if (!tractament) return;

    carregarOpcionsParcelles('trac-parcella');
    carregarOpcionsFitosanitaris();

    document.getElementById('trac-data').value = tractament.data;
    document.getElementById('trac-parcella').value = tractament.parcella_id;
    document.getElementById('trac-producte').value = tractament.producte_id;
    document.getElementById('trac-dosi').value = tractament.dosi;
    document.getElementById('trac-unitat').value = tractament.unitat;
    document.getElementById('trac-data-limit').value = tractament.data_limit || '';
    document.getElementById('trac-observacions').value = tractament.observacions || '';

    document.getElementById('form-tractament').setAttribute('data-edit-id', id);
    document.getElementById('modal-tractament-title').textContent = '✏️ Editar Tractament';
    document.getElementById('modal-tractament').classList.add('active');
}

async function eliminarTractamentConfirm(id) {
    if (confirm('Segur que vols eliminar aquest tractament?')) {
        try {
            await deleteTractament(id);
            mostrarNotificacio('✅ Tractament eliminat correctament', 'success');
            await carregarTaulaTractaments();
        } catch (error) {
            console.error('Error eliminant tractament:', error);
            mostrarNotificacio('❌ Error: ' + error.message, 'error');
        }
    }
}

// ============================================================
// VISTA FERTILITZACIONS
// ============================================================

async function carregarVistaFertilitzacions() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');

    container.innerHTML = `
        <div class="view-fertilitzacions">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>🌿 Fertilitzacions</h2>
                ${podeCrear ? `
                    <button class="btn btn-primary" onclick="alert('Funcionalitat en desenvolupament')">
                        ➕ Nova Fertilització
                    </button>
                ` : ''}
            </div>

            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Parcel·la</th>
                            <th>Producte</th>
                            <th>Dosi</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-fertilitzacions">
                        <tr><td colspan="5">Carregant...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    await carregarTaulaFertilitzacions();
}

async function carregarTaulaFertilitzacions() {
    const tbody = document.getElementById('tbody-fertilitzacions');
    if (!tbody) return;

    try {
        fertilitzacions = await getFertilitzacions();

        if (fertilitzacions.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="5" class="empty-state">No hi ha fertilitzacions registrades</td></tr>
            `;
            return;
        }

        tbody.innerHTML = fertilitzacions.map(f => {
            const parcella = parcelles.find(p => p.id === f.parcella_id);
            const producte = fertilitzants.find(p => p.id === f.producte_id);

            return `
                <tr>
                    <td>${formatData(f.data)}</td>
                    <td>${parcella ? parcella.nom : '-'}</td>
                    <td>${producte ? producte.nom : '-'}</td>
                    <td>${f.dosi} ${f.unitat}</td>
                    <td>-</td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error carregant fertilitzacions:', error);
        tbody.innerHTML = `
            <tr><td colspan="5" class="empty-state">Error carregant fertilitzacions</td></tr>
        `;
    }
}

// ============================================================
// VISTA PRODUCTES
// ============================================================

async function carregarVistaProductes() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');

    container.innerHTML = `
        <div class="view-productes">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>📦 Base de Dades de Productes</h2>
                ${podeCrear ? `
                    <button class="btn btn-primary" onclick="obrirModalProducte()">
                        ➕ Nou Producte
                    </button>
                ` : ''}
            </div>

            <div class="tabs">
                <button class="tab-btn active" onclick="canviarTabProductes('fitosanitaris', event)">
                    🧪 Fitosanitaris (${fitosanitaris.length})
                </button>
                <button class="tab-btn" onclick="canviarTabProductes('fertilitzants', event)">
                    🌱 Fertilitzants (${fertilitzants.length})
                </button>
            </div>

            <div id="tab-fitosanitaris" class="tab-content active">
                <h3>Fitosanitaris</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nom Comercial</th>
                                <th>Matèria Activa</th>
                                <th>Registre</th>
                                <th>Tipus</th>
                                <th>Plaç (dies)</th>
                                <th>Accions</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-fitosanitaris">
                            <tr><td colspan="6">Carregant...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div id="tab-fertilitzants" class="tab-content">
                <h3>Fertilitzants</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Tipus</th>
                                <th>N%</th>
                                <th>P%</th>
                                <th>K%</th>
                                <th>Altres</th>
                                <th>Accions</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-fertilitzants">
                            <tr><td colspan="7">Carregant...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        ${podeCrear ? crearModalProducte() : ''}
    `;

    await carregarTaulaFitosanitaris();
    await carregarTaulaFertilitzants();
}

function canviarTabProductes(tab, event) {
    // Actualitzar botons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Actualitzar contingut
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
}

async function carregarTaulaFitosanitaris() {
    const tbody = document.getElementById('tbody-fitosanitaris');
    if (!tbody) return;

    try {
        fitosanitaris = await getFitosanitaris();

        if (fitosanitaris.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" class="empty-state">No hi ha fitosanitaris registrats</td></tr>
            `;
            return;
        }

        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');

        tbody.innerHTML = fitosanitaris.map(f => `
            <tr>
                <td><strong>${f.nom}</strong></td>
                <td>${f.materia || '-'}</td>
                <td>${f.registre || '-'}</td>
                <td>${f.tipus}</td>
                <td>${f.plac || 0}</td>
                <td>
                    ${podeEditar ? `
                        <button class="btn btn-secondary btn-sm" onclick="editarFitosanitari('${f.id}')">✏️</button>
                    ` : ''}
                    ${podeEliminar ? `
                        <button class="btn btn-secondary btn-sm" onclick="eliminarFitosanitariConfirm('${f.id}')">🗑️</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error carregant fitosanitaris:', error);
        tbody.innerHTML = `
            <tr><td colspan="6" class="empty-state">Error carregant fitosanitaris</td></tr>
        `;
    }
}

async function carregarTaulaFertilitzants() {
    const tbody = document.getElementById('tbody-fertilitzants');
    if (!tbody) return;

    try {
        fertilitzants = await getFertilitzants();

        if (fertilitzants.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="7" class="empty-state">No hi ha fertilitzants registrats</td></tr>
            `;
            return;
        }

        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');

        tbody.innerHTML = fertilitzants.map(f => `
            <tr>
                <td><strong>${f.nom}</strong></td>
                <td>${f.tipus}</td>
                <td>${f.n || 0}%</td>
                <td>${f.p || 0}%</td>
                <td>${f.k || 0}%</td>
                <td>${f.altres || '-'}</td>
                <td>
                    ${podeEditar ? `
                        <button class="btn btn-secondary btn-sm" onclick="editarFertilitzant('${f.id}')">✏️</button>
                    ` : ''}
                    ${podeEliminar ? `
                        <button class="btn btn-secondary btn-sm" onclick="eliminarFertilitzantConfirm('${f.id}')">🗑️</button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error carregant fertilitzants:', error);
        tbody.innerHTML = `
            <tr><td colspan="7" class="empty-state">Error carregant fertilitzants</td></tr>
        `;
    }
}
// ============================================================
// MODAL PRODUCTE
// ============================================================

function crearModalProducte() {
    return `
        <div id="modal-producte" class="modal">
            <div class="modal-content">
                <span class="close" onclick="tancarModal('modal-producte')">&times;</span>
                <h2 id="modal-producte-title">Nou Producte</h2>
                
                <div class="form-group">
                    <label>Tipus de producte:</label>
                    <select id="prod-tipus" onchange="toggleProductForm()">
                        <option value="fitosanitari">Fitosanitari</option>
                        <option value="fertilitzant">Fertilitzant</option>
                    </select>
                </div>
                
                <!-- Formulari Fitosanitari -->
                <form id="form-fitosanitari" onsubmit="guardarProducte(event)" style="display: block;">
                    <div class="form-group">
                        <label>Nom comercial:</label>
                        <input type="text" id="fito-nom" required>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Matèria activa:</label>
                            <input type="text" id="fito-materia">
                        </div>
                        <div class="form-group">
                            <label>Nº Registre:</label>
                            <input type="text" id="fito-registre">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tipus:</label>
                            <select id="fito-tipus" required>
                                <option value="fungicida">Fungicida</option>
                                <option value="insecticida">Insecticida</option>
                                <option value="herbicida">Herbicida</option>
                                <option value="fitoregulador">Fitoregulador</option>
                                <option value="coadjuvant">Coadjuvant</option>
                                <option value="altres">Altres</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Plaç seguretat (dies):</label>
                            <input type="number" id="fito-plac" value="0">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Observacions:</label>
                        <textarea id="fito-observacions" rows="2"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-producte')">Cancel·lar</button>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
                
                <!-- Formulari Fertilitzant -->
                <form id="form-fertilitzant-prod" onsubmit="guardarProducte(event)" style="display: none;">
                    <div class="form-group">
                        <label>Nom:</label>
                        <input type="text" id="adb-nom" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Tipus:</label>
                        <select id="adb-tipus" required>
                            <option value="mineral">Mineral</option>
                            <option value="organic">Orgànic</option>
                            <option value="organomineral">Organomineral</option>
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>N%:</label>
                            <input type="number" step="0.1" id="adb-n" value="0">
                        </div>
                        <div class="form-group">
                            <label>P%:</label>
                            <input type="number" step="0.1" id="adb-p" value="0">
                        </div>
                        <div class="form-group">
                            <label>K%:</label>
                            <input type="number" step="0.1" id="adb-k" value="0">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Altres elements:</label>
                        <input type="text" id="adb-altres" placeholder="Ex: Ca, Mg, S...">
                    </div>
                    
                    <div class="form-group">
                        <label>Observacions:</label>
                        <textarea id="adb-observacions" rows="2"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-producte')">Cancel·lar</button>
                        <button type="submit" class="btn btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

function obrirModalProducte() {
    document.getElementById('modal-producte-title').textContent = 'Nou Producte';
    document.getElementById('form-fitosanitari').reset();
    document.getElementById('form-fertilitzant-prod').reset();
    document.getElementById('form-fitosanitari').removeAttribute('data-edit-id');
    document.getElementById('form-fertilitzant-prod').removeAttribute('data-edit-id');
    document.getElementById('prod-tipus').value = 'fitosanitari';
    toggleProductForm();
    document.getElementById('modal-producte').classList.add('active');
}
function toggleProductForm() {
    const tipus = document.getElementById('prod-tipus').value;

    if (tipus === 'fitosanitari') {
        document.getElementById('form-fitosanitari').style.display = 'block';
        document.getElementById('form-fertilitzant-prod').style.display = 'none';
    } else {
        document.getElementById('form-fitosanitari').style.display = 'none';
        document.getElementById('form-fertilitzant-prod').style.display = 'block';
    }
}

async function guardarProducte(event) {
    event.preventDefault();

    const tipus = document.getElementById('prod-tipus').value;

    try {
        if (tipus === 'fitosanitari') {
            const form = document.getElementById('form-fitosanitari');
            const editId = form.getAttribute('data-edit-id');

            const producteData = {
                nom: document.getElementById('fito-nom').value,
                materia: document.getElementById('fito-materia').value,
                registre: document.getElementById('fito-registre').value,
                tipus: document.getElementById('fito-tipus').value,
                plac: parseInt(document.getElementById('fito-plac').value) || 0,
                observacions: document.getElementById('fito-observacions').value
            };

            if (editId) {
                await updateFitosanitari(editId, producteData);
                mostrarNotificacio('✅ Fitosanitari actualitzat correctament', 'success');
            } else {
                await createFitosanitari(producteData);
                mostrarNotificacio('✅ Fitosanitari creat correctament', 'success');
            }

            await carregarTaulaFitosanitaris();

        } else {
            const form = document.getElementById('form-fertilitzant-prod');
            const editId = form.getAttribute('data-edit-id');

            const producteData = {
                nom: document.getElementById('adb-nom').value,
                tipus: document.getElementById('adb-tipus').value,
                n: parseFloat(document.getElementById('adb-n').value) || 0,
                p: parseFloat(document.getElementById('adb-p').value) || 0,
                k: parseFloat(document.getElementById('adb-k').value) || 0,
                altres: document.getElementById('adb-altres').value,
                observacions: document.getElementById('adb-observacions').value
            };

            if (editId) {
                await updateFertilitzant(editId, producteData);
                mostrarNotificacio('✅ Fertilitzant actualitzat correctament', 'success');
            } else {
                await createFertilitzant(producteData);
                mostrarNotificacio('✅ Fertilitzant creat correctament', 'success');
            }

            await carregarTaulaFertilitzants();
        }

        tancarModal('modal-producte');

    } catch (error) {
        console.error('Error guardant producte:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function editarFitosanitari(id) {
    const producte = fitosanitaris.find(f => f.id === id);
    if (!producte) return;

    document.getElementById('prod-tipus').value = 'fitosanitari';
    toggleProductForm();

    document.getElementById('fito-nom').value = producte.nom || '';
    document.getElementById('fito-materia').value = producte.materia || '';
    document.getElementById('fito-registre').value = producte.registre || '';
    document.getElementById('fito-tipus').value = producte.tipus || '';
    document.getElementById('fito-plac').value = producte.plac || 0;
    document.getElementById('fito-observacions').value = producte.observacions || '';

    document.getElementById('form-fitosanitari').setAttribute('data-edit-id', id);
    document.getElementById('modal-producte-title').textContent = '✏️ Editar Fitosanitari';
    document.getElementById('modal-producte').classList.add('active');
}

async function editarFertilitzant(id) {
    const producte = fertilitzants.find(f => f.id === id);
    if (!producte) return;

    document.getElementById('prod-tipus').value = 'fertilitzant';
    toggleProductForm();

    document.getElementById('adb-nom').value = producte.nom || '';
    document.getElementById('adb-tipus').value = producte.tipus || '';
    document.getElementById('adb-n').value = producte.n || 0;
    document.getElementById('adb-p').value = producte.p || 0;
    document.getElementById('adb-k').value = producte.k || 0;
    document.getElementById('adb-altres').value = producte.altres || '';
    document.getElementById('adb-observacions').value = producte.observacions || '';

    document.getElementById('form-fertilitzant-prod').setAttribute('data-edit-id', id);
    document.getElementById('modal-producte-title').textContent = '✏️ Editar Fertilitzant';
    document.getElementById('modal-producte').classList.add('active');
}

async function eliminarFitosanitariConfirm(id) {
    if (confirm('Segur que vols eliminar aquest fitosanitari?')) {
        try {
            await deleteFitosanitari(id);
            mostrarNotificacio('✅ Fitosanitari eliminat correctament', 'success');
            await carregarTaulaFitosanitaris();
        } catch (error) {
            console.error('Error eliminant fitosanitari:', error);
            mostrarNotificacio('❌ Error: ' + error.message, 'error');
        }
    }
}

async function eliminarFertilitzantConfirm(id) {
    if (confirm('Segur que vols eliminar aquest fertilitzant?')) {
        try {
            await deleteFertilitzant(id);
            mostrarNotificacio('✅ Fertilitzant eliminat correctament', 'success');
            await carregarTaulaFertilitzants();
        } catch (error) {
            console.error('Error eliminant fertilitzant:', error);
            mostrarNotificacio('❌ Error: ' + error.message, 'error');
        }
    }
}

console.log('✅ App.js carregat');

// ============================================================
// LISTENERS DE SINCRONITZACIÓ EN TEMPS REAL
// ============================================================

// Activar listeners quan l'app està carregada
document.addEventListener('DOMContentLoaded', () => {
    // Esperar que l'usuari estigui autenticat
    setTimeout(() => {
        if (currentUser) {
            activarListeners();
        }
    }, 2000);
});

function activarListeners() {
    // Escoltar canvis a parcel·les
    subscribeToChanges('parcelles', (payload) => {
        console.log('Canvi a parcelles:', payload);
        if (vistaActual === 'parcelles') {
            carregarTaulaParcelles();
        }
        showSyncIndicator('📡 Parcel·les actualitzades', 'success');
    });
    
    // Escoltar canvis a tractaments
    subscribeToChanges('tractaments', (payload) => {
        console.log('Canvi a tractaments:', payload);
        if (vistaActual === 'tractaments') {
            carregarTaulaTractaments();
        }
        showSyncIndicator('📡 Tractaments actualitzats', 'success');
    });
    
    // Escoltar canvis a fertilitzacions
    subscribeToChanges('fertilitzacions', (payload) => {
        console.log('Canvi a fertilitzacions:', payload);
        if (vistaActual === 'fertilitzacions') {
            carregarTaulaFertilitzacions();
        }
        showSyncIndicator('📡 Fertilitzacions actualitzades', 'success');
    });
    
    // Escoltar canvis a fitosanitaris
    subscribeToChanges('fitosanitaris', (payload) => {
        console.log('Canvi a fitosanitaris:', payload);
        if (vistaActual === 'productes') {
            carregarTaulaFitosanitaris();
        }
        showSyncIndicator('📡 Productes actualitzats', 'success');
    });
    
    // Escoltar canvis a fertilitzants
    subscribeToChanges('fertilitzants', (payload) => {
        console.log('Canvi a fertilitzants:', payload);
        if (vistaActual === 'productes') {
            carregarTaulaFertilitzants();
        }
        showSyncIndicator('📡 Productes actualitzats', 'success');
    });
    
    console.log('✅ Listeners de sincronització activats');
}

// ============================================================
// DETECCIÓ CONNEXIÓ ONLINE/OFFLINE
// ============================================================

window.addEventListener('online', () => {
    console.log('✅ Connexió restablerta');
    showSyncIndicator('🌐 Connexió restablerta', 'success');
});

window.addEventListener('offline', () => {
    console.log('⚠️ Sense connexió a internet');
    showSyncIndicator('📵 Mode offline', 'warning');
});

// ============================================================
// EXPORTACIÓ PDF (placeholder - implementar després)
// ============================================================

function exportarPDF() {
    mostrarNotificacio('ℹ️ Funcionalitat d\'exportació PDF en desenvolupament', 'info');
}

// ============================================================
// FI APP.JS
// ============================================================

console.log('✅✅✅ Aplicació completament carregada! ✅✅✅');