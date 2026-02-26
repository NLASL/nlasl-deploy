// ============================================================
// ADMIN PANEL - Gestió d'accessos de treballadors
// Fitxer: admin-panel.v1.js
// Afegir a index.html DESPRÉS de horari-extensions.v1.js
//
// Funcions:
//  - Modal accessible només per admin
//  - Crear usuari + vincular treballador
//  - Resetar contrasenya
//  - Activar / desactivar accés
// ============================================================

const EDGE_FUNCTION_URL = 'https://xnxoufpizdtfklfjwqet.supabase.co/functions/v1/admin-users';

// ============================================================
// CRIDA A L'EDGE FUNCTION (helper)
// ============================================================
async function criarAdminUsers(action, params) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) throw new Error('No hi ha sessió activa');

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({ action, ...params })
    });

    const result = await response.json();
    if (!response.ok || result.error) {
        throw new Error(result.error || 'Error desconegut');
    }
    return result;
}

// ============================================================
// BOTÓ D'ADMIN: Injectat quan es carrega la vista treballadors
// S'activa via event després que app.v8.js hagi renderitzat la vista
// ============================================================

// Observador que detecta quan apareix la vista de treballadors
// i hi afegeix el botó d'admin sense fer patch de la funció original
function injectarBotoAdmin() {
    if (!currentUserProfile || currentUserProfile.role !== 'admin') return;
    if (document.getElementById('btn-gestio-accessos')) return;

    const header = document.querySelector('.view-treballadors > div:first-child');
    if (!header) return;

    const btn = document.createElement('button');
    btn.id = 'btn-gestio-accessos';
    btn.className = 'btn btn-secondary';
    btn.innerHTML = '🔐 Gestió d\'accessos';
    btn.onclick = obrirModalGestioAccessos;
    header.appendChild(btn);
}

// Observar canvis al DOM per detectar quan es carrega la vista
const _adminObserver = new MutationObserver(function() {
    if (document.querySelector('.view-treballadors')) {
        injectarBotoAdmin();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('view-container');
    if (container) {
        _adminObserver.observe(container, { childList: true, subtree: false });
    }
});

// ============================================================
// MODAL GESTIÓ D'ACCESSOS
// ============================================================

function obrirModalGestioAccessos() {
    if (!currentUserProfile || currentUserProfile.role !== 'admin') {
        mostrarNotificacio('Accés denegat', 'error');
        return;
    }

    // Crear modal si no existeix
    if (!document.getElementById('modal-gestio-accessos')) {
        const div = document.createElement('div');
        div.innerHTML = crearModalGestioAccessos();
        document.body.appendChild(div.firstChild);
    }

    carregarTaulaAccessos();
    document.getElementById('modal-gestio-accessos').style.display = 'block';
}

function crearModalGestioAccessos() {
    return `
    <div id="modal-gestio-accessos" class="modal" style="display:none;">
        <div class="modal-content" style="max-width:750px;">
            <span class="close" onclick="tancarModal('modal-gestio-accessos')">&times;</span>
            <h2>🔐 Gestió d'accessos de treballadors</h2>
            <p style="color:#666;margin-bottom:20px;">
                Aquí pots crear, activar/desactivar i resetar contrasenyes dels treballadors propis.
            </p>

            <!-- Taula d'accessos -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Treballador</th>
                            <th>Email accés</th>
                            <th>Estat accés</th>
                            <th>Accions</th>
                        </tr>
                    </thead>
                    <tbody id="tbody-accessos">
                        <tr><td colspan="4">Carregant...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Formulari crear/editar -->
            <div id="form-acces-container" style="display:none; margin-top:24px; 
                 background:#f5f5f5; padding:20px; border-radius:8px;">
                <h3 id="form-acces-titol" style="margin-top:0;">Crear accés</h3>
                <form id="form-acces" onsubmit="guardarAcces(event)">
                    <input type="hidden" id="acces-treballador-id">
                    <input type="hidden" id="acces-auth-user-id">
                    <input type="hidden" id="acces-accio">

                    <div id="hint-acces-defecte" style="display:none; background:#e8f5e9; padding:10px 14px; border-radius:6px; margin-bottom:14px; font-size:13px; color:#2e7d32;"></div>

                    <div class="form-group" id="group-acces-email">
                        <label>Email d'accés *</label>
                        <input type="email" id="acces-email" placeholder="treb01@nlasl.temp">
                        <small style="color:#999;">Recomanat: treb01@nlasl.temp, treb02@nlasl.temp...</small>
                    </div>

                    <div class="form-group" id="group-acces-password">
                        <label id="label-acces-password">Contrasenya *</label>
                        <div style="position:relative;">
                            <input type="password" id="acces-password" 
                                   placeholder="Mínim 6 caràcters"
                                   style="padding-right:40px;">
                            <button type="button" 
                                    onclick="togglePasswordVisibility('acces-password')"
                                    style="position:absolute;right:8px;top:50%;transform:translateY(-50%);
                                           background:none;border:none;cursor:pointer;font-size:16px;">
                                👁️
                            </button>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" 
                                onclick="document.getElementById('form-acces-container').style.display='none'">
                            Cancel·lar
                        </button>
                        <button type="submit" id="btn-guardar-acces" class="btn btn-primary">
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>`;
}

// ============================================================
// CARREGAR TAULA D'ACCESSOS
// ============================================================

async function carregarTaulaAccessos() {
    const tbody = document.getElementById('tbody-accessos');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4">Carregant...</td></tr>';

    try {
        // Obtenir treballadors propis amb el seu estat d'accés
        const treballadorsPropisActius = treballadors.filter(function(t) {
            return t.tipus === 'Propi' && t.actiu;
        });

        if (treballadorsPropisActius.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hi ha treballadors propis actius</td></tr>';
            return;
        }

        // Obtenir info dels usuaris Auth via consulta a taula users
        const authUserIds = treballadorsPropisActius
            .filter(function(t) { return t.auth_user_id; })
            .map(function(t) { return t.auth_user_id; });

        let usersInfo = {};
        if (authUserIds.length > 0) {
            const { data: usersData } = await supabaseClient
                .from('users')
                .select('id, email')
                .in('id', authUserIds);
            
            if (usersData) {
                usersData.forEach(function(u) { usersInfo[u.id] = u; });
            }
        }

        tbody.innerHTML = treballadorsPropisActius.map(function(t) {
            const teAcces = !!t.auth_user_id;
            const userInfo = t.auth_user_id ? usersInfo[t.auth_user_id] : null;
            const email = userInfo ? userInfo.email : '-';

            let estatBadge = '';
            let accions = '';

            if (!teAcces) {
                estatBadge = '<span style="background:#9e9e9e;color:white;padding:4px 8px;border-radius:4px;font-size:12px;">⚪ Sense accés</span>';
                accions = `<button class="btn btn-sm btn-primary" 
                    onclick="obrirFormCrearAcces('${t.id}', '${t.nom}')">
                    ➕ Crear accés</button>`;
            } else {
                estatBadge = '<span style="background:#4caf50;color:white;padding:4px 8px;border-radius:4px;font-size:12px;">🟢 Actiu</span>';
                accions = `
                    <button class="btn btn-sm btn-secondary" 
                        onclick="obrirFormResetPassword('${t.id}', '${t.nom}', '${t.auth_user_id}')">
                        🔑 Reset password</button>
                    <button class="btn btn-sm btn-danger" style="margin-left:4px;"
                        onclick="confirmarDesactivarAcces('${t.id}', '${t.nom}', '${t.auth_user_id}', false)">
                        🚫 Desactivar</button>`;
            }

            return `<tr>
                <td><strong>${t.nom}</strong><br>
                    <small style="color:#999;">${t.codi_usuari || ''}</small></td>
                <td>${email}</td>
                <td>${estatBadge}</td>
                <td>${accions}</td>
            </tr>`;
        }).join('');

    } catch (error) {
        console.error('Error carregant accessos:', error);
        tbody.innerHTML = '<tr><td colspan="4" style="color:red;">Error: ' + error.message + '</td></tr>';
    }
}

// ============================================================
// OBRIR FORMULARIS
// ============================================================

function obrirFormCrearAcces(treballadorId, nomTreballador) {
    // Buscar el treballador per obtenir el codi_usuari
    const treballador = treballadors.find(function(t) { return t.id === treballadorId; });
    const codi = treballador && treballador.codi_usuari ? treballador.codi_usuari : '';

    // Autocompletar email i password per defecte
    const emailDefecte = codi ? codi.toLowerCase() + '@nlasl.temp' : '';
    const passwordDefecte = codi ? codi.toUpperCase() + '2025!' : '';

    document.getElementById('form-acces-titol').textContent = '➕ Crear accés per a ' + nomTreballador;
    document.getElementById('acces-treballador-id').value = treballadorId;
    document.getElementById('acces-auth-user-id').value = '';
    document.getElementById('acces-accio').value = 'create_user';
    document.getElementById('acces-email').value = emailDefecte;
    document.getElementById('acces-password').value = passwordDefecte;
    document.getElementById('label-acces-password').textContent = 'Contrasenya *';
    document.getElementById('group-acces-email').style.display = 'block';
    document.getElementById('group-acces-password').style.display = 'block';
    document.getElementById('btn-guardar-acces').textContent = 'Crear accés';

    // Mostrar hint amb els valors per defecte
    const hint = document.getElementById('hint-acces-defecte');
    if (hint && codi) {
        hint.innerHTML = '💡 Valors per defecte generats a partir del codi <strong>' + codi + '</strong>. Modifica si cal.';
        hint.style.display = 'block';
    }

    document.getElementById('form-acces-container').style.display = 'block';
    document.getElementById('acces-email').focus();
}

function obrirFormResetPassword(treballadorId, nomTreballador, authUserId) {
    document.getElementById('form-acces-titol').textContent = '🔑 Reset contrasenya: ' + nomTreballador;
    document.getElementById('acces-treballador-id').value = treballadorId;
    document.getElementById('acces-auth-user-id').value = authUserId;
    document.getElementById('acces-accio').value = 'reset_password';
    document.getElementById('acces-password').value = '';
    document.getElementById('label-acces-password').textContent = 'Nova contrasenya *';
    document.getElementById('group-acces-email').style.display = 'none';
    document.getElementById('group-acces-password').style.display = 'block';
    document.getElementById('btn-guardar-acces').textContent = 'Canviar contrasenya';
    document.getElementById('form-acces-container').style.display = 'block';
    document.getElementById('acces-password').focus();
}

async function confirmarDesactivarAcces(treballadorId, nomTreballador, authUserId, activar) {
    const accio = activar ? 'activar' : 'desactivar';
    if (!confirm('Segur que vols ' + accio + ' l\'accés de ' + nomTreballador + '?')) return;

    try {
        mostrarNotificacio('Processant...', 'info');
        await criarAdminUsers('toggle_access', {
            auth_user_id: authUserId,
            actiu: activar
        });

        mostrarNotificacio(
            activar ? '✅ Accés activat: ' + nomTreballador : '🚫 Accés desactivat: ' + nomTreballador,
            activar ? 'success' : 'warning'
        );
        
        treballadors = await getTreballadors();
        await carregarTaulaAccessos();

    } catch (error) {
        console.error('Error toggle accés:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// GUARDAR (crear o reset password)
// ============================================================

async function guardarAcces(event) {
    event.preventDefault();

    const accio        = document.getElementById('acces-accio').value;
    const treballadorId = document.getElementById('acces-treballador-id').value;
    const authUserId   = document.getElementById('acces-auth-user-id').value;
    const email        = document.getElementById('acces-email').value.trim();
    const password     = document.getElementById('acces-password').value;

    if (password.length < 6) {
        mostrarNotificacio('La contrasenya ha de tenir mínim 6 caràcters', 'error');
        return;
    }

    const btnGuardar = document.getElementById('btn-guardar-acces');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Processant...';

    try {
        if (accio === 'create_user') {
            if (!email) {
                mostrarNotificacio('Cal introduir un email', 'error');
                return;
            }
            await criarAdminUsers('create_user', { treballador_id: treballadorId, email, password });
            mostrarNotificacio('✅ Accés creat correctament', 'success');

        } else if (accio === 'reset_password') {
            await criarAdminUsers('reset_password', { auth_user_id: authUserId, new_password: password });
            mostrarNotificacio('✅ Contrasenya actualitzada correctament', 'success');
        }

        document.getElementById('form-acces-container').style.display = 'none';
        document.getElementById('form-acces').reset();
        treballadors = await getTreballadors();
        await carregarTaulaAccessos();

    } catch (error) {
        console.error('Error guardar accés:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
    }
}

// ============================================================
// UTILITATS
// ============================================================

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
}

console.log('✅ Admin panel v1 carregat');
