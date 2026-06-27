/* ============================================
   AGENDA.V1.JS — Motor de dades de l'Agenda
   ============================================
   Aquest fitxer NO pinta res a pantalla (això és feina
   de agenda-ui.v1.js). Només:
   1) Manté el registre de "proveïdors" (cada mòdul
      n'afegeix un, sense tocar aquest fitxer).
   2) Defineix el format estàndard d'esdeveniment.
   3) Implementa el CRUD de notes manuals (agenda_notes).
   4) Implementa els proveïdors dels mòduls que ja
      formen part d'app_v8.js (control horari, tractaments,
      fertilitzacions) + el proveïdor de notes manuals.

   Format estàndard d'esdeveniment retornat per cada proveïdor:
   {
     data: 'YYYY-MM-DD',
     tipus: 'fitxatge' | 'tractament' | 'fertilitzacio' | 'nota' | ...,
     titol: string,
     detall: string (opcional),
     estat: 'fet' | 'pendent' | 'avis',
     modulOrigen: string,
     idOrigen: string,
     accioClick: function (opcional, s'executa en clicar l'esdeveniment)
   }
*/

// ------------------------------------------------
// 1) REGISTRE DE PROVEÏDORS
// ------------------------------------------------
const AGENDA_PROVIDERS = [];

function registrarProveidorAgenda(fn) {
    if (typeof fn === 'function') {
        AGENDA_PROVIDERS.push(fn);
    }
}

/**
 * Consulta paginada genèrica a Supabase, per evitar el límit
 * de "Max Rows" (per defecte 1000) configurat al projecte.
 * Fa servir .range() repetidament fins que no queden més files.
 *
 * @param {string} taula - nom de la taula
 * @param {string} columnes - columnes a seleccionar (igual que .select())
 * @param {function} aplicarFiltres - funció que rep la query i hi aplica .eq()/.gte()/.lte()/etc.
 * @returns {Promise<Array>} totes les files trobades
 */
async function consultaPaginada(taula, columnes, aplicarFiltres) {
    let tots = [];
    let offset = 0;
    const pageSize = 1000;
    while (true) {
        let query = supabaseClient.from(taula).select(columnes);
        if (typeof aplicarFiltres === 'function') {
            query = aplicarFiltres(query);
        }
        const { data, error } = await query.range(offset, offset + pageSize - 1);
        if (error) {
            console.error('Error a consultaPaginada (' + taula + '):', error);
            break;
        }
        if (!data || data.length === 0) break;
        tots = tots.concat(data);
        if (data.length < pageSize) break; // última pàgina
        offset += pageSize;
    }
    return tots;
}

// Demana a tots els proveïdors registrats els esdeveniments
// del rang [dataInici, dataFi] (format 'YYYY-MM-DD', ambdós inclosos)
// i els retorna tots junts, ordenats per data.
async function getEsdevenimentsRang(dataInici, dataFi) {
    let resultats = [];

    for (const proveidor of AGENDA_PROVIDERS) {
        try {
            const esdeveniments = await proveidor(dataInici, dataFi);
            if (Array.isArray(esdeveniments)) {
                resultats = resultats.concat(esdeveniments);
            }
        } catch (e) {
            console.error('❌ Error en un proveïdor de l\'agenda:', e);
        }
    }

    resultats.sort(function(a, b) {
        return a.data < b.data ? -1 : (a.data > b.data ? 1 : 0);
    });

    return resultats;
}

// Helper per a un sol dia
async function getEsdevenimentsDia(data) {
    return getEsdevenimentsRang(data, data);
}

// Helper genèric: comprova si una data (YYYY-MM-DD) cau dins un rang
function dataDinsRang(data, dataInici, dataFi) {
    return data >= dataInici && data <= dataFi;
}

// ------------------------------------------------
// 2) PROVEÏDOR: CONTROL HORARI (fitxatges)
// ------------------------------------------------
function agendaProvider_controlHorari(dataInici, dataFi) {
    return controlHorari
        .filter(function(r) {
            return r.data && dataDinsRang(r.data, dataInici, dataFi);
        })
        .map(function(r) {
            const treb = treballadors.find(function(t) { return t.id === r.treballador_id; });
            const nom = treb ? treb.nom : 'Treballador desconegut';
            const hores = r.hores_treballades ? horesTotalsRegistre(r).toFixed(2) + 'h' : '';
            const tasca = tasques.find(function(t) { return t.id === r.tasca_id; });
            const nomTasca = tasca ? tasca.nom : (r.tasca_libre || '');

            return {
                data: r.data,
                tipus: 'fitxatge',
                titol: nom,
                detall: [hores, nomTasca].filter(Boolean).join(' · '),
                estat: r.hora_sortida ? 'fet' : 'pendent',
                modulOrigen: 'control-horari',
                idOrigen: r.id,
                accioClick: function() { veureControlHorari(r.id); }
            };
        });
}

// ------------------------------------------------
// 3) PROVEÏDOR: TRACTAMENTS FITOSANITARIS
// ------------------------------------------------
// Agrupem per data+producte+finca+varietat (mateix criteri que la taula de tractaments)
function agendaProvider_tractaments(dataInici, dataFi) {
    const enRang = tractaments.filter(function(t) {
        return t.data && dataDinsRang(t.data, dataInici, dataFi);
    });

    const grups = {};
    enRang.forEach(function(t) {
        const p = parcelles.find(function(pa) { return pa.id === t.parcella_id; });
        const finca = p ? (p.finca || 'Sense finca') : 'Sense finca';
        const varietat = p ? (p.varietat || 'Sense varietat') : 'Sense varietat';
        const clau = t.data + '|' + t.producte_id + '|' + finca + '|' + varietat;

        if (!grups[clau]) {
            grups[clau] = { data: t.data, producte_id: t.producte_id, finca: finca, varietat: varietat, clau: clau };
        }
    });

    return Object.values(grups).map(function(g) {
        const producte = fitosanitaris.find(function(f) { return f.id === g.producte_id; });
        const nomProducte = producte ? producte.nom : 'Producte desconegut';

        return {
            data: g.data,
            tipus: 'tractament',
            titol: nomProducte,
            detall: g.finca + ' · ' + g.varietat,
            estat: 'fet',
            modulOrigen: 'tractaments',
            idOrigen: g.clau,
            accioClick: function() { veureTractamentGrup(g.clau); }
        };
    });
}

// ------------------------------------------------
// 4) PROVEÏDOR: FERTILITZACIONS
// ------------------------------------------------
function agendaProvider_fertilitzacions(dataInici, dataFi) {
    const enRang = fertilitzacions.filter(function(f) {
        return f.data && dataDinsRang(f.data, dataInici, dataFi);
    });

    const grups = {};
    enRang.forEach(function(f) {
        const p = parcelles.find(function(pa) { return pa.id === f.parcella_id; });
        const finca = p ? (p.finca || 'Sense finca') : 'Sense finca';
        const varietat = p ? (p.varietat || 'Sense varietat') : 'Sense varietat';
        const clau = f.data + '|' + f.producte_id + '|' + finca + '|' + varietat;

        if (!grups[clau]) {
            grups[clau] = { data: f.data, producte_id: f.producte_id, finca: finca, varietat: varietat, clau: clau };
        }
    });

    return Object.values(grups).map(function(g) {
        const producte = fertilitzants.find(function(f) { return f.id === g.producte_id; });
        const nomProducte = producte ? producte.nom : 'Producte desconegut';

        return {
            data: g.data,
            tipus: 'fertilitzacio',
            titol: nomProducte,
            detall: g.finca + ' · ' + g.varietat,
            estat: 'fet',
            modulOrigen: 'fertilitzacions',
            idOrigen: g.clau,
            accioClick: function() { veureFertilitzacioGrup ? veureFertilitzacioGrup(g.clau) : null; }
        };
    });
}

// ------------------------------------------------
// 5) NOTES MANUALS — CRUD + PROVEÏDOR
// ------------------------------------------------
let agendaNotes = [];

async function getAgendaNotes(dataInici, dataFi) {
    try {
        const { data, error } = await supabaseClient
            .from('agenda_notes')
            .select('*')
            .gte('data', dataInici)
            .lte('data', dataFi)
            .order('data', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('Error carregant notes de l\'agenda:', e);
        return [];
    }
}

async function crearAgendaNota(data, text) {
    if (!hasPermission('insert')) {
        mostrarNotificacio('No tens permís per afegir notes a l\'agenda', 'error');
        return null;
    }
    try {
        const { data: creat, error } = await supabaseClient
            .from('agenda_notes')
            .insert([{
                data: data,
                text: text,
                creat_per: currentUser ? currentUser.id : null
            }])
            .select()
            .single();

        if (error) throw error;
        mostrarNotificacio('Nota afegida a l\'agenda', 'success');
        return creat;
    } catch (e) {
        console.error('Error creant nota:', e);
        mostrarNotificacio('Error afegint la nota', 'error');
        return null;
    }
}

async function eliminarAgendaNota(id) {
    if (!hasPermission('update')) {
        mostrarNotificacio('No tens permís per eliminar notes de l\'agenda', 'error');
        return false;
    }
    try {
        const { error } = await supabaseClient
            .from('agenda_notes')
            .delete()
            .eq('id', id);

        if (error) throw error;
        mostrarNotificacio('Nota eliminada', 'success');
        return true;
    } catch (e) {
        console.error('Error eliminant nota:', e);
        mostrarNotificacio('Error eliminant la nota', 'error');
        return false;
    }
}

async function agendaProvider_notesManuals(dataInici, dataFi) {
    const notes = await getAgendaNotes(dataInici, dataFi);

    return notes.map(function(n) {
        return {
            data: n.data,
            tipus: 'nota',
            titol: n.text,
            detall: '',
            estat: 'pendent',
            modulOrigen: 'agenda-notes',
            idOrigen: n.id,
            accioClick: null // les notes es gestionen directament des del propi widget de l'agenda
        };
    });
}

// ------------------------------------------------
// 6) REGISTRE DELS PROVEÏDORS INICIALS
// ------------------------------------------------
registrarProveidorAgenda(agendaProvider_controlHorari);
registrarProveidorAgenda(agendaProvider_tractaments);
registrarProveidorAgenda(agendaProvider_fertilitzacions);
registrarProveidorAgenda(agendaProvider_notesManuals);

// ------------------------------------------------
// 7) VOCABULARI COMÚ DE TIPUS (icona + color)
// ------------------------------------------------
const AGENDA_TIPUS_INFO = {
    fitxatge:      { icona: '🕐', color: '#2196f3', label: 'Fitxatge' },
    tractament:    { icona: '🧪', color: '#9c27b0', label: 'Tractament' },
    fertilitzacio: { icona: '🌱', color: '#4caf50', label: 'Fertilització' },
    fenologia:     { icona: '🍑', color: '#ff9800', label: 'Fenologia' },
    reg:           { icona: '💧', color: '#03a9f4', label: 'Reg' },
    collita:       { icona: '📦', color: '#795548', label: 'Collita' },
    factura:       { icona: '🧾', color: '#607d8b', label: 'Factura' },
    estoc:         { icona: '⚠️', color: '#f44336', label: 'Existències' },
    'assegurança': { icona: '🛡️', color: '#3f51b5', label: 'Assegurança' },
    bestreta:      { icona: '💶', color: '#009688', label: 'Bestreta' },
    nota:          { icona: '📝', color: '#757575', label: 'Nota' }
};

function getAgendaTipusInfo(tipus) {
    return AGENDA_TIPUS_INFO[tipus] || { icona: '📌', color: '#999', label: tipus };
}
