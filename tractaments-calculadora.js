// ============================================================
// CALCULADORA DE TRACTAMENTS — Modal reutilitzable (Amb Mode Invers)
// Ús: obrirCalculadoraTractament(config) on config és:
//   { superficie, onConfirm, producteNom }
// ============================================================

// 1. LÒGICA MATEMÀTICA (Ampliada amb el càlcul des de botes)
function calcularLlogicaTractament({ superficie, capacitatCuba, metode, producte, gastoCaldoHa, modeCamp, numBotes, productePerBota }) {
    // MODE INVERS: El pagès et diu què ha tirat
    if (modeCamp) {
        const producteTotalFinca = numBotes * productePerBota;
        const dosiFinalRegistar = producteTotalFinca / superficie;
        const aiguaTotal = numBotes * capacitatCuba;

        const cubades = [];
        for (let i = 0; i < numBotes; i++) {
            cubades.push({
                tipus: 'Plena',
                litres_aigua: capacitatCuba,
                producte_a_afegir: productePerBota
            });
        }

        return {
            aigua_total_finca: Math.round(aiguaTotal),
            producte_total_finca: Number(producteTotalFinca.toFixed(2)),
            dosi_per_a_app_produccio: Number(dosiFinalRegistar.toFixed(3)),
            desglos_cubades: cubades
        };
    }

    // MODE ESTÀNDARD: Tu li dius la dosi d'etiqueta i calcula les botes
    let caldoPerHa = gastoCaldoHa;
    if (metode === 'goteig_pinyol') {
        caldoPerHa = capacitatCuba / superficie;
    }

    const aiguaTotalNecessaria = superficie * caldoPerHa;
    let producteTotalFinca = 0;
    let dosiFinalRegistar = 0;

    if (producte.tipus_dosi === 'per_ha') {
        producteTotalFinca = superficie * producte.valor;
        dosiFinalRegistar = producte.valor;
    } else if (producte.tipus_dosi === 'percentatge') {
        producteTotalFinca = (aiguaTotalNecessaria * (producte.valor / 100));
        dosiFinalRegistar = producteTotalFinca / superficie;
    }

    const nCubadesSenceres = Math.floor(aiguaTotalNecessaria / capacitatCuba);
    const aiguaCubaSobrant = aiguaTotalNecessaria % capacitatCuba;
    const cubades = [];

    for (let i = 0; i < nCubadesSenceres; i++) {
        cubades.push({
            tipus: 'Plena',
            litres_aigua: capacitatCuba,
            producte_a_afegir: (capacitatCuba / aiguaTotalNecessaria) * producteTotalFinca
        });
    }

    if (aiguaCubaSobrant > 0.1) {
        cubades.push({
            tipus: 'Residual / Sobrant',
            litres_aigua: Math.round(aiguaCubaSobrant),
            producte_a_afegir: (aiguaCubaSobrant / aiguaTotalNecessaria) * producteTotalFinca
        });
    }

    return {
        aigua_total_finca: Math.round(aiguaTotalNecessaria),
        producte_total_finca: Number(producteTotalFinca.toFixed(2)),
        dosi_per_a_app_produccio: Number(dosiFinalRegistar.toFixed(3)),
        desglos_cubades: cubades.map(function(c) {
            return {
                tipus: c.tipus,
                litres_aigua: Math.round(c.litres_aigua),
                producte_a_afegir: Number(c.producte_a_afegir.toFixed(2))
            };
        })
    };
}

// 2. INTERFÍCIE DEL MODAL
function obrirCalculadoraTractament(config) {
    const superficieBase = parseFloat(config.superficie) || 0;
    const onConfirm = config.onConfirm || function() {};
    const producteNom = config.producteNom || 'Producte';

    const anterior = document.getElementById('modal-calculadora-tractament');
    if (anterior) anterior.remove();

    const nomLower = producteNom.toLowerCase();
    const unitatDefecte = (nomLower.includes('sofre') || nomLower.includes('pols') || nomLower.includes('wg') || nomLower.includes('wp')) ? 'Kg' : 'L';

    const html = `
    <div id="modal-calculadora-tractament" class="modal" style="display:block; z-index:9999; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); overflow-y:auto; padding:10px;">
        <div class="modal-content" style="max-width:560px; background:#fff; margin:30px auto; padding:20px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); position:relative; font-family:sans-serif;">
            <span class="close" onclick="tancarCalculadoraTractament()" style="position:absolute; right:15px; top:10px; font-size:24px; cursor:pointer; color:#999;">&times;</span>
            <h2 style="font-size:20px; margin-bottom:5px; color:#1b5e20;">🧮 Calculadora de Cubes i Varietats</h2>
            <p style="color:#666; margin-bottom:12px; font-size:14px;">
                <strong>Producte:</strong> ${producteNom}
            </p>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px; margin-bottom:14px; background:#eee; padding:4px; border-radius:6px;">
                <button id="btn-mode-standard" onclick="canviarModeCalculadora(false, '${unitatDefecte}')" style="padding:8px; border:none; border-radius:4px; font-weight:bold; cursor:pointer; background:#fff; color:#333;">📋 Dosi Etiqueta</button>
                <button id="btn-mode-camp" onclick="canviarModeCalculadora(true, '${unitatDefecte}')" style="padding:8px; border:none; border-radius:4px; font-weight:bold; cursor:pointer; background:transparent; color:#666;">🚜 Des de Camp (Botes)</button>
            </div>

            <div style="background:#e3f2fd; padding:12px; border-radius:8px; margin-bottom:14px; border-left:4px solid #1e88e5;">
                <strong style="font-size:13px; display:block; margin-bottom:6px; color:#0d47a1;">📐 Superfície del Tractament:</strong>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px;">
                    <div>
                        <label style="font-size:11px; color:#555; display:block;">Ha Finques seleccionades</label>
                        <input type="number" id="calc-sup-base" value="${superficieBase}" step="0.01" style="padding:6px; width:100%; border:1px solid #aaa; border-radius:4px; font-size:14px;" onchange="recalcularSuperficieTotal()">
                    </div>
                    <div>
                        <label style="font-size:11px; color:#555; display:block;">➕ Ha Varietat solta / trossos</label>
                        <input type="number" id="calc-sup-varietat" value="0" step="0.01" min="0" placeholder="Ex: 1.41" style="padding:6px; width:100%; border:1px solid #aaa; border-radius:4px; font-size:14px;" onchange="recalcularSuperficieTotal()">
                    </div>
                </div>
                <div style="font-size:14px; font-weight:bold; color:#0d47a1; text-align:right;">
                    Superfície Total Calculada: <span id="calc-sup-total-text">${superficieBase.toFixed(2)}</span> Ha
                </div>
            </div>

            <div id="wrapper-inputs-standard" style="background:#f5f5f5; padding:14px; border-radius:8px; margin-bottom:14px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div class="form-group" style="margin:0;">
                        <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">Mètode tractament</label>
                        <select id="calc-metode" onchange="calcCanviMetode()" style="padding:10px; width:100%; border:1px solid #ddd; border-radius:4px; font-size:15px; background:#fff;">
                            <option value="atomitzador_pinyol">Atomitzador (pinyol)</option>
                            <option value="goteig_pinyol">Reg goteig (pinyol)</option>
                            <option value="barra_cereal">Barra extensiva (cereal)</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">Capacitat Cuba (L)</label>
                        <input type="number" id="calc-cuba" value="2000" step="500" style="padding:10px; width:100%; border:1px solid #ddd; border-radius:4px; font-size:15px;">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div class="form-group" id="calc-group-gasto" style="margin:0;">
                        <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">Gasto Caldo (L/ha)</label>
                        <input type="number" id="calc-gasto" value="800" step="50" style="padding:10px; width:100%; border:1px solid #ddd; border-radius:4px; font-size:15px;">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">Tipus de Dosi</label>
                        <select id="calc-tipus-dosi" onchange="calcCanviTipusDosi('${unitatDefecte}')" style="padding:10px; width:100%; border:1px solid #ddd; border-radius:4px; font-size:15px; background:#fff;">
                            <option value="per_ha">Per Hectàrea (${unitatDefecte}/ha)</option>
                            <option value="percentatge">Percentatge (%)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin:0;">
                    <label id="calc-label-dosi" style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">Valor Dosi (${unitatDefecte} per ha)</label>
                    <input type="number" id="calc-valor-dosi" value="2.5" step="0.1" min="0" style="padding:10px; width:100%; border:1px solid #ddd; border-radius:4px; font-size:15px;">
                </div>
            </div>

            <div id="wrapper-inputs-camp" style="background:#fff3e0; padding:14px; border-radius:8px; margin-bottom:14px; border-left:4px solid #ff9800; display:none;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div class="form-group" style="margin:0;">
                        <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">Litres bota (Capacitat)</label>
                        <input type="number" id="calc-camp-cuba" value="2000" step="500" style="padding:10px; width:100%; border:1px solid #ddd; border-radius:4px; font-size:15px;">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">Nº de botes aplicades</label>
                        <input type="number" id="calc-camp-botes" value="3" min="1" style="padding:10px; width:100%; border:1px solid #ddd; border-radius:4px; font-size:15px;">
                    </div>
                </div>
                <div class="form-group" style="margin:0;">
                    <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">Producte per cada bota (${unitatDefecte})</label>
                    <input type="number" id="calc-camp-prod-bota" value="1.0" step="0.1" min="0" style="padding:10px; width:100%; border:1px solid #ddd; border-radius:4px; font-size:15px;">
                </div>
            </div>

            <button class="btn btn-primary" style="width:100%; margin-bottom:12px; padding:12px; font-weight:bold; font-size:15px; cursor:pointer; background:#1b5e20; color:white; border:none; border-radius:4px;" onclick="calcExecutarRutaDinamic('${unitatDefecte}')">
                Calcular i Processar Dades
            </button>

            <div id="calc-resultats" style="display:none;">
                <div style="background:#e8f5e9; padding:12px; border-radius:8px; margin-bottom:12px;">
                    <div style="margin-bottom:6px; font-size:15px;">💧 Aigua total tirada: <strong id="calc-res-aigua">0</strong> L</div>
                    <div style="margin-bottom:6px; font-size:15px;">🧪 Producte total gastat: <strong id="calc-res-producte">0</strong> <span>${unitatDefecte}</span></div>
                    <div style="background:#fff; border-left:4px solid #e65100; padding:10px; border-radius:4px; margin-top:8px;">
                        💡 <strong>Dosi real a desar a SAÓ 365:</strong>
                        <span id="calc-res-dosi" style="font-size:18px; font-weight:bold; color:#e65100; display:block; margin-top:4px;">0 ${unitatDefecte}/ha</span>
                    </div>
                </div>
                <div id="calc-cubes" style="margin-bottom:14px;"></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <button class="btn btn-secondary" style="padding:10px; cursor:pointer;" onclick="tancarCalculadoraTractament()">Cancel·lar</button>
                    <button class="btn btn-primary" style="padding:10px; font-weight:bold; cursor:pointer; background:#1b5e20; color:white; border:none; border-radius:4px;" onclick="calcConfirmar()">✅ Enviar dosi traduïda a l'app</button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    window._calcModeCamp = false; // Per defecte obre en estàndard
    window._calcOnConfirm = onConfirm;
}

// Canviar visualment de pestanya/mode
function canviarModeCalculadora(isCamp, unitatDefecte) {
    window._calcModeCamp = isCamp;
    const btnStandard = document.getElementById('btn-mode-standard');
    const btnCamp = document.getElementById('btn-mode-camp');
    const wrapStandard = document.getElementById('wrapper-inputs-standard');
    const wrapCamp = document.getElementById('wrapper-inputs-camp');
    const resDiv = document.getElementById('calc-resultats');

    resDiv.style.display = 'none'; // Amagar resultats vells

    if (isCamp) {
        btnStandard.style.background = 'transparent'; btnStandard.style.color = '#666';
        btnCamp.style.background = '#fff'; btnCamp.style.color = '#333';
        wrapStandard.style.display = 'none';
        wrapCamp.style.display = 'block';
    } else {
        btnStandard.style.background = '#fff'; btnStandard.style.color = '#333';
        btnCamp.style.background = 'transparent'; btnCamp.style.color = '#666';
        wrapStandard.style.display = 'block';
        wrapCamp.style.display = 'none';
    }
}

function recalcularSuperficieTotal() {
    const base = parseFloat(document.getElementById('calc-sup-base').value) || 0;
    const varietat = parseFloat(document.getElementById('calc-sup-varietat').value) || 0;
    document.getElementById('calc-sup-total-text').textContent = (base + varietat).toFixed(2);
}

function calcExecutarRutaDinamic(unitatDefecte) {
    const base = parseFloat(document.getElementById('calc-sup-base').value) || 0;
    const varietat = parseFloat(document.getElementById('calc-sup-varietat').value) || 0;
    const superficieTotal = base + varietat;

    if (!superficieTotal || superficieTotal <= 0) {
        alert('Superfície no vàlida.');
        return;
    }

    let resultats;

    if (window._calcModeCamp) {
        // LLEGIR DADES DEL NOU MODE CAMP
        const capacitatCuba = parseFloat(document.getElementById('calc-camp-cuba').value) || 2000;
        const numBotes = parseFloat(document.getElementById('calc-camp-botes').value) || 1;
        const productePerBota = parseFloat(document.getElementById('calc-camp-prod-bota').value) || 0;

        resultats = calcularLlogicaTractament({
            superficie: superficieTotal,
            capacitatCuba: capacitatCuba,
            modeCamp: true,
            numBotes: numBotes,
            productePerBota: productePerBota
        });
    } else {
        // RECOLLIR DADES DEL MODE ESTÀNDARD
        const metode = document.getElementById('calc-metode').value;
        const capacitatCuba = parseFloat(document.getElementById('calc-cuba').value);
        const gastoCaldoHa = parseFloat(document.getElementById('calc-gasto').value) || 800;
        const tipusDosi = document.getElementById('calc-tipus-dosi').value;
        const valorDosi = parseFloat(document.getElementById('calc-valor-dosi').value);

        resultats = calcularLlogicaTractament({
            superficie: superficieTotal,
            capacitatCuba: capacitatCuba,
            metode: metode,
            gastoCaldoHa: gastoCaldoHa,
            producte: { tipus_dosi: tipusDosi, valor: valorDosi },
            modeCamp: false
        });
    }

    // PINTAR CODI DE RESULTATS
    document.getElementById('calc-res-aigua').textContent = resultats.aigua_total_finca;
    document.getElementById('calc-res-producte').textContent = resultats.producte_total_finca + ' ' + unitatDefecte;
    document.getElementById('calc-res-dosi').textContent = resultats.dosi_per_a_app_produccio + ' ' + unitatDefecte + '/ha';

    window._calcDosiResultat = resultats.dosi_per_a_app_produccio;
    window._calcUnitatResultat = `${unitatDefecte}/Ha`;

    const cubesDiv = document.getElementById('calc-cubes');
    cubesDiv.innerHTML = '<strong style="display:block; margin-bottom:8px; font-size:14px; color:#333;">Resum de cubades executades:</strong>';
    
    resultats.desglos_cubades.forEach(function(cuba, i) {
        cubesDiv.innerHTML += `
            <div style="border-left:4px solid #ff9800; background:#f9f9f9; padding:10px; border-radius:4px; margin-bottom:6px; font-size:14px;">
                <strong>BOTA ${i + 1}</strong>: 💧 ${cuba.litres_aigua} L d'aigua + 🧪 <strong>${cuba.producte_a_afegir} ${unitatDefecte}</strong> de producte
            </div>`;
    });

    document.getElementById('calc-resultats').style.display = 'block';
}

// (La resta de funcions es mantenen per compatibilitat amb el mode estàndard)
function calcCanviMetode() {
    const metode = document.getElementById('calc-metode').value;
    const groupGasto = document.getElementById('calc-group-gasto');
    const inputGasto = document.getElementById('calc-gasto');
    const selectTipus = document.getElementById('calc-tipus-dosi');
    const labelDosi = document.getElementById('calc-label-dosi').textContent;
    const unitatActual = labelDosi.includes('Kg') ? 'Kg' : 'L';

    if (metode === 'goteig_pinyol') {
        groupGasto.style.display = 'none';
        selectTipus.value = 'per_ha';
        selectTipus.disabled = true;
    } else {
        groupGasto.style.display = 'block';
        selectTipus.disabled = false;
        if (metode === 'barra_cereal' && inputGasto.value == '800') inputGasto.value = '200';
        else if (metode === 'atomitzador_pinyol' && inputGasto.value == '200') inputGasto.value = '800';
    }
    calcCanviTipusDosi(unitatActual);
}

function calcCanviTipusDosi(unitat = 'L') {
    const tipus = document.getElementById('calc-tipus-dosi').value;
    const label = document.getElementById('calc-label-dosi');
    const input = document.getElementById('calc-valor-dosi');
    if (!label) return;

    if (tipus === 'percentatge') {
        label.textContent = 'Percentatge (% a la cuba):';
        if (input.value === '2.5') input.value = '0.15'; 
        input.step = '0.01';
    } else {
        label.textContent = `Valor Dosi (${unitat} per ha):`;
        if (input.value === '0.15') input.value = '2.5';
        input.step = '0.1';
    }
}

function calcConfirmar() {
    if (window._calcOnConfirm && window._calcDosiResultat !== undefined) {
        window._calcOnConfirm(window._calcDosiResultat, window._calcUnitatResultat);
    }
    tancarCalculadoraTractament();
}

function tancarCalculadoraTractament() {
    const modal = document.getElementById('modal-calculadora-tractament');
    if (modal) modal.remove();
    window._calcOnConfirm = null;
    window._calcDosiResultat = undefined;
    window._calcUnitatResultat = undefined;
}