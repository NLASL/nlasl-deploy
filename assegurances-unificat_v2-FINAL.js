// ============================================================
// ASSEGURANCES UNIFICAT v2 — FINAL FUSIONAT
// Agroseguro complet + Altres Assegurances (Immobilitzat + Altres + RC)
// INDEPENDENT (no necessita agroseguro-ui_v1.js)
// ============================================================

// ============================================================
// VARIABLES GLOBALS
// ============================================================

let polissesCache = [];
let parcellesCache = [];
let sinistresCache = [];
let campanyaSeleccionadaAsegurances = 2026;
const campanyesDisponibles = [2026, 2025, 2024];

let immobilizatCache = [];
let assegurancesAltresCache = [];
let assegurancesCivilCache = [];
let exerciciSeleccionat = new Date().getFullYear();
const exercicisDisponibles = [2026, 2025, 2024, 2023];

// ============================================================
// FUNCIONS CRUD — AGROSEGURO POLISSES
// ============================================================

async function getPolisses(filtres = {}) {
    let query = supabaseClient
        .from('agroseguro_polisses')
        .select('*');
    
    if (filtres.campanya) {
        query = query.eq('campanya', filtres.campanya);
    }
    if (filtres.linia) {
        query = query.eq('linia', filtres.linia);
    }
    if (filtres.categoria) {
        query = query.eq('categoria', filtres.categoria);
    }
    
    query = query.order('data_vigor', { ascending: false });
    
    const { data, error } = await query;
    if (error) {
        console.error('Error carregant pòlisses:', error);
        throw error;
    }
    return data || [];
}

async function createPolissa(polissa) {
    const { data, error } = await supabaseClient
        .from('agroseguro_polisses')
        .insert([polissa])
        .select();
    if (error) throw error;
    return data[0];
}

async function updatePolissa(id, polissa) {
    const { data, error } = await supabaseClient
        .from('agroseguro_polisses')
        .update(polissa) 
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deletePolissa(id) {
    const { error } = await supabaseClient
        .from('agroseguro_polisses')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// FUNCIONS CRUD — AGROSEGURO PARCELLES
// ============================================================

async function getParcellesAgroseguro(polissaId) {
    const { data, error } = await supabaseClient
        .from('agroseguro_parcelles')
        .select('*')
        .eq('polissa_id', polissaId)
        .order('num_par');
    if (error) throw error;
    return data || [];
}

async function createParcellaAgroseguro(parcella) {
    const { data, error } = await supabaseClient
        .from('agroseguro_parcelles')
        .insert([parcella])
        .select();
    if (error) throw error;
    return data[0];
}

// ============================================================
// FUNCIONS CRUD — AGROSEGURO SINISTRES
// ============================================================

async function getSinistresAgroseguro(polissaId) {
    const { data, error } = await supabaseClient
        .from('agroseguro_sinistres')
        .select('*')
        .eq('polissa_id', polissaId)
        .order('data_sinistre', { ascending: false });
    if (error) throw error;
    return data || [];
}

// ============================================================
// FUNCIONS CRUD — ALTRES ASSEGURANCES
// ============================================================

async function getImmobilitzat() {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .select('*')
        .order('tipus, descripció');
    if (error) throw error;
    return data || [];
}

async function getAssegurancesAltres(exercici = null) {
    let query = supabaseClient.from('assegurances_altres').select('*');
    if (exercici) query = query.eq('exercici', exercici);
    query = query.order('data_venciment', { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function getAssegurancesCivil(exercici = null) {
    let query = supabaseClient.from('assegurances_civil').select('*');
    if (exercici) query = query.eq('exercici', exercici);
    query = query.order('data_venciment', { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// ============================================================
// CARREGA VISTA PRINCIPAL ASSEGURANCES
// ============================================================

async function carregarVistaAssegurances() {
    try {
        campanyaSeleccionadaAsegurances = obtenirCampanyaActual();
        
        let html = `
            <div class="assegurances-container">
                <div class="assegurances-tabs-main">
                    <button class="tab-btn-main active" data-tab="agroseguro">
                        🍑 Agroseguro
                    </button>
                    <button class="tab-btn-main" data-tab="altres">
                        🛡️ Altres assegurances
                    </button>
                </div>
                
                <div id="tab-agroseguro-main" class="tab-content-main active">
                    <div id="agroseguro-view"></div>
                </div>
                
                <div id="tab-altres-main" class="tab-content-main">
                    <div class="assegurances-tabs-sub">
                        <button class="tab-btn-sub active" data-subtab="immobilitzat">
                            🏗️ Immobilitzat
                        </button>
                        <button class="tab-btn-sub" data-subtab="altres-asseg">
                            🔐 Altres assegurances
                        </button>
                        <button class="tab-btn-sub" data-subtab="civil">
                            ⚖️ Responsabilitat civil
                        </button>
                    </div>
                    
                    <div id="subtab-immobilitzat" class="subtab-content active">
                        <div id="immobilitzat-view"></div>
                    </div>
                    <div id="subtab-altres-asseg" class="subtab-content">
                        <div id="altres-asseg-view"></div>
                    </div>
                    <div id="subtab-civil" class="subtab-content">
                        <div id="civil-view"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('view-container').innerHTML = html;
        
        document.querySelectorAll('.tab-btn-main').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn-main').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content-main').forEach(tc => tc.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.tab}-main`).classList.add('active');
                
                if (e.target.dataset.tab === 'agroseguro') {
                    mostrarVistaAgroseguro();
                } else if (e.target.dataset.tab === 'altres') {
                    mostrarVistaAltresAssegurances();
                }
            });
        });
        
        document.querySelectorAll('.tab-btn-sub').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const parent = e.target.closest('.assegurances-tabs-sub');
                parent.querySelectorAll('.tab-btn-sub').forEach(b => b.classList.remove('active'));
                parent.parentElement.querySelectorAll('.subtab-content').forEach(sc => sc.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(`subtab-${e.target.dataset.subtab}`).classList.add('active');
                
                if (e.target.dataset.subtab === 'immobilitzat') {
                    mostrarVistaImmobilitzat();
                } else if (e.target.dataset.subtab === 'altres-asseg') {
                    mostrarVistaAltresAsseg();
                } else if (e.target.dataset.subtab === 'civil') {
                    mostrarVistaCivil();
                }
            });
        });
        
        await mostrarVistaAgroseguro();
        
    } catch (error) {
        console.error('Error carregant vista assegurances:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// VISTA AGROSEGURO
// ============================================================

async function mostrarVistaAgroseguro() {
    try {
        const container = document.getElementById('agroseguro-view');
        if (!container) return;
        
        let html = `
            <div class="assegurances-header">
                <h3>🍑 Agroseguro</h3>
                <div class="agroseguro-controls">
                    <select id="campanya-selector" class="selector-campanya">
                        ${campanyesDisponibles.map(c => 
                            `<option value="${c}" ${c === campanyaSeleccionadaAsegurances ? 'selected' : ''}>Campanya ${c}</option>`
                        ).join('')}
                    </select>
                    <button class="btn-nova" onclick="obrirModalNovaPolissa()">
                        ➕ Nova pòlissa
                    </button>
                </div>
            </div>
        `;
        
        const polisses = await getPolisses({ campanya: campanyaSeleccionadaAsegurances });
        polissesCache = polisses;
        
        const agrupat = agruparPolisses(polisses);
        
        for (const [linia, polissesLinia] of Object.entries(agrupat)) {
            html += renderizarGrupLinia(linia, polissesLinia);
        }
        
        if (polisses.length === 0) {
            html += `<div class="no-data">Sense pòlisses per aquesta campanya</div>`;
        }
        
        container.innerHTML = html;
        
        document.getElementById('campanya-selector').addEventListener('change', (e) => {
            campanyaSeleccionadaAsegurances = parseInt(e.target.value);
            mostrarVistaAgroseguro();
        });
        
    } catch (error) {
        console.error('Error en mostrarVistaAgroseguro:', error);
        if (document.getElementById('agroseguro-view')) {
            document.getElementById('agroseguro-view').innerHTML = 
                `<div class="error-message">Error: ${error.message}</div>`;
        }
    }
}

// ============================================================
// VISTA ALTRES ASSEGURANCES
// ============================================================

async function mostrarVistaAltresAsseg() {
    try {
        const container = document.getElementById('altres-asseg-view');
        
        let html = `
            <div class="assegurances-header">
                <h3>🔐 Altres assegurances</h3>
                <div class="assegurances-controls">
                    <label>
                        <input type="checkbox" id="mostrar-vencudes-altres" onchange="mostrarVistaAltresAsseg()">
                        Mostrar vençudes
                    </label>
                    <button class="btn-nova" onclick="obrirModalNovaAsseguranca()">
                        ➕ Nova assegurança
                    </button>
                </div>
            </div>
        `;
        
        const assegurances = await getAssegurancesAltres(null);
        assegurancesAltresCache = assegurances;
        
        const mostrarVencudes = document.getElementById('mostrar-vencudes-altres')?.checked || false;
        const avui = new Date();
        
        const filtrades = assegurances.filter(a => {
            const venciment = new Date(a.data_venciment);
            const vigent = venciment >= avui;
            return mostrarVencudes ? true : vigent;
        });
        
        if (filtrades.length === 0) {
            html += `<div class="no-data">Sense assegurances</div>`;
        } else {
            html += `<div class="cards-grid">`;
            
            filtrades.forEach(ass => {
                const dataVenciment = formatData(ass.data_venciment);
                const prima = (ass.prima_anual || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const immDescripcio = ass.immobilitzat_id ? 
                    (immobilizatCache.find(i => i.id === ass.immobilitzat_id)?.descripció || '—') : '—';
                const estat = ass.estat === 'actiu' ? '✅' : ass.estat === 'vençut' ? '⏰' : '⚠️';
                
                html += `
                    <div class="card-polissa">
                        <div class="card-header">
                            <h4>${ass.companyia}</h4>
                            <span class="badge-estat">${estat} ${ass.estat}</span>
                        </div>
                        <div class="card-body">
                            <p><strong>Pòlissa:</strong> ${ass.num_polissa}</p>
                            <p><strong>Cobertura:</strong> ${immDescripcio} (${getTipusAssegurancaIcon(ass.tipus_polissa)} ${ass.tipus_polissa})</p>
                            <p><strong>Venciment:</strong> ${dataVenciment}</p>
                            <p><strong>Prima:</strong> ${prima}</p>
                        </div>
                        <div class="card-footer">
                            <button class="btn-small btn-veure" onclick="obrirModalDetallAsseguranca('${ass.id}')">👁️ Veure</button>
                            <button class="btn-small btn-editar" onclick="obrirModalEditarAsseguranca('${ass.id}')">✏️</button>
                            <button class="btn-small btn-eliminar" onclick="eliminarAssegurancaConfirm('${ass.id}')">🗑️</button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error mostrarVistaAltresAsseg:', error);
        document.getElementById('altres-asseg-view').innerHTML = 
            `<div class="error-message">Error: ${error.message}</div>`;
    }
}

// ============================================================
// VISTA RESPONSABILITAT CIVIL
// ============================================================

async function mostrarVistaCivil() {
    try {
        const container = document.getElementById('civil-view');
        
        let html = `
            <div class="assegurances-header">
                <h3>⚖️ Responsabilitat civil</h3>
                <div class="assegurances-controls">
                    <label>
                        <input type="checkbox" id="mostrar-vencudes-civil" onchange="mostrarVistaCivil()">
                        Mostrar vençudes
                    </label>
                    <button class="btn-nova" onclick="obrirModalNovaCivil()">
                        ➕ Nova pòlissa
                    </button>
                </div>
            </div>
        `;
        
        const civil = await getAssegurancesCivil(null);
        assegurancesCivilCache = civil;
        
        const mostrarVencudes = document.getElementById('mostrar-vencudes-civil')?.checked || false;
        const avui = new Date();
        
        const filtrades = civil.filter(c => {
            const venciment = new Date(c.data_venciment);
            const vigent = venciment >= avui;
            return mostrarVencudes ? true : vigent;
        });
        
        if (filtrades.length === 0) {
            html += `<div class="no-data">Sense pòlisses civils</div>`;
        } else {
            html += `<div class="cards-grid">`;
            
            filtrades.forEach(c => {
                const dataVenciment = formatData(c.data_venciment);
                const cobertura = (c.cobertura_minima || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const prima = (c.prima_anual || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const estat = c.estat === 'actiu' ? '✅' : c.estat === 'vençut' ? '⏰' : '⚠️';
                
                html += `
                    <div class="card-polissa">
                        <div class="card-header">
                            <h4>${getTascaIcon(c.tasca)} ${c.tasca}</h4>
                            <span class="badge-estat">${estat} ${c.estat}</span>
                        </div>
                        <div class="card-body">
                            <p><strong>Companyia:</strong> ${c.companyia}</p>
                            <p><strong>Pòlissa:</strong> ${c.num_polissa}</p>
                            <p><strong>Cobertura:</strong> ${cobertura}</p>
                            <p><strong>Venciment:</strong> ${dataVenciment}</p>
                            <p><strong>Prima:</strong> ${prima}</p>
                        </div>
                        <div class="card-footer">
                            <button class="btn-small btn-veure" onclick="obrirModalDetallCivil('${c.id}')">👁️ Veure</button>
                            <button class="btn-small btn-editar" onclick="obrirModalEditarCivil('${c.id}')">✏️</button>
                            <button class="btn-small btn-eliminar" onclick="eliminarCivilConfirm('${c.id}')">🗑️</button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error mostrarVistaCivil:', error);
        document.getElementById('civil-view').innerHTML = 
            `<div class="error-message">Error: ${error.message}</div>`;
    }
}

// ============================================================
// VISTA IMMOBILITZAT
// ============================================================

async function mostrarVistaImmobilitzat() {
    try {
        const container = document.getElementById('immobilitzat-view');
        
        let html = `
            <div class="assegurances-header">
                <h3>🏗️ Immobilitzat material</h3>
                <button class="btn-nova" onclick="obrirModalNouImmobilitzat()">
                    ➕ Nou immobilitzat
                </button>
            </div>
        `;
        
        const immobilitzat = await getImmobilitzat();
        immobilizatCache = immobilitzat;
        
        if (immobilitzat.length === 0) {
            html += `<div class="no-data">Sense immobilitzat registrat</div>`;
        } else {
            html += `
                <table class="taula-standard">
                    <thead>
                        <tr>
                            <th>Tipus</th>
                            <th>Descripció</th>
                            <th>Marca/Model</th>
                            <th>Valor actual</th>
                            <th>Ubicació</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            immobilitzat.forEach(imm => {
                const valor = (imm.valor_actual || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const marca = imm.marca ? `${imm.marca} ${imm.model || ''}` : imm.model || '—';
                
                html += `
                    <tr>
                        <td><strong>${getTipusIcon(imm.tipus)} ${imm.tipus}</strong></td>
                        <td>${imm.descripció}</td>
                        <td>${marca}</td>
                        <td>${valor}</td>
                        <td>${imm.ubicació || '—'}</td>
                        <td class="accions-cell">
                            <button class="btn-small btn-editar" onclick="obrirModalEditarImmobilitzat('${imm.id}')">✏️</button>
                            <button class="btn-small btn-eliminar" onclick="eliminarImmobilitzatConfirm('${imm.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
            });
            
            html += `</tbody></table>`;
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error mostrarVistaImmobilitzat:', error);
        document.getElementById('immobilitzat-view').innerHTML = 
            `<div class="error-message">Error: ${error.message}</div>`;
    }
}

// ============================================================
// UTILITATS — AGRUPACIÓ
// ============================================================

function agruparPolisses(polisses) {
    const agrupat = {};
    polisses.forEach(polissa => {
        const linia = polissa.linia || 'SENSE LINIA';
        if (!agrupat[linia]) agrupat[linia] = [];
        agrupat[linia].push(polissa);
    });
    return agrupat;
}

function renderizarGrupLinia(linia, polissesLinia) {
    const principal = polissesLinia.filter(p => p.categoria === 'PRINCIPAL' || !p.categoria);
    const complementaria = polissesLinia.filter(p => p.categoria === 'COMPLEMENTARIA');
    
    let html = `<div class="linia-group">`;
    
    if (principal.length > 0) {
        html += `<h4>${linia} — PRINCIPALS</h4>`;
        principal.forEach(p => {
            html += renderizarTarjetaPolissa(p, 'principal');
        });
    }
    
    if (complementaria.length > 0) {
        html += `<h4>${linia} — COMPLEMENTÀRIES</h4>`;
        complementaria.forEach(p => {
            html += renderizarTarjetaPolissa(p, 'complementaria');
        });
    }
    
    html += `</div>`;
    return html;
}

function renderizarTarjetaPolissa(polissa, tipus) {
    const dataInici = formatData(polissa.data_vigor);
    const dataVenciment = formatData(polissa.data_venciment);
    const capital = (polissa.capital_assegurat_total || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
    const badgeComplementaria = tipus === 'complementaria' ? '<span class="badge badge-complementaria">COMPLEMENTARIA</span>' : '';
    
    return `
        <div class="polissa-card">
            <div class="polissa-header">
                <h5>${polissa.num_polissa} — ${polissa.ref_collectiu || '—'}</h5>
                ${badgeComplementaria}
            </div>
            <div class="polissa-info">
                <p><strong>Data inici:</strong> ${dataInici}</p>
                <p><strong>Venciment:</strong> ${dataVenciment}</p>
                <p><strong>Capital:</strong> ${capital}</p>
            </div>
            <div class="polissa-accions">
                <button class="btn-small btn-veure" onclick="obrirModalPolissa('${polissa.id}')">👁️ Veure</button>
                <button class="btn-small btn-editar" onclick="obrirModalEditarPolissa('${polissa.id}')">✏️</button>
                <button class="btn-small btn-eliminar" onclick="eliminarPolissaConfirm('${polissa.id}')">🗑️</button>
            </div>
        </div>
    `;
}

function obtenirCampanyaActual() {
    return new Date().getFullYear();
}

// ============================================================
// ICONES I UTILITATS
// ============================================================

function getTipusIcon(tipus) {
    const icons = {
        'edifici': '🏢', 'infraestructura_reg': '💧', 'tractor': '🚜',
        'vehicle': '🚗', 'remolc': '🚜', 'maquinaria': '⚙️', 'altra': '📦'
    };
    return icons[tipus] || '📦';
}

function getTipusAssegurancaIcon(tipus) {
    const icons = {
        'auto': '🚗', 'accidents': '⚠️', 'impagament': '💳', 'incendi': '🔥',
        'proteccio_juridica': '⚖️', 'RC': '🛡️', 'robatori': '🔐', 
        'salut_laboral': '👷', 'viatges': '✈️', 'vida': '❤️', 'altra': '📋'
    };
    return icons[tipus] || '📋';
}

function getTascaIcon(tasca) {
    const icons = { 'agrícola': '🌾', 'construcció': '🏗️' };
    return icons[tasca] || '📋';
}

// ============================================================
// PLACEHOLDERS MODALS
// ============================================================

async function obrirModalPolissa(polissaId) {
    mostrarNotificacio('Modal detall pòlissa — A implementar', 'info');
}

async function obrirModalDetallAsseguranca(assegurancaId) {
    mostrarNotificacio('Modal detall assegurança — A implementar', 'info');
}

async function obrirModalDetallCivil(civilId) {
    mostrarNotificacio('Modal detall civil — A implementar', 'info');
}

function obrirModalNovaPolissa() {
    mostrarNotificacio('Modal nova pòlissa — A implementar', 'info');
}

function obrirModalEditarPolissa(id) {
    mostrarNotificacio('Modal editar pòlissa — A implementar', 'info');
}

function obrirModalNovaAsseguranca() {
    mostrarNotificacio('Modal nova assegurança — A implementar', 'info');
}

function obrirModalEditarAsseguranca(id) {
    mostrarNotificacio('Modal editar assegurança — A implementar', 'info');
}

function obrirModalNouImmobilitzat() {
    mostrarNotificacio('Modal nou immobilitzat — A implementar', 'info');
}

function obrirModalEditarImmobilitzat(id) {
    mostrarNotificacio('Modal editar immobilitzat — A implementar', 'info');
}

function obrirModalNovaCivil() {
    mostrarNotificacio('Modal nova pòlissa civil — A implementar', 'info');
}

function obrirModalEditarCivil(id) {
    mostrarNotificacio('Modal editar civil — A implementar', 'info');
}

// ============================================================
// ELIMINAR
// ============================================================

async function eliminarPolissaConfirm(polissaId) {
    if (!confirm('Segur que vols eliminar aquesta pòlissa?')) return;
    try {
        await deletePolissa(polissaId);
        mostrarNotificacio('✅ Pòlissa eliminada', 'success');
        mostrarVistaAgroseguro();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarImmobilitzatConfirm(id) {
    if (!confirm('Segur que vols eliminar aquest immobilitzat?')) return;
    try {
        await deleteImmobilitzat(id);
        mostrarNotificacio('✅ Immobilitzat eliminat', 'success');
        mostrarVistaImmobilitzat();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarAssegurancaConfirm(id) {
    if (!confirm('Segur que vols eliminar aquesta assegurança?')) return;
    try {
        await deleteAssegurancaAltres(id);
        mostrarNotificacio('✅ Assegurança eliminada', 'success');
        mostrarVistaAltresAsseg();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarCivilConfirm(id) {
    if (!confirm('Segur que vols eliminar aquesta pòlissa civil?')) return;
    try {
        await deleteAssegurancaCivil(id);
        mostrarNotificacio('✅ Pòlissa civil eliminada', 'success');
        mostrarVistaCivil();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function deleteImmobilitzat(id) {
    const { error } = await supabaseClient
        .from('immobilitzat_material')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

async function deleteAssegurancaAltres(id) {
    const { error } = await supabaseClient
        .from('assegurances_altres')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

async function deleteAssegurancaCivil(id) {
    const { error } = await supabaseClient
        .from('assegurances_civil')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

async function mostrarVistaAltresAssegurances() {
    mostrarVistaAltresAsseg();
}

console.log('✅ Assegurances Unificat v2 FINAL carregat');

    padding: 20px;
}

/* TABS PRINCIPALS */
.assegurances-tabs-main {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    border-bottom: 2px solid var(--color-border);
}

.tab-btn-main {
    padding: 12px 18px;
    border: none;
    background-color: transparent;
    color: var(--color-text-light);
    font-weight: 600;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: var(--transition);
    font-size: 14px;
}

.tab-btn-main:hover {
    color: var(--color-primary);
}

.tab-btn-main.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
}

/* TABS SECUNDARIS */
.assegurances-tabs-sub {
    display: flex;
    gap: 8px;
    margin: 20px 0 15px 0;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--color-border);
}

.tab-btn-sub {
    padding: 8px 14px;
    border: none;
    background-color: transparent;
    color: var(--color-text-light);
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: var(--transition);
    font-size: 13px;
}

.tab-btn-sub:hover {
    color: var(--color-primary);
}

.tab-btn-sub.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
}

/* ANIMACIONS */
.tab-content-main,
.subtab-content {
    display: none;
    animation: fadeIn 0.3s ease;
}

.tab-content-main.active,
.subtab-content.active {
    display: block;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* HEADERS */
.assegurances-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid var(--color-border);
}

.assegurances-header h3 {
    margin: 0;
    color: var(--color-primary);
    font-size: 18px;
    font-weight: 600;
}

/* CONTROLS */
.assegurances-controls {
    display: flex;
    gap: 12px;
    align-items: center;
}

.assegurances-controls label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    cursor: pointer;
    color: var(--color-text);
}

.assegurances-controls input[type="checkbox"] {
    cursor: pointer;
}

.selector-campanya,
.selector-exercici {
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 13px;
    background-color: var(--color-bg-card);
    cursor: pointer;
}

.selector-campanya:focus,
.selector-exercici:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(45, 80, 22, 0.1);
}

/* BOTONS */
.btn-nova {
    padding: 10px 16px;
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    font-size: 14px;
    transition: var(--transition);
    white-space: nowrap;
}

.btn-nova:hover {
    background-color: var(--color-primary-light);
}

/* CARDS */
.cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 16px;
    margin-top: 20px;
}

.card-polissa {
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    transition: var(--transition);
}

.card-polissa:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary);
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 12px;
    background-color: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
}

.card-header h4 {
    margin: 0;
    color: var(--color-primary);
    font-size: 14px;
    font-weight: 600;
}

.badge-estat {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    background-color: var(--color-success);
    color: white;
}

.card-body {
    padding: 12px;
    font-size: 13px;
}

.card-body p {
    margin: 6px 0;
    line-height: 1.4;
}

.card-body strong {
    color: var(--color-text);
}

.card-footer {
    display: flex;
    gap: 6px;
    padding: 10px;
    background-color: var(--color-bg);
    border-top: 1px solid var(--color-border);
    justify-content: center;
}

/* BOTONS PETITS */
.btn-small {
    padding: 8px 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    transition: var(--transition);
    font-weight: 500;
}

.btn-veure {
    background-color: #e3f2fd;
    color: #1976d2;
    flex: 1;
}

.btn-veure:hover {
    background-color: #bbdefb;
}

.btn-editar {
    background-color: #e3f2fd;
    color: #1976d2;
}

.btn-editar:hover {
    background-color: #bbdefb;
}

.btn-eliminar {
    background-color: #ffebee;
    color: var(--color-error);
}

.btn-eliminar:hover {
    background-color: #ffcdd2;
}

/* TAULA */
.taula-standard {
    width: 100%;
    border-collapse: collapse;
    background-color: var(--color-bg-card);
    border-radius: 4px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
    margin-top: 15px;
}

.taula-standard thead {
    background-color: var(--color-bg);
    border-bottom: 2px solid var(--color-border);
}

.taula-standard th {
    padding: 12px;
    text-align: left;
    font-weight: 600;
    color: var(--color-text);
    font-size: 12px;
    text-transform: uppercase;
}

.taula-standard td {
    padding: 12px;
    border-bottom: 1px solid var(--color-border);
    font-size: 13px;
}

.taula-standard tbody tr:hover {
    background-color: var(--color-bg);
}

.taula-standard tr:last-child td {
    border-bottom: none;
}

.accions-cell {
    display: flex;
    gap: 6px;
    justify-content: center;
}

/* MISSATGES */
.no-data {
    padding: 40px 20px;
    text-align: center;
    color: var(--color-text-light);
    font-size: 14px;
    background-color: var(--color-bg);
    border-radius: 4px;
    margin-top: 20px;
}

.error-message {
    padding: 20px;
    background-color: #ffebee;
    color: var(--color-error);
    border-radius: 4px;
    margin-top: 20px;
    font-size: 13px;
}

/* RESPONSIVE */
@media (max-width: 768px) {
    .assegurances-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
    
    .assegurances-controls {
        width: 100%;
        flex-direction: column;
    }
    
    .selector-campanya,
    .selector-exercici,
    .btn-nova {
        width: 100%;
    }
    
    .cards-grid {
        grid-template-columns: 1fr;
    }
    
    .assegurances-tabs-main,
    .assegurances-tabs-sub {
        flex-wrap: wrap;
    }
    
    .tab-btn-main,
    .tab-btn-sub {
        font-size: 12px;
        padding: 8px 12px;
    }
    
    .taula-standard {
        font-size: 12px;
    }
    
    .taula-standard th,
    .taula-standard td {
        padding: 8px;
    }
    
    .card-footer {
        flex-direction: column;
    }
    
    .btn-small {
        width: 100%;
    }
}

/* PRINT */
@media print {
    .assegurances-header,
    .tab-btn-main,
    .tab-btn-sub,
    .assegurances-controls,
    .btn-nova,
    .btn-small,
    .card-footer {
        display: none;
    }
    
    .card-polissa,
    .taula-standard {
        page-break-inside: avoid;
    }
}