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

async function getMeteoData(lat, lon, diesPassats, diesFuturs) {
    const url =
        `${REG_API_BASE}?latitude=${lat}&longitude=${lon}` +
        `&past_days=${diesPassats}&forecast_days=${diesFuturs}` +
        `&daily=et0_fao_evapotranspiration,precipitation_sum` +
        `&timezone=Europe/Madrid`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("Error obtenint dades meteo");

    const data = await res.json();

    return {
        dates: data.daily.time,
        eto: data.daily.et0_fao_evapotranspiration,
        pluja: data.daily.precipitation_sum
    };
}


function processarMeteo(m, dInici, dFi) {
    const avui = new Date();
    avui.setHours(0, 0, 0, 0);

    let etoPassat = 0, etoFutur = 0;
    let plujaPassat = 0, plujaFutur = 0;

    for (let i = 0; i < m.dates.length; i++) {
        const d = new Date(m.dates[i]);
        const eto = m.eto[i] || 0;
        const pluja = m.pluja[i] || 0;

        // Només dies dins del rang seleccionat
        if (d >= dInici && d <= dFi) {

            if (d <= avui) {
                etoPassat += eto;
                plujaPassat += pluja;
            } else {
                etoFutur += eto;
                plujaFutur += pluja;
            }
        }
    }

    return { etoPassat, plujaPassat, etoFutur, plujaFutur };
	console.log("DEBUG processarMeteo input:", m.dates, dInici, dFi);

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

function avaluarConsum(consumReal, necessitat) {
    if (necessitat === 0)
        return { text: 'No cal reg', color: '#27ae60', icon: '✅' };

    const ratio = consumReal / necessitat;

    if (ratio > 1.25) return { text: `Rega MASSA (${Math.round((ratio - 1) * 100)}% excés)`, color: '#e74c3c', icon: '🔴' };
    if (ratio > 1.10) return { text: 'Lleugerament alt', color: '#e67e22', icon: '🟠' };
    if (ratio >= 0.85) return { text: 'Consum correcte', color: '#27ae60', icon: '🟢' };
    if (ratio >= 0.70) return { text: 'Lleugerament baix', color: '#f39c12', icon: '🟡' };

    return { text: `Rega POC (${Math.round((1 - ratio) * 100)}% dèficit)`, color: '#e74c3c', icon: '🔴' };
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
    const container = document.getElementById('reg-recomanacions');
    if (!container) return;

    if (container.dataset.carregat === 'true') {
        container.style.display = container.style.display === 'none' ? 'block' : 'none';
        return;
    }

    container.style.display = 'block';
    container.dataset.carregat = 'true';

    const avui = new Date();
    const dataFi = avui.toISOString().split('T')[0];
    const dataInici = new Date(avui - 7 * 86400000).toISOString().split('T')[0];

    container.innerHTML = `
    <div style="background:#f0f8ff; border-radius:8px; padding:15px; margin-top:20px;">
        <h3 style="margin:0 0 15px 0; color:#2980b9;">🌡️ Recomanacions de Reg</h3>
        <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap; margin-bottom:15px;">
            <div><label><strong>Des de:</strong></label> <input type="date" id="rec-data-inici" value="${dataInici}" style="padding:5px; border-radius:4px; border:1px solid #ddd;"></div>
            <div><label><strong>Fins a:</strong></label> <input type="date" id="rec-data-fi" value="${dataFi}" style="padding:5px; border-radius:4px; border:1px solid #ddd;"></div>
            <button class="btn btn-primary" onclick="actualitzarRecomanacions()">🔄 Actualitzar</button>
        </div>
        <div id="reg-finques-container"><p>⏳ Carregant dades meteorològiques...</p></div>
    </div>`;

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
        const avui = new Date();
        avui.setHours(0, 0, 0, 0);

        const dInici = new Date(dataInici);
        const dFi = new Date(dataFi);

        // Dies passats EXACTES del període seleccionat
        let diesPassats = 0;

        if (dFi <= avui) {
            diesPassats = Math.max(1, Math.ceil((dFi - dInici) / 86400000) + 1);
        } else if (dInici <= avui) {
            diesPassats = Math.max(1, Math.ceil((avui - dInici) / 86400000) + 1);
        } else {
            diesPassats = 0;
        }

        // Recomanació futura: sempre 7 dies
        const diesFutures = 7;

        // Límits Open‑Meteo
        diesPassats = Math.min(diesPassats, 92);

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
            <th style="text-align:right;">Rec. prop. setmana (m³)</th>
        </tr></thead><tbody>`;

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

            const colorDif =
                diferencia > 50 ? '#e74c3c' :
                diferencia < -50 ? '#f39c12' :
                '#27ae60';

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
                <td style="text-align:right; font-weight:bold; color:#2980b9;">${calcFutur.necessitatM3.toLocaleString('ca-ES')} m³</td>
            </tr>`;
        }

        const difTotal = totalConsum - totalNecessitat;

        html += `
        <tr style="border-top:3px solid #333; background:#f5f5f5; font-weight:bold;">
            <td colspan="3">TOTAL</td>
            <td></td>
            <td></td>
            <td style="text-align:right;">${totalNecessitat.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td style="text-align:right;">${totalConsum.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td style="text-align:right; color:${difTotal>0?'#e74c3c':'#27ae60'};">${difTotal>=0?'+':''}${difTotal.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td></td>
            <td style="text-align:right; color:#2980b9;">${totalRec.toLocaleString('ca-ES',{maximumFractionDigits:1})} m³</td>
        </tr>`;

        html += '</tbody></table></div>';

        container.innerHTML = html;

    } catch (error) {
        console.error('❌ Error carregant recomanacions reg:', error);
		console.log("DEBUG diesPassats:", diesPassats, "dInici:", dInici, "dFi:", dFi);
		console.log("DEBUG meteoAlfRaw:", meteoAlfRaw);
        container.innerHTML = `<p>❌ Error: ${error.message}</p>`;
    }
}


console.log('✅ Reg Intel·ligent v1 carregat');
