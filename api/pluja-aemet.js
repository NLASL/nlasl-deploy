// api/pluja-aemet.js
const AEMET_BASE = 'https://opendata.aemet.es/openapi/api';
const ESTACIO = '9771C'; // Lleida

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const AEMET_API_KEY = process.env.AEMET_API_KEY || '';
    const { dataInici, dataFi } = req.query;

    if (!dataInici || !dataFi) {
        return res.status(400).json({ error: 'Falten parametres: dataInici, dataFi' });
    }
    if (!AEMET_API_KEY) {
        return res.status(500).json({ error: 'AEMET_API_KEY no configurada' });
    }

    // AEMET accepta el format: YYYY-MM-DDTHH:MM:SSUTC (sense espais ni +)
    const dInici = dataInici + 'T00%3A00%3A00UTC';
    const dFi    = dataFi    + 'T23%3A59%3A59UTC';

    const urlPas1 = AEMET_BASE + '/valores/climatologicos/diarios/datos/fechaini/' + dInici + '/fechafin/' + dFi + '/estacion/' + ESTACIO + '/?api_key=' + AEMET_API_KEY;

    try {
        const resPas1 = await fetch(urlPas1);
        const text1 = await resPas1.text();

        let meta;
        try { meta = JSON.parse(text1); } catch(e) {
            return res.status(500).json({ error: 'Parse error pas1', raw: text1.slice(0, 200) });
        }

        if (meta.estado && meta.estado !== 200) {
            return res.status(500).json({ error: 'AEMET error: ' + meta.descripcion, estado: meta.estado });
        }
        if (!meta.datos) {
            return res.status(500).json({ error: 'Sense URL datos', meta });
        }

        const resPas2 = await fetch(meta.datos);
        const text2 = await resPas2.text();
        let dades;
        try { dades = JSON.parse(text2); } catch(e) {
            return res.status(500).json({ error: 'Parse error pas2', raw: text2.slice(0, 200) });
        }

        let total = 0;
        const dies = [];
        for (const d of dades) {
            const raw = (d.prec || '').replace(',', '.');
            const valor = raw === 'Ip' ? 0 : (parseFloat(raw) || 0);
            total += valor;
            dies.push({ data: d.fecha, valor });
        }

        return res.status(200).json({ total: parseFloat(total.toFixed(1)), estacio: ESTACIO, dies });

    } catch(e) {
        return res.status(500).json({ error: e.message });
    }
}