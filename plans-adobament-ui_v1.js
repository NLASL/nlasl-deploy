// ============================================================
// PLANS ADOBAMENT - UI v1
// Vista principal, modal nou pla, detall amb línies en edició
// (patró "staging" com a Compres: edició en memòria + X per
// descartar files + un únic botó Guardar que persisteix tot)
// Requereix: plans-adobament_v1.js (lògica CRUD + candidats)
// ============================================================

let plansAdobamentCache = [];
let plaAdobamentActual = null;
let liniesPlaOriginals = [];   // tal com són a la BD (per detectar eliminacions)
let liniesPlaStaging = [];     // còpia editable en memòria (encara no guardada)

// ============================================================
// ENTRADA DE VISTA
// (afegir a canviarVista(): case 'plans-adobament': carregarVistaPlansAdobament(); break;)
// ============================================================

async function carregarVistaPlansAdobament() {
    const container = document.getElementById('content-area');
    container.innerHTML = '<p>⏳ Carregant plans d\'adobament...</p>';
    try {
        plansAdobamentCache = await getPlansAdobament();
        mostrarLlistaPlansAdobament();
    } catch (error) {
        mostrarNotificacio('Error carregant plans d\'adobament: ' + error.message, 'error');
        container.innerHTML = '<p style="color:#c00;">Error carregant les dades.</p>';
    }
}

function mostrarLlistaPlansAdobament() {
    const container = document.getElementById('content-area');

    let html = '<h2>🌱 Plans d\'Adobament</h2>';
    html += '<p style="color:#666; font-size:13px; margin-bottom:20px;">RD 1051/2022 — Pla d\'adobament en regadiu. Un pla per campanya, corregible per circumstàncies sobrevingudes (sequera, calamarsada, pluja excessiva...).</p>';

    if (hasPermission('insert')) {
        html += '<button class="btn-primary" onclick="obrirModalNouPlaAdobament()" style="margin-bottom:20px;">➕ Nou Pla</button>';
    }

    if (plansAdobamentCache.length === 0) {
        html += '<p style="color:#999;">No hi ha cap pla d\'adobament creat encara.</p>';
        container.innerHTML = html;
        return;
    }

    html += '<table class="taula-dades"><thead><tr>';
    html += '<th>Campanya</th><th>Nom</th><th>Assessor tècnic</th><th>Data elaboració</th><th>Estat</th><th>Accions</th>';
    html += '</tr></thead><tbody>';

    plansAdobamentCache.forEach(pla => {
        const estatColor = pla.estat === 'validat' ? '#2e7d32' : (pla.estat === 'presentat' ? '#1565c0' : '#999');
        html += '<tr>';
        html += '<td><strong>' + pla.campanya + '</strong></td>';
        html += '<td>' + (pla.nom || '-') + '</td>';
        html += '<td>' + (pla.assessor_tecnic || '<span style="color:#c00;">Pendent</span>') + '</td>';
        html += '<td>' + (pla.data_elaboracio ? formatData(pla.data_elaboracio) : '-') + '</td>';
        html += '<td><span style="color:' + estatColor + '; font-weight:bold;">' + (pla.estat || 'esborrany') + '</span></td>';
        html += '<td>';
        html += '<button class="btn-secondary" onclick="obrirDetallPlaAdobament(\'' + pla.id + '\')">📋 Obrir</button> ';
        if (hasPermission('delete')) {
            html += '<button class="btn-danger" onclick="eliminarPlaAdobamentAccio(\'' + pla.id + '\')">🗑️</button>';
        }
        html += '</td>';
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ============================================================
// MODAL NOU PLA
// ============================================================

function obrirModalNouPlaAdobament() {
    const campanyaDefecte = (typeof obtenirCampanyaActual === 'function') ? obtenirCampanyaActual() : new Date().getFullYear();

    let html = '<div class="modal-overlay" id="modal-nou-pla-adobament">';
    html += '<div class="modal-content">';
    html += '<h3>➕ Nou Pla d\'Adobament</h3>';
    html += '<div class="form-group"><label>Campanya *</label><input type="number" id="pla-campanya" value="' + campanyaDefecte + '" required></div>';
    html += '<div class="form-group"><label>Nom (opcional)</label><input type="text" id="pla-nom" placeholder="Pla adobament ' + campanyaDefecte + '"></div>';
    html += '<div class="form-group"><label>Assessor tècnic</label><input type="text" id="pla-assessor" placeholder="Nom i núm. col·legiat"></div>';
    html += '<div class="form-group"><label>Data elaboració</label><input type="date" id="pla-data-elaboracio"></div>';
    html += '<div class="form-group"><label>Observacions</label><textarea id="pla-observacions" rows="3"></textarea></div>';
    html += '<div class="modal-actions">';
    html += '<button class="btn-primary" onclick="guardarNouPlaAdobament()">Guardar</button>';
    html += '<button class="btn-secondary" onclick="tancarModal(\'modal-nou-pla-adobament\')">Cancel·lar</button>';
    html += '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

async function guardarNouPlaAdobament() {
    const campanya = parseInt(document.getElementById('pla-campanya').value);
    if (!campanya) {
        mostrarNotificacio('La campanya és obligatòria', 'warning');
        return;
    }

    const pla = {
        campanya: campanya,
        nom: document.getElementById('pla-nom').value || null,
        assessor_tecnic: document.getElementById('pla-assessor').value || null,
        data_elaboracio: document.getElementById('pla-data-elaboracio').value || null,
        observacions: document.getElementById('pla-observacions').value || null,
        estat: 'esborrany'
    };

    try {
        const nouPla = await createPlaAdobament(pla);
        tancarModal('modal-nou-pla-adobament');
        mostrarNotificacio('Pla d\'adobament creat correctament', 'success');
        await carregarVistaPlansAdobament();
        obrirDetallPlaAdobament(nouPla.id);
    } catch (error) {
        mostrarNotificacio('Error creant el pla: ' + error.message, 'error');
    }
}

async function eliminarPlaAdobamentAccio(id) {
    if (!confirm('Segur que vols eliminar aquest pla d\'adobament? Aquesta acció es pot desfer contactant amb l\'administrador.')) return;
    try {
        await deletePlaAdobament(id);
        mostrarNotificacio('Pla eliminat', 'success');
        await carregarVistaPlansAdobament();
    } catch (error) {
        mostrarNotificacio('Error eliminant el pla: ' + error.message, 'error');
    }
}

// ============================================================
// DETALL DEL PLA — LÍNIES EN EDICIÓ (STAGING)
// ============================================================

async function obrirDetallPlaAdobament(plaId) {
    const container = document.getElementById('content-area');
    container.innerHTML = '<p>⏳ Carregant pla...</p>';

    try {
        plaAdobamentActual = await getPlaAdobament(plaId);
        liniesPlaOriginals = await getLiniesPla(plaId);
        // Còpia profunda per a l'edició en memòria — no toca la BD fins a "Guardar"
        liniesPlaStaging = liniesPlaOriginals.map(l => ({ ...l, aplicacions_previstes: l.aplicacions_previstes ? [...l.aplicacions_previstes] : [] }));
        mostrarDetallPlaAdobament();
    } catch (error) {
        mostrarNotificacio('Error carregant el pla: ' + error.message, 'error');
    }
}

function hiHaCanvisPendents() {
    // Hi ha canvis si el nombre de línies difereix, o si hi ha alguna sense id (nova)
    if (liniesPlaStaging.length !== liniesPlaOriginals.length) return true;
    if (liniesPlaStaging.some(l => !l.id)) return true;
    return JSON.stringify(liniesPlaStaging) !== JSON.stringify(liniesPlaOriginals.map(l => ({ ...l })));
}

function mostrarDetallPlaAdobament() {
    const container = document.getElementById('content-area');
    const pla = plaAdobamentActual;
    const linies = liniesPlaStaging;
    const resum = calcularResumPla(linies);
    const pendent = hiHaCanvisPendents();

    let html = '<button class="btn-secondary" onclick="tornarLlistaPlansAmbAvis()" style="margin-bottom:15px;">⬅️ Tornar al llistat</button>';
    html += '<h2>🌱 Pla d\'Adobament — Campanya ' + pla.campanya + '</h2>';

    // Capçalera resum
    html += '<div style="display:flex; gap:15px; margin-bottom:20px; flex-wrap:wrap;">';
    html += statCardAdobament('📏', resum.superficieTotal.toFixed(2) + ' Ha', 'Superfície regadiu');
    html += statCardAdobament('🌿', resum.numLinies, 'Parcel·les al pla');
    html += statCardAdobament('N', resum.nTotalKg.toFixed(0) + ' kg', 'Nitrogen total');
    html += statCardAdobament('P₂O₅', resum.pTotalKg.toFixed(0) + ' kg', 'Fòsfor total');
    html += statCardAdobament('K₂O', resum.kTotalKg.toFixed(0) + ' kg', 'Potassi total');
    if (resum.liniesSenseSol > 0) {
        html += statCardAdobament('⚠️', resum.liniesSenseSol, 'Sense dades de sòl', '#e65100');
    }
    html += '</div>';

    // Dades capçalera del pla
    html += '<div class="card" style="margin-bottom:20px; padding:15px;">';
    html += '<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px;">';
    html += '<div><label style="display:block; font-size:12px; color:#666;">Assessor tècnic</label>';
    html += '<input type="text" value="' + (pla.assessor_tecnic || '') + '" onblur="guardarCampCapcaleraPla(\'assessor_tecnic\', this.value)"></div>';
    html += '<div><label style="display:block; font-size:12px; color:#666;">Data elaboració</label>';
    html += '<input type="date" value="' + (pla.data_elaboracio || '') + '" onchange="guardarCampCapcaleraPla(\'data_elaboracio\', this.value)"></div>';
    html += '<div><label style="display:block; font-size:12px; color:#666;">Estat</label>';
    html += '<select onchange="guardarCampCapcaleraPla(\'estat\', this.value)">';
    ['esborrany', 'validat', 'presentat'].forEach(e => {
        html += '<option value="' + e + '"' + (pla.estat === e ? ' selected' : '') + '>' + e + '</option>';
    });
    html += '</select></div>';
    html += '</div></div>';
    // Nota: la capçalera del pla (assessor/data/estat) es continua desant a l'instant (onblur),
    // ja que no forma part de les línies en edició. Només les línies segueixen el patró staging.

    // Accions
    html += '<div style="margin-bottom:15px; display:flex; align-items:center; gap:10px;">';
    html += '<button class="btn-secondary" onclick="afegirCandidatsLiniesPlaAccio(\'' + pla.id + '\', ' + pla.campanya + ')">⚙️ Afegir línies (parcel·les regadiu)</button>';
    html += '<button class="btn-secondary" onclick="obrirSelectorAfegirParcellaManual()">➕ Afegir parcel·la manualment</button>';
    html += '<button class="btn-secondary" onclick="exportarResumPlaAdobamentCSV()">📥 Exportar CSV</button>';
    html += '<div style="flex:1;"></div>';
    html += '<button class="btn-primary" onclick="guardarLiniesPlaAccio()"' + (pendent ? '' : ' disabled') + '>💾 Guardar canvis' + (pendent ? ' <span style="color:#ffeb3b;">●</span>' : '') + '</button>';
    html += '</div>';

    if (pendent) {
        html += '<p style="color:#e65100; font-size:12px; margin-top:-10px; margin-bottom:15px;">⚠️ Tens canvis sense guardar a les línies.</p>';
    }

    if (linies.length === 0) {
        html += '<p style="color:#999;">Aquest pla encara no té línies. Prem "Afegir línies" per proposar-les a partir de les parcel·les de regadiu de la campanya ' + pla.campanya + '.</p>';
        container.innerHTML = html;
        return;
    }

    // Taula de línies (edició en memòria)
    html += '<div style="overflow-x:auto;"><table class="taula-dades" style="min-width:1450px;"><thead><tr>';
    html += '<th>Parcel·la</th><th>Cultiu/Var.</th><th>Ha</th>';
    html += '<th>Cultiu precedent</th>';
    html += '<th>pH</th><th>N sòl</th><th>P sòl</th><th>K sòl</th><th>M.O. %</th>';
    html += '<th>N nec. (kg/ha)</th><th>P nec. (kg/ha)</th><th>K nec. (kg/ha)</th>';
    html += '<th>Tipus adob</th><th>Mesures reducció emissions</th><th></th>';
    html += '</tr></thead><tbody>';

    linies.forEach((linia, index) => {
        const p = linia.parcelles || {};
        const esNova = !linia.id;
        html += '<tr' + (esNova ? ' style="background:#f0f7ff;"' : '') + '>';
        html += '<td>' + (p.nom || '-') + (esNova ? ' <span style="font-size:10px; color:#1565c0;">(nova)</span>' : '') + (p.finca ? '<br><small style="color:#999;">' + p.finca + '</small>' : '') + '</td>';
        html += '<td>' + (p.cultiu || '-') + '<br><small>' + (p.varietat || '') + '</small></td>';
        html += '<td>' + (p.superficie || '-') + '</td>';

        // Cultiu precedent + suggeriment (el suggeriment només emplena el camp en memòria)
        html += '<td>';
        html += '<input type="text" value="' + (linia.cultiu_precedent || '') + '" style="width:110px;" ';
        html += 'oninput="actualitzarCampStaging(' + index + ', \'cultiu_precedent\', this.value)">';
        html += '<br><a href="#" style="font-size:11px;" onclick="suggerirPrecedentAccio(' + index + '); return false;">🔍 suggerir</a>';
        html += '<div id="suggeriments-' + index + '"></div>';
        html += '</td>';

        html += campEditableNumeric(index, 'ph', linia.ph, 60);
        html += campEditableNumeric(index, 'n_sol', linia.n_sol, 60);
        html += campEditableNumeric(index, 'p_sol', linia.p_sol, 60);
        html += campEditableNumeric(index, 'k_sol', linia.k_sol, 60);
        html += campEditableNumeric(index, 'materia_organica', linia.materia_organica, 60);

        html += campEditableNumeric(index, 'n_necessari', linia.n_necessari, 70);
        html += campEditableNumeric(index, 'p_necessari', linia.p_necessari, 70);
        html += campEditableNumeric(index, 'k_necessari', linia.k_necessari, 70);

        const tipusAdobActual = (linia.aplicacions_previstes && linia.aplicacions_previstes[0] && linia.aplicacions_previstes[0].tipus_adob) || '';
        html += '<td><input type="text" value="' + tipusAdobActual + '" placeholder="tipus adob" style="width:110px;" ';
        html += 'oninput="actualitzarTipusAdobStaging(' + index + ', this.value)"></td>';
        html += '<td><input type="text" value="' + (linia.mesures_emissions || '') + '" placeholder="p.ex. incorporació &lt;4h" style="width:130px;" ';
        html += 'oninput="actualitzarCampStaging(' + index + ', \'mesures_emissions\', this.value)"></td>';

        html += '<td><button type="button" onclick="eliminarLiniaStagingAccio(' + index + ')" ';
        html += 'style="background:none;border:none;color:#f44336;cursor:pointer;font-size:16px;" title="Descartar línia">✕</button></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    html += '<div style="margin-top:15px; display:flex; justify-content:flex-end;">';
    html += '<button class="btn-primary" onclick="guardarLiniesPlaAccio()"' + (pendent ? '' : ' disabled') + '>💾 Guardar canvis</button>';
    html += '</div>';

    container.innerHTML = html;
}

function tornarLlistaPlansAmbAvis() {
    if (hiHaCanvisPendents() && !confirm('Tens canvis sense guardar. Vols sortir igualment i perdre\'ls?')) return;
    carregarVistaPlansAdobament();
}

function statCardAdobament(icona, valor, etiqueta, color) {
    return '<div class="stat-card"><div class="stat-icon">' + icona + '</div>' +
        '<div class="stat-info"><div class="stat-value"' + (color ? ' style="color:' + color + ';"' : '') + '>' + valor + '</div>' +
        '<div class="stat-label">' + etiqueta + '</div></div></div>';
}

function campEditableNumeric(index, camp, valor, amplada) {
    return '<td><input type="number" step="0.01" value="' + (valor === null || valor === undefined ? '' : valor) + '" ' +
        'style="width:' + amplada + 'px;" ' +
        'oninput="actualitzarCampStaging(' + index + ', \'' + camp + '\', this.value)"></td>';
}

// ============================================================
// EDICIÓ EN MEMÒRIA (STAGING) — cap crida a la BD fins a "Guardar"
// ============================================================

function actualitzarCampStaging(index, camp, valorRaw) {
    const campsNumerics = ['ph', 'n_sol', 'p_sol', 'k_sol', 'materia_organica', 'n_necessari', 'p_necessari', 'k_necessari', 'rendiment_esperat'];
    const valor = campsNumerics.includes(camp)
        ? (valorRaw === '' ? null : parseFloat(valorRaw))
        : (valorRaw || null);

    liniesPlaStaging[index][camp] = valor;
    actualitzarEstatBotoGuardar();
}

function actualitzarTipusAdobStaging(index, valor) {
    liniesPlaStaging[index].aplicacions_previstes = valor ? [{ tipus_adob: valor }] : [];
    actualitzarEstatBotoGuardar();
}

function eliminarLiniaStagingAccio(index) {
    const linia = liniesPlaStaging[index];
    const nomParcella = (linia.parcelles && linia.parcelles.nom) || 'aquesta parcel·la';
    if (!confirm('Descartar la línia de ' + nomParcella + '? No s\'aplicarà fins que premis "Guardar canvis".')) return;
    liniesPlaStaging.splice(index, 1);
    mostrarDetallPlaAdobament();
}

/**
 * Actualitza només l'estat visual del botó Guardar sense re-renderitzar
 * tota la taula (per no perdre el focus mentre s'escriu).
 */
function actualitzarEstatBotoGuardar() {
    document.querySelectorAll('[onclick^="guardarLiniesPlaAccio"]').forEach(btn => {
        btn.removeAttribute('disabled');
        if (!btn.innerHTML.includes('●')) {
            btn.innerHTML = btn.innerHTML.replace('Guardar canvis', 'Guardar canvis <span style="color:#ffeb3b;">●</span>');
        }
    });
}

// ============================================================
// GUARDAT DE LA CAPÇALERA DEL PLA (aquest sí, a l'instant)
// ============================================================

async function guardarCampCapcaleraPla(camp, valor) {
    try {
        const canvi = {};
        canvi[camp] = valor || null;
        await updatePlaAdobament(plaAdobamentActual.id, canvi);
        plaAdobamentActual[camp] = valor || null;
        mostrarNotificacio('Desat', 'success');
    } catch (error) {
        mostrarNotificacio('Error desant: ' + error.message, 'error');
    }
}

// ============================================================
// GUARDAR TOT (persisteix el staging: insert/update/delete en bloc)
// ============================================================

async function guardarLiniesPlaAccio() {
    if (!hiHaCanvisPendents()) {
        mostrarNotificacio('No hi ha canvis per guardar', 'info');
        return;
    }

    const boto = event ? event.target.closest('button') : null;
    if (boto) { boto.disabled = true; boto.textContent = '⏳ Guardant...'; }

    try {
        const resultat = await guardarLiniesPla(plaAdobamentActual.id, liniesPlaStaging, liniesPlaOriginals);

        let missatge = 'Canvis guardats: ';
        const parts = [];
        if (resultat.creades) parts.push(resultat.creades + ' noves');
        if (resultat.actualitzades) parts.push(resultat.actualitzades + ' actualitzades');
        if (resultat.eliminades) parts.push(resultat.eliminades + ' eliminades');
        missatge += parts.length ? parts.join(', ') : 'cap canvi';
        mostrarNotificacio(missatge, 'success');

        // Recarregar des de la BD per tenir ids reals a les línies noves
        await obrirDetallPlaAdobament(plaAdobamentActual.id);
    } catch (error) {
        mostrarNotificacio('Error guardant els canvis: ' + error.message, 'error');
        mostrarDetallPlaAdobament();
    }
}

// ============================================================
// AFEGIR CANDIDATS (proposta automàtica, s'afegeixen al staging sense guardar)
// ============================================================

async function afegirCandidatsLiniesPlaAccio(plaId, campanya) {
    const boto = event ? event.target : null;
    if (boto) { boto.disabled = true; boto.textContent = '⏳ Cercant parcel·les...'; }

    try {
        const resultat = await obtenirCandidatsLiniesPla(plaId, campanya);

        if (resultat.candidats.length === 0) {
            mostrarNotificacio('No hi ha parcel·les noves per afegir (totes ja són al pla, o cap coincideix).', 'info');
        } else {
            liniesPlaStaging = liniesPlaStaging.concat(resultat.candidats);
            mostrarNotificacio(resultat.candidats.length + ' línies proposades afegides (revisa-les i prem "Guardar canvis").', 'success');
        }

        if (resultat.senseNpk && resultat.senseNpk.length > 0) {
            const llista = resultat.senseNpk.map(p => p.nom + ' (' + p.cultiu + ' / ' + p.varietat + ')').join('\n');
            alert('⚠️ ' + resultat.senseNpk.length + ' parcel·les no tenen valor NPK de referència i s\'han omès.\n' +
                'Cal afegir un àlies a npk_alies_varietat o revisar-ne el cultiu/varietat:\n\n' + llista);
        }

        mostrarDetallPlaAdobament();
    } catch (error) {
        mostrarNotificacio('Error cercant parcel·les: ' + error.message, 'error');
        if (boto) { boto.disabled = false; boto.textContent = '⚙️ Afegir línies (parcel·les regadiu)'; }
    }
}

// ============================================================
// AFEGIR PARCEL·LA MANUALMENT (per casos sense NPK automàtic)
// ============================================================

async function obrirSelectorAfegirParcellaManual() {
    try {
        const { data: parcelles, error } = await supabaseClient
            .from('parcelles')
            .select('*')
            .eq('actiu', true)
            .eq('regadiu', true)
            .eq('campanya', plaAdobamentActual.campanya)
            .order('finca').order('nom');
        if (error) throw error;

        const jaAlPla = new Set(liniesPlaStaging.map(l => l.parcella_id));
        const disponibles = parcelles.filter(p => !jaAlPla.has(p.id));

        if (disponibles.length === 0) {
            mostrarNotificacio('Totes les parcel·les de regadiu ja són al pla', 'info');
            return;
        }

        let html = '<div class="modal-overlay" id="modal-afegir-parcella-manual">';
        html += '<div class="modal-content">';
        html += '<h3>➕ Afegir parcel·la manualment</h3>';
        html += '<div class="form-group"><label>Parcel·la</label><select id="select-parcella-manual">';
        disponibles.forEach(p => {
            html += '<option value="' + p.id + '">' + p.nom + ' — ' + p.cultiu + (p.varietat ? '/' + p.varietat : '') + ' (' + p.superficie + ' Ha)</option>';
        });
        html += '</select></div>';
        html += '<div class="modal-actions">';
        html += '<button class="btn-primary" onclick="confirmarAfegirParcellaManual(' + JSON.stringify(disponibles).replace(/"/g, '&quot;') + ')">Afegir</button>';
        html += '<button class="btn-secondary" onclick="tancarModal(\'modal-afegir-parcella-manual\')">Cancel·lar</button>';
        html += '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);
    } catch (error) {
        mostrarNotificacio('Error carregant parcel·les: ' + error.message, 'error');
    }
}

function confirmarAfegirParcellaManual(disponibles) {
    const parcellaId = document.getElementById('select-parcella-manual').value;
    const parcella = disponibles.find(p => p.id === parcellaId);
    if (!parcella) return;

    liniesPlaStaging.push({
        _key: 'manual-' + parcella.id,
        pla_id: plaAdobamentActual.id,
        parcella_id: parcella.id,
        cultiu: parcella.cultiu,
        rendiment_esperat: null,
        n_necessari: null, p_necessari: null, k_necessari: null,
        ph: null, n_sol: null, p_sol: null, k_sol: null, materia_organica: null,
        cultiu_precedent: null, mesures_emissions: null, aplicacions_previstes: [],
        parcelles: parcella
    });

    tancarModal('modal-afegir-parcella-manual');
    mostrarNotificacio('Parcel·la afegida (sense NPK de referència, omple-ho manualment). Prem "Guardar canvis" per confirmar.', 'info');
    mostrarDetallPlaAdobament();
}

// ============================================================
// SUGGERIMENT DE CULTIU PRECEDENT (opera sobre el staging, per índex)
// ============================================================

async function suggerirPrecedentAccio(index) {
    const contenidor = document.getElementById('suggeriments-' + index);
    contenidor.innerHTML = '<small>⏳ Cercant...</small>';

    try {
        const linia = liniesPlaStaging[index];
        const parcella = linia.parcelles;
        if (!parcella) {
            contenidor.innerHTML = '<small style="color:#c00;">Sense dades de parcel·la</small>';
            return;
        }

        const candidats = await suggerirCultiuPrecedent(parcella, plaAdobamentActual.campanya);

        if (candidats.length === 0) {
            contenidor.innerHTML = '<small style="color:#999;">Cap candidat trobat a la campanya anterior</small>';
            return;
        }

        let html = '<div style="border:1px solid #ddd; border-radius:4px; padding:6px; margin-top:4px; background:#fafafa;">';
        html += '<small style="color:#666;">Candidats campanya ' + (plaAdobamentActual.campanya - 1) + ':</small><br>';
        candidats.slice(0, 5).forEach(c => {
            const etiqueta = (c.cultiu + (c.varietat ? ' ' + c.varietat : '')).replace(/'/g, "\\'");
            html += '<a href="#" style="font-size:11px; display:block;" ';
            html += 'onclick="confirmarPrecedentAccio(' + index + ', \'' + etiqueta + '\'); return false;">';
            html += '✓ ' + c.cultiu + (c.varietat ? ' ' + c.varietat : '') + ' (' + c.nom + ', ' + c.superficie + ' Ha)';
            html += '</a>';
        });
        html += '</div>';
        contenidor.innerHTML = html;
    } catch (error) {
        contenidor.innerHTML = '<small style="color:#c00;">Error: ' + error.message + '</small>';
    }
}

function confirmarPrecedentAccio(index, valor) {
    liniesPlaStaging[index].cultiu_precedent = valor;
    document.getElementById('suggeriments-' + index).innerHTML = '';
    mostrarDetallPlaAdobament();
}

// ============================================================
// EXPORTACIÓ CSV
// ============================================================

function exportarResumPlaAdobamentCSV() {
    const pla = plaAdobamentActual;
    const linies = liniesPlaStaging;

    let csv = 'Parcel·la;Finca;Cultiu;Varietat;Superfície (Ha);Cultiu precedent;pH;N sòl;P sòl;K sòl;M.O.%;N necessari (kg/ha);P necessari (kg/ha);K necessari (kg/ha)\n';

    linies.forEach(l => {
        const p = l.parcelles || {};
        csv += [
            p.nom || '', p.finca || '', p.cultiu || '', p.varietat || '', p.superficie || '',
            l.cultiu_precedent || '', l.ph || '', l.n_sol || '', l.p_sol || '', l.k_sol || '',
            l.materia_organica || '', l.n_necessari || '', l.p_necessari || '', l.k_necessari || ''
        ].join(';') + '\n';
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pla_adobament_' + pla.campanya + '.csv';
    a.click();
    URL.revokeObjectURL(url);
}

console.log('✅ Plans adobament UI v1 carregat (patró staging)');
