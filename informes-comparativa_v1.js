// ============================================================
// INFORMES - COMPARATIVA DE CAMPANYES
// Basat en vista_informe_collita (dades de producció, no liquidació)
// Permet comparar N campanyes lliurement (inclou 2026 en curs)
// ============================================================

let comparativaCampanyesDisponibles = [];
let comparativaCampanyesSeleccionades = new Set();

// ------------------------------------------------------------
// CÀRREGA INICIAL DE LA VISTA
// ------------------------------------------------------------

async function carregarVistaInformesComparativa() {
    const contenidor = document.getElementById('view-container');
    if (!contenidor) return;

    if (typeof hasPermission === 'function' && !hasPermission('select')) {
        contenidor.innerHTML = '<p class="informe-comp-avis">No tens permisos per veure aquest informe.</p>';
        return;
    }

    contenidor.innerHTML = '<p class="informe-comp-avis">Carregant dades...</p>';

    try {
        const [campanyes, fruites] = await Promise.all([
            obtenirCampanyesDisponiblesInforme(),
            obtenirValorsDistintsInforme('fruita')
        ]);
        comparativaCampanyesDisponibles = campanyes;

        // Per defecte, seleccionem les dues campanyes més recents
        comparativaCampanyesSeleccionades = new Set(campanyes.slice(0, 2));

        renderitzarControlsComparativa(campanyes, fruites);
        await generarInformeComparatiu();
    } catch (error) {
        console.error(error);
        contenidor.innerHTML = '<p class="informe-comp-avis">Error carregant l\'informe: ' + error.message + '</p>';
    }
}

async function obtenirCampanyesDisponiblesInforme() {
    // Mateix problema de límit de 1000 files que a obtenirDadesComparativaCollita:
    // cal paginar o la campanya més antiga (amb menys files recents per davant) no arriba mai a carregar-se.
    const MIDA_PAGINA = 1000;
    let totes = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabaseClient
            .from('vista_informe_collita')
            .select('campanya')
            .order('campanya', { ascending: false })
            .range(offset, offset + MIDA_PAGINA - 1);
        if (error) throw error;

        totes = totes.concat(data || []);

        if (!data || data.length < MIDA_PAGINA) break;
        offset += MIDA_PAGINA;
    }

    return [...new Set(totes.map(f => f.campanya))].sort((a, b) => b - a);
}

async function obtenirValorsDistintsInforme(columna, filtres = {}) {
    const MIDA_PAGINA = 1000;
    let totes = [];
    let offset = 0;

    while (true) {
        let query = supabaseClient
            .from('vista_informe_collita')
            .select(columna)
            .range(offset, offset + MIDA_PAGINA - 1);
        if (filtres.fruita) query = query.eq('fruita', filtres.fruita);
        const { data, error } = await query;
        if (error) throw error;

        totes = totes.concat(data || []);

        if (!data || data.length < MIDA_PAGINA) break;
        offset += MIDA_PAGINA;
    }

    return [...new Set(totes.map(f => f[columna]).filter(Boolean))].sort();
}

// ------------------------------------------------------------
// CONTROLS (checkboxes campanyes + filtres)
// ------------------------------------------------------------

function renderitzarControlsComparativa(campanyes, fruites) {
    const contenidor = document.getElementById('view-container');

    const checkboxesCampanyes = campanyes.map(c => `
        <label class="informe-comp-check">
            <input type="checkbox" value="${c}" ${comparativaCampanyesSeleccionades.has(c) ? 'checked' : ''}
                   onchange="toggleCampanyaComparativa(${c}, this.checked)">
            <strong>${c}</strong>
        </label>
    `).join('');

    const opcionsFruita = fruites.map(f => `<option value="${f}">${f}</option>`).join('');

    contenidor.innerHTML = `
        <div class="informe-comp-header">
            <h2>📊 Comparativa de campanyes</h2>
            <button class="btn btn-secondary" onclick="exportarPDFComparativa()">🖨️ Imprimir PDF</button>
        </div>
        <p class="informe-comp-subtitol">Dades de producció (collita), no de liquidació</p>

        <div class="informe-comp-filtres">
            <div class="informe-comp-camp">
                <span>📅 <strong>Campanyes a comparar</strong></span>
                <div class="informe-comp-checkboxes">${checkboxesCampanyes}</div>
            </div>

            <div class="informe-comp-camp">
                <label for="informe-comp-fruita">🍑 Fruita</label>
                <select id="informe-comp-fruita" onchange="onCanviFruitaComparativa()">
                    <option value="">Totes</option>
                    ${opcionsFruita}
                </select>
            </div>

            <div class="informe-comp-camp">
                <label for="informe-comp-varietat">🌱 Varietat</label>
                <select id="informe-comp-varietat">
                    <option value="">Totes</option>
                </select>
            </div>

            <div class="informe-comp-camp">
                <label for="informe-comp-finca">🗺️ Finca</label>
                <select id="informe-comp-finca">
                    <option value="">Totes</option>
                </select>
            </div>

            <button class="btn btn-primary" onclick="generarInformeComparatiu()">🔍 Generar informe</button>
        </div>

        <div id="informe-comp-resultats" class="informe-comp-resultats"></div>
    `;

    carregarOpcionsFinca();
}

function toggleCampanyaComparativa(campanya, marcat) {
    if (marcat) {
        comparativaCampanyesSeleccionades.add(campanya);
    } else {
        comparativaCampanyesSeleccionades.delete(campanya);
    }
}

async function onCanviFruitaComparativa() {
    const fruita = document.getElementById('informe-comp-fruita').value;
    const selectVarietat = document.getElementById('informe-comp-varietat');
    selectVarietat.innerHTML = '<option value="">Totes</option>';
    if (!fruita) return;
    const varietats = await obtenirValorsDistintsInforme('varietat', { fruita });
    varietats.forEach(v => {
        selectVarietat.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`);
    });
}

async function carregarOpcionsFinca() {
    const finques = await obtenirValorsDistintsInforme('finca');
    const selectFinca = document.getElementById('informe-comp-finca');
    finques.forEach(f => {
        selectFinca.insertAdjacentHTML('beforeend', `<option value="${f}">${f}</option>`);
    });
}

// ------------------------------------------------------------
// GENERACIÓ DE L'INFORME
// ------------------------------------------------------------

async function generarInformeComparatiu() {
    const divResultats = document.getElementById('informe-comp-resultats');
    const campanyes = [...comparativaCampanyesSeleccionades].sort();

    if (campanyes.length < 1) {
        divResultats.innerHTML = '<p class="informe-comp-avis">Selecciona almenys una campanya.</p>';
        return;
    }

    divResultats.innerHTML = '<p class="informe-comp-avis">Calculant...</p>';

    const fruita = document.getElementById('informe-comp-fruita')?.value || '';
    const varietat = document.getElementById('informe-comp-varietat')?.value || '';
    const finca = document.getElementById('informe-comp-finca')?.value || '';

    try {
        const [dades, superficiePerFinca] = await Promise.all([
            obtenirDadesComparativaCollita(campanyes, { fruita, varietat, finca }),
            obtenirSuperficiePerFincaCampanya(campanyes)
        ]);
        if (dades.length === 0) {
            divResultats.innerHTML = '<p class="informe-comp-avis">No hi ha dades per aquesta selecció.</p>';
            return;
        }
        const resum = agregarDadesPerCampanya(dades);
        renderitzarResultatsComparativa(resum, campanyes, superficiePerFinca);
    } catch (error) {
        console.error(error);
        if (typeof mostrarNotificacio === 'function') {
            mostrarNotificacio('Error generant l\'informe: ' + error.message, 'error');
        }
        divResultats.innerHTML = '<p class="informe-comp-avis">Error generant l\'informe.</p>';
    }
}

async function obtenirDadesComparativaCollita(campanyes, filtres) {
    // Supabase/PostgREST retorna màxim 1000 files per petició per defecte.
    // vista_informe_collita té diverses files per escandall (calibre x categoria),
    // així que cal paginar amb .range() fins a buidar el resultat.
    const MIDA_PAGINA = 1000;
    let totes = [];
    let offset = 0;

    while (true) {
        let query = supabaseClient
            .from('vista_informe_collita')
            .select('campanya, finca, fruita, varietat, categoria, subcategoria, calibre, pes_kg, peces')
            .in('campanya', campanyes)
            .range(offset, offset + MIDA_PAGINA - 1);

        if (filtres.fruita) query = query.eq('fruita', filtres.fruita);
        if (filtres.varietat) query = query.eq('varietat', filtres.varietat);
        if (filtres.finca) query = query.eq('finca', filtres.finca);

        const { data, error } = await query;
        if (error) throw error;

        totes = totes.concat(data || []);

        if (!data || data.length < MIDA_PAGINA) break;
        offset += MIDA_PAGINA;
    }

    return totes;
}

async function obtenirSuperficiePerFincaCampanya(campanyes) {
    // Hectàrees TOTALS de cada finca (tots els cultius), per campanya.
    // No es filtra per fruita: parcelles.cultiu podria no escriure's igual que
    // vista_informe_collita.fruita (p. ex. "Nectariner" vs "Nectarina").
    const MIDA_PAGINA = 1000;
    let totes = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabaseClient
            .from('parcelles')
            .select('finca, superficie, campanya')
            .in('campanya', campanyes)
            .range(offset, offset + MIDA_PAGINA - 1);
        if (error) throw error;

        totes = totes.concat(data || []);

        if (!data || data.length < MIDA_PAGINA) break;
        offset += MIDA_PAGINA;
    }

    const resultat = {};
    totes.forEach(p => {
        const c = p.campanya;
        const finca = p.finca || 'Sense finca';
        if (!resultat[c]) resultat[c] = {};
        resultat[c][finca] = (resultat[c][finca] || 0) + (Number(p.superficie) || 0);
    });
    return resultat;
}

function agregarDadesPerCampanya(dades) {
    const resum = {};

    dades.forEach(fila => {
        const c = fila.campanya;
        if (!resum[c]) {
            resum[c] = { kgTotal: 0, kgComercial: 0, pecesTotal: 0, perCategoria: {}, perSubcategoria: {}, perCalibre: {}, perFinca: {} };
        }
        const kg = Number(fila.pes_kg) || 0;
        const peces = Number(fila.peces) || 0;
        const esComercial = (fila.categoria || '').toUpperCase().trim() === 'COMERCIAL';

        resum[c].kgTotal += kg;
        resum[c].pecesTotal += peces;

        const fincaFila = fila.finca || 'Sense finca';
        resum[c].perFinca[fincaFila] = (resum[c].perFinca[fincaFila] || 0) + kg;

        const categoria = fila.categoria || 'Sense categoria';
        resum[c].perCategoria[categoria] = (resum[c].perCategoria[categoria] || 0) + kg;

        const subcategoria = fila.subcategoria || 'Sense subcategoria';
        resum[c].perSubcategoria[subcategoria] = (resum[c].perSubcategoria[subcategoria] || 0) + kg;

        // El calibre només s'aplica a fruita comercial (indústria/no-comercial no en tenen).
        // Es calcula i es mostra només sobre aquest subconjunt.
        if (esComercial) {
            resum[c].kgComercial += kg;
            const calibre = fila.calibre || 'Sense calibre (revisar escandall)';
            resum[c].perCalibre[calibre] = (resum[c].perCalibre[calibre] || 0) + kg;
        }
    });

    return resum;
}

// ------------------------------------------------------------
// RENDERITZAT DE RESULTATS
// ------------------------------------------------------------

function renderitzarResultatsComparativa(resum, campanyes, superficiePerFinca = {}) {
    const divResultats = document.getElementById('informe-comp-resultats');
    const kgMax = Math.max(...campanyes.map(c => resum[c]?.kgTotal || 0), 1);

    const iconesCategoria = { COMERCIAL: '🟢', INDUSTRIA: '🏭', NO_COMERCIAL: '⚪' };
    const classeCategoria = { COMERCIAL: 'ok', INDUSTRIA: 'avis', NO_COMERCIAL: 'neutre' };

    // Targetes resum (kg, peces, pes mitjà/peça) amb barra comparativa
    const targetes = campanyes.map(c => {
        const d = resum[c] || { kgTotal: 0, pecesTotal: 0 };
        const pesMitja = d.pecesTotal > 0 ? (d.kgTotal / d.pecesTotal * 1000).toFixed(1) : '—';
        const amplada = Math.round((d.kgTotal / kgMax) * 100);
        return `
            <div class="informe-comp-targeta">
                <div class="informe-comp-targeta-campanya">📅 <strong>${c}</strong></div>
                <div class="informe-comp-targeta-kg">📦 ${formatNumeroInforme(d.kgTotal)} kg</div>
                <div class="informe-comp-barra"><div class="informe-comp-barra-fill" style="width:${amplada}%"></div></div>
                <div class="informe-comp-targeta-detall">🧺 ${formatNumeroInforme(d.pecesTotal)} peces · ⚖️ ${pesMitja} g/peça</div>
            </div>
        `;
    }).join('');

    // Taula comparativa de categories (% sobre kg total de cada campanya)
    const totesCategories = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perCategoria || {})))].sort();
    const filesCategories = totesCategories.map(cat => {
        const cel·les = campanyes.map(c => {
            const kgCat = resum[c]?.perCategoria[cat] || 0;
            const kgTotal = resum[c]?.kgTotal || 1;
            const pct = (kgCat / kgTotal * 100).toFixed(1);
            return cel·laPercentatge(pct);
        }).join('');
        const icona = iconesCategoria[cat] || '🏷️';
        const classe = classeCategoria[cat] || 'neutre';
        return `<tr><td><span class="informe-comp-etiqueta informe-comp-etiqueta-${classe}">${icona} ${cat}</span></td>${cel·les}</tr>`;
    }).join('');

    // Taula comparativa de subcategories (% sobre kg total de cada campanya)
    const totesSubcategories = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perSubcategoria || {})))].sort();
    const filesSubcategories = totesSubcategories.map(sub => {
        const cel·les = campanyes.map(c => {
            const kgSub = resum[c]?.perSubcategoria[sub] || 0;
            const kgTotal = resum[c]?.kgTotal || 1;
            const pct = (kgSub / kgTotal * 100).toFixed(1);
            const alerta = sub.startsWith('Sense');
            return cel·laPercentatge(pct, alerta);
        }).join('');
        return `<tr><td>${sub.startsWith('Sense') ? '⚠️ ' : '🏷️ '}${sub}</td>${cel·les}</tr>`;
    }).join('');

    // Taula comparativa de calibres (% sobre kg COMERCIAL de cada campanya — indústria/no-comercial no en tenen)
    const totsCalibres = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perCalibre || {})))].sort();
    const filesCalibres = totsCalibres.map(cal => {
        const cel·les = campanyes.map(c => {
            const kgCal = resum[c]?.perCalibre[cal] || 0;
            const kgComercial = resum[c]?.kgComercial || 1;
            const pct = (kgCal / kgComercial * 100).toFixed(1);
            const alerta = cal.startsWith('Sense');
            return cel·laPercentatge(pct, alerta);
        }).join('');
        return `<tr><td>${cal.startsWith('Sense') ? '⚠️ ' : '📏 '}${cal}</td>${cel·les}</tr>`;
    }).join('');

    // Taula de rendiment per finca: kg totals i kg/ha
    // Les hectàrees són el total de la finca (tots els cultius), no específiques de la fruita filtrada.
    const totesFinques = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perFinca || {})))].sort();

    let kgFincaMax = 1, rendimentMax = 1;
    const taulaRendiment = totesFinques.map(f => {
        const perCampanya = campanyes.map(c => {
            const kg = resum[c]?.perFinca[f] || 0;
            const ha = superficiePerFinca[c]?.[f] || 0;
            const rendiment = ha > 0 ? kg / ha : null;
            kgFincaMax = Math.max(kgFincaMax, kg);
            if (rendiment !== null) rendimentMax = Math.max(rendimentMax, rendiment);
            return { kg, ha, rendiment };
        });
        return { finca: f, perCampanya };
    });

    const filesKgFinca = taulaRendiment.map(({ finca: f, perCampanya }) => {
        const cel·les = perCampanya.map(({ kg }) => cel·laValor(formatNumeroInforme(kg) + ' kg', kg, kgFincaMax)).join('');
        return `<tr><td>🗺️ ${f}</td>${cel·les}</tr>`;
    }).join('');

    const filesRendimentFinca = taulaRendiment.map(({ finca: f, perCampanya }) => {
        const cel·les = perCampanya.map(({ ha, rendiment }) => {
            if (rendiment === null) return cel·laValor('— (sense ha)', 0, rendimentMax, true);
            return cel·laValor(rendiment.toFixed(0) + ' kg/ha', rendiment, rendimentMax);
        }).join('');
        return `<tr><td>🌾 ${f}</td>${cel·les}</tr>`;
    }).join('');

    const capcaleraCampanyes = campanyes.map(c => `<th>📅 <strong>${c}</strong></th>`).join('');

    divResultats.innerHTML = `
        <div id="informe-comp-print-header" class="informe-comp-print-header">
            <h2>🌾 Quadern de Camp — Comparativa de campanyes</h2>
            <p>Generat el ${new Date().toLocaleDateString('ca-ES')} · Campanyes: ${campanyes.join(', ')}</p>
        </div>

        <div class="informe-comp-targetes">${targetes}</div>

        <div class="informe-comp-seccio">
            <h3>🎯 % per categoria (qualitat)</h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Categoria</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${filesCategories}</tbody>
            </table>
        </div>

        <div class="informe-comp-seccio">
            <h3>🏷️ % per subcategoria</h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Subcategoria</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${filesSubcategories}</tbody>
            </table>
        </div>

        <div class="informe-comp-seccio">
            <h3>📦 Kg per finca</h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Finca</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${filesKgFinca}</tbody>
            </table>
        </div>

        <div class="informe-comp-seccio">
            <h3>🌾 Rendiment (kg/ha) per finca <span class="informe-comp-nota">(ha totals de la finca, tots els cultius)</span></h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Finca</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${filesRendimentFinca}</tbody>
            </table>
        </div>

        <div class="informe-comp-seccio">
            <h3>📏 % per calibre <span class="informe-comp-nota">(sobre kg comercial)</span></h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Calibre</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${filesCalibres}</tbody>
            </table>
        </div>
    `;
}

function cel·laPercentatge(pct, alerta = false) {
    const valor = Math.max(0, Math.min(100, parseFloat(pct) || 0));
    const classe = alerta ? 'informe-comp-cel-bar informe-comp-cel-alerta' : 'informe-comp-cel-bar';
    return `<td><div class="${classe}" style="--val:${valor}"><span>${pct}%</span></div></td>`;
}

function cel·laValor(text, valor, maxReferencia, alerta = false) {
    const amplada = maxReferencia > 0 ? Math.max(0, Math.min(100, (valor / maxReferencia) * 100)) : 0;
    const classe = alerta ? 'informe-comp-cel-bar informe-comp-cel-alerta' : 'informe-comp-cel-bar';
    return `<td><div class="${classe}" style="--val:${amplada}"><span>${text}</span></div></td>`;
}

function exportarPDFComparativa() {
    const titolOriginal = document.title;
    const campanyes = [...comparativaCampanyesSeleccionades].sort();
    document.title = 'Comparativa_Campanyes_' + campanyes.join('-');
    window.print();
    setTimeout(() => { document.title = titolOriginal; }, 500);
}

function formatNumeroInforme(n) {
    return Math.round(n).toLocaleString('ca-ES');
}

console.log('✅ Informes comparativa v1 carregat');
