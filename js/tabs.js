// tabs.js — DataHub España
// Gestión de pestañas + lazy render + sync provincia
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function populateProvinceFilter() {
        const select = document.getElementById('province-filter');
        if (!select || !provinceData) return;
        const sorted = Object.entries(provinceData)
            .sort((a, b) => (a[1].nombre || '').localeCompare(b[1].nombre || ''));
        sorted.forEach(([cod, d]) => {
            const opt = document.createElement('option');
            opt.value = cod;
            opt.textContent = `${d.nombre} (${d.capital || cod})`;
            select.appendChild(opt);
        });
        document.getElementById('province-filter-bar').classList.add('visible');
    }

    function onProvinceFilterChange(cod) {
        filteredProvince = cod || null;
        if (filteredProvince) {
            // Select on map
            if (provincesGeo) {
                const feature = provincesGeo.features.find(f => f.properties.cod === cod);
                if (feature) selectProvince(cod, feature, null);
            }
            // Update filtered tab content
            updateFilteredData();
            showToast(`Filtrando: ${provinceData[cod]?.nombre || cod}`, 'info', 2000);
        } else {
            // Clear filter
            closeProvinceDetail();
            resetFilteredData();
            showToast('Mostrando datos nacionales', 'info', 1500);
        }
    }

    function updateFilteredData() {
        if (!filteredProvince || !provinceData[filteredProvince]) return;
        const d = provinceData[filteredProvince];
        const ccaaName = CCAA_NAMES[d.ccaa] || d.ccaa || '';

        // === PANEL TAB: update KPIs with province data ===
        document.getElementById('kpi-total-pop').textContent =
            d.poblacion ? d.poblacion.toLocaleString('es-ES') : '—';
        document.getElementById('kpi-provinces').textContent = '1';
        document.querySelector('#tab-panel .section-title').textContent =
            `Resumen — ${d.nombre}`;

        // === CLIMA TAB: fetch weather for this province ===
        fetchProvinceWeatherFiltered(filteredProvince);

        // === AMBIENTE TAB: filter parks by CCAA ===
        renderParksFiltered(ccaaName);

        // === CATASTRO TAB: auto-fill ===
        document.getElementById('catastro-province').textContent = d.nombre;
        document.getElementById('catastro-cod').textContent = filteredProvince;
        document.getElementById('catastro-capital').textContent = d.capital || '—';
        document.getElementById('catastro-ccaa').textContent = ccaaName;

        // === AGUA TAB: show province-specific note ===
        const aguaSection = document.querySelector('#tab-agua .section-title');
        if (aguaSection) aguaSection.textContent = `Embalses — ${d.nombre}`;
    }

    function resetFilteredData() {
        // Restore national KPIs
        document.querySelector('#tab-panel .section-title').textContent = 'Resumen Nacional';
        // Re-fetch national data
        updateKPIs();
        renderParks();
        document.getElementById('catastro-province').textContent = 'Ninguna';
        document.getElementById('catastro-cod').textContent = '—';
        document.getElementById('catastro-capital').textContent = '—';
        document.getElementById('catastro-ccaa').textContent = '—';
        const aguaSection = document.querySelector('#tab-agua .section-title');
        if (aguaSection) aguaSection.textContent = 'Niveles de Embalses por Cuenca';
        // Restore temperature label
        const tempLabel = document.getElementById('kpi-temp-label');
        if (tempLabel) tempLabel.textContent = 'Madrid °C';
        // Restore clima title
        const climaTitle = document.querySelector('#tab-clima .section-title');
        if (climaTitle) climaTitle.textContent = 'Clima Actual — Madrid';
    }

    function renderParksFiltered(ccaaName) {
        const filtered = NATIONAL_PARKS.filter(p =>
            p.comunidad.toLowerCase().includes(ccaaName.toLowerCase())
        );
        let html = '';
        if (filtered.length === 0) {
            html = `<div style="font-size:13px;color:#64748b;padding:8px 0;">No hay parques nacionales en ${ccaaName}.</div>`;
        } else {
            filtered.forEach(p => {
                html += `
                    <div class="park-item">
                        <div class="park-name">🌲 ${p.nombre}</div>
                        <div class="park-info">${p.comunidad} · ${p.superficie} · Declarado: ${p.anio}</div>
                    </div>
                `;
            });
        }
        document.getElementById('parks-list').innerHTML = html;
        const sectionTitle = document.querySelectorAll('#tab-ambiente .section-title')[0];
        if (sectionTitle) sectionTitle.textContent = `Parques Nacionales — ${ccaaName || 'España'}`;
    }

    async function updateClimateForProvince(cod, nombre, d) {
        const centroid = provinceCentroids[cod] || [40.0, -3.5];
        console.log(`[Clima] Actualizando clima para ${nombre} (${cod}) — centroid: ${centroid[0]}, ${centroid[1]}`);
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${centroid[0].toFixed(4)}&longitude=${centroid[1].toFixed(4)}&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe/Madrid&forecast_days=7`;
            console.log(`[Clima] URL: ${url}`);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Weather API HTTP ${res.status}`);
            const data = await res.json();
            const curr = data.current;

            // Update climate tab header
            const climaTitle = document.querySelector('#tab-clima .section-title');
            if (climaTitle) climaTitle.textContent = `Clima Actual — ${d.capital || nombre}`;

            if (curr) {
                const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; else console.warn('[Clima] Elemento no encontrado:', id); };
                console.log(`[Clima] Datos actuales:`, JSON.stringify(curr));
                setTxt('weather-temp', (curr.temperature_2m !== undefined ? curr.temperature_2m : '—') + ' °C');
                setTxt('weather-humidity', (curr.relative_humidity_2m !== undefined ? curr.relative_humidity_2m : '—') + ' %');
                setTxt('weather-wind', (curr.wind_speed_10m !== undefined ? curr.wind_speed_10m : '—') + ' km/h');

                const wmoCode = curr.weather_code;
                const desc = WMO_CODES[wmoCode] || `Código ${wmoCode}`;
                setTxt('weather-desc', desc);
                setTxt('weather-detail',
                    `📍 ${d.capital || nombre}, ${nombre} — Código OMM: ${wmoCode} — ${desc}. ` +
                    `Precipitación: ${curr.precipitation || 0} mm. ` +
                    `Coordenadas: ${centroid[0].toFixed(4)}°N, ${Math.abs(centroid[1]).toFixed(4)}°W.`
                );

                // Also update forecast in the Clima tab
                if (data.daily) renderForecast(data.daily);
            }
        } catch (err) {
            console.warn('Province climate update failed:', cod, nombre, err);
            showToast(`Error cargando clima de ${d.capital || nombre}: ${err.message}`, 'error', 3000);
            // Set fallback values so UI doesn't stay stuck on "—"
            const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
            setTxt('weather-temp', 'No disponible');
            setTxt('weather-detail', `No se pudieron cargar datos de clima para ${d.capital || nombre}.`);
        }
    }

    function updateEconomyForProvince(cod, nombre, d) {
        // Update economy indicators with province data
        if (d.paro) {
            document.getElementById('econ-unemp').textContent = d.paro + '%';
        }
        if (d.pib_capita) {
            document.getElementById('econ-gdp').textContent = d.pib_capita.toLocaleString('es-ES') + ' €';
        }
    }

    function updatePopulationForProvince(cod, nombre, d) {
        // Highlight province in population charts
        if (d.poblacion) {
            document.getElementById('pop-total').textContent = d.poblacion.toLocaleString('es-ES');
        }
        if (d.superficie && d.poblacion) {
            const density = (d.poblacion / d.superficie).toFixed(1);
            document.getElementById('pop-density').textContent = density;
        }
    }

    function updateKPIs() {
        let totalPop = 0;
        let provinceCount = 0;
        Object.values(provinceData).forEach(d => {
            totalPop += d.poblacion || 0;
            provinceCount++;
        });
        const popVal = totalPop > 0 ? totalPop.toLocaleString('es-ES') : '—';
        setTxt('kpi-total-pop', popVal);
        setTxt('kpi-provinces', provinceCount);
        
        // Render tab summary
        renderTabSummary();
    }

    function renderTabSummary() {
        const summaries = [
            ['⚡ Energía', 'PVPC, demanda, renovables'],
            ['🌤️ Clima', 'Tiempo actual + 7 días'],
            ['💧 Agua', 'Embalses por cuenca'],
            ['💼 Economía', 'BORME: constituciones'],
            ['🌬️ Calidad Aire', 'AQI, PM2.5, NO₂, O₃'],
            ['👥 Población', 'INE: demografía CCAA'],
            ['🚢 Puertos', 'Movimiento portuario'],
            ['🌿 Ambiente', '16 parques nacionales'],
            ['🏗️ Catastro', 'Datos catastrales'],
            ['🌊 Inundaciones', 'Caudal de ríos'],
            ['🌾 Polen', 'Contaminación polínica'],
            ['🌡️ Suelo', 'Temp. y humedad suelo'],
            ['☀️ UV', 'Índice UV por ciudad'],
            ['🌊 Mar', 'Oleaje y condiciones marinas'],
            ['🏔️ Nieve', 'Nieve en estaciones'],
        ];
        let html = '';
        summaries.forEach(([name, desc]) => {
            html += `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-weight:500;">${name}</span>
                <span style="color:#94a3b8;">${desc}</span>
            </div>`;
        });
        html += `<div style="text-align:center;margin-top:8px;color:#94a3b8;font-size:10px;">${summaries.length} pestañas activas</div>`;
        const tabSumEl = document.getElementById('tab-summary');
        if (tabSumEl) tabSumEl.innerHTML = html;
    }

    function updateAirQualityForProvince(feature) {
        const name = feature.properties.name;
        const centroid = provinceCentroids[name];
        if (centroid) {
            fetchAirQuality(centroid[0], centroid[1]);
        }
    }

    function updatePollenForProvince(feature) {
        const c = provinceCentroids[feature.properties.cod];
        if (c) fetchPollen(c[0], c[1]);
    }

    function updateFloodForProvince(feature) {
        const cod = feature.properties.cod;
        const c = provinceCentroids[cod];
        // Update river name in flood tab
        const riverName = PROVINCE_RIVERS[cod] || 'Río principal';
        const riverEl = document.getElementById('flood-river-name');
        const chartTitleEl = document.getElementById('flood-chart-title');
        if (riverEl) riverEl.textContent = `📍 Río ${riverName} — ${feature.properties.nombre || ''}`;
        if (chartTitleEl) chartTitleEl.textContent = `Caudal del río ${riverName} — 14 días`;
        if (c) fetchFlood(c[0], c[1]);
    }

    function updateSoilForProvince(feature) {
        const c = provinceCentroids[feature.properties.cod];
        if (c) fetchSoil(c[0], c[1]);
    }

    function updateForecastForProvince(feature) {
        const c = provinceCentroids[feature.properties.cod];
        if (c) fetchForecast(c[0], c[1]);
    }
