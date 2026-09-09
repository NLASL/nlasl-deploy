// ============================================================
// COLLITA - LIQUIDACIONS
// Afegir aquestes funcions a supabase-client_v5.js
// (secció nova, després de COMPRES o abans de SUBSCRIPCIONS)
// ============================================================

// --- CAPÇALERA ---

async function getLiquidacions(filtres) {
    let query = supabaseClient
        .from('collita_liquidacions')
        .select('*')
        .order('data_liquidacio', { ascending: false });

    if (filtres) {
        if (filtres.campanya) {
            query = query.eq('campanya', filtres.campanya);
        }
        if (filtres.fruitaId) {
            query = query.eq('fruita_id', filtres.fruitaId);
        }
        if (filtres.varietatId) {
            query = query.eq('varietat_id', filtres.varietatId);
        }
        if (filtres.estat) {
            query = query.eq('estat', filtres.estat);
        }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function getLiquidacio(id) {
    const { data, error } = await supabaseClient
        .from('collita_liquidacions')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

async function createLiquidacio(liquidacio) {
    const liquidacioAudit = {
        ...liquidacio,
        creat_per: currentUser ? currentUser.id : null,
        creat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('collita_liquidacions')
        .insert([liquidacioAudit])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateLiquidacio(id, liquidacio) {
    const liquidacioAudit = {
        ...liquidacio,
        modificat_per: currentUser ? currentUser.id : null,
        modificat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('collita_liquidacions')
        .update(liquidacioAudit)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteLiquidacio(id) {
    // Hard delete: les línies s'eliminen en cascada (ON DELETE CASCADE)
    const { error } = await supabaseClient
        .from('collita_liquidacions')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// --- LÍNIES DETALL (calibre / qualitat / parcel·la) ---

async function getLiquidacioLinies(liquidacioId) {
    const { data, error } = await supabaseClient
        .from('collita_liquidacions_linies')
        .select('*')
        .eq('liquidacio_id', liquidacioId)
        .order('qualitat_nom');
    if (error) throw error;
    return data || [];
}

async function createLiquidacioLinia(linia) {
    const { data, error } = await supabaseClient
        .from('collita_liquidacions_linies')
        .insert([linia])
        .select();
    if (error) throw error;
    return data[0];
    // Nota: el trigger trg_recalcular_liquidacio actualitza automàticament
    // kg_total i import_brut a la capçalera collita_liquidacions
}

async function updateLiquidacioLinia(id, linia) {
    const { data, error } = await supabaseClient
        .from('collita_liquidacions_linies')
        .update(linia)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteLiquidacioLinia(id) {
    const { error } = await supabaseClient
        .from('collita_liquidacions_linies')
        .delete()
        .eq('id', id);
    if (error) throw error;
}
