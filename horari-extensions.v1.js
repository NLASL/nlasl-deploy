// ============================================================
// CONTROL HORARI - Extensions per app.v8.js
// Fitxer: horari-extensions.v1.js
// Afegir a index.html DESPRÉS de app.v8.js
//
// Conté:
//  1. Fitxatge automàtic des del login (sense modal)
//  2. Vista treballador: sol·licitar incidència/sortida anticipada
//  3. Cron manual: detectar incidències del dia anterior
//  4. Fixes: aprovarAbsencia usa camp correcte (gestionat_per)
//  5. Millora: veureIncidencia amb modal en lloc d'alert
// ============================================================

// ============================================================
// 1. FITXATGE AUTOMÀTIC PER TREBALLADORS PROPIS
// Crida des d'auth.v3.js quan el treballador fa login
// Substitueix la lògica manual de "1a visita = entrada"
// ============================================================

async function fitxatgeAutomaticLogin(treballador) {
    const avui = new Date().toISOString().split('T')[0];

    // Recarregar control_horari per tenir les dades fresques
    controlHorari = await getControlHorari({ treballadorId: treballador.id });

    const registreObert = controlHorari.find(function(r) {
        return r.treballador_id === treballador.id &&
               r.data === avui &&
               r.hora_entrada &&
               !r.hora_sortida;
    });

    const registreAvui = controlHorari.find(function(r) {
        return r.treballador_id === treballador.id && r.data === avui;
    });

    // Si no ha entrat avui: fitxar entrada automàticament
    if (!registreAvui) {
        const horaActual = new Date().toTimeString().slice(0, 5);
        try {
            await createControlHorari({
                data: avui,
                treballador_id: treballador.id,
                hora_entrada: horaActual,
                tasca_id: null,
                finca: null,
                num_persones: 1
            });
            mostrarNotificacio('🟢 Entrada registrada: ' + horaActual, 'success');
            console.log('✅ Entrada automàtica:', treballador.nom, horaActual);
            return 'entrada';
        } catch (error) {
            console.error('Error fitxant entrada:', error);
            mostrarNotificacio('Error fitxant entrada: ' + error.message, 'error');
            return null;
        }
    }

    // Si ja té entrada oberta: no fer res (la sortida es fa manualment)
    // La vista mostrarà el botó de sortida
    return registreObert ? 'pendent_sortida' : 'ja_fitxat';
}

// ============================================================
// 2. SORTIDA ANTICIPADA / INCIDÈNCIA DES DE VISTA TREBALLADOR
// El treballador pot reportar que surt abans o que ha tingut un problema
// ============================================================

function obrirModalSortidaAnticipada(treballadorId) {
    const registreObert = controlHorari.find(function(r) {
        const avui = new Date().toISOString().split('T')[0];
        return r.treballador_id === treballadorId &&
               r.data === avui &&
               r.hora_entrada &&
               !r.hora_sortida;
    });

    if (!registreObert) {
        mostrarNotificacio('No tens cap entrada oberta avui', 'error');
        return;
    }

    // Crear modal si no existeix
    let modal = document.getElementById('modal-sortida-anticipada');
    if (!modal) {
        const div = document.createElement('div');
        div.innerHTML = crearModalSortidaAnticipada();
        document.body.appendChild(div.firstChild);
        modal = document.getElementById('modal-sortida-anticipada');
    }

    const horaActual = new Date().toTimeString().slice(0, 5);
    document.getElementById('sa-treballador-id').value = treballadorId;
    document.getElementById('sa-registre-id').value = registreObert.id;
    document.getElementById('sa-hora-sortida').value = horaActual;
    document.getElementById('sa-info').innerHTML =
        '⏱️ Entrada: <strong>' + registreObert.hora_entrada + '</strong> → Sortida anticipada: <strong>' + horaActual + '</strong>';

    // Carregar motius
    const sel = document.getElementById('sa-motiu');
    sel.innerHTML = '<option value="">Seleccionar motiu...</option>';
    motiusAbsencia.forEach(function(m) {
        sel.innerHTML += '<option value="' + m.id + '">' + m.nom + '</option>';
    });

    modal.style.display = 'block';
}

function crearModalSortidaAnticipada() {
    return '<div id="modal-sortida-anticipada" class="modal" style="display:none;">' +
        '<div class="modal-content" style="max-width:480px;">' +
        '<span class="close" onclick="tancarModal(\'modal-sortida-anticipada\')">&times;</span>' +
        '<h2>⏩ Sortida anticipada</h2>' +
        '<form id="form-sortida-anticipada" onsubmit="guardarSortidaAnticipada(event)">' +
        '<input type="hidden" id="sa-treballador-id">' +
        '<input type="hidden" id="sa-registre-id">' +
        '<div id="sa-info" style="background:#fff3e0;padding:12px;border-radius:8px;margin-bottom:16px;text-align:center;font-size:16px;"></div>' +
        '<div class="form-group">' +
        '<label>Hora de sortida</label>' +
        '<input type="time" id="sa-hora-sortida" required>' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Motiu *</label>' +
        '<select id="sa-motiu" required><option value="">Seleccionar...</option></select>' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Observacions (opcional)</label>' +
        '<textarea id="sa-observacions" rows="2" placeholder="Explica breument el motiu..."></textarea>' +
        '</div>' +
        '<div class="form-actions">' +
        '<button type="button" class="btn btn-secondary" onclick="tancarModal(\'modal-sortida-anticipada\')">Cancel·lar</button>' +
        '<button type="submit" class="btn btn-primary">Confirmar sortida</button>' +
        '</div>' +
        '</form></div></div>';
}

async function guardarSortidaAnticipada(event) {
    event.preventDefault();

    const treballadorId = document.getElementById('sa-treballador-id').value;
    const registreId    = document.getElementById('sa-registre-id').value;
    const horaSortida   = document.getElementById('sa-hora-sortida').value;
    const motiuId       = document.getElementById('sa-motiu').value || null;
    const observacions  = document.getElementById('sa-observacions').value.trim() || null;

    const registre = controlHorari.find(function(r) { return r.id === registreId; });
    if (!registre) {
        mostrarNotificacio('Registre no trobat', 'error');
        return;
    }

    try {
        // Calcular hores i cost
        const entrada  = new Date('2000-01-01 ' + registre.hora_entrada);
        let sortida    = new Date('2000-01-01 ' + horaSortida);
        if (sortida < entrada) sortida = new Date('2000-01-02 ' + horaSortida);
        const hores    = (sortida - entrada) / 3600000;

        const treballador = treballadors.find(function(t) { return t.id === treballadorId; });
        const cost = treballador && treballador.preu_hora ? hores * treballador.preu_hora : null;

        // Actualitzar el registre de control_horari
        await updateControlHorari(registreId, {
            hora_sortida:     horaSortida,
            motiu_sortida_id: motiuId,
            cost_total:       cost
        });

        // Crear incidència de tipus sortida_anticipada
        await createIncidencia({
            treballador_id:            treballadorId,
            control_horari_id:         registreId,
            data:                      registre.data,
            tipus:                     'sortida_anticipada',
            estat:                     'pendent',
            hora_entrada:              registre.hora_entrada,
            hora_sortida_real:         horaSortida,
            observacions_treballador:  observacions,
            origen:                    'manual'
        });

        mostrarNotificacio('✅ Sortida anticipada registrada. L\'admin la revisarà.', 'success');
        tancarModal('modal-sortida-anticipada');

        // Refrescar vista
        controlHorari = await getControlHorari();
        const registreRestant = controlHorari.find(function(r) {
            const avui = new Date().toISOString().split('T')[0];
            return r.treballador_id === treballadorId && r.data === avui && !r.hora_sortida;
        });
        await actualitzarZonaFitxatge(treballadorId, registreRestant);
        await carregarRegistresTreballador(treballadorId);

    } catch (error) {
        console.error('Error sortida anticipada:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// 3. BOTÓ "SORTIDA ANTICIPADA"
// S'afegeix des de afegirBotoSortidaAnticipada() quan cal
// No fa patch de cap funció existent
// ============================================================

function afegirBotoSortidaAnticipada(treballadorId) {
    const zona = document.getElementById('zona-fitxatge');
    if (!zona) return;
    if (document.getElementById('btn-sortida-anticipada')) return;
    const div = document.createElement('div');
    div.style.marginTop = '12px';
    div.style.textAlign = 'center';
    div.innerHTML = '<button id="btn-sortida-anticipada" ' +
        'onclick="obrirModalSortidaAnticipada(\'' + treballadorId + '\')" ' +
        'style="padding:12px 24px;font-size:14px;background:#ff9800;color:white;' +
        'border:none;border-radius:8px;cursor:pointer;">' +
        '⏩ Sortida anticipada (metge, tràmits...)</button>';
    zona.appendChild(div);
}


// ============================================================
// 4. FIX: aprovarAbsencia i rebutjarAbsencia
// El camp correcte és gestionat_per (no aprovat_per)
// ============================================================

async function aprovarAbsencia(id) {
    if (!confirm('Segur que vols aprovar aquesta absència?')) return;
    try {
        await updateAbsencia(id, {
            estat:        'aprovada',
            gestionat_per: currentUser.id,
            gestionat_at: new Date().toISOString()
        });
        mostrarNotificacio('✅ Absència aprovada correctament', 'success');
        await carregarTaulaAbsencies();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

async function rebutjarAbsencia(id) {
    const motiu = prompt('Motiu del rebuig (opcional):');
    try {
        await updateAbsencia(id, {
            estat:              'rebutjada',
            observacions_admin: motiu || 'Rebutjada per administrador',
            gestionat_per:      currentUser.id,
            gestionat_at:       new Date().toISOString()
        });
        mostrarNotificacio('Absència rebutjada', 'info');
        await carregarTaulaAbsencies();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// 5. MILLORA: veureIncidencia amb modal (en lloc d'alert)
// ============================================================

async function veureIncidencia(id) {
    const incidencia = incidencies.find(function(i) { return i.id === id; });
    if (!incidencia) return;

    const treballador = treballadors.find(function(t) { return t.id === incidencia.treballador_id; });
    const registre    = controlHorari.find(function(r) {
        return r.treballador_id === incidencia.treballador_id && r.data === incidencia.data;
    });

    const tipusText = {
        'sense_entrada':    '❌ Sense entrada',
        'sense_sortida':    '❌ Sense sortida',
        'jornada_curta':    '⚠️ Jornada curta',
        'jornada_llarga':   '⚠️ Jornada llarga',
        'sortida_anticipada': '⏩ Sortida anticipada'
    }[incidencia.tipus] || incidencia.tipus;

    const estatText = {
        'pendent':    '<span style="color:#ff9800">🔴 Pendent</span>',
        'resolta':    '<span style="color:#4caf50">✅ Resolta</span>',
        'justificada':'<span style="color:#2196f3">ℹ️ Justificada</span>'
    }[incidencia.estat] || incidencia.estat;

    let info = '<table style="width:100%;border-collapse:collapse;">';
    info += '<tr><td style="padding:8px;color:#666;width:40%">📅 Data</td><td style="padding:8px"><strong>' + formatData(incidencia.data) + '</strong></td></tr>';
    info += '<tr><td style="padding:8px;color:#666">👤 Treballador</td><td style="padding:8px"><strong>' + (treballador ? treballador.nom : 'Desconegut') + '</strong></td></tr>';
    info += '<tr><td style="padding:8px;color:#666">⚠️ Tipus</td><td style="padding:8px">' + tipusText + '</td></tr>';
    info += '<tr><td style="padding:8px;color:#666">📍 Estat</td><td style="padding:8px">' + estatText + '</td></tr>';
    if (registre) {
        info += '<tr><td style="padding:8px;color:#666">🕐 Entrada</td><td style="padding:8px">' + (registre.hora_entrada || '-') + '</td></tr>';
        info += '<tr><td style="padding:8px;color:#666">🕐 Sortida</td><td style="padding:8px">' + (registre.hora_sortida || '<span style="color:#ff9800">Pendent</span>') + '</td></tr>';
        if (registre.hores_treballades) {
            info += '<tr><td style="padding:8px;color:#666">⏱️ Hores</td><td style="padding:8px"><strong>' + parseFloat(registre.hores_treballades).toFixed(2) + 'h</strong></td></tr>';
        }
    }
    if (incidencia.observacions_treballador) {
        info += '<tr><td style="padding:8px;color:#666">📝 Treballador</td><td style="padding:8px">' + incidencia.observacions_treballador + '</td></tr>';
    }
    if (incidencia.observacions_admin) {
        info += '<tr><td style="padding:8px;color:#666">💼 Admin</td><td style="padding:8px">' + incidencia.observacions_admin + '</td></tr>';
    }
    info += '</table>';

    // Reutilitzar modal-incidencia si existeix, sinó crear un de temporal
    let modalInfo = document.getElementById('modal-incidencia-detall');
    if (!modalInfo) {
        const div = document.createElement('div');
        div.innerHTML = '<div id="modal-incidencia-detall" class="modal" style="display:none;">' +
            '<div class="modal-content" style="max-width:500px;">' +
            '<span class="close" onclick="tancarModal(\'modal-incidencia-detall\')">&times;</span>' +
            '<h2>🔍 Detall Incidència</h2>' +
            '<div id="modal-incidencia-detall-cos"></div>' +
            '<div class="form-actions" style="margin-top:20px;">' +
            '<button class="btn btn-secondary" onclick="tancarModal(\'modal-incidencia-detall\')">Tancar</button>' +
            '</div></div></div>';
        document.body.appendChild(div.firstChild);
        modalInfo = document.getElementById('modal-incidencia-detall');
    }

    document.getElementById('modal-incidencia-detall-cos').innerHTML = info;
    modalInfo.style.display = 'block';
}

// ============================================================
// 6. UTILITAT: Detectar incidències manualment (botó admin)
// Útil per provar sense esperar el cron nocturn
// ============================================================

async function detectarIncidenciesManual() {
    try {
        const { data, error } = await supabaseClient.rpc('detectar_incidencies_horari');
        if (error) throw error;
        const num = data || 0;
        mostrarNotificacio('🔍 Incidències detectades: ' + num, num > 0 ? 'warning' : 'success');
        if (vistaActual === 'incidencies') await carregarTaulaIncidencies();
    } catch (error) {
        console.error('Error detectant incidències:', error);
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

// ============================================================
// 7. AFEGIR BOTÓ "DETECTAR INCIDÈNCIES" AL PANEL ADMIN
// Patch de carregarVistaIncidencies per afegir el botó
// ============================================================

// ============================================================
// 7. BOTÓ "DETECTAR INCIDÈNCIES" - injectat via MutationObserver
// ============================================================

const _incidenciesObserver = new MutationObserver(function() {
    const headerDiv = document.querySelector('.view-incidencies > div:first-child');
    if (headerDiv && !document.getElementById('btn-detectar-incidencies')) {
        const btn = document.createElement('button');
        btn.id = 'btn-detectar-incidencies';
        btn.className = 'btn btn-secondary';
        btn.textContent = 'Detectar incidencies d ahir';
        btn.onclick = detectarIncidenciesManual;
        headerDiv.appendChild(btn);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('view-container');
    if (container) {
        _incidenciesObserver.observe(container, { childList: true, subtree: false });
    }
});

// ============================================================
// FILTRE CONTROL HORARI PER TREBALLADOR
// Funció auxiliar cridada des de canviarVista() quan és treballador
// NO fa patch de carregarVistaControlHorari
// ============================================================

async function carregarVistaControlHorariTreballador() {
    const treballador = treballadors.find(function(t) { return t.auth_user_id === currentUser.id; });
    if (!treballador) return;

    const container = document.getElementById('view-container');

    let html = '<div class="view-control-horari">';
    html += '<h2 style="margin-bottom:20px;">⏱️ Els meus registres</h2>';

    // Filtre de dates
    html += '<div style="background:#f5f5f5;padding:15px;border-radius:8px;margin-bottom:20px;">';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr auto;gap:15px;">';
    html += '<div><label>Data Inici:</label><input type="date" id="filtro-data-inici-treb" onchange="carregarRegistresTreballadorHorari()"></div>';
    html += '<div><label>Data Fi:</label><input type="date" id="filtro-data-fi-treb" onchange="carregarRegistresTreballadorHorari()"></div>';
    html += '<div style="align-self:end;"><button class="btn btn-secondary" onclick="netejarFiltresTreballador()">🗑️ Netejar</button></div>';
    html += '</div></div>';

    // Resum
    html += '<div id="resum-horari-treb" style="margin-bottom:20px;"></div>';

    // Taula
    html += '<div class="table-container"><table class="data-table">';
    html += '<thead><tr><th>Data</th><th>Entrada</th><th>Sortida</th><th>Hores</th><th>Tasca</th><th>Estat</th></tr></thead>';
    html += '<tbody id="tbody-horari-treb"><tr><td colspan="6">Carregant...</td></tr></tbody>';
    html += '</table></div></div>';

    container.innerHTML = html;

    // Posar dates per defecte (últims 30 dies)
    const avui = new Date();
    const fa30 = new Date();
    fa30.setDate(avui.getDate() - 30);
    document.getElementById('filtro-data-inici-treb').value = fa30.toISOString().split('T')[0];
    document.getElementById('filtro-data-fi-treb').value = avui.toISOString().split('T')[0];

    await carregarRegistresTreballadorHorari();
}

async function carregarRegistresTreballadorHorari() {
    const tbody = document.getElementById('tbody-horari-treb');
    if (!tbody) return;

    const treballador = treballadors.find(function(t) { return t.auth_user_id === currentUser.id; });
    if (!treballador) return;

    const dataInici = document.getElementById('filtro-data-inici-treb')?.value || null;
    const dataFi = document.getElementById('filtro-data-fi-treb')?.value || null;

    try {
        const registres = await getControlHorari({
            treballadorId: treballador.id,
            dataInici: dataInici,
            dataFi: dataFi
        });

        if (registres.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No hi ha registres en aquest període</td></tr>';
            document.getElementById('resum-horari-treb').innerHTML = '';
            return;
        }

        let totalHores = 0;

        tbody.innerHTML = registres.map(function(r) {
            const tasca = tasques.find(function(t) { return t.id === r.tasca_id; });
            const nomTasca = tasca ? tasca.nom : (r.tasca_libre || '-');
            const hores = parseFloat(r.hores_treballades) || 0;
            totalHores += hores;

            const horaSortida = r.hora_sortida
                ? r.hora_sortida
                : '<span style="color:#ff9800;">⏳ Pendent</span>';

            const horesText = hores > 0 ? hores.toFixed(2) + 'h' : '-';

            let estatBadge = '';
            if (!r.hora_sortida) {
                estatBadge = '<span style="background:#ff9800;color:white;padding:3px 8px;border-radius:4px;font-size:11px;">Oberta</span>';
            } else if (r.sortida_automatica) {
                estatBadge = '<span style="background:#9e9e9e;color:white;padding:3px 8px;border-radius:4px;font-size:11px;">Auto</span>';
            } else {
                estatBadge = '<span style="background:#4caf50;color:white;padding:3px 8px;border-radius:4px;font-size:11px;">✓</span>';
            }

            return '<tr>' +
                '<td><strong>' + formatData(r.data) + '</strong></td>' +
                '<td>' + (r.hora_entrada || '-') + '</td>' +
                '<td>' + horaSortida + '</td>' +
                '<td><strong>' + horesText + '</strong></td>' +
                '<td>' + nomTasca + '</td>' +
                '<td>' + estatBadge + '</td>' +
                '</tr>';
        }).join('');

        // Resum
        const resum = document.getElementById('resum-horari-treb');
        if (resum) {
            resum.innerHTML = '<div style="display:flex;gap:15px;flex-wrap:wrap;">' +
                '<div style="background:white;padding:12px 20px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">' +
                '<div style="font-size:11px;color:#666;">TOTAL HORES</div>' +
                '<div style="font-size:24px;font-weight:bold;color:#4caf50;">' + totalHores.toFixed(2) + 'h</div>' +
                '</div>' +
                '<div style="background:white;padding:12px 20px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.1);">' +
                '<div style="font-size:11px;color:#666;">REGISTRES</div>' +
                '<div style="font-size:24px;font-weight:bold;color:#2196f3;">' + registres.length + '</div>' +
                '</div>' +
                '</div>';
        }

    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = '<tr><td colspan="6">Error carregant dades</td></tr>';
    }
}

function netejarFiltresTreballador() {
    const inici = document.getElementById('filtro-data-inici-treb');
    const fi = document.getElementById('filtro-data-fi-treb');
    if (inici) inici.value = '';
    if (fi) fi.value = '';
    carregarRegistresTreballadorHorari();
}

// ============================================================
// FITXATGE RÀPID PER EDITORS QUE TAMBÉ SÓN TREBALLADORS
// Afegeix bloc de fitxatge al dashboard per USUx
// ============================================================

async function afegirFitxatgeDashboard() {
    const dashboard = document.querySelector('.dashboard');
    if (!dashboard) return;
    if (document.getElementById('bloc-fitxatge-editor')) return;

    const treballador = treballadors && currentUser
        ? treballadors.find(function(t) { return t.auth_user_id === currentUser.id; })
        : null;
    if (!treballador) return;

    const avui = new Date().toISOString().split('T')[0];
    const registreObert = controlHorari ? controlHorari.find(function(r) {
        return r.treballador_id === treballador.id &&
               r.data === avui &&
               r.hora_entrada &&
               !r.hora_sortida;
    }) : null;

    const bloc = document.createElement('div');
    bloc.id = 'bloc-fitxatge-editor';
    bloc.style.cssText = 'background:white;border-radius:12px;padding:20px;margin-bottom:25px;box-shadow:0 2px 10px rgba(0,0,0,0.1);';

    let html = '<h3 style="margin-top:0;color:#333;">⏱️ El meu fitxatge</h3>';
    html += '<div id="zona-fitxatge-editor"></div>';
    bloc.innerHTML = html;

    // Inserir al principi del dashboard
    dashboard.insertBefore(bloc, dashboard.firstChild);

    await actualitzarZonaFitxatgeEditor(treballador, registreObert);
}

async function actualitzarZonaFitxatgeEditor(treballador, registreObert) {
    const zona = document.getElementById('zona-fitxatge-editor');
    if (!zona) return;

    if (registreObert) {
        zona.innerHTML =
            '<p style="color:#c62828;margin:0 0 12px 0;">Entrada oberta des de les <strong>' + registreObert.hora_entrada + '</strong></p>' +
            '<button onclick="fitxarSortidaTreballador(\'' + treballador.id + '\')" ' +
            'style="padding:15px 30px;font-size:18px;font-weight:bold;background:linear-gradient(135deg,#f44336,#e91e63);color:white;border:none;border-radius:10px;cursor:pointer;width:100%;">' +
            '🔴 Fitxar Sortida</button>';
    } else {
        zona.innerHTML =
            '<button onclick="fitxarEntradaTreballador(\'' + treballador.id + '\')" ' +
            'style="padding:15px 30px;font-size:18px;font-weight:bold;background:linear-gradient(135deg,#4caf50,#8bc34a);color:white;border:none;border-radius:10px;cursor:pointer;width:100%;">' +
            '🟢 Fitxar Entrada</button>';
    }

    // Afegir modal si no existeix
    if (!document.getElementById('modal-fitxatge-treballador')) {
        const div = document.createElement('div');
        div.innerHTML = crearModalFitxatgeTreballador();
        document.body.appendChild(div.firstElementChild);
    }
}

// Observar quan carrega el dashboard
const _dashboardFitxatgeObserver = new MutationObserver(function() {
    const dashboard = document.querySelector('.dashboard');
    if (dashboard && !document.getElementById('bloc-fitxatge-editor')) {
        afegirFitxatgeDashboard();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('view-container');
    if (container) {
        _dashboardFitxatgeObserver.observe(container, { childList: true, subtree: false });
    }
});

console.log('✅ Horari extensions v1 carregat');
