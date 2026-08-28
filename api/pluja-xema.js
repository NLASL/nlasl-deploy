export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    const { estacio, dataInici, dataFi } = req.query;

    if (!estacio || !dataInici || !dataFi) {
        return res.status(400).json({ error: "Falten paràmetres: estacio, dataInici, dataFi" });
    }

    try {
        const iniStr = `${dataInici}T00:00:00.000`;
        const fiStr  = `${dataFi}T23:59:59.999`;

        const url = `https://data.gencat.cat/resource/2444-7v3d.json` +
                    `?codi_estacio=${encodeURIComponent(estacio)}` +
                    `&$where=data>=${encodeURIComponent(`'${iniStr}'`)} and data<=${encodeURIComponent(`'${fiStr}'`)}`;

        const r = await fetch(url);

        if (!r.ok) {
            return res.status(200).json({ metadades: null });
        }

        const dades = await r.json();

        if (!Array.isArray(dades) || dades.length === 0) {
            return res.status(200).json({ metadades: null });
        }

        const metadades = dades.map(d => ({
            data: d.data,
            valor: parseFloat(d.precipitacio) || 0
        }));

        return res.status(200).json({ metadades });

    } catch (e) {
        console.error("Error a /api/pluja-xema:", e.message);
        return res.status(200).json({ metadades: null });
    }
}