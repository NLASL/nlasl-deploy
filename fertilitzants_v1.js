// fertilitzants_v1.js — Mòdul fertilitzants (lògica de negoci)
// Quadern de Camp NLASL · v1.0
// Depèn de: supabase-client_v5.js (window.supabase)

'use strict';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const FERTILITZANTS_SOLUBILITAT = ['total', 'parcial', 'no soluble', 'desconeguda'];
const FERTILITZANTS_FORMES      = ['pols', 'granulat', 'líquid', 'peletat', 'altra'];
const FERTILITZANTS_MODES       = ['fertirrigació', 'foliar', 'sòl', 'hidroponia'];

// ─────────────────────────────────────────────
// CRUD — fertilitzants (taula principal)
// ─────────────────────────────────────────────

/**
 * Retorna tots els fertilitzants amb dades tècniques i preu efectiu
 * (usa la vista fertilitzants_complet)
 */
async function getFertilitzantsComplet() {
  const { data, error } = await supabaseClient
    .from('fertilitzants_complet')
    .select('*')
    .order('nom');
  if (error) throw error;
  return data;
}

/**
 * Retorna un fertilitzant complet per id
 */
async function getFertilitzantById(id) {
  const { data, error } = await supabaseClient
    .from('fertilitzants_complet')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Actualitza preu_kg i preu_kg_data a la taula principal fertilitzants
 */
async function actualitzarPreuFertilitzant(id, preuKg) {
  const { error } = await supabaseClient
    .from('fertilitzants')
    .update({
      preu_kg:      preuKg,
      preu_kg_data: new Date().toISOString().split('T')[0],
    })
    .eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// CRUD — fertilitzants_tecnics
// ─────────────────────────────────────────────

/**
 * Retorna les dades tècniques d'un fertilitzant (null si no existeixen)
 */
async function getTecnicByFertilitzantId(fertilitzantId) {
  const { data, error } = await supabaseClient
    .from('fertilitzants_tecnics')
    .select('*')
    .eq('fertilitzant_id', fertilitzantId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Crea o actualitza (upsert) les dades tècniques d'un fertilitzant
 * @param {string} fertilitzantId
 * @param {object} dades — camps de fertilitzants_tecnics
 */
async function upsertFertilitzantTecnic(fertilitzantId, dades) {
  const payload = {
    fertilitzant_id: fertilitzantId,
    ...dades,
  };

  // Neteja: assegurem que modes_aplicacio és array
  if (payload.modes_aplicacio && !Array.isArray(payload.modes_aplicacio)) {
    payload.modes_aplicacio = [payload.modes_aplicacio];
  }

  // Conversió numèrica dels camps NPK secundaris
  ['ca', 'mg', 's', 'ph_minim', 'ph_maxim', 'materia_organica', 'preu_kg'].forEach(camp => {
    if (payload[camp] !== undefined && payload[camp] !== '') {
      payload[camp] = payload[camp] === null ? null : parseFloat(payload[camp]);
    }
  });

  const { data, error } = await supabaseClient
    .from('fertilitzants_tecnics')
    .upsert(payload, { onConflict: 'fertilitzant_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Elimina les dades tècniques d'un fertilitzant
 */
async function eliminarFertilitzantTecnic(fertilitzantId) {
  const { error } = await supabaseClient
    .from('fertilitzants_tecnics')
    .delete()
    .eq('fertilitzant_id', fertilitzantId);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// LÒGICA DE NEGOCI — Preu efectiu
// ─────────────────────────────────────────────

/**
 * Obté el darrer preu de compra des de compres_linies
 * Retorna { preu, data_albara } o null si no hi ha compres
 */
async function getDarrerPreuCompra(fertilitzantId) {
  const { data, error } = await supabaseClient
    .from('compres_linies')
    .select('preu, data_albara, created_at')
    .eq('producte_id', fertilitzantId)
    .eq('tipus_producte', 'fertilitzant')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Calcula el preu efectiu d'un fertilitzant
 * Prioritat: preu_kg manual > preu tècnic > darrera compra
 * Retorna { preu, origen, data }
 */
async function getPreuEfectiu(fertilitzant) {
  if (fertilitzant.preu_kg_manual) {
    return {
      preu:   fertilitzant.preu_kg_manual,
      origen: 'manual',
      data:   fertilitzant.preu_kg_manual_data,
    };
  }
  if (fertilitzant.preu_kg_tecnic) {
    return {
      preu:   fertilitzant.preu_kg_tecnic,
      origen: 'tecnic',
      data:   fertilitzant.preu_kg_tecnic_data,
    };
  }
  const compra = await getDarrerPreuCompra(fertilitzant.id);
  if (compra) {
    return {
      preu:   compra.preu,
      origen: 'compres',
      data:   compra.data_albara,
    };
  }
  return { preu: null, origen: 'sense preu', data: null };
}

// ─────────────────────────────────────────────
// LÒGICA DE NEGOCI — Comparador / puntuació
// ─────────────────────────────────────────────

/**
 * Calcula el cost per unitat de nutrient (€/kg de nutrient pur)
 * Retorna { costN, costP, costK } — null si no hi ha preu o el % és 0
 */
function calcularCostNutrient(fertilitzant) {
  const preu = fertilitzant.preu_efectiu;
  if (!preu) return { costN: null, costP: null, costK: null };

  return {
    costN: fertilitzant.n > 0 ? preu / (fertilitzant.n / 100) : null,
    costP: fertilitzant.p > 0 ? preu / (fertilitzant.p / 100) : null,
    costK: fertilitzant.k > 0 ? preu / (fertilitzant.k / 100) : null,
  };
}

/**
 * Puntua un fertilitzant per a una fase donada
 * fase: 'N' | 'K' | 'NKP' | 'fertirrigacio'
 * Retorna un número (com més alt millor)
 */
function puntuar(fertilitzant, fase) {
  const preu = fertilitzant.preu_efectiu || 0;
  let punts = 0;

  switch (fase) {
    case 'N':
      punts = (fertilitzant.n || 0) * 2 - preu * 10;
      break;
    case 'K':
      punts = (fertilitzant.k || 0) * 2 - preu * 10;
      break;
    case 'NKP':
      punts = ((fertilitzant.n || 0) + (fertilitzant.p || 0) + (fertilitzant.k || 0)) - preu * 5;
      break;
    case 'fertirrigacio':
    default:
      punts = ((fertilitzant.n || 0) + (fertilitzant.k || 0)) - preu * 5;
  }

  // Bonus si és apta per fertirrigació
  if (fertilitzant.apta_fertirrigacio) punts += 5;

  // Bonus si solubilitat total
  if (fertilitzant.solubilitat === 'total') punts += 3;

  return punts;
}

/**
 * Ordena i filtra fertilitzants per a una cerca del comparador
 * @param {Array}  fertilitzants — array de fertilitzants_complet
 * @param {object} opcions — { fase, ordre, nomesFertirrigacio }
 * @returns {Array} fertilitzants ordenats amb camp `puntuacio` i `costNutrient`
 */
function filtrarIOrdenar(fertilitzants, opcions = {}) {
  const { fase = 'NKP', ordre = 'puntuacio', nomesFertirrigacio = false } = opcions;

  let resultat = fertilitzants.map(f => ({
    ...f,
    puntuacio:    puntuar(f, fase),
    costNutrient: calcularCostNutrient(f),
  }));

  // Filtre fertilització
  if (nomesFertirrigacio) {
    resultat = resultat.filter(f => f.apta_fertirrigacio);
  }

  // Filtre per fase
  if (fase === 'N') resultat = resultat.filter(f => (f.n || 0) > 0);
  if (fase === 'K') resultat = resultat.filter(f => (f.k || 0) > 0);

  // Ordenació
  switch (ordre) {
    case 'cost_n':
      resultat.sort((a, b) => (a.costNutrient.costN || 9999) - (b.costNutrient.costN || 9999));
      break;
    case 'cost_k':
      resultat.sort((a, b) => (a.costNutrient.costK || 9999) - (b.costNutrient.costK || 9999));
      break;
    case 'preu':
      resultat.sort((a, b) => (a.preu_efectiu || 9999) - (b.preu_efectiu || 9999));
      break;
    case 'puntuacio':
    default:
      resultat.sort((a, b) => b.puntuacio - a.puntuacio);
  }

  // Normalitzar puntuació a percentatge (0–100)
  const maxPunt = Math.max(...resultat.map(f => f.puntuacio), 1);
  resultat = resultat.map(f => ({
    ...f,
    puntuacioPct: Math.max(0, Math.round((f.puntuacio / maxPunt) * 100)),
  }));

  return resultat;
}

/**
 * Retorna les mètriques resum del catàleg
 * { total, aptesFerri, millorCostN, millorCostK }
 */
function calcularMetriques(fertilitzants) {
  const amb = fertilitzants.filter(f => f.preu_efectiu);

  const millorN = amb
    .map(f => ({ nom: f.nom, cost: calcularCostNutrient(f).costN }))
    .filter(x => x.cost)
    .sort((a, b) => a.cost - b.cost)[0] || null;

  const millorK = amb
    .map(f => ({ nom: f.nom, cost: calcularCostNutrient(f).costK }))
    .filter(x => x.cost)
    .sort((a, b) => a.cost - b.cost)[0] || null;

  return {
    total:       fertilitzants.length,
    aptesFerri:  fertilitzants.filter(f => f.apta_fertirrigacio).length,
    millorCostN: millorN,
    millorCostK: millorK,
  };
}

// ─────────────────────────────────────────────
// EXPORTS (namespace global per compatibilitat amb app existent)
// ─────────────────────────────────────────────

window.Fertilitzants = {
  // Constants
  SOLUBILITAT: FERTILITZANTS_SOLUBILITAT,
  FORMES:      FERTILITZANTS_FORMES,
  MODES:       FERTILITZANTS_MODES,

  // CRUD
  getComplet:           getFertilitzantsComplet,
  getById:              getFertilitzantById,
  actualitzarPreu:      actualitzarPreuFertilitzant,
  getTecnic:            getTecnicByFertilitzantId,
  upsertTecnic:         upsertFertilitzantTecnic,
  eliminarTecnic:       eliminarFertilitzantTecnic,

  // Preus
  getDarrerPreuCompra,
  getPreuEfectiu,

  // Comparador
  calcularCostNutrient,
  puntuar,
  filtrarIOrdenar,
  calcularMetriques,
};
