// ============================================================
// PLANS ADOBAMENT v1
// Lògica CRUD + generació automàtica de línies (RD 1051/2022)
// Sense UI — vegeu plans-adobament-ui_v1.js
// ============================================================

// Cultius que NO entren al Pla d'Adobament (secà amb rotació/guaret)
const CULTIUS_EXCLOSOS_PLA_ADOBAMENT = [
    'ORDI', 'TRITICALE', 'BLAT', 'BLAT TOU',
    'GUARET', 'FORESTAL', 'FORESTALS', 'IMPRODUCTIU', 'OLIVERA'
];

// ============================================================
// UTILITATS DE NORMALITZACIÓ / MATCHING
// ============================================================

/**
 * Normalitza text per comparacions: majúscules, sense accents, sense espais sobrants.
 * Necessari perquè parcelles.cultiu/varietat té variants d'escriptura
 * (PRESSEC/PRÉSSEC, GUAYOX/GUAYOX 35 (VIFMPB 1 258), etc.)
 */
function normalitzarText(text) {
    if (!text) return '';
    return text
        .toString()
        .toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/**
 * Busca el valor NPK per defecte corresponent a una parcel·la.
 * 1r intent: match directe cultiu+varietat normalitzats contra npk_valors_defecte.
 * 2n intent (fallback): taula d'àlies npk_alies_varietat.
 */
function trobarNpkPerParcella(parcella, npkDefault, alies) {
    const cultiuNorm = normalitzarText(parcella.cultiu);
    const varietatNorm = normalitzarText(parcella.varietat);

    let npk = npkDefault.find(n =>
        normalitzarText(n.cultiu) === cultiuNorm &&
        normalitzarText(n.varietat) === varietatNorm
    );
    if (npk) return npk;

    const aliesMatch = alies.find(a =>
        normalitzarText(a.alies_cultiu) === cultiuNorm &&
        normalitzarText(a.alies_varietat) === varietatNorm
    );
    if (aliesMatch) {
        return npkDefault.find(n => n.id === aliesMatch.npk_id) || null;
    }

    return null;
}

// ============================================================
// PLANS ADOBAMENT — CAPÇALERA
// ============================================================

async function getPlansAdobament() {
    const { data, error } = await supabaseClient
        .from('plans_adobament')
        .select('*')
        .eq('eliminat', false)
        .order('campanya', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function getPlaAdobament(id) {
    const { data, error } = await supabaseClient
        .from('plans_adobament')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

async function createPlaAdobament(pla) {
    const plaAudit = {
        ...pla,
        created_by: currentUser ? currentUser.id : null
    };
    const { data, error } = await supabaseClient
        .from('plans_adobament')
        .insert([plaAudit])
        .select();
    if (error) throw error;
    return data[0];
}

async function updatePlaAdobament(id, pla) {
    const plaAudit = {
        ...pla,
        modificat_per: currentUser ? currentUser.id : null,
        modificat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('plans_adobament')
        .update(plaAudit)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deletePlaAdobament(id) {
    const { error } = await supabaseClient
        .from('plans_adobament')
        .update({
            eliminat: true,
            eliminat_per: currentUser ? currentUser.id : null,
            eliminat_at: new Date().toISOString()
        })
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// PLANS ADOBAMENT — LÍNIES (per parcel·la)
// ============================================================

async function getLiniesPla(plaId) {
    const { data, error } = await supabaseClient
        .from('plans_adobament_linies')
        .select('*, parcelles(nom, sigpac, cultiu, varietat, superficie, finca, regadiu)')
        .eq('pla_id', plaId);
    if (error) throw error;
    return data || [];
}

async function createLiniaPla(linia) {
    const liniaAudit = {
        ...linia,
        creat_per: currentUser ? currentUser.id : null
    };
    const { data, error } = await supabaseClient
        .from('plans_adobament_linies')
        .insert([liniaAudit])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateLiniaPla(id, linia) {
    const liniaAudit = {
        ...linia,
        modificat_per: currentUser ? currentUser.id : null,
        modificat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('plans_adobament_linies')
        .update(liniaAudit)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteLiniaPla(id) {
    const { error } = await supabaseClient
        .from('plans_adobament_linies')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// CANDIDATS DE LÍNIES A PARTIR DE PARCEL·LES DE REGADIU
// ============================================================

/**
 * Calcula els candidats de línia a partir de les parcel·les de regadiu
 * actives de la campanya indicada. NOMÉS CALCULA, no insereix res a la BD
 * — la UI els mostra en una taula d'edició (staging) amb opció de descartar
 * cada fila (X) abans de confirmar el guardat conjunt (guardarLiniesPla).
 * Exclou cereals/guaret/forestal/olivera encara que tinguin regadiu = true.
 * No repeteix parcel·les que ja tenen línia creada al pla.
 */
async function obtenirCandidatsLiniesPla(plaId, campanya) {
    const { data: parcellesRaw, error: errParcelles } = await supabaseClient
        .from('parcelles')
        .select('*')
        .eq('actiu', true)
        .eq('regadiu', true)
        .eq('campanya', campanya);
    if (errParcelles) throw errParcelles;

    const parcelles = (parcellesRaw || []).filter(p =>
        !CULTIUS_EXCLOSOS_PLA_ADOBAMENT.includes(normalitzarText(p.cultiu))
    );

    const { data: npkDefault, error: errNpk } = await supabaseClient
        .from('npk_valors_defecte')
        .select('*')
        .eq('actiu', true);
    if (errNpk) throw errNpk;

    const { data: alies, error: errAlies } = await supabaseClient
        .from('npk_alies_varietat')
        .select('*');
    if (errAlies) throw errAlies;

    const { data: liniesExistents, error: errLinies } = await supabaseClient
        .from('plans_adobament_linies')
        .select('parcella_id')
        .eq('pla_id', plaId);
    if (errLinies) throw errLinies;
    const jaAfegides = new Set((liniesExistents || []).map(l => l.parcella_id));

    const candidats = [];
    const senseNpk = [];

    for (const parcella of parcelles) {
        if (jaAfegides.has(parcella.id)) continue;

        const npk = trobarNpkPerParcella(parcella, npkDefault, alies);
        if (!npk) {
            senseNpk.push({
                parcella_id: parcella.id,
                nom: parcella.nom,
                cultiu: parcella.cultiu,
                varietat: parcella.varietat
            });
            continue;
        }

        // NOTA: id absent expressament — indica a la UI que és una línia
        // encara no persistida (staging). Es genera un _key local per al DOM.
        candidats.push({
            _key: 'nova-' + parcella.id,
            pla_id: plaId,
            parcella_id: parcella.id,
            cultiu: parcella.cultiu,
            rendiment_esperat: npk.rendiment_kg_ha,
            n_necessari: npk.n_kg_ha,
            p_necessari: npk.p2o5_kg_ha,
            k_necessari: npk.k2o_kg_ha,
            ph: null, n_sol: null, p_sol: null, k_sol: null, materia_organica: null,
            cultiu_precedent: null, mesures_emissions: null, aplicacions_previstes: [],
            parcelles: parcella
        });
    }

    return { candidats, parcellesJaExistents: jaAfegides.size, senseNpk };
}

/**
 * Persisteix en bloc l'estat d'edició (staging) d'un pla:
 * - línies sense id -> INSERT
 * - línies amb id -> UPDATE (es sobreescriuen tots els camps editables)
 * - línies originals que ja no són al staging (descartades amb X) -> DELETE
 */
async function guardarLiniesPla(plaId, liniesStaging, liniesOriginals) {
    const idsOriginals = new Set(liniesOriginals.map(l => l.id));
    const idsStaging = new Set(liniesStaging.filter(l => l.id).map(l => l.id));

    const idsEliminar = [...idsOriginals].filter(id => !idsStaging.has(id));
    for (const id of idsEliminar) {
        await deleteLiniaPla(id);
    }

    const campsEditables = ['cultiu_precedent', 'ph', 'n_sol', 'p_sol', 'k_sol',
        'materia_organica', 'n_necessari', 'p_necessari', 'k_necessari',
        'rendiment_esperat', 'mesures_emissions', 'aplicacions_previstes'];

    for (const linia of liniesStaging) {
        const dades = {};
        campsEditables.forEach(camp => { dades[camp] = linia[camp] ?? null; });

        if (linia.id) {
            await updateLiniaPla(linia.id, dades);
        } else {
            await createLiniaPla({
                pla_id: plaId,
                parcella_id: linia.parcella_id,
                cultiu: linia.cultiu,
                ...dades
            });
        }
    }

    return { creades: liniesStaging.filter(l => !l.id).length, actualitzades: liniesStaging.filter(l => l.id).length, eliminades: idsEliminar.length };
}

// ============================================================
// SUGGERIMENT DE CULTIU PRECEDENT (mai auto-assignat)
// ============================================================

/**
 * Suggereix candidats de la campanya anterior per determinar cultiu_precedent.
 * NOMÉS SUGGERIMENT — cal confirmació manual a la UI.
 * No hi ha clau estable entre campanyes (SIGPAC inconsistent, sense FK finques),
 * per això es compara per finca (text normalitzat) + superfície similar (±15%).
 */
async function suggerirCultiuPrecedent(parcella, campanyaActual) {
    const { data: candidats, error } = await supabaseClient
        .from('parcelles')
        .select('id, nom, cultiu, varietat, superficie, finca, sigpac')
        .eq('campanya', campanyaActual - 1)
        .eq('actiu', true);
    if (error) throw error;

    const MARGE_SUPERFICIE = 0.15;
    const fincaNorm = normalitzarText(parcella.finca);

    return (candidats || [])
        .filter(c => {
            if (!c.finca || !parcella.finca) return false;
            const mateixaFinca = normalitzarText(c.finca) === fincaNorm;
            if (!mateixaFinca) return false;
            if (!parcella.superficie) return true;
            const diferencia = Math.abs(c.superficie - parcella.superficie) / parcella.superficie;
            return diferencia <= MARGE_SUPERFICIE;
        })
        .sort((a, b) =>
            Math.abs(a.superficie - parcella.superficie) - Math.abs(b.superficie - parcella.superficie)
        );
}

// ============================================================
// RESUM / TOTALS DEL PLA
// ============================================================

/**
 * Calcula els totals del pla: superfície, N/P/K necessaris (kg totals i ponderats/ha),
 * i quantes línies encara no tenen dades de sòl introduïdes.
 */
function calcularResumPla(linies) {
    let superficieTotal = 0;
    let nTotal = 0, pTotal = 0, kTotal = 0;
    let liniesSenseSol = 0;

    linies.forEach(l => {
        const superficie = parseFloat(l.parcelles ? l.parcelles.superficie : 0) || 0;
        superficieTotal += superficie;
        nTotal += (parseFloat(l.n_necessari) || 0) * superficie;
        pTotal += (parseFloat(l.p_necessari) || 0) * superficie;
        kTotal += (parseFloat(l.k_necessari) || 0) * superficie;
        if (l.ph === null || l.ph === undefined) liniesSenseSol++;
    });

    return {
        numLinies: linies.length,
        superficieTotal,
        nTotalKg: nTotal,
        pTotalKg: pTotal,
        kTotalKg: kTotal,
        liniesSenseSol
    };
}

console.log('✅ Plans adobament v1 carregat');
