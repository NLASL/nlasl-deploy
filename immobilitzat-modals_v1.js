// ============================================================
// IMMOBILITZAT MODALS v1
// Modals DETALL, NOU, EDITAR per a immobilitzat_material
// Camps: dades bàsiques + ROMA + ITV + ITEAF
// ============================================================

// ============================================================
// HELPERS
// ============================================================

function formatDataImm(dataStr) {
    if (!dataStr) return '—';
    const d = new Date(dataStr);
    return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatEuroImm(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    return parseFloat(valor).toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function badgeResultatInspeccio(resultat) {
    if (!resultat) return '<span style="color:#888;">—</span>';
    const ok = resultat === 'Favorable';
    return `<span style="background:${ok ? '#e8f5e9' : '#ffebee'};color:${ok ? '#2d7a2d' : '#c62828'};padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">
        ${ok ? '✅' : '❌'} ${resultat}
    </span>`;
}

function badgeRomaEstat(estat) {
    if (!estat) return '<span style="color:#888;">—</span>';
    const ok = estat === 'Alta';
    return `<span style="background:${ok ? '#e8f5e9' : '#ffebee'};color:${ok ? '#2d7a2d' : '#c62828'};padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">
        ${ok ? '✅' : '🔻'} ${estat}
    </span>`;
}

function alertaVenciment(dataStr, etiqueta) {
    if (!dataStr) return '';
    const avui = new Date();
    const data = new Date(dataStr);
    const diesRestants = Math.ceil((data - avui) / (1000 * 60 * 60 * 24));

    if (diesRestants < 0) {
        return `<span style="background:#ffebee;color:#c62828;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">⚠️ ${etiqueta} vençuda fa ${Math.abs(diesRestants)} dies</span>`;
    } else if (diesRestants <= 30) {
        return `<span style="background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">⏰ ${etiqueta} en ${diesRestants} dies</span>`;
    } else if (diesRestants <= 90) {
        return `<span style="background:#fffde7;color:#f57f17;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">📅 ${etiqueta} en ${diesRestants} dies</span>`;
    }
    return '';
}

function getTipusIconImm(tipus) {
    const icons = {
        'edifici': '🏢', 'infraestructura_reg': '💧', 'tractor': '🚜',
        'vehicle': '🚗', 'remolc': '🚛', 'maquinaria': '⚙️', 'altra': '📦'
    };
    return icons[tipus] || '📦';
}

// ============================================================
// SUPABASE CRUD — IMMOBILITZAT
// ============================================================

async function getImmobilitzatById(id) {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

async function createImmobilitzatMaterial(imm) {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .insert([imm])
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function updateImmobilitzatMaterial(id, imm) {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .update({ ...imm, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

// ============================================================
// MODAL DETALL IMMOBILITZAT
// ============================================================

async function obrirModalDetallImmobilitzat(id) {
    try {
        const existent = document.getElementById('modal-detall-immobilitzat');
        if (existent) existent.remove();

        const imm = await getImmobilitzatById(id);

        // Alertes venciments
        const alertaITV   = alertaVenciment(imm.itv_data_propera,   'ITV');
        const alertaITEAF = alertaVenciment(imm.iteaf_data_propera, 'ITEAF');
        const alertes = [alertaITV, alertaITEAF].filter(Boolean).join(' ');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay-imm';
        modal.id = 'modal-detall-immobilitzat';

        modal.innerHTML = `
            <div class="modal-content-imm">
                <div class="modal-header">
                    <h2>${getTipusIconImm(imm.tipus)} Immobilitzat — ${imm.descripció}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-detall-immobilitzat')">✕</button>
                </div>

                <div class="modal-body">

                    ${alertes ? `<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap;">${alertes}</div>` : ''}

                    <!-- ═══ BLOC A — DADES GENERALS ═══ -->
                    <fieldset>
                        <legend>📋 A — Dades Generals</legend>
                        <div class="detall-grid-imm">
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Tipus</span>
                                <span class="detall-valor-imm">${getTipusIconImm(imm.tipus)} ${imm.tipus}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Descripció</span>
                                <span class="detall-valor-imm" style="font-weight:600;">${imm.descripció}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Marca</span>
                                <span class="detall-valor-imm">${imm.marca || '—'}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Model</span>
                                <span class="detall-valor-imm">${imm.model || '—'}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Matrícula</span>
                                <span class="detall-valor-imm">${imm.matrícula || '—'}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Any Compra</span>
                                <span class="detall-valor-imm">${imm.any_compra || '—'}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Valor Compra</span>
                                <span class="detall-valor-imm">${formatEuroImm(imm.valor_compra)}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Valor Actual</span>
                                <span class="detall-valor-imm" style="font-weight:600;">${formatEuroImm(imm.valor_actual)}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Ubicació</span>
                                <span class="detall-valor-imm">${imm.ubicació || '—'}</span>
                            </div>
                            ${imm.observacions ? `
                            <div class="detall-camp-imm detall-camp-ample-imm">
                                <span class="detall-label-imm">Observacions</span>
                                <span class="detall-valor-imm">${imm.observacions}</span>
                            </div>` : ''}
                        </div>
                    </fieldset>

                    <!-- ═══ BLOC B — ROMA ═══ -->
                    <fieldset style="margin-top:12px;">
                        <legend>📋 B — ROMA (Registre Oficial Maquinària Agrícola)</legend>
                        <div class="detall-grid-imm">
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Nº Inscripció</span>
                                <span class="detall-valor-imm" style="font-family:monospace;font-size:14px;">${imm.roma_num_inscripcio || '—'}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Tipus Maquinària</span>
                                <span class="detall-valor-imm">${imm.roma_tipus_maquinaria || '—'}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Estat ROMA</span>
                                <span class="detall-valor-imm">${badgeRomaEstat(imm.roma_estat)}</span>
                            </div>
                        </div>
                    </fieldset>

                    <!-- ═══ BLOC C — ITV ═══ -->
                    <fieldset style="margin-top:12px;">
                        <legend>🚗 C — ITV (Inspecció Tècnica de Vehicles)</legend>
                        <div class="detall-grid-imm">
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Última Inspecció</span>
                                <span class="detall-valor-imm">${formatDataImm(imm.itv_data_ultima)}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Resultat</span>
                                <span class="detall-valor-imm">${badgeResultatInspeccio(imm.itv_resultat)}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Propera ITV</span>
                                <span class="detall-valor-imm">
                                    ${formatDataImm(imm.itv_data_propera)}
                                    ${alertaITV ? `<br>${alertaITV}` : ''}
                                </span>
                            </div>
                        </div>
                    </fieldset>

                    <!-- ═══ BLOC D — ITEAF ═══ -->
                    <fieldset style="margin-top:12px;">
                        <legend>🌿 D — ITEAF (Inspecció Equips Aplicació Fitosanitaris)</legend>
                        <div class="detall-grid-imm">
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Última Inspecció</span>
                                <span class="detall-valor-imm">${formatDataImm(imm.iteaf_data_ultima)}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Resultat</span>
                                <span class="detall-valor-imm">${badgeResultatInspeccio(imm.iteaf_resultat)}</span>
                            </div>
                            <div class="detall-camp-imm">
                                <span class="detall-label-imm">Propera ITEAF</span>
                                <span class="detall-valor-imm">
                                    ${formatDataImm(imm.iteaf_data_propera)}
                                    ${alertaITEAF ? `<br>${alertaITEAF}` : ''}
                                </span>
                            </div>
                        </div>
                    </fieldset>

                </div>

                <div class="modal-footer">
                    <button class="btn btn-danger btn-sm" onclick="confirmarEliminarImmobilitzat('${id}')">🗑️ Eliminar</button>
                    <button class="btn btn-secondary" onclick="tancarModal('modal-detall-immobilitzat')">Tancar</button>
                    <button class="btn btn-primary" onclick="obrirModalEditarImmobilitzat('${id}')">✏️ Editar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) tancarModal('modal-detall-immobilitzat');
        });

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL NOU IMMOBILITZAT
// ============================================================

function obrirModalNouImmobilitzat() {
    const existent = document.getElementById('modal-nou-immobilitzat');
    if (existent) existent.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay-imm';
    modal.id = 'modal-nou-immobilitzat';

    modal.innerHTML = `
        <div class="modal-content-imm">
            <div class="modal-header">
                <h2>➕ Nou Immobilitzat</h2>
                <button class="modal-close" onclick="tancarModal('modal-nou-immobilitzat')">✕</button>
            </div>

            <div class="modal-body">
                <form id="form-nou-immobilitzat" onsubmit="guardarNouImmobilitzat(event)">

                    <!-- DADES GENERALS -->
                    <fieldset>
                        <legend>📋 Dades Generals</legend>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="ni-tipus">Tipus: *</label>
                                <select id="ni-tipus" name="tipus" required>
                                    <option value="">— Selecciona —</option>
                                    <option value="tractor">🚜 Tractor</option>
                                    <option value="vehicle">🚗 Vehicle</option>
                                    <option value="remolc">🚛 Remolc</option>
                                    <option value="maquinaria">⚙️ Maquinària</option>
                                    <option value="edifici">🏢 Edifici</option>
                                    <option value="infraestructura_reg">💧 Infraestructura Reg</option>
                                    <option value="altra">📦 Altra</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="ni-descripcio">Descripció: *</label>
                                <input type="text" id="ni-descripcio" name="descripció" required placeholder="Ex: Tractor Fendt 936 Vario">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="ni-marca">Marca:</label>
                                <input type="text" id="ni-marca" name="marca" placeholder="Ex: Fendt, John Deere...">
                            </div>
                            <div class="form-group">
                                <label for="ni-model">Model:</label>
                                <input type="text" id="ni-model" name="model" placeholder="Ex: 936 Vario">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="ni-matricula">Matrícula:</label>
                                <input type="text" id="ni-matricula" name="matrícula" placeholder="Ex: 1234-ABC">
                            </div>
                            <div class="form-group">
                                <label for="ni-any-compra">Any Compra:</label>
                                <input type="number" id="ni-any-compra" name="any_compra" min="1900" max="2100" placeholder="Ex: 2018">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="ni-valor-compra">Valor Compra (€):</label>
                                <input type="number" id="ni-valor-compra" name="valor_compra" step="0.01" min="0" placeholder="0.00">
                            </div>
                            <div class="form-group">
                                <label for="ni-valor-actual">Valor Actual (€):</label>
                                <input type="number" id="ni-valor-actual" name="valor_actual" step="0.01" min="0" placeholder="0.00">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="ni-ubicacio">Ubicació:</label>
                                <input type="text" id="ni-ubicacio" name="ubicació" placeholder="Ex: Magatzem principal">
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="ni-observacions">Observacions:</label>
                            <textarea id="ni-observacions" name="observacions" rows="2" placeholder="Notes addicionals..."></textarea>
                        </div>
                    </fieldset>

                    <!-- ROMA -->
                    <fieldset>
                        <legend>📋 ROMA (Registre Oficial Maquinària Agrícola)</legend>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="ni-roma-num">Nº Inscripció ROMA:</label>
                                <input type="text" id="ni-roma-num" name="roma_num_inscripcio" placeholder="Ex: 255005053520">
                            </div>
                            <div class="form-group">
                                <label for="ni-roma-tipus">Tipus Maquinària:</label>
                                <select id="ni-roma-tipus" name="roma_tipus_maquinaria">
                                    <option value="">— Selecciona —</option>
                                    <option value="Tractores">Tractors</option>
                                    <option value="Remolques">Remolcs</option>
                                    <option value="Máquinas remolcadas">Màquines remolcades</option>
                                    <option value="Máquinas suspendidas y semisuspendidas">Màquines suspeses/semisuspeses</option>
                                    <option value="Otra maquinaria">Altra maquinària</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="ni-roma-estat">Estat ROMA:</label>
                                <select id="ni-roma-estat" name="roma_estat">
                                    <option value="">— Selecciona —</option>
                                    <option value="Alta">✅ Alta</option>
                                    <option value="Baixa">🔻 Baixa</option>
                                </select>
                            </div>
                        </div>
                    </fieldset>

                    <!-- ITV -->
                    <fieldset>
                        <legend>🚗 ITV (Inspecció Tècnica de Vehicles)</legend>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="ni-itv-ultima">Data Última ITV:</label>
                                <input type="date" id="ni-itv-ultima" name="itv_data_ultima">
                            </div>
                            <div class="form-group">
                                <label for="ni-itv-resultat">Resultat:</label>
                                <select id="ni-itv-resultat" name="itv_resultat">
                                    <option value="">— Selecciona —</option>
                                    <option value="Favorable">✅ Favorable</option>
                                    <option value="Desfavorable">❌ Desfavorable</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="ni-itv-propera">Propera ITV:</label>
                                <input type="date" id="ni-itv-propera" name="itv_data_propera">
                            </div>
                        </div>
                    </fieldset>

                    <!-- ITEAF -->
                    <fieldset>
                        <legend>🌿 ITEAF (Inspecció Equips Aplicació Fitosanitaris)</legend>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="ni-iteaf-ultima">Data Última ITEAF:</label>
                                <input type="date" id="ni-iteaf-ultima" name="iteaf_data_ultima">
                            </div>
                            <div class="form-group">
                                <label for="ni-iteaf-resultat">Resultat:</label>
                                <select id="ni-iteaf-resultat" name="iteaf_resultat">
                                    <option value="">— Selecciona —</option>
                                    <option value="Favorable">✅ Favorable</option>
                                    <option value="Desfavorable">❌ Desfavorable</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="ni-iteaf-propera">Propera ITEAF:</label>
                                <input type="date" id="ni-iteaf-propera" name="iteaf_data_propera">
                            </div>
                        </div>
                    </fieldset>

                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nou-immobilitzat')">Cancel·lar</button>
                <button type="submit" form="form-nou-immobilitzat" class="btn btn-primary">✅ Guardar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) tancarModal('modal-nou-immobilitzat');
    });
}

// ============================================================
// GUARDAR NOU IMMOBILITZAT
// ============================================================

async function guardarNouImmobilitzat(event) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-nou-immobilitzat');
        const dades = new FormData(form);

        const imm = {
            tipus:                 dades.get('tipus'),
            descripció:            dades.get('descripció').trim(),
            marca:                 dades.get('marca') || null,
            model:                 dades.get('model') || null,
            matrícula:             dades.get('matrícula') || null,
            any_compra:            parseInt(dades.get('any_compra')) || null,
            valor_compra:          parseFloat(dades.get('valor_compra')) || null,
            valor_actual:          parseFloat(dades.get('valor_actual')) || null,
            ubicació:              dades.get('ubicació') || null,
            observacions:          dades.get('observacions') || null,
            // ROMA
            roma_num_inscripcio:   dades.get('roma_num_inscripcio') || null,
            roma_tipus_maquinaria: dades.get('roma_tipus_maquinaria') || null,
            roma_estat:            dades.get('roma_estat') || null,
            // ITV
            itv_data_ultima:       dades.get('itv_data_ultima') || null,
            itv_resultat:          dades.get('itv_resultat') || null,
            itv_data_propera:      dades.get('itv_data_propera') || null,
            // ITEAF
            iteaf_data_ultima:     dades.get('iteaf_data_ultima') || null,
            iteaf_resultat:        dades.get('iteaf_resultat') || null,
            iteaf_data_propera:    dades.get('iteaf_data_propera') || null,
        };

        if (!imm.tipus)      throw new Error('El tipus és obligatori');
        if (!imm.descripció) throw new Error('La descripció és obligatòria');

        await createImmobilitzatMaterial(imm);

        mostrarNotificacio('✅ Immobilitzat creat correctament', 'success');
        tancarModal('modal-nou-immobilitzat');
        if (typeof mostrarVistaImmobilitzat === 'function') await mostrarVistaImmobilitzat();

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL EDITAR IMMOBILITZAT
// ============================================================

async function obrirModalEditarImmobilitzat(id) {
    try {
        const existent = document.getElementById('modal-editar-immobilitzat');
        if (existent) existent.remove();

        // Tancar detall si estava obert
        const detall = document.getElementById('modal-detall-immobilitzat');
        if (detall) detall.remove();

        const imm = await getImmobilitzatById(id);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay-imm';
        modal.id = 'modal-editar-immobilitzat';

        const tipusOptions = ['tractor','vehicle','remolc','maquinaria','edifici','infraestructura_reg','altra'];
        const tipusLabels  = {
            'tractor':'🚜 Tractor','vehicle':'🚗 Vehicle','remolc':'🚛 Remolc',
            'maquinaria':'⚙️ Maquinària','edifici':'🏢 Edifici',
            'infraestructura_reg':'💧 Infraestructura Reg','altra':'📦 Altra'
        };

        const romaOptions = ['Tractores','Remolques','Máquinas remolcadas','Máquinas suspendidas y semisuspendidas','Otra maquinaria'];
        const romaLabels  = {
            'Tractores':'Tractors','Remolques':'Remolcs',
            'Máquinas remolcadas':'Màquines remolcades',
            'Máquinas suspendidas y semisuspendidas':'Màquines suspeses/semisuspeses',
            'Otra maquinaria':'Altra maquinària'
        };

        modal.innerHTML = `
            <div class="modal-content-imm">
                <div class="modal-header">
                    <h2>✏️ Editar — ${imm.descripció}</h2>
                    <button class="modal-close" onclick="tancarModalEditarImmIReobrir('${id}')">✕</button>
                </div>

                <div class="modal-body">
                    <form id="form-editar-immobilitzat" onsubmit="guardarEdicionImmobilitzat(event, '${id}')">

                        <!-- DADES GENERALS -->
                        <fieldset>
                            <legend>📋 Dades Generals</legend>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ei-tipus">Tipus: *</label>
                                    <select id="ei-tipus" name="tipus" required>
                                        ${tipusOptions.map(t => `<option value="${t}" ${imm.tipus === t ? 'selected' : ''}>${tipusLabels[t]}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="ei-descripcio">Descripció: *</label>
                                    <input type="text" id="ei-descripcio" name="descripció" required value="${imm.descripció}">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ei-marca">Marca:</label>
                                    <input type="text" id="ei-marca" name="marca" value="${imm.marca || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="ei-model">Model:</label>
                                    <input type="text" id="ei-model" name="model" value="${imm.model || ''}">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ei-matricula">Matrícula:</label>
                                    <input type="text" id="ei-matricula" name="matrícula" value="${imm.matrícula || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="ei-any-compra">Any Compra:</label>
                                    <input type="number" id="ei-any-compra" name="any_compra" min="1900" max="2100" value="${imm.any_compra || ''}">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ei-valor-compra">Valor Compra (€):</label>
                                    <input type="number" id="ei-valor-compra" name="valor_compra" step="0.01" min="0" value="${imm.valor_compra || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="ei-valor-actual">Valor Actual (€):</label>
                                    <input type="number" id="ei-valor-actual" name="valor_actual" step="0.01" min="0" value="${imm.valor_actual || ''}">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ei-ubicacio">Ubicació:</label>
                                    <input type="text" id="ei-ubicacio" name="ubicació" value="${imm.ubicació || ''}">
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="ei-observacions">Observacions:</label>
                                <textarea id="ei-observacions" name="observacions" rows="2">${imm.observacions || ''}</textarea>
                            </div>
                        </fieldset>

                        <!-- ROMA -->
                        <fieldset>
                            <legend>📋 ROMA</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ei-roma-num">Nº Inscripció:</label>
                                    <input type="text" id="ei-roma-num" name="roma_num_inscripcio" value="${imm.roma_num_inscripcio || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="ei-roma-tipus">Tipus Maquinària:</label>
                                    <select id="ei-roma-tipus" name="roma_tipus_maquinaria">
                                        <option value="">— Selecciona —</option>
                                        ${romaOptions.map(r => `<option value="${r}" ${imm.roma_tipus_maquinaria === r ? 'selected' : ''}>${romaLabels[r]}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="ei-roma-estat">Estat ROMA:</label>
                                    <select id="ei-roma-estat" name="roma_estat">
                                        <option value="">— Selecciona —</option>
                                        <option value="Alta"  ${imm.roma_estat === 'Alta'  ? 'selected' : ''}>✅ Alta</option>
                                        <option value="Baixa" ${imm.roma_estat === 'Baixa' ? 'selected' : ''}>🔻 Baixa</option>
                                    </select>
                                </div>
                            </div>
                        </fieldset>

                        <!-- ITV -->
                        <fieldset>
                            <legend>🚗 ITV</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ei-itv-ultima">Data Última ITV:</label>
                                    <input type="date" id="ei-itv-ultima" name="itv_data_ultima" value="${imm.itv_data_ultima || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="ei-itv-resultat">Resultat:</label>
                                    <select id="ei-itv-resultat" name="itv_resultat">
                                        <option value="">— Selecciona —</option>
                                        <option value="Favorable"   ${imm.itv_resultat === 'Favorable'   ? 'selected' : ''}>✅ Favorable</option>
                                        <option value="Desfavorable" ${imm.itv_resultat === 'Desfavorable' ? 'selected' : ''}>❌ Desfavorable</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="ei-itv-propera">Propera ITV:</label>
                                    <input type="date" id="ei-itv-propera" name="itv_data_propera" value="${imm.itv_data_propera || ''}">
                                </div>
                            </div>
                        </fieldset>

                        <!-- ITEAF -->
                        <fieldset>
                            <legend>🌿 ITEAF</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ei-iteaf-ultima">Data Última ITEAF:</label>
                                    <input type="date" id="ei-iteaf-ultima" name="iteaf_data_ultima" value="${imm.iteaf_data_ultima || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="ei-iteaf-resultat">Resultat:</label>
                                    <select id="ei-iteaf-resultat" name="iteaf_resultat">
                                        <option value="">— Selecciona —</option>
                                        <option value="Favorable"    ${imm.iteaf_resultat === 'Favorable'    ? 'selected' : ''}>✅ Favorable</option>
                                        <option value="Desfavorable" ${imm.iteaf_resultat === 'Desfavorable' ? 'selected' : ''}>❌ Desfavorable</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="ei-iteaf-propera">Propera ITEAF:</label>
                                    <input type="date" id="ei-iteaf-propera" name="iteaf_data_propera" value="${imm.iteaf_data_propera || ''}">
                                </div>
                            </div>
                        </fieldset>

                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tancarModalEditarImmIReobrir('${id}')">Cancel·lar</button>
                    <button type="submit" form="form-editar-immobilitzat" class="btn btn-primary">✅ Guardar Canvis</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) tancarModalEditarImmIReobrir(id);
        });

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function tancarModalEditarImmIReobrir(id) {
    tancarModal('modal-editar-immobilitzat');
    await obrirModalDetallImmobilitzat(id);
}

// ============================================================
// GUARDAR EDICIÓ IMMOBILITZAT
// ============================================================

async function guardarEdicionImmobilitzat(event, id) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-editar-immobilitzat');
        const dades = new FormData(form);

        const imm = {
            tipus:                 dades.get('tipus'),
            descripció:            dades.get('descripció').trim(),
            marca:                 dades.get('marca') || null,
            model:                 dades.get('model') || null,
            matrícula:             dades.get('matrícula') || null,
            any_compra:            parseInt(dades.get('any_compra')) || null,
            valor_compra:          parseFloat(dades.get('valor_compra')) || null,
            valor_actual:          parseFloat(dades.get('valor_actual')) || null,
            ubicació:              dades.get('ubicació') || null,
            observacions:          dades.get('observacions') || null,
            roma_num_inscripcio:   dades.get('roma_num_inscripcio') || null,
            roma_tipus_maquinaria: dades.get('roma_tipus_maquinaria') || null,
            roma_estat:            dades.get('roma_estat') || null,
            itv_data_ultima:       dades.get('itv_data_ultima') || null,
            itv_resultat:          dades.get('itv_resultat') || null,
            itv_data_propera:      dades.get('itv_data_propera') || null,
            iteaf_data_ultima:     dades.get('iteaf_data_ultima') || null,
            iteaf_resultat:        dades.get('iteaf_resultat') || null,
            iteaf_data_propera:    dades.get('iteaf_data_propera') || null,
        };

        if (!imm.tipus)      throw new Error('El tipus és obligatori');
        if (!imm.descripció) throw new Error('La descripció és obligatòria');

        await updateImmobilitzatMaterial(id, imm);

        mostrarNotificacio('✅ Immobilitzat actualitzat correctament', 'success');
        tancarModal('modal-editar-immobilitzat');
        await obrirModalDetallImmobilitzat(id);
        if (typeof mostrarVistaImmobilitzat === 'function') await mostrarVistaImmobilitzat();

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// CONFIRMAR ELIMINAR IMMOBILITZAT
// ============================================================

async function confirmarEliminarImmobilitzat(id) {
    const imm = await getImmobilitzatById(id);
    if (!confirm(`⚠️ Eliminar "${imm.descripció}"?\n\nAquesta acció no es pot desfer.`)) return;

    try {
        await deleteImmobilitzat(id);
        mostrarNotificacio('✅ Immobilitzat eliminat correctament', 'success');
        tancarModal('modal-detall-immobilitzat');
        if (typeof mostrarVistaImmobilitzat === 'function') await mostrarVistaImmobilitzat();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error eliminant: ' + error.message, 'error');
    }
}

// ============================================================
// OVERRIDE PLACEHOLDERS + VISTA IMMOBILITZAT MILLORADA
// ============================================================

// Override detall
function mostrarDetallImmobilitzat(id) {
    obrirModalDetallImmobilitzat(id);
}

// Override vista llistat — substitueix la del fitxer principal
// afegint botó detall + columnes ITV i ITEAF
async function mostrarVistaImmobilitzat() {
    try {
        let container = document.getElementById('immobilitzat-view');

        // Si no existeix el container (accés des del menú Gestió),
        // creem la vista directament al view-container
        if (!container) {
            const viewContainer = document.getElementById('view-container');
            if (!viewContainer) return;
            viewContainer.innerHTML = `<div id="immobilitzat-view"></div>`;
            container = document.getElementById('immobilitzat-view');
        }

        // Filtre actiu (persistit a window per no perdre'l en recàrrega de vista)
        const filtreTipus = window._immFiltreTipus || 'tots';

        const immobilitzat = await supabaseClient
            .from('immobilitzat_material')
            .select('*')
            .order('tipus')
            .order('descripció');

        if (immobilitzat.error) throw immobilitzat.error;
        const tota_llista = immobilitzat.data || [];

        // Actualitzar cache global si existeix
        if (typeof immobilizatCache !== 'undefined') immobilizatCache = tota_llista;

        // Comptar per tipus per als botons de filtre
        const comptadors = {};
        tota_llista.forEach(i => { comptadors[i.tipus] = (comptadors[i.tipus] || 0) + 1; });

        // Aplicar filtre
        const llista = filtreTipus === 'tots'
            ? tota_llista
            : tota_llista.filter(i => i.tipus === filtreTipus);

        const tipusFiltres = [
            { val: 'tots',                label: `Tots (${tota_llista.length})` },
            { val: 'tractor',             label: `🚜 Tractors (${comptadors['tractor'] || 0})` },
            { val: 'vehicle',             label: `🚗 Vehicles (${comptadors['vehicle'] || 0})` },
            { val: 'remolc',              label: `🚛 Remolcs (${comptadors['remolc'] || 0})` },
            { val: 'maquinaria',          label: `⚙️ Maquinària (${comptadors['maquinaria'] || 0})` },
            { val: 'edifici',             label: `🏢 Edificis (${comptadors['edifici'] || 0})` },
            { val: 'infraestructura_reg', label: `💧 Reg (${comptadors['infraestructura_reg'] || 0})` },
            { val: 'altra',               label: `📦 Altra (${comptadors['altra'] || 0})` },
        ].filter(f => f.val === 'tots' || comptadors[f.val]);

        let html = `
            <div class="assegurances-header">
                <h3>🏗️ Immobilitzat material</h3>
                <button class="btn-nova" onclick="obrirModalNouImmobilitzat()">
                    ➕ Nou immobilitzat
                </button>
            </div>
            <div class="filtres-immobilitzat">
                ${tipusFiltres.map(f => `
                    <button class="btn-filtre-imm ${filtreTipus === f.val ? 'actiu' : ''}"
                        onclick="filtrarImmobilitzat('${f.val}')">${f.label}</button>
                `).join('')}
            </div>
        `;

        if (llista.length === 0) {
            html += `<div class="no-data">Sense immobilitzat del tipus seleccionat</div>`;
        } else {
            html += `
                <div style="overflow-x:auto;">
                <table class="taula-standard">
                    <thead>
                        <tr>
                            <th>Tipus</th>
                            <th>Descripció</th>
                            <th>Marca / Model</th>
                            <th>Matrícula</th>
                            <th>Valor actual</th>
                            <th>ITV</th>
                            <th>ITEAF</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            llista.forEach(imm => {
                const valor = (imm.valor_actual || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const marca = imm.marca ? `${imm.marca} ${imm.model || ''}`.trim() : imm.model || '—';

                // Badge ITV
                const itvBadge = badgeDataProperaImm(imm.itv_data_propera, 'ITV');
                // Badge ITEAF
                const iteafBadge = badgeDataProperaImm(imm.iteaf_data_propera, 'ITEAF');

                html += `
                    <tr>
                        <td><strong>${getTipusIconImm(imm.tipus)} ${imm.tipus}</strong></td>
                        <td>${imm.descripció}</td>
                        <td>${marca}</td>
                        <td>${imm.matrícula || '—'}</td>
                        <td>${valor}</td>
                        <td>${itvBadge}</td>
                        <td>${iteafBadge}</td>
                        <td class="accions-cell" style="white-space:nowrap;">
                            <button class="btn-small btn-veure"   onclick="obrirModalDetallImmobilitzat('${imm.id}')">👁️</button>
                            <button class="btn-small btn-editar"  onclick="obrirModalEditarImmobilitzat('${imm.id}')">✏️</button>
                            <button class="btn-small btn-eliminar" onclick="confirmarEliminarImmobilitzat('${imm.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
        }

        container.innerHTML = html;

    } catch (error) {
        console.error('Error mostrarVistaImmobilitzat:', error);
        const container = document.getElementById('immobilitzat-view');
        if (container) container.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}

// Badge compacte per a la taula (semàfor de dates)
function badgeDataProperaImm(dataStr, etiqueta) {
    if (!dataStr) return '<span style="color:#ccc;font-size:12px;">—</span>';

    const avui = new Date();
    const data = new Date(dataStr);
    const dies = Math.ceil((data - avui) / (1000 * 60 * 60 * 24));

    let color, bg, text;
    if (dies < 0) {
        color = '#c62828'; bg = '#ffebee';
        text = `⚠️ Vençuda`;
    } else if (dies <= 30) {
        color = '#e65100'; bg = '#fff3e0';
        text = `⏰ ${dies}d`;
    } else if (dies <= 90) {
        color = '#f57f17'; bg = '#fffde7';
        text = `📅 ${dies}d`;
    } else {
        color = '#2d7a2d'; bg = '#e8f5e9';
        text = `✅ ${formatDataImm(dataStr)}`;
    }

    return `<span style="background:${bg};color:${color};padding:2px 7px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap;">${text}</span>`;
}

// ============================================================
// ESTILS INLINE
// ============================================================

(function injectarEstilsImmobilitzat() {
    if (document.getElementById('estils-immobilitzat-modals')) return;
    const style = document.createElement('style');
    style.id = 'estils-immobilitzat-modals';
    style.textContent = `
        #modal-nou-immobilitzat,
        #modal-editar-immobilitzat,
        #modal-detall-immobilitzat {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.6) !important;
            z-index: 99999 !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            padding-top: 30px !important;
            overflow-y: auto !important;
        }
        .modal-content-imm {
            position: relative !important;
            z-index: 100000 !important;
            background: white !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
            width: 100% !important;
            max-width: 700px !important;
            max-height: 85vh !important;
            overflow-y: auto !important;
            margin-bottom: 30px !important;
        }
        .detall-grid-imm {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 20px;
        }
        .detall-camp-imm {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .detall-camp-ample-imm {
            grid-column: 1 / -1;
        }
        .filtres-immobilitzat {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin: 10px 0 14px 0;
        }
        .btn-filtre-imm {
            padding: 5px 12px;
            border-radius: 20px;
            border: 2px solid #ddd;
            background: #f5f5f5;
            color: #555;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.15s;
        }
        .btn-filtre-imm:hover {
            border-color: #4a7c59;
            color: #4a7c59;
            background: #f0f7ee;
        }
        .btn-filtre-imm.actiu {
            background: #4a7c59;
            color: white;
            border-color: #4a7c59;
        }
        .detall-label-imm {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: #888;
            letter-spacing: 0.5px;
        }
        .detall-valor-imm {
            font-size: 14px;
            color: #222;
        }
    `;
    document.head.appendChild(style);
})();

console.log('✅ Immobilitzat Modals v1 carregat');

// ============================================================
// FILTRE TIPUS IMMOBILITZAT
// ============================================================

function filtrarImmobilitzat(tipus) {
    window._immFiltreTipus = tipus;
    mostrarVistaImmobilitzat();
}