// main.js — DataHub España
// Orquestador: init + event wiring
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

// ===== TABS (click en pestañas) =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        const tab = btn.getAttribute('data-tab');
        document.getElementById('tab-' + tab).classList.add('active');
        // Mostrar mapa solo en pestañas que lo necesitan
        const mapContainer = document.getElementById('map-container');
        const mapTabs = ['panel', 'poblacion', 'gbfs', 'puertos', 'calidad-aire', 'aireext', 'polen', 'suelo', 'tempsuelo', 'presion', 'visibilidad', 'nubosidad', 'rocio', 'termica', 'lluvia', 'inundaciones', 'nieve', 'evapo', 'rafagas', 'eolica', 'sol', 'uv', 'radiacion', 'fuego', 'cape', 'mar', 'mareas'];
        if (mapTabs.includes(tab)) {
            if (mapContainer) mapContainer.style.display = 'block';
        } else {
            if (mapContainer) mapContainer.style.display = 'none';
        }
        // Lazy-render charts only when tab is shown
        if (tab === 'ambiente' && !window.__ambienteRendered) { window.__ambienteRendered = true; renderParks(); }
        if (tab === 'catastro' && !window.__catastroRendered) { window.__catastroRendered = true; renderCatastro(); }
        if (tab === 'poblacion' && !window.__poblacionRendered) { window.__poblacionRendered = true; renderPopulation(); }
        if (tab === 'economia-det' && !window.__economiaDetRendered) { window.__economiaDetRendered = true; renderEconomyDetail(); }
        if (tab === 'calidad-aire' && !window.__calidadAireRendered) { window.__calidadAireRendered = true; fetchAirQuality(); }
        // Resize charts when switching tabs
        setTimeout(() => {
            Object.values(charts).forEach(c => { if (c && c.resize) c.resize(); });
        }, 100);
    });
});

document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Escape: close province detail or search
    if (e.key === 'Escape') {
        if (document.getElementById('province-detail').classList.contains('open')) {
            closeProvinceDetail();
        }
    }
    // Ctrl+B: toggle sidebar
    if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        document.getElementById('toggle-sidebar').click();
    }
    // 1-8: switch tabs
    if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.target.closest('input')) {
        const tabKeys = { '1': 'panel', '2': 'energia', '3': 'clima', '4': 'agua', '5': 'economia', '6': 'ambiente', '7': 'catastro', '8': 'poblacion' };
        if (tabKeys[e.key]) {
            const btn = document.querySelector(`[data-tab="${tabKeys[e.key]}"]`);
            if (btn) btn.click();
        }
    }
});

document.getElementById('detail-close').addEventListener('click', closeProvinceDetail);
document.getElementById('btn-back').addEventListener('click', closeProvinceDetail);
document.getElementById('province-context-clear').addEventListener('click', closeProvinceDetail);

function closeProvinceDetail() {
    document.getElementById('province-detail').classList.remove('open');
    selectedProvince = null;

    // Hide province context bar
    document.getElementById('province-context').classList.remove('visible');

    if (geoLayer) geoLayer.resetStyle();
    if (map) {
        map.fitBounds([[36.0, -9.5], [44.0, 4.0]], { padding: [20, 20] });
    }

    // Restore default values in tabs
    restoreDefaultTabValues();
}

document.addEventListener('DOMContentLoaded', () => {
    const sel = document.getElementById('ciudad-clima-select');
    if (sel) {
        sel.addEventListener('change', (e) => fetchClimaCiudad(e.target.value));
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const pollenSelect = document.getElementById('pollen-city-select');
    if (pollenSelect) {
        pollenSelect.addEventListener('change', () => {
            const [lat, lon] = pollenSelect.value.split(',').map(Number);
            fetchPollen(lat, lon);
        });
    }
});

async function init() {
    initMap();

    // Load provinces (essential)
    await loadProvinces();

    // Fire all data fetches in parallel
    const dataPromises = [
        fetchEnergyData(),
        fetchWeather(),
        fetchSeismic()
    ];

    Promise.allSettled(dataPromises).then(results => {
        const elapsed = Date.now() - loadStartTime;
        const delay = Math.max(300, 800 - elapsed);

        setTimeout(() => {
            document.getElementById('loading-overlay').classList.add('hidden');
            showToast('Dashboard cargado correctamente', 'success', 3000);
        }, delay);
    });

    // Render static content immediately
    renderWater();
    renderEconomy();
    // renderPopulation, renderEconomyDetail, renderParks, fetchAirQuality are lazy-rendered on tab click
    renderPorts();
    fetchAireExt('all');
    fetchDemography();
    fetchPollen();
    fetchFlood();
    fetchSoil();
    fetchTempSuelo();
    fetchForecast();
    // Fetch AQI for Madrid (default panel KPI)
    fetchAirQuality(40.4168, -3.7038);
    
    // Aire Ext. city selector event
    const aireextCitySelect = document.getElementById('aireext-city-select');
    if (aireextCitySelect) {
        aireextCitySelect.addEventListener('change', (e) => {
            fetchAireExt(e.target.value);
        });
    }
    
    // Init CCAA grids
    generateCCAATab('clima');
    generateCCAATab('aire');
    generateCCAATab('nieve');
    generateCCAATab('mar');
    fetchGBFS();
    // Nieve selector event
    document.getElementById('nieve-station-select').addEventListener('change', (e) => {
        selectedStationIdx = parseInt(e.target.value);
        updateNieveChart();
    });
    // Mar coast selector event
    const marCoastSelect = document.getElementById('mar-coast-select');
    if (marCoastSelect) {
        marCoastSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            // Re-render chart for selected coast using latest results
            if (window._marResults) {
                renderMarChartFor(window._marResults, val);
            }
        });
    }
    // Visibilidad selector event
    const visCitySelect = document.getElementById('vis-city-select');
    if (visCitySelect) {
        visCitySelect.addEventListener('change', (e) => {
            fetchVisibilidad(e.target.value);
        });
    }
    // Nubosidad selector event
    const nuboCitySelect = document.getElementById('nubo-city-select');
    if (nuboCitySelect) {
        nuboCitySelect.addEventListener('change', (e) => {
            fetchNubosidad(e.target.value);
        });
    }
    // Eólica selector event
    const eolicaCitySelect = document.getElementById('eolica-city-select');
    if (eolicaCitySelect) {
        eolicaCitySelect.addEventListener('change', () => {
            fetchEolica();
        });
    }
    // CAPE selector event
    const capeCitySelect = document.getElementById('cape-city-select');
    if (capeCitySelect) {
        capeCitySelect.addEventListener('change', () => {
            fetchCAPE();
        });
    }
    fetchNieve();
    fetchMar();
    fetchUV();
    fetchVisibilidad();
    fetchRafagas();
    // Lluvia selector event
    const lluviaCitySelect = document.getElementById('lluvia-city-select');
    if (lluviaCitySelect) {
        // Populate city options from LLUVIA_CITIES
        LLUVIA_CITIES.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city.name;
            opt.textContent = city.name;
            lluviaCitySelect.appendChild(opt);
        });
        lluviaCitySelect.addEventListener('change', (e) => {
            fetchLluvia();
        });
    }
    fetchLluvia();
    fetchPresion();
    fetchFuego();
    // Evapotranspiración selector event
    const evapoProvinceSelect = document.getElementById('evapo-province-select');
    if (evapoProvinceSelect) {
        // Populate province options from EVAPO_CITIES unique cc values
        const provinces = [...new Set(EVAPO_CITIES.map(c => c.cc))].sort();
        provinces.forEach(prov => {
            const opt = document.createElement('option');
            opt.value = prov;
            opt.textContent = prov;
            evapoProvinceSelect.appendChild(opt);
        });
        evapoProvinceSelect.addEventListener('change', (e) => {
            fetchEvapo(e.target.value);
        });
    }
    fetchEvapo();
    fetchCAPE();
    fetchSol();
    // Event listener: selector de ciudad en pestaña Sol
    const solSelector = document.getElementById('sol-city-select');
    if (solSelector) {
        solSelector.addEventListener('change', () => fetchSol());
    }
    // Rocío selector event
    const rocioCitySelect = document.getElementById('rocio-city-select');
    if (rocioCitySelect) {
        rocioCitySelect.addEventListener('change', (e) => {
            fetchRocio(e.target.value);
        });
    }
    // Termica selector event
    const termCitySelect = document.getElementById('term-city-select');
    if (termCitySelect) {
        termCitySelect.addEventListener('change', () => fetchTermica());
    }
    fetchRocio();
    fetchRadiacion();
    fetchTermica();
    fetchMareas();
    fetchEolica();
    fetchNubosidad();
}

window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (map) map.invalidateSize();
        Object.values(charts).forEach(c => { if (c && c.resize) c.resize(); });
    }, 200);
});

screen.orientation.addEventListener('change', () => {
    setTimeout(() => {
        if (map) map.invalidateSize();
        Object.values(charts).forEach(c => { if (c && c.resize) c.resize(); });
    }, 400);
});

// ===== LAZY RENDER FOR NEW TABS =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab === 'terremotos' && !window.__terremotosRendered) { window.__terremotosRendered = true; fetchTerremotos(); }
        if (tab === 'trafico' && !window.__traficoRendered) { window.__traficoRendered = true; fetchTrafico(); }
        if (tab === 'boe' && !window.__boeRendered) { window.__boeRendered = true; fetchBOE(); }
        if (tab === 'ine' && !window.__ineRendered) { window.__ineRendered = true; fetchINE(); }
        if (tab === 'eeea' && !window.__eeeaRendered) { window.__eeeaRendered = true; fetchEEEAire(); }
    });
});

// ===== START =====
// Safety net: always hide overlay after max 10s, even if init() throws
setTimeout(() => {
    const ol = document.getElementById('loading-overlay');
    if (ol && !ol.classList.contains('hidden')) {
        ol.classList.add('hidden');
        console.warn('DataHub: overlay forzado a ocultar tras timeout de seguridad');
    }
}, 10000);

init().catch(err => {
    console.error('DataHub: init() falló:', err);
    // Hide overlay on error so the user at least sees the page
    const ol = document.getElementById('loading-overlay');
    if (ol) ol.classList.add('hidden');
    showToast('Error cargando dashboard — datos parciales disponibles', 'error', 5000);
});
initMobile();
fetchPanelKPIs();
