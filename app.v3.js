// ============================================================
// APP.JS - Lògica principal aplicació
// Quadern de Camp NLASL - v3 amb Finques
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
    
    // Calcular estadístiques
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
    
    // Calcular per cultiu
    const cultius = {};
    parcellesFiltrades.forEach(function(p) {
        const cultiu = p.cultiu || 'Sense especificar';
        if (!cultius[cultiu]) {
            cultius[cultiu] = { count: 0, superficie: 0 };
        }
        cultius[cultiu].count++;
        cultius[cultiu].superficie += parseFloat(p.superficie) || 0;
    });
    
    // HTML Dashboard
    let html = '<div class="dashboard">';
    html += '<h2>📊 ' + (fincaSeleccionada ? 'Finca: ' + fincaSeleccionada : 'Resum General') + '</h2>';
    
    // Selector de finques
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
    
    // Stats cards
    html += '<div class="stats-grid">';
    html += '<div class="stat-card">';
    html += '<div class="stat-icon">🗺️</div>';
    html += '<div class="stat-info">';
    html += '<div class="stat-value">' + numParcelles + '</div>';
    html += '<div class="stat-label">Parcel·les</div>';
    html += '</div></div>';
    
    html += '<div class="stat-card">';
    html += '<div class="stat-icon">📏</div>';
    html += '<div class="stat-info">';
    html += '<div class="stat-value">' + totalSuperficie.toFixed(2) + ' Ha</div>';
    html += '<div class="stat-label">Superfície Total</div>';
    html += '</div></div>';
    
    html += '<div class="stat-card">';
    html += '<div class="stat-icon">🌱</div>';
    html += '<div class="stat-info">';
    html += '<div class="stat-value">' + tractaments.length + '</div>';
    html += '<div class="stat-label">Tractaments</div>';
    html += '</div></div>';
    
    html += '<div class="stat-card">';
    html += '<div class="stat-icon">🧪</div>';
    html += '<div class="stat-info">';
    html += '<div class="stat-value">' + fitosanitaris.length + '</div>';
    html += '<div class="stat-label">Fitosanitaris</div>';
    html += '</div></div>';
    html += '</div>';
    
    // Detall per cultius
    if (Object.keys(cultius).length > 0) {
        html += '<div style="margin-top: 30px;">';
        html += '<h3>📊 Distribució per Cultiu</h3>';
        html += '<div class="table-container">';
        html += '<table class="data-table">';
        html += '<thead><tr><th>Cultiu</th><th>Parcel·les</th><th>Hectàrees</th></tr></thead>';
        html += '<tbody>';
        
        Object.keys(cultius).sort().forEach(function(cultiu) {
            const info = cultius[cultiu];
            html += '<tr>';
            html += '<td><strong>' + cultiu + '</strong></td>';
            html += '<td>' + info.count + '</td>';
            html += '<td>' + info.superficie.toFixed(2) + ' Ha</td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        html += '</div></div>';
    }
    
    // Accions ràpides
    html += '<div class="dashboard-actions">';
    html += '<h3>Accions Ràpides</h3>';
    html += '<div class="quick-actions">';
    html += '<button class="btn btn-primary" onclick="canviarVista(\'parcelles\')">🗺️ Veure Parcel·les</button>';
    html += '<button class="btn btn-success" onclick="canviarVista(\'tractaments\')">🌱 Nou Tractament</button>';
    html += '<button class="btn btn-secondary" onclick="canviarVista(\'productes\')">📦 Gestionar Productes</button>';
    html += '</div></div>';
    
    html += '</div>';
    
    container.innerHTML = html;
}

// Funció global per canviar finca
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
        '<div class="table-container">' +
        '<table class="data-table">' +
        '<thead><tr>' +
        '<th>Nom</th><th>SIGPAC</th><th>Finca</th><th>Cultiu</th><th>Superfície (Ha)</th>' +
        '</tr></thead>' +
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
            return '<tr>' +
                '<td><strong>' + (p.nom || '-') + '</strong></td>' +
                '<td>' + (p.sigpac || '-') + '</td>' +
                '<td>' + (p.finca || '-') + '</td>' +
                '<td>' + (p.cultiu || '-') + '</td>' +
                '<td>' + (p.superficie || 0) + '</td>' +
                '</tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="5">Error carregant dades</td></tr>';
    }
}

// VISTA TRACTAMENTS
async function carregarVistaTractaments() {
    const container = document.getElementById('view-container');
    
    container.innerHTML = '<div class="view-tractaments">' +
        '<h2>🌱 Tractaments Fitosanitaris</h2>' +
        '<p>Funcionalitat en desenvolupament...</p>' +
        '</div>';
}

// VISTA FERTILITZACIONS
async function carregarVistaFertilitzacions() {
    const container = document.getElementById('view-container');
    
    container.innerHTML = '<div class="view-fertilitzacions">' +
        '<h2>🌿 Fertilitzacions</h2>' +
        '<p>Funcionalitat en desenvolupament...</p>' +
        '</div>';
}

// VISTA PRODUCTES
async function carregarVistaProductes() {
    const container = document.getElementById('view-container');
    
    container.innerHTML = '<div class="view-productes">' +
        '<div style="margin-bottom: 20px;">' +
        '<h2>📦 Base de Dades de Productes</h2>' +
        '</div>' +
        '<div class="tabs">' +
        '<button class="tab-btn active" onclick="canviarTabProductes(\'fitosanitaris\')">🧪 Fitosanitaris</button>' +
        '<button class="tab-btn" onclick="canviarTabProductes(\'fertilitzants\')">🌱 Fertilitzants</button>' +
        '</div>' +
        '<div id="tab-fitosanitaris" class="tab-content active">' +
        '<h3>Fitosanitaris</h3>' +
        '<div class="table-container">' +
        '<table class="data-table">' +
        '<thead><tr><th>Nom</th><th>Tipus</th><th>Plaç (dies)</th></tr></thead>' +
        '<tbody id="tbody-fitosanitaris"><tr><td colspan="3">Carregant...</td></tr></tbody>' +
        '</table></div></div>' +
        '<div id="tab-fertilitzants" class="tab-content">' +
        '<h3>Fertilitzants</h3>' +
        '<div class="table-container">' +
        '<table class="data-table">' +
        '<thead><tr><th>Nom</th><th>Tipus</th><th>N%</th><th>P%</th><th>K%</th></tr></thead>' +
        '<tbody id="tbody-fertilitzants"><tr><td colspan="5">Carregant...</td></tr></tbody>' +
        '</table></div></div>' +
        '</div>';
    
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

async function carregarTaulaFitosanitaris() {
    const tbody = document.getElementById('tbody-fitosanitaris');
    if (!tbody) return;
    
    try {
        fitosanitaris = await getFitosanitaris();
        
        if (fitosanitaris.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No hi ha fitosanitaris</td></tr>';
            return;
        }
        
        tbody.innerHTML = fitosanitaris.map(function(f) {
            return '<tr>' +
                '<td><strong>' + f.nom + '</strong></td>' +
                '<td>' + f.tipus + '</td>' +
                '<td>' + (f.plac || 0) + '</td>' +
                '</tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="3">Error carregant dades</td></tr>';
    }
}

async function carregarTaulaFertilitzants() {
    const tbody = document.getElementById('tbody-fertilitzants');
    if (!tbody) return;
    
    try {
        fertilitzants = await getFertilitzants();
        
        if (fertilitzants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No hi ha fertilitzants</td></tr>';
            return;
        }
        
        tbody.innerHTML = fertilitzants.map(function(f) {
            return '<tr>' +
                '<td><strong>' + f.nom + '</strong></td>' +
                '<td>' + f.tipus + '</td>' +
                '<td>' + (f.n || 0) + '%</td>' +
                '<td>' + (f.p || 0) + '%</td>' +
                '<td>' + (f.k || 0) + '%</td>' +
                '</tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="5">Error carregant dades</td></tr>';
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
    
    console.log('✅ Listeners activats');
}

// Detecció connexió
window.addEventListener('online', function() {
    console.log('✅ Connexió restablerta');
    showSyncIndicator('🌐 Connexió restablerta', 'success');
});

window.addEventListener('offline', function() {
    console.log('⚠️ Sense connexió');
    showSyncIndicator('📵 Mode offline', 'warning');
});

console.log('✅ App.js v3 carregat');
console.log('✅✅✅ Aplicació completament carregada! ✅✅✅');
