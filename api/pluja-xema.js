// api/pluja-xema.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const apiKey = process.env.METEOCAT_API_KEY ? process.env.METEOCAT_API_KEY.trim() : '';
    const { estacio, dataInici } = req.query;

    if (!estacio || !dataInici) {
        return res.status(400).json({ error: 'Falten paràmetres (estacio, dataInici)' });
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'METEOCAT_API_KEY no configurada' });
    }

    const any = dataInici.substring(0, 4);
    const mes = dataInici.substring(5, 7);

    // Endpoint oficial XEMA per dades diàries per estació i variable
    const url = `https://api.meteo.cat/xema/v1/variables/mesures/diaris/${any}/${mes}?codiEstacio=${estacio}&codiVariable=1300`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Api-Key': apiKey,
                'Accept': 'application/json'
            }
        });

        const status = response.status;
        const data = await response.json();

        return res.status(status).json({
            statusHttp: status,
            urlConsultada: url,
            data: data
        });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}