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
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalTractament()">➕ Nou Tractament</button>';
    }
    html += '</div>';

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
                    finca: p.finca || '-',
                    tractaments: [],
                    superficie_total: 0
                };
            }
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
            html += '<td><strong>' + formatData(g.data) + '</strong></td>';
            html += '<td>' + nomsProductes + badgeProductes + '</td>';
            html += '<td>' + g.finca + '</td>';
            html += '<td>' + g.tractaments.length + ' parcel·les</td>';
            html += '<td>' + g.superficie_total.toFixed(2) + '</td>';
            html += '<td>' + dataLimitTxt + '</td>';
            html += '<td>';
            html += '<button class="btn btn-sm btn-primary" onclick="veureTractamentGrupV2(\'' + g.grup_tractament + '\')">👁️</button>';
            if (podeEditar) html += ' <button class="btn btn-sm btn-secondary" onclick="editarTractamentGrupV2(\'' + g.grup_tractament + '\')">✏️</button>';
            if (podeEliminar) html += ' <button class="btn btn-sm btn-danger" onclick="eliminarTractamentGrup(\'' + g.grup_tractament + '\')">🗑️</button>';
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
                        <input type="date" id="tractament-data" required>
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
    // dades: { producte_id, dosi, unitat, data_limit } (opcional, per edició)
    const container = document.getElementById('linies-productes-container');
    const idx = container.querySelectorAll('.linia-producte').length;
    const superficie = parseFloat(document.getElementById('superficie-total').textContent) || 0;

    const fitosanitarisOrdenats = (fitosanitaris || []).slice().sort(function(a, b) {
        return (a.nom || '').localeCompare(b.nom || '');
    });

    let optionsHtml = '<option value="">Seleccionar...</option>';
    fitosanitarisOrdenats.forEach(function(f) {
        const sel = (dades && dades.producte_id === f.id) ? 'selected' : '';
        optionsHtml += '<option value="' + f.id + '" ' + sel + '>' + f.nom + '</option>';
    });

    const unitatOpts = ['L/Ha', 'kg/Ha', 'g/Ha'].map(function(u) {
        return '<option value="' + u + '"' + (dades && dades.unitat === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('');

    const dosiVal = dades ? dades.dosi : '';
    const dataLimitVal = dades ? (dades.data_limit || '') : '';

    const div = document.createElement('div');
    div.className = 'linia-producte';
    div.style.cssText = 'border:1px solid #e0e0e0; border-radius:8px; padding:12px; margin-bottom:8px; background:#fafafa; position:relative;';
    div.innerHTML = `
        <div style="display:grid; grid-template-columns:2fr 1fr 1fr 1fr auto; gap:8px; align-items:end;">
            <div>
                <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Producte *</label>
                <div style="display:flex; gap:4px;">
                    <select class="lp-producte" onchange="actualitzarDataLimitLinia(this)" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;">
                        ${optionsHtml}
                    </select>
                    <button type="button" title="Veure fitxa del producte" style="background:#e8f5e9; border:1px solid #c8e6c9; border-radius:4px; padding:6px 8px; cursor:pointer; font-size:14px; white-space:nowrap;"
                        onclick="veureFitxaFitosanitariPerSelect(this)">📋</button>
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
        </div>`;

    container.appendChild(div);
    actualitzarDataLimitEfectiva();
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
    const producteId = selectProducte.value;
    const producte = (fitosanitaris || []).find(function(f) { return f.id === producteId; });
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
    const producteId = linia.querySelector('.lp-producte').value;
    const producte = (fitosanitaris || []).find(function(f) { return f.id === producteId; });
    const producteNom = producte ? producte.nom : 'Producte no seleccionat';

    obrirCalculadoraTractament({
        superficie: superficie,
        producteNom: producteNom,
        onConfirm: function(dosi, unitat) {
            linia.querySelector('.lp-dosi').value = dosi;
            const selectUnitat = linia.querySelector('.lp-unitat');
            if (selectUnitat) selectUnitat.value = unitat;
            actualitzarDataLimitLinia(linia.querySelector('.lp-producte'));
        }
    });
}

async function obrirModalTractament() {
    document.getElementById('modal-tractament-titol').textContent = 'Nou Tractament';
    document.getElementById('form-tractament').reset();
    document.getElementById('form-tractament').dataset.editMode = 'false';
    document.getElementById('form-tractament').dataset.editGrup = '';

    const avui = new Date().toISOString().split('T')[0];
    document.getElementById('tractament-data').value = avui;

    // Reset tipus reg a regadiu i construir selector (res marcat per defecte)
    _tipusRegActual = 'regadiu';
    construirSelectorFinques(null, null);

    // Inicialitzar línies de producte
    document.getElementById('linies-productes-container').innerHTML = '';
    afegirLiniaProducte();

    document.getElementById('superficie-total').textContent = '0';
    document.getElementById('data-limit-efectiva').style.display = 'none';

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
            const nom = p.fitosanitaris ? p.fitosanitaris.nom : '—';
            const producteId = p.producte_id || '';
            const quantitatTotal = (parseFloat(p.dosi) || 0) * superficieTotal;
            const unitatBase = (p.unitat || '').split('/')[0];
            const botoFitxa = producteId
                ? '<button class="btn btn-sm" style="background:#e8f5e9;border:1px solid #c8e6c9;color:#2e7d32;padding:3px 8px;font-size:12px;" onclick="veureFitxaFitosanitari(\'' + producteId + '\')">📋 Fitxa</button>'
                : '';
            htmlProductes += '<tr><td><strong>' + nom + '</strong></td><td>' + p.dosi + '</td><td>' + p.unitat + '</td><td><strong>' + quantitatTotal.toFixed(2) + ' ' + unitatBase + '</strong></td><td>' + (p.data_limit ? formatData(p.data_limit) : '—') + '</td><td>' + botoFitxa + '</td></tr>';
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
                dosi: p.dosi,
                unitat: p.unitat,
                data_limit: p.data_limit
            });
        });
    } else {
        afegirLiniaProducte();
    }

    actualitzarDataLimitEfectiva();
}

// ============================================================
// DAN i llibre fitosanitari actualitzats per nova arquitectura
// ============================================================

async function generarDAN() {
    const any = document.getElementById('informe-dan-any').value;
    const container = document.getElementById('taula-dan');
    container.innerHTML = '<p>Carregant...</p>';

    try {
        const { data, error } = await supabaseClient
            .from('tractaments_complet')
            .select('*')
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
            html += '<td>' + (p ? p.cultiu || '-' : '-') + '</td>';
            html += '<td>' + (p ? p.varietat || '-' : '-') + '</td>';
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
                p ? (p.cultiu || '') : '',
                p ? (p.varietat || '') : '',
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
    a.download = 'DAN_tractaments_' + any + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    mostrarNotificacio('✅ DAN exportada correctament', 'success');
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

    // Filtrar parcel·les pel tipus de reg i cultius aptes
    const parcellesTipus = (parcelles || []).filter(function(p) {
        return p.regadiu === esRegadiu && esParcellaApta(p);
    });

    // Per cada finca, trobar el màxim any de campanya disponible
    // (usem p.campanya si existeix, altrament considerem totes vàlides)
    const anyPerFinca = {};
    parcellesTipus.forEach(function(p) {
        const finca = p.finca || 'Sense finca';
        const campanya = p.campanya ? parseInt(p.campanya) : anyActual;
        if (!anyPerFinca[finca] || campanya > anyPerFinca[finca]) {
            anyPerFinca[finca] = campanya;
        }
    });

    // Seleccionar l'any a mostrar per cada finca: anyActual si existeix, si no l'anterior
    // Filtrar parcel·les: per cada finca, agafar les de l'any corresponent
    const parcellesFiltrades = parcellesTipus.filter(function(p) {
        const finca = p.finca || 'Sense finca';
        const anyFinca = anyPerFinca[finca] || anyActual;
        const campanyaP = p.campanya ? parseInt(p.campanya) : anyActual;
        return campanyaP === anyFinca;
    });

    // Agrupar per finca → varietat (excloure parcel·les sense finca assignada)
    const arbre = {};
    let countSenseFinca = 0;
    parcellesFiltrades.forEach(function(p) {
        if (!p.finca || !p.finca.trim()) {
            countSenseFinca++;
            return;
        }
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

    if (countSenseFinca > 0) {
        html += '<p style="color:#aaa; font-size:12px; margin-top:6px; padding:4px 8px;">⚠️ ' + countSenseFinca + ' parcel·la/es sense finca assignada — no es mostren fins que s\'assignin a Supabase</p>';
    }
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
    return (parcelles || []).filter(function(p) {
        return esParcellaApta(p) && p.regadiu === esRegadiu && seleccions.some(function(s) {
            return s.finca === p.finca && s.varietat === p.varietat;
        });
    });
}
function esParcellaApta(p) {
    if (!p.cultiu) return false;
    const c = p.cultiu.trim().toUpperCase();
    const cultiusAptes = [
        'PRÉSSEC', 'PRESSEC', 'PRÉSSEC PLA', 'PRESSEC PLA',
        'NECTARINA', 'ALBERCOC', 'PESOL', 'PÈSOL',
        'BLAT', 'BLAT TOU', 'ORDI', 'CIVADA', 'TRITICALE'
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

function veureFitxaFitosanitariPerSelect(btn) {
    const linia = btn.closest('.linia-producte');
    const producteId = linia.querySelector('.lp-producte').value;
    if (!producteId) {
        mostrarNotificacio('Selecciona primer un producte', 'error');
        return;
    }
    veureFitxaFitosanitari(producteId);
}