// api/pluja-aemet.js — Proxy Vercel per obtenir pluja real d'AEMET
// Usa l'endpoint de valors climatològics diaris per una estació fixa

const AEMET_BASE = 'https://opendata.aemet.es/openapi/api';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const AEMET_API_KEY = process.env.AEMET_API_KEY || '';
    const { dataInici, dataFi } = req.query;

    if (!dataInici || !dataFi) {
        return res.status(400).json({ error: 'Falten parametres: dataInici, dataFi' });
    }
    if (!AEMET_API_KEY) {
        return res.status(500).json({ error: 'AEMET_API_KEY no configurada' });
    }

    // Provar múltiples codis d'estació de Lleida fins trobar-ne un que funcioni
    const estacions = ['9771C', '9771', 'B278X', '9771A'];

    for (const idEstacio of estacions) {
        try {
            const dInici = dataInici + 'T00:00:00UTC';
            const dFi    = dataFi    + 'T23:59:59UTC';
            const urlPas1 = `${AEMET_BASE}/valores/climatologicos/diarios/datos/fechaini/${dInici}/fechafin/${dFi}/estacion/${idEstacio}/?api_key=${AEMET_API_KEY}`;

            const resPas1 = await fetch(urlPas1);
            const meta = await resPas1.json();

            // Si retorna 404 o error, provar la següent estació
            if (!resPas1.ok || meta.estado === 404 || !meta.datos) {
                continue;
            }

            const resPas2 = await fetch(meta.datos);
            if (!resPas2.ok) continue;

            const dades = await resPas2.json();
            if (!Array.isArray(dades) || dades.length === 0) continue;

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
                estacio: idEstacio,
                dies
            });

        } catch(e) {
            continue;
        }
    }

    // Totes les estacions han fallat
    return res.status(500).json({ error: 'Cap estació AEMET disponible: ' + estacions.join(', ') });
}