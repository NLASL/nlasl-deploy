// api/pluja-aemet.js
// URL base AEMET correcta (sense /openapi)
const AEMET_BASE = 'https://opendata.aemet.es/openapi/api';
const ESTACIO = '9771C';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const AEMET_API_KEY = process.env.AEMET_API_KEY || '';
    const { dataInici, dataFi } = req.query;

    if (!dataInici || !dataFi) return res.status(400).json({ error: 'Falten parametres' });
    if (!AEMET_API_KEY) return res.status(500).json({ error: 'AEMET_API_KEY no configurada' });

    // Format timestamps AEMET
    const dInici = dataInici + 'T00:00:00UTC';
    const dFi    = dataFi    + 'T23:59:59UTC';

    // Provar les dues URL base possibles
    const baseUrls = [
        'https://opendata.aemet.es/openapi/api',
        'https://opendata.aemet.es/api'
    ];

    for (const base of baseUrls) {
        const urlPas1 = `${base}/valores/climatologicos/diarios/datos/fechaini/${encodeURIComponent(dInici)}/fechafin/${encodeURIComponent(dFi)}/estacion/${ESTACIO}/?api_key=${AEMET_API_KEY}`;

        try {
            const resPas1 = await fetch(urlPas1);
            const text1 = await resPas1.text();

            if (text1.includes('<!DOCTYPE') || text1.includes('<html')) continue; // HTML = 404

            const meta = JSON.parse(text1);
            if (meta.estado === 404 || !meta.datos) continue;

            const resPas2 = await fetch(meta.datos);
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

            return res.status(200).json({
                total: parseFloat(total.toFixed(1)),
                estacio: ESTACIO,
                baseUsada: base,
                dies
            });

        } catch(e) { continue; }
    }

    return res.status(500).json({ error: 'Totes les URLs AEMET han fallat' });
}