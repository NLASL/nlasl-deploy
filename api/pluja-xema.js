// api/pluja-xema.js
import https from 'https';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const apiKey = process.env.METEOCAT_API_KEY ? process.env.METEOCAT_API_KEY.trim() : '';
    const { estacio, dataInici } = req.query;

    if (!estacio || !dataInici) {
        return res.status(400).json({ error: 'Falten paràmetres' });
    }

    const any = dataInici.substring(0, 4);
    const mes = dataInici.substring(5, 7);
    const path = `/xema/v1/estacions/${estacio}/variables/1300/diaris/${any}/${mes}`;

    const options = {
        hostname: 'api.meteo.cat',
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            'X-Api-Key': apiKey,
            'Accept': 'application/json'
        }
    };

    return new Promise((resolve) => {
        const request = https.request(options, (response) => {
            let data = '';
            response.on('data', (chunk) => { data += chunk; });
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    res.status(response.statusCode).json({ statusHttp: response.statusCode, data: parsed });
                } catch (e) {
                    res.status(response.statusCode).send(data);
                }
                resolve();
            });
        });

        request.on('error', (error) => {
            res.status(500).json({ error: error.message });
            resolve();
        });

        request.end();
    });
}