// api/pluja-xema.js — Proxy Vercel per XEMA Meteocat
// Variable 1300 = Precipitació acumulada diària

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const METEOCAT_API_KEY = process.env.METEOCAT_API_KEY || '';
    const { estacio, dataInici, dataFi } = req.query;

    if (!estacio || !dataInici || !dataFi) {
        return res.status(400).json({ error: 'Falten parametres' });
    }
    if (!METEOCAT_API_KEY) {
        return res.status(200).json({ metadades: null, debug: 'sense_clau' });
    }

    const any = dataInici.substring(0, 4);
    const mes = dataInici.substring(5, 7);
    const url = `https://api.meteo.cat/xema/v1/estacions/${estacio}/variables/estadistics/diaris/1300/${any}/${mes}`;

    try {
        const r = await fetch(url, { headers: { 'X-Api-Key': METEOCAT_API_KEY } });
        const text = await r.text();
        return res.status(200).json({
            debug: 'ok',
            httpStatus: r.status,
            url: url,
            keyLen: METEOCAT_API_KEY.length,
            body: text.slice(0, 1000)
        });
    } catch(e) {
        return res.status(200).json({ metadades: null, debug: 'fetch_error', error: e.message });
    }
}