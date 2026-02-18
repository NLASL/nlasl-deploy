// ============================================================
// APP.JS - Lògica principal aplicació
// Quadern de Camp NLASL - v4 amb gestió Productes
// ============================================================

// Variables globals
let parcelles = [];
let tractaments = [];
let fertilitzacions = [];
let fitosanitaris = [];
let fertilitzants = [];
let finques = [];
let fincaSeleccionada = null;
let vistaActual = 'dashboard';

// Funcions utilitat
function generateId() {
    return crypto.randomUUID();
}

function formatData(data) {
    if (!data) return '';
    const d = new Date(data);
    return d.toLocaleDateString('ca-ES');
}

function mostrarNotificacio(missatge, tipus) {
    tipus = tipus || 'info';
    const container = document.getElementById('notificacions');
    if (!container) return;
    
    const notif = document.createElement('div');
    notif.className = 'notificacio notificacio-' + tipus;
    notif.textContent = missatge;
    
    container.appendChild(notif);
    
    setTimeout(function() {
        notif.classList.add('notificacio-sortint');
        setTimeout(function() { notif.remove(); }, 300);
    }, 3000);
}

// Tancar modals
function tancarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Navegació i canvi de vistes
function canviarVista(vista) {
    vistaActual = vista;
    
    document.querySelectorAll('.nav-btn').forEach(function(btn) {
        btn.classList.remove('active');
        if (btn.getAttribute('data-view') === vista) {
            btn.classList.add('active');
        }
    });
    
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

// DASHBOARD AMB FINQUES
async function carregarDashboard() {
    const container = document.getElementById('view-container');
    
    container.innerHTML = '<div class="dashboard"><p>Carregant dades...</p></div>';
    
    try {
        parcelles = await getParcellas();
        tractaments = await getTractaments();
        fertilitzacions = await getFertilitzacions();
        fitosanitaris = await getFitosanitaris();
        fertilitzants = await getFertilitzants();
        finques = await getFinques();
    } catch (error) {
        console.error('Error carregant dades:', error);
        mostrarNotificacio('Error carregant dades', 'error');
        return;
    }
    
    let parcellesFiltrades = parcelles;
    if (fincaSeleccionada) {
        parcellesFiltrades = parcelles.filter(function(p) {
            return p.finca === fincaSeleccionada;
        });
    }
    
    const totalSuperficie = parcellesFiltrades.reduce(function(sum, p) {
        return sum + (parseFloat(p.superficie) || 0);
    }, 0);
    
    const numParcelles = parcellesFiltrades.length;
    
    const cultius = {};
    parcellesFiltrades.forEach(function(p) {
        const cultiu = p.cultiu || 'Sense especificar';
        if (!cultius[cultiu]) {
            cultius[cultiu] = { count: 0, superficie: 0 };
        }
        cultius[cultiu].count++;
        cultius[cultiu].superficie += parseFloat(p.superficie) || 0;
    });
    
    let html = '<div class="dashboard">';
    html += '<h2>📊 ' + (fincaSeleccionada ? 'Finca: ' + fincaSeleccionada : 'Resum General') + '</h2>';
    
    html += '<div style="margin-bottom: 30px;">';
    html += '<label style="font-weight: bold; margin-right: 10px;">🗺️ Seleccionar finca:</label>';
    html += '<select id="selector-finca" onchange="seleccionarFinca(this.value)" style="padding: 8px; font-size: 14px; border: 1px solid #ddd; border-radius: 4px; min-width: 250px;">';
    html += '<option value="">Totes les finques</option>';
    finques.forEach(function(finca) {
        const selected = finca === fincaSeleccionada ? 'selected' : '';
        html += '<option value="' + finca + '" ' + selected + '>' + finca + '</option>';
    });
    html += '</select>';
    html += '</div>';
    
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-icon">🗺️</div><div class="stat-info"><div class="stat-value">' + numParcelles + '</div><div class="stat-label">Parcel·les</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon">📏</div><div class="stat-info"><div class="stat-value">' + totalSuperficie.toFixed(2) + ' Ha</div><div class="stat-label">Superfície Total</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon">🌱</div><div class="stat-info"><div class="stat-value">' + tractaments.length + '</div><div class="stat-label">Tractaments</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon">🧪</div><div class="stat-info"><div class="stat-value">' + fitosanitaris.length + '</div><div class="stat-label">Fitosanitaris</div></div></div>';
    html += '</div>';
    
    if (Object.keys(cultius).length > 0) {
        html += '<div style="margin-top: 30px;"><h3>📊 Distribució per Cultiu</h3>';
        html += '<div class="table-container"><table class="data-table">';
        html += '<thead><tr><th>Cultiu</th><th>Parcel·les</th><th>Hectàrees</th></tr></thead><tbody>';
        
        Object.keys(cultius).sort().forEach(function(cultiu) {
            const info = cultius[cultiu];
            html += '<tr><td><strong>' + cultiu + '</strong></td><td>' + info.count + '</td><td>' + info.superficie.toFixed(2) + ' Ha</td></tr>';
        });
        
        html += '</tbody></table></div></div>';
    }
    
    html += '<div class="dashboard-actions"><h3>Accions Ràpides</h3><div class="quick-actions">';
    html += '<button class="btn btn-primary" onclick="canviarVista(\'parcelles\')">🗺️ Veure Parcel·les</button>';
    html += '<button class="btn btn-success" onclick="canviarVista(\'tractaments\')">🌱 Nou Tractament</button>';
    html += '<button class="btn btn-secondary" onclick="canviarVista(\'productes\')">📦 Gestionar Productes</button>';
    html += '</div></div></div>';
    
    container.innerHTML = html;
}

function seleccionarFinca(finca) {
    fincaSeleccionada = finca || null;
    carregarDashboard();
}

// VISTA PARCELLES
async function carregarVistaParcelles() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    
    container.innerHTML = '<div class="view-parcelles">' +
        '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">' +
        '<h2>🗺️ Parcel·les</h2>' +
        (podeCrear ? '<button class="btn btn-primary" onclick="alert(\'Funció en desenvolupament\')">➕ Nova Parcel·la</button>' : '') +
        '</div>' +
        '<div class="table-container"><table class="data-table">' +
        '<thead><tr><th>Nom</th><th>SIGPAC</th><th>Finca</th><th>Cultiu</th><th>Superfície (Ha)</th></tr></thead>' +
        '<tbody id="tbody-parcelles"><tr><td colspan="5">Carregant...</td></tr></tbody>' +
        '</table></div></div>';
    
    await carregarTaulaParcelles();
}

async function carregarTaulaParcelles() {
    const tbody = document.getElementById('tbody-parcelles');
    if (!tbody) return;
    
    try {
        parcelles = await getParcellas();
        
        if (parcelles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hi ha parcel·les</td></tr>';
            return;
        }
        
        tbody.innerHTML = parcelles.map(function(p) {
            return '<tr><td><strong>' + (p.nom || '-') + '</strong></td><td>' + (p.sigpac || '-') + '</td><td>' + (p.finca || '-') + '</td><td>' + (p.cultiu || '-') + '</td><td>' + (p.superficie || 0) + '</td></tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="5">Error carregant dades</td></tr>';
    }
}

// VISTA TRACTAMENTS
async function carregarVistaTractaments() {
    const container = document.getElementById('view-container');
    container.innerHTML = '<div class="view-tractaments"><h2>🌱 Tractaments Fitosanitaris</h2><p>Funcionalitat en desenvolupament...</p></div>';
}

// VISTA FERTILITZACIONS
async function carregarVistaFertilitzacions() {
    const container = document.getElementById('view-container');
    container.innerHTML = '<div class="view-fertilitzacions"><h2>🌿 Fertilitzacions</h2><p>Funcionalitat en desenvolupament...</p></div>';
}

// ============================================================
// VISTA PRODUCTES AMB CRUD
// ============================================================

async function carregarVistaProductes() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    
    let html = '<div class="view-productes">';
    html += '<div style="margin-bottom: 20px;"><h2>📦 Base de Dades de Productes</h2></div>';
    
    html += '<div class="tabs">';
    html += '<button class="tab-btn active" onclick="canviarTabProductes(\'fitosanitaris\')">🧪 Fitosanitaris</button>';
    html += '<button class="tab-btn" onclick="canviarTabProductes(\'fertilitzants\')">🌱 Fertilitzants</button>';
    html += '</div>';
    
    // TAB FITOSANITARIS
    html += '<div id="tab-fitosanitaris" class="tab-content active">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">';
    html += '<h3>Fitosanitaris</h3>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalFitosanitari()">➕ Nou Fitosanitari</button>';
    }
    html += '</div>';
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Nom</th><th>Tipus</th><th>Matèria Activa</th><th>Plaç (dies)</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-fitosanitaris"><tr><td colspan="5">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
    
    // TAB FERTILITZANTS
    html += '<div id="tab-fertilitzants" class="tab-content">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">';
    html += '<h3>Fertilitzants</h3>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalFertilitzant()">➕ Nou Fertilitzant</button>';
    }
    html += '</div>';
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Nom</th><th>Tipus</th><th>N%</th><th>P%</th><th>K%</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-fertilitzants"><tr><td colspan="6">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
    
    html += '</div>';
    
    // MODALS
    html += crearModalFitosanitari();
    html += crearModalFertilitzant();
    
    container.innerHTML = html;
    
    await carregarTaulaFitosanitaris();
    await carregarTaulaFertilitzants();
}

function canviarTabProductes(tab) {
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(function(content) {
        content.classList.remove('active');
    });
    document.getElementById('tab-' + tab).classList.add('active');
}

// FITOSANITARIS
async function carregarTaulaFitosanitaris() {
    const tbody = document.getElementById('tbody-fitosanitaris');
    if (!tbody) return;
    
    try {
        fitosanitaris = await getFitosanitaris();
        
        if (fitosanitaris.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No hi ha fitosanitaris</td></tr>';
            return;
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        
        tbody.innerHTML = fitosanitaris.map(function(f) {
            let accions = '';
            if (podeEditar) {
                accions += '<button class="btn btn-sm btn-secondary" onclick="editarFitosanitari(\'' + f.id + '\')">✏️</button> ';
            }
            if (podeEliminar) {
                accions += '<button class="btn btn-sm btn-danger" onclick="eliminarFitosanitari(\'' + f.id + '\')">🗑️</button>';
            }
            
            return '<tr>' +
                '<td><strong>' + f.nom + '</strong></td>' +
                '<td>' + (f.tipus || '-') + '</td>' +
                '<td>' + (f.materia_activa || '-') + '</td>' +
                '<td>' + (f.plac || 0) + '</td>' +
                '<td>' + accions + '</td>' +
                '</tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="5">Error carregant dades</td></tr>';
    }
}

function crearModalFitosanitari() {
    return '<div id="modal-fitosanitari" class="modal" style="display: none;">' +
        '<div class="modal-content">' +
        '<span class="close" onclick="tancarModal(\'modal-fitosanitari\')">&times;</span>' +
        '<h2 id="modal-fitosanitari-titol">Nou Fitosanitari</h2>' +
        '<form id="form-fitosanitari" onsubmit="guardarFitosanitari(event)">' +
        '<input type="hidden" id="fitosanitari-id">' +
        '<div class="form-group"><label>Nom *</label><input type="text" id="fitosanitari-nom" required></div>' +
        '<div class="form-group"><label>Tipus *</label><select id="fitosanitari-tipus" required>' +
        '<option value="">Seleccionar...</option>' +
        '<option value="Fungicida">Fungicida</option>' +
        '<option value="Insecticida">Insecticida</option>' +
        '<option value="Herbicida">Herbicida</option>' +
        '<option value="Acaricida">Acaricida</option>' +
        '<option value="Altres">Altres</option>' +
        '</select></div>' +
        '<div class="form-group"><label>Matèria Activa</label><input type="text" id="fitosanitari-materia"></div>' +
        '<div class="form-group"><label>Registre MAPA</label><input type="text" id="fitosanitari-registre"></div>' +
        '<div class="form-group"><label>Plaç Seguretat (dies)</label><input type="number" id="fitosanitari-plac" min="0"></div>' +
        '<div class="form-group"><label>Observacions</label><textarea id="fitosanitari-observacions" rows="3"></textarea></div>' +
        '<div class="form-actions">' +
        '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-fitosanitari\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary">Guardar</button>' +
        '</div></form></div></div>';
}

function obrirModalFitosanitari() {
    document.getElementById('modal-fitosanitari-titol').textContent = 'Nou Fitosanitari';
    document.getElementById('form-fitosanitari').reset();
    document.getElementById('fitosanitari-id').value = '';
    document.getElementById('modal-fitosanitari').style.display = 'block';
}

async function editarFitosanitari(id) {
    const producte = fitosanitaris.find(function(f) { return f.id === id; });
    if (!producte) return;
    
    document.getElementById('modal-fitosanitari-titol').textContent = 'Editar Fitosanitari';
    document.getElementById('fitosanitari-id').value = producte.id;
    document.getElementById('fitosanitari-nom').value = producte.nom || '';
    document.getElementById('fitosanitari-tipus').value = producte.tipus || '';
    document.getElementById('fitosanitari-materia').value = producte.materia_activa || '';
    document.getElementById('fitosanitari-registre').value = producte.registre || '';
    document.getElementById('fitosanitari-plac').value = producte.plac || '';
    document.getElementById('fitosanitari-observacions').value = producte.observacions || '';
    document.getElementById('modal-fitosanitari').style.display = 'block';
}

async function guardarFitosanitari(event) {
    event.preventDefault();
    
    const id = document.getElementById('fitosanitari-id').value;
    const dades = {
        nom: document.getElementById('fitosanitari-nom').value.trim(),
        tipus: document.getElementById('fitosanitari-tipus').value,
        materia_activa: document.getElementById('fitosanitari-materia').value.trim(),
        registre: document.getElementById('fitosanitari-registre').value.trim(),
        plac: parseInt(document.getElementById('fitosanitari-plac').value) || 0,
        observacions: document.getElementById('fitosanitari-observacions').value.trim()
    };
    
    try {
        if (id) {
            await updateFitosanitari(id, dades);
            mostrarNotificacio('Fitosanitari actualitzat correctament', 'success');
        } else {
            await createFitosanitari(dades);
            mostrarNotificacio('Fitosanitari creat correctament', 'success');
        }
        
        tancarModal('modal-fitosanitari');
        await carregarTaulaFitosanitaris();
        
    } catch (error) {
        console.error('Error guardant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarFitosanitari(id) {
    if (!confirm('Segur que vols eliminar aquest fitosanitari?')) return;
    
    try {
        await deleteFitosanitari(id);
        mostrarNotificacio('Fitosanitari eliminat correctament', 'success');
        await carregarTaulaFitosanitaris();
    } catch (error) {
        console.error('Error eliminant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// FERTILITZANTS
async function carregarTaulaFertilitzants() {
    const tbody = document.getElementById('tbody-fertilitzants');
    if (!tbody) return;
    
    try {
        fertilitzants = await getFertilitzants();
        
        if (fertilitzants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No hi ha fertilitzants</td></tr>';
            return;
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        
        tbody.innerHTML = fertilitzants.map(function(f) {
            let accions = '';
            if (podeEditar) {
                accions += '<button class="btn btn-sm btn-secondary" onclick="editarFertilitzant(\'' + f.id + '\')">✏️</button> ';
            }
            if (podeEliminar) {
                accions += '<button class="btn btn-sm btn-danger" onclick="eliminarFertilitzant(\'' + f.id + '\')">🗑️</button>';
            }
            
            return '<tr>' +
                '<td><strong>' + f.nom + '</strong></td>' +
                '<td>' + (f.tipus || '-') + '</td>' +
                '<td>' + (f.n || 0) + '%</td>' +
                '<td>' + (f.p || 0) + '%</td>' +
                '<td>' + (f.k || 0) + '%</td>' +
                '<td>' + accions + '</td>' +
                '</tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6">Error carregant dades</td></tr>';
    }
}

function crearModalFertilitzant() {
    return '<div id="modal-fertilitzant" class="modal" style="display: none;">' +
        '<div class="modal-content">' +
        '<span class="close" onclick="tancarModal(\'modal-fertilitzant\')">&times;</span>' +
        '<h2 id="modal-fertilitzant-titol">Nou Fertilitzant</h2>' +
        '<form id="form-fertilitzant" onsubmit="guardarFertilitzant(event)">' +
        '<input type="hidden" id="fertilitzant-id">' +
        '<div class="form-group"><label>Nom *</label><input type="text" id="fertilitzant-nom" required></div>' +
        '<div class="form-group"><label>Tipus *</label><select id="fertilitzant-tipus" required>' +
        '<option value="">Seleccionar...</option>' +
        '<option value="Mineral">Mineral</option>' +
        '<option value="Orgànic">Orgànic</option>' +
        '<option value="Organomineral">Organomineral</option>' +
        '<option value="Altres">Altres</option>' +
        '</select></div>' +
        '<div class="form-group"><label>% Nitrogen (N)</label><input type="number" id="fertilitzant-n" min="0" max="100" step="0.1"></div>' +
        '<div class="form-group"><label>% Fòsfor (P)</label><input type="number" id="fertilitzant-p" min="0" max="100" step="0.1"></div>' +
        '<div class="form-group"><label>% Potassi (K)</label><input type="number" id="fertilitzant-k" min="0" max="100" step="0.1"></div>' +
        '<div class="form-group"><label>Observacions</label><textarea id="fertilitzant-observacions" rows="3"></textarea></div>' +
        '<div class="form-actions">' +
        '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-fertilitzant\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary">Guardar</button>' +
        '</div></form></div></div>';
}

function obrirModalFertilitzant() {
    document.getElementById('modal-fertilitzant-titol').textContent = 'Nou Fertilitzant';
    document.getElementById('form-fertilitzant').reset();
    document.getElementById('fertilitzant-id').value = '';
    document.getElementById('modal-fertilitzant').style.display = 'block';
}

async function editarFertilitzant(id) {
    const producte = fertilitzants.find(function(f) { return f.id === id; });
    if (!producte) return;
    
    document.getElementById('modal-fertilitzant-titol').textContent = 'Editar Fertilitzant';
    document.getElementById('fertilitzant-id').value = producte.id;
    document.getElementById('fertilitzant-nom').value = producte.nom || '';
    document.getElementById('fertilitzant-tipus').value = producte.tipus || '';
    document.getElementById('fertilitzant-n').value = producte.n || '';
    document.getElementById('fertilitzant-p').value = producte.p || '';
    document.getElementById('fertilitzant-k').value = producte.k || '';
    document.getElementById('fertilitzant-observacions').value = producte.observacions || '';
    document.getElementById('modal-fertilitzant').style.display = 'block';
}

async function guardarFertilitzant(event) {
    event.preventDefault();
    
    const id = document.getElementById('fertilitzant-id').value;
    const dades = {
        nom: document.getElementById('fertilitzant-nom').value.trim(),
        tipus: document.getElementById('fertilitzant-tipus').value,
        n: parseFloat(document.getElementById('fertilitzant-n').value) || 0,
        p: parseFloat(document.getElementById('fertilitzant-p').value) || 0,
        k: parseFloat(document.getElementById('fertilitzant-k').value) || 0,
        observacions: document.getElementById('fertilitzant-observacions').value.trim()
    };
    
    try {
        if (id) {
            await updateFertilitzant(id, dades);
            mostrarNotificacio('Fertilitzant actualitzat correctament', 'success');
        } else {
            await createFertilitzant(dades);
            mostrarNotificacio('Fertilitzant creat correctament', 'success');
        }
        
        tancarModal('modal-fertilitzant');
        await carregarTaulaFertilitzants();
        
    } catch (error) {
        console.error('Error guardant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarFertilitzant(id) {
    if (!confirm('Segur que vols eliminar aquest fertilitzant?')) return;
    
    try {
        await deleteFertilitzant(id);
        mostrarNotificacio('Fertilitzant eliminat correctament', 'success');
        await carregarTaulaFertilitzants();
    } catch (error) {
        console.error('Error eliminant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// Listeners sincronització
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (currentUser) {
            activarListeners();
        }
    }, 2000);
});

function activarListeners() {
    subscribeToChanges('parcelles', function(payload) {
        console.log('Canvi a parcelles:', payload);
        if (vistaActual === 'parcelles') {
            carregarTaulaParcelles();
        } else if (vistaActual === 'dashboard') {
            carregarDashboard();
        }
        showSyncIndicator('📡 Parcel·les actualitzades', 'success');
    });
    
    subscribeToChanges('fitosanitaris', function(payload) {
        console.log('Canvi a fitosanitaris:', payload);
        if (vistaActual === 'productes') {
            carregarTaulaFitosanitaris();
        }
        showSyncIndicator('📡 Fitosanitaris actualitzats', 'success');
    });
    
    subscribeToChanges('fertilitzants', function(payload) {
        console.log('Canvi a fertilitzants:', payload);
        if (vistaActual === 'productes') {
            carregarTaulaFertilitzants();
        }
        showSyncIndicator('📡 Fertilitzants actualitzats', 'success');
    });
    
    console.log('✅ Listeners activats');
}

window.addEventListener('online', function() {
    console.log('✅ Connexió restablerta');
    showSyncIndicator('🌐 Connexió restablerta', 'success');
});

window.addEventListener('offline', function() {
    console.log('⚠️ Sense connexió');
    showSyncIndicator('📵 Mode offline', 'warning');
});

console.log('✅ App.js v4 carregat');
console.log('✅✅✅ Aplicació completament carregada! ✅✅✅');
