/* ============================================
   AGENDA-UI.V1.JS — Vista de l'Agenda
   ============================================
   Pinta el widget de calendari al Dashboard (sota les alertes)
   amb 3 vistes: Avui / Setmana / Mes.
   Depèn de agenda.v1.js (getEsdevenimentsRang, AGENDA_TIPUS_INFO...)
*/

let agendaVistaActual = 'dia'; // 'dia' | 'setmana' | 'mes'
let agendaDataReferencia = new Date(); // dia/setmana/mes que s'està mirant

// ------------------------------------------------
// Helpers de dates
// ------------------------------------------------
function agendaFormatISO(d) {
    return d.toISOString().split('T')[0];
}

function agendaInicieFiRang() {
    const d = new Date(agendaDataReferencia);

    if (agendaVistaActual === 'dia') {
        return { inici: agendaFormatISO(d), fi: agendaFormatISO(d) };
    }

    if (agendaVistaActual === 'setmana') {
        // Setmana de dilluns a diumenge
        const diaSetmana = (d.getDay() + 6) % 7; // 0=dilluns
        const dilluns = new Date(d);
        dilluns.setDate(d.getDate() - diaSetmana);
        const diumenge = new Date(dilluns);
        diumenge.setDate(dilluns.getDate() + 6);
        return { inici: agendaFormatISO(dilluns), fi: agendaFormatISO(diumenge) };
    }

    // mes
    const primerDia = new Date(d.getFullYear(), d.getMonth(), 1);
    const ultimDia = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { inici: agendaFormatISO(primerDia), fi: agendaFormatISO(ultimDia) };
}

function agendaMoure(direccio) {
    const d = new Date(agendaDataReferencia);
    if (agendaVistaActual === 'dia') d.setDate(d.getDate() + direccio);
    else if (agendaVistaActual === 'setmana') d.setDate(d.getDate() + direccio * 7);
    else d.setMonth(d.getMonth() + direccio);
    agendaDataReferencia = d;
    renderAgendaWidget();
}

function agendaCanviarVista(vista) {
    agendaVistaActual = vista;
    renderAgendaWidget();
}

function agendaAnarAvui() {
    agendaDataReferencia = new Date();
    renderAgendaWidget();
}

// ------------------------------------------------
// Render principal
// ------------------------------------------------
async function renderAgendaWidget() {
    const container = document.getElementById('agenda-widget-container');
    if (!container) return;

    container.innerHTML = '<p style="padding:10px;color:#999;">Carregant agenda...</p>';

    const { inici, fi } = agendaInicieFiRang();
    const esdeveniments = await getEsdevenimentsRang(inici, fi);

    let html = '<div class="agenda-widget" style="background:white;border-radius:10px;box-shadow:0 4px 16px rgba(33,150,243,0.25);border:1px solid rgba(33,150,243,0.15);padding:18px;box-sizing:border-box;overflow:hidden;">';

    // Capçalera: títol + selector de vista + navegació + nova nota
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">';
    html += '<h3 style="margin:0;">📅 Agenda — ' + agendaTitolRang(inici, fi) + '</h3>';
    html += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:100%;">';
    html += '<button class="btn btn-sm btn-secondary" onclick="agendaMoure(-1)">‹</button>';
    html += '<button class="btn btn-sm btn-secondary" onclick="agendaAnarAvui()">Avui</button>';
    html += '<button class="btn btn-sm btn-secondary" onclick="agendaMoure(1)">›</button>';
    ['dia', 'setmana', 'mes'].forEach(function(v) {
        const labels = { dia: 'Dia', setmana: 'Setmana', mes: 'Mes' };
        const actiu = v === agendaVistaActual;
        html += '<button class="btn btn-sm ' + (actiu ? 'btn-primary' : 'btn-secondary') + '" onclick="agendaCanviarVista(\'' + v + '\')">' + labels[v] + '</button>';
    });
    if (typeof hasPermission === 'function' && hasPermission('insert')) {
        html += '<button class="btn btn-sm btn-success" onclick="obrirModalNovaNotaAgenda()">➕ Nota</button>';
    }
    html += '</div></div>';

    // Cos: segons vista
    if (agendaVistaActual === 'dia') {
        html += agendaRenderDia(inici, esdeveniments);
    } else {
        html += agendaRenderGraella(inici, fi, esdeveniments);
    }

    html += '</div>';
    container.innerHTML = html;
}

function agendaTitolRang(inici, fi) {
    const opcions = { day: 'numeric', month: 'long', year: 'numeric' };
    const dIni = new Date(inici + 'T00:00:00');
    const dFi = new Date(fi + 'T00:00:00');

    if (agendaVistaActual === 'dia') {
        return dIni.toLocaleDateString('ca-ES', opcions);
    }
    if (agendaVistaActual === 'mes') {
        return dIni.toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' });
    }
    // setmana
    return dIni.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short' }) + ' – ' + dFi.toLocaleDateString('ca-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ------------------------------------------------
// Vista DIA: llistat detallat
// ------------------------------------------------
function agendaRenderDia(data, esdeveniments) {
    agendaRegistrarAccions(esdeveniments);
    const delDia = esdeveniments.filter(function(e) { return e.data === data; });

    if (!delDia.length) {
        return '<p style="color:#999;padding:10px 0;">Sense anotacions aquest dia.</p>';
    }

    let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    delDia.forEach(function(e) {
        html += agendaRenderItem(e);
    });
    html += '</div>';
    return html;
}

function agendaRenderItem(e) {
    const info = getAgendaTipusInfo(e.tipus);
    const clicable = typeof e.accioClick === 'function';
    const onclick = clicable ? ' onclick="agendaExecutarAccio(\'' + e.idOrigen + '\')" style="cursor:pointer;"' : '';

    let html = '<div' + onclick + ' style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-left:4px solid ' + info.color + ';background:#fafafa;border-radius:6px;">';
    html += '<span style="font-size:18px;">' + info.icona + '</span>';
    html += '<div style="flex:1;">';
    html += '<div style="font-weight:600;color:#333;">' + agendaEscapar(e.titol) + '</div>';
    if (e.detall) html += '<div style="font-size:13px;color:#777;">' + agendaEscapar(e.detall) + '</div>';
    html += '</div>';
    if (e.tipus === 'nota') {
        html += '<button class="btn btn-sm btn-danger" onclick="event.stopPropagation();confirmarEliminarAgendaNota(\'' + e.idOrigen + '\')">🗑️</button>';
    }
    html += '</div>';
    return html;
}

function agendaEscapar(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Petit registre temporal per poder cridar accioClick des de l'onclick (que només passa strings)
let _agendaAccions = {};
function agendaRegistrarAccions(esdeveniments) {
    _agendaAccions = {};
    esdeveniments.forEach(function(e) {
        if (typeof e.accioClick === 'function') {
            _agendaAccions[e.idOrigen] = e.accioClick;
        }
    });
}
function agendaExecutarAccio(idOrigen) {
    const fn = _agendaAccions[idOrigen];
    if (fn) fn();
}

// ------------------------------------------------
// Vista SETMANA / MES: graella amb resum per dia
// ------------------------------------------------
function agendaRenderGraella(inici, fi, esdeveniments) {
    agendaRegistrarAccions(esdeveniments);

    // Agrupem esdeveniments per dia
    const perDia = {};
    esdeveniments.forEach(function(e) {
        if (!perDia[e.data]) perDia[e.data] = [];
        perDia[e.data].push(e);
    });

    const dIni = new Date(inici + 'T00:00:00');
    const dFi = new Date(fi + 'T00:00:00');

    // Per a vista mes, comencem a la graella des del dilluns de la setmana del dia 1
    let dPrimeraCasella = new Date(dIni);
    if (agendaVistaActual === 'mes') {
        const diaSetmana = (dIni.getDay() + 6) % 7;
        dPrimeraCasella.setDate(dIni.getDate() - diaSetmana);
    }

    let dUltimaCasella = new Date(dFi);
    if (agendaVistaActual === 'mes') {
        const diaSetmana = (dFi.getDay() + 6) % 7;
        dUltimaCasella.setDate(dFi.getDate() + (6 - diaSetmana));
    }

    const avui = agendaFormatISO(new Date());
    const diesSetmana = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'];

    let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;">';
    diesSetmana.forEach(function(nom) {
        html += '<div style="text-align:center;font-weight:600;color:#888;font-size:13px;">' + nom + '</div>';
    });

    let cursor = new Date(dPrimeraCasella);
    while (cursor <= dUltimaCasella) {
        const dataISO = agendaFormatISO(cursor);
        const dinsMesActual = agendaVistaActual !== 'mes' || cursor.getMonth() === dIni.getMonth();
        const events = perDia[dataISO] || [];
        const esAvui = dataISO === avui;

        html += '<div onclick="agendaClicarDia(\'' + dataISO + '\')" style="min-height:70px;border-radius:6px;padding:6px;cursor:pointer;' +
                'background:' + (esAvui ? '#e3f2fd' : '#fafafa') + ';' +
                'opacity:' + (dinsMesActual ? '1' : '0.4') + ';' +
                'border:1px solid ' + (esAvui ? '#2196f3' : '#eee') + ';">';
        html += '<div style="font-size:12px;font-weight:600;color:' + (esAvui ? '#2196f3' : '#666') + ';">' + cursor.getDate() + '</div>';

        // Resum: comptador per tipus (icones), màxim 3 línies visibles
        const comptadors = {};
        events.forEach(function(e) {
            comptadors[e.tipus] = (comptadors[e.tipus] || 0) + 1;
        });
        Object.keys(comptadors).slice(0, 3).forEach(function(tipus) {
            const info = getAgendaTipusInfo(tipus);
            html += '<div style="font-size:11px;color:' + info.color + ';">' + info.icona + ' ' + comptadors[tipus] + '</div>';
        });

        html += '</div>';
        cursor.setDate(cursor.getDate() + 1);
    }
    html += '</div>';

    return html;
}

function agendaClicarDia(dataISO) {
    agendaDataReferencia = new Date(dataISO + 'T00:00:00');
    agendaVistaActual = 'dia';
    renderAgendaWidget();
}

// ------------------------------------------------
// Modal: nova nota manual
// ------------------------------------------------
function obrirModalNovaNotaAgenda() {
    let modal = document.getElementById('modal-nota-agenda');
    if (!modal) {
        const div = document.createElement('div');
        div.innerHTML =
            '<div id="modal-nota-agenda" class="modal" style="display:none;">' +
            '<div class="modal-content" style="max-width:420px;">' +
            '<span class="close" onclick="tancarModal(\'modal-nota-agenda\')">&times;</span>' +
            '<h3>📝 Nova nota a l\'agenda</h3>' +
            '<div class="form-group"><label>Data</label><input type="date" id="nota-agenda-data"></div>' +
            '<div class="form-group"><label>Text</label><textarea id="nota-agenda-text" rows="3" placeholder="Ex: Anar al banc"></textarea></div>' +
            '<button class="btn btn-primary" onclick="guardarNovaNotaAgenda()">Guardar</button>' +
            '</div></div>';
        document.body.appendChild(div);
        modal = document.getElementById('modal-nota-agenda');
    }

    document.getElementById('nota-agenda-data').value = agendaFormatISO(agendaDataReferencia);
    document.getElementById('nota-agenda-text').value = '';
    modal.style.display = 'flex';
}

async function guardarNovaNotaAgenda() {
    const data = document.getElementById('nota-agenda-data').value;
    const text = document.getElementById('nota-agenda-text').value.trim();

    if (!data || !text) {
        mostrarNotificacio('Cal indicar data i text', 'error');
        return;
    }

    const creat = await crearAgendaNota(data, text);
    if (creat) {
        tancarModal('modal-nota-agenda');
        renderAgendaWidget();
    }
}

function confirmarEliminarAgendaNota(id) {
    if (confirm('Vols eliminar aquesta nota?')) {
        eliminarAgendaNota(id).then(function(ok) {
            if (ok) renderAgendaWidget();
        });
    }
}
