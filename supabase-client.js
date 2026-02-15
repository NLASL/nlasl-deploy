// ============================================================
// SUPABASE CLIENT - Connexió a la base de dades
// ============================================================

const SUPABASE_URL = 'https://xnxoufpizdtfklfjwqet.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Wh4NB0G3fYuNxYRSRJaBDg_HMUrClpm';


// Crear client Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globals per ús en altres scripts
window.supabaseClient = supabase;
window.currentUser = null;
window.currentUserProfile = null;

console.log("✅ Supabase client inicialitzat correctament");
console.log("supabaseClient:", window.supabaseClient);
// ============================================================
// FUNCIONS D'UTILITAT
// ============================================================

// Obtenir usuari actual
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        window.currentUser = user;
        return user;
    } catch (err) {
        console.error('Error obtenint usuari actual:', err);
        return null;
    }
}

// Obtenir perfil usuari (amb rol)
async function getUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        window.currentUserProfile = data;
        return data;
    } catch (err) {
        console.error('Error obtenint perfil:', err);
        return null;
    }
}

// Comprovar si usuari té permís
function hasPermission(action) {
    if (!window.currentUserProfile) return false;
    const rol = window.currentUserProfile.rol;
    if (rol === 'admin') return true;
    if (rol === 'visor') return action === 'select';
    if (rol === 'editor') return ['select', 'insert', 'update'].includes(action);
    return false;
}

// ============================================================
// CRUD GENÈRIC AMB PERMISOS
// ============================================================

async function selectData(table, filters = {}) {
    if (!hasPermission('select')) throw new Error('No tens permís per veure aquestes dades');
    let query = supabase.from(table).select('*');
    Object.keys(filters).forEach(key => query = query.eq(key, filters[key]));
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

async function insertData(table, record) {
    if (!hasPermission('insert')) throw new Error('No tens permís per crear registres');
    if (window.currentUser) record.created_by = window.currentUser.id;
    const { data, error } = await supabase.from(table).insert([record]).select().single();
    if (error) throw error;
    return data;
}

async function updateData(table, id, updates) {
    if (!hasPermission('update')) throw new Error('No tens permís per editar registres');
    const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
}

async function deleteData(table, id) {
    if (!hasPermission('delete')) throw new Error('No tens permís per eliminar registres');
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return true;
}

// ============================================================
// FUNCIONS ESPECÍFIQUES PER TAULA
// ============================================================

async function getParcellas() { return await selectData('parcelles'); }
async function createParcella(p) { return await insertData('parcelles', p); }
async function updateParcella(id, u) { return await updateData('parcelles', id, u); }
async function deleteParcella(id) { return await deleteData('parcelles', id); }

async function getFitosanitaris() { return await selectData('fitosanitaris'); }
async function createFitosanitari(p) { return await insertData('fitosanitaris', p); }
async function updateFitosanitari(id, u) { return await updateData('fitosanitaris', id, u); }
async function deleteFitosanitari(id) { return await deleteData('fitosanitaris', id); }

async function getFertilitzants() { return await selectData('fertilitzants'); }
async function createFertilitzant(p) { return await insertData('fertilitzants', p); }
async function updateFertilitzant(id, u) { return await updateData('fertilitzants', id, u); }
async function deleteFertilitzant(id) { return await deleteData('fertilitzants', id); }

async function getTractaments() { return await selectData('tractaments'); }
async function createTractament(t) { return await insertData('tractaments', t); }
async function updateTractament(id, u) { return await updateData('tractaments', id, u); }
async function deleteTractament(id) { return await deleteData('tractaments', id); }

async function getFertilitzacions() { return await selectData('fertilitzacions'); }
async function createFertilitzacio(f) { return await insertData('fertilitzacions', f); }
async function updateFertilitzacio(id, u) { return await updateData('fertilitzacions', id, u); }
async function deleteFertilitzacio(id) { return await deleteData('fertilitzacions', id); }

// ============================================================
// SINCRONITZACIÓ I LISTENERS
// ============================================================

function subscribeToChanges(table, callback) {
    return supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe();
}

function showSyncIndicator(message, type = 'info') {
    const indicator = document.getElementById('sync-indicator');
    const status = document.getElementById('sync-status');
    if (!indicator || !status) return;
    status.textContent = message;
    indicator.className = 'sync-indicator sync-' + type;
    indicator.style.display = 'block';
    setTimeout(() => indicator.style.display = 'none', 3000);
}

console.log('✅ Supabase client carregat correctament');
