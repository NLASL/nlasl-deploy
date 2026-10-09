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
    categoriaFincaVarietat: {
        label: '🗺️ % per categoria, per finca i varietat',
        grup: '🍑 Collita',
        necessita: ['collita'],
        render: renderBlocCategoriaFincaVarietat
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
        label: '💶 Cost aigua (€ sense IVA i €/kg collit)',
        grup: '💧 Aigua (Segarra-Garrigues)',
        necessita: ['aigua', 'collita'],
        render: renderBlocAiguaCost
    },
    temporers: {
        label: '👥 Mà d\'obra temporers (hores, €, €/h, €/ha, €/kg)',
        grup: '👥 Mà d\'obra',
        necessita: ['temporers', 'collita', 'superficie'],
        render: renderBlocTemporers
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
        const [campanyesCollita, campanyesAigua, fruites] = await Promise.all([
            obtenirCampanyesDisponiblesInforme(),
            obtenirCampanyesAiguaInforme(),
            obtenirValorsDistintsInforme('fruita')
        ]);
        // Unió: una campanya apareix si té collita O factures d'aigua
        const campanyes = [...new Set([...campanyesCollita, ...campanyesAigua])].sort((x, y) => y - x);
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

async function obtenirCampanyesAiguaInforme() {
    // Si falla (p.ex. permisos de la RPC), no bloquegem l'informe: només es perden les campanyes només-aigua.
    try {
        const files = await obtenirDadesAiguaComparativa();
        return [...new Set(files.map(f => Number(f.campanya)).filter(Boolean))];
    } catch (error) {
        console.warn('No s\'han pogut llegir les campanyes d\'aigua:', error);
        return [];
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
                <label for="informe-comp-finca">🗺️ Finca <span class="informe-comp-nota">(afecta collita i aigua)</span></label>
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
        const [dadesCollita, superficiePerFinca, filesAigua, simulatsAigua, filesTemporers] = await Promise.all([
            datasetsNecessaris.has('collita')
                ? obtenirDadesComparativaCollita(campanyes, { fruita, varietat, finca })
                : Promise.resolve([]),
            datasetsNecessaris.has('superficie')
                ? obtenirSuperficiePerFincaCampanya()
                : Promise.resolve({}),
            datasetsNecessaris.has('aigua')
                ? obtenirDadesAiguaComparativa()
                : Promise.resolve([]),
            datasetsNecessaris.has('aigua')
                ? obtenirSimulatsAiguaInforme()
                : Promise.resolve({}),
            datasetsNecessaris.has('temporers')
                ? obtenirFacturesTemporersInforme()
                : Promise.resolve([])
        ]);

        if (datasetsNecessaris.has('collita') && dadesCollita.length === 0 && !datasetsNecessaris.has('aigua') && !datasetsNecessaris.has('temporers')) {
            divResultats.innerHTML = '<p class="informe-comp-avis">No hi ha dades de collita per aquesta selecció.</p>';
            return;
        }

        const resum = datasetsNecessaris.has('collita') ? agregarDadesPerCampanya(dadesCollita) : {};
        const resumAiguaComplet = datasetsNecessaris.has('aigua') ? agregarDadesAiguaPerCampanya(filesAigua) : {};
        // El recompte de finques ASG ("5/7") es calcula sempre sobre el total, abans de filtrar per finca
        const totalFinquesASG = new Set(Object.values(resumAiguaComplet).flatMap(o => Object.keys(o))).size;
        // El filtre de finca també s'aplica a l'aigua (fruita/varietat no: el reg és de tota la finca)
        const resumAigua = {};
        Object.entries(resumAiguaComplet).forEach(([c, finques]) => {
            resumAigua[c] = finca ? Object.fromEntries(Object.entries(finques).filter(([nom]) => nom === finca)) : finques;
        });

        const temporers = datasetsNecessaris.has('temporers') ? agregarTemporersPerCampanya(filesTemporers) : {};
        const ctx = { campanyes, resum, superficiePerFinca, resumAigua, totalFinquesASG, simulatsAigua, temporers, filtres: { fruita, varietat, finca } };
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

// ------------------------------------------------------------
// AGRUPACIÓ DE SUBCATEGORIES
// Noms que signifiquen el mateix però s'han escrit diferent segons la campanya.
// Clau = nom que es mostra a l'informe; valor = noms de la collita que hi van a parar.
// Quan aparegui un nom nou que s'hagi de sumar a un grup, afegeix-lo aquí.
// Les subcategories que no surtin aquí es mostren amb el seu propi nom.
// ------------------------------------------------------------
const GRUPS_SUBCATEGORIA = {
    'Defectes': ['Defectes', 'Defec', 'FNC_DEFECTES'],
    'Petit':    ['Petit', 'FNC_PETIT']
};

// Índex invers (en minúscules) per cercar ràpid: 'fnc_petit' → 'Petit'
const MAPA_SUBCATEGORIA_GRUP = {};
Object.entries(GRUPS_SUBCATEGORIA).forEach(([grup, noms]) => {
    noms.forEach(nom => { MAPA_SUBCATEGORIA_GRUP[nom.trim().toLowerCase()] = grup; });
});

function nomGrupSubcategoria(subcategoria, categoria) {
    // La indústria no té subcategoria a la collita: la mostrem com a "Industria" i no com a avís.
    if (!subcategoria) return categoria === 'INDUSTRIA' ? 'Industria' : 'Sense subcategoria';
    return MAPA_SUBCATEGORIA_GRUP[String(subcategoria).trim().toLowerCase()] || subcategoria;
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

        // Finca + varietat → kg per categoria (per a la taula de categories per finca i varietat)
        const varietatFila = fila.varietat || 'Sense varietat';
        if (!resum[c].perFincaVarietat) resum[c].perFincaVarietat = {};
        const claFV = fincaFila + '\u0001' + varietatFila;
        if (!resum[c].perFincaVarietat[claFV]) {
            resum[c].perFincaVarietat[claFV] = { finca: fincaFila, varietat: varietatFila, kg: 0, perCategoria: {} };
        }
        resum[c].perFincaVarietat[claFV].kg += kg;
        resum[c].perFincaVarietat[claFV].perCategoria[categoria] = (resum[c].perFincaVarietat[claFV].perCategoria[categoria] || 0) + kg;

        const subcategoria = nomGrupSubcategoria(fila.subcategoria, categoria);
        resum[c].perSubcategoria[subcategoria] = (resum[c].perSubcategoria[subcategoria] || 0) + kg;
        // Relació subcategoria → categoria (per poder agrupar la taula de subcategories)
        if (!resum[c].subcatCategoria) resum[c].subcatCategoria = {};
        if (!resum[c].subcatCategoria[subcategoria]) resum[c].subcatCategoria[subcategoria] = {};
        resum[c].subcatCategoria[subcategoria][categoria] = (resum[c].subcatCategoria[subcategoria][categoria] || 0) + kg;

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

async function obtenirSimulatsAiguaInforme() {
    // La RPC no retorna l'estat, així que el llegim directament de la taula (és petita).
    // Resultat: { 2026: { total: 22093.09, simulat: 7876.02 }, ... }. Si falla, no bloquegem l'informe.
    try {
        const { data, error } = await supabaseClient
            .from('factures_aigua_asg')
            .select('campanya, estat, import_total, iva')
            .range(0, 999);
        if (error) throw error;
        const res = {};
        (data || []).forEach(f => {
            const c = Number(f.campanya);
            if (!res[c]) res[c] = { total: 0, simulat: 0 };
            const imp = (Number(f.import_total) || 0) - (Number(f.iva) || 0);   // sense IVA
            res[c].total += imp;
            if (f.estat === 'simulada') res[c].simulat += imp;
        });
        return res;
    } catch (error) {
        console.warn('No s\'ha pogut llegir l\'estat de les factures d\'aigua:', error);
        return {};
    }
}

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

// % comercial / no comercial / indústria d'un conjunt de kg per categoria
function resumCategoriesInforme(perCategoria, kg) {
    const suma = cat => Object.entries(perCategoria || {})
        .filter(([nom]) => nom.toUpperCase().trim() === cat)
        .reduce((t, [, v]) => t + v, 0);
    const pct = cat => kg > 0 ? suma(cat) / kg * 100 : 0;
    return { kg, com: pct('COMERCIAL'), nc: pct('NO_COMERCIAL'), ind: pct('INDUSTRIA') };
}

function cel·laPilaCategories(r) {
    if (!r || r.kg <= 0) return '<td style="text-align:right;color:#9e9e9e">—</td>';
    const f = v => v.toFixed(1);
    return `<td>
        <div class="informe-comp-pila" title="Comercial ${f(r.com)}% · No comercial ${f(r.nc)}% · Indústria ${f(r.ind)}%">
            <span class="informe-comp-pila-com" style="width:${r.com}%"></span>
            <span class="informe-comp-pila-nc" style="width:${r.nc}%"></span>
            <span class="informe-comp-pila-ind" style="width:${r.ind}%"></span>
        </div>
        <div class="informe-comp-pila-text">🟢 ${f(r.com)} · ⚪ ${f(r.nc)} · 🏭 ${f(r.ind)}</div>
        <div class="informe-comp-pila-text" style="color:#757575">${formatNumeroInforme(r.kg)} kg</div>
    </td>`;
}

function renderBlocCategoriaFincaVarietat(ctx) {
    assegurarEstilsDeltaInforme();
    const { campanyes, resum } = ctx;

    // finca → varietat → campanya → { kg, perCategoria }
    const estructura = {};
    campanyes.forEach(c => {
        Object.values(resum[c]?.perFincaVarietat || {}).forEach(fv => {
            if (!estructura[fv.finca]) estructura[fv.finca] = {};
            if (!estructura[fv.finca][fv.varietat]) estructura[fv.finca][fv.varietat] = {};
            estructura[fv.finca][fv.varietat][c] = fv;
        });
    });

    const kgVarietat = porCampanya => campanyes.reduce((t, c) => t + (porCampanya[c]?.kg || 0), 0);

    const files = Object.keys(estructura).sort().map(finca => {
        const varietats = Object.keys(estructura[finca]).sort((x, y) => kgVarietat(estructura[finca][y]) - kgVarietat(estructura[finca][x]));

        // Una sola varietat: una única fila "Finca — varietat"
        if (varietats.length === 1) {
            const v = varietats[0];
            const cel·les = campanyes.map(c => {
                const fv = estructura[finca][v][c];
                return cel·laPilaCategories(fv ? resumCategoriesInforme(fv.perCategoria, fv.kg) : null);
            }).join('');
            return `<tr><td>🗺️ ${finca} <span class="informe-comp-subnota">${v}</span></td>${cel·les}</tr>`;
        }

        // Diverses varietats: fila de la finca (total) + una fila per varietat
        const celFinca = campanyes.map(c => {
            const perCategoria = {};
            let kg = 0;
            varietats.forEach(v => {
                const fv = estructura[finca][v][c];
                if (!fv) return;
                kg += fv.kg;
                Object.entries(fv.perCategoria).forEach(([cat, val]) => { perCategoria[cat] = (perCategoria[cat] || 0) + val; });
            });
            return cel·laPilaCategories(kg > 0 ? resumCategoriesInforme(perCategoria, kg) : null);
        }).join('');
        const filaFinca = `<tr class="informe-comp-fila-grup"><td>🗺️ ${finca}</td>${celFinca}</tr>`;

        const filesVarietats = varietats.map(v => {
            const cel·les = campanyes.map(c => {
                const fv = estructura[finca][v][c];
                return cel·laPilaCategories(fv ? resumCategoriesInforme(fv.perCategoria, fv.kg) : null);
            }).join('');
            return `<tr><td style="padding-left:28px">🌱 ${v}</td>${cel·les}</tr>`;
        }).join('');

        return filaFinca + filesVarietats;
    }).join('');

    if (!files) {
        return `<div class="informe-comp-seccio"><h3>🗺️ % per categoria, per finca i varietat</h3><p class="informe-comp-avis">No hi ha dades de collita per aquesta selecció.</p></div>`;
    }

    const capcaleraCampanyes = campanyes.map(c => `<th>📅 <strong>${c}</strong></th>`).join('');
    return `
        <div class="informe-comp-seccio">
            <h3>🗺️ % per categoria, per finca i varietat <span class="informe-comp-nota">(🟢 comercial · ⚪ no comercial · 🏭 indústria, sobre els kg de cada finca/varietat)</span></h3>
            <table class="informe-comp-taula">
                <thead><tr><th>Finca / varietat</th>${capcaleraCampanyes}</tr></thead>
                <tbody>${files}</tbody>
            </table>
        </div>
    `;
}

function renderBlocSubcategoria(ctx) {
    assegurarEstilsDeltaInforme();
    const { campanyes, resum } = ctx;
    const ordreCategories = ['COMERCIAL', 'NO_COMERCIAL', 'INDUSTRIA'];
    const iconesCategoria = { COMERCIAL: '🟢', INDUSTRIA: '🏭', NO_COMERCIAL: '⚪' };

    const kgSubCampanya = (sub, c) => resum[c]?.perSubcategoria?.[sub] || 0;
    const totesSubcategories = [...new Set(campanyes.flatMap(c => Object.keys(resum[c]?.perSubcategoria || {})))];

    // Cada subcategoria va al grup de la categoria on té més kg (sumant les campanyes seleccionades).
    const grups = {};
    totesSubcategories.forEach(sub => {
        const kgPerCat = {};
        campanyes.forEach(c => {
            Object.entries(resum[c]?.subcatCategoria?.[sub] || {}).forEach(([cat, kg]) => {
                kgPerCat[cat] = (kgPerCat[cat] || 0) + kg;
            });
        });
        const cat = Object.entries(kgPerCat).sort((x, y) => y[1] - x[1])[0]?.[0] || 'Sense categoria';
        (grups[cat] = grups[cat] || []).push(sub);
    });

    // Ordre dels grups: comercial, no comercial, indústria i, al final, qualsevol altre.
    const nomsGrups = [
        ...ordreCategories.filter(cat => grups[cat]),
        ...Object.keys(grups).filter(cat => !ordreCategories.includes(cat)).sort()
    ];

    const columnes = campanyes.length + 1;
    const files = nomsGrups.map(cat => {
        // Dins del grup: de més a menys kg (total de les campanyes); "Sense ..." sempre al final.
        const subs = grups[cat].sort((x, y) => {
            const xs = x.startsWith('Sense') ? 1 : 0, ys = y.startsWith('Sense') ? 1 : 0;
            if (xs !== ys) return xs - ys;
            const kgX = campanyes.reduce((t, c) => t + kgSubCampanya(x, c), 0);
            const kgY = campanyes.reduce((t, c) => t + kgSubCampanya(y, c), 0);
            return kgY - kgX;
        });

        // Fila de subtotal del grup (suma de les subcategories que es mostren a sota)
        const celGrup = campanyes.map(c => {
            const kgGrup = subs.reduce((t, sub) => t + kgSubCampanya(sub, c), 0);
            const kgTotal = resum[c]?.kgTotal || 1;
            return cel·laPercentatge((kgGrup / kgTotal * 100).toFixed(1));
        }).join('');
        const filaGrup = `<tr class="informe-comp-fila-grup"><td>${iconesCategoria[cat] || '🏷️'} ${cat}</td>${celGrup}</tr>`;

        const filesSubs = subs.map(sub => {
            const alerta = sub.startsWith('Sense');
            const cel·les = campanyes.map(c => {
                const kgTotal = resum[c]?.kgTotal || 1;
                return cel·laPercentatge((kgSubCampanya(sub, c) / kgTotal * 100).toFixed(1), alerta);
            }).join('');
            const agrupats = (GRUPS_SUBCATEGORIA[sub] || []).filter(n => n !== sub);
            const detallGrup = agrupats.length ? `<span class="informe-comp-subnota">inclou: ${agrupats.join(', ')}</span>` : '';
            return `<tr><td style="padding-left:28px">${alerta ? '⚠️ ' : ''}${sub}${detallGrup}</td>${cel·les}</tr>`;
        }).join('');

        return filaGrup + filesSubs;
    }).join('');

    const capcaleraCampanyes = campanyes.map(c => `<th>📅 <strong>${c}</strong></th>`).join('');
    return `
        <div class="informe-comp-seccio">
            <h3>🏷️ % per subcategoria <span class="informe-comp-nota">(agrupades per categoria; dins de cada grup, de més a menys kg)</span></h3>
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

const NOTA_AIGUA_ASG = 'Només inclou l\'aigua regada pel canal ASG (Segarra-Garrigues). No inclou Urgell ni cap finca fora d\'aquest canal. Costos sense IVA.';

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
        .informe-comp-fila-grup td { background: #eef3e6; font-weight: 700; border-top: 2px solid #c9d6b8; }
        .informe-comp-pila { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: #eceff1; }
        .informe-comp-pila-com { background: #66bb6a; }
        .informe-comp-pila-nc { background: #b0bec5; }
        .informe-comp-pila-ind { background: #ffa726; }
        .informe-comp-pila-text { font-size: 0.82em; text-align: right; margin-top: 3px; white-space: nowrap; }
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
    const { campanyes, resum, resumAigua, superficiePerFinca, totalFinquesASG, simulatsAigua = {} } = ctx;
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
        // Percentatge del cost ASG de la campanya que ve de factures simulades
        const sim = simulatsAigua[c];
        t.simulada = !!(sim && sim.simulat > 0);
        t.pctSimulat = (sim && sim.total > 0) ? (sim.simulat / sim.total * 100) : 0;
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
        const sub = `${t.finques.length}/${t.totalFinquesASG} finques` + (t.simulada ? ` · ⚠️ ${Math.round(t.pctSimulat)}% del cost simulat` : '');
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

function renderAvisSenseAigua(titol, ctx) {
    const finca = ctx?.filtres?.finca;
    const missatge = finca
        ? `SENSE DADES d'aigua per a «${finca}»: no és una finca del canal ASG o no té factures per a les campanyes seleccionades.`
        : 'No hi ha factures d\'aigua registrades per a les campanyes seleccionades.';
    return `
        <div class="informe-comp-seccio">
            <h3>${titol}</h3>
            <p class="informe-comp-avis">${missatge}</p>
        </div>
    `;
}

function renderBlocAiguaConsum(ctx) {
    assegurarEstilsDeltaInforme();
    const { campanyes, resumAigua, superficiePerFinca } = ctx;
    const finques = [...new Set(campanyes.flatMap(c => Object.keys(resumAigua[c] || {})))].sort();
    if (finques.length === 0) return renderAvisSenseAigua('💧 Consum aigua', ctx);

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
    if (finques.length === 0) return renderAvisSenseAigua('💶 Cost aigua', ctx);

    const totals = calcularTotalsAigua(ctx);

    const taulaCost = renderTaulaAigua(ctx, totals, finques, {
        titol: '💶 Cost aigua total (€, sense IVA)',
        nota: NOTA_AIGUA_ASG,
        valorFinca: (f, c) => resumAigua[c]?.[f]?.costTotal ?? null,
        claTotal: 'cost',
        format: v => v.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
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

// ------------------------------------------------------------
// DATASET + BLOC: MÀ D'OBRA TEMPORERS (factures_temporers)
// Cost facturat per Segre Fruits (TISA). Campanya = ANY CALENDARI del mes de servei
// (la BD ja el calcula). Cost SENSE IVA: l'IVA és un concepte que desvirtua la
// comparació entre anys (el tipus pot canviar), per això no s'hi suma mai.
// ------------------------------------------------------------

const NOTA_TEMPORERS = 'Cost facturat per Segre Fruits (TISA), sense IVA. Campanya = any calendari del mes de servei. €/ha i €/kg només sobre les finques amb collita de fruita.';

async function obtenirFacturesTemporersInforme() {
    // Paginat amb .range() (PostgREST limita a 1000 files)
    const MIDA_PAGINA = 1000;
    let totes = [];
    let offset = 0;
    while (true) {
        const { data, error } = await supabaseClient
            .from('factures_temporers')
            .select('campanya, mes_servei, hores_facturades, import_net, regularitzacio_import, regularitzacio_mes')
            .eq('eliminat', false)
            .order('mes_servei')
            .range(offset, offset + MIDA_PAGINA - 1);
        if (error) throw error;
        totes = totes.concat(data || []);
        if (!data || data.length < MIDA_PAGINA) break;
        offset += MIDA_PAGINA;
    }
    return totes;
}

// -> { [campanya]: { mesos, hores, cost, regul, euroHora } }
// Cost de campanya = (import_net - regularització) a la campanya del mes de servei
//                  + regularització a la campanya del mes que regularitza.
function agregarTemporersPerCampanya(factures) {
    const res = {};
    const obtenir = c => (res[c] = res[c] || { mesos: 0, hores: 0, cost: 0, regul: 0, euroHora: null });
    (factures || []).forEach(f => {
        const reg = Number(f.regularitzacio_import) || 0;
        const d = obtenir(f.campanya);
        d.mesos += 1;
        d.hores += Number(f.hores_facturades) || 0;
        d.cost += (Number(f.import_net) || 0) - reg;
        if (reg !== 0 && f.regularitzacio_mes) {
            const dReg = obtenir(parseInt(String(f.regularitzacio_mes).slice(0, 4), 10));
            dReg.cost += reg;
            dReg.regul += reg;
        }
    });
    Object.values(res).forEach(d => { d.euroHora = d.hores > 0 ? d.cost / d.hores : null; });
    return res;
}

// kg i ha de fruita d'una campanya, sobre les MATEIXES finques (les que tenen kg),
// perquè numerador (cost de tota l'explotació) i denominadors siguin coherents.
function baseFruitaTemporers(ctx, c) {
    const perFinca = ctx.resum?.[c]?.perFinca || {};
    let kg = 0, ha = 0;
    Object.entries(perFinca).forEach(([finca, kgFinca]) => {
        if (!(kgFinca > 0)) return;
        const { ha: haFinca } = trobarHaAmbFallback(ctx.superficiePerFinca, c, finca);
        kg += kgFinca;
        ha += haFinca;
    });
    return { kg: kg > 0 ? kg : null, ha: ha > 0 ? ha : null };
}

function renderBlocTemporers(ctx) {
    assegurarEstilsDeltaInforme();
    const { campanyes, temporers = {}, filtres = {} } = ctx;
    const anyActual = new Date().getFullYear();

    if (!campanyes.some(c => temporers[c])) {
        return `
            <div class="informe-comp-seccio">
                <h3>👥 Mà d'obra temporers</h3>
                <p class="informe-comp-avis">No hi ha factures de temporers per a les campanyes seleccionades.</p>
            </div>`;
    }

    // Amb qualsevol filtre, el cost (de tota l'explotació) no es pot dividir pels kg/ha filtrats
    const hiHaFiltre = !!(filtres.fruita || filtres.varietat || filtres.finca);
    const avisos = [];
    if (filtres.finca) avisos.push('La factura de temporers no es desglossa per finca: es mostra el total de l\'explotació, no el de «' + filtres.finca + '».');
    if (filtres.fruita || filtres.varietat) avisos.push('Amb un filtre de fruita o varietat no es calculen €/ha ni €/kg: la mà d\'obra és de tota l\'explotació.');
    if (filtres.finca) avisos.push('Amb filtre de finca tampoc es calculen €/ha ni €/kg.');

    // Valors per campanya
    const v = {};
    campanyes.forEach(c => {
        const d = temporers[c];
        if (!d) { v[c] = null; return; }
        const base = hiHaFiltre ? { kg: null, ha: null } : baseFruitaTemporers(ctx, c);
        v[c] = {
            mesos: d.mesos, hores: d.hores, cost: d.cost, regul: d.regul, euroHora: d.euroHora,
            euroHa: base.ha ? d.cost / base.ha : null,
            euroKg: base.kg ? d.cost / base.kg : null,
            enCurs: Number(c) === anyActual
        };
    });

    // Una fila per indicador; max de referència per a les barres
    const files = [
        { titol: 'Hores facturades', clau: 'hores',    format: x => formatNumeroInforme(x) + ' h',          delta: false },
        { titol: 'Cost (€, sense IVA)', clau: 'cost',  format: x => x.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €', delta: false, subnota: true },
        { titol: '€/hora',           clau: 'euroHora', format: x => x.toFixed(2) + ' €/h',                  delta: true },
        { titol: '€/ha',             clau: 'euroHa',   format: x => formatNumeroInforme(x) + ' €/ha',       delta: true },
        { titol: '€/kg collit',      clau: 'euroKg',   format: x => x.toFixed(3) + ' €/kg',                 delta: true }
    ];

    const capcalera = campanyes.map(c => `<th>📅 <strong>${c}</strong></th>`).join('');
    const cos = files.map(fila => {
        let max = 1;
        campanyes.forEach(c => { const x = v[c]?.[fila.clau]; if (x != null) max = Math.max(max, Math.abs(x)); });

        const cel·les = campanyes.map((c, i) => {
            const x = v[c]?.[fila.clau];
            if (x === null || x === undefined) return cel·laValor('—', 0, max, true);
            const prev = i > 0 ? v[campanyes[i - 1]]?.[fila.clau] : null;
            const delta = (fila.delta && i > 0) ? deltaInforme(x, prev) : null;
            let sub = '';
            if (fila.subnota) {
		const m = v[c].mesos;
		const linies = [m + ' mes' + (m === 1 ? '' : 'os') + ' facturat' + (m === 1 ? '' : 's')];
			if (v[c].regul) {
			linies.push('inclou ' + (v[c].regul > 0 ? '+' : '') +
			v[c].regul.toLocaleString('ca-ES', { minimumFractionDigits: 2 }) + ' € de regularitzacions');
			}
			if (v[c].enCurs) linies.push('⚠️ campanya en curs (provisional)');
			else if (m < 12) linies.push('⚠️ només ' + m + ' de 12 mesos: €/ha i €/kg no comparables');
			sub = linies.join('<br>');
	}
            return cel·laValorDelta(fila.format(x), Math.abs(x), max, delta, sub);
        }).join('');
        return `<tr><td>${fila.titol}</td>${cel·les}</tr>`;
    }).join('');

    const notes = [NOTA_TEMPORERS, ...avisos].map(t => `<p class="informe-comp-nota">${t}</p>`).join('');

    return `
        <div class="informe-comp-seccio">
            <h3>👥 Mà d'obra temporers <span class="informe-comp-nota">(▲▼ vs campanya anterior; verd = més baix)</span></h3>
            ${notes}
            <table class="informe-comp-taula">
                <thead><tr><th>Indicador</th>${capcalera}</tr></thead>
                <tbody>${cos}</tbody>
            </table>
        </div>`;
}
