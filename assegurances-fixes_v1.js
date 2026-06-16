// ============================================================
// ASSEGURANCES FIXES v1
// Pegats sobre assegurances-unificat_v2-FINAL.js:
// 1. Corregeix getAssegurancesCivil → usa assegurances_altres
// 2. Corregeix obrirModalDetallAsseguranca → NOMÉS per a altres/civil
//    (agroseguro té la seva pròpia funció obrirModalDetallPolissa)
// 3. Corregeix mostrarVistaCivil → usa nova taula unificada
// ============================================================

// FIX 1: getAssegurancesCivil — usar taula unificada amb categoria='civil'
async function getAssegurancesCivil(exercici = null) {
    let query = supabaseClient
        .from('assegurances_altres')
        .select('*')
        .eq('categoria', 'civil');
    query = query.order('data_venciment', { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// FIX 2: Placeholders que NO han de sobreescriure agroseguro
// obrirModalDetallAsseguranca → per a "altres assegurances" (no agroseguro)
// obrirModalDetallPolissa     → per a agroseguro (NO tocar, està a agroseguro-modals_v1.js)
function obrirModalDetallAsseguranca(id) {
    obrirModalDetallU(id);
}
function obrirModalEditarAsseguranca(id) {
    obrirEditorCapcaleraU(id);
}
function obrirModalNovaAsseguranca() {
    obrirModalNovaU('altres');
}

// FIX 3: Civil — sobreescriu la del FINAL que usava taula vella
function obrirModalNovaCivil() {
    obrirModalNovaU('civil');
}
function obrirModalDetallCivil(id) {
    obrirModalDetallU(id);
}
function obrirModalEditarCivil(id) {
    obrirEditorCapcaleraU(id);
}

// FIX 4: mostrarVistaCivil — usar nova funció unificada
async function mostrarVistaCivil() {
    await mostrarVistaLlistatU('civil', 'civil-view');
}

// FIX 5: mostrarVistaAltresAsseg — usar nova funció unificada
async function mostrarVistaAltresAsseg() {
    await mostrarVistaLlistatU('altres', 'altres-asseg-view');
}

console.log('✅ Assegurances Fixes v1 carregat');
