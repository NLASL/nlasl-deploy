// ============================================================
// INFORMES - COMPARATIVA: ESCANDALLS vs LIQUIDACIÓ (v1)
// Bloc independent que s'autoregistra a BLOCS_INFORME_COMPARATIVA.
// CAL carregar-lo a index.html DESPRÉS d'informes-comparativa_v1.js.
//
// Mostra, per fruita -> varietat, els kg per qualitat comercial + calibre,
// no comercial (per classificació) i indústria, comparant:
//   - kg segons els ESCANDALLS (collita_escandall*)
//   - kg segons la LIQUIDACIÓ (collita_liquidacions_linies)
// i marca les diferències. No toca res de la BD (només lectura).
// ============================================================

(function () {
    'use strict';

    const TOLERANCIA_KG = 1;          // diferències inferiors no es marquen
    let tokenGeneracio = 0;           // evita pintar resultats d'una generació antiga

    // ---------- Helpers ----------
    const esc = v => String(v == null ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const normText = s => String(s || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ').trim().toUpperCase();

    // No comercial: unifica 'Defec' / 'FNC_DEFECTES' / 'Defectes', etc.
    function claveNC(nom) {
        let n = nom;
        if (typeof nomGrupSubcategoria === 'function') n = nomGrupSubcategoria(nom, 'NO_COMERCIAL');
        return normText(n).replace(/^FNC[_ ]/, '');
    }

    const fmt = x => Number(x || 0).toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtDif = x => (x > 0 ? '+' : '') + fmt(x);

    function campanyaDeDataStr(d) {
        const any = parseInt(String(d).slice(0, 4), 10);
        const mes = parseInt(String(d).slice(5, 7), 10);
        return mes >= 10 ? any + 1 : any;
    }

    function valorCalibre(c) {
        const m = String(c || '').match(/\d+/);
        return m ? parseInt(m[0], 10) : -1;
    }

    async function paginar(construir) {
        const MIDA = 1000;
        let totes = [], offset = 0;
        while (true) {
            const { data, error } = await construir().range(offset, offset + MIDA - 1);
            if (error) throw error;
            totes = totes.concat(data || []);
            if (!data || data.length < MIDA) break;
            offset += MIDA;
        }
        return totes;
    }

    function assegurarEstils() {
        if (document.getElementById('informe-comp-estils-escliq')) return;
        const st = document.createElement('style');
        st.id = 'informe-comp-estils-escliq';
        st.textContent = `
            .escliq-taula { border-collapse: collapse; width: 100%; font-size: 0.9em; }
            .escliq-taula th, .escliq-taula td { padding: 4px 8px; border-bottom: 1px solid #e0e0e0; }
            .escliq-taula td.r, .escliq-taula th.r { text-align: right; white-space: nowrap; }
            .escliq-taula .esc-camp { text-align: center; border-left: 2px solid #c9d6b8; }
            .escliq-taula td.esc-sep { border-left: 2px solid #c9d6b8; }
            .escliq-grup td { background: #eef3e6; font-weight: 700; }
            .escliq-sub td { font-weight: 700; border-top: 1px solid #999; background: #fafafa; }
            .escliq-total td { font-weight: 700; border-top: 2px solid #666; background: #f1f8e9; }
            .escliq-dif { background: #ffebee; color: #c62828; font-weight: 700; }
            .escliq-var { margin-bottom: 28px; }
            .escliq-info { font-size: 0.85em; color: #555; margin: 2px 0 8px; }
        `;
        document.head.appendChild(st);
    }

    // ---------- Càrrega i agregació ----------
    async function carregarDades(campanyes, filtres) {
        const iniciMin = (Math.min.apply(null, campanyes) - 1) + '-10-01';
        const fiMax = Math.max.apply(null, campanyes) + '-09-30';

        const [rFruites, rVarietats] = await Promise.all([
            supabaseClient.from('fruites').select('id, nom'),
            supabaseClient.from('fruita_varietats').select('id, fruita_id, varietat')
        ]);
        if (rFruites.error) throw rFruites.error;
        if (rVarietats.error) throw rVarietats.error;
        const nomFruita = {};
        (rFruites.data || []).forEach(f => { nomFruita[f.id] = f.nom; });
        const infoVarietat = {};
        (rVarietats.data || []).forEach(v => {
            infoVarietat[v.id] = { fruita: nomFruita[v.fruita_id] || 'Fruita desconeguda', varietat: v.varietat };
        });

        const [escandalls, entrades, totesLiquidacions] = await Promise.all([
            paginar(() => supabaseClient.from('collita_escandall')
                .select(`id, data, finca, fruita_varietat_id, qualitat_reclassificada,
                         collita_escandall_calibres (calibre, pes_kg),
                         collita_escandall_no_comercial (classificacio, pes_kg),
                         collita_escandall_industria (pes_kg)`)
                .eq('estat', 'actiu').gte('data', iniciMin).lte('data', fiMax).order('id')),
            paginar(() => supabaseClient.from('collita_entrada')
                .select('id, data, finca, fruita_varietat_id, pes_net')
                .eq('estat', 'actiu').gte('data', iniciMin).lte('data', fiMax).order('id')),
            paginar(() => supabaseClient.from('collita_liquidacions')
                .select('id, campanya, fruita_id, varietat_id, data_liquidacio, estat, creat_at').in('campanya', campanyes).order('id'))
        ]);

        // Una liquidació pot tenir diverses versions (informativa, definitiva...):
        // per no duplicar kg, només s'usa la MÉS RECENT per campanya + fruita + varietat.
        const versionsPerClau = {}, ultimes = {};
        const clauLiq = l => [l.campanya, l.fruita_id, l.varietat_id || ''].join('|');
        const mesRecent = (x, y) => {   // x és més recent que y?
            const dx = x.data_liquidacio || '', dy = y.data_liquidacio || '';
            if (dx !== dy) return dx > dy;
            return String(x.creat_at || '') > String(y.creat_at || '');
        };
        totesLiquidacions.forEach(l => {
            const k = clauLiq(l);
            versionsPerClau[k] = (versionsPerClau[k] || 0) + 1;
            if (!ultimes[k] || mesRecent(l, ultimes[k])) ultimes[k] = l;
        });
        const liquidacions = Object.values(ultimes);
        const infoLiq = liquidacions.map(l => {
            const fv = fvInfo(l.varietat_id, l.fruita_id);
            const nv = versionsPerClau[clauLiq(l)];
            return esc(fv.fruita + ' ' + fv.varietat) + ' · campanya ' + l.campanya + ' · liquidació del ' +
                esc(String(l.data_liquidacio || '—')) + ' (' + esc(l.estat || '—') + ')' +
                (nv > 1 ? ' — <strong>hi ha ' + nv + ' versions, s\'usa la més recent</strong>' : '');
        }).sort();

        // Línies de liquidació (per capçaleres, en blocs per no fer una URL massa llarga)
        let linies = [];
        const idsLiq = liquidacions.map(l => l.id);
        for (let i = 0; i < idsLiq.length; i += 50) {
            const bloc = idsLiq.slice(i, i + 50);
            const r = await paginar(() => supabaseClient.from('collita_liquidacions_linies')
                .select('id, liquidacio_id, varietat_id, qualitat_nom, calibre, fnc_tipus, kg')
                .in('liquidacio_id', bloc).order('id'));
            linies = linies.concat(r);
        }
        const capcalera = {};
        liquidacions.forEach(l => { capcalera[l.id] = l; });

        const liqDisponible = !filtres.finca;   // la liquidació no té finca
        const meta = {};        // rowKey -> { fvKey, fruita, varietat, grup, qualitat, detall }
        const acum = {};        // campanya -> rowKey -> { esc, liq }
        const resumFV = {};     // fvKey -> { fruita, varietat, perC: { c: { entrada, esc, liq } } }

        campanyes.forEach(c => { acum[c] = {}; });

        function fvInfo(fvId, fallbackFruitaId) {
            if (fvId && infoVarietat[fvId]) return { key: fvId, ...infoVarietat[fvId] };
            const fr = nomFruita[fallbackFruitaId] || 'Fruita desconeguda';
            return { key: 'fruita:' + (fallbackFruitaId || '?'), fruita: fr, varietat: 'Sense varietat' };
        }
        function passaFiltre(fv) {
            if (filtres.fruita && fv.fruita !== filtres.fruita) return false;
            if (filtres.varietat && fv.varietat !== filtres.varietat) return false;
            return true;
        }
        function sumar(campanya, fv, grup, qualitat, detall, camp, kg) {
            if (!acum[campanya]) return;
            const rowKey = [fv.key, grup, qualitat, detall].join('\u0001');
            if (!meta[rowKey]) meta[rowKey] = { fvKey: fv.key, fruita: fv.fruita, varietat: fv.varietat, grup, qualitat, detall };
            if (!acum[campanya][rowKey]) acum[campanya][rowKey] = { esc: 0, liq: 0 };
            acum[campanya][rowKey][camp] += kg;
            if (!resumFV[fv.key]) {
                resumFV[fv.key] = { fruita: fv.fruita, varietat: fv.varietat, perC: {} };
                campanyes.forEach(c => { resumFV[fv.key].perC[c] = { entrada: 0, esc: 0, liq: 0 }; });
            }
        }
        function assegurarResum(fv) {
            if (!resumFV[fv.key]) {
                resumFV[fv.key] = { fruita: fv.fruita, varietat: fv.varietat, perC: {} };
                campanyes.forEach(c => { resumFV[fv.key].perC[c] = { entrada: 0, esc: 0, liq: 0 }; });
            }
        }

        // Escandalls
        escandalls.forEach(e => {
            const c = campanyaDeDataStr(e.data);
            if (!acum[c]) return;
            if (filtres.finca && e.finca !== filtres.finca) return;
            const fv = fvInfo(e.fruita_varietat_id);
            if (!passaFiltre(fv)) return;
            assegurarResum(fv);
            const qual = normText(e.qualitat_reclassificada || 'SENSE_QUALIFICAR');
            (e.collita_escandall_calibres || []).forEach(x => {
                const kg = Number(x.pes_kg) || 0;
                sumar(c, fv, '1COMERCIAL', qual, String(x.calibre || '—').trim(), 'esc', kg);
                resumFV[fv.key].perC[c].esc += kg;
            });
            (e.collita_escandall_no_comercial || []).forEach(x => {
                const kg = Number(x.pes_kg) || 0;
                sumar(c, fv, '2NO_COMERCIAL', '', claveNC(x.classificacio), 'esc', kg);
                resumFV[fv.key].perC[c].esc += kg;
            });
            (e.collita_escandall_industria || []).forEach(x => {
                const kg = Number(x.pes_kg) || 0;
                sumar(c, fv, '3INDUSTRIA', '', 'Indústria', 'esc', kg);
                resumFV[fv.key].perC[c].esc += kg;
            });
        });

        // Albarans d'entrada (referència)
        entrades.forEach(e => {
            const c = campanyaDeDataStr(e.data);
            if (!acum[c]) return;
            if (filtres.finca && e.finca !== filtres.finca) return;
            const fv = fvInfo(e.fruita_varietat_id);
            if (!passaFiltre(fv)) return;
            assegurarResum(fv);
            resumFV[fv.key].perC[c].entrada += Number(e.pes_net) || 0;
        });

        // Línies de liquidació
        if (liqDisponible) {
            linies.forEach(l => {
                const cap = capcalera[l.liquidacio_id];
                if (!cap) return;
                const c = Number(cap.campanya);
                const fv = fvInfo(l.varietat_id || cap.varietat_id, cap.fruita_id);
                if (!passaFiltre(fv)) return;
                assegurarResum(fv);
                const kg = Number(l.kg) || 0;
                const q = normText(l.qualitat_nom);
                let grup, qual = '', detall;
                if (q === 'NO_COMERCIAL') { grup = '2NO_COMERCIAL'; detall = claveNC(l.fnc_tipus); }
                else if (q === 'INDUSTRIA') { grup = '3INDUSTRIA'; detall = 'Indústria'; }
                else if (l.calibre) { grup = '1COMERCIAL'; qual = q; detall = String(l.calibre).trim(); }
                else { grup = '4ALTRES'; qual = q; detall = ''; }
                sumar(c, fv, grup, qual, detall, 'liq', kg);
                resumFV[fv.key].perC[c].liq += kg;
            });
        }

        return { meta, acum, resumFV, liqDisponible, campanyes, infoLiq };
    }

    // ---------- Renderitzat ----------
    const TITOL_GRUP = {
        '1COMERCIAL': '🟢 Comercial (qualitat · calibre)',
        '2NO_COMERCIAL': '⚪ No comercial',
        '3INDUSTRIA': '🏭 Indústria',
        '4ALTRES': '❓ ALTRES (només liquidació: sense calibre ni classificació)'
    };

    function cel·lesCamp(esc_, liq, liqOk) {
        const dif = liq - esc_;
        const marcada = liqOk && Math.abs(dif) > TOLERANCIA_KG;
        return `<td class="r esc-sep">${esc_ ? fmt(esc_) : '—'}</td>` +
               `<td class="r">${liqOk ? (liq ? fmt(liq) : '—') : '—'}</td>` +
               `<td class="r ${marcada ? 'escliq-dif' : ''}">${liqOk ? fmtDif(dif) : '—'}</td>`;
    }

    function renderResultat(dades) {
        const { meta, acum, resumFV, liqDisponible, campanyes } = dades;
        const fvKeys = Object.keys(resumFV).sort((a, b) => {
            const x = resumFV[a], y = resumFV[b];
            return x.fruita.localeCompare(y.fruita) || x.varietat.localeCompare(y.varietat);
        });
        if (fvKeys.length === 0) {
            return '<p class="informe-comp-avis">No hi ha escandalls ni liquidacions per a la selecció.</p>';
        }

        const capInfo = (liqDisponible && dades.infoLiq && dades.infoLiq.length)
            ? '<p class="informe-comp-nota"><strong>Liquidacions usades:</strong><br>' + dades.infoLiq.join('<br>') + '</p>' : '';

        const cap1 = campanyes.map(c => `<th colspan="3" class="esc-camp">📅 <strong>${c}</strong></th>`).join('');
        const cap2 = campanyes.map(() =>
            '<th class="r esc-sep">Escandalls</th><th class="r">Liquidació</th><th class="r">Dif.</th>').join('');

        return capInfo + fvKeys.map(fvKey => {
            const fv = resumFV[fvKey];
            const rowKeys = Object.keys(meta).filter(k => meta[k].fvKey === fvKey);
            // Ordre: grup, qualitat, calibre descendent / nom
            rowKeys.sort((a, b) => {
                const x = meta[a], y = meta[b];
                if (x.grup !== y.grup) return x.grup.localeCompare(y.grup);
                if (x.qualitat !== y.qualitat) return x.qualitat.localeCompare(y.qualitat);
                if (x.grup === '1COMERCIAL') return valorCalibre(y.detall) - valorCalibre(x.detall);
                return x.detall.localeCompare(y.detall);
            });

            const grups = {};
            rowKeys.forEach(k => { (grups[meta[k].grup] = grups[meta[k].grup] || []).push(k); });

            const valor = (c, k, camp) => (acum[c][k] ? acum[c][k][camp] : 0);

            let cos = '';
            Object.keys(grups).sort().forEach(g => {
                cos += `<tr class="escliq-grup"><td colspan="${1 + campanyes.length * 3}">${TOLERANCIA_KG && TITOL_GRUP[g]}</td></tr>`;
                grups[g].forEach(k => {
                    const m = meta[k];
                    const etiqueta = g === '1COMERCIAL' ? `${esc(m.qualitat)} · ${esc(m.detall)}`
                        : g === '4ALTRES' ? esc(m.qualitat || '—') : esc(m.detall);
                    cos += `<tr><td style="padding-left:18px">${etiqueta}</td>` +
                        campanyes.map(c => cel·lesCamp(valor(c, k, 'esc'), valor(c, k, 'liq'), liqDisponible)).join('') + '</tr>';
                });
                // Subtotal del grup
                cos += '<tr class="escliq-sub"><td>Subtotal</td>' + campanyes.map(c => {
                    const e = grups[g].reduce((t, k) => t + valor(c, k, 'esc'), 0);
                    const l = grups[g].reduce((t, k) => t + valor(c, k, 'liq'), 0);
                    return cel·lesCamp(e, l, liqDisponible);
                }).join('') + '</tr>';
            });

            cos += '<tr class="escliq-total"><td>TOTAL ' + esc(fv.varietat) + '</td>' + campanyes.map(c => {
                const t = fv.perC[c];
                return cel·lesCamp(t.esc, t.liq, liqDisponible);
            }).join('') + '</tr>';

            const infoEntrades = campanyes
                .filter(c => fv.perC[c].entrada || fv.perC[c].esc)
                .map(c => {
                    const t = fv.perC[c];
                    const sense = t.entrada - t.esc;
                    return `${c}: albarans d'entrada <strong>${fmt(t.entrada)}</strong> kg · escandallats <strong>${fmt(t.esc)}</strong> kg` +
                        (Math.abs(sense) > TOLERANCIA_KG ? ` · <span style="color:#c62828">diferència ${fmtDif(sense)} kg (albarans sense escandall o escandalls incomplets?)</span>` : '');
                }).join('<br>');

            return `
                <div class="escliq-var">
                    <h4>🍑 ${esc(fv.fruita)} — ${esc(fv.varietat)}</h4>
                    <div class="escliq-info">${infoEntrades}</div>
                    <div style="overflow-x:auto;">
                    <table class="escliq-taula">
                        <thead><tr><th rowspan="2">Qualitat · calibre / classificació</th>${cap1}</tr><tr>${cap2}</tr></thead>
                        <tbody>${cos}</tbody>
                    </table>
                    </div>
                </div>`;
        }).join('');
    }

    // ---------- Bloc registrat ----------
    function renderBlocEscandallLiquidacio(ctx) {
        assegurarEstils();
        const id = 'informe-comp-escliq-' + (++tokenGeneracio);
        const meuToken = tokenGeneracio;
        const filtres = ctx.filtres || {};

        const notes = [
            'Kg dels escandalls (qualitat reclassificada, calibres, no comercial, indústria) davant dels kg de les línies de la liquidació. Diferència = liquidació − escandalls; es marca en vermell quan supera ' + TOLERANCIA_KG + ' kg.',
            'Les línies de la liquidació que no són calibre, no comercial ni indústria surten al grup «ALTRES». El Comp. Qualitat no hi surt: es desa a la capçalera (no són kg). Si una varietat té diverses versions de liquidació, només es compara la més recent.'
        ];
        if (filtres.finca) notes.push('⚠️ Amb filtre de finca només es mostren els escandalls: la liquidació no es desglossa per finca.');

        setTimeout(async function () {
            const cont = document.getElementById(id);
            if (!cont) return;
            try {
                const dades = await carregarDades(ctx.campanyes, filtres);
                if (meuToken !== tokenGeneracio) return;
                cont.innerHTML = renderResultat(dades);
            } catch (error) {
                console.error(error);
                cont.innerHTML = '<p class="informe-comp-avis">Error carregant escandalls/liquidacions: ' + esc(error.message) + '</p>';
            }
        }, 0);

        return `
            <div class="informe-comp-seccio">
                <h3>⚖️ Escandalls vs liquidació — kg per fruita, varietat, qualitat, calibre i no comercial</h3>
                ${notes.map(t => `<p class="informe-comp-nota">${t}</p>`).join('')}
                <div id="${id}"><p class="informe-comp-avis">Carregant...</p></div>
            </div>`;
    }

    if (typeof BLOCS_INFORME_COMPARATIVA === 'undefined') {
        console.error('informes-comparativa-liquidacio_v1.js: cal carregar-lo DESPRÉS d\'informes-comparativa_v1.js');
        return;
    }
    BLOCS_INFORME_COMPARATIVA.escandallLiquidacio = {
        label: '⚖️ Escandalls vs liquidació — kg per varietat, qualitat, calibre i NC',
        grup: '🍑 Collita',
        necessita: [],
        render: renderBlocEscandallLiquidacio
    };

    console.log('✅ Comparativa Escandalls vs Liquidació v1 carregat');
})();
