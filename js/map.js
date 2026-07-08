// map.js — DataHub España
// Mapa Leaflet, provincias, choropleth
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function initMap() {
        map = L.map('map', {
            center: [40.0, -3.5],
            zoom: 6,
            preferCanvas: true,
            renderer: L.canvas(),
            zoomControl: true,
            attributionControl: true
        });

        // Force Leaflet to recalculate size after layout
        setTimeout(() => map && map.invalidateSize(), 300);
        setTimeout(() => map && map.invalidateSize(), 1000);

        // Base layers
        const baseOSM = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19,
            name: 'Carto Light'
        });
        const baseOSMStd = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
            name: 'OpenStreetMap'
        });
        baseOSM.addTo(map);

        // Overlay layers for roads and railways
        const roadsLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> HOT',
            maxZoom: 19,
            name: 'Carreteras (HOT)'
        });
        const railwaysLayer = L.tileLayer('https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> OpenRailwayMap',
            maxZoom: 19,
            name: 'Ferrocarriles'
        });

        // Layer control
        provincesOverlay = L.layerGroup();
        parksOverlay = L.layerGroup();
        const baseLayers = {
            'Carto Light': baseOSM,
            'OpenStreetMap': baseOSMStd
        };
        const overlays = {
            'Carreteras': roadsLayer,
            'Ferrocarriles': railwaysLayer,
            'Provincias (coropleta)': provincesOverlay,
            'Parques Nacionales': parksOverlay
        };
        L.control.layers(baseLayers, overlays, { collapsed: true, position: 'topright' }).addTo(map);

        // Click on map (not on a province) to close detail
        map.on('click', (e) => {
            if (!e.originalEvent.target.closest('.geojson-layer')) {
                // Don't close if a geojson layer was clicked
            }
        });
    }

    function getBounds(geometry) {
        if (!geometry) return null;
        let coords = [];
        if (geometry.type === 'Polygon') {
            coords = geometry.coordinates[0];
        } else if (geometry.type === 'MultiPolygon') {
            geometry.coordinates.forEach(poly => { coords = coords.concat(poly[0]); });
        }
        if (coords.length === 0) return null;
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        coords.forEach(c => {
            if (c[1] < minLat) minLat = c[1];
            if (c[1] > maxLat) maxLat = c[1];
            if (c[0] < minLng) minLng = c[0];
            if (c[0] > maxLng) maxLng = c[0];
        });
        return [[minLat, minLng], [maxLat, maxLng]];
    }

    function computeCentroid(geometry) {
        const bounds = getBounds(geometry);
        if (!bounds) return [40.0, -3.5];
        return [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
    }

    async function loadProvinces() {
        try {
            const [geoRes, dataRes] = await Promise.all([
                fetch('data/geo/provincias.json'),
                fetch('data/provincias-data.json')
            ]);
            if (!geoRes.ok) throw new Error('Error cargando GeoJSON');
            if (!dataRes.ok) throw new Error('Error cargando datos de provincias');

            provincesGeo = await geoRes.json();
            provinceData = await dataRes.json();

            // Compute centroids for each province
            provincesGeo.features.forEach(f => {
                const cod = f.properties.cod;
                if (f.geometry) {
                    provinceCentroids[cod] = computeCentroid(f.geometry);
                }
            });

            // Populate TS province selector
            const tsProvinceSelect = document.getElementById('ts-province-select');
            if (tsProvinceSelect) {
                // Sort by cod for clean ordering
                const sorted = [...provincesGeo.features].sort((a, b) => (a.properties.cod || '').localeCompare(b.properties.cod || ''));
                sorted.forEach(f => {
                    const opt = document.createElement('option');
                    opt.value = f.properties.cod;
                    opt.textContent = `${f.properties.cod} — ${f.properties.nombre}`;
                    tsProvinceSelect.appendChild(opt);
                });
                tsProvinceSelect.addEventListener('change', () => {
                    const val = tsProvinceSelect.value;
                    if (val === 'all') {
                        fetchTempSuelo(null);
                    } else {
                        const feat = provincesGeo.features.find(f => f.properties.cod === val);
                        if (feat) fetchTempSuelo(feat);
                    }
                });
            }

            renderChoropleth();
            updateKPIs();
            showToast('Provincias cargadas: ' + provincesGeo.features.length, 'success', 2500);
        } catch (err) {
            console.error('Error loading provinces:', err);
            showToast('Error al cargar provincias', 'error');
        }
    }

    function renderChoropleth() {
        if (!provincesGeo) return;
        if (geoLayer && provincesOverlay) provincesOverlay.removeLayer(geoLayer);

        geoLayer = L.geoJSON(provincesGeo, {
            style: feature => {
                const cod = feature.properties.cod;
                const d = provinceData[cod];
                const pop = d ? d.poblacion : 0;
                return {
                    fillColor: getPopColor(pop),
                    weight: 1.2,
                    opacity: 1,
                    color: '#ffffff',
                    fillOpacity: 0.78
                };
            },
            onEachFeature: (feature, layer) => {
                const cod = feature.properties.cod;
                const d = provinceData[cod];
                const nombre = feature.properties.nombre || (d ? d.nombre : 'Desconocido');
                const pop = d ? d.poblacion : 0;
                const capital = d ? d.capital : '';

                // Tooltip
                const popStr = pop ? pop.toLocaleString('es-ES') : 'N/D';
                layer.bindTooltip(
                    `<strong>${nombre}</strong><br>` +
                    `Capital: ${capital || 'N/D'}<br>` +
                    `Población: ${popStr}`,
                    { sticky: true, className: '' }
                );

                // Click handler
                layer.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    selectProvince(cod, feature, layer);
                });

                // Hover effects
                layer.on('mouseover', function() {
                    this.setStyle({ weight: 2, color: '#2563eb', fillOpacity: 0.88 });
                    this.bringToFront();
                });
                layer.on('mouseout', function() {
                    if (selectedProvince !== cod) {
                        geoLayer.resetStyle(this);
                    }
                });
            }
        });
        if (provincesOverlay) {
            provincesOverlay.addLayer(geoLayer);
            if (!map.hasLayer(provincesOverlay)) provincesOverlay.addTo(map);
        } else {
            geoLayer.addTo(map);
        }

        // Ensure tooltips pane is on top
        const tooltipPane = map.getPane('tooltipPane');
        if (tooltipPane) tooltipPane.style.zIndex = 450;
    }

    function selectProvince(cod, feature, layer) {
        selectedProvince = cod;
        const d = provinceData[cod];
        if (!d) return;

        const nombre = feature.properties.nombre || d.nombre;

        // Zoom to bounds
        if (feature.geometry) {
            const bounds = getBounds(feature.geometry);
            if (bounds) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
            }
        }

        // Highlight selected province
        if (geoLayer) {
            geoLayer.eachLayer(l => {
                if (l.feature && l.feature.properties.cod === cod) {
                    l.setStyle({ weight: 3, color: '#2563eb', fillOpacity: 0.9 });
                    l.bringToFront();
                } else {
                    geoLayer.resetStyle(l);
                }
            });
        }

        // Show province context bar
        const ctxBar = document.getElementById('province-context');
        ctxBar.classList.add('visible');
        document.getElementById('province-context-name').textContent = `${nombre} (${d.capital || ''})`;

        // Update detail panel - basic info
        document.getElementById('detail-name').textContent = nombre;
        document.getElementById('detail-pop').textContent = d.poblacion ? d.poblacion.toLocaleString('es-ES') : '—';
        document.getElementById('detail-capital').textContent = d.capital || '—';
        document.getElementById('detail-code').textContent = cod;
        document.getElementById('detail-ccaa').textContent = CCAA_NAMES[d.ccaa] || d.ccaa || '—';

        // Extended province data
        document.getElementById('detail-superficie').textContent = d.superficie ? d.superficie.toLocaleString('es-ES') + ' km²' : '—';
        const density = (d.poblacion && d.superficie) ? (d.poblacion / d.superficie).toFixed(1) : '—';
        document.getElementById('detail-density').textContent = density !== '—' ? density + ' hab/km²' : '—';
        document.getElementById('detail-altitude').textContent = d.altitud_media ? d.altitud_media.toLocaleString('es-ES') + ' m' : '—';
        document.getElementById('detail-coast').textContent = d.costa_km ? d.costa_km + ' km' : 'Sin costa';
        document.getElementById('detail-paro').textContent = d.paro ? d.paro + '%' : '—';
        document.getElementById('detail-pib').textContent = d.pib_capita ? d.pib_capita.toLocaleString('es-ES') + ' €' : '—';

        // Reset weather fields
        document.getElementById('detail-temp').textContent = 'Cargando…';
        document.getElementById('detail-humidity').textContent = '—';
        document.getElementById('detail-wind').textContent = '—';
        document.getElementById('detail-weather-desc').textContent = '—';
        document.getElementById('detail-sunrise').textContent = '—';
        document.getElementById('detail-sunset').textContent = '—';

        // Open detail panel
        document.getElementById('province-detail').classList.add('open');

        // Fetch weather for capital
        fetchProvinceWeather(cod);

        // Update catastro tab
        document.getElementById('catastro-province').textContent = nombre;
        document.getElementById('catastro-cod').textContent = cod;
        document.getElementById('catastro-capital').textContent = d.capital || '—';
        document.getElementById('catastro-ccaa').textContent = CCAA_NAMES[d.ccaa] || d.ccaa || '—';
        document.getElementById('catastro-superficie').textContent = d.superficie ? d.superficie.toLocaleString('es-ES') + ' km²' : '—';
        const catDensity = (d.poblacion && d.superficie) ? (d.poblacion / d.superficie).toFixed(1) + ' hab/km²' : '—';
        document.getElementById('catastro-density').textContent = catDensity;
        document.getElementById('catastro-municipios').textContent = d.num_municipios || d.municipios || '—';
        const catLink = document.getElementById('catastro-link');
        if (catLink) {
            catLink.href = `https://www.sedecatastro.gob.es/portal/contenido/consulta-buscar-parcela-catastral?Reference=${cod}&Provincia=${encodeURIComponent(nombre)}`;
            catLink.textContent = `Consulta catastro de ${nombre} →`;
        }

        // Update climate tab with province data
        updateClimateForProvince(cod, nombre, d);

        // Update economy tab with province data
        updateEconomyForProvince(cod, nombre, d);

        // Update air quality tab with province data
        const centroid = provinceCentroids[cod];
        if (centroid) fetchAirQuality(centroid[0], centroid[1]);

        // Update population tab with province data
        updatePopulationForProvince(cod, nombre, d);
        // Update new tabs with province data
        updatePollenForProvince(feature);
        updateFloodForProvince(feature);
        updateSoilForProvince(feature);
        updateForecastForProvince(feature);
    }
