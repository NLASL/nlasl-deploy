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
            ${c}
        </label>
    `).join('');

    const opcionsFruita = fruites.map(f => `<option value="${f}">${f}</option>`).join('');

    contenidor.innerHTML = `
        <div class="informe-comp-header">
            <h2>Comparativa de campanyes</h2>
            <p class="informe-comp-subtitol">Dades de producció (collita), no de liquidació</p>
        </div>

        <div class="informe-comp-filtres">
            <div class="informe-comp-camp">
                <span>Campanyes a comparar</span>
                <div class="informe-comp-checkboxes">${checkboxesCampanyes}</div>
            </div>

            <div class="informe-comp-camp">
                <label for="informe-comp-fruita">Fruita</label>
                <select id="informe-comp-fruita" onchange="onCanviFruitaComparativa()">
                    <option value="">Totes</option>
                    ${opcionsFruita}
                </select>
            </div>

            <div class="informe-comp-camp">
                <label for="informe-comp-varietat">Varietat</label>
                <select id="informe-comp-varietat">
                    <option value="">Totes</option>
                </select>
            </div>

            <div class="informe-comp-camp">
                <label for="informe-comp-finca">Finca</label>
                <select id="informe-comp-finca">
                    <option value="">Totes</option>
                </select>
            </div>

            <button class="btn-primari" onclick="generarInformeComparatiu()">Generar informe</button>
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
        const dades = await obtenirDadesComparativaCollita(campanyes, { fruita, varietat, finca });
        if (dades.length === 0) {
            divResultats.innerHTML = '<p class="informe-comp-avis">No hi ha dades per aquesta selecció.</p>';
            return;
        }
        const resum = agregarDadesPerCampanya(dades);
        renderitzarResultatsComparativa(resum, campanyes);
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

function agregarDadesPerCampanya(dades) {
    const resum = {};

    dades.forEach(fila => {
        const c = fila.campanya;
        if (!resum[c]) {
            resum[c] = { kgTotal: 0, kgComercial: 0, pecesTotal: 0, perCategoria: {}, perSubcategoria: {}, perCalibre: {} };
        }
        const kg = Number(fila.pes_kg) || 0;
        const peces = Number(fila.peces) || 0;
        const esComercial = (fila.categoria || '').toUpperCase().trim() === 'COMERCIAL';

        resum[c].kgTotal += kg;
        resum[c].pecesTotal += peces;

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

function renderitzarResultatsComparativa(resum, campanyes) {
    const divResultats = document.getElementById('informe-comp-resultats');
    const kgMax = Math.max(...campanyes.map(c => resum[c]?.kgTotal || 0), 1);

    // Targetes resum (kg, peces, pes mitjà/peça) amb barra comparativa
    const targetes = campanyes.map(c => {
        const d = resum[c] || { kgTotal: 0, pecesTotal: 0 };
        const pesMitja = d.pecesTotal > 0 ? (d.kgTotal / d.pecesTotal * 1000).toFixed(1) : '—';
        const amplada = Math.round((d.kgTotal / kgMax) * 100);
        return `
            <div class="informe-comp-targeta">
                <div class="informe-comp-targeta-campanya">${c}</div>
                <div class="informe-comp-targeta-kg">${formatNumeroInforme(d.kgTotal)} kg</div>
                <div class="informe-comp-barra"><div class="informe-comp-barra-fill" style="width:${amplada}%"></div></div>
                <div class="informe-comp-targeta-detall">${formatNumeroInforme(d.pecesTotal)} peces · ${pesMitja} g/peça</div>
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
            return `<td>${pct}%</td>`;
        }).join('');
        return `<tr><td>${cat}</td>${cel·les}</tr>`;
    }).join('');

    // Taula comparativa de subcategories (% sobre kg total de cada campanya)
    const totesSubcategories = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perSubcategoria || {})))].sort();
    const filesSubcategories = totesSubcategories.map(sub => {
        const cel·les = campanyes.map(c => {
            const kgSub = resum[c]?.perSubcategoria[sub] || 0;
            const kgTotal = resum[c]?.kgTotal || 1;
            const pct = (kgSub / kgTotal * 100).toFixed(1);
            return `<td>${pct}%</td>`;
        }).join('');
        return `<tr><td>${sub}</td>${cel·les}</tr>`;
    }).join('');

    // Taula comparativa de calibres (% sobre kg total de cada campanya)
    const totsCalibres = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perCalibre || {})))].sort();
    const filesCalibres = totsCalibres.map(cal => {
        const cel·les = campanyes.map(c => {
            const kgCal = resum[c]?.perCalibre[cal] || 0;
            const kgTotal = resum[c]?.kgTotal || 1;
            const pct = (kgCal / kgTotal * 100).toFixed(1);
            return `<td>${pct}%</td>`;
        }).join('');
        return `<tr><td>${cal}</td>${cel·les}</tr>`;
    }).join('');

    const capcaleraCampanyes = campanyes.map(c => `<th>${c}</th>`).join('');

    divResultats.innerHTML = `
        <div class="informe-comp-targetes">${targetes}</div>

        <h3>% per categoria (qualitat)</h3>
        <table class="informe-comp-taula">
            <thead><tr><th>Categoria</th>${capcaleraCampanyes}</tr></thead>
            <tbody>${filesCategories}</tbody>
        </table>

        <h3>% per subcategoria</h3>
        <table class="informe-comp-taula">
            <thead><tr><th>Subcategoria</th>${capcaleraCampanyes}</tr></thead>
            <tbody>${filesSubcategories}</tbody>
        </table>

        <h3>% per calibre</h3>
        <table class="informe-comp-taula">
            <thead><tr><th>Calibre</th>${capcaleraCampanyes}</tr></thead>
            <tbody>${filesCalibres}</tbody>
        </table>
    `;
}

function formatNumeroInforme(n) {
    return Math.round(n).toLocaleString('ca-ES');
}

console.log('✅ Informes comparativa v1 carregat');
