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

    const any = dataInici.substring(0, 4);
    const mes = dataInici.substring(5, 7);
    const url = `https://api.meteo.cat/xema/v1/estacions/${estacio}/variables/estadistics/diaris/1300/${any}/${mes}`;

    // Provar diferents formes d'enviar la clau
    const intents = [
        { 'X-Api-Key': METEOCAT_API_KEY },
        { 'x-api-key': METEOCAT_API_KEY },
        { 'X-Api-Key': METEOCAT_API_KEY, 'Content-Type': 'application/json' },
        { 'Authorization': `Bearer ${METEOCAT_API_KEY}` },
        { 'Authorization': METEOCAT_API_KEY },
    ];

    const resultats = [];
    for (const headers of intents) {
        try {
            const r = await fetch(url, { headers });
            const text = await r.text();
            resultats.push({ headers: Object.keys(headers).join(','), status: r.status, body: text.slice(0, 100) });
            if (r.status === 200) break;
        } catch(e) {
            resultats.push({ headers: Object.keys(headers).join(','), error: e.message });
        }
    }

    return res.status(200).json({ debug: 'intents', url, resultats });
}