// ============================================================
// LIQUIDACIONS - UI
// Vista llista + modal capçalera/línies + generació des d'escandalls
// Depèn de: supabase-client_v5.js (getLiquidacions, createLiquidacio...)
// Variables globals esperades: fruites[], varietats[], currentUser
// ============================================================

let liquidacioCampanyaActiva = null;
let liquidacioModalId = null; // id de la liquidació oberta al modal (null = nova)

// ============================================================
// VISTA PRINCIPAL — LLISTA
// ============================================================

async function mostrarVistaLiquidacions() {
    const contenidor = document.getElementById('view-container');
    if (!contenidor) return;

    contenidor.innerHTML = `
        <div class="vista-header">
            <h2>💰 Liquidacions</h2>
            <button class="btn btn-primary" onclick="obrirModalLiquidacio()">+ Nova Liquidació</button>
        </div>
        <div class="filtres-bar">
            <label>Campanya:
                <select id="filtre-campanya-liquidacio" onchange="canviarCampanyaLiquidacio(this.value)"></select>
            </label>
        </div>
        <div id="llista-liquidacions" class="llista-cards">Carregant...</div>
    `;

    await omplirSelectorCampanyes();
    await carregarLlistaLiquidacions();
}

async function omplirSelectorCampanyes() {
    // ⚠️ VERIFICAR: si ja tens obtenirCampanyaActual() a preus_v1.js, fes-la servir aquí
    const campanyaActual = new Date().getFullYear();
    const select = document.getElementById('filtre-campanya-liquidacio');
    const opcions = [campanyaActual, campanyaActual - 1, campanyaActual - 2];
    select.innerHTML = opcions.map(c => `<option value="${c}">${c}</option>`).join('');
    liquidacioCampanyaActiva = campanyaActual;
}

function canviarCampanyaLiquidacio(campanya) {
    liquidacioCampanyaActiva = parseInt(campanya);
    carregarLlistaLiquidacions();
}

async function carregarLlistaLiquidacions() {
    const contenidor = document.getElementById('llista-liquidacions');
    try {
        const liquidacions = await getLiquidacions({ campanya: liquidacioCampanyaActiva });

        if (liquidacions.length === 0) {
            contenidor.innerHTML = '<p class="text-muted">No hi ha liquidacions per aquesta campanya.</p>';
            return;
        }

        contenidor.innerHTML = liquidacions.map(liq => renderCardLiquidacio(liq)).join('');
    } catch (error) {
        contenidor.innerHTML = '<p class="text-error">Error carregant liquidacions.</p>';
        console.error(error);
    }
}

function renderCardLiquidacio(liq) {
    const fruita = (typeof fruites !== 'undefined' ? fruites.find(f => f.id === liq.fruita_id) : null);
    const varietat = (typeof varietats !== 'undefined' ? varietats.find(v => v.id === liq.varietat_id) : null);
    const nomFruita = fruita ? fruita.nom : '—';
    const nomVarietat = varietat ? varietat.nom : 'Totes les varietats';
    const badgeEstat = liq.estat === 'tancada' ? 'badge-success' : 'badge-warning';

    return `
        <div class="card-liquidacio" onclick="obrirModalLiquidacio('${liq.id}')">
            <div class="card-liquidacio-header">
                <strong>${nomFruita} — ${nomVarietat}</strong>
                <span class="badge ${badgeEstat}">${liq.estat}</span>
            </div>
            <div class="card-liquidacio-body">
                <span>📅 ${formatData(liq.data_liquidacio)}</span>
                <span>⚖️ ${liq.kg_total} kg</span>
                <span>💶 Net: ${Number(liq.import_net).toFixed(2)} €</span>
            </div>
        </div>
    `;
}

// ============================================================
// MODAL CAPÇALERA + LÍNIES
// ============================================================

async function obrirModalLiquidacio(id = null) {
    liquidacioModalId = id;
    const liquidacio = id ? await getLiquidacio(id) : null;
    const linies = id ? await getLiquidacioLinies(id) : [];

    const opcionsFruites = (typeof fruites !== 'undefined' ? fruites : [])
        .map(f => `<option value="${f.id}" ${liquidacio?.fruita_id === f.id ? 'selected' : ''}>${f.nom}</option>`)
        .join('');

    const html = `
        <div class="modal-overlay" id="modal-liquidacio">
            <div class="modal-content modal-large">
                <h3>${id ? 'Editar' : 'Nova'} Liquidació</h3>

                <div class="form-grid">
                    <label>Campanya
                        <input type="number" id="liq-campanya" value="${liquidacio?.campanya || liquidacioCampanyaActiva}">
                    </label>
                    <label>Fruita
                        <select id="liq-fruita" onchange="onCanviFruitaLiquidacio()">
                            <option value="">-- Selecciona --</option>
                            ${opcionsFruites}
                        </select>
                    </label>
                    <label>Varietat
                        <select id="liq-varietat">
                            <option value="">Totes / no aplica</option>
                        </select>
                    </label>
                    <label>Data liquidació
                        <input type="date" id="liq-data" value="${liquidacio?.data_liquidacio || ''}">
                    </label>
                    <label>Import bestretes (€)
                        <input type="number" step="0.01" id="liq-bestretes" value="${liquidacio?.import_bestretes || 0}">
                        <button type="button" class="btn-link" onclick="proposarImportBestretes()">↻ Proposar</button>
                    </label>
                    <label>Estat
                        <select id="liq-estat">
                            <option value="provisional" ${liquidacio?.estat === 'provisional' ? 'selected' : ''}>Provisional</option>
                            <option value="tancada" ${liquidacio?.estat === 'tancada' ? 'selected' : ''}>Tancada</option>
                        </select>
                    </label>
                </div>
                <label>Notes
                    <textarea id="liq-notes">${liquidacio?.notes || ''}</textarea>
                </label>

                ${liquidacio ? `
                <div class="totals-resum">
                    <span>Kg total: <strong>${liquidacio.kg_total}</strong></span>
                    <span>Import brut: <strong>${Number(liquidacio.import_brut).toFixed(2)} €</strong></span>
                    <span>Net a pagar: <strong>${Number(liquidacio.import_net).toFixed(2)} €</strong></span>
                </div>

                <div class="linies-header">
                    <h4>Línies (calibre / qualitat / preu)</h4>
                    <div>
                        <button class="btn btn-secondary" onclick="generarLiniesDesEscandall()">⚙️ Generar des d'escandalls</button>
                        <button class="btn btn-secondary" onclick="afegirLiniaManualForm()">+ Línia manual</button>
                    </div>
                </div>
                <table class="taula-linies">
                    <thead>
                        <tr><th>Qualitat</th><th>Calibre</th><th>FNC</th><th>Parcel·la</th><th>Kg</th><th>Preu/kg</th><th>Import</th><th></th></tr>
                    </thead>
                    <tbody id="taula-linies-body">
                        ${linies.map(l => renderFilaLinia(l)).join('')}
                    </tbody>
                </table>
                <div id="fila-nova-linia-container"></div>
                ` : '<p class="text-muted">Guarda la capçalera per poder afegir línies.</p>'}

                <div class="modal-actions">
                    <button class="btn" onclick="tancarModalLiquidacio()">Cancel·lar</button>
                    <button class="btn btn-primary" onclick="guardarCapcaleraLiquidacio()">Guardar capçalera</button>
                    ${id ? `<button class="btn btn-danger" onclick="confirmarEliminarLiquidacio('${id}')">Eliminar</button>` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);

    if (liquidacio?.fruita_id) {
        await onCanviFruitaLiquidacio(liquidacio.varietat_id);
    }
}

function renderFilaLinia(l) {
    return `
        <tr data-linia-id="${l.id}">
            <td>${l.qualitat_nom}</td>
            <td>${l.calibre || '—'}</td>
            <td>${l.fnc_tipus || '—'}</td>
            <td>${l.parcella_id ? '📍' : '—'}</td>
            <td>${l.kg}</td>
            <td>${Number(l.preu_unitari).toFixed(4)} €</td>
            <td>${Number(l.import).toFixed(2)} €</td>
            <td><button class="btn-icon" onclick="eliminarLinia('${l.id}')">🗑️</button></td>
        </tr>
    `;
}

function tancarModalLiquidacio() {
    document.getElementById('modal-liquidacio')?.remove();
    liquidacioModalId = null;
}

async function onCanviFruitaLiquidacio(varietatSeleccionada = null) {
    const fruitaId = document.getElementById('liq-fruita').value;
    const selectVarietat = document.getElementById('liq-varietat');
    if (!fruitaId || typeof varietats === 'undefined') return;

    const varietatsFruita = varietats.filter(v => v.fruita_id === fruitaId);
    selectVarietat.innerHTML = '<option value="">Totes / no aplica</option>' +
        varietatsFruita.map(v => `<option value="${v.id}" ${varietatSeleccionada === v.id ? 'selected' : ''}>${v.nom}</option>`).join('');
}

// ============================================================
// GUARDAR CAPÇALERA
// ============================================================

async function guardarCapcaleraLiquidacio() {
    const dades = {
        campanya: parseInt(document.getElementById('liq-campanya').value),
        fruita_id: document.getElementById('liq-fruita').value,
        varietat_id: document.getElementById('liq-varietat').value || null,
        data_liquidacio: document.getElementById('liq-data').value,
        import_bestretes: parseFloat(document.getElementById('liq-bestretes').value) || 0,
        estat: document.getElementById('liq-estat').value,
        notes: document.getElementById('liq-notes').value
    };

    if (!dades.fruita_id || !dades.data_liquidacio) {
        mostrarNotificacio('Fruita i data de liquidació són obligatoris', 'warning');
        return;
    }

    try {
        if (liquidacioModalId) {
            await updateLiquidacio(liquidacioModalId, dades);
            mostrarNotificacio('Liquidació actualitzada', 'success');
        } else {
            const nova = await createLiquidacio(dades);
            mostrarNotificacio('Liquidació creada. Ara pots afegir línies.', 'success');
            liquidacioModalId = nova.id;
        }
        tancarModalLiquidacio();
        await obrirModalLiquidacio(liquidacioModalId);
        await carregarLlistaLiquidacions();
    } catch (error) {
        mostrarNotificacio('Error guardant la liquidació: ' + error.message, 'error');
        console.error(error);
    }
}

async function confirmarEliminarLiquidacio(id) {
    if (!confirm('Segur que vols eliminar aquesta liquidació i totes les seves línies?')) return;
    try {
        await deleteLiquidacio(id);
        mostrarNotificacio('Liquidació eliminada', 'success');
        tancarModalLiquidacio();
        await carregarLlistaLiquidacions();
    } catch (error) {
        mostrarNotificacio('Error eliminant: ' + error.message, 'error');
    }
}

// ============================================================
// PROPOSTA AUTOMÀTICA D'IMPORT BESTRETES
// ⚠️ VERIFICAR noms de columnes reals de collita_bestretes / collita_bestretes_linies
// ============================================================

async function proposarImportBestretes() {
    const campanya = parseInt(document.getElementById('liq-campanya').value);
    const fruitaId = document.getElementById('liq-fruita').value;

    if (!campanya || !fruitaId) {
        mostrarNotificacio('Selecciona campanya i fruita primer', 'warning');
        return;
    }

    try {
        // ⚠️ VERIFICAR: assumeix taula collita_bestretes amb camps
        // campanya, fruita_id, import_total, estat ('confirmada')
        const { data, error } = await supabaseClient
            .from('collita_bestretes')
            .select('import_total')
            .eq('campanya', campanya)
            .eq('fruita_id', fruitaId)
            .eq('estat', 'confirmada');

        if (error) throw error;

        const total = (data || []).reduce((sum, b) => sum + Number(b.import_total || 0), 0);
        document.getElementById('liq-bestretes').value = total.toFixed(2);
        mostrarNotificacio(`Proposat: ${total.toFixed(2)} € (revisa abans de guardar)`, 'info');
    } catch (error) {
        mostrarNotificacio('No s\'ha pogut calcular la proposta de bestretes: ' + error.message, 'error');
        console.error(error);
    }
}

// ============================================================
// GENERAR LÍNIES DES D'ESCANDALLS
// ⚠️ VERIFICAR noms de columnes reals de collita_escandall_calibres,
// collita_escandall_no_comercial, collita_escandall_industria
// (s'assumeix: escandall_id → collita_escandall, i que collita_escandall
// té camps campanya, fruita_id, varietat_id)
// ============================================================

async function generarLiniesDesEscandall() {
    if (!liquidacioModalId) {
        mostrarNotificacio('Guarda primer la capçalera', 'warning');
        return;
    }
    const campanya = parseInt(document.getElementById('liq-campanya').value);
    const fruitaId = document.getElementById('liq-fruita').value;
    const varietatId = document.getElementById('liq-varietat').value || null;

    if (!confirm('Això afegirà línies noves agregades des dels escandalls d\'aquesta campanya/varietat. Continuar?')) return;

    try {
        // 1. Escandalls de la campanya+fruita(+varietat)
        let queryEsc = supabaseClient
            .from('collita_escandall')
            .select('id')
            .eq('campanya', campanya)
            .eq('fruita_id', fruitaId);
        if (varietatId) queryEsc = queryEsc.eq('varietat_id', varietatId);
        const { data: escandalls, error: errEsc } = await queryEsc;
        if (errEsc) throw errEsc;

        if (!escandalls || escandalls.length === 0) {
            mostrarNotificacio('No s\'han trobat escandalls per aquesta campanya/varietat', 'warning');
            return;
        }
        const escandallIds = escandalls.map(e => e.id);

        // 2. Línies de calibre agregades per qualitat+calibre
        const { data: calibres, error: errCal } = await supabaseClient
            .from('collita_escandall_calibres')
            .select('*')
            .in('escandall_id', escandallIds);
        if (errCal) throw errCal;

        // 3. Preus configurats per varietat
        const { data: preus, error: errPreu } = await supabaseClient
            .from('collita_preus_liquidacio_calibres')
            .select('*')
            .eq('fruita_varietat_id', varietatId || fruitaId);
        if (errPreu) throw errPreu;

        // 4. Agregar kg per qualitat+calibre i crear línies
        const agregats = {};
        for (const c of (calibres || [])) {
            const clau = `${c.qualitat_nom}|${c.calibre}`;
            if (!agregats[clau]) {
                agregats[clau] = { qualitat_nom: c.qualitat_nom, calibre: c.calibre, kg: 0 };
            }
            agregats[clau].kg += Number(c.kg || 0);
        }

        let liniesCreades = 0;
        for (const clau in agregats) {
            const ag = agregats[clau];
            const preuConfig = (preus || []).find(p => p.calibre === ag.calibre);
            const preuUnitari = preuConfig ? preuConfig.preu_unitari : 0;

            if (!preuConfig) {
                console.warn(`Sense preu configurat per calibre ${ag.calibre}, línia creada amb preu 0 — cal editar manualment.`);
            }

            await createLiquidacioLinia({
                liquidacio_id: liquidacioModalId,
                qualitat_nom: ag.qualitat_nom,
                calibre: ag.calibre,
                kg: ag.kg,
                preu_unitari: preuUnitari,
                origen_escandall_id: null, // agregat, no lligat a un escandall concret
                editat_manualment: false
            });
            liniesCreades++;
        }

        mostrarNotificacio(`${liniesCreades} línies generades des dels escandalls`, 'success');
        tancarModalLiquidacio();
        await obrirModalLiquidacio(liquidacioModalId);
    } catch (error) {
        mostrarNotificacio('Error generant línies des d\'escandalls: ' + error.message, 'error');
        console.error(error);
    }
}

// ============================================================
// LÍNIA MANUAL
// ============================================================

function afegirLiniaManualForm() {
    const container = document.getElementById('fila-nova-linia-container');
    container.innerHTML = `
        <div class="fila-nova-linia">
            <input type="text" id="nova-linia-qualitat" placeholder="Qualitat (ex: PRIMERES)">
            <input type="text" id="nova-linia-calibre" placeholder="Calibre (ex: 73-80)">
            <input type="text" id="nova-linia-fnc" placeholder="FNC (opcional)">
            <input type="number" step="0.01" id="nova-linia-kg" placeholder="Kg">
            <input type="number" step="0.0001" id="nova-linia-preu" placeholder="Preu/kg">
            <button class="btn btn-primary" onclick="guardarLiniaManual()">Afegir</button>
            <button class="btn" onclick="document.getElementById('fila-nova-linia-container').innerHTML=''">Cancel·lar</button>
        </div>
    `;
}

async function guardarLiniaManual() {
    const qualitat = document.getElementById('nova-linia-qualitat').value.trim();
    const kg = parseFloat(document.getElementById('nova-linia-kg').value);
    const preu = parseFloat(document.getElementById('nova-linia-preu').value);

    if (!qualitat || isNaN(kg) || isNaN(preu)) {
        mostrarNotificacio('Qualitat, kg i preu són obligatoris', 'warning');
        return;
    }

    try {
        await createLiquidacioLinia({
            liquidacio_id: liquidacioModalId,
            qualitat_nom: qualitat,
            calibre: document.getElementById('nova-linia-calibre').value.trim() || null,
            fnc_tipus: document.getElementById('nova-linia-fnc').value.trim() || null,
            kg: kg,
            preu_unitari: preu,
            editat_manualment: true
        });
        mostrarNotificacio('Línia afegida', 'success');
        tancarModalLiquidacio();
        await obrirModalLiquidacio(liquidacioModalId);
    } catch (error) {
        mostrarNotificacio('Error afegint línia: ' + error.message, 'error');
        console.error(error);
    }
}

async function eliminarLinia(liniaId) {
    if (!confirm('Eliminar aquesta línia?')) return;
    try {
        await deleteLiquidacioLinia(liniaId);
        mostrarNotificacio('Línia eliminada', 'success');
        tancarModalLiquidacio();
        await obrirModalLiquidacio(liquidacioModalId);
    } catch (error) {
        mostrarNotificacio('Error eliminant línia: ' + error.message, 'error');
    }
}

console.log('✅ Liquidacions UI v1 carregat');
