// api/pluja-xema.js — Proxy Vercel per XEMA Meteocat
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const apiKey = process.env.METEOCAT_API_KEY ? process.env.METEOCAT_API_KEY.trim() : '';
    const { estacio, dataInici, dataFi } = req.query;

    if (!estacio || !dataInici || !dataFi) {
        return res.status(400).json({ error: 'Falten paràmetres (estacio, dataInici, dataFi)' });
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'METEOCAT_API_KEY no està definida a Vercel' });
    }

    const any = dataInici.substring(0, 4);
    const mes = dataInici.substring(5, 7);
    const url = `https://api.meteo.cat/xema/v1/estacions/${estacio}/variables/estadistics/diaris/1300/${any}/${mes}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Api-Key': apiKey,
                'Accept': 'application/json'
            }
        });

        const status = response.status;
        const text = await response.text();

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = text;
        }

        return res.status(status).json({
            statusHttp: status,
            keyInfo: {
                length: apiKey.length,
                prefix: apiKey.substring(0, 4) + '...'
            },
            resposta: data
        });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}