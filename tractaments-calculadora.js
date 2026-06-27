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

    // Intentem detectar de manera intel·ligent si és pols (Kg) o líquid (L) pel nom del producte
    const nomLower = producteNom.toLowerCase();
    const unitatDefecte = (nomLower.includes('sofre') || nomLower.includes('pols') || nomLower.includes('wg') || nomLower.includes('wp')) ? 'Kg' : 'L';

    const html = `
    <div id="modal-calculadora-tractament" class="modal" style="display:block; z-index:9999; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); overflow-y:auto; padding:10px;">
        <div class="modal-content" style="max-width:560px; background:#fff; margin:30px auto; padding:20px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); position:relative;">
            <span class="close" onclick="tancarCalculadoraTractament()" style="position:absolute; right:15px; top:10px; font-size:24px; cursor:pointer; color:#999;">&times;</span>
            <h2 style="font-size:20px; margin-bottom:5px; color:#1b5e20;">🧮 Calculadora de Cubes</h2>
            <p style="color:#666; margin-bottom:16px; font-size:14px;">
                <strong>Producte:</strong> ${producteNom} &nbsp;|&nbsp;
                <strong>Superfície total:</strong> ${superficie.toFixed(2)} Ha
            </p>

            <div style="background:#f5f5f5; padding:14px; border-radius:8px; margin-bottom:14px;">
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
                        <label style="display:block; font-size:12px; font-weight:bold; margin-bottom:4px;">Unitat i Tipus de Dosi</label>
                        <select id="calc-tipus-dosi" onchange="calcCanviTipusDosi(${JSON.stringify(unitatDefecte)})" style="padding:10px; width:100%; border:1px solid #ddd; border-radius:4px; font-size:15px; background:#fff;">
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

            <button class="btn btn-primary" style="width:100%; margin-bottom:12px; padding:12px; font-weight:bold; font-size:15px; cursor:pointer;" onclick="calcExecutar(${superficie}, '${unitatDefecte}')">
                Calcular Recepta de Cubes
            </button>

            <div id="calc-resultats" style="display:none;">
                <div style="background:#e8f5e9; padding:12px; border-radius:8px; margin-bottom:12px;">
                    <div style="margin-bottom:6px; font-size:15px;">💧 Aigua total: <strong id="calc-res-aigua">0</strong> L</div>
                    <div style="margin-bottom:6px; font-size:15px;">🧪 Producte total: <strong id="calc-res-producte">0</strong> <span class="calc-unitat-dinamica">${unitatDefecte}</span></div>
                    <div style="background:#fff; border-left:4px solid #e65100; padding:10px; border-radius:4px; margin-top:8px;">
                        💡 <strong>Dosi a introduir a l'app:</strong>
                        <span id="calc-res-dosi" style="font-size:18px; font-weight:bold; color:#e65100; display:block; margin-top:4px;">0 ${unitatDefecte}/ha</span>
                    </div>
                </div>
                <div id="calc-cubes" style="margin-bottom:14px;"></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <button class="btn btn-secondary" style="padding:10px; cursor:pointer;" onclick="tancarCalculadoraTractament()">Cancel·lar</button>
                    <button class="btn btn-primary" style="padding:10px; font-weight:bold; cursor:pointer;" onclick="calcConfirmar()">✅ Usar aquesta dosi</button>
                </div>
            </div>

            <div id="calc-boto-tancar" style="display:block; margin-top:5px;">
                <button class="btn btn-secondary" style="width:100%; padding:10px; cursor:pointer;" onclick="tancarCalculadoraTractament()">Tancar</button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);

    // Inicialitzar labels de dosi en l'obertura basant-se en el producte
    calcCanviTipusDosi(unitatDefecte);
    
    // Guardar callback globalment
    window._calcOnConfirm = onConfirm;
}

function calcCanviMetode() {
    const metode = document.getElementById('calc-metode').value;
    const groupGasto = document.getElementById('calc-group-gasto');
    const inputGasto = document.getElementById('calc-gasto');
    const selectTipus = document.getElementById('calc-tipus-dosi');

    // Recuperem la unitat per defecte que hem guardat temporalment o assumim L
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

    if (tipus === 'percentatge') {
        label.textContent = 'Percentatge (% a la cuba):';
        // Només canviem si l'usuari no ha tocat encara valors personalitzats agressius
        if (input.value === '2.5') input.value = '0.15'; 
        input.step = '0.01';
    } else {
        label.textContent = `Valor Dosi (${unitat} per ha):`;
        if (input.value === '0.15') input.value = '2.5';
        input.step = '0.1';
    }
}

function calcExecutar(superficie, unitatDefecte = 'L') {
    const metode = document.getElementById('calc-metode').value;
    const capacitatCuba = parseFloat(document.getElementById('calc-cuba').value);
    const gastoCaldoHa = parseFloat(document.getElementById('calc-gasto').value) || 800;
    const tipusDosi = document.getElementById('calc-tipus-dosi').value;
    const valorDosi = parseFloat(document.getElementById('calc-valor-dosi').value);

    if (!superficie || superficie <= 0) {
        if (typeof mostrarNotificacio === 'function') {
            mostrarNotificacio('Superfície no vàlida', 'error');
        } else {
            alert('Superfície de la finca no vàlida.');
        }
        return;
    }

    const resultats = calcularLlogicaTractament({
        superficie,
        capacitatCuba,
        metode,
        gastoCaldoHa,
        producte: { tipus_dosi: tipusDosi, valor: valorDosi }
    });

    // Actualitzar els elements de text textContent de la interfície
    document.getElementById('calc-res-aigua').textContent = resultats.aigua_total_finca;
    document.getElementById('calc-res-producte').textContent = resultats.producte_total_finca + ' ' + (tipusDosi === 'percentatge' ? 'L o Kg' : unitatDefecte);

    const unitatText = tipusDosi === 'percentatge' ? 'L o Kg/ha (conversió)' : (unitatDefecte + '/ha');
    document.getElementById('calc-res-dosi').textContent = resultats.dosi_per_a_app_produccio + ' ' + unitatText;

    // Guardar dades exactes per retornar al formulari de SAÓ 365
    window._calcDosiResultat = resultats.dosi_per_a_app_produccio;
    window._calcUnitatResultat = tipusDosi === 'percentatge' ? `${unitatDefecte}/Ha` : `${unitatDefecte}/Ha`;

    // Llista de cubades gràfiques
    const cubesDiv = document.getElementById('calc-cubes');
    cubesDiv.innerHTML = '<strong style="display:block; margin-bottom:8px; font-size:14px; color:#333;">Distribució de barreges per bota:</strong>';
    
    resultats.desglos_cubades.forEach(function(cuba, i) {
        const color = cuba.tipus === 'Plena' ? '#2e7d32' : '#e65100';
        cubesDiv.innerHTML += `
            <div style="border-left:4px solid ${color}; background:#f9f9f9; padding:10px; border-radius:4px; margin-bottom:6px; font-size:14px;">
                <strong>BOTA ${i + 1} (${cuba.tipus})</strong><br>
                💧 Aigua: <strong>${cuba.litres_aigua} L</strong> &nbsp;&nbsp;|&nbsp;&nbsp;
                🧪 Afegir: <strong style="color:${color};">${cuba.producte_a_afegir} ${unitatDefecte}</strong>
            </div>`;
    });

    document.getElementById('calc-resultats').style.display = 'block';
    document.getElementById('calc-boto-tancar').style.display = 'none';
}

function calcConfirmar() {
    if (window._calcOnConfirm && window._calcDosiResultat !== undefined) {
        // Retorna el valor numèric i la unitat dinàmica (Ex: 2.690, "Kg/Ha")
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