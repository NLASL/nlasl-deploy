// ============================================================
// REPARACIONS UI v1
// Factures de reparacions i manteniment:
//   factura -> treballs (1 element de l'immobilitzat cadascun) -> línies
// Tot SENSE IVA. Quadratura obligatòria contra la base de la factura.
// Taules: reparacions_factures / reparacions_treballs / reparacions_linies
// Vistes: vista_reparacions_quadratura / vista_reparacions_cost
// Depèn de: supabaseClient, hasPermission, mostrarNotificacio, formatData
// ============================================================

const REP_TIPUS_LINIA = {
    ma_obra:    "Mà d'obra",
    recanvi:    'Recanvi',
    consumible: 'Consumible',
    servei:     'Servei',
    residus:    'Residus',
    altres:     'Altres'
};
const REP_TOLERANCIA = 0.01;

let repFactures = [];          // factures carregades al llistat
let repQuadratura = {};        // factura_id -> { suma_linies, diferencia }
let repElements = [];          // immobilitzat_material
let repMapaEtiqueta = {};      // etiqueta -> id
let repMapaId = {};            // id -> element
let repProveidors = {};        // nom proveïdor -> nif
let repEstat = null;           // estat del modal obert
let repUid = 0;                // comptador d'identificadors locals

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function repEsc(v) {
    return String(v === null || v === undefined ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function repNum(v) {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
}

function repR2(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

function repFmt(n) {
    return (Number(n) || 0).toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function repEtiquetaElement(e) {
    const desc = e['descripció'] || '';
    const parts = [desc];
    const mm = [e.marca, e.model]
        .filter(function(x) { return x && desc.toLowerCase().indexOf(String(x).toLowerCase()) === -1; })
        .join(' ');
    if (mm) parts.push(mm);
    if (e['matrícula']) parts.push(e['matrícula']);
    return parts.join(' · ');
}

function repInjectarEstils() {
    if (document.getElementById('estils-reparacions')) return;
    const s = document.createElement('style');
    s.id = 'estils-reparacions';
    s.textContent = `
        .rep-capcalera { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-bottom:16px; }
        .rep-capcalera label, .rep-treball label { display:block; font-size:12px; color:#555; margin-bottom:3px; }
        .rep-capcalera input, .rep-capcalera textarea, .rep-treball input, .rep-treball select, .rep-taula input, .rep-taula select {
            width:100%; padding:6px 8px; border:1px solid #ddd; border-radius:4px; box-sizing:border-box; font-size:13px; }
        .rep-treball { border:1px solid #cfd8dc; border-radius:8px; padding:12px; margin-bottom:14px; background:#fafcfb; }
        .rep-treball-cap { display:flex; gap:12px; align-items:center; margin-bottom:10px; }
        .rep-sub { margin-left:auto; font-weight:600; color:#2e7d32; }
        .rep-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
        .rep-ample { grid-column: span 2; }
        .rep-taula { width:100%; border-collapse:collapse; margin-top:10px; }
        .rep-taula th { background:#eef3e6; padding:6px; text-align:left; font-size:12px; }
        .rep-taula td { padding:3px; }
        .rep-invalid { border-color:#c62828 !important; background:#fff5f5 !important; }
        .rep-quadratura { padding:12px 16px; border-radius:8px; margin-top:16px; font-weight:600; }
        .rep-ok { background:#e8f5e9; color:#2e7d32; }
        .rep-ko { background:#ffebee; color:#c62828; }
        .rep-neutre { background:#f5f5f5; color:#555; }
        .rep-badge { padding:2px 8px; border-radius:10px; font-size:12px; font-weight:600; white-space:nowrap; }
    `;
    document.head.appendChild(s);
}

async function repCarregarElements() {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .select('*')
        .order('tipus')
        .order('descripció');
    if (error) throw error;
    repElements = data || [];
    repMapaEtiqueta = {};
    repMapaId = {};
    repElements.forEach(function(e) {
        let et = repEtiquetaElement(e);
        if (repMapaEtiqueta[et]) et += ' #' + String(e.id).slice(0, 4);
        e._etiqueta = et;
        repMapaEtiqueta[et] = e.id;
        repMapaId[e.id] = e;
    });
}

async function repCarregarProveidors() {
    const { data } = await supabaseClient
        .from('reparacions_factures')
        .select('proveidor, proveidor_nif')
        .eq('eliminat', false)
        .range(0, 999);
    repProveidors = {};
    (data || []).forEach(function(f) {
        if (f.proveidor && !repProveidors[f.proveidor]) repProveidors[f.proveidor] = f.proveidor_nif || '';
    });
}

// ------------------------------------------------------------
// VISTA PRINCIPAL (llistat)
// ------------------------------------------------------------

async function carregarVistaReparacions() {
    repInjectarEstils();
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    const anyActual = new Date().getFullYear();

    let html = '<div class="view-reparacions">';
    html += '<div style="display:flex;justify-content:space-between;margin-bottom:20px;">';
    html += '<h2>🔧 Reparacions i manteniment</h2>';
    if (podeCrear) html += '<button class="btn btn-primary" onclick="obrirModalReparacio()">➕ Nova Factura</button>';
    html += '</div>';

    html += '<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px;">';
    html += '<div style="display:grid;grid-template-columns:1fr 2fr auto;gap:15px;align-items:end;">';
    html += '<div><label>Any</label><select id="rep-filtre-any" onchange="carregarTaulaReparacions()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">';
    for (let a = anyActual; a >= 2024; a--) {
        html += '<option value="' + a + '"' + (a === anyActual ? ' selected' : '') + '>' + a + '</option>';
    }
    html += '<option value="">Tots</option></select></div>';
    html += '<div><label>Proveïdor / Nº factura</label><input type="text" id="rep-filtre-text" oninput="repPintarTaula()" placeholder="Cerca..." style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;"></div>';
    html += '<div><button class="btn btn-secondary" onclick="repNetejarFiltres()">🗑️ Netejar</button></div>';
    html += '</div>';
    html += '<p style="margin:8px 0 0;font-size:12px;color:#777;">El llistat filtra per <strong>data de factura</strong>; el cost per element, per <strong>data del treball</strong> (la de factura si no n\'hi ha). Tot sense IVA.</p>';
    html += '</div>';

    html += '<div id="rep-resum" style="margin-bottom:20px;"></div>';
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Data</th><th>Nº Factura</th><th>Proveïdor</th><th>Base (sense IVA)</th><th>Suma línies</th><th>Quadratura</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-reparacions"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div>';
    html += '<div id="rep-cost-elements" style="margin-top:30px;"></div>';
    html += '</div>';

    container.innerHTML = html;
    await carregarTaulaReparacions();
}

function repNetejarFiltres() {
    const t = document.getElementById('rep-filtre-text');
    if (t) t.value = '';
    repPintarTaula();
}

async function carregarTaulaReparacions() {
    const tbody = document.getElementById('tbody-reparacions');
    if (!tbody) return;
    const any = document.getElementById('rep-filtre-any')?.value;

    try {
        let qF = supabaseClient.from('reparacions_factures').select('*')
            .eq('eliminat', false).order('data', { ascending: false }).range(0, 999);
        let qQ = supabaseClient.from('vista_reparacions_quadratura').select('*').range(0, 999);
        if (any) {
            qF = qF.gte('data', any + '-01-01').lte('data', any + '-12-31');
            qQ = qQ.gte('data', any + '-01-01').lte('data', any + '-12-31');
        }
        const [rF, rQ] = await Promise.all([qF, qQ]);
        if (rF.error) throw rF.error;
        if (rQ.error) throw rQ.error;

        repFactures = rF.data || [];
        repQuadratura = {};
        (rQ.data || []).forEach(function(q) { repQuadratura[q.factura_id] = q; });

        repPintarTaula();
        await repPintarCostElements(any);
    } catch (error) {
        console.error('Error reparacions:', error);
        tbody.innerHTML = '<tr><td colspan="7">Error: ' + repEsc(error.message) + '</td></tr>';
    }
}

function repPintarTaula() {
    const tbody = document.getElementById('tbody-reparacions');
    if (!tbody) return;
    const text = (document.getElementById('rep-filtre-text')?.value || '').trim().toLowerCase();

    let regs = repFactures;
    if (text) {
        regs = regs.filter(function(f) {
            return (f.proveidor || '').toLowerCase().includes(text) || (f.num_factura || '').toLowerCase().includes(text);
        });
    }

    const resum = document.getElementById('rep-resum');
    if (regs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha factures</td></tr>';
        if (resum) resum.innerHTML = '';
        return;
    }

    const totalBase = regs.reduce(function(s, f) { return s + (parseFloat(f.import_net) || 0); }, 0);
    const descuadrades = regs.filter(function(f) {
        const q = repQuadratura[f.id];
        return !q || Math.abs(parseFloat(q.diferencia) || 0) > REP_TOLERANCIA;
    }).length;
    if (resum) {
        resum.innerHTML = '<div style="display:flex;gap:15px;flex-wrap:wrap;">' +
            '<div style="background:#e3f2fd;padding:12px;border-radius:8px;">🧾 Factures: <strong>' + regs.length + '</strong></div>' +
            '<div style="background:#e8f5e9;padding:12px;border-radius:8px;">💶 Base total: <strong>' + repFmt(totalBase) + ' €</strong></div>' +
            (descuadrades > 0
                ? '<div style="background:#ffebee;padding:12px;border-radius:8px;">❌ Sense quadrar: <strong>' + descuadrades + '</strong></div>'
                : '<div style="background:#e8f5e9;padding:12px;border-radius:8px;">✅ Totes quadren</div>') +
            '</div>';
    }

    const podeEditar = hasPermission('update');
    const podeEliminar = hasPermission('delete');

    tbody.innerHTML = regs.map(function(f) {
        const q = repQuadratura[f.id];
        const suma = q ? parseFloat(q.suma_linies) || 0 : 0;
        const dif = q ? parseFloat(q.diferencia) || 0 : (parseFloat(f.import_net) || 0);
        const quadra = Math.abs(dif) <= REP_TOLERANCIA;
        const badge = quadra
            ? '<span class="rep-badge rep-ok">✅ Quadra</span>'
            : '<span class="rep-badge rep-ko">❌ Δ ' + repFmt(dif) + ' €</span>';
        let accions = '<button class="btn btn-sm btn-primary" onclick="obrirModalReparacio(\'' + f.id + '\', true)">👁️</button> ';
        if (podeEditar) accions += '<button class="btn btn-sm btn-secondary" onclick="obrirModalReparacio(\'' + f.id + '\')">✏️</button> ';
        if (podeEliminar) accions += '<button class="btn btn-sm btn-danger" onclick="eliminarReparacio(\'' + f.id + '\')">🗑️</button>';
        return '<tr>' +
            '<td>' + formatData(f.data) + '</td>' +
            '<td>' + repEsc(f.num_factura) + '</td>' +
            '<td>' + repEsc(f.proveidor) + '</td>' +
            '<td><strong>' + repFmt(f.import_net) + ' €</strong></td>' +
            '<td>' + repFmt(suma) + ' €</td>' +
            '<td>' + badge + '</td>' +
            '<td>' + accions + '</td></tr>';
    }).join('');
}

async function eliminarReparacio(id) {
    if (!confirm('Segur que vols eliminar aquesta factura de reparació?')) return;
    try {
        const { error } = await supabaseClient
            .from('reparacions_factures').update({ eliminat: true }).eq('id', id);
        if (error) throw error;
        mostrarNotificacio('Factura eliminada', 'success');
        await carregarTaulaReparacions();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ------------------------------------------------------------
// COST PER ELEMENT (vista_reparacions_cost)
// ------------------------------------------------------------

async function repPintarCostElements(any) {
    const div = document.getElementById('rep-cost-elements');
    if (!div) return;

    let totes = [];
    let offset = 0;
    const MIDA = 1000;
    while (true) {
        let q = supabaseClient.from('vista_reparacions_cost')
            .select('immobilitzat_id, immobilitzat_tipus, immobilitzat_descripcio, immobilitzat_matricula, tipus_linia, net')
            .range(offset, offset + MIDA - 1);
        if (any) q = q.eq('exercici', Number(any));
        const { data, error } = await q;
        if (error) { div.innerHTML = '<p style="color:#c62828;">Error cost per element: ' + repEsc(error.message) + '</p>'; return; }
        totes = totes.concat(data || []);
        if (!data || data.length < MIDA) break;
        offset += MIDA;
    }

    if (totes.length === 0) { div.innerHTML = ''; return; }

    const perElement = {};
    totes.forEach(function(l) {
        if (!perElement[l.immobilitzat_id]) {
            perElement[l.immobilitzat_id] = {
                nom: l.immobilitzat_descripcio + (l.immobilitzat_matricula ? ' · ' + l.immobilitzat_matricula : ''),
                tipus: l.immobilitzat_tipus, total: 0, perTipus: {}
            };
        }
        const e = perElement[l.immobilitzat_id];
        const n = parseFloat(l.net) || 0;
        e.total += n;
        e.perTipus[l.tipus_linia] = (e.perTipus[l.tipus_linia] || 0) + n;
    });

    const files = Object.values(perElement).sort(function(a, b) { return b.total - a.total; });
    const totalsTipus = {};
    let granTotal = 0;
    files.forEach(function(e) {
        granTotal += e.total;
        Object.keys(REP_TIPUS_LINIA).forEach(function(k) { totalsTipus[k] = (totalsTipus[k] || 0) + (e.perTipus[k] || 0); });
    });

    const cap = Object.values(REP_TIPUS_LINIA).map(function(v) { return '<th style="text-align:right;">' + v + '</th>'; }).join('');
    const cel = function(v) { return '<td style="text-align:right;">' + (v ? repFmt(v) : '—') + '</td>'; };

    let html = '<h3>📊 Cost per element' + (any ? ' — ' + any : '') + ' <span style="font-size:12px;color:#777;font-weight:400;">(€ sense IVA, per data del treball)</span></h3>';
    html += '<div class="table-container"><table class="data-table"><thead><tr><th>Element</th><th>Tipus</th>' + cap + '<th style="text-align:right;">Total</th></tr></thead><tbody>';
    files.forEach(function(e) {
        html += '<tr><td>' + repEsc(e.nom) + '</td><td>' + repEsc(e.tipus) + '</td>' +
            Object.keys(REP_TIPUS_LINIA).map(function(k) { return cel(e.perTipus[k]); }).join('') +
            '<td style="text-align:right;"><strong>' + repFmt(e.total) + ' €</strong></td></tr>';
    });
    html += '<tr style="background:#f1f8e9;font-weight:bold;"><td colspan="2">TOTAL</td>' +
        Object.keys(REP_TIPUS_LINIA).map(function(k) { return cel(totalsTipus[k]); }).join('') +
        '<td style="text-align:right;">' + repFmt(granTotal) + ' €</td></tr>';
    html += '</tbody></table></div>';
    div.innerHTML = html;
}

// ------------------------------------------------------------
// MODAL: estat i construcció
// ------------------------------------------------------------

function repNovaLinia() {
    return { uid: ++repUid, id: null, tipus: 'recanvi', ref_article: '', descripcio: '',
             quantitat: '1', preu: '', descompte: '0', net: '' };
}

function repNouTreball(elementId) {
    const el = elementId ? repMapaId[elementId] : null;
    return {
        uid: ++repUid, id: null,
        immobilitzat_id: el ? el.id : null,
        etiqueta: el ? el._etiqueta : '',
        document: '', data_treball: '', naturalesa: 'reparacio',
        comptador_valor: '', comptador_unitat: '',
        descripcio: '',
        linies: [repNovaLinia()]
    };
}

async function obrirModalReparacio(id, solaLectura) {
    try {
        repInjectarEstils();
        await Promise.all([repCarregarElements(), repCarregarProveidors()]);

        repEstat = { id: id || null, ro: !!solaLectura, totalManual: false,
                     treballs: [], treballsEliminats: [], liniesEliminades: [] };
        let factura = { data: new Date().toISOString().split('T')[0], num_factura: '', proveidor: '',
                        proveidor_nif: '', import_net: '', import_iva: '', import_total: '', observacions: '' };

        if (id) {
            const { data: f, error } = await supabaseClient
                .from('reparacions_factures').select('*').eq('id', id).single();
            if (error) throw error;
            factura = f;
            repEstat.totalManual = f.import_total !== null && f.import_total !== undefined;

            const { data: ts, error: eT } = await supabaseClient
                .from('reparacions_treballs').select('*')
                .eq('factura_id', id).eq('eliminat', false).order('ordre');
            if (eT) throw eT;

            const idsT = (ts || []).map(function(t) { return t.id; });
            let linies = [];
            if (idsT.length > 0) {
                const { data: ls, error: eL } = await supabaseClient
                    .from('reparacions_linies').select('*')
                    .in('treball_id', idsT).eq('eliminat', false).order('ordre').range(0, 999);
                if (eL) throw eL;
                linies = ls || [];
            }

            repEstat.treballs = (ts || []).map(function(t) {
                const el = repMapaId[t.immobilitzat_id];
                return {
                    uid: ++repUid, id: t.id,
                    immobilitzat_id: t.immobilitzat_id,
                    etiqueta: el ? el._etiqueta : '',
                    document: t.document || '',
                    data_treball: t.data_treball || '',
                    naturalesa: t.naturalesa || '',
                    comptador_valor: t.comptador_valor === null ? '' : String(t.comptador_valor),
                    comptador_unitat: t.comptador_unitat || '',
                    descripcio: t.descripcio || '',
                    linies: linies.filter(function(l) { return l.treball_id === t.id; }).map(function(l) {
                        return {
                            uid: ++repUid, id: l.id, tipus: l.tipus, ref_article: l.ref_article || '',
                            descripcio: l.descripcio || '',
                            quantitat: String(l.quantitat), preu: l.preu === null ? '' : String(l.preu),
                            descompte: String(l.descompte), net: Number(l.net).toFixed(2)
                        };
                    })
                };
            });
        } else {
            repEstat.treballs.push(repNouTreball());
        }

        repConstruirModal(factura);
        repRenderTreballs();
        repRecalcular();
    } catch (error) {
        console.error('Error obrint modal reparació:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

function repConstruirModal(f) {
    const ex = document.getElementById('modal-reparacio');
    if (ex) ex.remove();

    const ro = repEstat.ro;
    const dis = ro ? 'disabled' : '';
    const titol = ro ? 'Veure factura de reparació' : (repEstat.id ? 'Editar factura de reparació' : 'Nova factura de reparació');

    const optsElements = repElements.map(function(e) {
        return '<option value="' + repEsc(e._etiqueta) + '">' + repEsc(e.tipus) + '</option>';
    }).join('');
    const optsProveidors = Object.keys(repProveidors).sort().map(function(p) {
        return '<option value="' + repEsc(p) + '">';
    }).join('');

    const div = document.createElement('div');
    div.innerHTML =
        '<div id="modal-reparacio" class="modal" style="display:block;">' +
        '<div class="modal-content" style="max-width:1150px;max-height:92vh;overflow-y:auto;">' +
        '<span class="close" onclick="tancarModal(\'modal-reparacio\')">&times;</span>' +
        '<h2>🔧 ' + titol + '</h2>' +
        '<datalist id="rep-llista-elements">' + optsElements + '</datalist>' +
        '<datalist id="rep-llista-proveidors">' + optsProveidors + '</datalist>' +

        '<div class="rep-capcalera">' +
        '<div><label>Data factura *</label><input type="date" id="rep-data" ' + dis + ' value="' + repEsc(f.data) + '"></div>' +
        '<div><label>Nº Factura *</label><input type="text" id="rep-num" ' + dis + ' value="' + repEsc(f.num_factura) + '"></div>' +
        '<div><label>Proveïdor *</label><input type="text" id="rep-proveidor" list="rep-llista-proveidors" ' + dis + ' value="' + repEsc(f.proveidor) + '" oninput="repProveidorCanviat(this.value)"></div>' +
        '<div><label>NIF proveïdor</label><input type="text" id="rep-nif" ' + dis + ' value="' + repEsc(f.proveidor_nif) + '"></div>' +
        '<div><label>Base sense IVA (€) *</label><input type="number" step="0.01" id="rep-net" ' + dis + ' value="' + repEsc(f.import_net) + '" oninput="repCanviBase()"></div>' +
        '<div><label>IVA (€) <small>informatiu</small></label><input type="number" step="0.01" id="rep-iva" ' + dis + ' value="' + repEsc(f.import_iva === 0 && !repEstat.id ? '' : f.import_iva) + '" oninput="repCanviBase()"></div>' +
        '<div><label>Total factura (€) <small>informatiu</small></label><input type="number" step="0.01" id="rep-total" ' + dis + ' value="' + repEsc(f.import_total) + '" oninput="repEstat.totalManual=true"></div>' +
        '</div>' +
        '<div style="margin-bottom:16px;"><label style="font-size:12px;color:#555;">Observacions</label>' +
        '<textarea id="rep-obs" rows="2" ' + dis + ' style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;box-sizing:border-box;">' + repEsc(f.observacions) + '</textarea></div>' +

        '<h3>🛠️ Treballs <small style="font-weight:400;color:#777;">(cada treball va a un sol element)</small></h3>' +
        '<div id="rep-treballs"></div>' +
        (ro ? '' :
            '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">' +
            '<button type="button" class="btn btn-secondary" onclick="repAfegirTreball(false)">➕ Afegir treball</button>' +
            '<button type="button" class="btn btn-secondary" onclick="repAfegirTreball(true)">⧉ Nou treball, mateix element</button>' +
            '</div>') +

        '<div id="rep-quadratura" class="rep-quadratura rep-neutre"></div>' +

        '<div class="form-actions" style="margin-top:20px;">' +
        '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-reparacio\')">' + (ro ? 'Tancar' : 'Cancel·lar') + '</button>' +
        (ro ? '' : '<button type="button" class="btn btn-primary" id="rep-btn-guardar" onclick="guardarReparacio()">💾 Guardar</button>') +
        '</div>' +
        '</div></div>';
    document.body.appendChild(div.firstElementChild);
}

// ------------------------------------------------------------
// MODAL: renderitzat de treballs i línies
// ------------------------------------------------------------

function repRenderTreballs() {
    const cont = document.getElementById('rep-treballs');
    if (!cont) return;
    cont.innerHTML = repEstat.treballs.map(function(t, i) { return repHtmlTreball(t, i); }).join('');
}

function repHtmlTreball(t, idx) {
    const ro = repEstat.ro;
    const dis = ro ? 'disabled' : '';
    const optsNat = [['', '— (sense indicar)'], ['reparacio', 'Reparació'], ['manteniment', 'Manteniment']]
        .map(function(o) { return '<option value="' + o[0] + '"' + (t.naturalesa === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');
    const optsUnitat = [['', '—'], ['km', 'km'], ['h', 'h']]
        .map(function(o) { return '<option value="' + o[0] + '"' + (t.comptador_unitat === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('');

    let h = '<div class="rep-treball" id="rep-treball-' + t.uid + '">';
    h += '<div class="rep-treball-cap"><strong>Treball ' + (idx + 1) + '</strong>';
    h += '<span class="rep-sub" id="rt-sub-' + t.uid + '"></span>';
    if (!ro) h += '<button type="button" class="btn btn-sm btn-danger" onclick="repEliminarTreball(' + t.uid + ')">🗑️</button>';
    h += '</div>';

    h += '<div class="rep-grid">';
    h += '<div class="rep-ample"><label>Element de l\'immobilitzat *</label>' +
         '<input type="text" list="rep-llista-elements" ' + dis + ' class="' + (t.immobilitzat_id ? '' : 'rep-invalid') + '" ' +
         'value="' + repEsc(t.etiqueta) + '" placeholder="Escriu per cercar (Fendt, Viano, trailla...)" oninput="repCanviElement(' + t.uid + ', this)"></div>';
    h += '<div><label>Document (albarà / OR)</label><input type="text" ' + dis + ' value="' + repEsc(t.document) + '" oninput="repCampTreball(' + t.uid + ',\'document\',this.value)"></div>';
    h += '<div><label>Data treball <small>(buit = data factura)</small></label><input type="date" ' + dis + ' value="' + repEsc(t.data_treball) + '" onchange="repCampTreball(' + t.uid + ',\'data_treball\',this.value)"></div>';
    h += '<div><label>Naturalesa</label><select ' + dis + ' onchange="repCampTreball(' + t.uid + ',\'naturalesa\',this.value)">' + optsNat + '</select></div>';
    h += '<div><label>Comptador</label><div style="display:flex;gap:4px;">' +
         '<input type="number" step="0.1" ' + dis + ' value="' + repEsc(t.comptador_valor) + '" placeholder="km / h" oninput="repCampTreball(' + t.uid + ',\'comptador_valor\',this.value)">' +
         '<select id="rt-unitat-' + t.uid + '" ' + dis + ' style="width:70px;" onchange="repCampTreball(' + t.uid + ',\'comptador_unitat\',this.value)">' + optsUnitat + '</select></div></div>';
    h += '<div class="rep-ample"><label>Descripció del treball</label><input type="text" ' + dis + ' value="' + repEsc(t.descripcio) + '" placeholder="Ex: Pèrdua d\'oli (càrter trencat)" oninput="repCampTreball(' + t.uid + ',\'descripcio\',this.value)"></div>';
    h += '</div>';

    h += '<table class="rep-taula"><thead><tr><th>Tipus</th><th>Ref.</th><th>Descripció</th><th>Qtat</th><th>Preu</th><th>Dto %</th><th>Net (sense IVA)</th><th></th></tr></thead><tbody>';
    h += t.linies.map(function(l) { return repHtmlLinia(t, l); }).join('');
    h += '</tbody></table>';
    if (!ro) h += '<button type="button" class="btn btn-sm btn-secondary" style="margin-top:8px;" onclick="repAfegirLinia(' + t.uid + ')">➕ Línia</button>';
    h += '</div>';
    return h;
}

function repHtmlLinia(t, l) {
    const dis = repEstat.ro ? 'disabled' : '';
    const opcions = Object.keys(REP_TIPUS_LINIA).map(function(k) {
        return '<option value="' + k + '"' + (l.tipus === k ? ' selected' : '') + '>' + REP_TIPUS_LINIA[k] + '</option>';
    }).join('');
    const a = t.uid + ',' + l.uid;
    return '<tr>' +
        '<td style="width:120px;"><select ' + dis + ' onchange="repCampLinia(' + a + ',\'tipus\',this.value)">' + opcions + '</select></td>' +
        '<td style="width:90px;"><input type="text" ' + dis + ' value="' + repEsc(l.ref_article) + '" oninput="repCampLinia(' + a + ',\'ref_article\',this.value)"></td>' +
        '<td><input type="text" id="rl-desc-' + l.uid + '" ' + dis + ' value="' + repEsc(l.descripcio) + '" oninput="repCampLinia(' + a + ',\'descripcio\',this.value)"></td>' +
        '<td style="width:80px;"><input type="number" step="0.001" ' + dis + ' value="' + repEsc(l.quantitat) + '" oninput="repCampLinia(' + a + ',\'quantitat\',this.value)"></td>' +
        '<td style="width:90px;"><input type="number" step="0.0001" ' + dis + ' value="' + repEsc(l.preu) + '" oninput="repCampLinia(' + a + ',\'preu\',this.value)"></td>' +
        '<td style="width:70px;"><input type="number" step="0.01" ' + dis + ' value="' + repEsc(l.descompte) + '" oninput="repCampLinia(' + a + ',\'descompte\',this.value)"></td>' +
        '<td style="width:100px;"><input type="number" step="0.01" id="rl-net-' + l.uid + '" ' + dis + ' value="' + repEsc(l.net) + '" oninput="repCampLinia(' + a + ',\'net\',this.value)" onkeydown="repTeclaNet(event,' + a + ')"></td>' +
        '<td style="width:30px;">' + (repEstat.ro ? '' : '<button type="button" onclick="repEliminarLinia(' + a + ')" style="background:none;border:none;color:#f44336;cursor:pointer;font-size:16px;">✕</button>') + '</td>' +
        '</tr>';
}

// ------------------------------------------------------------
// MODAL: gestió de l'estat (handlers)
// ------------------------------------------------------------

function repTrobaTreball(uid) {
    return repEstat.treballs.find(function(t) { return t.uid === uid; });
}

function repTrobaLinia(tUid, lUid) {
    const t = repTrobaTreball(tUid);
    return t ? t.linies.find(function(l) { return l.uid === lUid; }) : null;
}

function repAfegirTreball(mateixElement) {
    const ultim = repEstat.treballs[repEstat.treballs.length - 1];
    const t = repNouTreball(mateixElement && ultim ? ultim.immobilitzat_id : null);
    repEstat.treballs.push(t);
    repRenderTreballs();
    repRecalcular();
    setTimeout(function() {
        const el = document.getElementById('rep-treball-' + t.uid);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const d = document.getElementById('rl-desc-' + t.linies[0].uid);
        if (d && mateixElement) d.focus();
    }, 0);
}

function repEliminarTreball(uid) {
    const t = repTrobaTreball(uid);
    if (!t) return;
    if (t.id && !confirm('Eliminar aquest treball i les seves línies?')) return;
    if (t.id) repEstat.treballsEliminats.push(t.id);
    repEstat.treballs = repEstat.treballs.filter(function(x) { return x.uid !== uid; });
    if (repEstat.treballs.length === 0) repEstat.treballs.push(repNouTreball());
    repRenderTreballs();
    repRecalcular();
}

function repAfegirLinia(tUid) {
    const t = repTrobaTreball(tUid);
    if (!t) return;
    const l = repNovaLinia();
    t.linies.push(l);
    repRenderTreballs();
    repRecalcular();
    setTimeout(function() {
        const d = document.getElementById('rl-desc-' + l.uid);
        if (d) d.focus();
    }, 0);
}

function repEliminarLinia(tUid, lUid) {
    const t = repTrobaTreball(tUid);
    if (!t) return;
    const l = repTrobaLinia(tUid, lUid);
    if (l && l.id) repEstat.liniesEliminades.push(l.id);
    t.linies = t.linies.filter(function(x) { return x.uid !== lUid; });
    if (t.linies.length === 0) t.linies.push(repNovaLinia());
    repRenderTreballs();
    repRecalcular();
}

// Enter al camp «Net» de l'última línia = afegeix una línia nova
function repTeclaNet(ev, tUid, lUid) {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    const t = repTrobaTreball(tUid);
    if (t && t.linies[t.linies.length - 1].uid === lUid) repAfegirLinia(tUid);
}

function repCampTreball(uid, camp, valor) {
    const t = repTrobaTreball(uid);
    if (t) t[camp] = valor;
}

function repCanviElement(uid, input) {
    const t = repTrobaTreball(uid);
    if (!t) return;
    t.etiqueta = input.value;
    const id = repMapaEtiqueta[input.value] || null;
    t.immobilitzat_id = id;
    input.classList.toggle('rep-invalid', !id);

    // Unitat de comptador suggerida segons el tipus d'element (només si està buida)
    if (id && !t.comptador_unitat) {
        const tipus = repMapaId[id] ? repMapaId[id].tipus : '';
        const unitat = (tipus === 'vehicle') ? 'km' : (tipus === 'tractor' ? 'h' : '');
        if (unitat) {
            t.comptador_unitat = unitat;
            const sel = document.getElementById('rt-unitat-' + uid);
            if (sel) sel.value = unitat;
        }
    }
}

function repCampLinia(tUid, lUid, camp, valor) {
    const l = repTrobaLinia(tUid, lUid);
    if (!l) return;
    l[camp] = valor;

    if (camp === 'quantitat' || camp === 'preu' || camp === 'descompte') {
        const q = repNum(l.quantitat);
        const p = repNum(l.preu);
        const d = repNum(l.descompte) || 0;
        if (q !== null && p !== null) {
            l.net = repR2(q * p * (1 - d / 100)).toFixed(2);
            const el = document.getElementById('rl-net-' + lUid);
            if (el) el.value = l.net;
        }
    }
    repRecalcular();
}

function repProveidorCanviat(valor) {
    const nif = repProveidors[valor];
    const camp = document.getElementById('rep-nif');
    if (nif && camp && !camp.value) camp.value = nif;
}

function repCanviBase() {
    if (!repEstat.totalManual) {
        const base = repNum(document.getElementById('rep-net')?.value);
        const iva = repNum(document.getElementById('rep-iva')?.value) || 0;
        const total = document.getElementById('rep-total');
        if (total && base !== null) total.value = repR2(base + iva).toFixed(2);
    }
    repRecalcular();
}

// Subtotals per treball + quadratura global (línies vs base)
function repRecalcular() {
    if (!repEstat) return;
    let suma = 0;
    repEstat.treballs.forEach(function(t) {
        let sub = 0;
        t.linies.forEach(function(l) {
            const n = repNum(l.net);
            if (n !== null) sub += n;
        });
        suma += sub;
        const el = document.getElementById('rt-sub-' + t.uid);
        if (el) el.textContent = 'Subtotal: ' + repFmt(sub) + ' €';
    });

    const box = document.getElementById('rep-quadratura');
    if (!box) return;
    const base = repNum(document.getElementById('rep-net')?.value);
    suma = repR2(suma);

    if (base === null) {
        box.className = 'rep-quadratura rep-neutre';
        box.innerHTML = 'Suma de línies: ' + repFmt(suma) + ' € — introdueix la base de la factura per comprovar la quadratura.';
        return;
    }
    const dif = repR2(base - suma);
    if (Math.abs(dif) <= REP_TOLERANCIA) {
        box.className = 'rep-quadratura rep-ok';
        box.innerHTML = '✅ Quadra: línies ' + repFmt(suma) + ' € = base ' + repFmt(base) + ' €';
    } else {
        box.className = 'rep-quadratura rep-ko';
        box.innerHTML = '❌ No quadra: línies ' + repFmt(suma) + ' € · base ' + repFmt(base) + ' € · diferència ' + repFmt(dif) + ' €';
    }
}

// ------------------------------------------------------------
// DESAR
// ------------------------------------------------------------

async function guardarReparacio() {
    const data = document.getElementById('rep-data').value;
    const numFactura = document.getElementById('rep-num').value.trim();
    const proveidor = document.getElementById('rep-proveidor').value.trim();
    const base = repNum(document.getElementById('rep-net').value);

    if (!data || !numFactura || !proveidor || base === null) {
        mostrarNotificacio('Cal omplir data, nº factura, proveïdor i base', 'error');
        return;
    }

    // Validació i preparació de treballs/línies
    const preparats = [];
    let suma = 0;
    for (let i = 0; i < repEstat.treballs.length; i++) {
        const t = repEstat.treballs[i];
        const n = i + 1;
        if (!t.immobilitzat_id) {
            mostrarNotificacio('Treball ' + n + ': cal triar un element de la llista', 'error');
            return;
        }
        const valorC = repNum(t.comptador_valor);
        if (valorC !== null && !t.comptador_unitat) {
            mostrarNotificacio('Treball ' + n + ': indica la unitat del comptador (km o h)', 'error');
            return;
        }

        const linies = [];
        for (let j = 0; j < t.linies.length; j++) {
            const l = t.linies[j];
            const desc = (l.descripcio || '').trim();
            const net = repNum(l.net);
            if (!desc && net === null) continue;   // línia buida: s'ignora
            if (!desc || net === null) {
                mostrarNotificacio('Treball ' + n + ', línia ' + (j + 1) + ': cal descripció i net', 'error');
                return;
            }
            const dto = repNum(l.descompte) || 0;
            if (dto < 0 || dto > 100) {
                mostrarNotificacio('Treball ' + n + ', línia ' + (j + 1) + ': el descompte ha d\'estar entre 0 i 100', 'error');
                return;
            }
            suma += net;
            linies.push({
                id: l.id,
                tipus: l.tipus,
                ref_article: (l.ref_article || '').trim() || null,
                descripcio: desc,
                quantitat: repNum(l.quantitat) === null ? 1 : repNum(l.quantitat),
                preu: repNum(l.preu),
                descompte: dto,
                net: repR2(net),
                ordre: linies.length + 1
            });
        }
        if (linies.length === 0) {
            mostrarNotificacio('Treball ' + n + ': cal almenys una línia', 'error');
            return;
        }
        preparats.push({
            id: t.id,
            cos: {
                immobilitzat_id: t.immobilitzat_id,
                document: (t.document || '').trim() || null,
                data_treball: t.data_treball || null,
                naturalesa: t.naturalesa || null,
                comptador_valor: valorC,
                comptador_unitat: valorC === null ? null : t.comptador_unitat,
                descripcio: (t.descripcio || '').trim() || null,
                ordre: n
            },
            linies: linies
        });
    }

    const dif = repR2(base - repR2(suma));
    if (Math.abs(dif) > REP_TOLERANCIA) {
        mostrarNotificacio('No quadra: diferència de ' + repFmt(dif) + ' € entre la base i les línies', 'error');
        return;
    }

    const iva = repNum(document.getElementById('rep-iva').value);
    const factura = {
        data: data,
        num_factura: numFactura,
        proveidor: proveidor,
        proveidor_nif: document.getElementById('rep-nif').value.trim() || null,
        import_net: repR2(base),
        import_iva: iva === null ? 0 : iva,
        import_total: repNum(document.getElementById('rep-total').value),
        observacions: document.getElementById('rep-obs').value.trim() || null
    };

    const btn = document.getElementById('rep-btn-guardar');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardant...'; }

    try {
        // 1. Factura
        let facturaId = repEstat.id;
        if (facturaId) {
            const { error } = await supabaseClient.from('reparacions_factures').update(factura).eq('id', facturaId);
            if (error) throw error;
        } else {
            const { data: nova, error } = await supabaseClient.from('reparacions_factures').insert([factura]).select().single();
            if (error) throw error;
            facturaId = nova.id;
            repEstat.id = facturaId;   // si falla més avall, un nou intent actualitzarà en lloc de duplicar
        }

        // 2. Treballs i línies
        for (let i = 0; i < preparats.length; i++) {
            const p = preparats[i];
            let treballId = p.id;
            if (treballId) {
                const { error } = await supabaseClient.from('reparacions_treballs').update(p.cos).eq('id', treballId);
                if (error) throw error;
            } else {
                const { data: nou, error } = await supabaseClient.from('reparacions_treballs')
                    .insert([Object.assign({ factura_id: facturaId }, p.cos)]).select().single();
                if (error) throw error;
                treballId = nou.id;
                repEstat.treballs[i].id = treballId;
            }

            const noves = p.linies.filter(function(l) { return !l.id; })
                .map(function(l) { const c = Object.assign({}, l); delete c.id; c.treball_id = treballId; return c; });
            if (noves.length > 0) {
                const { error } = await supabaseClient.from('reparacions_linies').insert(noves);
                if (error) throw error;
            }
            const existents = p.linies.filter(function(l) { return l.id; });
            for (let k = 0; k < existents.length; k++) {
                const c = Object.assign({}, existents[k]);
                const lid = c.id;
                delete c.id;
                const { error } = await supabaseClient.from('reparacions_linies').update(c).eq('id', lid);
                if (error) throw error;
            }
        }

        // 3. Esborrats lògics (treballs treuts, les seves línies, i línies treballs)
        if (repEstat.treballsEliminats.length > 0) {
            const { error: e1 } = await supabaseClient.from('reparacions_linies')
                .update({ eliminat: true }).in('treball_id', repEstat.treballsEliminats).eq('eliminat', false);
            if (e1) throw e1;
            const { error: e2 } = await supabaseClient.from('reparacions_treballs')
                .update({ eliminat: true }).in('id', repEstat.treballsEliminats);
            if (e2) throw e2;
        }
        if (repEstat.liniesEliminades.length > 0) {
            const { error } = await supabaseClient.from('reparacions_linies')
                .update({ eliminat: true }).in('id', repEstat.liniesEliminades);
            if (error) throw error;
        }

        mostrarNotificacio('✅ Factura guardada correctament', 'success');
        tancarModal('modal-reparacio');
        await carregarTaulaReparacions();

    } catch (error) {
        console.error('Error guardant reparació:', error);
        let msg = error.message;
        if (error.code === '23505') msg = 'Ja existeix una factura d\'aquest proveïdor amb aquest número';
        mostrarNotificacio('Error: ' + msg + (repEstat.id ? ' (la factura pot haver quedat desada parcialment: reobre-la i revisa-la)' : ''), 'error');
        if (btn) { btn.disabled = false; btn.textContent = '💾 Guardar'; }
    }
}

console.log('✅ Reparacions UI v1 carregat');
