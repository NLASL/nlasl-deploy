// ============================================================
// RECOMANACIONS RT — UI v1
// Gestió de recomanacions tècniques de la cooperativa
// Taules: recomanacions_rt, recomanacions_rt_productes,
//         recomanacions_rt_parcelles, recomanacions_rt_mapatge
// ============================================================

const PLAGUES_INICIALS = [
    'Anarsia', 'Arrufat', 'Cendrosa', 'Cribat',
    'Grafolita', 'Monilia', 'Mosca', 'Poll', 'Pugó', 'Trips'
];

// ============================================================
// VISTA PRINCIPAL
// ============================================================

async function carregarVistaRecomanacions() {
    const container = document.getElementById('view-container');
    const podeCrear = hasPermission('insert');
    const campanyaDefecte = getCampanyaDefecte();

    let html = '<div class="view-recomanacions">';
    html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">';
    html += '<h2>📋 Recomanacions Tècniques (RT)</h2>';
    if (podeCrear) {
        html += '<button class="btn btn-primary" onclick="obrirModalRecomanacio()">➕ Nova RT</button>';
    }
    html += '</div>';

    // Filtre campanya
    html += '<div style="margin-bottom:15px; background:#f5f5f5; padding:12px; border-radius:8px; display:flex; align-items:center; gap:10px;">';
    html += '<label><strong>Campanya:</strong></label>';
    html += '<select id="filtre-campanya-rt" style="padding:6px; border-radius:4px; border:1px solid #ddd;">';
    [2024, 2025, 2026, 2027].forEach(function(c) {
        html += '<option value="' + c + '"' + (c === campanyaDefecte ? ' selected' : '') + '>' + c + '</option>';
    });
    html += '</select>';
    html += '</div>';

    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Codi RT</th><th>Període</th><th>Tècnic</th>';
    html += '<th>Programes / Plagues</th><th>Finques</th><th>Accions</th>';
    html += '</tr></thead>';
    html += '<tbody id="tbody-recomanacions"><tr><td colspan="6">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';

    html += crearModalRecomanacioRT();

    container.innerHTML = html;

    document.getElementById('filtre-campanya-rt').addEventListener('change', carregarTaulaRecomanacions);
    await carregarTaulaRecomanacions();
}

async function carregarTaulaRecomanacions() {
    const tbody = document.getElementById('tbody-recomanacions');
    if (!tbody) return;

    const campanya = document.getElementById('filtre-campanya-rt')?.value || getCampanyaDefecte().toString();

    try {
        const { data: rts, error } = await supabaseClient
            .from('recomanacions_rt')
            .select(`
                *,
                recomanacions_rt_productes(*),
                recomanacions_rt_parcelles(*)
            `)
            .eq('campanya', campanya)
            .eq('estat', 'actiu')
            .order('periode_inici', { ascending: false });

        if (error) throw error;

        if (!rts || !rts.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hi ha recomanacions per la campanya ' + campanya + '</td></tr>';
            return;
        }

        const podeEditar = hasPermission('update');
        const podeEliminar = hasPermission('delete');
        let html = '';

        rts.forEach(function(rt) {
            // Resumir programes únics
            const programes = [...new Set(
                (rt.recomanacions_rt_productes || []).map(function(p) { return p.programa || '—'; })
            )].join('<br>');

            // Finques afectades
            const finques = [...new Set(
                (rt.recomanacions_rt_parcelles || []).map(function(p) { return p.finca_coop; })
            )].join(', ');

            const periodeTxt = formatData(rt.periode_inici) + ' – ' + formatData(rt.periode_fi);

            html += '<tr>';
            html += '<td><strong>' + rt.codi_rt + '</strong></td>';
            html += '<td style="white-space:nowrap;">' + periodeTxt + '</td>';
            html += '<td>' + (rt.tecnic || '—') + '</td>';
            html += '<td style="font-size:13px;">' + (programes || '—') + '</td>';
            html += '<td style="font-size:13px;">' + (finques || '—') + '</td>';
            html += '<td>';
            html += '<button class="btn btn-sm btn-primary" onclick="veureRecomanacioRT(\'' + rt.id + '\')">👁️</button>';
            if (podeEditar) html += ' <button class="btn btn-sm btn-secondary" onclick="editarRecomanacioRT(\'' + rt.id + '\')">✏️</button>';
            if (podeEliminar) html += ' <button class="btn btn-sm btn-danger" onclick="eliminarRecomanacioRT(\'' + rt.id + '\')">🗑️</button>';
            html += '</td>';
            html += '</tr>';
        });

        tbody.innerHTML = html;

    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6">Error carregant dades</td></tr>';
    }
}

// ============================================================
// MODAL RT — HTML
// ============================================================

function crearModalRecomanacioRT() {
    return `
    <div id="modal-recomanacio-rt" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:900px;">
            <span class="close" onclick="tancarModal('modal-recomanacio-rt')">&times;</span>
            <h2 id="modal-rt-titol">Nova Recomanació Tècnica</h2>
            <form id="form-recomanacio-rt" onsubmit="guardarRecomanacioRT(event)">

                <!-- CAPÇALERA -->
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:16px;">
                    <div class="form-group">
                        <label>Codi RT *</label>
                        <input type="text" id="rt-codi" placeholder="RT0045" required
                            style="text-transform:uppercase;">
                    </div>
                    <div class="form-group">
                        <label>Data Recomanació *</label>
                        <input type="date" id="rt-data-recomanacio" required>
                    </div>
                    <div class="form-group">
                        <label>Tècnic</label>
                        <input type="text" id="rt-tecnic" placeholder="Velo Fernández, Miguel">
                    </div>
                    <div class="form-group">
                        <label>Període Inici *</label>
                        <input type="date" id="rt-periode-inici" required>
                    </div>
                    <div class="form-group">
                        <label>Període Fi *</label>
                        <input type="date" id="rt-periode-fi" required>
                    </div>
                    <div class="form-group">
                        <label>Caldo (L/Ha)</label>
                        <input type="number" id="rt-caldo" min="0" step="50" placeholder="1000">
                    </div>
                    <div class="form-group">
                        <label>Mètode Aplicació</label>
                        <input type="text" id="rt-metode" placeholder="Atomizador">
                    </div>
                    <div class="form-group">
                        <label>Moment Aplicació</label>
                        <input type="text" id="rt-moment" placeholder="Condicions òptimes">
                    </div>
                    <div class="form-group">
                        <label>Origen Recomanació</label>
                        <input type="text" id="rt-origen" placeholder="Antecedents">
                    </div>
                </div>
                <div class="form-group" style="margin-bottom:16px;">
                    <label>Observacions</label>
                    <textarea id="rt-observacions" rows="2"></textarea>
                </div>

                <!-- FINQUES AFECTADES -->
                <div class="form-group" style="margin-bottom:16px;">
                    <label>Finques Afectades *</label>
                    <p style="font-size:12px; color:#888; margin:4px 0 8px;">
                        Selecciona les finques i varietats que apareixen a la RT
                    </p>
                    <div id="rt-finques-checks" style="margin-top:4px;"></div>
                </div>

                <!-- PRODUCTES / PROGRAMES -->
                <div class="form-group">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                        <label style="margin:0;">Productes Recomanats *</label>
                        <button type="button" class="btn btn-secondary" style="font-size:13px; padding:6px 12px;"
                            onclick="afegirLiniaProducteRT()">
                            ➕ Afegir producte
                        </button>
                    </div>
                    <div id="rt-linies-productes-container"></div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-recomanacio-rt')">Cancel·lar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>
        </div>
    </div>`;
}

// ============================================================
// SELECTOR DE FINQUES (des de recomanacions_rt_mapatge)
// ============================================================

async function construirSelectorFincesRT(parcPreseleccionades) {
    const container = document.getElementById('rt-finques-checks');
    if (!container) return;

    const { data: mapatge, error } = await supabaseClient
        .from('recomanacions_rt_mapatge')
        .select('*')
        .eq('actiu', true)
        .order('finca_coop');

    if (error || !mapatge) {
        container.innerHTML = '<p style="color:#999;">Error carregant finques</p>';
        return;
    }

    // Agrupar per finca_coop
    const arbre = {};
    mapatge.forEach(function(m) {
        if (!arbre[m.finca_coop]) arbre[m.finca_coop] = [];
        arbre[m.finca_coop].push(m);
    });

    const modeEdicio = parcPreseleccionades !== null && parcPreseleccionades !== undefined;

    let html = '';
    Object.keys(arbre).sort().forEach(function(finca) {
        const varietats = arbre[finca];
        const haTotalFinca = varietats.reduce(function(s, v) { return s + (parseFloat(v.superficie_coop) || 0); }, 0);
        const fincaId = 'rtf-' + finca.replace(/[^a-zA-Z0-9]/g, '_');

        const fincaMarcada = modeEdicio && parcPreseleccionades.some(function(p) { return p.finca_coop === finca; });

        html += '<div style="margin-bottom:8px; border:1px solid #e0e0e0; border-radius:8px; overflow:hidden;">';
        html += '<div style="background:#e8f5e9; padding:8px 12px; display:flex; align-items:center; gap:10px;">';
        html += '<input type="checkbox" id="' + fincaId + '"' + (fincaMarcada ? ' checked' : '') + ' ';
        html += 'data-finca-coop="' + finca.replace(/"/g, '&quot;') + '" ';
        html += 'onchange="toggleFincaRT(this)" style="width:18px; height:18px; cursor:pointer;">';
        html += '<label for="' + fincaId + '" style="font-weight:600; cursor:pointer; flex:1; margin:0;">🏡 ' + finca + '</label>';
        html += '<span style="font-size:12px; color:#555;">' + haTotalFinca.toFixed(2) + ' Ha (Coop)</span>';
        html += '</div>';

        html += '<div style="padding:6px 12px 8px 32px;">';
        varietats.forEach(function(m) {
            const varId = 'rtv-' + finca.replace(/[^a-zA-Z0-9]/g, '_') + '-' + m.varietat_coop.replace(/[^a-zA-Z0-9]/g, '_');
            const varMarcada = modeEdicio && parcPreseleccionades.some(function(p) {
                return p.finca_coop === finca && p.varietat_coop === m.varietat_coop;
            });
            const discrepancia = m.nota
                ? ' <span title="' + m.nota + '" style="color:#f57c00; font-size:11px;">⚠️</span>'
                : '';
            html += '<div style="display:flex; align-items:center; gap:8px; padding:3px 0;">';
            html += '<input type="checkbox" id="' + varId + '"' + (varMarcada ? ' checked' : '') + ' ';
            html += 'data-finca-coop="' + finca.replace(/"/g, '&quot;') + '" ';
            html += 'data-varietat-coop="' + m.varietat_coop.replace(/"/g, '&quot;') + '" ';
            html += 'data-superficie-coop="' + (m.superficie_coop || 0) + '" ';
            html += 'onchange="toggleVarietatRT(this)" class="check-varietat-rt" ';
            html += 'style="width:16px; height:16px; cursor:pointer;">';
            html += '<label for="' + varId + '" style="cursor:pointer; margin:0; font-size:14px;">';
            html += m.varietat_coop + discrepancia + '</label>';
            html += '<span style="font-size:12px; color:#888; margin-left:auto;">';
            html += (m.superficie_coop || 0).toFixed(2) + ' Ha · → ' + m.varietat_nlasl + '</span>';
            html += '</div>';
        });
        html += '</div></div>';
    });

    container.innerHTML = html || '<p style="color:#999;">No hi ha finques al mapatge</p>';
}

function toggleFincaRT(cbFinca) {
    const finca = cbFinca.dataset.fincaCoop;
    document.querySelectorAll('.check-varietat-rt').forEach(function(cb) {
        if (cb.dataset.fincaCoop === finca) cb.checked = cbFinca.checked;
    });
    actualitzarCheckIndeterminatFincaRT(cbFinca);
}

function toggleVarietatRT(cbVarietat) {
    const finca = cbVarietat.dataset.fincaCoop;
    const fincaId = 'rtf-' + finca.replace(/[^a-zA-Z0-9]/g, '_');
    const cbFinca = document.getElementById(fincaId);
    if (cbFinca) actualitzarCheckIndeterminatFincaRT(cbFinca);
}

function actualitzarCheckIndeterminatFincaRT(cbFinca) {
    const finca = cbFinca.dataset.fincaCoop;
    const vars = Array.from(document.querySelectorAll('.check-varietat-rt[data-finca-coop="' + finca + '"]'));
    const marcades = vars.filter(function(cb) { return cb.checked; }).length;
    cbFinca.indeterminate = marcades > 0 && marcades < vars.length;
    cbFinca.checked = marcades === vars.length;
}

function getFincesRTSeleccionades() {
    const seleccions = [];
    document.querySelectorAll('.check-varietat-rt:checked').forEach(function(cb) {
        seleccions.push({
            finca_coop: cb.dataset.fincaCoop,
            varietat_coop: cb.dataset.varietatCoop,
            superficie_coop: parseFloat(cb.dataset.superficieCoop) || 0
        });
    });
    return seleccions;
}

// ============================================================
// LÍNIES DE PRODUCTE RT
// ============================================================

async function carregarPlagues() {
    // Combina plagues inicials amb les que ja hi ha a la BD
    try {
        const { data } = await supabaseClient
            .from('recomanacions_rt_productes')
            .select('plagues');

        const plaguesBD = new Set(PLAGUES_INICIALS);
        (data || []).forEach(function(r) {
            if (r.plagues && Array.isArray(r.plagues)) {
                r.plagues.forEach(function(p) { if (p) plaguesBD.add(p); });
            }
        });
        return Array.from(plaguesBD).sort();
    } catch {
        return [...PLAGUES_INICIALS].sort();
    }
}

async function afegirLiniaProducteRT(dades) {
    const container = document.getElementById('rt-linies-productes-container');
    const plagues = await carregarPlagues();

    // Pills de plagues seleccionades
    const plaguesSeleccionades = (dades && dades.plagues) ? dades.plagues : [];

    const pillsHtml = plagues.map(function(p) {
        const activa = plaguesSeleccionades.includes(p);
        return '<span class="pill-plaga' + (activa ? ' activa' : '') + '" ' +
            'onclick="togglePillaPlaga(this)" ' +
            'data-plaga="' + p + '" ' +
            'style="display:inline-block; padding:4px 10px; border-radius:20px; font-size:12px; cursor:pointer; margin:2px; ' +
            'border:1px solid ' + (activa ? '#1565c0' : '#bbb') + '; ' +
            'background:' + (activa ? '#1565c0' : '#fff') + '; ' +
            'color:' + (activa ? '#fff' : '#555') + ';">' + p + '</span>';
    }).join('');

    const unitatOpts = ['L/Ha', 'kg/Ha', 'g/Ha'].map(function(u) {
        return '<option value="' + u + '"' + (dades && dades.unitat === u ? ' selected' : '') + '>' + u + '</option>';
    }).join('');

    const div = document.createElement('div');
    div.className = 'linia-producte-rt';
    div.style.cssText = 'border:1px solid #e0e0e0; border-radius:8px; padding:12px; margin-bottom:10px; background:#fafafa; position:relative;';

    div.innerHTML = `
        <div style="margin-bottom:8px;">
            <label style="font-size:12px; color:#666; display:block; margin-bottom:6px;">Plaga/Malaltia</label>
            <div class="pills-plagues" style="display:flex; flex-wrap:wrap; gap:2px; align-items:center;">
                ${pillsHtml}
                <input type="text" class="rt-plaga-nova" placeholder="+ Nova plaga..."
                    style="border:none; border-bottom:1px dashed #bbb; outline:none; font-size:12px; padding:4px 6px; width:120px; color:#555;"
                    onkeydown="afegirPlagaNova(event, this)">
            </div>
        </div>
        <div style="display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:8px; align-items:end; margin-top:8px;">
            <div>
                <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Programa (text RT)</label>
                <input type="text" class="rt-lp-programa"
                    value="${dades ? (dades.programa || '') : ''}"
                    placeholder="ex: Cendrosa Presseguer 2026"
                    style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; box-sizing:border-box;">
            </div>
            <div>
                <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Producte Recomanat *</label>
                <input type="text" class="rt-lp-producte"
                    value="${dades ? (dades.producte_nom || '') : ''}"
                    placeholder="ex: CENTINELA 10 EC"
                    style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; box-sizing:border-box; text-transform:uppercase;"
                    oninput="this.value = this.value.toUpperCase()">
            </div>
            <div style="display:flex; gap:6px; align-items:end;">
                <div>
                    <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Dosi</label>
                    <input type="number" class="rt-lp-dosi"
                        value="${dades ? (dades.dosi || '') : ''}"
                        min="0" step="0.001"
                        style="width:80px; padding:8px; border:1px solid #ddd; border-radius:4px;">
                </div>
                <div>
                    <label style="font-size:12px; color:#666; display:block; margin-bottom:4px;">Unitat</label>
                    <select class="rt-lp-unitat" style="padding:8px; border:1px solid #ddd; border-radius:4px;">
                        ${unitatOpts}
                    </select>
                </div>
            </div>
            <div>
                <button type="button" onclick="eliminarLiniaProducteRT(this)"
                    style="background:#ffebee; border:1px solid #ef9a9a; color:#c62828; border-radius:4px; padding:8px; cursor:pointer; font-size:14px; margin-top:18px;">🗑️</button>
            </div>
        </div>`;

    container.appendChild(div);
}

function togglePillaPlaga(pill) {
    const activa = pill.classList.toggle('activa');
    pill.style.background = activa ? '#1565c0' : '#fff';
    pill.style.color = activa ? '#fff' : '#555';
    pill.style.borderColor = activa ? '#1565c0' : '#bbb';
}

function afegirPlagaNova(event, input) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const nova = input.value.trim();
    if (!nova) return;

    const pills = input.closest('.pills-plagues');
    // Comprovar que no existeixi ja
    const existent = Array.from(pills.querySelectorAll('.pill-plaga'))
        .find(function(p) { return p.dataset.plaga.toLowerCase() === nova.toLowerCase(); });
    if (existent) {
        existent.classList.add('activa');
        existent.style.background = '#1565c0';
        existent.style.color = '#fff';
        existent.style.borderColor = '#1565c0';
        input.value = '';
        return;
    }

    // Crear nova pill activa
    const span = document.createElement('span');
    span.className = 'pill-plaga activa';
    span.dataset.plaga = nova;
    span.textContent = nova;
    span.style.cssText = 'display:inline-block; padding:4px 10px; border-radius:20px; font-size:12px; cursor:pointer; margin:2px; border:1px solid #1565c0; background:#1565c0; color:#fff;';
    span.onclick = function() { togglePillaPlaga(span); };
    pills.insertBefore(span, input);
    input.value = '';
}

function getPlaguesLinia(linia) {
    return Array.from(linia.querySelectorAll('.pill-plaga.activa'))
        .map(function(p) { return p.dataset.plaga; });
}

function eliminarLiniaProducteRT(btn) {
    const linia = btn.closest('.linia-producte-rt');
    const total = document.querySelectorAll('.linia-producte-rt').length;
    if (total <= 1) {
        mostrarNotificacio('Cal tenir almenys un producte', 'error');
        return;
    }
    linia.remove();
}

function recollirLiniesProducteRT() {
    const linies = [];
    document.querySelectorAll('.linia-producte-rt').forEach(function(row) {
        const producteNom = row.querySelector('.rt-lp-producte').value.trim();
        const dosi = parseFloat(row.querySelector('.rt-lp-dosi').value);
        const unitat = row.querySelector('.rt-lp-unitat').value;
        const programa = row.querySelector('.rt-lp-programa').value.trim();
        const plagues = getPlaguesLinia(row);

        if (producteNom) {
            linies.push({
                producte_nom: producteNom,
                dosi: dosi || null,
                unitat,
                programa: programa || null,
                plagues: plagues.length ? plagues : null
            });
        }
    });
    return linies;
}

// ============================================================
// OBRIR / TANCAR MODAL
// ============================================================

async function obrirModalRecomanacio() {
    if (!document.getElementById('modal-recomanacio-rt')) {
        const div = document.createElement('div');
        div.innerHTML = crearModalRecomanacioRT();
        document.body.appendChild(div);
    }

    document.getElementById('modal-rt-titol').textContent = 'Nova Recomanació Tècnica';
    const form = document.getElementById('form-recomanacio-rt');
    form.reset();
    form.dataset.editId = '';

    document.getElementById('rt-tecnic').value = 'Velo Fernández, Miguel';
    document.getElementById('rt-metode').value = 'Atomizador';
    document.getElementById('rt-caldo').value = '1000';
    document.getElementById('rt-origen').value = 'Antecedents';

    await construirSelectorFincesRT(null);

    document.getElementById('rt-linies-productes-container').innerHTML = '';
    await afegirLiniaProducteRT();

    document.getElementById('modal-recomanacio-rt').style.display = 'block';
}

// ============================================================
// GUARDAR
// ============================================================

async function guardarRecomanacioRT(event) {
    event.preventDefault();

    const codiRt = document.getElementById('rt-codi').value.trim().toUpperCase();
    const dataRec = document.getElementById('rt-data-recomanacio').value;
    const periodeInici = document.getElementById('rt-periode-inici').value;
    const periodeFi = document.getElementById('rt-periode-fi').value;
    const tecnic = document.getElementById('rt-tecnic').value.trim();
    const caldo = parseFloat(document.getElementById('rt-caldo').value) || null;
    const metode = document.getElementById('rt-metode').value.trim();
    const moment = document.getElementById('rt-moment').value.trim();
    const origen = document.getElementById('rt-origen').value.trim();
    const observacions = document.getElementById('rt-observacions').value.trim();
    const campanya = getCampanyaDefecte().toString();

    const fincesSeleccionades = getFincesRTSeleccionades();
    if (!fincesSeleccionades.length) {
        mostrarNotificacio('Cal seleccionar almenys una finca', 'error');
        return;
    }

    const liniesProducte = recollirLiniesProducteRT();
    if (!liniesProducte.length) {
        mostrarNotificacio('Cal afegir almenys un producte', 'error');
        return;
    }

    const form = document.getElementById('form-recomanacio-rt');
    const editId = form.dataset.editId || null;

    try {
        let recomanacioId;

        if (editId) {
            // Edició: actualitzar capçalera i eliminar fills
            const { error } = await supabaseClient
                .from('recomanacions_rt')
                .update({
                    codi_rt: codiRt,
                    data_recomanacio: dataRec,
                    periode_inici: periodeInici,
                    periode_fi: periodeFi,
                    tecnic,
                    caldo_lha: caldo,
                    metode_aplicacio: metode,
                    moment_aplicacio: moment,
                    origen_recomanacio: origen,
                    observacions: observacions || null
                })
                .eq('id', editId);
            if (error) throw error;
            recomanacioId = editId;

            // Esborrar productes i parcel·les anteriors
            await supabaseClient.from('recomanacions_rt_productes').delete().eq('recomanacio_id', editId);
            await supabaseClient.from('recomanacions_rt_parcelles').delete().eq('recomanacio_id', editId);

        } else {
            // Creació
            const { data, error } = await supabaseClient
                .from('recomanacions_rt')
                .insert([{
                    codi_rt: codiRt,
                    data_recomanacio: dataRec,
                    periode_inici: periodeInici,
                    periode_fi: periodeFi,
                    tecnic,
                    caldo_lha: caldo,
                    metode_aplicacio: metode,
                    moment_aplicacio: moment,
                    origen_recomanacio: origen,
                    observacions: observacions || null,
                    campanya
                }])
                .select()
                .single();
            if (error) throw error;
            recomanacioId = data.id;
        }

        // Inserir productes
        const rowsProductes = liniesProducte.map(function(lp) {
            return {
                recomanacio_id: recomanacioId,
                producte_nom: lp.producte_nom,
                dosi: lp.dosi,
                unitat: lp.unitat,
                programa: lp.programa,
                plagues: lp.plagues
            };
        });
        const { error: errProd } = await supabaseClient.from('recomanacions_rt_productes').insert(rowsProductes);
        if (errProd) throw errProd;

        // Inserir parcel·les
        const rowsParc = fincesSeleccionades.map(function(f) {
            return {
                recomanacio_id: recomanacioId,
                finca_coop: f.finca_coop,
                varietat_coop: f.varietat_coop,
                superficie_coop: f.superficie_coop
            };
        });
        const { error: errParc } = await supabaseClient.from('recomanacions_rt_parcelles').insert(rowsParc);
        if (errParc) throw errParc;

        mostrarNotificacio(editId ? 'RT actualitzada' : 'RT registrada', 'success');
        tancarModal('modal-recomanacio-rt');
        await carregarTaulaRecomanacions();

    } catch (error) {
        console.error('Error guardarRecomanacioRT:', error);
        mostrarNotificacio('Error en guardar: ' + error.message, 'error');
    }
}

// ============================================================
// EDITAR
// ============================================================

async function editarRecomanacioRT(id) {
    if (!document.getElementById('modal-recomanacio-rt')) {
        const div = document.createElement('div');
        div.innerHTML = crearModalRecomanacioRT();
        document.body.appendChild(div);
    }

    try {
        const { data: rt, error } = await supabaseClient
            .from('recomanacions_rt')
            .select(`*, recomanacions_rt_productes(*), recomanacions_rt_parcelles(*)`)
            .eq('id', id)
            .single();
        if (error) throw error;

        document.getElementById('modal-rt-titol').textContent = 'Editar ' + rt.codi_rt;
        const form = document.getElementById('form-recomanacio-rt');
        form.dataset.editId = id;

        document.getElementById('rt-codi').value = rt.codi_rt || '';
        document.getElementById('rt-data-recomanacio').value = rt.data_recomanacio || '';
        document.getElementById('rt-periode-inici').value = rt.periode_inici || '';
        document.getElementById('rt-periode-fi').value = rt.periode_fi || '';
        document.getElementById('rt-tecnic').value = rt.tecnic || '';
        document.getElementById('rt-caldo').value = rt.caldo_lha || '';
        document.getElementById('rt-metode').value = rt.metode_aplicacio || '';
        document.getElementById('rt-moment').value = rt.moment_aplicacio || '';
        document.getElementById('rt-origen').value = rt.origen_recomanacio || '';
        document.getElementById('rt-observacions').value = rt.observacions || '';

        await construirSelectorFincesRT(rt.recomanacions_rt_parcelles || []);

        const container = document.getElementById('rt-linies-productes-container');
        container.innerHTML = '';
        for (const prod of (rt.recomanacions_rt_productes || [])) {
            await afegirLiniaProducteRT({
                producte_nom: prod.producte_nom,
                dosi: prod.dosi,
                unitat: prod.unitat,
                programa: prod.programa,
                plagues: prod.plagues || []
            });
        }
        if (!rt.recomanacions_rt_productes || !rt.recomanacions_rt_productes.length) {
            await afegirLiniaProducteRT();
        }

        document.getElementById('modal-recomanacio-rt').style.display = 'block';

    } catch (error) {
        console.error(error);
        mostrarNotificacio('Error carregant RT', 'error');
    }
}

// ============================================================
// VEURE DETALL
// ============================================================

async function veureRecomanacioRT(id) {
    try {
        const { data: rt, error } = await supabaseClient
            .from('recomanacions_rt')
            .select(`*, recomanacions_rt_productes(*), recomanacions_rt_parcelles(*)`)
            .eq('id', id)
            .single();
        if (error) throw error;

        const periodeTxt = formatData(rt.periode_inici) + ' – ' + formatData(rt.periode_fi);

        let html = '<div style="padding:16px; max-width:860px;">';
        html += '<h3 style="margin-top:0;">' + rt.codi_rt + ' — ' + periodeTxt + '</h3>';

        html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:16px; font-size:14px;">';
        html += '<div><strong>Tècnic:</strong> ' + (rt.tecnic || '—') + '</div>';
        html += '<div><strong>Caldo:</strong> ' + (rt.caldo_lha ? rt.caldo_lha + ' L/Ha' : '—') + '</div>';
        html += '<div><strong>Mètode:</strong> ' + (rt.metode_aplicacio || '—') + '</div>';
        html += '<div><strong>Moment:</strong> ' + (rt.moment_aplicacio || '—') + '</div>';
        html += '<div><strong>Origen:</strong> ' + (rt.origen_recomanacio || '—') + '</div>';
        if (rt.observacions) html += '<div colspan="2"><strong>Obs:</strong> ' + rt.observacions + '</div>';
        html += '</div>';

        // Productes
        html += '<h4 style="margin-bottom:8px;">Productes Recomanats</h4>';
        html += '<table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:16px;">';
        html += '<thead><tr style="background:#f5f5f5;">';
        html += '<th style="padding:6px; text-align:left;">Programa</th>';
        html += '<th style="padding:6px; text-align:left;">Plagues</th>';
        html += '<th style="padding:6px; text-align:left;">Producte</th>';
        html += '<th style="padding:6px; text-align:right;">Dosi</th>';
        html += '</tr></thead><tbody>';
        (rt.recomanacions_rt_productes || []).forEach(function(p) {
            const plagues = p.plagues ? p.plagues.join(', ') : '—';
            html += '<tr style="border-bottom:1px solid #eee;">';
            html += '<td style="padding:6px;">' + (p.programa || '—') + '</td>';
            html += '<td style="padding:6px;">' + plagues + '</td>';
            html += '<td style="padding:6px;"><strong>' + (p.producte_nom || '—') + '</strong></td>';
            html += '<td style="padding:6px; text-align:right;">' + (p.dosi ? p.dosi + ' ' + p.unitat : '—') + '</td>';
            html += '</tr>';
        });
        html += '</tbody></table>';

        // Finques
        html += '<h4 style="margin-bottom:8px;">Finques Afectades</h4>';
        html += '<div style="display:flex; flex-wrap:wrap; gap:6px;">';
        (rt.recomanacions_rt_parcelles || []).forEach(function(p) {
            html += '<span style="background:#e8f5e9; border:1px solid #c8e6c9; border-radius:16px; padding:4px 10px; font-size:13px;">';
            html += '🏡 ' + p.finca_coop + ' – ' + p.varietat_coop;
            if (p.superficie_coop) html += ' <span style="color:#888;">' + p.superficie_coop + ' Ha</span>';
            html += '</span>';
        });
        html += '</div></div>';

        // Mostrar en modal genèric o alert
        const modalDetall = document.getElementById('modal-detall') || document.getElementById('modal-vista');
        if (modalDetall) {
            modalDetall.querySelector('.modal-body, .modal-content').innerHTML = html;
            modalDetall.style.display = 'block';
        } else {
            // Fallback: reutilitzar el modal de recomanació en mode lectura
            await editarRecomanacioRT(id);
            // Deshabilitar el formulari
            document.querySelectorAll('#form-recomanacio-rt input, #form-recomanacio-rt select, #form-recomanacio-rt textarea, #form-recomanacio-rt button[type="submit"]')
                .forEach(function(el) { el.disabled = true; });
            document.getElementById('modal-rt-titol').textContent = '📋 ' + rt.codi_rt;
        }

    } catch (error) {
        console.error(error);
        mostrarNotificacio('Error carregant detall RT', 'error');
    }
}

// ============================================================
// ELIMINAR
// ============================================================

async function eliminarRecomanacioRT(id) {
    if (!confirm('Segur que vols eliminar aquesta recomanació?')) return;
    try {
        // Les taules filles s'eliminen per CASCADE
        const { error } = await supabaseClient
            .from('recomanacions_rt')
            .delete()
            .eq('id', id);
        if (error) throw error;
        mostrarNotificacio('Recomanació eliminada', 'success');
        await carregarTaulaRecomanacions();
    } catch (error) {
        console.error(error);
        mostrarNotificacio('Error eliminant RT', 'error');
    }
}
