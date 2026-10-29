/* ============================================
   AGENDA-FACTURES_V1.JS — Factures grans a l'Agenda
   ============================================
   Proveïdor de l'agenda (patró de agenda.v1.js) que mostra:
     • Factures de COMPRES, GASOIL, TEMPORERS i REPARACIONS
       amb base SENSE IVA superior a AGENDA_LLINDAR_FACTURA (500 €).
     • Factures d'AIGUA (ASG + Comunitat): una anotació per cada
       data d'emissió, amb la SUMA TOTAL de les factures de totes
       les finques d'aquella data (es facturen 2 cops l'any, sense llindar).
       Les simulades no hi surten (només les reals).

   No crea cap taula ni cap nota: les anotacions es CALCULEN a partir de
   les factures cada vegada que es pinta l'agenda. Per això:
     - no hi ha duplicats ni apunts orfes;
     - si una factura s'edita, s'esborra o baixa de 500 €, l'agenda ho reflecteix sola;
     - les factures ja carregades (2025, 2026...) hi surten sense fer res més.

   Només es mostra a admin / editor / soci (porta imports).
   Carregar DESPRÉS d'agenda.v1.js (usa registrarProveidorAgenda i consultaPaginada).
*/

const AGENDA_LLINDAR_FACTURA = 500;   // € sense IVA; s'anota quan la base és ESTRICTAMENT superior

const AGENDA_FACTURES_MODULS = {
    compres:     '🛒 Compres',
    gasoil:      '⛽ Gasoil',
    temporers:   '👥 Temporers',
    reparacions: '🔧 Reparacions',
    aigua:       '💧 Aigua'
};

function agendaFormatEuros(n) {
    return (Number(n) || 0).toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

// Executa una funció global d'un altre mòdul només si existeix
function agendaObrirAmbFuncio(nomFuncio, arg1, arg2) {
    if (typeof window[nomFuncio] === 'function') {
        window[nomFuncio](arg1, arg2);
    } else {
        console.warn('Agenda: no existeix la funció ' + nomFuncio);
    }
}

function agendaEventFactura(modul, id, data, titol, detall, accio) {
    return {
        data: data,
        tipus: 'factura',
        titol: titol,
        detall: AGENDA_FACTURES_MODULS[modul] + (detall ? ' · ' + detall : ''),
        estat: 'avis',
        modulOrigen: 'factures-grans:' + modul,
        idOrigen: modul + ':' + id,
        accioClick: accio
    };
}

// Cada consulta és independent: si una falla (permisos, taula...), la resta de l'agenda continua
async function agendaFacturesSegur(nom, fn) {
    try {
        return await fn();
    } catch (e) {
        console.warn('Agenda factures (' + nom + '):', e);
        return [];
    }
}

async function agendaProvider_facturesGrans(dataInici, dataFi) {
    const rol = (typeof currentUserProfile !== 'undefined' && currentUserProfile) ? currentUserProfile.role : null;
    if (['admin', 'editor', 'soci'].indexOf(rol) === -1) return [];

    const llindar = AGENDA_LLINDAR_FACTURA;

    const [compres, gasoil, temporers, reparacions, aigua] = await Promise.all([
        agendaFacturesSegur('compres', function() {
            return consultaPaginada('compres_factures', 'id, data, num_factura, proveidor, import_net', function(q) {
                return q.gte('data', dataInici).lte('data', dataFi).gt('import_net', llindar);
            });
        }),
        agendaFacturesSegur('gasoil', function() {
            return consultaPaginada('gasoil', 'id, data, num_factura, proveidor, litres, import_net, tipus_activitat', function(q) {
                return q.gte('data', dataInici).lte('data', dataFi).gt('import_net', llindar);
            });
        }),
        agendaFacturesSegur('temporers', function() {
            return consultaPaginada('factures_temporers', 'id, data_factura, num_factura, proveidor, mes_servei, import_net', function(q) {
                return q.eq('eliminat', false).gte('data_factura', dataInici).lte('data_factura', dataFi).gt('import_net', llindar);
            });
        }),
        agendaFacturesSegur('reparacions', function() {
            return consultaPaginada('reparacions_factures', 'id, data, num_factura, proveidor, import_net', function(q) {
                return q.eq('eliminat', false).gte('data', dataInici).lte('data', dataFi).gt('import_net', llindar);
            });
        }),
        agendaFacturesSegur('aigua', function() {
            return consultaPaginada('factures_aigua_asg', 'id, data_emissio, import_total, iva, estat', function(q) {
                return q.gte('data_emissio', dataInici).lte('data_emissio', dataFi);
            });
        })
    ]);

    const esdeveniments = [];

    compres.forEach(function(f) {
        esdeveniments.push(agendaEventFactura('compres', f.id, f.data,
            (f.proveidor || 'Compra') + ' — ' + agendaFormatEuros(f.import_net),
            'fra. ' + (f.num_factura || '—') + ' · sense IVA',
            function() { agendaObrirAmbFuncio('veureCompra', f.id); }));
    });

    gasoil.forEach(function(f) {
        const litres = (parseFloat(f.litres) || 0).toLocaleString('ca-ES', { maximumFractionDigits: 0 }) + ' L';
        esdeveniments.push(agendaEventFactura('gasoil', f.id, f.data,
            (f.proveidor || 'Gasoil') + ' — ' + agendaFormatEuros(f.import_net),
            (f.num_factura ? 'fra. ' + f.num_factura + ' · ' : '') + litres + ' (' + (f.tipus_activitat || 'F') + ') · sense IVA',
            function() { agendaObrirAmbFuncio('veureGasoil', f.id); }));
    });

    temporers.forEach(function(f) {
        esdeveniments.push(agendaEventFactura('temporers', f.id, f.data_factura,
            (f.proveidor || 'Temporers') + ' — ' + agendaFormatEuros(f.import_net),
            'fra. ' + (f.num_factura || '—') + ' · servei ' + String(f.mes_servei || '').slice(0, 7) + ' · sense IVA',
            function() { agendaObrirAmbFuncio('carregarVistaFacturesTemporers'); }));
    });

    reparacions.forEach(function(f) {
        esdeveniments.push(agendaEventFactura('reparacions', f.id, f.data,
            (f.proveidor || 'Reparació') + ' — ' + agendaFormatEuros(f.import_net),
            'fra. ' + (f.num_factura || '—') + ' · sense IVA',
            function() { agendaObrirAmbFuncio('obrirModalReparacio', f.id, true); }));
    });

    // Aigua: una anotació per data d'emissió, amb la suma de totes les finques (sense llindar, sense simulades)
    const perData = {};
    aigua.forEach(function(f) {
        if (!f.data_emissio || f.estat === 'simulada') return;
        if (!perData[f.data_emissio]) perData[f.data_emissio] = { total: 0, iva: 0, n: 0 };
        perData[f.data_emissio].total += parseFloat(f.import_total) || 0;
        perData[f.data_emissio].iva += parseFloat(f.iva) || 0;
        perData[f.data_emissio].n += 1;
    });
    Object.keys(perData).forEach(function(data) {
        const g = perData[data];
        esdeveniments.push(agendaEventFactura('aigua', data, data,
            'Factura aigua ASG + Comunitat — ' + agendaFormatEuros(g.total),
            g.n + (g.n === 1 ? ' finca' : ' finques') + ' · total amb IVA · sense IVA ' + agendaFormatEuros(g.total - g.iva),
            function() { agendaObrirAmbFuncio('mostrarVistaFacturesAigua'); }));
    });

    return esdeveniments;
}

registrarProveidorAgenda(agendaProvider_facturesGrans);

console.log('✅ Agenda factures v1 carregat (llindar ' + AGENDA_LLINDAR_FACTURA + ' €)');
