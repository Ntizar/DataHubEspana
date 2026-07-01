/**
 * DataHub España — Módulo de datos
 * 
 * Factory function para Open-Meteo + cache localStorage + error handling.
 * Intercepts todas las llamadas fetch a open-meteo.com automáticamente.
 */
(function() {
    'use strict';

    const DataHub = window.DataHub = {};

    // ===== CACHE =====
    const CACHE_PREFIX = 'dh_cache_';
    const DEFAULT_TTL = 600000; // 10 minutos

    function getCached(key) {
        try {
            const item = localStorage.getItem(CACHE_PREFIX + key);
            if (!item) return null;
            const { data, ts, ttl } = JSON.parse(item);
            if (Date.now() - ts > ttl) {
                localStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    function setCached(key, data, ttl = DEFAULT_TTL) {
        try {
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now(), ttl }));
        } catch {
            // localStorage lleno — limpiar cache viejo
            cleanCache();
            try {
                localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now(), ttl }));
            } catch {}
        }
    }

    function cleanCache() {
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
            keys.forEach(k => {
                try {
                    const { ts, ttl } = JSON.parse(localStorage.getItem(k));
                    if (Date.now() - ts > ttl) localStorage.removeItem(k);
                } catch {
                    localStorage.removeItem(k);
                }
            });
        } catch {}
    }

    DataHub.cache = { get: getCached, set: setCached, clean: cleanCache };

    // ===== FETCH CON CACHE + ERROR HANDLING =====
    async function fetchWithCache(url, options = {}, ttl = DEFAULT_TTL) {
        const cacheKey = url;
        const cached = getCached(cacheKey);
        if (cached) return cached;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const resp = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeout);

            if (!resp.ok) {
                console.warn(`DataHub: ${resp.status} en ${url.substring(0, 80)}`);
                return null;
            }

            const data = await resp.json();
            setCached(cacheKey, data, ttl);
            return data;
        } catch (err) {
            if (err.name === 'AbortError') {
                console.warn(`DataHub: timeout en ${url.substring(0, 80)}`);
            } else {
                console.warn(`DataHub: error en ${url.substring(0, 80)}: ${err.message}`);
            }
            return null;
        }
    }

    DataHub.fetchWithCache = fetchWithCache;

    // ===== FACTORY OPEN-METEO =====
    const OM_BASE = 'https://api.open-meteo.com/v1';

    /**
     * Construye URL de Open-Meteo
     * @param {string} endpoint - forecast, marine, air-quality, flood
     * @param {object} params - { latitude, longitude, current, hourly, daily, ... }
     * @returns {string} URL completa
     */
    function buildOpenMeteoURL(endpoint, params) {
        const query = Object.entries(params)
            .filter(([_, v]) => v !== undefined && v !== null)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&');
        return `${OM_BASE}/${endpoint}?${query}`;
    }

    /**
     * Fetch Open-Meteo para una ubicación
     * @param {string} endpoint - forecast, marine, air-quality, flood
     * @param {number} lat 
     * @param {number} lon 
     * @param {object} extraParams - current, hourly, daily, etc.
     * @returns {Promise<object|null>}
     */
    async function fetchOpenMeteo(endpoint, lat, lon, extraParams = {}) {
        const params = { latitude: lat, longitude: lon, ...extraParams };
        const url = buildOpenMeteoURL(endpoint, params);
        return fetchWithCache(url);
    }

    /**
     * Fetch Open-Meteo batch para múltiples ciudades
     * @param {string} endpoint 
     * @param {Array<{lat, lon, name}>} cities 
     * @param {object} extraParams 
     * @returns {Promise<Array<{city, data, valid}>>}
     */
    async function fetchOpenMeteoBatch(endpoint, cities, extraParams = {}) {
        const promises = cities.map(async (city) => {
            const data = await fetchOpenMeteo(endpoint, city.lat, city.lon, extraParams);
            return { city, data, valid: !!data };
        });
        return Promise.all(promises);
    }

    DataHub.fetchOpenMeteo = fetchOpenMeteo;
    DataHub.fetchOpenMeteoBatch = fetchOpenMeteoBatch;
    DataHub.buildOpenMeteoURL = buildOpenMeteoURL;

    // ===== INTERCEPTOR GLOBAL =====
    // Intercepta todas las llamadas fetch a open-meteo.com y les añade cache + timeout
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        const urlStr = typeof url === 'string' ? url : url?.url || '';

        // Solo interceptar Open-Meteo
        if (urlStr.includes('open-meteo.com')) {
            // Si ya tiene signal, respetarlo
            if (!options.signal) {
                options.signal = AbortSignal.timeout(15000);
            }
            // Usar cache
            const cached = getCached(urlStr);
            if (cached) {
                return Promise.resolve(new Response(JSON.stringify(cached), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }
            return originalFetch.call(this, url, options).then(resp => {
                if (resp.ok) {
                    // Clonar y cachear
                    const clone = resp.clone();
                    clone.json().then(data => {
                        setCached(urlStr, data);
                    }).catch(() => {});
                }
                return resp;
            }).catch(err => {
                console.warn(`DataHub interceptor: ${err.message} en ${urlStr.substring(0, 80)}`);
                throw err;
            });
        }

        return originalFetch.call(this, url, options);
    };

    // ===== ERROR UI =====
    DataHub.showError = function(containerId, message = 'Datos no disponibles en este momento') {
        const el = document.getElementById(containerId);
        if (el) {
            el.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;">
                <div style="font-size:2rem;margin-bottom:0.5rem;">📡</div>
                <div style="font-size:0.9rem;">${message}</div>
            </div>`;
        }
    };

    DataHub.showLoading = function(containerId) {
        const el = document.getElementById(containerId);
        if (el) {
            el.innerHTML = `<div style="text-align:center;padding:2rem;color:#94a3b8;">
                <div style="font-size:1.5rem;animation:spin 1s linear infinite;">⏳</div>
            </div>`;
        }
    };

    // ===== HEALTH CHECK =====
    DataHub.healthCheck = async function() {
        const apis = [
            { name: 'Open-Meteo Forecast', url: 'https://api.open-meteo.com/v1/forecast?latitude=40.42&longitude=-3.70&current=temperature_2m' },
            { name: 'Open-Meteo Air Quality', url: 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40.42&longitude=-3.70&current=pm2_5' },
            { name: 'Open-Meteo Marine', url: 'https://marine-api.open-meteo.com/v1/marine?latitude=40.42&longitude=-3.70&current=wave_height' },
            { name: 'Open-Meteo Flood', url: 'https://flood-api.open-meteo.com/v1/flood?latitude=40.42&longitude=-3.70&daily=river_discharge' },
        ];

        const results = [];
        for (const api of apis) {
            try {
                const resp = await originalFetch(api.url, { signal: AbortSignal.timeout(10000) });
                results.push({ name: api.name, status: resp.ok ? 'ok' : 'error', code: resp.status });
            } catch {
                results.push({ name: api.name, status: 'error', code: 0 });
            }
        }
        return results;
    };

    // ===== TOPOJSON LOADER =====
    /**
     * Carga un archivo TopoJSON y lo convierte a GeoJSON para Leaflet.
     * Si no existe el .topojson, intenta el .json (GeoJSON original).
     * @param {string} path - ruta sin extensión (ej: 'data/geo/provincias')
     * @returns {Promise<object>} GeoJSON
     */
    DataHub.loadGeo = async function(path) {
        // Intentar TopoJSON primero (más pequeño)
        try {
            const resp = await fetch(path + '.topojson');
            if (resp.ok) {
                const topo = await resp.json();
                const key = Object.keys(topo.objects)[0];
                return topojson.feature(topo, topo.objects[key]);
            }
        } catch {}
        // Fallback a GeoJSON
        try {
            const resp = await fetch(path + '.json');
            if (resp.ok) return await resp.json();
        } catch {}
        return null;
    };

    // Limpiar cache al cargar
    cleanCache();

    console.log('DataHub módulo cargado — cache + error handling activos');
})();
