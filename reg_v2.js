// ============================================================
// REG v2 - Mòdul de gestió de reg amb fases fenològiques
// Substitueix la funció carregarVistaReg() d'app_v8.js
// Fitxer a afegir a index.html ABANS de existencies.v1.js
// ============================================================

// ============================================================
// VISTA PRINCIPAL REG
// ============================================================

async function carregarVistaReg() {
    const container = document.getElementById('view-container');

    let html = '<div class="view-reg">';

    // Capçalera
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">';
    html += '<h2>💧 Reg — Consums</h2>';
    html += '<div style="display:flex;gap:8px;">';
    html += '<button class="btn btn-secondary" onclick="obrirModalRegManual()">➕ Nou Registre</button>';
    html += '<button class="btn btn-primary" onclick="document.getElementById(\'input-excel-reg\').click()">📥 Importar Excel</button>';
    html += '<input type="file" id="input-excel-reg" accept=".xlsx,.xls,.csv" style="display:none;" onchange="importarExcelReg(event)">';
    html += '<button class="btn btn-secondary" onclick="mostrarRecomanacionsReg()" style="background:#9c27b0;">🌡️ Recomanacions</button>';
    html += '</div></div>';

    // Bloc alertes fenològiques (es carrega async)
    html += '<div id="reg-alertes-fenologiques" style="margin-bottom:20px;"></div>';

    html += '<div style="background:#e3f2fd;padding:12px;border-radius:8px;margin-bottom:20px;font-size:13px;">';
    html += '📋 Format Excel esperat: <strong>EXPLOTACIÓ | DATA | CONSUM (m³)</strong>';
    html += '</div>';

    // Filtres
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:20px;">';
    html += '<div><label>Any</label><select id="reg-filtre-any" onchange="carregarTaulaReg()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">';
    const anyActual = new Date().getFullYear();
    for (let a = anyActual; a >= anyActual - 3; a--) {
        html += '<option value="' + a + '">' + a + '</option>';
    }
    html += '</select></div>';

    html += '<div><label>Mes</label><select id="reg-filtre-mes" onchange="carregarTaulaReg()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;">';
    html += '<option value="">Tots</option>';
    const mesos = ['Gener','Febrer','Març','Abril','Maig','Juny','Juliol','Agost','Setembre','Octubre','Novembre','Desembre'];
    mesos.forEach(function(m, i) {
        html += '<option value="' + String(i + 1).padStart(2, '0') + '">' + m + '</option>';
    });
    html += '</select></div>';

    html += '<div><label>Explotació</label><select id="reg-filtre-explotacio" onchange="carregarTaulaReg()" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;"><option value="">Totes</option></select></div>';
    html += '</div>';

    // Resum i taula
    html += '<div id="resum-reg" style="margin-bottom:20px;"></div>';
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead id="thead-reg"><tr><th>Mes</th><th>Explotació</th><th>Finca</th><th>Total m³</th><th>Dies amb consum</th><th>Fase</th><th>Detall</th></tr></thead>';
    html += '<tbody id="tbody-reg"><tr><td colspan="7">Carregant...</td></tr></tbody>';
    html += '</table></div>';
    html += '<div id="reg-recomanacions" style="display:none;margin-top:20px;"></div>';
    html += '</div>';

    container.innerHTML = html;

    // Carregar en paral·lel
    // Carregar reg_configuracio en cache global per usar a tota la vista
    try {
        const { data: regConf } = await supabaseClient.from('reg_configuracio').select('*').eq('actiu', true);
        window._regConfiguracio = regConf || [];
    } catch(e) { window._regConfiguracio = []; }

    await carregarFiltreExplotacions();
    await Promise.all([
        carregarTaulaReg(),
        carregarAlertesReg()
    ]);
}

// ============================================================
// BLOC RECOMANACIONS DE REG (totes les explotacions)
// ============================================================

async function carregarAlertesReg() {
    const container = document.getElementById('reg-alertes-fenologiques');
    if (!container) return;

    try {
       const ts = Date.now();
	   const { data, error } = await supabaseClient
		.from('reg_factor_explotacio')
		.select('*')
		.order('factor_reg', { ascending: true })
		.gte('avui', '2000-01-01'); // forçar nova petició HTTP
		
		console.log('carregarAlertesReg rep:', data?.map(d => d.finca + ' → ' + d.fase));

        if (error) {
            console.warn('Vista reg_factor_explotacio no disponible:', error.message);
            container.innerHTML = '';
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '';
            return;
        }

        const colorPerFase = {
            'collita':     '#f44336',
            'precollita':  '#ff9800',
            'postcollita': '#9c27b0',
            'creixement':  '#4caf50'
        };

        const badgePerFase = {
            'collita':     '🍑 Collita',
            'precollita':  '⚠️ Precollita',
            'postcollita': '🍂 Postcollita',
            'creixement':  '🌱 Creixement'
        };

        const nomCultiu = {
			'albercoc':      'Albercoc',
			'pressec_juny':  'Préssec Pla (juny)',
			'pressec_agost': 'Préssec Pla (agost)'
};

        let html = '<div style="font-weight:600;color:#333;margin-bottom:10px;">💧 Recomanacions de reg per fase fenològica</div>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:10px;">';

        data.forEach(function(f) {
            const color   = colorPerFase[f.fase] || '#4caf50';
            const nomFase = badgePerFase[f.fase]  || f.fase;
            const cultiu  = nomCultiu[f.cultiu]   || f.cultiu;
            const supHa   = parseFloat(f.superficie_ha) || 0;

            let infoExtra = '';
            if (f.fase === 'precollita') {
                const diesCollita = parseInt(f.dies_per_collita) || 0;
                infoExtra = '<div style="font-size:12px;color:#e65100;margin-top:4px;font-weight:500;">⏳ Collita en ' + diesCollita + ' dies — no augmentar dosi!</div>';
            } else if (f.fase === 'creixement' && f.dies_per_precollita !== null) {
                const diesPre = parseInt(f.dies_per_precollita) || 0;
                if (diesPre <= 30) {
                    infoExtra = '<div style="font-size:12px;color:#f57c00;margin-top:4px;">🔔 Precollita en ' + diesPre + ' dies</div>';
                }
            } else if (f.fase === 'collita') {
                infoExtra = '<div style="font-size:12px;color:#b71c1c;margin-top:4px;font-weight:500;">🚫 No augmentar reg ni nitrats</div>';
            }

            html += '<div style="background:white;border-left:4px solid ' + color + ';border-radius:8px;padding:14px 16px;box-shadow:0 2px 6px rgba(0,0,0,0.08);">';

            html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">';
            html += '<div>';
            html += '<div style="font-weight:700;color:#222;font-size:14px;">' + f.finca + '</div>';
            html += '<div style="font-size:12px;color:#888;margin-top:2px;">' + cultiu + ' · ' + supHa.toFixed(2) + ' Ha</div>';
            html += '</div>';
            html += '<span style="background:' + color + ';color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:700;white-space:nowrap;">' + nomFase + '</span>';
            html += '</div>';

            html += '<div style="display:flex;align-items:center;gap:16px;">';
            html += '<div style="text-align:center;background:' + color + '18;border-radius:8px;padding:8px 14px;">';
            html += '<div style="font-size:26px;font-weight:800;color:' + color + ';">×' + f.factor_reg.toFixed(2) + '</div>';
            html += '<div style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">factor reg</div>';
            html += '</div>';
            html += '<div style="flex:1;font-size:12px;color:#555;">';
            html += '<div>📅 Collita: <strong>' + formatData(f.data_inici_collita) + ' – ' + formatData(f.data_fi_collita) + '</strong></div>';
            html += '<div style="margin-top:3px;">🔔 Precollita des de: <strong>' + formatData(f.data_inici_precollita) + '</strong></div>';
            html += infoExtra;
            html += '</div>';
            html += '</div>';

            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.warn('Error carregant recomanacions reg:', error.message);
        container.innerHTML = '';
    }
}

// ============================================================
// CARREGAR TAULA REG MENSUAL (amb columna Fase)
// ============================================================

async function carregarFiltreExplotacions() {
    const select = document.getElementById('reg-filtre-explotacio');
    if (!select) return;

    const { data, error } = await supabaseClient
        .from('reg_configuracio')
        .select('num_explotacio, nom_finca')
        .eq('actiu', true)
        .order('num_explotacio');

    if (error) {
        console.warn('Error carregant explotacions:', error.message);
        return;
    }

    select.innerHTML = '<option value="">Totes</option>';
    (data || []).forEach(function(e) {
        select.innerHTML += '<option value="' + e.num_explotacio + '">' + e.num_explotacio + ' — ' + e.nom_finca + '</option>';
    });
}

async function carregarTaulaReg() {
    const tbody = document.getElementById('tbody-reg');
    if (!tbody) return;

    const any        = parseInt(document.getElementById('reg-filtre-any')?.value) || null;
    const mes        = parseInt(document.getElementById('reg-filtre-mes')?.value) || null;
    const explotacio = document.getElementById('reg-filtre-explotacio')?.value || null;

    try {
        // Dades de consum
        const { data: dades, error } = await supabaseClient
            .rpc('resum_reg_mensual', {
                p_any:        any,
                p_mes:        mes,
                p_explotacio: explotacio
            });
        if (error) throw error;

        const registres = dades || [];

        if (registres.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hi ha registres</td></tr>';
            document.getElementById('resum-reg').innerHTML = '';
            return;
        }

        // Dades fenològiques (pot fallar si la vista no existeix)
        let fasePerExplotacio = {};
        try {
            const { data: fases } = await supabaseClient
                .from('reg_factor_explotacio')
                .select('num_explotacio, fase, factor_reg, alerta_reg');
            if (fases) {
                fases.forEach(function(f) {
                    fasePerExplotacio[f.num_explotacio] = f;
                });
            }
        } catch (e) {
            // Vista no disponible, continuar sense fases
        }

        // Resum total
        const totalM3 = registres.reduce(function(sum, r) { return sum + (parseFloat(r.total_m3) || 0); }, 0);
        document.getElementById('resum-reg').innerHTML =
            '<div style="background:#e3f2fd;padding:12px;border-radius:8px;display:inline-block;">' +
            '💧 Total consum: <strong>' + totalM3.toFixed(2) + ' m³</strong>' +
            '</div>';

        tbody.innerHTML = registres.map(function(r) {
            // Buscar nom finca a reg_configuracio (font principal) o parcelles (fallback)
            const confFinca = (window._regConfiguracio || []).find(function(rc) { return rc.num_explotacio === r.num_explotacio; });
            const parcella  = !confFinca ? parcelles.find(function(p) { return p.num_explotacio === r.num_explotacio; }) : null;
            const nomFinca  = confFinca ? confFinca.nom_finca : (parcella ? parcella.finca : r.num_explotacio);
            const data    = new Date(r.mes);
            const mesNom  = data.toLocaleString('ca-ES', { month: 'long', year: 'numeric' });

            // Badge de fase — només per al mes actual
            const avui = new Date();
            const esMesActual = data.getFullYear() === avui.getFullYear() &&
                                data.getMonth()    === avui.getMonth();
            const faseInfo = fasePerExplotacio[r.num_explotacio];
            let faseBadge = '-';
            if (faseInfo && esMesActual) {
                const colorFactor = faseInfo.factor_reg <= 0.35 ? '#9c27b0'
								  : faseInfo.factor_reg <= 0.50 ? '#f44336'
								  : faseInfo.factor_reg <= 0.75 ? '#ff9800'
								  : '#4caf50';
                const nomFase = {
                    'collita':     '🍑 Collita',
                    'precollita':  '⚠️ Precollita',
                    'postcollita': '🍂 Postcollita',
                    'creixement':  '🌱 Creixement'
                }[faseInfo.fase] || faseInfo.fase;

                faseBadge = '<span style="background:' + colorFactor + ';color:white;padding:3px 8px;border-radius:10px;font-size:11px;white-space:nowrap;">' +
                            nomFase + ' ×' + faseInfo.factor_reg.toFixed(2) + '</span>';
            }

            return '<tr>' +
                '<td><strong>' + mesNom + '</strong></td>' +
                '<td>' + r.num_explotacio + '</td>' +
                '<td>' + nomFinca + '</td>' +
                '<td><strong>' + parseFloat(r.total_m3).toFixed(2) + ' m³</strong></td>' +
                '<td>' + r.dies_amb_consum + ' / ' + r.dies_totals + ' dies</td>' +
                '<td>' + faseBadge + '</td>' +
                '<td><button class="btn btn-sm btn-primary" onclick="veurDetallReg(\'' + r.num_explotacio + '\',\'' + r.mes + '\')">👁️</button>' +
                (hasPermission('delete') ? ' <button class="btn btn-sm btn-danger" onclick="eliminarRegMes(\'' + r.num_explotacio + '\',\'' + r.mes + '\')">🗑️</button>' : '') +
                '</td>' +
                '</tr>';
        }).join('');

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7">Error: ' + error.message + '</td></tr>';
    }
}

// ============================================================
// DETALL REG (amb gràfic de barres simple i fase del dia)
// ============================================================

async function veurDetallReg(numExplotacio, mes) {
    const dataInici  = mes.split('T')[0].substring(0, 7) + '-01';
    const ultimDia   = new Date(new Date(mes).getFullYear(), new Date(mes).getMonth() + 1, 0).getDate();
    const dataFi     = mes.split('T')[0].substring(0, 7) + '-' + String(ultimDia).padStart(2, '0');

    const { data, error } = await supabaseClient
        .from('reg')
        .select('*')
        .eq('num_explotacio', numExplotacio)
        .gte('data', dataInici)
        .lte('data', dataFi)
        .order('data');

    if (error) { mostrarNotificacio('Error: ' + error.message, 'error'); return; }

    const parcella = parcelles.find(function(p) { return p.num_explotacio === numExplotacio; });
    const nomFinca = parcella ? parcella.finca : numExplotacio;

    // Dades fenològiques actuals
    let infoFase = null;
    try {
        const { data: fases } = await supabaseClient
            .from('reg_factor_explotacio')
            .select('*')
            .eq('num_explotacio', numExplotacio)
            .single();
        infoFase = fases;
    } catch (e) { /* opcional */ }

    const totalM3 = data.reduce(function(s, r) { return s + (parseFloat(r.consum_m3) || 0); }, 0);
    const maxM3   = Math.max(...data.map(function(r) { return parseFloat(r.consum_m3) || 0; }));

    let html = '<div id="modal-detall-reg" class="modal" style="display:block;">';
    html += '<div class="modal-content" style="max-width:650px;">';
    html += '<span class="close" onclick="document.getElementById(\'modal-detall-reg\').remove()">&times;</span>';
    html += '<h2>💧 Detall Reg — ' + nomFinca + '</h2>';
    html += '<p style="color:#999;">' + numExplotacio + ' — ' + new Date(mes).toLocaleString('ca-ES', { month: 'long', year: 'numeric' }) + '</p>';

    // Bloc fase fenològica
    if (infoFase) {
        const colorFactor = infoFase.factor_reg <= 0.35 ? '#9c27b0'
						  : infoFase.factor_reg <= 0.50 ? '#f44336'
						  : infoFase.factor_reg <= 0.75 ? '#ff9800'
						  : '#4caf50';
        html += '<div style="background:' + colorFactor + '15;border-left:4px solid ' + colorFactor + ';padding:12px;border-radius:6px;margin-bottom:16px;">';
        html += '<strong style="color:' + colorFactor + ';">' + infoFase.alerta_reg + '</strong><br>';
        html += '<span style="font-size:12px;color:#666;">Collita prevista: ' +
                (infoFase.data_inici_collita ? formatData(infoFase.data_inici_collita) : '-') +
                ' — ' + (infoFase.data_fi_collita ? formatData(infoFase.data_fi_collita) : '-') + '</span>';
        html += '</div>';
    }

    html += '<div style="margin-bottom:12px;"><strong>Total: ' + totalM3.toFixed(2) + ' m³</strong></div>';

    // Gràfic de barres simple
    html += '<div style="overflow-x:auto;">';
    html += '<table class="data-table"><thead><tr><th>Data</th><th>Consum (m³)</th><th></th></tr></thead><tbody>';

    data.forEach(function(r) {
        const consum  = parseFloat(r.consum_m3) || 0;
        const pct     = maxM3 > 0 ? (consum / maxM3 * 100) : 0;
        const color   = consum > 0 ? '#2196f3' : '#f5f5f5';
        const estil   = consum > 0 ? 'font-weight:bold;' : 'color:#ccc;';

        html += '<tr style="' + estil + '">';
        html += '<td>' + formatData(r.data) + '</td>';
        html += '<td style="text-align:right;">' + (consum > 0 ? consum.toFixed(2) : '-') + '</td>';
        html += '<td style="width:150px;"><div style="background:' + color + ';height:10px;border-radius:3px;width:' + pct.toFixed(0) + '%;min-width:' + (consum > 0 ? 2 : 0) + 'px;"></div></td>';
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

// ============================================================
// ELIMINAR MES COMPLET (funció nova)
// ============================================================

async function eliminarRegMes(numExplotacio, mes) {
    const mesText = new Date(mes).toLocaleString('ca-ES', { month: 'long', year: 'numeric' });
    if (!confirm('Segur que vols eliminar tots els registres de ' + numExplotacio + ' del mes de ' + mesText + '?')) return;

    const dataInici = mes.split('T')[0].substring(0, 7) + '-01';
    const ultimDia  = new Date(new Date(mes).getFullYear(), new Date(mes).getMonth() + 1, 0).getDate();
    const dataFi    = mes.split('T')[0].substring(0, 7) + '-' + String(ultimDia).padStart(2, '0');

    try {
        const { error } = await supabaseClient.from('reg')
            .delete()
            .eq('num_explotacio', numExplotacio)
            .gte('data', dataInici)
            .lte('data', dataFi);
        if (error) throw error;
        mostrarNotificacio('✅ Registres eliminats', 'success');
        await carregarTaulaReg();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// MODAL REG MANUAL (igual que la versió anterior)
// ============================================================

function obrirModalRegManual() {
    let modal = document.getElementById('modal-reg-manual');
    if (!modal) {
        const div = document.createElement('div');
        div.innerHTML =
            '<div id="modal-reg-manual" class="modal" style="display:none;">' +
            '<div class="modal-content" style="max-width:450px;">' +
            '<span class="close" onclick="tancarModal(\'modal-reg-manual\')">&times;</span>' +
            '<h2>➕ Nou Registre Reg</h2>' +
            '<form id="form-reg-manual" onsubmit="guardarRegManual(event)">' +
            '<div class="form-group"><label>Explotació *</label>' +
            '<select id="reg-manual-explotacio" required>' +
            '<option value="">Seleccionar...</option>' +
            (function() {
                const vistes = {};
                parcelles.filter(function(p) { return p.num_explotacio; }).forEach(function(p) {
                    if (!vistes[p.num_explotacio]) vistes[p.num_explotacio] = p.finca || p.num_explotacio;
                });
                return Object.keys(vistes).sort().map(function(e) {
                    return '<option value="' + e + '">' + e + ' — ' + vistes[e] + '</option>';
                }).join('');
            })() +
            '</select></div>' +
            '<div class="form-group"><label>Data *</label><input type="date" id="reg-manual-data" required value="' + new Date().toISOString().split('T')[0] + '"></div>' +
            '<div class="form-group"><label>Consum (m³) *</label><input type="number" id="reg-manual-consum" required min="0" step="0.01"></div>' +
            '<div class="form-actions">' +
            '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-reg-manual\')">Cancel·lar</button>' +
            '<button type="submit" class="btn btn-primary">Guardar</button>' +
            '</div></form></div></div>';
        document.body.appendChild(div.firstElementChild);
        modal = document.getElementById('modal-reg-manual');
    }
    modal.style.display = 'block';
}

async function guardarRegManual(event) {
    event.preventDefault();
    const dades = {
        num_explotacio: document.getElementById('reg-manual-explotacio').value,
        data:           document.getElementById('reg-manual-data').value,
        consum_m3:      parseFloat(document.getElementById('reg-manual-consum').value),
        creat_per:      currentUser ? currentUser.id : null
    };
    try {
        const { error } = await supabaseClient.from('reg').insert([dades]);
        if (error) throw error;
        mostrarNotificacio('✅ Registre afegit correctament', 'success');
        tancarModal('modal-reg-manual');
        await carregarTaulaReg();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// IMPORTACIÓ EXCEL (idèntica a la versió anterior)
// ============================================================

async function importarExcelReg(event) {
    const fitxer = event.target.files[0];
    if (!fitxer) return;

    mostrarNotificacio('📥 Llegint fitxer...', 'info');

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const sheet    = workbook.Sheets[workbook.SheetNames[0]];

            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:C1000');
            range.e.r   = 10000;
            sheet['!ref'] = XLSX.utils.encode_range(range);

            const files = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });

            const registres = [];
            for (let i = 1; i < files.length; i++) {
                const fila = files[i];
                if (!fila || fila.length < 3) continue;

                const numExplotacio = String(fila[0] || '').trim();
                let data            = fila[1];
                const consumM3      = parseFloat(fila[2]) || 0;

                if (!numExplotacio || !data) continue;

                if (data instanceof Date) {
                    data = data.toISOString().split('T')[0];
                } else if (typeof data === 'string') {
                    const parts = data.split('/');
                    if (parts.length === 3) {
                        data = parts[2] + '-' + parts[1].padStart(2, '0') + '-' + parts[0].padStart(2, '0');
                    }
                } else if (typeof data === 'number') {
                    const d = new Date((data - 25569) * 86400 * 1000);
                    data    = d.toISOString().split('T')[0];
                }

                registres.push({
                    num_explotacio: numExplotacio,
                    data:           data,
                    consum_m3:      consumM3,
                    creat_per:      currentUser ? currentUser.id : null
                });
            }

            if (registres.length === 0) {
                mostrarNotificacio('No s\'han trobat registres al fitxer', 'error');
                return;
            }

            // Esborrar registres existents del mateix rang
            const numExplotacio = registres[0].num_explotacio;
            const dataMin = registres.reduce(function(min, r) { return r.data < min ? r.data : min; }, registres[0].data);
            const dataMax = registres.reduce(function(max, r) { return r.data > max ? r.data : max; }, registres[0].data);

            await supabaseClient.from('reg')
                .delete()
                .eq('num_explotacio', numExplotacio)
                .gte('data', dataMin)
                .lte('data', dataMax);

            const { error } = await supabaseClient.from('reg').insert(registres);
            if (error) throw error;

            mostrarNotificacio('✅ Importats ' + registres.length + ' registres correctament', 'success');
            event.target.value = '';
            await carregarTaulaReg();

        } catch (error) {
            console.error('Error importació:', error);
            mostrarNotificacio('Error: ' + error.message, 'error');
        }
    };
    reader.readAsArrayBuffer(fitxer);
}

// ============================================================
// GESTIÓ TAULA DATES COLLITA (per admin)
// Permet ajustar les dates de referència sense SQL
// ============================================================

async function obrirGestioDatesFenologiques() {
    if (!currentUserProfile || !['admin', 'editor'].includes(currentUserProfile.role)) {
        mostrarNotificacio('Accés restringit', 'error');
        return;
    }

    const { data, error } = await supabaseClient
        .from('reg_dates_collita')
        .select('*')
        .eq('campanya', 2026)
        .order('cultiu, data_inici');

    const existent = document.getElementById('modal-dates-collita');
    if (existent) existent.remove();

    let html = '<div id="modal-dates-collita" class="modal" style="display:block;">';
    html += '<div class="modal-content" style="max-width:800px;">';
    html += '<span class="close" onclick="document.getElementById(\'modal-dates-collita\').remove()">&times;</span>';
    html += '<h2>📅 Dates de Collita de Referència</h2>';
    html += '<p style="color:#666;font-size:13px;">Dates orientatives per calcular les fases de reg. S\'actualitzen automàticament quan hi ha entrades reals al mòdul de Collita.</p>';

    if (error || !data || data.length === 0) {
        html += '<p style="color:#ff9800;">⚠️ No hi ha dates configurades. Executa el SQL inicial a Supabase.</p>';
    } else {
        html += '<div class="table-container"><table class="data-table"><thead><tr>';
        html += '<th>Cultiu</th><th>Varietat</th><th>Inici Collita</th><th>Fi Collita</th><th>Dies Postcollita</th><th></th>';
        html += '</tr></thead><tbody>';

        data.forEach(function(d) {
            html += '<tr>' +
                '<td>' + (d.cultiu || '-') + '</td>' +
                '<td>' + (d.varietat || '<em style="color:#999;">Totes</em>') + '</td>' +
                '<td><input type="date" value="' + (d.data_inici || '') + '" onchange="actualitzarDataCollita(\'' + d.id + '\',\'data_inici\',this.value)" style="padding:4px;border:1px solid #ddd;border-radius:4px;"></td>' +
                '<td><input type="date" value="' + (d.data_fi || '') + '" onchange="actualitzarDataCollita(\'' + d.id + '\',\'data_fi\',this.value)" style="padding:4px;border:1px solid #ddd;border-radius:4px;"></td>' +
                '<td><input type="number" value="' + (d.dies_postcollita || 7) + '" min="0" max="30" onchange="actualitzarDataCollita(\'' + d.id + '\',\'dies_postcollita\',parseInt(this.value))" style="width:60px;padding:4px;border:1px solid #ddd;border-radius:4px;text-align:center;"></td>' +
                '<td><span style="color:' + (d.actiu ? '#4caf50' : '#ccc') + ';">●</span></td>' +
                '</tr>';
        });

        html += '</tbody></table></div>';
    }

    html += '<div class="form-actions"><button class="btn btn-primary" onclick="document.getElementById(\'modal-dates-collita\').remove()">Tancar</button></div>';
    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
}

async function actualitzarDataCollita(id, camp, valor) {
    try {
        const update = {};
        update[camp] = valor;
        const { error } = await supabaseClient.from('reg_dates_collita').update(update).eq('id', id);
        if (error) throw error;
        mostrarNotificacio('✅ Data actualitzada', 'success');
        // Refrescar alertes
        await carregarAlertesReg();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// Injectar botó "Dates Fenològiques" quan es carregui la vista Reg
// (accessible des d'admin/editor, visible a la capçalera)
// ============================================================

const _regObserver = new MutationObserver(function() {
    const capçalera = document.querySelector('.view-reg > div:first-child');
    if (capçalera && !document.getElementById('btn-dates-fenologiques')) {
        const role = currentUserProfile ? currentUserProfile.role : '';
        if (role === 'admin' || role === 'editor') {
            const btn = document.createElement('button');
            btn.id        = 'btn-dates-fenologiques';
            btn.className = 'btn btn-secondary';
            btn.innerHTML = '💧 Reg Dates Collita';
            btn.onclick   = obrirGestioDatesFenologiques;
            capçalera.querySelector('div').appendChild(btn);
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('view-container');
    if (container) {
        _regObserver.observe(container, { childList: true, subtree: false });
    }
});

/**
 * Proveïdor d'agenda per a Reg: dades pendents + desviació de consum.
 * Temporada de reg: març(3) a octubre(10).
 */
async function agendaProvider_reg(dataInici, dataFi) {
    const esdeveniments = [];
    const avui = new Date();
    const anyActual = avui.getFullYear();
    const diaActual = avui.getDate();
    const mesActual = avui.getMonth() + 1;

    function formatDataISO(any, mes, dia) {
        return any + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
    }

    function ferClickReg(numExplotacio, mes, any) {
        return function() {
            canviarVista('reg');
            setTimeout(function() {
                const selExp = document.getElementById('reg-filtre-explotacio');
                const selMes = document.getElementById('reg-filtre-mes');
                const selAny = document.getElementById('reg-filtre-any');
                if (selExp) selExp.value = numExplotacio;
                if (selMes) selMes.value = String(mes).padStart(2, '0');
                if (selAny) selAny.value = any;
                if (typeof carregarTaulaReg === 'function') carregarTaulaReg();
            }, 150);
        };
    }

    const { data: explotacions, error: errExp } = await supabaseClient
        .from('reg_configuracio')
        .select('num_explotacio, nom_finca')
        .eq('actiu', true);
    if (errExp || !explotacions) return esdeveniments;

    const { data: consums, error: errCons } = await supabaseClient
        .from('reg')
        .select('num_explotacio, data, consum_m3')
        .gte('data', (anyActual - 1) + '-01-01')
        .lte('data', anyActual + '-12-31');
    if (errCons || !consums) return esdeveniments;

    // --- 1) "Dades pendents" (dia >= 25, mes en curs, dins temporada) ---
    if (diaActual >= 25 && mesActual >= 3 && mesActual <= 10) {
        const dataEventStr = formatDataISO(anyActual, mesActual, 25);
        if (dataDinsRangDate(new Date(anyActual, mesActual - 1, 25), dataInici, dataFi)) {
            explotacions.forEach(function(exp) {
                const diesAmbDades = new Set(
                    consums
                        .filter(function(c) {
                            const d = new Date(c.data);
                            return c.num_explotacio === exp.num_explotacio
                                && d.getFullYear() === anyActual
                                && d.getMonth() + 1 === mesActual
                                && d.getDate() <= 25
                                && c.consum_m3 !== null;
                        })
                        .map(function(c) { return c.data; })
                ).size;

                if (diesAmbDades < 10) {
                    esdeveniments.push({
                        data: dataEventStr,
                        tipus: 'reg_dades_pendents',
                        titol: 'Reg: dades pendents — ' + exp.nom_finca,
                        detall: 'Només ' + diesAmbDades + ' de 25 dies informats al mes',
                        estat: 'avis',
                        modulOrigen: 'reg',
                        idOrigen: exp.num_explotacio + '-' + dataEventStr,
                        accioClick: ferClickReg(exp.num_explotacio, mesActual, anyActual)
                    });
                }
            });
        }
    }

    // --- 2) "Desviació de consum" (dia >= 5, mes anterior tancat, dins temporada) ---
    let mesTancat = mesActual - 1;
    let anyMesTancat = anyActual;
    if (mesTancat === 0) { mesTancat = 12; anyMesTancat = anyActual - 1; }

    if (diaActual >= 5 && mesTancat >= 3 && mesTancat <= 10) {
        const dataEventStr = formatDataISO(anyActual, mesActual, 5);
        if (dataDinsRangDate(new Date(anyActual, mesActual - 1, 5), dataInici, dataFi)) {
            explotacions.forEach(function(exp) {
                const consumActual = consums
                    .filter(function(c) {
                        const d = new Date(c.data);
                        return c.num_explotacio === exp.num_explotacio
                            && d.getFullYear() === anyMesTancat
                            && d.getMonth() + 1 === mesTancat
                            && c.consum_m3 !== null;
                    })
                    .reduce(function(s, c) { return s + Number(c.consum_m3); }, 0);

                const consumAnterior = consums
                    .filter(function(c) {
                        const d = new Date(c.data);
                        return c.num_explotacio === exp.num_explotacio
                            && d.getFullYear() === anyMesTancat - 1
                            && d.getMonth() + 1 === mesTancat
                            && c.consum_m3 !== null;
                    })
                    .reduce(function(s, c) { return s + Number(c.consum_m3); }, 0);

                if (consumAnterior > 0) {
                    const desviacio = (consumActual - consumAnterior) / consumAnterior * 100;
                    if (Math.abs(desviacio) > 20) {
                        esdeveniments.push({
                            data: dataEventStr,
                            tipus: 'reg_desviacio_consum',
                            titol: 'Reg: desviació de consum — ' + exp.nom_finca,
                            detall: 'Consum ' + mesTancat + '/' + anyMesTancat + ': '
                                + (desviacio > 0 ? '+' : '') + desviacio.toFixed(1) + '% vs any anterior',
                            estat: 'avis',
                            modulOrigen: 'reg',
                            idOrigen: exp.num_explotacio + '-' + dataEventStr,
                            accioClick: ferClickReg(exp.num_explotacio, mesTancat, anyMesTancat)
                        });
                    }
                }
            });
        }
    }

    return esdeveniments;
}

registrarProveidorAgenda(agendaProvider_reg);

console.log('✅ Reg v2 carregat');