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
let absencies = [];
let finques = [];
let alertes = [];
let cultiusTractables = [];
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

function toggleSubmenu(id) {
    const submenu = document.getElementById('submenu-' + id);
    if (!submenu) return;

    const visible = submenu.style.display === 'block';
    
    // Si és un sub-submenu, no tanquem TOT, només els germans
    const esSubSubmenu = submenu.parentElement.closest('.submenu') !== null;
    
    if (esSubSubmenu) {
        // Tanquem només sub-submenus germans
        const pare = submenu.parentElement.parentElement;
        pare.querySelectorAll('.submenu').forEach(s => {
            if (s !== submenu) s.style.display = 'none';
        });
    } else {
        // És nivell 1, tanquem tot
        tancarSubmenus();
    }
    
    submenu.style.display = visible ? 'none' : 'block';
}


function tancarSubmenus() {
    document.querySelectorAll('.submenu').forEach(function(s) {
        s.style.display = 'none';
    });
}

// Tancar submenús en clicar fora
document.addEventListener('click', function(e) {
    if (!e.target.closest('.nav-group')) {
        tancarSubmenus();
    }
});

// Funcions utilitat
function generateId() {
    return crypto.randomUUID();
}

// Hores totals d'un registre de control horari.
// Per treballadors individuals num_persones és 1, així que no canvia res.
// Per grups (ex: TISA GRUP X) multiplica les hores de la jornada pel nombre
// de persones del grup, perquè reflecteixi les hores totals fetes pel grup
// (coherent amb el càlcul del cost: hores x preu_hora x num_persones).
function horesTotalsRegistre(r) {
    const hores = parseFloat(r && r.hores_treballades) || 0;
    const persones = parseInt(r && r.num_persones) || 1;
    return hores * persones;
}

function formatData(data) {
    if (!data) return '';
    const d = new Date(data);
    return d.toLocaleDateString('ca-ES');
}

function obtenirCampanya(data) {
    // Data format: "YYYY-MM-DD"
    const [any, mes, dia] = data.split('-');
    const anyActual = parseInt(any);
    
    // Si la data es 2026 o posterior → campanya 2026
    // Si la data es 2025 o anterior → campanya 2025
    return anyActual >= 2026 ? '2026' : '2025';
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
    if (role === 'soci' && action === 'select') return true;
    
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
		case 'parcelles-import-dun':
			carregarVistaImportDUN();
			break;
        case 'tractaments':
            carregarVistaTractaments();
            break;
		case 'recomanacionsT':
			carregarVistaRecomanacions();
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
		case 'informes':
			carregarVistaInformes();
			break;	
		case 'reg':
			carregarVistaReg();
			break;
		case 'gasoil':
			carregarVistaGasoil();
			break;	
		case 'compres':
			carregarVistaCompres();
			break;	
		case 'existencies':
			carregarVistaExistencies();
			break;	
		case 'collita':
			carregarVistaCollita();
			break;
		case 'collita-registres':
			canviarVistaCollita('registres');
			carregarVistaCollita();
			break;
		case 'assegurances':
            carregarVistaAssegurances();
            break;
		case 'agroseguro':
			carregarVistaAssegurances();  // Existeix
			break;
		case 'altres-assegurances':
			carregarVistaAltresAssegurances();  // Nova funció
			break;
		case 'immobilitzat':
			mostrarVistaImmobilitzat();  // Existent (de altres-assegurances-ui_v1.js)
			break;
		case 'contactes':
			carregarVistaContactes();
			break;
		case 'fertilitzants':
			carregarVistaFertilitzants();
			break;
		case 'fertilitzants-tecnics':
			carregarVistaFertilitzantsTecnics();
			break;
		case 'control-horari': {
    const role = currentUserProfile ? currentUserProfile.role : 'visor';
    const treballadorActiu = treballadors.find(function(t) {
        return t.auth_user_id === currentUser.id;
    });
    if (role === 'visor') {
        carregarVistaControlHorariTreballador(treballadorActiu);
    } else {
        carregarVistaControlHorari();
    }
    break;
}
case 'incidencies':
    carregarVistaIncidencies();
    break;
case 'absencies':
    carregarVistaAbsencies();
    break;
case 'alertes':
    carregarVistaAlertes();
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
        // Carregar cultius tractables si no s'han carregat encara
        if (cultiusTractables.length === 0) {
            cultiusTractables = await getCultiusTractables();
            console.log('✅ Cultius tractables carregats:', cultiusTractables);
        }
    } catch (error) {
        console.error('Error carregant dades:', error);
        mostrarNotificacio('Error carregant dades', 'error');
        return;
    }
    
     let parcellesFiltrades = parcelles.filter(function(p) {
    return p.campanya === 2026;  // ← FILTRO CAMPANYA
});

	if (fincaSeleccionada) {
		parcellesFiltrades = parcellesFiltrades.filter(function(p) {
        return p.finca === fincaSeleccionada;
    });
}

    // Resum Fruita/Cereal (Kg per campanya), ja filtrat per finca si cal
    const resumCollita = (typeof obtenirResumCollitaDashboard === 'function')
        ? await obtenirResumCollitaDashboard(fincaSeleccionada)
        : { fruita: { kg: 0, campanya: null }, cereal: { kg: 0, campanya: null } };

    const totalSuperficie = parcellesFiltrades.reduce(function(sum, p) {
        return sum + (parseFloat(p.superficie) || 0);
    }, 0);
    
 // Calcular distribució cultius
const cultius = {};
parcellesFiltrades.forEach(function(p) {
    const cultiu = p.cultiu || 'Sense especificar';
    if (!cultius[cultiu]) {
        cultius[cultiu] = { count: 0, superficie: 0 };
    }
    cultius[cultiu].count++;
    cultius[cultiu].superficie += parseFloat(p.superficie) || 0;
});

	// También filtrar les altres taules per campanya 2026
		tractaments = tractaments.filter(function(t) {
    return t.campanya === '2026' || t.campanya === 2026;
});

		fertilitzacions = fertilitzacions.filter(function(f) {
    return f.campanya === '2026' || f.campanya === 2026;
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
    html += '<div class="stat-card"><div class="stat-icon">🍑</div><div class="stat-info"><div class="stat-value">' + resumCollita.fruita.kg.toLocaleString('ca-ES', {maximumFractionDigits:0}) + ' Kg</div><div class="stat-label">Fruita' + (resumCollita.fruita.campanya ? ' — Campanya ' + resumCollita.fruita.campanya : '') + '</div></div></div>';
    html += '<div class="stat-card"><div class="stat-icon">🌾</div><div class="stat-info"><div class="stat-value">' + resumCollita.cereal.kg.toLocaleString('ca-ES', {maximumFractionDigits:0}) + ' Kg</div><div class="stat-label">Cereal' + (resumCollita.cereal.campanya ? ' — Campanya ' + resumCollita.cereal.campanya : '') + '</div></div></div>';
    html += '</div>';

 // BLOC ALERTES
    const absenciesPendents = absencies.filter(function(a) { return a.estat === 'pendent'; });
    const incidenciesPendents = incidencies.filter(function(i) { return i.estat === 'pendent'; });
    const avui = new Date().toISOString().split('T')[0];
    const entradesObertes = controlHorari.filter(function(r) { return r.data === avui && r.hora_entrada && !r.hora_sortida; });
    const role = currentUserProfile ? currentUserProfile.role : 'visor';
    const alertesArray = [];

    if (role === 'admin' || role === 'editor') {
        if (absenciesPendents.length > 0) {
            alertesArray.push({ color: '#ff9800', icon: '📅', text: absenciesPendents.length + (absenciesPendents.length > 1 ? ' absències pendents' : ' absència pendent') + ' d\'aprovació', accio: 'canviarVista(\'absencies\')' });
        }
        if (incidenciesPendents.length > 0) {
            alertesArray.push({ color: '#f44336', icon: '⚠️', text: incidenciesPendents.length + (incidenciesPendents.length > 1 ? ' incidències pendents' : ' incidència pendent') + ' de resoldre', accio: 'canviarVista(\'incidencies\')' });
        }
        if (entradesObertes.length > 0) {
            alertesArray.push({ color: '#2196f3', icon: '⏰', text: entradesObertes.length + ' treballador' + (entradesObertes.length > 1 ? 's' : '') + ' amb entrada oberta sense sortida', accio: 'canviarVista(\'control-horari\')' });
        }
    }

    // Afegir alertes de la BD
alertes.forEach(function(a) {
    const dataInici = new Date(a.data_inici);
    const dataFi = a.data_fi ? new Date(a.data_fi) : null;
    const diesAvis = a.dies_avis || 30;
    const dataAvis = new Date(dataInici);
    dataAvis.setDate(dataAvis.getDate() - diesAvis);
    const avuiDate = new Date(avui);
    const dataFiEfectiva = dataFi || dataInici;
    if (avuiDate >= dataAvis && avuiDate <= new Date(dataFiEfectiva.getTime() + 30*86400000)) {
        const diesRestants = Math.ceil((dataInici - avuiDate) / 86400000);
        let color = '#4caf50';
        if (diesRestants <= 7) color = '#f44336';
        else if (diesRestants <= 15) color = '#ff9800';
        let text = a.titol;
        if (diesRestants > 0) text += ' — d\'aquí ' + diesRestants + ' dies';
        else if (diesRestants === 0) text += ' — avui!';
        else text += ' — en curs';
        const tipus = a.tipus || 'altres';
        const icones = { fiscal: '💰', agricola: '🌱', laboral: '👥', altres: '📌' };
        const icona = icones[tipus] || '📌';
        alertesArray.push({ color: color, icon: icona, text: text, accio: 'canviarVista(\'alertes\')' });
    }
});

    if (alertesArray.length > 0) {
        html += '<div style="margin-bottom:30px;">';
        html += '<h3>🔔 Alertes</h3>';
        html += '<div style="display:flex;flex-direction:column;gap:10px;">';
        alertesArray.forEach(function(a) {
            html += '<div onclick="' + a.accio + '" style="display:flex;align-items:center;gap:12px;padding:14px 18px;background:white;border-left:4px solid ' + a.color + ';border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer;transition:transform 0.1s;" onmouseover="this.style.transform=\'translateX(4px)\'" onmouseout="this.style.transform=\'translateX(0)\'">';
            html += '<span style="font-size:22px;">' + a.icon + '</span>';
            html += '<span style="font-size:15px;font-weight:500;color:#333;">' + a.text + '</span>';
            html += '<span style="margin-left:auto;color:#999;font-size:18px;">›</span>';
            html += '</div>';
        });
        html += '</div></div>';
    }

    // BLOC AGENDA (es pinta després, via renderAgendaWidget, un cop el contenidor ja és al DOM)
    html += '<div id="agenda-widget-container" style="margin-bottom:30px;"></div>';

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
	html += '<button class="btn btn-secondary" onclick="canviarVista(\'contactes\')">📞 Contactes</button>';
    html += '</div></div></div>';
    
    container.innerHTML = html;

    // Pintar el widget de l'agenda (és asíncron, no bloqueja la resta del dashboard)
    if (typeof renderAgendaWidget === 'function') {
        renderAgendaWidget();
    }
}

function seleccionarFinca(finca) {
    fincaSeleccionada = finca || null;
    carregarDashboard();
}

async function carregarVistaAlertes() {
    const container = document.getElementById('view-container');
    const podeEditar = hasPermission('update');
    const podeCrear = hasPermission('insert');

    let html = '<div class="view-alertes">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:20px;">';
    html += '<h2>🔔 Alertes i Calendari</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalAlerta()">➕ Nova Alerta</button>';
    }
    html += '</div>';
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Títol</th><th>Tipus</th><th>Data Inici</th><th>Data Fi</th><th>Dies Avis</th><th>Repetició</th><th>Estat</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-alertes"><tr><td colspan="8">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';

    html += crearModalAlerta();

    container.innerHTML = html;
    await carregarTaulaAlertes();
}

async function carregarTaulaAlertes() {
    const tbody = document.getElementById('tbody-alertes');
    if (!tbody) return;

    try {
        const totes = await supabaseClient.from('alertes').select('*').order('data_inici');
        if (totes.error) throw totes.error;
        const dades = totes.data || [];

        if (dades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No hi ha alertes</td></tr>';
            return;
        }

        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');

        tbody.innerHTML = dades.map(function(a) {
            const tipus = { fiscal: '💰 Fiscal', agricola: '🌱 Agrícola', laboral: '👥 Laboral', altres: '📌 Altres' }[a.tipus] || a.tipus;
            const estat = a.activa ? '<span style="color:green;">✓ Activa</span>' : '<span style="color:gray;">✗ Inactiva</span>';
            const repeticio = a.repeticio_anual ? '🔄 Anual' : '-';
            let accions = '';
            if (podeEditar) accions += '<button class="btn btn-sm btn-secondary" onclick="editarAlerta(\'' + a.id + '\')">✏️</button> ';
            if (podeEliminar) accions += '<button class="btn btn-sm btn-danger" onclick="eliminarAlerta(\'' + a.id + '\')">🗑️</button>';
            return '<tr><td><strong>' + a.titol + '</strong>' + (a.descripcio ? '<br><small style="color:#999;">' + a.descripcio + '</small>' : '') + '</td><td>' + tipus + '</td><td>' + formatData(a.data_inici) + '</td><td>' + (a.data_fi ? formatData(a.data_fi) : '-') + '</td><td>' + (a.dies_avis || 30) + ' dies</td><td>' + repeticio + '</td><td>' + estat + '</td><td>' + accions + '</td></tr>';
        }).join('');

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="10">Error: ' + error.message + '</td></tr>';
    }
}

function crearModalAlerta() {
    let html = '<div id="modal-alerta" class="modal" style="display:none;">';
    html += '<div class="modal-content" style="max-width:600px;">';
    html += '<span class="close" onclick="tancarModal(\'modal-alerta\')">&times;</span>';
    html += '<h2 id="modal-alerta-titol">Nova Alerta</h2>';
    html += '<form id="form-alerta" onsubmit="guardarAlerta(event)">';
    html += '<input type="hidden" id="alerta-id">';
    html += '<div class="form-group"><label>Títol *</label><input type="text" id="alerta-titol" required></div>';
    html += '<div class="form-group"><label>Descripció</label><textarea id="alerta-descripcio" rows="2"></textarea></div>';
    html += '<div class="form-group"><label>Tipus *</label><select id="alerta-tipus" required><option value="">Seleccionar...</option><option value="fiscal">💰 Fiscal</option><option value="agricola">🌱 Agrícola</option><option value="laboral">👥 Laboral</option><option value="altres">📌 Altres</option></select></div>';
    html += '<div class="form-group"><label>Data Inici *</label><input type="date" id="alerta-data-inici" required></div>';
    html += '<div class="form-group"><label>Data Fi</label><input type="date" id="alerta-data-fi"></div>';
    html += '<div class="form-group"><label>Dies d\'avis previ</label><input type="number" id="alerta-dies-avis" value="30" min="1"></div>';
    html += '<div class="form-group"><label><input type="checkbox" id="alerta-repeticio" style="margin-right:8px;">Repetició anual</label></div>';
    html += '<div class="form-group"><label><input type="checkbox" id="alerta-activa" checked style="margin-right:8px;">Activa</label></div>';
    html += '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-alerta\')">Cancel·lar</button>';
    html += '<button type="submit" class="btn btn-primary">Guardar</button></div>';
    html += '</form></div></div>';
    return html;
}

function obrirModalAlerta() {
    document.getElementById('modal-alerta-titol').textContent = 'Nova Alerta';
    document.getElementById('form-alerta').reset();
    document.getElementById('alerta-id').value = '';
    document.getElementById('alerta-activa').checked = true;
    document.getElementById('alerta-dies-avis').value = 30;
    document.getElementById('modal-alerta').style.display = 'block';
}

async function editarAlerta(id) {
    const { data, error } = await supabaseClient.from('alertes').select('*').eq('id', id).single();
    if (error) return;
    document.getElementById('modal-alerta-titol').textContent = 'Editar Alerta';
    document.getElementById('alerta-id').value = data.id;
    document.getElementById('alerta-titol').value = data.titol || '';
    document.getElementById('alerta-descripcio').value = data.descripcio || '';
    document.getElementById('alerta-tipus').value = data.tipus || '';
    document.getElementById('alerta-data-inici').value = data.data_inici || '';
    document.getElementById('alerta-data-fi').value = data.data_fi || '';
    document.getElementById('alerta-dies-avis').value = data.dies_avis || 30;
    document.getElementById('alerta-repeticio').checked = data.repeticio_anual || false;
    document.getElementById('alerta-activa').checked = data.activa !== false;
    document.getElementById('modal-alerta').style.display = 'block';
}

async function guardarAlerta(event) {
    event.preventDefault();
    const id = document.getElementById('alerta-id').value;
    const dades = {
        titol: document.getElementById('alerta-titol').value.trim(),
        descripcio: document.getElementById('alerta-descripcio').value.trim() || null,
        tipus: document.getElementById('alerta-tipus').value,
        data_inici: document.getElementById('alerta-data-inici').value,
        data_fi: document.getElementById('alerta-data-fi').value || null,
        dies_avis: parseInt(document.getElementById('alerta-dies-avis').value) || 30,
        repeticio_anual: document.getElementById('alerta-repeticio').checked,
        activa: document.getElementById('alerta-activa').checked
    };
    try {
        if (id) {
            await updateAlerta(id, dades);
            mostrarNotificacio('Alerta actualitzada', 'success');
        } else {
            await createAlerta(dades);
            mostrarNotificacio('Alerta creada', 'success');
        }
        tancarModal('modal-alerta');
        await carregarTaulaAlertes();
        alertes = await getAlertes();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarAlerta(id) {
    if (!confirm('Segur que vols eliminar aquesta alerta?')) return;
    try {
        await deleteAlerta(id);
        mostrarNotificacio('Alerta eliminada', 'success');
        await carregarTaulaAlertes();
        alertes = await getAlertes();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// VISTA TRACTAMENTS AMB CRUD
// ============================================================
// ============================================================
// HELPER - Detectar campanya actual i generar opcions
// ============================================================
 
function generarOpcionsCampanya(idSelect, campanyadefecte) {
    const sel = document.getElementById(idSelect);
    if (!sel) return;
    sel.innerHTML = '';
    [2024, 2025, 2026, 2027].forEach(function(c) {
        const opt = document.createElement('option');
        opt.value = c;
        opt.text = c;
        if (c === campanyadefecte) opt.selected = true;
        sel.appendChild(opt);
    });
}
 
function getCampanyaDefecte() {
    const ara = new Date();
    const mes = ara.getMonth() + 1;
    return mes >= 10 ? ara.getFullYear() + 1 : ara.getFullYear();
}
 
function getDatesCampanya(campanya) {
    return {
        dataInici: (campanya - 1) + '-10-01',
        dataFinal: campanya + '-09-30'
    };
}

async function carregarCampanyes() {
    const select = document.getElementById('filtre-campanya');
    if (!select) return;

    const { data, error } = await supabaseClient
        .from('fertilitzacions')
        .select('campanya')
        .not('campanya', 'is', null)
        .order('campanya', { ascending: false });

    const campanyes = [...new Set((data || []).map(function(r) { return r.campanya; }))];
    const campanyaActual = getCampanyaDefecte();

    select.innerHTML = '<option value="">Totes</option>';
    campanyes.forEach(function(c) {
        const sel = c === campanyaActual ? 'selected' : '';
        select.innerHTML += '<option value="' + c + '" ' + sel + '>' + c + '</option>';
    });

    if (campanyes.length === 0) {
        select.innerHTML += '<option value="' + campanyaActual + '" selected>' + campanyaActual + '</option>';
    }
}
// ============================================================
// VISTA FERTILITZACIONS AMB CRUD
// ============================================================

async function carregarVistaFertilitzacions() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    const campanyadefecte = getCampanyaDefecte();
 
    let html = '<div class="view-fertilitzacions">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">';
    html += '<h2>🌿 Fertilitzacions</h2>';
	html += '<div style="display:flex; gap:8px; align-items:center;">';
	if (podeCrear) {
    html += '<button class="btn btn-primary" onclick="obrirModalFertilitzacio()">➕ Nova Fertilització</button>';
	}
	html += '<button class="btn-recomanacions" onclick="canviarVista(\'fertilitzants\')"><i class="ti ti-chart-bar"></i> Comparador</button>';
	html += '</div>';
    html += '</div>';
 
    // Filtre campanya
    html += '<div style="margin-bottom:15px; background:#f5f5f5; padding:12px; border-radius:8px; display:flex; align-items:center; gap:10px;">';
    html += '<label><strong>Campanya:</strong></label>';
    html += '<select id="filtre-campanya-fertilitzacions" style="padding:6px; border-radius:4px; border:1px solid #ddd;">';
    [2024, 2025, 2026, 2027].forEach(function(c) {
        html += '<option value="' + c + '"' + (c === campanyadefecte ? ' selected' : '') + '>' + c + '</option>';
    });
    html += '</select>';
    html += '</div>';
 
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Data</th><th>Producte</th><th>Finca</th><th>Parcel·les</th><th>Superfície (Ha)</th><th>Dosi</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-fertilitzacions"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
 
    html += crearModalFertilitzacio();
 
    container.innerHTML = html;
 
    document.getElementById('filtre-campanya-fertilitzacions').addEventListener('change', carregarTaulaFertilitzacions);
 
    await carregarTaulaFertilitzacions();
}
 


// ============================================================
// FERTILITZACIONS - Substituir carregarTaulaFertilitzacions()
// ============================================================
 
async function carregarTaulaFertilitzacions() {
    const tbody = document.getElementById('tbody-fertilitzacions');
    if (!tbody) return;
 
    // Llegir campanya seleccionada
    const campanya = parseInt(document.getElementById('filtre-campanya-fertilitzacions')?.value) || getCampanyaDefecte();
    const { dataInici, dataFinal } = getDatesCampanya(campanya);
 
    try {
        // Filtrar per campanya directament a la query
        const { data, error } = await supabaseClient
            .from('fertilitzacions')
            .select('*')
            .eq('estat', 'actiu')
            .gte('data', dataInici)
            .lte('data', dataFinal)
            .order('data', { ascending: false });
 
        if (error) throw error;
        fertilitzacions = data || [];
 
        if (!fertilitzacions.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha fertilitzacions per la campanya ' + campanya + '</td></tr>';
            return;
        }
 
        // Agrupació per data + producte + finca + varietat
        const grups = {};
        fertilitzacions.forEach(function(f) {
            const p = parcelles.find(function(pa) { return pa.id === f.parcella_id; });
            if (!p) return;
            const finca = p.finca || 'Sense finca';
            const varietat = p.varietat || 'Sense varietat';
            const clau = f.data + '|' + f.producte_id + '|' + finca + '|' + varietat;
            if (!grups[clau]) {
                grups[clau] = {
                    data: f.data,
                    producte_id: f.producte_id,
                    finca: finca,
                    varietat: varietat,
                    dosi: f.dosi,
                    unitat: f.unitat,
                    fertilitzacions: []
                };
            }
            grups[clau].fertilitzacions.push(f);
        });
 
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        let html = '';
 
        Object.keys(grups).sort().reverse().forEach(function(clau) {
            const g = grups[clau];
            const producte = fertilitzants.find(function(f) { return f.id === g.producte_id; });
            const nomProducte = producte ? producte.nom : 'Producte desconegut';
            const superficieTotal = g.fertilitzacions.reduce(function(sum, f) {
                return sum + (parseFloat(f.superficie_tractada) || 0);
            }, 0);
 
            html += '<tr>';
            html += '<td><strong>' + formatData(g.data) + '</strong></td>';
            html += '<td>' + nomProducte + '</td>';
            html += '<td>' + g.finca + '</td>';
            html += '<td>' + g.varietat + '</td>';
            html += '<td>' + superficieTotal.toFixed(2) + '</td>';
            html += '<td>' + g.dosi + ' ' + g.unitat + '</td>';
            html += '<td>';
            html += '<button class="btn btn-sm btn-primary" onclick="veureFertilitzacioGrup(\'' + clau + '\')">👁️</button>';
            if (podeEditar) html += ' <button class="btn btn-sm btn-secondary" onclick="editarFertilitzacioGrup(\'' + clau + '\')">✏️</button>';
            if (podeEliminar) html += ' <button class="btn btn-sm btn-danger" onclick="eliminarFertilitzacioGrup(\'' + clau + '\')">🗑️</button>';
            html += '</td>';
            html += '</tr>';
        });
 
        tbody.innerHTML = html;
 
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="7">Error carregant dades</td></tr>';
    }
}



async function editarFertilitzacioGrup(clau) {
    // clau = data|producte_id|finca|varietat
    const [data, producteId, finca, varietat] = clau.split('|');

    // Recuperar totes les fertilitzacions del grup
    const grup = fertilitzacions.filter(f => {
        const p = parcelles.find(pa => pa.id === f.parcella_id);
        if (!p) return false;
        return (
            f.data === data &&
            f.producte_id === producteId &&
            p.finca === finca &&
            (p.varietat || 'Sense varietat') === varietat
        );
    });

    if (!grup.length) return;
    const primer = grup[0];

    // Crear modal si no existeix
    if (!document.getElementById('modal-fertilitzacio')) {
        const div = document.createElement('div');
        div.innerHTML = crearModalFertilitzacio();
        document.body.appendChild(div.firstElementChild);
    }

    // Títol
    document.getElementById('modal-fertilitzacio-titol').textContent = 'Editar Fertilització';

    // Reset formulari
    const form = document.getElementById('form-fertilitzacio');
    form.reset();

    // Marcar mode edició
    form.dataset.editMode = 'true';
    form.dataset.editIds = grup.map(f => f.id).join(',');

    // Carregar data
    document.getElementById('fertilitzacio-data').value = primer.data;

    // Carregar producte
    const selectProducte = document.getElementById('fertilitzacio-producte');
    selectProducte.innerHTML = '<option value="">Seleccionar...</option>';
    fertilitzants
        .slice()
        .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
        .forEach(f => {
            selectProducte.innerHTML += `<option value="${f.id}">${f.nom}</option>`;
        });
    selectProducte.value = producteId;

    // Carregar camps generals
    document.getElementById('fertilitzacio-dosi').value = primer.dosi;
    document.getElementById('fertilitzacio-unitat').value = primer.unitat;
    document.getElementById('fertilitzacio-metode').value = primer.metode || '';
    document.getElementById('fertilitzacio-operador').value = primer.operador || '';
    document.getElementById('fertilitzacio-maquinaria').value = primer.maquinaria || '';
    document.getElementById('fertilitzacio-observacions').value = primer.observacions || '';

    // Selecció tipus → sempre per finca+varietat
    document.querySelector('input[name="seleccio-tipus-fert"][value="varietat"]').checked = true;
    canviarTipusSeleccioFert();

    // Carregar finques
    const selectFinca = document.getElementById('fertilitzacio-finca-varietat');
    selectFinca.innerHTML = '<option value="">Seleccionar...</option>';
    finques.forEach(f => {
        selectFinca.innerHTML += `<option value="${f}">${f}</option>`;
    });
    selectFinca.value = finca;

    // Carregar varietats de la finca
    actualitzarVarietatsDisponiblesFert();
    document.getElementById('fertilitzacio-varietat').value = varietat;

    // Recalcular superfícies
    actualitzarParcellesSeleccionadesFert();

    // Mostrar modal
    document.getElementById('modal-fertilitzacio').style.display = 'block';
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
	html += '<label style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; background: #e8f5e9; border-color: #4CAF50;">';
	html += '<input type="radio" name="seleccio-tipus-fert" value="finca" onchange="canviarTipusSeleccioFert();" checked style="margin: 0;"> <span style="font-weight: 500;">🗺️ Per Finques</span></label>';
	html += '<label style="flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 8px; background: white;">';
	html += '<input type="radio" name="seleccio-tipus-fert" value="varietat" onchange="canviarTipusSeleccioFert();" style="margin: 0;"> <span style="font-weight: 500;">🌾 Per Varietat</span></label>';
	html += '</div></div>';
    
    html += '<div id="seleccio-finca-fert" class="form-group"><label>Selecciona Finques</label><div id="fertilitzacio-finques-checks" style="display:block;margin-top:8px;width:100%;"></div></div>';
    html += '<div id="seleccio-varietat-fert" class="form-group" style="display:none;"><label>Finca</label><select id="fertilitzacio-finca-varietat" onchange="actualitzarVarietatsDisponiblesFert()"><option value="">Seleccionar...</option></select>';
    html += '<label style="margin-top: 10px;">Varietat</label><select id="fertilitzacio-varietat" onchange="actualitzarParcellesSeleccionadesFert()"><option value="">Seleccionar...</option></select></div>';
    
    
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
        const checks = document.querySelectorAll('#fertilitzacio-finques-checks input[type="checkbox"]:checked');
        const fincesSeleccionades = Array.from(checks).map(function(c) { return c.value; });
        const parcellesFinca = parcelles.filter(function(p) { 
            return fincesSeleccionades.includes(p.finca) && esParcellaApta(p); 
        });
        calcularSuperficieTotalFert(parcellesFinca);
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
    }
}

function calcularSuperficieTotalFert(parcellesSeleccionades) {
    let superficie = 0;
    
    if (parcellesSeleccionades) {
        superficie = parcellesSeleccionades.reduce(function(sum, p) {
            return sum + (parseFloat(p.superficie) || 0);
        }, 0);
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

function calcularQuantitatTotal() {
    const superficie = parseFloat(document.getElementById('superficie-total').textContent) || 0;
    const dosi = parseFloat(document.getElementById('tractament-dosi').value) || 0;
    const unitat = document.getElementById('tractament-unitat').value;
    
    const quantitat = superficie * dosi;
    document.getElementById('quantitat-total').textContent = quantitat.toFixed(2);
    
    const unitatBase = unitat.split('/')[0];
    document.getElementById('unitat-total').textContent = unitatBase;
}

async function obrirModalFertilitzacio() {
    document.getElementById('modal-fertilitzacio-titol').textContent = 'Nova Fertilització';
    document.getElementById('form-fertilitzacio').reset();
    
    const avui = new Date().toISOString().split('T')[0];
    document.getElementById('fertilitzacio-data').value = avui;
    
    const selectFincaVarietat = document.getElementById('fertilitzacio-finca-varietat');
    const selectProducte = document.getElementById('fertilitzacio-producte');
    
    selectFincaVarietat.innerHTML = '<option value="">Seleccionar...</option>';
    selectProducte.innerHTML = '<option value="">Seleccionar...</option>';

    // Carregar checkboxes de finques
    const checksContainer = document.getElementById('fertilitzacio-finques-checks');
    checksContainer.innerHTML = '';
    finques.forEach(function(finca) {
        checksContainer.innerHTML += 
            '<div style="padding:4px 0;display:table;width:100%;">' +
            '<input type="checkbox" value="' + finca + '" onchange="actualitzarParcellesSeleccionadesFert()" style="display:table-cell;vertical-align:middle;width:20px;">' +
            '<span style="font-size:13px;display:table-cell;vertical-align:middle;padding-left:8px;color:black;text-align:left;width:100%;">' + finca + '</span>' +
            '</div>';
        selectFincaVarietat.innerHTML += '<option value="' + finca + '">' + finca + '</option>';
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

    // 🔵 1) Selecció de parcel·les aptes
    let parcellesAFertilitzar = [];

    if (tipus === 'finca') {
        const checks = document.querySelectorAll('#fertilitzacio-finques-checks input[type="checkbox"]:checked');
        const finquesSeleccionades = Array.from(checks).map(c => c.value);

        parcellesAFertilitzar = parcelles.filter(p =>
            finquesSeleccionades.includes(p.finca) &&
            esParcellaApta(p)
        );

    } else if (tipus === 'varietat') {
        const finca = document.getElementById('fertilitzacio-finca-varietat').value;
        const varietat = document.getElementById('fertilitzacio-varietat').value;

        parcellesAFertilitzar = parcelles.filter(p =>
            p.finca === finca &&
            p.varietat === varietat &&
            esParcellaApta(p)
        );
    }

    if (!parcellesAFertilitzar.length) {
        mostrarNotificacio('No hi ha parcel·les aptes seleccionades', 'error');
        return;
    }

    const producte = fertilitzants.find(f => f.id === producteId);
    if (!producte) {
        mostrarNotificacio('Producte no trobat', 'error');
        return;
    }

    // 🔵 2) Mode edició → esborrem registres i moviments antics
    const form = document.getElementById('form-fertilitzacio');
    const editMode = form.dataset.editMode === 'true';
    const editIds = editMode ? form.dataset.editIds.split(',') : [];

    try {
        if (editMode) {
            await supabaseClient.from('fertilitzacions').delete().in('id', editIds);
            await supabaseClient.from('estoc_moviments').delete().in('referencia_id', editIds);
        }

        // 🔵 3) Agrupació per finca + varietat
        const grups = {}; // clau: finca|varietat

        parcellesAFertilitzar.forEach(p => {
            const finca = p.finca;
            const varietat = p.varietat || 'Sense varietat';
            const clau = `${finca}|${varietat}`;

            if (!grups[clau]) {
                grups[clau] = {
                    finca,
                    varietat,
                    superficieTotal: 0,
                    quantitatTotal: 0,
                    nTotal: 0,
                    pTotal: 0,
                    kTotal: 0,
                    referenciaId: null,
                    parcel·les: []
                };
            }

            const superficie = parseFloat(p.superficie) || 0;
            const quantitat = superficie * dosi;

            grups[clau].superficieTotal += superficie;
            grups[clau].quantitatTotal += quantitat;
            grups[clau].nTotal += (producte.n || 0) * quantitat / 100;
            grups[clau].pTotal += (producte.p || 0) * quantitat / 100;
            grups[clau].kTotal += (producte.k || 0) * quantitat / 100;

            grups[clau].parcel·les.push({
                id: p.id,
                superficie
            });
        });

        const fertilitzacionsCreades = [];

        // 🔵 4) Crear registres per parcel·la
        for (const clau in grups) {
            const g = grups[clau];

            for (const parc of g.parcel·les) {
                const nova = {
                    data,
                    parcella_id: parc.id,
                    producte_id: producteId,
                    dosi,
                    unitat,
                    superficie_tractada: parc.superficie,
                    metode: metode || null,
                    operador: operador || null,
                    maquinaria: maquinaria || null,
                    observacions: observacions || null,
                    n_total: (producte.n || 0) * parc.superficie * dosi / 100,
                    p_total: (producte.p || 0) * parc.superficie * dosi / 100,
                    k_total: (producte.k || 0) * parc.superficie * dosi / 100,
					campanya: obtenirCampanya(data)
                };

                const creada = await createFertilitzacio(nova);
                fertilitzacionsCreades.push(creada);

                if (!g.referenciaId) g.referenciaId = creada.id;
            }
        }

        // 🔵 5) Crear moviments d’estoc per finca + varietat
        for (const clau in grups) {
            const g = grups[clau];

            await supabaseClient.from('estoc_moviments').insert([{
                data,
                producte_id: producteId,
                tipus_producte: 'fertilitzant',
                tipus_moviment: 'fertilitzacio',
                quantitat: -g.quantitatTotal,
                unitat: unitat.split('/')[0],
                referencia_id: g.referenciaId,
                observacions: `Fertilització ${g.finca} – ${g.varietat} (${g.superficieTotal.toFixed(2)} Ha)`,
                created_by: currentUser ? currentUser.id : null
            }]);
        }

        mostrarNotificacio('Fertilització registrada correctament', 'success');
        tancarModal('modal-fertilitzacio');
        await carregarTaulaFertilitzacions();

    } catch (error) {
        console.error(error);
        mostrarNotificacio('Error en guardar: ' + error.message, 'error');
    }
}

async function veureFertilitzacioGrup(clau) {
    // clau = data|producte_id|finca|varietat
    const [data, producteId, finca, varietat] = clau.split('|');

    // Recuperar totes les fertilitzacions del grup
    const grup = fertilitzacions.filter(f => {
        const p = parcelles.find(pa => pa.id === f.parcella_id);
        if (!p) return false;
        return (
            f.data === data &&
            f.producte_id === producteId &&
            p.finca === finca &&
            (p.varietat || 'Sense varietat') === varietat
        );
    });

    if (!grup.length) return;

    const primer = grup[0];
    const producte = fertilitzants.find(f => f.id === primer.producte_id);
    const nomProducte = producte ? producte.nom : 'Producte desconegut';

    // Superfície total
    const superficieTotal = grup.reduce((sum, f) =>
        sum + (parseFloat(f.superficie_tractada) || 0), 0
    );

    // Quantitat total aplicada
    const quantitatTotal = superficieTotal * (parseFloat(primer.dosi) || 0);
    const unitatBase = (primer.unitat || 'kg/Ha').split('/')[0];

    // NPK totals
    const nTotal = grup.reduce((sum, f) => sum + (f.n_total || 0), 0);
    const pTotal = grup.reduce((sum, f) => sum + (f.p_total || 0), 0);
    const kTotal = grup.reduce((sum, f) => sum + (f.k_total || 0), 0);

    // Construcció del modal
    let html = `
    <div id="modal-veure-fertilitzacio" class="modal" style="display:block;">
        <div class="modal-content" style="max-width:750px;">
            <span class="close" onclick="tancarModal('modal-veure-fertilitzacio')">&times;</span>
            <h2>📋 Detall Fertilització</h2>

            <div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px;">
                <div><strong>📅 Data:</strong> ${formatData(primer.data)}</div>
                <div><strong>🌱 Producte:</strong> ${nomProducte}</div>
                <div><strong>🏞️ Finca:</strong> ${finca}</div>
                <div><strong>🌾 Varietat:</strong> ${varietat}</div>
                <div><strong>💧 Dosi:</strong> ${primer.dosi} ${primer.unitat}</div>
                <div><strong>📏 Superfície total:</strong> ${superficieTotal.toFixed(2)} Ha</div>
                <div><strong>📦 Quantitat total:</strong> ${quantitatTotal.toFixed(2)} ${unitatBase}</div>
            </div>

            <div style="background:#e8f5e9;padding:12px;border-radius:6px;margin-bottom:20px;">
                <strong>🌿 Unitats Fertilitzant totals (U.F.):</strong><br>
                N total: ${nTotal.toFixed(2)} ${unitatBase} |
                P total: ${pTotal.toFixed(2)} ${unitatBase} |
                K total: ${kTotal.toFixed(2)} ${unitatBase}
            </div>

            <h3>🗺️ Parcel·les Fertilitzades (${grup.length})</h3>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Parcel·la</th>
                            <th>Cultiu</th>
                            <th>Varietat</th>
                            <th>Superfície (Ha)</th>
                            <th>N</th>
                            <th>P</th>
                            <th>K</th>
                        </tr>
                    </thead>
                    <tbody>`;

    grup.forEach(f => {
        const p = parcelles.find(pa => pa.id === f.parcella_id);
        html += `
            <tr>
                <td><strong>${p.nom}</strong></td>
                <td>${p.cultiu}</td>
                <td>${p.varietat || '-'}</td>
                <td>${f.superficie_tractada.toFixed(2)}</td>
                <td>${(f.n_total || 0).toFixed(2)}</td>
                <td>${(f.p_total || 0).toFixed(2)}</td>
                <td>${(f.k_total || 0).toFixed(2)}</td>
            </tr>`;
    });

    html += `
                    </tbody>
                </table>
            </div>

            <div class="form-actions" style="margin-top:20px;">
                <button class="btn btn-primary" onclick="tancarModal('modal-veure-fertilitzacio')">Tancar</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}


async function eliminarFertilitzacioGrup(clau) {
    // clau = data|producte_id|finca|varietat
    if (!confirm('Segur que vols eliminar aquest grup de fertilitzacions?')) return;

    const [data, producteId, finca, varietat] = clau.split('|');

    // Recuperar totes les fertilitzacions del grup
    const grup = fertilitzacions.filter(f => {
        const p = parcelles.find(pa => pa.id === f.parcella_id);
        if (!p) return false;
        return (
            f.data === data &&
            f.producte_id === producteId &&
            p.finca === finca &&
            (p.varietat || 'Sense varietat') === varietat
        );
    });

    if (!grup.length) return;

    const ids = grup.map(f => f.id);

    try {
        // 1) Esborrar registres de fertilització
        await supabaseClient.from('fertilitzacions').delete().in('id', ids);

        // 2) Esborrar moviments d’estoc associats
        await supabaseClient.from('estoc_moviments').delete().in('referencia_id', ids);

        mostrarNotificacio('Fertilització eliminada correctament', 'success');

        // 3) Actualitzar taula
        await carregarTaulaFertilitzacions();

    } catch (error) {
        console.error(error);
        mostrarNotificacio('Error eliminant fertilització: ' + error.message, 'error');
    }
}


// ============================================================
// VISTA PARCELLES (mantenir codi app.v5.js)
// ============================================================

async function carregarVistaParcelles() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');

    // Campanya per defecte: actual si hi ha dades, si no l'anterior
    const campanyes = [...new Set(parcelles.map(p => p.campanya).filter(Boolean))].sort((a,b) => b-a);
    const anyActual = new Date().getFullYear();
    const campanyes_disponibles = campanyes.length ? campanyes : [anyActual];
    const campanyaDefecte = campanyes.includes(anyActual) ? anyActual : (campanyes[0] || anyActual);

    const fincesUnic = [...new Set(parcelles.filter(p => p.campanya === campanyaDefecte).map(p => p.finca).filter(Boolean))].sort();
    const cultiusUnic = [...new Set(parcelles.filter(p => p.campanya === campanyaDefecte).map(p => p.cultiu).filter(Boolean))].sort();

    let html = '<div class="view-parcelles">';
    html += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">';
    html += '<h2>🗺️ Parcel·les</h2>';
    if (podeCrear) {
    html += '<button class="btn btn-primary" onclick="obrirModalParcella()">➕ Nova Parcel·la</button>';
    html += '<button class="btn btn-secondary" onclick="canviarVista(\'parcelles-import-dun\')" style="margin-left:10px;">📥 Importar DUN</button>';
}
    html += '</div>';

    // Barra de filtres
    html += '<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; align-items: flex-end;">';

    html += '<div><label style="display:block; font-size:12px; margin-bottom:4px;">Campanya</label>';
    html += '<select id="filtre-campanya" onchange="canviarCampanyaParcelles()" style="padding:6px 10px; border:1px solid #ddd; border-radius:4px;">';
    campanyes_disponibles.forEach(c => {
        const sel = c === campanyaDefecte ? 'selected' : '';
        html += `<option value="${c}" ${sel}>${c}</option>`;
    });
    html += '</select></div>';

    html += '<div><label style="display:block; font-size:12px; margin-bottom:4px;">Finca</label>';
    html += '<select id="filtre-finca" onchange="aplicarFiltresParcelles()" style="padding:6px 10px; border:1px solid #ddd; border-radius:4px;">';
    html += '<option value="">Totes</option>';
    fincesUnic.forEach(f => { html += `<option value="${f}">${f}</option>`; });
    html += '</select></div>';

    html += '<div><label style="display:block; font-size:12px; margin-bottom:4px;">Cultiu</label>';
    html += '<select id="filtre-cultiu" onchange="aplicarFiltresParcelles()" style="padding:6px 10px; border:1px solid #ddd; border-radius:4px;">';
    html += '<option value="">Tots</option>';
    cultiusUnic.forEach(c => { html += `<option value="${c}">${c}</option>`; });
    html += '</select></div>';

    html += '<div><label style="display:block; font-size:12px; margin-bottom:4px;">Regadiu</label>';
    html += '<select id="filtre-regadiu" onchange="aplicarFiltresParcelles()" style="padding:6px 10px; border:1px solid #ddd; border-radius:4px;">';
    html += '<option value="">Tots</option>';
    html += '<option value="true">Sí</option>';
    html += '<option value="false">No</option>';
    html += '</select></div>';

    html += '<div style="display:flex; align-items:flex-end;">';
    html += '<button class="btn btn-secondary" onclick="netejarFiltresParcelles()" style="padding:6px 12px;">🔄 Netejar</button></div>';
    html += '<div id="resum-parcelles" style="display:flex; align-items:flex-end; font-size:13px; color:#666; margin-left:auto;"></div>';
    html += '</div>';

    html += '<div class="table-container"><table class="data-table">';
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
        aplicarFiltresParcelles();
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="7">Error carregant dades</td></tr>';
    }
}
function canviarCampanyaParcelles() {
    // Quan canvia la campanya, recarreguem Finca i Cultiu amb valors d'aquesta campanya
    const campanya = parseInt((document.getElementById('filtre-campanya') || {}).value) || 0;
    const parcCampanya = campanya ? parcelles.filter(p => p.campanya === campanya) : parcelles;

    const fincesUnic = [...new Set(parcCampanya.map(p => p.finca).filter(Boolean))].sort();
    const cultiusUnic = [...new Set(parcCampanya.map(p => p.cultiu).filter(Boolean))].sort();

    const selFinca = document.getElementById('filtre-finca');
    const selCultiu = document.getElementById('filtre-cultiu');
    if (selFinca) {
        selFinca.innerHTML = '<option value="">Totes</option>';
        fincesUnic.forEach(f => { selFinca.innerHTML += `<option value="${f}">${f}</option>`; });
    }
    if (selCultiu) {
        selCultiu.innerHTML = '<option value="">Tots</option>';
        cultiusUnic.forEach(c => { selCultiu.innerHTML += `<option value="${c}">${c}</option>`; });
    }
    aplicarFiltresParcelles();
}

function aplicarFiltresParcelles() {
    const tbody = document.getElementById('tbody-parcelles');
    if (!tbody) return;

    const filtreCampanya = parseInt((document.getElementById('filtre-campanya') || {}).value) || 0;
    const filtreFinca    = (document.getElementById('filtre-finca')    || {}).value || '';
    const filtreCultiu   = (document.getElementById('filtre-cultiu')   || {}).value || '';
    const filtreRegadiu  = (document.getElementById('filtre-regadiu')  || {}).value || '';

    const filtrades = parcelles.filter(function(p) {
        if (filtreCampanya && p.campanya !== filtreCampanya) return false;
        if (filtreFinca    && p.finca    !== filtreFinca)    return false;
        if (filtreCultiu   && p.cultiu   !== filtreCultiu)   return false;
        if (filtreRegadiu !== '' && String(!!p.regadiu) !== filtreRegadiu) return false;
        return true;
    });

    const totalHa = filtrades.reduce(function(sum, p) { return sum + (parseFloat(p.superficie) || 0); }, 0);
    const resum = document.getElementById('resum-parcelles');
    if (resum) resum.textContent = filtrades.length + ' parcel·les · ' + totalHa.toFixed(2) + ' Ha';

    if (filtrades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Cap parcel·la coincideix amb els filtres</td></tr>';
        return;
    }

    const podeEditar   = hasPermission('update');
    const podeEliminar = hasPermission('delete');

    tbody.innerHTML = filtrades.map(function(p) {
        let accions = '<button class="btn btn-sm btn-primary" onclick="veureParcella(\'' + p.id + '\')">👁️</button> ';
        if (podeEditar)   accions += '<button class="btn btn-sm btn-secondary" onclick="editarParcella(\'' + p.id + '\')">✏️</button> ';
        if (podeEliminar) accions += '<button class="btn btn-sm btn-danger" onclick="eliminarParcella(\'' + p.id + '\')">🗑️</button>';

        const regadiuIcon = p.regadiu ? ' 💧' : '';
        return '<tr>' +
            '<td><strong>' + (p.nom || '-') + '</strong></td>' +
            '<td>' + (p.sigpac || '-') + '</td>' +
            '<td>' + (p.finca || '-') + '</td>' +
            '<td>' + (p.cultiu || '-') + '</td>' +
            '<td>' + (p.varietat || '-') + '</td>' +
            '<td>' + (p.superficie || 0) + regadiuIcon + '</td>' +
            '<td>' + accions + '</td>' +
            '</tr>';
    }).join('');
}

function netejarFiltresParcelles() {
    // Netejar finca, cultiu i regadiu però mantenir la campanya activa
    const sec = document.getElementById('filtre-finca');
    const ser = document.getElementById('filtre-cultiu');
    const srd = document.getElementById('filtre-regadiu');
    if (sec) sec.value = '';
    if (ser) ser.value = '';
    if (srd) srd.value = '';
    aplicarFiltresParcelles();
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
	html += '<div class="form-group"><label>Nº Explotació Reg</label><input type="text" id="parcella-num-explotacio" placeholder="121H457VH01"></div>';
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
    document.getElementById('parcella-num-explotacio').value = parcella.num_explotacio || '';
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
        num_explotacio: document.getElementById('parcella-num-explotacio').value.trim() || null,
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
    html += '<div class="tabs"><button class="tab-btn active" onclick="canviarTabProductes(\'fitosanitaris\', this)">🧪 Fitosanitaris</button>';
	html += '<button class="tab-btn" onclick="canviarTabProductes(\'fertilitzants\', this)">🌱 Fertilitzants</button></div>';
    html += '<div id="tab-fitosanitaris" class="tab-content active">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;"><h3>Fitosanitaris</h3>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalFitosanitari()">➕ Nou Fitosanitari</button>';
    }
    html += '</div><div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Nom</th><th>Tipus</th><th>Matèria Activa</th><th>Plaç (dies)</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-fitosanitaris"><tr><td colspan="5">Carregant...</td></tr></tbody></table></div></div>';
    html += '<div id="tab-fertilitzants" class="tab-content" style="display:none">';
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

function canviarTabProductes(tab, el) {
    // Botons
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.classList.remove('active');
    });
    if (el) el.classList.add('active');

    // Tabs — controlar display directament
    document.getElementById('tab-fitosanitaris').style.display = 'none';
    document.getElementById('tab-fertilitzants').style.display = 'none';
    document.getElementById('tab-' + tab).style.display = 'block';
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
		'<div class="form-group"><label>IRAC</label><input type="text" id="fitosanitari-irac" placeholder="Ex: 1A / 3A"></div>' +
		'<div class="form-group"><label>Unitat Estoc *</label>' +
		'<select id="fitosanitari-unitat-stock">' +
		'<option value="L">L (Litres)</option>' +
		'<option value="kg">kg (Quilograms)</option>' +
		'<option value="g">g (Grams)</option>' +
		'</select></div>' +
		'<div class="form-group"><label>Factor Conversió Tractament</label>' +
		'<input type="number" id="fitosanitari-factor" value="1" min="0" step="0.001" placeholder="1=L/L, 0.001=g/kg"></div>' +
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
    document.getElementById('fitosanitari-irac').value = producte.irac || '';
    document.getElementById('fitosanitari-unitat-stock').value = producte.unitat_stock || 'L';
    document.getElementById('fitosanitari-factor').value = producte.factor_conversio || 1;
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
        irac: document.getElementById('fitosanitari-irac').value.trim() || null,
        unitat_stock: document.getElementById('fitosanitari-unitat-stock').value,
        factor_conversio: parseFloat(document.getElementById('fitosanitari-factor').value) || 1,
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
        const { data } = await supabaseClient
			.from('fertilitzacions')
			.select('*')
			.eq('estat', 'actiu')
			.order('data', { ascending: false });
		fertilitzacions = data || [];	
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
		'<div class="form-group"><label>Unitat Estoc *</label>' +
		'<select id="fertilitzant-unitat-stock">' +
		'<option value="kg">kg (Quilograms)</option>' +
		'<option value="L">L (Litres)</option>' +
		'<option value="g">g (Grams)</option>' +
		'</select></div>' +
		'<div class="form-group"><label>Factor Conversió</label>' +
		'<input type="number" id="fertilitzant-factor" value="1" min="0" step="0.001" placeholder="1=kg/kg, 0.001=g/kg"></div>' +
		'<div class="form-group"><label>Observacions</label><textarea id="fertilitzant-observacions" rows="3"></textarea></div>' +    '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-fertilitzant\')">Cancel·lar</button>' +
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
    document.getElementById('fertilitzant-unitat-stock').value = producte.unitat_stock || 'kg';
    document.getElementById('fertilitzant-factor').value = producte.factor_conversio || 1;
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
        unitat_stock: document.getElementById('fertilitzant-unitat-stock').value,
        factor_conversio: parseFloat(document.getElementById('fertilitzant-factor').value) || 1,
        observacions: document.getElementById('fertilitzant-observacions').value.trim()
    };
    
    try {
        // Validació duplicats — només en crear (no en editar)
        if (!id) {
            const { data: similars } = await supabaseClient
                .from('fertilitzants')
                .select('id, nom')
                .ilike('nom', '%' + dades.nom + '%');

            if (similars && similars.length > 0) {
                const llista = similars.map(function(f) { return '• ' + f.nom; }).join('\n');
                if (!confirm('⚠️ Ja existeixen fertilitzants amb nom similar:\n\n' + llista + '\n\nVols crear-ne un de nou igualment?')) {
                    return;
                }
            }
        }

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
        const role = currentUserProfile ? currentUserProfile.role : '';
		treballadors = await getTreballadors(role === 'admin');
        
        if (treballadors.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha treballadors</td></tr>';
            return;
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        const mostrarPreu = role === 'admin' || role === 'editor';
        
        tbody.innerHTML = treballadors.map(function(t) {
			let estat;
			if (t.eliminat) {
				estat = '<span style="color: red;">🔴 Eliminat</span>';
			} else if (t.actiu) {
				estat = '<span style="color: green;">✓ Actiu</span>';
			} else {
				estat = '<span style="color: gray;">✗ Inactiu</span>';
			}

			let accions = '<button class="btn btn-sm btn-primary" onclick="veureTreballador(\'' + t.id + '\')">👁️</button> ';
			if (t.eliminat) {
				if (podeEditar) {
					accions += '<button class="btn btn-sm btn-success" onclick="reactivarTreballador(\'' + t.id + '\')">♻️ Reactivar</button>';
				}
			} else {
				if (podeEditar) {
					accions += '<button class="btn btn-sm btn-secondary" onclick="editarTreballador(\'' + t.id + '\')">✏️</button> ';
				}
			if (podeEliminar) {
				accions += '<button class="btn btn-sm btn-danger" onclick="eliminarTreballador(\'' + t.id + '\')">🗑️</button>';
			}
		}
	
		const preu = mostrarPreu ? ((t.preu_hora || 0).toFixed(2) + ' €') : '-';

		return '<tr style="' + (t.eliminat ? 'opacity:0.6;background:#fff5f5;' : '') + '"><td><strong>' + (t.nom || '-') + '</strong></td><td>' + (t.tipus || 'Propi') + '</td><td>' + (t.codi_usuari || '-') + '</td><td>' + (t.categoria || '-') + '</td><td>' + preu + '</td><td>' + estat + '</td><td>' + accions + '</td></tr>';
}).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6">Error carregant dades</td></tr>';
    }
}

async function reactivarTreballador(id) {
    if (!confirm('Vols reactivar aquest treballador?')) return;
    try {
        await updateTreballador(id, { eliminat: false, eliminat_per: null, eliminat_at: null });
        mostrarNotificacio('✅ Treballador reactivat', 'success');
        await carregarTaulaTreballadors();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
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
'<option value="Peó Agrícola">Peó Agrícola</option><option value="Maquinista">Maquinista</option><option value="Tractorista">Tractorista</option></select></div>' +
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
    html += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalControlHorari()">➕ Nou Registre</button>';
    }
    html += '<button class="btn btn-secondary" onclick="exportarControlHorariLaboral()">📋 Exportar Laboral</button>';
    html += '<button class="btn btn-secondary" onclick="exportarControlHorariGestio()">📊 Exportar Gestió</button>';
    html += '</div>';
    html += '</div>';
    
    html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
    html += '<h3 style="margin-top: 0;">🔍 Filtres</h3>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">';
    html += '<div><label>Data Inici:</label><input type="date" id="filtro-data-inici" onchange="aplicarFiltresHorari()"></div>';
    html += '<div><label>Data Fi:</label><input type="date" id="filtro-data-fi" onchange="aplicarFiltresHorari()"></div>';
    html += '<div><label>Tipus:</label><select id="filtro-tipus-treballador" onchange="aplicarFiltresHorari()"><option value="">Tots</option><option value="Propi">Propi</option><option value="Soci">Soci</option><option value="Temporal">Temporal</option><option value="Alié">Autònom/ETT</option></select></div>';
    html += '<div><label>Treballador:</label><select id="filtro-treballador" onchange="aplicarFiltresHorari()"><option value="">Tots</option></select></div>';
    html += '<div style="align-self: end; display:flex; gap:8px;">' +
    '<button class="btn btn-secondary" onclick="netejarFiltresHorari()">🗑️ Netejar</button>' +
    '<button class="btn btn-primary" onclick="carregarTaulaControlHorari()">🔄 Actualitzar</button>' +
    '</div>';
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
            treballadorId: document.getElementById('filtro-treballador')?.value || null,
            tipusTreballador: document.getElementById('filtro-tipus-treballador')?.value || null
        };
        
        controlHorari = await getControlHorari(filtres);

        // Filtrar per tipus de treballador
        if (filtres.tipusTreballador) {
            controlHorari = controlHorari.filter(function(r) {
                const treb = treballadors.find(function(t) { return t.id === r.treballador_id; });
                return treb && treb.tipus === filtres.tipusTreballador;
            });
        }
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
            const hores = r.hores_treballades ? horesTotalsRegistre(r).toFixed(2) + 'h' : '-';
            
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
        return sum + horesTotalsRegistre(r);
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

async function editarControlHorari(id) {
    const registre = controlHorari.find(function(r) { return r.id === id; });
    if (!registre) return;

    document.getElementById('modal-control-horari-titol').textContent = 'Editar Registre';
    document.getElementById('control-horari-id').value = id;

    const selTreb = document.getElementById('control-horari-treballador');
    selTreb.innerHTML = '<option value="">Seleccionar...</option>';
    treballadors.filter(function(t) { return t.actiu; }).forEach(function(t) {
        selTreb.innerHTML += '<option value="' + t.id + '">' + t.nom + '</option>';
    });
    selTreb.value = registre.treballador_id;
    selTreb.disabled = true;

    document.getElementById('control-horari-data').value = registre.data;
    document.getElementById('control-horari-data').removeAttribute('readonly');

    document.getElementById('group-hora-entrada').style.display = 'block';
    document.getElementById('group-hora-sortida').style.display = 'block';
    document.getElementById('control-horari-hora-entrada').value = registre.hora_entrada || '';
    document.getElementById('control-horari-hora-sortida').value = registre.hora_sortida || '';
    document.getElementById('control-horari-hora-entrada').removeAttribute('readonly');
    document.getElementById('control-horari-hora-sortida').removeAttribute('readonly');

    const selTasca = document.getElementById('control-horari-tasca');
    selTasca.innerHTML = '<option value="">Seleccionar...</option>';
    tasques.forEach(function(t) {
        selTasca.innerHTML += '<option value="' + t.id + '">' + t.nom + '</option>';
    });
    selTasca.value = registre.tasca_id || '';

    const selFinca = document.getElementById('control-horari-finca');
    selFinca.innerHTML = '<option value="">Sense finca</option>';
    finques.forEach(function(f) {
        selFinca.innerHTML += '<option value="' + f.nom + '">' + f.nom + '</option>';
    });
    selFinca.value = registre.finca || '';

    document.getElementById('control-horari-observacions').value = registre.observacions || '';
    document.getElementById('info-fitxatge').style.display = 'none';
    document.getElementById('btn-fitxar').textContent = 'Guardar canvis';
    document.getElementById('modal-control-horari').style.display = 'block';
}
function crearModalControlHorari() {
    return '<div id="modal-control-horari" class="modal" style="display: none;"><div class="modal-content" style="max-width: 700px;">' +
        '<span class="close" onclick="tancarModal(\'modal-control-horari\')">&times;</span>' +
        '<h2 id="modal-control-horari-titol">Fitxar</h2>' +
        '<form id="form-control-horari" onsubmit="guardarControlHorari(event)">' +
        '<input type="hidden" id="control-horari-id">' +
        '<div class="form-group"><label>Treballador *</label><select id="control-horari-treballador" required onchange="comprovarEntradaOberta()"><option value="">Seleccionar...</option></select></div>' +
        '<div id="info-fitxatge" style="display:none; background: #e3f2fd; padding: 12px; border-radius: 6px; margin-bottom: 15px;"></div>' +
        '<div class="form-group"><label>Data *</label><input type="date" id="control-horari-data" required></div>' +
        '<div class="form-group" id="group-hora-entrada" style="display:none;"><label>Hora Entrada</label><input type="time" id="control-horari-hora-entrada" readonly></div>' +
        '<div class="form-group" id="group-hora-sortida" style="display:none;"><label>Hora Sortida</label><input type="time" id="control-horari-hora-sortida" readonly></div>' +
        '<div class="form-group"><label>Tasca *</label><select id="control-horari-tasca" onchange="mostrarTascaLliure()"><option value="">Seleccionar...</option></select></div>' +
        '<div class="form-group" id="group-tasca-libre" style="display:none;"><label>Descripcio tasca</label><input type="text" id="control-horari-tasca-libre" placeholder="Descriu la tasca..."></div>' +
        '<div class="form-group"><label>Finca (opcional)</label><select id="control-horari-finca"><option value="">Sense finca</option></select></div>' +
        '<div class="form-group" id="group-motiu-sortida" style="display:none;"><label>Motiu sortida anticipada</label><select id="control-horari-motiu"><option value="">Sense motiu especial</option></select></div>' +
        '<div class="form-group" id="group-num-persones" style="display:none;"><label>N Persones (grups)</label><input type="number" id="control-horari-num-persones" min="1" value="1"></div>' +
        '<div class="form-group"><label>Observacions</label><textarea id="control-horari-observacions" rows="2"></textarea></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-control-horari\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary" id="btn-fitxar">Fitxar</button></div></form></div></div>';
}

async function exportarControlHorariLaboral() {
    const dataInici = document.getElementById('filtro-data-inici')?.value || 
                      document.getElementById('informe-horari-inici')?.value;
    const dataFi = document.getElementById('filtro-data-fi')?.value || 
                   document.getElementById('informe-horari-fi')?.value;
				   
    if (!dataInici || !dataFi) {
        mostrarNotificacio('Cal seleccionar data inici i data fi per exportar', 'error');
        return;
    }

    // Validar màxim 90 dies
    const dies = Math.ceil((new Date(dataFi) - new Date(dataInici)) / 86400000);
    if (dies > 90) {
        mostrarNotificacio('El període màxim d\'exportació és 90 dies', 'error');
        return;
    }

    const registres = controlHorari;
    if (registres.length === 0) {
        mostrarNotificacio('No hi ha registres per exportar', 'error');
        return;
    }

    // Capçalera CSV
    let csv = 'Data;Treballador;Tipus;Categoria;Hora Entrada;Hora Sortida;Persones;Hores Totals\n';

    registres.forEach(function(r) {
        const treb = treballadors.find(function(t) { return t.id === r.treballador_id; });
        const nom = treb ? treb.nom : 'Desconegut';
        const tipus = treb ? treb.tipus : '-';
        const categoria = treb ? (treb.categoria || '-') : '-';
        const entrada = r.hora_entrada || '-';
        const sortida = r.hora_sortida || '-';
        const persones = r.num_persones || 1;
        const hores = r.hores_treballades ? horesTotalsRegistre(r).toFixed(2) : '-';

        csv += r.data + ';' + nom + ';' + tipus + ';' + categoria + ';' + entrada + ';' + sortida + ';' + persones + ';' + hores + '\n';
    });

    // Descarregar
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'control_horari_laboral_' + dataInici + '_' + dataFi + '.csv';
    a.click();
    URL.revokeObjectURL(url);

    mostrarNotificacio('✅ Exportació laboral completada', 'success');
}

async function exportarControlHorariGestio() {
    const dataInici = document.getElementById('filtro-data-inici')?.value || 
                      document.getElementById('informe-horari-inici')?.value;
    const dataFi = document.getElementById('filtro-data-fi')?.value || 
                   document.getElementById('informe-horari-fi')?.value;

    if (!dataInici || !dataFi) {
        mostrarNotificacio('Cal seleccionar data inici i data fi per exportar', 'error');
        return;
    }

    const dies = Math.ceil((new Date(dataFi) - new Date(dataInici)) / 86400000);
    if (dies > 90) {
        mostrarNotificacio('El període màxim d\'exportació és 90 dies', 'error');
        return;
    }

    const registres = controlHorari;
    if (registres.length === 0) {
        mostrarNotificacio('No hi ha registres per exportar', 'error');
        return;
    }

    let csv = 'Data;Treballador;Tipus;Categoria;Hora Entrada;Hora Sortida;Persones;Hores Totals;Finca;Tasca;Cost\n';

    registres.forEach(function(r) {
        const treb = treballadors.find(function(t) { return t.id === r.treballador_id; });
        const nom = treb ? treb.nom : 'Desconegut';
        const tipus = treb ? treb.tipus : '-';
        const categoria = treb ? (treb.categoria || '-') : '-';
        const entrada = r.hora_entrada || '-';
        const sortida = r.hora_sortida || '-';
        const persones = r.num_persones || 1;
        const finca = r.finca || '-';
        const tasca = tasques.find(function(t) { return t.id === r.tasca_id; });
        const nomTasca = tasca ? tasca.nom : (r.tasca_libre || '-');
        const hores = r.hores_treballades ? horesTotalsRegistre(r).toFixed(2) : '-';
        const cost = r.cost_total ? r.cost_total.toFixed(2) : '-';

        csv += r.data + ';' + nom + ';' + tipus + ';' + categoria + ';' + entrada + ';' + sortida + ';' + persones + ';' + hores + ';' + finca + ';' + nomTasca + ';' + cost + '\n';
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'control_horari_gestio_' + dataInici + '_' + dataFi + '.csv';
    a.click();
    URL.revokeObjectURL(url);

    mostrarNotificacio('✅ Exportació gestió completada', 'success');
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
    const dataAvui = document.getElementById('control-horari-data').value;
    
    if (!treballadorId) return;
    
    // Buscar registre obert (sense sortida)
    const registreObert = controlHorari.find(function(r) {
        return r.treballador_id === treballadorId && 
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
    
    if (registreObert && registreObert.data !== dataAvui) {
        // Entrada oberta d'un dia anterior → Generar incidència
        infoDiv.style.display = 'block';
        infoDiv.innerHTML = '<strong>⚠️ INCIDÈNCIA:</strong> Tens una entrada oberta del dia ' + formatData(registreObert.data) + ' sense sortida. S\'ha generat una incidència per l\'administrador.';
        infoDiv.style.background = '#ffebee';
        
        // Generar incidència automàtica
        try {
            await createIncidencia({
                treballador_id: treballadorId,
                data: registreObert.data,
                tipus: 'sense_sortida',
                estat: 'pendent',
                observacions_treballador: 'Incidència detectada automàticament'
            });
        } catch (error) {
            console.error('Error creant incidència:', error);
        }
        
        // Permetre fitxar entrada nova avui
        groupEntrada.style.display = 'block';
        groupSortida.style.display = 'none';
        groupMotiu.style.display = 'none';
        groupTasca.style.display = 'block';
        groupFinca.style.display = 'block';
        document.getElementById('control-horari-hora-entrada').value = new Date().toTimeString().slice(0,5);
        document.getElementById('control-horari-id').value = '';
        btnFitxar.textContent = '🟢 Fitxar Entrada';
        
    } else if (registreObert && registreObert.data === dataAvui) {
        // Entrada oberta del mateix dia → Fitxar sortida
        infoDiv.style.display = 'block';
        infoDiv.innerHTML = '<strong>⚠️ Tens una entrada oberta:</strong> ' + registreObert.hora_entrada;
        infoDiv.style.background = '#e3f2fd';
        groupEntrada.style.display = 'block';
        groupSortida.style.display = 'block';
        groupMotiu.style.display = 'block';
        groupTasca.style.display = 'none';
        groupTascaLliure.style.display = 'none';
        groupFinca.style.display = 'none';
        document.getElementById('control-horari-hora-entrada').value = registreObert.hora_entrada;
        document.getElementById('control-horari-hora-sortida').value = new Date().toTimeString().slice(0,5);
        document.getElementById('control-horari-id').value = registreObert.id;
        btnFitxar.textContent = '🔴 Fitxar Sortida';
        
    } else {
 // No té entrada oberta → Fitxar entrada
        infoDiv.style.display = 'none';
        groupEntrada.style.display = 'block';
        groupSortida.style.display = 'none';
        groupMotiu.style.display = 'none';
        groupTasca.style.display = 'block';
        groupFinca.style.display = 'block';
        document.getElementById('control-horari-hora-entrada').value = new Date().toTimeString().slice(0,5);
        btnFitxar.textContent = '🟢 Fitxar Entrada';
    }
    
    // Mostrar num_persones i hores editables si és grup temporal
    const treballador = treballadors.find(function(t) { return t.id === treballadorId; });
    if (treballador && treballador.tipus === 'Temporal') {
        document.getElementById('group-num-persones').style.display = 'block';
        // Hores editables per temporers — registren jornada completa d'un cop
        const inputEntrada = document.getElementById('control-horari-hora-entrada');
        const inputSortida = document.getElementById('control-horari-hora-sortida');
        inputEntrada.removeAttribute('readonly');
        inputSortida.removeAttribute('readonly');
        groupSortida.style.display = 'block';
        btnFitxar.textContent = 'Guardar Jornada';
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
    const registre = controlHorari.find(function(r) { return r.id === id; });
    if (!registre) return;

    const treballador = treballadors.find(function(t) { return t.id === registre.treballador_id; });
    const tasca = tasques.find(function(t) { return t.id === registre.tasca_id; });

    let info = '';
    info += '<strong>👤 Treballador:</strong> ' + (treballador ? treballador.nom : '-') + '<br>';
    info += '<strong>📅 Data:</strong> ' + formatData(registre.data) + '<br>';
    info += '<strong>🕐 Entrada:</strong> ' + (registre.hora_entrada || '-') + '<br>';
    info += '<strong>🕐 Sortida:</strong> ' + (registre.hora_sortida || '<span style="color:#ff9800">Pendent</span>') + '<br>';
    info += '<strong>⏱️ Hores:</strong> ' + (registre.hores_treballades ? horesTotalsRegistre(registre).toFixed(2) + 'h' : '-') + '<br>';
    info += '<strong>👥 Persones:</strong> ' + (registre.num_persones || 1) + '<br>';
    info += '<strong>🌱 Tasca:</strong> ' + (tasca ? tasca.nom : (registre.tasca_libre || '-')) + '<br>';
    info += '<strong>🏡 Finca:</strong> ' + (registre.finca || '-') + '<br>';
    info += '<strong>💶 Cost:</strong> ' + (registre.cost_total ? parseFloat(registre.cost_total).toFixed(2) + ' €' : '-') + '<br>';
    if (registre.observacions) {
        info += '<strong>📝 Observacions:</strong> ' + registre.observacions;
    }

    // Reutilitzar modal-incidencia-detall o crear un de temporal
    let modal = document.getElementById('modal-registre-detall');
    if (!modal) {
        const div = document.createElement('div');
        div.innerHTML = '<div id="modal-registre-detall" class="modal" style="display:none;">' +
            '<div class="modal-content" style="max-width:500px;">' +
            '<span class="close" onclick="tancarModal(\'modal-registre-detall\')">&times;</span>' +
            '<h2>Detall Registre</h2>' +
            '<div id="modal-registre-detall-cos"></div>' +
            '<div class="form-actions" style="margin-top:20px;">' +
            '<button class="btn btn-secondary" onclick="tancarModal(\'modal-registre-detall\')">Tancar</button>' +
            '</div></div></div>';
        document.body.appendChild(div.firstElementChild);
        modal = document.getElementById('modal-registre-detall');
    }

    document.getElementById('modal-registre-detall-cos').innerHTML = info;
    modal.style.display = 'block';
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
            let sortida = new Date('2000-01-01 ' + horaSortida);
            
            // Si sortida < entrada, ha creuat mitjanit → afegir 1 dia
            if (sortida < entrada) {
                sortida = new Date('2000-01-02 ' + horaSortida);
            }
            
            const hores = (sortida - entrada) / 3600000;
            
            // Si és UPDATE, agafar num_persones del registre original
            let persones = numPersones;
            if (id) {
                const registreOriginal = controlHorari.find(function(r) { return r.id === id; });
                persones = registreOriginal ? (registreOriginal.num_persones || 1) : 1;
            }
            
            cost = hores * treballador.preu_hora * persones;
        }
    }
    
	const tascaId = document.getElementById('control-horari-tasca').value || null;
    const tascaLliure = document.getElementById('control-horari-tasca-libre').value.trim() || null;

    const dades = {
        hora_sortida: horaSortida,
        motiu_sortida_id: motiuId,
        observacions: document.getElementById('control-horari-observacions').value.trim() || null,
        cost_total: cost,
        tasca_id: tascaId,
        tasca_libre: tascaLliure,
        finca: document.getElementById('control-horari-finca').value || null
    };

    if (!id) {
        // INSERT — afegir camps obligatoris
        dades.data = document.getElementById('control-horari-data').value;
        dades.treballador_id = treballadorId;
        dades.hora_entrada = horaEntrada;
        dades.num_persones = numPersones;
    } else {
        // UPDATE admin — permetre editar hora entrada i data
        dades.hora_entrada = horaEntrada;
        dades.data = document.getElementById('control-horari-data').value;
    }

    try {
        if (id) {
            await updateControlHorari(id, dades);
            mostrarNotificacio('Registre actualitzat correctament', 'success');
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

// ============================================================
// VISTA INCIDÈNCIES
// ============================================================

async function carregarVistaIncidencies() {
    const container = document.getElementById('view-container');
    
    let html = '<div class="view-incidencies">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">';
    html += '<h2>⚠️ Incidències Control Horari</h2>';
    html += '</div>';
    
    html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
    html += '<h3 style="margin-top: 0;">🔍 Filtres</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">';
    html += '<div><label>Treballador:</label><select id="filtro-incidencia-treballador" onchange="aplicarFiltresIncidencies()"><option value="">Tots</option></select></div>';
    html += '<div><label>Estat:</label><select id="filtro-incidencia-estat" onchange="aplicarFiltresIncidencies()"><option value="">Tots</option><option value="pendent">Pendents</option><option value="resolta">Resoltes</option><option value="justificada">Justificades</option></select></div>';
    html += '<div><label>Tipus:</label><select id="filtro-incidencia-tipus" onchange="aplicarFiltresIncidencies()"><option value="">Tots</option><option value="sense_entrada">Sense entrada</option><option value="sense_sortida">Sense sortida</option><option value="jornada_curta">Jornada curta</option><option value="jornada_llarga">Jornada llarga</option></select></div>';
    html += '<div style="align-self: end;"><button class="btn btn-secondary" onclick="netejarFiltresIncidencies()">🗑️ Netejar</button></div>';
    html += '</div></div>';
    
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Data</th><th>Treballador</th><th>Tipus</th><th>Estat</th><th>Observacions</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-incidencies"><tr><td colspan="6">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
    
    html += crearModalIncidencia();
    
    container.innerHTML = html;
    
    await carregarSelectTreballadorsIncidencies();
    await carregarTaulaIncidencies();
}

async function carregarSelectTreballadorsIncidencies() {
    const select = document.getElementById('filtro-incidencia-treballador');
    if (!select) return;
    
    treballadors = await getTreballadors();
    select.innerHTML = '<option value="">Tots</option>';
    treballadors.forEach(function(t) {
        select.innerHTML += '<option value="' + t.id + '">' + t.nom + '</option>';
    });
}

async function carregarTaulaIncidencies() {
    const tbody = document.getElementById('tbody-incidencies');
    if (!tbody) return;
    
    try {
        const filtres = {
            treballadorId: document.getElementById('filtro-incidencia-treballador')?.value || null,
            estat: document.getElementById('filtro-incidencia-estat')?.value || null
        };
        
        incidencies = await getIncidencies(filtres);
        
        // Filtrar per tipus si cal
        const tipusFiltre = document.getElementById('filtro-incidencia-tipus')?.value;
        if (tipusFiltre) {
            incidencies = incidencies.filter(function(i) { return i.tipus === tipusFiltre; });
        }
        
        if (incidencies.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hi ha incidències</td></tr>';
            return;
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        
        tbody.innerHTML = incidencies.map(function(inc) {
            const treballador = treballadors.find(function(t) { return t.id === inc.treballador_id; });
            const nomTreballador = treballador ? treballador.nom : 'Desconegut';
            
            const tipusText = {
                'sense_entrada': 'Sense entrada',
                'sense_sortida': 'Sense sortida',
                'jornada_curta': 'Jornada curta',
                'jornada_llarga': 'Jornada llarga'
            }[inc.tipus] || inc.tipus;
            
            let estatBadge = '';
            if (inc.estat === 'pendent') {
                estatBadge = '<span style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">🔴 Pendent</span>';
            } else if (inc.estat === 'resolta') {
                estatBadge = '<span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✅ Resolta</span>';
            } else if (inc.estat === 'justificada') {
                estatBadge = '<span style="background: #2196f3; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">ℹ️ Justificada</span>';
            }
            
            let accions = '<button class="btn btn-sm btn-primary" onclick="veureIncidencia(\'' + inc.id + '\')">👁️</button> ';
            if (podeEditar && inc.estat === 'pendent') {
                accions += '<button class="btn btn-sm btn-success" onclick="resoldrIncidencia(\'' + inc.id + '\')">✔️ Resoldre</button> ';
            }
            if (podeEliminar) {
                accions += '<button class="btn btn-sm btn-danger" onclick="eliminarIncidencia(\'' + inc.id + '\')">🗑️</button>';
            }
            
            return '<tr><td><strong>' + formatData(inc.data) + '</strong></td><td>' + nomTreballador + '</td><td>' + tipusText + '</td><td>' + estatBadge + '</td><td>' + (inc.observacions_treballador || '-') + '</td><td>' + accions + '</td></tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6">Error carregant dades</td></tr>';
    }
}

function aplicarFiltresIncidencies() {
    carregarTaulaIncidencies();
}

function netejarFiltresIncidencies() {
    document.getElementById('filtro-incidencia-treballador').value = '';
    document.getElementById('filtro-incidencia-estat').value = '';
    document.getElementById('filtro-incidencia-tipus').value = '';
    carregarTaulaIncidencies();
}

function crearModalIncidencia() {
    return '<div id="modal-incidencia" class="modal" style="display: none;"><div class="modal-content" style="max-width: 600px;">' +
        '<span class="close" onclick="tancarModal(\'modal-incidencia\')">&times;</span>' +
        '<h2 id="modal-incidencia-titol">Resoldre Incidència</h2>' +
        '<form id="form-incidencia" onsubmit="guardarIncidencia(event)">' +
        '<input type="hidden" id="incidencia-id">' +
        '<div id="info-incidencia" style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;"></div>' +
        '<div class="form-group"><label>Acció</label><select id="incidencia-accio" onchange="canviarAccioIncidencia()" required>' +
        '<option value="">Seleccionar...</option>' +
        '<option value="emplenar">Emplenar hora faltant</option>' +
        '<option value="justificar">Marcar com justificada</option>' +
        '</select></div>' +
        '<div class="form-group" id="group-hora-faltant" style="display:none;"><label>Hora faltant</label><input type="time" id="incidencia-hora"></div>' +
        '<div class="form-group"><label>Observacions Admin</label><textarea id="incidencia-observacions-admin" rows="3" placeholder="Motiu de la resolució..."></textarea></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-incidencia\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary">Guardar</button></div></form></div></div>';
}

async function veureIncidencia(id) {
    const incidencia = incidencies.find(function(i) { return i.id === id; });
    if (!incidencia) return;
    
    const treballador = treballadors.find(function(t) { return t.id === incidencia.treballador_id; });
    const registre = controlHorari.find(function(r) { return r.treballador_id === incidencia.treballador_id && r.data === incidencia.data; });
    
    let info = '<strong>📅 Data:</strong> ' + formatData(incidencia.data) + '<br>';
    info += '<strong>👤 Treballador:</strong> ' + (treballador ? treballador.nom : 'Desconegut') + '<br>';
    info += '<strong>⚠️ Tipus:</strong> ' + incidencia.tipus + '<br>';
    if (registre) {
        info += '<strong>🕐 Entrada:</strong> ' + (registre.hora_entrada || '-') + '<br>';
        info += '<strong>🕐 Sortida:</strong> ' + (registre.hora_sortida || '-') + '<br>';
    }
    if (incidencia.observacions_treballador) {
        info += '<strong>📝 Observacions treballador:</strong> ' + incidencia.observacions_treballador + '<br>';
    }
    if (incidencia.observacions_admin) {
        info += '<strong>💼 Observacions admin:</strong> ' + incidencia.observacions_admin;
    }
    
    alert(info);
}

async function resoldrIncidencia(id) {
    const incidencia = incidencies.find(function(i) { return i.id === id; });
    if (!incidencia) return;
    
    const treballador = treballadors.find(function(t) { return t.id === incidencia.treballador_id; });
    const registre = controlHorari.find(function(r) { return r.treballador_id === incidencia.treballador_id && r.data === incidencia.data; });
    
    let info = '<strong>📅 ' + formatData(incidencia.data) + '</strong><br>';
    info += '<strong>👤 ' + (treballador ? treballador.nom : 'Desconegut') + '</strong><br>';
    info += '<strong>⚠️ ' + incidencia.tipus + '</strong>';
    if (registre) {
        info += '<br>Entrada: ' + (registre.hora_entrada || '-') + ' | Sortida: ' + (registre.hora_sortida || '-');
    }
    
    document.getElementById('info-incidencia').innerHTML = info;
    document.getElementById('modal-incidencia-titol').textContent = 'Resoldre Incidència';
    document.getElementById('incidencia-id').value = incidencia.id;
    document.getElementById('incidencia-accio').value = '';
    document.getElementById('incidencia-hora').value = '';
    document.getElementById('incidencia-observacions-admin').value = '';
    document.getElementById('group-hora-faltant').style.display = 'none';
    
    document.getElementById('modal-incidencia').style.display = 'block';
}

function canviarAccioIncidencia() {
    const accio = document.getElementById('incidencia-accio').value;
    const groupHora = document.getElementById('group-hora-faltant');
    
    if (accio === 'emplenar') {
        groupHora.style.display = 'block';
        document.getElementById('incidencia-hora').required = true;
    } else {
        groupHora.style.display = 'none';
        document.getElementById('incidencia-hora').required = false;
    }
}

async function guardarIncidencia(event) {
    event.preventDefault();
    
    const id = document.getElementById('incidencia-id').value;
    const accio = document.getElementById('incidencia-accio').value;
    const hora = document.getElementById('incidencia-hora').value;
    const observacionsAdmin = document.getElementById('incidencia-observacions-admin').value.trim();
    
    const incidencia = incidencies.find(function(i) { return i.id === id; });
    if (!incidencia) return;
    
    try {
        if (accio === 'emplenar') {
            // Emplenar hora faltant al registre
            const registre = controlHorari.find(function(r) { 
                return r.treballador_id === incidencia.treballador_id && r.data === incidencia.data; 
            });
            
            if (registre) {
                const dades = {};
                if (incidencia.tipus === 'sense_entrada') {
                    dades.hora_entrada = hora;
                } else if (incidencia.tipus === 'sense_sortida') {
                    dades.hora_sortida = hora;
                }
                
                await updateControlHorari(registre.id, dades);
            }
            
            // Marcar incidència com resolta
            await updateIncidencia(id, {
                estat: 'resolta',
                observacions_admin: observacionsAdmin,
                resolt_per: currentUser.id
            });
            
            mostrarNotificacio('Incidència resolta correctament', 'success');
            
        } else if (accio === 'justificar') {
            // Marcar com justificada
            await updateIncidencia(id, {
                estat: 'justificada',
                observacions_admin: observacionsAdmin,
                resolt_per: currentUser.id
            });
            
            mostrarNotificacio('Incidència justificada correctament', 'success');
        }
        
        tancarModal('modal-incidencia');
        await carregarTaulaIncidencies();
        
    } catch (error) {
        console.error('Error guardant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarIncidencia(id) {
    if (!confirm('Segur que vols eliminar aquesta incidència?')) return;
    
    try {
        await deleteIncidencia(id);
        mostrarNotificacio('Incidència eliminada correctament', 'success');
        await carregarTaulaIncidencies();
    } catch (error) {
        console.error('Error eliminant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// VISTA ABSÈNCIES
// ============================================================

async function carregarVistaAbsencies() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    
    let html = '<div class="view-absencies">';
    html += '<div style="display: flex; justify-content: space-between; margin-bottom: 20px;">';
    html += '<h2>📅 Absències i Vacances</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalAbsencia()">➕ Sol·licitar Absència</button>';
    }
    html += '</div>';
    
    html += '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">';
    html += '<h3 style="margin-top: 0;">🔍 Filtres</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 15px;">';
    html += '<div><label>Treballador:</label><select id="filtro-absencia-treballador" onchange="aplicarFiltresAbsencies()"><option value="">Tots</option></select></div>';
    html += '<div><label>Estat:</label><select id="filtro-absencia-estat" onchange="aplicarFiltresAbsencies()"><option value="">Tots</option><option value="pendent">Pendents</option><option value="aprovada">Aprovades</option><option value="rebutjada">Rebutjades</option></select></div>';
    html += '<div><label>Tipus:</label><select id="filtro-absencia-tipus" onchange="aplicarFiltresAbsencies()"><option value="">Tots</option><option value="vacances">Vacances</option><option value="baixa">Baixa mèdica</option><option value="permis">Permís</option><option value="altres">Altres</option></select></div>';
    html += '<div style="align-self: end;"><button class="btn btn-secondary" onclick="netejarFiltresAbsencies()">🗑️ Netejar</button></div>';
    html += '</div></div>';
    
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Treballador</th><th>Tipus</th><th>Data Inici</th><th>Data Fi</th><th>Dies</th><th>Estat</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-absencies"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';
    
    html += crearModalAbsencia();
    
    container.innerHTML = html;
    
    await carregarSelectTreballadorsAbsencies();
    await carregarTaulaAbsencies();
}

async function carregarSelectTreballadorsAbsencies() {
    const select = document.getElementById('filtro-absencia-treballador');
    if (!select) return;
    
    treballadors = await getTreballadors();
    select.innerHTML = '<option value="">Tots</option>';
    treballadors.forEach(function(t) {
        select.innerHTML += '<option value="' + t.id + '">' + t.nom + '</option>';
    });
}

async function carregarTaulaAbsencies() {
    const tbody = document.getElementById('tbody-absencies');
    if (!tbody) return;
    
    try {
        const filtres = {
            treballadorId: document.getElementById('filtro-absencia-treballador')?.value || null,
            estat: document.getElementById('filtro-absencia-estat')?.value || null,
            tipus: document.getElementById('filtro-absencia-tipus')?.value || null
        };
        
        absencies = await getAbsencies(filtres);
        
        if (absencies.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha absències</td></tr>';
            return;
        }
        
        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        const role = currentUserProfile ? currentUserProfile.role : '';
        const podeAprovar = role === 'admin' || role === 'editor';
        
        tbody.innerHTML = absencies.map(function(abs) {
            const treballador = treballadors.find(function(t) { return t.id === abs.treballador_id; });
            const nomTreballador = treballador ? treballador.nom : 'Desconegut';
            
            const tipusText = {
                'vacances': '🏖️ Vacances',
                'baixa': '🤒 Baixa mèdica',
                'permis': '📋 Permís',
                'altres': '📌 Altres'
            }[abs.tipus] || abs.tipus;
            
            let estatBadge = '';
            if (abs.estat === 'pendent') {
                estatBadge = '<span style="background: #ff9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">⏳ Pendent</span>';
            } else if (abs.estat === 'aprovada') {
                estatBadge = '<span style="background: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✅ Aprovada</span>';
            } else if (abs.estat === 'rebutjada') {
                estatBadge = '<span style="background: #f44336; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">❌ Rebutjada</span>';
            }
            
            let accions = '<button class="btn btn-sm btn-primary" onclick="veureAbsencia(\'' + abs.id + '\')">👁️</button> ';
            if (podeAprovar && abs.estat === 'pendent') {
                accions += '<button class="btn btn-sm btn-success" onclick="aprovarAbsencia(\'' + abs.id + '\')">✅</button> ';
                accions += '<button class="btn btn-sm btn-danger" onclick="rebutjarAbsencia(\'' + abs.id + '\')">❌</button> ';
            }
            if (podeEliminar) {
                accions += '<button class="btn btn-sm btn-danger" onclick="eliminarAbsencia(\'' + abs.id + '\')">🗑️</button>';
            }
            
            return '<tr><td><strong>' + nomTreballador + '</strong></td><td>' + tipusText + '</td><td>' + formatData(abs.data_inici) + '</td><td>' + formatData(abs.data_fi) + '</td><td>' + (abs.dies || '-') + '</td><td>' + estatBadge + '</td><td>' + accions + '</td></tr>';
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="7">Error carregant dades</td></tr>';
    }
}

function aplicarFiltresAbsencies() {
    carregarTaulaAbsencies();
}

function netejarFiltresAbsencies() {
    document.getElementById('filtro-absencia-treballador').value = '';
    document.getElementById('filtro-absencia-estat').value = '';
    document.getElementById('filtro-absencia-tipus').value = '';
    carregarTaulaAbsencies();
}

function crearModalAbsencia() {
    return '<div id="modal-absencia" class="modal" style="display: none;"><div class="modal-content" style="max-width: 600px;">' +
        '<span class="close" onclick="tancarModal(\'modal-absencia\')">&times;</span>' +
        '<h2 id="modal-absencia-titol">Sol·licitar Absència</h2>' +
        '<form id="form-absencia" onsubmit="guardarAbsencia(event)">' +
        '<input type="hidden" id="absencia-id">' +
        '<div class="form-group"><label>Treballador *</label><select id="absencia-treballador" required><option value="">Seleccionar...</option></select></div>' +
        '<div class="form-group"><label>Tipus *</label><select id="absencia-tipus" required>' +
        '<option value="">Seleccionar...</option>' +
        '<option value="vacances">🏖️ Vacances</option>' +
        '<option value="baixa">🤒 Baixa mèdica</option>' +
        '<option value="permis">📋 Permís retribuït</option>' +
        '<option value="altres">📌 Altres</option>' +
        '</select></div>' +
        '<div class="form-group"><label>Data Inici *</label><input type="date" id="absencia-data-inici" required onchange="calcularDiesAbsencia()"></div>' +
        '<div class="form-group"><label>Data Fi *</label><input type="date" id="absencia-data-fi" required onchange="calcularDiesAbsencia()"></div>' +
        '<div class="form-group"><label>Dies: <span id="absencia-dies-calculats">0</span></label></div>' +
        '<div class="form-group"><label>Motiu</label><textarea id="absencia-motiu" rows="2" placeholder="Motiu de l\'absència..."></textarea></div>' +
        '<div class="form-group"><label>Observacions</label><textarea id="absencia-observacions" rows="2"></textarea></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-absencia\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary">Sol·licitar</button></div></form></div></div>';
}

async function obrirModalAbsencia() {
    document.getElementById('modal-absencia-titol').textContent = 'Sol·licitar Absència';
    document.getElementById('form-absencia').reset();
    document.getElementById('absencia-id').value = '';
    document.getElementById('absencia-dies-calculats').textContent = '0';
    
    const select = document.getElementById('absencia-treballador');
    select.innerHTML = '<option value="">Seleccionar...</option>';
    treballadors.filter(function(t) { return t.actiu; }).forEach(function(t) {
        select.innerHTML += '<option value="' + t.id + '">' + t.nom + '</option>';
    });
    
    document.getElementById('modal-absencia').style.display = 'block';
}

function calcularDiesAbsencia() {
    const inici = document.getElementById('absencia-data-inici').value;
    const fi = document.getElementById('absencia-data-fi').value;
    
    if (!inici || !fi) return;
    
    const dataInici = new Date(inici);
    const dataFi = new Date(fi);
    const difMs = dataFi - dataInici;
    const dies = Math.ceil(difMs / (1000 * 60 * 60 * 24)) + 1;
    
    document.getElementById('absencia-dies-calculats').textContent = dies > 0 ? dies : 0;
}

async function veureAbsencia(id) {
    const absencia = absencies.find(function(a) { return a.id === id; });
    if (!absencia) return;

    const treballador = treballadors.find(function(t) { return t.id === absencia.treballador_id; });

    let modal = document.getElementById('modal-registre-detall');
    if (!modal) {
        const div = document.createElement('div');
        div.innerHTML = '<div id="modal-registre-detall" class="modal" style="display:none;">' +
            '<div class="modal-content" style="max-width:500px;">' +
            '<span class="close" onclick="tancarModal(\'modal-registre-detall\')">&times;</span>' +
            '<h2>Detall Absència</h2>' +
            '<div id="modal-registre-detall-cos"></div>' +
            '<div class="form-actions" style="margin-top:20px;">' +
            '<button class="btn btn-secondary" onclick="tancarModal(\'modal-registre-detall\')">Tancar</button>' +
            '</div></div></div>';
        document.body.appendChild(div.firstElementChild);
        modal = document.getElementById('modal-registre-detall');
    }

    let info = '';
    info += '<p><strong>👤 Treballador:</strong> ' + (treballador ? treballador.nom : '-') + '</p>';
    info += '<p><strong>📅 Dates:</strong> ' + formatData(absencia.data_inici) + ' - ' + formatData(absencia.data_fi) + '</p>';
    info += '<p><strong>📊 Dies:</strong> ' + (absencia.dies || 0) + '</p>';
    info += '<p><strong>🏷️ Tipus:</strong> ' + absencia.tipus + '</p>';
    if (absencia.motiu) info += '<p><strong>📝 Motiu:</strong> ' + absencia.motiu + '</p>';
    if (absencia.observacions) info += '<p><strong>💬 Observacions:</strong> ' + absencia.observacions + '</p>';
    info += '<p><strong>📍 Estat:</strong> ' + absencia.estat + '</p>';

    document.getElementById('modal-registre-detall-cos').innerHTML = info;
    modal.style.display = 'block';
}

async function guardarAbsencia(event) {
    event.preventDefault();
    
    const id = document.getElementById('absencia-id').value;
    const inici = document.getElementById('absencia-data-inici').value;
    const fi = document.getElementById('absencia-data-fi').value;
    
    const dataInici = new Date(inici);
    const dataFi = new Date(fi);
    const difMs = dataFi - dataInici;
    const dies = Math.ceil(difMs / (1000 * 60 * 60 * 24)) + 1;
    
    const dades = {
        treballador_id: document.getElementById('absencia-treballador').value,
        tipus: document.getElementById('absencia-tipus').value,
        data_inici: inici,
        data_fi: fi,
        dies: dies,
        motiu: document.getElementById('absencia-motiu').value.trim() || null,
        observacions: document.getElementById('absencia-observacions').value.trim() || null,
        estat: 'pendent'
    };
    
    try {
        if (id) {
            await updateAbsencia(id, dades);
            mostrarNotificacio('Absència actualitzada correctament', 'success');
        } else {
            await createAbsencia(dades);
            mostrarNotificacio('Absència sol·licitada correctament', 'success');
        }
        
        tancarModal('modal-absencia');
        await carregarTaulaAbsencies();
        
    } catch (error) {
        console.error('Error guardant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function aprovarAbsencia(id) {
    if (!confirm('Segur que vols aprovar aquesta absència?')) return;
    
    try {
        await updateAbsencia(id, {
            estat: 'aprovada',
            aprovat_per: currentUser.id
        });
        mostrarNotificacio('Absència aprovada correctament', 'success');
        await carregarTaulaAbsencies();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function rebutjarAbsencia(id) {
    const motiu = prompt('Motiu del rebuig (opcional):');
    
    try {
        await updateAbsencia(id, {
            estat: 'rebutjada',
            observacions: motiu || 'Rebutjada per administrador',
            aprovat_per: currentUser.id
        });
        mostrarNotificacio('Absència rebutjada', 'success');
        await carregarTaulaAbsencies();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarAbsencia(id) {
    if (!confirm('Segur que vols eliminar aquesta absència?')) return;
    
    try {
        await deleteAbsencia(id);
        mostrarNotificacio('Absència eliminada correctament', 'success');
        await carregarTaulaAbsencies();
    } catch (error) {
        console.error('Error eliminant:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}
// ============================================================
// VISTA TREBALLADOR SIMPLE
// ============================================================

async function carregarVistaTreballadorSimple() {
    const container = document.getElementById('view-container');
    
    // Buscar treballador per auth_user_id
    const treballador = treballadors.find(function(t) { 
        return t.auth_user_id === currentUser.id; 
    });
    
    if (!treballador) {
        container.innerHTML = '<div style="padding: 40px; text-align: center;"><h2>⚠️ No tens perfil de treballador assignat</h2><p>Contacta amb l\'administrador.</p></div>';
        return;
    }
    
    const avui = new Date().toISOString().split('T')[0];
    const diesSetmana = ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'];
    const mesos = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
    const data = new Date();
    const diaSetmana = diesSetmana[data.getDay()];
    const dia = data.getDate();
    const mes = mesos[data.getMonth()];
    
    // Buscar registre obert
    const registreObert = controlHorari.find(function(r) {
        return r.treballador_id === treballador.id && 
               r.data === avui && 
               r.hora_entrada && 
               !r.hora_sortida;
    });
    
    let html = '<div class="view-treballador-simple" style="max-width: 600px; margin: 0 auto; padding: 20px;">';
    
    // Capçalera
    html += '<div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">';
    html += '<h1 style="margin: 0; font-size: 28px;">👤 ' + treballador.nom + '</h1>';
    html += '<p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">' + diaSetmana + ', ' + dia + ' de ' + mes + '</p>';
    html += '</div>';
    
    // Botó fitxar + veu
    html += '<div id="zona-fitxatge" style="margin-bottom: 40px;">';
    html += '<div style="text-align:center;margin-top:20px;">';
    html += '<button id="btn-veu" onclick="iniciarVeu(\'' + treballador.id + '\')" ';
    html += 'style="width:80px;height:80px;border-radius:50%;border:none;background:#4caf50;color:white;font-size:32px;cursor:pointer;box-shadow:0 4px 15px rgba(76,175,80,0.4);transition:all 0.2s;">🎤</button>';
    html += '<p style="margin-top:10px;color:#666;font-size:14px;">Prem per parlar</p>';
    html += '</div>';
    html += '</div>';
    
    // Els meus registres
    html += '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;">';
    html += '<h3 style="margin-top: 0; color: #333;">📊 Els meus registres</h3>';
    html += '<div id="registres-treballador"></div>';
    html += '</div>';
	
	// Les meves absències
    html += '<div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">';
    html += '<h3 style="margin: 0; color: #333;">📅 Les meves absències</h3>';
    html += '<button class="btn btn-primary" onclick="obrirModalSolicitarAbsencia(\'' + treballador.id + '\')">➕ Sol·licitar</button>';
    html += '</div>';
    html += '<div id="absencies-treballador"></div>';
    html += '</div>';

    html += '</div>';

    // Modals
    html += crearModalFitxatgeTreballador();
	html += crearModalAbsencia();
	
    container.innerHTML = html;

    // Carregar estat fitxatge
    await actualitzarZonaFitxatge(treballador.id, registreObert);

    // Carregar registres
    await carregarRegistresTreballador(treballador.id);

    // Carregar absències
    await carregarAbsenciesTreballador(treballador.id);
}

async function actualitzarZonaFitxatge(treballadorId, registreObert) {
    const zona = document.getElementById('zona-fitxatge');
    if (!zona) return;
    
    let html = '';
    
    if (registreObert) {
        // Té entrada oberta → Mostrar botó sortida
        html += '<div style="text-align: center; background: #ffebee; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 2px solid #ef5350;">';
        html += '<p style="margin: 0; font-size: 16px; color: #c62828;">⚠️ Tens una entrada oberta des de les <strong>' + registreObert.hora_entrada + '</strong></p>';
        html += '</div>';
        
        html += '<button onclick="fitxarSortidaTreballador(\'' + treballadorId + '\')" style="';
        html += 'width: 100%; ';
        html += 'padding: 40px; ';
        html += 'font-size: 32px; ';
        html += 'font-weight: bold; ';
        html += 'background: linear-gradient(135deg, #f44336 0%, #e91e63 100%); ';
        html += 'color: white; ';
        html += 'border: none; ';
        html += 'border-radius: 16px; ';
        html += 'cursor: pointer; ';
        html += 'box-shadow: 0 6px 20px rgba(244, 67, 54, 0.4); ';
        html += 'transition: all 0.3s; ';
        html += 'text-transform: uppercase; ';
        html += 'letter-spacing: 2px;';
        html += '" ';
        html += 'onmouseover="this.style.transform=\'scale(1.02)\'; this.style.boxShadow=\'0 8px 25px rgba(244, 67, 54, 0.5)\';" ';
        html += 'onmouseout="this.style.transform=\'scale(1)\'; this.style.boxShadow=\'0 6px 20px rgba(244, 67, 54, 0.4)\';">';
        html += '🔴 Fitxar Sortida';
		html += '</button>';
        html += '<div style="margin-top:12px;text-align:center;">' +
            '<button id="btn-sortida-anticipada" ' +
            'onclick="obrirModalSortidaAnticipada(\'' + treballadorId + '\')" ' +
            'style="padding:12px 24px;font-size:14px;background:#ff9800;color:white;' +
            'border:none;border-radius:8px;cursor:pointer;">' +
            '⏩ Sortida anticipada (metge, tràmits...)</button></div>';
    } else {
        // No té entrada → Mostrar botó entrada
        html += '<button onclick="fitxarEntradaTreballador(\'' + treballadorId + '\')" style="';
        html += 'width: 100%; ';
        html += 'padding: 40px; ';
        html += 'font-size: 32px; ';
        html += 'font-weight: bold; ';
        html += 'background: linear-gradient(135deg, #4caf50 0%, #8bc34a 100%); ';
        html += 'color: white; ';
        html += 'border: none; ';
        html += 'border-radius: 16px; ';
        html += 'cursor: pointer; ';
        html += 'box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4); ';
        html += 'transition: all 0.3s; ';
        html += 'text-transform: uppercase; ';
        html += 'letter-spacing: 2px;';
        html += '" ';
        html += 'onmouseover="this.style.transform=\'scale(1.02)\'; this.style.boxShadow=\'0 8px 25px rgba(76, 175, 80, 0.5)\';" ';
        html += 'onmouseout="this.style.transform=\'scale(1)\'; this.style.boxShadow=\'0 6px 20px rgba(76, 175, 80, 0.4)\';">';
        html += '🟢 Fitxar Entrada';
        html += '</button>';
    }
    
		// Botó veu — només si no té entrada
	if (!registreObert) {
        html += '<div style="text-align:center;margin-top:20px;">';
        html += '<button id="btn-veu" onclick="iniciarVeu(\'' + treballadorId + '\')" ';
        html += 'style="width:70px;height:70px;border-radius:50%;border:none;background:#673ab7;color:white;font-size:28px;cursor:pointer;box-shadow:0 4px 15px rgba(103,58,183,0.4);">🎤</button>';
        html += '<p style="margin-top:8px;color:#666;font-size:13px;">Parla per fitxar</p>';
        html += '</div>';
    }
    
    zona.innerHTML = html;
}

async function carregarRegistresTreballador(treballadorId) {
    const container = document.getElementById('registres-treballador');
    if (!container) return;
    
    try {
        // Carregar últims 7 dies
        const registres = controlHorari.filter(function(r) {
            return r.treballador_id === treballadorId;
        }).slice(0, 7);
        
        if (registres.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">Encara no tens registres</p>';
            return;
        }
        
        let html = '<table style="width: 100%; border-collapse: collapse;">';
        html += '<thead><tr style="border-bottom: 2px solid #eee;"><th style="padding: 10px; text-align: left;">Data</th><th style="padding: 10px; text-align: center;">Entrada</th><th style="padding: 10px; text-align: center;">Sortida</th><th style="padding: 10px; text-align: center;">Hores</th></tr></thead>';
        html += '<tbody>';
        
        registres.forEach(function(r) {
            const sortidaText = r.hora_sortida || '<span style="color: #ff9800;">Pendent</span>';
            const horesText = r.hores_treballades ? r.hores_treballades.toFixed(2) + 'h' : '-';
            
            html += '<tr style="border-bottom: 1px solid #f5f5f5;">';
            html += '<td style="padding: 12px;"><strong>' + formatData(r.data) + '</strong></td>';
            html += '<td style="padding: 12px; text-align: center;">' + (r.hora_entrada || '-') + '</td>';
            html += '<td style="padding: 12px; text-align: center;">' + sortidaText + '</td>';
            html += '<td style="padding: 12px; text-align: center;"><strong>' + horesText + '</strong></td>';
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p style="color: red;">Error carregant registres</p>';
    }
}

function crearModalFitxatgeTreballador() {
    return '<div id="modal-fitxatge-treballador" class="modal" style="display: none;"><div class="modal-content" style="max-width: 500px;">' +
        '<span class="close" onclick="tancarModal(\'modal-fitxatge-treballador\')">&times;</span>' +
        '<h2 id="modal-fitxatge-titol">Fitxar</h2>' +
        '<form id="form-fitxatge-treballador" onsubmit="guardarFitxatgeTreballador(event)">' +
        '<input type="hidden" id="fitxatge-treballador-id">' +
        '<input type="hidden" id="fitxatge-registre-id">' +
        '<input type="hidden" id="fitxatge-tipus">' +
        '<div id="info-fitxatge-treballador" style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-size: 18px;"></div>' +
        '<div class="form-group" id="group-tasca-treballador"><label>Tasca *</label><select id="fitxatge-tasca" required><option value="">Seleccionar...</option></select></div>' +
        '<div class="form-group" id="group-tasca-libre-treballador" style="display:none;"><label>Descripció</label><input type="text" id="fitxatge-tasca-libre"></div>' +
        '<div class="form-group" id="group-finca-treballador"><label>Finca</label><select id="fitxatge-finca"><option value="">Sense finca</option></select></div>' +
        '<div class="form-group" id="group-motiu-treballador" style="display:none;"><label>Motiu sortida</label><select id="fitxatge-motiu"><option value="">Sense motiu</option></select></div>' +
        '<div class="form-actions"><button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-fitxatge-treballador\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary">Confirmar</button></div></form></div></div>';
}

async function fitxarEntradaTreballador(treballadorId) {
    document.getElementById('modal-fitxatge-titol').textContent = '🟢 Fitxar Entrada';
    document.getElementById('fitxatge-treballador-id').value = treballadorId;
    document.getElementById('fitxatge-registre-id').value = '';
    document.getElementById('fitxatge-tipus').value = 'entrada';
    
    const horaActual = new Date().toTimeString().slice(0,5);
    document.getElementById('info-fitxatge-treballador').innerHTML = '<strong>Hora entrada:</strong> ' + horaActual;
    
    // Mostrar tasca i finca
    document.getElementById('group-tasca-treballador').style.display = 'block';
    document.getElementById('group-finca-treballador').style.display = 'block';
    document.getElementById('group-motiu-treballador').style.display = 'none';
    
    // Carregar tasques
    const selectTasca = document.getElementById('fitxatge-tasca');
    selectTasca.innerHTML = '<option value="">Seleccionar...</option>';
    tasques.forEach(function(t) {
        selectTasca.innerHTML += '<option value="' + t.id + '">' + t.nom + '</option>';
    });
    
    // Carregar finques
    const selectFinca = document.getElementById('fitxatge-finca');
    selectFinca.innerHTML = '<option value="">Sense finca</option>';
    finques.forEach(function(f) {
        selectFinca.innerHTML += '<option value="' + f + '">' + f + '</option>';
    });
    
    // Carregar motius
    const selectMotiu = document.getElementById('fitxatge-motiu');
    selectMotiu.innerHTML = '<option value="">Sense motiu</option>';
    motiusAbsencia.forEach(function(m) {
        selectMotiu.innerHTML += '<option value="' + m.id + '">' + m.nom + '</option>';
    });
    
    document.getElementById('modal-fitxatge-treballador').style.display = 'block';
}

async function fitxarSortidaTreballador(treballadorId) {
    const avui = new Date().toISOString().split('T')[0];
    const registreObert = controlHorari.find(function(r) {
        return r.treballador_id === treballadorId && 
               r.data === avui && 
               r.hora_entrada && 
               !r.hora_sortida;
    });
    
    if (!registreObert) {
        mostrarNotificacio('No tens cap entrada oberta', 'error');
        return;
    }
    
    document.getElementById('modal-fitxatge-titol').textContent = '🔴 Fitxar Sortida';
    document.getElementById('fitxatge-treballador-id').value = treballadorId;
    document.getElementById('fitxatge-registre-id').value = registreObert.id;
    document.getElementById('fitxatge-tipus').value = 'sortida';
    
    const horaActual = new Date().toTimeString().slice(0,5);
    document.getElementById('info-fitxatge-treballador').innerHTML = '<strong>Entrada:</strong> ' + registreObert.hora_entrada + ' <strong>→ Sortida:</strong> ' + horaActual;
    
    // Ocultar tasca i finca, mostrar motiu
	document.getElementById('group-tasca-treballador').style.display = 'none';
	document.getElementById('group-finca-treballador').style.display = 'none';
	document.getElementById('group-motiu-treballador').style.display = 'block';

// Treure required dels camps ocults
document.getElementById('fitxatge-tasca').required = false;
    
    // Carregar motius
    const selectMotiu = document.getElementById('fitxatge-motiu');
    selectMotiu.innerHTML = '<option value="">Sense motiu</option>';
    motiusAbsencia.forEach(function(m) {
        selectMotiu.innerHTML += '<option value="' + m.id + '">' + m.nom + '</option>';
    });
    
    document.getElementById('modal-fitxatge-treballador').style.display = 'block';
}

async function carregarVistaInformes() {
    const container = document.getElementById('view-container');
 
    const ara = new Date();
    const mes = ara.getMonth() + 1;
    const campanyadefecte = mes >= 10 ? ara.getFullYear() + 1 : ara.getFullYear();
 
    let html = '<div class="view-informes">';
    html += '<h2>📊 Informes</h2>';
 
    // BLOC LLIBRE FERTILITZACIONS
    html += '<div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-bottom:20px;">';
    html += '<h3 style="margin-top:0;">📗 Llibre de Fertilitzacions</h3>';
    html += '<div style="display:flex;gap:15px;align-items:flex-end;flex-wrap:wrap;">';
 
    // Selector campanya
    html += '<div><label>Campanya</label><select id="informe-fert-any" style="padding:8px;border:1px solid #ddd;border-radius:4px;">';
    [2024, 2025, 2026, 2027].forEach(function(c) {
        html += '<option value="' + c + '"' + (c === campanyadefecte ? ' selected' : '') + '>' + c + '</option>';
    });
    html += '</select></div>';
 
    // Selector finca
    html += '<div><label>Finca</label><select id="informe-fert-finca" style="padding:8px;border:1px solid #ddd;border-radius:4px;min-width:200px;"><option value="">Totes</option>';
    finques.forEach(function(f) { html += '<option value="' + f + '">' + f + '</option>'; });
    html += '</select></div>';
 
    html += '<button class="btn btn-primary" onclick="generarLlibreFertilitzacions()">📗 Generar Llibre</button>';
    html += '<button class="btn btn-secondary" onclick="exportarLlibreFertilitzacionsCSV()">⬇️ Exportar CSV</button>';
    html += '</div>';
    html += '<div id="taula-llibre-fertilitzacions" style="margin-top:20px;"></div>';
    html += '</div>';
 
    // BLOC DAN
    html += '<div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.1);margin-bottom:20px;">';
    html += '<h3 style="margin-top:0;">📋 DAN — Declaració Activitat Notificable</h3>';
    html += '<div style="display:flex;gap:15px;align-items:flex-end;flex-wrap:wrap;">';
 
    // Selector campanya
    html += '<div><label>Campanya</label><select id="informe-dan-any" style="padding:8px;border:1px solid #ddd;border-radius:4px;">';
    [2024, 2025, 2026, 2027].forEach(function(c) {
        html += '<option value="' + c + '"' + (c === campanyadefecte ? ' selected' : '') + '>' + c + '</option>';
    });
    html += '</select></div>';
 
    html += '<button class="btn btn-primary" onclick="generarDAN()">📋 Generar DAN</button>';
    html += '<button class="btn btn-secondary" onclick="exportarDANCSV()">⬇️ Exportar CSV</button>';
    html += '</div>';
    html += '<div id="taula-dan" style="margin-top:20px;"></div>';
    html += '</div>';
 
    // BLOC CONTROL HORARI
    html += '<div style="background:white;border-radius:12px;padding:20px;box-shadow:0 2px 10px rgba(0,0,0,0.1);">';
    html += '<h3 style="margin-top:0;">⏱️ Control Horari</h3>';
    html += '<div style="display:flex;gap:15px;align-items:flex-end;flex-wrap:wrap;">';
    html += '<div><label>Data Inici</label><input type="date" id="informe-horari-inici" style="padding:8px;border:1px solid #ddd;border-radius:4px;"></div>';
    html += '<div><label>Data Fi</label><input type="date" id="informe-horari-fi" style="padding:8px;border:1px solid #ddd;border-radius:4px;"></div>';
    html += '<button class="btn btn-secondary" onclick="exportarControlHorariLaboral()">📋 Exportar Laboral</button>';
    html += '<button class="btn btn-secondary" onclick="exportarControlHorariGestio()">📊 Exportar Gestió</button>';
    html += '</div>';
    html += '</div>';
 
    html += '</div>';
    container.innerHTML = html;
}

// ============================================================
// HELPER - Dates per campanya
// ============================================================
 
// ============================================================
// FIX — Llibre de Fertilitzacions (campanya agrícola Oct→Set)
// Substitueix les funcions equivalents a app_v8.js
//
// Canvis respecte la versió original:
//  1) Filtre de dates: ara usa getDatesCampanyaInformes(any) en lloc
//     de any+'-01-01' / any+'-12-31' (any natural).
//  2) Resolució de parcel·la: ja NO depèn de l'array global `parcelles`
//     (que només té carregada la campanya de gestió en curs). Es fa
//     un fetch exprés de les parcel·les de les DUES campanyes naturals
//     que pot tocar el rang (any-1 i any), i es resol amb un Map local.
// ============================================================

// (getDatesCampanyaInformes ja existeix igual que abans, sense canvis)
function getDatesCampanyaInformes(campanya) {
    return {
        dataInici: (campanya - 1) + '-10-01',
        dataFinal: campanya + '-09-30'
    };
}

/**
 * Carrega les parcel·les de les campanyes naturals (any-1) i (any)
 * — les úniques que poden aparèixer en un rang Oct(any-1)→Set(any) —
 * i retorna un Map<id, parcella> per a resolució O(1).
 * No toca ni depèn de l'array global `parcelles`.
 */
async function getParcellesPerInformeCampanyaAgricola(any) {
    const campanyaInt = parseInt(any);
    const { data, error } = await supabaseClient
        .from('parcelles')
        .select('*')
        .in('campanya', [campanyaInt - 1, campanyaInt]);
    if (error) throw error;

    const mapa = new Map();
    (data || []).forEach(function(p) { mapa.set(p.id, p); });
    return mapa;
}

async function generarLlibreFertilitzacions() {
    const any = document.getElementById('informe-fert-any').value;
    const finca = document.getElementById('informe-fert-finca').value;
    const container = document.getElementById('taula-llibre-fertilitzacions');

    container.innerHTML = '<p>Carregant...</p>';

    try {
        const { dataInici, dataFinal } = getDatesCampanyaInformes(any);

        const [{ data, error }, parcellesMapa] = await Promise.all([
            supabaseClient
                .from('fertilitzacions')
                .select('*')
                .gte('data', dataInici)
                .lte('data', dataFinal)
                .order('data'),
            getParcellesPerInformeCampanyaAgricola(any)
        ]);
        if (error) throw error;

        let registres = data || [];

        if (finca) {
            registres = registres.filter(function(r) {
                const p = parcellesMapa.get(r.parcella_id);
                return p && p.finca === finca;
            });
        }

        if (registres.length === 0) {
            container.innerHTML = '<p style="color:#999;">No hi ha fertilitzacions per aquesta campanya/finca (' + dataInici + ' a ' + dataFinal + ')</p>';
            return;
        }

        let html = '<div class="table-container"><table class="data-table">';
        html += '<thead><tr>';
        html += '<th>Data</th><th>Finca</th><th>Parcel·la</th><th>SIGPAC</th><th>Cultiu</th><th>Varietat</th>';
        html += '<th>Sup. (Ha)</th><th>Producte</th><th>Tipus</th><th>Dosi</th><th>Unitat</th>';
        html += '<th>Qtitat Total</th><th>N (kg)</th><th>P (kg)</th><th>K (kg)</th><th>Mètode</th><th>Operador</th>';
        html += '</tr></thead><tbody>';

        let totalN = 0, totalP = 0, totalK = 0, totalSup = 0;

        registres.forEach(function(r) {
            const p = parcellesMapa.get(r.parcella_id);
            const prod = fertilitzants.find(function(f) { return f.id === r.producte_id; });

            const fincaNom = p ? (p.finca || '-') : '-';
            const parcellaNom = p ? (p.nom || '-') : '-';
            const sigpac = p ? (p.sigpac || '-') : '-';
            const cultiu = p ? (p.cultiu || '-') : '-';
            const varietat = p ? (p.varietat || '-') : '-';
            const sup = parseFloat(r.superficie_tractada) || 0;
            const nomProd = prod ? prod.nom : '-';
            const tipusProd = prod ? (prod.tipus || '-') : '-';
            const dosi = parseFloat(r.dosi) || 0;
            const usTotal = dosi * sup;
            const nKg = prod ? (parseFloat(prod.n) || 0) * usTotal / 100 : 0;
            const pKg = prod ? (parseFloat(prod.p) || 0) * usTotal / 100 : 0;
            const kKg = prod ? (parseFloat(prod.k) || 0) * usTotal / 100 : 0;

            totalN += nKg;
            totalP += pKg;
            totalK += kKg;
            totalSup += sup;

            html += '<tr>';
            html += '<td>' + formatData(r.data) + '</td>';
            html += '<td>' + fincaNom + '</td>';
            html += '<td>' + parcellaNom + '</td>';
            html += '<td>' + sigpac + '</td>';
            html += '<td>' + cultiu + '</td>';
            html += '<td>' + varietat + '</td>';
            html += '<td>' + sup.toFixed(2) + '</td>';
            html += '<td>' + nomProd + '</td>';
            html += '<td>' + tipusProd + '</td>';
            html += '<td>' + (r.dosi || '-') + '</td>';
            html += '<td>' + (r.unitat || '-') + '</td>';
            html += '<td>' + usTotal.toFixed(2) + '</td>';
            html += '<td>' + nKg.toFixed(2) + '</td>';
            html += '<td>' + pKg.toFixed(2) + '</td>';
            html += '<td>' + kKg.toFixed(2) + '</td>';
            html += '<td>' + (r.metode || '-') + '</td>';
            html += '<td>' + (r.operador || '-') + '</td>';
            html += '</tr>';
        });

        html += '<tr style="background:#f1f8e9;font-weight:bold;">';
        html += '<td colspan="6"><strong>TOTALS</strong></td>';
        html += '<td>' + totalSup.toFixed(2) + '</td>';
        html += '<td colspan="5"></td>';
        html += '<td>' + totalN.toFixed(2) + '</td>';
        html += '<td>' + totalP.toFixed(2) + '</td>';
        html += '<td>' + totalK.toFixed(2) + '</td>';
        html += '<td colspan="2"></td>';
        html += '</tr>';

        html += '</tbody></table></div>';
        html += '<p style="color:#999;font-size:12px;margin-top:8px;">' + registres.length + ' registres — Campanya ' + any + ' (' + dataInici + ' a ' + dataFinal + ')</p>';
        container.innerHTML = html;

    } catch (error) {
        container.innerHTML = '<p style="color:red;">Error: ' + error.message + '</p>';
    }
}

async function exportarLlibreFertilitzacionsCSV() {
    const any = document.getElementById('informe-fert-any').value;
    const finca = document.getElementById('informe-fert-finca').value;

    try {
        const { dataInici, dataFinal } = getDatesCampanyaInformes(any);

        const [{ data, error }, parcellesMapa] = await Promise.all([
            supabaseClient
                .from('fertilitzacions')
                .select('*')
                .gte('data', dataInici)
                .lte('data', dataFinal)
                .order('data'),
            getParcellesPerInformeCampanyaAgricola(any)
        ]);
        if (error) throw error;

        let registres = data || [];
        if (finca) {
            registres = registres.filter(function(r) {
                const p = parcellesMapa.get(r.parcella_id);
                return p && p.finca === finca;
            });
        }

        if (registres.length === 0) { mostrarNotificacio('No hi ha dades per exportar', 'error'); return; }

        let csv = 'Data;Finca;Parcel·la;SIGPAC;Cultiu;Varietat;Superfície (Ha);Producte;Tipus;Dosi;Unitat;Quantitat Total;N (kg);P (kg);K (kg);Mètode;Operador\n';

        registres.forEach(function(r) {
            const p = parcellesMapa.get(r.parcella_id);
            const prod = fertilitzants.find(function(f) { return f.id === r.producte_id; });
            const sup = parseFloat(r.superficie_tractada) || 0;
            const dosi = parseFloat(r.dosi) || 0;
            const usTotal = dosi * sup;
            const nKg = prod ? (parseFloat(prod.n) || 0) * usTotal / 100 : 0;
            const pKg = prod ? (parseFloat(prod.p) || 0) * usTotal / 100 : 0;
            const kKg = prod ? (parseFloat(prod.k) || 0) * usTotal / 100 : 0;
            csv += [
                r.data,
                p ? (p.finca || '') : '',
                p ? (p.nom || '') : '',
                p ? (p.sigpac || '') : '',
                p ? (p.cultiu || '') : '',
                p ? (p.varietat || '') : '',
                sup.toFixed(2),
                prod ? prod.nom : '',
                prod ? (prod.tipus || '') : '',
                r.dosi || '',
                r.unitat || '',
                usTotal.toFixed(2),
                nKg.toFixed(2),
                pKg.toFixed(2),
                kKg.toFixed(2),
                r.metode || '',
                r.operador || ''
            ].join(';') + '\n';
        });

        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'llibre_fertilitzacions_' + any + (finca ? '_' + finca : '') + '.csv';
        a.click();
        URL.revokeObjectURL(url);
        mostrarNotificacio('✅ Exportació completada', 'success');

    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}
let compresFacturesTotes = [];

async function carregarVistaCompres() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');

    let html = '<div class="view-compres">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:20px;">';
    html += '<h2>🛒 Compres</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalCompra()">➕ Nova Factura</button>';
    }
    html += '</div>';

    html += '<div id="resum-compres" style="margin-bottom:20px;"></div>';

    // Filtres
    html += '<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px;">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:15px;">';
    html += '<div><label>Any</label><select id="compres-filtre-any" onchange="carregarTaulaCompres()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">';
    const anyActual = new Date().getFullYear();
    for (let a = anyActual; a >= anyActual - 3; a--) {
        const sel = a === anyActual ? 'selected' : '';
        html += '<option value="' + a + '" ' + sel + '>' + a + '</option>';
    }
    html += '</select></div>';
    html += '<div><label>Proveïdor</label><input type="text" id="compres-filtre-proveidor" oninput="filtrarTaulaCompres()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="Tots"></div>';
    html += '<div><label>Nº Factura</label><input type="text" id="compres-filtre-factura" oninput="filtrarTaulaCompres()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="Totes"></div>';
    html += '<div style="align-self:end;"><button class="btn btn-secondary" onclick="netejarFiltresCompres()">🗑️ Netejar</button></div>';
    html += '</div></div>';

    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Data</th><th>Nº Factura</th><th>Proveïdor</th><th>Import Net</th><th>IVA</th><th>Total</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-compres"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';

    container.innerHTML = html;
    await carregarTaulaCompres();
}

async function carregarTaulaCompres() {
    const tbody = document.getElementById('tbody-compres');
    if (!tbody) return;

    try {
        const any = document.getElementById('compres-filtre-any')?.value;
        let query = supabaseClient.from('compres_factures').select('*').order('data', { ascending: false });
        if (any) query = query.gte('data', any + '-01-01').lte('data', any + '-12-31');
        const { data, error } = await query;
        if (error) throw error;
        compresFacturesTotes = data || [];
        filtrarTaulaCompres();
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7">Error: ' + error.message + '</td></tr>';
    }
}

function filtrarTaulaCompres() {
    const tbody = document.getElementById('tbody-compres');
    if (!tbody) return;

    const proveidor = document.getElementById('compres-filtre-proveidor')?.value?.trim().toLowerCase();
    const factura = document.getElementById('compres-filtre-factura')?.value?.trim().toLowerCase();

    let registres = compresFacturesTotes;
    if (proveidor) registres = registres.filter(function(r) { return r.proveidor && r.proveidor.toLowerCase().includes(proveidor); });
    if (factura) registres = registres.filter(function(r) { return r.num_factura && r.num_factura.toLowerCase().includes(factura); });

    if (registres.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha factures</td></tr>';
        document.getElementById('resum-compres').innerHTML = '';
        return;
    }

    const totalNet = registres.reduce(function(s, r) { return s + (parseFloat(r.import_net) || 0); }, 0);
    const totalIva = registres.reduce(function(s, r) { return s + (parseFloat(r.import_iva) || 0); }, 0);
    const totalTotal = registres.reduce(function(s, r) { return s + (parseFloat(r.import_total) || 0); }, 0);
    document.getElementById('resum-compres').innerHTML =
        '<div style="display:flex;gap:15px;flex-wrap:wrap;">' +
        '<div style="background:#e8f5e9;padding:12px;border-radius:8px;">💶 Import net: <strong>' + totalNet.toFixed(2) + ' €</strong></div>' +
        '<div style="background:#fff3e0;padding:12px;border-radius:8px;">🧾 IVA: <strong>' + totalIva.toFixed(2) + ' €</strong></div>' +
        '<div style="background:#e3f2fd;padding:12px;border-radius:8px;">💶 Total: <strong>' + totalTotal.toFixed(2) + ' €</strong></div>' +
        '</div>';

    const podeEditar = hasPermission('update');
    const podeEliminar = hasPermission('delete');

    tbody.innerHTML = registres.map(function(r) {
        let accions = '<button class="btn btn-sm btn-primary" onclick="veureCompra(\'' + r.id + '\')">👁️</button> ';
        if (podeEditar) accions += '<button class="btn btn-sm btn-secondary" onclick="editarCompra(\'' + r.id + '\')">✏️</button> ';
        if (podeEliminar) accions += '<button class="btn btn-sm btn-danger" onclick="eliminarCompra(\'' + r.id + '\')">🗑️</button>';
        return '<tr>' +
            '<td>' + formatData(r.data) + '</td>' +
            '<td>' + (r.num_factura || '-') + '</td>' +
            '<td>' + (r.proveidor || '-') + '</td>' +
            '<td>' + (r.import_net ? parseFloat(r.import_net).toFixed(2) + ' €' : '-') + '</td>' +
            '<td>' + (r.import_iva ? parseFloat(r.import_iva).toFixed(2) + ' €' : '-') + '</td>' +
            '<td><strong>' + (r.import_total ? parseFloat(r.import_total).toFixed(2) + ' €' : '-') + '</strong></td>' +
            '<td>' + accions + '</td>' +
            '</tr>';
    }).join('');
}

function netejarFiltresCompres() {
    document.getElementById('compres-filtre-proveidor').value = '';
    document.getElementById('compres-filtre-factura').value = '';
    filtrarTaulaCompres();
}

async function eliminarCompra(id) {
    if (!confirm('Segur que vols eliminar aquesta factura i totes les seves línies?')) return;
    try {
		// Eliminar moviments d'estoc de la factura
        await supabaseClient.from('estoc_moviments')
            .delete()
            .eq('referencia_id', id)
            .eq('tipus_moviment', 'compra');
        await deleteCompresLinies(id);
        await deleteCompraFactura(id);
        mostrarNotificacio('Factura eliminada', 'success');
        await carregarTaulaCompres();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

function obrirModalCompra() {
    const modal = crearModalCompra();
    document.getElementById('modal-compra-titol').textContent = 'Nova Factura';
    document.getElementById('form-compra-capçalera').reset();
    document.getElementById('compra-id').value = '';
    document.getElementById('compra-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('compres-linies-container').innerHTML = '';
    document.getElementById('compra-resum-net').textContent = '0,00 €';
    document.getElementById('compra-resum-iva').textContent = '0,00 €';
    document.getElementById('compra-resum-total').textContent = '0,00 €';
    afegirLiniaCompra();
    document.getElementById('modal-compra').style.display = 'block';
}

function crearModalCompra() {
    const existent = document.getElementById('modal-compra');
    if (existent) existent.remove();
    const div = document.createElement('div');
    div.innerHTML = 
        '<div id="modal-compra" class="modal" style="display:none;">' +
        '<div class="modal-content" style="max-width:900px;">' +
        '<span class="close" onclick="tancarModal(\'modal-compra\')">&times;</span>' +
        '<h2 id="modal-compra-titol">Nova Factura</h2>' +
        '<form id="form-compra-capçalera">' +
        '<input type="hidden" id="compra-id">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:15px;margin-bottom:15px;">' +
		'<div class="form-group"><label>Data *</label><input type="date" id="compra-data" required></div>' +
		'<div class="form-group"><label>Nº Factura *</label><input type="text" id="compra-num-factura" required></div>' +
		'<div class="form-group"><label>Proveïdor *</label><input type="text" id="compra-proveidor" required list="llista-proveidors"><datalist id="llista-proveidors"></datalist></div>' +
		'<div class="form-group"><label>Tipus Preu</label><select id="compra-tipus-preu" onchange="recalcularTotesLinies()">' +
		'<option value="envàs">€/envàs</option>' +
		'<option value="unitat">€/unitat</option>' +
		'</select></div>' +
		'</div>' +
		'<div class="form-group" style="margin-bottom:15px;"><label>Observacions</label><textarea id="compra-observacions" rows="2" style="width:100%;"></textarea></div>' +
        '</form>' +

        '<h3 style="margin-top:20px;">📦 Línies de Factura</h3>' +
        '<div style="overflow-x:auto;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;" id="taula-linies-compra">' +
        '<thead><tr style="background:#f5f5f5;">' +
        '<th style="padding:8px;text-align:left;">Article</th>' +
        '<th style="padding:8px;text-align:left;">Descripció</th>' +
        '<th style="padding:8px;text-align:left;">Albarà</th>' +
        '<th style="padding:8px;text-align:left;">Data Alb.</th>' +
        '<th style="padding:8px;text-align:right;">Qtitat</th>' +
        '<th style="padding:8px;text-align:right;">Mida</th>' +
		'<th style="padding:8px;text-align:right;">Preu</th>' +
        '<th style="padding:8px;text-align:right;">Dto %</th>' +
        '<th style="padding:8px;text-align:right;">Net</th>' +
        '<th style="padding:8px;text-align:right;">IVA %</th>' +
        '<th style="padding:8px;text-align:right;">Total</th>' +
        '<th style="padding:8px;"></th>' +
        '</tr></thead>' +
		'<tbody id="compres-linies-container"></tbody>' +
		'</table></div>' +
		'<datalist id="llista-productes-compra">' + getProductesDatalist() + '</datalist>' +

        '<div style="margin-top:10px;">' +
        '<button type="button" class="btn btn-secondary" onclick="afegirLiniaCompra()">➕ Afegir línia</button>' +
        '</div>' +

        '<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-top:20px;display:flex;gap:20px;justify-content:flex-end;">' +
        '<div>Import Net: <strong id="compra-resum-net">0,00 €</strong></div>' +
        '<div>IVA: <strong id="compra-resum-iva">0,00 €</strong></div>' +
        '<div>Total: <strong id="compra-resum-total">0,00 €</strong></div>' +
        '</div>' +

        '<div class="form-actions" style="margin-top:20px;">' +
        '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-compra\')">Cancel·lar</button>' +
        '<button type="button" class="btn btn-primary" onclick="guardarCompra()">Guardar</button>' +
        '</div>' +
        '</div></div>';
    document.body.appendChild(div.firstElementChild);

    // Carregar proveïdors al datalist
    const datalist = document.getElementById('llista-proveidors');
    const proveidorsUnics = [...new Set(compresFacturesTotes.map(function(f) { return f.proveidor; }).filter(Boolean))];
    proveidorsUnics.forEach(function(p) {
        datalist.innerHTML += '<option value="' + p + '">';
    });
}

function recalcularTotesLinies() {
    document.querySelectorAll('#compres-linies-container tr').forEach(function(tr) {
        const idx = tr.id.replace('linia-compra-', '');
        calcularLiniaCompra(idx);
    });
}

let liniaCompraComptador = 0;

function afegirLiniaCompra(dades) {
    liniaCompraComptador++;
    const idx = liniaCompraComptador;
    const tbody = document.getElementById('compres-linies-container');
    const tr = document.createElement('tr');
    tr.id = 'linia-compra-' + idx;
    tr.innerHTML = 
        '<td><input type="text" value="' + (dades?.article || '') + '" style="width:80px;padding:4px;border:1px solid #ddd;border-radius:4px;" onchange="this.closest(\'tr\').dataset.article=this.value"></td>' +
        '<td><input type="text" value="' + (dades?.descripcio || '') + '" style="width:150px;padding:4px;border:1px solid #ddd;border-radius:4px;" list="llista-productes-compra"></td>' +
        '<td><input type="text" value="' + (dades?.albara || '') + '" style="width:70px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>' +
        '<td><input type="date" value="' + (dades?.data_albara || '') + '" style="width:120px;padding:4px;border:1px solid #ddd;border-radius:4px;"></td>' +
        '<td><input type="number" value="' + (dades?.quantitat || '') + '" min="0" step="0.001" style="width:70px;padding:4px;border:1px solid #ddd;border-radius:4px;text-align:right;" oninput="calcularLiniaCompra(' + idx + ')"></td>' +
		'<td><input type="number" value="' + (dades?.mida_recipient || '1') + '" min="0" step="0.001" style="width:60px;padding:4px;border:1px solid #ddd;border-radius:4px;text-align:right;" oninput="calcularLiniaCompra(' + idx + ')"></td>' +
		'<td><input type="number" value="' + (dades?.preu || '') + '" min="0" step="0.0001" style="width:80px;padding:4px;border:1px solid #ddd;border-radius:4px;text-align:right;" oninput="calcularLiniaCompra(' + idx + ')"></td>' +
        '<td><input type="number" value="' + (dades?.descompte || '0') + '" min="0" max="100" step="0.01" style="width:60px;padding:4px;border:1px solid #ddd;border-radius:4px;text-align:right;" oninput="calcularLiniaCompra(' + idx + ')"></td>' +
        '<td style="text-align:right;padding:4px;"><strong id="linia-net-' + idx + '">0,00</strong></td>' +
        '<td><input type="number" value="' + (dades?.iva || '10') + '" min="0" max="100" step="1" style="width:55px;padding:4px;border:1px solid #ddd;border-radius:4px;text-align:right;" oninput="calcularLiniaCompra(' + idx + ')"></td>' +
        '<td style="text-align:right;padding:4px;"><strong id="linia-total-' + idx + '">0,00</strong></td>' +
        '<td><button type="button" onclick="eliminarLiniaCompra(' + idx + ')" style="background:none;border:none;color:#f44336;cursor:pointer;font-size:16px;">✕</button></td>';
    tbody.appendChild(tr);
    if (dades) calcularLiniaCompra(idx);
}

function getProductesDatalist() {
    const productes = [...fitosanitaris.map(function(f) { return f.nom; }), ...fertilitzants.map(function(f) { return f.nom; })];
    return productes.map(function(p) { return '<option value="' + p + '">'; }).join('');
}

function calcularLiniaCompra(idx) {
    const tr = document.getElementById('linia-compra-' + idx);
    if (!tr) return;
    const inputs = tr.querySelectorAll('input[type="number"]');
    const qtitat = parseFloat(inputs[0].value) || 0;
    const mida = parseFloat(inputs[1].value) || 1;
    const preu = parseFloat(inputs[2].value) || 0;
    const dto = parseFloat(inputs[3].value) || 0;
    const iva = parseFloat(inputs[4].value) || 10;
    
    const tipusPreu = document.getElementById('compra-tipus-preu')?.value || 'envàs';
    const net = tipusPreu === 'envàs'
        ? qtitat * preu * (1 - dto / 100)
        : qtitat * mida * preu * (1 - dto / 100);
    
    const total = net * (1 + iva / 100);
    document.getElementById('linia-net-' + idx).textContent = net.toFixed(2);
    document.getElementById('linia-total-' + idx).textContent = total.toFixed(2);
    calcularResumCompra();
}

function calcularResumCompra() {
    let totalNet = 0, totalTotal = 0;
    document.querySelectorAll('#compres-linies-container tr').forEach(function(tr) {
        const netEl = tr.querySelector('[id^="linia-net-"]');
        const totalEl = tr.querySelector('[id^="linia-total-"]');
        if (netEl) totalNet += parseFloat(netEl.textContent) || 0;
        if (totalEl) totalTotal += parseFloat(totalEl.textContent) || 0;
    });
    const totalIva = totalTotal - totalNet;
    document.getElementById('compra-resum-net').textContent = totalNet.toFixed(2) + ' €';
    document.getElementById('compra-resum-iva').textContent = totalIva.toFixed(2) + ' €';
    document.getElementById('compra-resum-total').textContent = totalTotal.toFixed(2) + ' €';
}

function eliminarLiniaCompra(idx) {
    const tr = document.getElementById('linia-compra-' + idx);
    if (tr) { tr.remove(); calcularResumCompra(); }
}

async function guardarCompra() {
    const data = document.getElementById('compra-data').value;
    const numFactura = document.getElementById('compra-num-factura').value.trim();
    const proveidor = document.getElementById('compra-proveidor').value.trim();

    if (!data || !numFactura || !proveidor) {
        mostrarNotificacio('Cal omplir data, nº factura i proveïdor', 'error');
        return;
    }

    // Recollir línies
    const linies = [];
    let ordre = 1;
    document.querySelectorAll('#compres-linies-container tr').forEach(function(tr) {
        const inputs = tr.querySelectorAll('input');
        const numInputs = tr.querySelectorAll('input[type="number"]');
        const qtitat = parseFloat(numInputs[0].value) || 0;
        const mida = parseFloat(numInputs[1].value) || 1;
        const preu = parseFloat(numInputs[2].value) || 0;
        const dto = parseFloat(numInputs[3].value) || 0;
        const iva = parseFloat(numInputs[4].value) || 10;
        if (qtitat === 0) return;
        const net = parseFloat(tr.querySelector('[id^="linia-net-"]')?.textContent) || 0;
        const total = parseFloat(tr.querySelector('[id^="linia-total-"]')?.textContent) || 0;

        // Detectar producte vinculat
        const descripcio = inputs[1].value.trim();
        let producteId = null;
        let tipusProducte = 'altres';
        const fito = fitosanitaris.find(function(f) { return f.nom === descripcio; });
        const fert = fertilitzants.find(function(f) { return f.nom === descripcio; });
        if (fito) { producteId = fito.id; tipusProducte = 'fitosanitari'; }
        else if (fert) { producteId = fert.id; tipusProducte = 'fertilitzant'; }
        else if (descripcio) tipusProducte = 'primera_materia';

       linies.push({
            article: inputs[0].value.trim() || null,
            descripcio: descripcio || null,
            albara: inputs[2].value.trim() || null,
            data_albara: inputs[3].value || null,
            quantitat: qtitat,
            mida_recipient: mida,
            preu: preu,
            descompte: dto,
            net: net,
            iva: iva,
            import_iva: total - net,
            total: total,
            producte_id: producteId,
            tipus_producte: tipusProducte,
            ordre: ordre++
        });
    });

    if (linies.length === 0) {
        mostrarNotificacio('Cal afegir almenys una línia', 'error');
        return;
    }

    const totalNet = linies.reduce(function(s, l) { return s + l.net; }, 0);
    const totalTotal = linies.reduce(function(s, l) { return s + l.total; }, 0);

    const factura = {
        data: data,
        num_factura: numFactura,
        proveidor: proveidor,
        observacions: document.getElementById('compra-observacions').value.trim() || null,
        import_net: totalNet,
        import_iva: totalTotal - totalNet,
        import_total: totalTotal,
		tipus_preu: document.getElementById('compra-tipus-preu').value,
    };

    try {
        const id = document.getElementById('compra-id').value;
        let facturaId;
        if (id) {
            await updateCompraFactura(id, factura);
            await deleteCompresLinies(id);
            facturaId = id;
        } else {
            const nova = await createCompraFactura(factura);
            facturaId = nova.id;
        }

        // Insertar línies
        for (let i = 0; i < linies.length; i++) {
            linies[i].factura_id = facturaId;
            await createCompraLinia(linies[i]);
        }

		// Eliminar moviments d'estoc antics d'aquesta factura
        await supabaseClient.from('estoc_moviments')
            .delete()
            .eq('referencia_id', facturaId)
            .eq('tipus_moviment', 'compra');

        // Generar moviments d'estoc
        for (let i = 0; i < linies.length; i++) {
            const linia = linies[i];
            if (!linia.producte_id) continue;
            const producte = linia.tipus_producte === 'fitosanitari' 
                ? fitosanitaris.find(function(f) { return f.id === linia.producte_id; })
                : fertilitzants.find(function(f) { return f.id === linia.producte_id; });
            const quantitatTotal = (linia.quantitat || 0) * (linia.mida_recipient || 1);
            await supabaseClient.from('estoc_moviments').insert([{
                data: factura.data,
                producte_id: linia.producte_id,
                tipus_producte: linia.tipus_producte,
                tipus_moviment: 'compra',
                quantitat: quantitatTotal,
                unitat: producte ? (producte.unitat_stock || 'L') : 'L',
                referencia_id: facturaId,
                observacions: 'Factura ' + factura.num_factura + ' — ' + (linia.descripcio || ''),
                created_by: currentUser ? currentUser.id : null
            }]);
        }

        mostrarNotificacio('✅ Factura guardada correctament', 'success');
        mostrarNotificacio('✅ Factura guardada correctament', 'success');
        tancarModal('modal-compra');
        await carregarTaulaCompres();

    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function veureCompra(id) {
    await editarCompra(id, true);
}

async function editarCompra(id, solaLectura) {
    crearModalCompra();
    const { data: factura, error } = await supabaseClient.from('compres_factures').select('*').eq('id', id).single();
    if (error) return;
    const linies = await getCompresLinies(id);

    document.getElementById('modal-compra-titol').textContent = solaLectura ? 'Veure Factura' : 'Editar Factura';
    document.getElementById('compra-id').value = factura.id;
    document.getElementById('compra-data').value = factura.data || '';
    document.getElementById('compra-num-factura').value = factura.num_factura || '';
    document.getElementById('compra-proveidor').value = factura.proveidor || '';
    document.getElementById('compra-observacions').value = factura.observacions || '';
    document.getElementById('compres-linies-container').innerHTML = '';
	document.getElementById('compra-tipus-preu').value = factura.tipus_preu || 'envàs';
	liniaCompraComptador = 0;

    linies.forEach(function(l) { afegirLiniaCompra(l); });
    if (linies.length === 0) afegirLiniaCompra();

    calcularResumCompra();
    document.getElementById('modal-compra').style.display = 'block';
}

async function carregarVistaGasoil() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');

    let html = '<div class="view-gasoil">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:20px;">';
    html += '<h2>⛽ Gasoil</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalGasoil()">➕ Nou Registre</button>';
    }
    html += '</div>';

    // Resum
    html += '<div id="resum-gasoil" style="margin-bottom:20px;"></div>';

    // Filtres
    html += '<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px;">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:15px;">';
    html += '<div><label>Any</label><select id="gasoil-filtre-any" onchange="carregarTaulaGasoil()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">';
    const anyActual = new Date().getFullYear();
    for (let a = anyActual; a >= anyActual - 3; a--) {
        const sel = a === anyActual ? 'selected' : '';
        html += '<option value="' + a + '" ' + sel + '>' + a + '</option>';
    }
    html += '</select></div>';
    html += '<div><label>Proveïdor</label><input type="text" id="gasoil-filtre-proveidor" oninput="filtrarTaulaGasoil()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;" placeholder="Tots"></div>';
    html += '<div><label>Activitat</label><select id="gasoil-filtre-activitat" onchange="filtrarTaulaGasoil()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">';
    html += '<option value="">Totes</option><option value="F">🍑 F — Fruita</option><option value="PS">🚜 PS — Prestació de Serveis</option>';
    html += '</select></div>';
    html += '<div style="align-self:end;"><button class="btn btn-secondary" onclick="netejarFiltresGasoil()">🗑️ Netejar</button></div>';
    html += '</div></div>';

    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Data</th><th>Activitat</th><th>Proveïdor</th><th>nº Factura</th><th>Litres</th><th>Preu/L</th><th>IVA %</th><th>Import Net</th><th>Import Total</th><th>Accions</th></tr></thead>';
	html += '<tbody id="tbody-gasoil"><tr><td colspan="10">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';

    html += crearModalGasoil();
    container.innerHTML = html;
    await carregarTaulaGasoil();
}

let gasoilTots = [];

async function carregarTaulaGasoil() {
    const tbody = document.getElementById('tbody-gasoil');
    if (!tbody) return;

    try {
        const any = document.getElementById('gasoil-filtre-any')?.value;

        let query = supabaseClient.from('gasoil').select('*').order('data', { ascending: false });
        if (any) query = query.gte('data', any + '-01-01').lte('data', any + '-12-31');

        const { data, error } = await query;
        if (error) throw error;
        gasoilTots = data || [];
        filtrarTaulaGasoil();

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="10">Error: ' + error.message + '</td></tr>';
    }
}

function badgeTipusActivitat(tipus) {
    if (tipus === 'PS') {
        return '<span style="background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;">🚜 PS</span>';
    }
    return '<span style="background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:600;">🍑 F</span>';
}

function filtrarTaulaGasoil() {
    const tbody = document.getElementById('tbody-gasoil');
    if (!tbody) return;

    const proveidor = document.getElementById('gasoil-filtre-proveidor')?.value?.trim();
    const activitat = document.getElementById('gasoil-filtre-activitat')?.value;
    let registres = gasoilTots;

    if (proveidor) {
        registres = registres.filter(function(r) {
            return r.proveidor && r.proveidor.toLowerCase().includes(proveidor.toLowerCase());
        });
    }

    if (activitat) {
        registres = registres.filter(function(r) {
            return (r.tipus_activitat || 'F') === activitat;
        });
    }

    if (registres.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No hi ha registres</td></tr>';
        document.getElementById('resum-gasoil').innerHTML = '';
        return;
    }

    // Resum
    const totalLitres = registres.reduce(function(s, r) { return s + (parseFloat(r.litres) || 0); }, 0);
    const totalNet = registres.reduce(function(s, r) { return s + (parseFloat(r.import_net) || 0); }, 0);
    const totalTotal = registres.reduce(function(s, r) { return s + (parseFloat(r.import_total) || 0); }, 0);
    document.getElementById('resum-gasoil').innerHTML =
        '<div style="display:flex;gap:15px;flex-wrap:wrap;">' +
        '<div style="background:#fff3e0;padding:12px;border-radius:8px;">⛽ Total: <strong>' + totalLitres.toFixed(2) + ' L</strong></div>' +
        '<div style="background:#e8f5e9;padding:12px;border-radius:8px;">💶 Import net: <strong>' + totalNet.toFixed(2) + ' €</strong></div>' +
        '<div style="background:#e3f2fd;padding:12px;border-radius:8px;">💶 Import total: <strong>' + totalTotal.toFixed(2) + ' €</strong></div>' +
        '</div>';

    const podeEditar = hasPermission('update');
    const podeEliminar = hasPermission('delete');

    tbody.innerHTML = registres.map(function(r) {
        let accions = '<button class="btn btn-sm btn-primary" onclick="veureGasoil(\'' + r.id + '\')">👁️</button> ';
        if (podeEditar) accions += '<button class="btn btn-sm btn-secondary" onclick="editarGasoil(\'' + r.id + '\')">✏️</button> ';
        if (podeEliminar) accions += '<button class="btn btn-sm btn-danger" onclick="eliminarGasoil(\'' + r.id + '\')">🗑️</button>';
        return '<tr>' +
            '<td>' + formatData(r.data) + '</td>' +
            '<td>' + badgeTipusActivitat(r.tipus_activitat) + '</td>' +
            '<td>' + (r.proveidor || '-') + '</td>' +
            '<td>' + (r.num_factura || '-') + '</td>' +
            '<td>' + (parseFloat(r.litres) || 0).toFixed(2) + ' L</td>' +
            '<td>' + (r.preu_unitari ? parseFloat(r.preu_unitari).toFixed(4) + ' €' : '-') + '</td>' +
            '<td>' + (r.iva || 21) + '%</td>' +
            '<td>' + (r.import_net ? parseFloat(r.import_net).toFixed(2) + ' €' : '-') + '</td>' +
            '<td>' + (r.import_total ? parseFloat(r.import_total).toFixed(2) + ' €' : '-') + '</td>' +
            '<td>' + accions + '</td>' +
            '</tr>';
    }).join('');
}

function netejarFiltresGasoil() {
    document.getElementById('gasoil-filtre-proveidor').value = '';
    document.getElementById('gasoil-filtre-activitat').value = '';
    carregarTaulaGasoil();
}

function crearModalGasoil() {
    return '<div id="modal-gasoil" class="modal" style="display:none;">' +
        '<div class="modal-content" style="max-width:500px;">' +
        '<span class="close" onclick="tancarModal(\'modal-gasoil\')">&times;</span>' +
        '<h2 id="modal-gasoil-titol">Nou Registre Gasoil</h2>' +
        '<form id="form-gasoil" onsubmit="guardarGasoil(event)">' +
        '<input type="hidden" id="gasoil-id">' +
        '<div class="form-group"><label>Data *</label><input type="date" id="gasoil-data" required></div>' +
        '<div class="form-group"><label>Proveïdor</label><input type="text" id="gasoil-proveidor"></div>' +
        '<div class="form-group"><label>Activitat *</label><select id="gasoil-tipus-activitat" required>' +
        '<option value="F">🍑 F — Fruita</option>' +
        '<option value="PS">🚜 PS — Prestació de Serveis (moviments de terres)</option>' +
        '</select></div>' +
        '<div class="form-group"><label>Litres *</label><input type="number" id="gasoil-litres" required min="0" step="0.01" onchange="calcularImportGasoil()"></div>' +
        '<div class="form-group"><label>Preu unitari (€/L) *</label><input type="number" id="gasoil-preu" required min="0" step="0.0001" onchange="calcularImportGasoil()"></div>' +
        '<div class="form-group"><label>IVA %</label><input type="number" id="gasoil-iva" value="21" min="0" step="1" onchange="calcularImportGasoil()"></div>' +
        '<div class="form-group"><label>Import Net: <strong id="gasoil-import-net-calc">0,00 €</strong></label></div>' +
        '<div class="form-group"><label>Import IVA: <strong id="gasoil-import-iva-calc">0,00 €</strong></label></div>' +
        '<div class="form-group"><label>Import Total: <strong id="gasoil-import-total-calc">0,00 €</strong></label></div>' +
		'<div class="form-group"><label>Nº Factura</label><input type="text" id="gasoil-num-factura"></div>' +
        '<div class="form-group"><label>Observacions</label><textarea id="gasoil-observacions" rows="2"></textarea></div>' +
        '<div class="form-actions">' +
        '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-gasoil\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary">Guardar</button>' +
        '</div></form></div></div>';
}

function calcularImportGasoil() {
    const litres = parseFloat(document.getElementById('gasoil-litres')?.value) || 0;
    const preu = parseFloat(document.getElementById('gasoil-preu')?.value) || 0;
    const iva = parseFloat(document.getElementById('gasoil-iva')?.value) || 21;
    const net = litres * preu;
    const importIva = net * iva / 100;
    const total = net + importIva;
    document.getElementById('gasoil-import-net-calc').textContent = net.toFixed(2) + ' €';
    document.getElementById('gasoil-import-iva-calc').textContent = importIva.toFixed(2) + ' €';
    document.getElementById('gasoil-import-total-calc').textContent = total.toFixed(2) + ' €';
}

function assegurarModalGasoil() {
    if (!document.getElementById('modal-gasoil')) {
        document.body.insertAdjacentHTML('beforeend', crearModalGasoil());
    }
}

function obrirModalGasoil() {
    assegurarModalGasoil();
    document.getElementById('modal-gasoil-titol').textContent = 'Nou Registre Gasoil';
    document.getElementById('form-gasoil').reset();
    document.getElementById('gasoil-id').value = '';
    document.getElementById('gasoil-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('gasoil-iva').value = 21;
    document.getElementById('gasoil-tipus-activitat').value = 'F';
    document.getElementById('gasoil-import-net-calc').textContent = '0,00 €';
    document.getElementById('gasoil-import-iva-calc').textContent = '0,00 €';
    document.getElementById('gasoil-import-total-calc').textContent = '0,00 €';
    document.getElementById('modal-gasoil').style.display = 'block';
}

async function editarGasoil(id) {
    const { data, error } = await supabaseClient.from('gasoil').select('*').eq('id', id).single();
    if (error) return;
    assegurarModalGasoil();
    document.getElementById('modal-gasoil-titol').textContent = 'Editar Gasoil';
    document.getElementById('gasoil-id').value = data.id;
    document.getElementById('gasoil-data').value = data.data || '';
    document.getElementById('gasoil-proveidor').value = data.proveidor || '';
    document.getElementById('gasoil-tipus-activitat').value = data.tipus_activitat || 'F';
    document.getElementById('gasoil-litres').value = data.litres || '';
    document.getElementById('gasoil-preu').value = data.preu_unitari || '';
    document.getElementById('gasoil-iva').value = data.iva || 21;
	document.getElementById('gasoil-num-factura').value = data.num_factura || '';
    document.getElementById('gasoil-observacions').value = data.observacions || '';
    calcularImportGasoil();
    document.getElementById('modal-gasoil').style.display = 'block';
}

function veureGasoil(id) {
    editarGasoil(id);
}

async function guardarGasoil(event) {
    event.preventDefault();
    const id = document.getElementById('gasoil-id').value;
    const litres = parseFloat(document.getElementById('gasoil-litres').value) || 0;
    const preu = parseFloat(document.getElementById('gasoil-preu').value) || 0;
    const iva = parseFloat(document.getElementById('gasoil-iva').value) || 21;
    const net = litres * preu;
    const importIva = net * iva / 100;
    const total = net + importIva;

    const dades = {
        data: document.getElementById('gasoil-data').value,
        proveidor: document.getElementById('gasoil-proveidor').value.trim() || null,
        tipus_activitat: document.getElementById('gasoil-tipus-activitat').value || 'F',
        litres: litres,
        preu_unitari: preu,
        iva: iva,
        import_net: net,
        import_iva: importIva,
        import_total: total,
		num_factura: document.getElementById('gasoil-num-factura').value.trim() || null,
        observacions: document.getElementById('gasoil-observacions').value.trim() || null
    };

    try {
        if (id) {
            await updateGasoil(id, dades);
            mostrarNotificacio('Registre actualitzat', 'success');
        } else {
            await createGasoil(dades);
            mostrarNotificacio('Registre creat', 'success');
        }
        tancarModal('modal-gasoil');
        await carregarTaulaGasoil();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarGasoil(id) {
    if (!confirm('Segur que vols eliminar aquest registre?')) return;
    try {
        await deleteGasoil(id);
        mostrarNotificacio('Registre eliminat', 'success');
        await carregarTaulaGasoil();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}


async function guardarFitxatgeTreballador(event) {
    event.preventDefault();
    
    const treballadorId = document.getElementById('fitxatge-treballador-id').value;
    const registreId = document.getElementById('fitxatge-registre-id').value;
    const tipus = document.getElementById('fitxatge-tipus').value;
    const horaActual = new Date().toTimeString().slice(0,5);
    const dataAvui = new Date().toISOString().split('T')[0];
    
    try {
        if (tipus === 'entrada') {
            // Crear entrada nova
            const tascaId = document.getElementById('fitxatge-tasca').value;
            if (!tascaId) {
                mostrarNotificacio('Cal seleccionar una tasca', 'error');
                return;
            }
            
            const treballador = treballadors.find(function(t) { return t.id === treballadorId; });
            
            await createControlHorari({
                data: dataAvui,
                treballador_id: treballadorId,
                hora_entrada: horaActual,
                tasca_id: tascaId,
                tasca_libre: document.getElementById('fitxatge-tasca-libre').value.trim() || null,
                finca: document.getElementById('fitxatge-finca').value || null,
                num_persones: treballador && treballador.tipus === 'Temporal' ? 1 : 1
            });
            
            mostrarNotificacio('✅ Entrada fitxada correctament', 'success');
            
        } else {
            // Actualitzar amb sortida
            const motiuId = document.getElementById('fitxatge-motiu').value || null;
            const registre = controlHorari.find(function(r) { return r.id === registreId; });
            
            if (registre) {
                const treballador = treballadors.find(function(t) { return t.id === treballadorId; });
                const entrada = new Date('2000-01-01 ' + registre.hora_entrada);
                let sortida = new Date('2000-01-01 ' + horaActual);
                
                if (sortida < entrada) {
                    sortida = new Date('2000-01-02 ' + horaActual);
                }
                
                const hores = (sortida - entrada) / 3600000;
                const numPersones = registre.num_persones || 1;
                const cost = treballador && treballador.preu_hora ? (hores * treballador.preu_hora * numPersones) : null;
                
                await updateControlHorari(registreId, {
                    hora_sortida: horaActual,
                    motiu_sortida_id: motiuId,
                    cost_total: cost
                });
            }
            
            mostrarNotificacio('✅ Sortida fitxada correctament', 'success');
        }
        
        tancarModal('modal-fitxatge-treballador');
        
        // Recarregar tot
        controlHorari = await getControlHorari();
        const treballador = treballadors.find(function(t) { return t.id === treballadorId; });
        const registreObert = controlHorari.find(function(r) {
            return r.treballador_id === treballadorId && 
                   r.data === dataAvui && 
                   r.hora_entrada && 
                   !r.hora_sortida;
        });
        
        await actualitzarZonaFitxatge(treballadorId, registreObert);
        await carregarRegistresTreballador(treballadorId);
        
    } catch (error) {
        console.error('Error:', error);
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

// Reconnexió automàtica quan l'app torna a primer pla
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && currentUser) {
        console.log('👁️ App tornada a primer pla');
        setTimeout(async function() {
            try {
                // Renovar sessió sense crear nou client
                const { data, error } = await supabaseClient.auth.refreshSession();
                if (error) throw error;
                console.log('✅ Sessió renovada');
                
                const modalObert = document.querySelector('.modal[style*="block"]');
                if (modalObert) {
                    console.log('🔄 Modal obert, no recarregant');
                    return;
                }
                
                Promise.all([
                    getTreballadors().then(function(d) { treballadors = d; }),
                    getParcellas().then(function(d) { parcelles = d; }),
                    getControlHorari().then(function(d) { controlHorari = d; }),
                ]).then(function() {
                    mostrarNotificacio('✅ Dades actualitzades', 'success');
                });
            } catch(e) {
                console.log('❌ Error renovant sessió:', e.message);
            }
        }, 2000);
    }
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