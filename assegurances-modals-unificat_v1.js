// ============================================================
// ASSEGURANCES MODALS UNIFICAT v1
// Gestiona categories: 'altres' i 'civil'
// Taules: assegurances_altres + assegurances_altres_quotes
// ============================================================

// ============================================================
// HELPERS
// ============================================================

function formatDataU(dataStr) {
    if (!dataStr) return '—';
    const d = new Date(dataStr + 'T00:00:00');
    return d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatEuroU(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    return parseFloat(valor).toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function obtenirExerciciPerDataU(dataStr) {
    if (!dataStr) return new Date().getFullYear();
    const d = new Date(dataStr + 'T00:00:00');
    return d.getFullYear();
}

function badgeEstatU(estat, tipus = 'polissa') {
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

function etiquetaTipusU(tipus) {
    const mapa = {
        'auto': '🚗 Auto', 'accidents': '🏥 Accidents',
        'impagament': '💸 Impagament', 'incendi': '🔥 Incendi',
        'proteccio_juridica': '⚖️ Protecció Jurídica',
        'RC': '🛡️ Responsabilitat Civil', 'robatori': '🔒 Robatori',
        'salut_laboral': '👷 Salut Laboral', 'viatges': '✈️ Viatges',
        'vida': '❤️ Vida', 'llar': '🏠 Llar', 'leasing': '📄 Leasing',
        'altra': '📋 Altra',
    };
    return mapa[tipus] || tipus;
}

function etiquetaTascaU(tasca) {
    const mapa = { 'agrícola': '🌾 Agrícola', 'construcció': '🏗️ Construcció' };
    return mapa[tasca] || tasca || '—';
}

function configCategoria(categoria) {
    if (categoria === 'civil') {
        return {
            titol: '⚖️ Responsabilitat Civil',
            iconaNova: '➕ Nova pòlissa RC',
            tipusOpts: null, // RC no té tipus_polissa
            campsTipus: false,
            campsCivil: true,
        };
    }
    return {
        titol: '🔐 Altres assegurances',
        iconaNova: '➕ Nova assegurança',
        tipusOpts: ['auto','accidents','impagament','incendi','proteccio_juridica','RC','robatori','salut_laboral','viatges','vida','llar','leasing','altra'],
        campsTipus: true,
        campsCivil: false,
    };
}

// ============================================================
// SUPABASE CRUD
// ============================================================

async function getPolissaByIdU(id) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .select('*, immobilitzat_material(id, descripció, tipus, matrícula)')
        .eq('id', id).single();
    if (error) throw error;
    return data;
}

async function getQuotesPerPolissaU(assegurancaId) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .select('*')
        .eq('asseguranca_id', assegurancaId)
        .order('data_inici_cobertura', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function createPolissaU(polissa) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .insert([polissa]).select().single();
    if (error) throw error;
    return data;
}

async function updatePolissaU(id, polissa) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .update({ ...polissa, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
    if (error) throw error;
    return data;
}

async function deletePolissaU(id) {
    const { error } = await supabaseClient
        .from('assegurances_altres').delete().eq('id', id);
    if (error) throw error;
}

async function createQuotaU(quota) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .insert([quota]).select().single();
    if (error) throw error;
    return data;
}

async function updateQuotaU(id, quota) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .update({ ...quota, updated_at: new Date().toISOString() })
        .eq('id', id).select().single();
    if (error) throw error;
    return data;
}

async function deleteQuotaU(id) {
    const { error } = await supabaseClient
        .from('assegurances_altres_quotes').delete().eq('id', id);
    if (error) throw error;
}

function obtenirQuotaVigentU(quotes) {
    if (!quotes || quotes.length === 0) return null;
    // La vigent és la de data_fi_cobertura més recent (pagada o pendent, no importa)
    return quotes.reduce((vigent, q) => {
        if (!q.data_fi_cobertura) return vigent;
        if (!vigent || !vigent.data_fi_cobertura) return q;
        return q.data_fi_cobertura > vigent.data_fi_cobertura ? q : vigent;
    }, null);
}

function esVencudaSenseRenovarU(quotaVigent) {
    if (!quotaVigent || !quotaVigent.data_fi_cobertura) return false;
    const avui = new Date().toISOString().split('T')[0];
    return quotaVigent.data_fi_cobertura < avui;
}

function teQuotaEndarreridaPendentU(quotes) {
    if (!quotes || quotes.length === 0) return false;
    const avui = new Date().toISOString().split('T')[0];
    return quotes.some(q =>
        q.estat === 'pendent' &&
        q.data_fi_cobertura &&
        q.data_fi_cobertura < avui
    );
}

async function getImmobilitzatLlistaU() {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .select('id, descripció, tipus, matrícula')
        .order('descripció');
    if (error) throw error;
    return data || [];
}

// ============================================================
// VISTES LLISTAT
// ============================================================

async function mostrarVistaAltresAsseg() {
    await mostrarVistaLlistatU('altres', 'altres-asseg-view');
}

async function mostrarVistaCivil() {
    await mostrarVistaLlistatU('civil', 'civil-view');
}

async function mostrarVistaLlistatU(categoria, containerId) {
    try {
        const container = document.getElementById(containerId);
        if (!container) return;

        const cfg = configCategoria(categoria);
        const checkboxId = `mostrar-vencudes-${categoria}`;
        const mostrarVencudes = document.getElementById(checkboxId)?.checked || false;
        const ordreId = `ordre-${categoria}`;
        const ordreSeleccionat = document.getElementById(ordreId)?.value || 'venciment';

        let html = `
            <div class="assegurances-header">
                <h3>${cfg.titol}</h3>
                <div class="assegurances-controls">
                    <label>
                        Ordenar per:
                        <select id="${ordreId}" onchange="mostrarVistaLlistatU('${categoria}', '${containerId}')">
                            <option value="venciment" ${ordreSeleccionat === 'venciment' ? 'selected' : ''}>📅 Venciment real</option>
                            <option value="companyia" ${ordreSeleccionat === 'companyia' ? 'selected' : ''}>🏢 Companyia</option>
                            <option value="tipus"     ${ordreSeleccionat === 'tipus'     ? 'selected' : ''}>📋 Tipus</option>
                            <option value="prima"     ${ordreSeleccionat === 'prima'     ? 'selected' : ''}>💰 Import prima</option>
                        </select>
                    </label>
                    <label>
                        <input type="checkbox" id="${checkboxId}"
                            ${mostrarVencudes ? 'checked' : ''}
                            onchange="mostrarVistaLlistatU('${categoria}', '${containerId}')">
                        Mostrar vençudes
                    </label>
                    <button class="btn-nova" onclick="obrirModalNovaU('${categoria}')">
                        ${cfg.iconaNova}
                    </button>
                </div>
            </div>
        `;

        const { data, error } = await supabaseClient
            .from('assegurances_altres')
            .select('*, immobilitzat_material(descripció, matrícula)')
            .eq('categoria', categoria);
        if (error) throw error;

        const polisses = data || [];

        // Carregar totes les quotes de les pòlisses d'aquesta categoria d'un sol cop
        const ids = polisses.map(p => p.id);
        let totesQuotes = [];
        if (ids.length > 0) {
            const { data: quotesData, error: errorQuotes } = await supabaseClient
                .from('assegurances_altres_quotes')
                .select('asseguranca_id, prima_anual, data_fi_cobertura, estat')
                .in('asseguranca_id', ids);
            if (errorQuotes) throw errorQuotes;
            totesQuotes = quotesData || [];
        }

        // Agrupar quotes per pòlissa i calcular la vigent (fi_cobertura més recent) de cadascuna
        const quotesPerPolissa = {};
        totesQuotes.forEach(q => {
            (quotesPerPolissa[q.asseguranca_id] ||= []).push(q);
        });

        polisses.forEach(p => {
            const quotesP = quotesPerPolissa[p.id] || [];
            p._quotaVigent = obtenirQuotaVigentU(quotesP);
            p._vencudaSenseRenovar = esVencudaSenseRenovarU(p._quotaVigent);
            p._quotaEndarrerida = teQuotaEndarreridaPendentU(quotesP);
            p._prioritaria = p._vencudaSenseRenovar || p._quotaEndarrerida;
        });

        const filtrades = polisses
            .filter(a => mostrarVencudes ? true : a.estat === 'actiu')
            .sort((a, b) => {
                // Vençudes-sense-renovar i quotes endarrerides, sempre al capdamunt
                if (a._prioritaria !== b._prioritaria) {
                    return a._prioritaria ? -1 : 1;
                }
                switch (ordreSeleccionat) {
                    case 'companyia':
                        return (a.companyia || '').localeCompare(b.companyia || '');
                    case 'tipus':
                        return (a.tipus_polissa || '').localeCompare(b.tipus_polissa || '');
                    case 'prima': {
                        const pA = a._quotaVigent?.prima_anual ?? a.prima_anual ?? 0;
                        const pB = b._quotaVigent?.prima_anual ?? b.prima_anual ?? 0;
                        return pB - pA; // descendent: import més alt primer
                    }
                    case 'venciment':
                    default: {
                        const fiA = a._quotaVigent?.data_fi_cobertura || '9999-99-99';
                        const fiB = b._quotaVigent?.data_fi_cobertura || '9999-99-99';
                        return fiA.localeCompare(fiB);
                    }
                }
            });

        if (filtrades.length === 0) {
            html += `<div class="no-data">Sense ${categoria === 'civil' ? 'pòlisses RC' : 'assegurances'}${mostrarVencudes ? '' : ' actives'}</div>`;
        } else {
            html += `<div class="cards-grid">`;
            filtrades.forEach(ass => {
                const quotaVigent = ass._quotaVigent;
                const primaVigent = quotaVigent?.prima_anual ?? ass.prima_anual;
                const prima = (primaVigent || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const venciment = quotaVigent?.data_fi_cobertura || ass.data_venciment;
                const immInfo = ass.immobilitzat_material
                    ? ass.immobilitzat_material.descripció + (ass.immobilitzat_material.matrícula ? ` (${ass.immobilitzat_material.matrícula})` : '')
                    : null;
                const estat = ass.estat === 'actiu' ? '✅' : ass.estat === 'vençut' ? '⏰' : '⚠️';
                const avisVencuda = ass._vencudaSenseRenovar
                    ? `<p style="color:#c62828;font-weight:600;">⚠️ Vençuda sense renovar</p>`
                    : ass._quotaEndarrerida
                        ? `<p style="color:#e65100;font-weight:600;">⚠️ Quota pendent endarrerida</p>`
                        : '';

                // Línies específiques per categoria
                const liniesExtra = categoria === 'civil' ? `
                    <p><strong>Tasca:</strong> ${etiquetaTascaU(ass.tasca)}</p>
                    <p><strong>Cobertura mín.:</strong> ${formatEuroU(ass.cobertura_minima)}</p>
                ` : `
                    <p><strong>Tipus:</strong> ${etiquetaTipusU(ass.tipus_polissa)}</p>
                    ${immInfo ? `<p><strong>Vinculat:</strong> ${immInfo}</p>` : ''}
                `;

                html += `
                    <div class="card-polissa" ${ass._prioritaria ? 'style="border:2px solid #c62828;"' : ''}>
                        <div class="card-header">
                            <h4>${ass.companyia}</h4>
                            <span class="badge-estat">${estat} ${ass.estat}</span>
                        </div>
                        <div class="card-body">
                            <p><strong>Pòlissa:</strong> ${ass.num_polissa}</p>
                            ${liniesExtra}
                            ${avisVencuda}
                            <p><strong>Venciment:</strong> ${formatDataU(venciment)}</p>
                            <p><strong>Prima vigent:</strong> ${prima}</p>
                        </div>
                        <div class="card-footer">
                            <button class="btn-small btn-veure" onclick="obrirModalDetallU('${ass.id}')">👁️ Veure</button>
                            <button class="btn-small btn-eliminar" onclick="eliminarPolissaU('${ass.id}', '${categoria}', '${containerId}')">🗑️</button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        container.innerHTML = html;

    } catch (error) {
        console.error('Error vista llistat:', error);
        const c = document.getElementById(containerId);
        if (c) c.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
    }
}

// ============================================================
// MODAL DETALL (capçalera + línies pagament)
// ============================================================

async function obrirModalDetallU(polissaId) {
    try {
        const existent = document.getElementById('modal-detall-u');
        if (existent) existent.remove();

        const polissa = await getPolissaByIdU(polissaId);
        const quotes  = await getQuotesPerPolissaU(polissaId);
        const cfg     = configCategoria(polissa.categoria);

        const immInfo = polissa.immobilitzat_material
            ? `${polissa.immobilitzat_material.descripció}${polissa.immobilitzat_material.matrícula ? ' (' + polissa.immobilitzat_material.matrícula + ')' : ''}`
            : null;

        const totalPagat   = quotes.filter(q => q.estat === 'pagada').reduce((s, q) => s + (parseFloat(q.prima_anual) || 0), 0);
        const totalPendent = quotes.filter(q => q.estat === 'pendent').reduce((s, q) => s + (parseFloat(q.prima_anual) || 0), 0);

        // Camps específics per categoria
        const campsExtra = polissa.categoria === 'civil' ? `
            <div class="camp-pol">
                <span class="camp-pol-label">Tasca</span>
                <span class="camp-pol-valor">${etiquetaTascaU(polissa.tasca)}</span>
            </div>
            <div class="camp-pol">
                <span class="camp-pol-label">Cobertura mínima</span>
                <span class="camp-pol-valor" style="font-weight:700;">${formatEuroU(polissa.cobertura_minima)}</span>
            </div>
        ` : `
            <div class="camp-pol">
                <span class="camp-pol-label">Tipus</span>
                <span class="camp-pol-valor">${etiquetaTipusU(polissa.tipus_polissa)}</span>
            </div>
            ${immInfo ? `
            <div class="camp-pol">
                <span class="camp-pol-label">Immobilitzat vinculat</span>
                <span class="camp-pol-valor">${immInfo}</span>
            </div>` : ''}
        `;

        const modal = document.createElement('div');
        modal.id = 'modal-detall-u';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding-top:30px;overflow-y:auto;';

        modal.innerHTML = `
            <div class="modal-content-u">
                <div class="modal-header">
                    <h2>${cfg.titol} — ${polissa.num_polissa}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-detall-u')">✕</button>
                </div>

                <div class="modal-body" style="padding:16px;">

                    <!-- CAPÇALERA PÒLISSA -->
                    <div class="capsalera-polissa-u" id="capsalera-u-${polissaId}">
                        <div class="camps-polissa-grid-u">
                            <div class="camp-pol">
                                <span class="camp-pol-label">Companyia</span>
                                <span class="camp-pol-valor">${polissa.companyia}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Nº Pòlissa</span>
                                <span class="camp-pol-valor" style="font-family:monospace;">${polissa.num_polissa}</span>
                            </div>
                            ${campsExtra}
                            <div class="camp-pol">
                                <span class="camp-pol-label">Estat</span>
                                <span class="camp-pol-valor">${badgeEstatU(polissa.estat)}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Data Inici</span>
                                <span class="camp-pol-valor">${formatDataU(polissa.data_inici)}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Data Venciment</span>
                                <span class="camp-pol-valor">${formatDataU(polissa.data_venciment)}</span>
                            </div>
                            <div class="camp-pol">
                                <span class="camp-pol-label">Prima Anual</span>
                                <span class="camp-pol-valor" style="font-weight:700;">${formatEuroU(polissa.prima_anual)}</span>
                            </div>
                            ${polissa.observacions ? `
                            <div class="camp-pol camp-pol-ample">
                                <span class="camp-pol-label">Observacions</span>
                                <span class="camp-pol-valor">${polissa.observacions}</span>
                            </div>` : ''}
                        </div>
                        <div style="margin-top:10px;display:flex;gap:8px;">
                            <button class="btn btn-secondary btn-sm" onclick="obrirEditorCapcaleraU('${polissaId}')">✏️ Editar</button>
                            <button class="btn btn-danger btn-sm" onclick="eliminarPolissaUDesDeDetall('${polissaId}', '${polissa.categoria}')">🗑️ Eliminar</button>
                        </div>
                    </div>

                    <!-- LÍNIES DE PAGAMENT -->
                    <div style="margin-top:16px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <h4 style="margin:0;">💳 Pagaments</h4>
                            <button class="btn btn-primary btn-sm" onclick="afegirFilaPagamentU('${polissaId}')">➕ Afegir pagament</button>
                        </div>

                        <div style="overflow-x:auto;">
                            <table class="taula-quotes-u">
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
                                <tbody id="tbody-quotes-u-${polissaId}">
                                    ${renderFilesQuotesU(quotes, polissaId)}
                                </tbody>
                            </table>
                        </div>

                        <div class="resum-totals-u" id="resum-u-${polissaId}">
                            <span>✅ Pagat: <strong>${formatEuroU(totalPagat)}</strong></span>
                            <span style="margin-left:16px;">⏳ Pendent: <strong>${formatEuroU(totalPendent)}</strong></span>
                        </div>
                    </div>

                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="tancarModal('modal-detall-u')">Tancar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) tancarModal('modal-detall-u'); });

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// RENDER LÍNIES QUOTES
// ============================================================

function renderFilesQuotesU(quotes, polissaId) {
    if (quotes.length === 0) {
        return `<tr><td colspan="8" style="text-align:center;color:#888;padding:16px;">Cap pagament registrat</td></tr>`;
    }
    return quotes.map(q => `
        <tr data-quota-id="${q.id}">
            <td style="white-space:nowrap;">${formatDataU(q.data_inici_cobertura)}</td>
            <td style="white-space:nowrap;">${formatDataU(q.data_fi_cobertura)}</td>
            <td style="white-space:nowrap;">${formatDataU(q.data_pagament)}</td>
            <td style="text-align:right;font-weight:600;">${formatEuroU(q.prima_anual)}</td>
            <td>${q.exercici}</td>
            <td>${badgeEstatU(q.estat, 'quota')}</td>
            <td>${q.observacions || '—'}</td>
            <td style="white-space:nowrap;">
                <button class="btn-small btn-editar" onclick="editarFilaQuotaU('${q.id}','${polissaId}')" title="Editar">✏️</button>
                <button class="btn-small btn-eliminar" onclick="eliminarFilaQuotaU('${q.id}','${polissaId}')" title="Eliminar">🗑️</button>
            </td>
        </tr>
    `).join('');
}

function renderFilaNouaPagamentU(polissaId) {
    const avui = new Date().toISOString().split('T')[0];
    const exercici = obtenirExerciciPerDataU(avui);
    return `
        <tr id="fila-nova-quota-u" style="background:#f0f7ee;">
            <td><input type="date" id="nu-inici" style="width:120px;"></td>
            <td><input type="date" id="nu-fi" style="width:120px;"></td>
            <td><input type="date" id="nu-datapag" value="${avui}" style="width:120px;"
                onchange="document.getElementById('nu-exercici').value=obtenirExerciciPerDataU(this.value)"></td>
            <td><input type="number" id="nu-prima" step="0.01" min="0" style="width:80px;" placeholder="0.00"></td>
            <td><input type="number" id="nu-exercici" value="${exercici}" readonly style="width:60px;background:#e8f5e9;font-weight:600;"></td>
            <td>
                <select id="nu-estat" style="width:110px;">
                    <option value="pendent">⏳ Pendent</option>
                    <option value="pagada">✅ Pagada</option>
                    <option value="cancel·lada">❌ Cancel·lada</option>
                </select>
            </td>
            <td><input type="text" id="nu-obs" style="width:90px;" placeholder="Notes..."></td>
            <td style="white-space:nowrap;">
                <button class="btn-small btn-editar" onclick="guardarFilaNouaPagamentU('${polissaId}')" title="Guardar">💾</button>
                <button class="btn-small btn-eliminar" onclick="document.getElementById('fila-nova-quota-u').remove()" title="Cancel·lar">✕</button>
            </td>
        </tr>
    `;
}

function renderFilaEditarQuotaU(q, polissaId) {
    return `
        <tr data-quota-id="${q.id}" style="background:#fff8e1;">
            <td><input type="date" id="eu-inici-${q.id}" value="${q.data_inici_cobertura || ''}" style="width:120px;"></td>
            <td><input type="date" id="eu-fi-${q.id}" value="${q.data_fi_cobertura || ''}" style="width:120px;"></td>
            <td><input type="date" id="eu-datapag-${q.id}" value="${q.data_pagament || ''}" style="width:120px;"
                onchange="document.getElementById('eu-exercici-${q.id}').value=obtenirExerciciPerDataU(this.value)"></td>
            <td><input type="number" id="eu-prima-${q.id}" value="${q.prima_anual || ''}" step="0.01" min="0" style="width:80px;"></td>
            <td><input type="number" id="eu-exercici-${q.id}" value="${q.exercici}" readonly style="width:60px;background:#e8f5e9;font-weight:600;"></td>
            <td>
                <select id="eu-estat-${q.id}" style="width:110px;">
                    <option value="pendent"     ${q.estat==='pendent'     ?'selected':''}>⏳ Pendent</option>
                    <option value="pagada"      ${q.estat==='pagada'      ?'selected':''}>✅ Pagada</option>
                    <option value="cancel·lada" ${q.estat==='cancel·lada' ?'selected':''}>❌ Cancel·lada</option>
                </select>
            </td>
            <td><input type="text" id="eu-obs-${q.id}" value="${q.observacions || ''}" style="width:90px;"></td>
            <td style="white-space:nowrap;">
                <button class="btn-small btn-editar" onclick="guardarEditorQuotaU('${q.id}','${polissaId}')" title="Guardar">💾</button>
                <button class="btn-small btn-eliminar" onclick="recarregarQuotesU('${polissaId}')" title="Cancel·lar">✕</button>
            </td>
        </tr>
    `;
}

// ============================================================
// ACCIONS LÍNIES PAGAMENT
// ============================================================

function afegirFilaPagamentU(polissaId) {
    if (document.getElementById('fila-nova-quota-u')) return;
    const tbody = document.getElementById(`tbody-quotes-u-${polissaId}`);
    if (!tbody) return;
    tbody.insertAdjacentHTML('beforeend', renderFilaNouaPagamentU(polissaId));
    setTimeout(() => { document.getElementById('nu-inici')?.focus(); }, 50);
}

async function guardarFilaNouaPagamentU(polissaId) {
    try {
        const dataPag = document.getElementById('nu-datapag').value;
        const prima   = parseFloat(document.getElementById('nu-prima').value);
        if (!dataPag) throw new Error('La data de pagament és obligatòria');
        if (isNaN(prima) || prima < 0) throw new Error('La prima ha de ser un valor vàlid');

        await createQuotaU({
            asseguranca_id:       polissaId,
            data_inici_cobertura: document.getElementById('nu-inici').value || null,
            data_fi_cobertura:    document.getElementById('nu-fi').value || null,
            data_pagament:        dataPag,
            prima_anual:          prima,
            exercici:             obtenirExerciciPerDataU(dataPag),
            estat:                document.getElementById('nu-estat').value,
            observacions:         document.getElementById('nu-obs').value || null,
        });

        mostrarNotificacio('✅ Pagament afegit', 'success');
        await recarregarQuotesU(polissaId);
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function editarFilaQuotaU(quotaId, polissaId) {
    const { data: q, error } = await supabaseClient
        .from('assegurances_altres_quotes').select('*').eq('id', quotaId).single();
    if (error) { mostrarNotificacio('❌ Error: ' + error.message, 'error'); return; }
    const fila = document.querySelector(`tr[data-quota-id="${quotaId}"]`);
    if (fila) fila.outerHTML = renderFilaEditarQuotaU(q, polissaId);
    setTimeout(() => { document.getElementById(`eu-inici-${quotaId}`)?.focus(); }, 50);
}

async function guardarEditorQuotaU(quotaId, polissaId) {
    try {
        const dataPag = document.getElementById(`eu-datapag-${quotaId}`).value;
        const prima   = parseFloat(document.getElementById(`eu-prima-${quotaId}`).value);
        if (!dataPag) throw new Error('La data de pagament és obligatòria');
        if (isNaN(prima) || prima < 0) throw new Error('La prima ha de ser un valor vàlid');

        await updateQuotaU(quotaId, {
            data_inici_cobertura: document.getElementById(`eu-inici-${quotaId}`).value || null,
            data_fi_cobertura:    document.getElementById(`eu-fi-${quotaId}`).value || null,
            data_pagament:        dataPag,
            prima_anual:          prima,
            exercici:             obtenirExerciciPerDataU(dataPag),
            estat:                document.getElementById(`eu-estat-${quotaId}`).value,
            observacions:         document.getElementById(`eu-obs-${quotaId}`).value || null,
        });

        mostrarNotificacio('✅ Pagament actualitzat', 'success');
        await recarregarQuotesU(polissaId);
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function eliminarFilaQuotaU(quotaId, polissaId) {
    if (!confirm('⚠️ Eliminar aquest pagament?')) return;
    try {
        await deleteQuotaU(quotaId);
        mostrarNotificacio('✅ Pagament eliminat', 'success');
        await recarregarQuotesU(polissaId);
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function recarregarQuotesU(polissaId) {
    const quotes = await getQuotesPerPolissaU(polissaId);
    const tbody = document.getElementById(`tbody-quotes-u-${polissaId}`);
    if (tbody) tbody.innerHTML = renderFilesQuotesU(quotes, polissaId);

    const totalPagat   = quotes.filter(q => q.estat === 'pagada').reduce((s, q) => s + (parseFloat(q.prima_anual) || 0), 0);
    const totalPendent = quotes.filter(q => q.estat === 'pendent').reduce((s, q) => s + (parseFloat(q.prima_anual) || 0), 0);
    const resum = document.getElementById(`resum-u-${polissaId}`);
    if (resum) resum.innerHTML = `
        <span>✅ Pagat: <strong>${formatEuroU(totalPagat)}</strong></span>
        <span style="margin-left:16px;">⏳ Pendent: <strong>${formatEuroU(totalPendent)}</strong></span>
    `;
}

// ============================================================
// EDITOR CAPÇALERA (inline)
// ============================================================

async function obrirEditorCapcaleraU(polissaId) {
    try {
        const polissa    = await getPolissaByIdU(polissaId);
        const cfg        = configCategoria(polissa.categoria);
        const immLlista  = polissa.categoria === 'altres' ? await getImmobilitzatLlistaU() : [];

        const optImm = `<option value="">— Cap —</option>` +
            immLlista.map(i => `<option value="${i.id}" ${polissa.immobilitzat_id === i.id ? 'selected' : ''}>
                ${i.descripció}${i.matrícula ? ' (' + i.matrícula + ')' : ''}</option>`).join('');

        const campsExtra = polissa.categoria === 'civil' ? `
            <div class="camp-pol">
                <label class="camp-pol-label">Tasca *</label>
                <select id="eu-tasca" style="width:100%;">
                    <option value="agrícola"   ${polissa.tasca === 'agrícola'   ? 'selected' : ''}>🌾 Agrícola</option>
                    <option value="construcció" ${polissa.tasca === 'construcció' ? 'selected' : ''}>🏗️ Construcció</option>
                </select>
            </div>
            <div class="camp-pol">
                <label class="camp-pol-label">Cobertura mínima (€)</label>
                <input type="number" id="eu-cobertura" value="${polissa.cobertura_minima || ''}" step="0.01" min="0" style="width:100%;">
            </div>
        ` : `
            <div class="camp-pol">
                <label class="camp-pol-label">Tipus *</label>
                <select id="eu-tipus" style="width:100%;">
                    ${['auto','accidents','impagament','incendi','proteccio_juridica','RC','robatori','salut_laboral','viatges','vida','altra']
                        .map(t => `<option value="${t}" ${polissa.tipus_polissa === t ? 'selected' : ''}>${etiquetaTipusU(t)}</option>`).join('')}
                </select>
            </div>
            <div class="camp-pol">
                <label class="camp-pol-label">Immobilitzat vinculat</label>
                <select id="eu-immobilitzat" style="width:100%;">${optImm}</select>
            </div>
        `;

        const container = document.getElementById(`capsalera-u-${polissaId}`);
        container.innerHTML = `
            <div style="background:#fffde7;border:1px solid #f9a825;border-radius:6px;padding:12px;">
                <div class="camps-polissa-grid-u">
                    <div class="camp-pol">
                        <label class="camp-pol-label">Companyia *</label>
                        <input type="text" id="eu-companyia" value="${polissa.companyia}" style="width:100%;">
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Nº Pòlissa</label>
                        <input type="text" value="${polissa.num_polissa}" readonly style="width:100%;background:#eee;cursor:not-allowed;">
                    </div>
                    ${campsExtra}
                    <div class="camp-pol">
                        <label class="camp-pol-label">Estat</label>
                        <select id="eu-estat-pol" style="width:100%;">
                            <option value="actiu"  ${polissa.estat === 'actiu'  ? 'selected' : ''}>✅ Actiu</option>
                            <option value="vençut" ${polissa.estat === 'vençut' ? 'selected' : ''}>❌ Vençut</option>
                            <option value="suspes" ${polissa.estat === 'suspes' ? 'selected' : ''}>⏸️ Suspès</option>
                        </select>
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Data Inici *</label>
                        <input type="date" id="eu-data-inici" value="${polissa.data_inici || ''}" style="width:100%;">
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Data Venciment *</label>
                        <input type="date" id="eu-data-venciment" value="${polissa.data_venciment || ''}" style="width:100%;">
                    </div>
                    <div class="camp-pol">
                        <label class="camp-pol-label">Prima Anual (€)</label>
                        <input type="number" id="eu-prima-pol" value="${polissa.prima_anual || ''}" step="0.01" min="0" style="width:100%;">
                    </div>
                    <div class="camp-pol camp-pol-ample">
                        <label class="camp-pol-label">Observacions</label>
                        <textarea id="eu-observacions" rows="2" style="width:100%;">${polissa.observacions || ''}</textarea>
                    </div>
                </div>
                <div style="margin-top:10px;display:flex;gap:8px;">
                    <button class="btn btn-primary btn-sm" onclick="guardarEditorCapcaleraU('${polissaId}', '${polissa.categoria}')">💾 Guardar</button>
                    <button class="btn btn-secondary btn-sm" onclick="obrirModalDetallU('${polissaId}')">✕ Cancel·lar</button>
                </div>
            </div>
        `;
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function guardarEditorCapcaleraU(polissaId, categoria) {
    try {
        const dades = {
            companyia:      document.getElementById('eu-companyia').value.trim(),
            estat:          document.getElementById('eu-estat-pol').value,
            data_inici:     document.getElementById('eu-data-inici').value || null,
            data_venciment: document.getElementById('eu-data-venciment').value || null,
            prima_anual:    parseFloat(document.getElementById('eu-prima-pol').value) || null,
            observacions:   document.getElementById('eu-observacions').value || null,
        };

        if (categoria === 'civil') {
            dades.tasca           = document.getElementById('eu-tasca').value;
            dades.cobertura_minima = parseFloat(document.getElementById('eu-cobertura').value) || null;
        } else {
            dades.tipus_polissa  = document.getElementById('eu-tipus').value;
            dades.immobilitzat_id = document.getElementById('eu-immobilitzat').value || null;
        }

        if (!dades.companyia)     throw new Error('La companyia és obligatòria');
        if (!dades.data_inici)    throw new Error('La data d\'inici és obligatòria');
        if (!dades.data_venciment) throw new Error('La data de venciment és obligatòria');

        await updatePolissaU(polissaId, dades);
        mostrarNotificacio('✅ Pòlissa actualitzada', 'success');
        await obrirModalDetallU(polissaId);

        // Recarregar vista corresponent
        const containerId = categoria === 'civil' ? 'civil-view' : 'altres-asseg-view';
        await mostrarVistaLlistatU(categoria, containerId);

    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL NOVA PÒLISSA
// ============================================================

async function obrirModalNovaU(categoria) {
    try {
        const existent = document.getElementById('modal-nova-u');
        if (existent) existent.remove();

        const cfg       = configCategoria(categoria);
        const immLlista = categoria === 'altres' ? await getImmobilitzatLlistaU() : [];
        const optImm    = `<option value="">— Cap (opcional) —</option>` +
            immLlista.map(i => `<option value="${i.id}">${i.descripció}${i.matrícula ? ' (' + i.matrícula + ')' : ''}</option>`).join('');

        const campsExtra = categoria === 'civil' ? `
            <div class="form-row">
                <div class="form-group">
                    <label>Tasca: *</label>
                    <select name="tasca" required>
                        <option value="agrícola">🌾 Agrícola</option>
                        <option value="construcció">🏗️ Construcció</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Cobertura mínima (€):</label>
                    <input type="number" name="cobertura_minima" step="0.01" min="0" placeholder="0.00">
                </div>
            </div>
        ` : `
            <div class="form-row">
                <div class="form-group">
                    <label>Tipus: *</label>
                    <select name="tipus_polissa" required>
                        <option value="">— Selecciona —</option>
                        ${(cfg.tipusOpts || []).map(t => `<option value="${t}">${etiquetaTipusU(t)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Immobilitzat vinculat:</label>
                    <select name="immobilitzat_id">${optImm}</select>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.id = 'modal-nova-u';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding-top:30px;overflow-y:auto;';

        modal.innerHTML = `
            <div class="modal-content-u" style="max-width:580px;">
                <div class="modal-header">
                    <h2>${cfg.iconaNova}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-nova-u')">✕</button>
                </div>
                <div class="modal-body" style="padding:16px;">
                    <form id="form-nova-u" onsubmit="guardarNovaPolissaU(event, '${categoria}')">

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
                            ${campsExtra}
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Estat:</label>
                                    <select name="estat">
                                        <option value="actiu">✅ Actiu</option>
                                        <option value="vençut">❌ Vençut</option>
                                        <option value="suspes">⏸️ Suspès</option>
                                    </select>
                                </div>
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
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nova-u')">Cancel·lar</button>
                    <button type="submit" form="form-nova-u" class="btn btn-primary">✅ Crear Pòlissa</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) tancarModal('modal-nova-u'); });

    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function guardarNovaPolissaU(event, categoria) {
    event.preventDefault();
    try {
        const dades = new FormData(event.target);

        const polissa = {
            categoria,
            companyia:      dades.get('companyia').trim(),
            num_polissa:    dades.get('num_polissa').trim(),
            estat:          dades.get('estat') || 'actiu',
            data_inici:     dades.get('data_inici'),
            data_venciment: dades.get('data_venciment'),
            prima_anual:    parseFloat(dades.get('prima_anual')) || null,
            exercici:       new Date().getFullYear(),
            observacions:   dades.get('observacions') || null,
        };

        if (categoria === 'civil') {
            polissa.tasca            = dades.get('tasca');
            polissa.cobertura_minima = parseFloat(dades.get('cobertura_minima')) || null;
            polissa.tipus_polissa    = 'RC';
        } else {
            polissa.tipus_polissa  = dades.get('tipus_polissa');
            polissa.immobilitzat_id = dades.get('immobilitzat_id') || null;
        }

        if (!polissa.companyia)      throw new Error('La companyia és obligatòria');
        if (!polissa.num_polissa)    throw new Error('El número de pòlissa és obligatori');
        if (!polissa.data_inici)     throw new Error('La data d\'inici és obligatòria');
        if (!polissa.data_venciment) throw new Error('La data de venciment és obligatòria');

        const nova = await createPolissaU(polissa);
        mostrarNotificacio('✅ Pòlissa creada correctament', 'success');
        tancarModal('modal-nova-u');

        const containerId = categoria === 'civil' ? 'civil-view' : 'altres-asseg-view';
        await mostrarVistaLlistatU(categoria, containerId);
        await obrirModalDetallU(nova.id);

    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ELIMINAR PÒLISSA
// ============================================================

async function eliminarPolissaU(polissaId, categoria, containerId) {
    const polissa = await getPolissaByIdU(polissaId);
    if (!confirm(`⚠️ Eliminar la pòlissa "${polissa.num_polissa}"?\n\nS'eliminaran també tots els pagaments. Aquesta acció no es pot desfer.`)) return;
    try {
        await deletePolissaU(polissaId);
        mostrarNotificacio('✅ Pòlissa eliminada', 'success');
        await mostrarVistaLlistatU(categoria, containerId);
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function eliminarPolissaUDesDeDetall(polissaId, categoria) {
    const containerId = categoria === 'civil' ? 'civil-view' : 'altres-asseg-view';
    await eliminarPolissaU(polissaId, categoria, containerId);
    tancarModal('modal-detall-u');
}

// ============================================================
// OVERRIDES PLACEHOLDERS FITXER PRINCIPAL
// ============================================================

function obrirModalNovaAsseguranca()     { obrirModalNovaU('altres'); }
function obrirModalDetallAsseguranca(id) { obrirModalDetallU(id); }
function obrirModalEditarAsseguranca(id) { obrirEditorCapcaleraU(id); }
function obrirModalNovaCivil()           { obrirModalNovaU('civil'); }
function obrirModalDetallCivil(id)       { obrirModalDetallU(id); }
function obrirModalEditarCivil(id)       { obrirEditorCapcaleraU(id); }
function mostrarVistaAssegurances()      { mostrarVistaAltresAsseg(); }

// ============================================================
// ESTILS
// ============================================================

(function injectarEstilsU() {
    if (document.getElementById('estils-modals-u')) return;
    const style = document.createElement('style');
    style.id = 'estils-modals-u';
    style.textContent = `
        #modal-detall-u, #modal-nova-u {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important; height: 100% !important;
            background: rgba(0,0,0,0.6) !important;
            z-index: 99999 !important;
            align-items: flex-start !important;
            justify-content: center !important;
            padding-top: 30px !important;
            overflow-y: auto !important;
        }
        .modal-content-u {
            position: relative !important;
            z-index: 100000 !important;
            background: white !important;
            border-radius: 8px !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3) !important;
            width: 100% !important;
            max-width: 860px !important;
            max-height: 88vh !important;
            overflow-y: auto !important;
            margin-bottom: 30px !important;
        }
        .camps-polissa-grid-u {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 16px;
        }
        .camp-pol         { display: flex; flex-direction: column; gap: 2px; }
        .camp-pol-ample   { grid-column: 1 / -1; }
        .camp-pol-label   { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888; }
        .camp-pol-valor   { font-size: 14px; color: #222; }
        .capsalera-polissa-u {
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            padding: 12px;
        }
        .taula-quotes-u {
            width: 100%; border-collapse: collapse; font-size: 13px;
        }
        .taula-quotes-u th {
            padding: 8px 6px; background: #f5f5f5;
            border-bottom: 2px solid #ddd; text-align: left; white-space: nowrap;
        }
        .taula-quotes-u td { padding: 7px 6px; border-bottom: 1px solid #eee; }
        .taula-quotes-u tr:hover td { background: #fafafa; }
        .taula-quotes-u input, .taula-quotes-u select {
            padding: 4px 6px; border: 1px solid #ccc;
            border-radius: 4px; font-size: 12px;
        }
        .resum-totals-u {
            margin-top: 10px; padding: 8px 12px;
            background: #f5f5f5; border-radius: 6px;
            font-size: 13px; text-align: right;
        }
        .btn-danger {
            background-color: #c62828 !important;
            color: white !important; border: none !important;
        }
        .btn-danger:hover { background-color: #8e0000 !important; }
    `;
    document.head.appendChild(style);
})();

console.log('✅ Assegurances Modals Unificat v1 carregat');