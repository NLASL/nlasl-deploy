// api/pluja-xema.js — Proxy Vercel per XEMA Meteocat
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

    // Diagnosi: fer una sola crida i retornar la resposta crua
    const any = dataInici.substring(0, 4);
    const mes = dataInici.substring(5, 7);
    const url = `https://api.meteo.cat/xema/v1/estadistics/diaris/35/${any}/${mes}?codiEstacio=${estacio}`;

    try {
        const r = await fetch(url, { headers: { 'X-Api-Key': METEOCAT_API_KEY } });
        const text = await r.text();
        return res.status(200).json({
            debug: 'resposta_meteocat',
            httpStatus: r.status,
            url: url,
            body: text.slice(0, 1000)
        });
    } catch(e) {
        return res.status(200).json({ metadades: null, debug: 'fetch_error', error: e.message });
    }
}
