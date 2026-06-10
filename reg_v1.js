// ============================================================
// REG_V1.JS - Reg Intel·ligent (CORREGIT DEFINITIU v2)
// Càlcul de recomanacions de reg basades en ETo (Open-Meteo)
// S'integra dins carregarVistaReg() existent a app_v8.js
// ============================================================

console.log('💧 Inicialitzant Reg Intel·ligent...');

const REG_API_BASE = 'https://api.open-meteo.com/v1/forecast';

// ============================================================
// CÀRREGA DE DADES BD
// ============================================================

async function getRegConfiguracio() {
    const { data, error } = await supabaseClient
        .from('reg_configuracio')
        .select('*')
        .eq('actiu', true)
        .order('nom_finca');
    if (error) throw error;
    return data || [];
}

async function getRegKc(cultiu, mes) {
    const { data, error } = await supabaseClient
        .from('reg_kc')
        .select('kc')
        .eq('cultiu', cultiu)
        .eq('mes', mes)
        .single();
    if (error) return 0.75;
    return data.kc;
}

async function getRegConsum(numExplotacio, dataInici, dataFi) {
    const { data, error } = await supabaseClient
        .from('reg')
        .select('*')
        .eq('num_explotacio', numExplotacio)
        .gte('data', dataInici)
        .lte('data', dataFi)
        .order('data');
    if (error) throw error;
    return data || [];
}

// ============================================================
// UTILITATS DE DATES (CORRECCIÓ CRÍTICA)
// ============================================================

/**
 * Converteix un string de data (YYYY-MM-DD) a un objecte Date LOCAL
 * sense desfase de timezone. new Date('2026-05-22') interpreta com a UTC
 * i a Europa es converteix a local amb +2h, causant errors de comparació.
 */
function parseDataLocal(dataStr) {
    const [any, mes, dia] = dataStr.split('-').map(Number);
    return new Date(any, mes - 1, dia, 0, 0, 0, 0);
}

/**
 * Compara dues dates IGNORANT l'hora (només any, mes, dia).
 * Retorna: -1 si a < b, 0 si a === b, 1 si a > b
 */
function compararDates(a, b) {
    const aStr = a.getFullYear() * 10000 + (a.getMonth() + 1) * 100 + a.getDate();
    const bStr = b.getFullYear() * 10000 + (b.getMonth() + 1) * 100 + b.getDate();
    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
}

/**
 * Retorna true si la data 'd' està dins del rang [inici, fi] (inclusiu),
 * comparant NOMÉS any, mes i dia (ignora hores).
 */
function dataDinsRang(d, inici, fi) {
    const dStr = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const iniStr = inici.getFullYear() * 10000 + (inici.getMonth() + 1) * 100 + inici.getDate();
    const fiStr = fi.getFullYear() * 10000 + (fi.getMonth() + 1) * 100 + fi.getDate();
    return dStr >= iniStr && dStr <= fiStr;
}

/**
 * Retorna true si la data 'd' és posterior a 'referencia' (comparant només dia).
 */
function dataEsPosterior(d, referencia) {
    const dStr = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const refStr = referencia.getFullYear() * 10000 + (referencia.getMonth() + 1) * 100 + referencia.getDate();
    return dStr > refStr;
}

// ============================================================
// API OPEN-METEO
// ============================================================

async function getMeteoData(lat, lon, diesPassats, diesFuturs) {
    const url =
        `${REG_API_BASE}?latitude=${lat}&longitude=${lon}` +
        `&past_days=${diesPassats}&forecast_days=${diesFuturs}` +
        `&daily=et0_fao_evapotranspiration,precipitation_sum` +
        `&timezone=Europe/Madrid`;

    // Timeout de 10 segons per evitar quedar-se penjat
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error('Error HTTP ' + res.status + ' obtenint dades meteo');
        const data = await res.json();
        return {
            dates: data.daily.time,
            eto: data.daily.et0_fao_evapotranspiration,
            pluja: data.daily.precipitation_sum
        };
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') throw new Error('Timeout: Open-Meteo no respon (>10s)');
        throw err;
    }
}

// ============================================================
// PROCESSAMENT METEO (CORREGIT)
// ============================================================

function processarMeteo(m, dInici, dFi) {
    const avui = new Date();
    avui.setHours(0, 0, 0, 0);

    let etoPassat = 0, etoFutur = 0;
    let plujaPassat = 0, plujaFutur = 0;

    for (let i = 0; i < m.dates.length; i++) {
        // CORRECCIÓ: Parsejar la data de l'API com a LOCAL per evitar desfase UTC
        const d = parseDataLocal(m.dates[i]);
        const eto = m.eto[i] || 0;
        const pluja = m.pluja[i] || 0;

        // CORRECCIÓ: Usar comparació per data (ignorant hores)
        if (dataDinsRang(d, dInici, dFi) && compararDates(d, avui) <= 0) {
            // És un dia dins del període seleccionat i ja ha passat (o és avui)
            etoPassat += eto;
            plujaPassat += pluja;
        }

        // CORRECCIÓ: La recomanació futura és SEMPRE independent del període seleccionat
        // Agafem els propers 7 dies des d'avui
        if (compararDates(d, avui) > 0 && compararDates(d, avui) <= 7) {
            etoFutur += eto;
            plujaFutur += pluja;
        }
    }

    return { etoPassat, plujaPassat, etoFutur, plujaFutur };
}


// ============================================================
// CÀLCULS
// ============================================================

function calcularNecessitatReg(etoMm, kc, superficieHa, plujaMm) {
    const etcM3 = etoMm * kc * superficieHa * 10;
    const plujaEfectivaM3 = plujaMm * 0.8 * superficieHa * 10;
    const necessitatM3 = Math.max(0, etcM3 - plujaEfectivaM3);

    return {
        etcM3: +etcM3.toFixed(1),
        plujaEfectivaM3: +plujaEfectivaM3.toFixed(1),
        necessitatM3: +necessitatM3.toFixed(1)
    };
}

// ============================================================
// AVALUACIÓ I COLORS (CORREGIT - ALINEAT)
// ============================================================

/**
 * Avalua el consum i retorna text, color i icona.
 * També retorna el ratio per reutilitzar-lo al color de la diferència.
 */
function avaluarConsum(consumReal, necessitat) {
    if (necessitat === 0) {
        // CORRECCIÓ: Si hi ha consum real però necessitat = 0, mostrar excés
        if (consumReal > 0) {
            return {
                text: `Rega MASSA (excés total)`,
                color: '#e74c3c',
                icon: '🔴',
                ratio: Infinity
            };
        }
        return {
            text: 'No cal reg',
            color: '#27ae60',
            icon: '✅',
            ratio: 1
        };
    }

    const ratio = consumReal / necessitat;

    if (ratio > 1.25) return { text: `Rega MASSA (${Math.round((ratio - 1) * 100)}% excés)`, color: '#e74c3c', icon: '🔴', ratio };
    if (ratio > 1.10) return { text: 'Lleugerament alt', color: '#e67e22', icon: '🟠', ratio };
    if (ratio >= 0.85) return { text: 'Consum correcte', color: '#27ae60', icon: '🟢', ratio };
    if (ratio >= 0.70) return { text: 'Lleugerament baix', color: '#f39c12', icon: '🟡', ratio };

    return { text: `Rega POC (${Math.round((1 - ratio) * 100)}% dèficit)`, color: '#e74c3c', icon: '🔴', ratio };
}

/**
 * CORRECCIÓ: Retorna el color de la diferència basat en el MATEIX ratio
 * que usa l'avaluació de l'estat. Així els colors estan alineats.
 */
function colorDiferencia(ratio) {
    if (ratio === Infinity) return '#e74c3c';  // Excés total
    if (ratio > 1.25) return '#e74c3c';        // Rega MASSA
    if (ratio > 1.10) return '#e67e22';        // Lleugerament alt
    if (ratio >= 0.85) return '#27ae60';       // Consum correcte
    if (ratio >= 0.70) return '#f39c12';       // Lleugerament baix
    return '#e74c3c';                          // Rega POC
}

function generarCardMeteo(titolZona, meteo) {
    return `
    <div style="flex:1; min-width:280px; border:1px solid #3498db; border-radius:6px; padding:10px; background:#f9fcff;">
        <h3 style="color:#2980b9; margin-bottom:8px;">🔧 ${titolZona}</h3>

        <div style="background:#eef6fb; border-radius:4px; padding:10px; margin-bottom:8px;">
            <div style="font-weight:bold; color:#555;">📅 Període seleccionat</div>
            <div style="margin-top:4px;">
                ETo: <strong>${meteo.etoPassat.toFixed(1)}</strong> mm<br>
                Pluja: <strong>${meteo.plujaPassat.toFixed(1)}</strong> mm
            </div>
        </div>

        <div style="background:#f0f8ff; border-radius:4px; padding:10px;">
            <div style="font-weight:bold; color:#555;">🔮 Propers 7 dies</div>
            <div style="margin-top:4px;">
                ETo: <strong>${meteo.etoFutur.toFixed(1)}</strong> mm<br>
                Pluja prev.: <strong>${meteo.plujaFutur.toFixed(1)}</strong> mm
            </div>
        </div>
    </div>`;
}

// ============================================================
// MOSTRAR RECOMANACIONS (botó dins carregarVistaReg)
// ============================================================

async function mostrarRecomanacionsReg() {
    // Eliminar modal anterior si existeix
    const anterior = document.getElementById('modal-recomanacions-reg');
    if (anterior) { anterior.remove(); return; }

    const avui = new Date();
    const dataFi    = avui.toISOString().split('T')[0];
    const dataInici = new Date(avui - 7 * 86400000).toISOString().split('T')[0];

    // Crear modal
    const div = document.createElement('div');
    div.innerHTML = `
    <div id="modal-recomanacions-reg" class="modal" style="display:block;">
        <div class="modal-content" style="max-width:1100px;">
            <span class="close" onclick="document.getElementById('modal-recomanacions-reg').remove()">&times;</span>
            <h2 style="color:#2980b9; margin-bottom:20px;">🌡️ Recomanacions de Reg</h2>
            <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap; margin-bottom:20px;">
                <div><label><strong>Des de:</strong></label> <input type="date" id="rec-data-inici" value="${dataInici}" style="padding:5px; border-radius:4px; border:1px solid #ddd;"></div>
                <div><label><strong>Fins a:</strong></label> <input type="date" id="rec-data-fi" value="${dataFi}" style="padding:5px; border-radius:4px; border:1px solid #ddd;"></div>
                <button class="btn btn-primary" onclick="actualitzarRecomanacions()">🔄 Actualitzar</button>
            </div>
            <div id="reg-finques-container"><p>⏳ Carregant dades meteorològiques...</p></div>
        </div>
    </div>`;
    document.body.appendChild(div.firstElementChild);

    // Esperar un tick perquè el DOM estigui llest abans de buscar reg-finques-container
    await new Promise(r => setTimeout(r, 0));

    try {
        const fincesReg = await getRegConfiguracio();
        console.log('✅ Finques reg carregades:', fincesReg.length);
        await carregarDadesReg(fincesReg, dataInici, dataFi);
    } catch(err) {
        console.error('❌ Error mostrarRecomanacionsReg:', err);
        const cont = document.getElementById('reg-finques-container');
        if (cont) cont.innerHTML = '<p style="color:red;">❌ Error: ' + err.message + '</p>';
    }
}

async function actualitzarRecomanacions() {
    const dataInici = document.getElementById('rec-data-inici').value;
    const dataFi    = document.getElementById('rec-data-fi').value;

    if (!dataInici || !dataFi) {
        mostrarNotificacio('⚠️ Selecciona les dates', 'warning');
        return;
    }

    document.getElementById('reg-finques-container').innerHTML = '<p>⏳ Actualitzant...</p>';

    try {
        const fincesReg = await getRegConfiguracio();
        await carregarDadesReg(fincesReg, dataInici, dataFi);
    } catch(err) {
        console.error('❌ Error actualitzarRecomanacions:', err);
        mostrarNotificacio('Error: ' + err.message, 'error');
    }
}



// ============================================================
// CARREGAR DADES I GENERAR TAULA (CORREGIT DEFINITIU)
// ============================================================

async function carregarDadesReg(fincesReg, dataInici, dataFi) {
    const container = document.getElementById('reg-finques-container');
    if (!container) return;

    try {
        const avui = new Date();
        avui.setHours(0, 0, 0, 0);

        // CORRECCIÓ: Parsejar dates com a LOCAL per evitar desfase UTC
        const dInici = parseDataLocal(dataInici);
        const dFi = parseDataLocal(dataFi);

        // ============================================================
        // CORRECCIÓ CRÍTICA: Càlcul de diesPassats
        // ============================================================
        // Open-Meteo amb past_days=N retorna N dies PASSATS des d'AVUI.
        // Per tant, diesPassats ha de ser la distància des d'AVUI fins a dInici,
        // NO la distància entre dInici i dFi.
        //
        // Exemple: avui=28/05, dInici=22/05, dFi=22/05
        //   INCORRECTE: diesPassats = dFi - dInici + 1 = 1
        //     → L'API retorna només 1 dia passat (27/05), cap dia és 22/05
        //   CORRECTE: diesPassats = avui - dInici + 1 = 7
        //     → L'API retorna 7 dies passats (21/05 a 27/05), incloent 22/05
        // ============================================================

        let diesPassats = Math.max(1, Math.ceil((avui - dInici) / 86400000) + 1);

        // Si el període seleccionat és totalment futur (dInici > avui),
        // no necessitem dades passades
        if (dInici > avui) {
            diesPassats = 0;
        }

        // Límit de l'API Open-Meteo (màxim 92 dies passats)
        diesPassats = Math.min(diesPassats, 92);

        // Recomanació futura: sempre 7 dies
        const diesFutures = 7;

        // METEO
        const meteoAlfRaw = await getMeteoData(41.4167, 0.6167, diesPassats, diesFutures);
        const meteoAlcRaw = await getMeteoData(41.3833, 0.6500, diesPassats, diesFutures);

        const meteoZones = {
            altes: processarMeteo(meteoAlfRaw, dInici, dFi),
            alcano: processarMeteo(meteoAlcRaw, dInici, dFi)
        };

        const mes = new Date().getMonth() + 1;

        let html = '';

        // CARDS METEO
        html += '<div style="display:flex; gap:15px; margin-bottom:20px; flex-wrap:wrap;">';
        html += generarCardMeteo('Zona Alfés', meteoZones.altes);
        html += generarCardMeteo('Zona Alcanó', meteoZones.alcano);
        html += '</div>';

        // TAULA
        html += '<div style="overflow-x:auto;">';
        html += '<table class="data-table" style="width:100%;">';
        html += `
        <thead><tr>
            <th>Finca</th>
            <th>Cultiu</th>
            <th style="text-align:right;">Ha</th>
            <th style="text-align:right;">ETc (m³)</th>
            <th style="text-align:right;">Pluja ef. (m³)</th>
            <th style="text-align:right;">Necessitat (m³)</th>
            <th style="text-align:right;">Consum real (m³)</th>
            <th style="text-align:right;">Diferència (m³)</th>
            <th>Estat</th>
            <th>Fase</th>
            <th style="text-align:right;">Rec. prop. setmana (m³)</th>
        </tr></thead><tbody>`;

        let totalNecessitat = 0, totalConsum = 0, totalRec = 0;

        // Carregar fases fenològiques
        const fasesFenologiques = {};
        try {
            const { data: fases } = await supabaseClient
                .from('reg_factor_explotacio')
                .select('num_explotacio, fase, factor_reg, alerta_reg');
            if (fases) fases.forEach(f => { fasesFenologiques[f.num_explotacio] = f; });
        } catch(e) { /* vista opcional */ }

        console.log('✅ Fases carregades, iniciant càrrega dades per finca...');

        // Carregar kc i consums en paral·lel per totes les finques
        const dadesFinques = await Promise.all(fincesReg.map(async (finca) => {
            const kc = await getRegKc(finca.cultiu, mes);
            const registresConsum = await getRegConsum(finca.num_explotacio, dataInici, dataFi);
            return { finca, kc, registresConsum };
        }));

        console.log('✅ Dades finques carregades:', dadesFinques.length);

        for (let { finca, kc, registresConsum } of dadesFinques) {
            const meteo = finca.num_explotacio === '122H165VH02'
                ? meteoZones.alcano
                : meteoZones.altes;

            const consumReal = registresConsum.reduce((s, r) => s + (parseFloat(r.consum_m3) || 0), 0);

            const calc = calcularNecessitatReg(meteo.etoPassat, kc, finca.superficie_ha, meteo.plujaPassat);
            const calcFuturBrut = calcularNecessitatReg(meteo.etoFutur, kc, finca.superficie_ha, meteo.plujaFutur);

            // Aplicar factor fenològic a la recomanació futura
            const faseInfo   = fasesFenologiques[finca.num_explotacio];
            const factorReg  = faseInfo ? faseInfo.factor_reg : 1.00;
            const fase       = faseInfo ? faseInfo.fase : 'creixement';
            const recFuturAjustada = +(calcFuturBrut.necessitatM3 * factorReg).toFixed(1);

            // Badge fase per a la columna
            const colorFase = {'collita':'#f44336','precollita':'#ff9800','postcollita':'#9c27b0','creixement':'#4caf50'}[fase]||'#4caf50';
            const textFase  = {'collita':'🍑 Collita','precollita':'⚠️ Precollita','postcollita':'🍂 Postcollita','creixement':'🌱 Creixement'}[fase]||fase;
            const faseBadge = `<span style="background:${colorFase};color:white;padding:2px 8px;border-radius:10px;font-size:11px;">${textFase} ×${factorReg.toFixed(2)}</span>`;

            // CORRECCIÓ: Obtenir ratio de l'avaluació per alinear colors
            const avaluacio = avaluarConsum(consumReal, calc.necessitatM3);
            const diferencia = consumReal - calc.necessitatM3;

            // CORRECCIÓ: Color de la diferència basat en el mateix ratio que l'estat
            const colorDif = colorDiferencia(avaluacio.ratio);

            totalNecessitat += calc.necessitatM3;
            totalConsum += consumReal;
            totalRec += recFuturAjustada;

            const cultiuText =
                finca.cultiu === 'pressec_juny' ? 'Préssec Pla (Juny)' :
                finca.cultiu === 'pressec_agost' ? 'Préssec Pla (Agost)' :
                'Albercoc';

            html += `
            <tr>
                <td><strong>${finca.nom_finca}</strong></td>
                <td>${cultiuText}</td>
                <td style="text-align:right;">${finca.superficie_ha}</td>
                <td style="text-align:right;">${calc.etcM3.toLocaleString('ca-ES')}</td>
                <td style="text-align:right; color:#3498db;">${calc.plujaEfectivaM3.toLocaleString('ca-ES')}</td>
                <td style="text-align:right; font-weight:bold;">${calc.necessitatM3.toLocaleString('ca-ES')}</td>
                <td style="text-align:right;">${consumReal.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
                <td style="text-align:right; color:${colorDif}; font-weight:bold;">${diferencia>=0?'+':''}${diferencia.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
                <td><span style="color:${avaluacio.color}; font-weight:bold;">${avaluacio.icon} ${avaluacio.text}</span></td>
                <td style="text-align:center;">${faseBadge}</td>
                <td style="text-align:right; font-weight:bold; color:#2980b9;">${recFuturAjustada.toLocaleString('ca-ES')} m³</td>
            </tr>`;
        }

        const difTotal = totalConsum - totalNecessitat;

        // CORRECCIÓ: Color del total basat en el ratio (alineat amb l'estat)
        const ratioTotal = totalNecessitat > 0 ? totalConsum / totalNecessitat : 1;
        const colorDifTotal = colorDiferencia(ratioTotal);

        html += `
        <tr style="border-top:3px solid #333; background:#f5f5f5; font-weight:bold;">
            <td colspan="3">TOTAL</td>
            <td></td>
            <td></td>
            <td></td>
            <td style="text-align:right;">${totalNecessitat.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td style="text-align:right;">${totalConsum.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td style="text-align:right; color:${colorDifTotal};">${difTotal>=0?'+':''}${difTotal.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td></td>
            <td style="text-align:right; color:#2980b9;">${totalRec.toLocaleString('ca-ES',{maximumFractionDigits:1})} m³</td>
        </tr>`;

        html += '</tbody></table></div>';

        // Tornar a buscar el container per si el DOM ha canviat durant els awaits
        const containerFinal = document.getElementById('reg-finques-container');
        console.log('✅ HTML generat, container:', containerFinal ? 'trobat' : 'NO TROBAT');
        if (containerFinal) {
            containerFinal.innerHTML = html;
        } else {
            console.error('❌ reg-finques-container no existeix al DOM');
        }

    } catch (error) {
        console.error('❌ Error carregant recomanacions reg:', error);
        container.innerHTML = `<p>❌ Error: ${error.message}</p>`;
    }
}


console.log('✅ Reg Intel·ligent v1 (corregit definitiu v2) carregat');