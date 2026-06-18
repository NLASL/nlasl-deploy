// ============================================================
// ASSEGURANCES FIXES v1
// Sobreescriu TOTS els placeholders de assegurances-unificat_v2-FINAL.js
// Ha de carregar-se ÚLTIM de tots els mòduls
// ============================================================

// ── AGROSEGURO — DETALL PÒLISSA ─────────────────────────────
// NOTA: obrirModalPolissa() ja està definida a agroseguro-modals_v1.js
// (versió avançada amb tabs: Resum/Parcel·les/Sinistres/Estimació/Simulació).
// No es redefineix aquí per evitar sobreescriure-la, ja que aquest fitxer
// es carrega DESPRÉS i la seva definició guanyaria sempre.

// ── ALTRES ASSEGURANCES ─────────────────────────────────────
function obrirModalNovaAsseguranca()     { obrirModalNovaU('altres'); }
function obrirModalDetallAsseguranca(id) { obrirModalDetallU(id); }
function obrirModalEditarAsseguranca(id) { obrirEditorCapcaleraU(id); }

// ── RESPONSABILITAT CIVIL ───────────────────────────────────
function obrirModalNovaCivil()           { obrirModalNovaU('civil'); }
function obrirModalDetallCivil(id)       { obrirModalDetallU(id); }
function obrirModalEditarCivil(id)       { obrirEditorCapcaleraU(id); }

// ── VISTES ──────────────────────────────────────────────────
async function getAssegurancesCivil() {
    const { data, error } = await supabaseClient
        .from('assegurances_altres')
        .select('*')
        .eq('categoria', 'civil')
        .order('data_venciment', { ascending: true });
    if (error) throw error;
    return data || [];
}

async function mostrarVistaCivil() {
    await mostrarVistaLlistatU('civil', 'civil-view');
}

async function mostrarVistaAltresAsseg() {
    await mostrarVistaLlistatU('altres', 'altres-asseg-view');
}

// ── FIX tancarModal ─────────────────────────────────────────
// Sobreescriu la funció original que feia display:none
// (incompatible amb el CSS que força display:flex als modals)
function tancarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

console.log('✅ Assegurances Fixes v1 carregat');

// ── FIX Z-INDEX GLOBAL TOTS ELS MODALS ──────────────────────
// Força tots els .modal-overlay a estar per sobre de qualsevol element

(function fixZIndexModals() {
    if (document.getElementById('fix-zindex-modals')) return;
    const style = document.createElement('style');
    style.id = 'fix-zindex-modals';
    style.textContent = `
        .modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0,0,0,0.6) !important;
            z-index: 99999 !important;
            align-items: flex-start !important;
            justify-content: center !important;
            padding-top: 30px !important;
            overflow-y: auto !important;
        }
        .modal-overlay .modal-content {
            position: relative !important;
            z-index: 100000 !important;
            max-height: 85vh !important;
            overflow-y: auto !important;
            margin-bottom: 30px !important;
        }
    `;
    document.head.appendChild(style);
})();