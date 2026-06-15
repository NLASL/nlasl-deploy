// ============================================================
// ASSEGURANCES MODALS ALTRES v2
// Sistema estil Factura: capçalera pòlissa + línies de pagament
// Taules: assegurances_altres + assegurances_altres_quotes
// ============================================================

// ============================================================
// HELPERS
// ============================================================

function formatDataA(dataStr) {
    if (!dataStr) return '—';
    const d = new Date(dataStr + 'T00:00:00');
    return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatEuroA(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    return parseFloat(valor).toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function obtenirExerciciPerData(dataStr) {
    if (!dataStr) return new Date().getFullYear();
    const d = new Date(dataStr + 'T00:00:00');
    const mes = d.getMonth() + 1;
    const any = d.getFullYear();
    return mes >= 5 ? any : any - 1;
}

function badgeEstatA(estat, tipus) {
    const mapes = {
        polissa: {
            'actiu':   { color: '#2d7a2d', bg: '#e8f5e9', label: '✅ Actiu' },
            'vençut':  { color: '#c62828', bg: '#ffebee', label: '❌ Vençut' },
            'suspes':  { color: '#e65100', bg: '#fff3e0', label: '⏸️ Suspès' },
        },
        quota: {
            'pagada':      { color: '#2d7a2d', bg: '#e8f5e9', label: '✅ Pagada' },
            'pendent':     { color: '#e65100', bg: '#fff3e0', label: '⏳ Pendent' },
            'cancel·lada': { color: '#c62828', bg: '#ffebee', label: '❌ Cancel·lada' },
        }
    };
    const e = (mapes[tipus] || {})[estat] || { color: '#666', bg: '#eee', label: estat };
    return `<span style="background:${e.bg};color:${e.color};padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${e.label}</span>`;
}

function etiquetaTipusA(tipus) {
    const mapa = {
        'auto': '🚗 Auto', 'accidents': '🏥 Accidents',
        'impagament': '💸 Impagament', 'incendi': '🔥 Incendi',
        'proteccio_juridica': '⚖️ Protecció Jurídica',
        'RC': '🛡️ Responsabilitat Civil', 'robatori': '🔒 Robatori',
        'salut_laboral': '👷 Salut Laboral', 'viatges': '✈️ Viatges',
        'vida': '❤️ Vida', 'altra': '📋 Altra',
    };
    return mapa[tipus] || tipus;
}

// ============================================================
// SUPABASE CRUD
// ============================================================

async function getAltresPolissaByIdV2(id) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .select('*, immobilitzat_material(id, descripció, tipus, matrícula)')
        .eq('id', id).single();
    if (error) throw error;
    return data;
}

async function getAltresQuotesV2(assegurancaId) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .select('*')
        .eq('asseguranca_id', assegurancaId)
        .order('data_inici_cobertura', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function createAltresPolissaV2(polissa) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .insert([polissa]).select().single();
    if (error) throw error;
    return data;
}

async function updateAltresPolissaV2(id, polissa) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .update({ ...polissa, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
    if (error) throw error;
    return data;
}

async function deleteAltresPolissaV2(id) {
    const { error } = await supabaseClient
        .from('assegurances_altres').delete().eq('id', id);
    if (error) throw error;
}

async function createAltresQuotaV2(quota) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .insert([quota]).select().single();
    if (error) throw error;
    return data;
}

async function updateAltresQuotaV2(id, quota) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .update({ ...quota, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
    if (error) throw error;
    return data;
}

async function deleteAltresQuotaV2(id) {
    const { error } = await supabaseClient
        .from('assegurances_altres_quotes').delete().eq('id', id);
    if (error) throw error;
}

async function getImmobilitzatLlistaV2() {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .select('id, descripció, tipus, matrícula')
        .order('descripció');
    if (error) throw error;
    return data || [];
}

// ============================================================
// RENDERITZAR LÍNIES DE PAGAMENT (inline editable)
// ============================================================

function renderitzarLíniesQuotes(quotes, polissaId, modeEdicio = false) {
    if (quotes.length === 0 && !modeEdicio) {
        return `<tr><td colspan="8" style="text-align:center;color:#888;padding:16px;">Cap pagament registrat — clica "➕ Afegir pagament"</td></tr>`;
    }

    return quotes.map(q => `
        <tr data-quota-id="${q.id}" class="fila-quota-altres">
            <td style="white-space:nowrap;">${formatDataA(q.data_inici_cobertura)}</td>
            <td style="white-space:nowrap;">${formatDataA(q.data_fi_cobertura)}</td>
            <td style="white-space:nowrap;">${formatDataA(q.data_pagament)}</td>
            <td style="text-align:right;font-weight:600;">${formatEuroA(q.prima_anual)}</td>
            <td>${q.exercici}</td>
            <td>${badgeEstatA(q.estat, 'quota')}</td>
            <td>${q.observacions || '—'}</td>
            <td style="white-space:nowrap;">
                <button class="btn-small btn-editar" onclick="obrirEditorLíniaQuotaAltres('${q.id}', '${polissaId}')" title="Editar">✏️</button>
                <button class="btn-small btn-eliminar" onclick="eliminarLíniaQuotaAltres('${q.id}', '${polissaId}')" title="Eliminar">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderitzarFilaNouPagament(polissaId) {
    const avui = new Date().toISOString().split('T')[0];
    return `
        <tr id="fila-nou-pagament" style="background:#f0f7ee;">
            <td><input type="date" id="np-inici" style="width:120px;" placeholder="dd/mm/aaaa"></td>
            <td><input type="date" id="np-fi" style="width:120px;" placeholder="dd/mm/aaaa"></td>
            <td><input type="date" id="np-data-pag" value="${avui}" style="width:120px;" onchange="actualitzarExerciciNouPagamentAltres(this.value)"></td>
            <td><input type="number" id="np-prima" step="0.01" min="0" style="width:80px;" placeholder="0.00"></td>
            <td><input type="number" id="np-exercici" style="width:60px;" value="${obtenirExerciciPerData(avui)}" readonly style="background:#e8f5e9;font-weight:600;"></td>
            <td>
                <select id="np-estat" style="width:110px;">
                    <option value="pendent">⏳ Pendent</option>
                    <option value="pagada">✅ Pagada</option>
                    <option value="cancel·lada">❌ Cancel·lada</option>
                </select>
            </td>
            <td><input type="text" id="np-obs" style="width:100px;" placeholder="Notes..."></td>
            <td style="white-space:nowrap;">
                <button class="btn-small btn-editar" onclick="guardarNouPagamentAltresV2('${polissaId}')" title="Guardar">💾</button>
                <button class="btn-small btn-eliminar" onclick="cancelarNouPagamentAltres()" title="Cancel·lar">✕</button>
            </td>
        </tr>
    `;
}

function renderitzarFilaEditarPagament(quota, polissaId) {
    return `
        <tr id="fila-editar-pagament-${quota.id}" style="background:#fff8e1;">
            <td><input type="date" id="eq-inici-${quota.id}" value="${quota.data_inici_cobertura || ''}" style="width:120px;"></td>
            <td><input type="date" id="eq-fi-${quota.id}" value="${quota.data_fi_cobertura || ''}" style="width:120px;"></td>
            <td><input type="date" id="eq-data-pag-${quota.id}" value="${quota.data_pagament || ''}" style="width:120px;" onchange="actualitzarExerciciEditAltresV2(this.value, '${quota.id}')"></td>
            <td><input type="number" id="eq-prima-${quota.id}" value="${quota.prima_anual || ''}" step="0.01" min="0" style="width:80px;"></td>
            <td><input type="number" id="eq-exercici-${quota.id}" value="${quota.exercici}" readonly style="width:60px;background:#e8f5e9;font-weight:600;"></td>
            <td>
                <select id="eq-estat-${quota.id}" style="width:110px;">
                    <option value="pendent"     ${quota.estat === 'pendent'     ? 'selected' : ''}>⏳ Pendent</option>
                    <option value="pagada"      ${quota.estat === 'pagada'      ? 'selected' : ''}>✅ Pagada</option>
                    <option value="cancel·lada" ${quota.estat === 'cancel·lada' ? 'selected' : ''}>❌ Cancel·lada</option>
                </select>
            </td>
            <td><input type="text" id="eq-obs-${quota.id}" value="${quota.observacions || ''}" style="width:100px;"></td>
            <td style="white-space:nowrap;">
                <button class="btn-small btn-editar" onclick="guardarEditorLíniaQuotaAltres('${quota.id}', '${polissaId}')" title="Guardar">💾</button>
                <button class="btn-small btn-eliminar" onclick="cancelarEditorLíniaQuotaAltres('${quota.id}', '${polissaId}')" title="Cancel·lar">✕</button>
            </td>
        </tr>
    `;
}

// ============================================================
// MODAL PRINCIPAL — VEURE/GESTIONAR PÒLISSA
// ============================================================

async function obrirModalDetallAltres(polissaId) {
    try {
        const existent = document.getElementById('modal-altres-principal');
        if (existent) existent.remove();

        const polissa = await getAltresPolissaByIdV2(polissaId);
        const quotes  = await getAltresQuotesV2(polissaId);

        const immInfo = polissa.immobilitzat_material
            ? `${polissa.immobilitzat_material.descripció}${polissa.immobilitzat_material.matrícula ? ' (' + polissa.immobilitzat_material.matrícula + ')' : ''}`
            : '—';

        // Totals
        const totalPagat  = quotes.filter(q => q.estat === 'pagada').reduce((s, q) => s + (parseFloat(q.prima_anual) || 0), 0);
        const totalPendent = quotes.filter(q => q.estat === 'pendent').reduce((s, q) => s + (parseFloat(q.prima_anual) || 0), 0);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay-altres';
        modal.id = 'modal-altres-principal';

        modal.innerHTML = `
            <div class="modal-content-altres">
                <div class="modal-header">
                    <h2>🛡️ ${etiquetaTipusA(polissa.tipus_polissa)} — ${polissa.num_polissa}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-altres-principal')">✕</button>
                </div>

                <div class="modal-body" style="padding:16px;">

                    <!-- ═══ CAPÇALERA PÒLISSA (lectura) ═══ -->
                    <div class="capsalera-polissa-altres" id="capsalera-lectura-${polissaId}">
                        <div class="camps-polissa-grid">
                            <div class="camp-pol">
                                <span class="camp-pol-label">Companyia</span>
                                <span class="camp-pol-valor">${polissa.companyia}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Nº Pòlissa</span>
                                <span class="camp-pol-valor" style="font-family:monospace;">${polissa.num_polissa}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Tipus</span>
                                <span class="camp-pol-valor">${etiquetaTipusA(polissa.tipus_polissa)}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Estat</span>
                                <span class="camp-pol-valor">${badgeEstatA(polissa.estat, 'polissa')}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Data Inici</span>
                                <span class="camp-pol-valor">${formatDataA(polissa.data_inici)}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Data Venciment</span>
                                <span class="camp-pol-valor">${formatDataA(polissa.data_venciment)}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Prima Anual</span>
                                <span class="camp-pol-valor" style="font-weight:700;">${formatEuroA(polissa.prima_anual)}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Immobilitzat</span>
                                <span class="camp-pol-valor">${immInfo}</span>
                            </div>
                            ${polissa.observacions ? `
                            <div class="camp-pol camp-pol-ample">
                                <span class="camp-pol-label">Observacions</span>
                                <span class="camp-pol-valor">${polissa.observacions}</span>
                            </div>` : ''}
                        </div>
                        <div style="margin-top:10px;display:flex;gap:8px;">
                            <button class="btn btn-secondary btn-sm" onclick="obrirEditorCapcaleraAltres('${polissaId}')">✏️ Editar pòlissa</button>
                            <button class="btn btn-danger btn-sm" onclick="eliminarPolissaAltresV2('${polissaId}')">🗑️ Eliminar</button>
                        </div>
                    </div>

                    <!-- ═══ LÍNIES DE PAGAMENT ═══ -->
                    <div style="margin-top:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <h4 style="margin:0;">💳 Pagaments</h4>
                            <button class="btn btn-primary btn-sm" onclick="afegirLíniaPagamentAltres('${polissaId}')">➕ Afegir pagament</button>
                        </div>

                        <div style="overflow-x:auto;">
                            <table class="taula-quotes-pol" id="taula-quotes-${polissaId}">
                                <thead>
                                    <tr>
                                        <th>Inici cobertura</th>
                                        <th>Fi cobertura</th>
                                        <th>Data pagament</th>
                                        <th style="text-align:right;">Prima (€)</th>
                                        <th>Exercici</th>
                                        <th>Estat</th>
                                        <th>Observacions</th>
                                        <th>Accions</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-quotes-${polissaId}">
                                    ${renderitzarLíniesQuotes(quotes, polissaId)}
                                </tbody>
                            </table>
                        </div>

                        <!-- Resum totals -->
                        <div class="resum-totals-quotes" id="resum-totals-${polissaId}">
                            <span>✅ Pagat: <strong>${formatEuroA(totalPagat)}</strong></span>
                            <span style="margin-left:16px;">⏳ Pendent: <strong>${formatEuroA(totalPendent)}</strong></span>
                        </div>
                    </div>

                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="tancarModal('modal-altres-principal')">Tancar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', e => {
            if (e.target === modal) tancarModal('modal-altres-principal');
        });

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// EDITOR CAPÇALERA PÒLISSA (inline dins el modal)
// ============================================================

async function obrirEditorCapcaleraAltres(polissaId) {
    try {
        const polissa = await getAltresPolissaByIdV2(polissaId);
        const immLlista = await getImmobilitzatLlistaV2();

        const optImm = `<option value="">— Cap —</option>` +
            immLlista.map(i => `<option value="${i.id}" ${polissa.immobilitzat_id === i.id ? 'selected' : ''}>
                ${i.descripció}${i.matrícula ? ' (' + i.matrícula + ')' : ''}
            </option>`).join('');

        const tipusOpts = ['auto','accidents','impagament','incendi','proteccio_juridica','RC','robatori','salut_laboral','viatges','vida','altra'];

        const container = document.getElementById(`capsalera-lectura-${polissaId}`);
        container.innerHTML = `
            <div style="background:#fffde7;border:1px solid #f9a825;border-radius:6px;padding:12px;">
                <div class="camps-polissa-grid">
                    <div class="camp-pol">
                        <label class="camp-pol-label">Companyia *</label>
                        <input type="text" id="ec-companyia" value="${polissa.companyia}" style="width:100%;">
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Nº Pòlissa</label>
                        <input type="text" value="${polissa.num_polissa}" readonly style="width:100%;background:#eee;cursor:not-allowed;">
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Tipus *</label>
                        <select id="ec-tipus" style="width:100%;">
                            ${tipusOpts.map(t => `<option value="${t}" ${polissa.tipus_polissa === t ? 'selected' : ''}>${etiquetaTipusA(t)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Estat</label>
                        <select id="ec-estat" style="width:100%;">
                            <option value="actiu"  ${polissa.estat === 'actiu'  ? 'selected' : ''}>✅ Actiu</option>
                            <option value="vençut" ${polissa.estat === 'vençut' ? 'selected' : ''}>❌ Vençut</option>
                            <option value="suspes" ${polissa.estat === 'suspes' ? 'selected' : ''}>⏸️ Suspès</option>
                        </select>
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Data Inici *</label>
                        <input type="date" id="ec-data-inici" value="${polissa.data_inici || ''}" style="width:100%;">
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Data Venciment *</label>
                        <input type="date" id="ec-data-venciment" value="${polissa.data_venciment || ''}" style="width:100%;">
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Prima Anual (€)</label>
                        <input type="number" id="ec-prima" value="${polissa.prima_anual || ''}" step="0.01" min="0" style="width:100%;">
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Immobilitzat</label>
                        <select id="ec-immobilitzat" style="width:100%;">${optImm}</select>
                    </div>
                    <div class="camp-pol camp-pol-ample">
                        <label class="camp-pol-label">Observacions</label>
                        <textarea id="ec-observacions" rows="2" style="width:100%;">${polissa.observacions || ''}</textarea>
                    </div>
                </div>
                <div style="margin-top:10px;display:flex;gap:8px;">
                    <button class="btn btn-primary btn-sm" onclick="guardarEditorCapcaleraAltres('${polissaId}')">💾 Guardar</button>
                    <button class="btn btn-secondary btn-sm" onclick="obrirModalDetallAltres('${polissaId}')">✕ Cancel·lar</button>
                </div>
            </div>
        `;
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function guardarEditorCapcaleraAltres(polissaId) {
    try {
        const dades = {
            companyia:      document.getElementById('ec-companyia').value.trim(),
            tipus_polissa:  document.getElementById('ec-tipus').value,
            estat:          document.getElementById('ec-estat').value,
            data_inici:     document.getElementById('ec-data-inici').value || null,
            data_venciment: document.getElementById('ec-data-venciment').value || null,
            prima_anual:    parseFloat(document.getElementById('ec-prima').value) || null,
            immobilitzat_id: document.getElementById('ec-immobilitzat').value || null,
            observacions:   document.getElementById('ec-observacions').value || null,
        };

        if (!dades.companyia)      throw new Error('La companyia és obligatòria');
        if (!dades.data_inici)     throw new Error('La data d\'inici és obligatòria');
        if (!dades.data_venciment) throw new Error('La data de venciment és obligatòria');

        await updateAltresPolissaV2(polissaId, dades);
        mostrarNotificacio('✅ Pòlissa actualitzada', 'success');
        await obrirModalDetallAltres(polissaId);
        if (typeof mostrarVistaAssegurances === 'function') await mostrarVistaAssegurances();

    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// GESTIÓ LÍNIES DE PAGAMENT
// ============================================================

function afegirLíniaPagamentAltres(polissaId) {
    // Si ja hi ha una fila de nou pagament, no obrim una altra
    if (document.getElementById('fila-nou-pagament')) return;
    const tbody = document.getElementById(`tbody-quotes-${polissaId}`);
    if (!tbody) return;
    const fila = document.createElement('tr');
    fila.id = 'fila-nou-pagament-wrapper';
    fila.innerHTML = renderitzarFilaNouPagament(polissaId).replace('<tr ', '<tr ').replace('</tr>', '');
    // Insertar directament com a fila
    tbody.insertAdjacentHTML('beforeend', renderitzarFilaNouPagament(polissaId));
    // Focus al primer camp
    setTimeout(() => { const f = document.getElementById('np-inici'); if (f) f.focus(); }, 50);
}

function actualitzarExerciciNouPagamentAltres(dataStr) {
    const camp = document.getElementById('np-exercici');
    if (camp && dataStr) camp.value = obtenirExerciciPerData(dataStr);
}

function actualitzarExerciciEditAltresV2(dataStr, quotaId) {
    const camp = document.getElementById(`eq-exercici-${quotaId}`);
    if (camp && dataStr) camp.value = obtenirExerciciPerData(dataStr);
}

function cancelarNouPagamentAltres() {
    const fila = document.getElementById('fila-nou-pagament');
    if (fila) fila.remove();
}

async function guardarNouPagamentAltresV2(polissaId) {
    try {
        const dataPag = document.getElementById('np-data-pag').value;
        const prima   = parseFloat(document.getElementById('np-prima').value);

        if (!dataPag) throw new Error('La data de pagament és obligatòria');
        if (isNaN(prima) || prima < 0) throw new Error('La prima ha de ser un valor vàlid');

        const quota = {
            asseguranca_id:       polissaId,
            data_inici_cobertura: document.getElementById('np-inici').value || null,
            data_fi_cobertura:    document.getElementById('np-fi').value || null,
            data_pagament:        dataPag,
            prima_anual:          prima,
            exercici:             obtenirExerciciPerData(dataPag),
            estat:                document.getElementById('np-estat').value,
            observacions:         document.getElementById('np-obs').value || null,
        };

        await createAltresQuotaV2(quota);
        mostrarNotificacio('✅ Pagament afegit', 'success');
        await recarregarQuotesAltres(polissaId);

    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function obrirEditorLíniaQuotaAltres(quotaId, polissaId) {
    // Obtenir dades quota
    const { data: quota, error } = await supabaseClient
        .from('assegurances_altres_quotes').select('*').eq('id', quotaId).single();
    if (error) { mostrarNotificacio('❌ Error: ' + error.message, 'error'); return; }

    const fila = document.querySelector(`tr[data-quota-id="${quotaId}"]`);
    if (!fila) return;
    fila.outerHTML = renderitzarFilaEditarPagament(quota, polissaId);
    setTimeout(() => {
        const f = document.getElementById(`eq-inici-${quotaId}`);
        if (f) f.focus();
    }, 50);
}

async function guardarEditorLíniaQuotaAltres(quotaId, polissaId) {
    try {
        const dataPag = document.getElementById(`eq-data-pag-${quotaId}`).value;
        const prima   = parseFloat(document.getElementById(`eq-prima-${quotaId}`).value);

        if (!dataPag) throw new Error('La data de pagament és obligatòria');
        if (isNaN(prima) || prima < 0) throw new Error('La prima ha de ser un valor vàlid');

        const quota = {
            data_inici_cobertura: document.getElementById(`eq-inici-${quotaId}`).value || null,
            data_fi_cobertura:    document.getElementById(`eq-fi-${quotaId}`).value || null,
            data_pagament:        dataPag,
            prima_anual:          prima,
            exercici:             obtenirExerciciPerData(dataPag),
            estat:                document.getElementById(`eq-estat-${quotaId}`).value,
            observacions:         document.getElementById(`eq-obs-${quotaId}`).value || null,
        };

        await updateAltresQuotaV2(quotaId, quota);
        mostrarNotificacio('✅ Pagament actualitzat', 'success');
        await recarregarQuotesAltres(polissaId);

    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function cancelarEditorLíniaQuotaAltres(quotaId, polissaId) {
    await recarregarQuotesAltres(polissaId);
}

async function eliminarLíniaQuotaAltres(quotaId, polissaId) {
    if (!confirm('⚠️ Eliminar aquest pagament?')) return;
    try {
        await deleteAltresQuotaV2(quotaId);
        mostrarNotificacio('✅ Pagament eliminat', 'success');
        await recarregarQuotesAltres(polissaId);
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function recarregarQuotesAltres(polissaId) {
    const quotes = await getAltresQuotesV2(polissaId);
    const tbody = document.getElementById(`tbody-quotes-${polissaId}`);
    if (tbody) tbody.innerHTML = renderitzarLíniesQuotes(quotes, polissaId);

    // Actualitzar totals
    const totalPagat   = quotes.filter(q => q.estat === 'pagada').reduce((s, q) => s + (parseFloat(q.prima_anual) || 0), 0);
    const totalPendent = quotes.filter(q => q.estat === 'pendent').reduce((s, q) => s + (parseFloat(q.prima_anual) || 0), 0);
    const resum = document.getElementById(`resum-totals-${polissaId}`);
    if (resum) resum.innerHTML = `
        <span>✅ Pagat: <strong>${formatEuroA(totalPagat)}</strong></span>
        <span style="margin-left:16px;">⏳ Pendent: <strong>${formatEuroA(totalPendent)}</strong></span>
    `;
}

// ============================================================
// ELIMINAR PÒLISSA
// ============================================================

async function eliminarPolissaAltresV2(polissaId) {
    const polissa = await getAltresPolissaByIdV2(polissaId);
    if (!confirm(`⚠️ Eliminar la pòlissa "${polissa.num_polissa}"?\n\nS'eliminaran també tots els pagaments. Aquesta acció no es pot desfer.`)) return;
    try {
        await deleteAltresPolissaV2(polissaId);
        mostrarNotificacio('✅ Pòlissa eliminada', 'success');
        tancarModal('modal-altres-principal');
        if (typeof mostrarVistaAssegurances === 'function') await mostrarVistaAssegurances();
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL NOVA PÒLISSA
// ============================================================

async function obrirModalNovaAltres() {
    try {
        const existent = document.getElementById('modal-nova-polissa-altres');
        if (existent) existent.remove();

        const immLlista = await getImmobilitzatLlistaV2();
        const optImm = `<option value="">— Cap (opcional) —</option>` +
            immLlista.map(i => `<option value="${i.id}">${i.descripció}${i.matrícula ? ' (' + i.matrícula + ')' : ''}</option>`).join('');

        const tipusOpts = ['auto','accidents','impagament','incendi','proteccio_juridica','RC','robatori','salut_laboral','viatges','vida','altra'];

        const modal = document.createElement('div');
        modal.className = 'modal-overlay-altres';
        modal.id = 'modal-nova-polissa-altres';

        modal.innerHTML = `
            <div class="modal-content-altres" style="max-width:580px;">
                <div class="modal-header">
                    <h2>➕ Nova Pòlissa Altres Assegurances</h2>
                    <button class="modal-close" onclick="tancarModal('modal-nova-polissa-altres')">✕</button>
                </div>
                <div class="modal-body" style="padding:16px;">
                    <form id="form-nova-polissa-altres" onsubmit="guardarNovaPolissaAltresV2(event)">

                        <fieldset>
                            <legend>📋 Identificació</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Companyia: *</label>
                                    <input type="text" name="companyia" required placeholder="Ex: Mapfre, AXA...">
                                </div>
                                <div class="form-group">
                                    <label>Nº Pòlissa: *</label>
                                    <input type="text" name="num_polissa" required placeholder="Ex: M263662-5">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Tipus: *</label>
                                    <select name="tipus_polissa" required>
                                        <option value="">— Selecciona —</option>
                                        ${tipusOpts.map(t => `<option value="${t}">${etiquetaTipusA(t)}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Estat:</label>
                                    <select name="estat">
                                        <option value="actiu">✅ Actiu</option>
                                        <option value="vençut">❌ Vençut</option>
                                        <option value="suspes">⏸️ Suspès</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Immobilitzat vinculat:</label>
                                <select name="immobilitzat_id">${optImm}</select>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>📅 Dates i Prima</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Data Inici: *</label>
                                    <input type="date" name="data_inici" required>
                                </div>
                                <div class="form-group">
                                    <label>Data Venciment: *</label>
                                    <input type="date" name="data_venciment" required>
                                </div>
                                <div class="form-group">
                                    <label>Prima Anual (€):</label>
                                    <input type="number" name="prima_anual" step="0.01" min="0" placeholder="0.00">
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>📝 Observacions</legend>
                            <div class="form-group">
                                <textarea name="observacions" rows="2" placeholder="Notes addicionals..."></textarea>
                            </div>
                        </fieldset>

                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nova-polissa-altres')">Cancel·lar</button>
                    <button type="submit" form="form-nova-polissa-altres" class="btn btn-primary">✅ Crear Pòlissa</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', e => {
            if (e.target === modal) tancarModal('modal-nova-polissa-altres');
        });

    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function guardarNovaPolissaAltresV2(event) {
    event.preventDefault();
    try {
        const form = event.target;
        const dades = new FormData(form);

        const polissa = {
            companyia:      dades.get('companyia').trim(),
            num_polissa:    dades.get('num_polissa').trim(),
            tipus_polissa:  dades.get('tipus_polissa'),
            estat:          dades.get('estat') || 'actiu',
            data_inici:     dades.get('data_inici'),
            data_venciment: dades.get('data_venciment'),
            prima_anual:    parseFloat(dades.get('prima_anual')) || null,
            exercici:       new Date().getFullYear(),
            immobilitzat_id: dades.get('immobilitzat_id') || null,
            observacions:   dades.get('observacions') || null,
        };

        if (!polissa.companyia)     throw new Error('La companyia és obligatòria');
        if (!polissa.num_polissa)   throw new Error('El número de pòlissa és obligatori');
        if (!polissa.tipus_polissa) throw new Error('El tipus és obligatori');
        if (!polissa.data_inici)    throw new Error('La data d\'inici és obligatòria');
        if (!polissa.data_venciment) throw new Error('La data de venciment és obligatòria');

        const nova = await createAltresPolissaV2(polissa);
        mostrarNotificacio('✅ Pòlissa creada correctament', 'success');
        tancarModal('modal-nova-polissa-altres');
        if (typeof mostrarVistaAssegurances === 'function') await mostrarVistaAssegurances();

        // Obrir directament el detall per afegir pagaments
        await obrirModalDetallAltres(nova.id);

    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// OVERRIDES DEL FITXER PRINCIPAL
// ============================================================

function obrirModalNovaAsseguranca() {
    obrirModalNovaAltres();
}

function obrirModalDetallAsseguranca(id) {
    obrirModalDetallAltres(id);
}

function obrirModalEditarAsseguranca(id) {
    obrirEditorCapcaleraAltres(id);
}

// ============================================================
// ESTILS
// ============================================================

(function injectarEstilsAltresV2() {
    if (document.getElementById('estils-altres-v2')) return;
    const style = document.createElement('style');
    style.id = 'estils-altres-v2';
    style.textContent = `
        #modal-altres-principal,
        #modal-nova-polissa-altres {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important; height: 100% !important;
            background: rgba(0,0,0,0.6) !important;
            z-index: 99999 !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            padding-top: 30px !important;
            overflow-y: auto !important;
        }
        .modal-content-altres {
            position: relative !important;
            z-index: 100000 !important;
            background: white !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
            width: 100% !important;
            max-width: 850px !important;
            max-height: 88vh !important;
            overflow-y: auto !important;
            margin-bottom: 30px !important;
        }
        .camps-polissa-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
        }
        .camp-pol { display: flex; flex-direction: column; gap: 2px; }
        .camp-pol-ample { grid-column: 1 / -1; }
        .camp-pol-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888; }
        .camp-pol-valor { font-size: 14px; color: #222; }
        .capsalera-polissa-altres {
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 12px;
        }
        .taula-quotes-pol {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .taula-quotes-pol th {
            padding: 8px 6px;
            background: #f5f5f5;
            border-bottom: 2px solid #ddd;
            text-align: left;
            white-space: nowrap;
        }
        .taula-quotes-pol td {
            padding: 7px 6px;
            border-bottom: 1px solid #eee;
        }
        .taula-quotes-pol tr:hover td { background: #fafafa; }
        .taula-quotes-pol input, .taula-quotes-pol select {
            padding: 4px 6px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 12px;
        }
        .resum-totals-quotes {
            margin-top: 10px;
            padding: 8px 12px;
            background: #f5f5f5;
            border-radius: 6px;
            font-size: 13px;
            text-align: right;
        }
        .btn-danger {
            background-color: #c62828 !important;
            color: white !important;
            border: none !important;
        }
        .btn-danger:hover { background-color: #8e0000 !important; }
    `;
    document.head.appendChild(style);
})();

console.log('✅ Assegurances Modals Altres v2 carregat');

// ============================================================
// OVERRIDE mostrarVistaAltresAsseg
// Substitueix la del fitxer principal (que mostrava duplicats
// perquè carregava un registre per pagament)
// ============================================================

async function mostrarVistaAltresAsseg() {
    try {
        const container = document.getElementById('altres-asseg-view');
        if (!container) return;

        // Preservar estat del checkbox si existeix
        const mostrarVencudes = document.getElementById('mostrar-vencudes-altres')?.checked || false;

        let html = `
            <div class="assegurances-header">
                <h3>🔐 Altres assegurances</h3>
                <div class="assegurances-controls">
                    <label>
                        <input type="checkbox" id="mostrar-vencudes-altres"
                            ${mostrarVencudes ? 'checked' : ''}
                            onchange="mostrarVistaAltresAsseg()">
                        Mostrar vençudes
                    </label>
                    <button class="btn-nova" onclick="obrirModalNovaAsseguranca()">
                        ➕ Nova assegurança
                    </button>
                </div>
            </div>
        `;

        // Carregar TOTES les pòlisses (sense filtre exercici — el nou model
        // no duplica per exercici, cada pòlissa és única)
        const { data: assegurances, error } = await supabaseClient
            .from('assegurances_altres')
            .select('*, immobilitzat_material(descripció, matrícula)')
            .order('data_venciment', { ascending: true });
        if (error) throw error;

        assegurancesAltresCache = assegurances || [];

        const avui = new Date();
        const filtrades = (assegurances || []).filter(a => {
            if (mostrarVencudes) return true;
            return a.estat === 'actiu';
        });

        if (filtrades.length === 0) {
            html += `<div class="no-data">Sense assegurances${mostrarVencudes ? '' : ' vigents'}</div>`;
        } else {
            html += `<div class="cards-grid">`;

            filtrades.forEach(ass => {
                const dataVenciment = formatData(ass.data_venciment);
                const prima = (ass.prima_anual || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const immInfo = ass.immobilitzat_material
                    ? ass.immobilitzat_material.descripció + (ass.immobilitzat_material.matrícula ? ` (${ass.immobilitzat_material.matrícula})` : '')
                    : '—';
                const estat = ass.estat === 'actiu' ? '✅' : ass.estat === 'vençut' ? '⏰' : '⚠️';

                html += `
                    <div class="card-polissa">
                        <div class="card-header">
                            <h4>${getTipusAssegurancaIcon(ass.tipus_polissa)} ${ass.companyia}</h4>
                            <span class="badge-estat">${estat} ${ass.estat}</span>
                        </div>
                        <div class="card-body">
                            <p><strong>Pòlissa:</strong> ${ass.num_polissa}</p>
                            <p><strong>Tipus:</strong> ${etiquetaTipusA(ass.tipus_polissa)}</p>
                            <p><strong>Vinculat:</strong> ${immInfo}</p>
                            <p><strong>Venciment:</strong> ${dataVenciment}</p>
                            <p><strong>Prima anual:</strong> ${prima}</p>
                        </div>
                        <div class="card-footer">
                            <button class="btn-small btn-veure" onclick="obrirModalDetallAltres('${ass.id}')">👁️ Veure</button>
                            <button class="btn-small btn-eliminar" onclick="eliminarPolissaAltresV2('${ass.id}')">🗑️</button>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        container.innerHTML = html;

    } catch (error) {
        console.error('Error mostrarVistaAltresAsseg:', error);
        const c = document.getElementById('altres-asseg-view');
        if (c) c.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}

// Override també de mostrarVistaAssegurances per si es crida des dels modals
async function mostrarVistaAssegurances() {
    await mostrarVistaAltresAsseg();
}