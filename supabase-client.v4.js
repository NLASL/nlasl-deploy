// ============================================================
// SUPABASE CLIENT - Connexió a la base de dades
// Quadern de Camp NLASL - v4
// ============================================================

const SUPABASE_URL = 'https://xnxoufpizdtfklfjwqet.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Wh4NB0G3fYuNxYRSRJaBDg_HMUrClpm';

// Crear client Supabase (només si no existeix)
var supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globals
var currentUser = null;
var currentUserProfile = null;

// Obtenir usuari actual
async function getCurrentUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}

// Obtenir perfil usuari amb rol
async function getUserProfile(userId) {
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    
    if (error) {
        console.error('Error obtenint perfil:', error);
        return null;
    }
    
    return data;
}

// Comprovar permisos
function hasPermission(action) {
    if (!currentUserProfile) return false;
    
    const rol = currentUserProfile.rol;
    
    if (rol === 'admin') return true;
    
    if (rol === 'visor') {
        return action === 'select';
    }
    
    if (rol === 'editor') {
        return ['select', 'insert', 'update'].includes(action);
    }
    
    return false;
}

// SELECT
async function selectData(table, filters) {
    filters = filters || {};
    
    if (!hasPermission('select')) {
        throw new Error('No tens permís per veure aquestes dades');
    }
    
    let query = supabaseClient.from(table).select('*');
    
    Object.keys(filters).forEach(function(key) {
        query = query.eq(key, filters[key]);
    });
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error SELECT:', error);
        throw error;
    }
    
    return data || [];
}

// INSERT
async function insertData(table, record) {
    if (!hasPermission('insert')) {
        throw new Error('No tens permís per crear registres');
    }
    
    if (currentUser) {
        record.created_by = currentUser.id;
    }
    
    const { data, error } = await supabaseClient
        .from(table)
        .insert([record])
        .select()
        .single();
    
    if (error) {
        console.error('Error INSERT:', error);
        throw error;
    }
    
    return data;
}

// UPDATE
async function updateData(table, id, updates) {
    if (!hasPermission('update')) {
        throw new Error('No tens permís per editar registres');
    }
    
    const { data, error } = await supabaseClient
        .from(table)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error UPDATE:', error);
        throw error;
    }
    
    return data;
}

// DELETE
async function deleteData(table, id) {
    if (!hasPermission('delete')) {
        throw new Error('No tens permís per eliminar registres');
    }
    
    const { error } = await supabaseClient
        .from(table)
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error DELETE:', error);
        throw error;
    }
    
    return true;
}

// PARCELLES
async function getParcellas() {
    return await selectData('parcelles');
}

async function createParcella(parcella) {
    return await insertData('parcelles', parcella);
}

async function updateParcella(id, updates) {
    return await updateData('parcelles', id, updates);
}

async function deleteParcella(id) {
    return await deleteData('parcelles', id);
}

// FINQUES - Nova funcionalitat
async function getFinques() {
    if (!hasPermission('select')) {
        throw new Error('No tens permís per veure aquestes dades');
    }
    
    const { data, error } = await supabaseClient
        .from('parcelles')
        .select('finca')
        .not('finca', 'is', null)
        .order('finca');
    
    if (error) {
        console.error('Error obtenint finques:', error);
        throw error;
    }
    
    // Obtenir finques úniques
    const finquesUniques = [];
    const seen = new Set();
    
    data.forEach(function(item) {
        if (item.finca && !seen.has(item.finca)) {
            seen.add(item.finca);
            finquesUniques.push(item.finca);
        }
    });
    
    return finquesUniques;
}

async function getParcellesByFinca(finca) {
    if (!hasPermission('select')) {
        throw new Error('No tens permís per veure aquestes dades');
    }
    
    const { data, error } = await supabaseClient
        .from('parcelles')
        .select('*')
        .eq('finca', finca);
    
    if (error) {
        console.error('Error obtenint parcel·les per finca:', error);
        throw error;
    }
    
    return data || [];
}

// FITOSANITARIS
async function getFitosanitaris() {
    return await selectData('fitosanitaris');
}

async function createFitosanitari(producte) {
    return await insertData('fitosanitaris', producte);
}

async function updateFitosanitari(id, updates) {
    return await updateData('fitosanitaris', id, updates);
}

async function deleteFitosanitari(id) {
    return await deleteData('fitosanitaris', id);
}

// FERTILITZANTS
async function getFertilitzants() {
    return await selectData('fertilitzants');
}

async function createFertilitzant(producte) {
    return await insertData('fertilitzants', producte);
}

async function updateFertilitzant(id, updates) {
    return await updateData('fertilitzants', id, updates);
}

async function deleteFertilitzant(id) {
    return await deleteData('fertilitzants', id);
}

// TRACTAMENTS
async function getTractaments() {
    return await selectData('tractaments');
}

async function createTractament(tractament) {
    return await insertData('tractaments', tractament);
}

async function updateTractament(id, updates) {
    return await updateData('tractaments', id, updates);
}

async function deleteTractament(id) {
    return await deleteData('tractaments', id);
}

// FERTILITZACIONS
async function getFertilitzacions() {
    return await selectData('fertilitzacions');
}

async function createFertilitzacio(fertilitzacio) {
    return await insertData('fertilitzacions', fertilitzacio);
}

async function updateFertilitzacio(id, updates) {
    return await updateData('fertilitzacions', id, updates);
}

async function deleteFertilitzacio(id) {
    return await deleteData('fertilitzacions', id);
}

// Sincronització
function subscribeToChanges(table, callback) {
    const channel = supabaseClient
        .channel('public:' + table)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: table },
            callback
        )
        .subscribe();
    
    return channel;
}

function showSyncIndicator(message, type) {
    type = type || 'info';
    const indicator = document.getElementById('sync-indicator');
    const status = document.getElementById('sync-status');
    
    if (!indicator || !status) return;
    
    status.textContent = message;
    indicator.className = 'sync-indicator sync-' + type;
    indicator.style.display = 'block';
    
    setTimeout(function() {
        indicator.style.display = 'none';
    }, 3000);
}

console.log('✅ Supabase client v4 carregat');
