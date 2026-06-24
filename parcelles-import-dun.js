// ============================================================
// PARCELLES IMPORT DUN - Importació Excel DUN Generalitat
// Quadern de Camp NLASL
// ============================================================

const DUN_CULTIU_MAP = {
    'ALBERCOQUER':    'ALBERCOC',
    'NECTARINER':     'NECTARINA',
    'PROD. FORESTALS':'FORESTALS'
};

function normalitzarCultiu(cultiu) {
    if (!cultiu) return null;
    const c = cultiu.trim().toUpperCase();
    return DUN_CULTIU_MAP[c] || c;
}

function normalitzarVarietat(varietat) {
    if (!varietat || varietat.trim() === 'NO ESPECIFICADA') return null;
    return varietat.trim();
}

function normalitzarRegadiu(sistemReg) {
    if (!sistemReg) return false;
    const s = sistemReg.trim().toUpperCase();
    return s === 'DEGOTEIG' || s === 'REG PER GRAVETAT' || s.length > 0;
}

// ============================================================
// VISTA IMPORTACIÓ DUN
// ============================================================

async function carregarVistaImportDUN() {
    const container = document.getElementById('view-container');

    // Carregar campanyes existents per al select
    const campanyes = [...new Set(parcelles.map(p => p.campanya).filter(Boolean))].sort((a,b) => b-a);
    const anyActual = new Date().getFullYear();
    if (!campanyes.includes(anyActual)) campanyes.unshift(anyActual);

    let html = '<div class="view-parcelles">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">';
    html += '<h2>📥 Importació DUN</h2>';
    html += '<button class="btn btn-secondary" onclick="canviarVista(\'parcelles\')">← Tornar</button>';
    html += '</div>';

    // Pas 1: Configuració
    html += '<div style="background:#f8f9fa; border-radius:8px; padding:20px; margin-bottom:20px;">';
    html += '<h3 style="margin-top:0;">1. Configuració</h3>';
    html += '<div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-end;">';

    html += '<div><label style="display:block; font-size:12px; margin-bottom:4px;">Campanya *</label>';
    html += '<select id="import-campanya" style="padding:6px 10px; border:1px solid #ddd; border-radius:4px;">';
    campanyes.forEach(c => { html += `<option value="${c}">${c}</option>`; });
    html += '</select></div>';

    html += '<div><label style="display:block; font-size:12px; margin-bottom:4px;">Fitxer Excel DUN *</label>';
    html += '<input type="file" id="import-fitxer" accept=".xlsx,.xls" style="padding:4px;" onchange="processarExcelDUN()">';
    html += '</div>';
    html += '</div></div>';

    // Pas 2: Previsualització (inicialment buit)
    html += '<div id="import-preview"></div>';
    html += '</div>';

    container.innerHTML = html;
}

// ============================================================
// PROCESSAR EXCEL
// ============================================================

async function processarExcelDUN() {
    const fitxer = document.getElementById('import-fitxer').files[0];
    const campanya = parseInt(document.getElementById('import-campanya').value);
    const preview = document.getElementById('import-preview');

    if (!fitxer) return;

    preview.innerHTML = '<p>⏳ Llegint fitxer...</p>';

    try {
        // Llegir Excel amb SheetJS
        const buffer = await fitxer.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const files = XLSX.utils.sheet_to_json(ws, { defval: '' });
console.log('Columnes DUN:', Object.keys(files[0]));
console.log('Primera fila:', files[0]);

        if (!files.length) {
            preview.innerHTML = '<p class="alert alert-error">El fitxer és buit o no té el format correcte.</p>';
            return;
        }

        // Carregar mapatge finques
        const { data: mapatge } = await supabaseClient
            .from('dun_finques_mapatge')
            .select('municipi, poligon, parcela, finca, ref_cadastral, num_explotacio');
console.log('Mapatge carregat:', mapatge.length, 'registres');
console.log('Primer registre mapatge:', mapatge[0]);

        // Processar files
        const registres = processarFilesDUN(files, campanya, mapatge || []);

        // Mostrar previsualització
        mostrarPreviewDUN(registres, campanya);

    } catch (error) {
        console.error('Error llegint Excel:', error);
        preview.innerHTML = '<p class="alert alert-error">Error llegint el fitxer: ' + error.message + '</p>';
    }
}

// ============================================================
// PROCESSAR FILES DUN → REGISTRES PARCELLES
// ============================================================

function processarFilesDUN(files, campanya, mapatge) {
    console.log('Mapatge rebut:', mapatge.length, 'registres');
    console.log('Primer mapatge:', mapatge[0]);
    
    // Primer pas: agrupar per sigpac per detectar subrecintes
    const grupsSigpac = {};

    files.forEach(function(fila) {
        const recinte = (fila['Recinte'] || '').trim();
        if (!recinte) return;

        // Construir sigpac complet (ja ve en format 25010:0:0:502:141:1)
        const sigpac = recinte;
        const parts = sigpac.split(':');
        if (parts.length < 6) return;

        const municipi = parts[0];
        const poligon  = parts[3];
        const parcela  = parts[4];
        const cultiu   = normalitzarCultiu(fila['Producte']);
        const varietat = normalitzarVarietat(fila['Varietat']);

        if (!grupsSigpac[sigpac]) grupsSigpac[sigpac] = [];
        grupsSigpac[sigpac].push({
            sigpac, municipi, poligon, parcela, cultiu, varietat,
            nom: (fila['Finca'] || '').trim() || null,
            superficie: parseFloat(fila['Sup. Neta (Ha)']) || 0,
            regadiu: normalitzarRegadiu(fila['Sistema Regadiu']),
            fila_original: fila
        });
    });

    // Segon pas: assignar subrecintes i buscar finca al mapatge
    const registres = [];

    Object.values(grupsSigpac).forEach(function(grup) {
        grup.forEach(function(reg, idx) {
            // Subrecinte: null si és únic, 'a','b','c'... si hi ha múltiples
            let subrecinte = null;
            if (grup.length > 1) {
                subrecinte = String.fromCharCode(97 + idx); // a, b, c...
            }

            // Buscar finca al mapatge
            const map = mapatge.find(function(m) {
    if (registres.length === 0) { // només per la primera
        console.log('Comparant:', m.municipi, typeof m.municipi, '===', reg.municipi, typeof reg.municipi);
        console.log('Comparant:', m.poligon, typeof m.poligon, '===', reg.poligon, typeof reg.poligon);
        console.log('Comparant:', m.parcela, typeof m.parcela, '===', reg.parcela, typeof reg.parcela);
    }
    return m.municipi === reg.municipi &&
           m.poligon  === reg.poligon  &&
           m.parcela  === reg.parcela;
});

            const fincaNLASL     = map ? map.finca          : null;
            const refCadastral   = map ? map.ref_cadastral   : null;
            const numExplotacio  = map ? map.num_explotacio  : null;

            // Nom: si subrecinte, afegir sufix
            let nom = reg.nom;
            if (nom && subrecinte) nom = nom + ' (' + subrecinte.toUpperCase() + ')';

            registres.push({
                sigpac:          reg.sigpac,
                subrecinte:      subrecinte,
                nom:             nom,
                cultiu:          reg.cultiu,
                varietat:        reg.varietat,
                superficie:      reg.superficie,
                regadiu:         reg.regadiu,
                finca:           fincaNLASL,
                ref_cadastral:   refCadastral,
                num_explotacio:  numExplotacio,
                campanya:        campanya,
                actiu:           true,
                // Estat per la previsualització
                _estat:          fincaNLASL ? 'ok' : 'pendent'
            });
        });
    });

    // Ordenar per finca i sigpac
    registres.sort(function(a, b) {
        const fa = a.finca || 'ZZZZ';
        const fb = b.finca || 'ZZZZ';
        if (fa !== fb) return fa.localeCompare(fb);
        return a.sigpac.localeCompare(b.sigpac);
    });

    return registres;
}

// ============================================================
// PREVISUALITZACIÓ
// ============================================================

function mostrarPreviewDUN(registres, campanya) {
    const preview = document.getElementById('import-preview');

    const total    = registres.length;
    const ok       = registres.filter(r => r._estat === 'ok').length;
    const pendents = registres.filter(r => r._estat === 'pendent').length;

    let html = '<div style="background:#f8f9fa; border-radius:8px; padding:20px;">';
    html += '<h3 style="margin-top:0;">2. Previsualització — Campanya ' + campanya + '</h3>';

    // Resum
    html += '<div style="display:flex; gap:20px; margin-bottom:15px; flex-wrap:wrap;">';
    html += '<div style="background:#d4edda; padding:10px 20px; border-radius:6px;"><strong>' + total + '</strong> registres totals</div>';
    html += '<div style="background:#d4edda; padding:10px 20px; border-radius:6px;">✅ <strong>' + ok + '</strong> amb finca</div>';
    if (pendents > 0) {
        html += '<div style="background:#fff3cd; padding:10px 20px; border-radius:6px;">⚠️ <strong>' + pendents + '</strong> sense finca (cal revisar)</div>';
    }
    html += '</div>';

    // Taula
    html += '<div class="table-container"><table class="data-table" style="font-size:13px;">';
    html += '<thead><tr><th></th><th>SIGPAC</th><th>Nom (DUN)</th><th>Finca (NLASL)</th><th>Cultiu</th><th>Varietat</th><th>Ha</th><th>Reg</th><th>Sub</th></tr></thead>';
    html += '<tbody>';

    registres.forEach(function(r, idx) {
        const estat = r._estat === 'ok'
            ? '<span style="color:#28a745;">✅</span>'
            : '<span style="color:#ffc107;">⚠️</span>';
        const fincaHtml = r.finca
            ? r.finca
            : '<em style="color:#999;">Sense finca</em>';
        const regHtml = r.regadiu ? '💧' : '';
        const subHtml = r.subrecinte ? r.subrecinte.toUpperCase() : '';

        html += '<tr>' +
            '<td>' + estat + '</td>' +
            '<td style="font-size:11px;">' + r.sigpac + '</td>' +
            '<td>' + (r.nom || '-') + '</td>' +
            '<td>' + fincaHtml + '</td>' +
            '<td>' + (r.cultiu || '-') + '</td>' +
            '<td style="font-size:11px;">' + (r.varietat || '-') + '</td>' +
            '<td>' + r.superficie + '</td>' +
            '<td>' + regHtml + '</td>' +
            '<td>' + subHtml + '</td>' +
            '</tr>';
    });

    html += '</tbody></table></div>';

    // Botons
    html += '<div style="display:flex; gap:10px; margin-top:15px; justify-content:flex-end;">';
    html += '<button class="btn btn-secondary" onclick="processarExcelDUN()">🔄 Recarregar</button>';
    html += '<button class="btn btn-primary" onclick="confirmarImportDUN()" style="padding:10px 30px;">💾 Importar ' + total + ' registres</button>';
    html += '</div>';
    html += '</div>';

    preview.innerHTML = html;

    // Guardar registres per la confirmació
    window._dunRegistresPendents = registres;
}

// ============================================================
// CONFIRMAR IMPORTACIÓ
// ============================================================

async function confirmarImportDUN() {
    const registres = window._dunRegistresPendents;
    if (!registres || !registres.length) return;

    const campanya = parseInt(document.getElementById('import-campanya').value);

    if (!confirm('Segur que vols importar ' + registres.length + ' parcel·les per la campanya ' + campanya + '?\n\nAquesta acció no sobreescriu campanyes anteriors.')) return;

    const btnConfirmar = document.querySelector('button[onclick="confirmarImportDUN()"]');
    if (btnConfirmar) { btnConfirmar.disabled = true; btnConfirmar.textContent = '⏳ Important...'; }

    try {
        // Netejar camps interns (_estat) abans d'inserir
        const dades = registres.map(function(r) {
            const d = Object.assign({}, r);
            delete d._estat;
            return d;
        });

        // Upsert per sigpac + campanya + subrecinte
        const { error } = await supabaseClient
            .from('parcelles')
            .upsert(dades, {
                onConflict: 'sigpac,campanya,subrecinte',
                ignoreDuplicates: false
            });

        if (error) throw error;

        // Recarregar parcelles globals
        parcelles = await getParcellas();

        mostrarNotificacio('✅ ' + dades.length + ' parcel·les importades correctament', 'success');
        canviarVista('parcelles');

    } catch (error) {
        console.error('Error important:', error);
        mostrarNotificacio('Error important: ' + error.message, 'error');
        if (btnConfirmar) { btnConfirmar.disabled = false; btnConfirmar.textContent = '💾 Importar'; }
    }
}

console.log('✅ parcelles-import-dun.js carregat');