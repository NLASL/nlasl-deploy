// ============================================================
// SUPABASE CLIENT v5
// Funcions CRUD per totes les taules
// ============================================================

const SUPABASE_URL = 'https://xnxoufpizdtfklfjwqet.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhueG91ZnBpemR0ZmtsZmp3cWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0NDkyMjIsImV4cCI6MjA1NTAyNTIyMn0.Wh4NB0G3fYuNxYRSRJaBDg_HMUrClpmcT-C5m78nSYU';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// PARCELLES
// ============================================================

async function getParcellas() {
    const { data, error } = await supabaseClient
        .from('parcelles')
        .select('*')
        .order('nom');
    if (error) throw error;
    return data || [];
}

async function createParcella(parcella) {
    const { data, error } = await supabaseClient
        .from('parcelles')
        .insert([parcella])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateParcella(id, parcella) {
    const { data, error } = await supabaseClient
        .from('parcelles')
        .update(parcella)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteParcella(id) {
    const { error } = await supabaseClient
        .from('parcelles')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

async function getFinques() {
    const { data, error } = await supabaseClient
        .from('parcelles')
        .select('finca')
        .not('finca', 'is', null)
        .order('finca');
    if (error) throw error;
    const finques = [...new Set(data.map(p => p.finca))];
    return finques.sort();
}

// ============================================================
// FITOSANITARIS
// ============================================================

async function getFitosanitaris() {
    const { data, error } = await supabaseClient
        .from('fitosanitaris')
        .select('*')
        .order('nom');
    if (error) throw error;
    return data || [];
}

async function createFitosanitari(fitosanitari) {
    const { data, error } = await supabaseClient
        .from('fitosanitaris')
        .insert([fitosanitari])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateFitosanitari(id, fitosanitari) {
    const { data, error } = await supabaseClient
        .from('fitosanitaris')
        .update(fitosanitari)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteFitosanitari(id) {
    const { error } = await supabaseClient
        .from('fitosanitaris')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// FERTILITZANTS
// ============================================================

async function getFertilitzants() {
    const { data, error} = await supabaseClient
        .from('fertilitzants')
        .select('*')
        .order('nom');
    if (error) throw error;
    return data || [];
}

async function createFertilitzant(fertilitzant) {
    const { data, error } = await supabaseClient
        .from('fertilitzants')
        .insert([fertilitzant])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateFertilitzant(id, fertilitzant) {
    const { data, error } = await supabaseClient
        .from('fertilitzants')
        .update(fertilitzant)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteFertilitzant(id) {
    const { error } = await supabaseClient
        .from('fertilitzants')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// TRACTAMENTS
// ============================================================

async function getTractaments() {
    const { data, error } = await supabaseClient
        .from('tractaments')
        .select('*')
        .order('data', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function createTractament(tractament) {
    const { data, error } = await supabaseClient
        .from('tractaments')
        .insert([tractament])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateTractament(id, tractament) {
    const { data, error } = await supabaseClient
        .from('tractaments')
        .update(tractament)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteTractament(id) {
    const { error } = await supabaseClient
        .from('tractaments')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// FERTILITZACIONS
// ============================================================

async function getFertilitzacions() {
    const { data, error } = await supabaseClient
        .from('fertilitzacions')
        .select('*')
        .order('data', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function createFertilitzacio(fertilitzacio) {
    const { data, error } = await supabaseClient
        .from('fertilitzacions')
        .insert([fertilitzacio])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateFertilitzacio(id, fertilitzacio) {
    const { data, error } = await supabaseClient
        .from('fertilitzacions')
        .update(fertilitzacio)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteFertilitzacio(id) {
    const { error } = await supabaseClient
        .from('fertilitzacions')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// TREBALLADORS
// ============================================================

async function getTreballadors() {
    const { data, error } = await supabaseClient
        .from('treballadors')
        .select('*')
        .order('nom');
    if (error) throw error;
    return data || [];
}

async function createTreballador(treballador) {
    const { data, error } = await supabaseClient
        .from('treballadors')
        .insert([treballador])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateTreballador(id, treballador) {
    const { data, error } = await supabaseClient
        .from('treballadors')
        .update(treballador)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteTreballador(id) {
    const { error } = await supabaseClient
        .from('treballadors')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// CONTROL HORARI
// ============================================================

async function getControlHorari(filtres) {
    let query = supabaseClient
        .from('control_horari')
        .select('*')
        .order('data', { ascending: false });
    
    if (filtres) {
        if (filtres.dataInici) {
            query = query.gte('data', filtres.dataInici);
        }
        if (filtres.dataFi) {
            query = query.lte('data', filtres.dataFi);
        }
        if (filtres.treballadorId) {
            query = query.eq('treballador_id', filtres.treballadorId);
        }
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function createControlHorari(registre) {
    const { data, error } = await supabaseClient
        .from('control_horari')
        .insert([registre])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateControlHorari(id, registre) {
    const { data, error } = await supabaseClient
        .from('control_horari')
        .update(registre)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteControlHorari(id) {
    const { error } = await supabaseClient
        .from('control_horari')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// AUTH / PERFIL USUARI
// ============================================================

async function getUserProfile(userId) {
    const { data, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) {
        console.warn('No user profile found:', error);
        return null;
    }
    return data;
}

// ============================================================
// TASQUES
// ============================================================

async function getTasques() {
    const { data, error } = await supabaseClient
        .from('tasques')
        .select('*')
        .eq('activa', true)
        .order('nom');
    if (error) throw error;
    return data || [];
}

// ============================================================
// MOTIUS ABSÈNCIA
// ============================================================

async function getMotiusAbsencia() {
    const { data, error } = await supabaseClient
        .from('motius_absencia')
        .select('*')
        .eq('actiu', true)
        .order('nom');
    if (error) throw error;
    return data || [];
}

// ============================================================
// INCIDÈNCIES
// ============================================================

async function getIncidencies(filtres) {
    let query = supabaseClient
        .from('incidencies')
        .select('*')
        .order('data', { ascending: false });
    
    if (filtres) {
        if (filtres.treballadorId) {
            query = query.eq('treballador_id', filtres.treballadorId);
        }
        if (filtres.estat) {
            query = query.eq('estat', filtres.estat);
        }
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function createIncidencia(incidencia) {
    const { data, error } = await supabaseClient
        .from('incidencies')
        .insert([incidencia])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateIncidencia(id, incidencia) {
    const { data, error } = await supabaseClient
        .from('incidencies')
        .update(incidencia)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteIncidencia(id) {
    const { error } = await supabaseClient
        .from('incidencies')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// ABSÈNCIES
// ============================================================

async function getAbsencies(filtres) {
    let query = supabaseClient
        .from('absencies')
        .select('*')
        .order('data_inici', { ascending: false });
    
    if (filtres) {
        if (filtres.treballadorId) {
            query = query.eq('treballador_id', filtres.treballadorId);
        }
        if (filtres.estat) {
            query = query.eq('estat', filtres.estat);
        }
        if (filtres.tipus) {
            query = query.eq('tipus', filtres.tipus);
        }
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function createAbsencia(absencia) {
    const { data, error } = await supabaseClient
        .from('absencies')
        .insert([absencia])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateAbsencia(id, absencia) {
    const { data, error } = await supabaseClient
        .from('absencies')
        .update(absencia)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteAbsencia(id) {
    const { error } = await supabaseClient
        .from('absencies')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// SUBSCRIPCIONS TEMPS REAL
// ============================================================

function subscribeToChanges(table, callback) {
    return supabaseClient
        .channel('public:' + table)
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: table },
            callback
        )
        .subscribe();
}

console.log('✅ Supabase client v5 carregat');
