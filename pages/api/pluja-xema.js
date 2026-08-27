export default async function handler(req, res) {
    const { estacio, dataInici, dataFi } = req.query;

    if (!estacio || !dataInici || !dataFi) {
        res.status(400).json({ error: "Falten paràmetres: estacio, dataInici, dataFi" });
        return;
    }

    const url = `https://api.meteo.cat/xema/v1/variables/precipitacio?codiEstacio=${estacio}&dataInici=${dataInici}&dataFi=${dataFi}`;

    try {
        const r = await fetch(url);

        if (!r.ok) {
            res.status(r.status).json({ error: "Error XEMA: " + r.status });
            return;
        }

        const data = await r.json();

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.status(200).json(data);

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
