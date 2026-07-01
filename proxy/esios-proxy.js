/**
 * Cloudflare Worker — Proxy ESIOS/REE
 * 
 * Proxya las llamadas a la API de ESIOS sin exponer el token.
 * Deploy: https://workers.cloudflare.com/
 * 
 * Variables de entorno (Settings → Variables):
 *   ESIOS_TOKEN — tu token de api.esios.ree.es
 * 
 * Uso desde el frontend:
 *   fetch('https://esios-proxy.tu-subdominio.workers.dev/indicators/1001')
 *   → el worker añade el header x-api-key automáticamente
 */

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'esios-proxy' }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Solo permitir GET
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Construir URL destino: api.esios.ree.es + path + query
    const targetUrl = `https://api.esios.ree.es${url.pathname}${url.search}`;

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'Accept': 'application/json',
          'x-api-key': env.ESIOS_TOKEN,
          'Host': 'api.esios.ree.es'
        }
      });

      // Cache 5 minutos para reducir llamadas
      const body = await response.text();
      
      return new Response(body, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
          ...corsHeaders
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ 
        error: 'ESIOS API no disponible', 
        message: err.message 
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};
