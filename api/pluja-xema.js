// api/pluja-xema.js
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const apiKey = process.env.METEOCAT_API_KEY ? process.env.METEOCAT_API_KEY.trim() : '';
    const { estacio, dataInici, dataFi } = req.query;

    if (!estacio || !dataInici) {
        return res.status(400).json({ error: 'Falten paràmetres (estacio, dataInici)' });
    }

    if (!apiKey) {
        return res.status(500).json({ error: 'METEOCAT_API_KEY no configurada' });
    }

    const any = dataInici.substring(0, 4);
    const mes = dataInici.substring(5, 7);
    const dia = dataInici.substring(8, 10);

    // Consulta de dades per dia/mes a l'API XEMA (Variable 1300 = Pluja 24h)
    // Prova 1: Endpoint de valors diaris per any i mes
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
            urlConsultada: url,
            data: data
        });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}