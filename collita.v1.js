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
// RESUM GENERAL DASHBOARD - Fruita i Cereal (Kg per campanya)
// Afegir a collita.v1.js (p.ex. just després d'obtenirTodasEntradas)
//
// Campanya = la més recent que ja tingui com a mínim un albarà
// d'entrada (si la campanya en curs encara no en té cap, agafa
// l'última campanya tancada amb dades). No hi ha data de tall
// manual: ho determina l'existència real de dades.
//
// fincaSeleccionada (opcional): si es passa, els Kg es calculen
// només amb els albarans d'aquella finca.
// ============================================================

async function obtenirResumCollitaDashboard(fincaSeleccionada) {
    const resultat = {
        fruita: { kg: 0, campanya: null },
        cereal: { kg: 0, campanya: null }
    };

    try {
        // ---------------------------------------------------
        // FRUITA — collita_entrada no té columna 'campanya',
        // es deriva de la data (any agrícola oct→set), igual
        // que fa obtenirTodasEntradas().
        // ---------------------------------------------------
        let queryUltimaFruita = supabaseClient
            .from('collita_entrada')
            .select('data')
            .eq('estat', 'actiu')
            .order('data', { ascending: false })
            .limit(1);

        if (fincaSeleccionada) {
            queryUltimaFruita = queryUltimaFruita.eq('finca', fincaSeleccionada);
        }

        const { data: ultimaFruita, error: errorUltimaFruita } = await queryUltimaFruita;
        if (errorUltimaFruita) throw errorUltimaFruita;

        if (ultimaFruita && ultimaFruita.length > 0) {
            const dataUltima = new Date(ultimaFruita[0].data);
            const mesUltima = dataUltima.getMonth() + 1;
            const campanyaFruita = mesUltima >= 10 ? dataUltima.getFullYear() + 1 : dataUltima.getFullYear();
            const dataIniciCamp = (campanyaFruita - 1) + '-10-01';
            const dataFiCamp = campanyaFruita + '-09-30';

            let querySumaFruita = supabaseClient
                .from('collita_entrada')
                .select('pes_net')
                .eq('estat', 'actiu')
                .gte('data', dataIniciCamp)
                .lte('data', dataFiCamp);

            if (fincaSeleccionada) {
                querySumaFruita = querySumaFruita.eq('finca', fincaSeleccionada);
            }

            const { data: entradesFruita, error: errorSumaFruita } = await querySumaFruita;
            if (errorSumaFruita) throw errorSumaFruita;

            resultat.fruita.kg = (entradesFruita || []).reduce(function(s, e) {
                return s + (parseFloat(e.pes_net) || 0);
            }, 0);
            resultat.fruita.campanya = campanyaFruita;
        }

        // ---------------------------------------------------
        // CEREAL — collita_entrades_cereal SÍ té columna
        // 'campanya' pròpia (es tria al formulari), s'usa
        // directament.
        // ---------------------------------------------------
        let queryUltimaCereal = supabaseClient
            .from('collita_entrades_cereal')
            .select('campanya')
            .eq('estat', 'actiu')
            .order('campanya', { ascending: false })
            .limit(1);

        if (fincaSeleccionada) {
            queryUltimaCereal = queryUltimaCereal.eq('finca', fincaSeleccionada);
        }

        const { data: ultimaCereal, error: errorUltimaCereal } = await queryUltimaCereal;
        if (errorUltimaCereal) throw errorUltimaCereal;

        if (ultimaCereal && ultimaCereal.length > 0) {
            const campanyaCereal = ultimaCereal[0].campanya;

            let querySumaCereal = supabaseClient
                .from('collita_entrades_cereal')
                .select('pes_net')
                .eq('estat', 'actiu')
                .eq('campanya', campanyaCereal);

            if (fincaSeleccionada) {
                querySumaCereal = querySumaCereal.eq('finca', fincaSeleccionada);
            }

            const { data: entradesCereal, error: errorSumaCereal } = await querySumaCereal;
            if (errorSumaCereal) throw errorSumaCereal;

            resultat.cereal.kg = (entradesCereal || []).reduce(function(s, e) {
                return s + (parseFloat(e.pes_net) || 0);
            }, 0);
            resultat.cereal.campanya = campanyaCereal;
        }
    } catch (error) {
        console.error('❌ Error obtenint resum Collita per al Dashboard:', error);
    }

    return resultat;
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
// ============================================================
// AMPLIACIÓ d'agendaProvider_collita
// Afegir DINS de la funció agendaProvider_collita, ABANS del
// 'return esdeveniments;' final. També cal afegir el helper
// sumarDies() al fitxer (es pot posar fora de la funció).
// ============================================================



// ---------------------------------------------------
// FENOLOGIA — només el CANVI D'ESTAT (sense recomanacions
// de reg, que ja viuen al mòdul de Reg)
// ---------------------------------------------------
try {
    const { data: datesCollita, error: errorDates } = await supabaseClient
        .from('reg_dates_collita')
        .select('cultiu, varietat, campanya, num_explotacio, data_inici, data_fi, dies_postcollita')
        .eq('actiu', true)
        .not('num_explotacio', 'is', null);

    if (errorDates) throw errorDates;

    const numExplotacions = [...new Set((datesCollita || []).map(function(d) { return d.num_explotacio; }))];
    let mapaFinques = {};
    if (numExplotacions.length > 0) {
        const { data: configs } = await supabaseClient
            .from('reg_configuracio')
            .select('num_explotacio, nom_finca')
            .in('num_explotacio', numExplotacions);
        (configs || []).forEach(function(c) { mapaFinques[c.num_explotacio] = c.nom_finca; });
    }

    (datesCollita || []).forEach(function(d) {
        if (!d.data_inici) return;
        const nomFinca = mapaFinques[d.num_explotacio] || '';

        // Entra en PRECOLLITA (30 dies abans de data_inici, com fa la vista reg_factor_explotacio)
        const diaPrecollita = sumarDies(d.data_inici, -30);
        if (diaPrecollita >= dataInici && diaPrecollita <= dataFi) {
            esdeveniments.push({
                data: diaPrecollita,
                tipus: 'fenologia',
                titol: '⚠️ ' + d.cultiu + ' ' + d.varietat + ' entra en precollita',
                detall: nomFinca,
                estat: 'avis',
                modulOrigen: 'collita-fenologia',
                idOrigen: 'precollita-' + d.num_explotacio + '-' + d.varietat + '-' + d.campanya,
                accioClick: null
            });
        }

        // Passa a POSTCOLLITA (data_fi + dies_postcollita + 1, quan es considera tancada)
        if (d.data_fi && d.dies_postcollita) {
            const diaPostcollita = sumarDies(d.data_fi, d.dies_postcollita + 1);
            if (diaPostcollita >= dataInici && diaPostcollita <= dataFi) {
                esdeveniments.push({
                    data: diaPostcollita,
                    tipus: 'fenologia',
                    titol: '🍂 ' + d.cultiu + ' ' + d.varietat + ' passa a postcollita',
                    detall: nomFinca,
                    estat: 'avis',
                    modulOrigen: 'collita-fenologia',
                    idOrigen: 'postcollita-' + d.num_explotacio + '-' + d.varietat + '-' + d.campanya,
                    accioClick: null
                });
            }
        }
    });
} catch (error) {
    console.error('❌ Error generant esdeveniments de fenologia a l\'agenda:', error);
}


// ---------------------------------------------------
// ESCANDALLS — % calibre òptim / % no comercial
// Només als extrems (òptim ≥50% positiu, <25% alerta;
// no comercial >10% alerta). Zona 25-50% no genera res,
// per no inflar l'agenda.
// ---------------------------------------------------
try {
    const { data: escandallsRang, error: errorEsc } = await supabaseClient
        .from('collita_escandall')
        .select(`
            id, num_albara_escandall, data,
            collita_entrada:collita_entrada_id (finca, fruita_varietat_id (varietat, fruita_id)),
            collita_escandall_calibres (calibre, pes_kg),
            collita_escandall_no_comercial (pes_kg)
        `)
        .eq('estat', 'actiu')
        .gte('data', dataInici)
        .lte('data', dataFi);
 
    if (errorEsc) throw errorEsc;
 
    (escandallsRang || []).forEach(function(esc) {
        const calibres = esc.collita_escandall_calibres || [];
        const noComercials = esc.collita_escandall_no_comercial || [];
 
        const totalComercial = calibres.reduce(function(s, c) { return s + (parseFloat(c.pes_kg) || 0); }, 0);
        const totalNoComercial = noComercials.reduce(function(s, nc) { return s + (parseFloat(nc.pes_kg) || 0); }, 0);
        const totalGeneral = totalComercial + totalNoComercial;
 
        if (totalGeneral <= 0) return;
 
        const fruita = (typeof fruites !== 'undefined' ? fruites : [])
            .find(function(f) { return f.id === (esc.collita_entrada?.fruita_varietat_id?.fruita_id || null); });
        const nomFruita = fruita ? fruita.nom : 'Fruita';
        const varietat = esc.collita_entrada?.fruita_varietat_id?.varietat || '-';
        const finca = esc.collita_entrada?.finca || '-';
 
        // Llindar d'òptim segons fruita: Albercoc (calibres 40-60+) usa 50,
        // la resta (Préssec Pla, Préssec, Nectarina, calibres fins 73+) usa 73.
        const llindarOptim = (nomFruita === 'Albercoc') ? 50 : 73;
 
        // El calibre ve com a rang en text (ex: '73-80', '80-85', '85+').
        // És òptim si el límit INFERIOR del rang és >= llindar (el rang que
        // comença just al llindar ja ha de comptar sencer com a òptim).
        function calibreEsOptim(calibreStr) {
            const match = String(calibreStr).match(/(\d+(?:[.,]\d+)?)/);
            if (!match) return false;
            const limitInferior = parseFloat(match[1].replace(',', '.'));
            return limitInferior >= llindarOptim;
        }
 
        const totalOptims = calibres
            .filter(function(c) { return calibreEsOptim(c.calibre); })
            .reduce(function(s, c) { return s + (parseFloat(c.pes_kg) || 0); }, 0);
 
        const pctOptims = totalComercial > 0 ? (totalOptims / totalComercial) * 100 : 0;
        const pctNoComercial = (totalNoComercial / totalGeneral) * 100;
 
        if (pctOptims >= 50) {
            esdeveniments.push({
                data: esc.data,
                tipus: 'collita',
                titol: '✅ ' + nomFruita + ' ' + varietat + ' — ' + pctOptims.toFixed(0) + '% calibre òptim',
                detall: finca + ' · Albarà escandall ' + esc.num_albara_escandall,
                estat: 'fet',
                modulOrigen: 'collita-escandall',
                idOrigen: 'optim-' + esc.id,
                accioClick: function() { veureEscandall(esc.id); }
            });
        } else if (pctOptims < 25) {
            esdeveniments.push({
                data: esc.data,
                tipus: 'collita',
                titol: '⚠️ ' + nomFruita + ' ' + varietat + ' — només ' + pctOptims.toFixed(0) + '% calibre òptim',
                detall: finca + ' · Albarà escandall ' + esc.num_albara_escandall,
                estat: 'avis',
                modulOrigen: 'collita-escandall',
                idOrigen: 'optim-baix-' + esc.id,
                accioClick: function() { veureEscandall(esc.id); }
            });
        }
 
        if (pctNoComercial > 10) {
            esdeveniments.push({
                data: esc.data,
                tipus: 'collita',
                titol: '⚠️ ' + nomFruita + ' ' + varietat + ' — ' + pctNoComercial.toFixed(0) + '% no comercial',
                detall: finca + ' · Albarà escandall ' + esc.num_albara_escandall,
                estat: 'avis',
                modulOrigen: 'collita-escandall',
                idOrigen: 'nocomercial-' + esc.id,
                accioClick: function() { veureEscandall(esc.id); }
            });
        }
    });
} catch (error) {
    console.error('❌ Error generant esdeveniments d\'escandall a l\'agenda:', error);
}
 
 
    return esdeveniments;
}

// Helper: suma/resta dies a una data 'YYYY-MM-DD', retorna 'YYYY-MM-DD'
function sumarDies(dataStr, dies) {
    const d = new Date(dataStr + 'T00:00:00');
    d.setDate(d.getDate() + dies);
    return d.toISOString().slice(0, 10);
}

registrarProveidorAgenda(agendaProvider_collita);