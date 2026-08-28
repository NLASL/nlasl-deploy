export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    const { estacio, dataInici, dataFi } = req.query;

    if (!estacio || !dataInici || !dataFi) {
        return res.status(400).json({ error: "Falten paràmetres: estacio, dataInici, dataFi" });
    }

    // Utilitzem Dades Obertes de Gencat (XAC) - Gratuït i sense API Key
    const iniStr = `${dataInici}T00:00:00`;
    const fiStr  = `${dataFi}T23:59:59`;
    const url = `https://data.gencat.cat/resource/2444-7v3d.json?codi_estacio=${estacio}&$where=data%20between%20'${iniStr}'%20and%20'${fiStr}'`;

    try {
        const r = await fetch(url);

        if (!r.ok) {
            return res.status(r.status).json({ error: "Error Gencat XAC: " + r.status });
        }

        const dades = await r.json();

        // Mantenim l'estructura esperada pel teu client (metadades amb el camp 'valor')
        const metadades = dades.map(d => ({
            data: d.data,
            valor: parseFloat(d.precipitacio) || 0
        }));

        return res.status(200).json({ metadades });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}