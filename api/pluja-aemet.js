// api/pluja-aemet.js
const AEMET_BASE = 'https://opendata.aemet.es/opendata/api';
const ESTACIO = '9771C'; // Lleida Observatori

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const AEMET_API_KEY = process.env.AEMET_API_KEY || '';
    const { dataInici, dataFi } = req.query;

    if (!dataInici || !dataFi) return res.status(400).json({ error: 'Falten parametres' });
    if (!AEMET_API_KEY) return res.status(500).json({ error: 'AEMET_API_KEY no configurada' });

    // AEMET té ~2 dies de retard — limitar dataFi a avui-2 en UTC
    const ara = new Date();
    const limitDate = new Date(ara);
    limitDate.setUTCDate(limitDate.getUTCDate() - 2);
    const limit = limitDate.toISOString().substring(0, 10); // YYYY-MM-DD en UTC

    const dataFiReal = dataFi > limit ? limit : dataFi;

    if (dataInici > dataFiReal) {
        return res.status(200).json({ total: 0, estacio: ESTACIO, dies: [], debug: `limit=${limit}` });
    }

    const dInici = dataInici + 'T00:00:00UTC';
    const dFi    = dataFiReal + 'T23:59:59UTC';
    const urlPas1 = `${AEMET_BASE}/valores/climatologicos/diarios/datos/fechaini/${dInici}/fechafin/${dFi}/estacion/${ESTACIO}`;

    try {
        const resPas1 = await fetch(urlPas1, { headers: { 'api_key': AEMET_API_KEY } });
        const text1 = await resPas1.text();
        if (text1.includes('<!DOCTYPE') || text1.includes('<html')) {
            return res.status(500).json({ error: 'HTML rebut', status: resPas1.status });
        }
        const meta = JSON.parse(text1);
        if (meta.estado && meta.estado !== 200) {
            return res.status(500).json({ error: 'AEMET: ' + meta.descripcion, estado: meta.estado, dFi, limit });
        }
        if (!meta.datos) return res.status(500).json({ error: 'Sense URL datos' });

        const resPas2 = await fetch(meta.datos, { headers: { 'api_key': AEMET_API_KEY } });
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