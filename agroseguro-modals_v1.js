// ============================================================
// AGROSEGURO MODALS v2 — FASE AVANÇADA
// Inclou: Nova + Editar pòlissa (v1) + Detall millorat
//         Parcel·les (CRUD), Sinistres (CRUD),
//         Estimació Producció, Simulació Cobertures
// ============================================================

// ============================================================
// MODAL NOVA PÒLISSA (mantingut de v1)
// ============================================================

function obrirModalNovaPolissa() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-nova-polissa';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>➕ Nova Pòlissa</h2>
                <button class="modal-close" onclick="tancarModal('modal-nova-polissa')">✕</button>
            </div>
            <div class="modal-body">
                <form id="form-nova-polissa" onsubmit="guardarNovaPolissa(event)">
                    <fieldset>
                        <legend>📋 Dades Pòlissa</legend>
                        <div class="form-group">
                            <label>Campanya:</label>
                            <input type="number" name="campanya" value="${new Date().getFullYear()}" required>
                        </div>
                        <div class="form-group">
                            <label>Número Pòlissa:</label>
                            <input type="text" name="num_polissa" placeholder="Ex: M263662-5" required>
                        </div>
                        <div class="form-group">
                            <label>Referència Col·lectiva:</label>
                            <input type="text" name="ref_collectiu" placeholder="Ex: 1732473-1">
                        </div>
                        <div class="form-group">
                            <label>Número Rebut:</label>
                            <input type="text" name="num_rebut" placeholder="Ex: 1186280">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Línia:</label>
                                <select name="linia" required>
                                    <option value="">- Selecciona -</option>
                                    <option value="FRUTALS">🍑 FRUTALS</option>
                                    <option value="CEREAL">🌾 CEREAL</option>
                                    <option value="OLIVERA">🫒 OLIVERA</option>
                                    <option value="ALTRE">📋 ALTRE</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Pla:</label>
                                <input type="text" name="pla" placeholder="Ex: 2024">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Categoria:</label>
                            <select name="categoria" required>
                                <option value="PRINCIPAL">PRINCIPAL</option>
                                <option value="COMPLEMENTARIA">COMPLEMENTARIA</option>
                            </select>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>📅 Dates</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Data Vigor:</label>
                                <input type="date" name="data_vigor" required>
                            </div>
                            <div class="form-group">
                                <label>Data Venciment:</label>
                                <input type="date" name="data_venciment">
                            </div>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>💰 Finances</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Prima Comercial (€):</label>
                                <input type="number" name="prima_comercial" step="0.01" min="0">
                            </div>
                            <div class="form-group">
                                <label>Prima Neta (€):</label>
                                <input type="number" name="prima_neta" step="0.01" min="0">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Subvenció ENESA (€):</label>
                                <input type="number" name="subvencio_enesa" step="0.01" min="0">
                            </div>
                            <div class="form-group">
                                <label>Subvenció CA (€):</label>
                                <input type="number" name="subvencio_ca" step="0.01" min="0">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Cost Tomador (€):</label>
                                <input type="number" name="cost_tomador" step="0.01" min="0">
                            </div>
                            <div class="form-group">
                                <label>Capital Assegurat (€):</label>
                                <input type="number" name="capital_assegurat_total" step="0.01" min="0" required>
                            </div>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>🌾 Producció</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Producció Total (kg):</label>
                                <input type="number" name="produccio_total_kg" step="0.01" min="0">
                            </div>
                            <div class="form-group">
                                <label>Superfície Total (Ha):</label>
                                <input type="number" name="superficie_total_ha" step="0.01" min="0">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Número de Parcel·les:</label>
                            <input type="number" name="num_parcelles" min="0">
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>📝 Observacions</legend>
                        <div class="form-group">
                            <textarea name="observacions" rows="3" placeholder="Notes addicionals..."></textarea>
                        </div>
                    </fieldset>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nova-polissa')">Cancelar</button>
                <button type="submit" form="form-nova-polissa" class="btn btn-primary">✅ Guardar Pòlissa</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) tancarModal('modal-nova-polissa'); });
}

// ============================================================
// MODAL EDITAR PÒLISSA (mantingut de v1)
// ============================================================

async function obrirModalEditarPolissa(polissaId) {
    try {
        const polissa = polissesCache.find(p => p.id === polissaId);
        if (!polissa) throw new Error('Pòlissa no trobada');

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-editar-polissa';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✏️ Editar Pòlissa — ${polissa.num_polissa}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-editar-polissa')">✕</button>
                </div>
                <div class="modal-body">
                    <form id="form-editar-polissa" onsubmit="guardarEdicionPolissa(event, '${polissaId}')">
                        <fieldset>
                            <legend>📋 Dades Pòlissa</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Campanya:</label>
                                    <input type="number" name="campanya" value="${polissa.campanya}" readonly>
                                </div>
                                <div class="form-group">
                                    <label>Número Pòlissa:</label>
                                    <input type="text" name="num_polissa" value="${polissa.num_polissa}" readonly>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Referència Col·lectiva:</label>
                                <input type="text" name="ref_collectiu" value="${polissa.ref_collectiu || ''}">
                            </div>
                            <div class="form-group">
                                <label>Número Rebut:</label>
                                <input type="text" name="num_rebut" value="${polissa.num_rebut || ''}">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Línia:</label>
                                    <select name="linia" required>
                                        <option value="FRUTALS" ${polissa.linia === 'FRUTALS' ? 'selected' : ''}>🍑 FRUTALS</option>
                                        <option value="CEREAL" ${polissa.linia === 'CEREAL' ? 'selected' : ''}>🌾 CEREAL</option>
                                        <option value="OLIVERA" ${polissa.linia === 'OLIVERA' ? 'selected' : ''}>🫒 OLIVERA</option>
                                        <option value="ALTRE" ${polissa.linia === 'ALTRE' ? 'selected' : ''}>📋 ALTRE</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Pla:</label>
                                    <input type="text" name="pla" value="${polissa.pla || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Categoria:</label>
                                <select name="categoria" required>
                                    <option value="PRINCIPAL" ${polissa.categoria === 'PRINCIPAL' ? 'selected' : ''}>PRINCIPAL</option>
                                    <option value="COMPLEMENTARIA" ${polissa.categoria === 'COMPLEMENTARIA' ? 'selected' : ''}>COMPLEMENTARIA</option>
                                </select>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>📅 Dates</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Data Vigor:</label>
                                    <input type="date" name="data_vigor" value="${polissa.data_vigor || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>Data Venciment:</label>
                                    <input type="date" name="data_venciment" value="${polissa.data_venciment || ''}">
                                </div>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>💰 Finances</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Prima Comercial (€):</label>
                                    <input type="number" name="prima_comercial" step="0.01" min="0" value="${polissa.prima_comercial || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Prima Neta (€):</label>
                                    <input type="number" name="prima_neta" step="0.01" min="0" value="${polissa.prima_neta || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Subvenció ENESA (€):</label>
                                    <input type="number" name="subvencio_enesa" step="0.01" min="0" value="${polissa.subvencio_enesa || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Subvenció CA (€):</label>
                                    <input type="number" name="subvencio_ca" step="0.01" min="0" value="${polissa.subvencio_ca || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Cost Tomador (€):</label>
                                    <input type="number" name="cost_tomador" step="0.01" min="0" value="${polissa.cost_tomador || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Capital Assegurat (€):</label>
                                    <input type="number" name="capital_assegurat_total" step="0.01" min="0" value="${polissa.capital_assegurat_total || ''}" required>
                                </div>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>🌾 Producció</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Producció Total (kg):</label>
                                    <input type="number" name="produccio_total_kg" step="0.01" min="0" value="${polissa.produccio_total_kg || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Superfície Total (Ha):</label>
                                    <input type="number" name="superficie_total_ha" step="0.01" min="0" value="${polissa.superficie_total_ha || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Número de Parcel·les:</label>
                                <input type="number" name="num_parcelles" min="0" value="${polissa.num_parcelles || ''}">
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>📝 Observacions</legend>
                            <div class="form-group">
                                <textarea name="observacions" rows="3">${polissa.observacions || ''}</textarea>
                            </div>
                        </fieldset>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-editar-polissa')">Cancelar</button>
                    <button type="submit" form="form-editar-polissa" class="btn btn-primary">✅ Guardar Canvis</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) tancarModal('modal-editar-polissa'); });

    } catch (error) {
        mostrarNotificacio('Error obrint modal: ' + error.message, 'error');
    }
}

// ============================================================
// GUARDAR NOVA PÒLISSA
// ============================================================

async function guardarNovaPolissa(event) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-nova-polissa');
        const dades = new FormData(form);
        const polissa = {
            campanya: parseInt(dades.get('campanya')),
            num_polissa: dades.get('num_polissa'),
            ref_collectiu: dades.get('ref_collectiu') || null,
            num_rebut: dades.get('num_rebut') || null,
            linia: dades.get('linia'),
            pla: dades.get('pla') || null,
            categoria: dades.get('categoria'),
            data_vigor: dades.get('data_vigor') || null,
            data_venciment: dades.get('data_venciment') || null,
            prima_comercial: parseFloat(dades.get('prima_comercial')) || 0,
            prima_neta: parseFloat(dades.get('prima_neta')) || 0,
            subvencio_enesa: parseFloat(dades.get('subvencio_enesa')) || 0,
            subvencio_ca: parseFloat(dades.get('subvencio_ca')) || 0,
            cost_tomador: parseFloat(dades.get('cost_tomador')) || 0,
            capital_assegurat_total: parseFloat(dades.get('capital_assegurat_total')),
            produccio_total_kg: parseFloat(dades.get('produccio_total_kg')) || null,
            superficie_total_ha: parseFloat(dades.get('superficie_total_ha')) || null,
            num_parcelles: parseInt(dades.get('num_parcelles')) || null,
            observacions: dades.get('observacions') || null
        };
        if (!polissa.num_polissa) throw new Error('Número de pòlissa obligatori');
        if (!polissa.linia) throw new Error('Línia obligatòria');
        if (polissa.capital_assegurat_total <= 0) throw new Error('Capital assegurat ha de ser > 0');
        await createPolissa(polissa);
        mostrarNotificacio('✅ Pòlissa creada correctament', 'success');
        tancarModal('modal-nova-polissa');
        await mostrarVistaAgroseguro();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// GUARDAR EDICIÓ PÒLISSA
// ============================================================

async function guardarEdicionPolissa(event, polissaId) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-editar-polissa');
        const dades = new FormData(form);
        const polissa = {
            ref_collectiu: dades.get('ref_collectiu') || null,
            num_rebut: dades.get('num_rebut') || null,
            linia: dades.get('linia'),
            pla: dades.get('pla') || null,
            categoria: dades.get('categoria'),
            data_vigor: dades.get('data_vigor') || null,
            data_venciment: dades.get('data_venciment') || null,
            prima_comercial: parseFloat(dades.get('prima_comercial')) || 0,
            prima_neta: parseFloat(dades.get('prima_neta')) || 0,
            subvencio_enesa: parseFloat(dades.get('subvencio_enesa')) || 0,
            subvencio_ca: parseFloat(dades.get('subvencio_ca')) || 0,
            cost_tomador: parseFloat(dades.get('cost_tomador')) || 0,
            capital_assegurat_total: parseFloat(dades.get('capital_assegurat_total')),
            produccio_total_kg: parseFloat(dades.get('produccio_total_kg')) || null,
            superficie_total_ha: parseFloat(dades.get('superficie_total_ha')) || null,
            num_parcelles: parseInt(dades.get('num_parcelles')) || null,
            observacions: dades.get('observacions') || null
        };
        if (!polissa.linia) throw new Error('Línia obligatòria');
        if (polissa.capital_assegurat_total <= 0) throw new Error('Capital assegurat ha de ser > 0');
        await updatePolissa(polissaId, polissa);
        mostrarNotificacio('✅ Pòlissa actualitzada correctament', 'success');
        tancarModal('modal-editar-polissa');
        await mostrarVistaAgroseguro();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL DETALL PÒLISSA — VERSIÓ AVANÇADA (v2)
// Tabs: Resum | Parcel·les | Sinistres | Estimació | Simulació
// ============================================================

async function obrirModalPolissa(polissaId) {
    try {
        const polissa = polissesCache.find(p => p.id === polissaId);
        if (!polissa) throw new Error('Pòlissa no trobada');

        // Carregar parcel·les primer (calen per resoldre les finques de la collita real)
        const parcelles = await carregarParcelles(polissaId);

        // Sinistres i collita real es poden carregar en paral·lel
        const [sinistres, collitaReal] = await Promise.all([
            carregarSinistres(polissaId),
            carregarCollitaReal(polissa, parcelles)
        ]);

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-detall-polissa';

        modal.innerHTML = `
            <div class="modal-content modal-content-xl">
                <div class="modal-header">
                    <div>
                        <h2>📋 ${polissa.num_polissa}</h2>
                        <span class="badge badge-linia">${polissa.linia}</span>
                        <span class="badge badge-categoria ${polissa.categoria === 'PRINCIPAL' ? 'badge-principal' : 'badge-complementaria'}">${polissa.categoria}</span>
                        <span class="badge">Campanya ${polissa.campanya}</span>
                    </div>
                    <button class="modal-close" onclick="tancarModal('modal-detall-polissa')">✕</button>
                </div>

                <!-- TABS NAVEGACIÓ -->
                <div class="detall-tabs">
                    <button class="tab-btn tab-actiu" onclick="canviarTabDetall('resum', this)">📊 Resum</button>
                    <button class="tab-btn" onclick="canviarTabDetall('parcelles', this)">🗺️ Parcel·les <span class="tab-badge">${parcelles.length}</span></button>
                    <button class="tab-btn" onclick="canviarTabDetall('sinistres', this)">⚠️ Sinistres <span class="tab-badge">${sinistres.length}</span></button>
                    <button class="tab-btn" onclick="canviarTabDetall('estimacio', this)">📈 Estimació</button>
                    <button class="tab-btn" onclick="canviarTabDetall('simulacio', this)">🧮 Simulació</button>
                </div>

                <div class="modal-body">

                    <!-- TAB: RESUM -->
                    <div id="tab-resum" class="tab-content tab-content-actiu">
                        ${renderResumPolissa(polissa, parcelles, sinistres)}
                    </div>

                    <!-- TAB: PARCEL·LES -->
                    <div id="tab-parcelles" class="tab-content" style="display:none">
                        ${renderTaulaParcellesDetall(parcelles, polissaId, polissa.campanya)}
                    </div>

                    <!-- TAB: SINISTRES -->
                    <div id="tab-sinistres" class="tab-content" style="display:none">
                        ${renderTaulaSinistresDetall(sinistres, polissaId, polissa.campanya)}
                    </div>

                    <!-- TAB: ESTIMACIÓ PRODUCCIÓ -->
                    <div id="tab-estimacio" class="tab-content" style="display:none">
                        ${renderEstimacioProduccio(parcelles, polissa, collitaReal)}
                    </div>

                    <!-- TAB: SIMULACIÓ COBERTURES -->
                    <div id="tab-simulacio" class="tab-content" style="display:none">
                        ${renderSimulacioCobertures(polissa)}
                    </div>

                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-detall-polissa')">Tancar</button>
                    <button type="button" class="btn btn-primary" onclick="tancarModal('modal-detall-polissa'); obrirModalEditarPolissa('${polissaId}')">✏️ Editar Pòlissa</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) tancarModal('modal-detall-polissa'); });

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error carregant detall: ' + error.message, 'error');
    }
}

// ---- CANVI DE TAB ----
function canviarTabDetall(tabId, btn) {
    document.querySelectorAll('#modal-detall-polissa .tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('#modal-detall-polissa .tab-btn').forEach(b => b.classList.remove('tab-actiu'));
    document.getElementById('tab-' + tabId).style.display = 'block';
    btn.classList.add('tab-actiu');
}

// ============================================================
// RENDER RESUM PÒLISSA
// ============================================================

function renderResumPolissa(polissa, parcelles, sinistres) {
    const totalIndemnitzat = sinistres.reduce((s, x) => s + (x.indemnitzacio_rebuda || 0), 0);
    const totalCapitalDanyat = sinistres.reduce((s, x) => s + (x.capital_danyat || 0), 0);
    const superficieTotal = parcelles.reduce((s, x) => s + (x.superficie_ha || 0), 0);
    const produccioTotal = parcelles.reduce((s, x) => s + (x.produccio_kg || 0), 0);

    return `
        <div class="resum-grid">
            <!-- Dades pòlissa -->
            <div class="resum-card">
                <h4>📋 Identificació</h4>
                <table class="dades-taula">
                    <tr><td>Número Pòlissa</td><td><strong>${polissa.num_polissa}</strong></td></tr>
                    <tr><td>Ref. Col·lectiva</td><td>${polissa.ref_collectiu || '—'}</td></tr>
                    <tr><td>Núm. Rebut</td><td>${polissa.num_rebut || '—'}</td></tr>
                    <tr><td>Línia</td><td>${polissa.linia}</td></tr>
                    <tr><td>Pla</td><td>${polissa.pla || '—'}</td></tr>
                    <tr><td>Categoria</td><td>${polissa.categoria}</td></tr>
                </table>
            </div>

            <!-- Dates -->
            <div class="resum-card">
                <h4>📅 Vigència</h4>
                <table class="dades-taula">
                    <tr><td>Inici</td><td>${formatData(polissa.data_vigor)}</td></tr>
                    <tr><td>Venciment</td><td>${formatData(polissa.data_venciment)}</td></tr>
                    <tr><td>Dies restants</td><td>${diesRestants(polissa.data_venciment)}</td></tr>
                </table>
            </div>

            <!-- Finances -->
            <div class="resum-card">
                <h4>💰 Finances</h4>
                <table class="dades-taula">
                    <tr><td>Capital Assegurat</td><td><strong>${formatEuros(polissa.capital_assegurat_total)}</strong></td></tr>
                    <tr><td>Prima Comercial</td><td>${formatEuros(polissa.prima_comercial)}</td></tr>
                    <tr><td>Prima Neta</td><td>${formatEuros(polissa.prima_neta)}</td></tr>
                    <tr><td>Subvenció ENESA</td><td class="text-success">−${formatEuros(polissa.subvencio_enesa)}</td></tr>
                    <tr><td>Subvenció CA</td><td class="text-success">−${formatEuros(polissa.subvencio_ca)}</td></tr>
                    <tr><td>Cost Tomador</td><td><strong>${formatEuros(polissa.cost_tomador)}</strong></td></tr>
                </table>
            </div>

            <!-- KPIs producció -->
            <div class="resum-card">
                <h4>🌾 Producció Assegurada</h4>
                <div class="kpi-grid">
                    <div class="kpi-item">
                        <span class="kpi-valor">${superficieTotal.toFixed(2)} ha</span>
                        <span class="kpi-label">Superfície total</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-valor">${formatKg(produccioTotal)}</span>
                        <span class="kpi-label">Producció assegurada</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-valor">${parcelles.length}</span>
                        <span class="kpi-label">Parcel·les</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-valor">${superficieTotal > 0 ? (produccioTotal / superficieTotal).toFixed(0) + ' kg/ha' : '—'}</span>
                        <span class="kpi-label">Rendiment mig</span>
                    </div>
                </div>
            </div>

            <!-- KPIs sinistres -->
            <div class="resum-card resum-card-wide">
                <h4>⚠️ Sinistralitat</h4>
                <div class="kpi-grid kpi-grid-4">
                    <div class="kpi-item">
                        <span class="kpi-valor">${sinistres.length}</span>
                        <span class="kpi-label">Sinistres totals</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-valor">${sinistres.filter(s => !s.indemnitzacio_rebuda).length}</span>
                        <span class="kpi-label">Pendents cobrament</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-valor text-warning">${formatEuros(totalCapitalDanyat)}</span>
                        <span class="kpi-label">Capital danyat</span>
                    </div>
                    <div class="kpi-item">
                        <span class="kpi-valor text-success">${formatEuros(totalIndemnitzat)}</span>
                        <span class="kpi-label">Indemnitzat rebut</span>
                    </div>
                </div>
            </div>

            ${polissa.observacions ? `
            <div class="resum-card resum-card-wide">
                <h4>📝 Observacions</h4>
                <p class="observacions-text">${polissa.observacions}</p>
            </div>` : ''}
        </div>
    `;
}

// ============================================================
// RENDER TAULA PARCEL·LES AMB DETALL
// ============================================================

function renderTaulaParcellesDetall(parcelles, polissaId, campanya) {
    return `
        <div class="seccio-toolbar">
            <h3>🗺️ Parcel·les Assegurades</h3>
            <button class="btn btn-primary btn-sm" onclick="obrirModalNovaParcel·la('${polissaId}', ${campanya})">
                ➕ Nova Parcel·la
            </button>
        </div>

        ${parcelles.length === 0 ? `
            <div class="buit-msg">
                <p>Cap parcel·la registrada. Afegeix la primera parcel·la.</p>
            </div>
        ` : `
            <div class="table-responsive">
                <table class="taula-dades">
                    <thead>
                        <tr>
                            <th>Núm.</th>
                            <th>SIGPAC</th>
                            <th>Cultiu</th>
                            <th>Varietat</th>
                            <th>Superfície (ha)</th>
                            <th>Producció (kg)</th>
                            <th>Preu (€/kg)</th>
                            <th>Capital (€)</th>
                            <th>Sistema</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parcelles.map(p => `
                            <tr>
                                <td>${p.num_par || '—'}</td>
                                <td><code>${p.sigpac || '—'}</code></td>
                                <td>${p.cultiu_nom || p.cultiu_codi || '—'}</td>
                                <td>${p.varietat_nom || p.varietat_codi || '—'}</td>
                                <td class="text-right">${p.superficie_ha ? p.superficie_ha.toFixed(4) : '—'}</td>
                                <td class="text-right">${p.produccio_kg ? formatKg(p.produccio_kg) : '—'}</td>
                                <td class="text-right">${p.preu_kg ? p.preu_kg.toFixed(2) + ' €' : '—'}</td>
                                <td class="text-right"><strong>${formatEuros(p.capital_assegurat)}</strong></td>
                                <td>${p.sistema_produccio || '—'}</td>
                                <td>
                                    <button class="btn-icon" onclick="obrirModalEditarParcel·la('${p.id}', '${polissaId}')" title="Editar">✏️</button>
                                    <button class="btn-icon btn-icon-danger" onclick="eliminarParcel·la('${p.id}', '${polissaId}')" title="Eliminar">🗑️</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="taula-totals">
                            <td colspan="4"><strong>TOTAL</strong></td>
                            <td class="text-right"><strong>${parcelles.reduce((s,p) => s + (p.superficie_ha||0), 0).toFixed(4)} ha</strong></td>
                            <td class="text-right"><strong>${formatKg(parcelles.reduce((s,p) => s + (p.produccio_kg||0), 0))}</strong></td>
                            <td></td>
                            <td class="text-right"><strong>${formatEuros(parcelles.reduce((s,p) => s + (p.capital_assegurat||0), 0))}</strong></td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `}
    `;
}

// ============================================================
// RENDER TAULA SINISTRES AMB DETALL
// ============================================================

function renderTaulaSinistresDetall(sinistres, polissaId, campanya) {
    return `
        <div class="seccio-toolbar">
            <h3>⚠️ Gestió de Sinistres</h3>
            <button class="btn btn-warning btn-sm" onclick="obrirModalNouSinistre('${polissaId}', ${campanya})">
                ➕ Nou Sinistre
            </button>
        </div>

        ${sinistres.length === 0 ? `
            <div class="buit-msg">
                <p>Cap sinistre registrat per aquesta pòlissa.</p>
            </div>
        ` : `
            <div class="table-responsive">
                <table class="taula-dades">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tipus</th>
                            <th>Expedient</th>
                            <th>Cultiu</th>
                            <th>% Dany</th>
                            <th>Prod. perduda</th>
                            <th>Capital danyat</th>
                            <th>Indemnització</th>
                            <th>Cobrament</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sinistres.map(s => {
                            const estat = !s.indemnitzacio_rebuda ? 'pendent' : 'cobrat';
                            return `
                            <tr>
                                <td>${formatData(s.data_sinistre)}</td>
                                <td><span class="badge badge-tipus-sinistre">${s.tipus || '—'}</span></td>
                                <td><code>${s.num_expedient || '—'}</code></td>
                                <td>${s.cultiu || '—'} ${s.varietat ? '/ ' + s.varietat : ''}</td>
                                <td class="text-right">${s.percentatge_dany ? s.percentatge_dany.toFixed(1) + ' %' : '—'}</td>
                                <td class="text-right">${s.produccio_perduda_kg ? formatKg(s.produccio_perduda_kg) : '—'}</td>
                                <td class="text-right text-warning">${formatEuros(s.capital_danyat)}</td>
                                <td class="text-right text-success"><strong>${formatEuros(s.indemnitzacio_rebuda)}</strong></td>
                                <td>
                                    <span class="badge badge-estat badge-estat-${estat}">
                                        ${estat === 'cobrat' ? '✅ ' + formatData(s.data_cobrament) : '⏳ Pendent'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn-icon" onclick="obrirModalEditarSinistre('${s.id}', '${polissaId}')" title="Editar">✏️</button>
                                    <button class="btn-icon btn-icon-danger" onclick="eliminarSinistre('${s.id}', '${polissaId}')" title="Eliminar">🗑️</button>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="taula-totals">
                            <td colspan="6"><strong>TOTALS</strong></td>
                            <td class="text-right text-warning"><strong>${formatEuros(sinistres.reduce((s,x) => s + (x.capital_danyat||0), 0))}</strong></td>
                            <td class="text-right text-success"><strong>${formatEuros(sinistres.reduce((s,x) => s + (x.indemnitzacio_rebuda||0), 0))}</strong></td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `}
    `;
}

// ============================================================
// RENDER ESTIMACIÓ PRODUCCIÓ
// ============================================================

function renderEstimacioProduccio(parcelles, polissa, collitaReal) {
    if (parcelles.length === 0) {
        return `<div class="buit-msg"><p>Cal afegir parcel·les per calcular l'estimació de producció.</p></div>`;
    }

    const totalSup = parcelles.reduce((s, p) => s + (p.superficie_ha || 0), 0);
    const totalProd = parcelles.reduce((s, p) => s + (p.produccio_kg || 0), 0);
    const rendimentMig = totalSup > 0 ? totalProd / totalSup : 0;
    const capitalTotal = parcelles.reduce((s, p) => s + (p.capital_assegurat || 0), 0);
    // Preu mig ponderat: prioritzem el preu_kg declarat a cada parcel·la (ponderat per la
    // seva producció), ja que capital_assegurat pot no estar emplenat encara que preu_kg sí.
    // Fallback: si cap parcel·la té preu_kg, derivem el preu del capital/producció total.
    const sumaPreuPonderat = parcelles.reduce((s, p) => s + ((p.preu_kg || 0) * (p.produccio_kg || 0)), 0);
    const preuMig = totalProd > 0 && sumaPreuPonderat > 0
        ? sumaPreuPonderat / totalProd
        : (capitalTotal > 0 && totalProd > 0 ? capitalTotal / totalProd : 0);

    // Base de càlcul dels escenaris: la producció assegurada pot quedar molt per sota
    // de la collita real (la pòlissa sovint assegura només una part de la producció total).
    // Per evitar escenaris "excel·lents" inferiors a un any real ja collit, fem servir
    // com a base el valor més alt entre producció assegurada i collita real coneguda.
    const baseEscenaris = Math.max(totalProd, collitaReal && collitaReal.totalKg ? collitaReal.totalKg : 0);

    // Escenaris producció (factors aplicats sobre la base, no només sobre l'assegurat)
    const escenaris = [
        { nom: '🌧️ Any dolent', factor: 0.60, color: 'escenari-dolent' },
        { nom: '☁️ Any normal baix', factor: 0.80, color: 'escenari-normal-baix' },
        { nom: '☀️ Any normal', factor: 1.00, color: 'escenari-normal' },
        { nom: '🌞 Any bo', factor: 1.20, color: 'escenari-bo' },
        { nom: '🏆 Any excel·lent', factor: 1.40, color: 'escenari-excel' },
    ];

    return `
        <div class="estimacio-wrapper">
            <h3>📈 Estimació Producció — Campanya ${polissa.campanya}</h3>

            <!-- Resum per cultiu/varietat -->
            <h4>Distribució per Parcel·la</h4>
            <div class="table-responsive">
                <table class="taula-dades">
                    <thead>
                        <tr>
                            <th>Parcel·la</th>
                            <th>Cultiu / Varietat</th>
                            <th>Superfície (ha)</th>
                            <th>Prod. assegurada (kg)</th>
                            <th>Rendiment (kg/ha)</th>
                            <th>Preu (€/kg)</th>
                            <th>Capital (€)</th>
                            <th>% sobre total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${parcelles.map(p => {
                            const rend = p.superficie_ha > 0 ? (p.produccio_kg || 0) / p.superficie_ha : 0;
                            const pct = totalProd > 0 ? ((p.produccio_kg || 0) / totalProd * 100) : 0;
                            // Fallback: si capital_assegurat no està emplenat, el derivem de producció × preu
                            const capitalParcella = (p.capital_assegurat != null && p.capital_assegurat !== 0)
                                ? p.capital_assegurat
                                : ((p.produccio_kg || 0) * (p.preu_kg || 0));
                            return `
                            <tr>
                                <td>${p.num_par || '—'} <small>${p.sigpac || ''}</small></td>
                                <td>${p.cultiu_nom || p.cultiu_codi || '—'} ${p.varietat_nom ? '/ ' + p.varietat_nom : ''}</td>
                                <td class="text-right">${(p.superficie_ha || 0).toFixed(4)}</td>
                                <td class="text-right">${formatKg(p.produccio_kg || 0)}</td>
                                <td class="text-right">${rend.toFixed(0)}</td>
                                <td class="text-right">${p.preu_kg ? p.preu_kg.toFixed(2) + ' €' : '—'}</td>
                                <td class="text-right">${formatEuros(capitalParcella)}</td>
                                <td class="text-right">
                                    <div class="mini-barra-wrapper">
                                        <div class="mini-barra" style="width:${pct.toFixed(0)}%"></div>
                                        <span>${pct.toFixed(1)}%</span>
                                    </div>
                                </td>
                            </tr>
                        `}).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="taula-totals">
                            <td colspan="2"><strong>TOTAL</strong></td>
                            <td class="text-right"><strong>${totalSup.toFixed(4)} ha</strong></td>
                            <td class="text-right"><strong>${formatKg(totalProd)}</strong></td>
                            <td class="text-right"><strong>${rendimentMig.toFixed(0)} kg/ha</strong></td>
                            <td class="text-right">${preuMig > 0 ? preuMig.toFixed(2) + ' €' : '—'}</td>
                            <td class="text-right"><strong>${formatEuros(capitalTotal > 0 ? capitalTotal : totalProd * preuMig)}</strong></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <!-- Escenaris producció -->
            <h4 style="margin-top:20px">🔮 Escenaris de Producció</h4>
            ${baseEscenaris > totalProd ? `
                <div class="nota-info" style="margin-bottom:12px;">
                    ℹ️ La producció assegurada (${formatKg(totalProd)}) és inferior a la collita real coneguda (${formatKg(collitaReal.totalKg)}). Els escenaris es calculen sobre la base més alta per no infravalorar anys ja collits.
                </div>
            ` : ''}
            <div class="escenaris-grid">
                ${escenaris.map(e => {
                    const prod = baseEscenaris * e.factor;
                    const valor = prod * preuMig;
                    return `
                    <div class="escenari-card ${e.color}">
                        <div class="escenari-nom">${e.nom}</div>
                        <div class="escenari-factor">${(e.factor * 100).toFixed(0)}% producció</div>
                        <div class="escenari-prod">${formatKg(prod)}</div>
                        <div class="escenari-valor">${formatEuros(valor)}</div>
                        <div class="escenari-label">Valor estimat collita</div>
                    </div>
                `}).join('')}
            </div>

            <!-- Comparativa amb collita real -->
            <h4 style="margin-top:20px">🍎 Comparativa amb Collita Real</h4>
            ${renderComparativaCollitaReal(collitaReal, totalProd, preuMig)}

            <div class="nota-info">
                ℹ️ L'estimació es basa en la producció assegurada declarada a la pòlissa. El preu mig calculat és ${preuMig.toFixed(3)} €/kg.
            </div>
        </div>
    `;
}

// ---- Render bloc comparatiu collita real vs producció assegurada ----
function renderComparativaCollitaReal(collitaReal, totalProdAssegurada, preuMig) {
    if (!collitaReal || !collitaReal.font) {
        return `
            <div class="buit-msg">
                <p>Cap parcel·la d'aquesta pòlissa està vinculada a una fitxa de la taula "Parcel·les" (camp parcella_id), o cap d'elles té finca assignada. No es pot calcular la comparativa amb collita real.</p>
            </div>
        `;
    }

    if (collitaReal.totalKg === 0) {
        return `
            <div class="buit-msg">
                <p>No s'ha trobat collita registrada per a la campanya ${collitaReal.campanya} a les finques: <strong>${collitaReal.finques.join(', ')}</strong>.</p>
            </div>
        `;
    }

    const diferenciaKg = collitaReal.totalKg - totalProdAssegurada;
    const diferenciaPct = totalProdAssegurada > 0 ? (diferenciaKg / totalProdAssegurada * 100) : 0;
    const valorReal = collitaReal.totalKg * preuMig;
    const signeClasse = diferenciaKg >= 0 ? 'text-success' : 'text-danger';
    const signeText = diferenciaKg >= 0 ? '+' : '';

    return `
        <div class="table-responsive">
            <table class="taula-dades">
                <thead>
                    <tr>
                        <th>Origen</th>
                        <th class="text-right">Albarans</th>
                        <th class="text-right">Producció (kg)</th>
                        <th class="text-right">Valor estimat (€)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>📋 Producció Assegurada (pòlissa)</td>
                        <td class="text-right">—</td>
                        <td class="text-right">${formatKg(totalProdAssegurada)}</td>
                        <td class="text-right">${formatEuros(totalProdAssegurada * preuMig)}</td>
                    </tr>
                    <tr>
                        <td>🍎 Collita Real (mòdul Collita)</td>
                        <td class="text-right">${collitaReal.numAlbarans}</td>
                        <td class="text-right">${formatKg(collitaReal.totalKg)}</td>
                        <td class="text-right">${formatEuros(valorReal)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr class="taula-totals">
                        <td><strong>Desviació</strong></td>
                        <td></td>
                        <td class="text-right ${signeClasse}"><strong>${signeText}${formatKg(diferenciaKg)}</strong></td>
                        <td class="text-right ${signeClasse}"><strong>${signeText}${diferenciaPct.toFixed(1)}%</strong></td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div class="nota-info">
            ℹ️ Collita real obtinguda de ${collitaReal.font === 'cereal' ? 'collita_entrades_cereal' : 'collita_entrada'} per a la campanya ${collitaReal.campanya}, filtrant per finca real: <strong>${collitaReal.finques.join(', ')}</strong> (vinculació via parcella_id → parcelles.finca).
        </div>
    `;
}

// ============================================================
// RENDER SIMULACIÓ COBERTURES
// ============================================================

function renderSimulacioCobertures(polissa) {
    const capital = polissa.capital_assegurat_total || 0;
    const primaNeta = polissa.prima_neta || 0;

    return `
        <div class="simulacio-wrapper">
            <h3>🧮 Simulació de Cobertures</h3>
            <p class="simulacio-desc">Calcula la prima estimada i l'impacte econòmic en funció del % de cobertura i la franquícia.</p>

            <div class="simulacio-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Capital Assegurat Base (€):</label>
                        <input type="number" id="sim-capital" value="${capital}" step="0.01" min="0" oninput="recalcularSimulacio()">
                    </div>
                    <div class="form-group">
                        <label>Prima Neta Actual (€):</label>
                        <input type="number" id="sim-prima-neta" value="${primaNeta}" step="0.01" min="0" oninput="recalcularSimulacio()">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>% Cobertura: <span id="sim-cob-val">80</span>%</label>
                        <input type="range" id="sim-cobertura" min="50" max="100" value="80" step="5" oninput="document.getElementById('sim-cob-val').textContent=this.value; recalcularSimulacio()">
                    </div>
                    <div class="form-group">
                        <label>% Franquícia: <span id="sim-fran-val">10</span>%</label>
                        <input type="range" id="sim-franquicia" min="0" max="30" value="10" step="5" oninput="document.getElementById('sim-fran-val').textContent=this.value; recalcularSimulacio()">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Subvenció ENESA estimada (%):</label>
                        <select id="sim-enesa" onchange="recalcularSimulacio()">
                            <option value="0">0%</option>
                            <option value="12">12% (bàsic)</option>
                            <option value="20" selected>20% (estàndard)</option>
                            <option value="35">35% (avançat)</option>
                            <option value="48">48% (màxim)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Subvenció CA estimada (%):</label>
                        <select id="sim-ca" onchange="recalcularSimulacio()">
                            <option value="0">0%</option>
                            <option value="10" selected>10% (Catalunya)</option>
                            <option value="15">15%</option>
                            <option value="20">20%</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Resultats simulació -->
            <div id="simulacio-resultats" class="simulacio-resultats">
                <!-- Generats per recalcularSimulacio() -->
            </div>

            <!-- Comparativa PRINCIPAL vs COMPLEMENTARIA -->
            <div class="comparativa-wrapper">
                <h4>🔄 Comparativa PRINCIPAL vs COMPLEMENTARIA</h4>
                <div id="comparativa-taula">
                    <!-- Generada per recalcularSimulacio() -->
                </div>
            </div>
        </div>
    `;
}

// ---- RECÀLCUL SIMULACIÓ (executa al canviar inputs) ----
function recalcularSimulacio() {
    const capital = parseFloat(document.getElementById('sim-capital')?.value) || 0;
    const primaNeta = parseFloat(document.getElementById('sim-prima-neta')?.value) || 0;
    const cobPct = parseFloat(document.getElementById('sim-cobertura')?.value) || 80;
    const franPct = parseFloat(document.getElementById('sim-franquicia')?.value) || 10;
    const enesaPct = parseFloat(document.getElementById('sim-enesa')?.value) || 20;
    const caPct = parseFloat(document.getElementById('sim-ca')?.value) || 10;

    // Càlculs base
    const capitalCobert = capital * (cobPct / 100);
    const franquicia = capitalCobert * (franPct / 100);
    const indemnitzacioMax = capitalCobert - franquicia;
    const subvencioENESA = primaNeta * (enesaPct / 100);
    const subvencioCA = primaNeta * (caPct / 100);
    const costTomador = primaNeta - subvencioENESA - subvencioCA;
    const rati = primaNeta > 0 ? (indemnitzacioMax / primaNeta) * 100 : 0;

    const resEl = document.getElementById('simulacio-resultats');
    if (!resEl) return;

    resEl.innerHTML = `
        <div class="res-grid">
            <div class="res-card res-highlight">
                <span class="res-label">Capital Cobert</span>
                <span class="res-valor">${formatEuros(capitalCobert)}</span>
                <span class="res-sub">${cobPct}% de ${formatEuros(capital)}</span>
            </div>
            <div class="res-card">
                <span class="res-label">Franquícia</span>
                <span class="res-valor text-warning">${formatEuros(franquicia)}</span>
                <span class="res-sub">${franPct}% del capital cobert</span>
            </div>
            <div class="res-card res-highlight-green">
                <span class="res-label">Indemnització Màxima</span>
                <span class="res-valor text-success">${formatEuros(indemnitzacioMax)}</span>
                <span class="res-sub">Capital cobert − Franquícia</span>
            </div>
            <div class="res-card">
                <span class="res-label">Prima Neta</span>
                <span class="res-valor">${formatEuros(primaNeta)}</span>
                <span class="res-sub">Base de càlcul</span>
            </div>
            <div class="res-card">
                <span class="res-label">Subvenció ENESA</span>
                <span class="res-valor text-success">−${formatEuros(subvencioENESA)}</span>
                <span class="res-sub">${enesaPct}% de la prima</span>
            </div>
            <div class="res-card">
                <span class="res-label">Subvenció CA</span>
                <span class="res-valor text-success">−${formatEuros(subvencioCA)}</span>
                <span class="res-sub">${caPct}% de la prima</span>
            </div>
            <div class="res-card res-highlight-blue">
                <span class="res-label">Cost Real Tomador</span>
                <span class="res-valor">${formatEuros(costTomador)}</span>
                <span class="res-sub">Prima − Subvencions</span>
            </div>
            <div class="res-card ${rati > 300 ? 'res-highlight-green' : rati > 150 ? '' : 'res-highlight-warning'}">
                <span class="res-label">Ràtio Cobertura/Cost</span>
                <span class="res-valor">${rati.toFixed(0)}%</span>
                <span class="res-sub">Indemnit. màx. / Prima neta</span>
            </div>
        </div>
    `;

    // Comparativa PRINCIPAL vs COMPLEMENTARIA
    const factorComp = 0.30; // Complementaria cobreix ~30% del no cobert
    const capitalPrinc = capitalCobert;
    const capitalComp = (capital - capitalCobert) * factorComp;
    const primaCompEst = primaNeta * 0.20; // Estimació ~20% de la principal

    const compEl = document.getElementById('comparativa-taula');
    if (!compEl) return;

    compEl.innerHTML = `
        <table class="taula-dades">
            <thead>
                <tr>
                    <th>Concepte</th>
                    <th class="text-center">PRINCIPAL (${cobPct}%)</th>
                    <th class="text-center">COMPLEMENTARIA</th>
                    <th class="text-center">COMBINADA</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Capital cobert</td>
                    <td class="text-right">${formatEuros(capitalPrinc)}</td>
                    <td class="text-right">${formatEuros(capitalComp)}</td>
                    <td class="text-right"><strong>${formatEuros(capitalPrinc + capitalComp)}</strong></td>
                </tr>
                <tr>
                    <td>Franquícia aplicada</td>
                    <td class="text-right text-warning">${formatEuros(franquicia)}</td>
                    <td class="text-right text-warning">${formatEuros(capitalComp * franPct / 100)}</td>
                    <td class="text-right text-warning">${formatEuros(franquicia + capitalComp * franPct / 100)}</td>
                </tr>
                <tr>
                    <td>Indemnització màxima</td>
                    <td class="text-right text-success">${formatEuros(indemnitzacioMax)}</td>
                    <td class="text-right text-success">${formatEuros(capitalComp * (1 - franPct/100))}</td>
                    <td class="text-right text-success"><strong>${formatEuros(indemnitzacioMax + capitalComp * (1 - franPct/100))}</strong></td>
                </tr>
                <tr>
                    <td>Prima estimada</td>
                    <td class="text-right">${formatEuros(primaNeta)}</td>
                    <td class="text-right">${formatEuros(primaCompEst)}</td>
                    <td class="text-right"><strong>${formatEuros(primaNeta + primaCompEst)}</strong></td>
                </tr>
                <tr>
                    <td>Cost tomador estimat</td>
                    <td class="text-right">${formatEuros(costTomador)}</td>
                    <td class="text-right">${formatEuros(primaCompEst * (1 - (enesaPct + caPct) / 100))}</td>
                    <td class="text-right"><strong>${formatEuros(costTomador + primaCompEst * (1 - (enesaPct + caPct) / 100))}</strong></td>
                </tr>
            </tbody>
        </table>
        <div class="nota-info">
            ℹ️ Els valors de la pòlissa COMPLEMENTARIA són estimacions basades en la principal. Consulta Agroseguro per a les condicions exactes.
        </div>
    `;
}

// ============================================================
// MODAL NOVA PARCEL·LA
// ============================================================

function obrirModalNovaParcel·la(polissaId, campanya) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-nova-parcella';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>🗺️ Nova Parcel·la</h2>
                <button class="modal-close" onclick="tancarModal('modal-nova-parcella')">✕</button>
            </div>
            <div class="modal-body">
                <form id="form-nova-parcella" onsubmit="guardarNovaParcel·la(event, '${polissaId}', ${campanya})">
                    <fieldset>
                        <legend>📍 Identificació</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Núm. Parcel·la:</label>
                                <input type="text" name="num_par" placeholder="Ex: 0001">
                            </div>
                            <div class="form-group">
                                <label>Referència SIGPAC:</label>
                                <input type="text" name="sigpac" placeholder="Ex: 43-001-0-001-01-0001-WI">
                            </div>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>🌱 Cultiu</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Codi Cultiu:</label>
                                <input type="text" name="cultiu_codi" placeholder="Ex: PR">
                            </div>
                            <div class="form-group">
                                <label>Nom Cultiu:</label>
                                <input type="text" name="cultiu_nom" placeholder="Ex: PRESSEC">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Codi Varietat:</label>
                                <input type="text" name="varietat_codi" placeholder="Ex: 001">
                            </div>
                            <div class="form-group">
                                <label>Nom Varietat:</label>
                                <input type="text" name="varietat_nom" placeholder="Ex: ANDROS">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Sistema Producció:</label>
                                <select name="sistema_produccio">
                                    <option value="">- Selecciona -</option>
                                    <option value="REGADIU">Regadiu</option>
                                    <option value="SECA">Secà</option>
                                    <option value="HIVERNACLE">Hivernacle</option>
                                    <option value="ECO">Ecològic</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Destí:</label>
                                <input type="text" name="desti" placeholder="Ex: FRUITA FRESCA">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Data Plantació:</label>
                                <input type="date" name="data_plantacio">
                            </div>
                            <div class="form-group">
                                <label>Edat (anys):</label>
                                <input type="number" name="edat" min="0">
                            </div>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>📏 Superfície i Producció</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Superfície (ha):</label>
                                <input type="number" name="superficie_ha" step="0.0001" min="0" oninput="calcularCapitalParcel·la()">
                            </div>
                            <div class="form-group">
                                <label>Núm. Unitats:</label>
                                <input type="number" name="num_unitats" min="0">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Producció (kg):</label>
                                <input type="number" name="produccio_kg" step="0.01" min="0" oninput="calcularCapitalParcel·la()">
                            </div>
                            <div class="form-group">
                                <label>Preu (€/kg):</label>
                                <input type="number" name="preu_kg" step="0.001" min="0" oninput="calcularCapitalParcel·la()">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Capital Assegurat (€): <small class="text-muted">(calculat automàticament)</small></label>
                            <input type="number" name="capital_assegurat" id="nova-parcella-capital" step="0.01" min="0">
                        </div>
                    </fieldset>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nova-parcella')">Cancelar</button>
                <button type="submit" form="form-nova-parcella" class="btn btn-primary">✅ Guardar Parcel·la</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) tancarModal('modal-nova-parcella'); });
}

// ---- Autocàlcul capital parcel·la ----
function calcularCapitalParcel·la() {
    const prod = parseFloat(document.querySelector('[name="produccio_kg"]')?.value) || 0;
    const preu = parseFloat(document.querySelector('[name="preu_kg"]')?.value) || 0;
    const capitalEl = document.getElementById('nova-parcella-capital');
    if (capitalEl && prod > 0 && preu > 0) {
        capitalEl.value = (prod * preu).toFixed(2);
    }
}

// ============================================================
// GUARDAR NOVA PARCEL·LA
// ============================================================

async function guardarNovaParcel·la(event, polissaId, campanya) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-nova-parcella');
        const dades = new FormData(form);

        const parcella = {
            polissa_id: polissaId,
            campanya: parseInt(campanya),
            num_par: dades.get('num_par') || null,
            cultiu_codi: dades.get('cultiu_codi') || null,
            cultiu_nom: dades.get('cultiu_nom') || null,
            varietat_codi: dades.get('varietat_codi') || null,
            varietat_nom: dades.get('varietat_nom') || null,
            sigpac: dades.get('sigpac') || null,
            superficie_ha: parseFloat(dades.get('superficie_ha')) || null,
            num_unitats: parseInt(dades.get('num_unitats')) || null,
            produccio_kg: parseFloat(dades.get('produccio_kg')) || null,
            preu_kg: parseFloat(dades.get('preu_kg')) || null,
            capital_assegurat: parseFloat(dades.get('capital_assegurat')) || null,
            data_plantacio: dades.get('data_plantacio') || null,
            edat: parseInt(dades.get('edat')) || null,
            sistema_produccio: dades.get('sistema_produccio') || null,
            desti: dades.get('desti') || null
        };

        const { error } = await supabaseClient.from('agroseguro_parcelles').insert([parcella]);
        if (error) throw error;

        mostrarNotificacio('✅ Parcel·la afegida correctament', 'success');
        tancarModal('modal-nova-parcella');
        // Reobrir detall per refrescar
        tancarModal('modal-detall-polissa');
        await obrirModalPolissa(polissaId);

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL EDITAR PARCEL·LA
// ============================================================

async function obrirModalEditarParcel·la(parcellaId, polissaId) {
    try {
        const { data: parcella, error } = await supabaseClient
            .from('agroseguro_parcelles')
            .select('*')
            .eq('id', parcellaId)
            .single();
        if (error) throw error;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-editar-parcella';

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✏️ Editar Parcel·la — ${parcella.num_par || parcella.sigpac || 'Parcel·la'}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-editar-parcella')">✕</button>
                </div>
                <div class="modal-body">
                    <form id="form-editar-parcella" onsubmit="guardarEdicionParcel·la(event, '${parcellaId}', '${polissaId}')">
                        <fieldset>
                            <legend>📍 Identificació</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Núm. Parcel·la:</label>
                                    <input type="text" name="num_par" value="${parcella.num_par || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Referència SIGPAC:</label>
                                    <input type="text" name="sigpac" value="${parcella.sigpac || ''}">
                                </div>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>🌱 Cultiu</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Codi Cultiu:</label>
                                    <input type="text" name="cultiu_codi" value="${parcella.cultiu_codi || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Nom Cultiu:</label>
                                    <input type="text" name="cultiu_nom" value="${parcella.cultiu_nom || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Codi Varietat:</label>
                                    <input type="text" name="varietat_codi" value="${parcella.varietat_codi || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Nom Varietat:</label>
                                    <input type="text" name="varietat_nom" value="${parcella.varietat_nom || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Sistema Producció:</label>
                                    <select name="sistema_produccio">
                                        <option value="">- Selecciona -</option>
                                        <option value="REGADIU" ${parcella.sistema_produccio === 'REGADIU' ? 'selected' : ''}>Regadiu</option>
                                        <option value="SECA" ${parcella.sistema_produccio === 'SECA' ? 'selected' : ''}>Secà</option>
                                        <option value="HIVERNACLE" ${parcella.sistema_produccio === 'HIVERNACLE' ? 'selected' : ''}>Hivernacle</option>
                                        <option value="ECO" ${parcella.sistema_produccio === 'ECO' ? 'selected' : ''}>Ecològic</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Destí:</label>
                                    <input type="text" name="desti" value="${parcella.desti || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Data Plantació:</label>
                                    <input type="date" name="data_plantacio" value="${parcella.data_plantacio || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Edat (anys):</label>
                                    <input type="number" name="edat" min="0" value="${parcella.edat || ''}">
                                </div>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>📏 Superfície i Producció</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Superfície (ha):</label>
                                    <input type="number" name="superficie_ha" step="0.0001" min="0" value="${parcella.superficie_ha || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Núm. Unitats:</label>
                                    <input type="number" name="num_unitats" min="0" value="${parcella.num_unitats || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Producció (kg):</label>
                                    <input type="number" name="produccio_kg" step="0.01" min="0" value="${parcella.produccio_kg || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Preu (€/kg):</label>
                                    <input type="number" name="preu_kg" step="0.001" min="0" value="${parcella.preu_kg || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Capital Assegurat (€):</label>
                                <input type="number" name="capital_assegurat" step="0.01" min="0" value="${parcella.capital_assegurat || ''}">
                            </div>
                        </fieldset>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-editar-parcella')">Cancelar</button>
                    <button type="submit" form="form-editar-parcella" class="btn btn-primary">✅ Guardar Canvis</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) tancarModal('modal-editar-parcella'); });

    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// GUARDAR EDICIÓ PARCEL·LA
// ============================================================

async function guardarEdicionParcel·la(event, parcellaId, polissaId) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-editar-parcella');
        const dades = new FormData(form);

        const actualitzacio = {
            num_par: dades.get('num_par') || null,
            cultiu_codi: dades.get('cultiu_codi') || null,
            cultiu_nom: dades.get('cultiu_nom') || null,
            varietat_codi: dades.get('varietat_codi') || null,
            varietat_nom: dades.get('varietat_nom') || null,
            sigpac: dades.get('sigpac') || null,
            superficie_ha: parseFloat(dades.get('superficie_ha')) || null,
            num_unitats: parseInt(dades.get('num_unitats')) || null,
            produccio_kg: parseFloat(dades.get('produccio_kg')) || null,
            preu_kg: parseFloat(dades.get('preu_kg')) || null,
            capital_assegurat: parseFloat(dades.get('capital_assegurat')) || null,
            data_plantacio: dades.get('data_plantacio') || null,
            edat: parseInt(dades.get('edat')) || null,
            sistema_produccio: dades.get('sistema_produccio') || null,
            desti: dades.get('desti') || null
        };

        const { error } = await supabaseClient
            .from('agroseguro_parcelles')
            .update(actualitzacio)
            .eq('id', parcellaId);
        if (error) throw error;

        mostrarNotificacio('✅ Parcel·la actualitzada', 'success');
        tancarModal('modal-editar-parcella');
        tancarModal('modal-detall-polissa');
        await obrirModalPolissa(polissaId);

    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ELIMINAR PARCEL·LA
// ============================================================

async function eliminarParcel·la(parcellaId, polissaId) {
    if (!confirm('Segur que vols eliminar aquesta parcel·la?')) return;
    try {
        const { error } = await supabaseClient.from('agroseguro_parcelles').delete().eq('id', parcellaId);
        if (error) throw error;
        mostrarNotificacio('✅ Parcel·la eliminada', 'success');
        tancarModal('modal-detall-polissa');
        await obrirModalPolissa(polissaId);
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL NOU SINISTRE
// ============================================================

function obrirModalNouSinistre(polissaId, campanya) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-nou-sinistre';

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>⚠️ Nou Sinistre</h2>
                <button class="modal-close" onclick="tancarModal('modal-nou-sinistre')">✕</button>
            </div>
            <div class="modal-body">
                <form id="form-nou-sinistre" onsubmit="guardarNouSinistre(event, '${polissaId}', ${campanya})">
                    <fieldset>
                        <legend>📋 Dades del Sinistre</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Data Sinistre:</label>
                                <input type="date" name="data_sinistre" required>
                            </div>
                            <div class="form-group">
                                <label>Tipus de Sinistre:</label>
                                <select name="tipus" required>
                                    <option value="">- Selecciona -</option>
                                    <option value="PEDRA">🌨️ Pedra</option>
                                    <option value="GELADA">❄️ Gelada</option>
                                    <option value="SEQUERA">🌵 Sequera</option>
                                    <option value="INUNDACIO">🌊 Inundació</option>
                                    <option value="VENT">💨 Vent</option>
                                    <option value="INCENDI">🔥 Incendi</option>
                                    <option value="PLAGUES">🐛 Plagues</option>
                                    <option value="ALTRES">📋 Altres</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Número Expedient:</label>
                            <input type="text" name="num_expedient" placeholder="Ex: EXP-2024-001">
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>🌱 Cultiu Afectat</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Cultiu:</label>
                                <input type="text" name="cultiu" placeholder="Ex: PRESSEC">
                            </div>
                            <div class="form-group">
                                <label>Varietat:</label>
                                <input type="text" name="varietat" placeholder="Ex: ANDROS">
                            </div>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>💥 Danys</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label>% Dany:</label>
                                <input type="number" name="percentatge_dany" step="0.1" min="0" max="100" placeholder="Ex: 45.5">
                            </div>
                            <div class="form-group">
                                <label>Producció Perduda (kg):</label>
                                <input type="number" name="produccio_perduda_kg" step="0.01" min="0">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Capital Danyat (€):</label>
                            <input type="number" name="capital_danyat" step="0.01" min="0">
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>💰 Indemnització</legend>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Indemnització Rebuda (€):</label>
                                <input type="number" name="indemnitzacio_rebuda" step="0.01" min="0">
                            </div>
                            <div class="form-group">
                                <label>Data Cobrament:</label>
                                <input type="date" name="data_cobrament">
                            </div>
                        </div>
                    </fieldset>
                    <fieldset>
                        <legend>📝 Observacions</legend>
                        <div class="form-group">
                            <textarea name="observacions" rows="3" placeholder="Notes sobre el sinistre..."></textarea>
                        </div>
                    </fieldset>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-nou-sinistre')">Cancelar</button>
                <button type="submit" form="form-nou-sinistre" class="btn btn-warning">⚠️ Registrar Sinistre</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) tancarModal('modal-nou-sinistre'); });
}

// ============================================================
// GUARDAR NOU SINISTRE
// ============================================================

async function guardarNouSinistre(event, polissaId, campanya) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-nou-sinistre');
        const dades = new FormData(form);

        const sinistre = {
            polissa_id: polissaId,
            campanya: parseInt(campanya),
            data_sinistre: dades.get('data_sinistre') || null,
            tipus: dades.get('tipus') || null,
            num_expedient: dades.get('num_expedient') || null,
            cultiu: dades.get('cultiu') || null,
            varietat: dades.get('varietat') || null,
            percentatge_dany: parseFloat(dades.get('percentatge_dany')) || null,
            produccio_perduda_kg: parseFloat(dades.get('produccio_perduda_kg')) || null,
            capital_danyat: parseFloat(dades.get('capital_danyat')) || null,
            indemnitzacio_rebuda: parseFloat(dades.get('indemnitzacio_rebuda')) || null,
            data_cobrament: dades.get('data_cobrament') || null,
            observacions: dades.get('observacions') || null
        };

        if (!sinistre.data_sinistre) throw new Error('Data del sinistre obligatòria');
        if (!sinistre.tipus) throw new Error('Tipus de sinistre obligatori');

        const { error } = await supabaseClient.from('agroseguro_sinistres').insert([sinistre]);
        if (error) throw error;

        mostrarNotificacio('✅ Sinistre registrat correctament', 'success');
        tancarModal('modal-nou-sinistre');
        tancarModal('modal-detall-polissa');
        await obrirModalPolissa(polissaId);

    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL EDITAR SINISTRE
// ============================================================

async function obrirModalEditarSinistre(sinistreId, polissaId) {
    try {
        const { data: sinistre, error } = await supabaseClient
            .from('agroseguro_sinistres')
            .select('*')
            .eq('id', sinistreId)
            .single();
        if (error) throw error;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-editar-sinistre';

        const tipusList = ['PEDRA', 'GELADA', 'SEQUERA', 'INUNDACIO', 'VENT', 'INCENDI', 'PLAGUES', 'ALTRES'];
        const tipusIcons = { PEDRA: '🌨️', GELADA: '❄️', SEQUERA: '🌵', INUNDACIO: '🌊', VENT: '💨', INCENDI: '🔥', PLAGUES: '🐛', ALTRES: '📋' };

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>✏️ Editar Sinistre — ${sinistre.num_expedient || formatData(sinistre.data_sinistre)}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-editar-sinistre')">✕</button>
                </div>
                <div class="modal-body">
                    <form id="form-editar-sinistre" onsubmit="guardarEdicionSinistre(event, '${sinistreId}', '${polissaId}')">
                        <fieldset>
                            <legend>📋 Dades del Sinistre</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Data Sinistre:</label>
                                    <input type="date" name="data_sinistre" value="${sinistre.data_sinistre || ''}" required>
                                </div>
                                <div class="form-group">
                                    <label>Tipus:</label>
                                    <select name="tipus" required>
                                        <option value="">- Selecciona -</option>
                                        ${tipusList.map(t => `<option value="${t}" ${sinistre.tipus === t ? 'selected' : ''}>${tipusIcons[t]} ${t}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Número Expedient:</label>
                                <input type="text" name="num_expedient" value="${sinistre.num_expedient || ''}">
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>🌱 Cultiu Afectat</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Cultiu:</label>
                                    <input type="text" name="cultiu" value="${sinistre.cultiu || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Varietat:</label>
                                    <input type="text" name="varietat" value="${sinistre.varietat || ''}">
                                </div>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>💥 Danys</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>% Dany:</label>
                                    <input type="number" name="percentatge_dany" step="0.1" min="0" max="100" value="${sinistre.percentatge_dany || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Producció Perduda (kg):</label>
                                    <input type="number" name="produccio_perduda_kg" step="0.01" min="0" value="${sinistre.produccio_perduda_kg || ''}">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Capital Danyat (€):</label>
                                <input type="number" name="capital_danyat" step="0.01" min="0" value="${sinistre.capital_danyat || ''}">
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>💰 Indemnització</legend>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Indemnització Rebuda (€):</label>
                                    <input type="number" name="indemnitzacio_rebuda" step="0.01" min="0" value="${sinistre.indemnitzacio_rebuda || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Data Cobrament:</label>
                                    <input type="date" name="data_cobrament" value="${sinistre.data_cobrament || ''}">
                                </div>
                            </div>
                        </fieldset>
                        <fieldset>
                            <legend>📝 Observacions</legend>
                            <div class="form-group">
                                <textarea name="observacions" rows="3">${sinistre.observacions || ''}</textarea>
                            </div>
                        </fieldset>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="tancarModal('modal-editar-sinistre')">Cancelar</button>
                    <button type="submit" form="form-editar-sinistre" class="btn btn-primary">✅ Guardar Canvis</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => { if (e.target === modal) tancarModal('modal-editar-sinistre'); });

    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// GUARDAR EDICIÓ SINISTRE
// ============================================================

async function guardarEdicionSinistre(event, sinistreId, polissaId) {
    event.preventDefault();
    try {
        const form = document.getElementById('form-editar-sinistre');
        const dades = new FormData(form);

        const actualitzacio = {
            data_sinistre: dades.get('data_sinistre') || null,
            tipus: dades.get('tipus') || null,
            num_expedient: dades.get('num_expedient') || null,
            cultiu: dades.get('cultiu') || null,
            varietat: dades.get('varietat') || null,
            percentatge_dany: parseFloat(dades.get('percentatge_dany')) || null,
            produccio_perduda_kg: parseFloat(dades.get('produccio_perduda_kg')) || null,
            capital_danyat: parseFloat(dades.get('capital_danyat')) || null,
            indemnitzacio_rebuda: parseFloat(dades.get('indemnitzacio_rebuda')) || null,
            data_cobrament: dades.get('data_cobrament') || null,
            observacions: dades.get('observacions') || null
        };

        const { error } = await supabaseClient
            .from('agroseguro_sinistres')
            .update(actualitzacio)
            .eq('id', sinistreId);
        if (error) throw error;

        mostrarNotificacio('✅ Sinistre actualitzat', 'success');
        tancarModal('modal-editar-sinistre');
        tancarModal('modal-detall-polissa');
        await obrirModalPolissa(polissaId);

    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// ELIMINAR SINISTRE
// ============================================================

async function eliminarSinistre(sinistreId, polissaId) {
    if (!confirm('Segur que vols eliminar aquest sinistre?')) return;
    try {
        const { error } = await supabaseClient.from('agroseguro_sinistres').delete().eq('id', sinistreId);
        if (error) throw error;
        mostrarNotificacio('✅ Sinistre eliminat', 'success');
        tancarModal('modal-detall-polissa');
        await obrirModalPolissa(polissaId);
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ============================================================
// FUNCIONS DE CÀRREGA DADES SUPABASE
// ============================================================

async function carregarParcelles(polissaId) {
    try {
        const { data, error } = await supabaseClient
            .from('agroseguro_parcelles')
            .select('*')
            .eq('polissa_id', polissaId)
            .order('num_par', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error carregant parcel·les:', error);
        return [];
    }
}

async function carregarSinistres(polissaId) {
    try {
        const { data, error } = await supabaseClient
            .from('agroseguro_sinistres')
            .select('*')
            .eq('polissa_id', polissaId)
            .order('data_sinistre', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error carregant sinistres:', error);
        return [];
    }
}

// ---- Carregar collita real associada a la pòlissa (per campanya + finca real) ----
// Vinculació: agroseguro_parcelles.parcella_id -> parcelles.id -> parcelles.finca (text)
// La finca resultant es compara amb collita_entrada.finca / collita_entrades_cereal.finca.
// Si la pòlissa és de línia CEREAL es consulta collita_entrades_cereal; en cas contrari collita_entrada (fruita).
async function carregarCollitaReal(polissa, parcelles) {
    const resultatBuit = { totalKg: 0, numAlbarans: 0, campanya: polissa.campanya, font: null, finques: [] };
    try {
        // 1. Resoldre les finques reals vinculades a la pòlissa via parcella_id
        const parcellaIds = (parcelles || [])
            .map(p => p.parcella_id)
            .filter(id => !!id);

        if (parcellaIds.length === 0) {
            // Cap parcel·la vinculada a una fitxa de parcel·les real -> no podem filtrar per finca
            return resultatBuit;
        }

        const { data: parcellesReals, error: errParcelles } = await supabaseClient
            .from('parcelles')
            .select('id, finca')
            .in('id', parcellaIds);
        if (errParcelles) throw errParcelles;

        const finques = [...new Set((parcellesReals || []).map(p => p.finca).filter(f => !!f))];
        if (finques.length === 0) {
            return resultatBuit;
        }

        const esCereal = (polissa.linia || '').toUpperCase() === 'CEREAL';

        if (esCereal) {
            const { data, error } = await supabaseClient
                .from('collita_entrades_cereal')
                .select('pes_net, finca')
                .eq('campanya', polissa.campanya)
                .eq('estat', 'actiu')
                .in('finca', finques);
            if (error) throw error;
            const totalKg = (data || []).reduce((s, r) => s + (parseFloat(r.pes_net) || 0), 0);
            return { totalKg, numAlbarans: (data || []).length, campanya: polissa.campanya, font: 'cereal', finques };
        } else {
            // Fruita: filtrem per any de la data (collita_entrada no té camp "campanya")
            const dataInici = `${polissa.campanya}-01-01`;
            const dataFi = `${polissa.campanya}-12-31`;
            const { data, error } = await supabaseClient
                .from('collita_entrada')
                .select('pes_net, finca')
                .gte('data', dataInici)
                .lte('data', dataFi)
                .eq('estat', 'actiu')
                .in('finca', finques);
            if (error) throw error;
            const totalKg = (data || []).reduce((s, r) => s + (parseFloat(r.pes_net) || 0), 0);
            return { totalKg, numAlbarans: (data || []).length, campanya: polissa.campanya, font: 'fruita', finques };
        }
    } catch (error) {
        console.error('Error carregant collita real:', error);
        return resultatBuit;
    }
}

// ============================================================
// HELPERS FORMAT
// ============================================================

function formatEuros(valor) {
    if (!valor && valor !== 0) return '—';
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(valor);
}

function formatKg(valor) {
    if (!valor && valor !== 0) return '—';
    return new Intl.NumberFormat('ca-ES', { maximumFractionDigits: 0 }).format(valor) + ' kg';
}

function formatData(data) {
    if (!data) return '—';
    return new Date(data).toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function diesRestants(dataVenciment) {
    if (!dataVenciment) return '—';
    const avui = new Date();
    const venc = new Date(dataVenciment);
    const dies = Math.ceil((venc - avui) / (1000 * 60 * 60 * 24));
    if (dies < 0) return `<span class="text-danger">Vençuda fa ${Math.abs(dies)} dies</span>`;
    if (dies < 30) return `<span class="text-warning">${dies} dies</span>`;
    return `<span class="text-success">${dies} dies</span>`;
}

// ============================================================
// CSS ADDICIONAL — Injectar si no existeix agroseguro-styles.css
// ============================================================

(function injectarEstilsAvancats() {
    if (document.getElementById('agroseguro-v2-styles')) return;
    const style = document.createElement('style');
    style.id = 'agroseguro-v2-styles';
    style.textContent = `
        /* ---- Modal XL ---- */
        /* Especificitat alta + !important per superar el fix global
           .modal-overlay .modal-content {max-height:85vh; overflow-y:auto}
           d'assegurances-fixes_v1.js, que si no quedaria com a scroll únic
           i tapava la capçalera/tabs en fer scroll dins la taula. */
        .modal-overlay .modal-content.modal-content-xl {
            max-width: 1000px !important;
            width: 95vw !important;
            max-height: 90vh !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
        }
        .modal-content-xl .modal-header {
            flex-shrink: 0;
        }
        .modal-content-xl .detall-tabs {
            flex-shrink: 0;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        .modal-overlay .modal-content-xl .modal-body {
            flex: 1 1 auto !important;
            overflow-y: auto !important;
            min-height: 0;
        }
        .modal-content-xl .modal-footer {
            flex-shrink: 0;
        }

        /* ---- Tabs detall ---- */
        .detall-tabs {
            display: flex;
            gap: 4px;
            padding: 0 20px;
            background: var(--gris-clar, #f5f5f5);
            border-bottom: 2px solid #ddd;
        }
        .tab-btn {
            padding: 10px 16px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            color: #666;
            border-bottom: 3px solid transparent;
            margin-bottom: -2px;
            transition: all 0.2s;
        }
        .tab-btn:hover { color: var(--verde-principal, #2d5016); }
        .tab-btn.tab-actiu {
            color: var(--verde-principal, #2d5016);
            border-bottom-color: var(--verde-principal, #2d5016);
            font-weight: 700;
        }
        .tab-badge {
            background: #e74c3c;
            color: white;
            border-radius: 10px;
            padding: 1px 6px;
            font-size: 11px;
            margin-left: 4px;
        }
        .tab-content { display: block; }

        /* ---- Resum grid ---- */
        .resum-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }
        .resum-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 14px;
        }
        .resum-card h4 {
            margin: 0 0 10px 0;
            font-size: 13px;
            font-weight: 700;
            color: var(--verde-principal, #2d5016);
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 6px;
        }
        .resum-card-wide { grid-column: 1 / -1; }

        /* ---- Dades taula ---- */
        .dades-taula { width: 100%; border-collapse: collapse; font-size: 13px; }
        .dades-taula td { padding: 4px 6px; }
        .dades-taula td:first-child { color: #666; width: 50%; }
        .dades-taula td:last-child { font-weight: 500; }

        /* ---- KPIs ---- */
        .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .kpi-grid-4 { grid-template-columns: repeat(4, 1fr); }
        .kpi-item { text-align: center; padding: 10px; background: white; border-radius: 6px; border: 1px solid #e9ecef; }
        .kpi-valor { display: block; font-size: 18px; font-weight: 700; color: var(--verde-principal, #2d5016); }
        .kpi-label { display: block; font-size: 11px; color: #888; margin-top: 2px; }

        /* ---- Toolbar seccions ---- */
        .seccio-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
        }
        .seccio-toolbar h3 { margin: 0; font-size: 15px; }

        /* ---- Taula dades ---- */
        .taula-dades { width: 100%; border-collapse: collapse; font-size: 13px; }
        .taula-dades th { background: var(--verde-principal, #2d5016); color: white; padding: 8px 10px; text-align: left; font-size: 12px; }
        .taula-dades td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
        .taula-dades tr:hover td { background: #f8fff4; }
        .taula-totals td { background: #f0f7e8 !important; font-weight: 700; border-top: 2px solid var(--verde-principal, #2d5016); }
        .text-right { text-align: right; }
        .text-success { color: #27ae60; }
        .text-warning { color: #e67e22; }
        .text-danger { color: #e74c3c; }
        .text-muted { color: #aaa; font-size: 11px; }
        .table-responsive { overflow-x: auto; }

        /* ---- Badges ---- */
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #e9ecef; margin-right: 4px; }
        .badge-principal { background: #d4edda; color: #155724; }
        .badge-complementaria { background: #fff3cd; color: #856404; }
        .badge-tipus-sinistre { background: #fce8e8; color: #9b2335; }
        .badge-estat-cobrat { background: #d4edda; color: #155724; }
        .badge-estat-pendent { background: #fff3cd; color: #856404; }

        /* ---- Botons ---- */
        .btn-sm { padding: 5px 12px; font-size: 12px; }
        .btn-warning { background: #e67e22; color: white; border: none; border-radius: 4px; padding: 8px 16px; cursor: pointer; }
        .btn-warning:hover { background: #d35400; }
        .btn-icon { background: none; border: none; cursor: pointer; padding: 2px 5px; font-size: 14px; border-radius: 4px; }
        .btn-icon:hover { background: #eee; }
        .btn-icon-danger:hover { background: #ffe0e0; }

        /* ---- Buit ---- */
        .buit-msg { text-align: center; padding: 40px 20px; color: #888; font-style: italic; }

        /* ---- Mini barra ---- */
        .mini-barra-wrapper { display: flex; align-items: center; gap: 6px; }
        .mini-barra { height: 8px; background: var(--verde-principal, #2d5016); border-radius: 4px; min-width: 2px; opacity: 0.6; }

        /* ---- Estimació ---- */
        .estimacio-wrapper h3, .estimacio-wrapper h4 { color: var(--verde-principal, #2d5016); margin-bottom: 12px; }
        .escenaris-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 16px 0; }
        .escenari-card { border-radius: 8px; padding: 12px; text-align: center; border: 1px solid rgba(0,0,0,0.1); }
        .escenari-nom { font-weight: 700; font-size: 12px; margin-bottom: 6px; }
        .escenari-factor { font-size: 11px; color: #666; margin-bottom: 8px; }
        .escenari-prod { font-size: 16px; font-weight: 700; }
        .escenari-valor { font-size: 13px; color: #444; margin-top: 4px; }
        .escenari-label { font-size: 10px; color: #888; margin-top: 2px; }
        .escenari-dolent { background: #ffeaea; border-color: #e74c3c; }
        .escenari-normal-baix { background: #fff8e1; border-color: #f0ad4e; }
        .escenari-normal { background: #e8f5e9; border-color: #4caf50; }
        .escenari-bo { background: #e3f2fd; border-color: #2196f3; }
        .escenari-excel { background: #f3e5f5; border-color: #9c27b0; }

        .nota-info { background: #e8f4f8; border-left: 3px solid #3498db; padding: 10px 14px; border-radius: 4px; font-size: 12px; color: #555; margin-top: 14px; }

        /* ---- Simulació ---- */
        .simulacio-wrapper h3, .comparativa-wrapper h4 { color: var(--verde-principal, #2d5016); }
        .simulacio-desc { color: #666; font-size: 13px; margin-bottom: 16px; }
        .simulacio-form { background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
        .simulacio-resultats { margin-bottom: 20px; }
        .res-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .res-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 14px; text-align: center; }
        .res-label { display: block; font-size: 11px; color: #888; margin-bottom: 6px; }
        .res-valor { display: block; font-size: 17px; font-weight: 700; }
        .res-sub { display: block; font-size: 10px; color: #aaa; margin-top: 4px; }
        .res-highlight { border-color: var(--verde-principal, #2d5016); border-width: 2px; }
        .res-highlight-green { border-color: #27ae60; border-width: 2px; }
        .res-highlight-blue { border-color: #2980b9; border-width: 2px; }
        .res-highlight-warning { border-color: #e67e22; border-width: 2px; }

        .observacions-text { font-size: 13px; color: #555; line-height: 1.5; margin: 0; }

        input[type="range"] { width: 100%; }
    `;
    document.head.appendChild(style);
})();

console.log('✅ Agroseguro Modals v2 (Fase Avançada) carregat');