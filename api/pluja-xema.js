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
            // Retornem 200 amb metadades buides per no fer petar el client JS
            return res.status(200).json({ metadades: [] });
        }

        const dades = await r.json();

        if (!Array.isArray(dades)) {
            return res.status(200).json({ metadades: [] });
        }

        const metadades = dades.map(d => ({
            data: d.data,
            valor: parseFloat(d.precipitacio) || 0
        }));

        return res.status(200).json({ metadades });

    } catch (e) {
        console.error("Error a /api/pluja-xema:", e.message);
        // Responem 200 buit per activar el següent fallback del frontend en pau
        return res.status(200).json({ metadades: [] });
    }
}