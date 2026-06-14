// ============================================================
// ASSEGURANCES MODALS ALTRES v1
// Modals DETALL, NOVA, EDITAR pòlissa + NOVA, EDITAR quota
// Taules: assegurances_altres + assegurances_altres_quotes
// ============================================================

// ============================================================
// HELPERS
// ============================================================

/**
 * Calcula l'exercici (campanya) a partir de la data de pagament:
 * Maig–Desembre → any de la data
 * Gener–Abril   → any anterior
 */
function obtenirExerciciPerDataPagament(dataPagament) {
    const data = new Date(dataPagament);
    const mes = data.getMonth() + 1; // 1-12
    const any = data.getFullYear();
    return (mes >= 5) ? any : any - 1;
}

function formatData(dataStr) {
    if (!dataStr) return '—';
    const d = new Date(dataStr);
    return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatEuro(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    return parseFloat(valor).toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function badgeEstatPolissa(estat) {
    const mapa = {
        'actiu':   { color: '#2d7a2d', bg: '#e8f5e9', label: '✅ Actiu' },
        'vençut':  { color: '#c62828', bg: '#ffebee', label: '❌ Vençut' },
        'suspes':  { color: '#e65100', bg: '#fff3e0', label: '⏸️ Suspès' },
    };
    const e = mapa[estat] || { color: '#666', bg: '#eee', label: estat };
    return `<span style="background:${e.bg};color:${e.color};padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${e.label}</span>`;
}

function badgeEstatQuota(estat) {
    const mapa = {
        'pagada':      { color: '#2d7a2d', bg: '#e8f5e9', label: '✅ Pagada' },
        'pendent':     { color: '#e65100', bg: '#fff3e0', label: '⏳ Pendent' },
        'cancel·lada': { color: '#c62828', bg: '#ffebee', label: '❌ Cancel·lada' },
    };
    const e = mapa[estat] || { color: '#666', bg: '#eee', label: estat };
    return `<span style="background:${e.bg};color:${e.color};padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;">${e.label}</span>`;
}

function etiquetaTipusPolissa(tipus) {
    const mapa = {
        'auto': '🚗 Auto',
        'accidents': '🏥 Accidents',
        'impagament': '💸 Impagament',
        'incendi': '🔥 Incendi',
        'proteccio_juridica': '⚖️ Protecció Jurídica',
        'RC': '🛡️ Responsabilitat Civil',
        'robatori': '🔒 Robatori',
        'salut_laboral': '👷 Salut Laboral',
        'viatges': '✈️ Viatges',
        'vida': '❤️ Vida',
        'altra': '📋 Altra',
    };
    return mapa[tipus] || tipus;
}

// ============================================================
// SUPABASE CRUD — PÒLISSES ALTRES
// ============================================================

async function getAltresPolisses() {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .select('*, immobilitzat_material(descripció, tipus, matrícula)')
        .order('data_venciment', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function getAltresPolissaById(id) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .select('*, immobilitzat_material(id, descripció, tipus, matrícula)')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

async function createAltresPolissa(polissa) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .insert([polissa])
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function updateAltresPolissa(id, polissa) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .update({ ...polissa, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function deleteAltresPolissa(id) {
    const { error } = await supabaseClient
        .from('assegurances_altres')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// SUPABASE CRUD — QUOTES ALTRES
// ============================================================

async function getAltresQuotesPerPolissa(assegurancaId) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .select('*')
        .eq('asseguranca_id', assegurancaId)
        .order('data_pagament', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function createAltresQuota(quota) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .insert([quota])
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function updateAltresQuota(id, quota) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .update({ ...quota, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function deleteAltresQuota(id) {
    const { error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

async function getImmobilitzatLlista() {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .select('id, descripció, tipus, matrícula')
        .order('descripció', { ascending: true });
    if (error) throw error;
    return data || [];
}

// ============================================================
// MODAL DETALL PÒLISSA (2 blocs: dades + pagaments)
// ============================================================

async function obrirModalDetallAltres(polissaId) {
    try {
        // Tancar modal anterior si existeix
        const existent = document.getElementById('modal-detall-altres');
        if (existent) existent.remove();

        const polissa = await getAltresPolissaById(polissaId);
        const quotes = await getAltresQuotesPerPolissa(polissaId);

        const immobilitzatInfo = polissa.immobilitzat_material
            ? `${polissa.immobilitzat_material.descripció}${polissa.immobilitzat_material.matrícula ? ' (' + polissa.immobilitzat_material.matrícula + ')' : ''}`
            : '—';

        const filesQuotes = quotes.length > 0
            ? quotes.map(q => `
                <tr>
                    <td>${formatData(q.data_pagament)}</td>
                    <td>${q.exercici}</td>
                    <td style="font-weight:600;">${formatEuro(q.prima_anual)}</td>
                    <td>${badgeEstatQuota(q.estat)}</td>
                    <td>${q.observacions || '—'}</td>
                    <td style="white-space:nowrap;">
                        <button class="btn btn-sm btn-secondary" onclick="obrirModalEditarQuotaAltres('${q.id}', '${polissaId}')" title="Editar">✏️</button>
                        <button class="btn btn-sm btn-danger" onclick="confirmarEliminarQuotaAltres('${q.id}', '${polissaId}')" title="Eliminar">🗑️</button>
                    </td>
                </tr>
            `).join('')
            : `<tr><td colspan="6" style="text-align:center;color:#888;padding:20px;">Cap pagament registrat</td></tr>`;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-detall-altres';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:750px;">
                <div class="modal-header">
                    <h2>🛡️ Detall Pòlissa — ${polissa.num_polissa}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-detall-altres')">✕</button>
                </div>

                <div class="modal-body">

                    <!-- ═══ BLOC A — DADES PÒLISSA ═══ -->
                    <fieldset>
                        <legend>📋 A — Dades Pòlissa</legend>

                        <div class="detall-grid">
                            <div class="detall-camp">
                                <span class="detall-label">Companyia</span>
                                <span class="detall-valor">${polissa.companyia}</span>
                            </div>
                            <div class="detall-camp">
                                <span class="detall-label">Nº Pòlissa</span>
                                <span class="detall-valor">${polissa.num_polissa}</span>
                            </div>
                            <div class="detall-camp">
                                <span class="detall-label">Tipus</span>
                                <span class="detall-valor">${etiquetaTipusPolissa(polissa.tipus_polissa)}</span>
                            </div>
                            <div class="detall-camp">
                                <span class="detall-label">Estat</span>
                                <span class="detall-valor">${badgeEstatPolissa(polissa.estat)}</span>
                            </div>
                            <div class="detall-camp">
                                <span class="detall-label">Data Inici</span>
                                <span class="detall-valor">${formatData(polissa.data_inici)}</span>
                            </div>
                            <div class="detall-camp">
                                <span class="detall-label">Data Venciment</span>
                                <span class="detall-valor">${formatData(polissa.data_venciment)}</span>
                            </div>
                            <div class="detall-camp">
                                <span class="detall-label">Prima Anual</span>
                                <span class="detall-valor" style="font-weight:700;font-size:15px;">${formatEuro(polissa.prima_anual)}</span>
                            </div>
                            <div class="detall-camp">
                                <span class="detall-label">Exercici</span>
                                <span class="detall-valor">${polissa.exercici}</span>
                            </div>
                            <div class="detall-camp detall-camp-ample">
                                <span class="detall-label">Immobilitzat vinculat</span>
                                <span class="detall-valor">${immobilitzatInfo}</span>
                            </div>
                            ${polissa.observacions ? `
                            <div class="detall-camp detall-camp-ample">
                                <span class="detall-label">Observacions</span>
                                <span class="detall-valor">${polissa.observacions}</span>
                            </div>` : ''}
                        </div>

                        <div style="margin-top:12px;display:flex;gap:8px;">
                            <button class="btn btn-secondary btn-sm" onclick="obrirModalEditarAltres('${polissaId}')">
                                ✏️ Editar dades
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="confirmarEliminarPolissaAltres('${polissaId}')">
                                🗑️ Eliminar pòlissa
                            </button>
                        </div>
                    </fieldset>

                    <!-- ═══ BLOC B — PAGAMENTS ═══ -->
                    <fieldset style="margin-top:16px;">
                        <legend>💳 B — Dades de Pagament</legend>

                        <div style="overflow-x:auto;">
                            <table class="taula-quotes-altres" style="width:100%;border-collapse:collapse;font-size:13px;">
                                <thead>
                                    <tr style="background:#f5f5f5;">
                                        <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Data Pagament</th>
                                        <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Exercici</th>
                                        <th style="padding:8px;text-align:right;border-bottom:2px solid #ddd;">Prima (€)</th>
                                        <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Estat</th>
                                        <th style="padding:8px;text-align:left;border-bottom:2px solid #ddd;">Observacions</th>
                                        <th style="padding:8px;text-align:center;border-bottom:2px solid #ddd;">Accions</th>
                                    </tr>
                                </thead>
                                <tbody id="tbody-quotes-altres-${polissaId}">
                                    ${filesQuotes}
                                </tbody>
                            </table>
                        </div>

                        <div style="margin-top:12px;">
                            <button class="btn btn-primary btn-sm" onclick="obrirModalNouPagamentAltres('${polissaId}')">
                                ➕ Nou pagament
                            </button>
                        </div>
                    </fieldset>

                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="tancarModal('modal-detall-altres')">Tancar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) tancarModal('modal-detall-altres');
        });

    } catch (error) {
        console.error('Error obrint detall:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL NOVA PÒLISSA ALTRES
// ============================================================

async function obrirModalNovaAltres() {
    try {
        const existent = document.getElementById('modal-nova-altres');
        if (existent) existent.remove();

        // Carregar llista immobilitzat
        const immobilitzatLlista = await getImmobilitzatLlista();
        const optionsImmobilitzat = `
            <option value="">— Cap (opcional) —</option>
            ${immobilitzatLlista.map(i => `
                <option value="${i.id}">${i.descripció}${i.matrícula ? ' (' + i.matrícula + ')' : ''}</option>
            `).join('')}
        `;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-nova-altres';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h2>➕ Nova Pòlissa Altres Assegurances</h2>
                    <button class="modal-close" onclick="tancarModal('modal-nova-altres')">✕</button>
                </div>

                <div class="modal-body">
                    <form id="form-nova-altres" onsubmit="guardarNovaPolissaAltres(event)">

                        <fieldset>
                            <legend>📋 Identificació</legend>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="na-companyia">Companyia: *</label>
                                    <input type="text" id="na-companyia" name="companyia" required placeholder="Ex: Mapfre, AXA...">
                                </div>
                                <div class="form-group">
                                    <label for="na-num-polissa">Nº Pòlissa: *</label>
                                    <input type="text" id="na-num-polissa" name="num_polissa" required placeholder="Ex: M263662-5">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="na-tipus">Tipus Pòlissa: *</label>
                                    <select id="na-tipus" name="tipus_polissa" required>
                                        <option value="">— Selecciona —</option>
                                        <option value="auto">🚗 Auto</option>
                                        <option value="accidents">🏥 Accidents</option>
                                        <option value="impagament">💸 Impagament</option>
                                        <option value="incendi">🔥 Incendi</option>
                                        <option value="proteccio_juridica">⚖️ Protecció Jurídica</option>
                                        <option value="RC">🛡️ Responsabilitat Civil</option>
                                        <option value="robatori">🔒 Robatori</option>
                                        <option value="salut_laboral">👷 Salut Laboral</option>
                                        <option value="viatges">✈️ Viatges</option>
                                        <option value="vida">❤️ Vida</option>
                                        <option value="altra">📋 Altra</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="na-estat">Estat: *</label>
                                    <select id="na-estat" name="estat" required>
                                        <option value="actiu">✅ Actiu</option>
                                        <option value="vençut">❌ Vençut</option>
                                        <option value="suspes">⏸️ Suspès</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="na-immobilitzat">Immobilitzat vinculat:</label>
                                <select id="na-immobilitzat" name="immobilitzat_id">
                                    ${optionsImmobilitzat}
                                </select>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>📅 Dates</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="na-data-inici">Data Inici: *</label>
                                    <input type="date" id="na-data-inici" name="data_inici" required>
                                </div>
                                <div class="form-group">
                                    <label for="na-data-venciment">Data Venciment: *</label>
                                    <input type="date" id="na-data-venciment" name="data_venciment" required>
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>💰 Prima</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="na-prima-anual">Prima Anual (€):</label>
                                    <input type="number" id="na-prima-anual" name="prima_anual" step="0.01" min="0" placeholder="0.00">
                                </div>
                                <div class="form-group">
                                    <label for="na-exercici">Exercici: *</label>
                                    <input type="number" id="na-exercici" name="exercici" required value="${new Date().getFullYear()}">
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>📝 Observacions</legend>
                            <div class="form-group">
                                <label for="na-observacions">Observacions:</label>
                                <textarea id="na-observacions" name="observacions" rows="3" placeholder="Notes addicionals..."></textarea>
                            </div>
                        </fieldset>

                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nova-altres')">Cancel·lar</button>
                    <button type="submit" form="form-nova-altres" class="btn btn-primary">✅ Guardar Pòlissa</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) tancarModal('modal-nova-altres');
        });

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error obrint modal: ' + error.message, 'error');
    }
}

// ============================================================
// GUARDAR NOVA PÒLISSA ALTRES
// ============================================================

async function guardarNovaPolissaAltres(event) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-nova-altres');
        const dades = new FormData(form);

        const polissa = {
            companyia:      dades.get('companyia').trim(),
            num_polissa:    dades.get('num_polissa').trim(),
            tipus_polissa:  dades.get('tipus_polissa'),
            estat:          dades.get('estat'),
            data_inici:     dades.get('data_inici'),
            data_venciment: dades.get('data_venciment'),
            prima_anual:    parseFloat(dades.get('prima_anual')) || null,
            exercici:       parseInt(dades.get('exercici')),
            immobilitzat_id: dades.get('immobilitzat_id') || null,
            observacions:   dades.get('observacions') || null,
        };

        // Validacions
        if (!polissa.companyia)      throw new Error('La companyia és obligatòria');
        if (!polissa.num_polissa)    throw new Error('El número de pòlissa és obligatori');
        if (!polissa.tipus_polissa)  throw new Error('El tipus de pòlissa és obligatori');
        if (!polissa.data_inici)     throw new Error('La data d\'inici és obligatòria');
        if (!polissa.data_venciment) throw new Error('La data de venciment és obligatòria');

        await createAltresPolissa(polissa);

        mostrarNotificacio('✅ Pòlissa creada correctament', 'success');
        tancarModal('modal-nova-altres');

        // Recarregar vista assegurances
        if (typeof mostrarVistaAssegurances === 'function') await mostrarVistaAssegurances();

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL EDITAR PÒLISSA ALTRES
// ============================================================

async function obrirModalEditarAltres(polissaId) {
    try {
        // Tancar modal detall si estava obert
        const detall = document.getElementById('modal-detall-altres');
        if (detall) detall.remove();

        const existent = document.getElementById('modal-editar-altres');
        if (existent) existent.remove();

        const polissa = await getAltresPolissaById(polissaId);
        const immobilitzatLlista = await getImmobilitzatLlista();

        const optionsImmobilitzat = `
            <option value="">— Cap (opcional) —</option>
            ${immobilitzatLlista.map(i => `
                <option value="${i.id}" ${polissa.immobilitzat_id === i.id ? 'selected' : ''}>
                    ${i.descripció}${i.matrícula ? ' (' + i.matrícula + ')' : ''}
                </option>
            `).join('')}
        `;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-editar-altres';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:600px;">
                <div class="modal-header">
                    <h2>✏️ Editar Pòlissa — ${polissa.num_polissa}</h2>
                    <button class="modal-close" onclick="tancarModalEditarAltresIReobrir('${polissaId}')">✕</button>
                </div>

                <div class="modal-body">
                    <form id="form-editar-altres" onsubmit="guardarEdicionPolissaAltres(event, '${polissaId}')">

                        <fieldset>
                            <legend>📋 Identificació</legend>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ea-companyia">Companyia: *</label>
                                    <input type="text" id="ea-companyia" name="companyia" required value="${polissa.companyia}">
                                </div>
                                <div class="form-group">
                                    <label for="ea-num-polissa">Nº Pòlissa:</label>
                                    <input type="text" id="ea-num-polissa" value="${polissa.num_polissa}" readonly style="background:#f5f5f5;cursor:not-allowed;">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ea-tipus">Tipus Pòlissa: *</label>
                                    <select id="ea-tipus" name="tipus_polissa" required>
                                        <option value="auto"               ${polissa.tipus_polissa === 'auto'               ? 'selected' : ''}>🚗 Auto</option>
                                        <option value="accidents"          ${polissa.tipus_polissa === 'accidents'          ? 'selected' : ''}>🏥 Accidents</option>
                                        <option value="impagament"         ${polissa.tipus_polissa === 'impagament'         ? 'selected' : ''}>💸 Impagament</option>
                                        <option value="incendi"            ${polissa.tipus_polissa === 'incendi'            ? 'selected' : ''}>🔥 Incendi</option>
                                        <option value="proteccio_juridica" ${polissa.tipus_polissa === 'proteccio_juridica' ? 'selected' : ''}>⚖️ Protecció Jurídica</option>
                                        <option value="RC"                 ${polissa.tipus_polissa === 'RC'                 ? 'selected' : ''}>🛡️ Responsabilitat Civil</option>
                                        <option value="robatori"           ${polissa.tipus_polissa === 'robatori'           ? 'selected' : ''}>🔒 Robatori</option>
                                        <option value="salut_laboral"      ${polissa.tipus_polissa === 'salut_laboral'      ? 'selected' : ''}>👷 Salut Laboral</option>
                                        <option value="viatges"            ${polissa.tipus_polissa === 'viatges'            ? 'selected' : ''}>✈️ Viatges</option>
                                        <option value="vida"               ${polissa.tipus_polissa === 'vida'               ? 'selected' : ''}>❤️ Vida</option>
                                        <option value="altra"              ${polissa.tipus_polissa === 'altra'              ? 'selected' : ''}>📋 Altra</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="ea-estat">Estat: *</label>
                                    <select id="ea-estat" name="estat" required>
                                        <option value="actiu"  ${polissa.estat === 'actiu'  ? 'selected' : ''}>✅ Actiu</option>
                                        <option value="vençut" ${polissa.estat === 'vençut' ? 'selected' : ''}>❌ Vençut</option>
                                        <option value="suspes" ${polissa.estat === 'suspes' ? 'selected' : ''}>⏸️ Suspès</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="ea-immobilitzat">Immobilitzat vinculat:</label>
                                <select id="ea-immobilitzat" name="immobilitzat_id">
                                    ${optionsImmobilitzat}
                                </select>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>📅 Dates</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ea-data-inici">Data Inici: *</label>
                                    <input type="date" id="ea-data-inici" name="data_inici" required value="${polissa.data_inici || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="ea-data-venciment">Data Venciment: *</label>
                                    <input type="date" id="ea-data-venciment" name="data_venciment" required value="${polissa.data_venciment || ''}">
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>💰 Prima</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="ea-prima-anual">Prima Anual (€):</label>
                                    <input type="number" id="ea-prima-anual" name="prima_anual" step="0.01" min="0" value="${polissa.prima_anual || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="ea-exercici">Exercici:</label>
                                    <input type="number" id="ea-exercici" value="${polissa.exercici}" readonly style="background:#f5f5f5;cursor:not-allowed;">
                                </div>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>📝 Observacions</legend>
                            <div class="form-group">
                                <label for="ea-observacions">Observacions:</label>
                                <textarea id="ea-observacions" name="observacions" rows="3">${polissa.observacions || ''}</textarea>
                            </div>
                        </fieldset>

                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tancarModalEditarAltresIReobrir('${polissaId}')">Cancel·lar</button>
                    <button type="submit" form="form-editar-altres" class="btn btn-primary">✅ Guardar Canvis</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) tancarModalEditarAltresIReobrir(polissaId);
        });

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function tancarModalEditarAltresIReobrir(polissaId) {
    tancarModal('modal-editar-altres');
    await obrirModalDetallAltres(polissaId);
}

// ============================================================
// GUARDAR EDICIÓ PÒLISSA ALTRES
// ============================================================

async function guardarEdicionPolissaAltres(event, polissaId) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-editar-altres');
        const dades = new FormData(form);

        const polissa = {
            companyia:      dades.get('companyia').trim(),
            tipus_polissa:  dades.get('tipus_polissa'),
            estat:          dades.get('estat'),
            data_inici:     dades.get('data_inici'),
            data_venciment: dades.get('data_venciment'),
            prima_anual:    parseFloat(dades.get('prima_anual')) || null,
            immobilitzat_id: dades.get('immobilitzat_id') || null,
            observacions:   dades.get('observacions') || null,
        };

        if (!polissa.companyia)      throw new Error('La companyia és obligatòria');
        if (!polissa.tipus_polissa)  throw new Error('El tipus de pòlissa és obligatori');
        if (!polissa.data_inici)     throw new Error('La data d\'inici és obligatòria');
        if (!polissa.data_venciment) throw new Error('La data de venciment és obligatòria');

        await updateAltresPolissa(polissaId, polissa);

        mostrarNotificacio('✅ Pòlissa actualitzada correctament', 'success');
        tancarModal('modal-editar-altres');

        // Reobrir detall amb dades actualitzades
        await obrirModalDetallAltres(polissaId);

        // Recarregar vista
        if (typeof mostrarVistaAssegurances === 'function') await mostrarVistaAssegurances();

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// CONFIRMAR ELIMINAR PÒLISSA ALTRES
// ============================================================

async function confirmarEliminarPolissaAltres(polissaId) {
    const polissa = await getAltresPolissaById(polissaId);
    if (!confirm(`⚠️ Eliminar la pòlissa "${polissa.num_polissa}" de ${polissa.companyia}?\n\nAquesta acció eliminarà també tots els pagaments associats i no es pot desfer.`)) return;

    try {
        await deleteAltresPolissa(polissaId);
        mostrarNotificacio('✅ Pòlissa eliminada correctament', 'success');
        tancarModal('modal-detall-altres');
        if (typeof mostrarVistaAssegurances === 'function') await mostrarVistaAssegurances();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error eliminant pòlissa: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL NOU PAGAMENT (QUOTA) ALTRES
// ============================================================

function obrirModalNouPagamentAltres(polissaId) {
    const existent = document.getElementById('modal-nou-pagament-altres');
    if (existent) existent.remove();

    const avui = new Date().toISOString().split('T')[0];

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-nou-pagament-altres';

    modal.innerHTML = `
        <div class="modal-content" style="max-width:450px;">
            <div class="modal-header">
                <h2>➕ Nou Pagament</h2>
                <button class="modal-close" onclick="tancarModal('modal-nou-pagament-altres')">✕</button>
            </div>

            <div class="modal-body">
                <form id="form-nou-pagament-altres" onsubmit="guardarNouPagamentAltres(event, '${polissaId}')">

                    <fieldset>
                        <legend>💳 Dades Pagament</legend>

                        <div class="form-group">
                            <label for="np-data-pagament">Data Pagament: *</label>
                            <input 
                                type="date" 
                                id="np-data-pagament" 
                                name="data_pagament" 
                                value="${avui}"
                                required
                                onchange="actualitzarExerciciAutoAltres(this.value)"
                            >
                        </div>

                        <div class="form-group">
                            <label for="np-exercici">Exercici (calculat automàticament):</label>
                            <input 
                                type="number" 
                                id="np-exercici" 
                                name="exercici" 
                                value="${obtenirExerciciPerDataPagament(avui)}"
                                readonly 
                                style="background:#f0f7ee;border-color:#2d7a2d;font-weight:600;cursor:not-allowed;"
                            >
                            <small style="color:#888;margin-top:4px;">Maig–Des → any actual · Gen–Abr → any anterior</small>
                        </div>

                        <div class="form-group">
                            <label for="np-prima">Prima Pagada (€): *</label>
                            <input type="number" id="np-prima" name="prima_anual" step="0.01" min="0" required placeholder="0.00">
                        </div>

                        <div class="form-group">
                            <label for="np-estat">Estat: *</label>
                            <select id="np-estat" name="estat" required>
                                <option value="pagada">✅ Pagada</option>
                                <option value="pendent" selected>⏳ Pendent</option>
                                <option value="cancel·lada">❌ Cancel·lada</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="np-observacions">Observacions:</label>
                            <textarea id="np-observacions" name="observacions" rows="2" placeholder="Notes..."></textarea>
                        </div>
                    </fieldset>

                </form>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nou-pagament-altres')">Cancel·lar</button>
                <button type="submit" form="form-nou-pagament-altres" class="btn btn-primary">✅ Guardar Pagament</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) tancarModal('modal-nou-pagament-altres');
    });
}

// Actualitza l'exercici en temps real quan canvia la data
function actualitzarExerciciAutoAltres(dataStr) {
    const camp = document.getElementById('np-exercici');
    if (!camp || !dataStr) return;
    camp.value = obtenirExerciciPerDataPagament(dataStr);
}

// ============================================================
// GUARDAR NOU PAGAMENT ALTRES
// ============================================================

async function guardarNouPagamentAltres(event, polissaId) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-nou-pagament-altres');
        const dades = new FormData(form);

        const quota = {
            asseguranca_id: polissaId,
            data_pagament:  dades.get('data_pagament') || null,
            exercici:       obtenirExerciciPerDataPagament(dades.get('data_pagament')),
            prima_anual:    parseFloat(dades.get('prima_anual')),
            estat:          dades.get('estat'),
            observacions:   dades.get('observacions') || null,
        };

        if (!quota.data_pagament) throw new Error('La data de pagament és obligatòria');
        if (isNaN(quota.prima_anual) || quota.prima_anual < 0) throw new Error('La prima ha de ser un valor vàlid');

        await createAltresQuota(quota);

        mostrarNotificacio('✅ Pagament registrat correctament', 'success');
        tancarModal('modal-nou-pagament-altres');

        // Recarregar detall
        await obrirModalDetallAltres(polissaId);

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL EDITAR QUOTA ALTRES
// ============================================================

async function obrirModalEditarQuotaAltres(quotaId, polissaId) {
    try {
        const existent = document.getElementById('modal-editar-quota-altres');
        if (existent) existent.remove();

        const { data: quota, error } = await supabaseClient
            .from('assegurances_altres_quotes')
            .select('*')
            .eq('id', quotaId)
            .single();
        if (error) throw error;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-editar-quota-altres';

        modal.innerHTML = `
            <div class="modal-content" style="max-width:450px;">
                <div class="modal-header">
                    <h2>✏️ Editar Pagament</h2>
                    <button class="modal-close" onclick="tancarModal('modal-editar-quota-altres')">✕</button>
                </div>

                <div class="modal-body">
                    <form id="form-editar-quota-altres" onsubmit="guardarEdicionQuotaAltres(event, '${quotaId}', '${polissaId}')">

                        <fieldset>
                            <legend>💳 Dades Pagament</legend>

                            <div class="form-group">
                                <label for="eq-data-pagament">Data Pagament: *</label>
                                <input 
                                    type="date" 
                                    id="eq-data-pagament" 
                                    name="data_pagament" 
                                    value="${quota.data_pagament || ''}"
                                    required
                                    onchange="actualitzarExerciciEditAltres(this.value)"
                                >
                            </div>

                            <div class="form-group">
                                <label for="eq-exercici">Exercici (calculat automàticament):</label>
                                <input 
                                    type="number" 
                                    id="eq-exercici" 
                                    name="exercici" 
                                    value="${quota.exercici}"
                                    readonly 
                                    style="background:#f0f7ee;border-color:#2d7a2d;font-weight:600;cursor:not-allowed;"
                                >
                            </div>

                            <div class="form-group">
                                <label for="eq-prima">Prima Pagada (€): *</label>
                                <input type="number" id="eq-prima" name="prima_anual" step="0.01" min="0" required value="${quota.prima_anual || ''}">
                            </div>

                            <div class="form-group">
                                <label for="eq-estat">Estat: *</label>
                                <select id="eq-estat" name="estat" required>
                                    <option value="pagada"      ${quota.estat === 'pagada'      ? 'selected' : ''}>✅ Pagada</option>
                                    <option value="pendent"     ${quota.estat === 'pendent'     ? 'selected' : ''}>⏳ Pendent</option>
                                    <option value="cancel·lada" ${quota.estat === 'cancel·lada' ? 'selected' : ''}>❌ Cancel·lada</option>
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="eq-observacions">Observacions:</label>
                                <textarea id="eq-observacions" name="observacions" rows="2">${quota.observacions || ''}</textarea>
                            </div>
                        </fieldset>

                    </form>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-editar-quota-altres')">Cancel·lar</button>
                    <button type="submit" form="form-editar-quota-altres" class="btn btn-primary">✅ Guardar Canvis</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) tancarModal('modal-editar-quota-altres');
        });

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

function actualitzarExerciciEditAltres(dataStr) {
    const camp = document.getElementById('eq-exercici');
    if (!camp || !dataStr) return;
    camp.value = obtenirExerciciPerDataPagament(dataStr);
}

// ============================================================
// GUARDAR EDICIÓ QUOTA ALTRES
// ============================================================

async function guardarEdicionQuotaAltres(event, quotaId, polissaId) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-editar-quota-altres');
        const dades = new FormData(form);

        const quota = {
            data_pagament: dades.get('data_pagament') || null,
            exercici:      obtenirExerciciPerDataPagament(dades.get('data_pagament')),
            prima_anual:   parseFloat(dades.get('prima_anual')),
            estat:         dades.get('estat'),
            observacions:  dades.get('observacions') || null,
        };

        if (!quota.data_pagament) throw new Error('La data de pagament és obligatòria');
        if (isNaN(quota.prima_anual) || quota.prima_anual < 0) throw new Error('La prima ha de ser un valor vàlid');

        await updateAltresQuota(quotaId, quota);

        mostrarNotificacio('✅ Pagament actualitzat correctament', 'success');
        tancarModal('modal-editar-quota-altres');

        // Recarregar detall
        await obrirModalDetallAltres(polissaId);

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// CONFIRMAR ELIMINAR QUOTA ALTRES
// ============================================================

async function confirmarEliminarQuotaAltres(quotaId, polissaId) {
    if (!confirm('⚠️ Eliminar aquest pagament? Aquesta acció no es pot desfer.')) return;

    try {
        await deleteAltresQuota(quotaId);
        mostrarNotificacio('✅ Pagament eliminat correctament', 'success');

        // Recarregar detall
        await obrirModalDetallAltres(polissaId);

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error eliminant pagament: ' + error.message, 'error');
    }
}

// ============================================================
// ESTILS INLINE (detall grid)
// ============================================================

(function injectarEstilsDetallAltres() {
    if (document.getElementById('estils-detall-altres')) return;
    const style = document.createElement('style');
    style.id = 'estils-detall-altres';
    style.textContent = `
        #modal-nova-altres,
        #modal-editar-altres,
        #modal-detall-altres,
        #modal-nou-pagament-altres,
        #modal-editar-quota-altres {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.6) !important;
            z-index: 99999 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            overflow-y: auto !important;
        }
        #modal-nova-altres .modal-content,
        #modal-editar-altres .modal-content,
        #modal-detall-altres .modal-content,
        #modal-nou-pagament-altres .modal-content,
        #modal-editar-quota-altres .modal-content {
            position: relative !important;
            z-index: 100000 !important;
            max-height: 90vh !important;
            overflow-y: auto !important;
            background: white !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
        }
        .detall-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 20px;
        }
        .detall-camp {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .detall-camp-ample {
            grid-column: 1 / -1;
        }
        .detall-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            color: #888;
            letter-spacing: 0.5px;
        }
        .detall-valor {
            font-size: 14px;
            color: #222;
        }
        .taula-quotes-altres td {
            padding: 8px;
            border-bottom: 1px solid #eee;
        }
        .taula-quotes-altres tr:hover td {
            background: #f9f9f9;
        }
        .btn-danger {
            background-color: #c62828;
            color: white;
            border: none;
        }
        .btn-danger:hover {
            background-color: #8e0000;
        }
    `;
    document.head.appendChild(style);
})();

// ============================================================
// OVERRIDE PLACEHOLDERS DEL FITXER PRINCIPAL
// Substitueix les funcions "A implementar" de assegurances-unificat_v2-FINAL.js
// (aquest fitxer es carrega després, per tant sobreescriu automàticament)
// ============================================================

function obrirModalNovaAsseguranca() {
    obrirModalNovaAltres();
}

function obrirModalDetallAsseguranca(assegurancaId) {
    obrirModalDetallAltres(assegurancaId);
}

function obrirModalEditarAsseguranca(id) {
    obrirModalEditarAltres(id);
}

console.log('✅ Assegurances Modals Altres v1 carregat');