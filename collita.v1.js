// ============================================================
// COLLITA.V1.JS - CORE LOGIC (sense UI)
// ============================================================

// Variables globals
let fruites = [];
let varietats = [];
let qualitats = [];
let finques = [];
let calibresFruita = {};
let classificacionsNoCom = [];
let entradaEnEdicio = null;
let escandallEnEdicio = null;

// ============================================================
// 1. CÀRREGA DE DADES
// ============================================================

async function carregarDadesCollita() {
    try {
        // Fruites
        const { data: frutesData } = await supabaseClient
            .from('fruites')
            .select('*');
        fruites = frutesData || [];

        // Varietats
        const { data: varietatsData } = await supabaseClient
            .from('fruita_varietats')
            .select('*');
        varietats = varietatsData || [];

        // Qualitats (campanya actual)
        const { data: qualitatData } = await supabaseClient
            .from('qualitats_collita')
            .select('*')
            .eq('actiu', true)
            .eq('campanya', 2025);
        qualitats = qualitatData || [];

        // Calibres per fruita (campanya actual)
        const { data: calibresData } = await supabaseClient
            .from('calibres_fruites')
            .select('*')
            .eq('campanya', 2025)
            .eq('actiu', true);
        
        calibresFruita = {};
        (calibresData || []).forEach(c => {
            if (!calibresFruita[c.fruita_id]) {
                calibresFruita[c.fruita_id] = [];
            }
            calibresFruita[c.fruita_id].push(c.calibre);
        });

        // Classificacions No Comercial (campanya actual)
        const { data: classData } = await supabaseClient
            .from('classificacions_no_comercial')
            .select('*')
            .eq('campanya', 2025)
            .eq('actiu', true);
        classificacionsNoCom = classData || [];

        // Finques (referència a finques existents)
        // Suposem que ja estan carregades a finques global
        
        console.log('✅ Dades Collita carregades');
    } catch (error) {
        console.error('❌ Error carregant dades Collita:', error);
    }
}

// ============================================================
// 2. ALBARÀ ENTRADA - CRUD
// ============================================================

async function crearAlbaraEntrada(dades) {
    try {
        // Validacions
        if (!dades.num_albara) throw new Error('Num. Albarà és obligatori');
        if (!dades.fruita_varietat_id) throw new Error('Fruita-Varietat és obligatoria');
        if (!dades.finca_id) throw new Error('Finca és obligatòria');

        // Càlcul automàtic pes_net
        dades.pes_net = (dades.pes_brut || 0) - (dades.tara_envases || 0) - (dades.tara_vehicle || 0);
        
        // Càlcul automàtic pes_mig
        if (dades.quantitat_palots_entrada && dades.quantitat_palots_entrada > 0) {
            dades.pes_mig = dades.pes_net / dades.quantitat_palots_entrada;
        }

        const { data, error } = await supabaseClient
            .from('collita_entrada')
            .insert([dades])
            .select();

        if (error) throw error;

        console.log('✅ Albarà entrada creat:', data[0].id);
        return data[0];
    } catch (error) {
        console.error('❌ Error creant albarà entrada:', error);
        throw error;
    }
}

async function actualitzarAlbaraEntrada(id, dades) {
    try {
        // Recalcular pes_net i pes_mig
        if (dades.pes_brut !== undefined || dades.tara_envases !== undefined || dades.tara_vehicle !== undefined) {
            const entrada = await obtenerAlbaraEntrada(id);
            dades.pes_brut = dades.pes_brut !== undefined ? dades.pes_brut : entrada.pes_brut;
            dades.tara_envases = dades.tara_envases !== undefined ? dades.tara_envases : entrada.tara_envases;
            dades.tara_vehicle = dades.tara_vehicle !== undefined ? dades.tara_vehicle : entrada.tara_vehicle;
            
            dades.pes_net = dades.pes_brut - dades.tara_envases - dades.tara_vehicle;
            
            if (dades.quantitat_palots_entrada && dades.quantitat_palots_entrada > 0) {
                dades.pes_mig = dades.pes_net / dades.quantitat_palots_entrada;
            }
        }

        dades.updated_at = new Date().toISOString();

        const { data, error } = await supabaseClient
            .from('collita_entrada')
            .update(dades)
            .eq('id', id)
            .select();

        if (error) throw error;
        console.log('✅ Albarà entrada actualitzat');
        return data[0];
    } catch (error) {
        console.error('❌ Error actualitzant albarà entrada:', error);
        throw error;
    }
}

async function eliminarAlbaraEntrada(id) {
    try {
        // Soft delete
        const { data, error } = await supabaseClient
            .from('collita_entrada')
            .update({
                estat: 'anulat',
                data_anulacio: new Date().toISOString().split('T')[0]
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        console.log('✅ Albarà entrada anulat');
        return data[0];
    } catch (error) {
        console.error('❌ Error anulant albarà entrada:', error);
        throw error;
    }
}

async function obtenerAlbaraEntrada(id) {
    try {
        const { data, error } = await supabaseClient
            .from('collita_entrada')
            .select('*')
            .eq('id', id)
            .eq('estat', 'actiu')
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Error obtenint albarà entrada:', error);
        return null;
    }
}

async function obtenerAlbaraEntradaPorNum(numAlbara) {
    try {
        const { data, error } = await supabaseClient
            .from('collita_entrada')
            .select('*')
            .eq('num_albara', numAlbara)
            .eq('estat', 'actiu')
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        return data || null;
    } catch (error) {
        console.error('❌ Error buscant albarà entrada:', error);
        return null;
    }
}

async function obtenirTodasEntradas(campanya = 2025) {
    try {
        const { data, error } = await supabaseClient
            .from('collita_entrada')
            .select(`
                *,
                fruita_varietat_id (fruita_id, varietat)
            `)
            .eq('estat', 'actiu')
            .order('data', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error obtenint entradas:', error);
        return [];
    }
}

// ============================================================
// 3. ALBARÀ ESCANDALL - CRUD
// ============================================================

async function crearAlbaraEscandall(dades, calibres, noComercios, industria) {
    try {
        // Validacions
        if (!dades.num_albara_escandall) throw new Error('Num. Albarà Escandall és obligatori');
        if (!dades.collita_entrada_id) throw new Error('Entrada és obligatòria');

        // Càlcul automàtic pes_net
        dades.pes_net = (dades.pes_brut || 0) - (dades.tara_envases || 0) - (dades.tara_vehicle || 0);
        dades.pes_mig = dades.pes_net / (dades.quantitat_palots_entrada || 1);

        // Crear escandall
        const { data: escandallData, error: escError } = await supabaseClient
            .from('collita_escandall')
            .insert([dades])
            .select();

        if (escError) throw escError;
        const escandallId = escandallData[0].id;

        // Inserir calibres
        if (calibres && calibres.length > 0) {
            const calibresDB = calibres.map(c => ({
                escandall_id: escandallId,
                calibre: c.calibre,
                pes_kg: c.pes_kg,
                percentatge: c.percentatge,
                categoria: calcularCategoria(c.calibre, dades.fruita_varietat_id)
            }));

            const { error: calError } = await supabaseClient
                .from('collita_escandall_calibres')
                .insert(calibresDB);

            if (calError) throw calError;
        }

        // Inserir no comercials
        if (noComercios && noComercios.length > 0) {
            const noComerDB = noComercios.map(nc => ({
                escandall_id: escandallId,
                classificacio: nc.classificacio,
                pes_kg: nc.pes_kg,
                percentatge: nc.percentatge
            }));

            const { error: ncError } = await supabaseClient
                .from('collita_escandall_no_comercial')
                .insert(noComerDB);

            if (ncError) throw ncError;
        }

        // Inserir industria
        if (industria && industria.pes_kg) {
            const { error: indError } = await supabaseClient
                .from('collita_escandall_industria')
                .insert([{
                    escandall_id: escandallId,
                    pes_kg: industria.pes_kg,
                    percentatge: industria.percentatge
                }]);

            if (indError) throw indError;
        }

        console.log('✅ Albarà escandall creat:', escandallId);
        return escandallData[0];
    } catch (error) {
        console.error('❌ Error creant albarà escandall:', error);
        throw error;
    }
}

async function obtenirTodasEscandalls() {
    try {
        const { data, error } = await supabaseClient
            .from('collita_escandall')
            .select(`
                *,
                collita_entrada_id (*),
                collita_escandall_calibres (*),
                collita_escandall_no_comercial (*),
                collita_escandall_industria (*)
            `)
            .eq('estat', 'actiu')
            .order('data', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('❌ Error obtenint escandalls:', error);
        return [];
    }
}

// ============================================================
// 4. VALIDACIONS I COMPARATIVA
// ============================================================

async function compararEntradaVsEscandall(entradaId, escandallDades) {
    try {
        const entrada = await obtenerAlbaraEntrada(entradaId);
        if (!entrada) throw new Error('Entrada no trobada');

        const alerts = [];

        // Comparar pes_net (alerta si > 5%)
        const diferenciaPes = Math.abs(escandallDades.pes_net - entrada.pes_net);
        const percentatgeDif = (diferenciaPes / entrada.pes_net) * 100;
        
        if (percentatgeDif > 5) {
            alerts.push({
                tipus: 'warning',
                missatge: `⚠️ Diferència de pes_net: ${diferenciaPes.toFixed(2)} kg (${percentatgeDif.toFixed(1)}%)`
            });
        }

        // Comparar quantitat palots
        const diferenciaPalots = Math.abs(
            (escandallDades.quantitat_palots_entrada || 0) - 
            (entrada.quantitat_palots_entrada || 0)
        );

        if (diferenciaPalots > 0) {
            alerts.push({
                tipus: 'warning',
                missatge: `⚠️ Diferència de palots: ${diferenciaPalots} unitats`
            });
        }

        // Guardar diferencies a BD
        escandallDades.diferencia_pes_net = diferenciaPes;
        escandallDades.diferencia_palots = diferenciaPalots;

        return {
            valida: alerts.length === 0,
            alerts: alerts,
            dades: escandallDades
        };
    } catch (error) {
        console.error('❌ Error comparant entrada vs escandall:', error);
        return { valida: false, alerts: [{ tipus: 'error', missatge: error.message }] };
    }
}

// ============================================================
// 5. CÁLCULOS AUTOMÁTICOS
// ============================================================

function calcularCategoria(calibre, fruitaVarietatId) {
    // Trobar fruita_id de fruitaVarietatId
    const varietat = varietats.find(v => v.id === fruitaVarietatId);
    if (!varietat) return 'Mitjà';

    const fruita = fruites.find(f => f.id === varietat.fruita_id);
    if (!fruita) return 'Mitjà';

    // Calibres òptims per fruita
    const calibresOptims = {
        'Préssec': ['73-80', '80-85', '85+'],
        'Nectarina': ['73-80', '80-85', '85+'],
        'Albercoc': ['50-55', '55-60', '60+']
    };

    const optims = calibresOptims[fruita.nom] || [];
    return optims.includes(calibre) ? 'Òptim' : 'Mitjà';
}

function calcularPercentatges(calibres, noComercios, industria, pesTotalNet) {
    const total = pesTotalNet || 0;
    
    if (calibres) {
        calibres.forEach(c => {
            c.percentatge = total > 0 ? (c.pes_kg / total) * 100 : 0;
        });
    }
    
    if (noComercios) {
        noComercios.forEach(nc => {
            nc.percentatge = total > 0 ? (nc.pes_kg / total) * 100 : 0;
        });
    }
    
    if (industria) {
        industria.percentatge = total > 0 ? (industria.pes_kg / total) * 100 : 0;
    }

    return {
        calibres: calibres || [],
        noComercios: noComercios || [],
        industria: industria || {}
    };
}

function validarPercentatges(calibres, noComercios, industria) {
    const suma = (calibres || []).reduce((s, c) => s + (c.percentatge || 0), 0) +
                 (noComercios || []).reduce((s, nc) => s + (nc.percentatge || 0), 0) +
                 (industria ? industria.percentatge || 0 : 0);

    // Permetre petita tolerancia (±0.1%)
    const valida = Math.abs(suma - 100) < 0.1;
    
    return {
        valida: valida,
        suma: suma,
        alert: !valida ? `❌ Suma percentatges: ${suma.toFixed(1)}% (ha de ser 100%)` : null
    };
}

// ============================================================
// 6. RECLASSIFICACIÓ
function reclassificarQualitat(qualitat_original, percentatgeNoCom, qualificacioMercats) {
    /*
    Lógica de reclassificació:
    - Si % No Comercial < 10% i calibres bons → Primeres pot passar a Extra o Ondine
    - Si % No Comercial > 20% → degradació
    */
    
    const reclassificacions = [];
    
    if (percentatgeNoCom < 10 && qualitat_original === 'Primeres') {
        reclassificacions.push('Extra');
        reclassificacions.push('Ondine');
    }
    
    if (percentatgeNoCom > 20) {
        reclassificacions.push('Degradació possible');
    }
    
    return reclassificacions;
}

// ============================================================
// 7. INICIALITZACIÓ
// ============================================================

async function iniciarCollita() {
    console.log('🚀 Inicialitzant Collita...');
    await carregarDadesCollita();
    console.log('✅ Collita inicialitzada');
}

// Quan es carregui el DOM
document.addEventListener('DOMContentLoaded', iniciarCollita);
