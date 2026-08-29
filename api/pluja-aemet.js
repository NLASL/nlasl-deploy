// api/pluja-aemet.js
const AEMET_BASE = 'https://opendata.aemet.es/openapi/api';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const AEMET_API_KEY = process.env.AEMET_API_KEY || '';
    const { dataInici, dataFi } = req.query;

    if (!dataInici || !dataFi) {
        return res.status(400).json({ error: 'Falten parametres' });
    }
    if (!AEMET_API_KEY) {
        return res.status(500).json({ error: 'AEMET_API_KEY no configurada' });
    }

    const idEstacio = '9771C';
    const dInici = dataInici + 'T00:00:00UTC';
    const dFi    = dataFi    + 'T23:59:59UTC';
    const urlPas1 = AEMET_BASE + '/valores/climatologicos/diarios/datos/fechaini/' + dInici + '/fechafin/' + dFi + '/estacion/' + idEstacio + '/?api_key=' + AEMET_API_KEY;

    let resPas1, meta, resPas2, dades;

    try {
        resPas1 = await fetch(urlPas1);
    } catch(e) {
        return res.status(500).json({ error: 'fetch pas1 failed: ' + e.message });
    }
    if (!resPas1.ok) return res.status(500).json({ error: 'AEMET pas1: ' + resPas1.status });

    try {
        meta = await resPas1.json();
    } catch(e) {
        return res.status(500).json({ error: 'parse pas1 failed: ' + e.message });
    }
    if (!meta.datos) return res.status(500).json({ error: 'sense datos URL', meta: meta });

    try {
        resPas2 = await fetch(meta.datos);
    } catch(e) {
        return res.status(500).json({ error: 'fetch pas2 failed: ' + e.message });
    }
    if (!resPas2.ok) return res.status(500).json({ error: 'AEMET pas2: ' + resPas2.status });

    try {
        dades = await resPas2.json();
    } catch(e) {
        return res.status(500).json({ error: 'parse pas2 failed: ' + e.message });
    }

    let total = 0;
    const dies = [];
    for (const d of dades) {
        const raw = (d.prec || '').replace(',', '.');
        const valor = raw === 'Ip' ? 0 : (parseFloat(raw) || 0);
        total += valor;
        dies.push({ data: d.fecha, valor: valor });
    }

    return res.status(200).json({
        total: parseFloat(total.toFixed(1)),
        estacio: 'Lleida 9771C',
        dies: dies
    });
}