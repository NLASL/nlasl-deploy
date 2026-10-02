// ============================================================
// TRACTAMENTS V2 — Lògica de negoci
// Arquitectura: tractaments (capçalera per parcel·la) +
//               tractaments_productes (N productes per grup)
// ============================================================

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
        if (editMode && editGrup) {
            const ra = await supabaseClient.from('tractaments')
                .select('parcella_id, superficie_tractada').eq('grup_tractament', editGrup);
            if (ra.error) throw ra.error;
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
            await createTractament({
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

        // 3) Només ara, eliminar l'antic (si és edició)
        if (editMode && editGrup) {
            await eliminarGrupTractamentComplet(editGrup);
        }

        mostrarNotificacio(editMode ? 'Tractament actualitzat' : 'Tractament registrat', 'success');
        tancarModal('modal-tractament');
        await carregarTaulaTractaments();
        resetFormulariTractaments();

    } catch (error) {
        console.error('Error guardarTractament:', error);
        // Desfer el grup nou; l'original (si n'hi ha) queda intacte
        try { await eliminarGrupTractamentComplet(grupNou); } catch (e2) { console.error('Rollback:', e2); }
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

async function eliminarTractamentGrup(grupTractament) {
    if (!confirm('Segur que vols eliminar aquest tractament?')) return;
    try {
        await eliminarGrupTractamentComplet(grupTractament);
        mostrarNotificacio('Tractament eliminat', 'success');
        await carregarTaulaTractaments();
    } catch (error) {
        console.error(error);
        mostrarNotificacio('Error eliminant tractament: ' + error.message, 'error');
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