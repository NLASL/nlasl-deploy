// ============================================================
// CONTACTES v1 - Agenda de contactes d'urgència
// Fitxer: contactes.v1.js
// Afegir a index.html després de app_v8.js
//
// Funcions:
//  - Vista completa amb categories i cerca
//  - CRUD (crear, editar, eliminar)
//  - Trucada directa des del mòbil (tel: link)
//  - Bloc resum al dashboard (accés ràpid)
// ============================================================

const CATEGORIES_CONTACTES = {
    emergencies:   { icon: '🚨', label: 'Emergències',    color: '#f44336' },
    assegurances:  { icon: '🛡️', label: 'Assegurances',   color: '#9c27b0' },
    reparacions:   { icon: '🔧', label: 'Reparacions',    color: '#ff9800' },
    administracio: { icon: '📋', label: 'Administració',  color: '#2196f3' },
    cooperativa:   { icon: '🌾', label: 'Cooperativa',    color: '#4caf50' },
    veterinari:    { icon: '🐾', label: 'Veterinari',     color: '#00bcd4' },
    altres:        { icon: '📌', label: 'Altres',         color: '#607d8b' }
};

// ============================================================
// CRUD SUPABASE
// ============================================================

async function getContactes(nomesActius) {
    let query = supabaseClient
        .from('contactes')
        .select('*')
        .order('categoria')
        .order('ordre')
        .order('nom');
    if (nomesActius !== false) query = query.eq('actiu', true);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function createContacte(dades) {
    const { data, error } = await supabaseClient
        .from('contactes')
        .insert([{ ...dades, created_by: currentUser ? currentUser.id : null }])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateContacte(id, dades) {
    const { data, error } = await supabaseClient
        .from('contactes')
        .update({ ...dades, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteContacte(id) {
    const { error } = await supabaseClient
        .from('contactes')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// VISTA PRINCIPAL
// ============================================================

async function carregarVistaContactes() {
    const container = document.getElementById('view-container');
    const podeEditar = hasPermission('insert');

    let html = '<div class="view-contactes">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">';
    html += '<h2>📞 Agenda de Contactes</h2>';
    if (podeEditar) {
        html += '<button class="btn btn-primary" onclick="obrirModalContacte()">➕ Nou Contacte</button>';
    }
    html += '</div>';

    // Cerca i filtre categoria
    html += '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">';
    html += '<input type="text" id="contactes-cerca" placeholder="🔍 Cercar nom, telèfon..." oninput="filtrarContactes()" ';
    html += 'style="flex:1;min-width:200px;padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;">';
    html += '<select id="contactes-categoria" onchange="filtrarContactes()" ';
    html += 'style="padding:10px 14px;border:1px solid #ddd;border-radius:8px;font-size:14px;">';
    html += '<option value="">Totes les categories</option>';
    Object.entries(CATEGORIES_CONTACTES).forEach(function([key, cat]) {
        html += '<option value="' + key + '">' + cat.icon + ' ' + cat.label + '</option>';
    });
    html += '</select>';
    html += '</div>';

    // Contenidor contactes
    html += '<div id="contactes-grid"></div>';
    html += '</div>';

    // Modal
    html += crearModalContacte();

    container.innerHTML = html;
    await carregarGridContactes();
}

async function carregarGridContactes() {
    const grid = document.getElementById('contactes-grid');
    if (!grid) return;

    try {
        window._contactesTots = await getContactes();
        filtrarContactes();
    } catch (error) {
        grid.innerHTML = '<p style="color:red;">Error: ' + error.message + '</p>';
    }
}

function filtrarContactes() {
    const grid = document.getElementById('contactes-grid');
    if (!grid) return;

    const cerca = (document.getElementById('contactes-cerca')?.value || '').toLowerCase().trim();
    const categoria = document.getElementById('contactes-categoria')?.value || '';
    const podeEditar = hasPermission('insert');

    let contactes = window._contactesTots || [];

    if (cerca) {
        contactes = contactes.filter(function(c) {
            return (c.nom || '').toLowerCase().includes(cerca) ||
                   (c.persona || '').toLowerCase().includes(cerca) ||
                   (c.telefon1 || '').includes(cerca) ||
                   (c.telefon2 || '').includes(cerca) ||
                   (c.notes || '').toLowerCase().includes(cerca);
        });
    }

    if (categoria) {
        contactes = contactes.filter(function(c) { return c.categoria === categoria; });
    }

    if (contactes.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">No s\'han trobat contactes</div>';
        return;
    }

    // Agrupar per categoria
    const perCategoria = {};
    contactes.forEach(function(c) {
        if (!perCategoria[c.categoria]) perCategoria[c.categoria] = [];
        perCategoria[c.categoria].push(c);
    });

    let html = '';
    Object.entries(perCategoria).forEach(function([cat, llista]) {
        const info = CATEGORIES_CONTACTES[cat] || CATEGORIES_CONTACTES.altres;
        html += '<div style="margin-bottom:28px;">';
        html += '<h3 style="font-size:14px;font-weight:600;color:' + info.color + ';margin-bottom:12px;';
        html += 'text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid ' + info.color + ';padding-bottom:6px;">';
        html += info.icon + ' ' + info.label + '</h3>';
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;">';

        llista.forEach(function(c) {
            html += renderCardContacte(c, podeEditar);
        });

        html += '</div></div>';
    });

    grid.innerHTML = html;
}

function renderCardContacte(c, podeEditar) {
    const info = CATEGORIES_CONTACTES[c.categoria] || CATEGORIES_CONTACTES.altres;

    let html = '<div style="background:white;border:1px solid #eee;border-radius:10px;padding:16px;';
    html += 'border-left:4px solid ' + info.color + ';transition:box-shadow 0.2s;" ';
    html += 'onmouseover="this.style.boxShadow=\'0 2px 10px rgba(0,0,0,0.08)\'" ';
    html += 'onmouseout="this.style.boxShadow=\'none\'">';

    // Nom i persona
    html += '<div style="margin-bottom:10px;">';
    html += '<div style="font-weight:600;font-size:15px;color:#333;">' + (c.nom || '-') + '</div>';
    if (c.persona) {
        html += '<div style="font-size:13px;color:#666;margin-top:2px;">👤 ' + c.persona + '</div>';
    }
    html += '</div>';

    // Telèfons (clicables)
    if (c.telefon1) {
        html += '<a href="tel:' + c.telefon1.replace(/\s/g, '') + '" ';
        html += 'style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f0f7ff;';
        html += 'border-radius:6px;text-decoration:none;color:#1565c0;font-weight:500;margin-bottom:6px;">';
        html += '📞 ' + c.telefon1 + '</a>';
    }
    if (c.telefon2) {
        html += '<a href="tel:' + c.telefon2.replace(/\s/g, '') + '" ';
        html += 'style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f0f7ff;';
        html += 'border-radius:6px;text-decoration:none;color:#1565c0;font-weight:500;margin-bottom:6px;">';
        html += '📱 ' + c.telefon2 + '</a>';
    }

    // Email
    if (c.email) {
        html += '<a href="mailto:' + c.email + '" ';
        html += 'style="display:flex;align-items:center;gap:8px;font-size:13px;color:#555;text-decoration:none;margin-bottom:6px;">';
        html += '✉️ ' + c.email + '</a>';
    }

    // Notes
    if (c.notes) {
        html += '<div style="font-size:12px;color:#888;margin-top:8px;padding-top:8px;border-top:1px solid #f0f0f0;">';
        html += '📝 ' + c.notes + '</div>';
    }

    // Accions (només admin/editor)
    if (podeEditar) {
        html += '<div style="display:flex;gap:6px;margin-top:12px;padding-top:10px;border-top:1px solid #f5f5f5;">';
        html += '<button class="btn btn-sm btn-secondary" onclick="editarContacte(\'' + c.id + '\')">✏️ Editar</button>';
        html += '<button class="btn btn-sm btn-danger" onclick="eliminarContacteConfirm(\'' + c.id + '\',\'' + (c.nom || '').replace(/'/g, '') + '\')">🗑️</button>';
        html += '</div>';
    }

    html += '</div>';
    return html;
}

// ============================================================
// MODAL CREAR / EDITAR
// ============================================================

function crearModalContacte() {
    let html = '<div id="modal-contacte" class="modal" style="display:none;">';
    html += '<div class="modal-content" style="max-width:520px;">';
    html += '<span class="close" onclick="tancarModal(\'modal-contacte\')">&times;</span>';
    html += '<h2 id="modal-contacte-titol">Nou Contacte</h2>';
    html += '<form id="form-contacte" onsubmit="guardarContacte(event)">';
    html += '<input type="hidden" id="contacte-id">';

    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">';
    html += '<div class="form-group" style="grid-column:1/-1;"><label>Nom *</label>';
    html += '<input type="text" id="contacte-nom" required placeholder="ex: Corredor Assegurances"></div>';

    html += '<div class="form-group"><label>Persona de contacte</label>';
    html += '<input type="text" id="contacte-persona" placeholder="ex: Joan Martínez"></div>';

    html += '<div class="form-group"><label>Categoria *</label>';
    html += '<select id="contacte-categoria" required>';
    html += '<option value="">Seleccionar...</option>';
    Object.entries(CATEGORIES_CONTACTES).forEach(function([key, cat]) {
        html += '<option value="' + key + '">' + cat.icon + ' ' + cat.label + '</option>';
    });
    html += '</select></div>';

    html += '<div class="form-group"><label>Telèfon principal</label>';
    html += '<input type="tel" id="contacte-telefon1" placeholder="973 000 000"></div>';

    html += '<div class="form-group"><label>Telèfon secundari / mòbil</label>';
    html += '<input type="tel" id="contacte-telefon2" placeholder="657 000 000"></div>';

    html += '<div class="form-group" style="grid-column:1/-1;"><label>Email</label>';
    html += '<input type="email" id="contacte-email" placeholder="contacte@exemple.cat"></div>';

    html += '<div class="form-group" style="grid-column:1/-1;"><label>Notes</label>';
    html += '<textarea id="contacte-notes" rows="3" placeholder="Pòlissa nº, horari atenció, instruccions..."></textarea></div>';
    html += '</div>';

    html += '<div class="form-actions">';
    html += '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-contacte\')">Cancel·lar</button>';
    html += '<button type="submit" class="btn btn-primary">Guardar</button>';
    html += '</div></form></div></div>';
    return html;
}

function obrirModalContacte() {
    document.getElementById('modal-contacte-titol').textContent = 'Nou Contacte';
    document.getElementById('form-contacte').reset();
    document.getElementById('contacte-id').value = '';
    document.getElementById('modal-contacte').style.display = 'block';
}

async function editarContacte(id) {
    const contacte = (window._contactesTots || []).find(function(c) { return c.id === id; });
    if (!contacte) return;

    document.getElementById('modal-contacte-titol').textContent = 'Editar Contacte';
    document.getElementById('contacte-id').value = contacte.id;
    document.getElementById('contacte-nom').value = contacte.nom || '';
    document.getElementById('contacte-persona').value = contacte.persona || '';
    document.getElementById('contacte-categoria').value = contacte.categoria || '';
    document.getElementById('contacte-telefon1').value = contacte.telefon1 || '';
    document.getElementById('contacte-telefon2').value = contacte.telefon2 || '';
    document.getElementById('contacte-email').value = contacte.email || '';
    document.getElementById('contacte-notes').value = contacte.notes || '';
    document.getElementById('modal-contacte').style.display = 'block';
}

async function guardarContacte(event) {
    event.preventDefault();

    const id = document.getElementById('contacte-id').value;
    const dades = {
        nom:       document.getElementById('contacte-nom').value.trim(),
        persona:   document.getElementById('contacte-persona').value.trim() || null,
        categoria: document.getElementById('contacte-categoria').value,
        telefon1:  document.getElementById('contacte-telefon1').value.trim() || null,
        telefon2:  document.getElementById('contacte-telefon2').value.trim() || null,
        email:     document.getElementById('contacte-email').value.trim() || null,
        notes:     document.getElementById('contacte-notes').value.trim() || null
    };

    try {
        if (id) {
            await updateContacte(id, dades);
            mostrarNotificacio('✅ Contacte actualitzat', 'success');
        } else {
            await createContacte(dades);
            mostrarNotificacio('✅ Contacte creat', 'success');
        }
        tancarModal('modal-contacte');
        await carregarGridContactes();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function eliminarContacteConfirm(id, nom) {
    if (!confirm('Segur que vols eliminar "' + nom + '"?')) return;
    try {
        await deleteContacte(id);
        mostrarNotificacio('Contacte eliminat', 'success');
        await carregarGridContactes();
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}



console.log('✅ Contactes v1 carregat');