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
    await carregarDadesCollita();  // ← Cargar datos PRIMERO
    
    const container = document.getElementById('view-container');
    
    let html = '<div class="vista-entrades">';
    html += '<h2>🍎 Collita - Entrades</h2>';
    
    // Navegació
    html += '<div style="margin-bottom: 20px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">';
    html += '<button class="btn btn-primary" onclick="mostrarFormulariAlbaraEntrada()" style="margin-right: 10px;">➕ Nova Entrada</button>';
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
    const entrades = await obtenirTotesEntrades();
    
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
        const finca = finques.find(f => f.id === e.finca_id);
        
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
        html += '<button class="btn btn-sm btn-primary" onclick="veureAlbaraEntrada(\'' + e.id + '\')">👁️</button> ';
        html += '<button class="btn btn-sm btn-secondary" onclick="editarAlbaraEntrada(\'' + e.id + '\')">✏️</button> ';
        html += '<button class="btn btn-sm btn-danger" onclick="eliminarAlbaraEntradaConfirm(\'' + e.id + '\')">🗑️</button>';
        html += '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    content.innerHTML = html;
}

// ============================================================
// 2. FORMULARI ALBARÀ ENTRADA
// ============================================================

async function mostrarFormulariAlbaraEntrada() {
    await carregarDadesCollita();  // ← ESTO debe estar PRIMERO
    
    const container = document.getElementById('view-container');
    
    // Obté varietats per fruita
    const varietatsPorFruita = {};
    varietats.forEach(v => {
        if (!varietatsPorFruita[v.fruita_id]) {
            varietatsPorFruita[v.fruita_id] = [];
        }
        varietatsPorFruita[v.fruita_id].push(v);
    });
    
    let html = '<div class="formulari-entrada">';
    html += '<h2>🍎 Collita - Nova Entrada</h2>';
    html += '<form id="form-entrada" onsubmit="guardarAlbaraEntrada(event)" style="background: #f9f9f9; padding: 20px; border-radius: 8px;">';
    
    // Row 1
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Data *</label><input type="date" id="entrada-data" required></div>';
    html += '<div class="form-group"><label>Num. Albarà *</label><input type="text" id="entrada-num-albara" required placeholder="ex: 11072025"></div>';
    html += '<div class="form-group"><label>Fruita *</label><select id="entrada-fruita" required onchange="actualitzarVarietats()"><option value="">- Selecciona -</option>';
    fruites.forEach(f => {
    html += (fruites.map(f => '<option value="' + f.id + '">' + f.nom + '</option>').join(''));
    });
    html += '</select></div>';
    html += '</div>';
    
    // Row 2
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Varietat *</label><select id="entrada-varietat" required><option value="">- Selecciona fruita -</option></select></div>';
    html += '<div class="form-group"><label>Finca *</label><select id="entrada-finca" required><option value="">- Selecciona -</option>';
    finques.forEach(f => {
    html += '<option value="' + f + '">' + f + '</option>';
	});
    html += '</select></div>';
    html += '<div class="form-group"><label>Qualitat *</label><select id="entrada-qualitat" required><option value="">- Selecciona -</option>';
    qualitats.forEach(q => {
        html += '<option value="' + q.nom + '">' + q.nom + '</option>';
    });
    html += '</select></div>';
    html += '</div>';
    
    // Envasos Entrada
    html += '<h4 style="margin-top: 20px;">📦 Envasos Entrada</h4>';
    html += '<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">';
    html += '<div class="form-group"><label>Tipus Envàs</label><input type="text" id="entrada-tipus-envases" placeholder="ex: PALOT PLASTICO 207V"></div>';
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
    html += '<div class="form-group"><label>Pes Brut (kg) *</label><input type="number" id="entrada-pes-brut" min="0" step="0.01" required onchange="calcularPesNet()"></div>';
    html += '<div class="form-group"><label>Tara Envases (kg) *</label><input type="number" id="entrada-tara-env" min="0" step="0.01" required onchange="calcularPesNet()"></div>';
    html += '<div class="form-group"><label>Tara Vehicle (kg) *</label><input type="number" id="entrada-tara-vehicle" min="0" step="0.01" required onchange="calcularPesNet()"></div>';
    html += '<div class="form-group"><label>Pes Net (kg)</label><input type="number" id="entrada-pes-net" readonly style="background: #e8f5e9;"></div>';
    html += '</div>';
    
    html += '<div class="form-group"><label>Pes Mig (kg/palot)</label><input type="number" id="entrada-pes-mig" readonly style="background: #e8f5e9;"></div>';
    
    // Observacions
    html += '<div class="form-group"><label>Observacions</label><textarea id="entrada-observacions" rows="3" placeholder="Anotacions addicionals..."></textarea></div>';
    
    // Botons
    html += '<div style="margin-top: 20px;">';
    html += '<button type="submit" class="btn btn-success">💾 Guardar Entrada</button>';
    html += '<button type="button" class="btn btn-secondary" onclick="canviarVistaCollita(\'entrades\')" style="margin-left: 10px;">❌ Cancelar</button>';
    html += '</div>';
    
    html += '</form></div>';
    
    container.innerHTML = html;
    
    // Inicialitzar data actual
    document.getElementById('entrada-data').valueAsDate = new Date();
}

function actualitzarVarietats() {
    const fruitaId = document.getElementById('entrada-fruita').value;
    const varietatSelect = document.getElementById('entrada-varietat');
    
    varietatSelect.innerHTML = '<option value="">- Selecciona varietat -</option>';
    
    varietats.filter(v => v.fruita_id === fruitaId).forEach(v => {
        const option = document.createElement('option');
        option.value = v.id;
        option.textContent = v.varietat;
        varietatSelect.appendChild(option);
    });
}

function calcularPesNet() {
    const pesBrut = parseFloat(document.getElementById('entrada-pes-brut').value) || 0;
    const taraEnv = parseFloat(document.getElementById('entrada-tara-env').value) || 0;
    const taraVehicle = parseFloat(document.getElementById('entrada-tara-vehicle').value) || 0;
    
    const pesNet = pesBrut - taraEnv - taraVehicle;
    document.getElementById('entrada-pes-net').value = pesNet.toFixed(2);
    
    // Calcular pes mig
    const quantitatPalots = parseInt(document.getElementById('entrada-quantitat-palots').value) || 1;
    const pesMig = pesNet / quantitatPalots;
    document.getElementById('entrada-pes-mig').value = pesMig.toFixed(2);
}

async function guardarAlbaraEntrada(event) {
    event.preventDefault();
    
    try {
		// Obtener el ID de parcella que tiene esa finca
			const fincaNombre = document.getElementById('entrada-finca').value;
			
						
        const dades = {
            data: document.getElementById('entrada-data').value,
            num_albara: document.getElementById('entrada-num-albara').value,
            fruita_varietat_id: document.getElementById('entrada-varietat').value,
            finca: fincaNombre,  // ← Guardar el NOMBRE, no fincaId
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

function editarAlbaraEntrada(id) {
    mostrarNotificacio('Editar entrada: ' + id, 'info');
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
    const escandalls = await obtenirTotsEscandalls();
    
    let html = '<div class="taula-escandalls">';
    html += '<table class="data-table" style="width: 100%;">';
    html += '<thead><tr>';
    html += '<th>Data</th><th>Num. Escandall</th><th>Fruita-Varietat</th><th>Pes Net (kg)</th>';
    html += '<th>Qualitat Orig → Reclassificada</th><th>Alerts</th><th>Accions</th>';
    html += '</tr></thead>';
    html += '<tbody>';
    
    escandalls.forEach(e => {
        const fruita = fruites.find(f => f.id === (e.fruita_varietat_id?.fruita_id || null));
        const varietat = e.fruita_varietat_id?.varietat || '-';
        
        let alertIcon = '✅';
        if (e.diferencia_pes_net > 0) alertIcon = '⚠️';
        if (e.diferencia_palots > 0) alertIcon = '⚠️';
        
        html += '<tr>';
        html += '<td>' + formatData(e.data) + '</td>';
        html += '<td><strong>' + e.num_albara_escandall + '</strong></td>';
        html += '<td>' + (fruita ? fruita.nom : '-') + ' / ' + varietat + '</td>';
        html += '<td>' + (e.pes_net || 0).toFixed(2) + '</td>';
        html += '<td>' + (e.qualitat_original || '-') + ' → ' + (e.qualitat_reclassificada || '-') + '</td>';
        html += '<td>' + alertIcon + '</td>';
        html += '<td>';
        html += '<button class="btn btn-sm btn-primary" onclick="veureEscandall(\'' + e.id + '\')">👁️</button> ';
        html += '<button class="btn btn-sm btn-secondary" onclick="editarEscandall(\'' + e.id + '\')">✏️</button>';
        html += '</td>';
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
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
    html += '<table id="taula-calibres" class="data-table" style="margin-top: 10px; width: 100%;"><thead><tr><th>Calibre</th><th>Pes (kg)</th><th>%</th><th>Color</th><th>Categoria</th><th></th></tr></thead><tbody></tbody></table>';
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

	// Camp hidden (DINS del form)
	html += '<input type="hidden" id="escandall-palots-entrada" value="">';

	html += '</form></div>';
    
    container.innerHTML = html;
    document.getElementById('escandall-data').valueAsDate = new Date();
}

async function buscarEntrada() {
    const numAlbara = document.getElementById('escandall-num-entrada').value;
    const entrada = await obtenerAlbaraEntradaPorNum(numAlbara);
    
    if (entrada) {
        document.getElementById('entrada-info').style.display = 'block';
        
        // Busquem la fruita per obtenir el nom i l'ID
        // Necesitas hacer un JOIN o cargar los datos relacionados
		const varietat = varietats.find(v => v.id === entrada.fruita_varietat_id);
		const fruita = fruites.find(f => f.id === varietat?.fruita_id);  // ← Usar fruita_id de varietat

		// Obtener nombre finca desde parcelles
		const parcellaAmbFinca = parcelles.find(p => p.id === entrada.finca_id);
		const fincaNom = entrada.finca || 'Desconeguda';

		document.getElementById('entrada-info').innerHTML = `
			<strong>Fruita:</strong> ${fruita?.nom || '-'} / ${varietat?.varietat || '-'}<br>
			<strong>Finca:</strong> ${fincaNom}<br>
            <strong>Pes Net:</strong> ${(entrada.pes_net || 0).toFixed(2)} kg<br>
            <strong>Palots Entrada:</strong> ${entrada.quantitat_palots_entrada || 0}
        `;
        
        // Guardar palots entrada
        document.getElementById('escandall-palots-entrada').value = entrada.quantitat_palots_entrada || 0;
        
		// Copiar dades a escandall
		document.getElementById('escandall-qualitat-original').value = entrada.qualitat || '-';
		document.getElementById('escandall-pes-brut').value = entrada.pes_brut || '';
		document.getElementById('escandall-tara-env').value = entrada.tara_envases || '';
		document.getElementById('escandall-tara-vehicle').value = entrada.tara_vehicle || '';
		calcularPesNetEscandall();

		// --- NOVA LÒGICA DE CALIBRES ---
		// Buscar la varietat para obtener fruita_id
		
		if (fruita) {
			const calibresDisponibles = calibresFruita[fruita.id] || [];
    
			// Netejar taula calibres
			document.querySelector('#taula-calibres tbody').innerHTML = '';
		
			// Afegir files amb calibres disponibles
			calibresDisponibles.forEach(calibre => {
				afegirFilaCalibres(calibre);
    });
}
        // -------------------------------

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
        tr.querySelectorAll('input')[1].value = percentatge.toFixed(1);
    });
    
    // No Comercial
    document.querySelectorAll('#taula-noCom tbody tr').forEach(tr => {
        const pesKg = parseFloat(tr.querySelectorAll('input')[0].value) || 0;
        pesTotal += pesKg;
        const percentatge = (pesKg / pesTotalEsperat) * 100;
        tr.querySelectorAll('input')[1].value = percentatge.toFixed(1);
    });
    
    // Industria
    pesTotal += pesIndustria;
    const percIndustria = (pesIndustria / pesTotalEsperat) * 100;
    document.getElementById('escandall-industria-perc').value = percIndustria.toFixed(1);
    
    // Validar suma percentatges
    const sumPercentatges = Array.from(document.querySelectorAll('#taula-calibres input[readonly]')).reduce((s, inp) => s + (parseFloat(inp.value) || 0), 0) +
                            Array.from(document.querySelectorAll('#taula-noCom input[readonly]')).reduce((s, inp) => s + (parseFloat(inp.value) || 0), 0) +
                            percIndustria;
    
    const validacio = document.getElementById('validacio-percentatges');
    if (Math.abs(sumPercentatges - 100) > 0.5) {
        validacio.style.display = 'block';
        validacio.innerHTML = `⚠️ Suma percentatges: ${sumPercentatges.toFixed(1)}% (ha de ser ~100%)`;
    } else {
        validacio.style.display = 'none';
    }
}

async function guardarAlbaraEscandall(event) {
    event.preventDefault();
    
    try {
		const palotsentrada = parseInt(document.getElementById('escandall-palots-entrada').value) || 0;
    
		// Los palots del escandall = número de filas de calibres (cada fila = 1 palot aproximadamente)
		// O: suma de calibres / pes_mig de entrada
		// En guardarAlbaraEscandall:
		const entrada = await obtenerAlbaraEntradaPorNum(document.getElementById('escandall-num-entrada').value);
		const num_albara_escandall = entrada.num_albara + '-ESC';  // Autoassignado
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
            data: new Date().toISOString().split('T')[0],  // ← HOY automático
            num_albara_escandall: document.getElementById('escandall-num-albara').value,
            fruita_varietat_id: entrada.fruita_varietat_id,
            finca_id: entrada.finca_id,
            qualitat_original: document.getElementById('escandall-qualitat-original').value,
            qualitat_reclassificada: document.getElementById('escandall-qualitat-reclassificada').value,
            motiu_reclassificacio: document.getElementById('escandall-motiu').value,
            pes_brut: parseFloat(document.getElementById('escandall-pes-brut').value),
            tara_envases: parseFloat(document.getElementById('escandall-tara-env').value),
            tara_vehicle: parseFloat(document.getElementById('escandall-tara-vehicle').value),
            pes_net: parseFloat(document.getElementById('escandall-pes-net').value),
            created_by: currentUser ? currentUser.id : null,
			  diferencia_palots: Math.abs(palotsentrada - (entrada.quantitat_palots_entrada || 0))
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

function veureEscandall(id) {
    mostrarNotificacio('Detall escandall: ' + id, 'info');
}

function editarEscandall(id) {
    mostrarNotificacio('Editar escandall: ' + id, 'info');
}
