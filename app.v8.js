// ============================================================
// APP.JS - Lògica principal aplicació
// Quadern de Camp NLASL - v8 amb Control Horari
// ============================================================

// Variables globals
let parcelles = [];
let tractaments = [];
let fertilitzacions = [];
let fitosanitaris = [];
let fertilitzants = [];
let treballadors = [];
let controlHorari = [];
let tasques = [];
let motiusAbsencia = [];
let incidencies = [];
let finques = [];
let fincaSeleccionada = null;
let vistaActual = 'dashboard';

// Catàleg cultius i varietats
const CULTIUS_VARIETATS = {
    'PRÉSSEC PLA': ['FLATBEAUTI', 'FLATBELLA', 'FLATBOOM', 'FLATCHIEF', 'FLATREINE', 'FLATSTAR', 'GUAYOX 35 (VIFMPB 1 258)'],
    'ALBERCOQUER': ['LIDO', 'APRISWEET ASF 0409', 'APRIREVE'],
    'NECTARINER': ['ASF0619 / Nectadiva / NJ 4N.03 120'],
    'OLIVERA': ['MORRUDA/MORRUT/REGUERS'],
    'ORDI': ['2 CARRERES'],
    'BLAT TOU': [],
    'GUARET': [],
    'IMPRODUCTIU': [],
    'PROD. FORESTALS': [],
    'TRITICALE': []
};

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

function tancarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Control de permisos
function hasPermission(action) {
    if (!currentUserProfile) return false;
    
    const role = currentUserProfile.role;
    
    if (role === 'admin') return true;
    if (role === 'editor' && (action === 'insert' || action === 'update' || action === 'select')) return true;
    if (role === 'visor' && action === 'select') return true;
    
    return false;
}

// Navegació
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
        case 'treballadors':
            carregarVistaTreballadors();
            break;
        case 'control-horari':
            carregarVistaControlHorari();
            break;
        default:
            container.innerHTML = '<p>Vista no trobada</p>';
    }
}

// DASHBOARD (mantenir codi anterior - copiat de app.v5.js)
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
    html += '<div style="margin-bottom: 30px;"><label style="font-weight: bold; margin-right: 10px;">🗺️ Seleccionar finca:</label>';
    html += '<select id="selector-finca" onchange="seleccionarFinca(this.value)" style="padding: 8px; font-size: 14px; border: 1px solid #ddd; border-radius: 4px; min-width: 250px;">';
    html += '<option value="">Totes les finques</option>';
    finques.forEach(function(finca) {
        const selected = finca === fincaSeleccionada ? 'selected' : '';
        html += '<option value="' + finca + '" ' + selected + '>' + finca + '</option>';
    });
    html += '</select></div>';
    html += '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-icon">🗺️</div><div class="stat-info"><div class="stat-value">' + parcellesFiltrades.length + '</div><div class="stat-label">Parcel·les</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon">📏</div><div class="stat-info"><div class="stat-value">' + totalSuperficie.toFixed(2) + ' Ha</div><div class="stat-label">Superfície Total</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon">🌱</div><div class="stat-info"><div class="stat-value">' + tractaments.length + '</div><div class="stat-label">Tractaments</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon">🧪</div><div class="stat-info"><div class="stat-value">' + fitosanitaris.length + '</div><div class="stat-label">Fitosanitaris</div></div></div>';
    html += '</div>';
    
    if (Object.keys(cultius).length > 0) {
        html += '<div style="margin-top: 30px;"><h3>📊 Distribució per Cultiu</h3><div class="table-container"><table class="data-table">';
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

// ============================================================
// VISTA TRACTAMENTS AMB CRUD
// ============================================================

async function carregarVistaTractaments() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    
    let html = '<div class="view-tractaments">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">';
    html += '<h2>🌱 Tractaments Fitosanitaris</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalTractament()">➕ Nou Tractament</button>';
    }
    html += '</div>';
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Data</th><th>Producte</th><th>Finca</th><th>Parcel·les</th><th>Superfície (Ha)</th><th>Dosi</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-tractaments"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
    
    html += crearModalTractament();
    
    container.innerHTML = html;
    await carregarTaulaTractaments();
}

async function carregarTaulaTractaments() {
    const tbody = document.getElementById('tbody-tractaments');
    if (!tbody) return;
    
    try {
        tractaments = await getTractaments();
        
        if (tractaments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha tractaments</td></tr>';
            return;
        }
        
        // Agrupar tractaments per data + producte + finca
        const grups = {};
        for (let i = 0; i < tractaments.length; i++) {
            const t = tractaments[i];
            const parcella = parcelles.find(function(p) { return p.id === t.parcella_id; });
            const finca = parcella ? (parcella.finca || 'Sense finca') : 'Sense finca';
            const clau = t.data + '-' + t.producte_id + '-' + finca;
            if (!grups[clau]) {
                grups[clau] = {
                    data: t.data,
                    producte_id: t.producte_id,
                    finca: finca,
                    dosi: t.dosi,
                    unitat: t.unitat,
                    tractaments: []
                };
            }
            grups[clau].tractaments.push(t);
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        
        let html = '';
        Object.keys(grups).sort().reverse().forEach(function(clau) {
            const grup = grups[clau];
            const producte = fitosanitaris.find(function(f) { return f.id === grup.producte_id; });
            const nomProducte = producte ? producte.nom : 'Producte desconegut';
            
            const superficieTotal = grup.tractaments.reduce(function(sum, t) {
                return sum + (parseFloat(t.superficie_tractada) || 0);
            }, 0);
            
            const numParcelles = grup.tractaments.length;
            
            html += '<tr>';
            html += '<td><strong>' + formatData(grup.data) + '</strong></td>';
            html += '<td>' + nomProducte + '</td>';
            html += '<td>' + grup.finca + '</td>';
            html += '<td>' + numParcelles + ' parcel·les</td>';
            html += '<td>' + superficieTotal.toFixed(2) + '</td>';
            html += '<td>' + (grup.dosi || 0) + ' ' + (grup.unitat || 'L/Ha') + '</td>';
            html += '<td>';
            html += '<button class="btn btn-sm btn-primary" onclick="veureTractamentGrup(\'' + clau + '\')">👁️</button> ';
            if (podeEliminar) {
                html += '<button class="btn btn-sm btn-danger" onclick="eliminarTractamentGrup(\'' + clau + '\')">🗑️</button>';
            }
            html += '</td></tr>';
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="7">Error carregant dades</td></tr>';
    }
}

function crearModalTractament() {
    let html = '<div id="modal-tractament" class="modal" style="display: none;">';
    html += '<div class="modal-content" style="max-width: 800px;">';
    html += '<span class="close" onclick="tancarModal(\'modal-tractament\')">&times;</span>';
    html += '<h2 id="modal-tractament-titol">Nou Tractament</h2>';
    html += '<form id="form-tractament" onsubmit="guardarTractament(event)">';
    
    html += '<div class="form-group"><label>Data Tractament *</label><input type="date" id="tractament-data" required></div>';
    
    html += '<div class="form-group"><label>Selecció Parcel·les *</label>';
    html += '<div style="display: flex; gap: 15px; margin-top: 10px;">';
    html += '<label style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; background: white; transition: all 0.2s;" onmouseover="this.style.borderColor=\'#4CAF50\'" onmouseout="if(!this.querySelector(\'input\').checked) this.style.borderColor=\'#ddd\'">';
    html += '<input type="radio" name="seleccio-tipus" value="finca" onchange="canviarTipusSeleccio(); document.querySelectorAll(\'label\').forEach(l => l.style.background=\'white\'); this.parentElement.style.background=\'#e8f5e9\'; document.querySelectorAll(\'label\').forEach(l => l.style.borderColor=\'#ddd\'); this.parentElement.style.borderColor=\'#4CAF50\';" checked style="margin: 0;"> <span style="font-weight: 500;">🗺️ Per Finca</span></label>';
    html += '<label style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; background: white; transition: all 0.2s;" onmouseover="this.style.borderColor=\'#4CAF50\'" onmouseout="if(!this.querySelector(\'input\').checked) this.style.borderColor=\'#ddd\'">';
    html += '<input type="radio" name="seleccio-tipus" value="varietat" onchange="canviarTipusSeleccio(); document.querySelectorAll(\'label\').forEach(l => l.style.background=\'white\'); this.parentElement.style.background=\'#e8f5e9\'; document.querySelectorAll(\'label\').forEach(l => l.style.borderColor=\'#ddd\'); this.parentElement.style.borderColor=\'#4CAF50\';" style="margin: 0;"> <span style="font-weight: 500;">🌾 Per Varietat</span></label>';
    html += '<label style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; background: white; transition: all 0.2s;" onmouseover="this.style.borderColor=\'#4CAF50\'" onmouseout="if(!this.querySelector(\'input\').checked) this.style.borderColor=\'#ddd\'">';
    html += '<input type="radio" name="seleccio-tipus" value="manual" onchange="canviarTipusSeleccio(); document.querySelectorAll(\'label\').forEach(l => l.style.background=\'white\'); this.parentElement.style.background=\'#e8f5e9\'; document.querySelectorAll(\'label\').forEach(l => l.style.borderColor=\'#ddd\'); this.parentElement.style.borderColor=\'#4CAF50\';" style="margin: 0;"> <span style="font-weight: 500;">📍 Selecció Manual</span></label>';
    html += '</div></div>';
    
    html += '<div id="seleccio-finca" class="form-group"><label>Finca</label><select id="tractament-finca" onchange="actualitzarParcellesSeleccionades()"><option value="">Seleccionar...</option></select></div>';
    html += '<div id="seleccio-varietat" class="form-group" style="display:none;"><label>Finca</label><select id="tractament-finca-varietat" onchange="actualitzarVarietatsDisponibles()"><option value="">Seleccionar...</option></select>';
    html += '<label style="margin-top: 10px;">Varietat</label><select id="tractament-varietat" onchange="actualitzarParcellesSeleccionades()"><option value="">Seleccionar...</option></select></div>';
    html += '<div id="seleccio-manual" class="form-group" style="display:none;"><label>Parcel·les (selecció múltiple)</label><select id="tractament-parcelles" multiple size="10" onchange="calcularSuperficieTotal()"></select></div>';
    
    html += '<div class="form-group"><label>Superfície Total: <span id="superficie-total">0</span> Ha</label></div>';
    
    html += '<div class="form-group"><label>Producte (Fitosanitari) *</label><select id="tractament-producte" required onchange="actualitzarDosisRecomanada()"><option value="">Seleccionar...</option></select></div>';
    
    html += '<div class="form-group"><label>Dosi *</label><div style="display: flex; gap: 10px;">';
    html += '<input type="number" id="tractament-dosi" required min="0" step="0.01" style="flex: 2;">';
    html += '<select id="tractament-unitat" style="flex: 1;"><option value="L/Ha">L/Ha</option><option value="kg/Ha">kg/Ha</option><option value="g/Ha">g/Ha</option></select>';
    html += '</div></div>';
    
    html += '<div class="form-group"><label>Quantitat Total: <span id="quantitat-total">0</span> <span id="unitat-total">L</span></label></div>';
    
    html += '<div class="form-group"><label>Operador</label><input type="text" id="tractament-operador"></div>';
    html += '<div class="form-group"><label>Maquinària</label><input type="text" id="tractament-maquinaria"></div>';
    html += '<div class="form-group"><label>Condicions Meteorològiques</label><textarea id="tractament-meteo" rows="2" placeholder="Temp: 22°C, Vent: Calma, Humitat: 60%"></textarea></div>';
    html += '<div class="form-group"><label>Observacions</label><textarea id="tractament-observacions" rows="3"></textarea></div>';
    
    html += '<div class="form-actions">';
    html += '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-tractament\')">Cancel·lar</button>';
    html += '<button type="submit" class="btn btn-primary">Guardar</button>';
    html += '</div></form></div></div>';
    
    return html;
}

function canviarTipusSeleccio() {
    const tipus = document.querySelector('input[name="seleccio-tipus"]:checked').value;
    
    document.getElementById('seleccio-finca').style.display = tipus === 'finca' ? 'block' : 'none';
    document.getElementById('seleccio-varietat').style.display = tipus === 'varietat' ? 'block' : 'none';
    document.getElementById('seleccio-manual').style.display = tipus === 'manual' ? 'block' : 'none';
    
    actualitzarParcellesSeleccionades();
}

function actualitzarVarietatsDisponibles() {
    const finca = document.getElementById('tractament-finca-varietat').value;
    const selectVarietat = document.getElementById('tractament-varietat');
    
    if (!finca) {
        selectVarietat.innerHTML = '<option value="">Seleccionar...</option>';
        return;
    }
    
    const parcellesFinca = parcelles.filter(function(p) { return p.finca === finca; });
    const varietats = {};
    parcellesFinca.forEach(function(p) {
        if (p.varietat) {
            varietats[p.varietat] = true;
        }
    });
    
    selectVarietat.innerHTML = '<option value="">Seleccionar...</option>';
    Object.keys(varietats).sort().forEach(function(v) {
        selectVarietat.innerHTML += '<option value="' + v + '">' + v + '</option>';
    });
}

function actualitzarParcellesSeleccionades() {
    const tipus = document.querySelector('input[name="seleccio-tipus"]:checked').value;
    
    if (tipus === 'finca') {
        const finca = document.getElementById('tractament-finca').value;
        if (finca) {
            const parcellesFinca = parcelles.filter(function(p) { return p.finca === finca; });
            calcularSuperficieTotal(parcellesFinca);
        } else {
            calcularSuperficieTotal([]);
        }
    } else if (tipus === 'varietat') {
        const finca = document.getElementById('tractament-finca-varietat').value;
        const varietat = document.getElementById('tractament-varietat').value;
        if (finca && varietat) {
            const parcellesVarietat = parcelles.filter(function(p) { 
                return p.finca === finca && p.varietat === varietat; 
            });
            calcularSuperficieTotal(parcellesVarietat);
        } else {
            calcularSuperficieTotal([]);
        }
    } else {
        calcularSuperficieTotal();
    }
}

function calcularSuperficieTotal(parcellesSeleccionades) {
    let superficie = 0;
    
    if (parcellesSeleccionades) {
        superficie = parcellesSeleccionades.reduce(function(sum, p) {
            return sum + (parseFloat(p.superficie) || 0);
        }, 0);
    } else {
        const select = document.getElementById('tractament-parcelles');
        const opcions = select.selectedOptions;
        for (let i = 0; i < opcions.length; i++) {
            const parcellaId = opcions[i].value;
            const parcella = parcelles.find(function(p) { return p.id === parcellaId; });
            if (parcella) {
                superficie += parseFloat(parcella.superficie) || 0;
            }
        }
    }
    
    document.getElementById('superficie-total').textContent = superficie.toFixed(2);
    calcularQuantitatTotal();
}

function calcularQuantitatTotal() {
    const superficie = parseFloat(document.getElementById('superficie-total').textContent) || 0;
    const dosi = parseFloat(document.getElementById('tractament-dosi').value) || 0;
    const unitat = document.getElementById('tractament-unitat').value;
    
    const quantitat = superficie * dosi;
    document.getElementById('quantitat-total').textContent = quantitat.toFixed(2);
    
    const unitatBase = unitat.split('/')[0];
    document.getElementById('unitat-total').textContent = unitatBase;
}

function actualitzarDosisRecomanada() {
    calcularQuantitatTotal();
}

async function obrirModalTractament() {
    document.getElementById('modal-tractament-titol').textContent = 'Nou Tractament';
    document.getElementById('form-tractament').reset();
    
    const avui = new Date().toISOString().split('T')[0];
    document.getElementById('tractament-data').value = avui;
    
    const selectFinca = document.getElementById('tractament-finca');
    const selectFincaVarietat = document.getElementById('tractament-finca-varietat');
    const selectParcelles = document.getElementById('tractament-parcelles');
    const selectProducte = document.getElementById('tractament-producte');
    
    selectFinca.innerHTML = '<option value="">Seleccionar...</option>';
    selectFincaVarietat.innerHTML = '<option value="">Seleccionar...</option>';
    selectParcelles.innerHTML = '';
    selectProducte.innerHTML = '<option value="">Seleccionar...</option>';
    
    finques.forEach(function(finca) {
        selectFinca.innerHTML += '<option value="' + finca + '">' + finca + '</option>';
        selectFincaVarietat.innerHTML += '<option value="' + finca + '">' + finca + '</option>';
    });
    
    parcelles.forEach(function(p) {
        selectParcelles.innerHTML += '<option value="' + p.id + '">' + p.nom + ' (' + p.superficie + ' Ha)</option>';
    });
    
    // Ordenar fitosanitaris alfabèticament
    const fitosanitarisOrdenats = fitosanitaris.slice().sort(function(a, b) {
        return (a.nom || '').localeCompare(b.nom || '');
    });
    
    fitosanitarisOrdenats.forEach(function(f) {
        selectProducte.innerHTML += '<option value="' + f.id + '">' + f.nom + '</option>';
    });
    
    document.getElementById('superficie-total').textContent = '0';
    document.getElementById('quantitat-total').textContent = '0';
    
    document.getElementById('modal-tractament').style.display = 'block';
    
    // Aplicar estil inicial al primer radio button
    setTimeout(function() {
        const primerRadio = document.querySelector('input[name="seleccio-tipus"][value="finca"]');
        if (primerRadio && primerRadio.parentElement) {
            primerRadio.parentElement.style.background = '#e8f5e9';
            primerRadio.parentElement.style.borderColor = '#4CAF50';
        }
    }, 50);
}

async function guardarTractament(event) {
    event.preventDefault();
    
    const tipus = document.querySelector('input[name="seleccio-tipus"]:checked').value;
    const data = document.getElementById('tractament-data').value;
    const producteId = document.getElementById('tractament-producte').value;
    const dosi = parseFloat(document.getElementById('tractament-dosi').value);
    const unitat = document.getElementById('tractament-unitat').value;
    const operador = document.getElementById('tractament-operador').value.trim();
    const maquinaria = document.getElementById('tractament-maquinaria').value.trim();
    const meteo = document.getElementById('tractament-meteo').value.trim();
    const observacions = document.getElementById('tractament-observacions').value.trim();
    
    let parcellesATractar = [];
    
    if (tipus === 'finca') {
        const finca = document.getElementById('tractament-finca').value;
        parcellesATractar = parcelles.filter(function(p) { return p.finca === finca; });
    } else if (tipus === 'varietat') {
        const finca = document.getElementById('tractament-finca-varietat').value;
        const varietat = document.getElementById('tractament-varietat').value;
        parcellesATractar = parcelles.filter(function(p) { 
            return p.finca === finca && p.varietat === varietat; 
        });
    } else {
        const select = document.getElementById('tractament-parcelles');
        const opcions = select.selectedOptions;
        for (let i = 0; i < opcions.length; i++) {
            const parcellaId = opcions[i].value;
            const parcella = parcelles.find(function(p) { return p.id === parcellaId; });
            if (parcella) {
                parcellesATractar.push(parcella);
            }
        }
    }
    
    if (parcellesATractar.length === 0) {
        mostrarNotificacio('Cal seleccionar almenys una parcel·la', 'error');
        return;
    }
    
    const producte = fitosanitaris.find(function(f) { return f.id === producteId; });
    const placSeguretat = producte ? (producte.plac || 0) : 0;
    const dataLimit = new Date(data);
    dataLimit.setDate(dataLimit.getDate() + placSeguretat);
    
    try {
        for (let i = 0; i < parcellesATractar.length; i++) {
            const parcella = parcellesATractar[i];
            const tractament = {
                data: data,
                data_limit: dataLimit.toISOString().split('T')[0],
                parcella_id: parcella.id,
                producte_id: producteId,
                dosi: dosi,
                unitat: unitat,
                superficie_tractada: parcella.superficie,
                operador: operador || null,
                maquinaria: maquinaria || null,
                condicions_meteo: meteo || null,
                observacions: observacions || null
            };
            
            await createTractament(tractament);
        }
        
        mostrarNotificacio('Tractament creat correctament (' + parcellesATractar.length + ' parcel·les)', 'success');
        tancarModal('modal-tractament');
        await carregarTaulaTractaments();
        
    } catch (error) {
        console.error('Error guardant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function veureTractamentGrup(clau) {
    // La clau ara és: data-producte_id-finca
    const grupTractaments = tractaments.filter(function(t) {
        const parcella = parcelles.find(function(p) { return p.id === t.parcella_id; });
        const finca = parcella ? (parcella.finca || 'Sense finca') : 'Sense finca';
        return (t.data + '-' + t.producte_id + '-' + finca) === clau;
    });
    
    if (grupTractaments.length === 0) return;
    
    const primer = grupTractaments[0];
    const producte = fitosanitaris.find(function(f) { return f.id === primer.producte_id; });
    const nomProducte = producte ? producte.nom : 'Producte desconegut';
    
    const superficieTotal = grupTractaments.reduce(function(sum, t) {
        return sum + (parseFloat(t.superficie_tractada) || 0);
    }, 0);
    
    const quantitatTotal = superficieTotal * (parseFloat(primer.dosi) || 0);
    const unitatBase = (primer.unitat || 'L/Ha').split('/')[0];
    
    let html = '<div id="modal-veure-tractament" class="modal" style="display: block;">';
    html += '<div class="modal-content" style="max-width: 700px;">';
    html += '<span class="close" onclick="tancarModal(\'modal-veure-tractament\')">&times;</span>';
    html += '<h2>📋 Detall Tractament</h2>';
    
    html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
    html += '<div><strong>📅 Data:</strong> ' + formatData(primer.data) + '</div>';
    html += '<div><strong>🧪 Producte:</strong> ' + nomProducte + '</div>';
    html += '<div><strong>💧 Dosi:</strong> ' + (primer.dosi || 0) + ' ' + (primer.unitat || 'L/Ha') + '</div>';
    html += '<div><strong>📏 Superfície total:</strong> ' + superficieTotal.toFixed(2) + ' Ha</div>';
    html += '<div><strong>📦 Quantitat total:</strong> ' + quantitatTotal.toFixed(2) + ' ' + unitatBase + '</div>';
    if (primer.data_limit) {
        html += '<div><strong>⏰ Data límit:</strong> ' + formatData(primer.data_limit) + '</div>';
    }
    html += '</div></div>';
    
    html += '<h3 style="margin-top: 20px; margin-bottom: 10px;">🗺️ Parcel·les Tractades (' + grupTractaments.length + ')</h3>';
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Parcel·la</th><th>Finca</th><th>Cultiu</th><th>Varietat</th><th>Superfície (Ha)</th></tr></thead>';
    html += '<tbody>';
    
    grupTractaments.forEach(function(t) {
        const parcella = parcelles.find(function(p) { return p.id === t.parcella_id; });
        if (parcella) {
            html += '<tr>';
            html += '<td><strong>' + (parcella.nom || '-') + '</strong></td>';
            html += '<td>' + (parcella.finca || '-') + '</td>';
            html += '<td>' + (parcella.cultiu || '-') + '</td>';
            html += '<td>' + (parcella.varietat || '-') + '</td>';
            html += '<td>' + (t.superficie_tractada || 0) + '</td>';
            html += '</tr>';
        }
    });
    
    html += '</tbody></table></div>';
    
    if (primer.operador || primer.maquinaria || primer.condicions_meteo || primer.observacions) {
        html += '<h3 style="margin-top: 20px; margin-bottom: 10px;">📝 Informació Addicional</h3>';
        html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">';
        if (primer.operador) {
            html += '<div style="margin-bottom: 10px;"><strong>👤 Operador:</strong> ' + primer.operador + '</div>';
        }
        if (primer.maquinaria) {
            html += '<div style="margin-bottom: 10px;"><strong>🚜 Maquinària:</strong> ' + primer.maquinaria + '</div>';
        }
        if (primer.condicions_meteo) {
            html += '<div style="margin-bottom: 10px;"><strong>🌤️ Condicions Meteo:</strong> ' + primer.condicions_meteo + '</div>';
        }
        if (primer.observacions) {
            html += '<div><strong>📄 Observacions:</strong> ' + primer.observacions + '</div>';
        }
        html += '</div>';
    }
    
    html += '<div class="form-actions" style="margin-top: 20px;">';
    html += '<button type="button" class="btn btn-primary" onclick="tancarModal(\'modal-veure-tractament\')">Tancar</button>';
    html += '</div>';
    
    html += '</div></div>';
    
    document.body.insertAdjacentHTML('beforeend', html);
}

async function eliminarTractamentGrup(clau) {
    if (!confirm('Segur que vols eliminar aquest grup de tractaments?')) return;
    
    try {
        const grup = tractaments.filter(function(t) {
            const parcella = parcelles.find(function(p) { return p.id === t.parcella_id; });
            const finca = parcella ? (parcella.finca || 'Sense finca') : 'Sense finca';
            return (t.data + '-' + t.producte_id + '-' + finca) === clau;
        });
        
        for (let i = 0; i < grup.length; i++) {
            await deleteTractament(grup[i].id);
        }
        
        mostrarNotificacio('Tractaments eliminats correctament', 'success');
        await carregarTaulaTractaments();
    } catch (error) {
        console.error('Error eliminant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// VISTA FERTILITZACIONS AMB CRUD
// ============================================================

async function carregarVistaFertilitzacions() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    
    let html = '<div class="view-fertilitzacions">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">';
    html += '<h2>🌿 Fertilitzacions</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalFertilitzacio()">➕ Nova Fertilització</button>';
    }
    html += '</div>';
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Data</th><th>Producte</th><th>Finca</th><th>Parcel·les</th><th>Superfície (Ha)</th><th>Dosi</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-fertilitzacions"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
    
    html += crearModalFertilitzacio();
    
    container.innerHTML = html;
    await carregarTaulaFertilitzacions();
}

async function carregarTaulaFertilitzacions() {
    const tbody = document.getElementById('tbody-fertilitzacions');
    if (!tbody) return;
    
    try {
        fertilitzacions = await getFertilitzacions();
        
        if (fertilitzacions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha fertilitzacions</td></tr>';
            return;
        }
        
        const grups = {};
        for (let i = 0; i < fertilitzacions.length; i++) {
            const f = fertilitzacions[i];
            const parcella = parcelles.find(function(p) { return p.id === f.parcella_id; });
            const finca = parcella ? (parcella.finca || 'Sense finca') : 'Sense finca';
            const clau = f.data + '-' + f.producte_id + '-' + finca;
            if (!grups[clau]) {
                grups[clau] = {
                    data: f.data,
                    producte_id: f.producte_id,
                    finca: finca,
                    dosi: f.dosi,
                    unitat: f.unitat,
                    fertilitzacions: []
                };
            }
            grups[clau].fertilitzacions.push(f);
        }
        
        const podeEliminar = hasPermission('delete');
        
        let html = '';
        Object.keys(grups).sort().reverse().forEach(function(clau) {
            const grup = grups[clau];
            const producte = fertilitzants.find(function(f) { return f.id === grup.producte_id; });
            const nomProducte = producte ? producte.nom : 'Producte desconegut';
            
            const superficieTotal = grup.fertilitzacions.reduce(function(sum, f) {
                return sum + (parseFloat(f.superficie_tractada) || 0);
            }, 0);
            
            const numParcelles = grup.fertilitzacions.length;
            
            html += '<tr>';
            html += '<td><strong>' + formatData(grup.data) + '</strong></td>';
            html += '<td>' + nomProducte + '</td>';
            html += '<td>' + grup.finca + '</td>';
            html += '<td>' + numParcelles + ' parcel·les</td>';
            html += '<td>' + superficieTotal.toFixed(2) + '</td>';
            html += '<td>' + (grup.dosi || 0) + ' ' + (grup.unitat || 'kg/Ha') + '</td>';
            html += '<td>';
            html += '<button class="btn btn-sm btn-primary" onclick="veureFertilitzacioGrup(\'' + clau + '\')">👁️</button> ';
            if (podeEliminar) {
                html += '<button class="btn btn-sm btn-danger" onclick="eliminarFertilitzacioGrup(\'' + clau + '\')">🗑️</button>';
            }
            html += '</td></tr>';
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="7">Error carregant dades</td></tr>';
    }
}

function crearModalFertilitzacio() {
    let html = '<div id="modal-fertilitzacio" class="modal" style="display: none;">';
    html += '<div class="modal-content" style="max-width: 800px;">';
    html += '<span class="close" onclick="tancarModal(\'modal-fertilitzacio\')">&times;</span>';
    html += '<h2 id="modal-fertilitzacio-titol">Nova Fertilització</h2>';
    html += '<form id="form-fertilitzacio" onsubmit="guardarFertilitzacio(event)">';
    
    html += '<div class="form-group"><label>Data Fertilització *</label><input type="date" id="fertilitzacio-data" required></div>';
    
    html += '<div class="form-group"><label>Selecció Parcel·les *</label>';
    html += '<div style="display: flex; gap: 15px; margin-top: 10px;">';
    html += '<label style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; background: white; transition: all 0.2s;" onmouseover="this.style.borderColor=\'#4CAF50\'" onmouseout="if(!this.querySelector(\'input\').checked) this.style.borderColor=\'#ddd\'">';
    html += '<input type="radio" name="seleccio-tipus-fert" value="finca" onchange="canviarTipusSeleccioFert(); document.querySelectorAll(\'label\').forEach(l => l.style.background=\'white\'); this.parentElement.style.background=\'#e8f5e9\'; document.querySelectorAll(\'label\').forEach(l => l.style.borderColor=\'#ddd\'); this.parentElement.style.borderColor=\'#4CAF50\';" checked style="margin: 0;"> <span style="font-weight: 500;">🗺️ Per Finca</span></label>';
    html += '<label style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; background: white; transition: all 0.2s;" onmouseover="this.style.borderColor=\'#4CAF50\'" onmouseout="if(!this.querySelector(\'input\').checked) this.style.borderColor=\'#ddd\'">';
    html += '<input type="radio" name="seleccio-tipus-fert" value="varietat" onchange="canviarTipusSeleccioFert(); document.querySelectorAll(\'label\').forEach(l => l.style.background=\'white\'); this.parentElement.style.background=\'#e8f5e9\'; document.querySelectorAll(\'label\').forEach(l => l.style.borderColor=\'#ddd\'); this.parentElement.style.borderColor=\'#4CAF50\';" style="margin: 0;"> <span style="font-weight: 500;">🌾 Per Varietat</span></label>';
    html += '<label style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; background: white; transition: all 0.2s;" onmouseover="this.style.borderColor=\'#4CAF50\'" onmouseout="if(!this.querySelector(\'input\').checked) this.style.borderColor=\'#ddd\'">';
    html += '<input type="radio" name="seleccio-tipus-fert" value="manual" onchange="canviarTipusSeleccioFert(); document.querySelectorAll(\'label\').forEach(l => l.style.background=\'white\'); this.parentElement.style.background=\'#e8f5e9\'; document.querySelectorAll(\'label\').forEach(l => l.style.borderColor=\'#ddd\'); this.parentElement.style.borderColor=\'#4CAF50\';" style="margin: 0;"> <span style="font-weight: 500;">📍 Selecció Manual</span></label>';
    html += '</div></div>';
    
    html += '<div id="seleccio-finca-fert" class="form-group"><label>Finca</label><select id="fertilitzacio-finca" onchange="actualitzarParcellesSeleccionadesFert()"><option value="">Seleccionar...</option></select></div>';
    html += '<div id="seleccio-varietat-fert" class="form-group" style="display:none;"><label>Finca</label><select id="fertilitzacio-finca-varietat" onchange="actualitzarVarietatsDisponiblesFert()"><option value="">Seleccionar...</option></select>';
    html += '<label style="margin-top: 10px;">Varietat</label><select id="fertilitzacio-varietat" onchange="actualitzarParcellesSeleccionadesFert()"><option value="">Seleccionar...</option></select></div>';
    html += '<div id="seleccio-manual-fert" class="form-group" style="display:none;"><label>Parcel·les (selecció múltiple)</label><select id="fertilitzacio-parcelles" multiple size="10" onchange="calcularSuperficieTotalFert()"></select></div>';
    
    html += '<div class="form-group"><label>Superfície Total: <span id="superficie-total-fert">0</span> Ha</label></div>';
    
    html += '<div class="form-group"><label>Producte (Fertilitzant) *</label><select id="fertilitzacio-producte" required onchange="mostrarInfoFertilitzant()"><option value="">Seleccionar...</option></select></div>';
    html += '<div id="info-fertilitzant" style="display:none; background: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 15px;"></div>';
    
    html += '<div class="form-group"><label>Dosi *</label><div style="display: flex; gap: 10px;">';
    html += '<input type="number" id="fertilitzacio-dosi" required min="0" step="0.01" style="flex: 2;" onchange="calcularQuantitatTotalFert()">';
    html += '<select id="fertilitzacio-unitat" onchange="calcularQuantitatTotalFert()" style="flex: 1;"><option value="kg/Ha">kg/Ha</option><option value="L/Ha">L/Ha</option><option value="g/Ha">g/Ha</option></select>';
    html += '</div></div>';
    
    html += '<div class="form-group"><label>Quantitat Total: <span id="quantitat-total-fert">0</span> <span id="unitat-total-fert">kg</span></label></div>';
    html += '<div id="totals-npk" style="display:none; background: #f1f8e9; padding: 12px; border-radius: 6px; margin-bottom: 15px;"></div>';
    
    html += '<div class="form-group"><label>Mètode Aplicació</label><select id="fertilitzacio-metode"><option value="">Seleccionar...</option><option value="Sòl">Sòl</option><option value="Foliar">Foliar</option><option value="Fertiirrigació">Fertiirrigació</option><option value="Altres">Altres</option></select></div>';
    html += '<div class="form-group"><label>Operador</label><input type="text" id="fertilitzacio-operador"></div>';
    html += '<div class="form-group"><label>Maquinària</label><input type="text" id="fertilitzacio-maquinaria"></div>';
    html += '<div class="form-group"><label>Observacions</label><textarea id="fertilitzacio-observacions" rows="3"></textarea></div>';
    
    html += '<div class="form-actions">';
    html += '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-fertilitzacio\')">Cancel·lar</button>';
    html += '<button type="submit" class="btn btn-primary">Guardar</button>';
    html += '</div></form></div></div>';
    
    return html;
}

function canviarTipusSeleccioFert() {
    const tipus = document.querySelector('input[name="seleccio-tipus-fert"]:checked').value;
    document.getElementById('seleccio-finca-fert').style.display = tipus === 'finca' ? 'block' : 'none';
    document.getElementById('seleccio-varietat-fert').style.display = tipus === 'varietat' ? 'block' : 'none';
    document.getElementById('seleccio-manual-fert').style.display = tipus === 'manual' ? 'block' : 'none';
    actualitzarParcellesSeleccionadesFert();
}

function actualitzarVarietatsDisponiblesFert() {
    const finca = document.getElementById('fertilitzacio-finca-varietat').value;
    const selectVarietat = document.getElementById('fertilitzacio-varietat');
    
    if (!finca) {
        selectVarietat.innerHTML = '<option value="">Seleccionar...</option>';
        return;
    }
    
    const parcellesFinca = parcelles.filter(function(p) { return p.finca === finca; });
    const varietats = {};
    parcellesFinca.forEach(function(p) {
        if (p.varietat) varietats[p.varietat] = true;
    });
    
    selectVarietat.innerHTML = '<option value="">Seleccionar...</option>';
    Object.keys(varietats).sort().forEach(function(v) {
        selectVarietat.innerHTML += '<option value="' + v + '">' + v + '</option>';
    });
}

function actualitzarParcellesSeleccionadesFert() {
    const tipus = document.querySelector('input[name="seleccio-tipus-fert"]:checked').value;
    
    if (tipus === 'finca') {
        const finca = document.getElementById('fertilitzacio-finca').value;
        if (finca) {
            const parcellesFinca = parcelles.filter(function(p) { return p.finca === finca; });
            calcularSuperficieTotalFert(parcellesFinca);
        } else {
            calcularSuperficieTotalFert([]);
        }
    } else if (tipus === 'varietat') {
        const finca = document.getElementById('fertilitzacio-finca-varietat').value;
        const varietat = document.getElementById('fertilitzacio-varietat').value;
        if (finca && varietat) {
            const parcellesVarietat = parcelles.filter(function(p) { 
                return p.finca === finca && p.varietat === varietat; 
            });
            calcularSuperficieTotalFert(parcellesVarietat);
        } else {
            calcularSuperficieTotalFert([]);
        }
    } else {
        calcularSuperficieTotalFert();
    }
}

function calcularSuperficieTotalFert(parcellesSeleccionades) {
    let superficie = 0;
    
    if (parcellesSeleccionades) {
        superficie = parcellesSeleccionades.reduce(function(sum, p) {
            return sum + (parseFloat(p.superficie) || 0);
        }, 0);
    } else {
        const select = document.getElementById('fertilitzacio-parcelles');
        const opcions = select.selectedOptions;
        for (let i = 0; i < opcions.length; i++) {
            const parcellaId = opcions[i].value;
            const parcella = parcelles.find(function(p) { return p.id === parcellaId; });
            if (parcella) {
                superficie += parseFloat(parcella.superficie) || 0;
            }
        }
    }
    
    document.getElementById('superficie-total-fert').textContent = superficie.toFixed(2);
    calcularQuantitatTotalFert();
}

function mostrarInfoFertilitzant() {
    const producteId = document.getElementById('fertilitzacio-producte').value;
    const infoDiv = document.getElementById('info-fertilitzant');
    
    if (!producteId) {
        infoDiv.style.display = 'none';
        return;
    }
    
    const producte = fertilitzants.find(function(f) { return f.id === producteId; });
    if (!producte) {
        infoDiv.style.display = 'none';
        return;
    }
    
    let html = '<strong>📊 Composició:</strong> ';
    html += 'N: ' + (producte.n || 0) + '% | ';
    html += 'P: ' + (producte.p || 0) + '% | ';
    html += 'K: ' + (producte.k || 0) + '%';
    
    if (producte.observacions) {
        html += '<br><strong>📝 Observacions:</strong> ' + producte.observacions;
    }
    
    infoDiv.innerHTML = html;
    infoDiv.style.display = 'block';
    
    calcularQuantitatTotalFert();
}

function calcularQuantitatTotalFert() {
    const superficie = parseFloat(document.getElementById('superficie-total-fert').textContent) || 0;
    const dosi = parseFloat(document.getElementById('fertilitzacio-dosi').value) || 0;
    const unitat = document.getElementById('fertilitzacio-unitat').value;
    const producteId = document.getElementById('fertilitzacio-producte').value;
    
    const quantitat = superficie * dosi;
    document.getElementById('quantitat-total-fert').textContent = quantitat.toFixed(2);
    
    const unitatBase = unitat.split('/')[0];
    document.getElementById('unitat-total-fert').textContent = unitatBase;
    
    if (producteId && quantitat > 0) {
        const producte = fertilitzants.find(function(f) { return f.id === producteId; });
        if (producte) {
            const n = (producte.n || 0) * quantitat / 100;
            const p = (producte.p || 0) * quantitat / 100;
            const k = (producte.k || 0) * quantitat / 100;
            
            let html = '<strong>🌱 Unitats Fertilitzant (U.F.) totals:</strong><br>';
            html += 'N total: ' + n.toFixed(2) + ' ' + unitatBase + ' | ';
            html += 'P total: ' + p.toFixed(2) + ' ' + unitatBase + ' | ';
            html += 'K total: ' + k.toFixed(2) + ' ' + unitatBase;
            
            document.getElementById('totals-npk').innerHTML = html;
            document.getElementById('totals-npk').style.display = 'block';
        }
    } else {
        document.getElementById('totals-npk').style.display = 'none';
    }
}

async function obrirModalFertilitzacio() {
    document.getElementById('modal-fertilitzacio-titol').textContent = 'Nova Fertilització';
    document.getElementById('form-fertilitzacio').reset();
    
    const avui = new Date().toISOString().split('T')[0];
    document.getElementById('fertilitzacio-data').value = avui;
    
    const selectFinca = document.getElementById('fertilitzacio-finca');
    const selectFincaVarietat = document.getElementById('fertilitzacio-finca-varietat');
    const selectParcelles = document.getElementById('fertilitzacio-parcelles');
    const selectProducte = document.getElementById('fertilitzacio-producte');
    
    selectFinca.innerHTML = '<option value="">Seleccionar...</option>';
    selectFincaVarietat.innerHTML = '<option value="">Seleccionar...</option>';
    selectParcelles.innerHTML = '';
    selectProducte.innerHTML = '<option value="">Seleccionar...</option>';
    
    finques.forEach(function(finca) {
        selectFinca.innerHTML += '<option value="' + finca + '">' + finca + '</option>';
        selectFincaVarietat.innerHTML += '<option value="' + finca + '">' + finca + '</option>';
    });
    
    parcelles.forEach(function(p) {
        selectParcelles.innerHTML += '<option value="' + p.id + '">' + p.nom + ' (' + p.superficie + ' Ha)</option>';
    });
    
    const fertilitzantsOrdenats = fertilitzants.slice().sort(function(a, b) {
        return (a.nom || '').localeCompare(b.nom || '');
    });
    
    fertilitzantsOrdenats.forEach(function(f) {
        selectProducte.innerHTML += '<option value="' + f.id + '">' + f.nom + '</option>';
    });
    
    document.getElementById('superficie-total-fert').textContent = '0';
    document.getElementById('quantitat-total-fert').textContent = '0';
    document.getElementById('info-fertilitzant').style.display = 'none';
    document.getElementById('totals-npk').style.display = 'none';
    
    document.getElementById('modal-fertilitzacio').style.display = 'block';
    
    setTimeout(function() {
        const primerRadio = document.querySelector('input[name="seleccio-tipus-fert"][value="finca"]');
        if (primerRadio && primerRadio.parentElement) {
            primerRadio.parentElement.style.background = '#e8f5e9';
            primerRadio.parentElement.style.borderColor = '#4CAF50';
        }
    }, 50);
}

async function guardarFertilitzacio(event) {
    event.preventDefault();
    
    const tipus = document.querySelector('input[name="seleccio-tipus-fert"]:checked').value;
    const data = document.getElementById('fertilitzacio-data').value;
    const producteId = document.getElementById('fertilitzacio-producte').value;
    const dosi = parseFloat(document.getElementById('fertilitzacio-dosi').value);
    const unitat = document.getElementById('fertilitzacio-unitat').value;
    const metode = document.getElementById('fertilitzacio-metode').value;
    const operador = document.getElementById('fertilitzacio-operador').value.trim();
    const maquinaria = document.getElementById('fertilitzacio-maquinaria').value.trim();
    const observacions = document.getElementById('fertilitzacio-observacions').value.trim();
    
    let parcellesAFertilitzar = [];
    
    if (tipus === 'finca') {
        const finca = document.getElementById('fertilitzacio-finca').value;
        parcellesAFertilitzar = parcelles.filter(function(p) { return p.finca === finca; });
    } else if (tipus === 'varietat') {
        const finca = document.getElementById('fertilitzacio-finca-varietat').value;
        const varietat = document.getElementById('fertilitzacio-varietat').value;
        parcellesAFertilitzar = parcelles.filter(function(p) { 
            return p.finca === finca && p.varietat === varietat; 
        });
    } else {
        const select = document.getElementById('fertilitzacio-parcelles');
        const opcions = select.selectedOptions;
        for (let i = 0; i < opcions.length; i++) {
            const parcellaId = opcions[i].value;
            const parcella = parcelles.find(function(p) { return p.id === parcellaId; });
            if (parcella) {
                parcellesAFertilitzar.push(parcella);
            }
        }
    }
    
    if (parcellesAFertilitzar.length === 0) {
        mostrarNotificacio('Cal seleccionar almenys una parcel·la', 'error');
        return;
    }
    
    const producte = fertilitzants.find(function(f) { return f.id === producteId; });
    const quantitatTotal = parcellesAFertilitzar.reduce(function(sum, p) {
        return sum + (parseFloat(p.superficie) || 0);
    }, 0) * dosi;
    
    const nTotal = producte ? (producte.n || 0) * quantitatTotal / 100 : 0;
    const pTotal = producte ? (producte.p || 0) * quantitatTotal / 100 : 0;
    const kTotal = producte ? (producte.k || 0) * quantitatTotal / 100 : 0;
    
    try {
        for (let i = 0; i < parcellesAFertilitzar.length; i++) {
            const parcella = parcellesAFertilitzar[i];
            const fertilitzacio = {
                data: data,
                parcella_id: parcella.id,
                producte_id: producteId,
                dosi: dosi,
                unitat: unitat,
                superficie_tractada: parcella.superficie,
                metode: metode || null,
                operador: operador || null,
                maquinaria: maquinaria || null,
                observacions: observacions || null,
                us_total: quantitatTotal,
                n_total: nTotal,
                p_total: pTotal,
                k_total: kTotal
            };
            
            await createFertilitzacio(fertilitzacio);
        }
        
        mostrarNotificacio('Fertilització creada correctament (' + parcellesAFertilitzar.length + ' parcel·les)', 'success');
        tancarModal('modal-fertilitzacio');
        await carregarTaulaFertilitzacions();
        
    } catch (error) {
        console.error('Error guardant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function veureFertilitzacioGrup(clau) {
    // La clau ara és: data-producte_id-finca
    const grupFertilitzacions = fertilitzacions.filter(function(f) {
        const parcella = parcelles.find(function(p) { return p.id === f.parcella_id; });
        const finca = parcella ? (parcella.finca || 'Sense finca') : 'Sense finca';
        return (f.data + '-' + f.producte_id + '-' + finca) === clau;
    });
    
    if (grupFertilitzacions.length === 0) return;
    
    const primer = grupFertilitzacions[0];
    const producte = fertilitzants.find(function(f) { return f.id === primer.producte_id; });
    const nomProducte = producte ? producte.nom : 'Producte desconegut';
    
    const superficieTotal = grupFertilitzacions.reduce(function(sum, f) {
        return sum + (parseFloat(f.superficie_tractada) || 0);
    }, 0);
    
    const quantitatTotal = superficieTotal * (parseFloat(primer.dosi) || 0);
    const unitatBase = (primer.unitat || 'kg/Ha').split('/')[0];
    
    let html = '<div id="modal-veure-fertilitzacio" class="modal" style="display: block;">';
    html += '<div class="modal-content" style="max-width: 700px;">';
    html += '<span class="close" onclick="tancarModal(\'modal-veure-fertilitzacio\')">&times;</span>';
    html += '<h2>📋 Detall Fertilització</h2>';
    
    html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
    html += '<div><strong>📅 Data:</strong> ' + formatData(primer.data) + '</div>';
    html += '<div><strong>🌱 Producte:</strong> ' + nomProducte + '</div>';
    html += '<div><strong>💧 Dosi:</strong> ' + (primer.dosi || 0) + ' ' + (primer.unitat || 'kg/Ha') + '</div>';
    html += '<div><strong>📏 Superfície total:</strong> ' + superficieTotal.toFixed(2) + ' Ha</div>';
    html += '<div><strong>📦 Quantitat total:</strong> ' + quantitatTotal.toFixed(2) + ' ' + unitatBase + '</div>';
    if (primer.metode) {
        html += '<div><strong>🚜 Mètode:</strong> ' + primer.metode + '</div>';
    }
    html += '</div>';
    
    if (producte && (producte.n || producte.p || producte.k)) {
        html += '<div style="margin-top: 15px; padding: 12px; background: #e8f5e9; border-radius: 6px;">';
        html += '<strong>🌿 Unitats Fertilitzant totals:</strong> ';
        html += 'N: ' + (primer.n_total || 0).toFixed(2) + ' ' + unitatBase + ' | ';
        html += 'P: ' + (primer.p_total || 0).toFixed(2) + ' ' + unitatBase + ' | ';
        html += 'K: ' + (primer.k_total || 0).toFixed(2) + ' ' + unitatBase;
        html += '</div>';
    }
    html += '</div>';
    
    html += '<h3 style="margin-top: 20px; margin-bottom: 10px;">🗺️ Parcel·les Fertilitzades (' + grupFertilitzacions.length + ')</h3>';
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Parcel·la</th><th>Finca</th><th>Cultiu</th><th>Varietat</th><th>Superfície (Ha)</th></tr></thead>';
    html += '<tbody>';
    
    grupFertilitzacions.forEach(function(f) {
        const parcella = parcelles.find(function(p) { return p.id === f.parcella_id; });
        if (parcella) {
            html += '<tr>';
            html += '<td><strong>' + (parcella.nom || '-') + '</strong></td>';
            html += '<td>' + (parcella.finca || '-') + '</td>';
            html += '<td>' + (parcella.cultiu || '-') + '</td>';
            html += '<td>' + (parcella.varietat || '-') + '</td>';
            html += '<td>' + (f.superficie_tractada || 0) + '</td>';
            html += '</tr>';
        }
    });
    
    html += '</tbody></table></div>';
    
    if (primer.operador || primer.maquinaria || primer.observacions) {
        html += '<h3 style="margin-top: 20px; margin-bottom: 10px;">📝 Informació Addicional</h3>';
        html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">';
        if (primer.operador) {
            html += '<div style="margin-bottom: 10px;"><strong>👤 Operador:</strong> ' + primer.operador + '</div>';
        }
        if (primer.maquinaria) {
            html += '<div style="margin-bottom: 10px;"><strong>🚜 Maquinària:</strong> ' + primer.maquinaria + '</div>';
        }
        if (primer.observacions) {
            html += '<div><strong>📄 Observacions:</strong> ' + primer.observacions + '</div>';
        }
        html += '</div>';
    }
    
    html += '<div class="form-actions" style="margin-top: 20px;">';
    html += '<button type="button" class="btn btn-primary" onclick="tancarModal(\'modal-veure-fertilitzacio\')">Tancar</button>';
    html += '</div></div></div>';
    
    document.body.insertAdjacentHTML('beforeend', html);
}

async function eliminarFertilitzacioGrup(clau) {
    if (!confirm('Segur que vols eliminar aquest grup de fertilitzacions?')) return;
    
    try {
        const grup = fertilitzacions.filter(function(f) {
            const parcella = parcelles.find(function(p) { return p.id === f.parcella_id; });
            const finca = parcella ? (parcella.finca || 'Sense finca') : 'Sense finca';
            return (f.data + '-' + f.producte_id + '-' + finca) === clau;
        });
        
        for (let i = 0; i < grup.length; i++) {
            await deleteFertilitzacio(grup[i].id);
        }
        
        mostrarNotificacio('Fertilitzacions eliminades correctament', 'success');
        await carregarTaulaFertilitzacions();
    } catch (error) {
        console.error('Error eliminant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// VISTA PARCELLES (mantenir codi app.v5.js)
// ============================================================

async function carregarVistaParcelles() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    
    let html = '<div class="view-parcelles">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;"><h2>🗺️ Parcel·les</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalParcella()">➕ Nova Parcel·la</button>';
    }
    html += '</div><div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Nom</th><th>SIGPAC</th><th>Finca</th><th>Cultiu</th><th>Varietat</th><th>Superfície (Ha)</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-parcelles"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
    html += crearModalParcella();
    container.innerHTML = html;
    await carregarTaulaParcelles();
}

async function carregarTaulaParcelles() {
    const tbody = document.getElementById('tbody-parcelles');
    if (!tbody) return;
    
    try {
        parcelles = await getParcellas();
        if (parcelles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha parcel·les</td></tr>';
            return;
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        
        tbody.innerHTML = parcelles.map(function(p) {
            let accions = '<button class="btn btn-sm btn-primary" onclick="veureParcella(\'' + p.id + '\')">👁️</button> ';
            if (podeEditar) {
                accions += '<button class="btn btn-sm btn-secondary" onclick="editarParcella(\'' + p.id + '\')">✏️</button> ';
            }
            if (podeEliminar) {
                accions += '<button class="btn btn-sm btn-danger" onclick="eliminarParcella(\'' + p.id + '\')">🗑️</button>';
            }
            
            return '<tr><td><strong>' + (p.nom || '-') + '</strong></td><td>' + (p.sigpac || '-') + '</td><td>' + (p.finca || '-') + '</td><td>' + (p.cultiu || '-') + '</td><td>' + (p.varietat || '-') + '</td><td>' + (p.superficie || 0) + '</td><td>' + accions + '</td></tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="7">Error carregant dades</td></tr>';
    }
}

function crearModalParcella() {
    let html = '<div id="modal-parcella" class="modal" style="display: none;"><div class="modal-content">';
    html += '<span class="close" onclick="tancarModal(\'modal-parcella\')">&times;</span>';
    html += '<h2 id="modal-parcella-titol">Nova Parcel·la</h2>';
    html += '<form id="form-parcella" onsubmit="guardarParcella(event)">';
    html += '<input type="hidden" id="parcella-id">';
    html += '<div class="form-group"><label>Nom *</label><input type="text" id="parcella-nom" required></div>';
    html += '<div class="form-group"><label>SIGPAC *</label><input type="text" id="parcella-sigpac" required placeholder="25-010-0-00000-00502-00141"></div>';
    html += '<div class="form-group"><label>Finca *</label><select id="parcella-finca" required><option value="">Seleccionar...</option></select></div>';
    html += '<div class="form-group"><label>Cultiu *</label><select id="parcella-cultiu" required onchange="actualitzarVarietats()"><option value="">Seleccionar...</option>';
    Object.keys(CULTIUS_VARIETATS).sort().forEach(function(cultiu) {
        html += '<option value="' + cultiu + '">' + cultiu + '</option>';
    });
    html += '</select></div>';
    html += '<div class="form-group" id="group-varietat" style="display: none;"><label>Varietat</label><select id="parcella-varietat"><option value="">Sense especificar</option></select></div>';
    html += '<div class="form-group"><label>Superfície (Ha) *</label><input type="number" id="parcella-superficie" required min="0" step="0.01"></div>';
    html += '<div class="form-group"><label>Regadiu</label><select id="parcella-regadiu"><option value="false">No</option><option value="true">Sí</option></select></div>';
    html += '<div class="form-group"><label>Referència Cadastral</label><input type="text" id="parcella-ref-cadastral" placeholder="25010A502001410000UL"></div>';
    html += '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-parcella\')">Cancel·lar</button>';
    html += '<button type="submit" class="btn btn-primary">Guardar</button></div></form></div></div>';
    return html;
}

function actualitzarVarietats() {
    const cultiu = document.getElementById('parcella-cultiu').value;
    const groupVarietat = document.getElementById('group-varietat');
    const selectVarietat = document.getElementById('parcella-varietat');
    
    if (!cultiu || !CULTIUS_VARIETATS[cultiu] || CULTIUS_VARIETATS[cultiu].length === 0) {
        groupVarietat.style.display = 'none';
        selectVarietat.innerHTML = '<option value="">Sense especificar</option>';
        return;
    }
    
    groupVarietat.style.display = 'block';
    selectVarietat.innerHTML = '<option value="">Sense especificar</option>';
    CULTIUS_VARIETATS[cultiu].forEach(function(varietat) {
        selectVarietat.innerHTML += '<option value="' + varietat + '">' + varietat + '</option>';
    });
}

async function obrirModalParcella() {
    document.getElementById('modal-parcella-titol').textContent = 'Nova Parcel·la';
    document.getElementById('form-parcella').reset();
    document.getElementById('parcella-id').value = '';
    document.getElementById('group-varietat').style.display = 'none';
    
    const selectFinca = document.getElementById('parcella-finca');
    selectFinca.innerHTML = '<option value="">Seleccionar...</option>';
    finques.forEach(function(finca) {
        selectFinca.innerHTML += '<option value="' + finca + '">' + finca + '</option>';
    });
    
    document.querySelectorAll('#form-parcella input, #form-parcella select, #form-parcella textarea').forEach(function(el) {
        el.disabled = false;
    });
    document.querySelector('#form-parcella button[type="submit"]').style.display = 'inline-block';
    document.getElementById('modal-parcella').style.display = 'block';
}

async function veureParcella(id) {
    const parcella = parcelles.find(function(p) { return p.id === id; });
    if (!parcella) return;
    
    document.getElementById('modal-parcella-titol').textContent = 'Veure Parcel·la';
    document.getElementById('parcella-id').value = parcella.id;
    document.getElementById('parcella-nom').value = parcella.nom || '';
    document.getElementById('parcella-sigpac').value = parcella.sigpac || '';
    document.getElementById('parcella-superficie').value = parcella.superficie || '';
    document.getElementById('parcella-regadiu').value = parcella.regadiu ? 'true' : 'false';
    document.getElementById('parcella-ref-cadastral').value = parcella.ref_cadastral || '';
    
    const selectFinca = document.getElementById('parcella-finca');
    selectFinca.innerHTML = '<option value="">Seleccionar...</option>';
    finques.forEach(function(finca) {
        const selected = finca === parcella.finca ? 'selected' : '';
        selectFinca.innerHTML += '<option value="' + finca + '" ' + selected + '>' + finca + '</option>';
    });
    
    document.getElementById('parcella-cultiu').value = parcella.cultiu || '';
    actualitzarVarietats();
    if (parcella.varietat) {
        document.getElementById('parcella-varietat').value = parcella.varietat;
    }
    
    document.querySelectorAll('#form-parcella input, #form-parcella select, #form-parcella textarea').forEach(function(el) {
        el.disabled = true;
    });
    document.querySelector('#form-parcella button[type="submit"]').style.display = 'none';
    document.getElementById('modal-parcella').style.display = 'block';
}

async function editarParcella(id) {
    const parcella = parcelles.find(function(p) { return p.id === id; });
    if (!parcella) return;
    
    document.getElementById('modal-parcella-titol').textContent = 'Editar Parcel·la';
    document.getElementById('parcella-id').value = parcella.id;
    document.getElementById('parcella-nom').value = parcella.nom || '';
    document.getElementById('parcella-sigpac').value = parcella.sigpac || '';
    document.getElementById('parcella-superficie').value = parcella.superficie || '';
    document.getElementById('parcella-regadiu').value = parcella.regadiu ? 'true' : 'false';
    document.getElementById('parcella-ref-cadastral').value = parcella.ref_cadastral || '';
    
    const selectFinca = document.getElementById('parcella-finca');
    selectFinca.innerHTML = '<option value="">Seleccionar...</option>';
    finques.forEach(function(finca) {
        const selected = finca === parcella.finca ? 'selected' : '';
        selectFinca.innerHTML += '<option value="' + finca + '" ' + selected + '>' + finca + '</option>';
    });
    
    document.getElementById('parcella-cultiu').value = parcella.cultiu || '';
    actualitzarVarietats();
    if (parcella.varietat) {
        document.getElementById('parcella-varietat').value = parcella.varietat;
    }
    
    document.querySelectorAll('#form-parcella input, #form-parcella select, #form-parcella textarea').forEach(function(el) {
        el.disabled = false;
    });
    document.querySelector('#form-parcella button[type="submit"]').style.display = 'inline-block';
    document.getElementById('modal-parcella').style.display = 'block';
}

async function guardarParcella(event) {
    event.preventDefault();
    
    const id = document.getElementById('parcella-id').value;
    const dades = {
        nom: document.getElementById('parcella-nom').value.trim(),
        sigpac: document.getElementById('parcella-sigpac').value.trim(),
        finca: document.getElementById('parcella-finca').value,
        cultiu: document.getElementById('parcella-cultiu').value,
        varietat: document.getElementById('parcella-varietat').value || null,
        superficie: parseFloat(document.getElementById('parcella-superficie').value),
        regadiu: document.getElementById('parcella-regadiu').value === 'true',
        ref_cadastral: document.getElementById('parcella-ref-cadastral').value.trim() || null
    };
    
    try {
        if (id) {
            await updateParcella(id, dades);
            mostrarNotificacio('Parcel·la actualitzada correctament', 'success');
        } else {
            await createParcella(dades);
            mostrarNotificacio('Parcel·la creada correctament', 'success');
        }
        
        tancarModal('modal-parcella');
        await carregarTaulaParcelles();
        
    } catch (error) {
        console.error('Error guardant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarParcella(id) {
    if (!confirm('Segur que vols eliminar aquesta parcel·la?')) return;
    
    try {
        await deleteParcella(id);
        mostrarNotificacio('Parcel·la eliminada correctament', 'success');
        await carregarTaulaParcelles();
    } catch (error) {
        console.error('Error eliminant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// VISTA PRODUCTES (mantenir codi app.v5.js - només funcions necessàries)
// ============================================================

async function carregarVistaProductes() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    
    let html = '<div class="view-productes"><div style="margin-bottom: 20px;"><h2>📦 Base de Dades de Productes</h2></div>';
    html += '<div class="tabs"><button class="tab-btn active" onclick="canviarTabProductes(\'fitosanitaris\')">🧪 Fitosanitaris</button>';
    html += '<button class="tab-btn" onclick="canviarTabProductes(\'fertilitzants\')">🌱 Fertilitzants</button></div>';
    html += '<div id="tab-fitosanitaris" class="tab-content active">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;"><h3>Fitosanitaris</h3>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalFitosanitari()">➕ Nou Fitosanitari</button>';
    }
    html += '</div><div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Nom</th><th>Tipus</th><th>Matèria Activa</th><th>Plaç (dies)</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-fitosanitaris"><tr><td colspan="5">Carregant...</td></tr></tbody></table></div></div>';
    html += '<div id="tab-fertilitzants" class="tab-content">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;"><h3>Fertilitzants</h3>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalFertilitzant()">➕ Nou Fertilitzant</button>';
    }
    html += '</div><div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Nom</th><th>Tipus</th><th>N%</th><th>P%</th><th>K%</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-fertilitzants"><tr><td colspan="6">Carregant...</td></tr></tbody></table></div></div></div>';
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

async function carregarTaulaFitosanitaris() {
    const tbody = document.getElementById('tbody-fitosanitaris');
    if (!tbody) return;
    
    try {
        fitosanitaris = await getFitosanitaris();
        fitosanitaris.sort(function(a, b) { return (a.nom || '').localeCompare(b.nom || ''); });
        
        if (fitosanitaris.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No hi ha fitosanitaris</td></tr>';
            return;
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        
        tbody.innerHTML = fitosanitaris.map(function(f) {
            let accions = '<button class="btn btn-sm btn-primary" onclick="veureFitosanitari(\'' + f.id + '\')">👁️</button> ';
            if (podeEditar) {
                accions += '<button class="btn btn-sm btn-secondary" onclick="editarFitosanitari(\'' + f.id + '\')">✏️</button> ';
            }
            if (podeEliminar) {
                accions += '<button class="btn btn-sm btn-danger" onclick="eliminarFitosanitari(\'' + f.id + '\')">🗑️</button>';
            }
            return '<tr><td><strong>' + f.nom + '</strong></td><td>' + (f.tipus || '-') + '</td><td>' + (f.materia_activa || '-') + '</td><td>' + (f.plac || 0) + '</td><td>' + accions + '</td></tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="5">Error carregant dades</td></tr>';
    }
}

function crearModalFitosanitari() {
    return '<div id="modal-fitosanitari" class="modal" style="display: none;"><div class="modal-content">' +
        '<span class="close" onclick="tancarModal(\'modal-fitosanitari\')">&times;</span>' +
        '<h2 id="modal-fitosanitari-titol">Nou Fitosanitari</h2><form id="form-fitosanitari" onsubmit="guardarFitosanitari(event)">' +
        '<input type="hidden" id="fitosanitari-id">' +
        '<div class="form-group"><label>Nom *</label><input type="text" id="fitosanitari-nom" required></div>' +
        '<div class="form-group"><label>Tipus *</label><select id="fitosanitari-tipus" required>' +
        '<option value="">Seleccionar...</option><option value="Fungicida">Fungicida</option><option value="Insecticida">Insecticida</option>' +
        '<option value="Herbicida">Herbicida</option><option value="Acaricida">Acaricida</option><option value="Altres">Altres</option></select></div>' +
        '<div class="form-group"><label>Matèria Activa</label><input type="text" id="fitosanitari-materia"></div>' +
        '<div class="form-group"><label>Registre MAPA</label><input type="text" id="fitosanitari-registre"></div>' +
        '<div class="form-group"><label>Plaç Seguretat (dies)</label><input type="number" id="fitosanitari-plac" min="0"></div>' +
        '<div class="form-group"><label>Observacions</label><textarea id="fitosanitari-observacions" rows="3"></textarea></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-fitosanitari\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary">Guardar</button></div></form></div></div>';
}

function obrirModalFitosanitari() {
    document.getElementById('modal-fitosanitari-titol').textContent = 'Nou Fitosanitari';
    document.getElementById('form-fitosanitari').reset();
    document.getElementById('fitosanitari-id').value = '';
    document.querySelectorAll('#form-fitosanitari input, #form-fitosanitari select, #form-fitosanitari textarea').forEach(function(el) {
        el.disabled = false;
    });
    document.querySelector('#form-fitosanitari button[type="submit"]').style.display = 'inline-block';
    document.getElementById('modal-fitosanitari').style.display = 'block';
}

async function veureFitosanitari(id) {
    const producte = fitosanitaris.find(function(f) { return f.id === id; });
    if (!producte) return;
    
    document.getElementById('modal-fitosanitari-titol').textContent = 'Veure Fitosanitari';
    document.getElementById('fitosanitari-id').value = producte.id;
    document.getElementById('fitosanitari-nom').value = producte.nom || '';
    document.getElementById('fitosanitari-tipus').value = producte.tipus || '';
    document.getElementById('fitosanitari-materia').value = producte.materia_activa || '';
    document.getElementById('fitosanitari-registre').value = producte.registre || '';
    document.getElementById('fitosanitari-plac').value = producte.plac || '';
    document.getElementById('fitosanitari-observacions').value = producte.observacions || '';
    
    document.querySelectorAll('#form-fitosanitari input, #form-fitosanitari select, #form-fitosanitari textarea').forEach(function(el) {
        el.disabled = true;
    });
    document.querySelector('#form-fitosanitari button[type="submit"]').style.display = 'none';
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
    
    document.querySelectorAll('#form-fitosanitari input, #form-fitosanitari select, #form-fitosanitari textarea').forEach(function(el) {
        el.disabled = false;
    });
    document.querySelector('#form-fitosanitari button[type="submit"]').style.display = 'inline-block';
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

async function carregarTaulaFertilitzants() {
    const tbody = document.getElementById('tbody-fertilitzants');
    if (!tbody) return;
    
    try {
        fertilitzants = await getFertilitzants();
        fertilitzants.sort(function(a, b) { return (a.nom || '').localeCompare(b.nom || ''); });
        
        if (fertilitzants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">No hi ha fertilitzants</td></tr>';
            return;
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        
        tbody.innerHTML = fertilitzants.map(function(f) {
            let accions = '<button class="btn btn-sm btn-primary" onclick="veureFertilitzant(\'' + f.id + '\')">👁️</button> ';
            if (podeEditar) {
                accions += '<button class="btn btn-sm btn-secondary" onclick="editarFertilitzant(\'' + f.id + '\')">✏️</button> ';
            }
            if (podeEliminar) {
                accions += '<button class="btn btn-sm btn-danger" onclick="eliminarFertilitzant(\'' + f.id + '\')">🗑️</button>';
            }
            return '<tr><td><strong>' + f.nom + '</strong></td><td>' + (f.tipus || '-') + '</td><td>' + (f.n || 0) + '%</td><td>' + (f.p || 0) + '%</td><td>' + (f.k || 0) + '%</td><td>' + accions + '</td></tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6">Error carregant dades</td></tr>';
    }
}

function crearModalFertilitzant() {
    return '<div id="modal-fertilitzant" class="modal" style="display: none;"><div class="modal-content">' +
        '<span class="close" onclick="tancarModal(\'modal-fertilitzant\')">&times;</span>' +
        '<h2 id="modal-fertilitzant-titol">Nou Fertilitzant</h2><form id="form-fertilitzant" onsubmit="guardarFertilitzant(event)">' +
        '<input type="hidden" id="fertilitzant-id">' +
        '<div class="form-group"><label>Nom *</label><input type="text" id="fertilitzant-nom" required></div>' +
        '<div class="form-group"><label>Tipus *</label><select id="fertilitzant-tipus" required>' +
        '<option value="">Seleccionar...</option><option value="Mineral">Mineral</option><option value="Orgànic">Orgànic</option>' +
        '<option value="Organomineral">Organomineral</option><option value="Altres">Altres</option></select></div>' +
        '<div class="form-group"><label>% Nitrogen (N)</label><input type="number" id="fertilitzant-n" min="0" max="100" step="0.1"></div>' +
        '<div class="form-group"><label>% Fòsfor (P)</label><input type="number" id="fertilitzant-p" min="0" max="100" step="0.1"></div>' +
        '<div class="form-group"><label>% Potassi (K)</label><input type="number" id="fertilitzant-k" min="0" max="100" step="0.1"></div>' +
        '<div class="form-group"><label>Observacions</label><textarea id="fertilitzant-observacions" rows="3"></textarea></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-fertilitzant\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary">Guardar</button></div></form></div></div>';
}

function obrirModalFertilitzant() {
    document.getElementById('modal-fertilitzant-titol').textContent = 'Nou Fertilitzant';
    document.getElementById('form-fertilitzant').reset();
    document.getElementById('fertilitzant-id').value = '';
    document.querySelectorAll('#form-fertilitzant input, #form-fertilitzant select, #form-fertilitzant textarea').forEach(function(el) {
        el.disabled = false;
    });
    document.querySelector('#form-fertilitzant button[type="submit"]').style.display = 'inline-block';
    document.getElementById('modal-fertilitzant').style.display = 'block';
}

async function veureFertilitzant(id) {
    const producte = fertilitzants.find(function(f) { return f.id === id; });
    if (!producte) return;
    
    document.getElementById('modal-fertilitzant-titol').textContent = 'Veure Fertilitzant';
    document.getElementById('fertilitzant-id').value = producte.id;
    document.getElementById('fertilitzant-nom').value = producte.nom || '';
    document.getElementById('fertilitzant-tipus').value = producte.tipus || '';
    document.getElementById('fertilitzant-n').value = producte.n || '';
    document.getElementById('fertilitzant-p').value = producte.p || '';
    document.getElementById('fertilitzant-k').value = producte.k || '';
    document.getElementById('fertilitzant-observacions').value = producte.observacions || '';
    
    document.querySelectorAll('#form-fertilitzant input, #form-fertilitzant select, #form-fertilitzant textarea').forEach(function(el) {
        el.disabled = true;
    });
    document.querySelector('#form-fertilitzant button[type="submit"]').style.display = 'none';
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
    
    document.querySelectorAll('#form-fertilitzant input, #form-fertilitzant select, #form-fertilitzant textarea').forEach(function(el) {
        el.disabled = false;
    });
    document.querySelector('#form-fertilitzant button[type="submit"]').style.display = 'inline-block';
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

// ============================================================
// VISTA TREBALLADORS
// ============================================================

async function carregarVistaTreballadors() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    
    let html = '<div class="view-treballadors">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">';
    html += '<h2>👥 Treballadors</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalTreballador()">➕ Nou Treballador</button>';
    }
    html += '</div>';
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Nom</th><th>Tipus</th><th>Codi</th><th>Categoria</th><th>Preu/Hora (€)</th><th>Estat</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-treballadors"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
    
    html += crearModalTreballador();
    
    container.innerHTML = html;
    await carregarTaulaTreballadors();
}

async function carregarTaulaTreballadors() {
    const tbody = document.getElementById('tbody-treballadors');
    if (!tbody) return;
    
    try {
        treballadors = await getTreballadors();
        
        if (treballadors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha treballadors</td></tr>';
            return;
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        const role = currentUserProfile ? currentUserProfile.role : '';
        const mostrarPreu = role === 'admin' || role === 'editor';
        
        tbody.innerHTML = treballadors.map(function(t) {
            const estat = t.actiu ? '<span style="color: green;">✓ Actiu</span>' : '<span style="color: gray;">✗ Inactiu</span>';
            let accions = '<button class="btn btn-sm btn-primary" onclick="veureTreballador(\'' + t.id + '\')">👁️</button> ';
            if (podeEditar) {
                accions += '<button class="btn btn-sm btn-secondary" onclick="editarTreballador(\'' + t.id + '\')">✏️</button> ';
            }
            if (podeEliminar) {
                accions += '<button class="btn btn-sm btn-danger" onclick="eliminarTreballador(\'' + t.id + '\')">🗑️</button>';
            }
            
            const preu = mostrarPreu ? ((t.preu_hora || 0).toFixed(2) + ' €') : '-';
            
            return '<tr><td><strong>' + (t.nom || '-') + '</strong></td><td>' + (t.tipus || 'Propi') + '</td><td>' + (t.codi_usuari || '-') + '</td><td>' + (t.categoria || '-') + '</td><td>' + preu + '</td><td>' + estat + '</td><td>' + accions + '</td></tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6">Error carregant dades</td></tr>';
    }
}

function crearModalTreballador() {
    return '<div id="modal-treballador" class="modal" style="display: none;"><div class="modal-content">' +
        '<span class="close" onclick="tancarModal(\'modal-treballador\')">&times;</span>' +
        '<h2 id="modal-treballador-titol">Nou Treballador</h2>' +
        '<form id="form-treballador" onsubmit="guardarTreballador(event)">' +
        '<input type="hidden" id="treballador-id">' +
        '<div class="form-group"><label>Nom *</label><input type="text" id="treballador-nom" required></div>' +
        '<div class="form-group"><label>Tipus *</label><select id="treballador-tipus" required>' +
        '<option value="">Seleccionar...</option><option value="Propi">Propi</option><option value="Alié">Alié (ETT/Autònom)</option>' +
        '<option value="Temporal">Temporal (Grup)</option></select></div>' +
        '<div class="form-group"><label>Codi Usuari</label><input type="text" id="treballador-codi" placeholder="treb01, TISA01..."></div>' +
        '<div class="form-group"><label>Categoria</label><select id="treballador-categoria">' +
        '<option value="">Seleccionar...</option><option value="Encarregat">Encarregat</option><option value="Oficial">Oficial</option>' +
        '<option value="Peó">Peó</option></select></div>' +
        '<div class="form-group"><label>Preu/Hora (€)</label><input type="number" id="treballador-preu" min="0" step="0.01"></div>' +
        '<div class="form-group"><label><input type="checkbox" id="treballador-actiu" checked> Actiu</label></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-treballador\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary">Guardar</button></div></form></div></div>';
}

function obrirModalTreballador() {
    document.getElementById('modal-treballador-titol').textContent = 'Nou Treballador';
    document.getElementById('form-treballador').reset();
    document.getElementById('treballador-id').value = '';
    document.getElementById('treballador-actiu').checked = true;
    document.querySelectorAll('#form-treballador input, #form-treballador select').forEach(function(el) {
        el.disabled = false;
    });
    document.querySelector('#form-treballador button[type="submit"]').style.display = 'inline-block';
    document.getElementById('modal-treballador').style.display = 'block';
}

async function veureTreballador(id) {
    const treballador = treballadors.find(function(t) { return t.id === id; });
    if (!treballador) return;
    
    document.getElementById('modal-treballador-titol').textContent = 'Veure Treballador';
    document.getElementById('treballador-id').value = treballador.id;
    document.getElementById('treballador-nom').value = treballador.nom || '';
    document.getElementById('treballador-tipus').value = treballador.tipus || 'Propi';
    document.getElementById('treballador-codi').value = treballador.codi_usuari || '';
    document.getElementById('treballador-categoria').value = treballador.categoria || '';
    document.getElementById('treballador-preu').value = treballador.preu_hora || '';
    document.getElementById('treballador-actiu').checked = treballador.actiu !== false;
    
    document.querySelectorAll('#form-treballador input, #form-treballador select').forEach(function(el) {
        el.disabled = true;
    });
    document.querySelector('#form-treballador button[type="submit"]').style.display = 'none';
    document.getElementById('modal-treballador').style.display = 'block';
}

async function editarTreballador(id) {
    const treballador = treballadors.find(function(t) { return t.id === id; });
    if (!treballador) return;
    
    document.getElementById('modal-treballador-titol').textContent = 'Editar Treballador';
    document.getElementById('treballador-id').value = treballador.id;
    document.getElementById('treballador-nom').value = treballador.nom || '';
    document.getElementById('treballador-tipus').value = treballador.tipus || 'Propi';
    document.getElementById('treballador-codi').value = treballador.codi_usuari || '';
    document.getElementById('treballador-categoria').value = treballador.categoria || '';
    document.getElementById('treballador-preu').value = treballador.preu_hora || '';
    document.getElementById('treballador-actiu').checked = treballador.actiu !== false;
    
    document.querySelectorAll('#form-treballador input, #form-treballador select').forEach(function(el) {
        el.disabled = false;
    });
    document.querySelector('#form-treballador button[type="submit"]').style.display = 'inline-block';
    document.getElementById('modal-treballador').style.display = 'block';
}

async function guardarTreballador(event) {
    event.preventDefault();
    
    const id = document.getElementById('treballador-id').value;
    const dades = {
        nom: document.getElementById('treballador-nom').value.trim(),
        tipus: document.getElementById('treballador-tipus').value,
        codi_usuari: document.getElementById('treballador-codi').value.trim() || null,
        categoria: document.getElementById('treballador-categoria').value || null,
        preu_hora: parseFloat(document.getElementById('treballador-preu').value) || 0,
        actiu: document.getElementById('treballador-actiu').checked
    };
    
    try {
        if (id) {
            await updateTreballador(id, dades);
            mostrarNotificacio('Treballador actualitzat correctament', 'success');
        } else {
            await createTreballador(dades);
            mostrarNotificacio('Treballador creat correctament', 'success');
        }
        
        tancarModal('modal-treballador');
        await carregarTaulaTreballadors();
        
    } catch (error) {
        console.error('Error guardant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarTreballador(id) {
    if (!confirm('Segur que vols eliminar aquest treballador?')) return;
    
    try {
        await deleteTreballador(id);
        mostrarNotificacio('Treballador eliminat correctament', 'success');
        await carregarTaulaTreballadors();
    } catch (error) {
        console.error('Error eliminant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// VISTA CONTROL HORARI
// ============================================================

async function carregarVistaControlHorari() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    
    let html = '<div class="view-control-horari">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">';
    html += '<h2>⏱️ Control Horari</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalControlHorari()">➕ Nou Registre</button>';
    }
    html += '</div>';
    
    html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
    html += '<h3 style="margin-top: 0;">🔍 Filtres</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 15px;">';
    html += '<div><label>Data Inici:</label><input type="date" id="filtro-data-inici" onchange="aplicarFiltresHorari()"></div>';
    html += '<div><label>Data Fi:</label><input type="date" id="filtro-data-fi" onchange="aplicarFiltresHorari()"></div>';
    html += '<div><label>Treballador:</label><select id="filtro-treballador" onchange="aplicarFiltresHorari()"><option value="">Tots</option></select></div>';
    html += '<div style="align-self: end;"><button class="btn btn-secondary" onclick="netejarFiltresHorari()">🗑️ Netejar</button></div>';
    html += '</div></div>';
    
    html += '<div id="resum-horari" style="margin-bottom: 20px;"></div>';
    
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Data</th><th>Treballador</th><th>Entrada</th><th>Sortida</th><th>Hores</th><th>Tasca</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-control-horari"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
    
    html += crearModalControlHorari();
    
    container.innerHTML = html;
    
    await carregarSelectTreballadorsFiltre();
    await carregarTaulaControlHorari();
}

async function carregarSelectTreballadorsFiltre() {
    const select = document.getElementById('filtro-treballador');
    if (!select) return;
    
    treballadors = await getTreballadors();
    select.innerHTML = '<option value="">Tots</option>';
    treballadors.filter(function(t) { return t.actiu; }).forEach(function(t) {
        select.innerHTML += '<option value="' + t.id + '">' + t.nom + '</option>';
    });
}

async function carregarTaulaControlHorari() {
    const tbody = document.getElementById('tbody-control-horari');
    if (!tbody) return;
    
    try {
        const filtres = {
            dataInici: document.getElementById('filtro-data-inici')?.value || null,
            dataFi: document.getElementById('filtro-data-fi')?.value || null,
            treballadorId: document.getElementById('filtro-treballador')?.value || null
        };
        
        controlHorari = await getControlHorari(filtres);
        
        if (controlHorari.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha registres</td></tr>';
            document.getElementById('resum-horari').innerHTML = '';
            return;
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        
        tbody.innerHTML = controlHorari.map(function(r) {
            const treballador = treballadors.find(function(t) { return t.id === r.treballador_id; });
            const nomTreballador = treballador ? treballador.nom : 'Desconegut';
            const tasca = tasques.find(function(t) { return t.id === r.tasca_id; });
            const nomTasca = tasca ? tasca.nom : (r.tasca_libre || '-');
            
            const horaEntrada = r.hora_entrada || '-';
            const horaSortida = r.hora_sortida || '<span style="color: red;">Pendent</span>';
            const hores = r.hores_treballades ? r.hores_treballades.toFixed(2) + 'h' : '-';
            
            let accions = '<button class="btn btn-sm btn-primary" onclick="veureControlHorari(\'' + r.id + '\')">👁️</button> ';
            if (podeEditar) {
                accions += '<button class="btn btn-sm btn-secondary" onclick="editarControlHorari(\'' + r.id + '\')">✏️</button> ';
            }
            if (podeEliminar) {
                accions += '<button class="btn btn-sm btn-danger" onclick="eliminarControlHorari(\'' + r.id + '\')">🗑️</button>';
            }
            
            return '<tr><td><strong>' + formatData(r.data) + '</strong></td><td>' + nomTreballador + '</td><td>' + horaEntrada + '</td><td>' + horaSortida + '</td><td>' + hores + '</td><td>' + nomTasca + '</td><td>' + accions + '</td></tr>';
        }).join('');
        
        mostrarResumHorari();
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="7">Error carregant dades</td></tr>';
    }
}

function mostrarResumHorari() {
    const resum = document.getElementById('resum-horari');
    if (!resum) return;
    
    const totalHores = controlHorari.reduce(function(sum, r) {
        return sum + (parseFloat(r.hores_treballades) || 0);
    }, 0);
    
    const totalCost = controlHorari.reduce(function(sum, r) {
        return sum + (parseFloat(r.cost_total) || 0);
    }, 0);
    
    const role = currentUserProfile ? currentUserProfile.role : '';
    const mostrarCost = role === 'admin' || role === 'editor';
    
    let html = '<div class="stats-grid">';
    html += '<div class="stat-card"><div class="stat-icon">📊</div><div class="stat-info"><div class="stat-value">' + controlHorari.length + '</div><div class="stat-label">Registres</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon">⏱️</div><div class="stat-info"><div class="stat-value">' + totalHores.toFixed(2) + 'h</div><div class="stat-label">Hores Totals</div></div></div>';
    if (mostrarCost) {
        html += '<div class="stat-card"><div class="stat-icon">💰</div><div class="stat-info"><div class="stat-value">' + totalCost.toFixed(2) + ' €</div><div class="stat-label">Cost Total</div></div></div>';
    }
    html += '</div>';
    
    resum.innerHTML = html;
}

function aplicarFiltresHorari() {
    carregarTaulaControlHorari();
}

function netejarFiltresHorari() {
    document.getElementById('filtro-data-inici').value = '';
    document.getElementById('filtro-data-fi').value = '';
    document.getElementById('filtro-treballador').value = '';
    carregarTaulaControlHorari();
}

function crearModalControlHorari() {
    return '<div id="modal-control-horari" class="modal" style="display: none;"><div class="modal-content" style="max-width: 700px;">' +
        '<span class="close" onclick="tancarModal(\'modal-control-horari\')">&times;</span>' +
        '<h2 id="modal-control-horari-titol">Fitxar</h2>' +
        '<form id="form-control-horari" onsubmit="guardarControlHorari(event)">' +
        '<input type="hidden" id="control-horari-id">' +
        '<div class="form-group"><label>Treballador *</label><select id="control-horari-treballador" required onchange="comprovarEntradaOberta()"><option value="">Seleccionar...</option></select></div>' +
        '<div id="info-fitxatge" style="display:none; background: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 15px;"></div>' +
        '<div class="form-group"><label>Data *</label><input type="date" id="control-horari-data" required readonly></div>' +
        '<div class="form-group" id="group-hora-entrada" style="display:none;"><label>Hora Entrada</label><input type="time" id="control-horari-hora-entrada" readonly></div>' +
        '<div class="form-group" id="group-hora-sortida" style="display:none;"><label>Hora Sortida</label><input type="time" id="control-horari-hora-sortida" readonly></div>' +
        '<div class="form-group"><label>Tasca *</label><select id="control-horari-tasca" onchange="mostrarTascaLliure()"><option value="">Seleccionar...</option></select></div>' +
        '<div class="form-group" id="group-tasca-libre" style="display:none;"><label>Descripció tasca</label><input type="text" id="control-horari-tasca-libre" placeholder="Descriu la tasca..."></div>' +
        '<div class="form-group"><label>Finca (opcional)</label><select id="control-horari-finca"><option value="">Sense finca</option></select></div>' +
        '<div class="form-group" id="group-motiu-sortida" style="display:none;"><label>Motiu sortida anticipada</label><select id="control-horari-motiu"><option value="">Sense motiu especial</option></select></div>' +
        '<div class="form-group" id="group-num-persones" style="display:none;"><label>Nº Persones (grups)</label><input type="number" id="control-horari-num-persones" min="1" value="1"></div>' +
        '<div class="form-group"><label>Observacions</label><textarea id="control-horari-observacions" rows="2"></textarea></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-control-horari\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary" id="btn-fitxar">Fitxar</button></div></form></div></div>';
}

async function obrirModalControlHorari() {
    document.getElementById('modal-control-horari-titol').textContent = 'Fitxar';
    document.getElementById('form-control-horari').reset();
    document.getElementById('control-horari-id').value = '';
    
    const avui = new Date().toISOString().split('T')[0];
    document.getElementById('control-horari-data').value = avui;
    
    const selectTreballador = document.getElementById('control-horari-treballador');
    const selectFinca = document.getElementById('control-horari-finca');
    const selectTasca = document.getElementById('control-horari-tasca');
    const selectMotiu = document.getElementById('control-horari-motiu');
    
    // Carregar treballadors
    selectTreballador.innerHTML = '<option value="">Seleccionar...</option>';
    treballadors.filter(function(t) { return t.actiu; }).forEach(function(t) {
        selectTreballador.innerHTML += '<option value="' + t.id + '">' + t.nom + '</option>';
    });
    
    // Carregar finques
    selectFinca.innerHTML = '<option value="">Sense finca</option>';
    finques.forEach(function(f) {
        selectFinca.innerHTML += '<option value="' + f + '">' + f + '</option>';
    });
    
    // Carregar tasques
    tasques = await getTasques();
    selectTasca.innerHTML = '<option value="">Seleccionar...</option>';
    tasques.forEach(function(t) {
        selectTasca.innerHTML += '<option value="' + t.id + '">' + t.nom + '</option>';
    });
    
    // Carregar motius absència
    motiusAbsencia = await getMotiusAbsencia();
    selectMotiu.innerHTML = '<option value="">Sense motiu especial</option>';
    motiusAbsencia.forEach(function(m) {
        selectMotiu.innerHTML += '<option value="' + m.id + '">' + m.nom + '</option>';
    });
    
    document.getElementById('modal-control-horari').style.display = 'block';
}

async function comprovarEntradaOberta() {
    const treballadorId = document.getElementById('control-horari-treballador').value;
    const data = document.getElementById('control-horari-data').value;
    
    if (!treballadorId) return;
    
    // Buscar registre obert del mateix dia
    const registreObert = controlHorari.find(function(r) {
        return r.treballador_id === treballadorId && 
               r.data === data && 
               r.hora_entrada && 
               !r.hora_sortida;
    });
    
    const infoDiv = document.getElementById('info-fitxatge');
    const groupEntrada = document.getElementById('group-hora-entrada');
    const groupSortida = document.getElementById('group-hora-sortida');
    const groupMotiu = document.getElementById('group-motiu-sortida');
    const groupTasca = document.querySelector('#control-horari-tasca').closest('.form-group');
    const groupTascaLliure = document.getElementById('group-tasca-libre');
    const groupFinca = document.querySelector('#control-horari-finca').closest('.form-group');
    const btnFitxar = document.getElementById('btn-fitxar');
    
    if (registreObert) {
        // Té entrada oberta → Fitxar sortida
        infoDiv.style.display = 'block';
        infoDiv.innerHTML = '<strong>⚠️ Tens una entrada oberta:</strong> ' + registreObert.hora_entrada;
        groupEntrada.style.display = 'block';
        groupSortida.style.display = 'block';
        groupMotiu.style.display = 'block';
        groupTasca.style.display = 'none';  // Ocultar tasca
        groupTascaLliure.style.display = 'none';
        groupFinca.style.display = 'none';  // Ocultar finca
        document.getElementById('control-horari-hora-entrada').value = registreObert.hora_entrada;
        document.getElementById('control-horari-hora-sortida').value = new Date().toTimeString().slice(0,5);
        document.getElementById('control-horari-id').value = registreObert.id;
        btnFitxar.textContent = '🔴 Fitxar Sortida';
    } else {
        // No té entrada → Fitxar entrada
        infoDiv.style.display = 'none';
        groupEntrada.style.display = 'block';
        groupSortida.style.display = 'none';
        groupMotiu.style.display = 'none';
        groupTasca.style.display = 'block';  // Mostrar tasca
        groupFinca.style.display = 'block';  // Mostrar finca
        document.getElementById('control-horari-hora-entrada').value = new Date().toTimeString().slice(0,5);
        btnFitxar.textContent = '🟢 Fitxar Entrada';
    }
    
    // Mostrar num_persones si és grup temporal
    const treballador = treballadors.find(function(t) { return t.id === treballadorId; });
    if (treballador && treballador.tipus === 'Temporal') {
        document.getElementById('group-num-persones').style.display = 'block';
    } else {
        document.getElementById('group-num-persones').style.display = 'none';
    }
}

function mostrarTascaLliure() {
    const tascaId = document.getElementById('control-horari-tasca').value;
    const tasca = tasques.find(function(t) { return t.id === tascaId; });
    
    if (tasca && tasca.nom === 'Altres') {
        document.getElementById('group-tasca-libre').style.display = 'block';
    } else {
        document.getElementById('group-tasca-libre').style.display = 'none';
    }
}

async function veureControlHorari(id) {
    alert('Funció veure detall registre en desenvolupament');
}

async function editarControlHorari(id) {
    alert('Funció editar registre en desenvolupament');
}

async function guardarControlHorari(event) {
    event.preventDefault();
    
    const id = document.getElementById('control-horari-id').value;
    const treballadorId = document.getElementById('control-horari-treballador').value;
    const horaEntrada = document.getElementById('control-horari-hora-entrada').value;
    const horaSortida = document.getElementById('control-horari-hora-sortida').value || null;
    const motiuId = document.getElementById('control-horari-motiu').value || null;
    const numPersones = parseInt(document.getElementById('control-horari-num-persones').value) || 1;
    
    // Si és entrada nova, validar tasca
    if (!id) {
        const tascaId = document.getElementById('control-horari-tasca').value;
        if (!tascaId) {
            mostrarNotificacio('Cal seleccionar una tasca', 'error');
            return;
        }
    }
    
    // Calcular cost si hi ha sortida
    let cost = null;
    if (horaSortida) {
        const treballador = treballadors.find(function(t) { return t.id === treballadorId; });
        if (treballador && treballador.preu_hora) {
            const entrada = new Date('2000-01-01 ' + horaEntrada);
            const sortida = new Date('2000-01-01 ' + horaSortida);
            const hores = (sortida - entrada) / 3600000;
            cost = hores * treballador.preu_hora * numPersones;
        }
    }
    
    const dades = {
        data: document.getElementById('control-horari-data').value,
        treballador_id: treballadorId,
        hora_sortida: horaSortida,
        motiu_sortida_id: motiuId,
        observacions: document.getElementById('control-horari-observacions').value.trim() || null,
        cost_total: cost
    };
    
    // Si és entrada nova (INSERT), afegir també entrada, tasca i finca
    if (!id) {
        const tascaId = document.getElementById('control-horari-tasca').value;
        const tascaLliure = document.getElementById('control-horari-tasca-libre').value.trim() || null;
        
        dades.hora_entrada = horaEntrada;
        dades.tasca_id = tascaId;
        dades.tasca_libre = tascaLliure;
        dades.finca = document.getElementById('control-horari-finca').value || null;
        dades.num_persones = numPersones;
    }
    
    try {
        if (id) {
            await updateControlHorari(id, dades);
            mostrarNotificacio('Sortida fitxada correctament', 'success');
        } else {
            await createControlHorari(dades);
            mostrarNotificacio('Entrada fitxada correctament', 'success');
        }
        
        tancarModal('modal-control-horari');
        await carregarTaulaControlHorari();
        
    } catch (error) {
        console.error('Error guardant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarControlHorari(id) {
    if (!confirm('Segur que vols eliminar aquest registre?')) return;
    
    try {
        await deleteControlHorari(id);
        mostrarNotificacio('Registre eliminat correctament', 'success');
        await carregarTaulaControlHorari();
    } catch (error) {
        console.error('Error eliminant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// Listeners
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (currentUser) {
            activarListeners();
        }
    }, 2000);
});

function activarListeners() {
    subscribeToChanges('parcelles', function(payload) {
        if (vistaActual === 'parcelles') {
            carregarTaulaParcelles();
        } else if (vistaActual === 'dashboard') {
            carregarDashboard();
        }
        showSyncIndicator('📡 Parcel·les actualitzades', 'success');
    });
    
    subscribeToChanges('tractaments', function(payload) {
        if (vistaActual === 'tractaments') {
            carregarTaulaTractaments();
        }
        showSyncIndicator('📡 Tractaments actualitzats', 'success');
    });
    
    subscribeToChanges('fertilitzacions', function(payload) {
        if (vistaActual === 'fertilitzacions') {
            carregarTaulaFertilitzacions();
        }
        showSyncIndicator('📡 Fertilitzacions actualitzades', 'success');
    });
    
    subscribeToChanges('fitosanitaris', function(payload) {
        if (vistaActual === 'productes') carregarTaulaFitosanitaris();
        showSyncIndicator('📡 Fitosanitaris actualitzats', 'success');
    });
    
    subscribeToChanges('fertilitzants', function(payload) {
        if (vistaActual === 'productes') carregarTaulaFertilitzants();
        showSyncIndicator('📡 Fertilitzants actualitzats', 'success');
    });
    
    subscribeToChanges('treballadors', function(payload) {
        if (vistaActual === 'treballadors') carregarTaulaTreballadors();
        showSyncIndicator('📡 Treballadors actualitzats', 'success');
    });
    
    subscribeToChanges('control_horari', function(payload) {
        if (vistaActual === 'control-horari') carregarTaulaControlHorari();
        showSyncIndicator('📡 Control horari actualitzat', 'success');
    });
    
    console.log('✅ Listeners activats');
}

window.addEventListener('online', function() {
    showSyncIndicator('🌐 Connexió restablerta', 'success');
});

window.addEventListener('offline', function() {
    showSyncIndicator('📵 Mode offline', 'warning');
});

console.log('✅ App.js v8 carregat');
console.log('✅✅✅ Aplicació completament carregada! ✅✅✅');
