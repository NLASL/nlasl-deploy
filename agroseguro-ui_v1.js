// ============================================================
// AGROSEGURO UI v1
// Mòdul complet: Agroseguro + Altres Assegurances
// Estructura: Tabs + Taula pòlisses + Modal detalls
// ============================================================

// ============================================================
// VARIABLES GLOBALS
// ============================================================

let polissesCache = [];
let parcellesCache = [];
let sinistresCache = [];
let campanyaSeleccionadaAsegurances = 2026;
const campanyesDisponibles = [2026, 2025, 2024]; // actualitzar dinàmicament

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
    const polissaAudit = {
        ...polissa,
        created_by: currentUser ? currentUser.id : null,
        created_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('agroseguro_polisses')
        .insert([polissaAudit])
        .select();
    if (error) throw error;
    return data[0];
}

async function updatePolissa(id, polissa) {
    const polissaAudit = {
        ...polissa,
        updated_by: currentUser ? currentUser.id : null,
        updated_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('agroseguro_polisses')
        .update(polissaAudit)
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
        .select('*, parcelles(nom, finca)')
        .eq('polissa_id', polissaId)
        .order('num_parcella');
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
        .order('data_sinistra', { ascending: false });
    if (error) throw error;
    return data || [];
}

// ============================================================
// VISTA PRINCIPAL — ASSEGURANCES
// ============================================================

async function carregarVistaAssegurances() {
    try {
        // Detectar campanya actual dinàmicament
        campanyaSeleccionadaAsegurances = obtenirCampanyaActual();
        
        // Mostrar contenidor principal
        let html = `
            <div class="assegurances-container">
                <!-- TABS -->
                <div class="assegurances-tabs">
                    <button class="tab-btn active" data-tab="agroseguro">
                        🌾 AGROSEGURO
                    </button>
                    <button class="tab-btn" data-tab="altres-assegurances">
                        🚚 ALTRES ASSEGURANCES
                    </button>
                </div>
                
                <!-- CONTENT AGROSEGURO -->
                <div id="tab-agroseguro" class="tab-content active">
                    <div id="agroseguro-view"></div>
                </div>
                
                <!-- CONTENT ALTRES ASSEGURANCES -->
                <div id="tab-altres-assegurances" class="tab-content">
                    <div id="altres-assegurances-view"></div>
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
                
                if (e.target.dataset.tab === 'agroseguro') {
                    mostrarVistaAgroseguro();
                } else {
                    mostrarVistaAltresAssegurances();
                }
            });
        });
        
        // Mostrar tab Agroseguro per defecte
        await mostrarVistaAgroseguro();
        
    } catch (error) {
        console.error('Error carregant vista assegurances:', error);
        mostrarNotificacio('Error carregant assegurances: ' + error.message, 'error');
    }
}

// ============================================================
// VISTA AGROSEGURO
// ============================================================

async function mostrarVistaAgroseguro() {
    try {
        const container = document.getElementById('agroseguro-view');
        
        // Header amb selector campanya
        let html = `
            <div class="assegurances-header">
                <h2>🌾 AGROSEGURO</h2>
                <div class="agroseguro-controls">
                    <select id="campanya-selector" class="selector-campanya">
                        ${campanyesDisponibles.map(c => 
                            `<option value="${c}" ${c === campanyaSeleccionadaAsegurances ? 'selected' : ''}>Campanya ${c}</option>`
                        ).join('')}
                    </select>
                    <button class="btn-nova-polissa" onclick="obrirModalNovaPolissa()">
                        ➕ Nova Pòlissa
                    </button>
                </div>
            </div>
        `;
        
        // Carregà pòlisses de la campanya seleccionada
        const polisses = await getPolisses({ campanya: campanyaSeleccionadaAsegurances });
        polissesCache = polisses;
        
        // Agrupar per linia
        const agrupat = agruparPolisses(polisses);
        
        // Renderitzar grups de linia
        for (const [linia, polissesLinia] of Object.entries(agrupat)) {
            html += renderizarGrupLinia(linia, polissesLinia);
        }
        
        // Si no hi ha pòlisses
        if (polisses.length === 0) {
            html += `<div class="no-data">Sense pòlisses contractades per aquesta campanya</div>`;
        }
        
        container.innerHTML = html;
        
        // Event listener selector campanya
        document.getElementById('campanya-selector').addEventListener('change', (e) => {
            campanyaSeleccionadaAsegurances = parseInt(e.target.value);
            mostrarVistaAgroseguro();
        });
        
    } catch (error) {
        console.error('Error en mostrarVistaAgroseguro:', error);
        document.getElementById('agroseguro-view').innerHTML = 
            `<div class="error-message">Error carregant dades: ${error.message}</div>`;
    }
}

// ============================================================
// VISTA ALTRES ASSEGURANCES (placeholder)
// ============================================================

async function mostrarVistaAltresAssegurances() {
    try {
        const container = document.getElementById('altres-assegurances-view');
        
        let html = `
            <div class="assegurances-header">
                <h2>🚚 ALTRES ASSEGURANCES</h2>
                <button class="btn-nova-asseguranca" onclick="obrirModalNovaAsseguranca()">
                    ➕ Nova Assegurança
                </button>
            </div>
            
            <div class="info-message">
                ⚙️ Secció en desenvolupament<br>
                Responsabilitat Civil | Tractors | Remolcs | Altres vehicles
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Error en mostrarVistaAltresAssegurances:', error);
        document.getElementById('altres-assegurances-view').innerHTML = 
            `<div class="error-message">Error: ${error.message}</div>`;
    }
}

// ============================================================
// UTILITATS — AGRUPACIÓ I RENDERING
// ============================================================

function agruparPolisses(polisses) {
    const agrupat = {};
    
    polisses.forEach(polissa => {
        const linia = polissa.linia || 'SENSE LINIA';
        if (!agrupat[linia]) {
            agrupat[linia] = [];
        }
        agrupat[linia].push(polissa);
    });
    
    return agrupat;
}

function renderizarGrupLinia(linia, polissesLinia) {
    // Agrupar per categoria (PRINCIPAL | COMPLEMENTARIA)
    const principal = polissesLinia.filter(p => p.categoria === 'PRINCIPAL' || !p.categoria);
    const complementaria = polissesLinia.filter(p => p.categoria === 'COMPLEMENTARIA');
    
    let html = `<div class="linia-group">`;
    
    // Header linia
    html += `
        <div class="linia-header">
            <h3>${getLliniaIcon(linia)} ${linia}</h3>
        </div>
    `;
    
    // Pòlisses PRINCIPAL
    if (principal.length > 0) {
        html += `<div class="polisses-grupo principal">`;
        principal.forEach(p => {
            html += renderizarTarjetaPolissa(p, 'PRINCIPAL');
        });
        html += `</div>`;
    }
    
    // Pòlisses COMPLEMENTARIA
    if (complementaria.length > 0) {
        html += `<div class="polisses-grupo complementaria">`;
        complementaria.forEach(p => {
            html += renderizarTarjetaPolissa(p, 'COMPLEMENTARIA');
        });
        html += `</div>`;
    }
    
    html += `</div>`;
    return html;
}

function renderizarTarjetaPolissa(polissa, tipus) {
    const dataInici = formatData(polissa.data_vigor);
    const cobertura = (polissa.capital_assegurat_total || 0).toLocaleString('ca-ES', { 
        style: 'currency', 
        currency: 'EUR' 
    });
    const produccio = polissa.produccio_total_kg ? `${(polissa.produccio_total_kg / 1000).toFixed(1)} T` : '—';
    
    const categoriaBadge = tipus === 'COMPLEMENTARIA' ? 
        '<span class="badge-complementaria">COMPLEMENTARIA</span>' : '';
    
    return `
        <div class="polissa-card ${tipus.toLowerCase()}">
            <div class="polissa-header">
                <div class="polissa-titulo">
                    <strong>${polissa.num_polissa}</strong>
                    ${categoriaBadge}
                </div>
                <div class="polissa-ref">Ref: ${polissa.ref_collectiu || '—'}</div>
            </div>
            
            <div class="polissa-datos">
                <div class="dato">
                    <span class="label">Data inici:</span>
                    <span class="valor">${dataInici}</span>
                </div>
                <div class="dato">
                    <span class="label">Producció declarada:</span>
                    <span class="valor">${produccio}</span>
                </div>
                <div class="dato">
                    <span class="label">Cobertura total:</span>
                    <span class="valor">${cobertura}</span>
                </div>
            </div>
            
            <div class="polissa-accions">
                <button class="btn-small btn-veure" onclick="obrirModalPolissa('${polissa.id}')">
                    👁️ Veure
                </button>
                <button class="btn-small btn-editar" onclick="obrirModalEditarPolissa('${polissa.id}')">
                    ✏️ Editar
                </button>
                <button class="btn-small btn-eliminar" onclick="eliminarPolissaConfirm('${polissa.id}')">
                    🗑️ Eliminar
                </button>
            </div>
        </div>
    `;
}

function getLliniaIcon(linia) {
    const icons = {
        'FRUTALAS': '🍑',
        'FRUITA': '🍑',
        'CEREAL': '🌾',
        'ORDI': '🌾',
        'BLAT': '🌾'
    };
    return icons[linia] || '📋';
}

// ============================================================
// MODALS — PÒLISSA
// ============================================================

async function obrirModalPolissa(polissaId) {
    try {
        // Carregà dades pòlissa
        const polissa = polissesCache.find(p => p.id === polissaId);
        if (!polissa) throw new Error('Pòlissa no trobada');
        
        // Carregà parcelles i sinistres
        const parcelles = await getParcellesAgroseguro(polissaId);
        const sinistres = await getSinistresAgroseguro(polissaId);
        
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'modal-polissa-detalls';
        
        const dataInici = formatData(polissa.data_vigor);
        const dataVenciment = formatData(polissa.data_venciment);
        
        modal.innerHTML = `
            <div class="modal-content modal-gran">
                <div class="modal-header">
                    <h2>📋 ${polissa.num_polissa}</h2>
                    <button class="modal-close" onclick="tancarModal('modal-polissa-detalls')">✕</button>
                </div>
                
                <div class="modal-body">
                    <!-- Dades pòlissa -->
                    <section class="seccion">
                        <h3>Dades Pòlissa</h3>
                        <div class="datos-grid">
                            <div class="dato-item">
                                <span class="label">Referència collectiva:</span>
                                <span class="valor">${polissa.ref_collectiu || '—'}</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Num. rebut:</span>
                                <span class="valor">${polissa.num_rebut || '—'}</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Data vigor:</span>
                                <span class="valor">${dataInici}</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Data venciment:</span>
                                <span class="valor">${dataVenciment}</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Linia:</span>
                                <span class="valor">${polissa.linia}</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Pla:</span>
                                <span class="valor">${polissa.pla}</span>
                            </div>
                        </div>
                    </section>
                    
                    <!-- Finances -->
                    <section class="seccion">
                        <h3>Finances</h3>
                        <div class="datos-grid">
                            <div class="dato-item">
                                <span class="label">Prima comercial:</span>
                                <span class="valor">${(polissa.prima_comercial || 0).toFixed(2)} €</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Prima neta:</span>
                                <span class="valor">${(polissa.prima_neta || 0).toFixed(2)} €</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Subvencio ENESA:</span>
                                <span class="valor">${(polissa.subvencio_enesa || 0).toFixed(2)} €</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Subvencio CA:</span>
                                <span class="valor">${(polissa.subvencio_ca || 0).toFixed(2)} €</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Cost tomador:</span>
                                <span class="valor">${(polissa.cost_tomador || 0).toFixed(2)} €</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Capital assegurat total:</span>
                                <span class="valor strong">${(polissa.capital_assegurat_total || 0).toLocaleString('ca-ES', { style: 'currency', currency: 'EUR' })}</span>
                            </div>
                        </div>
                    </section>
                    
                    <!-- Producció -->
                    <section class="seccion">
                        <h3>Producció</h3>
                        <div class="datos-grid">
                            <div class="dato-item">
                                <span class="label">Producció total:</span>
                                <span class="valor">${polissa.produccio_total_kg ? (polissa.produccio_total_kg / 1000).toFixed(2) + ' T' : '—'}</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Superfície total:</span>
                                <span class="valor">${polissa.superficie_total_ha ? polissa.superficie_total_ha.toFixed(2) + ' Ha' : '—'}</span>
                            </div>
                            <div class="dato-item">
                                <span class="label">Parcel·les:</span>
                                <span class="valor">${polissa.num_parcelles || 0}</span>
                            </div>
                        </div>
                    </section>
                    
                    <!-- Parcelles -->
                    <section class="seccion">
                        <h3>Parcel·les Assegurades (${parcelles.length})</h3>
                        ${parcelles.length > 0 ? renderizarTaulaParcelles(parcelles) : '<p class="no-data">Sense parcel·les</p>'}
                    </section>
                    
                    <!-- Sinistres -->
                    <section class="seccion">
                        <h3>Sinistres (${sinistres.length})</h3>
                        ${sinistres.length > 0 ? renderizarTaulaSinistres(sinistres) : '<p class="no-data">Sense sinistres</p>'}
                    </section>
                    
                    <!-- Observacions -->
                    ${polissa.observacions ? `
                        <section class="seccion">
                            <h3>Observacions</h3>
                            <p>${polissa.observacions}</p>
                        </section>
                    ` : ''}
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="tancarModal('modal-polissa-detalls')">
                        Tancar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) tancarModal('modal-polissa-detalls');
        });
        
    } catch (error) {
        mostrarNotificacio('Error obrint modal: ' + error.message, 'error');
    }
}

function renderizarTaulaParcelles(parcelles) {
    let html = `
        <table class="taula-standard">
            <thead>
                <tr>
                    <th>Parcel·la</th>
                    <th>Finca</th>
                    <th>Producció (kg)</th>
                    <th>Producció Complementaria (kg)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    parcelles.forEach(p => {
        html += `
            <tr>
                <td>${p.num_parcella || '—'}</td>
                <td>${p.parcelles?.nom || '—'}</td>
                <td>${p.produccio_kg ? p.produccio_kg.toLocaleString('ca-ES') : '—'}</td>
                <td>${p.produccio_complementaria_kg ? p.produccio_complementaria_kg.toLocaleString('ca-ES') : '—'}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    return html;
}

function renderizarTaulaSinistres(sinistres) {
    let html = `
        <table class="taula-standard">
            <thead>
                <tr>
                    <th>Data Sinistra</th>
                    <th>Descripció</th>
                    <th>Import Reclamat</th>
                    <th>Estat</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sinistres.forEach(s => {
        const dataSinistra = formatData(s.data_sinistra);
        const import_reclamat = (s.import_reclamat || 0).toLocaleString('ca-ES', { 
            style: 'currency', 
            currency: 'EUR' 
        });
        
        html += `
            <tr>
                <td>${dataSinistra}</td>
                <td>${s.descripcio || '—'}</td>
                <td>${import_reclamat}</td>
                <td><span class="badge badge-${s.estat?.toLowerCase()}">${s.estat || '—'}</span></td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    return html;
}

// ============================================================
// MODALS — NOVA/EDITAR PÒLISSA (placeholders)
// ============================================================

function obrirModalNovaPolissa() {
    mostrarNotificacio('Modal nova pòlissa — A implementar', 'info');
}

function obrirModalEditarPolissa(polissaId) {
    mostrarNotificacio('Modal editar pòlissa — A implementar', 'info');
}

function obrirModalNovaAsseguranca() {
    mostrarNotificacio('Modal nova assegurança — A implementar', 'info');
}

// ============================================================
// ELIMINAR PÒLISSA (amb confirmació)
// ============================================================

async function eliminarPolissaConfirm(polissaId) {
    if (!confirm('¿Segur que vols eliminar aquesta pòlissa?')) return;
    
    try {
        await deletePolissa(polissaId);
        mostrarNotificacio('Pòlissa eliminada correctament', 'success');
        mostrarVistaAgroseguro();
    } catch (error) {
        mostrarNotificacio('Error eliminant pòlissa: ' + error.message, 'error');
    }
}

// ============================================================
// AUXILIAR — Detectar campanya actual (si no existeix)
// ============================================================

function obtenirCampanyaActual() {
    return new Date().getFullYear();  // Sempre retorna any actual
}
    
console.log('✅ Agroseguro UI v1 carregat');
