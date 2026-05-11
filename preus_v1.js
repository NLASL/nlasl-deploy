// ============================================================
// PREUS.V1.JS - Gestió de Preus (Bestreta + Liquidació)
// ============================================================

// Variables globals
let preusAnuals = [];
let preusCalibres = [];
let preusNoComercios = [];
let preusIndustria = [];

// ============================================================
// DETECTAR CAMPANYA ACTUAL (DINÀMIC)
// ============================================================

function obtenirCampanyaActual() {
    const avui = new Date();
    const mes = avui.getMonth() + 1; // 1-12
    const any = avui.getFullYear();
    
    // Collita: Maig (5) a Octubre (10) = campanya actual
    if (mes >= 5 && mes <= 10) {
        return any; // 2026, 2027, 2028, etc.
    } else {
        // Gener-Abril (1-4) = campanya anterior
        // Novembre-Desembre (11-12) = campanya actual (finals)
        return mes >= 11 ? any : any - 1;
    }
}

function obtenirCampanyaPerDates(dataInici) {
    const data = new Date(dataInici);
    const mes = data.getMonth() + 1; // 1-12
    const any = data.getFullYear();
    
    // Si data és maig-octubre = any de la data
    if (mes >= 5 && mes <= 10) {
        return any;
    } else {
        // Si data és gener-abril = any anterior
        // Si data és novembre-desembre = any de la data
        return mes >= 11 ? any : any - 1;
    }
}

// ============================================================
// 1. CARGAR TODOS LOS PREUS
// ============================================================

async function carregarDadesPreus() {
    try {
        console.log('🔄 Carregant totes les dades Preus...');
        
        // CARREGAR TOTES LES CAMPANYES (no només actual)
        preusAnuals = await obtenirPreusAnuals(null); // null = totes
        preusCalibres = await obtenirPreusCalibres();
        preusNoComercios = await obtenirPreusNoComercios();
        preusIndustria = await obtenirPreusIndustria();
        
        console.log('✅ Preus carregats correctament - ' + preusAnuals.length + ' bestretes');
    } catch (error) {
        console.error('❌ Error carregant preus:', error);
    }
}

// ============================================================
// 2. BESTRETA - CRUD
// ============================================================

async function obtenirPreusAnuals(campanya = null) {
    try {
        let query = supabaseClient
            .from('collita_preus_anuals')
            .select('*')
            .order('campanya', { ascending: false })
            .order('created_at', { ascending: false });
        
        if (campanya !== null) {
            query = query.eq('campanya', campanya);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error obtenint preus anuals:', error);
        return [];
    }
}

async function crearPreuBestreta(dades) {
    try {
        console.log('Creant bestreta:', dades);
        
        const preuUnitariArrodonat = Math.round(dades.bestreta_preu_unitari * 1000) / 1000;
        
        const { data, error } = await supabaseClient
            .from('collita_preus_anuals')
            .insert([{
                ...dades,
                bestreta_preu_unitari: preuUnitariArrodonat
            }])
            .select();
        
        if (error) throw error;
        console.log('✅ Bestreta creada');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
        
        return data[0];
    } catch (error) {
        console.error('❌ Error creant bestreta:', error);
        throw error;
    }
}

async function actualitzarPreuBestreta(id, dades) {
    try {
        const preuUnitariArrodonat = Math.round(dades.bestreta_preu_unitari * 1000) / 1000;
        
        const { error } = await supabaseClient
            .from('collita_preus_anuals')
            .update({
                ...dades,
                bestreta_preu_unitari: preuUnitariArrodonat
            })
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Bestreta actualitzada');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
    } catch (error) {
        console.error('❌ Error actualitzant bestreta:', error);
        throw error;
    }
}

async function eliminarPreuBestreta(id) {
    try {
        const { error } = await supabaseClient
            .from('collita_preus_anuals')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Bestreta eliminada');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
    } catch (error) {
        console.error('❌ Error eliminant bestreta:', error);
        throw error;
    }
}

// ============================================================
// 3. CALIBRES - CRUD
// ============================================================

async function obtenirPreusCalibres(preuAnnualId = null) {
    try {
        let query = supabaseClient
            .from('collita_preus_liquidacio_calibres')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (preuAnnualId) {
            query = query.eq('preus_anuals_id', preuAnnualId);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.warn('⚠️ Taula liquidació_calibres no té dades o error:', error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('❌ Error obtenint calibres:', error);
        return [];
    }
}

async function crearPreuCallibre(dades) {
    try {
        const preuUnitariArrodonat = Math.round(dades.preu_unitari * 1000) / 1000;
        
        const { data, error } = await supabaseClient
            .from('collita_preus_liquidacio_calibres')
            .insert([{
                ...dades,
                preu_unitari: preuUnitariArrodonat
            }])
            .select();
        
        if (error) throw error;
        console.log('✅ Calibre creat');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
        
        return data[0];
    } catch (error) {
        console.error('❌ Error creant calibre:', error);
        throw error;
    }
}

async function actualitzarPreuCallibre(id, dades) {
    try {
        const preuUnitariArrodonat = Math.round(dades.preu_unitari * 1000) / 1000;
        
        const { error } = await supabaseClient
            .from('collita_preus_liquidacio_calibres')
            .update({
                ...dades,
                preu_unitari: preuUnitariArrodonat
            })
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Calibre actualitzat');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
    } catch (error) {
        console.error('❌ Error actualitzant calibre:', error);
        throw error;
    }
}

async function eliminarPreuCallibre(id) {
    try {
        const { error } = await supabaseClient
            .from('collita_preus_liquidacio_calibres')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Calibre eliminat');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
    } catch (error) {
        console.error('❌ Error eliminant calibre:', error);
        throw error;
    }
}

// ============================================================
// 4. NO COMERCIAL - CRUD
// ============================================================

async function obtenirPreusNoComercios(preuAnnualId = null) {
    try {
        let query = supabaseClient
            .from('collita_preus_liquidacio_no_comercial')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (preuAnnualId) {
            query = query.eq('preus_anuals_id', preuAnnualId);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.warn('⚠️ Taula liquidació_no_comercial no té dades o error:', error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('❌ Error obtenint no comercials:', error);
        return [];
    }
}

async function crearPreuNoComerci(dades) {
    try {
        const preuUnitariArrodonat = Math.round(dades.preu_unitari * 1000) / 1000;
        
        const { data, error } = await supabaseClient
            .from('collita_preus_liquidacio_no_comercial')
            .insert([{
                ...dades,
                preu_unitari: preuUnitariArrodonat
            }])
            .select();
        
        if (error) throw error;
        console.log('✅ No comercial creat');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
        
        return data[0];
    } catch (error) {
        console.error('❌ Error creant no comercial:', error);
        throw error;
    }
}

async function actualitzarPreuNoComerci(id, dades) {
    try {
        const preuUnitariArrodonat = Math.round(dades.preu_unitari * 1000) / 1000;
        
        const { error } = await supabaseClient
            .from('collita_preus_liquidacio_no_comercial')
            .update({
                ...dades,
                preu_unitari: preuUnitariArrodonat
            })
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ No comercial actualitzat');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
    } catch (error) {
        console.error('❌ Error actualitzant no comercial:', error);
        throw error;
    }
}

async function eliminarPreuNoComerci(id) {
    try {
        const { error } = await supabaseClient
            .from('collita_preus_liquidacio_no_comercial')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ No comercial eliminat');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
    } catch (error) {
        console.error('❌ Error eliminant no comercial:', error);
        throw error;
    }
}

// ============================================================
// 5. INDUSTRIA - CRUD
// ============================================================

async function obtenirPreusIndustria(preuAnnualId = null) {
    try {
        let query = supabaseClient
            .from('collita_preus_liquidacio_industria')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (preuAnnualId) {
            query = query.eq('preus_anuals_id', preuAnnualId);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.warn('⚠️ Taula liquidació_industria no té dades o error:', error.message);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('❌ Error obtenint industria:', error);
        return [];
    }
}

async function crearPreuIndustria(dades) {
    try {
        const preuUnitariArrodonat = Math.round(dades.preu_unitari * 1000) / 1000;
        
        const { data, error } = await supabaseClient
            .from('collita_preus_liquidacio_industria')
            .insert([{
                ...dades,
                preu_unitari: preuUnitariArrodonat
            }])
            .select();
        
        if (error) throw error;
        console.log('✅ Industria creat');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
        
        return data[0];
    } catch (error) {
        console.error('❌ Error creant industria:', error);
        throw error;
    }
}

async function actualitzarPreuIndustria(id, dades) {
    try {
        const preuUnitariArrodonat = Math.round(dades.preu_unitari * 1000) / 1000;
        
        const { error } = await supabaseClient
            .from('collita_preus_liquidacio_industria')
            .update({
                ...dades,
                preu_unitari: preuUnitariArrodonat
            })
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Industria actualitzat');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
    } catch (error) {
        console.error('❌ Error actualitzant industria:', error);
        throw error;
    }
}

async function eliminarPreuIndustria(id) {
    try {
        const { error } = await supabaseClient
            .from('collita_preus_liquidacio_industria')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Industria eliminat');
        
        // ⭐ RECARREGAR DADES
        await carregarDadesPreus();
    } catch (error) {
        console.error('❌ Error eliminant industria:', error);
        throw error;
    }
}

// ============================================================
// 6. UTILITATS
// ============================================================

function obtenirNomFruitaVarietat(fruita_varietat) {
    if (!fruita_varietat) return '-';
    const fruita = fruites.find(f => f.id === fruita_varietat.fruita_id);
    return (fruita ? fruita.nom : '-') + ' / ' + (fruita_varietat.varietat || '-');
}

function arrodonarPreu(preu) {
    return (Math.round(preu * 1000) / 1000).toFixed(3);
}

// ============================================================
// 7. INICIALITZACIÓ
// ============================================================

console.log('✅ Preus v1 carregat');
