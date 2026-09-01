// api/pluja-xema.js — Proxy Vercel per XEMA Meteocat
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Netejar la clau d'espais o cometes no desitjades
    const rawKey = process.env.METEOCAT_API_KEY || '';
    const apiKey = rawKey.trim().replace(/^["']|["']$/g, '');

    const { estacio, dataInici } = req.query;

    if (!estacio || !dataInici) {
        return res.status(400).json({ error: 'Falten paràmetres (estacio, dataInici)' });
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'METEOCAT_API_KEY no configurada a Vercel' });
    }

    const any = dataInici.substring(0, 4);
    const mes = dataInici.substring(5, 7);

    // Endpoint oficial XEMA per a estadístics/mesures diàries
    const url = `https://api.meteo.cat/xema/v1/estacions/${estacio}/variables/1300/diaris/${any}/${mes}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
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
            keyLength: apiKey.length,
            urlConsultada: url,
            data: data
        });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}