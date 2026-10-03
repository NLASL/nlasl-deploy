// ============================================================
// INFORMES - COMPARATIVA DE CAMPANYES
// Basat en vista_informe_collita (producció) + factures_aigua_asg (aigua)
// Permet comparar N campanyes lliurement (inclou l'any en curs)
//
// ARQUITECTURA DE BLOCS SELECCIONABLES:
// Cada mètrica de l'informe és un "bloc" independent registrat a
// BLOCS_INFORME_COMPARATIVA, amb les seves pròpies dades i renderitzat.
// Per afegir una mètrica nova en el futur (p.ex. cost de tractaments):
//   1) Escriure la funció que calcula/agrega les dades (si cal un dataset nou)
//   2) Escriure la funció renderBlocXxx(ctx) que en retorna l'HTML
//   3) Afegir una entrada al registre BLOCS_INFORME_COMPARATIVA
// No cal tocar res més: els controls, la selecció de datasets i el
// renderitzat final ja són genèrics.
// ============================================================

let comparativaCampanyesDisponibles = [];
let comparativaCampanyesSeleccionades = new Set();

// Selecció per defecte: el comportament que ja hi havia abans d'introduir
// els blocs (tots els blocs de collita originals, cap bloc d'aigua).
let comparativaBlocsSeleccionats = new Set([
    'targetes', 'categoria', 'subcategoria', 'kgFinca', 'rendimentFinca', 'calibre'
]);

// ------------------------------------------------------------
// REGISTRE DE BLOCS
// ------------------------------------------------------------
const BLOCS_INFORME_COMPARATIVA = {
    targetes: {
        label: '📦 Resum (kg, peces, pes mitjà)',
        grup: '🍑 Collita',
        necessita: ['collita'],
        render: renderBlocTargetes
    },
    categoria: {
        label: '🎯 % per categoria',
        grup: '🍑 Collita',
        necessita: ['collita'],
        render: renderBlocCategoria
    },
    subcategoria: {
        label: '🏷️ % per subcategoria',
        grup: '🍑 Collita',
        necessita: ['collita'],
        render: renderBlocSubcategoria
    },
    kgFinca: {
        label: '📦 Kg per finca',
        grup: '🍑 Collita',
        necessita: ['collita'],
        render: renderBlocKgFinca
    },
    rendimentFinca: {
        label: '🌾 Rendiment (kg/ha) per finca',
        grup: '🍑 Collita',
        necessita: ['collita', 'superficie'],
        render: renderBlocRendimentFinca
    },
    calibre: {
        label: '📏 % per calibre (sobre kg comercial)',
        grup: '🍑 Collita',
        necessita: ['collita'],
        render: renderBlocCalibre
    },
    aiguaConsum: {
        label: '💧 Consum aigua (m³ i m³/ha)',
        grup: '💧 Aigua (Segarra-Garrigues)',
        necessita: ['aigua', 'superficie'],
        render: renderBlocAiguaConsum
    },
    aiguaCost: {
        label: '💶 Cost aigua (€ i €/kg collit)',
        grup: '💧 Aigua (Segarra-Garrigues)',
        necessita: ['aigua', 'collita'],
        render: renderBlocAiguaCost
    }
};

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
// CONTROLS (checkboxes campanyes + blocs + filtres)
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

    // Agrupem els blocs disponibles pel seu 'grup' per mostrar-los endreçats als controls
    const grups = {};
    Object.entries(BLOCS_INFORME_COMPARATIVA).forEach(([id, bloc]) => {
        if (!grups[bloc.grup]) grups[bloc.grup] = [];
        grups[bloc.grup].push({ id, label: bloc.label });
    });
    const checkboxesBlocs = Object.entries(grups).map(([grup, blocs]) => `
        <div class="informe-comp-bloc-grup">
            <div class="informe-comp-bloc-grup-titol">${grup}</div>
            ${blocs.map(b => `
                <label class="informe-comp-check">
                    <input type="checkbox" value="${b.id}" ${comparativaBlocsSeleccionats.has(b.id) ? 'checked' : ''}
                           onchange="toggleBlocComparativa('${b.id}', this.checked)">
                    ${b.label}
                </label>
            `).join('')}
        </div>
    `).join('');

    contenidor.innerHTML = `
        <div class="informe-comp-header">
            <h2>📊 Comparativa de campanyes</h2>
            <button class="btn btn-secondary" onclick="exportarPDFComparativa()">🖨️ Imprimir PDF</button>
        </div>
        <p class="informe-comp-subtitol">Dades de producció (collita) i aigua (Segarra-Garrigues), no de liquidació</p>

        <div class="informe-comp-filtres">
            <div class="informe-comp-camp">
                <span>📅 <strong>Campanyes a comparar</strong></span>
                <div class="informe-comp-checkboxes">${checkboxesCampanyes}</div>
            </div>

            <div class="informe-comp-camp">
                <span>📊 <strong>Dades a incloure</strong></span>
                <div class="informe-comp-checkboxes">${checkboxesBlocs}</div>
            </div>

            <div class="informe-comp-camp">
                <label for="informe-comp-fruita">🍑 Fruita <span class="informe-comp-nota">(només afecta blocs de collita)</span></label>
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
                <label for="informe-comp-finca">🗺️ Finca <span class="informe-comp-nota">(només afecta blocs de collita)</span></label>
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

function toggleBlocComparativa(idBloc, marcat) {
    if (marcat) {
        comparativaBlocsSeleccionats.add(idBloc);
    } else {
        comparativaBlocsSeleccionats.delete(idBloc);
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
    const blocsSeleccionats = [...comparativaBlocsSeleccionats];

    if (campanyes.length < 1) {
        divResultats.innerHTML = '<p class="informe-comp-avis">Selecciona almenys una campanya.</p>';
        return;
    }
    if (blocsSeleccionats.length < 1) {
        divResultats.innerHTML = '<p class="informe-comp-avis">Selecciona almenys un bloc de dades a mostrar.</p>';
        return;
    }

    divResultats.innerHTML = '<p class="informe-comp-avis">Calculant...</p>';

    const fruita = document.getElementById('informe-comp-fruita')?.value || '';
    const varietat = document.getElementById('informe-comp-varietat')?.value || '';
    const finca = document.getElementById('informe-comp-finca')?.value || '';

    // Unió dels datasets que calen per als blocs marcats: només es
    // demana a la BD allò que algun bloc seleccionat realment necessita.
    const datasetsNecessaris = new Set(
        blocsSeleccionats.flatMap(id => BLOCS_INFORME_COMPARATIVA[id]?.necessita || [])
    );

    try {
        const [dadesCollita, superficiePerFinca, filesAigua] = await Promise.all([
            datasetsNecessaris.has('collita')
                ? obtenirDadesComparativaCollita(campanyes, { fruita, varietat, finca })
                : Promise.resolve([]),
            datasetsNecessaris.has('superficie')
                ? obtenirSuperficiePerFincaCampanya()
                : Promise.resolve({}),
            datasetsNecessaris.has('aigua')
                ? obtenirDadesAiguaComparativa()
                : Promise.resolve([])
        ]);

        if (datasetsNecessaris.has('collita') && dadesCollita.length === 0 && !datasetsNecessaris.has('aigua')) {
            divResultats.innerHTML = '<p class="informe-comp-avis">No hi ha dades de collita per aquesta selecció.</p>';
            return;
        }

        const resum = datasetsNecessaris.has('collita') ? agregarDadesPerCampanya(dadesCollita) : {};
        const resumAigua = datasetsNecessaris.has('aigua') ? agregarDadesAiguaPerCampanya(filesAigua) : {};

        const ctx = { campanyes, resum, superficiePerFinca, resumAigua, filtres: { fruita, varietat, finca } };
        renderitzarResultatsComparativa(ctx, blocsSeleccionats);

    } catch (error) {
        console.error(error);
        if (typeof mostrarNotificacio === 'function') {
            mostrarNotificacio('Error generant l\'informe: ' + error.message, 'error');
        }
        divResultats.innerHTML = '<p class="informe-comp-avis">Error generant l\'informe.</p>';
    }
}

// ------------------------------------------------------------
// DATASET: COLLITA
// ------------------------------------------------------------

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
        if (esComercial) {
            resum[c].kgComercial += kg;
            const calibre = fila.calibre || 'Sense calibre (revisar escandall)';
            resum[c].perCalibre[calibre] = (resum[c].perCalibre[calibre] || 0) + kg;
        }
    });

    return resum;
}

// ------------------------------------------------------------
// DATASET: SUPERFÍCIE (hectàrees per finca+campanya)
// ------------------------------------------------------------

async function obtenirSuperficiePerFincaCampanya() {
    // Es carreguen TOTES les campanyes de parcelles (no només les seleccionades a la
    // comparativa), perquè el fallback de hectàrees pugui trobar la campanya més propera
    // encara que l'usuari no l'hagi marcada per comparar.
    const MIDA_PAGINA = 1000;
    let totes = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabaseClient
            .from('parcelles')
            .select('finca, superficie, campanya')
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

function trobarHaAmbFallback(superficiePerFinca, campanyaObjectiu, finca) {
    const haExacta = superficiePerFinca[campanyaObjectiu]?.[finca];
    if (haExacta > 0) {
        return { ha: haExacta, esFallback: false };
    }

    // No hi ha superfície registrada per aquesta campanya: agafem la de la
    // campanya més propera (passada o futura) que sí en tingui per aquesta finca.
    let millorHa = null;
    let millorDistancia = Infinity;
    Object.keys(superficiePerFinca).forEach(campanyaStr => {
        const campanya = Number(campanyaStr);
        const ha = superficiePerFinca[campanya]?.[finca];
        if (ha > 0) {
            const distancia = Math.abs(campanya - campanyaObjectiu);
            if (distancia < millorDistancia) {
                millorDistancia = distancia;
                millorHa = ha;
            }
        }
    });

    return millorHa !== null ? { ha: millorHa, esFallback: true } : { ha: 0, esFallback: false };
}

// ------------------------------------------------------------
// DATASET: AIGUA (factures_aigua_asg via get_resum_aigua_campanya)
// ------------------------------------------------------------

async function obtenirDadesAiguaComparativa() {
    // p_campanya: null => totes les campanyes d'un cop; es filtra per
    // les campanyes seleccionades en el pas d'agregació (agregarDadesAiguaPerCampanya),
    // igual que es fa amb parcelles/superfície.
    const { data, error } = await supabaseClient.rpc('get_resum_aigua_campanya', { p_campanya: null });
    if (error) throw error;
    return data || [];
}

function agregarDadesAiguaPerCampanya(files) {
    const resum = {};
    files.forEach(fila => {
        const c = fila.campanya;
        const finca = fila.nom_finca || fila.num_explotacio || 'Sense finca';
        if (!resum[c]) resum[c] = {};
        resum[c][finca] = {
            consumFacturat: Number(fila.consum_m3_facturat) || 0,
            consumReg: Number(fila.consum_m3_reg) || 0,
            costTotal: Number(fila.cost_total) || 0,
            costPerM3: fila.cost_per_m3 !== null && fila.cost_per_m3 !== undefined ? Number(fila.cost_per_m3) : null,
            // Dependrà que la RPC retorni 'estat' (o equivalent); si no, simplement no es marca
            simulada: fila.estat === 'simulada' || fila.te_simulades === true
        };
    });
    return resum;
}

// ------------------------------------------------------------
// HELPER COMPARTIT: taula rendiment (kg + ha) — usat per 2 blocs
// ------------------------------------------------------------

function calcularTaulaRendiment(ctx) {
    const { campanyes, resum, superficiePerFinca } = ctx;
    const totesFinques = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perFinca || {})))].sort();

    let kgFincaMax = 1, rendimentMax = 1, hiHaFallback = false;
    const taula = totesFinques.map(f => {
        const perCampanya = campanyes.map(c => {
            const kg = resum[c]?.perFinca[f] || 0;
            const { ha, esFallback } = trobarHaAmbFallback(superficiePerFinca, c, f);
            if (esFallback) hiHaFallback = true;
            const rendiment = ha > 0 ? kg / ha : null;
            kgFincaMax = Math.max(kgFincaMax, kg);
            if (rendiment !== null) rendimentMax = Math.max(rendimentMax, rendiment);
            return { kg, ha, rendiment, esFallback };
        });
        return { finca: f, perCampanya };
    });

    return { taula, kgFincaMax, rendimentMax, hiHaFallback };
}

// ------------------------------------------------------------
// RENDERITZAT — ORQUESTRADOR
// ------------------------------------------------------------

function renderitzarResultatsComparativa(ctx, blocsSeleccionats) {
    const divResultats = document.getElementById('informe-comp-resultats');

    const capcalera = `
        <div id="informe-comp-print-header" class="informe-comp-print-header">
            <h2>🌾 Quadern de Camp — Comparativa de campanyes</h2>
            <p>Generat el ${new Date().toLocaleDateString('ca-ES')} · Campanyes: ${ctx.campanyes.join(', ')}</p>
        </div>
    `;

    // Es respecta l'ordre de definició del registre (no el de selecció),
    // perquè l'informe surti sempre amb la mateixa seqüència lògica
    // independentment de l'ordre en què l'usuari ha marcat els checkboxes.
    const seccions = Object.keys(BLOCS_INFORME_COMPARATIVA)
        .filter(id => blocsSeleccionats.includes(id))
        .map(id => BLOCS_INFORME_COMPARATIVA[id].render(ctx))
        .join('');

    divResultats.innerHTML = capcalera + seccions;
}

// ------------------------------------------------------------
// BLOCS — COLLITA
// ------------------------------------------------------------

function renderBlocTargetes(ctx) {
    const { campanyes, resum } = ctx;
    const kgMax = Math.max(...campanyes.map(c => resum[c]?.kgTotal || 0), 1);

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

    return `<div class="informe-comp-targetes">${targetes}</div>`;
}

function renderBlocCategoria(ctx) {
    const { campanyes, resum } = ctx;
    const iconesCategoria = { COMERCIAL: '🟢', INDUSTRIA: '🏭', NO_COMERCIAL: '⚪' };
    const classeCategoria = { COMERCIAL: 'ok', INDUSTRIA: 'avis', NO_COMERCIAL: 'neutre' };

    const totesCategories = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perCategoria || {})))].sort();
    const files = totesCategories.map(cat => {
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

    const capcaleraCampanyes = campanyes.map(c => `<th>📅 <strong>${c}</strong></th>`).join('');
    return `
        <div class="informe-comp-seccio">
            <h3>🎯 % per categoria (qualitat)</h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Categoria</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${files}</tbody>
            </table>
        </div>
    `;
}

function renderBlocSubcategoria(ctx) {
    const { campanyes, resum } = ctx;
    const totesSubcategories = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perSubcategoria || {})))].sort();
    const files = totesSubcategories.map(sub => {
        const cel·les = campanyes.map(c => {
            const kgSub = resum[c]?.perSubcategoria[sub] || 0;
            const kgTotal = resum[c]?.kgTotal || 1;
            const pct = (kgSub / kgTotal * 100).toFixed(1);
            const alerta = sub.startsWith('Sense');
            return cel·laPercentatge(pct, alerta);
        }).join('');
        return `<tr><td>${sub.startsWith('Sense') ? '⚠️ ' : '🏷️ '}${sub}</td>${cel·les}</tr>`;
    }).join('');

    const capcaleraCampanyes = campanyes.map(c => `<th>📅 <strong>${c}</strong></th>`).join('');
    return `
        <div class="informe-comp-seccio">
            <h3>🏷️ % per subcategoria</h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Subcategoria</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${files}</tbody>
            </table>
        </div>
    `;
}

function renderBlocKgFinca(ctx) {
    const { campanyes } = ctx;
    const { taula, kgFincaMax } = calcularTaulaRendiment(ctx);

    const files = taula.map(({ finca: f, perCampanya }) => {
        const cel·les = perCampanya.map(({ kg }) => cel·laValor(formatNumeroInforme(kg) + ' kg', kg, kgFincaMax)).join('');
        return `<tr><td>🗺️ ${f}</td>${cel·les}</tr>`;
    }).join('');

    const capcaleraCampanyes = campanyes.map(c => `<th>📅 <strong>${c}</strong></th>`).join('');
    return `
        <div class="informe-comp-seccio">
            <h3>📦 Kg per finca</h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Finca</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${files}</tbody>
            </table>
        </div>
    `;
}

function renderBlocRendimentFinca(ctx) {
    const { campanyes } = ctx;
    const { taula, rendimentMax, hiHaFallback } = calcularTaulaRendiment(ctx);

    const files = taula.map(({ finca: f, perCampanya }) => {
        const cel·les = perCampanya.map(({ rendiment, esFallback }) => {
            if (rendiment === null) return cel·laValor('— (sense ha)', 0, rendimentMax, true);
            const prefix = esFallback ? '≈ ' : '';
            return cel·laValor(prefix + rendiment.toFixed(0) + ' kg/ha', rendiment, rendimentMax);
        }).join('');
        return `<tr><td>🌾 ${f}</td>${cel·les}</tr>`;
    }).join('');

    const capcaleraCampanyes = campanyes.map(c => `<th>📅 <strong>${c}</strong></th>`).join('');
    return `
        <div class="informe-comp-seccio">
            <h3>🌾 Rendiment (kg/ha) per finca <span class="informe-comp-nota">(ha totals de la finca, tots els cultius)</span></h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Finca</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${files}</tbody>
            </table>
            ${hiHaFallback ? '<p class="informe-comp-nota">≈ Hectàrees estimades a partir de la campanya més propera amb superfície registrada (encara no hi ha dades pròpies d\'aquella campanya a Parcel·les).</p>' : ''}
        </div>
    `;
}

function renderBlocCalibre(ctx) {
    const { campanyes, resum } = ctx;
    const totsCalibres = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perCalibre || {})))].sort();
    const files = totsCalibres.map(cal => {
        const cel·les = campanyes.map(c => {
            const kgCal = resum[c]?.perCalibre[cal] || 0;
            const kgComercial = resum[c]?.kgComercial || 1;
            const pct = (kgCal / kgComercial * 100).toFixed(1);
            const alerta = cal.startsWith('Sense');
            return cel·laPercentatge(pct, alerta);
        }).join('');
        return `<tr><td>${cal.startsWith('Sense') ? '⚠️ ' : '📏 '}${cal}</td>${cel·les}</tr>`;
    }).join('');

    const capcaleraCampanyes = campanyes.map(c => `<th>📅 <strong>${c}</strong></th>`).join('');
    return `
        <div class="informe-comp-seccio">
            <h3>📏 % per calibre <span class="informe-comp-nota">(sobre kg comercial)</span></h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Calibre</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${files}</tbody>
            </table>
        </div>
    `;
}

// ------------------------------------------------------------
// BLOCS — AIGUA
// ------------------------------------------------------------

const NOTA_AIGUA_ASG = 'Només inclou l\'aigua regada pel canal ASG (Segarra-Garrigues). No inclou Urgell ni cap finca fora d\'aquest canal.';

// Estils de les variacions (Δ%). S'injecten un sol cop des d'aquí
// per no haver de tocar styles.css.
function assegurarEstilsDeltaInforme() {
    if (document.getElementById('informe-comp-estils-delta')) return;
    const estil = document.createElement('style');
    estil.id = 'informe-comp-estils-delta';
    estil.textContent = `
        .informe-comp-delta { margin-left: 6px; font-weight: 600; white-space: nowrap; }
        .informe-comp-delta-millor { color: #2e7d32; }
        .informe-comp-delta-pitjor { color: #c62828; }
        .informe-comp-delta-neutre { color: #757575; }
        .informe-comp-fila-total td { border-top: 2px solid #999; font-weight: 700; }
        .informe-comp-subnota { display: block; font-size: 0.75em; font-weight: 400; color: #757575; }
    `;
    document.head.appendChild(estil);
}

// Variació percentual respecte la campanya anterior seleccionada.
// Tots els indicadors on l'usem (m³/ha, €/m³, €/kg) són "com més baix, millor".
function deltaInforme(actual, anterior) {
    if (actual === null || actual === undefined || anterior === null || anterior === undefined || anterior === 0) return null;
    return ((actual - anterior) / Math.abs(anterior)) * 100;
}

function htmlDeltaInforme(delta) {
    if (delta === null) return '';
    const classe = Math.abs(delta) < 0.5 ? 'neutre' : (delta > 0 ? 'pitjor' : 'millor');
    const fletxa = delta > 0 ? '▲' : '▼';
    const text = Math.abs(delta).toLocaleString('ca-ES', { maximumFractionDigits: 1 });
    return `<small class="informe-comp-delta informe-comp-delta-${classe}">${fletxa} ${text}%</small>`;
}

function cel·laValorDelta(text, valor, maxReferencia, delta, subnota = '') {
    const amplada = maxReferencia > 0 ? Math.max(0, Math.min(100, (valor / maxReferencia) * 100)) : 0;
    const sub = subnota ? `<span class="informe-comp-subnota">${subnota}</span>` : '';
    return `<td><div class="informe-comp-cel-bar" style="--val:${amplada}"><span>${text}${htmlDeltaInforme(delta)}${sub}</span></div></td>`;
}

// Totals d'aigua per campanya. Regla clau: cada total només suma les
// finques que tenen les dades necessàries per a AQUELL indicador
// (aigua+ha per m³/ha, aigua+kg per €/kg), perquè numerador i
// denominador provinguin sempre de les mateixes finques.
function calcularTotalsAigua(ctx) {
    const { campanyes, resum, resumAigua, superficiePerFinca } = ctx;
    const totalFinquesASG = new Set(Object.values(resumAigua).flatMap(o => Object.keys(o))).size;
    const totals = {};

    campanyes.forEach(c => {
        const finques = Object.keys(resumAigua[c] || {}).sort();
        const t = {
            finques, clau: finques.join('|'), totalFinquesASG,
            consum: 0, cost: 0,
            consumAmbHa: 0, ha: 0,
            costAmbKg: 0, kg: 0,
            simulada: false
        };
        finques.forEach(f => {
            const d = resumAigua[c][f];
            t.consum += d.consumReg;
            t.cost += d.costTotal;
            if (d.simulada) t.simulada = true;
            const { ha } = trobarHaAmbFallback(superficiePerFinca, c, f);
            if (ha > 0) { t.consumAmbHa += d.consumReg; t.ha += ha; }
            const kg = resum[c]?.perFinca?.[f];
            if (kg > 0) { t.costAmbKg += d.costTotal; t.kg += kg; }
        });
        t.m3ha = t.ha > 0 ? t.consumAmbHa / t.ha : null;
        t.euroM3 = t.consum > 0 ? t.cost / t.consum : null;
        t.euroKg = t.kg > 0 ? t.costAmbKg / t.kg : null;
        totals[c] = t;
    });
    return totals;
}

// Pinta una taula d'aigua genèrica (files per finca + fila TOTAL).
// opcions: { titol, nota, valorFinca(f,c), claTotal, format(v), ambDelta, textBuit }
function renderTaulaAigua(ctx, totals, finques, opcions) {
    const { campanyes } = ctx;
    const capcalera = campanyes.map(c => `<th>📅 <strong>${c}</strong></th>`).join('');
    const { titol, nota, valorFinca, claTotal, format, ambDelta, textBuit = '—' } = opcions;

    // Valors per finca i màxim de referència per a les barres
    let max = 1;
    const valors = {};
    finques.forEach(f => {
        valors[f] = campanyes.map(c => {
            const v = valorFinca(f, c);
            if (v !== null && v !== undefined) max = Math.max(max, Math.abs(v));
            return v;
        });
    });
    campanyes.forEach(c => {
        const v = totals[c][claTotal];
        if (v !== null && v !== undefined) max = Math.max(max, Math.abs(v));
    });

    const filesFinques = finques.map(f => {
        const cel·les = campanyes.map((c, i) => {
            const v = valors[f][i];
            if (v === null || v === undefined) return cel·laValor(textBuit, 0, max, true);
            const delta = (ambDelta && i > 0) ? deltaInforme(v, valors[f][i - 1]) : null;
            return cel·laValorDelta(format(v), Math.abs(v), max, delta);
        }).join('');
        return `<tr><td>${f}</td>${cel·les}</tr>`;
    }).join('');

    // Fila TOTAL: la variació només es mostra si les dues campanyes
    // tenen exactament les mateixes finques (si no, no és comparable).
    const celTotal = campanyes.map((c, i) => {
        const t = totals[c];
        const v = t[claTotal];
        if (v === null || v === undefined) return cel·laValor(textBuit, 0, max, true);
        let delta = null;
        if (ambDelta && i > 0) {
            const prev = totals[campanyes[i - 1]];
            if (prev.clau === t.clau) delta = deltaInforme(v, prev[claTotal]);
        }
        const sub = `${t.finques.length}/${t.totalFinquesASG} finques` + (t.simulada ? ' · ⚠️ inclou simulades' : '');
        return cel·laValorDelta(format(v), Math.abs(v), max, delta, sub);
    }).join('');

    return `
        <div class="informe-comp-seccio">
            <h3>${titol}</h3>
            ${nota ? `<p class="informe-comp-nota">${nota}</p>` : ''}
            <table class="informe-comp-taula">
                <thead><tr><th>Finca</th>${capcalera}</tr></thead>
                <tbody>
                    ${filesFinques}
                    <tr class="informe-comp-fila-total"><td>TOTAL ASG</td>${celTotal}</tr>
                </tbody>
            </table>
        </div>
    `;
}

function renderAvisSenseAigua(titol) {
    return `
        <div class="informe-comp-seccio">
            <h3>${titol}</h3>
            <p class="informe-comp-avis">No hi ha factures d'aigua registrades per a les campanyes seleccionades.</p>
        </div>
    `;
}

function renderBlocAiguaConsum(ctx) {
    assegurarEstilsDeltaInforme();
    const { campanyes, resumAigua, superficiePerFinca } = ctx;
    const finques = [...new Set(campanyes.flatMap(c => Object.keys(resumAigua[c] || {})))].sort();
    if (finques.length === 0) return renderAvisSenseAigua('💧 Consum aigua');

    const totals = calcularTotalsAigua(ctx);

    const taulaM3 = renderTaulaAigua(ctx, totals, finques, {
        titol: '💧 Consum aigua — m³ total <span class="informe-comp-nota">(consum real per telemetria, no el facturat)</span>',
        nota: NOTA_AIGUA_ASG,
        valorFinca: (f, c) => resumAigua[c]?.[f]?.consumReg ?? null,
        claTotal: 'consum',
        format: v => formatNumeroInforme(v) + ' m³',
        ambDelta: false
    });

    const taulaM3ha = renderTaulaAigua(ctx, totals, finques, {
        titol: '💧 Consum aigua — m³/ha <span class="informe-comp-nota">(▲▼ variació vs campanya anterior; verd = menys aigua)</span>',
        valorFinca: (f, c) => {
            const d = resumAigua[c]?.[f];
            if (!d) return null;
            const { ha } = trobarHaAmbFallback(superficiePerFinca, c, f);
            return ha > 0 ? d.consumReg / ha : null;
        },
        claTotal: 'm3ha',
        format: v => v.toFixed(0) + ' m³/ha',
        ambDelta: true,
        textBuit: '— (sense ha)'
    });

    return taulaM3 + taulaM3ha;
}

function renderBlocAiguaCost(ctx) {
    assegurarEstilsDeltaInforme();
    const { campanyes, resum, resumAigua, filtres } = ctx;
    const finques = [...new Set(campanyes.flatMap(c => Object.keys(resumAigua[c] || {})))].sort();
    if (finques.length === 0) return renderAvisSenseAigua('💶 Cost aigua');

    const totals = calcularTotalsAigua(ctx);

    const taulaCost = renderTaulaAigua(ctx, totals, finques, {
        titol: '💶 Cost aigua total (€)',
        nota: NOTA_AIGUA_ASG,
        valorFinca: (f, c) => resumAigua[c]?.[f]?.costTotal ?? null,
        claTotal: 'cost',
        format: v => v.toLocaleString('ca-ES', { minimumFractionDigits: 2 }) + ' €',
        ambDelta: false
    });

    // €/m³ = cost total / consum real (el mateix m³ que es veu a la taula de consum).
    const taulaEuroM3 = renderTaulaAigua(ctx, totals, finques, {
        titol: '💶 Preu de l\'aigua (€/m³) <span class="informe-comp-nota">(▲▼ vs campanya anterior; separa tarifa de volum)</span>',
        valorFinca: (f, c) => {
            const d = resumAigua[c]?.[f];
            return (d && d.consumReg > 0) ? d.costTotal / d.consumReg : null;
        },
        claTotal: 'euroM3',
        format: v => v.toFixed(3) + ' €/m³',
        ambDelta: true
    });

    // €/kg: els kg de collita estan filtrats per fruita/varietat però l'aigua
    // és de tota la finca. Amb aquests filtres el quocient seria fals.
    let taulaEuroKg;
    if (filtres && (filtres.fruita || filtres.varietat)) {
        taulaEuroKg = `
            <div class="informe-comp-seccio">
                <h3>💶 Cost aigua per kg collit (€/kg)</h3>
                <p class="informe-comp-avis">No es calcula amb un filtre de fruita o varietat actiu: l'aigua és de tota la finca i els kg només d'aquell cultiu. Treu el filtre per veure aquest indicador.</p>
            </div>`;
    } else {
        taulaEuroKg = renderTaulaAigua(ctx, totals, finques, {
            titol: '💶 Cost aigua per kg collit (€/kg) <span class="informe-comp-nota">(▲▼ vs campanya anterior)</span>',
            nota: NOTA_AIGUA_ASG + ' El total només suma les finques amb aigua i collita alhora.',
            valorFinca: (f, c) => {
                const d = resumAigua[c]?.[f];
                const kg = resum[c]?.perFinca?.[f];
                return (d && kg > 0) ? d.costTotal / kg : null;
            },
            claTotal: 'euroKg',
            format: v => v.toFixed(3) + ' €/kg',
            ambDelta: true,
            textBuit: '— (sense kg)'
        });
    }

    return taulaCost + taulaEuroM3 + taulaEuroKg;
}

// ------------------------------------------------------------
// HELPERS DE CEL·LA I FORMAT
// ------------------------------------------------------------

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

console.log('✅ Informes comparativa v1 (blocs seleccionables + totals i variacions aigua) carregat');
