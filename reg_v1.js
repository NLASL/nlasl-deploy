// ============================================================
// REG_V1_INTEGRAT.JS - Reg Intel·ligent amb Open-Meteo (ETo) + XEMA/AEMET (Pluja)
// Versió integrada a partir de reg_v1.js (corregit definitiu v2)
// ============================================================

console.log('💧 Inicialitzant Reg Intel·ligent integrat...');

const REG_API_BASE = 'https://api.open-meteo.com/v1/forecast';
// IMPORTANT: defineix aquesta constant al teu entorn (config)
const AEMET_API_KEY = 'POSA_AQUI_LA_TEVA_API_KEY_AEMET';

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
// UTILITATS DE DATES
// ============================================================

function parseDataLocal(dataStr) {
    const [any, mes, dia] = dataStr.split('-').map(Number);
    return new Date(any, mes - 1, dia, 0, 0, 0, 0);
}

function compararDates(a, b) {
    const aStr = a.getFullYear() * 10000 + (a.getMonth() + 1) * 100 + a.getDate();
    const bStr = b.getFullYear() * 10000 + (b.getMonth() + 1) * 100 + b.getDate();
    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
}

function dataDinsRangDate(d, inici, fi) {
    const dStr = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const iniStr = inici.getFullYear() * 10000 + (inici.getMonth() + 1) * 100 + inici.getDate();
    const fiStr = fi.getFullYear() * 10000 + (fi.getMonth() + 1) * 100 + fi.getDate();
    return dStr >= iniStr && dStr <= fiStr;
}

// ============================================================
// API OPEN-METEO (ETo + pluja model, però només farem servir ETo)
// ============================================================

async function getMeteoData(lat, lon, diesPassats, diesFuturs) {
    const url =
        `${REG_API_BASE}?latitude=${lat}&longitude=${lon}` +
        `&past_days=${diesPassats}&forecast_days=${diesFuturs}` +
        `&daily=et0_fao_evapotranspiration,precipitation_sum` +
        `&timezone=Europe/Madrid`;

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
// XEMA (Meteocat) - Pluja real
// ============================================================

async function getPlujaXema(codiEstacio, dataInici, dataFi) {
    if (!codiEstacio) return null;

    const url = `https://xnxoufpizdtfklfjwqet.supabase.co/functions/v1/pluja-xema?estacio=${codiEstacio}&dataInici=${dataInici}&dataFi=${dataFi}`;

    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();

        if (!Array.isArray(data.metadades)) return null;
        if (data.metadades.length === 0) return null;
        if (typeof data.total === 'number') return data.total;

        let total = 0;
        for (const m of data.metadades) {
            total += m.valor || 0;
        }
        return parseFloat(total.toFixed(2));
    } catch (e) {
        console.warn('XEMA no disponible:', e.message);
        return null;
    }
}


// ============================================================
// AEMET - Pluja real (requereix API key)
// ============================================================

// ============================================================
// AEMET - Pluja real via proxy Vercel (oculta la API key)
// ============================================================

async function getPlujaAemet(lat, lon, dataInici, dataFi) {
    const url = `/api/pluja-aemet?lat=${lat}&lon=${lon}&dataInici=${dataInici}&dataFi=${dataFi}`;
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return typeof data.total === 'number' ? data.total : null;
    } catch (e) {
        console.warn('AEMET no disponible:', e.message);
        return null;
    }
}

// ============================================================
// OPEN-METEO ARCHIVE — Pluja real mesurada per dies passats
// Usa l'API d'arxiu (ERA5 reanalysis) que conté dades reals,
// no previsions. Fallback quan XEMA no és disponible.
// ============================================================

async function getPlujaOpenMeteoArchive(lat, lon, dataInici, dataFi) {
    const avui = new Date().toISOString().split('T')[0];
    // L'API d'arxiu no accepta dates futures — tallar a avui
    const dataFiReal = dataFi > avui ? avui : dataFi;
    if (dataInici > dataFiReal) return 0;

    const url =
        `https://archive-api.open-meteo.com/v1/archive` +
        `?latitude=${lat}&longitude=${lon}` +
        `&start_date=${dataInici}&end_date=${dataFiReal}` +
        `&daily=precipitation_sum` +
        `&timezone=Europe/Madrid`;

    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        const sums = data.daily?.precipitation_sum || [];
        return sums.reduce(function(s, v) { return s + (v || 0); }, 0);
    } catch (e) {
        console.warn('OpenMeteo Archive no disponible:', e.message);
        return null;
    }
}



// ============================================================
// Pluja real unificada (XEMA + AEMET)
// ============================================================

async function getPlujaReal(zona, dataInici, dataFi) {
    // 1) XEMA primer
    let codiXema = null;
    if (zona === 'alfes') codiXema = 'X7';  // Torres de Segre (més propera)
    if (zona === 'alcano') codiXema = 'X7'; // Torres de Segre

    let plujaXema = await getPlujaXema(codiXema, dataInici, dataFi);
    if (plujaXema !== null) return plujaXema;

    // 2) AEMET si XEMA falla
    let lat = zona === 'alfes' ? 41.4167 : 41.3833;
    let lon = zona === 'alfes' ? 0.6167 : 0.6500;

    let plujaAemet = await getPlujaAemet(lat, lon, dataInici, dataFi);
    if (plujaAemet !== null) return plujaAemet;

    // 3) OpenMeteo Archive — dades reals mesurades (ERA5), no previsió
    let plujaArchive = await getPlujaOpenMeteoArchive(lat, lon, dataInici, dataFi);
    if (plujaArchive !== null) return plujaArchive;

    // 4) Fallback final → 0 mm
    return 0;
}

// ============================================================
// PROCESSAMENT METEO INTEGRAT (ETo Open-Meteo + Pluja XEMA/AEMET)
// ============================================================

async function processarMeteoIntegrat(m, dInici, dFi, zona) {
    const avui = new Date();
    avui.setHours(0, 0, 0, 0);

    let etoPassat = 0, etoFutur = 0;

    for (let i = 0; i < m.dates.length; i++) {
        const d = parseDataLocal(m.dates[i]);
        const eto = m.eto[i] || 0;

        if (dataDinsRangDate(d, dInici, dFi) && compararDates(d, avui) <= 0) {
            etoPassat += eto;
        }

        if (compararDates(d, avui) > 0 && compararDates(d, avui) <= 7) {
            etoFutur += eto;
        }
    }

    const dataIniStr = dInici.toISOString().split('T')[0];
    const dataFiStr  = dFi.toISOString().split('T')[0];

    const plujaPassat = await getPlujaReal(zona, dataIniStr, dataFiStr);
    const plujaFutur  = 0; // opcional: previsió futura si algun dia la vols integrar

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
// AVALUACIÓ I COLORS
// ============================================================

function avaluarConsum(consumReal, necessitat) {
    if (necessitat === 0) {
        if (consumReal > 0) {
            return {
                text: 'Rega MASSA (excés total)',
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

    if (ratio > 1.20) return { text: `Rega MASSA (${Math.round((ratio - 1) * 100)}% excés)`, color: '#e74c3c', icon: '🔴', ratio };
    if (ratio > 1.08) return { text: 'Lleugerament alt', color: '#e67e22', icon: '🟠', ratio };
    if (ratio >= 0.92) return { text: 'Consum correcte', color: '#27ae60', icon: '🟢', ratio };
    if (ratio >= 0.80) return { text: 'Lleugerament baix', color: '#f39c12', icon: '🟡', ratio };

    return { text: `Rega POC (${Math.round((1 - ratio) * 100)}% dèficit)`, color: '#e74c3c', icon: '🔴', ratio };
}

function colorDiferencia(ratio) {
    if (ratio === Infinity) return '#e74c3c';
    if (ratio > 1.25) return '#e74c3c';
    if (ratio > 1.10) return '#e67e22';
    if (ratio >= 0.85) return '#27ae60';
    if (ratio >= 0.70) return '#f39c12';
    return '#e74c3c';
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
// MOSTRAR RECOMANACIONS (modal)
// ============================================================

async function mostrarRecomanacionsReg() {
    const anterior = document.getElementById('modal-recomanacions-reg');
    if (anterior) { anterior.remove(); return; }

    const avui = new Date();
    const dataFi    = avui.toISOString().split('T')[0];
    const dataInici = new Date(avui - 7 * 86400000).toISOString().split('T')[0];

    const div = document.createElement('div');
    div.innerHTML = `
    <div id="modal-recomanacions-reg" style="
        position:fixed; top:0; left:0; width:100%; height:100%;
        background:rgba(0,0,0,0.5); z-index:999999;
        overflow-y:auto; padding:20px; box-sizing:border-box;">
        <div style="
            background:white; border-radius:8px; padding:30px;
            max-width:1100px; margin:0 auto; position:relative;
            box-shadow:0 8px 32px rgba(0,0,0,0.2);">
            <span onclick="document.getElementById('modal-recomanacions-reg').remove()"
                style="position:absolute;right:20px;top:20px;font-size:28px;
                cursor:pointer;color:#999;font-weight:bold;line-height:1;">&times;</span>
            <h2 style="color:#2980b9; margin-bottom:20px;">🌡️ Recomanacions de Reg</h2>
            <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap; margin-bottom:20px;">
                <div><label><strong>Des de:</strong></label> <input type="date" id="rec-data-inici" value="${dataInici}" style="padding:5px; border-radius:4px; border:1px solid #ddd;"></div>
                <div><label><strong>Fins a:</strong></label> <input type="date" id="rec-data-fi" value="${dataFi}" style="padding:5px; border-radius:4px; border:1px solid #ddd;"></div>
                <button class="btn btn-primary" onclick="actualitzarRecomanacions()">🔄 Actualitzar</button>
                <button class="btn btn-secondary" onclick="imprimirRecomanacionsReg()">🖨️ Imprimir PDF</button>
            </div>
            <div id="modal-reg-finques-container" style="min-height:50px;"><p>⏳ Carregant dades meteorològiques...</p></div>
        </div>
    </div>`;
    document.body.appendChild(div.firstElementChild);

    await new Promise(r => setTimeout(r, 0));

    try {
        const fincesReg = await getRegConfiguracio();
        await carregarDadesReg(fincesReg, dataInici, dataFi);
    } catch(err) {
        console.error('❌ Error mostrarRecomanacionsReg:', err);
        const cont = document.getElementById('modal-reg-finques-container');
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

    document.getElementById('modal-reg-finques-container').innerHTML = '<p>⏳ Actualitzant...</p>';

    try {
        const fincesReg = await getRegConfiguracio();
        await carregarDadesReg(fincesReg, dataInici, dataFi);
    } catch(err) {
        console.error('❌ Error actualitzarRecomanacions:', err);
        mostrarNotificacio('Error: ' + err.message, 'error');
    }
}

// ============================================================
// CARREGAR DADES I GENERAR TAULA
// ============================================================

async function carregarDadesReg(fincesReg, dataInici, dataFi) {
    const container = document.getElementById('modal-reg-finques-container');
    if (!container) return;

    try {
        const avui = new Date();
        avui.setHours(0, 0, 0, 0);

        const dInici = parseDataLocal(dataInici);
        const dFi    = parseDataLocal(dataFi);

        let diesPassats = Math.max(1, Math.ceil((avui - dInici) / 86400000) + 1);
        if (dInici > avui) diesPassats = 0;
        diesPassats = Math.min(diesPassats, 92);

        const diesFutures = 7;

        const meteoAlfRaw = await getMeteoData(41.4167, 0.6167, diesPassats, diesFutures);
        const meteoAlcRaw = await getMeteoData(41.3833, 0.6500, diesPassats, diesFutures);

        const meteoZones = {
            altes: await processarMeteoIntegrat(meteoAlfRaw, dInici, dFi, 'alfes'),
            alcano: await processarMeteoIntegrat(meteoAlcRaw, dInici, dFi, 'alcano')
        };

        const mes = new Date().getMonth() + 1;

        let html = '';

        html += '<div style="display:flex; gap:15px; margin-bottom:20px; flex-wrap:wrap;">';
        html += generarCardMeteo('Zona Alfés', meteoZones.altes);
        html += generarCardMeteo('Zona Alcanó', meteoZones.alcano);
        html += '</div>';

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

        const dataMitjana = new Date(
            (new Date(dataInici).getTime() + new Date(dataFi).getTime()) / 2
        ).toISOString().split('T')[0];

        const fasesFenologiques = {};
        try {
            const resultatsFases = await Promise.all(
                fincesReg.map(async (finca) => {
                    const { data } = await supabaseClient
                        .rpc('get_factor_reg_per_data', {
                            p_num_explotacio: finca.num_explotacio,
                            p_data: dataMitjana
                        });
                    return { num_explotacio: finca.num_explotacio, fase: data?.[0] };
                })
            );
            resultatsFases.forEach(function(r) {
                if (r.fase) fasesFenologiques[r.num_explotacio] = r.fase;
            });
        } catch(e) {
            console.warn('get_factor_reg_per_data no disponible:', e.message);
        }

        const dadesFinques = await Promise.all(fincesReg.map(async (finca) => {
            const kc = await getRegKc(finca.cultiu, mes);
            const registresConsum = await getRegConsum(finca.num_explotacio, dataInici, dataFi);
            return { finca, kc, registresConsum };
        }));

        for (let { finca, kc, registresConsum } of dadesFinques) {
            const meteo = finca.num_explotacio === '122H165VH02'
                ? meteoZones.alcano
                : meteoZones.altes;

            const consumReal = registresConsum.reduce((s, r) => s + (parseFloat(r.consum_m3) || 0), 0);

            const calcBrut = calcularNecessitatReg(meteo.etoPassat, kc, finca.superficie_ha, meteo.plujaPassat);
            const calcFuturBrut = calcularNecessitatReg(meteo.etoFutur, kc, finca.superficie_ha, meteo.plujaFutur);

            const faseInfo   = fasesFenologiques[finca.num_explotacio];
            const factorReg  = faseInfo ? faseInfo.factor_reg : 1.00;
            const fase       = faseInfo ? faseInfo.fase : 'creixement';

            const calc = {
                ...calcBrut,
                necessitatM3: +(calcBrut.necessitatM3 * factorReg).toFixed(1),
                etcM3:        +(calcBrut.etcM3        * factorReg).toFixed(1)
            };
            const recFuturAjustada = +(calcFuturBrut.necessitatM3 * factorReg).toFixed(1);

            const colorFase = {
                'collita':'#f44336',
                'precollita':'#ff9800',
                'postcollita':'#9c27b0',
                'creixement':'#4caf50'
            }[fase] || '#4caf50';
            const textFase  = {
                'collita':'🍑 Collita',
                'precollita':'⚠️ Precollita',
                'postcollita':'🍂 Postcollita',
                'creixement':'🌱 Creixement'
            }[fase] || fase;
            const faseBadge = `<span style="background:${colorFase};color:white;padding:2px 8px;border-radius:10px;font-size:11px;">${textFase} ×${factorReg.toFixed(2)}</span>`;

            const avaluacio = avaluarConsum(consumReal, calc.necessitatM3);
            const diferencia = consumReal - calc.necessitatM3;
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
                <td style="text-align:right;">${calc.etcM3.toLocaleString('ca-ES', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                <td style="text-align:right; color:#3498db;">${calc.plujaEfectivaM3.toLocaleString('ca-ES', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                <td style="text-align:right; font-weight:bold;">${calc.necessitatM3.toLocaleString('ca-ES', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</td>
                <td style="text-align:right;">${consumReal.toLocaleString('ca-ES',{minimumFractionDigits: 1, maximumFractionDigits:1})}</td>
                <td style="text-align:right; color:${colorDif}; font-weight:bold;">${diferencia>=0?'+':''}${diferencia.toLocaleString('ca-ES',{minimumFractionDigits: 1, maximumFractionDigits:1})}</td>
                <td><span style="color:${avaluacio.color}; font-weight:bold;">${avaluacio.icon} ${avaluacio.text}</span></td>
                <td style="text-align:center;">${faseBadge}</td>
                <td style="text-align:right; font-weight:bold; color:#2980b9;">${recFuturAjustada.toLocaleString('ca-ES', {minimumFractionDigits: 1, maximumFractionDigits: 1})} m³</td>
            </tr>`;
        }

        const difTotal = totalConsum - totalNecessitat;
        const ratioTotal = totalNecessitat > 0 ? totalConsum / totalNecessitat : 1;
        const colorDifTotal = colorDiferencia(ratioTotal);

        html += `
        <tr style="border-top:3px solid #333; background:#f5f5f5; font-weight:bold;">
            <td colspan="3">TOTAL</td>
            <td></td>
            <td></td>
            <td style="text-align:right;">${totalNecessitat.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td style="text-align:right;">${totalConsum.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td style="text-align:right; color:${colorDifTotal};">${difTotal>=0?'+':''}${difTotal.toLocaleString('ca-ES',{maximumFractionDigits:1})}</td>
            <td></td>
            <td></td>
            <td style="text-align:right; color:#2980b9;">${totalRec.toLocaleString('ca-ES',{maximumFractionDigits:1})} m³</td>
        </tr>`;

        html += '</tbody></table></div>';

        const containerFinal = document.getElementById('modal-reg-finques-container');
        if (containerFinal) {
            containerFinal.innerHTML = html;
        } else {
            console.error('❌ modal-reg-finques-container no existeix al DOM');
        }

    } catch (error) {
        console.error('❌ Error carregant recomanacions reg:', error);
        container.innerHTML = `<p>❌ Error: ${error.message}</p>`;
    }
}

console.log('✅ Reg Intel·ligent integrat (Open-Meteo + XEMA/AEMET) carregat');