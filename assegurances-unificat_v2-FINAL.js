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
const campanyaActual = new Date().getFullYear();
const anyInici = 2023;
const campanyesDisponibles = Array.from(
    { length: campanyaActual - anyInici + 1 },
    (_, i) => campanyaActual - i
);

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
        
        // Carreguem les pòlisses d'"Altres assegurances" per poder enllaçar
        // cada immobilitzat amb la(es) seva(es) pòlissa(es) vinculada(es)
        const assegurancesAltres = await getAssegurancesAltres(null);
        assegurancesAltresCache = assegurancesAltres;
        
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
                            <th>Pòlissa vinculada</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            immobilitzat.forEach(imm => {
                const valor = (imm.valor_actual || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const marca = imm.marca ? `${imm.marca} ${imm.model || ''}` : imm.model || '—';
                
                const polissesVinculades = assegurancesAltres.filter(a => a.immobilitzat_id === imm.id);
                
                let polissaCell = '—';
                if (polissesVinculades.length > 0) {
                    polissaCell = polissesVinculades.map(p => `
                        <button class="btn-small btn-link-polissa" 
                                onclick="anarAPolissaVinculada('${p.id}')" 
                                title="${p.companyia} — ${p.num_polissa}">
                            🔗 ${p.companyia} (${p.num_polissa})
                        </button>
                    `).join('<br>');
                }
                
                html += `
                    <tr>
                        <td><strong>${getTipusIcon(imm.tipus)} ${imm.tipus}</strong></td>
                        <td>${imm.descripció}</td>
                        <td>${marca}</td>
                        <td>${valor}</td>
                        <td>${imm.ubicació || '—'}</td>
                        <td>${polissaCell}</td>
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

// ============================================================
// NAVEGACIÓ: IMMOBILITZAT -> PÒLISSA VINCULADA
// ============================================================

async function anarAPolissaVinculada(assegurancaId) {
    // 1. Activem la pestanya principal "Altres assegurances"
    const tabAltres = document.querySelector('.tab-btn-main[data-tab="altres"]');
    if (tabAltres) tabAltres.click();
    
    // 2. Activem la subpestanya "Altres assegurances"
    const subtabAltresAsseg = document.querySelector('.tab-btn-sub[data-subtab="altres-asseg"]');
    if (subtabAltresAsseg) subtabAltresAsseg.click();
    
    // 3. Esperem que es renderitzi la vista i obrim el detall de la pòlissa vinculada
    setTimeout(() => {
        obrirModalDetallAsseguranca(assegurancaId);
    }, 150);
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

// ============================================================
// PROVEÏDOR D'AGENDA — ASSEGURANCES (Altres + Civil)
// ============================================================
// Agroseguro queda fora per ara (no té estat ni quotes de pagament).
//
// Dos tipus d'avís, independents:
//   1) Renovació: un sol avís X dies abans de data_venciment de la pòlissa
//      (assegurances_altres.data_venciment). Pensat per decidir si es renova.
//   2) Pagament de quota: basat en assegurances_altres_quotes amb estat
//      'pendent' (data_pagament = data prevista del pagament, no la real):
//        - preavís Y dies abans
//        - el dia mateix
//        - cada dia des de l'endemà fins avui, mentre segueixi 'pendent'
//          (s'atura sola quan la quota passa a 'pagada' o 'cancel·lada')

const ASSEG_DIES_AVIS_RENOVACIO = 45; // dies abans del venciment de la pòlissa
// Nota: el termini legal mínim per comunicar la no pròrroga és de 30 dies abans
// del venciment. Es posa l'avís a 45 dies (15 dies de marge) perquè calgui
// preparar i enviar un escrit (carta/burofax/email) abans que es consumeixi
// el termini legal real.
const ASSEG_DIES_AVIS_PAGAMENT = 7;   // dies abans de la data de pagament prevista

function ferClickAsseguranca(assegurancaId, categoria) {
    return function() {
        canviarVista('assegurances');
        setTimeout(function() {
            const tabAltres = document.querySelector('.tab-btn-main[data-tab="altres"]');
            if (tabAltres) tabAltres.click();

            setTimeout(function() {
                const subtabSelector = categoria === 'civil'
                    ? '.tab-btn-sub[data-subtab="civil"]'
                    : '.tab-btn-sub[data-subtab="altres-asseg"]';
                const subtab = document.querySelector(subtabSelector);
                if (subtab) subtab.click();

                setTimeout(function() {
                    obrirModalDetallAsseguranca(assegurancaId);
                }, 150);
            }, 50);
        }, 150);
    };
}

function formatDataISOAsseg(dateObj) {
    const any = dateObj.getFullYear();
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dateObj.getDate()).padStart(2, '0');
    return any + '-' + mes + '-' + dia;
}

function restarDiesAsseg(dateObj, dies) {
    const d = new Date(dateObj);
    d.setDate(d.getDate() - dies);
    return d;
}

function sumarDiesAsseg(dateObj, dies) {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + dies);
    return d;
}

async function agendaProvider_assegurances(dataInici, dataFi) {
    const esdeveniments = [];
    const avui = new Date();
    const dataIniciObj = new Date(dataInici);
    const dataFiObj = new Date(dataFi);

    // --- Dades base (paginades, per si algun dia hi ha moltes pòlisses) ---
    const polisses = await consultaPaginada('assegurances_altres', '*', function(query) {
        return query;
    });

    const quotes = await consultaPaginada('assegurances_altres_quotes', '*', function(query) {
        return query;
    });

    const polissesPerId = {};
    polisses.forEach(function(p) { polissesPerId[p.id] = p; });

    // El camp data_venciment de la pòlissa NO s'actualitza en renovar-se
    // (es queda congelat amb el venciment original). La vigència real la
    // marca el data_fi_cobertura de la quota VIGENT AVUI (la que cobreix la
    // data d'avui), no la de fi_cobertura més llunyà — una quota futura ja
    // introduïda per planificació (p. ex. consultada a la web de la
    // companyia) no ha de fer-se passar per "la vigent" abans de començar.
    // Si no n'hi ha cap que cobreixi avui (vençuda sense renovar encara, o
    // totes futures), es fa servir la de fi_cobertura més recent com a
    // fallback; en últim cas, data_venciment de la pòlissa.
    function obtenirVencimentRealAssegPerAgenda(quotesPolissa) {
        if (!quotesPolissa || quotesPolissa.length === 0) return null;
        const avuiStr = formatDataISOAsseg(avui);

        const activesAvui = quotesPolissa.filter(function(q) {
            return q.data_inici_cobertura && q.data_fi_cobertura &&
                q.data_inici_cobertura <= avuiStr && q.data_fi_cobertura >= avuiStr;
        });
        if (activesAvui.length > 0) {
            return activesAvui.reduce(function(vigent, q) {
                return (!vigent || q.data_fi_cobertura > vigent.data_fi_cobertura) ? q : vigent;
            }, null).data_fi_cobertura;
        }

        return quotesPolissa.reduce(function(vigent, q) {
            if (!q.data_fi_cobertura) return vigent;
            if (!vigent || q.data_fi_cobertura > vigent) return q.data_fi_cobertura;
            return vigent;
        }, null);
    }

    const quotesPerPolissa = {};
    quotes.forEach(function(q) {
        (quotesPerPolissa[q.asseguranca_id] = quotesPerPolissa[q.asseguranca_id] || []).push(q);
    });

    // --- 1) RENOVACIÓ: X dies abans del venciment real (quota vigent avui) o, si no n'hi ha, data_venciment de la pòlissa ---
    polisses.forEach(function(p) {
        const dataVencimentRealStr = obtenirVencimentRealAssegPerAgenda(quotesPerPolissa[p.id]) || p.data_venciment;
        if (!dataVencimentRealStr) return;

        const dataVenciment = new Date(dataVencimentRealStr);
        const dataAvis = restarDiesAsseg(dataVenciment, ASSEG_DIES_AVIS_RENOVACIO);

        if (dataDinsRangDate(dataAvis, dataIniciObj, dataFiObj)) {
            const nomCompanyia = p.companyia || 'Companyia desconeguda';
            const etiquetaCategoria = p.categoria === 'civil' ? 'RC' : (p.tipus_polissa || 'Assegurança');

            esdeveniments.push({
                data: formatDataISOAsseg(dataAvis),
                tipus: 'asseg_renovacio',
                titol: 'Renovació a revisar — ' + nomCompanyia,
                detall: etiquetaCategoria + ' · ' + (p.num_polissa || '') + ' · venç el ' + formatData(dataVencimentRealStr),
                estat: 'avis',
                modulOrigen: 'assegurances',
                idOrigen: p.id + '-renovacio-' + dataVencimentRealStr,
                accioClick: ferClickAsseguranca(p.id, p.categoria)
            });
        }
    });

    // --- 2) PAGAMENT DE QUOTA: preavís + dia + escalat fins pagada ---
    quotes.forEach(function(q) {
        if (q.estat !== 'pendent' || !q.data_pagament) return;

        const polissa = polissesPerId[q.asseguranca_id];
        if (!polissa) return;

        const nomCompanyia = polissa.companyia || 'Companyia desconeguda';
        const dataPagament = new Date(q.data_pagament);

        function pushEventPagament(dataEventObj, tipusEvent, titolEvent) {
            esdeveniments.push({
                data: formatDataISOAsseg(dataEventObj),
                tipus: tipusEvent,
                titol: titolEvent + ' — ' + nomCompanyia,
                detall: (polissa.num_polissa || '') + ' · import ' + (q.prima_anual || 0) + ' € · previst ' + formatData(q.data_pagament),
                estat: 'avis',
                modulOrigen: 'assegurances',
                idOrigen: q.id + '-' + tipusEvent + '-' + formatDataISOAsseg(dataEventObj),
                accioClick: ferClickAsseguranca(polissa.id, polissa.categoria)
            });
        }

        // Preavís (un sol cop)
        const dataPreavis = restarDiesAsseg(dataPagament, ASSEG_DIES_AVIS_PAGAMENT);
        if (dataDinsRangDate(dataPreavis, dataIniciObj, dataFiObj)) {
            pushEventPagament(dataPreavis, 'asseg_pagament_proxim', 'Pagament proper');
        }

        // El dia mateix
        if (dataDinsRangDate(dataPagament, dataIniciObj, dataFiObj)) {
            pushEventPagament(dataPagament, 'asseg_pagament_venciment', 'Pagament avui');
        }

        // Escalat diari: des de l'endemà del venciment fins avui, mentre 'pendent'
        let cursor = sumarDiesAsseg(dataPagament, 1);
        while (cursor <= avui) {
            if (dataDinsRangDate(cursor, dataIniciObj, dataFiObj)) {
                pushEventPagament(cursor, 'asseg_pagament_vencut', 'Pagament vençut sense registrar');
            }
            cursor = sumarDiesAsseg(cursor, 1);
        }
    });

    return esdeveniments;
}

registrarProveidorAgenda(agendaProvider_assegurances);

console.log('✅ Assegurances Unificat v2 FINAL carregat (amb proveïdor d\'agenda)');