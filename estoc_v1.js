// estoc_v1.js — Sincronització d'estoc (un moviment per grup i línia de producte)
// Quadern de Camp NLASL · v1.0
// Depèn de: supabase-client, catàlegs globals `fitosanitaris` i `fertilitzants` (app_v8.js)
//
// Regles:
//  - L'estoc només compta moviments amb data >= ESTOC_DATA_INICI (inventari inicial).
//  - Cada tractament/fertilització (grup) genera 1 moviment per línia de producte.
//    referencia_id = id del grup. Mai es guarda res per parcel·la.
//  - sincronitzarEstocGrup és idempotent: esborra i regenera els moviments del grup.
//  - La unitat de la dosi ha de coincidir amb la unitat d'estoc del producte (kg o L).

const ESTOC_DATA_INICI = '2026-01-01';

function _estocUnitatBase(unitatDosi) {
    const b = String(unitatDosi || '').split('/')[0].trim();
    if (b === 'g') return 'kg';
    if (b === 'mL') return 'L';
    if (b.toLowerCase() === 'kg') return 'kg';
    if (b.toLowerCase() === 'l') return 'L';
    return b;
}

function _estocFactor(unitatDosi) {
    const b = String(unitatDosi || '').split('/')[0].trim();
    return (b === 'g' || b === 'mL') ? 0.001 : 1;
}

function _estocProducte(esFertilitzant, id) {
    const llista = esFertilitzant ? (fertilitzants || []) : (fitosanitaris || []);
    return llista.find(function(p) { return p.id === id; }) || null;
}

/**
 * Valida que la unitat de cada línia coincideix amb la unitat d'estoc del catàleg.
 * linies: [{ producte_id, fertilitzant_id, unitat }]  (fertilitzant_id opcional)
 * nomesFertilitzants: true a fertilitzacions (producte_id és un fertilitzant)
 * Retorna un missatge d'error o null.
 */
function validarUnitatsLinies(linies, nomesFertilitzants) {
    for (const l of linies) {
        const esFert = nomesFertilitzants ? true : !!l.fertilitzant_id;
        const id = nomesFertilitzants ? l.producte_id : (l.producte_id || l.fertilitzant_id);
        const p = _estocProducte(esFert, id);
        if (!p) return 'Producte no trobat al catàleg';
        const unitatStock = p.unitat_stock || 'L';
        if (_estocUnitatBase(l.unitat).toLowerCase() !== unitatStock.toLowerCase()) {
            return p.nom + ': la unitat de la dosi (' + l.unitat + ') no coincideix amb la unitat d\'estoc (' + unitatStock + ')';
        }
    }
    return null;
}

async function eliminarEstocGrup(tipus, grup) {
    const { error } = await supabaseClient
        .from('estoc_moviments')
        .delete()
        .eq('referencia_id', grup)
        .eq('tipus_moviment', tipus);
    if (error) throw error;
}

/**
 * Regenera els moviments d'estoc d'un grup a partir dels registres a la BD.
 * tipus: 'tractament' | 'fertilitzacio'
 * Retorna el nombre de moviments creats.
 */
async function sincronitzarEstocGrup(tipus, grup) {
    const esT = tipus === 'tractament';
    const taulaCap = esT ? 'tractaments' : 'fertilitzacions';
    const taulaLin = esT ? 'tractaments_productes' : 'fertilitzacions_productes';
    const colGrup  = esT ? 'grup_tractament' : 'grup_fertilitzacio';

    const rc = await supabaseClient.from(taulaCap)
        .select('id, data, superficie_tractada, created_by')
        .eq(colGrup, grup).eq('estat', 'actiu');
    if (rc.error) throw rc.error;
    const rl = await supabaseClient.from(taulaLin).select('*').eq(colGrup, grup);
    if (rl.error) throw rl.error;

    await eliminarEstocGrup(tipus, grup);

    const cap = rc.data || [];
    const lin = rl.data || [];
    if (!cap.length || !lin.length) return 0;

    const data = cap[0].data;
    const ha = cap.reduce(function(s, c) { return s + (parseFloat(c.superficie_tractada) || 0); }, 0);
    const label = esT ? 'Tractament' : 'Fertilització';

    const files = [];
    lin.forEach(function(l) {
        const esFert = esT ? !!l.fertilitzant_id : true;
        const idProd = esT ? (l.producte_id || l.fertilitzant_id) : l.producte_id;
        if (!idProd) return;
        const p = _estocProducte(esFert, idProd);
        const quantitat = ha * (parseFloat(l.dosi) || 0) * _estocFactor(l.unitat);
        if (!(quantitat > 0)) return;
        files.push({
            data: data,
            producte_id: idProd,
            tipus_producte: esFert ? 'fertilitzant' : 'fitosanitari',
            tipus_moviment: tipus,
            quantitat: -Number(quantitat.toFixed(4)),
            unitat: (p && p.unitat_stock) || _estocUnitatBase(l.unitat),
            referencia_id: grup,
            observacions: label + ' ' + ha.toFixed(2) + ' Ha (' + cap.length + ' parcel·les)',
            creat_per: cap[0].created_by || null,
            estat: 'actiu'
        });
    });

    if (!files.length) return 0;
    const ri = await supabaseClient.from('estoc_moviments').insert(files);
    if (ri.error) throw ri.error;
    return files.length;
}

console.log('✅ Estoc v1 carregat');
