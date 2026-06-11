// ============================================================
// ALTRES ASSEGURANCES UI v1
// Mòdul complet: Immobilitzat + Altres Assegurances + Civil
// Estructura: Tabs + Taula + Modal
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
// FUNCIONS CRUD — IMMOBILITZAT MATERIAL
// ============================================================

async function getImmobilitzat() {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .select('*')
        .order('tipus, descripció');
    if (error) {
        console.error('Error carregant immobilitzat:', error);
        throw error;
    }
    return data || [];
}

async function createImmobilitzat(immobilitzat) {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .insert([immobilitzat])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateImmobilitzat(id, immobilitzat) {
    const { data, error } = await supabaseClient
        .from('immobilitzat_material')
        .update(immobilitzat)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteImmobilitzat(id) {
    const { error } = await supabaseClient
        .from('immobilitzat_material')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// FUNCIONS CRUD — ASSEGURANCES ALTRES
// ============================================================

async function getAssegurancesAltres(exercici = null) {
    let query = supabaseClient
        .from('assegurances_altres')
        .select('*');
    
    if (exercici) {
        query = query.eq('exercici', exercici);
    }
    
    query = query.order('data_venciment', { ascending: true });
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function createAssegurancaAltres(asseguranca) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .insert([asseguranca])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateAssegurancaAltres(id, asseguranca) {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .update(asseguranca)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteAssegurancaAltres(id) {
    const { error } = await supabaseClient
        .from('assegurances_altres')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// FUNCIONS CRUD — ASSEGURANCES CIVIL
// ============================================================

async function getAssegurancesCivil(exercici = null) {
    let query = supabaseClient
        .from('assegurances_civil')
        .select('*');
    
    if (exercici) {
        query = query.eq('exercici', exercici);
    }
    
    query = query.order('data_venciment', { ascending: true });
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function createAssegurancaCivil(asseguranca) {
    const { data, error } = await supabaseClient
        .from('assegurances_civil')
        .insert([asseguranca])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateAssegurancaCivil(id, asseguranca) {
    const { data, error } = await supabaseClient
        .from('assegurances_civil')
        .update(asseguranca)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteAssegurancaCivil(id) {
    const { error } = await supabaseClient
        .from('assegurances_civil')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// VISTA PRINCIPAL — ALTRES ASSEGURANCES
// ============================================================

async function carregarVistaAltresAssegurances() {
    try {
        exerciciSeleccionat = new Date().getFullYear();
        
        let html = `
            <div class="altres-assegurances-container">
                <!-- TABS -->
                <div class="assegurances-tabs">
                    <button class="tab-btn active" data-tab="immobilitzat">
                        🏗️ IMMOBILITZAT
                    </button>
                    <button class="tab-btn" data-tab="altres">
                        🛡️ ALTRES ASSEGURANCES
                    </button>
                    <button class="tab-btn" data-tab="civil">
                        ⚖️ RESPONSABILITAT CIVIL
                    </button>
                </div>
                
                <!-- CONTENT IMMOBILITZAT -->
                <div id="tab-immobilitzat" class="tab-content active">
                    <div id="immobilitzat-view"></div>
                </div>
                
                <!-- CONTENT ALTRES -->
                <div id="tab-altres" class="tab-content">
                    <div id="altres-view"></div>
                </div>
                
                <!-- CONTENT CIVIL -->
                <div id="tab-civil" class="tab-content">
                    <div id="civil-view"></div>
                </div>
            </div>
        `;
        
        document.getElementById('view-container').innerHTML = html;
        
        // Event listeners tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                
                e.target.classList.add('active');
                document.getElementById(`tab-${e.target.dataset.tab}`).classList.add('active');
                
                if (e.target.dataset.tab === 'immobilitzat') {
                    mostrarVistaImmobilitzat();
                } else if (e.target.dataset.tab === 'altres') {
                    mostrarVistaAltres();
                } else if (e.target.dataset.tab === 'civil') {
                    mostrarVistaCivil();
                }
            });
        });
        
        // Mostrar primer tab per defecte
        await mostrarVistaImmobilitzat();
        
    } catch (error) {
        console.error('Error carregant vista:', error);
        mostrarNotificacio('Error carregant altres assegurances: ' + error.message, 'error');
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
                <h2>🏗️ IMMOBILITZAT MATERIAL</h2>
                <button class="btn-nova-polissa" onclick="obrirModalNouImmobilitzat()">
                    ➕ Nou Immobilitzat
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
                            <th>Valor Actual</th>
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
            
            html += `
                    </tbody>
                </table>
            `;
        }
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error en mostrarVistaImmobilitzat:', error);
        document.getElementById('immobilitzat-view').innerHTML = 
            `<div class="error-message">Error carregant immobilitzat: ${error.message}</div>`;
    }
}

// ============================================================
// VISTA ALTRES ASSEGURANCES
// ============================================================

async function mostrarVistaAltres() {
    try {
        const container = document.getElementById('altres-view');
        
        let html = `
            <div class="assegurances-header">
                <h2>🛡️ ALTRES ASSEGURANCES</h2>
                <div class="assegurances-controls">
                    <select id="exercici-selector-altres" class="selector-campanya">
                        ${exercicisDisponibles.map(e => 
                            `<option value="${e}" ${e === exerciciSeleccionat ? 'selected' : ''}>Exercici ${e}</option>`
                        ).join('')}
                    </select>
                    <button class="btn-nova-polissa" onclick="obrirModalNovaAsseguranca()">
                        ➕ Nova Assegurança
                    </button>
                </div>
            </div>
        `;
        
        const assegurances = await getAssegurancesAltres(exerciciSeleccionat);
        assegurancesAltresCache = assegurances;
        
        if (assegurances.length === 0) {
            html += `<div class="no-data">Sense assegurances per aquest exercici</div>`;
        } else {
            html += `
                <table class="taula-standard">
                    <thead>
                        <tr>
                            <th>Companyia</th>
                            <th>Nº Pòlissa</th>
                            <th>Tipus</th>
                            <th>Risc/Immobilitzat</th>
                            <th>Data Venciment</th>
                            <th>Prima</th>
                            <th>Estat</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            assegurances.forEach(ass => {
                const dataVenciment = formatData(ass.data_venciment);
                const prima = (ass.prima_anual || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const estatBadge = `<span class="badge badge-${ass.estat?.toLowerCase()}">${ass.estat || '—'}</span>`;
                
                // Obtenir descripció del risc si té immobilitzat_id
                const immDescripcio = ass.immobilitzat_id ? 
                    (immobilizatCache.find(i => i.id === ass.immobilitzat_id)?.descripció || '—') : '—';
                
                html += `
                    <tr>
                        <td><strong>${ass.companyia}</strong></td>
                        <td>${ass.num_polissa}</td>
                        <td>${getTipusAssegurancaIcon(ass.tipus_polissa)} ${ass.tipus_polissa}</td>
                        <td>${immDescripcio}</td>
                        <td>${dataVenciment}</td>
                        <td>${prima}</td>
                        <td>${estatBadge}</td>
                        <td class="accions-cell">
                            <button class="btn-small btn-editar" onclick="obrirModalEditarAsseguranca('${ass.id}')">✏️</button>
                            <button class="btn-small btn-eliminar" onclick="eliminarAssegurancaConfirm('${ass.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
        }
        
        container.innerHTML = html;
        
        document.getElementById('exercici-selector-altres').addEventListener('change', (e) => {
            exerciciSeleccionat = parseInt(e.target.value);
            mostrarVistaAltres();
        });
        
    } catch (error) {
        console.error('Error en mostrarVistaAltres:', error);
        document.getElementById('altres-view').innerHTML = 
            `<div class="error-message">Error carregant assegurances: ${error.message}</div>`;
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
                <h2>⚖️ RESPONSABILITAT CIVIL</h2>
                <div class="assegurances-controls">
                    <select id="exercici-selector-civil" class="selector-campanya">
                        ${exercicisDisponibles.map(e => 
                            `<option value="${e}" ${e === exerciciSeleccionat ? 'selected' : ''}>Exercici ${e}</option>`
                        ).join('')}
                    </select>
                    <button class="btn-nova-polissa" onclick="obrirModalNovaCivil()">
                        ➕ Nova Pòlissa Civil
                    </button>
                </div>
            </div>
        `;
        
        const civil = await getAssegurancesCivil(exerciciSeleccionat);
        assegurancesCivilCache = civil;
        
        if (civil.length === 0) {
            html += `<div class="no-data">Sense pòlisses civils per aquest exercici</div>`;
        } else {
            html += `
                <table class="taula-standard">
                    <thead>
                        <tr>
                            <th>Tasca</th>
                            <th>Companyia</th>
                            <th>Nº Pòlissa</th>
                            <th>Data Venciment</th>
                            <th>Cobertura Mínima</th>
                            <th>Prima</th>
                            <th>Estat</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            civil.forEach(c => {
                const dataVenciment = formatData(c.data_venciment);
                const cobertura = (c.cobertura_minima || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const prima = (c.prima_anual || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' });
                const estatBadge = `<span class="badge badge-${c.estat?.toLowerCase()}">${c.estat || '—'}</span>`;
                
                html += `
                    <tr>
                        <td><strong>${getTascaIcon(c.tasca)} ${c.tasca}</strong></td>
                        <td>${c.companyia}</td>
                        <td>${c.num_polissa}</td>
                        <td>${dataVenciment}</td>
                        <td>${cobertura}</td>
                        <td>${prima}</td>
                        <td>${estatBadge}</td>
                        <td class="accions-cell">
                            <button class="btn-small btn-editar" onclick="obrirModalEditarCivil('${c.id}')">✏️</button>
                            <button class="btn-small btn-eliminar" onclick="eliminarCivilConfirm('${c.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            `;
        }
        
        container.innerHTML = html;
        
        document.getElementById('exercici-selector-civil').addEventListener('change', (e) => {
            exerciciSeleccionat = parseInt(e.target.value);
            mostrarVistaCivil();
        });
        
    } catch (error) {
        console.error('Error en mostrarVistaCivil:', error);
        document.getElementById('civil-view').innerHTML = 
            `<div class="error-message">Error carregant pòlisses civils: ${error.message}</div>`;
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

// ============================================================
// MODALS PLACEHOLDERS (implementar en següent fase)
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
    if (!confirm('¿Segur que vols eliminar aquest immobilitzat?')) return;
    try {
        await deleteImmobilitzat(id);
        mostrarNotificacio('✅ Immobilitzat eliminat', 'success');
        mostrarVistaImmobilitzat();
    } catch (error) {
        mostrarNotificacio('Error eliminant: ' + error.message, 'error');
    }
}

async function eliminarAssegurancaConfirm(id) {
    if (!confirm('¿Segur que vols eliminar aquesta assegurança?')) return;
    try {
        await deleteAssegurancaAltres(id);
        mostrarNotificacio('✅ Assegurança eliminada', 'success');
        mostrarVistaAltres();
    } catch (error) {
        mostrarNotificacio('Error eliminant: ' + error.message, 'error');
    }
}

async function eliminarCivilConfirm(id) {
    if (!confirm('¿Segur que vols eliminar aquesta pòlissa civil?')) return;
    try {
        await deleteAssegurancaCivil(id);
        mostrarNotificacio('✅ Pòlissa civil eliminada', 'success');
        mostrarVistaCivil();
    } catch (error) {
        mostrarNotificacio('Error eliminant: ' + error.message, 'error');
    }
}

console.log('✅ Altres Assegurances UI v1 carregat');
