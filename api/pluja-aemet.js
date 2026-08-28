const AEMET_BASE = 'https://opendata.aemet.es/openapi/api';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const AEMET_API_KEY = process.env.AEMET_API_KEY || '';

    const { lat, lon, dataInici, dataFi } = req.query;
    if (!lat || !lon || !dataInici || !dataFi) {
        return res.status(400).json({ error: 'Falten paràmetres: lat, lon, dataInici, dataFi' });
    }

    if (!AEMET_API_KEY) {
        return res.status(500).json({ error: 'AEMET_API_KEY no configurada a Vercel Environment Variables' });
    }

    try {
        // Pas 1: Obtenir inventari d'estacions
        const urlEstacions = `${AEMET_BASE}/valores/climatologicos/inventarioestaciones/todasestaciones/?api_key=${AEMET_API_KEY}`;
        const resEstacions = await fetch(urlEstacions);
        if (!resEstacions.ok) throw new Error('Error obtenint estacions AEMET: ' + resEstacions.status);
        const metaEstacions = await resEstacions.json();

        const resDadesEstacions = await fetch(metaEstacions.datos);
        if (!resDadesEstacions.ok) throw new Error('Error carregant dades d\'estacions');
        const estacions = await resDadesEstacions.json();

        const latN = parseFloat(lat);
        const lonN = parseFloat(lon);

        function parseCoorAemet(str) {
            if (!str) return NaN;
            const dir = str.slice(-1);
            const graus = parseInt(str.slice(0, -7) || '0');
            const mins  = parseInt(str.slice(-7, -5));
            const segs  = parseInt(str.slice(-5, -3));
            let dec = graus + mins / 60 + segs / 3600;
            if (dir === 'S' || dir === 'W') dec = -dec;
            return dec;
        }

        let estacioMesProper = null;
        let distanciaMin = Infinity;
        for (const e of estacions) {
            const eLat = parseCoorAemet(e.latitud);
            const eLon = parseCoorAemet(e.longitud);
            if (isNaN(eLat) || isNaN(eLon)) continue;
            const dist = Math.sqrt(Math.pow(eLat - latN, 2) + Math.pow(eLon - lonN, 2));
            if (dist < distanciaMin) {
                distanciaMin = dist;
                estacioMesProper = e;
            }
        }

        if (!estacioMesProper) throw new Error('No s\'ha trobat cap estació AEMET propera');

        // Pas 2: Dades diàries de l'estació trobada
        const dInici = `${dataInici}T00:00:00UTC`;
        const dFi    = `${dataFi}T23:59:59UTC`;
        const idEstacio = estacioMesProper.indicativo;

        const urlDades = `${AEMET_BASE}/valores/climatologicos/diarios/datos/fechaini/${dInici}/fechafin/${dFi}/estacion/${idEstacio}/?api_key=${AEMET_API_KEY}`;
        const resMeta = await fetch(urlDades);
        if (!resMeta.ok) throw new Error('Error obtenint dades AEMET: ' + resMeta.status);
        const meta = await resMeta.json();

        const resDades = await fetch(meta.datos);
        if (!resDades.ok) throw new Error('Error carregant fitxer de dades AEMET');
        const dades = await resDades.json();

        let total = 0;
        const dies = [];
        for (const d of dades) {
            const valor = d.prec === 'Ip' ? 0 : parseFloat((d.prec || '0').replace(',', '.'));
            if (!isNaN(valor)) {
                total += valor;
                dies.push({ data: d.fecha, valor });
            }
        }

        return res.status(200).json({
            total: parseFloat(total.toFixed(1)),
            estacio: estacioMesProper.nombre,
            distanciaKm: parseFloat((distanciaMin * 111).toFixed(1)),
            dies
        });

    } catch (e) {
        console.error('Error a /api/pluja-aemet:', e.message);
        return res.status(500).json({ error: e.message });
    }
}