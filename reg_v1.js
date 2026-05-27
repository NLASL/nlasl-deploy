// ============================================================
// REG_V1.JS - Reg Intel·ligent
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
// API OPEN-METEO
// ============================================================

async function getMeteoData(latitud, longitud, diesPassats, diesFutures) {
    try {
        const url = REG_API_BASE + '?' +
            'latitude=' + latitud +
            '&longitude=' + longitud +
            '&daily=et0_fao_evapotranspiration,rain_sum,temperature_2m_max,temperature_2m_min' +
            '&timezone=Europe%2FMadrid' +
            '&past_days=' + diesPassats +
            '&forecast_days=' + diesFutures;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Error API Open-Meteo: ' + resp.status);
        return await resp.json();
    } catch (error) {
        console.error('❌ Error Open-Meteo:', error);
        return null;
    }
}

// ============================================================
// CÀLCULS
// ============================================================

function calcularNecessitatReg(etoMm, kc, superficieHa, plujaMm) {
    const etcM3 = etoMm * kc * superficieHa * 10;
    const plujaEfectivaM3 = plujaMm * 0.8 * superficieHa * 10;
    const necessitatM3 = Math.max(0, etcM3 - plujaEfectivaM3);
    return {
        etcM3: parseFloat(etcM3.toFixed(1)),
        plujaEfectivaM3: parseFloat(plujaEfectivaM3.toFixed(1)),
        necessitatM3: parseFloat(necessitatM3.toFixed(1))
    };
}

function avaluarConsum(consumReal, necessitat) {
    if (necessitat === 0) return { text: 'No cal reg', color: '#27ae60', icon: '✅' };
    const ratio = consumReal / necessitat;
    if (ratio > 1.25) return { text: 'Rega MASSA (' + Math.round((ratio-1)*100) + '% excés)', color: '#e74c3c', icon: '🔴' };
    if (ratio > 1.10) return { text: 'Lleugerament alt', color: '#e67e22', icon: '🟠' };
    if (ratio >= 0.85) return { text: 'Consum correcte', color: '#27ae60', icon: '🟢' };
    if (ratio >= 0.70) return { text: 'Lleugerament baix', color: '#f39c12', icon: '🟡' };
    return { text: 'Rega POC (' + Math.round((1-ratio)*100) + '% dèficit)', color: '#e74c3c', icon: '🔴' };
}

function processarMeteo(m, dInici, dFi) { // <-- Afegim els filtres de l'usuari aquí
    const avui = new Date();
    avui.setHours(0,0,0,0);

    let etoPassat = 0, etoFutur = 0;
    let plujaPassat = 0, plujaFutur = 0;

    for (let i = 0; i < m.dates.length; i++) {
        const d = new Date(m.dates[i]);
        const eto = m.eto[i] || 0;
        const pluja = m.pluja[i] || 0;

        // 🌟 LA CLAU: Només sumem al passat si està DINS del rang demanat per l'usuari
        if (d >= dInici && d <= dFi && d <= avui) {
            etoPassat += eto;
            plujaPassat += pluja;
        } else if (d > avui) {
            // El futur es manté igual per a la previsió dels propers 7 dies
            etoFutur += eto;
            plujaFutur += pluja;
        }
    }

    return {
        etoPassat,
        plujaPassat,
        etoFutur,
        plujaFutur
    };
}

function generarCardMeteo(titolZona, meteo) {
    let html = '';

    html += `<div style="flex:1; min-width:280px; border:1px solid #3498db; border-radius:6px; padding:10px; background:#f9fcff;">`;
    html += `<h3 style="color:#2980b9; margin-bottom:8px;">🔧 ${titolZona}</h3>`;

    // Període seleccionat (dades reals)
    html += `<div style="background:#eef6fb; border-radius:4px; padding:10px; margin-bottom:8px;">`;
    html += `<div style="font-weight:bold; color:#555;">📅 Període seleccionat</div>`;
    html += `<div style="margin-top:4px;">ETo: <strong>${meteo.etoPassat.toFixed(1)}</strong> mm<br>`;
    html += `Pluja: <strong>${meteo.plujaPassat.toFixed(1)}</strong> mm</div>`;
    html += `</div>`;

    // Propers 7 dies (recomanació futura)
    html += `<div style="background:#f0f8ff; border-radius:4px; padding:10px;">`;
    html += `<div style="font-weight:bold; color:#555;">🔮 Propers 7 dies</div>`;
    html += `<div style="margin-top:4px;">ETo: <strong>${meteo.etoFutur.toFixed(1)}</strong> mm<br>`;
    html += `Pluja prev.: <strong>${meteo.plujaFutur.toFixed(1)}</strong> mm</div>`;
    html += `</div>`;

    html += `</div>`;

    return html;
}


// ============================================================
// MOSTRAR RECOMANACIONS (botó dins carregarVistaReg)
// ============================================================

async function mostrarRecomanacionsReg() {
    const container = document.getElementById('reg-recomanacions');
    if (!container) return;

    // Toggle si ja està carregat
    if (container.dataset.carregat === 'true') {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
        return;
    }

    // Primera càrrega
    container.style.display = 'block';
    container.dataset.carregat = 'true';

    const avui = new Date();
    const dataFi = avui.toISOString().split('T')[0];
    const dataInici = new Date(avui - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    var html = '<div style="background:#f0f8ff; border-radius:8px; padding:15px; margin-top:20px;">';
    html += '<h3 style="margin:0 0 15px 0; color:#2980b9;">🌡️ Recomanacions de Reg</h3>';
    html += '<div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap; margin-bottom:15px;">';
    html += '<div><label><strong>Des de:</strong></label> <input type="date" id="rec-data-inici" value="' + dataInici + '" style="padding:5px; border-radius:4px; border:1px solid #ddd;"></div>';
    html += '<div><label><strong>Fins a:</strong></label> <input type="date" id="rec-data-fi" value="' + dataFi + '" style="padding:5px; border-radius:4px; border:1px solid #ddd;"></div>';
    html += '<button class="btn btn-primary" onclick="actualitzarRecomanacions()">🔄 Actualitzar</button>';
    html += '</div>';
    html += '<div id="reg-finques-container"><p>⏳ Carregant dades meteorològiques...</p></div>';
    html += '</div>';

    container.innerHTML = html;

    const finques = await getRegConfiguracio();
    await carregarDadesReg(finques, dataInici, dataFi);
}

async function actualitzarRecomanacions() {
    const dataInici = document.getElementById('rec-data-inici').value;
    const dataFi = document.getElementById('rec-data-fi').value;
    if (!dataInici || !dataFi) {
        mostrarNotificacio('⚠️ Selecciona les dates', 'warning');
        return;
    }
    document.getElementById('reg-finques-container').innerHTML = '<p>⏳ Actualitzant...</p>';
    const finques = await getRegConfiguracio();
    await carregarDadesReg(finques, dataInici, dataFi);
}

// ============================================================
// CARREGAR DADES I GENERAR TAULA
// ============================================================

async function getMeteoData(lat, lon, diesPassats, diesFuturs) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
                `&past_days=${diesPassats}&forecast_days=${diesFuturs}` +
                `&daily=et0_fao_evapotranspiration,precipitation_sum&timezone=Europe/Madrid`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Error obtenint dades meteo");

    const data = await res.json();

    return {
        dates: data.daily.time,
        eto: data.daily.et0_fao_evapotranspiration,
        pluja: data.daily.precipitation_sum
    };
}

function processarMeteo(m) {
    const avui = new Date();
    avui.setHours(0,0,0,0);

    let etoPassat = 0, etoFutur = 0;
    let plujaPassat = 0, plujaFutur = 0;

    for (let i = 0; i < m.dates.length; i++) {
        const d = new Date(m.dates[i]);
        const eto = m.eto[i] || 0;
        const pluja = m.pluja[i] || 0;

        if (d <= avui) {
            etoPassat += eto;
            plujaPassat += pluja;
        } else {
            etoFutur += eto;
            plujaFutur += pluja;
        }
    }

    return {
        etoPassat,
        plujaPassat,
        etoFutur,
        plujaFutur
    };
}

async function carregarDadesReg(finques, dataInici, dataFi) {
    const container = document.getElementById('reg-finques-container');
    if (!container) return;

    try {
        const avui = new Date();
        avui.setHours(0,0,0,0);
        const dInici = new Date(dataInici);
        const dFi = new Date(dataFi);

        // Dies passats (dataInici → avui)
        const diesPassats = Math.max(0, Math.ceil((avui - dInici) / (1000 * 60 * 60 * 24)));

        // Dies futurs (avui → dataFi)
        const diesFutures = 7; // recomanacions per als 7 dies següents al període seleccionat


        // Límits API Open-Meteo
        const diesPassatsCapped = Math.min(diesPassats, 92);
        const diesFuturesCapped = Math.min(diesFutures, 16);

        console.log('Dies passats:', diesPassatsCapped, 'Dies futurs:', diesFuturesCapped);

        // METEO
        const meteoAlfRaw = await getMeteoData(41.4167, 0.6167, diesPassatsCapped, diesFuturesCapped);
        const meteoAlcRaw = await getMeteoData(41.3833, 0.6500, diesPassatsCapped, diesFuturesCapped);

        // CODI MODIFICAT
		const meteoZones = {
			altes: processarMeteo(meteoAlfRaw, dInici, dFi),  // <-- Afegim dInici i dFi
			alcano: processarMeteo(meteoAlcRaw, dInici, dFi)  // <-- Afegim dInici i dFi
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
        html += '<thead><tr>';
        html += '<th>Finca</th>';
        html += '<th>Cultiu</th>';
        html += '<th style="text-align:right;">Ha</th>';
        html += '<th style="text-align:right;">ETc (m³)</th>';
        html += '<th style="text-align:right;">Pluja ef. (m³)</th>';
        html += '<th style="text-align:right;">Necessitat (m³)</th>';
        html += '<th style="text-align:right;">Consum real (m³)</th>';
        html += '<th style="text-align:right;">Diferència (m³)</th>';
        html += '<th>Estat</th>';
        html += '<th style="text-align:right;">Rec. prop. setmana (m³)</th>';
        html += '</tr></thead><tbody>';

        let totalNecessitat = 0, totalConsum = 0, totalRec = 0;

        for (let finca of finques) {
            const meteo = finca.num_explotacio === '122H165VH02'
                ? meteoZones.alcano
                : meteoZones.altes;

            const kc = await getRegKc(finca.cultiu, mes);
            const registresConsum = await getRegConsum(finca.num_explotacio, dataInici, dataFi);
            const consumReal = registresConsum.reduce((s, r) => s + (parseFloat(r.consum_m3) || 0), 0);

            const calc = calcularNecessitatReg(meteo.etoPassat, kc, finca.superficie_ha, meteo.plujaPassat);
            const calcFutur = calcularNecessitatReg(meteo.etoFutur, kc, finca.superficie_ha, meteo.plujaFutur);

            const avaluacio = avaluarConsum(consumReal, calc.necessitatM3);
            const diferencia = consumReal - calc.necessitatM3;

            totalNecessitat += calc.necessitatM3;
            totalConsum += consumReal;
            totalRec += calcFutur.necessitatM3;

            const colorDif = diferencia > 50 ? '#e74c3c' :
                             diferencia < -50 ? '#f39c12' : '#27ae60';

            const cultiuText =
                finca.cultiu === 'pressec_juny' ? 'Préssec Pla (Juny)' :
                finca.cultiu === 'pressec_agost' ? 'Préssec Pla (Agost)' :
                'Albercoc';

            html += '<tr>';
            html += `<td><strong>${finca.nom_finca}</strong></td>`;
            html += `<td>${cultiuText}</td>`;
            html += `<td style="text-align:right;">${finca.superficie_ha}</td>`;
            html += `<td style="text-align:right;">${calc.etcM3.toLocaleString('ca-ES')}</td>`;
            html += `<td style="text-align:right; color:#3498db;">${calc.plujaEfectivaM3.toLocaleString('ca-ES')}</td>`;
            html += `<td style="text-align:right; font-weight:bold;">${calc.necessitatM3.toLocaleString('ca-ES')}</td>`;
            html += `<td style="text-align:right;">${consumReal.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>`;
            html += `<td style="text-align:right; color:${colorDif}; font-weight:bold;">${diferencia>=0?'+':''}${diferencia.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>`;
            html += `<td><span style="color:${avaluacio.color}; font-weight:bold;">${avaluacio.icon} ${avaluacio.text}</span></td>`;
            html += `<td style="text-align:right; font-weight:bold; color:#2980b9;">${calcFutur.necessitatM3.toLocaleString('ca-ES')} m³</td>`;
            html += '</tr>';
        }

        // TOTALS
        const difTotal = totalConsum - totalNecessitat;

        html += `
        <tr style="border-top:3px solid #333; background:#f5f5f5; font-weight:bold;">
            <td colspan="3">TOTAL</td>
            <td style="text-align:right;">${totalNecessitat.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td></td>
            <td style="text-align:right;">${totalNecessitat.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td style="text-align:right;">${totalConsum.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td style="text-align:right; color:${difTotal>0?'#e74c3c':'#27ae60'};">${difTotal>=0?'+':''}${difTotal.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td></td>
            <td style="text-align:right; color:#2980b9;">${totalRec.toLocaleString('ca-ES',{maximumFractionDigits:1})} m³</td>
        </tr>`;

        html += '</tbody></table></div>';

        // METODOLOGIA
        const kcPressecJuny = await getRegKc('pressec_juny', mes);
        const kcPressecAgost = await getRegKc('pressec_agost', mes);
        const kcAlbercoc = await getRegKc('albercoc', mes);
        const nomMes = new Date().toLocaleString('ca-ES', {month:'long'});

        html += `
        <div style="margin-top:15px; padding:12px; background:#e8f4fd; border-left:4px solid #3498db; border-radius:4px; font-size:0.85em; color:#555;">
            <strong>📐 Metodologia:</strong> ETo Penman-Monteith (Open-Meteo) × Kc FAO-56 × Superfície (ha) × 10 = m³ necessaris.
            Pluja efectiva = 80% precipitació.
            Kc ${nomMes}: Préssec Pla Juny = <strong>${kcPressecJuny}</strong>,
            Préssec Pla Agost = <strong>${kcPressecAgost}</strong>,
            Albercoc = <strong>${kcAlbercoc}</strong>
        </div>`;

        container.innerHTML = html;

    } catch (error) {
        console.error('❌ Error carregant recomanacions reg:', error);
        container.innerHTML = `<p>❌ Error: ${error.message}</p>`;
    }
}

console.log('✅ Reg Intel·ligent v1 carregat');
