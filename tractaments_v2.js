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
        .select('*, fitosanitaris(id, nom, materia_activa, tipus, plac, registre)')
        .eq('grup_tractament', grupTractament)
        .order('created_at');
    if (error) throw error;
    return data || [];
}

async function insertProductesGrup(grupTractament, productes) {
    // productes: [{ producte_id, dosi, unitat, data_limit, observacions_producte }]
    if (!productes || !productes.length) return;
    const rows = productes.map(function(p) {
        return {
            grup_tractament: grupTractament,
            producte_id: p.producte_id || null,
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

async function guardarTractament(event) {
    event.preventDefault();

    const tipus = document.querySelector('input[name="seleccio-tipus"]:checked').value;
    const data = document.getElementById('tractament-data').value;
    const operador = document.getElementById('tractament-operador').value.trim();
    const maquinaria = document.getElementById('tractament-maquinaria').value.trim();
    const meteo = document.getElementById('tractament-meteo').value.trim();
    const observacions = document.getElementById('tractament-observacions').value.trim();
    const campanya = getCampanyaDefecte().toString();

    // Recollir línies de producte
    const liniesProducte = recollirLiniesProducte();
    if (!liniesProducte.length) {
        mostrarNotificacio('Cal afegir almenys un producte', 'error');
        return;
    }

    // Recollir parcel·les
    let parcellesATractar = [];
    if (tipus === 'finca') {
        const checks = document.querySelectorAll('#tractament-finques-checks input[type="checkbox"]:checked');
        const finquesSeleccionades = Array.from(checks).map(function(c) { return c.value; });
        parcellesATractar = parcelles.filter(function(p) {
            return finquesSeleccionades.includes(p.finca) && esParcellaApta(p);
        });
    } else if (tipus === 'varietat') {
        const finca = document.getElementById('tractament-finca-varietat').value;
        const varietat = document.getElementById('tractament-varietat').value;
        parcellesATractar = parcelles.filter(function(p) {
            return p.finca === finca && p.varietat === varietat && esParcellaApta(p);
        });
    }

    if (!parcellesATractar.length) {
        mostrarNotificacio('No hi ha parcel·les aptes seleccionades', 'error');
        return;
    }

    const form = document.getElementById('form-tractament');
    const editMode = form.dataset.editMode === 'true';
    const editGrup = form.dataset.editGrup || null;

    try {
        if (editMode && editGrup) {
            // Edició: eliminar tractaments i productes del grup anterior
            await supabaseClient.from('tractaments').delete().eq('grup_tractament', editGrup);
            await supabaseClient.from('estoc_moviments').delete()
                .in('referencia_id',
                    (await supabaseClient.from('tractaments').select('id').eq('grup_tractament', editGrup)).data?.map(function(t) { return t.id; }) || []
                );
        }

        // Generar un grup_tractament únic per tot el tractament
        const grupTractament = crypto.randomUUID();

        // Preparar agrupació per estoc (per finca+varietat)
        const grupsEstoc = {};

        // Inserir tractaments per parcel·la
        const primerTractamentId = { id: null };
        for (const p of parcellesATractar) {
            const superficieParcel = parseFloat(p.superficie) || 0;
            const finca = p.finca || 'Sense finca';
            const varietat = p.varietat || 'Sense varietat';
            const clauGrup = finca + '|' + varietat;

            const nouTractament = {
                data,
                operador,
                maquinaria,
                condicions_meteo: meteo,
                observacions,
                parcella_id: p.id,
                superficie_tractada: superficieParcel,
                estat: 'actiu',
                campanya,
                grup_tractament: grupTractament,
                created_by: currentUser ? currentUser.id : null
            };

            const creat = await createTractament(nouTractament);
            if (!primerTractamentId.id) primerTractamentId.id = creat.id;

            if (!grupsEstoc[clauGrup]) {
                grupsEstoc[clauGrup] = {
                    finca,
                    varietat,
                    superficieTotal: 0,
                    referenciaId: creat.id
                };
            }
            grupsEstoc[clauGrup].superficieTotal += superficieParcel;
        }

        // Inserir línies de producte
        await insertProductesGrup(grupTractament, liniesProducte);

        // Moviments d'estoc: un per producte per finca+varietat
        const moviments = [];
        Object.values(grupsEstoc).forEach(function(g) {
            liniesProducte.forEach(function(lp) {
                if (!lp.producte_id) return;
                const dosi = parseFloat(lp.dosi) || 0;
                const unitatBase = (lp.unitat || '').split('/')[0];
                moviments.push({
                    data,
                    producte_id: lp.producte_id,
                    tipus_producte: 'fitosanitari',
                    tipus_moviment: 'tractament',
                    quantitat: -(g.superficieTotal * dosi),
                    unitat: unitatBase,
                    referencia_id: g.referenciaId,
                    observacions: 'Tractament a ' + g.finca + ' – ' + g.varietat + ' (' + g.superficieTotal.toFixed(2) + ' Ha)',
                    created_by: currentUser ? currentUser.id : null
                });
            });
        });

        if (moviments.length) {
            await supabaseClient.from('estoc_moviments').insert(moviments);
        }

        mostrarNotificacio(editMode ? 'Tractament actualitzat' : 'Tractament registrat', 'success');
        tancarModal('modal-tractament');
        await carregarTaulaTractaments();
        resetFormulariTractaments();

    } catch (error) {
        console.error('Error guardarTractament:', error);
        mostrarNotificacio('Error en guardar: ' + error.message, 'error');
    }
}

function recollirLiniesProducte() {
    const linies = [];
    document.querySelectorAll('.linia-producte').forEach(function(row) {
        const producteId = row.querySelector('.lp-producte').value;
        const dosi = parseFloat(row.querySelector('.lp-dosi').value);
        const unitat = row.querySelector('.lp-unitat').value;
        const dataLimit = row.querySelector('.lp-data-limit').value;
        const obs = row.querySelector('.lp-obs') ? row.querySelector('.lp-obs').value : '';

        if (producteId && dosi > 0) {
            linies.push({
                producte_id: producteId,
                dosi,
                unitat,
                data_limit: dataLimit || null,
                observacions_producte: obs || null
            });
        }
    });
    return linies;
}

async function eliminarTractamentGrup(grupTractament) {
    if (!confirm('Segur que vols eliminar aquest tractament?')) return;

    try {
        // Obtenir ids per eliminar estoc
        const { data: tractIds } = await supabaseClient
            .from('tractaments')
            .select('id')
            .eq('grup_tractament', grupTractament);

        const ids = (tractIds || []).map(function(t) { return t.id; });

        // Eliminar productes del grup
        await deleteProductesGrup(grupTractament);

        // Eliminar moviments d'estoc
        if (ids.length) {
            await supabaseClient.from('estoc_moviments').delete().in('referencia_id', ids);
        }

        // Eliminar tractaments
        await supabaseClient.from('tractaments').delete().eq('grup_tractament', grupTractament);

        mostrarNotificacio('Tractament eliminat', 'success');
        await carregarTaulaTractaments();

    } catch (error) {
        console.error(error);
        mostrarNotificacio('Error eliminant tractament', 'error');
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
