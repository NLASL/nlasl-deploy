// ============================================================
// COLLITA-UI.V1.JS - UI Modular (Vistes separades)
// ============================================================

// Variable de control
let vistaColltitaActual = 'entrades';

// ============================================================
// 0. DISPATCHER (canviar entre vistes)
// ============================================================

async function carregarVistaCollita() {
    if (vistaColltitaActual === 'entrades') {
        await mostrarVista_Entrades();
    } else if (vistaColltitaActual === 'escandalls') {
        await mostrarVista_Escandalls();
    } else if (vistaColltitaActual === 'registres') {
        await mostrarVista_Registres();
    }
}

function canviarVistaCollita(vista) {
    vistaColltitaActual = vista;
    carregarVistaCollita();
}

// ============================================================
// 1. VISTA ENTRADES (Taula + Botons)
// ============================================================

async function mostrarVista_Entrades() {
    const container = document.getElementById('view-container');
    
    let html = '<div class="vista-entrades">';
    html += '<h2>🍎 Collita - Entrades</h2>';
    
    // Navegació
    html += '<div style="margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">';
    html += '<button class="btn btn-primary" onclick="mostrarFormulariAlbaraEntrada()" style="margin-right: 10px;">➕ Nova Entrada</button>';
   	html += '<button class="btn btn-info" onclick="mostrarResumEntrades()" style="margin-right: 10px;">📊 Resum</button>';
	
	html += '<button class="btn btn-secondary" onclick="canviarVistaCollita(\'escandalls\')" style="margin-right: 10px;">→ Escandalls</button>';
    html += '</div>';
    
    // Taula
    html += '<div id="collita-content"></div>';
    html += '</div>';
    
    container.innerHTML = html;
    await mostrarTaulaEntrades();
}

async function mostrarTaulaEntrades() {
    const content = document.getElementById('collita-content');
    const entrades = await obtenirTodasEntradas();
    
    let html = '<div class="taula-entrades">';
    html += '<table class="data-table" style="width: 100%;">';
    html += '<thead><tr>';
    html += '<th>Data</th><th>Num. Albarà</th><th>Fruita-Varietat</th><th>Finca</th><th>Qualitat</th>';
    html += '<th>Pes Net (kg)</th><th>Palots</th><th>Pes Mig</th><th>Accions</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    entrades.forEach(e => {
        const fruita = fruites.find(f => f.id === (e.fruita_varietat_id?.fruita_id || null));
        const varietat = e.fruita_varietat_id?.varietat || '-';
        const finca = finques.find(f => f.id === e.finca);
        
        html += '<tr>';
        html += '<td>' + formatData(e.data) + '</td>';
        html += '<td><strong>' + e.num_albara + '</strong></td>';
        html += '<td>' + (fruita ? fruita.nom : '-') + ' / ' + varietat + '</td>';
        html += '<td>' + (finca ? finca.nom : '-') + '</td>';
        html += '<td>' + (e.qualitat || '-') + '</td>';
        html += '<td>' + (e.pes_net || 0).toFixed(2) + '</td>';
        html += '<td>' + (e.quantitat_palots_entrada || 0) + '</td>';
        html += '<td>' + (e.pes_mig || 0).toFixed(2) + '</td>';
        html += '<td>';
        html += '<button class="btn btn-sm btn-primary" onclick="veureAlbaraRegistre(\'' + e.id + '\')">👁️</button> ';
        html += '<button class="btn btn-sm btn-secondary" onclick="editarAlbaraRegistre(\'' + e.id + '\')">✏️</button> ';
        html += '<button class="btn btn-sm btn-danger" onclick="eliminarAlbaraEntradaConfirm(\'' + e.id + '\')">🗑️</button>';
        html += '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    content.innerHTML = html;
}

// ============================================================
// RESUM ENTRADES - VERSIÓ CORREGIDA AMB CAMPANYA
// Substituir la funció mostrarResumEntrades() existent
// ============================================================
 
async function mostrarResumEntrades(campanya) {
    // Detectar campanya actual si no s'especifica
    if (!campanya) {
        const ara = new Date();
        // Octubre-Desembre → campanya de l'any següent
        campanya = ara.getMonth() >= 9 ? ara.getFullYear() + 1 : ara.getFullYear();
    }
    campanya = parseInt(campanya);
 
    const content = document.getElementById('collita-content');
    content.innerHTML = '<p>⏳ Carregant resum...</p>';
 
    const entrades = await obtenirTodasEntradas(campanya);
 
    // Agrupar per fruita + varietat
    const resum = {};
    entrades.forEach(function(e) {
        const varietatObj = e.fruita_varietat_id;
        const fruita = varietatObj ? fruites.find(function(f) { return f.id === varietatObj.fruita_id; }) : null;
        const fruitaNom = fruita ? fruita.nom : 'Desconeguda';
        const varietatNom = varietatObj ? varietatObj.varietat : 'Desconeguda';
        const clau = fruitaNom + '||' + varietatNom;
 
        if (!resum[clau]) {
            resum[clau] = {
                fruita: fruitaNom,
                varietat: varietatNom,
                numAlbarans: 0,
                totalPesNet: 0,
                totalPalots: 0,
                qualitats: {}
            };
        }
 
        resum[clau].numAlbarans++;
        resum[clau].totalPesNet += parseFloat(e.pes_net) || 0;
        resum[clau].totalPalots += parseInt(e.quantitat_palots_entrada) || 0;
 
        var qual = e.qualitat || 'Sense qualitat';
        if (!resum[clau].qualitats[qual]) {
            resum[clau].qualitats[qual] = { kg: 0, albarans: 0 };
        }
        resum[clau].qualitats[qual].kg += parseFloat(e.pes_net) || 0;
        resum[clau].qualitats[qual].albarans++;
    });
 
    // Totals per fruita
    const totalsFruita = {};
    Object.values(resum).forEach(function(r) {
        if (!totalsFruita[r.fruita]) {
            totalsFruita[r.fruita] = { totalPesNet: 0, totalPalots: 0, numAlbarans: 0 };
        }
        totalsFruita[r.fruita].totalPesNet += r.totalPesNet;
        totalsFruita[r.fruita].totalPalots += r.totalPalots;
        totalsFruita[r.fruita].numAlbarans += r.numAlbarans;
    });
 
    // Ordenar per fruita + varietat
    var resumOrdenat = Object.values(resum).sort(function(a, b) {
        if (a.fruita !== b.fruita) return a.fruita.localeCompare(b.fruita);
        return a.varietat.localeCompare(b.varietat);
    });
 
    // Campanyes disponibles al selector
    var campanyes = [2024, 2025, 2026];
 
    // Renderitzar
    var html = '<div class="resum-entrades">';
 
    // Capçalera amb selector campanya
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">';
    html += '<h3 style="margin:0;">📊 Resum Entrades · Campanya ' + campanya + '</h3>';
    html += '<div style="display:flex; gap:10px; align-items:center;">';
    html += '<label><strong>Campanya:</strong></label>';
    html += '<select onchange="mostrarResumEntrades(this.value)" style="padding:5px 10px; border-radius:5px;">';
    campanyes.forEach(function(c) {
        html += '<option value="' + c + '"' + (c === campanya ? ' selected' : '') + '>' + c + '</option>';
    });
    html += '</select>';
    html += '<button class="btn btn-secondary" onclick="mostrarTaulaEntrades()">← Tornar</button>';
    html += '</div>';
    html += '</div>';
 
    // Si no hi ha dades
    if (resumOrdenat.length === 0) {
        html += '<div style="text-align:center; padding:40px; color:#999;">No hi ha entrades per la campanya ' + campanya + '</div>';
        html += '</div>';
        content.innerHTML = html;
        return;
    }
 
    // Cards totals per fruita
    html += '<div style="display:flex; gap:15px; margin-bottom:25px; flex-wrap:wrap;">';
    Object.keys(totalsFruita).forEach(function(fruitaNom) {
        var totals = totalsFruita[fruitaNom];
        var color = fruitaNom === 'Albercoc' ? '#f39c12' :
                    fruitaNom === 'Nectarina' ? '#e74c3c' :
                    fruitaNom === 'Préssec Pla' ? '#e91e8c' : '#27ae60';
        html += '<div style="background:' + color + '15; border:2px solid ' + color + '; border-radius:10px; padding:15px; min-width:200px; flex:1;">';
        html += '<h4 style="margin:0 0 8px 0; color:' + color + ';">' + fruitaNom + '</h4>';
        html += '<div style="font-size:1.4em; font-weight:bold;">' + totals.totalPesNet.toLocaleString('ca-ES', {minimumFractionDigits:0, maximumFractionDigits:0}) + ' kg</div>';
        html += '<div style="color:#666; font-size:0.9em; margin-top:5px;">' + totals.totalPalots.toLocaleString('ca-ES') + ' palots · ' + totals.numAlbarans + ' albarans</div>';
        html += '</div>';
    });
    html += '</div>';
 
    // Taula detallada
    html += '<table class="data-table" style="width:100%;">';
    html += '<thead><tr>';
    html += '<th>Fruita</th><th>Varietat</th>';
    html += '<th style="text-align:right;">Albarans</th>';
    html += '<th style="text-align:right;">Palots</th>';
    html += '<th style="text-align:right;">Pes Net (kg)</th>';
    html += '<th style="text-align:right;">Pes Mig (kg/palot)</th>';
    html += '<th>Qualitats</th>';
    html += '</tr></thead><tbody>';
 
    var fruitaAnterior = '';
    resumOrdenat.forEach(function(r) {
        var pesMig = r.totalPalots > 0 ? r.totalPesNet / r.totalPalots : 0;
        var estilFila = r.fruita !== fruitaAnterior ? 'border-top:2px solid #aaa;' : '';
        fruitaAnterior = r.fruita;
 
        html += '<tr style="' + estilFila + '">';
        html += '<td><strong>' + r.fruita + '</strong></td>';
        html += '<td>' + r.varietat + '</td>';
        html += '<td style="text-align:right;">' + r.numAlbarans + '</td>';
        html += '<td style="text-align:right;">' + r.totalPalots.toLocaleString('ca-ES') + '</td>';
        html += '<td style="text-align:right;"><strong>' + r.totalPesNet.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</strong></td>';
        html += '<td style="text-align:right;">' + pesMig.toFixed(2) + '</td>';
        html += '<td>';
        Object.keys(r.qualitats).forEach(function(qual) {
            var dq = r.qualitats[qual];
            var colorQ = qual === 'PRIMERES' ? '#27ae60' :
                         qual === 'EXTRA' ? '#2980b9' :
                         qual === 'INDUSTRIA' ? '#e67e22' :
                         qual === 'STAR' ? '#8e44ad' : '#7f8c8d';
            html += '<span style="background:' + colorQ + '20; border:1px solid ' + colorQ + '; color:' + colorQ + '; border-radius:4px; padding:2px 6px; font-size:0.8em; margin-right:4px; white-space:nowrap;">';
            html += qual + ': ' + dq.kg.toLocaleString('ca-ES', {minimumFractionDigits:0, maximumFractionDigits:0}) + ' kg';
            html += '</span>';
        });
        html += '</td>';
        html += '</tr>';
    });
 
    // Fila total
    var totalKg = Object.values(totalsFruita).reduce(function(s, t) { return s + t.totalPesNet; }, 0);
    var totalPalots = Object.values(totalsFruita).reduce(function(s, t) { return s + t.totalPalots; }, 0);
    var totalAlbarans = Object.values(totalsFruita).reduce(function(s, t) { return s + t.numAlbarans; }, 0);
 
    html += '<tr style="border-top:3px solid #333; background:#f5f5f5; font-weight:bold;">';
    html += '<td colspan="2">TOTAL CAMPANYA ' + campanya + '</td>';
    html += '<td style="text-align:right;">' + totalAlbarans + '</td>';
    html += '<td style="text-align:right;">' + totalPalots.toLocaleString('ca-ES') + '</td>';
    html += '<td style="text-align:right;">' + totalKg.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' kg</td>';
    html += '<td colspan="2"></td>';
    html += '</tr>';
 
    html += '</tbody></table></div>';
    content.innerHTML = html;
}

// ============================================================
// 2. FORMULARI ALBARÀ ENTRADA
// ============================================================

async function mostrarFormulariAlbaraEntrada() {
    const container = document.getElementById('view-container');
    
    // ✅ CARREGHAR FINQUES PRIMER (SÍNCRONA)
    let fincesDisponibles = [];
    try {
        fincesDisponibles = await getFinques();
        console.log('✅ Finques carregades:', fincesDisponibles);
    } catch (error) {
        console.warn('⚠️ Error carregant finques:', error);
    }
    
    // Obté varietats per fruita
    const varietatsPorFruita = {};
    varietats.forEach(v => {
        if (!varietatsPorFruita[v.fruita_id]) {
            varietatsPorFruita[v.fruita_id] = [];
        }
        varietatsPorFruita[v.fruita_id].push(v);
    });
 
    let html = '<div class="modal-nova-entrada">';
    html += '<h3>🍎 Collita - Nova Entrada</h3>';
    
    // Row 1
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Data *</label><input type="date" id="entrada-data" required value="' + new Date().toISOString().split('T')[0] + '"></div>';
    html += '<div class="form-group"><label>Num. Albarà *</label><input type="text" id="entrada-num-albara" required placeholder="ex: 68641"></div>';
    html += '<div class="form-group"><label>Fruita *</label><select id="entrada-fruita" required onchange="actualitzarVarietats()"><option value="">- Selecciona -</option>';
    
    fruites.forEach(f => {
        html += '<option value="' + f.id + '">' + f.nom + '</option>';
    });
    html += '</select></div>';
    html += '</div>';
    
    // Row 2
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Varietat *</label><select id="entrada-varietat" required><option value="">- Selecciona fruita -</option></select></div>';
    
    // ✅ FINQUES: AQUÍ ES POPULA AMB LES DADES JA CARREGADES
    html += '<div class="form-group"><label>Finca *</label><select id="entrada-finca" required><option value="">- Selecciona -</option>';
    
    if (fincesDisponibles && fincesDisponibles.length > 0) {
        fincesDisponibles.forEach(finca => {
            html += '<option value="' + finca + '">' + finca + '</option>';
        });
    } else {
        html += '<option value="" disabled>⚠️ Cap finca disponible</option>';
    }
    
    html += '</select></div>';
    
    // QUALITAT
    html += '<div class="form-group"><label>Qualitat *</label><select id="entrada-qualitat" required><option value="">- Selecciona -</option>';
    qualitats.forEach(q => {
        html += '<option value="' + q.nom + '">' + q.nom + '</option>';
    });
    html += '</select></div>';
    html += '</div>';
    
    // Envasos Entrada
    html += '<h4 style="margin-top: 20px;">📦 Envasos Entrada</h4>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Tipus Envàs</label><input type="text" id="entrada-tipus-envases" placeholder="ex: PALOT PLASTICO 212 L"></div>';
    html += '<div class="form-group"><label>Quantitat Palots</label><input type="number" id="entrada-quantitat-palots" min="0" step="1"></div>';
    html += '<div class="form-group"><label>Pes Brut (kg)</label><input type="number" id="entrada-pes-brut-env" min="0" step="0.01"></div>';
    html += '<div class="form-group"><label>Tara Envàs (kg)</label><input type="number" id="entrada-tara-envases" min="0" step="0.01"></div>';
    html += '</div>';
    
    // Envasos Sortida (opcional)
    html += '<h4 style="margin-top: 20px;">📦 Envasos Sortida (opcional)</h4>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Tipus Envàs</label><input type="text" id="entrada-tipus-envases-sortida" placeholder="opcional"></div>';
    html += '<div class="form-group"><label>Quantitat Palots</label><input type="number" id="entrada-quantitat-palots-sortida" min="0" step="1"></div>';
    html += '<div class="form-group"><label>Pes Brut (kg)</label><input type="number" id="entrada-pes-brut-sortida" min="0" step="0.01"></div>';
    html += '<div class="form-group"><label>Tara Envàs (kg)</label><input type="number" id="entrada-tara-envases-sortida" min="0" step="0.01"></div>';
    html += '</div>';
    
    // Pesos
    html += '<h4 style="margin-top: 20px;">⚖️ Pesos</h4>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Pes Brut (kg) *</label><input type="number" id="entrada-pes-brut" required min="0" step="0.01" onchange="calcularPesNet()"></div>';
    html += '<div class="form-group"><label>Tara Envases (kg) *</label><input type="number" id="entrada-tara-env" required min="0" step="0.01" onchange="calcularPesNet()"></div>';
    html += '<div class="form-group"><label>Tara Vehicle (kg) *</label><input type="number" id="entrada-tara-vehicle" required min="0" step="0.01" onchange="calcularPesNet()"></div>';
    html += '<div class="form-group"><label>Pes Net (kg)</label><input type="number" id="entrada-pes-net" readonly style="background-color: #e8f5e9;"></div>';
    html += '</div>';
    
    // Pes mig
    html += '<div style="margin-top: 15px;">';
    html += '<div class="form-group"><label>Pes Mig (kg/palot)</label><input type="number" id="entrada-pes-mig" readonly style="background-color: #e8f5e9;"></div>';
    html += '</div>';
    
    // Observacions
    html += '<div style="margin-top: 15px;">';
    html += '<div class="form-group"><label>Observacions</label><textarea id="entrada-observacions" rows="3" placeholder="Anotacions adicionals..."></textarea></div>';
    html += '</div>';
    
    // Botons
    html += '<div style="margin-top: 20px; display: flex; gap: 10px;">';
    html += '<button class="btn btn-success" onclick="guardarAlbaraEntrada()">💾 Guardar Entrada</button>';
    html += '<button class="btn btn-secondary" onclick="canviarVistaCollita(\'entrades\')">✕ Cancelar</button>';
    html += '</div>';
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // ✅ FUNCIONS DINÀMIQUES
    window.actualitzarVarietats = function() {
        const fruitaId = document.getElementById('entrada-fruita').value;
        const varietatSelect = document.getElementById('entrada-varietat');
        
        varietatSelect.innerHTML = '<option value="">- Selecciona varietat -</option>';
        
        if (fruitaId && varietatsPorFruita[fruitaId]) {
            varietatsPorFruita[fruitaId].forEach(v => {
                varietatSelect.innerHTML += '<option value="' + v.id + '">' + v.varietat + '</option>';
            });
        }
    };
    
    window.calcularPesNet = function() {
        const pesBrut = parseFloat(document.getElementById('entrada-pes-brut').value) || 0;
        const taraEnv = parseFloat(document.getElementById('entrada-tara-env').value) || 0;
        const taraVehicle = parseFloat(document.getElementById('entrada-tara-vehicle').value) || 0;
        
        const pesNet = pesBrut - taraEnv - taraVehicle;
        document.getElementById('entrada-pes-net').value = pesNet.toFixed(2);
        
        const numPalots = parseFloat(document.getElementById('entrada-quantitat-palots').value) || 0;
        if (numPalots > 0) {
            const pesMig = pesNet / numPalots;
            document.getElementById('entrada-pes-mig').value = pesMig.toFixed(3);
        }
    };
}
 
// ============================================================
// GUARDAR ENTRADA - USAR CAMP finca (TEXT)
// ============================================================
 
async function guardarAlbaraEntrada(event) {
    
    
    try {
        const fincaNom = document.getElementById('entrada-finca').value;
        const dades = {
            data: document.getElementById('entrada-data').value,
            num_albara: document.getElementById('entrada-num-albara').value,
            fruita_varietat_id: document.getElementById('entrada-varietat').value,
            finca_id: (parcelles.find(p => p.finca === fincaNom) || {}).id || null,
            finca: fincaNom,
            qualitat: document.getElementById('entrada-qualitat').value,
            
            tipus_envases_entrada: document.getElementById('entrada-tipus-envases').value,
            quantitat_palots_entrada: parseInt(document.getElementById('entrada-quantitat-palots').value) || 0,
            pes_brut_entrada: parseFloat(document.getElementById('entrada-pes-brut-env').value) || 0,
            tara_envases_entrada: parseFloat(document.getElementById('entrada-tara-envases').value) || 0,
            
            tipus_envases_sortida: document.getElementById('entrada-tipus-envases-sortida').value || null,
            quantitat_palots_sortida: parseInt(document.getElementById('entrada-quantitat-palots-sortida').value) || 0,
            pes_brut_sortida: parseFloat(document.getElementById('entrada-pes-brut-sortida').value) || 0,
            tara_envases_sortida: parseFloat(document.getElementById('entrada-tara-envases-sortida').value) || 0,
            
            pes_brut: parseFloat(document.getElementById('entrada-pes-brut').value),
            tara_envases: parseFloat(document.getElementById('entrada-tara-env').value),
            tara_vehicle: parseFloat(document.getElementById('entrada-tara-vehicle').value),
            pes_net: parseFloat(document.getElementById('entrada-pes-net').value),
            pes_mig: parseFloat(document.getElementById('entrada-pes-mig').value),
            
            observacions: document.getElementById('entrada-observacions').value,
            created_by: currentUser ? currentUser.id : null
        };
        
        await crearAlbaraEntrada(dades);
        mostrarNotificacio('✅ Entrada d\'albarà guardada', 'success');
        canviarVistaCollita('entrades');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

function veureAlbaraEntrada(id) {
    mostrarNotificacio('Detall entrada: ' + id, 'info');
}



async function eliminarAlbaraEntradaConfirm(id) {
    if (!confirm('Segur que vols eliminar aquesta entrada?')) return;
    
    try {
        await eliminarAlbaraEntrada(id);
        mostrarNotificacio('✅ Entrada eliminada', 'success');
        canviarVistaCollita('entrades');
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// 3. VISTA ESCANDALLS (Taula + Botons)
// ============================================================

async function mostrarVista_Escandalls() {
    const container = document.getElementById('view-container');
    
    let html = '<div class="vista-escandalls">';
    html += '<h2>🍎 Collita - Escandalls</h2>';
    
    // Navegació
    html += '<div style="margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">';
    html += '<button class="btn btn-primary" onclick="mostrarFormulariAlbaraEscandall()" style="margin-right: 10px;">➕ Nou Escandall</button>';
    html += '<button class="btn btn-info" onclick="mostrarResumEscandalls()" style="margin-right:10px;">📊 Resum</button>';
	html += '<button class="btn btn-secondary" onclick="canviarVistaCollita(\'entrades\')">← Entrades</button>';
    html += '</div>';
    
    // Taula
    html += '<div id="collita-content"></div>';
    html += '</div>';
    
    container.innerHTML = html;
    await mostrarTaulaEscandalls();
}

async function mostrarTaulaEscandalls() {
    const content = document.getElementById('collita-content');
    const escandalls = await obtenirTodasEscandalls();
    
    // ✅ Cargar todas las entradas
    const todasEntradas = await obtenirTodasEntradas();
    
    let html = '<div class="taula-escandalls">';
    html += '<table class="data-table" style="width: 100%;">';
    html += '<thead><tr>';
    html += '<th>Data</th><th>Num. Escandall</th><th>Fruita-Varietat</th><th>Pes Net (kg)</th>';
    html += '<th>Qualitat Orig → Reclassificada</th><th>Alerts</th><th>Accions</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    escandalls.forEach(e => {
        // ✅ Buscar entrada relacionada
        const entrada = e.collita_entrada;  // ← Ahora viene en la relación
        const varietat = varietats.find(v => v.id === entrada?.fruita_varietat_id);
        const fruita = fruites.find(f => f.id === varietat?.fruita_id);
        
		console.log('Escandall:', e.num_albara_escandall, 'Entrada:', entrada?.num_albara, 'Qualitat:', entrada?.qualitat);
		
        let alertIcon = '✅';
        if (e.diferencia_pes_net > 0) alertIcon = '⚠️';
        if (e.diferencia_palots > 0) alertIcon = '⚠️';
        
        html += '<tr>';
        html += '<td>' + formatData(e.data) + '</td>';
        html += '<td><strong>' + e.num_albara_escandall + '</strong></td>';
        html += '<td>' + (fruita ? fruita.nom : '-') + ' / ' + (varietat ? varietat.varietat : '-') + '</td>';
        html += '<td>' + (e.pes_net || 0).toFixed(2) + '</td>';
        html += '<td>' + (entrada?.qualitat || '-') + ' → ' + (e.qualitat_reclassificada || '-') + '</td>';
        html += '<td>' + alertIcon + '</td>';
        html += '<td>';
        html += '<button class="btn btn-sm btn-primary" onclick="veureEscandall(\'' + e.id + '\')">👁️</button> ';
        html += '<button class="btn btn-sm btn-secondary" onclick="editarEscandallRegistre(\'' + e.id + '\')">✏️</button> ';
        if (e.estat === 'actiu') {
            html += '<button class="btn btn-sm btn-danger" onclick="eliminarEscandallConfirm(\'' + e.id + '\')">🗑️</button>';
        }
        html += '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    content.innerHTML = html;
}

// ============================================================
// CANVI 2: Afegir funció mostrarResumEscandalls()
// ============================================================
 
async function mostrarResumEscandalls(campanya) {
    // Detectar campanya actual si no s'especifica
    if (!campanya) {
        var ara = new Date();
        campanya = ara.getMonth() >= 9 ? ara.getFullYear() + 1 : ara.getFullYear();
    }
    campanya = parseInt(campanya);
 
    var content = document.getElementById('collita-content');
    content.innerHTML = '<p>⏳ Carregant resum escandalls...</p>';
 
    // Dates campanya: 1 octubre (any-1) → 30 setembre (any)
    //var dataInici = (campanya - 1) + '-05-01';
    //var dataFinal = campanya + '-12-31';
 
    // Carregar escandalls amb totes les taules filles
    var escandalls = await obtenirTodasEscandalls();

	escandalls = escandalls.filter(function(e) {
		var dataEsc = new Date(e.data);
		var mes = dataEsc.getMonth() + 1;
		var any = dataEsc.getFullYear();
		var campanyadEscandall = mes >= 10 ? any + 1 : any;
		return campanyadEscandall === campanya;
});

	console.log('Total escandalls campanya ' + campanya + ':', escandalls.length);
	if (escandalls.length > 0) {
    console.log('Calibres primer escandall:', escandalls[0].collita_escandall_calibres);
}
 
    // ============================================================
    // AGRUPAR DADES
    // ============================================================
 
    // Estructura: resum[fruitaNom][varietatNom][qualitatFinal]
    var resum = {};
    var totalsFruita = {};
 
    escandalls.forEach(function(e) {
        // Resolució fruita/varietat
        var varietatObj = varietats.find(function(v) { return v.id === e.fruita_varietat_id; });
        var fruitaObj = varietatObj ? fruites.find(function(f) { return f.id === varietatObj.fruita_id; }) : null;
        var fruitaNom = fruitaObj ? fruitaObj.nom : 'Desconeguda';
        var varietatNom = varietatObj ? varietatObj.varietat : 'Desconeguda';
        var qualitatFinal = e.qualitat_reclassificada || e.qualitat_original || 'Sense qualitat';
 
        // Kg per categoria
        var kgComericial = (e.collita_escandall_calibres || []).reduce(function(s, c) { return s + (parseFloat(c.pes_kg) || 0); }, 0);
        var kgNoComercial = (e.collita_escandall_no_comercial || []).reduce(function(s, c) { return s + (parseFloat(c.pes_kg) || 0); }, 0);
        var kgIndustria = (e.collita_escandall_industria || []).reduce(function(s, c) { return s + (parseFloat(c.pes_kg) || 0); }, 0);
        var kgTotal = kgComericial + kgNoComercial + kgIndustria;
 
        // Inicialitzar estructura
        if (!resum[fruitaNom]) resum[fruitaNom] = {};
        if (!resum[fruitaNom][varietatNom]) resum[fruitaNom][varietatNom] = {};
        if (!resum[fruitaNom][varietatNom][qualitatFinal]) {
            resum[fruitaNom][varietatNom][qualitatFinal] = {
                numEscandalls: 0,
                kgComercial: 0,
                kgNoComercial: 0,
                kgIndustria: 0,
                kgTotal: 0,
                calibres: {},
                noComercials: {}
            };
        }
 
        var r = resum[fruitaNom][varietatNom][qualitatFinal];
        r.numEscandalls++;
        r.kgComercial += kgComericial;
        r.kgNoComercial += kgNoComercial;
        r.kgIndustria += kgIndustria;
        r.kgTotal += kgTotal;
 
        // Acumular calibres
        (e.collita_escandall_calibres || []).forEach(function(c) {
            if (!r.calibres[c.calibre]) r.calibres[c.calibre] = 0;
            r.calibres[c.calibre] += parseFloat(c.pes_kg) || 0;
        });
 
        // Acumular no comercials
        (e.collita_escandall_no_comercial || []).forEach(function(nc) {
            if (!r.noComercials[nc.classificacio]) r.noComercials[nc.classificacio] = 0;
            r.noComercials[nc.classificacio] += parseFloat(nc.pes_kg) || 0;
        });
 
        // Totals per fruita
        if (!totalsFruita[fruitaNom]) {
            totalsFruita[fruitaNom] = { kgComercial: 0, kgNoComercial: 0, kgIndustria: 0, kgTotal: 0, numEscandalls: 0 };
        }
        totalsFruita[fruitaNom].kgComercial += kgComericial;
        totalsFruita[fruitaNom].kgNoComercial += kgNoComercial;
        totalsFruita[fruitaNom].kgIndustria += kgIndustria;
        totalsFruita[fruitaNom].kgTotal += kgTotal;
        totalsFruita[fruitaNom].numEscandalls++;
    });
 
    // ============================================================
    // RENDERITZAR
    // ============================================================
 
    var campanyes = [2024, 2025, 2026];
    var html = '<div class="resum-escandalls">';
 
    // Capçalera
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">';
    html += '<h3 style="margin:0;">📊 Resum Escandalls · Campanya ' + campanya + '</h3>';
    html += '<div style="display:flex; gap:10px; align-items:center;">';
    html += '<label><strong>Campanya:</strong></label>';
    html += '<select onchange="mostrarResumEscandalls(this.value)" style="padding:5px 10px; border-radius:5px;">';
    campanyes.forEach(function(c) {
        html += '<option value="' + c + '"' + (c === campanya ? ' selected' : '') + '>' + c + '</option>';
    });
    html += '</select>';
    html += '<button class="btn btn-secondary" onclick="mostrarTaulaEscandalls()">← Tornar</button>';
    html += '</div></div>';
 
    // Si no hi ha dades
    if (escandalls.length === 0) {
        html += '<div style="text-align:center; padding:40px; color:#999;">No hi ha escandalls per la campanya ' + campanya + '</div>';
        html += '</div>';
        content.innerHTML = html;
        return;
    }
 
    // Cards totals per fruita
    html += '<div style="display:flex; gap:15px; margin-bottom:25px; flex-wrap:wrap;">';
    Object.keys(totalsFruita).forEach(function(fruitaNom) {
        var t = totalsFruita[fruitaNom];
        var color = fruitaNom === 'Albercoc' ? '#f39c12' :
                    fruitaNom === 'Nectarina' ? '#e74c3c' :
                    fruitaNom === 'Préssec Pla' ? '#e91e8c' : '#27ae60';
        var pctNC = t.kgTotal > 0 ? (t.kgNoComercial / t.kgTotal * 100) : 0;
        var pctInd = t.kgTotal > 0 ? (t.kgIndustria / t.kgTotal * 100) : 0;
 
        html += '<div style="background:' + color + '15; border:2px solid ' + color + '; border-radius:10px; padding:15px; min-width:220px; flex:1;">';
        html += '<h4 style="margin:0 0 10px 0; color:' + color + ';">' + fruitaNom + '</h4>';
        html += '<div style="font-size:1.4em; font-weight:bold;">' + t.kgTotal.toLocaleString('ca-ES', {maximumFractionDigits:0}) + ' kg</div>';
        html += '<div style="margin-top:8px; font-size:0.85em; color:#555;">';
        html += '✅ Comercial: <strong>' + t.kgComercial.toLocaleString('ca-ES', {maximumFractionDigits:0}) + ' kg</strong><br>';
        html += '⚠️ NC: <strong>' + t.kgNoComercial.toLocaleString('ca-ES', {maximumFractionDigits:0}) + ' kg</strong> (' + pctNC.toFixed(2) + '%)<br>';
        if (t.kgIndustria > 0) {
            html += '🏭 Indústria: <strong>' + t.kgIndustria.toLocaleString('ca-ES', {maximumFractionDigits:0}) + ' kg</strong> (' + pctInd.toFixed(2) + '%)<br>';
        }
        html += t.numEscandalls + ' escandalls';
        html += '</div></div>';
    });
    html += '</div>';
 
    // Taula desglosada per fruita → varietat → qualitat
    Object.keys(resum).sort().forEach(function(fruitaNom) {
        var color = fruitaNom === 'Albercoc' ? '#f39c12' :
                    fruitaNom === 'Nectarina' ? '#e74c3c' :
                    fruitaNom === 'Préssec Pla' ? '#e91e8c' : '#27ae60';
 
        html += '<div style="margin-bottom:25px;">';
        html += '<h4 style="color:' + color + '; border-bottom:2px solid ' + color + '; padding-bottom:5px;">' + fruitaNom + '</h4>';
 
        html += '<table class="data-table" style="width:100%;">';
        html += '<thead><tr>';
        html += '<th>Varietat</th><th>Qualitat</th>';
        html += '<th style="text-align:right;">Escandalls</th>';
        html += '<th style="text-align:right;">Kg Comercial</th>';
        html += '<th style="text-align:right;">Kg NC</th>';
        html += '<th style="text-align:right;">Kg Indústria</th>';
        html += '<th style="text-align:right;">Kg Total</th>';
        html += '<th style="text-align:right;">% NC</th>';
        html += '<th>Detall calibres</th>';
        html += '</tr></thead><tbody>';
 
        Object.keys(resum[fruitaNom]).sort().forEach(function(varietatNom) {
            Object.keys(resum[fruitaNom][varietatNom]).sort().forEach(function(qualitat) {
                var r = resum[fruitaNom][varietatNom][qualitat];
                var pctNC = r.kgTotal > 0 ? (r.kgNoComercial / r.kgTotal * 100) : 0;
                var colorNC = pctNC > 20 ? '#e74c3c' : pctNC > 10 ? '#e67e22' : '#27ae60';
 
                html += '<tr>';
                html += '<td><strong>' + varietatNom + '</strong></td>';
                html += '<td><span style="background:#eee; border-radius:4px; padding:2px 6px; font-size:0.85em;">' + qualitat + '</span></td>';
                html += '<td style="text-align:right;">' + r.numEscandalls + '</td>';
                html += '<td style="text-align:right;"><strong>' + r.kgComercial.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</strong></td>';
                html += '<td style="text-align:right; color:' + (r.kgNoComercial < 0 ? '#e74c3c' : '#555') + ';">' + r.kgNoComercial.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>';
                html += '<td style="text-align:right;">' + (r.kgIndustria > 0 ? r.kgIndustria.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) : '-') + '</td>';
                html += '<td style="text-align:right;"><strong>' + r.kgTotal.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</strong></td>';
                html += '<td style="text-align:right; color:' + colorNC + '; font-weight:bold;">' + pctNC.toFixed(2) + '%</td>';
 
                // Detall calibres (pills)
                html += '<td style="font-size:0.8em;">';
                Object.keys(r.calibres).sort().forEach(function(calibre) {
                    var kg = r.calibres[calibre];
                    var pct = r.kgComercial > 0 ? (kg / r.kgComercial * 100) : 0;
                    html += '<span style="background:#e8f4fd; border:1px solid #3498db; border-radius:3px; padding:1px 5px; margin:1px; white-space:nowrap; display:inline-block;">';
                    html += calibre + ': ' + kg.toLocaleString('ca-ES', {maximumFractionDigits:0}) + ' kg (' + pct.toFixed(0) + '%)';
                    html += '</span>';
                });
 
                // NC detall
                if (Object.keys(r.noComercials).length > 0) {
                    html += '<div style="margin-top:4px;">';
                    Object.keys(r.noComercials).forEach(function(nc) {
                        var kg = r.noComercials[nc];
                        html += '<span style="background:#fdf2e9; border:1px solid #e67e22; border-radius:3px; padding:1px 5px; margin:1px; white-space:nowrap; display:inline-block;">';
                        html += nc + ': ' + kg.toLocaleString('ca-ES', {maximumFractionDigits:0}) + ' kg';
                        html += '</span>';
                    });
                    html += '</div>';
                }
                html += '</td>';
                html += '</tr>';
            });
        });
 
        // Subtotal fruita
        var tf = totalsFruita[fruitaNom];
        html += '<tr style="border-top:2px solid ' + color + '; background:' + color + '10; font-weight:bold;">';
        html += '<td colspan="3">Subtotal ' + fruitaNom + '</td>';
        html += '<td style="text-align:right;">' + tf.kgComercial.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>';
        html += '<td style="text-align:right;">' + tf.kgNoComercial.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>';
        html += '<td style="text-align:right;">' + (tf.kgIndustria > 0 ? tf.kgIndustria.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) : '-') + '</td>';
        html += '<td style="text-align:right;">' + tf.kgTotal.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + '</td>';
        var pctNCTotal = tf.kgTotal > 0 ? (tf.kgNoComercial / tf.kgTotal * 100) : 0;
        html += '<td style="text-align:right;">' + pctNCTotal.toFixed(2) + '%</td>';
        html += '<td></td></tr>';
 
        html += '</tbody></table></div>';
    });
 
    // Total general
    var totGenKgCom = Object.values(totalsFruita).reduce(function(s, t) { return s + t.kgComercial; }, 0);
    var totGenKgNC = Object.values(totalsFruita).reduce(function(s, t) { return s + t.kgNoComercial; }, 0);
    var totGenKgInd = Object.values(totalsFruita).reduce(function(s, t) { return s + t.kgIndustria; }, 0);
    var totGenKgTot = Object.values(totalsFruita).reduce(function(s, t) { return s + t.kgTotal; }, 0);
    var totGenNC = totGenKgTot > 0 ? (totGenKgNC / totGenKgTot * 100) : 0;
 
    html += '<div style="background:#f5f5f5; border:2px solid #333; border-radius:8px; padding:15px; margin-top:10px;">';
    html += '<strong>TOTAL CAMPANYA ' + campanya + '</strong><br><br>';
    html += '<div style="display:flex; gap:30px; flex-wrap:wrap;">';
    html += '<span>✅ Comercial: <strong>' + totGenKgCom.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' kg</strong></span>';
    html += '<span>⚠️ NC: <strong>' + totGenKgNC.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' kg</strong> (' + totGenNC.toFixed(1) + '%)</span>';
    if (totGenKgInd > 0) {
        html += '<span>🏭 Indústria: <strong>' + totGenKgInd.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' kg</strong></span>';
    }
    html += '<span>📦 <strong>TOTAL: ' + totGenKgTot.toLocaleString('ca-ES', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' kg</strong></span>';
    html += '</div></div>';
 
    html += '</div>';
    content.innerHTML = html;
}

// ============================================================
// 4. FORMULARI ALBARÀ ESCANDALL
// ============================================================

async function mostrarFormulariAlbaraEscandall() {
    const container = document.getElementById('view-container');
    
    let html = '<div class="formulari-escandall">';
    html += '<h2>🍎 Collita - Nou Escandall</h2>';
    html += '<form id="form-escandall" onsubmit="guardarAlbaraEscandall(event)" style="background: #f9f9f9; padding: 20px; border-radius: 8px;">';
    
    // Buscar entrada
    html += '<div class="form-group"><label>Num. Albarà Entrada *</label>';
    html += '<input type="text" id="escandall-num-entrada" placeholder="ex: 11072025" required onchange="buscarEntrada()">';
    html += '<div id="entrada-info" style="margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 4px; display: none;"></div>';
    html += '</div>';
    
    html += '<div class="form-group"><label>Num. Albarà Escandall *</label><input type="text" id="escandall-num-albara" required></div>';
    html += '<div class="form-group"><label>Data *</label><input type="date" id="escandall-data" required></div>';
    
    // Pesos
    html += '<h4>⚖️ Pesos (Comparativa)</h4>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Pes Brut</label><input type="number" id="escandall-pes-brut" min="0" step="0.01" onchange="calcularPesNetEscandall()"></div>';
    html += '<div class="form-group"><label>Tara Envases</label><input type="number" id="escandall-tara-env" min="0" step="0.01" onchange="calcularPesNetEscandall()"></div>';
    html += '<div class="form-group"><label>Tara Vehicle</label><input type="number" id="escandall-tara-vehicle" min="0" step="0.01" onchange="calcularPesNetEscandall()"></div>';
    html += '<div class="form-group"><label>Pes Net</label><input type="number" id="escandall-pes-net" readonly style="background: #e8f5e9;"></div>';
    html += '</div>';
    
    // Qualitat original vs reclassificada
    html += '<h4 style="margin-top: 20px;">Qualitat</h4>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Qualitat Original</label><input type="text" id="escandall-qualitat-original" readonly style="background: #f0f0f0;"></div>';
    html += '<div class="form-group"><label>Qualitat Reclassificada</label><select id="escandall-qualitat-reclassificada">';
    qualitats.forEach(q => {
        html += '<option value="' + q.nom + '">' + q.nom + '</option>';
    });
    html += '</select></div>';
    html += '</div>';
    html += '<div class="form-group"><label>Motiu Reclassificació</label><textarea id="escandall-motiu" rows="2"></textarea></div>';
    
    // Calibres
    html += '<h4 style="margin-top: 20px;">📏 Calibres</h4>';
    html += '<div id="escandall-calibres-container">';
    html += '<button type="button" class="btn btn-sm btn-success" onclick="afegirFilaCalibres()">➕ Afegir Calibre</button>';
    html += '<table id="taula-calibres" class="data-table" style="margin-top: 10px; width: 100%;"><thead><tr><th>Calibre</th><th>Pes (kg)</th><th>%</th><th>Categoria</th><th></th></tr></thead><tbody></tbody></table>';
    html += '</div>';
    
    // No Comercial
    html += '<h4 style="margin-top: 20px;">⚠️ No Comercial</h4>';
    html += '<div id="escandall-noCom-container">';
    html += '<button type="button" class="btn btn-sm btn-success" onclick="afegirFilaNoCom()">➕ Afegir Categoria</button>';
    html += '<table id="taula-noCom" class="data-table" style="margin-top: 10px; width: 100%;"><thead><tr><th>Classificació</th><th>Pes (kg)</th><th>%</th><th></th></tr></thead><tbody></tbody></table>';
    html += '</div>';
    
    // Industria
    html += '<h4 style="margin-top: 20px;">🏭 Industria</h4>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Pes (kg)</label><input type="number" id="escandall-industria-pes" min="0" step="0.01"></div>';
    html += '<div class="form-group"><label>%</label><input type="number" id="escandall-industria-perc" readonly style="background: #e8f5e9;"></div>';
    html += '</div>';
    
    // Validació
    html += '<div id="validacio-percentatges" style="margin-top: 20px; padding: 10px; background: #fff3cd; border-radius: 4px; display: none;"></div>';
    
    // Botons
    html += '<div style="margin-top: 20px;">';
    html += '<button type="submit" class="btn btn-success">💾 Guardar Escandall</button>';
    html += '<button type="button" class="btn btn-secondary" onclick="canviarVistaCollita(\'escandalls\')" style="margin-left: 10px;">❌ Cancelar</button>';
    html += '</div>';
    
    html += '</form></div>';
    
    container.innerHTML = html;
    document.getElementById('escandall-data').valueAsDate = new Date();
}

async function buscarEntrada() {
    const numAlbara = document.getElementById('escandall-num-entrada').value;
    const entrada = await obtenerAlbaraEntradaPorNum(numAlbara);
    
    if (entrada) {
        // Buscar varietat y fruita correctamente
        const varietat = varietats.find(v => v.id === entrada.fruita_varietat_id);
        const fruita = fruites.find(f => f.id === varietat?.fruita_id);
        
        document.getElementById('entrada-info').style.display = 'block';
        document.getElementById('entrada-info').innerHTML = `
            <strong>Fruita:</strong> ${fruita?.nom || '-'} / ${varietat?.varietat || '-'}<br>
            <strong>Finca:</strong> ${entrada.finca || '-'}<br>
            <strong>Pes Net:</strong> ${(entrada.pes_net || 0).toFixed(2)} kg<br>
            <strong>Palots:</strong> ${entrada.quantitat_palots_entrada || 0}
        `;
        
        // Copiar dades a escandall
        document.getElementById('escandall-qualitat-original').value = entrada.qualitat || '-';
        document.getElementById('escandall-pes-brut').value = entrada.pes_brut || '';
        document.getElementById('escandall-tara-env').value = entrada.tara_envases || '';
        document.getElementById('escandall-tara-vehicle').value = entrada.tara_vehicle || '';
        calcularPesNetEscandall();
    } else {
        document.getElementById('entrada-info').style.display = 'none';
        document.getElementById('entrada-info').innerHTML = '';
    }
}

function calcularPesNetEscandall() {
    const pesBrut = parseFloat(document.getElementById('escandall-pes-brut').value) || 0;
    const taraEnv = parseFloat(document.getElementById('escandall-tara-env').value) || 0;
    const taraVehicle = parseFloat(document.getElementById('escandall-tara-vehicle').value) || 0;
    
    const pesNet = pesBrut - taraEnv - taraVehicle;
    document.getElementById('escandall-pes-net').value = pesNet.toFixed(2);
}

function afegirFilaCalibres() {
    const tbody = document.querySelector('#taula-calibres tbody');
    const tr = document.createElement('tr');
    const allCalibres = Object.values(calibresFruita).flat();
    
    tr.innerHTML = `
        <td><select onchange="actualitzarPercentatgesCal()"><option>- Selecciona -</option>${allCalibres.map(c => `<option>${c}</option>`).join('')}</select></td>
        <td><input type="number" min="0" step="0.01" onchange="actualitzarPercentatgesCal()"></td>
        <td><input type="number" readonly style="background: #e8f5e9;"></td>
        <td><input type="text" readonly style="background: #f0f0f0;"></td>
        <td><button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove();actualitzarPercentatgesCal()">❌</button></td>
    `;
    tbody.appendChild(tr);
}

function afegirFilaNoCom() {
    const tbody = document.querySelector('#taula-noCom tbody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td><select onchange="actualitzarPercentatgesCal()"><option>- Selecciona -</option>${classificacionsNoCom.map(c => `<option>${c.nom}</option>`).join('')}</select></td>
        <td><input type="number" min="0" step="0.01" onchange="actualitzarPercentatgesCal()"></td>
        <td><input type="number" readonly style="background: #e8f5e9;"></td>
        <td><button type="button" class="btn btn-sm btn-danger" onclick="this.parentElement.parentElement.remove();actualitzarPercentatgesCal()">❌</button></td>
    `;
    tbody.appendChild(tr);
}

function actualitzarPercentatgesCal() {
    const pesNet = parseFloat(document.getElementById('escandall-pes-net').value) || 0;
    const pesIndustria = parseFloat(document.getElementById('escandall-industria-pes').value) || 0;
    const pesTotalEsperat = pesNet;
    
    let pesTotal = 0;
    
    // Calibres
    document.querySelectorAll('#taula-calibres tbody tr').forEach(tr => {
        const pesKg = parseFloat(tr.querySelectorAll('input')[0].value) || 0;
        pesTotal += pesKg;
        const percentatge = (pesKg / pesTotalEsperat) * 100;
        tr.querySelectorAll('input')[1].value = percentatge.toFixed(2);
    });
    
    // No Comercial
    document.querySelectorAll('#taula-noCom tbody tr').forEach(tr => {
        const pesKg = parseFloat(tr.querySelectorAll('input')[0].value) || 0;
        pesTotal += pesKg;
        const percentatge = (pesKg / pesTotalEsperat) * 100;
        tr.querySelectorAll('input')[1].value = percentatge.toFixed(2);
    });
    
    // Industria
    pesTotal += pesIndustria;
    const percIndustria = (pesIndustria / pesTotalEsperat) * 100;
    document.getElementById('escandall-industria-perc').value = percIndustria.toFixed(2);
    
    // Validar suma percentatges
    const sumPercentatges = Array.from(document.querySelectorAll('#taula-calibres input[readonly]')).reduce((s, inp) => s + (parseFloat(inp.value) || 0), 0) +
                            Array.from(document.querySelectorAll('#taula-noCom input[readonly]')).reduce((s, inp) => s + (parseFloat(inp.value) || 0), 0) +
                            percIndustria;
    
    const validacio = document.getElementById('validacio-percentatges');
    if (Math.abs(sumPercentatges - 100) > 0.5) {
        validacio.style.display = 'block';
        validacio.innerHTML = `⚠️ Suma percentatges: ${sumPercentatges.toFixed(2)}% (ha de ser ~100%)`;
    } else {
        validacio.style.display = 'none';
    }
}

async function guardarAlbaraEscandall(event) {
    event.preventDefault();
    
    try {
        const entrada = await obtenerAlbaraEntradaPorNum(document.getElementById('escandall-num-entrada').value);
        if (!entrada) throw new Error('Entrada no trobada');
        
        const calibres = [];
        document.querySelectorAll('#taula-calibres tbody tr').forEach(tr => {
            calibres.push({
                calibre: tr.querySelectorAll('select')[0].value,
                pes_kg: parseFloat(tr.querySelectorAll('input')[0].value) || 0,
                percentatge: parseFloat(tr.querySelectorAll('input')[1].value) || 0
            });
        });
        
        const noComercios = [];
        document.querySelectorAll('#taula-noCom tbody tr').forEach(tr => {
            noComercios.push({
                classificacio: tr.querySelectorAll('select')[0].value,
                pes_kg: parseFloat(tr.querySelectorAll('input')[0].value) || 0,
                percentatge: parseFloat(tr.querySelectorAll('input')[1].value) || 0
            });
        });
        
        const industria = {
            pes_kg: parseFloat(document.getElementById('escandall-industria-pes').value) || 0,
            percentatge: parseFloat(document.getElementById('escandall-industria-perc').value) || 0
        };
        
        const dades = {
            collita_entrada_id: entrada.id,
            data: document.getElementById('escandall-data').value,
            num_albara_escandall: document.getElementById('escandall-num-albara').value,
            fruita_varietat_id: entrada.fruita_varietat_id,
            finca: entrada.finca,
			finca_id: (parcelles.find(function(p) { return p.finca === entrada.finca; }) || {}).id || null,
            qualitat_original: document.getElementById('escandall-qualitat-original').value,
            qualitat_reclassificada: document.getElementById('escandall-qualitat-reclassificada').value,
            motiu_reclassificacio: document.getElementById('escandall-motiu').value,
            pes_brut: parseFloat(document.getElementById('escandall-pes-brut').value),
            tara_envases: parseFloat(document.getElementById('escandall-tara-env').value),
            tara_vehicle: parseFloat(document.getElementById('escandall-tara-vehicle').value),
            pes_net: parseFloat(document.getElementById('escandall-pes-net').value),
            created_by: currentUser ? currentUser.id : null
        };
        
        // Comparar entrada vs escandall
        const comparativa = await compararEntradaVsEscandall(entrada.id, dades);
        
        if (!comparativa.valida) {
            const alertMissatge = comparativa.alerts.map(a => a.missatge).join('\n');
            if (!confirm('⚠️ Alerts de comparació:\n\n' + alertMissatge + '\n\n¿Continuar igualment?')) {
                return;
            }
        }
        
        await crearAlbaraEscandall(dades, calibres, noComercios, industria);
        mostrarNotificacio('✅ Escandall guardat correctament', 'success');
        canviarVistaCollita('escandalls');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function veureEscandall(id) {
    await carregarDadesCollita();
    
    const escandall = await obtenerEscandallPorId(id);
    if (!escandall) {
        mostrarNotificacio('❌ Escandall no trobat', 'error');
        return;
    }
    
    const entrada = await obtenerAlbaraEntradaPorId(escandall.collita_entrada_id);
    const varietat = varietats.find(v => v.id === entrada?.fruita_varietat_id);
    const fruita = fruites.find(f => f.id === varietat?.fruita_id);
    
    let html = '<div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-start; justify-content: center; z-index: 9999; overflow-y: auto; padding-top: 20px;" onclick="if(event.target === this) this.style.display=\'none\';">';
	html += '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 900px; max-height: 90vh; overflow-y: auto; box-shadow: 0 5px 20px rgba(0,0,0,0.3); margin: 20px; margin-bottom: 100px;">';
    
    html += '<h2>📊 Detall Escandall: ' + escandall.num_albara_escandall + '</h2>';
    
    // Dades bàsiques
    html += '<div style="margin: 20px 0; border-bottom: 2px solid #ddd; padding-bottom: 20px;">';
    html += '<h3>📋 Dades Bàsiques</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">';
    html += '<p><strong>Data:</strong> ' + formatData(escandall.data) + '</p>';
    html += '<p><strong>Num. Entrada:</strong> ' + (entrada?.num_albara || '-') + '</p>';
    html += '<p><strong>Fruita:</strong> ' + (fruita ? fruita.nom : '-') + '</p>';
    html += '<p><strong>Varietat:</strong> ' + (varietat ? varietat.varietat : '-') + '</p>';
    html += '<p><strong>Finca:</strong> ' + (entrada?.finca || '-') + '</p>';
    html += '<p><strong>Qualitat Original:</strong> ' + (entrada?.qualitat || '-') + '</p>';
    html += '<p><strong>Qualitat Reclassificada:</strong> ' + (escandall.qualitat_reclassificada || entrada?.qualitat || '-') + '</p>';
    html += '<p><strong>Pes Net Total:</strong> ' + (escandall.pes_net || 0).toFixed(2) + ' kg</p>';
    html += '</div>';
    html += '</div>';
    
    // CALIBRES
    html += '<div style="margin: 20px 0; border-bottom: 2px solid #ddd; padding-bottom: 20px;">';
    html += '<h3>📏 Calibres (Òptim)</h3>';
    html += '<table style="width: 100%; border-collapse: collapse;">';
    html += '<thead style="background: #f0f0f0;"><tr><th style="border: 1px solid #ddd; padding: 10px;">Calibre</th><th style="border: 1px solid #ddd; padding: 10px;">Pes (kg)</th><th style="border: 1px solid #ddd; padding: 10px;">%</th><th style="border: 1px solid #ddd; padding: 10px;">Categoria</th></tr></thead>';
    html += '<tbody>';
    
    if (escandall.collita_escandall_calibres && escandall.collita_escandall_calibres.length > 0) {
        escandall.collita_escandall_calibres.forEach(c => {
            html += '<tr style="border-bottom: 1px solid #eee;">';
            html += '<td style="border: 1px solid #ddd; padding: 10px;"><strong>' + c.calibre + '</strong></td>';
            html += '<td style="border: 1px solid #ddd; padding: 10px;">' + (c.pes_kg || 0).toFixed(2) + '</td>';
            html += '<td style="border: 1px solid #ddd; padding: 10px;">' + (c.percentatge || 0).toFixed(2) + '%</td>';
            html += '<td style="border: 1px solid #ddd; padding: 10px;">' + (c.categoria || '-') + '</td>';
            html += '</tr>';
        });
    } else {
        html += '<tr><td colspan="4" style="border: 1px solid #ddd; padding: 10px; text-align: center;">-</td></tr>';
    }
    
    html += '</tbody></table>';
    html += '</div>';
    
    // NO COMERCIAL
    html += '<div style="margin: 20px 0; border-bottom: 2px solid #ddd; padding-bottom: 20px;">';
    html += '<h3>🚫 No Comercial</h3>';
    html += '<table style="width: 100%; border-collapse: collapse;">';
    html += '<thead style="background: #f0f0f0;"><tr><th style="border: 1px solid #ddd; padding: 10px;">Classificació</th><th style="border: 1px solid #ddd; padding: 10px;">Pes (kg)</th><th style="border: 1px solid #ddd; padding: 10px;">%</th></tr></thead>';
    html += '<tbody>';
    
    if (escandall.collita_escandall_no_comercial && escandall.collita_escandall_no_comercial.length > 0) {
        escandall.collita_escandall_no_comercial.forEach(nc => {
            html += '<tr style="border-bottom: 1px solid #eee;">';
            html += '<td style="border: 1px solid #ddd; padding: 10px;"><strong>' + nc.classificacio + '</strong></td>';
            html += '<td style="border: 1px solid #ddd; padding: 10px;">' + (nc.pes_kg || 0).toFixed(2) + '</td>';
            html += '<td style="border: 1px solid #ddd; padding: 10px;">' + (nc.percentatge || 0).toFixed(2) + '%</td>';
            html += '</tr>';
        });
    } else {
        html += '<tr><td colspan="3" style="border: 1px solid #ddd; padding: 10px; text-align: center;">-</td></tr>';
    }
    
    html += '</tbody></table>';
    html += '</div>';
    
    // INDUSTRIA
    html += '<div style="margin: 20px 0; border-bottom: 2px solid #ddd; padding-bottom: 20px;">';
    html += '<h3>🏭 Industria</h3>';
    if (escandall.collita_escandall_industria && escandall.collita_escandall_industria.length > 0) {
        const ind = escandall.collita_escandall_industria[0];
        html += '<p><strong>Pes:</strong> ' + (ind.pes_kg || 0).toFixed(2) + ' kg</p>';
        html += '<p><strong>%:</strong> ' + (ind.percentatge || 0).toFixed(2) + '%</p>';
    } else {
        html += '<p>-</p>';
    }
    html += '</div>';
    
    // BOTÓ TANCAR
    html += '<div style="text-align: right;">';
    html += '<button class="btn btn-secondary" onclick="this.closest(\'div\').parentElement.style.display=\'none\'">❌ Tancar</button>';
    html += '</div>';
    
    html += '</div>';
    html += '</div>';
    
    // Crear modal
    const modal = document.createElement('div');
    modal.innerHTML = html;
    document.body.appendChild(modal);
}


// ============================================================
// 5. VISTA REGISTRES D'ALBARANS (Taula completa)
// ============================================================

async function mostrarVista_Registres() {
    const container = document.getElementById('view-container');
    
    let html = '<div class="vista-registres">';
    html += '<h2>📋 Registres d\'Albarans</h2>';
    
    // Navegació
    html += '<div style="margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">';
    html += '<button class="btn btn-secondary" onclick="canviarVistaCollita(\'entrades\')">← Entrades</button>';
    html += '</div>';
    
    // Taula
    html += '<div id="collita-content"></div>';
    html += '</div>';
    html += '<div style="margin-top: 20px; border-top: 2px solid #ddd; padding-top: 10px;">';
	html += '<button class="btn btn-info" onclick="canviarVistaCollita(\'registres\')">📋 Ver Registres</button>';
	html += '</div>';

	container.innerHTML = html;
    await mostrarTaulaRegistres();
}

async function mostrarTaulaRegistres() {
    await carregarDadesCollita();
    const content = document.getElementById('collita-content');
    const entrades = await obtenirTodasEntradas();  // Con "Todas" no "Totes"
    
    let html = '<div class="taula-registres" style="overflow-x: auto;">';
    html += '<table class="data-table" style="width: 100%;">';
    html += '<thead><tr>';
    html += '<th>Data</th><th>Num. Albarà</th><th>Fruita-Varietat</th><th>Finca</th><th>Qualitat</th>';
    html += '<th>Pes Net (kg)</th><th>Palots</th><th>Pes Mig</th><th>Estat</th><th>Accions</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    entrades.forEach(e => {
        const varietat = varietats.find(v => v.id === e.fruita_varietat_id);
        const fruita = fruites.find(f => f.id === varietat?.fruita_id);
        const finca = e.finca || 'Desconeguda';
        const estat = e.estat === 'actiu' ? '✅ Actiu' : '❌ Anulat';
        
        html += '<tr>';
        html += '<td>' + formatData(e.data) + '</td>';
        html += '<td><strong>' + e.num_albara + '</strong></td>';
        html += '<td>' + (fruita ? fruita.nom : '-') + ' / ' + (varietat ? varietat.varietat : '-') + '</td>';
        html += '<td>' + finca + '</td>';
        html += '<td>' + (e.qualitat || '-') + '</td>';
        html += '<td>' + (e.pes_net || 0).toFixed(2) + '</td>';
        html += '<td>' + (e.quantitat_palots_entrada || 0) + '</td>';
        html += '<td>' + (e.pes_mig || 0).toFixed(2) + '</td>';
        html += '<td>' + estat + '</td>';
        html += '<td>';
        html += '<button class="btn btn-sm btn-primary" onclick="veureAlbaraRegistre(\'' + e.id + '\')">👁️</button> ';
        html += '<button class="btn btn-sm btn-secondary" onclick="editarAlbaraRegistre(\'' + e.id + '\')">✏️</button> ';
        if (e.estat === 'actiu') {
            html += '<button class="btn btn-sm btn-danger" onclick="eliminarAlbaraRegistreConfirm(\'' + e.id + '\')">🗑️</button>';
        }
        html += '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    content.innerHTML = html;
}

// ============================================================
// 6. FORMULARI EDICIÓ ALBARÀ
// ============================================================

async function editarAlbaraRegistre(id) {
    await carregarDadesCollita();
    
    const entrada = await obtenerAlbaraEntradaPorId(id);
    if (!entrada) {
        mostrarNotificacio('❌ Albarà no trobat', 'error');
        return;
    }
    
    const container = document.getElementById('view-container');
    
    let html = '<div class="formulari-edicio-albara">';
    html += '<h2>✏️ Editar Albarà: ' + entrada.num_albara + '</h2>';
    html += '<form id="form-edicio-albara" onsubmit="guardarEdicionAlbara(event, \'' + id + '\')" style="background: #f9f9f9; padding: 20px; border-radius: 8px;">';
    
    // Row 1
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Data</label><input type="date" id="edicio-data" value="' + entrada.data + '" required></div>';
    html += '<div class="form-group"><label>Num. Albarà</label><input type="text" id="edicio-num-albara" value="' + entrada.num_albara + '" readonly style="background: #f0f0f0;"></div>';
    html += '<div class="form-group"><label>Fruita</label><select id="edicio-fruita" required onchange="actualitzarVarietatsEdicio()"><option value="">- Selecciona -</option>';
    fruites.forEach(f => {
        const selected = f.id === varietats.find(v => v.id === entrada.fruita_varietat_id)?.fruita_id ? 'selected' : '';
        html += '<option value="' + f.id + '" ' + selected + '>' + f.nom + '</option>';
    });
    html += '</select></div>';
    html += '</div>';
    
    // Row 2
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Varietat</label><select id="edicio-varietat" required>';
    const varietatActual = varietats.find(v => v.id === entrada.fruita_varietat_id);
    if (varietatActual) {
        html += '<option value="' + varietatActual.id + '" selected>' + varietatActual.varietat + '</option>';
    }
    html += '</select></div>';
    html += '<div class="form-group"><label>Finca</label><select id="edicio-finca" required>';
    html += '<option value="' + entrada.finca + '" selected>' + entrada.finca + '</option>';
    finques.forEach(f => {
        if (f !== entrada.finca) {
            html += '<option value="' + f + '">' + f + '</option>';
        }
    });
    html += '</select></div>';
    html += '<div class="form-group"><label>Qualitat</label><select id="edicio-qualitat" required>';
    html += '<option value="' + entrada.qualitat + '" selected>' + entrada.qualitat + '</option>';
    qualitats.forEach(q => {
        if (q.nom !== entrada.qualitat) {
            html += '<option value="' + q.nom + '">' + q.nom + '</option>';
        }
    });
    html += '</select></div>';
    html += '</div>';
    
    // Pesos
    html += '<h4 style="margin-top: 20px;">⚖️ Pesos</h4>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Pes Brut (kg)</label><input type="number" id="edicio-pes-brut" value="' + (entrada.pes_brut || '') + '" step="0.01" required onchange="calcularPesNetEdicio()"></div>';
    html += '<div class="form-group"><label>Tara Envases (kg)</label><input type="number" id="edicio-tara-env" value="' + (entrada.tara_envases || '') + '" step="0.01" required onchange="calcularPesNetEdicio()"></div>';
    html += '<div class="form-group"><label>Tara Vehicle (kg)</label><input type="number" id="edicio-tara-vehicle" value="' + (entrada.tara_vehicle || '') + '" step="0.01" required onchange="calcularPesNetEdicio()"></div>';
    html += '<div class="form-group"><label>Pes Net (kg)</label><input type="number" id="edicio-pes-net" value="' + (entrada.pes_net || '') + '" readonly style="background: #e8f5e9;"></div>';
    html += '</div>';
    
    html += '<div class="form-group"><label>Pes Mig (kg/palot)</label><input type="number" id="edicio-pes-mig" value="' + (entrada.pes_mig || '') + '" readonly style="background: #e8f5e9;"></div>';
    
    // Palots
    html += '<div class="form-group"><label>Quantitat Palots</label><input type="number" id="edicio-palots" value="' + (entrada.quantitat_palots_entrada || 0) + '" min="0" step="1" onchange="calcularPesNetEdicio()"></div>';
    
    // Observacions
    html += '<div class="form-group"><label>Observacions</label><textarea id="edicio-observacions" rows="3">' + (entrada.observacions || '') + '</textarea></div>';
    
    // Botons
    html += '<div style="margin-top: 20px;">';
    html += '<button type="submit" class="btn btn-success">💾 Guardar Canvis</button>';
    html += '<button type="button" class="btn btn-secondary" onclick="canviarVistaCollita(\'registres\')" style="margin-left: 10px;">❌ Cancelar</button>';
    html += '</div>';
    
    html += '</form></div>';
    
    container.innerHTML = html;
    actualitzarVarietatsEdicio();
}

function actualitzarVarietatsEdicio() {
    const fruitaId = document.getElementById('edicio-fruita').value;
    const varietatSelect = document.getElementById('edicio-varietat');
    
    varietatSelect.innerHTML = '<option value="">- Selecciona varietat -</option>';
    
    varietats.filter(v => v.fruita_id === fruitaId).forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = v.varietat;
        varietatSelect.appendChild(option);
    });
}

function calcularPesNetEdicio() {
    const pesBrut = parseFloat(document.getElementById('edicio-pes-brut').value) || 0;
    const taraEnv = parseFloat(document.getElementById('edicio-tara-env').value) || 0;
    const taraVehicle = parseFloat(document.getElementById('edicio-tara-vehicle').value) || 0;
    const palots = parseInt(document.getElementById('edicio-palots').value) || 1;
    
    const pesNet = pesBrut - taraEnv - taraVehicle;
    document.getElementById('edicio-pes-net').value = pesNet.toFixed(2);
    
    const pesMig = pesNet / palots;
    document.getElementById('edicio-pes-mig').value = pesMig.toFixed(2);
}

async function guardarEdicionAlbara(event, id) {
    event.preventDefault();
    
    try {
        const dades = {
		data: document.getElementById('edicio-data').value,
		fruita_varietat_id: document.getElementById('edicio-varietat').value,
		finca: document.getElementById('edicio-finca').value,
		qualitat: document.getElementById('edicio-qualitat').value,
		pes_brut: parseFloat(document.getElementById('edicio-pes-brut').value),
		tara_envases: parseFloat(document.getElementById('edicio-tara-env').value),
		tara_vehicle: parseFloat(document.getElementById('edicio-tara-vehicle').value),
		pes_net: parseFloat(document.getElementById('edicio-pes-net').value),
		pes_mig: parseFloat(document.getElementById('edicio-pes-mig').value),
		quantitat_palots_entrada: parseInt(document.getElementById('edicio-palots').value),
		observacions: document.getElementById('edicio-observacions').value
    // SIN updated_by
};
        
        await actualitzarAlbaraEntrada(id, dades);
        mostrarNotificacio('✅ Albarà actualitzat correctament', 'success');
        canviarVistaCollita('registres');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function veureAlbaraRegistre(id) {
    await carregarDadesCollita();
    
    const entrada = await obtenerAlbaraEntradaPorId(id);
    if (!entrada) {
        mostrarNotificacio('❌ Albarà no trobat', 'error');
        return;
    }
    
    const varietat = varietats.find(v => v.id === entrada.fruita_varietat_id);
    const fruita = fruites.find(f => f.id === varietat?.fruita_id);
    
    let html = '<div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;" onclick="if(event.target === this) this.style.display=\'none\';">';
    html += '<div style="background: white; padding: 30px; border-radius: 10px; max-width: 600px; box-shadow: 0 5px 20px rgba(0,0,0,0.3);">';
    
    html += '<h2>📋 Detall Albarà: ' + entrada.num_albara + '</h2>';
    html += '<div style="margin: 20px 0; border-bottom: 1px solid #ddd; padding-bottom: 20px;">';
    
    html += '<p><strong>Data:</strong> ' + formatData(entrada.data) + '</p>';
    html += '<p><strong>Fruita:</strong> ' + (fruita ? fruita.nom : '-') + '</p>';
    html += '<p><strong>Varietat:</strong> ' + (varietat ? varietat.varietat : '-') + '</p>';
    html += '<p><strong>Finca:</strong> ' + (entrada.finca || '-') + '</p>';
    html += '<p><strong>Qualitat:</strong> ' + (entrada.qualitat || '-') + '</p>';
    html += '<p><strong>Pes Net:</strong> ' + (entrada.pes_net || 0).toFixed(2) + ' kg</p>';
    html += '<p><strong>Palots:</strong> ' + (entrada.quantitat_palots_entrada || 0) + '</p>';
    html += '<p><strong>Pes Mig:</strong> ' + (entrada.pes_mig || 0).toFixed(2) + ' kg/palot</p>';
    html += '<p><strong>Observacions:</strong> ' + (entrada.observacions || '-') + '</p>';
    html += '<p><strong>Estat:</strong> ' + (entrada.estat === 'actiu' ? '✅ Actiu' : '❌ Anulat') + '</p>';
    
    html += '</div>';
    
    html += '<div style="text-align: right;">';
    html += '<button class="btn btn-secondary" onclick="this.closest(\'div\').parentElement.style.display=\'none\'">❌ Tancar</button>';
    html += '</div>';
    
    html += '</div>';
    html += '</div>';
    
    // Crear elemento modal
    const modal = document.createElement('div');
    modal.innerHTML = html;
    document.body.appendChild(modal);
}

async function eliminarAlbaraRegistreConfirm(id) {
    if (!confirm('Segur que vols eliminar aquest albarà?')) return;
    
    try {
        await eliminarAlbaraEntrada(id);
        mostrarNotificacio('✅ Albarà eliminat', 'success');
        canviarVistaCollita('registres');
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}
// ============================================================
// SUBSTITUIR COMPLETAMENT editarEscandallRegistre() i guardarEdicionEscandall()
// ============================================================

async function editarEscandallRegistre(id) {
    await carregarDadesCollita();
    
    const escandall = await obtenerEscandallPorId(id);
    if (!escandall) {
        mostrarNotificacio('❌ Escandall no trobat', 'error');
        return;
    }
    
    // ✅ Carregar calibres, NC i indústria existents
    var calibresExistents = [];
    var ncExistents = [];
    var industriaExistent = { pes_kg: 0, percentatge: 0 };
    
    try {
        var respCal = await supabaseClient
            .from('collita_escandall_calibres')
            .select('*')
            .eq('escandall_id', id);
        calibresExistents = respCal.data || [];
        
        var respNC = await supabaseClient
            .from('collita_escandall_no_comercial')
            .select('*')
            .eq('escandall_id', id);
        ncExistents = respNC.data || [];
        
        var respInd = await supabaseClient
			.from('collita_escandall_industria')
			.select('*')
			.eq('escandall_id', id);
		if (respInd.data && respInd.data.length > 0) industriaExistent = respInd.data[0];
		
    } catch(e) {
        console.warn('Error carregant detalls:', e);
    }
    
    const entrada = await obtenerAlbaraEntradaPorId(escandall.collita_entrada_id);
    const container = document.getElementById('view-container');
    
    let html = '<div class="formulari-edicio-escandall">';
    html += '<h2>✏️ Editar Escandall: ' + escandall.num_albara_escandall + '</h2>';
    html += '<form id="form-edicio-escandall" onsubmit="guardarEdicionEscandall(event, \'' + id + '\')" style="background: #f9f9f9; padding: 20px; border-radius: 8px;">';
    
    // Dades bàsiques
    html += '<h3>📋 Dades Bàsiques</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Data</label><input type="date" id="edicio-esc-data" value="' + escandall.data + '" required></div>';
    html += '<div class="form-group"><label>Num. Escandall</label><input type="text" id="edicio-esc-num" value="' + escandall.num_albara_escandall + '" readonly style="background: #f0f0f0;"></div>';
    html += '<div class="form-group"><label>Qualitat Original</label><input type="text" value="' + (entrada?.qualitat || escandall.qualitat_original || '-') + '" readonly style="background: #f0f0f0;"></div>';
    html += '</div>';
    
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 10px;">';
    html += '<div class="form-group"><label>Qualitat Reclassificada</label><select id="edicio-esc-qualitat-rec">';
    qualitats.forEach(function(q) {
        var selected = q.nom === escandall.qualitat_reclassificada ? 'selected' : '';
        html += '<option value="' + q.nom + '" ' + selected + '>' + q.nom + '</option>';
    });
    html += '</select></div>';
    html += '<div class="form-group"><label>Motiu Reclassificació</label><textarea id="edicio-esc-motiu" rows="2">' + (escandall.motiu_reclassificacio || '') + '</textarea></div>';
    html += '</div>';
    
    // Pesos
    html += '<h3 style="margin-top: 20px;">⚖️ Pesos</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Pes Brut (kg)</label><input type="number" id="edicio-esc-pes-brut" value="' + (escandall.pes_brut || '') + '" step="0.01" required onchange="calcularPesEscandall()"></div>';
    html += '<div class="form-group"><label>Tara Envases (kg)</label><input type="number" id="edicio-esc-tara-env" value="' + (escandall.tara_envases || '') + '" step="0.01" required onchange="calcularPesEscandall()"></div>';
    html += '<div class="form-group"><label>Tara Vehicle (kg)</label><input type="number" id="edicio-esc-tara-vehicle" value="' + (escandall.tara_vehicle || '') + '" step="0.01" required onchange="calcularPesEscandall()"></div>';
    html += '<div class="form-group"><label>Pes Net (kg)</label><input type="number" id="edicio-esc-pes-net" value="' + (escandall.pes_net || '') + '" readonly style="background: #e8f5e9;"></div>';
    html += '</div>';
    
    // ✅ CALIBRES
    html += '<h3 style="margin-top: 20px;">📊 Calibres Comercials</h3>';
    html += '<table id="taula-calibres" style="width:100%; border-collapse:collapse;">';
    html += '<thead><tr style="background:#f0f0f0;">';
    html += '<th style="padding:8px; text-align:left;">Calibre</th>';
    html += '<th style="padding:8px; text-align:right;">Pes (kg)</th>';
    html += '<th style="padding:8px; text-align:right;">% </th>';
    html += '<th style="padding:8px; text-align:center;">Acció</th>';
    html += '</tr></thead>';
    html += '<tbody id="calibres-tbody">';
    
    calibresExistents.forEach(function(c) {
        html += generarFilaCalibre(c.calibre, c.pes_kg, c.percentatge);
    });
    
    html += '</tbody></table>';
    html += '<button type="button" class="btn btn-sm btn-secondary" onclick="afegirFilaCalibre()" style="margin-top:8px;">+ Afegir calibre</button>';
    
    // ✅ NO COMERCIAL
    html += '<h3 style="margin-top: 20px;">⚠️ No Comercial</h3>';
    html += '<table id="taula-noCom" style="width:100%; border-collapse:collapse;">';
    html += '<thead><tr style="background:#f0f0f0;">';
    html += '<th style="padding:8px; text-align:left;">Classificació</th>';
    html += '<th style="padding:8px; text-align:right;">Pes (kg)</th>';
    html += '<th style="padding:8px; text-align:right;">%</th>';
    html += '<th style="padding:8px; text-align:center;">Acció</th>';
    html += '</tr></thead>';
    html += '<tbody id="nocom-tbody">';
    
    ncExistents.forEach(function(nc) {
        html += generarFilaNC(nc.classificacio, nc.pes_kg, nc.percentatge);
    });
    
    html += '</tbody></table>';
    html += '<button type="button" class="btn btn-sm btn-secondary" onclick="afegirFilaNC()" style="margin-top:8px;">+ Afegir NC</button>';
    
    // ✅ INDÚSTRIA
    html += '<h3 style="margin-top: 20px;">🏭 Indústria</h3>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Pes (kg)</label><input type="number" id="edicio-esc-industria-pes" value="' + (industriaExistent.pes_kg || 0) + '" step="0.01" min="0"></div>';
    html += '<div class="form-group"><label>%</label><input type="number" id="edicio-esc-industria-perc" value="' + (industriaExistent.percentatge || 0) + '" step="0.01" min="0"></div>';
    html += '</div>';
    
    // Botons
    html += '<div style="margin-top: 20px; display:flex; gap:10px;">';
    html += '<button type="submit" class="btn btn-success">💾 Guardar Canvis</button>';
    html += '<button type="button" class="btn btn-secondary" onclick="canviarVistaCollita(\'escandalls\')">❌ Cancelar</button>';
    html += '</div>';
    
    html += '</form></div>';
    container.innerHTML = html;
}

// ============================================================
// HELPERS - Generar files de calibres i NC
// ============================================================

function generarFilaCalibre(calibre, pesKg, percentatge) {
    var opcions = ['- Selecciona -', '85+', '80-85', '73-80', '67-73', '61-67', '56-61', '60+', '55-60', '50-55', '45-50', '40-45'];
    var html = '<tr style="border-bottom:1px solid #eee;">';
    html += '<td style="padding:6px;"><select style="width:100%;">';
    opcions.forEach(function(o) {
        var sel = o === calibre ? 'selected' : '';
        html += '<option value="' + o + '" ' + sel + '>' + o + '</option>';
    });
    html += '</select></td>';
    html += '<td style="padding:6px;"><input type="number" value="' + (pesKg || 0) + '" step="0.01" min="0" style="width:100%; text-align:right;"></td>';
    html += '<td style="padding:6px;"><input type="number" value="' + ((percentatge || 0).toFixed(2)) + '" step="0.01" min="0" style="width:100%; text-align:right;"></td>';
    html += '<td style="padding:6px; text-align:center;"><button type="button" onclick="this.closest(\'tr\').remove()" style="color:red; background:none; border:none; cursor:pointer;">🗑️</button></td>';
    html += '</tr>';
    return html;
}

function generarFilaNC(classificacio, pesKg, percentatge) {
    var opcions = ['FNC_PETIT', 'FNC_MADUR', 'FNC_DEFECTES', 'Pedra', 'Penal', 'DefecX', 'Defec', 'Decolorat'];
    var html = '<tr style="border-bottom:1px solid #eee;">';
    html += '<td style="padding:6px;"><select style="width:100%;">';
    opcions.forEach(function(o) {
        var sel = o === classificacio ? 'selected' : '';
        html += '<option value="' + o + '" ' + sel + '>' + o + '</option>';
    });
    html += '</select></td>';
    html += '<td style="padding:6px;"><input type="number" value="' + (pesKg || 0) + '" step="0.01" style="width:100%; text-align:right;"></td>';
    html += '<td style="padding:6px;"><input type="number" value="' + ((percentatge || 0).toFixed(2)) + '" step="0.01" min="0" style="width:100%; text-align:right;"></td>';
    html += '<td style="padding:6px; text-align:center;"><button type="button" onclick="this.closest(\'tr\').remove()" style="color:red; background:none; border:none; cursor:pointer;">🗑️</button></td>';
    html += '</tr>';
    return html;
}

function afegirFilaCalibre() {
    document.getElementById('calibres-tbody').innerHTML += generarFilaCalibre('- Selecciona -', 0, 0);
}

function afegirFilaNC() {
    document.getElementById('nocom-tbody').innerHTML += generarFilaNC('FNC_PETIT', 0, 0);
}



// ============================================================
// GUARDAR EDICIÓ ESCANDALL - Amb calibres, NC i indústria
// ============================================================

async function guardarEdicionEscandall(event, id) {
    event.preventDefault();
    
    try {
        // Dades bàsiques
        const dades = {
            data: document.getElementById('edicio-esc-data').value,
            qualitat_reclassificada: document.getElementById('edicio-esc-qualitat-rec').value,
            motiu_reclassificacio: document.getElementById('edicio-esc-motiu').value,
            pes_brut: parseFloat(document.getElementById('edicio-esc-pes-brut').value),
            tara_envases: parseFloat(document.getElementById('edicio-esc-tara-env').value),
            tara_vehicle: parseFloat(document.getElementById('edicio-esc-tara-vehicle').value),
            pes_net: parseFloat(document.getElementById('edicio-esc-pes-net').value),
			
			// ✅ AFEGIR: Resetar alertes
			diferencia_palots: 0,
			diferencia_pes_net: 0
            
        };
        
        // Calibres
        const calibres = [];
        document.querySelectorAll('#calibres-tbody tr').forEach(function(tr) {
            var calibre = tr.querySelectorAll('select')[0].value;
            var pesKg = parseFloat(tr.querySelectorAll('input')[0].value) || 0;
            var perc = parseFloat(tr.querySelectorAll('input')[1].value) || 0;
            if (calibre && calibre !== '- Selecciona -' && pesKg > 0) {
                calibres.push({ calibre: calibre, pes_kg: pesKg, percentatge: perc });
            }
        });
        
        // NC
        const noComercials = [];
        document.querySelectorAll('#nocom-tbody tr').forEach(function(tr) {
            var clas = tr.querySelectorAll('select')[0].value;
            var pesKg = parseFloat(tr.querySelectorAll('input')[0].value) || 0;
            var perc = parseFloat(tr.querySelectorAll('input')[1].value) || 0;
            if (clas && pesKg !== 0) {
                noComercials.push({ classificacio: clas, pes_kg: pesKg, percentatge: perc });
            }
        });
        
        // Indústria
        const industriaPes = parseFloat(document.getElementById('edicio-esc-industria-pes').value) || 0;
        const industriaPerc = parseFloat(document.getElementById('edicio-esc-industria-perc').value) || 0;
        
        // Actualitzar dades bàsiques
        await actualitzarAlbaraEscandall(id, dades);
        
        // Esborrar i reinserir calibres
        await supabaseClient.from('collita_escandall_calibres').delete().eq('escandall_id', id);
        if (calibres.length > 0) {
            const calibresAmbId = calibres.map(function(c) { return { ...c, escandall_id: id }; });
            await supabaseClient.from('collita_escandall_calibres').insert(calibresAmbId);
        }
        
        // Esborrar i reinserir NC
        await supabaseClient.from('collita_escandall_no_comercial').delete().eq('escandall_id', id);
        if (noComercials.length > 0) {
            const ncAmbId = noComercials.map(function(nc) { return { ...nc, escandall_id: id }; });
            await supabaseClient.from('collita_escandall_no_comercial').insert(ncAmbId);
        }
        
        // Esborrar i reinserir indústria
        await supabaseClient.from('collita_escandall_industria').delete().eq('escandall_id', id);
        if (industriaPes > 0) {
            await supabaseClient.from('collita_escandall_industria').insert([{ escandall_id: id, pes_kg: industriaPes, percentatge: industriaPerc }]);
        }
        
        mostrarNotificacio('✅ Escandall actualitzat correctament', 'success');
        canviarVistaCollita('escandalls');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}