// api/pluja-xema.js — Proxy Vercel per XEMA
// Meteocat bloqueja des de Vercel (AWS headers) — retorna null per activar fallback AEMET

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    // XEMA no disponible des de Vercel (bloqueig AWS headers)
    // El client passarà a AEMET com a fallback
    return res.status(200).json({ metadades: null });
}