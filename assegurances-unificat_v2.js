// ============================================================
// ASSEGURANCES UNIFICAT v2
// Vista principal: Agroseguro + Altres Assegurances
// Dins Altres: Immobilitzat + Altres Assegurances + Responsabilitat Civil
// ============================================================

// ============================================================
// VARIABLES GLOBALS
// ============================================================

let immobilizatCache = [];
let assegurancesAltresCache = [];
let assegurancesCivilCache = [];
let exerciciSeleccionat = new Date().getFullYear();
const exercicisDisponibles = [2026, 2025, 2024, 2023];

// ============================================================
// CARREGA VISTA PRINCIPAL ASSEGURANCES
// ============================================================

async function carregarVistaAssegurances() {
    try {
        let html = `
            <div class="assegurances-container">
                <!-- TABS PRINCIPALS -->
                <div class="assegurances-tabs-main">
                    <button class="tab-btn-main active" data-tab="agroseguro">
                        🍑 Agroseguro
                    </button>
                    <button class="tab-btn-main" data-tab="altres">
                        🛡️ Altres assegurances
                    </button>
                </div>
                
                <!-- TAB AGROSEGURO -->
                <div id="tab-agroseguro-main" class="tab-content-main active">
                    <div id="agroseguro-view"></div>
                </div>
                
                <!-- TAB ALTRES ASSEGURANCES (amb sub-tabs) -->
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
        
        // Event listeners tabs principals
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
        
        // Event listeners tabs secundaris
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
        
        // Mostrar primer tab
        await mostrarVistaAgroseguro();
        
    } catch (error) {
        console.error('Error carregant vista assegurances:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// FUNCIONS CRUD — QUOTES ALTRES ASSEGURANCES
// ============================================================

async function getQuotesAltres(assegurancaId) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .select('*')
        .eq('asseguranca_id', assegurancaId)
        .order('exercici', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function createQuotaAltra(quota) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .insert([quota])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateQuotaAltra(id, quota) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres_quotes')
        .update(quota)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

// ============================================================
// FUNCIONS CRUD — QUOTES RESPONSABILITAT CIVIL
// ============================================================

async function getQuotesCivil(assegurancaCivilId) {
    const { data, error } = await supabaseClient
        .from('assegurances_civil_quotes')
        .select('*')
        .eq('asseguranca_civil_id', assegurancaCivilId)
        .order('exercici', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function createQuotaCivil(quota) {
    const { data, error } = await supabaseClient
        .from('assegurances_civil_quotes')
        .insert([quota])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateQuotaCivil(id, quota) {
    const { data, error } = await supabaseClient
        .from('assegurances_civil_quotes')
        .update(quota)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
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
            html += `
                <div class="cards-grid">
            `;
            
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
            html += `
                <div class="cards-grid">
            `;
            
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
// MODALS DETALL (placeholders — implementar FASE 3)
// ============================================================

async function obrirModalDetallAsseguranca(assegurancaId) {
    mostrarNotificacio('Modal detall assegurança — A implementar', 'info');
}

async function obrirModalDetallCivil(civilId) {
    mostrarNotificacio('Modal detall pòlissa civil — A implementar', 'info');
}

// ============================================================
// MODALS CRUD (placeholders)
// ============================================================

function obrirModalNouImmobilitzat() {
    mostrarNotificacio('Modal nou immobilitzat — A implementar', 'info');
}

function obrirModalEditarImmobilitzat(id) {
    mostrarNotificacio('Modal editar immobilitzat — A implementar', 'info');
}

function obrirModalNovaAsseguranca() {
    mostrarNotificacio('Modal nova assegurança — A implementar', 'info');
}

function obrirModalEditarAsseguranca(id) {
    mostrarNotificacio('Modal editar assegurança — A implementar', 'info');
}

function obrirModalNovaCivil() {
    mostrarNotificacio('Modal nova pòlissa civil — A implementar', 'info');
}

function obrirModalEditarCivil(id) {
    mostrarNotificacio('Modal editar civil — A implementar', 'info');
}

// ============================================================
// ELIMINAR (amb confirmació)
// ============================================================

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

// ============================================================
// UTILITATS — ICONES I FORMATACIÓ
// ============================================================

function getTipusIcon(tipus) {
    const icons = {
        'edifici': '🏢',
        'infraestructura_reg': '💧',
        'tractor': '🚜',
        'vehicle': '🚗',
        'remolc': '🚜',
        'maquinaria': '⚙️',
        'altra': '📦'
    };
    return icons[tipus] || '📦';
}

function getTipusAssegurancaIcon(tipus) {
    const icons = {
        'auto': '🚗',
        'accidents': '⚠️',
        'impagament': '💳',
        'incendi': '🔥',
        'proteccio_juridica': '⚖️',
        'RC': '🛡️',
        'robatori': '🔐',
        'salut_laboral': '👷',
        'viatges': '✈️',
        'vida': '❤️',
        'altra': '📋'
    };
    return icons[tipus] || '📋';
}

function getTascaIcon(tasca) {
    const icons = {
        'agrícola': '🌾',
        'construcció': '🏗️'
    };
    return icons[tasca] || '📋';
}

console.log('✅ Assegurances Unificat v2 carregat');
