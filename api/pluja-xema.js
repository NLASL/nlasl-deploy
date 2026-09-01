// api/pluja-xema.js — Proxy Vercel per XEMA Meteocat
// Variable 35 = Precipitació diària (mm)
// Endpoint estadístics diaris: /xema/v1/estadistics/diaris/{variable}/{any}/{mes}?codiEstacio={codi}.

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const METEOCAT_API_KEY = process.env.METEOCAT_API_KEY || '';
    const { estacio, dataInici, dataFi } = req.query;

    if (!estacio || !dataInici || !dataFi) {
        return res.status(400).json({ error: 'Falten parametres: estacio, dataInici, dataFi' });
    }
    if (!METEOCAT_API_KEY) {
        return res.status(200).json({ metadades: null }); // sense clau → fallback
    }

    const headers = { 'X-Api-Key': METEOCAT_API_KEY };
    const BASE = 'https://api.meteo.cat/xema/v1';
    const VAR_PREC = 35; // Precipitació diària

    try {
        const dInici = new Date(dataInici);
        const dFi    = new Date(dataFi);

        // Recollir tots els mesos del rang
        const mesosAConsultar = new Set();
        const d = new Date(dInici);
        while (d <= dFi) {
            const any = d.getFullYear();
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            mesosAConsultar.add(`${any}-${mes}`);
            d.setMonth(d.getMonth() + 1);
        }

        let total = 0;
        const dies = [];

        for (const anyMes of mesosAConsultar) {
            const [any, mes] = anyMes.split('-');
            const url = `${BASE}/estadistics/diaris/${VAR_PREC}/${any}/${mes}?codiEstacio=${estacio}`;

            const r = await fetch(url, { headers });
            const text = await r.text();
            if (!r.ok) {
                console.error('XEMA error:', r.status, text.slice(0, 200));
                continue;
            }

            let dades;
            try { dades = JSON.parse(text); } catch(e) {
                console.error('XEMA parse error:', text.slice(0, 200));
                continue;
            }

            console.log('XEMA resposta tipus:', typeof dades, Array.isArray(dades) ? 'array['+dades.length+']' : JSON.stringify(dades).slice(0, 200));

            // Resposta: array d'estacions, cada una amb variables i estadístics
            const estacioData = Array.isArray(dades) ? dades.find(e => e.codi === estacio) : null;
            if (!estacioData) { console.log('XEMA estació no trobada a resposta'); continue; }

            const varData = (estacioData.variables || []).find(v => v.codi === VAR_PREC);
            if (!varData) continue;

            for (const est of (varData.estadistics || [])) {
                const data = est.data ? est.data.substring(0, 10) : null;
                if (!data) continue;
                if (data < dataInici || data > dataFi) continue;

                const valor = parseFloat(est.valor) || 0;
                total += valor;
                dies.push({ data, valor });
            }
        }

        if (dies.length === 0) {
            return res.status(200).json({ metadades: null }); // sense dades → fallback
        }

        return res.status(200).json({
            metadades: dies,
            total: parseFloat(total.toFixed(1))
        });

    } catch(e) {
        console.error('Error pluja-xema:', e.message);
        return res.status(200).json({ metadades: null });
    }
}