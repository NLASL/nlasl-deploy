// ============================================================
// PARCELLES IMPORT DUN v2 — Importació Excel DUN Generalitat
// Quadern de Camp NLASL · preparació QIE
//
// Canvis respecte a la v1:
//  - Guarda l'Ordre (= número de DGC al QIE) i els codis oficials de
//    producte i varietat de la DUN.
//  - Ja no fa servir upsert (l'índex únic de parcelles és d'expressió i
//    PostgreSQL no el pot inferir). Fa match manual i separa insercions
//    i actualitzacions.
//  - La identitat d'una línia és l'Ordre. Les lletres de subrecinte
//    (a, b, c) només s'assignen a files NOVES i no es canvien mai en
//    files existents (així no hi ha conflictes d'unicitat ni intercanvis).
//  - En reimportar, no esborra mai res: les files de la BD que ja no
//    apareixen al fitxer només es mostren a l'avís.
//  - No sobreescriu finca/ref. cadastral/nº explotació amb valors buits.
//
// Requereix: parcelles_dgc_migracio.sql executat abans.
// IMPORTANT: substitueix parcelles-import-dun.js a index.html (no
// carregar-los tots dos: redeclararien les mateixes funcions i const).
// ============================================================

const DUN_CULTIU_MAP = {
    'ALBERCOQUER':     'ALBERCOC',
    'NECTARINER':      'NECTARINA',
    'PROD. FORESTALS': 'FORESTALS'
};

// codi_producte (text) → cultiu de l'app. Es carrega de dun_productes_mapatge.
let _dunProductesMapa = {};

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function dunEscapeHtml(valor) {
    return String(valor === null || valor === undefined ? '' : valor)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Normalitza un identificador SIGPAC (treu espais i zeros a l'esquerra)
function dunNorm(valor) {
    return String(valor === null || valor === undefined ? '' : valor)
        .trim().replace(/^0+(?=\d)/, '');
}

function dunText(valor) {
    const s = String(valor === null || valor === undefined ? '' : valor).trim();
    return s === '' ? null : s;
}

function normalitzarCultiu(cultiu) {
    if (!cultiu) return null;
    const c = String(cultiu).trim().toUpperCase();
    return DUN_CULTIU_MAP[c] || c;
}

function normalitzarVarietat(varietat) {
    if (!varietat || String(varietat).trim() === 'NO ESPECIFICADA') return null;
    return String(varietat).trim();
}

// Regadiu: té sistema de reg declarat, o bé la columna S/R val 'R'
function normalitzarRegadiu(sistemaReg, sr) {
    if (sistemaReg && String(sistemaReg).trim().length > 0) return true;
    return String(sr || '').trim().toUpperCase() === 'R';
}

function dunLletraSubrecinte(index) {
    return String.fromCharCode(97 + index); // 0 → a, 1 → b...
}

// ------------------------------------------------------------
// VISTA
// ------------------------------------------------------------

async function carregarVistaImportDUN() {
    const container = document.getElementById('view-container');

    const campanyes = [...new Set(parcelles.map(function(p) { return p.campanya; }).filter(Boolean))];
    const anyActual = new Date().getFullYear();
    [anyActual, anyActual + 1].forEach(function(a) {
        if (!campanyes.includes(a)) campanyes.push(a);
    });
    campanyes.sort(function(a, b) { return b - a; });

    let html = '<div class="view-parcelles">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">';
    html += '<h2>📥 Importació DUN</h2>';
    html += '<button class="btn btn-secondary" onclick="canviarVista(\'parcelles\')">← Tornar</button>';
    html += '</div>';

    html += '<div style="background:#f8f9fa; border-radius:8px; padding:20px; margin-bottom:20px;">';
    html += '<h3 style="margin-top:0;">1. Configuració</h3>';
    html += '<div style="display:flex; gap:20px; flex-wrap:wrap; align-items:flex-end;">';
    html += '<div><label style="display:block; font-size:12px; margin-bottom:4px;">Campanya *</label>';
    html += '<select id="import-campanya" style="padding:6px 10px; border:1px solid #ddd; border-radius:4px;">';
    campanyes.forEach(function(c) {
        html += '<option value="' + c + '"' + (c === anyActual ? ' selected' : '') + '>' + c + '</option>';
    });
    html += '</select></div>';
    html += '<div><label style="display:block; font-size:12px; margin-bottom:4px;">Fitxer Excel DUN *</label>';
    html += '<input type="file" id="import-fitxer" accept=".xlsx,.xls" style="padding:4px;" onchange="processarExcelDUN()">';
    html += '</div></div>';
    html += '<p style="font-size:12px; color:#666; margin:12px 0 0;">Es pot tornar a importar el mateix fitxer o un de nou de la mateixa campanya: les línies es relacionen pel número d\'Ordre i no es dupliquen ni s\'esborra res.</p>';
    html += '</div>';

    html += '<div id="import-preview"></div></div>';
    container.innerHTML = html;
}

// ------------------------------------------------------------
// PROCESSAR EXCEL
// ------------------------------------------------------------

async function processarExcelDUN() {
    const fitxer = document.getElementById('import-fitxer').files[0];
    const campanya = parseInt(document.getElementById('import-campanya').value);
    const preview = document.getElementById('import-preview');
    if (!fitxer) return;

    preview.innerHTML = '<p>⏳ Llegint fitxer...</p>';

    try {
        const buffer = await fitxer.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const files = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!files.length) {
            preview.innerHTML = '<p class="alert alert-error">El fitxer és buit o no té el format correcte.</p>';
            return;
        }

        const obligatories = ['Ordre', 'Recinte', 'Producte', 'Codi Producte', 'Sup. Neta (Ha)'];
        const absents = obligatories.filter(function(c) { return !(c in files[0]); });
        if (absents.length) {
            preview.innerHTML = '<p class="alert alert-error">Falten columnes al fitxer: ' + dunEscapeHtml(absents.join(', ')) + '</p>';
            return;
        }

        // Mapatge de finques (municipi + polígon + parcel·la → finca NLASL)
        const resMapatge = await supabaseClient
            .from('dun_finques_mapatge')
            .select('municipi, poligon, parcela, finca, ref_cadastral, num_explotacio');
        if (resMapatge.error) throw resMapatge.error;

        // Mapatge de productes DUN → cultiu de l'app (opcional: si falla, s'usa el mapa de text)
        _dunProductesMapa = {};
        const resProd = await supabaseClient
            .from('dun_productes_mapatge')
            .select('codi_producte, cultiu_app');
        if (resProd.error) {
            console.warn('dun_productes_mapatge no disponible, s\'usa el mapa de text:', resProd.error.message);
            mostrarNotificacio('⚠️ Taula dun_productes_mapatge no disponible: s\'usen els noms de la DUN', 'warning');
        } else {
            (resProd.data || []).forEach(function(r) { _dunProductesMapa[String(r.codi_producte)] = r.cultiu_app; });
        }

        // Parcel·les ja existents d'aquesta campanya
        const resExist = await supabaseClient
            .from('parcelles')
            .select('*')
            .eq('campanya', campanya);
        if (resExist.error) throw resExist.error;

        const linies = processarFilesDUN(files, resMapatge.data || []);
        const resultat = classificarLiniesDUN(linies, resExist.data || [], campanya);

        mostrarPreviewDUN(resultat, campanya);

    } catch (error) {
        console.error('Error llegint Excel:', error);
        preview.innerHTML = '<p class="alert alert-error">Error llegint el fitxer: ' + dunEscapeHtml(error.message) + '</p>';
    }
}

// ------------------------------------------------------------
// FILES DE L'EXCEL → LÍNIES DUN
// ------------------------------------------------------------

function processarFilesDUN(files, mapatgeFinques) {
    // Índex del mapatge de finques per municipi|polígon|parcel·la
    const indexFinques = new Map();
    mapatgeFinques.forEach(function(m) {
        indexFinques.set(dunNorm(m.municipi) + '|' + dunNorm(m.poligon) + '|' + dunNorm(m.parcela), m);
    });

    const linies = [];
    files.forEach(function(fila) {
        const sigpac = String(fila['Recinte'] || '').trim();     // ex. 25010:0:0:502:141:1
        const parts = sigpac.split(':');
        if (parts.length < 6) return;

        const ordre = parseInt(fila['Ordre']);
        if (!ordre) return;

        const codiProducte = dunText(fila['Codi Producte']);
        const cultiu = (codiProducte && _dunProductesMapa[codiProducte])
            ? _dunProductesMapa[codiProducte]
            : normalitzarCultiu(fila['Producte']);

        const map = indexFinques.get(dunNorm(parts[0]) + '|' + dunNorm(parts[3]) + '|' + dunNorm(parts[4])) || null;

        linies.push({
            ordre:          ordre,
            sigpac:         sigpac,
            codi_producte:  codiProducte,
            codi_varietat:  dunText(fila['Codi Varietat']),
            cultiu:         cultiu,
            varietat:       normalitzarVarietat(fila['Varietat']),
            nomDun:         dunText(fila['Finca']),
            superficie:     parseFloat(fila['Sup. Neta (Ha)']) || 0,
            regadiu:        normalitzarRegadiu(fila['Sistema Regadiu'], fila['S/R']),
            finca:          map ? map.finca : null,
            ref_cadastral:  map ? map.ref_cadastral : null,
            num_explotacio: map ? map.num_explotacio : null
        });
    });

    // Ordre determinista: per SIGPAC i després per número d'Ordre
    linies.sort(function(a, b) {
        if (a.sigpac !== b.sigpac) return a.sigpac.localeCompare(b.sigpac);
        return a.ordre - b.ordre;
    });
    return linies;
}

// ------------------------------------------------------------
// CLASSIFICAR: nou / actualitza / sense canvis
// ------------------------------------------------------------

function dunIgualText(a, b) {
    return String(a || '').trim().toUpperCase() === String(b || '').trim().toUpperCase();
}

function classificarLiniesDUN(linies, existents, campanya) {
    const usats = new Set();          // id de files de la BD ja assignades
    const perOrdre = new Map();
    existents.forEach(function(e) {
        if (e.dun_ordre !== null && e.dun_ordre !== undefined) perOrdre.set(e.dun_ordre, e);
    });

    // Mida de cada grup de SIGPAC dins del fitxer (per saber si el recinte està partit)
    const midaGrup = {};
    linies.forEach(function(l) { midaGrup[l.sigpac] = (midaGrup[l.sigpac] || 0) + 1; });

    const resultat = linies.map(function(l) {
        // 1) Match per Ordre; 2) si la fila de la BD no té Ordre, per SIGPAC + cultiu + varietat
        let match = perOrdre.get(l.ordre) || null;
        if (match && usats.has(match.id)) match = null;
        if (!match) {
            match = existents.find(function(e) {
                return !usats.has(e.id)
                    && (e.dun_ordre === null || e.dun_ordre === undefined)
                    && e.sigpac === l.sigpac
                    && dunIgualText(e.cultiu, l.cultiu)
                    && dunIgualText(e.varietat, l.varietat);
            }) || null;
        }

        const reg = Object.assign({}, l, { _grup: midaGrup[l.sigpac], _canvis: [], _avisos: [] });

        if (match) {
            usats.add(match.id);
            reg._estat = 'actualitza';
            reg._id = match.id;
            reg.subrecinte = match.subrecinte || null;   // mai es canvia en files existents
            if (match.dun_ordre !== l.ordre) reg._canvis.push('Ordre: ' + (match.dun_ordre === null || match.dun_ordre === undefined ? '—' : match.dun_ordre) + ' → ' + l.ordre);
            if (!dunIgualText(match.cultiu, l.cultiu)) reg._canvis.push('Cultiu: ' + (match.cultiu || '—') + ' → ' + (l.cultiu || '—'));
            if (!dunIgualText(match.varietat, l.varietat)) reg._canvis.push('Varietat: ' + (match.varietat || '—') + ' → ' + (l.varietat || '—'));
            if (Math.abs((parseFloat(match.superficie) || 0) - l.superficie) > 0.0001) reg._canvis.push('Sup.: ' + (match.superficie || 0) + ' → ' + l.superficie);
            if (!!match.regadiu !== !!l.regadiu) reg._canvis.push('Regadiu: ' + (match.regadiu ? 'sí' : 'no') + ' → ' + (l.regadiu ? 'sí' : 'no'));
            if (String(match.codi_producte || '') !== String(l.codi_producte || '')) reg._canvis.push('Codi producte');
            if (String(match.codi_varietat || '') !== String(l.codi_varietat || '')) reg._canvis.push('Codi varietat');
            reg._existent = match;
            if (!reg._canvis.length) reg._estat = 'igual';
        } else {
            reg._estat = 'nou';
        }
        return reg;
    });

    // Subrecintes de les files NOVES: primera lletra lliure per a aquell SIGPAC
    resultat.filter(function(r) { return r._estat === 'nou'; }).forEach(function(r) {
        const ocupats = new Set();
        existents.forEach(function(e) { if (e.sigpac === r.sigpac) ocupats.add(e.subrecinte || ''); });
        resultat.forEach(function(x) {
            if (x !== r && x.sigpac === r.sigpac && x._estat !== 'nou') ocupats.add(x.subrecinte || '');
            if (x !== r && x.sigpac === r.sigpac && x._estat === 'nou' && x._subAssignat) ocupats.add(x.subrecinte || '');
        });
        const necessitaLletra = r._grup > 1 || ocupats.has('');
        if (!necessitaLletra) {
            r.subrecinte = null;
        } else {
            let i = 0;
            while (ocupats.has(dunLletraSubrecinte(i))) i++;
            r.subrecinte = dunLletraSubrecinte(i);
        }
        r._subAssignat = true;
        if (r._grup > 1 && ocupats.has('')) {
            r._avisos.push('Recinte partit amb una fila antiga sense lletra: revisar');
        }
    });

    // Nom: el de la DUN, amb sufix de subrecinte si en té
    resultat.forEach(function(r) {
        let nom = r.nomDun;
        if (nom && r.subrecinte) nom = nom + ' (' + r.subrecinte.toUpperCase() + ')';
        r.nom = nom;
    });

    const senseFitxer = existents.filter(function(e) { return !usats.has(e.id); });
    return { registres: resultat, senseFitxer: senseFitxer };
}

// ------------------------------------------------------------
// PREVISUALITZACIÓ
// ------------------------------------------------------------

function mostrarPreviewDUN(resultat, campanya) {
    const preview = document.getElementById('import-preview');
    const regs = resultat.registres;

    const nous       = regs.filter(function(r) { return r._estat === 'nou'; }).length;
    const actualitza = regs.filter(function(r) { return r._estat === 'actualitza'; }).length;
    const iguals     = regs.filter(function(r) { return r._estat === 'igual'; }).length;
    const senseFinca = regs.filter(function(r) { return !r.finca && !(r._existent && r._existent.finca); }).length;
    const totalHa    = regs.reduce(function(s, r) { return s + r.superficie; }, 0);

    let html = '<div style="background:#f8f9fa; border-radius:8px; padding:20px;">';
    html += '<h3 style="margin-top:0;">2. Previsualització — Campanya ' + campanya + '</h3>';

    html += '<div style="display:flex; gap:12px; margin-bottom:15px; flex-wrap:wrap;">';
    html += '<div style="background:#e3f2fd; padding:10px 16px; border-radius:6px;"><strong>' + regs.length + '</strong> línies · ' + totalHa.toFixed(2) + ' Ha</div>';
    html += '<div style="background:#d4edda; padding:10px 16px; border-radius:6px;">🆕 <strong>' + nous + '</strong> noves</div>';
    html += '<div style="background:#fff3cd; padding:10px 16px; border-radius:6px;">✏️ <strong>' + actualitza + '</strong> amb canvis</div>';
    html += '<div style="background:#f1f1f1; padding:10px 16px; border-radius:6px;">✔️ <strong>' + iguals + '</strong> sense canvis</div>';
    if (senseFinca > 0) {
        html += '<div style="background:#ffe0b2; padding:10px 16px; border-radius:6px;">⚠️ <strong>' + senseFinca + '</strong> sense finca</div>';
    }
    html += '</div>';

    html += '<div class="table-container"><table class="data-table" style="font-size:13px;">';
    html += '<thead><tr><th></th><th>Ordre</th><th>SIGPAC</th><th>Sub</th><th>Finca (NLASL)</th><th>Cultiu</th><th>Varietat</th><th>Ha</th><th>Reg</th><th>Canvis / avisos</th></tr></thead><tbody>';

    regs.forEach(function(r) {
        const icona = { nou: '🆕', actualitza: '✏️', igual: '✔️' }[r._estat];
        const finca = r.finca || (r._existent && r._existent.finca) || null;
        const notes = r._canvis.concat(r._avisos).map(dunEscapeHtml).join('<br>');
        html += '<tr>' +
            '<td>' + icona + '</td>' +
            '<td><strong>' + r.ordre + '</strong></td>' +
            '<td style="font-size:11px;">' + dunEscapeHtml(r.sigpac) + '</td>' +
            '<td>' + (r.subrecinte ? dunEscapeHtml(r.subrecinte.toUpperCase()) : '') + '</td>' +
            '<td>' + (finca ? dunEscapeHtml(finca) : '<em style="color:#c77;">Sense finca</em>') + '</td>' +
            '<td>' + dunEscapeHtml(r.cultiu || '-') + '</td>' +
            '<td style="font-size:11px;">' + dunEscapeHtml(r.varietat || '-') + '</td>' +
            '<td>' + r.superficie + '</td>' +
            '<td>' + (r.regadiu ? '💧' : '') + '</td>' +
            '<td style="font-size:11px; color:#8a6d3b;">' + notes + '</td>' +
            '</tr>';
    });
    html += '</tbody></table></div>';

    if (resultat.senseFitxer.length) {
        html += '<div style="background:#fff3cd; border-radius:6px; padding:12px; margin-top:15px; font-size:13px;">';
        html += '<strong>⚠️ ' + resultat.senseFitxer.length + ' parcel·les de la campanya ' + campanya + ' no apareixen al fitxer.</strong> ';
        html += 'No s\'esborren ni es desactiven; revisa-les a mà:<br>';
        html += resultat.senseFitxer.map(function(e) {
            return dunEscapeHtml(e.sigpac) + (e.subrecinte ? ' (' + dunEscapeHtml(e.subrecinte) + ')' : '') + ' — ' + dunEscapeHtml(e.cultiu || '-') + ' ' + (parseFloat(e.superficie) || 0) + ' Ha';
        }).join('<br>');
        html += '</div>';
    }

    const aEscriure = nous + actualitza;
    html += '<div style="display:flex; gap:10px; margin-top:15px; justify-content:flex-end;">';
    html += '<button class="btn btn-secondary" onclick="processarExcelDUN()">🔄 Recarregar</button>';
    html += '<button class="btn btn-primary" id="btn-confirmar-import-dun" onclick="confirmarImportDUN()" style="padding:10px 30px;"' + (aEscriure === 0 ? ' disabled' : '') + '>💾 Aplicar ' + nous + ' noves i ' + actualitza + ' actualitzacions</button>';
    html += '</div></div>';

    preview.innerHTML = html;
    window._dunResultatPendent = resultat;
}

// ------------------------------------------------------------
// CONFIRMAR
// ------------------------------------------------------------

async function confirmarImportDUN() {
    const resultat = window._dunResultatPendent;
    if (!resultat) return;
    if (!hasPermission('insert') || !hasPermission('update')) {
        mostrarNotificacio('No tens permisos per importar parcel·les', 'error');
        return;
    }

    const campanya = parseInt(document.getElementById('import-campanya').value);
    const nous = resultat.registres.filter(function(r) { return r._estat === 'nou'; });
    const actualitza = resultat.registres.filter(function(r) { return r._estat === 'actualitza'; });

    if (!confirm('Importar a la campanya ' + campanya + ':\n• ' + nous.length + ' parcel·les noves\n• ' + actualitza.length + ' actualitzacions\n\nNo s\'esborra res. Continuar?')) return;

    const btn = document.getElementById('btn-confirmar-import-dun');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Important...'; }

    let errors = 0;
    try {
        // 1) Insercions en bloc
        if (nous.length) {
            const files = nous.map(function(r) {
                return {
                    sigpac:         r.sigpac,
                    subrecinte:     r.subrecinte,
                    nom:            r.nom,
                    cultiu:         r.cultiu,
                    varietat:       r.varietat,
                    superficie:     r.superficie,
                    regadiu:        r.regadiu,
                    finca:          r.finca,
                    ref_cadastral:  r.ref_cadastral,
                    num_explotacio: r.num_explotacio,
                    campanya:       campanya,
                    actiu:          true,
                    dun_ordre:      r.ordre,
                    codi_producte:  r.codi_producte,
                    codi_varietat:  r.codi_varietat
                };
            });
            const ri = await supabaseClient.from('parcelles').insert(files);
            if (ri.error) throw ri.error;
        }

        // 2) Actualitzacions una a una (no es toca subrecinte, nom ni actiu)
        for (const r of actualitza) {
            const canvis = {
                dun_ordre:     r.ordre,
                codi_producte: r.codi_producte,
                codi_varietat: r.codi_varietat,
                cultiu:        r.cultiu,
                varietat:      r.varietat,
                superficie:    r.superficie,
                regadiu:       r.regadiu
            };
            // No esborrar valors que ja hi eren si el mapatge no en dóna cap
            if (r.finca) canvis.finca = r.finca;
            if (r.ref_cadastral) canvis.ref_cadastral = r.ref_cadastral;
            if (r.num_explotacio) canvis.num_explotacio = r.num_explotacio;

            const ru = await supabaseClient.from('parcelles').update(canvis).eq('id', r._id);
            if (ru.error) {
                errors++;
                console.error('Error actualitzant parcel·la', r.sigpac, ru.error);
            }
        }

        parcelles = await getParcellas();

        if (errors) {
            mostrarNotificacio('⚠️ Importació feta amb ' + errors + ' errors d\'actualització (consola)', 'warning');
        } else {
            mostrarNotificacio('✅ ' + nous.length + ' noves i ' + actualitza.length + ' actualitzades', 'success');
        }
        canviarVista('parcelles');

    } catch (error) {
        console.error('Error important:', error);
        mostrarNotificacio('Error important: ' + error.message, 'error');
        if (btn) { btn.disabled = false; btn.textContent = '💾 Tornar a provar'; }
    }
}

console.log('✅ parcelles-import-dun v2 carregat');
