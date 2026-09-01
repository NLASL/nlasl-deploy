// api/pluja-xema.js — Proxy Vercel per XEMA Meteocat
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const METEOCAT_API_KEY = process.env.METEOCAT_API_KEY;
    const { estacio, dataInici, dataFi } = req.query;

    if (!estacio || !dataInici || !dataFi) {
        return res.status(400).json({ error: 'Falten parametres' });
    }

    if (!METEOCAT_API_KEY) {
        return res.status(500).json({ error: 'METEOCAT_API_KEY no està definida a Vercel' });
    }

    const any = dataInici.substring(0, 4);
    const mes = dataInici.substring(5, 7);
    const url = `https://api.meteo.cat/xema/v1/estacions/${estacio}/variables/estadistics/diaris/1300/${any}/${mes}`;

    try {
        const r = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': METEOCAT_API_KEY.trim()
            }
        });

        const data = await r.json();
        return res.status(r.status).json(data);
    } catch(e) {
        return res.status(500).json({ error: e.message });
    }
}