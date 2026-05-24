// ============================================================
// SUBSTITUIR mostrarVista_Entrades() i mostrarTaulaEntrades()
// a collita-ui_v1.js
// ============================================================

async function mostrarVista_Entrades() {
    const container = document.getElementById('view-container');

    // Detectar campanya actual
    const ara = new Date();
    const mes = ara.getMonth() + 1;
    const campanyadefecte = mes >= 10 ? ara.getFullYear() + 1 : ara.getFullYear();

    let html = '<div class="vista-entrades">';
    html += '<h2>🍎 Collita - Entrades</h2>';

    // Navegació - botons
    html += '<div style="margin-bottom:15px; border-bottom:2px solid #ddd; padding-bottom:10px;">';
    html += '<button class="btn btn-primary" onclick="mostrarFormulariAlbaraEntrada()" style="margin-right:10px;">➕ Nova Entrada</button>';
    html += '<button class="btn btn-info" onclick="mostrarResumEntrades()" style="margin-right:10px;">📊 Resum</button>';
    html += '<button class="btn btn-info" onclick="canviarVistaCollita(\'analisi\')" style="margin-right:10px;">📊 Anàlisi</button>';
    html += '<button class="btn btn-secondary" onclick="canviarVistaCollita(\'escandalls\')" style="margin-right:10px;">→ Escandalls</button>';
    html += '</div>';

    // Filtres
    html += '<div style="display:flex; gap:15px; align-items:flex-end; margin-bottom:15px; flex-wrap:wrap; background:#f5f5f5; padding:12px; border-radius:8px;">';

    // Campanya
    html += '<div><label style="display:block; font-size:0.85em; margin-bottom:3px;"><strong>Campanya</strong></label>';
    html += '<select id="filtre-campanya-entrades" onchange="mostrarTaulaEntrades()" style="padding:6px; border-radius:4px; border:1px solid #ddd;">';
    [2024, 2025, 2026, 2027].forEach(function(c) {
        var sel = c === campanyadefecte ? ' selected' : '';
        html += '<option value="' + c + '"' + sel + '>' + c + '</option>';
    });
    html += '</select></div>';

    // Fruita
    html += '<div><label style="display:block; font-size:0.85em; margin-bottom:3px;"><strong>Fruita</strong></label>';
    html += '<select id="filtre-fruita-entrades" onchange="actualitzarVarietatsEntrades()" style="padding:6px; border-radius:4px; border:1px solid #ddd;">';
    html += '<option value="">Totes</option>';
    fruites.forEach(function(f) {
        html += '<option value="' + f.id + '">' + f.nom + '</option>';
    });
    html += '</select></div>';

    // Varietat
    html += '<div><label style="display:block; font-size:0.85em; margin-bottom:3px;"><strong>Varietat</strong></label>';
    html += '<select id="filtre-varietat-entrades" onchange="mostrarTaulaEntrades()" style="padding:6px; border-radius:4px; border:1px solid #ddd;">';
    html += '<option value="">Totes</option>';
    html += '</select></div>';

    // Botó netejar filtres
    html += '<div><label style="display:block; font-size:0.85em; margin-bottom:3px;">&nbsp;</label>';
    html += '<button class="btn btn-secondary" onclick="netejarFiltresEntrades()">✕ Netejar</button>';
    html += '</div>';

    html += '</div>';

    // Contingut taula
    html += '<div id="collita-content"></div>';
    html += '</div>';

    container.innerHTML = html;

    // Funció per actualitzar varietats quan canvia fruita
    window.actualitzarVarietatsEntrades = function() {
        const fruitaId = document.getElementById('filtre-fruita-entrades').value;
        const sel = document.getElementById('filtre-varietat-entrades');
        sel.innerHTML = '<option value="">Totes</option>';
        if (fruitaId) {
            varietats
                .filter(function(v) { return v.fruita_id === fruitaId; })
                .forEach(function(v) {
                    sel.innerHTML += '<option value="' + v.id + '">' + v.varietat + '</option>';
                });
        }
        mostrarTaulaEntrades();
    };

    // Funció per netejar filtres
    window.netejarFiltresEntrades = function() {
        document.getElementById('filtre-fruita-entrades').value = '';
        document.getElementById('filtre-varietat-entrades').innerHTML = '<option value="">Totes</option>';
        const campanyaActual = mes >= 10 ? ara.getFullYear() + 1 : ara.getFullYear();
        document.getElementById('filtre-campanya-entrades').value = campanyaActual;
        mostrarTaulaEntrades();
    };

    await mostrarTaulaEntrades();
}

// ============================================================
// SUBSTITUIR mostrarTaulaEntrades()
// ============================================================

async function mostrarTaulaEntrades() {
    const content = document.getElementById('collita-content');
    if (!content) return;

    content.innerHTML = '<p>⏳ Carregant entrades...</p>';

    // Llegir filtres
    const campanya = parseInt(document.getElementById('filtre-campanya-entrades')?.value) || null;
    const fruitaId = document.getElementById('filtre-fruita-entrades')?.value || null;
    const varietatId = document.getElementById('filtre-varietat-entrades')?.value || null;

    // Carregar entrades filtrades per campanya
    let entrades = await obtenirTodasEntradas(campanya);

    // Filtrar per fruita
    if (fruitaId) {
        entrades = entrades.filter(function(e) {
            return e.fruita_varietat_id?.fruita_id === fruitaId;
        });
    }

    // Filtrar per varietat
    if (varietatId) {
        entrades = entrades.filter(function(e) {
            const fvId = typeof e.fruita_varietat_id === 'object'
                ? e.fruita_varietat_id?.id
                : e.fruita_varietat_id;
            return fvId === varietatId;
        });
    }

    // Carregar IDs d'entrades amb escandall
    const { data: escandallsIds } = await supabaseClient
        .from('collita_escandall')
        .select('collita_entrada_id')
        .eq('estat', 'actiu');

    const idsAmbEscandall = new Set(
        (escandallsIds || []).map(function(e) { return e.collita_entrada_id; })
    );

    // Resum
    const totalKg = entrades.reduce(function(s, e) { return s + (parseFloat(e.pes_net) || 0); }, 0);
    const pendents = entrades.filter(function(e) { return !idsAmbEscandall.has(e.id); }).length;

    let html = '';

    // Resum ràpid
    html += '<div style="display:flex; gap:15px; margin-bottom:15px; flex-wrap:wrap;">';
    html += '<div style="background:#e8f5e9; border:2px solid #27ae60; border-radius:8px; padding:10px; flex:1;">';
    html += '📦 <strong>' + entrades.length + '</strong> albarans · <strong>' + totalKg.toLocaleString('ca-ES', {maximumFractionDigits:0}) + ' kg</strong>';
    html += '</div>';
    if (pendents > 0) {
        html += '<div style="background:#fde8e8; border:2px solid #e74c3c; border-radius:8px; padding:10px; flex:1;">';
        html += '❌ <strong>' + pendents + '</strong> albarans sense escandall';
        html += '</div>';
    }
    html += '</div>';

    if (entrades.length === 0) {
        html += '<p style="text-align:center; color:#999; padding:30px;">No hi ha entrades per aquest filtre</p>';
        content.innerHTML = html;
        return;
    }

    // Taula
    html += '<div class="table-container">';
    html += '<table class="data-table" style="width:100%;">';
    html += '<thead><tr>';
    html += '<th>Data</th><th>Num. Albarà</th><th>Fruita / Varietat</th><th>Finca</th><th>Qualitat</th>';
    html += '<th style="text-align:right;">Pes Net (kg)</th>';
    html += '<th style="text-align:right;">Palots</th>';
    html += '<th style="text-align:right;">Pes Mig</th>';
    html += '<th style="text-align:center;">Escandall</th>';
    html += '<th>Accions</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    entrades.forEach(function(e) {
        const teEscandall = idsAmbEscandall.has(e.id);
        const fruita = fruites.find(function(f) { return f.id === (e.fruita_varietat_id?.fruita_id || null); });
        const varietat = e.fruita_varietat_id?.varietat || '-';
        const finca = e.finca || '-';

        html += '<tr>';
        html += '<td>' + formatData(e.data) + '</td>';
        html += '<td><strong>' + e.num_albara + '</strong></td>';
        html += '<td>' + (fruita ? fruita.nom : '-') + ' / ' + varietat + '</td>';
        html += '<td>' + finca + '</td>';
        html += '<td>' + (e.qualitat || '-') + '</td>';
        html += '<td style="text-align:right;">' + (e.pes_net || 0).toFixed(2) + '</td>';
        html += '<td style="text-align:right;">' + (e.quantitat_palots_entrada || 0) + '</td>';
        html += '<td style="text-align:right;">' + (e.pes_mig || 0).toFixed(2) + '</td>';
        html += '<td style="text-align:center;">' +
            (teEscandall ?
                '✅' :
                '<span style="color:#e74c3c; font-weight:bold;">❌ Pendent</span>') +
        '</td>';
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
