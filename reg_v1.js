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

function processarMeteo(meteoData) {
    if (!meteoData || !meteoData.daily) {
        return { etoPassat: 0, etoFutur: 0, plujaPassat: 0, plujaFutur: 0 };
    }
    const avui = new Date().toISOString().split('T')[0];
    const dates = meteoData.daily.time || [];
    const eto = meteoData.daily.et0_fao_evapotranspiration || [];
    const pluja = meteoData.daily.rain_sum || [];
    var etoPassat = 0, etoFutur = 0, plujaPassat = 0, plujaFutur = 0;
    dates.forEach(function(data, i) {
        const esPassat = data <= avui;
        const etoVal = parseFloat(eto[i]) || 0;
        const plujaVal = parseFloat(pluja[i]) || 0;
        if (esPassat) { etoPassat += etoVal; plujaPassat += plujaVal; }
        else { etoFutur += etoVal; plujaFutur += plujaVal; }
    });
    return {
        etoPassat: parseFloat(etoPassat.toFixed(1)),
        etoFutur: parseFloat(etoFutur.toFixed(1)),
        plujaPassat: parseFloat(plujaPassat.toFixed(1)),
        plujaFutur: parseFloat(plujaFutur.toFixed(1))
    };
}

function generarCardMeteo(nomZona, meteo) {
    var html = '<div style="background:#e8f4fd; border:2px solid #3498db; border-radius:10px; padding:15px; flex:1; min-width:250px;">';
    html += '<h4 style="margin:0 0 10px 0; color:#2980b9;">🌡️ ' + nomZona + '</h4>';
    html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">';
    html += '<div style="background:white; border-radius:6px; padding:10px;">';
    html += '<div style="font-size:0.8em; color:#666; margin-bottom:5px;">📅 Últims 7 dies</div>';
    html += '<div>ETo: <strong>' + meteo.etoPassat + ' mm</strong></div>';
    html += '<div>Pluja: <strong style="color:#3498db;">' + meteo.plujaPassat + ' mm</strong></div>';
    html += '</div>';
    html += '<div style="background:white; border-radius:6px; padding:10px;">';
    html += '<div style="font-size:0.8em; color:#666; margin-bottom:5px;">🔮 Propers 7 dies</div>';
    html += '<div>ETo: <strong>' + meteo.etoFutur + ' mm</strong></div>';
    html += '<div>Pluja prev.: <strong style="color:#3498db;">' + meteo.plujaFutur + ' mm</strong></div>';
    html += '</div>';
    html += '</div></div>';
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

async function carregarDadesReg(finques, dataInici, dataFi) {
    const container = document.getElementById('reg-finques-container');
    if (!container) return;

    try {
        const mes = new Date().getMonth() + 1;

        const meteoAlf = await getMeteoData(41.4167, 0.6167, 7, 7);
        const meteoAlc = await getMeteoData(41.3833, 0.6500, 7, 7);
        const meteoZones = {
            altes: processarMeteo(meteoAlf),
            alcano: processarMeteo(meteoAlc)
        };

        var html = '';

        // Cards meteo
        html += '<div style="display:flex; gap:15px; margin-bottom:20px; flex-wrap:wrap;">';
        html += generarCardMeteo('Zona Alfés', meteoZones.altes);
        html += generarCardMeteo('Zona Alcanó', meteoZones.alcano);
        html += '</div>';

        // Taula
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

        var totalNecessitat = 0, totalConsum = 0, totalRec = 0;

        for (var i = 0; i < finques.length; i++) {
            var finca = finques[i];
            var meteo = finca.num_explotacio === '122H165VH02' ? meteoZones.alcano : meteoZones.altes;
            var kc = await getRegKc(finca.cultiu, mes);
            var registresConsum = await getRegConsum(finca.num_explotacio, dataInici, dataFi);
            var consumReal = registresConsum.reduce(function(s, r) { return s + (parseFloat(r.consum_m3) || 0); }, 0);

            var calc = calcularNecessitatReg(meteo.etoPassat, kc, finca.superficie_ha, meteo.plujaPassat);
            var calcFutur = calcularNecessitatReg(meteo.etoFutur, kc, finca.superficie_ha, meteo.plujaFutur);
            var avaluacio = avaluarConsum(consumReal, calc.necessitatM3);
            var diferencia = consumReal - calc.necessitatM3;

            totalNecessitat += calc.necessitatM3;
            totalConsum += consumReal;
            totalRec += calcFutur.necessitatM3;

            var colorDif = diferencia > 50 ? '#e74c3c' : diferencia < -50 ? '#f39c12' : '#27ae60';
			var cultiuText = finca.cultiu === 'pressec_juny' ? 'Préssec Pla (Juny)' :
                 finca.cultiu === 'pressec_agost' ? 'Préssec Pla (Agost)' : 'Albercoc';

            html += '<tr>';
            html += '<td><strong>' + finca.nom_finca + '</strong></td>';
            html += '<td>' + cultiuText + '</td>';
            html += '<td style="text-align:right;">' + finca.superficie_ha + '</td>';
            html += '<td style="text-align:right;">' + calc.etcM3.toLocaleString('ca-ES') + '</td>';
            html += '<td style="text-align:right; color:#3498db;">' + calc.plujaEfectivaM3.toLocaleString('ca-ES') + '</td>';
            html += '<td style="text-align:right; font-weight:bold;">' + calc.necessitatM3.toLocaleString('ca-ES') + '</td>';
            html += '<td style="text-align:right;">' + consumReal.toLocaleString('ca-ES', {maximumFractionDigits:1}) + '</td>';
            html += '<td style="text-align:right; color:' + colorDif + '; font-weight:bold;">' + (diferencia >= 0 ? '+' : '') + diferencia.toLocaleString('ca-ES', {maximumFractionDigits:1}) + '</td>';
            html += '<td><span style="color:' + avaluacio.color + '; font-weight:bold;">' + avaluacio.icon + ' ' + avaluacio.text + '</span></td>';
            html += '<td style="text-align:right; font-weight:bold; color:#2980b9;">' + calcFutur.necessitatM3.toLocaleString('ca-ES') + ' m³</td>';
            html += '</tr>';
        }

        // Total
        var difTotal = totalConsum - totalNecessitat;
        html += '<tr style="border-top:3px solid #333; background:#f5f5f5; font-weight:bold;">';
        html += '<td colspan="3">TOTAL</td>';
        html += '<td style="text-align:right;">' + totalNecessitat.toLocaleString('ca-ES', {maximumFractionDigits:1}) + '</td>';
        html += '<td></td>';
        html += '<td style="text-align:right;">' + totalNecessitat.toLocaleString('ca-ES', {maximumFractionDigits:1}) + '</td>';
        html += '<td style="text-align:right;">' + totalConsum.toLocaleString('ca-ES', {maximumFractionDigits:1}) + '</td>';
        html += '<td style="text-align:right; color:' + (difTotal > 0 ? '#e74c3c' : '#27ae60') + ';">' + (difTotal >= 0 ? '+' : '') + difTotal.toLocaleString('ca-ES', {maximumFractionDigits:1}) + '</td>';
        html += '<td></td>';
        html += '<td style="text-align:right; color:#2980b9;">' + totalRec.toLocaleString('ca-ES', {maximumFractionDigits:1}) + ' m³</td>';
        html += '</tr>';
        html += '</tbody></table></div>';

        // Metodologia
        const kcPressecJuny = await getRegKc('pressec_juny', mes);
		const kcPressecAgost = await getRegKc('pressec_agost', mes);
        const kcAlbercoc = await getRegKc('albercoc', mes);
        const nomMes = new Date().toLocaleString('ca-ES', {month: 'long'});
        html += '<div style="margin-top:15px; padding:12px; background:#e8f4fd; border-left:4px solid #3498db; border-radius:4px; font-size:0.85em; color:#555;">';
        html += '<strong>📐 Metodologia:</strong> ETo Penman-Monteith (Open-Meteo) × Kc FAO-56 × Superfície (ha) × 10 = m³ necessaris. ';
        html += 'Pluja efectiva = 80% precipitació. ';
        html += 'Kc ' + nomMes + ': Préssec Pla = <strong>' + kcPressec + '</strong>, Albercoc = <strong>' + kcAlbercoc + '</strong>';
        html += '</div>';

        container.innerHTML = html;

    } catch (error) {
        console.error('❌ Error carregant recomanacions reg:', error);
        container.innerHTML = '<p>❌ Error: ' + error.message + '</p>';
    }
}

console.log('✅ Reg Intel·ligent v1 carregat');
