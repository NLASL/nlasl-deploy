// api/pluja-aemet.js
const AEMET_BASE = 'https://opendata.aemet.es/opendata/api';
const ESTACIO = '9771C'; // Lleida Observatori

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const AEMET_API_KEY = process.env.AEMET_API_KEY || '';
    const { dataInici, dataFi } = req.query;

    if (!dataInici || !dataFi) return res.status(400).json({ error: 'Falten parametres' });
    if (!AEMET_API_KEY) return res.status(500).json({ error: 'AEMET_API_KEY no configurada' });

    // AEMET té ~2 dies de retard i no accepta dates futures..
    const ahir = new Date();
    ahir.setDate(ahir.getDate() - 2);
    const dataFiReal = dataFi > ahir.toISOString().substring(0, 10)
        ? ahir.toISOString().substring(0, 10)
        : dataFi;

    if (dataInici > dataFiReal) {
        return res.status(200).json({ total: 0, estacio: ESTACIO, dies: [] });
    }

    const dInici = dataInici + 'T00:00:00UTC';
    const dFi    = dataFiReal + 'T23:59:59UTC';
    const urlPas1 = `${AEMET_BASE}/valores/climatologicos/diarios/datos/fechaini/${dInici}/fechafin/${dFi}/estacion/${ESTACIO}`;

    try {
        // API key com a header, no query param
        const resPas1 = await fetch(urlPas1, {
            headers: { 'api_key': AEMET_API_KEY }
        });
        const text1 = await resPas1.text();
        if (text1.includes('<!DOCTYPE') || text1.includes('<html')) {
            return res.status(500).json({ error: 'HTML rebut pas1', status: resPas1.status, url: urlPas1 });
        }
        const meta = JSON.parse(text1);
        if (meta.estado && meta.estado !== 200) {
            return res.status(500).json({ error: 'AEMET: ' + meta.descripcion, estado: meta.estado });
        }
        if (!meta.datos) return res.status(500).json({ error: 'Sense URL datos', meta });

        // Pas 2: obtenir les dades reals
        const resPas2 = await fetch(meta.datos, {
            headers: { 'api_key': AEMET_API_KEY }
        });
        const text2 = await resPas2.text();
        const dades = JSON.parse(text2);

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