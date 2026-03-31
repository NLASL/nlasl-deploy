// ============================================================
// SUPABASE CLIENT v5
// Funcions CRUD per totes les taules
// ============================================================

const SUPABASE_URL = 'https://xnxoufpizdtfklfjwqet.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhueG91ZnBpemR0ZmtsZmp3cWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDk4NDAsImV4cCI6MjA4NjU4NTg0MH0.izqQdOxUWUzXNhasXwHnm7IO2qVHHHzx9e-1FIGh9ic';

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
        .from('treballadors_amb_ban')
        .select('*')
        .eq('eliminat', false)
        .order('nom');
    if (error) throw error;
    return data || [];
}

async function createTreballador(treballador) {
    const treballadorAudit = {
        ...treballador,
        creat_per: currentUser ? currentUser.id : null,
        creat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('treballadors')
        .insert([treballadorAudit])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateTreballador(id, treballador) {
    const treballadorAudit = {
        ...treballador,
        modificat_per: currentUser ? currentUser.id : null,
        modificat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('treballadors')
        .update(treballadorAudit)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteTreballador(id) {
    const { error } = await supabaseClient
        .from('treballadors')
        .update({
            eliminat: true,
            eliminat_per: currentUser ? currentUser.id : null,
            eliminat_at: new Date().toISOString()
        })
        .eq('id', id);
    if (error) throw error;
}

async function getTreballadors(incloureEliminats = false) {
    let query = supabaseClient
        .from('treballadors_amb_ban')
        .select('*')
        .order('nom');
    
    if (!incloureEliminats) {
        query = query.eq('eliminat', false);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// ============================================================
// CONTROL HORARI
// ============================================================

async function getControlHorari(filtres) {
    let query = supabaseClient
        .from('control_horari')
        .select('*')
        .eq('eliminat', false)
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
    const registreAudit = {
        ...registre,
        creat_per: currentUser ? currentUser.id : null,
        creat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('control_horari')
        .insert([registreAudit])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateControlHorari(id, registre) {
    const registreAudit = {
        ...registre,
        modificat_per: currentUser ? currentUser.id : null,
        modificat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('control_horari')
        .update(registreAudit)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteControlHorari(id) {
    const { error } = await supabaseClient
        .from('control_horari')
        .update({
            eliminat: true,
            eliminat_per: currentUser ? currentUser.id : null,
            eliminat_at: new Date().toISOString()
        })
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
        .eq('eliminat', false)
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
    const incidenciaAudit = {
        ...incidencia,
        creat_per: currentUser ? currentUser.id : null,
        creat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('incidencies')
        .insert([incidenciaAudit])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateIncidencia(id, incidencia) {
    const incidenciaAudit = {
        ...incidencia,
        modificat_per: currentUser ? currentUser.id : null,
        modificat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('incidencies')
        .update(incidenciaAudit)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteIncidencia(id) {
    const { error } = await supabaseClient
        .from('incidencies')
        .update({
            eliminat: true,
            eliminat_per: currentUser ? currentUser.id : null,
            eliminat_at: new Date().toISOString()
        })
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
        .eq('eliminat', false)
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
    const absenciaAudit = {
        ...absencia,
        creat_per: currentUser ? currentUser.id : null,
        creat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('absencies')
        .insert([absenciaAudit])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateAbsencia(id, absencia) {
    const absenciaAudit = {
        ...absencia,
        modificat_per: currentUser ? currentUser.id : null,
        modificat_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
        .from('absencies')
        .update(absenciaAudit)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteAbsencia(id) {
    const { error } = await supabaseClient
        .from('absencies')
        .update({
            eliminat: true,
            eliminat_per: currentUser ? currentUser.id : null,
            eliminat_at: new Date().toISOString()
        })
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// SUBSCRIPCIONS TEMPS REAL
// ============================================================
let realtimeCanals = {};

function subscribeToChanges(table, callback) {
    if (realtimeCanals[table]) return realtimeCanals[table];
    realtimeCanals[table] = supabaseClient
        .channel('public:' + table)
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: table },
            callback
        )
        .subscribe();
    return realtimeCanals[table];
}

async function getAlertes() {
    const avui = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
        .from('alertes')
        .select('*')
        .eq('activa', true)
        .lte('data_inici', new Date(new Date().setDate(new Date().getDate() + 60)).toISOString().split('T')[0])
        .order('data_inici');
    if (error) throw error;
    return data || [];
}

async function createAlerta(alerta) {
    const { data, error } = await supabaseClient
        .from('alertes')
        .insert([{ ...alerta, creat_per: currentUser ? currentUser.id : null }])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateAlerta(id, alerta) {
    const { data, error } = await supabaseClient
        .from('alertes')
        .update(alerta)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteAlerta(id) {
    const { error } = await supabaseClient
        .from('alertes')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

// ============================================================
// GASOIL
// ============================================================


async function getGasoil() {
    const { data, error } = await supabaseClient
        .from('gasoil')
        .select('*')
        .order('data', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function createGasoil(registre) {
    const { data, error } = await supabaseClient
        .from('gasoil')
        .insert([{ ...registre, creat_per: currentUser ? currentUser.id : null }])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateGasoil(id, registre) {
    const { data, error } = await supabaseClient
        .from('gasoil')
        .update(registre)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteGasoil(id) {
    const { error } = await supabaseClient
        .from('gasoil')
        .delete()
        .eq('id', id);
    if (error) throw error;
}
// ============================================================
// COMPRES
// ============================================================

async function getCompresFactures() {
    const { data, error } = await supabaseClient
        .from('compres_factures')
        .select('*')
        .order('data', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function createCompraFactura(factura) {
    const { data, error } = await supabaseClient
        .from('compres_factures')
        .insert([{ ...factura, creat_per: currentUser ? currentUser.id : null }])
        .select();
    if (error) throw error;
    return data[0];
}

async function updateCompraFactura(id, factura) {
    const { data, error } = await supabaseClient
        .from('compres_factures')
        .update(factura)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteCompraFactura(id) {
    const { error } = await supabaseClient
        .from('compres_factures')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

async function getCompresLinies(facturaId) {
    const { data, error } = await supabaseClient
        .from('compres_linies')
        .select('*')
        .eq('factura_id', facturaId)
        .order('ordre');
    if (error) throw error;
    return data || [];
}

async function createCompraLinia(linia) {
    const { data, error } = await supabaseClient
        .from('compres_linies')
        .insert([linia])
        .select();
    if (error) throw error;
    return data[0];
}

async function deleteCompresLinies(facturaId) {
    const { error } = await supabaseClient
        .from('compres_linies')
        .delete()
        .eq('factura_id', facturaId);
    if (error) throw error;
}

console.log('✅ Supabase client v5 carregat');
