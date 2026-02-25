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
// 3. BOTÓ "SORTIDA ANTICIPADA" A LA VISTA TREBALLADOR
// Patch de actualitzarZonaFitxatge per afegir el botó extra
// ============================================================

// Guardem la funció original per poder-la cridar
const _actualitzarZonaFitxatgeOriginal = actualitzarZonaFitxatge;

async function actualitzarZonaFitxatge(treballadorId, registreObert) {
    // Executar la funció original
    await _actualitzarZonaFitxatgeOriginal(treballadorId, registreObert);

    // Si hi ha registre obert, afegir botó de sortida anticipada
    if (registreObert) {
        const zona = document.getElementById('zona-fitxatge');
        if (!zona) return;

        const divExtra = document.createElement('div');
        divExtra.style.marginTop = '12px';
        divExtra.style.textAlign = 'center';
        divExtra.innerHTML =
            '<button onclick="obrirModalSortidaAnticipada(\'' + treballadorId + '\')" ' +
            'style="padding:12px 24px;font-size:14px;background:#ff9800;color:white;' +
            'border:none;border-radius:8px;cursor:pointer;opacity:0.85;" ' +
            'onmouseover="this.style.opacity=\'1\'" onmouseout="this.style.opacity=\'0.85\'">' +
            '⏩ Sortida anticipada (metge, tràmits...)</button>';
        zona.appendChild(divExtra);
    }
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

const _carregarVistaIncidenciesOriginal = carregarVistaIncidencies;

async function carregarVistaIncidencies() {
    await _carregarVistaIncidenciesOriginal();

    // Afegir botó de detecció manual al header de la vista
    const headerDiv = document.querySelector('.view-incidencies > div:first-child');
    if (headerDiv && !document.getElementById('btn-detectar-incidencies')) {
        const btn = document.createElement('button');
        btn.id = 'btn-detectar-incidencies';
        btn.className = 'btn btn-secondary';
        btn.textContent = '🔍 Detectar incidències d\'ahir';
        btn.onclick = detectarIncidenciesManual;
        headerDiv.appendChild(btn);
    }
}

console.log('✅ Horari extensions v1 carregat');
