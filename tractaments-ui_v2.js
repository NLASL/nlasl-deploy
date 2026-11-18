// ============================================================
// TRACTAMENTS UI V2 — Formulari amb N productes
// ============================================================

async function carregarVistaTractaments() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    const campanyadefecte = getCampanyaDefecte();

    let html = '<div class="view-tractaments">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">';
    html += '<h2>🌱 Tractaments Fitosanitaris</h2>';
    html += '<div style="display:flex; gap:8px; align-items:center;">';
    html += '<button class="btn btn-secondary" onclick="canviarVista(\'recomanacionsT\')">📋 Recomanacions RT</button>';
    if (hasPermission('update')) {
        html += '<button class="btn btn-secondary" onclick="obrirModalDadesQIE()">⚙️ Dades QIE</button>';
        html += '<button class="btn btn-secondary" onclick="obrirModalExtracteQIE()">📤 Extracte QIE</button>';
    }
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalTractament()">➕ Nou Tractament</button>';
    }
    html += '</div>';
    html += '</div>'; // tanca justify-content:space-between

    // Filtre campanya
    html += '<div style="margin-bottom:15px; background:#f5f5f5; padding:12px; border-radius:8px; display:flex; align-items:center; gap:10px;">';
    html += '<label><strong>Campanya:</strong></label>';
    html += '<select id="filtre-campanya-tractaments" style="padding:6px; border-radius:4px; border:1px solid #ddd;">';
    [2024, 2025, 2026, 2027].forEach(function(c) {
        html += '<option value="' + c + '"' + (c === campanyadefecte ? ' selected' : '') + '>' + c + '</option>';
    });
    html += '</select>';
    html += '</div>';

    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Data</th><th>Productes</th><th>Finca</th><th>Parcel·les</th><th>Superfície (Ha)</th><th>Data Límit</th><th>Accions</th></tr></thead>';
    html += '<tbody id="tbody-tractaments"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';

    html += crearModalTractamentV2();

    container.innerHTML = html;

    document.getElementById('filtre-campanya-tractaments').addEventListener('change', carregarTaulaTractaments);
    await carregarTaulaTractaments();
}

async function carregarTaulaTractaments() {
    const tbody = document.getElementById('tbody-tractaments');
    if (!tbody) return;

    const campanya = parseInt(document.getElementById('filtre-campanya-tractaments')?.value) || getCampanyaDefecte();

    try {
        const registres = await getTractamentsComplet(campanya);

        // Catàleg QIE (només admin/editor: les dades d'aplicadors no són per a tothom)
        if (hasPermission('update')) {
            try { await carregarCatalegQIE(); } catch (e) { console.warn('Catàleg QIE no disponible:', e.message); }
        }

        if (!registres.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha tractaments per la campanya ' + campanya + '</td></tr>';
            return;
        }

        // Agrupar per grup_tractament
        const grups = {};
        registres.forEach(function(t) {
            const p = parcelles.find(function(pa) { return pa.id === t.parcella_id; });
            if (!p) return;
            const gt = t.grup_tractament;
            if (!grups[gt]) {
                grups[gt] = {
                    grup_tractament: gt,
                    data: t.data,
                    data_limit_efectiva: t.data_limit_efectiva,
                    productes: t.productes || [],
                    num_productes: t.num_productes || 0,
                    finques: new Set(),
                    tractaments: [],
                    superficie_total: 0
                };
            }
            if (p.finca) grups[gt].finques.add(p.finca);
            grups[gt].tractaments.push(t);
            grups[gt].superficie_total += parseFloat(t.superficie_tractada) || 0;
        });

        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        let html = '';

        Object.values(grups).sort(function(a, b) {
            return b.data.localeCompare(a.data);
        }).forEach(function(g) {
            const nomsProductes = (g.productes || [])
                .map(function(p) { return p.nom || '—'; })
                .join(', ') || '<span style="color:#999;">Sense producte</span>';

            const dataLimitTxt = g.data_limit_efectiva
                ? formatData(g.data_limit_efectiva)
                : '—';

            const badgeProductes = g.num_productes > 1
                ? ' <span style="background:#e3f2fd; color:#1565c0; padding:2px 6px; border-radius:10px; font-size:11px;">' + g.num_productes + ' prod.</span>'
                : '';

            html += '<tr>';
            html += '<td><strong>' + formatData(g.data) + '</strong>' + badgeQIETractament(g) + '</td>';
            html += '<td>' + nomsProductes + badgeProductes + '</td>';
            // Lògica B: una finca → nom, múltiples → "X finques"
            const fincesArr = Array.from(g.finques);
            let fincaTxt;
            if (fincesArr.length === 0) {
                fincaTxt = '—';
            } else if (fincesArr.length === 1) {
                fincaTxt = fincesArr[0];
            } else {
                // Extreure prefix curt (fins al primer guió)
                const prefixos = [...new Set(fincesArr.map(function(f) {
                    return f.split(' - ')[0];
                }))];
                fincaTxt = prefixos.length === 1
                    ? prefixos[0] + ' <span style="color:#888; font-size:12px;">(' + fincesArr.length + ' finques)</span>'
                    : '<span style="color:#555; font-size:13px;">' + fincesArr.length + ' finques</span>';
            }
            html += '<td>' + fincaTxt + '</td>';
            html += '<td>' + g.tractaments.length + ' parcel·les</td>';
            html += '<td>' + g.superficie_total.toFixed(2) + '</td>';
            html += '<td>' + dataLimitTxt + '</td>';
            html += '<td>';
            html += '<button class="btn btn-sm btn-primary" onclick="veureTractamentGrupV2(\'' + g.grup_tractament + '\')">👁️</button>';
            if (podeEditar) html += ' <button class="btn btn-sm btn-secondary" onclick="editarTractamentGrupV2(\'' + g.grup_tractament + '\')">✏️</button>';
            if (podeEditar) html += ' <button class="btn btn-sm btn-danger" title="Anul·lar" onclick="eliminarTractamentGrup(\'' + g.grup_tractament + '\')">🚫</button>';
            html += '</td>';
            html += '</tr>';
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="7">Error carregant dades</td></tr>';
    }
}

function crearModalTractamentV2() {
    return `
    <div id="modal-tractament" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:860px;">
            <span class="close" onclick="tancarModal('modal-tractament')">&times;</span>
            <h2 id="modal-tractament-titol">Nou Tractament</h2>
            <form id="form-tractament" onsubmit="guardarTractament(event)">

                <!-- CAPÇALERA -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                    <div class="form-group">
                        <label>Data Tractament *</label>
                        <input type="date" id="tractament-data" required onchange="carregarRTsPerData()">
                    </div>
                    <div class="form-group">
                        <label>Operador</label>
                        <input type="text" id="tractament-operador">
                    </div>
                    <div class="form-group">
                        <label>Maquinària</label>
                        <input type="text" id="tractament-maquinaria">
                    </div>
                    <div class="form-group">
                        <label>Condicions Meteorològiques</label>
                        <input type="text" id="tractament-meteo" placeholder="Temp: 22°C, Vent: Calma">
                    </div>
                </div>
                <div class="form-group">
                    <label>Observacions</label>
                    <textarea id="tractament-observacions" rows="2"></textarea>
                </div>

                <!-- DADES QIE -->
                <div style="background:#f3f8ff; border:1px solid #cfe0f5; border-radius:8px; padding:12px; margin-bottom:16px;">
                    <div style="font-weight:600; margin-bottom:8px;">📋 Dades QIE <span style="font-weight:400; font-size:12px; color:#666;">(obligatòries per als tractaments a partir de l'1/1/2027)</span></div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                        <div class="form-group">
                            <label>Recomanació RT</label>
                            <select id="tractament-rt" onchange="aplicarRTATractament()" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                                <option value="">— Sense RT —</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Assessor</label>
                            <select id="tractament-assessor" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                                <option value="">— Seleccionar —</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Aplicador</label>
                            <select id="tractament-aplicador" onchange="aplicadorSeleccionat()" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                                <option value="">— Seleccionar —</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Equip d'aplicació</label>
                            <select id="tractament-equip" onchange="equipSeleccionat()" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                                <option value="">— Seleccionar —</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Volum de caldo (L/Ha)</label>
                            <input type="number" id="tractament-caldo" min="0" step="50" placeholder="1000">
                        </div>
                        <div class="form-group">
                            <label>Justificació (si no hi ha RT)</label>
                            <input type="text" id="tractament-justificacio" placeholder="Ex: avís de la cooperativa, llindar assolit...">
                        </div>
                    </div>
                    <div id="qie-avis-form" style="font-size:12px; color:#8a6d3b; margin-top:6px;"></div>
                </div>

                <!-- SELECCIÓ PARCEL·LES -->
                <div class="form-group">
                    <label>Selecció Parcel·les *</label>
                    <div style="display:flex; gap:8px; margin-top:8px; margin-bottom:8px;">
                        <button type="button" id="btn-regadiu" onclick="canviarTipusReg('regadiu')"
                            style="padding:6px 14px; border-radius:20px; border:2px solid #1565c0; background:#1565c0; color:#fff; font-size:13px; cursor:pointer; font-weight:600;">
                            💧 Regadiu
                        </button>
                        <button type="button" id="btn-seca" onclick="canviarTipusReg('seca')"
                            style="padding:6px 14px; border-radius:20px; border:2px solid #bbb; background:#fff; color:#555; font-size:13px; cursor:pointer;">
                            🌾 Secà
                        </button>
                    </div>
                    <div id="tractament-finques-checks" style="margin-top:4px;"></div>
                    <div style="background:#f5f5f5; padding:8px 12px; border-radius:6px; margin-top:8px; font-size:14px;">
                        Superfície total seleccionada: <strong><span id="superficie-total">0</span> Ha</strong>
                    </div>
                </div>

                <!-- LÍNIES DE PRODUCTE -->
                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <label style="margin:0;">Productes *</label>
                        <button type="button" class="btn btn-secondary" style="font-size:13px; padding:6px 12px;" onclick="afegirLiniaProducte()">
                            ➕ Afegir producte
                        </button>
                    </div>
                    <div id="linies-productes-container"></div>
                    <div id="data-limit-efectiva" style="display:none; background:#fff3e0; padding:8px 12px; border-radius:6px; margin-top:8px; font-size:14px;">
                        ⏰ Data límit efectiva (la més conservadora): <strong id="data-limit-efectiva-valor">—</strong>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-tractament')">Cancel·lar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>`;
}

function afegirLiniaProducte(dades) {
    // dades: { producte_id, fertilitzant_id, dosi, unitat, data_limit } (opcional, per edició)
    const container = document.getElementById('linies-productes-container');
    const idx = container.querySelectorAll('.linia-producte').length;
    const superficie = parseFloat(document.getElementById('superficie-total').textContent) || 0;

    // Fitosanitaris "de debò" (s'exclouen els marcats com a bioestimulant: es registren com a fertilitzant)
    const fitosanitarisOrdenats = (fitosanitaris || [])
        .filter(function(f) { return !f.es_bioestimulant; })
        .slice()
        .sort(function(a, b) { return (a.nom || '').localeCompare(b.nom || ''); });

    const fertilitzantsOrdenats = (fertilitzants || []).slice().sort(function(a, b) {
        return (a.nom || '').localeCompare(b.nom || '');
    });

    const valorActual = dades
        ? (dades.fertilitzant_id ? 'fert:' + dades.fertilitzant_id : (dades.producte_id ? 'fito:' + dades.producte_id : ''))
        : '';

    let optionsHtml = '<option value="">Seleccionar...</option>';
    optionsHtml += '<optgroup label="🧪 Fitosanitaris">';
    fitosanitarisOrdenats.forEach(function(f) {
        const valor = 'fito:' + f.id;
        const sel = valorActual === valor ? 'selected' : '';
        optionsHtml += '<option value="' + valor + '" ' + sel + '>' + f.nom + '</option>';
    });
    optionsHtml += '</optgroup>';
    optionsHtml += '<optgroup label="🌱 Fertilitzants / Bioestimulants">';
    fertilitzantsOrdenats.forEach(function(f) {
        const valor = 'fert:' + f.id;
        const sel = valorActual === valor ? 'selected' : '';
        optionsHtml += '<option value="' + valor + '" ' + sel + '>' + f.nom + '</option>';
    });
    optionsHtml += '</optgroup>';

    const unitatOpts = ['L/Ha', 'kg/Ha', 'g/Ha'].map(function(u) {
        return '<option value="' + u + '"' + (dades && dades.unitat === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('');

    const dosiVal = dades ? dades.dosi : '';
    const dataLimitVal = dades ? (dades.data_limit || '') : '';
    const plaguesVal = (dades && Array.isArray(dades.plagues)) ? qieEscapeHtml(dades.plagues.join(', ')) : '';

    const div = document.createElement('div');
    div.className = 'linia-producte';
    div.style.cssText = 'border:1px solid #e0e0e0; border-radius:8px; padding:12px; margin-bottom:8px; background:#fafafa; position:relative;';
    div.innerHTML = `
        <div style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr auto; gap:8px; align-items:end;">
            <div>
                <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Producte *</label>
                <div style="display:flex; gap:4px;">
                    <select class="lp-producte" onchange="actualitzarUnitatLinia(this); actualitzarDataLimitLinia(this)" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;">
                        ${optionsHtml}
                    </select>
                    <button type="button" title="Veure fitxa del producte" style="background:#e8f5e9; border:1px solid #c8e6c9; border-radius:4px; padding:6px 8px; cursor:pointer; font-size:14px; white-space:nowrap;"
                        onclick="veureFitxaProductePerSelect(this)">📋</button>
                </div>
            </div>
            <div>
                <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Dosi *</label>
                <input type="number" class="lp-dosi" value="${dosiVal}" min="0" step="0.001"
                    style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;"
                    onchange="actualitzarDataLimitEfectiva()">
            </div>
            <div>
                <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Unitat</label>
                <select class="lp-unitat" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                    ${unitatOpts}
                </select>
            </div>
            <div>
                <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Data Límit PLAC</label>
                <div style="display:flex; gap:4px;">
                    <input type="date" class="lp-data-limit" value="${dataLimitVal}"
                        style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;"
                        onchange="actualitzarDataLimitEfectiva()">
                    <button type="button" title="Calculadora" style="background:#fff; border:1px solid #ddd; border-radius:4px; padding:6px 8px; cursor:pointer; font-size:14px;"
                        onclick="obrirCalculadoraPerLinia(this)">🧮</button>
                </div>
            </div>
            <div>
                <button type="button" onclick="eliminarLiniaProducte(this)"
                    style="background:#ffebee; border:1px solid #ef9a9a; color:#c62828; border-radius:4px; padding:8px; cursor:pointer; font-size:14px; margin-top:18px;">🗑️</button>
            </div>
        </div>
        <div class="lp-motiu" style="margin-top:8px; display:none;">
            <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Motiu: plaga o malaltia (separades per comes)</label>
            <input type="text" class="lp-plagues" value="${plaguesVal}" placeholder="Ex: Monília, Pugó verd"
                style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>`;

    container.appendChild(div);
    // La unitat es deriva del producte (catàleg), no es tria
    actualitzarUnitatLinia(div.querySelector('.lp-producte'));
    if (dades && dades.unitat) {
        const uCat = unitatCatalegValor(div.querySelector('.lp-producte').value);
        if (uCat && _estocUnitatBase(dades.unitat).toLowerCase() !== uCat.toLowerCase()) {
            mostrarNotificacio('⚠️ La unitat guardada (' + dades.unitat + ') no coincideix amb el catàleg (' + uCat + '). Revisa la dosi.', 'warning');
        }
    }
    actualitzarDataLimitEfectiva();
}

// Unitat d'estoc del producte seleccionat ('fito:<id>' | 'fert:<id>') o null
function unitatCatalegValor(valor) {
    const [tipus, id] = (valor || '').split(':');
    if (!id) return null;
    const llista = tipus === 'fert' ? fertilitzants : fitosanitaris;
    const p = (llista || []).find(function(x) { return x.id === id; });
    return p ? (p.unitat_stock || 'L') : null;
}

// Fixa la unitat de la línia a <unitat_stock>/Ha (un únic valor possible)
function actualitzarUnitatLinia(selectProducte) {
    const linia = selectProducte.closest('.linia-producte');
    const sel = linia.querySelector('.lp-unitat');
    const u = unitatCatalegValor(selectProducte.value);
    sel.innerHTML = u
        ? '<option value="' + u + '/Ha">' + u + '/Ha</option>'
        : '<option value="">— tria producte —</option>';

    // El motiu (plaga) només aplica a fitosanitaris
    const motiu = linia.querySelector('.lp-motiu');
    if (motiu) motiu.style.display = (selectProducte.value || '').indexOf('fito:') === 0 ? 'block' : 'none';
    omplirPlaguesLinia(linia);
    actualitzarAvisosQIEForm();
}

function eliminarLiniaProducte(btn) {
    const linia = btn.closest('.linia-producte');
    if (document.querySelectorAll('.linia-producte').length <= 1) {
        mostrarNotificacio('Cal tenir almenys un producte', 'error');
        return;
    }
    linia.remove();
    actualitzarDataLimitEfectiva();
}

function actualitzarDataLimitLinia(selectProducte) {
    const linia = selectProducte.closest('.linia-producte');
    const [tipus, id] = (selectProducte.value || '').split(':');

    // El PLAC (termini de seguretat) només aplica a fitosanitaris
    if (tipus !== 'fito') return;

    const producte = (fitosanitaris || []).find(function(f) { return f.id === id; });
    if (!producte || !producte.plac) return;

    const dataInput = document.getElementById('tractament-data');
    if (!dataInput.value) return;

    const dataLimit = new Date(dataInput.value);
    dataLimit.setDate(dataLimit.getDate() + parseInt(producte.plac));
    const dataLimitStr = dataLimit.toISOString().split('T')[0];
    linia.querySelector('.lp-data-limit').value = dataLimitStr;
    actualitzarDataLimitEfectiva();
}

function actualitzarDataLimitEfectiva() {
    const dates = [];
    document.querySelectorAll('.lp-data-limit').forEach(function(inp) {
        if (inp.value) dates.push(inp.value);
    });

    const divEfectiva = document.getElementById('data-limit-efectiva');
    const spanEfectiva = document.getElementById('data-limit-efectiva-valor');

    if (dates.length) {
        dates.sort();
        divEfectiva.style.display = 'block';
        spanEfectiva.textContent = formatData(dates[0]);
    } else {
        divEfectiva.style.display = 'none';
    }
}

function obrirCalculadoraPerLinia(btn) {
    const superficie = parseFloat(document.getElementById('superficie-total').textContent) || 0;
    const linia = btn.closest('.linia-producte');
    const [tipus, id] = (linia.querySelector('.lp-producte').value || '').split(':');
    let producteNom = 'Producte no seleccionat';
    if (tipus === 'fito') {
        const p = (fitosanitaris || []).find(function(f) { return f.id === id; });
        if (p) producteNom = p.nom;
    } else if (tipus === 'fert') {
        const p = (fertilitzants || []).find(function(f) { return f.id === id; });
        if (p) producteNom = p.nom;
    }

    obrirCalculadoraTractament({
        superficie: superficie,
        producteNom: producteNom,
        unitat: unitatCatalegValor(linia.querySelector('.lp-producte').value),
        onConfirm: function(dosi, unitat) {
            linia.querySelector('.lp-dosi').value = dosi;
            const selectUnitat = linia.querySelector('.lp-unitat');
            if (selectUnitat) selectUnitat.value = unitat;
            actualitzarDataLimitLinia(linia.querySelector('.lp-producte'));
        }
    });
}

async function obrirModalTractament() {
    // Si el modal no és al DOM, injectar-lo (pot passar si la vista s'ha recarregat)
    if (!document.getElementById('modal-tractament')) {
        const div = document.createElement('div');
        div.innerHTML = crearModalTractamentV2();
        document.body.appendChild(div);
    }

    document.getElementById('modal-tractament-titol').textContent = 'Nou Tractament';
    const form = document.getElementById('form-tractament');
    form.reset();
    form.dataset.editMode = 'false';
    form.dataset.editGrup = '';

    const avui = dataLocalISO();
    document.getElementById('tractament-data').value = avui;

    // Reset tipus reg a regadiu i construir selector (res marcat per defecte)
    _tipusRegActual = 'regadiu';
    construirSelectorFinques(null, null);

    // Camps QIE: catàleg, RT candidates per a la data i res seleccionat
    _qieRTProductes = [];
    await omplirSelectsQIE();

    // Inicialitzar línies de producte
    document.getElementById('linies-productes-container').innerHTML = '';
    afegirLiniaProducte();

    const supEl = document.getElementById('superficie-total');
    if (supEl) supEl.textContent = '0';
    const dlEl = document.getElementById('data-limit-efectiva');
    if (dlEl) dlEl.style.display = 'none';

    document.getElementById('modal-tractament').style.display = 'block';
}

async function veureTractamentGrupV2(grupTractament) {
    const productes = await getProductesByGrup(grupTractament);
    const tractamentsGrup = (await supabaseClient
        .from('tractaments')
        .select('*, parcelles(nom, finca, varietat, cultiu, sigpac, superficie)')
        .eq('grup_tractament', grupTractament)
        .eq('estat', 'actiu')).data || [];

    if (!tractamentsGrup.length) return;
    const primer = tractamentsGrup[0];
    const superficieTotal = tractamentsGrup.reduce(function(s, t) { return s + (parseFloat(t.superficie_tractada) || 0); }, 0);

    const dataLimitEfectiva = productes.reduce(function(min, p) {
        if (!p.data_limit) return min;
        return !min || p.data_limit < min ? p.data_limit : min;
    }, null);

    let htmlProductes = '';
    if (productes.length) {
        htmlProductes = '<table class="data-table" style="margin-top:8px;"><thead><tr><th>Producte</th><th>Dosi</th><th>Unitat</th><th>Qtitat Total</th><th>Data Límit</th><th></th></tr></thead><tbody>';
        productes.forEach(function(p) {
            const esFertilitzant = !!p.fertilitzant_id;
            const nom = p.fitosanitaris ? p.fitosanitaris.nom : (p.fertilitzants ? p.fertilitzants.nom : '—');
            const producteId = p.producte_id || p.fertilitzant_id || '';
            const quantitatTotal = (parseFloat(p.dosi) || 0) * superficieTotal;
            const unitatBase = (p.unitat || '').split('/')[0];
            const etiquetaTipus = esFertilitzant
                ? ' <span style="background:#e8f5e9;color:#2e7d32;padding:1px 6px;border-radius:8px;font-size:10px;">🌱 Fertilitzant</span>'
                : '';
            const botoFitxa = producteId
                ? '<button class="btn btn-sm" style="background:#e8f5e9;border:1px solid #c8e6c9;color:#2e7d32;padding:3px 8px;font-size:12px;" onclick="' +
                    (esFertilitzant ? 'veureFitxaFertilitzant' : 'veureFitxaFitosanitari') + '(\'' + producteId + '\')">📋 Fitxa</button>'
                : '';
            htmlProductes += '<tr><td><strong>' + nom + '</strong>' + etiquetaTipus + '</td><td>' + p.dosi + '</td><td>' + p.unitat + '</td><td><strong>' + quantitatTotal.toFixed(2) + ' ' + unitatBase + '</strong></td><td>' + (p.data_limit ? formatData(p.data_limit) : '—') + '</td><td>' + botoFitxa + '</td></tr>';
        });
        htmlProductes += '</tbody></table>';
    } else {
        htmlProductes = '<p style="color:#999;">Sense productes assignats</p>';
    }

    const html = `
    <div id="modal-veure-tractament" class="modal" style="display:block;">
        <div class="modal-content" style="max-width:700px;">
            <span class="close" onclick="tancarModal('modal-veure-tractament')">&times;</span>
            <h2>📋 Detall Tractament</h2>
            <div style="background:#f5f5f5; padding:15px; border-radius:8px; margin-bottom:16px;">
                <div><strong>📅 Data:</strong> ${formatData(primer.data)}</div>
                <div><strong>📏 Superfície total:</strong> ${superficieTotal.toFixed(2)} Ha (${tractamentsGrup.length} parcel·les)</div>
                ${primer.operador ? '<div><strong>👤 Operador:</strong> ' + primer.operador + '</div>' : ''}
                ${primer.maquinaria ? '<div><strong>🚜 Maquinària:</strong> ' + primer.maquinaria + '</div>' : ''}
                ${primer.condicions_meteo ? '<div><strong>🌤️ Meteo:</strong> ' + primer.condicions_meteo + '</div>' : ''}
                ${dataLimitEfectiva ? '<div><strong>⏰ Data límit efectiva:</strong> ' + formatData(dataLimitEfectiva) + '</div>' : ''}
            </div>
            <h3>🧪 Productes aplicats (${productes.length})</h3>
            ${htmlProductes}
            <h3 style="margin-top:16px;">🗺️ Parcel·les tractades</h3>
            <div class="table-container">
                <table class="data-table"><thead><tr><th>Finca / Varietat</th><th>SIGPAC</th><th>Sup. (Ha)</th></tr></thead><tbody>
                ${tractamentsGrup.map(function(t) {
                    const p = t.parcelles || {};
                    const finca = p.finca || 'Sense finca';
                    const varietat = p.varietat || '';
                    const nomMostrar = finca + (varietat ? ' - ' + varietat : '');
                    const sigpac = p.sigpac || '—';
                    return '<tr><td>' + nomMostrar + '</td><td style="font-size:12px;color:#666;">' + sigpac + '</td><td>' + t.superficie_tractada + '</td></tr>';
                }).join('')}
                </tbody></table>
            </div>
            <div class="form-actions" style="margin-top:16px;">
                <button class="btn btn-primary" onclick="tancarModal('modal-veure-tractament')">Tancar</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}

async function editarTractamentGrupV2(grupTractament) {
    // Carregar dades existents
    const { data: tractamentsGrup } = await supabaseClient
        .from('tractaments')
        .select('*, parcelles(finca, varietat)')
        .eq('grup_tractament', grupTractament)
        .eq('estat', 'actiu');

    if (!tractamentsGrup || !tractamentsGrup.length) return;

    const productes = await getProductesByGrup(grupTractament);
    const primer = tractamentsGrup[0];

    if (primer.qie_enviat_at && !confirm('Aquest tractament JA S\'HA ENVIAT a la gestoria (' +
        String(primer.qie_enviat_at).slice(0, 10) + ').\n\nSi el guardes, l\'enviat quedarà anul·lat i el nou sortirà a l\'extracte, amb una rectificació. Continuar?')) {
        return;
    }

    await obrirModalTractament();

    document.getElementById('modal-tractament-titol').textContent = 'Editar Tractament';
    const form = document.getElementById('form-tractament');
    form.dataset.editMode = 'true';
    form.dataset.editGrup = grupTractament;

    // Omplir capçalera
    document.getElementById('tractament-data').value = primer.data;
    document.getElementById('tractament-operador').value = primer.operador || '';
    document.getElementById('tractament-maquinaria').value = primer.maquinaria || '';
    document.getElementById('tractament-meteo').value = primer.condicions_meteo || '';
    document.getElementById('tractament-observacions').value = primer.observacions || '';

    // Dades QIE: es recarrega la llista de RT per a la data del tractament i es restauren els valors
    await carregarRTsPerData(primer.recomanacio_rt_id || '');
    const posarValor = function(id, v) { const el = document.getElementById(id); if (el) el.value = (v === null || v === undefined) ? '' : v; };
    posarValor('tractament-rt', primer.recomanacio_rt_id);
    posarValor('tractament-assessor', primer.assessor_id);
    posarValor('tractament-aplicador', primer.aplicador_id);
    posarValor('tractament-equip', primer.equip_id);
    posarValor('tractament-caldo', primer.volum_caldo_lha);
    posarValor('tractament-justificacio', primer.justificacio);
    if (primer.recomanacio_rt_id) await carregarProductesRT(primer.recomanacio_rt_id);

    // Reconstruir selector amb preselecció de finca+varietat usades
    const finquesUsades = [...new Set(tractamentsGrup.map(function(t) {
        return t.parcelles ? t.parcelles.finca : null;
    }).filter(Boolean))];
    const varietatsUsades = tractamentsGrup.map(function(t) {
        return { finca: t.parcelles ? t.parcelles.finca : null, varietat: t.parcelles ? t.parcelles.varietat : null };
    }).filter(function(v) { return v.finca && v.varietat; });

    // Detectar tipus de reg de les parcel·les del tractament (la primera és suficient)
    const primeraParcella = (parcelles || []).find(function(p) {
        return tractamentsGrup[0].parcella_id === p.id;
    });
    _tipusRegActual = (primeraParcella && primeraParcella.regadiu === false) ? 'seca' : 'regadiu';
    // Actualitzar estil botons toggle sense reconstruir el selector
    actualitzarEstilToggleReg();
    construirSelectorFinques(finquesUsades, varietatsUsades);

    // Carregar productes
    const container = document.getElementById('linies-productes-container');
    container.innerHTML = '';
    if (productes.length) {
        productes.forEach(function(p) {
            afegirLiniaProducte({
                producte_id: p.producte_id,
                fertilitzant_id: p.fertilitzant_id,
                dosi: p.dosi,
                unitat: p.unitat,
                data_limit: p.data_limit,
                plagues: p.plagues
            });
        });
    } else {
        afegirLiniaProducte();
    }

    actualitzarDataLimitEfectiva();
    actualitzarAvisosQIEForm();
}

// ============================================================
// QIE — camps del formulari, indicador a la taula i gestió de catàlegs
// ============================================================

var _qieRTs = [];            // RT candidates per a la data del tractament
var _qieRTProductes = [];    // productes (i plagues) de la RT seleccionada

// Indicador «QIE» a la columna de data de la taula de tractaments
function badgeQIETractament(g) {
    if (!hasPermission('update') || !qieCataleg.carregat) return '';
    const m = mancancesQIETractament(g.tractaments, g.productes);
    if (m === null) return '';
    const enviat = g.tractaments[0] && g.tractaments[0].qie_enviat_at;
    if (!m.length) {
        return '<br><span style="font-size:11px; color:#2e7d32;">✔ QIE' +
            (enviat ? ' · 📤 enviat ' + formatData(String(enviat).slice(0, 10)) : '') + '</span>';
    }
    return '<br><span title="' + qieEscapeHtml('Falta:\n• ' + m.join('\n• ')) + '" ' +
        'style="font-size:11px; background:#fff3cd; color:#8a6d3b; padding:2px 6px; border-radius:10px; cursor:help;">⚠ QIE (' + m.length + ')</span>';
}

async function omplirSelectsQIE() {
    try {
        await carregarCatalegQIE(true);
    } catch (e) {
        console.warn('Catàleg QIE no disponible:', e.message);
        return;
    }
    const cat = qieCataleg;

    const selAp = document.getElementById('tractament-aplicador');
    if (selAp) {
        selAp.innerHTML = '<option value="">— Seleccionar —</option>' +
            cat.aplicadors.filter(function(a) { return a.actiu !== false; }).map(function(a) {
                const nom = (a.treballadors && a.treballadors.nom) || 'Aplicador';
                return '<option value="' + a.id + '">' + qieEscapeHtml(nom + (a.ropo ? '' : ' (sense ROPO)')) + '</option>';
            }).join('');
    }

    const selEq = document.getElementById('tractament-equip');
    if (selEq) {
        const equips = cat.equips.slice().sort(function(a, b) {
            const ra = a.roma_num_inscripcio ? 0 : 1, rb = b.roma_num_inscripcio ? 0 : 1;
            if (ra !== rb) return ra - rb;
            return nomEquipQIE(a).localeCompare(nomEquipQIE(b));
        });
        selEq.innerHTML = '<option value="">— Seleccionar —</option>' + equips.map(function(m) {
            return '<option value="' + m.id + '">' + qieEscapeHtml(nomEquipQIE(m) + (m.roma_num_inscripcio ? ' · ROMA ' + m.roma_num_inscripcio : ' · sense ROMA')) + '</option>';
        }).join('');
    }

    const selAs = document.getElementById('tractament-assessor');
    if (selAs) {
        selAs.innerHTML = '<option value="">— Seleccionar —</option>' +
            cat.assessors.filter(function(a) { return a.actiu !== false; }).map(function(a) {
                return '<option value="' + a.id + '">' + qieEscapeHtml(a.nom) + '</option>';
            }).join('');
    }

    await carregarRTsPerData();
}

// Llista les RT que cobreixen la data del tractament (o la RT ja assignada, en edició)
async function carregarRTsPerData(rtSeleccionat) {
    const sel = document.getElementById('tractament-rt');
    const dataEl = document.getElementById('tractament-data');
    if (!sel || !dataEl || !dataEl.value) return;

    const actual = rtSeleccionat || sel.value || '';
    const data = dataEl.value;
    const columnes = 'id, codi_rt, data_recomanacio, periode_inici, periode_fi, tecnic, caldo_lha, assessor_id';

    const d = new Date(data + 'T00:00:00');
    d.setDate(d.getDate() - 120);
    const r = await supabaseClient.from('recomanacions_rt')
        .select(columnes)
        .gte('data_recomanacio', dataLocalISO(d))
        .order('data_recomanacio', { ascending: false })
        .limit(200);
    if (r.error) { console.warn('RT no disponibles:', r.error.message); return; }

    const rts = (r.data || []).filter(function(x) {
        if (x.periode_inici && x.periode_fi) return data >= x.periode_inici && data <= x.periode_fi;
        return x.data_recomanacio <= data;
    });

    if (actual && !rts.some(function(x) { return x.id === actual; })) {
        const ra = await supabaseClient.from('recomanacions_rt').select(columnes).eq('id', actual).maybeSingle();
        if (ra.data) rts.unshift(ra.data);
    }

    _qieRTs = rts;
    sel.innerHTML = '<option value="">— Sense RT —</option>' + rts.map(function(x) {
        const etiqueta = (x.codi_rt || 'RT') + ' · ' + formatData(x.data_recomanacio) + (x.tecnic ? ' · ' + x.tecnic : '');
        return '<option value="' + x.id + '">' + qieEscapeHtml(etiqueta) + '</option>';
    }).join('');
    sel.value = actual;
}

async function carregarProductesRT(rtId) {
    _qieRTProductes = [];
    if (!rtId) return;
    const rp = await supabaseClient.from('recomanacions_rt_productes')
        .select('producte_id, plagues')
        .eq('recomanacio_id', rtId);
    if (!rp.error) _qieRTProductes = rp.data || [];
}

// En triar una RT: hereta assessor, volum de caldo i plagues dels productes coincidents
async function aplicarRTATractament() {
    const rtId = document.getElementById('tractament-rt').value;
    if (!rtId) {
        _qieRTProductes = [];
        actualitzarAvisosQIEForm();
        return;
    }
    const rt = _qieRTs.find(function(x) { return x.id === rtId; });
    if (rt) {
        if (rt.assessor_id) document.getElementById('tractament-assessor').value = rt.assessor_id;
        const caldo = document.getElementById('tractament-caldo');
        if (caldo && !caldo.value && rt.caldo_lha) caldo.value = rt.caldo_lha;
    }
    await carregarProductesRT(rtId);
    document.querySelectorAll('#modal-tractament .linia-producte').forEach(function(l) { omplirPlaguesLinia(l); });
    actualitzarAvisosQIEForm();
}

// Omple les plagues d'una línia amb les de la RT (si el producte hi és i el camp és buit)
function omplirPlaguesLinia(linia) {
    const sel = linia.querySelector('.lp-producte');
    const inp = linia.querySelector('.lp-plagues');
    if (!sel || !inp || (sel.value || '').indexOf('fito:') !== 0) return;
    const id = sel.value.split(':')[1];
    const rp = (_qieRTProductes || []).find(function(p) { return p.producte_id === id; });
    if (rp && Array.isArray(rp.plagues) && rp.plagues.length && !inp.value.trim()) {
        inp.value = rp.plagues.join(', ');
    }
}

// Avisa si algun fitosanitari del formulari no és a la RT seleccionada
function actualitzarAvisosQIEForm() {
    const el = document.getElementById('qie-avis-form');
    if (!el) return;
    const rt = document.getElementById('tractament-rt');
    const msgs = [];
    if (rt && rt.value && _qieRTProductes.length) {
        document.querySelectorAll('#modal-tractament .linia-producte').forEach(function(l) {
            const sel = l.querySelector('.lp-producte');
            if (!sel || (sel.value || '').indexOf('fito:') !== 0) return;
            const id = sel.value.split(':')[1];
            if (!_qieRTProductes.some(function(p) { return p.producte_id === id; })) {
                const f = (fitosanitaris || []).find(function(x) { return x.id === id; });
                msgs.push('⚠️ ' + (f ? f.nom : 'Un producte') + ' no és a la RT seleccionada');
            }
        });
    }
    el.innerHTML = msgs.map(qieEscapeHtml).join('<br>');
}

function aplicadorSeleccionat() {
    const id = document.getElementById('tractament-aplicador').value;
    const a = qieCataleg.aplicadors.find(function(x) { return x.id === id; });
    const op = document.getElementById('tractament-operador');
    if (a && op && !op.value.trim()) op.value = (a.treballadors && a.treballadors.nom) || '';
}

function equipSeleccionat() {
    const id = document.getElementById('tractament-equip').value;
    const m = qieCataleg.equips.find(function(x) { return x.id === id; });
    const mq = document.getElementById('tractament-maquinaria');
    if (m && mq && !mq.value.trim()) mq.value = nomEquipQIE(m);
}

// ------------------------------------------------------------
// Extracte mensual QIE per a la gestoria
// ------------------------------------------------------------

var _qieExtracteActual = null;

function obrirModalExtracteQIE() {
    if (!hasPermission('update')) {
        mostrarNotificacio('No tens permisos per generar l\'extracte QIE', 'error');
        return;
    }
    const antic = document.getElementById('modal-extracte-qie');
    if (antic) antic.remove();
    _qieExtracteActual = null;

    // Per defecte, el mes anterior (el que toca enviar) durant els primers 10 dies del mes
    const avui = new Date();
    const ref = avui.getDate() <= 10 ? new Date(avui.getFullYear(), avui.getMonth() - 1, 1) : avui;
    const mesDefecte = ref.getFullYear() + '-' + String(ref.getMonth() + 1).padStart(2, '0');

    document.body.insertAdjacentHTML('beforeend',
        '<div id="modal-extracte-qie" class="modal" style="display:block;">' +
        '<div class="modal-content" style="max-width:760px;">' +
        '<span class="close" onclick="tancarModal(\'modal-extracte-qie\')">&times;</span>' +
        '<h2>📤 Extracte QIE per a la gestoria</h2>' +
        '<p style="font-size:13px; color:#666;">Inclou els tractaments fitosanitaris <strong>actius, complets i no enviats</strong> fins a l\'últim dia del mes triat, més les rectificacions dels ja enviats que s\'han anul·lat. Els tractaments anteriors a l\'1/1/2027 no hi surten.</p>' +
        '<div style="display:flex; gap:12px; align-items:flex-end; margin:12px 0;">' +
        '<div><label style="display:block; font-size:12px; margin-bottom:4px;">Fins al mes</label>' +
        '<input type="month" id="qie-extracte-mes" value="' + mesDefecte + '" style="padding:8px; border:1px solid #ddd; border-radius:4px;"></div>' +
        '<button class="btn btn-primary" onclick="prepararExtracteQIEUI()">🔍 Preparar</button>' +
        '</div>' +
        '<div id="qie-extracte-resum"></div>' +
        '</div></div>');
}

async function prepararExtracteQIEUI() {
    const mes = (document.getElementById('qie-extracte-mes') || {}).value;
    const cos = document.getElementById('qie-extracte-resum');
    if (!mes || !cos) return;
    cos.innerHTML = '<p>⏳ Preparant l\'extracte...</p>';
    try {
        _qieExtracteActual = await preparaExtracteQIE(mes);
    } catch (e) {
        console.error('Extracte QIE:', e);
        cos.innerHTML = '<p style="color:red;">Error: ' + qieEscapeHtml(e.message) + '</p>';
        return;
    }
    const ext = _qieExtracteActual;

    let html = '<div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px;">';
    html += '<div style="background:#d4edda; padding:10px 16px; border-radius:6px;"><strong>' + ext.grupsComplets.length + '</strong> tractaments complets · ' + ext.linies.length + ' línies</div>';
    html += '<div style="background:' + (ext.incomplets.length ? '#fff3cd' : '#f1f1f1') + '; padding:10px 16px; border-radius:6px;">⚠️ <strong>' + ext.incomplets.length + '</strong> incomplets (no inclosos)</div>';
    html += '<div style="background:' + (ext.rectificacions.length ? '#ffe0e0' : '#f1f1f1') + '; padding:10px 16px; border-radius:6px;">↩️ <strong>' + ext.rectificacions.length + '</strong> rectificacions</div>';
    html += '</div>';

    if (ext.incomplets.length) {
        html += '<div style="background:#fff8e1; border-radius:6px; padding:10px 12px; margin-bottom:12px; font-size:12px; max-height:180px; overflow:auto;">';
        html += '<strong>Incomplets:</strong><br>';
        ext.incomplets.slice(0, 30).forEach(function(i) {
            html += qieEscapeHtml(formatData(i.data) + ' — ' + i.productes + ': falta ' + i.mancances.join(', ')) + '<br>';
        });
        if (ext.incomplets.length > 30) html += '… i ' + (ext.incomplets.length - 30) + ' més (a la pestanya «Incomplets» de l\'Excel)';
        html += '</div>';
    }

    const res = ext.grupsComplets.length + ext.rectificacions.length;
    html += '<div style="display:flex; gap:10px; justify-content:flex-end; flex-wrap:wrap;">';
    html += '<button class="btn btn-secondary" id="btn-qie-descarregar" onclick="descarregarExtracteQIEUI()"' + (res || ext.incomplets.length ? '' : ' disabled') + '>⬇️ Descarregar Excel</button>';
    html += '<button class="btn btn-success" id="btn-qie-marcar" onclick="marcarExtracteQIEEnviatUI()" disabled>✅ Marcar com a enviat</button>';
    html += '</div>';
    html += '<p style="font-size:12px; color:#666; margin-top:8px;">«Marcar com a enviat» s\'activa en descarregar l\'Excel. Fes-ho només quan ja l\'hagis enviat a la gestoria: els tractaments marcats no tornaran a sortir als extractes.</p>';
    cos.innerHTML = html;
}

function descarregarExtracteQIEUI() {
    if (!_qieExtracteActual) return;
    try {
        descarregarExtracteQIE(_qieExtracteActual);
        const btn = document.getElementById('btn-qie-marcar');
        if (btn && (_qieExtracteActual.grupsComplets.length || _qieExtracteActual.rectificacions.length)) btn.disabled = false;
        mostrarNotificacio('✅ Excel descarregat', 'success');
    } catch (e) {
        console.error(e);
        mostrarNotificacio('Error generant l\'Excel: ' + e.message, 'error');
    }
}

async function marcarExtracteQIEEnviatUI() {
    const ext = _qieExtracteActual;
    if (!ext || !ext.descarregat) return;
    if (!confirm('Marcar com a ENVIATS ' + ext.grupsComplets.length + ' tractaments i ' + ext.rectificacions.length +
        ' rectificacions?\n\nNo tornaran a sortir als extractes. Fes-ho només si l\'Excel ja és a la gestoria.')) return;
    try {
        await marcarExtracteQIEEnviat(ext);
        mostrarNotificacio('✅ Enviament registrat', 'success');
        _qieExtracteActual = null;
        tancarModal('modal-extracte-qie');
        if (document.getElementById('tbody-tractaments')) carregarTaulaTractaments();
    } catch (e) {
        console.error(e);
        mostrarNotificacio('Error registrant l\'enviament: ' + e.message, 'error');
    }
}

// ------------------------------------------------------------
// Gestió de catàlegs: assessors i aplicadors (NIF, ROPO)
// El ROMA dels equips s'edita a Gestió → Immobilitzat.
// ------------------------------------------------------------

async function obrirModalDadesQIE() {
    if (!hasPermission('update')) {
        mostrarNotificacio('No tens permisos per gestionar les dades QIE', 'error');
        return;
    }
    const antic = document.getElementById('modal-dades-qie');
    if (antic) antic.remove();
    document.body.insertAdjacentHTML('beforeend',
        '<div id="modal-dades-qie" class="modal" style="display:block;">' +
        '<div class="modal-content" style="max-width:920px;">' +
        '<span class="close" onclick="tancarModal(\'modal-dades-qie\')">&times;</span>' +
        '<h2>⚙️ Dades QIE</h2><div id="dades-qie-cos">Carregant...</div>' +
        '</div></div>');
    await renderDadesQIE();
}

async function renderDadesQIE() {
    const cos = document.getElementById('dades-qie-cos');
    if (!cos) return;
    try {
        await carregarCatalegQIE(true);
        if (!treballadors || !treballadors.length) treballadors = await getTreballadors();
    } catch (e) {
        cos.innerHTML = '<p style="color:red;">Error carregant dades: ' + qieEscapeHtml(e.message) + '</p>';
        return;
    }
    const cat = qieCataleg;
    const est = 'style="width:100%; padding:6px; border:1px solid #ddd; border-radius:4px;"';

    let html = '<p style="font-size:13px; color:#666;">Dades que el QIE exigeix per a cada tractament. Es poden deixar buides i completar-les quan es tinguin: els tractaments mostraran «⚠ QIE» fins que no hi siguin.</p>';

    // --- Assessors
    html += '<h3>🧑‍🔬 Assessors</h3>';
    html += '<table class="data-table"><thead><tr><th>Nom</th><th style="width:160px;">NIF</th><th style="width:160px;">ROPO</th><th style="width:60px;"></th></tr></thead><tbody>';
    cat.assessors.concat([null]).forEach(function(a) {
        const id = a ? a.id : 'nou';
        html += '<tr>' +
            '<td><input id="qie-as-nom-' + id + '" value="' + qieEscapeHtml(a ? a.nom : '') + '" placeholder="' + (a ? '' : 'Nou assessor: nom i cognoms') + '" ' + est + '></td>' +
            '<td><input id="qie-as-nif-' + id + '" value="' + qieEscapeHtml(a && a.nif) + '" ' + est + '></td>' +
            '<td><input id="qie-as-ropo-' + id + '" value="' + qieEscapeHtml(a && a.ropo) + '" ' + est + '></td>' +
            '<td><button class="btn btn-sm btn-primary" title="Guardar" onclick="guardarAssessorQIE(\'' + id + '\')">💾</button></td>' +
            '</tr>';
    });
    html += '</tbody></table>';

    // --- Aplicadors
    const jaAplicadors = new Set(cat.aplicadors.map(function(a) { return a.treballador_id; }));
    const candidats = (treballadors || []).filter(function(t) { return t.actiu !== false && !t.eliminat && !jaAplicadors.has(t.id); });
    html += '<h3 style="margin-top:24px;">🧑‍🌾 Aplicadors (carnet d\'aplicador)</h3>';
    html += '<table class="data-table"><thead><tr><th>Treballador</th><th style="width:140px;">NIF</th><th style="width:140px;">ROPO</th><th style="width:150px;">Caducitat</th><th style="width:60px;"></th></tr></thead><tbody>';
    cat.aplicadors.forEach(function(a) {
        html += '<tr>' +
            '<td><strong>' + qieEscapeHtml((a.treballadors && a.treballadors.nom) || '—') + '</strong></td>' +
            '<td><input id="qie-ap-nif-' + a.id + '" value="' + qieEscapeHtml(a.nif) + '" ' + est + '></td>' +
            '<td><input id="qie-ap-ropo-' + a.id + '" value="' + qieEscapeHtml(a.ropo) + '" ' + est + '></td>' +
            '<td><input type="date" id="qie-ap-cad-' + a.id + '" value="' + qieEscapeHtml(a.ropo_caducitat) + '" ' + est + '></td>' +
            '<td><button class="btn btn-sm btn-primary" title="Guardar" onclick="guardarAplicadorQIE(\'' + a.id + '\')">💾</button></td>' +
            '</tr>';
    });
    html += '<tr>' +
        '<td><select id="qie-ap-treb-nou" ' + est + '><option value="">Afegir treballador...</option>' +
        candidats.map(function(t) { return '<option value="' + t.id + '">' + qieEscapeHtml(t.nom) + '</option>'; }).join('') +
        '</select></td>' +
        '<td><input id="qie-ap-nif-nou" ' + est + '></td>' +
        '<td><input id="qie-ap-ropo-nou" ' + est + '></td>' +
        '<td><input type="date" id="qie-ap-cad-nou" ' + est + '></td>' +
        '<td><button class="btn btn-sm btn-primary" title="Afegir" onclick="guardarAplicadorQIE(\'nou\')">💾</button></td>' +
        '</tr></tbody></table>';

    // --- Equips (només informació: s'editen a Immobilitzat)
    const equipsRellevants = cat.equips.filter(function(m) {
        return m.roma_num_inscripcio || /tractor|atomitz|pulveritz|polvoritz|maquinaria|turbo/i.test(String(m.tipus || '') + ' ' + String(m['descripció'] || ''));
    });
    html += '<h3 style="margin-top:24px;">🚜 Equips d\'aplicació</h3>';
    html += '<p style="font-size:12px; color:#666;">El número ROMA s\'edita a <strong>Gestió → Immobilitzat</strong>. Aquí només es mostra què hi ha informat.</p>';
    if (!equipsRellevants.length) {
        html += '<p style="color:#999;">No s\'ha trobat cap tractor ni atomitzador a l\'immobilitzat.</p>';
    } else {
        html += '<table class="data-table"><thead><tr><th>Equip</th><th>Tipus</th><th>ROMA</th></tr></thead><tbody>';
        equipsRellevants.forEach(function(m) {
            html += '<tr><td>' + qieEscapeHtml(nomEquipQIE(m)) + '</td><td>' + qieEscapeHtml(m.tipus || '—') + '</td><td>' +
                (m.roma_num_inscripcio ? qieEscapeHtml(m.roma_num_inscripcio) : '<span style="color:#c77;">sense ROMA</span>') + '</td></tr>';
        });
        html += '</tbody></table>';
    }

    cos.innerHTML = html;
}

function valorCampQIE(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

async function guardarAssessorQIE(id) {
    const nom = valorCampQIE('qie-as-nom-' + id);
    if (!nom) { mostrarNotificacio('Cal indicar el nom de l\'assessor', 'error'); return; }
    const dades = {
        nom: nom,
        nif: valorCampQIE('qie-as-nif-' + id).toUpperCase() || null,
        ropo: valorCampQIE('qie-as-ropo-' + id).toUpperCase() || null
    };
    const r = id === 'nou'
        ? await supabaseClient.from('assessors').insert([dades])
        : await supabaseClient.from('assessors').update(dades).eq('id', id);
    if (r.error) { mostrarNotificacio('Error: ' + r.error.message, 'error'); return; }
    mostrarNotificacio('Assessor guardat', 'success');
    await renderDadesQIE();
    if (document.getElementById('tbody-tractaments')) carregarTaulaTractaments();
}

async function guardarAplicadorQIE(id) {
    const dades = {
        nif: valorCampQIE('qie-ap-nif-' + id).toUpperCase() || null,
        ropo: valorCampQIE('qie-ap-ropo-' + id).toUpperCase() || null,
        ropo_caducitat: valorCampQIE('qie-ap-cad-' + id) || null
    };
    let r;
    if (id === 'nou') {
        const trebId = valorCampQIE('qie-ap-treb-nou');
        if (!trebId) { mostrarNotificacio('Cal triar un treballador', 'error'); return; }
        dades.treballador_id = trebId;
        r = await supabaseClient.from('aplicadors').insert([dades]);
    } else {
        r = await supabaseClient.from('aplicadors').update(dades).eq('id', id);
    }
    if (r.error) { mostrarNotificacio('Error: ' + r.error.message, 'error'); return; }
    mostrarNotificacio('Aplicador guardat', 'success');
    await renderDadesQIE();
    if (document.getElementById('tbody-tractaments')) carregarTaulaTractaments();
}

// ============================================================
// Registre de tractaments fitosanitaris (abans «DAN») per any natural, nova arquitectura
// ============================================================

async function generarDAN() {
    const any = document.getElementById('informe-dan-any').value;
    const container = document.getElementById('taula-dan');
    container.innerHTML = '<p>Carregant...</p>';

    try {
        const { data, error } = await supabaseClient
            .from('tractaments_complet')
            .select('*')
            .eq('estat', 'actiu')
            .gte('data', any + '-01-01')
            .lte('data', any + '-12-31')
            .order('data');
        if (error) throw error;

        const registres = data || [];
        if (!registres.length) {
            container.innerHTML = '<p style="color:#999;">No hi ha tractaments per aquest any</p>';
            return;
        }

        // Expandir: una fila per parcel·la × producte
        const files = [];
        registres.forEach(function(t) {
            const p = parcelles.find(function(pa) { return pa.id === t.parcella_id; });
            const productes = t.productes || [];
            if (!productes.length) {
                files.push({ tractament: t, parcella: p, producte: null });
            } else {
                productes.forEach(function(prod) {
                    files.push({ tractament: t, parcella: p, producte: prod });
                });
            }
        });

        let html = '<div class="table-container"><table class="data-table"><thead><tr>';
        html += '<th>Data</th><th>Finca</th><th>Parcel·la</th><th>SIGPAC</th><th>Cultiu</th><th>Varietat</th>';
        html += '<th>Sup. (Ha)</th><th>Producte</th><th>Nº Registre</th><th>Matèria Activa</th>';
        html += '<th>Tipus</th><th>Dosi</th><th>Unitat</th><th>Qtitat Total</th>';
        html += '<th>Data Límit</th><th>Operador</th><th>Maquinària</th>';
        html += '</tr></thead><tbody>';

        let totalSup = 0;
        let senseRegistre = 0;

        files.forEach(function(f) {
            const t = f.tractament;
            const p = f.parcella;
            const prod = f.producte;
            const sup = parseFloat(t.superficie_tractada) || 0;
            const dosi = prod ? parseFloat(prod.dosi) || 0 : 0;
            const quantitatTotal = dosi * sup;
            const registreStyle = prod && !prod.registre ? 'color:red;font-weight:bold;' : '';

            totalSup += sup;
            if (prod && !prod.registre) senseRegistre++;

            html += '<tr>';
            html += '<td>' + formatData(t.data) + '</td>';
            html += '<td>' + (p ? p.finca || '-' : '-') + '</td>';
            html += '<td>' + (p ? p.nom || '-' : '-') + '</td>';
            html += '<td>' + (p ? p.sigpac || '-' : '-') + '</td>';
            html += '<td>' + (t.cultiu_aplicat || (p ? p.cultiu || '-' : '-')) + '</td>';
            html += '<td>' + (t.cultiu_aplicat ? (t.varietat_aplicada || '-') : (p ? p.varietat || '-' : '-')) + '</td>';
            html += '<td>' + sup.toFixed(2) + '</td>';
            html += '<td>' + (prod ? prod.nom || '-' : '<span style="color:#999;">Pendent</span>') + '</td>';
            html += '<td style="' + registreStyle + '">' + (prod ? prod.registre || '⚠️ Pendent' : '-') + '</td>';
            html += '<td>' + (prod ? prod.materia_activa || '-' : '-') + '</td>';
            html += '<td>' + (prod ? prod.tipus || '-' : '-') + '</td>';
            html += '<td>' + (prod ? prod.dosi : '-') + '</td>';
            html += '<td>' + (prod ? prod.unitat || '-' : '-') + '</td>';
            html += '<td>' + (prod ? quantitatTotal.toFixed(2) : '-') + '</td>';
            html += '<td>' + (prod && prod.data_limit ? formatData(prod.data_limit) : '-') + '</td>';
            html += '<td>' + (t.operador || '-') + '</td>';
            html += '<td>' + (t.maquinaria || '-') + '</td>';
            html += '</tr>';
        });

        html += '<tr style="background:#e8f5e9;font-weight:bold;">';
        html += '<td colspan="6"><strong>TOTALS</strong></td>';
        html += '<td>' + totalSup.toFixed(2) + '</td>';
        html += '<td colspan="10"></td>';
        html += '</tr>';
        html += '</tbody></table></div>';

        if (senseRegistre > 0) {
            html += '<p style="color:red;font-weight:bold;">⚠️ ' + senseRegistre + ' registre/s sense nº de registre MAPA</p>';
        }
        html += '<p style="color:#999;font-size:12px;margin-top:8px;">' + files.length + ' files — Any ' + any + '</p>';
        container.innerHTML = html;

    } catch (error) {
        container.innerHTML = '<p style="color:red;">Error: ' + error.message + '</p>';
    }
}

async function exportarDANCSV() {
    const any = document.getElementById('informe-dan-any').value;

    const { data, error } = await supabaseClient
        .from('tractaments_complet')
        .select('*')
        .eq('estat', 'actiu')
        .gte('data', any + '-01-01')
        .lte('data', any + '-12-31')
        .order('data');
    if (error) { mostrarNotificacio('Error: ' + error.message, 'error'); return; }

    const registres = data || [];
    if (!registres.length) { mostrarNotificacio('No hi ha dades per exportar', 'error'); return; }

    let csv = 'Data;Finca;Parcel·la;SIGPAC;Cultiu;Varietat;Superfície (Ha);Producte;Nº Registre MAPA;Matèria Activa;Tipus;Dosi;Unitat;Quantitat Total;Data Límit PLAC;Operador;Maquinària\n';

    registres.forEach(function(t) {
        const p = parcelles.find(function(pa) { return pa.id === t.parcella_id; });
        const productes = t.productes || [null];
        const sup = parseFloat(t.superficie_tractada) || 0;

        productes.forEach(function(prod) {
            const dosi = prod ? parseFloat(prod.dosi) || 0 : 0;
            csv += [
                t.data,
                p ? (p.finca || '') : '',
                p ? (p.nom || '') : '',
                p ? (p.sigpac || '') : '',
                t.cultiu_aplicat || (p ? (p.cultiu || '') : ''),
                t.cultiu_aplicat ? (t.varietat_aplicada || '') : (p ? (p.varietat || '') : ''),
                sup.toFixed(2),
                prod ? (prod.nom || '') : '',
                prod ? (prod.registre || 'PENDENT') : '',
                prod ? (prod.materia_activa || '') : '',
                prod ? (prod.tipus || '') : '',
                prod ? prod.dosi : '',
                prod ? (prod.unitat || '') : '',
                prod ? (dosi * sup).toFixed(2) : '',
                prod ? (prod.data_limit || '') : '',
                t.operador || '',
                t.maquinaria || ''
            ].join(';') + '\n';
        });
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tractaments_fitosanitaris_' + any + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    mostrarNotificacio('✅ Registre de tractaments exportat correctament', 'success');
}

// ============================================================
// FUNCIONS DE SELECCIÓ DE PARCEL·LES I SUPERFÍCIE
// Selector en arbre: Finca → Varietats (regadiu o secà)
// ============================================================

// Estat global del tipus de reg seleccionat al modal
var _tipusRegActual = 'regadiu';

function actualitzarEstilToggleReg() {
    const btnReg = document.getElementById('btn-regadiu');
    const btnSeca = document.getElementById('btn-seca');
    if (!btnReg || !btnSeca) return;
    if (_tipusRegActual === 'regadiu') {
        btnReg.style.cssText = 'padding:6px 14px; border-radius:20px; border:2px solid #1565c0; background:#1565c0; color:#fff; font-size:13px; cursor:pointer; font-weight:600;';
        btnSeca.style.cssText = 'padding:6px 14px; border-radius:20px; border:2px solid #bbb; background:#fff; color:#555; font-size:13px; cursor:pointer;';
    } else {
        btnSeca.style.cssText = 'padding:6px 14px; border-radius:20px; border:2px solid #795548; background:#795548; color:#fff; font-size:13px; cursor:pointer; font-weight:600;';
        btnReg.style.cssText = 'padding:6px 14px; border-radius:20px; border:2px solid #bbb; background:#fff; color:#555; font-size:13px; cursor:pointer;';
    }
}

function canviarTipusReg(tipus) {
    _tipusRegActual = tipus;
    actualitzarEstilToggleReg();
    // Reconstruir selector sense preselecció (nou tractament)
    construirSelectorFinques(null, null);
}

function construirSelectorFinques(finquesPreseleccionades, varietatsPreseleccionades) {
    const container = document.getElementById('tractament-finques-checks');
    if (!container) return;

    const esRegadiu = _tipusRegActual === 'regadiu';

    // Determinar campanya activa: el màxim any present a parcelles, per cada finca
    // Si no hi ha parcel·les de l'any en curs, baixar a l'anterior
    const anyActual = getCampanyaDefecte();

    // Filtrar parcel·les pel tipus de reg, cultius aptes i amb finca assignada
    // Les sense finca s'exclouen des del principi (no formen part de cap campanya coneguda)
    const parcellesTipus = (parcelles || []).filter(function(p) {
        return p.regadiu === esRegadiu && esParcellaApta(p) && p.finca && p.finca.trim();
    });

    // Per cada finca, trobar el màxim any de campanya disponible
    const anyPerFinca = {};
    parcellesTipus.forEach(function(p) {
        const finca = p.finca.trim();
        const campanya = p.campanya ? parseInt(p.campanya) : anyActual;
        if (!anyPerFinca[finca] || campanya > anyPerFinca[finca]) {
            anyPerFinca[finca] = campanya;
        }
    });

    // Per cada finca, agafar només les parcel·les de l'any més recent disponible
    const parcellesFiltrades = parcellesTipus.filter(function(p) {
        const finca = p.finca.trim();
        const anyFinca = anyPerFinca[finca] || anyActual;
        const campanyaP = p.campanya ? parseInt(p.campanya) : anyActual;
        return campanyaP === anyFinca;
    });

    // Agrupar per finca → varietat
    const arbre = {};
    parcellesFiltrades.forEach(function(p) {
        const finca = p.finca.trim();
        const varietat = p.varietat || 'Sense varietat';
        if (!arbre[finca]) arbre[finca] = {};
        if (!arbre[finca][varietat]) arbre[finca][varietat] = { hectarees: 0, count: 0 };
        arbre[finca][varietat].hectarees += parseFloat(p.superficie) || 0;
        arbre[finca][varietat].count++;
    });

    const colorFinca = esRegadiu ? '#e8f5e9' : '#fef9e7';
    const emojiFinca = esRegadiu ? '💧' : '🌾';
    const missatgeBuit = esRegadiu
        ? 'No hi ha parcel·les de regadiu disponibles'
        : 'No hi ha parcel·les de secà disponibles';

    // Mode edició: preselecció passada per paràmetre
    // Mode nou: res marcat per defecte
    const modeEdicio = finquesPreseleccionades !== null && finquesPreseleccionades !== undefined;

    let html = '';
    Object.keys(arbre).sort().forEach(function(finca) {
        const varietats = Object.keys(arbre[finca]).sort();
        const haFinca = Object.values(arbre[finca]).reduce(function(s, v) { return s + v.hectarees; }, 0);
        const fincaId = 'finca-' + finca.replace(/[^a-zA-Z0-9]/g, '_');

        // En edició: marcat si estava preseleccionat. En nou: res marcat.
        const fincaMarcada = modeEdicio && finquesPreseleccionades.includes(finca);

        html += '<div style="margin-bottom:8px; border:1px solid #e0e0e0; border-radius:8px; overflow:hidden;">';
        html += '<div style="background:' + colorFinca + '; padding:8px 12px; display:flex; align-items:center; gap:10px;">';
        html += '<input type="checkbox" id="' + fincaId + '"' + (fincaMarcada ? ' checked' : '') + ' ';
        html += 'data-finca="' + finca.replace(/"/g, '&quot;') + '" ';
        html += 'onchange="toggleFinca(this)" ';
        html += 'style="width:18px; height:18px; cursor:pointer;">';
        html += '<label for="' + fincaId + '" style="font-weight:600; cursor:pointer; flex:1; margin:0;">' + emojiFinca + ' ' + finca + '</label>';
        html += '<span style="font-size:12px; color:#555;">' + haFinca.toFixed(2) + ' Ha</span>';
        html += '</div>';

        html += '<div style="padding:6px 12px 8px 32px;">';
        varietats.forEach(function(varietat) {
            const info = arbre[finca][varietat];
            const varId = 'var-' + finca.replace(/[^a-zA-Z0-9]/g, '_') + '-' + varietat.replace(/[^a-zA-Z0-9]/g, '_');
            // En edició: marcat si finca+varietat estava preseleccionada. En nou: res marcat.
            const varMarcada = modeEdicio && fincaMarcada && varietatsPreseleccionades &&
                varietatsPreseleccionades.some(function(v) { return v.finca === finca && v.varietat === varietat; });
            html += '<div style="display:flex; align-items:center; gap:8px; padding:3px 0;">';
            html += '<input type="checkbox" id="' + varId + '"' + (varMarcada ? ' checked' : '') + ' ';
            html += 'data-finca="' + finca.replace(/"/g, '&quot;') + '" data-varietat="' + varietat.replace(/"/g, '&quot;') + '" ';
            html += 'onchange="actualitzarCheckFinca(this)" class="check-varietat" ';
            html += 'style="width:16px; height:16px; cursor:pointer;">';
            html += '<label for="' + varId + '" style="cursor:pointer; margin:0; font-size:14px;">' + varietat + '</label>';
            html += '<span style="font-size:12px; color:#888; margin-left:auto;">' + info.hectarees.toFixed(2) + ' Ha · ' + info.count + ' parc.</span>';
            html += '</div>';
        });
        html += '</div></div>';
    });

    container.innerHTML = html || '<p style="color:#999;">' + missatgeBuit + '</p>';
    actualitzarParcellesSeleccionades();
}

function toggleFinca(cbFinca) {
    const finca = cbFinca.dataset.finca;
    const marcat = cbFinca.checked;
    document.querySelectorAll('.check-varietat[data-finca="' + finca + '"]').forEach(function(cb) {
        cb.checked = marcat;
    });
    cbFinca.indeterminate = false;
    actualitzarParcellesSeleccionades();
}

function actualitzarCheckFinca(cbVarietat) {
    const finca = cbVarietat.dataset.finca;
    const totes = document.querySelectorAll('.check-varietat[data-finca="' + finca + '"]');
    const marcades = document.querySelectorAll('.check-varietat[data-finca="' + finca + '"]:checked');
    const fincaId = 'finca-' + finca.replace(/[^a-zA-Z0-9]/g, '_');
    const cbFinca = document.getElementById(fincaId);
    if (cbFinca) {
        cbFinca.checked = marcades.length > 0;
        cbFinca.indeterminate = marcades.length > 0 && marcades.length < totes.length;
    }
    actualitzarParcellesSeleccionades();
}

function actualitzarParcellesSeleccionades() {
    const parcellesSeleccionades = getParcellesSeleccionades();
    const superficie = parcellesSeleccionades.reduce(function(sum, p) {
        return sum + (parseFloat(p.superficie) || 0);
    }, 0);
    const spanSup = document.getElementById('superficie-total');
    if (spanSup) spanSup.textContent = superficie.toFixed(2);
}

function getParcellesSeleccionades() {
    const seleccions = [];
    document.querySelectorAll('.check-varietat:checked').forEach(function(cb) {
        seleccions.push({ finca: cb.dataset.finca, varietat: cb.dataset.varietat });
    });
    const esRegadiu = _tipusRegActual === 'regadiu';
    const anyActual = getCampanyaDefecte();

    // Calcular el màxim any disponible per cada finca (mateix criteri que el selector)
    const anyPerFinca = {};
    (parcelles || []).forEach(function(p) {
        if (!p.finca || !p.finca.trim() || p.regadiu !== esRegadiu || !esParcellaApta(p)) return;
        const finca = p.finca.trim();
        const campanya = p.campanya ? parseInt(p.campanya) : anyActual;
        if (!anyPerFinca[finca] || campanya > anyPerFinca[finca]) {
            anyPerFinca[finca] = campanya;
        }
    });

    return (parcelles || []).filter(function(p) {
        if (!p.finca || !p.finca.trim()) return false;
        if (!esParcellaApta(p) || p.regadiu !== esRegadiu) return false;
        const finca = p.finca.trim();
        // Només parcel·les de la campanya més recent d'aquesta finca
        const anyFinca = anyPerFinca[finca] || anyActual;
        const campanyaP = p.campanya ? parseInt(p.campanya) : anyActual;
        if (campanyaP !== anyFinca) return false;
        // I que estiguin seleccionades al selector
        return seleccions.some(function(s) {
            return s.finca === finca && s.varietat === p.varietat;
        });
    });
}
function esParcellaApta(p) {
    if (!p.cultiu) return false;
    const c = p.cultiu.trim().toUpperCase();
    const cultiusAptes = [
        'PRÉSSEC', 'PRESSEC', 'PRÉSSEC PLA', 'PRESSEC PLA',
        'NECTARINA', 'ALBERCOC', 'PESOL', 'PÈSOL', 'PESOLS', 'PÈSOLS',
        'BLAT', 'BLAT TOU', 'BLAT DE MORO', 'ORDI', 'CIVADA', 'TRITICALE'
    ];
    return cultiusAptes.includes(c);
}

// ============================================================
// FITXA FITOSANITARI — Modal informatiu des del detall
// ============================================================

function veureFitxaFitosanitari(producteId) {
    const producte = (fitosanitaris || []).find(function(f) { return f.id === producteId; });
    if (!producte) {
        mostrarNotificacio('Producte no trobat', 'error');
        return;
    }

    const anterior = document.getElementById('modal-fitxa-fitosanitari');
    if (anterior) anterior.remove();

    const camps = [
        { label: '🏷️ Nom', valor: producte.nom },
        { label: '🔬 Matèria Activa', valor: producte.materia_activa },
        { label: '📋 Tipus', valor: producte.tipus },
        { label: '🔢 Nº Registre MAPA', valor: producte.registre || '⚠️ Pendent' },
        { label: '⏰ PLAC (dies)', valor: producte.plac != null ? producte.plac + ' dies' : '—' },
        { label: '🧪 IRAC', valor: producte.irac },
        { label: '📦 Unitat estoc', valor: producte.unitat_stock },
        { label: '📝 Observacions', valor: producte.observacions },
    ];

    let htmlCamps = '';
    camps.forEach(function(c) {
        if (!c.valor) return;
        const estil = c.label.includes('Registre') && c.valor.includes('Pendent')
            ? 'color:red; font-weight:bold;'
            : '';
        htmlCamps += '<div style="display:flex; gap:12px; padding:8px 0; border-bottom:1px solid #f0f0f0;">' +
            '<span style="min-width:160px; color:#666; font-size:14px;">' + c.label + '</span>' +
            '<span style="font-size:14px; ' + estil + '">' + c.valor + '</span>' +
            '</div>';
    });

    const html = `
    <div id="modal-fitxa-fitosanitari" class="modal" style="display:block; z-index:10000;">
        <div class="modal-content" style="max-width:520px;">
            <span class="close" onclick="document.getElementById('modal-fitxa-fitosanitari').remove()">&times;</span>
            <h2>📋 Fitxa: ${producte.nom}</h2>
            <div style="margin:16px 0;">
                ${htmlCamps || '<p style="color:#999;">Sense dades addicionals</p>'}
            </div>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="document.getElementById('modal-fitxa-fitosanitari').remove()">
                    ← Tornar
                </button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}

// veureFitxaFertilitzant: viu a fertilitzants-ui_v1.js (versió única, amb NPK i preu)

function veureFitxaProductePerSelect(btn) {
    const linia = btn.closest('.linia-producte');
    const [tipus, id] = (linia.querySelector('.lp-producte').value || '').split(':');
    if (!id) {
        mostrarNotificacio('Selecciona primer un producte', 'error');
        return;
    }
    if (tipus === 'fert') {
        veureFitxaFertilitzant(id);
    } else {
        veureFitxaFitosanitari(id);
    }
}