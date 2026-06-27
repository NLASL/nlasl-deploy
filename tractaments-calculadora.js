// ============================================================
// CALCULADORA DE TRACTAMENTS — Modal reutilitzable
// Ús: obrirCalculadoraTractament(config) on config és:
//   { superficie, onConfirm, producteNom }
// onConfirm(dosi, unitat) s'executa quan l'usuari confirma
// ============================================================

function calcularLlogicaTractament({ superficie, capacitatCuba, metode, producte, gastoCaldoHa }) {
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

function obrirCalculadoraTractament(config) {
    // config: { superficie, onConfirm, producteNom }
    const superficie = parseFloat(config.superficie) || 0;
    const onConfirm = config.onConfirm || function() {};
    const producteNom = config.producteNom || 'Producte';

    // Eliminar modal anterior si existeix
    const anterior = document.getElementById('modal-calculadora-tractament');
    if (anterior) anterior.remove();

    const html = `
    <div id="modal-calculadora-tractament" class="modal" style="display:block; z-index:9999;">
        <div class="modal-content" style="max-width:560px;">
            <span class="close" onclick="tancarCalculadoraTractament()">&times;</span>
            <h2>🧮 Calculadora de Cubes</h2>
            <p style="color:#666; margin-bottom:16px; font-size:14px;">
                <strong>Producte:</strong> ${producteNom} &nbsp;|&nbsp;
                <strong>Superfície:</strong> ${superficie.toFixed(2)} Ha
            </p>

            <div style="background:#f5f5f5; padding:14px; border-radius:8px; margin-bottom:14px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div class="form-group" style="margin:0;">
                        <label>Mètode tractament</label>
                        <select id="calc-metode" onchange="calcCanviMetode()" style="padding:8px; width:100%; border:1px solid #ddd; border-radius:4px;">
                            <option value="atomitzador_pinyol">Atomitzador (pinyol)</option>
                            <option value="goteig_pinyol">Reg goteig (pinyol)</option>
                            <option value="barra_cereal">Barra extensiva (cereal)</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Capacitat Cuba (L)</label>
                        <input type="number" id="calc-cuba" value="2000" step="500" style="padding:8px; width:100%; border:1px solid #ddd; border-radius:4px;">
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <div class="form-group" id="calc-group-gasto" style="margin:0;">
                        <label>Gasto Caldo (L/ha)</label>
                        <input type="number" id="calc-gasto" value="800" step="50" style="padding:8px; width:100%; border:1px solid #ddd; border-radius:4px;">
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label>Tipus de Dosi</label>
                        <select id="calc-tipus-dosi" onchange="calcCanviTipusDosi()" style="padding:8px; width:100%; border:1px solid #ddd; border-radius:4px;">
                            <option value="per_ha">Per Hectàrea (L/ha o kg/ha)</option>
                            <option value="percentatge">Percentatge (%)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group" style="margin:0;">
                    <label id="calc-label-dosi">Valor Dosi (L o Kg per ha)</label>
                    <input type="number" id="calc-valor-dosi" value="2.5" step="0.1" min="0" style="padding:8px; width:100%; border:1px solid #ddd; border-radius:4px;">
                </div>
            </div>

            <button class="btn btn-primary" style="width:100%; margin-bottom:12px;" onclick="calcExecutar(${superficie})">
                Calcular Recepta de Cubes
            </button>

            <div id="calc-resultats" style="display:none;">
                <div style="background:#e8f5e9; padding:12px; border-radius:8px; margin-bottom:12px;">
                    <div style="margin-bottom:6px;">💧 Aigua total: <strong id="calc-res-aigua">0</strong> L</div>
                    <div style="margin-bottom:6px;">🧪 Producte total: <strong id="calc-res-producte">0</strong> L o Kg</div>
                    <div style="background:#fff; border-left:4px solid #e65100; padding:10px; border-radius:4px; margin-top:8px;">
                        💡 <strong>Dosi a introduir a l'app:</strong>
                        <span id="calc-res-dosi" style="font-size:18px; font-weight:bold; color:#e65100; display:block; margin-top:4px;">0 L/ha</span>
                    </div>
                </div>
                <div id="calc-cubes" style="margin-bottom:12px;"></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <button class="btn btn-secondary" onclick="tancarCalculadoraTractament()">Cancel·lar</button>
                    <button class="btn btn-primary" onclick="calcConfirmar()">✅ Usar aquesta dosi</button>
                </div>
            </div>

            <div id="calc-boto-tancar" style="display:block;">
                <button class="btn btn-secondary" style="width:100%;" onclick="tancarCalculadoraTractament()">Tancar</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // Guardar callback globalment
    window._calcOnConfirm = onConfirm;
}

function calcCanviMetode() {
    const metode = document.getElementById('calc-metode').value;
    const groupGasto = document.getElementById('calc-group-gasto');
    const inputGasto = document.getElementById('calc-gasto');
    const selectTipus = document.getElementById('calc-tipus-dosi');

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
    calcCanviTipusDosi();
}

function calcCanviTipusDosi() {
    const tipus = document.getElementById('calc-tipus-dosi').value;
    const label = document.getElementById('calc-label-dosi');
    const input = document.getElementById('calc-valor-dosi');

    if (tipus === 'percentatge') {
        label.textContent = 'Percentatge (% a la cuba):';
        input.value = '0.15';
        input.step = '0.01';
    } else {
        label.textContent = 'Valor Dosi (L o Kg per ha):';
        input.value = '2.5';
        input.step = '0.1';
    }
}

function calcExecutar(superficie) {
    const metode = document.getElementById('calc-metode').value;
    const capacitatCuba = parseFloat(document.getElementById('calc-cuba').value);
    const gastoCaldoHa = parseFloat(document.getElementById('calc-gasto').value) || 800;
    const tipusDosi = document.getElementById('calc-tipus-dosi').value;
    const valorDosi = parseFloat(document.getElementById('calc-valor-dosi').value);

    if (!superficie || superficie <= 0) {
        mostrarNotificacio('Superfície no vàlida', 'error');
        return;
    }

    const resultats = calcularLlogicaTractament({
        superficie,
        capacitatCuba,
        metode,
        gastoCaldoHa,
        producte: { tipus_dosi: tipusDosi, valor: valorDosi }
    });

    document.getElementById('calc-res-aigua').textContent = resultats.aigua_total_finca;
    document.getElementById('calc-res-producte').textContent = resultats.producte_total_finca;

    const unitatText = tipusDosi === 'percentatge' ? 'L o Kg/ha (conversió)' : 'L o Kg/ha';
    document.getElementById('calc-res-dosi').textContent = resultats.dosi_per_a_app_produccio + ' ' + unitatText;

    // Guardar dosi per confirmar
    window._calcDosiResultat = resultats.dosi_per_a_app_produccio;
    window._calcUnitatResultat = tipusDosi === 'percentatge' ? 'L/Ha' : (tipusDosi === 'per_ha' ? 'L/Ha' : 'L/Ha');

    // Llista cubes
    const cubesDiv = document.getElementById('calc-cubes');
    cubesDiv.innerHTML = '<strong style="display:block;margin-bottom:6px;">Distribució de barreges per bota:</strong>';
    resultats.desglos_cubades.forEach(function(cuba, i) {
        const color = cuba.tipus === 'Plena' ? '#2e7d32' : '#e65100';
        cubesDiv.innerHTML += `
            <div style="border-left:4px solid ${color}; background:#f9f9f9; padding:10px; border-radius:4px; margin-bottom:6px;">
                <strong>BOTA ${i + 1} (${cuba.tipus})</strong><br>
                💧 Aigua: <strong>${cuba.litres_aigua} L</strong> &nbsp;
                🧪 Producte: <strong style="color:${color};">${cuba.producte_a_afegir} L o Kg</strong>
            </div>`;
    });

    document.getElementById('calc-resultats').style.display = 'block';
    document.getElementById('calc-boto-tancar').style.display = 'none';
}

function calcConfirmar() {
    if (window._calcOnConfirm && window._calcDosiResultat !== undefined) {
        window._calcOnConfirm(window._calcDosiResultat, window._calcUnitatResultat || 'L/Ha');
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

async function getCultiusTractables() {
    try {
        const { data, error } = await supabaseClient
            .from('cultius_tractables')
            .select('cultiu');
        if (error) throw error;
        return (data || []).map(function(r) { return r.cultiu.toUpperCase(); });
    } catch (error) {
        console.warn('⚠️ No s\'han pogut carregar cultius tractables:', error.message);
        return [];
    }
}