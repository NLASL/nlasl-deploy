// ============================================================
// COLLITA.V1.JS - CORE LOGIC (sense UI)
// ============================================================

// Variables globals
let fruites = [];
let varietats = [];
let qualitats = [];
let calibresFruita = {};
let classificacionsNoCom = [];
let entradaEnEdicio = null;
let escandallEnEdicio = null;

// ============================================================
// 1. CÀRREGA DE DADES
// ============================================================

async function carregarDadesCollita() {
    try {
        console.log('🔄 Carregant dades Collita...');
        
        // Fruites
        const { data: frutesData, error: fruitesError } = await supabaseClient
            .from('fruites')
            .select('*');
        if (fruitesError) throw new Error('Error fruites: ' + fruitesError.message);
        fruites = frutesData || [];
        console.log('✅ Fruites carregades:', fruites.length);

        // Varietats
        const { data: varietatsData, error: varietatsError } = await supabaseClient
            .from('fruita_varietats')
            .select('*');
        if (varietatsError) throw new Error('Error varietats: ' + varietatsError.message);
        varietats = varietatsData || [];
        console.log('✅ Varietats carregades:', varietats.length);

        // Qualitats (campanya actual)
        const { data: qualitatData, error: qualitatError } = await supabaseClient
            .from('qualitats_collita')
            .select('*')
            .eq('actiu', true)
            .eq('campanya', 2025);
        if (qualitatError) throw new Error('Error qualitats: ' + qualitatError.message);
        qualitats = qualitatData || [];
        console.log('✅ Qualitats carregades:', qualitats.length);

        // Calibres per fruita (campanya actual)
        const { data: calibresData, error: calibresError } = await supabaseClient
            .from('calibres_fruites')
            .select('*')
            .eq('campanya', 2025)
            .eq('actiu', true);
        if (calibresError) throw new Error('Error calibres: ' + calibresError.message);
        
        calibresFruita = {};
        (calibresData || []).forEach(c => {
            if (!calibresFruita[c.fruita_id]) {
                calibresFruita[c.fruita_id] = [];
            }
            calibresFruita[c.fruita_id].push(c.calibre);
        });
        console.log('✅ Calibres carregats');

        // Classificacions No Comercial (campanya actual)
        const { data: classData, error: classError } = await supabaseClient
            .from('classificacions_no_comercial')
            .select('*')
            .eq('campanya', 2026)
            .eq('actiu', true);
        if (classError) throw new Error('Error classificacions: ' + classError.message);
        classificacionsNoCom = classData || [];
        console.log('✅ Classificacions No Comercial carregades:', classificacionsNoCom.length);

        // Finques (referència a finques existents - ja carregades a app_v8.js)
        console.log('✅ Finques disponibles:', finques.length);
        
        console.log('✅✅ TODAS LES DADES COLLITA CARREGADES CORRECTAMENT');
    } catch (error) {
        console.error('❌ Error carregant dades Collita:', error);
        mostrarNotificacio('❌ Error carregant dades Collita: ' + error.message, 'error');
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
        if (!dades.finca) throw new Error('Finca és obligatòria');

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

async function obtenirTodasEntradas(campanya = null) {
    try {
        // Detectar campanya actual si no s'especifica
        if (!campanya) {
            const ara = new Date();
            const mes = ara.getMonth() + 1;
            const any = ara.getFullYear();
            // Octubre-Desembre → campanya any+1
            // Gener-Setembre → campanya any
            campanya = mes >= 10 ? any + 1 : any;
        }

        // Dates campanya: 1 octubre (any-1) → 30 setembre (any)
        const dataInici = (campanya - 1) + '-10-01';
        const dataFinal = campanya + '-09-30';

        const { data, error } = await supabaseClient
			.from('collita_entrada')
			.select(`
			*,
			fruita_varietat_id (id, fruita_id, varietat),
			collita_escandall (qualitat_reclassificada)
			`)
			.eq('estat', 'actiu')
			.gte('data', dataInici)
			.lte('data', dataFinal)
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
                collita_entrada:collita_entrada_id(*),
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
                missatge: `⚠️ Diferència de pes_net: ${diferenciaPes.toFixed(2)} kg (${percentatgeDif.toFixed(2)}%)`
            });
        }

        // Comparar quantitat palots
        const diferenciaPalots = (escandallDades.quantitat_palots_entrada !== undefined && 
                          escandallDades.quantitat_palots_entrada !== null)
		? Math.abs(escandallDades.quantitat_palots_entrada - (entrada.quantitat_palots_entrada || 0))
		: 0;

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
        'Préssec Pla': ['73-80', '80-85', '85+'],
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
        alert: !valida ? `❌ Suma percentatges: ${suma.toFixed(2)}% (ha de ser 100%)` : null
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

// ============================================================
// 8. EDICIÓ ALBARANS
// ============================================================

async function obtenerAlbaraEntradaPorId(id) {
    try {
        const { data, error } = await supabaseClient
            .from('collita_entrada')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Error obtenint albarà:', error);
        throw error;
    }
}

async function actualitzarAlbaraEntrada(id, dades) {
    try {
        console.log('Actualitzant albarà:', id, dades);
        
        const { error } = await supabaseClient
            .from('collita_entrada')
            .update(dades)
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Albarà actualitzat');
    } catch (error) {
        console.error('❌ Error actualitzant albarà:', error);
        throw error;
    }
}
async function eliminarEscandallConfirm(id) {
    if (!confirm('Segur que vols eliminar aquest escandall?')) return;
    
    try {
        await eliminarAlbaraEscandall(id);
        mostrarNotificacio('✅ Escandall eliminat', 'success');
        canviarVistaCollita('escandalls');
    } catch (error) {
        mostrarNotificacio('❌ Error: ' + error.message, 'error');
    }
}

async function eliminarAlbaraEscandall(id) {
    try {
        const { error } = await supabaseClient
            .from('collita_escandall')
            .delete()
            .eq('id', id);
        if (error) throw error;
        console.log('✅ Escandall eliminat');
    } catch (error) {
        console.error('❌ Error eliminant escandall:', error);
        throw error;
    }
}

async function obtenerEscandallPorId(id) {
    try {
        const { data, error } = await supabaseClient
            .from('collita_escandall')
            .select(`
                *,
                collita_escandall_calibres (*),
                collita_escandall_no_comercial (*),
                collita_escandall_industria (*)
            `)
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Error obtenint escandall:', error);
        throw error;
    }
}
async function actualitzarAlbaraEscandall(id, dades) {
    try {
        const { error } = await supabaseClient
            .from('collita_escandall')
			.update(dades)
            .eq('id', id);
        
        if (error) throw error;
        console.log('✅ Escandall actualitzat');
    } catch (error) {
        console.error('❌ Error actualitzant escandall:', error);
        throw error;
    }
}
// ============================================================
// PROVEÏDOR AGENDA - COLLITA
// Afegir AL FINAL de collita.v1.js
//
// ⚠️ VERSIÓ PROVISIONAL: només mostra dies amb entrada real
// registrada (collita_entrada / collita_entrades_cereal).
// Quan es pugi el mòdul de Fenologia, caldrà ampliar-ho per:
//   - Mostrar l'acumulat fins als dies de marge que marquen
//     la fi de la collita per varietat (no només el dia de
//     l'última entrada).
//   - Afegir les "actuacions a realitzar" segons % de
//     l'escandall de Fruita (regles fixes, pendents que les
//     expliqui el propietari).
// ============================================================

async function agendaProvider_collita(dataInici, dataFi) {
    const esdeveniments = [];

    try {
        // ---------------------------------------------------
        // FRUITA — acumulat per dia + fruita (detall per varietat)
        // ---------------------------------------------------
        const { data: entradesFruita, error: errorFruita } = await supabaseClient
            .from('collita_entrada')
            .select(`
                id, data, pes_net,
                fruita_varietat_id (id, fruita_id, varietat)
            `)
            .eq('estat', 'actiu')
            .gte('data', dataInici)
            .lte('data', dataFi);

        if (errorFruita) throw errorFruita;

        // { 'YYYY-MM-DD': { fruitaId: { kg, albarans, varietats: { nom: kg } } } }
        const grupsFruita = {};

        (entradesFruita || []).forEach(function(e) {
            const dia = e.data;
            const fruitaId = e.fruita_varietat_id?.fruita_id || 'desconeguda';
            const nomVarietat = e.fruita_varietat_id?.varietat || '-';
            const kg = parseFloat(e.pes_net) || 0;

            if (!grupsFruita[dia]) grupsFruita[dia] = {};
            if (!grupsFruita[dia][fruitaId]) {
                grupsFruita[dia][fruitaId] = { kg: 0, albarans: 0, varietats: {} };
            }
            grupsFruita[dia][fruitaId].kg += kg;
            grupsFruita[dia][fruitaId].albarans += 1;
            grupsFruita[dia][fruitaId].varietats[nomVarietat] =
                (grupsFruita[dia][fruitaId].varietats[nomVarietat] || 0) + kg;
        });

        Object.keys(grupsFruita).forEach(function(dia) {
            Object.keys(grupsFruita[dia]).forEach(function(fruitaId) {
                const grup = grupsFruita[dia][fruitaId];
                const fruita = (typeof fruites !== 'undefined' ? fruites : [])
                    .find(function(f) { return f.id === fruitaId; });
                const nomFruita = fruita ? fruita.nom : 'Fruita';

                const detallVarietats = Object.keys(grup.varietats)
                    .map(function(v) {
                        return v + ': ' + grup.varietats[v].toLocaleString('ca-ES', { maximumFractionDigits: 0 }) + ' kg';
                    })
                    .join(' · ');

                esdeveniments.push({
                    data: dia,
                    tipus: 'collita',
                    titol: '🍎 ' + nomFruita + ' — ' + grup.kg.toLocaleString('ca-ES', { maximumFractionDigits: 0 }) + ' kg',
                    detall: detallVarietats + ' (' + grup.albarans + ' albarà' + (grup.albarans > 1 ? 'ns' : '') + ')',
                    estat: 'fet',
                    modulOrigen: 'collita',
                    idOrigen: 'fruita-' + dia + '-' + fruitaId,
                    accioClick: function() {
                        canviarVistaCollita('entrades');
                        tipusCollitaActual = 'fruita';
                        setTimeout(function() {
                            const selFruita = document.getElementById('filtre-fruita-entrades');
                            if (selFruita) {
                                selFruita.value = fruitaId;
                                if (typeof actualitzarVarietatsEntrades === 'function') {
                                    actualitzarVarietatsEntrades();
                                } else if (typeof mostrarTaulaEntrades === 'function') {
                                    mostrarTaulaEntrades();
                                }
                            }
                        }, 150);
                    }
                });
            });
        });

        // ---------------------------------------------------
        // CEREAL — acumulat per dia + cultiu (sense escandall)
        // ---------------------------------------------------
        const { data: entradesCereal, error: errorCereal } = await supabaseClient
            .from('collita_entrades_cereal')
            .select('id, data, cultiu, pes_net')
            .eq('estat', 'actiu')
            .gte('data', dataInici)
            .lte('data', dataFi);

        if (errorCereal) throw errorCereal;

        // { 'YYYY-MM-DD': { cultiu: { kg, albarans } } }
        const grupsCereal = {};

        (entradesCereal || []).forEach(function(e) {
            const dia = e.data;
            const cultiu = e.cultiu || 'Cereal';
            const kg = parseFloat(e.pes_net) || 0;

            if (!grupsCereal[dia]) grupsCereal[dia] = {};
            if (!grupsCereal[dia][cultiu]) grupsCereal[dia][cultiu] = { kg: 0, albarans: 0 };
            grupsCereal[dia][cultiu].kg += kg;
            grupsCereal[dia][cultiu].albarans += 1;
        });

        Object.keys(grupsCereal).forEach(function(dia) {
            Object.keys(grupsCereal[dia]).forEach(function(cultiu) {
                const grup = grupsCereal[dia][cultiu];

                esdeveniments.push({
                    data: dia,
                    tipus: 'collita',
                    titol: '🌾 ' + cultiu + ' — ' + grup.kg.toLocaleString('ca-ES', { maximumFractionDigits: 0 }) + ' kg',
                    detall: grup.albarans + ' albarà' + (grup.albarans > 1 ? 'ns' : ''),
                    estat: 'fet',
                    modulOrigen: 'collita',
                    idOrigen: 'cereal-' + dia + '-' + cultiu,
                    accioClick: function() {
                        canviarVistaCollita('entrades');
                        tipusCollitaActual = 'cereal';
                        setTimeout(function() {
                            if (typeof mostrarVista_Entrades === 'function') mostrarVista_Entrades();
                        }, 150);
                    }
                });
            });
        });

    } catch (error) {
        console.error('❌ Error al proveïdor d\'agenda de Collita:', error);
    }

    return esdeveniments;
}

registrarProveidorAgenda(agendaProvider_collita);