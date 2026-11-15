// ============================================================
// TRACTAMENTS V2 — Lògica de negoci
// Arquitectura: tractaments (capçalera per parcel·la) +
//               tractaments_productes (N productes per grup)
// ============================================================

// ------------------------------------------------------------
// QIE — Conreu vigent d'una parcel·la en una data
// Una parcel·la pot tenir dues collites el mateix any (ex. ordi i després
// blat de moro). Si té `cultiu_2a_collita` i la data d'aplicació és igual o
// posterior a `data_inici_2a_collita`, el conreu vigent és el de la 2a collita.
// Retorna { cultiu, varietat }. Tolera que les columnes encara no existeixin.
// ------------------------------------------------------------
function conreuParcellaPerData(parcella, dataISO) {
    if (!parcella) return { cultiu: null, varietat: null };
    const usaSegona = !!(parcella.cultiu_2a_collita && parcella.data_inici_2a_collita
        && dataISO && String(dataISO) >= String(parcella.data_inici_2a_collita));
    if (usaSegona) {
        return { cultiu: parcella.cultiu_2a_collita, varietat: parcella.varietat_2a_collita || null };
    }
    return { cultiu: parcella.cultiu || null, varietat: parcella.varietat || null };
}

async function createTractament(dades) {
    const { data, error } = await supabaseClient
        .from('tractaments')
        .insert([dades])
        .select()
        .single();
    if (error) throw error;
    return data;
}

async function getTractamentsComplet(campanya) {
    const { dataInici, dataFinal } = getDatesCampanya(campanya);
    const { data, error } = await supabaseClient
        .from('tractaments_complet')
        .select('*')
        .eq('estat', 'actiu')
        .gte('data', dataInici)
        .lte('data', dataFinal)
        .order('data', { ascending: false });
    if (error) throw error;
    return data || [];
}

async function getProductesByGrup(grupTractament) {
    const { data, error } = await supabaseClient
        .from('tractaments_productes')
        .select('*, fitosanitaris(id, nom, materia_activa, tipus, plac, registre), fertilitzants(id, nom, tipus, n, p, k)')
        .eq('grup_tractament', grupTractament)
        .order('created_at');
    if (error) throw error;
    return data || [];
}

async function insertProductesGrup(grupTractament, productes) {
    // productes: [{ producte_id?, fertilitzant_id?, dosi, unitat, data_limit, observacions_producte }]
    // Exactament un de producte_id / fertilitzant_id ha d'anar emplenat (constraint a BD).
    if (!productes || !productes.length) return;
    const rows = productes.map(function(p) {
        return {
            grup_tractament: grupTractament,
            producte_id: p.producte_id || null,
            fertilitzant_id: p.fertilitzant_id || null,
            dosi: parseFloat(p.dosi) || 0,
            unitat: p.unitat || 'L/Ha',
            data_limit: p.data_limit || null,
            observacions_producte: p.observacions_producte || null
        };
    });
    const { error } = await supabaseClient.from('tractaments_productes').insert(rows);
    if (error) throw error;
}

async function deleteProductesGrup(grupTractament) {
    const { error } = await supabaseClient
        .from('tractaments_productes')
        .delete()
        .eq('grup_tractament', grupTractament);
    if (error) throw error;
}

async function eliminarGrupTractamentComplet(grupTractament) {
    // Ordre: estoc → línies → capçaleres. Si falla, llença l'error (no s'empassa).
    await eliminarEstocGrup('tractament', grupTractament);
    await deleteProductesGrup(grupTractament);
    const { error } = await supabaseClient.from('tractaments').delete().eq('grup_tractament', grupTractament);
    if (error) throw error;
}

// ------------------------------------------------------------
// ANUL·LACIÓ — el registre legal no s'esborra: passa a estat 'anulat'
// (mateix valor que ja fan servir els registres antics).
// Les línies de producte es conserven. L'estoc és derivat i es retira.
// Llença error si no s'ha anul·lat cap fila (sense permís o ja anul·lat).
// ------------------------------------------------------------
async function anularGrupTractamentComplet(grupTractament, motiu) {
    await eliminarEstocGrup('tractament', grupTractament);
    const r = await supabaseClient.from('tractaments')
        .update({
            estat: 'anulat',
            data_anulacio: new Date().toISOString(),
            anulat_per: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null,
            motiu_anulacio: motiu || null
        })
        .eq('grup_tractament', grupTractament)
        .eq('estat', 'actiu')
        .select('id');
    if (r.error || !(r.data && r.data.length)) {
        // Si no s'ha pogut anul·lar, es restitueix l'estoc retirat
        try { await sincronitzarEstocGrup('tractament', grupTractament); } catch (e) { console.error('Restitució estoc:', e); }
        throw r.error || new Error('No s\'ha pogut anul·lar el tractament (sense permís o ja anul·lat)');
    }
}

async function guardarTractament(event) {
    event.preventDefault();

    const form = document.getElementById('form-tractament');
    if (form.dataset.guardant === '1') return; // evita doble enviament

    const data = document.getElementById('tractament-data').value;
    const operador = document.getElementById('tractament-operador').value.trim();
    const maquinaria = document.getElementById('tractament-maquinaria').value.trim();
    const meteo = document.getElementById('tractament-meteo').value.trim();
    const observacions = document.getElementById('tractament-observacions').value.trim();
    const campanya = getCampanyaDefecte().toString();

    const liniesProducte = recollirLiniesProducte();
    if (!liniesProducte.length) {
        mostrarNotificacio('Cal afegir almenys un producte', 'error');
        return;
    }

    const errUnitat = validarUnitatsLinies(liniesProducte, false);
    if (errUnitat) {
        mostrarNotificacio(errUnitat, 'error');
        return;
    }

    const parcellesATractar = getParcellesSeleccionades();
    if (!parcellesATractar.length) {
        mostrarNotificacio('Cal seleccionar almenys una parcel·la', 'error');
        return;
    }

    const editMode = form.dataset.editMode === 'true';
    const editGrup = form.dataset.editGrup || null;
    const btn = form.querySelector('button[type="submit"]');
    form.dataset.guardant = '1';
    if (btn) btn.disabled = true;

    const grupNou = crypto.randomUUID();

    try {
        // Edició: avisar si el grup original tenia parcel·les que el selector ja no mostra
        // (si continuem, es perdrien en silenci)
        let filesAntigues = [];
        if (editMode && editGrup) {
            const ra = await supabaseClient.from('tractaments')
                .select('parcella_id, superficie_tractada, data, dun_ordre, cultiu_aplicat, varietat_aplicada')
                .eq('grup_tractament', editGrup);
            if (ra.error) throw ra.error;
            filesAntigues = ra.data || [];
            const ids = new Set(parcellesATractar.map(function(p) { return p.id; }));
            const perdudes = (ra.data || []).filter(function(o) { return !ids.has(o.parcella_id); });
            if (perdudes.length) {
                const haPerdudes = perdudes.reduce(function(s, o) { return s + (parseFloat(o.superficie_tractada) || 0); }, 0);
                if (!confirm('Aquest tractament tenia ' + perdudes.length + ' parcel·les (' + haPerdudes.toFixed(2) +
                    ' Ha) que ja no són seleccionades i es perdran. Continuar?')) {
                    form.dataset.guardant = '0';
                    if (btn) btn.disabled = false;
                    return;
                }
            }
        }

        // 1) Crear el grup NOU (l'antic no es toca fins que tot ha anat bé)
        for (const p of parcellesATractar) {
            // QIE: es fixa la DGC (Ordre de la DUN) i el conreu vigent en la data d'aplicació
            const conreu = conreuParcellaPerData(p, data);
            // En edició, si la data no canvia, es conserva la DGC i el conreu del registre original
            const antiga = filesAntigues.find(function(o) { return o.parcella_id === p.id && o.data === data; });
            const teSnapshot = !!(antiga && antiga.cultiu_aplicat);
            await createTractament({
                dun_ordre: teSnapshot && antiga.dun_ordre ? antiga.dun_ordre : (p.dun_ordre || null),
                cultiu_aplicat: teSnapshot ? antiga.cultiu_aplicat : conreu.cultiu,
                varietat_aplicada: teSnapshot ? antiga.varietat_aplicada : conreu.varietat,
                grup_anterior: (editMode && editGrup) ? editGrup : null,
                data,
                operador,
                maquinaria,
                condicions_meteo: meteo,
                observacions,
                parcella_id: p.id,
                superficie_tractada: parseFloat(p.superficie) || 0,
                estat: 'actiu',
                campanya,
                grup_tractament: grupNou,
                created_by: currentUser ? currentUser.id : null
            });
        }
        await insertProductesGrup(grupNou, liniesProducte);

        // 2) Estoc: un moviment per línia de producte
        await sincronitzarEstocGrup('tractament', grupNou);

        // 3) Només ara, anul·lar l'antic (si és edició): queda a l'historial
        if (editMode && editGrup) {
            await anularGrupTractamentComplet(editGrup, 'Substituït per edició');
        }

        mostrarNotificacio(editMode ? 'Tractament actualitzat' : 'Tractament registrat', 'success');
        tancarModal('modal-tractament');
        await carregarTaulaTractaments();
        resetFormulariTractaments();

    } catch (error) {
        console.error('Error guardarTractament:', error);
        // Desfer el grup nou (s'anul·la, no s'esborra); l'original (si n'hi ha) queda intacte
        try { await anularGrupTractamentComplet(grupNou, 'Desament fallit (desfet automàticament)'); } catch (e2) { console.error('Rollback:', e2); }
        mostrarNotificacio('Error en guardar: ' + error.message, 'error');
    } finally {
        form.dataset.guardant = '0';
        if (btn) btn.disabled = false;
    }
}

function recollirLiniesProducte() {
    const linies = [];
    document.querySelectorAll('.linia-producte').forEach(function(row) {
        const valorSelect = row.querySelector('.lp-producte').value; // "fito:<id>" o "fert:<id>"
        const dosi = parseFloat(row.querySelector('.lp-dosi').value);
        const unitat = row.querySelector('.lp-unitat').value;
        const dataLimit = row.querySelector('.lp-data-limit').value;
        const obs = row.querySelector('.lp-obs') ? row.querySelector('.lp-obs').value : '';

        if (!valorSelect || !(dosi > 0)) return;
        const [tipus, id] = valorSelect.split(':');

        linies.push({
            producte_id: tipus === 'fito' ? id : null,
            fertilitzant_id: tipus === 'fert' ? id : null,
            dosi,
            unitat,
            data_limit: dataLimit || null,
            observacions_producte: obs || null
        });
    });
    return linies;
}

// El nom es manté per compatibilitat amb els botons existents, però ja no esborra:
// anul·la el tractament i en guarda el motiu.
async function eliminarTractamentGrup(grupTractament) {
    if (!confirm('Segur que vols anul·lar aquest tractament?\n\nQuedarà a l\'historial com a anul·lat i deixarà de comptar a l\'estoc i als informes.')) return;
    const motiu = prompt('Motiu de l\'anul·lació (obligatori):');
    if (!motiu || !motiu.trim()) {
        mostrarNotificacio('Cal indicar un motiu per anul·lar', 'warning');
        return;
    }
    try {
        await anularGrupTractamentComplet(grupTractament, motiu.trim());
        mostrarNotificacio('Tractament anul·lat', 'success');
        await carregarTaulaTractaments();
    } catch (error) {
        console.error(error);
        mostrarNotificacio('Error anul·lant tractament: ' + error.message, 'error');
    }
}

function resetFormulariTractaments() {
    const form = document.getElementById('form-tractament');
    if (!form) return;
    form.reset();
    form.dataset.editMode = 'false';
    form.dataset.editGrup = '';
    document.getElementById('superficie-total').textContent = '0';
    const contenidor = document.getElementById('linies-productes-container');
    if (contenidor) contenidor.innerHTML = '';
    afegirLiniaProducte(); // Sempre comença amb una línia buida
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