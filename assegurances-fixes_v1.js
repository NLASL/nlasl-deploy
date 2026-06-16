// ============================================================
// ASSEGURANCES FIXES v1
// Sobreescriu TOTS els placeholders de assegurances-unificat_v2-FINAL.js
// Ha de carregar-se ÚLTIM de tots els mòduls
// ============================================================

// ── AGROSEGURO — DETALL PÒLISSA ─────────────────────────────

async function obrirModalPolissa(polissaId) {
    try {
        const existent = document.getElementById('modal-detall-agroseguro');
        if (existent) existent.remove();

        const { data: polissa, error } = await supabaseClient
            .from('agroseguro_polisses')
            .select('*')
            .eq('id', polissaId)
            .single();
        if (error) throw error;

        const parcelles = await getParcellesAgroseguro(polissaId);
        const sinistres = await getSinistresAgroseguro(polissaId);

        const capital = (polissa.capital_assegurat_total || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
        const primaNeta = (polissa.prima_neta || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
        const primaTotal = (polissa.prima_total || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });

        const filesParcelles = parcelles.length > 0
            ? parcelles.map(p => `
                <tr>
                    <td>${p.num_par || '—'}</td>
                    <td>${p.poligon || '—'}</td>
                    <td>${p.parcella || '—'}</td>
                    <td>${p.cultiu || '—'}</td>
                    <td style="text-align:right;">${(p.superficie || 0).toFixed(2)} ha</td>
                    <td style="text-align:right;">${((p.capital_assegurat || 0)).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' })}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="6" style="text-align:center;color:#888;padding:12px;">Sense parcel·les</td></tr>`;

        const filesSinistres = sinistres.length > 0
            ? sinistres.map(s => `
                <tr>
                    <td>${formatData(s.data_sinistre)}</td>
                    <td>${s.tipus_sinistre || '—'}</td>
                    <td>${s.num_expedient || '—'}</td>
                    <td>${s.estat || '—'}</td>
                    <td style="text-align:right;">${((s.indemnitzacio || 0)).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' })}</td>
                </tr>
            `).join('')
            : `<tr><td colspan="5" style="text-align:center;color:#888;padding:12px;">Sense sinistres</td></tr>`;

        const modal = document.createElement('div');
        modal.id = 'modal-detall-agroseguro';
        modal.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;
            background:rgba(0,0,0,0.6);z-index:99999;
            display:flex;align-items:flex-start;justify-content:center;
            padding-top:30px;overflow-y:auto;
        `;

        modal.innerHTML = `
            <div style="position:relative;z-index:100000;background:white;border-radius:8px;
                box-shadow:0 10px 40px rgba(0,0,0,0.3);width:100%;max-width:800px;
                max-height:88vh;overflow-y:auto;margin-bottom:30px;">

                <div class="modal-header">
                    <h2>🌾 Agroseguro — ${polissa.num_polissa}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-detall-agroseguro')">✕</button>
                </div>

                <div class="modal-body" style="padding:16px;">

                    <!-- DADES PÒLISSA -->
                    <fieldset>
                        <legend>📋 Dades Pòlissa</legend>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;">
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Nº Pòlissa</span><br><strong style="font-family:monospace;">${polissa.num_polissa}</strong></div>
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Ref. Col·lectiu</span><br>${polissa.ref_collectiu || '—'}</div>
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Campanya</span><br>${polissa.campanya}</div>
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Línia</span><br>${polissa.linia || '—'}</div>
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Categoria</span><br>${polissa.categoria || '—'}</div>
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Estat</span><br>${polissa.estat || '—'}</div>
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Data Vigor</span><br>${formatData(polissa.data_vigor)}</div>
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Data Venciment</span><br>${formatData(polissa.data_venciment)}</div>
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Capital Assegurat</span><br><strong>${capital}</strong></div>
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Prima Neta</span><br>${primaNeta}</div>
                            <div><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Prima Total</span><br><strong>${primaTotal}</strong></div>
                            ${polissa.observacions ? `<div style="grid-column:1/-1;"><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:#888;">Observacions</span><br>${polissa.observacions}</div>` : ''}
                        </div>
                        <div style="margin-top:10px;display:flex;gap:8px;">
                            <button class="btn btn-secondary btn-sm" onclick="tancarModal('modal-detall-agroseguro');obrirModalEditarPolissa('${polissaId}')">✏️ Editar</button>
                            <button class="btn btn-danger btn-sm" onclick="eliminarPolissaConfirm('${polissaId}')">🗑️ Eliminar</button>
                        </div>
                    </fieldset>

                    <!-- PARCEL·LES -->
                    <fieldset style="margin-top:12px;">
                        <legend>🗺️ Parcel·les (${parcelles.length})</legend>
                        <div style="overflow-x:auto;">
                            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                                <thead>
                                    <tr style="background:#f5f5f5;">
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:left;">Nº Par.</th>
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:left;">Polígon</th>
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:left;">Parcel·la</th>
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:left;">Cultiu</th>
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:right;">Superfície</th>
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:right;">Capital</th>
                                    </tr>
                                </thead>
                                <tbody>${filesParcelles}</tbody>
                            </table>
                        </div>
                    </fieldset>

                    <!-- SINISTRES -->
                    <fieldset style="margin-top:12px;">
                        <legend>⚠️ Sinistres (${sinistres.length})</legend>
                        <div style="overflow-x:auto;">
                            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                                <thead>
                                    <tr style="background:#f5f5f5;">
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:left;">Data</th>
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:left;">Tipus</th>
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:left;">Nº Expedient</th>
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:left;">Estat</th>
                                        <th style="padding:6px;border-bottom:2px solid #ddd;text-align:right;">Indemnització</th>
                                    </tr>
                                </thead>
                                <tbody>${filesSinistres}</tbody>
                            </table>
                        </div>
                    </fieldset>

                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="tancarModal('modal-detall-agroseguro')">Tancar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.addEventListener('click', e => {
            if (e.target === modal) tancarModal('modal-detall-agroseguro');
        });

    } catch (error) {
        console.error('Error detall agroseguro:', error);
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

// ── ALTRES ASSEGURANCES ─────────────────────────────────────
function obrirModalNovaAsseguranca()     { obrirModalNovaU('altres'); }
function obrirModalDetallAsseguranca(id) { obrirModalDetallU(id); }
function obrirModalEditarAsseguranca(id) { obrirEditorCapcaleraU(id); }

// ── RESPONSABILITAT CIVIL ───────────────────────────────────
function obrirModalNovaCivil()           { obrirModalNovaU('civil'); }
function obrirModalDetallCivil(id)       { obrirModalDetallU(id); }
function obrirModalEditarCivil(id)       { obrirEditorCapcaleraU(id); }

// ── VISTES ──────────────────────────────────────────────────
async function getAssegurancesCivil() {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .select('*')
        .eq('categoria', 'civil')
        .order('data_venciment', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function mostrarVistaCivil() {
    await mostrarVistaLlistatU('civil', 'civil-view');
}

async function mostrarVistaAltresAsseg() {
    await mostrarVistaLlistatU('altres', 'altres-asseg-view');
}

console.log('✅ Assegurances Fixes v1 carregat');