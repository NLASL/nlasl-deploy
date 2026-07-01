// ============================================================
// FERTILITZANTS UI V2 — Formulari multi-producte + selector arbre
// Substituteix fertilitzants-ui_v1.js
// Arquitectura: fertilitzacions (capçalera per parcel·la) +
//               fertilitzacions_productes (N productes per grup)
// ============================================================
//
// FIXME pendents:
//   - Opcions del select `fertilitzacio-metode`: revisar que coincideixin
//     amb els valors existents a la BD (metode és text lliure).
// ============================================================

// ─── Configuració camps NPK (ajustar si els noms difereixen) ─
var NPK_CAMP_N = 'n';
var NPK_CAMP_P = 'p';
var NPK_CAMP_K = 'k';

// ─── Estat global modal ──────────────────────────────────────
var _tipusRegFertActual = 'regadiu';

// ============================================================
// HELPERS NPK
// ============================================================

function getNPKFertilitzant(producteId) {
    // Lookup des del catàleg global window.Fertilitzants
    const f = (window.Fertilitzants || []).find(function(x) { return x.id === producteId; });
    if (!f) return { n: 0, p: 0, k: 0 };
    return {
        n: parseFloat(f[NPK_CAMP_N]) || 0,
        p: parseFloat(f[NPK_CAMP_P]) || 0,
        k: parseFloat(f[NPK_CAMP_K]) || 0
    };
}

/**
 * Calcula N/P/K total per a una superfície donada,
 * sumant tots els productes del grup.
 *
 * liniesProducte pot venir de dues fonts:
 *   a) recollirLiniesProducteFertilitzant()  → te producte_id, sense camps NPK directes
 *   b) getProductesFertilitzacioGrup()       → te nitrogen/fosfor/potasi del join BD
 * La funció suporta ambdós casos.
 */
function calcularNPKGrup(liniesProducte, superficieHa) {
    var n = 0, p = 0, k = 0;
    liniesProducte.forEach(function(lp) {
        var nPct, pPct, kPct;
        if (lp[NPK_CAMP_N] !== undefined) {
            // Producte ja ve amb NPK del join BD
            nPct = parseFloat(lp[NPK_CAMP_N]) || 0;
            pPct = parseFloat(lp[NPK_CAMP_P]) || 0;
            kPct = parseFloat(lp[NPK_CAMP_K]) || 0;
        } else {
            // Lookup des del catàleg global
            var npk = getNPKFertilitzant(lp.producte_id);
            nPct = npk.n;
            pPct = npk.p;
            kPct = npk.k;
        }
        var dosi = parseFloat(lp.dosi) || 0;
        n += dosi * (nPct / 100) * superficieHa;
        p += dosi * (pPct / 100) * superficieHa;
        k += dosi * (kPct / 100) * superficieHa;
    });
    return { n: n, p: p, k: k };
}

// ============================================================
// VISTA PRINCIPAL
// ============================================================

async function carregarVistaFertilitzacions() {
    var container = document.getElementById('view-container');
    var podeCrear = hasPermission('insert');
    var campanyadefecte = getCampanyaDefecte();

    var html = '<div class="view-fertilitzacions">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">';
    html += '<h2>🌿 Fertilitzacions</h2>';
    html += '<div style="display:flex; gap:8px; align-items:center;">';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalFertilitzacio()">➕ Nova Fertilització</button>';
    }
    html += '</div></div>';

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
    html += '<thead><tr><th>Data</th><th>Productes</th><th>Finca</th><th>Parcel·les</th><th>Superfície (Ha)</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-fertilitzacions"><tr><td colspan="6">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';

    html += crearModalFertilitzacioV2();

    container.innerHTML = html;

    document.getElementById('filtre-campanya-fertilitzacions').addEventListener('change', carregarTaulaFertilitzacions);
    await carregarTaulaFertilitzacions();
}

async function carregarTaulaFertilitzacions() {
    var tbody = document.getElementById('tbody-fertilitzacions');
    if (!tbody) return;

    var campanya = parseInt(document.getElementById('filtre-campanya-fertilitzacions')?.value) || getCampanyaDefecte();
    var dates = getDatesCampanya(campanya);
    var dataInici = dates.dataInici;
    var dataFinal = dates.dataFinal;

    try {
        var res = await supabaseClient
            .from('fertilitzacions_complet')
            .select('*')
            .eq('estat', 'actiu')
            .gte('data', dataInici)
            .lte('data', dataFinal)
            .order('data', { ascending: false });
        if (res.error) throw res.error;

        var registres = res.data || [];

        if (!registres.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hi ha fertilitzacions per la campanya ' + campanya + '</td></tr>';
            return;
        }

        // Agrupar per grup_fertilitzacio
        var grups = {};
        registres.forEach(function(f) {
            var gt = f.grup_fertilitzacio;
            if (!gt) return;
            var p = parcelles.find(function(pa) { return pa.id === f.parcella_id; });
            if (!grups[gt]) {
                grups[gt] = {
                    grup_fertilitzacio: gt,
                    data: f.data,
                    productes: f.productes || [],
                    num_productes: f.num_productes || 0,
                    finques: new Set(),
                    registres: [],
                    superficie_total: 0
                };
            }
            if (p && p.finca) grups[gt].finques.add(p.finca);
            grups[gt].registres.push(f);
            grups[gt].superficie_total += parseFloat(f.superficie_tractada) || 0;
        });

        var podeEditar = hasPermission('update');
        var podeEliminar = hasPermission('delete');
        var html = '';

        Object.values(grups).sort(function(a, b) {
            return b.data.localeCompare(a.data);
        }).forEach(function(g) {
            var nomsProductes = (g.productes || [])
                .map(function(p) { return p.nom || '—'; })
                .join(', ') || '<span style="color:#999;">Sense producte</span>';

            var badgeProductes = g.num_productes > 1
                ? ' <span style="background:#e8f5e9; color:#2e7d32; padding:2px 6px; border-radius:10px; font-size:11px;">' + g.num_productes + ' prod.</span>'
                : '';

            var fincesArr = Array.from(g.finques);
            var fincaTxt;
            if (fincesArr.length === 0) {
                fincaTxt = '—';
            } else if (fincesArr.length === 1) {
                fincaTxt = fincesArr[0];
            } else {
                var prefixos = [...new Set(fincesArr.map(function(f) { return f.split(' - ')[0]; }))];
                fincaTxt = prefixos.length === 1
                    ? prefixos[0] + ' <span style="color:#888; font-size:12px;">(' + fincesArr.length + ' finques)</span>'
                    : '<span style="color:#555; font-size:13px;">' + fincesArr.length + ' finques</span>';
            }

            html += '<tr>';
            html += '<td><strong>' + formatData(g.data) + '</strong></td>';
            html += '<td>' + nomsProductes + badgeProductes + '</td>';
            html += '<td>' + fincaTxt + '</td>';
            html += '<td>' + g.registres.length + ' parcel·les</td>';
            html += '<td>' + g.superficie_total.toFixed(2) + '</td>';
            html += '<td>';
            html += '<button class="btn btn-sm btn-primary" onclick="veureFertilitzacioGrupV2(\'' + g.grup_fertilitzacio + '\')">👁️</button>';
            if (podeEditar) html += ' <button class="btn btn-sm btn-secondary" onclick="editarFertilitzacioGrupV2(\'' + g.grup_fertilitzacio + '\')">✏️</button>';
            if (podeEliminar) html += ' <button class="btn btn-sm btn-danger" onclick="eliminarFertilitzacioGrup(\'' + g.grup_fertilitzacio + '\')">🗑️</button>';
            html += '</td>';
            html += '</tr>';
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error('carregarTaulaFertilitzacions:', error);
        tbody.innerHTML = '<tr><td colspan="6">Error carregant dades</td></tr>';
    }
}

// ============================================================
// MODAL — HTML
// ============================================================

function crearModalFertilitzacioV2() {
    return `
    <div id="modal-fertilitzacio" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:860px;">
            <span class="close" onclick="tancarModal('modal-fertilitzacio')">&times;</span>
            <h2 id="modal-fertilitzacio-titol">Nova Fertilització</h2>
            <form id="form-fertilitzacio" onsubmit="guardarFertilitzacio(event)">

                <!-- CAPÇALERA -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                    <div class="form-group">
                        <label>Data *</label>
                        <input type="date" id="fertilitzacio-data" required>
                    </div>
                    <div class="form-group">
                        <label>Mètode Aplicació</label>
                        <select id="fertilitzacio-metode" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                            <option value="">Seleccionar...</option>
                            <option value="sol">Sòl</option>
                            <option value="foliar">Foliar</option>
                            <option value="fertirrigacio">Fertirrigació</option>
                            <option value="manual">Manual</option>
                            <option value="altres">Altres</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Operador</label>
                        <input type="text" id="fertilitzacio-operador">
                    </div>
                    <div class="form-group">
                        <label>Maquinària</label>
                        <input type="text" id="fertilitzacio-maquinaria">
                    </div>
                </div>
                <div class="form-group">
                    <label>Observacions</label>
                    <textarea id="fertilitzacio-observacions" rows="2"></textarea>
                </div>

                <!-- SELECCIÓ PARCEL·LES -->
                <div class="form-group">
                    <label>Selecció Parcel·les *</label>
                    <div style="display:flex; gap:8px; margin-top:8px; margin-bottom:8px;">
                        <button type="button" id="fert-btn-regadiu" onclick="canviarTipusRegFertilitzacio('regadiu')"
                            style="padding:6px 14px; border-radius:20px; border:2px solid #1565c0; background:#1565c0; color:#fff; font-size:13px; cursor:pointer; font-weight:600;">
                            💧 Regadiu
                        </button>
                        <button type="button" id="fert-btn-seca" onclick="canviarTipusRegFertilitzacio('seca')"
                            style="padding:6px 14px; border-radius:20px; border:2px solid #bbb; background:#fff; color:#555; font-size:13px; cursor:pointer;">
                            🌾 Secà
                        </button>
                    </div>
                    <div id="fertilitzacio-finques-checks" style="margin-top:4px;"></div>
                    <div style="background:#f5f5f5; padding:8px 12px; border-radius:6px; margin-top:8px; font-size:14px;">
                        Superfície total seleccionada: <strong><span id="superficie-total-fert">0</span> Ha</strong>
                    </div>
                </div>

                <!-- LÍNIES DE PRODUCTE -->
                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <label style="margin:0;">Productes *</label>
                        <button type="button" class="btn btn-secondary" style="font-size:13px; padding:6px 12px;"
                            onclick="afegirLiniaProducteFertilitzant()">
                            ➕ Afegir producte
                        </button>
                    </div>
                    <div id="linies-productes-fert-container"></div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-fertilitzacio')">Cancel·lar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>`;
}

// ============================================================
// MODAL — Obrir / Reset
// ============================================================

async function obrirModalFertilitzacio() {
    if (!document.getElementById('modal-fertilitzacio')) {
        var div = document.createElement('div');
        div.innerHTML = crearModalFertilitzacioV2();
        document.body.appendChild(div);
    }

    document.getElementById('modal-fertilitzacio-titol').textContent = 'Nova Fertilització';
    var form = document.getElementById('form-fertilitzacio');
    form.reset();
    form.dataset.editMode = 'false';
    form.dataset.editGrup = '';

    var avui = new Date().toISOString().split('T')[0];
    document.getElementById('fertilitzacio-data').value = avui;

    _tipusRegFertActual = 'regadiu';
    actualitzarEstilToggleRegFertilitzacio();
    construirSelectorFertFinques(null, null);

    document.getElementById('linies-productes-fert-container').innerHTML = '';
    afegirLiniaProducteFertilitzant();

    var supEl = document.getElementById('superficie-total-fert');
    if (supEl) supEl.textContent = '0';

    document.getElementById('modal-fertilitzacio').style.display = 'block';
}

function resetFormulariFertilitzacions() {
    var form = document.getElementById('form-fertilitzacio');
    if (!form) return;
    form.reset();
    form.dataset.editMode = 'false';
    form.dataset.editGrup = '';
    var supEl = document.getElementById('superficie-total-fert');
    if (supEl) supEl.textContent = '0';
    var contenidor = document.getElementById('linies-productes-fert-container');
    if (contenidor) contenidor.innerHTML = '';
    afegirLiniaProducteFertilitzant();
}

// ============================================================
// GUARDAR
// ============================================================

async function guardarFertilitzacio(event) {
    event.preventDefault();

    var data       = document.getElementById('fertilitzacio-data').value;
    var metode     = document.getElementById('fertilitzacio-metode').value;
    var operador   = document.getElementById('fertilitzacio-operador').value.trim();
    var maquinaria = document.getElementById('fertilitzacio-maquinaria').value.trim();
    var observacions = document.getElementById('fertilitzacio-observacions').value.trim();
    var campanya   = getCampanyaDefecte().toString();

    var liniesProducte = recollirLiniesProducteFertilitzant();
    if (!liniesProducte.length) {
        mostrarNotificacio('Cal afegir almenys un producte', 'error');
        return;
    }

    var parcellesAFertilitzar = getParcellesFertilitzacioSeleccionades();
    if (!parcellesAFertilitzar.length) {
        mostrarNotificacio('Cal seleccionar almenys una parcel·la', 'error');
        return;
    }

    var form = document.getElementById('form-fertilitzacio');
    var editMode = form.dataset.editMode === 'true';
    var editGrup = form.dataset.editGrup || null;

    try {
        if (editMode && editGrup) {
            // Edició: esborrar registres anteriors del grup
            await supabaseClient.from('fertilitzacions_productes').delete().eq('grup_fertilitzacio', editGrup);
            await supabaseClient.from('fertilitzacions').delete().eq('grup_fertilitzacio', editGrup);
        }

        var grupFertilitzacio = crypto.randomUUID();

        // Inserir una fila a `fertilitzacions` per cada parcel·la
        for (var pi = 0; pi < parcellesAFertilitzar.length; pi++) {
            var p = parcellesAFertilitzar[pi];
            var superficieParcel = parseFloat(p.superficie) || 0;

            // Calcular NPK agregat (suma de tots els productes) per aquesta parcel·la
            // S'escriu a n_total/p_total/k_total per compatibilitat amb el Llibre actual.
            // Quan el Llibre es migri per llegir de fertilitzacions_productes,
            // aquests camps deixaran de ser necessaris.
            var npk = calcularNPKGrup(liniesProducte, superficieParcel);

            var novaFila = {
                data:               data,
                metode:             metode || null,
                operador:           operador || null,
                maquinaria:         maquinaria || null,
                observacions:       observacions || null,
                parcella_id:        p.id,
                superficie_tractada: superficieParcel,
                estat:              'actiu',
                campanya:           campanya,
                grup_fertilitzacio: grupFertilitzacio,
                n_total:            parseFloat(npk.n.toFixed(4)),
                p_total:            parseFloat(npk.p.toFixed(4)),
                k_total:            parseFloat(npk.k.toFixed(4)),
                created_by:         (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null
            };

            var res = await supabaseClient
                .from('fertilitzacions')
                .insert([novaFila])
                .select()
                .single();
            if (res.error) throw res.error;
        }

        // Inserir línies de producte (una fila per producte, compartida per totes les parcel·les)
        var rowsProductes = liniesProducte.map(function(lp) {
            return {
                grup_fertilitzacio:   grupFertilitzacio,
                producte_id:          lp.producte_id || null,
                dosi:                 parseFloat(lp.dosi) || 0,
                unitat:               lp.unitat || 'kg/Ha',
                observacions_producte: lp.observacions_producte || null
            };
        });

        var resProds = await supabaseClient.from('fertilitzacions_productes').insert(rowsProductes);
        if (resProds.error) throw resProds.error;

        // NOTA ESTOC: quan s'activi el control d'estoc de fertilitzants,
        // afegir aquí els moviments seguint el patró de guardarTractament:
        //   un moviment per producte per finca|varietat, quantitat = -(superficieTotal × dosi)

        mostrarNotificacio(editMode ? 'Fertilització actualitzada' : 'Fertilització registrada', 'success');
        tancarModal('modal-fertilitzacio');
        await carregarTaulaFertilitzacions();
        resetFormulariFertilitzacions();

    } catch (error) {
        console.error('Error guardarFertilitzacio:', error);
        mostrarNotificacio('Error en guardar: ' + error.message, 'error');
    }
}

// ============================================================
// LÍNIES DE PRODUCTE
// ============================================================

function afegirLiniaProducteFertilitzant(dades) {
    // dades: { producte_id, dosi, unitat } (opcional, per edició)
    var container = document.getElementById('linies-productes-fert-container');

    var fertilitzantsOrdenats = (window.Fertilitzants || []).slice().sort(function(a, b) {
        return (a.nom || '').localeCompare(b.nom || '');
    });

    var optionsHtml = '<option value="">Seleccionar...</option>';
    fertilitzantsOrdenats.forEach(function(f) {
        var sel = (dades && dades.producte_id === f.id) ? 'selected' : '';
        optionsHtml += '<option value="' + f.id + '" ' + sel + '>' + f.nom + '</option>';
    });

    var unitatOpts = ['kg/Ha', 'L/Ha', 'g/Ha', 'mL/Ha'].map(function(u) {
        return '<option value="' + u + '"' + (dades && dades.unitat === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('');

    var dosiVal = dades ? (dades.dosi || '') : '';

    var div = document.createElement('div');
    div.className = 'linia-producte-fert';
    div.style.cssText = 'border:1px solid #e0e0e0; border-radius:8px; padding:12px; margin-bottom:8px; background:#fafafa; position:relative;';
    div.innerHTML = `
        <div style="display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:8px; align-items:end;">
            <div>
                <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Producte *</label>
                <select class="lp-fert-producte" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                    ${optionsHtml}
                </select>
            </div>
            <div>
                <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Dosi *</label>
                <input type="number" class="lp-fert-dosi" value="${dosiVal}" min="0" step="0.001"
                    style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
            </div>
            <div>
                <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Unitat</label>
                <select class="lp-fert-unitat" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                    ${unitatOpts}
                </select>
            </div>
            <div>
                <button type="button" onclick="eliminarLiniaProducteFertilitzant(this)"
                    style="background:#ffebee; border:1px solid #ef9a9a; color:#c62828; border-radius:4px; padding:8px; cursor:pointer; font-size:14px; margin-top:18px;">🗑️</button>
            </div>
        </div>`;

    container.appendChild(div);
}

function eliminarLiniaProducteFertilitzant(btn) {
    var linia = btn.closest('.linia-producte-fert');
    if (document.querySelectorAll('.linia-producte-fert').length <= 1) {
        mostrarNotificacio('Cal tenir almenys un producte', 'error');
        return;
    }
    linia.remove();
}

function recollirLiniesProducteFertilitzant() {
    var linies = [];
    document.querySelectorAll('.linia-producte-fert').forEach(function(row) {
        var producteId = row.querySelector('.lp-fert-producte').value;
        var dosi       = parseFloat(row.querySelector('.lp-fert-dosi').value);
        var unitat     = row.querySelector('.lp-fert-unitat').value;
        if (producteId && dosi > 0) {
            linies.push({ producte_id: producteId, dosi: dosi, unitat: unitat });
        }
    });
    return linies;
}

// ============================================================
// SELECTOR EN ARBRE
// ============================================================

/**
 * Retorna true si la parcel·la pot rebre fertilització.
 * Exclou guaret, forestals i improductives: no s'abonen
 * i inflarien els consums de la finca.
 */
function esParcellaAptaFertilitzacio(p) {
    if (!p.cultiu) return true; // sense cultiu → s'inclou (transició de campanya)
    var c = p.cultiu.trim().toUpperCase();
    var exclosos = ['GUARET', 'FORESTAL', 'IMPRODUCTIU', 'IMPRODUCTIVA', 'ERM', 'ERMA'];
    return !exclosos.some(function(ex) { return c.includes(ex); });
}

function canviarTipusRegFertilitzacio(tipus) {
    _tipusRegFertActual = tipus;
    actualitzarEstilToggleRegFertilitzacio();
    construirSelectorFertFinques(null, null);
}

function actualitzarEstilToggleRegFertilitzacio() {
    var btnReg  = document.getElementById('fert-btn-regadiu');
    var btnSeca = document.getElementById('fert-btn-seca');
    if (!btnReg || !btnSeca) return;
    if (_tipusRegFertActual === 'regadiu') {
        btnReg.style.cssText  = 'padding:6px 14px; border-radius:20px; border:2px solid #1565c0; background:#1565c0; color:#fff; font-size:13px; cursor:pointer; font-weight:600;';
        btnSeca.style.cssText = 'padding:6px 14px; border-radius:20px; border:2px solid #bbb; background:#fff; color:#555; font-size:13px; cursor:pointer;';
    } else {
        btnSeca.style.cssText = 'padding:6px 14px; border-radius:20px; border:2px solid #795548; background:#795548; color:#fff; font-size:13px; cursor:pointer; font-weight:600;';
        btnReg.style.cssText  = 'padding:6px 14px; border-radius:20px; border:2px solid #bbb; background:#fff; color:#555; font-size:13px; cursor:pointer;';
    }
}

/**
 * Construeix el selector en arbre Finca → Varietats.
 * finquesPreseleccionades: array de noms de finca (mode edició) o null (nou)
 * varietatsPreseleccionades: array de { finca, varietat }      (mode edició) o null (nou)
 */
function construirSelectorFertFinques(finquesPreseleccionades, varietatsPreseleccionades) {
    var container = document.getElementById('fertilitzacio-finques-checks');
    if (!container) return;

    var esRegadiu = _tipusRegFertActual === 'regadiu';
    var anyActual = getCampanyaDefecte();

    // Filtrar per reg + aptitud + finca assignada
    var parcellesTipus = (parcelles || []).filter(function(p) {
        return p.regadiu === esRegadiu
            && esParcellaAptaFertilitzacio(p)
            && p.finca
            && p.finca.trim();
    });

    // Per cada finca: màxim any de campanya disponible
    var anyPerFinca = {};
    parcellesTipus.forEach(function(p) {
        var finca   = p.finca.trim();
        var campanya = p.campanya ? parseInt(p.campanya) : anyActual;
        if (!anyPerFinca[finca] || campanya > anyPerFinca[finca]) {
            anyPerFinca[finca] = campanya;
        }
    });

    // Quedar-se només amb les parcel·les de l'any més recent per cada finca
    var parcellesFiltrades = parcellesTipus.filter(function(p) {
        var finca    = p.finca.trim();
        var anyFinca = anyPerFinca[finca] || anyActual;
        var campanyaP = p.campanya ? parseInt(p.campanya) : anyActual;
        return campanyaP === anyFinca;
    });

    // Agrupar en arbre finca → varietat
    var arbre = {};
    parcellesFiltrades.forEach(function(p) {
        var finca   = p.finca.trim();
        var varietat = p.varietat || 'Sense varietat';
        if (!arbre[finca]) arbre[finca] = {};
        if (!arbre[finca][varietat]) arbre[finca][varietat] = { hectarees: 0, count: 0 };
        arbre[finca][varietat].hectarees += parseFloat(p.superficie) || 0;
        arbre[finca][varietat].count++;
    });

    var colorFinca   = esRegadiu ? '#e8f5e9' : '#fef9e7';
    var emojiFinca   = esRegadiu ? '💧' : '🌾';
    var missatgeBuit = esRegadiu
        ? 'No hi ha parcel·les de regadiu disponibles'
        : 'No hi ha parcel·les de secà disponibles';

    var modeEdicio = finquesPreseleccionades !== null && finquesPreseleccionades !== undefined;

    var html = '';
    Object.keys(arbre).sort().forEach(function(finca) {
        var varietats = Object.keys(arbre[finca]).sort();
        var haFinca   = Object.values(arbre[finca]).reduce(function(s, v) { return s + v.hectarees; }, 0);
        var fincaId   = 'fert-finca-' + finca.replace(/[^a-zA-Z0-9]/g, '_');
        var fincaMarcada = modeEdicio && finquesPreseleccionades.includes(finca);

        html += '<div style="margin-bottom:8px; border:1px solid #e0e0e0; border-radius:8px; overflow:hidden;">';
        html += '<div style="background:' + colorFinca + '; padding:8px 12px; display:flex; align-items:center; gap:10px;">';
        html += '<input type="checkbox" id="' + fincaId + '"' + (fincaMarcada ? ' checked' : '') + ' ';
        html += 'data-finca="' + finca.replace(/"/g, '&quot;') + '" ';
        html += 'onchange="toggleFincaFertilitzacio(this)" ';
        html += 'style="width:18px; height:18px; cursor:pointer;">';
        html += '<label for="' + fincaId + '" style="font-weight:600; cursor:pointer; flex:1; margin:0;">' + emojiFinca + ' ' + finca + '</label>';
        html += '<span style="font-size:12px; color:#555;">' + haFinca.toFixed(2) + ' Ha</span>';
        html += '</div>';

        html += '<div style="padding:6px 12px 8px 32px;">';
        varietats.forEach(function(varietat) {
            var info  = arbre[finca][varietat];
            var varId = 'fert-var-' + finca.replace(/[^a-zA-Z0-9]/g, '_') + '-' + varietat.replace(/[^a-zA-Z0-9]/g, '_');
            var varMarcada = modeEdicio && fincaMarcada && varietatsPreseleccionades &&
                varietatsPreseleccionades.some(function(v) { return v.finca === finca && v.varietat === varietat; });

            html += '<div style="display:flex; align-items:center; gap:8px; padding:3px 0;">';
            html += '<input type="checkbox" id="' + varId + '"' + (varMarcada ? ' checked' : '') + ' ';
            html += 'data-finca="' + finca.replace(/"/g, '&quot;') + '" ';
            html += 'data-varietat="' + varietat.replace(/"/g, '&quot;') + '" ';
            html += 'onchange="actualitzarCheckFincaFertilitzacio(this)" class="fert-check-varietat" ';
            html += 'style="width:16px; height:16px; cursor:pointer;">';
            html += '<label for="' + varId + '" style="cursor:pointer; margin:0; font-size:14px;">' + varietat + '</label>';
            html += '<span style="font-size:12px; color:#888; margin-left:auto;">' + info.hectarees.toFixed(2) + ' Ha · ' + info.count + ' parc.</span>';
            html += '</div>';
        });
        html += '</div></div>';
    });

    container.innerHTML = html || '<p style="color:#999;">' + missatgeBuit + '</p>';
    actualitzarParcellesFertilitzacioSeleccionades();
}

function toggleFincaFertilitzacio(cbFinca) {
    var finca  = cbFinca.dataset.finca;
    var marcat = cbFinca.checked;
    document.querySelectorAll('.fert-check-varietat[data-finca="' + finca + '"]').forEach(function(cb) {
        cb.checked = marcat;
    });
    cbFinca.indeterminate = false;
    actualitzarParcellesFertilitzacioSeleccionades();
}

function actualitzarCheckFincaFertilitzacio(cbVarietat) {
    var finca   = cbVarietat.dataset.finca;
    var totes   = document.querySelectorAll('.fert-check-varietat[data-finca="' + finca + '"]');
    var marcades = document.querySelectorAll('.fert-check-varietat[data-finca="' + finca + '"]:checked');
    var fincaId = 'fert-finca-' + finca.replace(/[^a-zA-Z0-9]/g, '_');
    var cbFinca = document.getElementById(fincaId);
    if (cbFinca) {
        cbFinca.checked       = marcades.length > 0;
        cbFinca.indeterminate = marcades.length > 0 && marcades.length < totes.length;
    }
    actualitzarParcellesFertilitzacioSeleccionades();
}

function actualitzarParcellesFertilitzacioSeleccionades() {
    var parcellesSeleccionades = getParcellesFertilitzacioSeleccionades();
    var superficie = parcellesSeleccionades.reduce(function(sum, p) {
        return sum + (parseFloat(p.superficie) || 0);
    }, 0);
    var spanSup = document.getElementById('superficie-total-fert');
    if (spanSup) spanSup.textContent = superficie.toFixed(2);
}

function getParcellesFertilitzacioSeleccionades() {
    var seleccions = [];
    document.querySelectorAll('.fert-check-varietat:checked').forEach(function(cb) {
        seleccions.push({ finca: cb.dataset.finca, varietat: cb.dataset.varietat });
    });

    var esRegadiu = _tipusRegFertActual === 'regadiu';
    var anyActual = getCampanyaDefecte();

    // Reconstruir anyPerFinca per filtrar per campanya màxima (mateix criteri que el selector)
    var anyPerFinca = {};
    (parcelles || []).forEach(function(p) {
        if (!p.finca || !p.finca.trim()) return;
        if (p.regadiu !== esRegadiu || !esParcellaAptaFertilitzacio(p)) return;
        var finca   = p.finca.trim();
        var campanya = p.campanya ? parseInt(p.campanya) : anyActual;
        if (!anyPerFinca[finca] || campanya > anyPerFinca[finca]) {
            anyPerFinca[finca] = campanya;
        }
    });

    return (parcelles || []).filter(function(p) {
        if (!p.finca || !p.finca.trim()) return false;
        if (!esParcellaAptaFertilitzacio(p) || p.regadiu !== esRegadiu) return false;
        var finca    = p.finca.trim();
        var anyFinca = anyPerFinca[finca] || anyActual;
        var campanyaP = p.campanya ? parseInt(p.campanya) : anyActual;
        if (campanyaP !== anyFinca) return false;
        return seleccions.some(function(s) {
            return s.finca === finca && s.varietat === p.varietat;
        });
    });
}

// ============================================================
// DETALL (veure)
// ============================================================

async function veureFertilitzacioGrupV2(grupFertilitzacio) {
    var productes = await getProductesFertilitzacioGrup(grupFertilitzacio);

    var res = await supabaseClient
        .from('fertilitzacions')
        .select('*, parcelles(id, nom, finca, varietat, cultiu, sigpac, superficie)')
        .eq('grup_fertilitzacio', grupFertilitzacio)
        .eq('estat', 'actiu');
    var fertGrup = res.data || [];

    if (!fertGrup.length) return;
    var primer = fertGrup[0];
    var superficieTotal = fertGrup.reduce(function(s, f) {
        return s + (parseFloat(f.superficie_tractada) || 0);
    }, 0);

    // Taula productes
    var htmlProductes = '';
    if (productes.length) {
        htmlProductes = '<table class="data-table" style="margin-top:8px;">';
        htmlProductes += '<thead><tr><th>Producte</th><th>Dosi</th><th>Unitat</th><th>Qtitat Total</th></tr></thead><tbody>';
        productes.forEach(function(p) {
            var quantitatTotal = (parseFloat(p.dosi) || 0) * superficieTotal;
            var unitatBase     = (p.unitat || '').split('/')[0];
            htmlProductes += '<tr>';
            htmlProductes += '<td><strong>' + (p.nom || '—') + '</strong></td>';
            htmlProductes += '<td>' + p.dosi + '</td>';
            htmlProductes += '<td>' + p.unitat + '</td>';
            htmlProductes += '<td><strong>' + quantitatTotal.toFixed(2) + ' ' + unitatBase + '</strong></td>';
            htmlProductes += '</tr>';
        });
        htmlProductes += '</tbody></table>';
    } else {
        htmlProductes = '<p style="color:#999;">Sense productes assignats</p>';
    }

    // Taula parcel·les amb NPK
    var nTotal = 0, pTotal = 0, kTotal = 0;
    var htmlParcelles = '<table class="data-table" style="margin-top:8px;">';
    htmlParcelles += '<thead><tr><th>Finca / Varietat</th><th>SIGPAC</th><th>Sup. (Ha)</th><th>N</th><th>P</th><th>K</th></tr></thead>';
    htmlParcelles += '<tbody>';

    fertGrup.forEach(function(f) {
        var par     = f.parcelles || {};
        var sup     = parseFloat(f.superficie_tractada) || 0;
        var finca   = par.finca   || 'Sense finca';
        var varietat = par.varietat || '';
        var nomMostrar = finca + (varietat ? ' - ' + varietat : '');

        var npk = calcularNPKGrup(productes, sup);
        nTotal += npk.n;
        pTotal += npk.p;
        kTotal += npk.k;

        htmlParcelles += '<tr>';
        htmlParcelles += '<td>' + nomMostrar + '</td>';
        htmlParcelles += '<td style="font-size:12px; color:#666;">' + (par.sigpac || '—') + '</td>';
        htmlParcelles += '<td>' + sup.toFixed(2) + '</td>';
        htmlParcelles += '<td>' + npk.n.toFixed(2) + '</td>';
        htmlParcelles += '<td>' + npk.p.toFixed(2) + '</td>';
        htmlParcelles += '<td>' + npk.k.toFixed(2) + '</td>';
        htmlParcelles += '</tr>';
    });

    // Fila totals
    htmlParcelles += '<tr style="background:#e8f5e9; font-weight:bold;">';
    htmlParcelles += '<td colspan="2"><strong>TOTALS</strong></td>';
    htmlParcelles += '<td><strong>' + superficieTotal.toFixed(2) + '</strong></td>';
    htmlParcelles += '<td><strong>' + nTotal.toFixed(2) + '</strong></td>';
    htmlParcelles += '<td><strong>' + pTotal.toFixed(2) + '</strong></td>';
    htmlParcelles += '<td><strong>' + kTotal.toFixed(2) + '</strong></td>';
    htmlParcelles += '</tr>';
    htmlParcelles += '</tbody></table>';

    var unitatNPK = productes.length > 0 ? (productes[0].unitat || 'kg').split('/')[0] : 'kg';

    var html = `
    <div id="modal-veure-fertilitzacio" class="modal" style="display:block;">
        <div class="modal-content" style="max-width:780px;">
            <span class="close" onclick="document.getElementById('modal-veure-fertilitzacio').remove()">&times;</span>
            <h2>📋 Detall Fertilització</h2>

            <div style="background:#f5f5f5; padding:15px; border-radius:8px; margin-bottom:16px;">
                <div><strong>📅 Data:</strong> ${formatData(primer.data)}</div>
                <div><strong>📏 Superfície total:</strong> ${superficieTotal.toFixed(2)} Ha (${fertGrup.length} parcel·les)</div>
                ${primer.metode    ? '<div><strong>🌱 Mètode:</strong> '      + primer.metode    + '</div>' : ''}
                ${primer.operador  ? '<div><strong>👤 Operador:</strong> '    + primer.operador  + '</div>' : ''}
                ${primer.maquinaria ? '<div><strong>🚜 Maquinària:</strong> ' + primer.maquinaria + '</div>' : ''}
                ${primer.observacions ? '<div><strong>📝 Obs.:</strong> '     + primer.observacions + '</div>' : ''}
            </div>

            <h3>🧪 Productes aplicats (${productes.length})</h3>
            ${htmlProductes}

            <div style="background:#e8f5e9; padding:10px 14px; border-radius:6px; margin:12px 0; font-size:14px;">
                <strong>🌿 Unitats Fertilitzants totals (U.F.):</strong><br>
                N total: <strong>${nTotal.toFixed(2)} ${unitatNPK}</strong> &nbsp;|&nbsp;
                P total: <strong>${pTotal.toFixed(2)} ${unitatNPK}</strong> &nbsp;|&nbsp;
                K total: <strong>${kTotal.toFixed(2)} ${unitatNPK}</strong>
            </div>

            <h3 style="margin-top:16px;">🗺️ Parcel·les Fertilitzades (${fertGrup.length})</h3>
            ${htmlParcelles}

            <div class="form-actions" style="margin-top:16px;">
                <button class="btn btn-primary" onclick="document.getElementById('modal-veure-fertilitzacio').remove()">Tancar</button>
            </div>
        </div>
    </div>`;

    var anterior = document.getElementById('modal-veure-fertilitzacio');
    if (anterior) anterior.remove();
    document.body.insertAdjacentHTML('beforeend', html);
}

// ============================================================
// EDITAR
// ============================================================

async function editarFertilitzacioGrupV2(grupFertilitzacio) {
    var res = await supabaseClient
        .from('fertilitzacions')
        .select('*, parcelles(finca, varietat, regadiu)')
        .eq('grup_fertilitzacio', grupFertilitzacio)
        .eq('estat', 'actiu');
    var fertGrup = res.data || [];

    if (!fertGrup.length) return;

    var productes = await getProductesFertilitzacioGrup(grupFertilitzacio);
    var primer    = fertGrup[0];

    await obrirModalFertilitzacio();

    document.getElementById('modal-fertilitzacio-titol').textContent = 'Editar Fertilització';
    var form = document.getElementById('form-fertilitzacio');
    form.dataset.editMode = 'true';
    form.dataset.editGrup = grupFertilitzacio;

    document.getElementById('fertilitzacio-data').value        = primer.data;
    document.getElementById('fertilitzacio-metode').value      = primer.metode || '';
    document.getElementById('fertilitzacio-operador').value    = primer.operador || '';
    document.getElementById('fertilitzacio-maquinaria').value  = primer.maquinaria || '';
    document.getElementById('fertilitzacio-observacions').value = primer.observacions || '';

    // Detectar reg des de la primera parcel·la
    var primeraParcella = (parcelles || []).find(function(p) { return fertGrup[0].parcella_id === p.id; });
    _tipusRegFertActual = (primeraParcella && primeraParcella.regadiu === false) ? 'seca' : 'regadiu';
    actualitzarEstilToggleRegFertilitzacio();

    // Reconstruir arbre amb preselecció
    var finquesUsades = [...new Set(fertGrup.map(function(f) {
        return f.parcelles ? f.parcelles.finca : null;
    }).filter(Boolean))];
    var varietatsUsades = fertGrup.map(function(f) {
        return {
            finca:   f.parcelles ? f.parcelles.finca   : null,
            varietat: f.parcelles ? f.parcelles.varietat : null
        };
    }).filter(function(v) { return v.finca && v.varietat; });

    construirSelectorFertFinques(finquesUsades, varietatsUsades);

    // Carregar línies de producte
    var container = document.getElementById('linies-productes-fert-container');
    container.innerHTML = '';
    if (productes.length) {
        productes.forEach(function(p) {
            afegirLiniaProducteFertilitzant({
                producte_id: p.producte_id,
                dosi:        p.dosi,
                unitat:      p.unitat
            });
        });
    } else {
        afegirLiniaProducteFertilitzant();
    }
}

// ============================================================
// ELIMINAR
// ============================================================

async function eliminarFertilitzacioGrup(grupFertilitzacio) {
    if (!confirm('Segur que vols eliminar aquesta fertilització?')) return;

    try {
        await supabaseClient.from('fertilitzacions_productes').delete().eq('grup_fertilitzacio', grupFertilitzacio);
        await supabaseClient.from('fertilitzacions').delete().eq('grup_fertilitzacio', grupFertilitzacio);
        mostrarNotificacio('Fertilització eliminada', 'success');
        await carregarTaulaFertilitzacions();
    } catch (error) {
        console.error('eliminarFertilitzacioGrup:', error);
        mostrarNotificacio('Error eliminant fertilització', 'error');
    }
}

// ============================================================
// HELPER BD: carregar productes d'un grup
// ============================================================

async function getProductesFertilitzacioGrup(grupFertilitzacio) {
    var res = await supabaseClient
        .from('fertilitzacions_productes')
        .select('*, fertilitzants(id, nom, ' + NPK_CAMP_N + ', ' + NPK_CAMP_P + ', ' + NPK_CAMP_K + ')')
        .eq('grup_fertilitzacio', grupFertilitzacio)
        .order('created_at');
    if (res.error) throw res.error;

    // Aplanar per facilitar ús (camps NPK directament a l'objecte)
    return (res.data || []).map(function(fp) {
        var fert = fp.fertilitzants || {};
        var obj = {
            id:                   fp.id,
            producte_id:          fp.producte_id,
            nom:                  fert.nom || '—',
            dosi:                 fp.dosi,
            unitat:               fp.unitat,
            observacions_producte: fp.observacions_producte
        };
        obj[NPK_CAMP_N] = parseFloat(fert[NPK_CAMP_N]) || 0;
        obj[NPK_CAMP_P] = parseFloat(fert[NPK_CAMP_P]) || 0;
        obj[NPK_CAMP_K] = parseFloat(fert[NPK_CAMP_K]) || 0;
        return obj;
    });
}