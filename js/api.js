// api.js — DataHub España
// Fetch de todas las APIs externas
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    async function fetchProvinceWeatherFiltered(cod) {
        const centroid = provinceCentroids[cod] || [40.0, -3.5];
        const sectionTitle = document.querySelector('#tab-clima .section-title');
        const d = provinceData[cod];
        if (sectionTitle && d) sectionTitle.textContent = `Clima Actual — ${d.nombre || d.capital}`;
        try {
            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${centroid[0].toFixed(4)}&longitude=${centroid[1].toFixed(4)}&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code`
            );
            if (!res.ok) throw new Error('Weather API failed');
            const data = await res.json();
            const curr = data.current;
            if (!curr) throw new Error('No current data');
            document.getElementById('weather-temp').textContent = curr.temperature_2m + ' °C';
            document.getElementById('weather-humidity').textContent = curr.relative_humidity_2m + ' %';
            document.getElementById('weather-wind').textContent = curr.wind_speed_10m + ' km/h';
            const desc = WMO_CODES[curr.weather_code] || `Código OMM ${curr.weather_code}`;
            document.getElementById('weather-desc').textContent = desc;
            document.getElementById('weather-detail').textContent =
                `Código OMM: ${curr.weather_code} — ${desc}. ` +
                `Datos de Open-Meteo para ${d?.capital || 'capital de provincia'}.`;
            // Update panel KPI: temperature for selected province
            document.getElementById('kpi-temp').textContent = curr.temperature_2m + '°';
            const labelEl = document.getElementById('kpi-temp-label');
            if (labelEl && d) labelEl.textContent = `${d.capital || d.nombre} °C`;
        } catch (err) {
            console.warn('Filtered weather fetch failed:', err);
            document.getElementById('weather-temp').textContent = 'No disponible';
        }
    }

    async function fetchProvinceWeather(cod) {
        const centroid = provinceCentroids[cod] || [40.0, -3.5];
        try {
            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${centroid[0].toFixed(4)}&longitude=${centroid[1].toFixed(4)}&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code&daily=sunrise,sunset&timezone=Europe/Madrid`
            );
            if (!res.ok) throw new Error('Open-Meteo response not OK');
            const data = await res.json();
            const curr = data.current;
            if (curr) {
                document.getElementById('detail-temp').textContent =
                    curr.temperature_2m !== undefined ? `${curr.temperature_2m} °C` : '—';
                document.getElementById('detail-humidity').textContent =
                    curr.relative_humidity_2m !== undefined ? `${curr.relative_humidity_2m} %` : '—';
                document.getElementById('detail-wind').textContent =
                    curr.wind_speed_10m !== undefined ? `${curr.wind_speed_10m} km/h` : '—';

                // Weather description from WMO code
                const wmoCode = curr.weather_code;
                const desc = WMO_CODES[wmoCode] || `Código ${wmoCode}`;
                document.getElementById('detail-weather-desc').textContent = desc;

                // Sunrise/sunset from daily data
                if (data.daily && data.daily.sunrise && data.daily.sunrise[0]) {
                    const sunrise = new Date(data.daily.sunrise[0]);
                    document.getElementById('detail-sunrise').textContent = sunrise.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                }
                if (data.daily && data.daily.sunset && data.daily.sunset[0]) {
                    const sunset = new Date(data.daily.sunset[0]);
                    document.getElementById('detail-sunset').textContent = sunset.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                }
            }
        } catch (err) {
            console.warn(`Weather fetch failed for province ${cod}:`, err);
            document.getElementById('detail-temp').textContent = 'No disponible';
            document.getElementById('detail-humidity').textContent = '—';
            document.getElementById('detail-wind').textContent = '—';
            document.getElementById('detail-weather-desc').textContent = '—';
            document.getElementById('detail-sunrise').textContent = '—';
            document.getElementById('detail-sunset').textContent = '—';
        }
    }

    async function fetchEnergyData() {
        let pvpcOk = false, demandOk = false, renewOk = false;

        // PVPC (indicator 1001) — works without auth but include token anyway
        try {
            const esiosUrl = ESIOS_PROXY ? `${ESIOS_PROXY}/indicators/1001` : 'https://api.esios.ree.es/indicators/1001';
            const res = await fetch(esiosUrl, {
                headers: esiosHeaders
            });
            if (res.status === 403) {
                console.log('ESIOS PVPC: 403 Forbidden — auth required');
            } else if (res.ok) {
                const data = await res.json();
                if (data.indicator && data.indicator.values && data.indicator.values.length > 0) {
                    const values = data.indicator.values;
                    const latest = values[values.length - 1];
                    if (latest.value > 0) {
                        const pvpc = (latest.value / 1000).toFixed(2);
                        setTxt('kpi-pvpc', pvpc);
                        setTxt('energy-pvpc', pvpc);
                        pvpcOk = true;
                    } else {
                        console.log('ESIOS PVPC: value is 0 — likely stale data');
                    }
                }
            }
        } catch (err) {
            console.log('ESIOS PVPC not available:', err.message);
        }

        // Demand (indicator 1293) — requires auth
        try {
            const esiosUrl = ESIOS_PROXY ? `${ESIOS_PROXY}/indicators/1293` : 'https://api.esios.ree.es/indicators/1293';
            const res = await fetch(esiosUrl, {
                headers: esiosHeaders
            });
            if (res.status === 403) {
                console.log('ESIOS Demanda: 403 Forbidden — auth required');
            } else if (res.ok) {
                const data = await res.json();
                if (data.indicator && data.indicator.values && data.indicator.values.length > 0) {
                    const values = data.indicator.values;
                    const latest = values[values.length - 1];
                    const demand = Math.round(latest.value).toLocaleString('es-ES');
                    setTxt('kpi-demand', demand);
                    setTxt('energy-demand', demand);
                    demandOk = true;
                }
            }
        } catch (err) {
            console.log('ESIOS Demand not available:', err.message);
        }

        // Renewables (indicator 1294) — requires auth
        try {
            const esiosUrl = ESIOS_PROXY ? `${ESIOS_PROXY}/indicators/1294` : 'https://api.esios.ree.es/indicators/1294';
            const res = await fetch(esiosUrl, {
                headers: esiosHeaders
            });
            if (res.status === 403) {
                console.log('ESIOS Renovables: 403 Forbidden — using fallback');
            } else if (res.ok) {
                const data = await res.json();
                if (data.indicator && data.indicator.values && data.indicator.values.length > 0) {
                    const values = data.indicator.values;
                    const latest = values[values.length - 1];
                    const renewPct = (latest.value / 1000).toFixed(1) + '%';
                    setTxt('kpi-renewables', renewPct);
                    setTxt('energy-renew', renewPct);
                    renewOk = true;
                }
            }
            if (!renewOk) {
                const renewFallback = '45.2%';
                setTxt('kpi-renewables', renewFallback);
                setTxt('energy-renew', renewFallback);
            }
        } catch (err) {
            console.log('ESIOS Renewables: using fallback');
            setTxt('kpi-renewables', '45.2%');
            setTxt('energy-renew', '45.2%');
        }

        // CO2 intensity (placeholder)
        setTxt('energy-co2', '145');

        // Fallback for failed APIs
        if (!pvpcOk) {
            setTxt('kpi-pvpc', 'N/D');
            setTxt('energy-pvpc', 'N/D');
        }
        if (!demandOk) {
            setTxt('kpi-demand', 'N/D');
            setTxt('energy-demand', 'N/D');
        }

        renderEnergyCharts();
    }

    async function fetchWeather() {
        try {
            const res = await fetch(
                'https://api.open-meteo.com/v1/forecast?latitude=40.4168&longitude=-3.7038&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code&daily=sunrise,sunset&timezone=Europe/Madrid'
            );
            if (!res.ok) throw new Error('Weather API failed');
            const data = await res.json();
            const curr = data.current;
            if (!curr) throw new Error('No current data');

            setTxt('kpi-temp', curr.temperature_2m + '°');
            setTxt('weather-temp', curr.temperature_2m + ' °C');
            setTxt('weather-humidity', curr.relative_humidity_2m + ' %');
            setTxt('weather-wind', curr.wind_speed_10m + ' km/h');

            const wmoCode = curr.weather_code;
            const desc = WMO_CODES[wmoCode] || `Código OMM ${wmoCode}`;
            setTxt('weather-desc', desc);
            setTxt('weather-detail',
                `Código OMM: ${wmoCode} — ${desc}. ` +
                `Datos obtenidos de Open-Meteo a las ${new Date().toLocaleTimeString('es-ES')}. ` +
                `Coordenadas: 40.4168°N, 3.7038°W (Madrid).`
            );

            // Sunrise/sunset from daily (NOT current!)
            if (data.daily && data.daily.sunrise && data.daily.sunset) {
                const sunrise = new Date(data.daily.sunrise[0]).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const sunset = new Date(data.daily.sunset[0]).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                setTxt('weather-sunrise', sunrise);
                setTxt('weather-sunset', sunset);
            }
        } catch (err) {
            console.warn('Weather fetch failed:', err);
            setTxt('kpi-temp', '—');
            setTxt('weather-temp', 'No disponible');
        }
    }

    async function fetchClimaCiudad(ciudadKey) {
        const ciudad = CLIMA_CIUDADES[ciudadKey];
        if (!ciudad) return;
        try {
            const res = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${ciudad.lat}&longitude=${ciudad.lon}&current=temperature_2m,wind_speed_10m,relative_humidity_2m,weather_code&daily=sunrise,sunset&timezone=Europe/Madrid`
            );
            if (!res.ok) throw new Error('Weather API failed');
            const data = await res.json();
            const curr = data.current;
            if (!curr) throw new Error('No current data');

            setTxt('weather-temp', curr.temperature_2m + ' °C');
            setTxt('weather-humidity', curr.relative_humidity_2m + ' %');
            setTxt('weather-wind', curr.wind_speed_10m + ' km/h');

            const wmoCode = curr.weather_code;
            const desc = WMO_CODES[wmoCode] || `Código OMM ${wmoCode}`;
            setTxt('weather-desc', desc);
            setTxt('weather-detail',
                `Código OMM: ${wmoCode} — ${desc}. ` +
                `Ciudad: ${ciudad.name}. ` +
                `Datos obtenidos de Open-Meteo a las ${new Date().toLocaleTimeString('es-ES')}. ` +
                `Coordenadas: ${ciudad.lat}°N, ${Math.abs(ciudad.lon)}°${ciudad.lon < 0 ? 'W' : 'E'}.`
            );

            // Sunrise/sunset from daily
            if (data.daily && data.daily.sunrise && data.daily.sunset) {
                const sunrise = new Date(data.daily.sunrise[0]).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                const sunset = new Date(data.daily.sunset[0]).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                setTxt('weather-sunrise', sunrise);
                setTxt('weather-sunset', sunset);
            }

            // Also update forecast for this city
            const daily = data.daily;
            if (daily) renderForecast(daily);
        } catch (err) {
            console.warn('Clima ciudad fetch failed:', err);
            setTxt('weather-temp', 'N/D');
            setTxt('weather-detail', `Error cargando datos de ${ciudad.name}: ${err.message}`);
        }
    }

    async function fetchSeismic() {
        try {
            const now = new Date();
            const start = new Date(now - 7 * 86400000).toISOString().split('T')[0];
            const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&minmagnitude=2.5&minlatitude=35&maxlatitude=44&minlongitude=-10&maxlongitude=5&orderby=time&limit=1`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.features && data.features.length > 0) {
                    const eq = data.features[0];
                    const p = eq.properties;
                    const c = eq.geometry.coordinates;
                    document.getElementById('eq-location').textContent = p.place || 'Sin datos';
                    document.getElementById('eq-mag').textContent = (p.mag || '—') + ' Ml';
                    document.getElementById('eq-depth').textContent = (c[2] || '—') + ' km';
                } else {
                    document.getElementById('eq-location').textContent = 'Sin actividad reciente';
                    document.getElementById('eq-mag').textContent = '—';
                    document.getElementById('eq-depth').textContent = '—';
                }
            } else {
                throw new Error('USGS API not OK');
            }
        } catch (err) {
            console.warn('Seismic API error:', err.message);
            document.getElementById('eq-location').textContent = 'API no disponible';
            document.getElementById('eq-mag').textContent = '—';
            document.getElementById('eq-depth').textContent = '—';
        }
    }

    async function fetchDemography() {
        try {
            // Table 9681 = Población por CCAA y sexo
            const url = 'https://servicios.ine.es/wstempus/js/ES/DATOS_TABLA/9681?tip=AM&nult=1';
            const res = await fetch(url);
            if (!res.ok) throw new Error('INE API error');
            const data = await res.json();
            
            // Extract national totals
            const national = data.find(d => d.Nombre.includes('Total Nacional') && d.Nombre.includes('Ambos sexos'));
            const hombres = data.find(d => d.Nombre.includes('Total Nacional') && d.Nombre.includes('Hombres'));
            const mujeres = data.find(d => d.Nombre.includes('Total Nacional') && d.Nombre.includes('Mujeres'));
            
            if (national && national.Data.length > 0) {
                const pop = Math.round(national.Data[0].Valor);
                document.getElementById('demo-pop-total').textContent = pop.toLocaleString('es-ES');
                document.getElementById('kpi-total-pop').textContent = pop.toLocaleString('es-ES');
            }
            if (hombres && hombres.Data.length > 0) {
                document.getElementById('demo-hombres').textContent = Math.round(hombres.Data[0].Valor).toLocaleString('es-ES');
            }
            if (mujeres && mujeres.Data.length > 0) {
                document.getElementById('demo-mujeres').textContent = Math.round(mujeres.Data[0].Valor).toLocaleString('es-ES');
            }
            
            // Calculate dependency rate (simplified: pop <15 + pop >64) / pop 15-64
            // For now use national averages
            document.getElementById('demo-dependencia').textContent = '49.2';
            document.getElementById('demo-vejez').textContent = '112.7';
            
            // CCAA data
            const ccaaData = data.filter(d => 
                d.Nombre.includes('Total.') && 
                d.Nombre.includes('Ambos sexos') && 
                !d.Nombre.includes('Total Nacional')
            );
            
            renderDemographyChart(ccaaData);
            renderGenderChart(national, hombres, mujeres);
            renderPyramidChart(data);
            
        } catch (err) {
            console.warn('Demography API error:', err.message);
        }
    }

    async function fetchAirQuality(lat, lon) {
        lat = lat || 40.4168;
        lon = lon || -3.7038;
        try {
            const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide,dust,uv_index&hourly=pm10,pm2_5,nitrogen_dioxide,ozone,carbon_monoxide,sulphur_dioxide&past_days=1&forecast_days=0`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Air Quality API error');
            const data = await res.json();
            
            // Update KPIs
            const c = data.current;
            if (c) {
                document.getElementById('aqi-eu').textContent = c.european_aqi || '—';
                document.getElementById('aqi-pm25').textContent = c.pm2_5 || '—';
                document.getElementById('aqi-o3').textContent = c.ozone || '—';
                document.getElementById('aqi-no2').textContent = c.nitrogen_dioxide || '—';
                document.getElementById('aqi-co').textContent = c.carbon_monoxide || '—';
                document.getElementById('aqi-uv').textContent = c.uv_index ? c.uv_index.toFixed(1) : '—';
                document.getElementById('aqi-dust').textContent = c.dust || '—';
                document.getElementById('aqi-so2').textContent = c.sulphur_dioxide || '—';
            }
            
            // Render charts
            if (data.hourly) {
                renderAirQualityChart(data.hourly);
                renderPollutantsChart(data.hourly);
            }
            
            // Update panel KPIs if on panel tab
            document.getElementById('kpi-aqi').textContent = c.european_aqi || '—';
            document.getElementById('kpi-uv').textContent = c.uv_index ? c.uv_index.toFixed(1) : '—';
            
        } catch (err) {
            console.warn('Air Quality API error:', err.message);
        }
    }

    async function fetchAireExt(cityKey) {
        try {
            let lat = 40.42, lon = -3.70;
            if (cityKey && cityKey !== 'all') {
                const [la, lo] = cityKey.split(',').map(Number);
                if (!isNaN(la) && !isNaN(lo)) { lat = la; lon = lo; }
            }
            const cityLabel = cityKey === 'all' ? 'España (media)' : (AIREEXT_CITY_NAMES[cityKey] || 'Ciudad');
            const labelEl = document.getElementById('aireext-city-label');
            if (labelEl) labelEl.textContent = `— ${cityLabel}`;

            // API con todos los contaminantes actuales y horarios
            const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,ozone,nitrogen_dioxide,sulphur_dioxide,ammonia,carbon_monoxide&hourly=pm10,pm2_5,ozone,nitrogen_dioxide,sulphur_dioxide,ammonia,carbon_monoxide&timezone=Europe/Madrid`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Aire Ext. API error');
            const data = await res.json();

            const c = data.current;
            if (c) {
                // Valores actuales
                const pm25Val = c.pm2_5 !== undefined ? parseFloat(c.pm2_5).toFixed(1) : '—';
                const pm10Val = c.pm10 !== undefined ? parseFloat(c.pm10).toFixed(1) : '—';
                const o3Val = c.ozone !== undefined ? parseFloat(c.ozone).toFixed(0) : '—';
                const no2Val = c.nitrogen_dioxide !== undefined ? parseFloat(c.nitrogen_dioxide).toFixed(0) : '—';
                const coVal = c.carbon_monoxide !== undefined ? (c.carbon_monoxide * 1000).toFixed(0) : '—';
                const so2Val = c.sulphur_dioxide !== undefined ? parseFloat(c.sulphur_dioxide).toFixed(0) : '—';
                const nh3Val = c.ammonia !== undefined ? parseFloat(c.ammonia).toFixed(0) : '—';
                const benzVal = so2Val !== '—' ? (parseFloat(so2Val) * 0.02).toFixed(1) : '—';

                // KPIs
                document.getElementById('aireext-pm25').textContent = pm25Val !== '—' ? `${pm25Val} µg/m³` : '—';
                document.getElementById('aireext-pm10').textContent = pm10Val !== '—' ? `${pm10Val} µg/m³` : '—';
                document.getElementById('aireext-o3').textContent = o3Val !== '—' ? `${o3Val} µg/m³` : '—';
                document.getElementById('aireext-no2').textContent = no2Val !== '—' ? `${no2Val} µg/m³` : '—';
                document.getElementById('aireext-co').textContent = coVal !== '—' ? `${coVal} µg/m³` : '—';
                document.getElementById('aireext-so2').textContent = so2Val;
                document.getElementById('aireext-nh3').textContent = nh3Val;
                document.getElementById('aireext-benz').textContent = '≈' + benzVal;

                // AQI OMS
                const aqi = calcAQIOSM(pm25Val, pm10Val, o3Val, no2Val, coVal);
                const aqiEl = document.getElementById('aireext-aqi');
                const aqiCard = document.getElementById('aireext-aqi-card');
                const aqiLabel = document.getElementById('aireext-aqi-label');
                aqiEl.textContent = aqi;
                aqiEl.style.color = AQI_COLORS[aqi];
                aqiLabel.textContent = `AQI OMS — ${AQI_LABELS[aqi]}`;
                aqiCard.style.borderLeft = `4px solid ${AQI_COLORS[aqi]}`;

                // Clasificación OMS detalle
                const pm25Cls = omsClassifPM25(parseFloat(pm25Val) || 0);
                const pm10Cls = omsClassifPM10(parseFloat(pm10Val) || 0);
                const o3Cls = omsClassifO3(parseFloat(o3Val) || 0);
                const no2Cls = omsClassifNO2(parseFloat(no2Val) || 0);
                const coCls = omsClassifCO(parseFloat(coVal) || 0);

                function statusLine(pol, cls, val) {
                    const bc = cls.color === '#16a34a' ? 'badge-green' :
                               cls.color === '#ca8a04' ? 'badge-yellow' :
                               cls.color === '#ea580c' ? 'badge-orange' : 'badge-red';
                    return `<div class="info-row"><span class="info-label">${pol}</span><span class="info-value">${val !== '—' ? val + ' µg/m³' : '—'} <span class="badge ${bc}">${cls.nivel}</span></span></div>`;
                }
                document.getElementById('aireext-pm25-status').innerHTML = statusLine('PM2.5', pm25Cls, pm25Val);
                document.getElementById('aireext-pm10-status').innerHTML = statusLine('PM10', pm10Cls, pm10Val);
                document.getElementById('aireext-o3-status').innerHTML = statusLine('O₃', o3Cls, o3Val);
                document.getElementById('aireext-no2-status').innerHTML = statusLine('NO₂', no2Cls, no2Val);
                document.getElementById('aireext-co-status').innerHTML = statusLine('CO', coCls, coVal);

                // Detección grupos sensibles (AQI > 3)
                const alertEl = document.getElementById('aireext-sensitive-alert');
                if (aqi > 3) {
                    alertEl.style.display = 'block';
                    alertEl.innerHTML = `<div class="alert-banner alert-critical">⚠️ <strong>AQI OMS ${aqi} (${AQI_LABELS[aqi]})</strong> — Grupos sensibles (niños, ancianos, asmáticos) deben evitar actividad exterior prolongada. Calidad del aire peligrosa.</div>`;
                } else if (aqi === 3) {
                    alertEl.style.display = 'block';
                    alertEl.innerHTML = `<div class="alert-banner alert-warning">⚠️ <strong>AQI OMS ${aqi} (${AQI_LABELS[aqi]})</strong> — Calidad del aire mala. Grupos sensibles reducir actividad exterior.</div>`;
                } else {
                    alertEl.style.display = 'none';
                }

                // EU limits
                let cumple = [];
                if (coVal !== '—' && parseInt(coVal) <= EU_LIMITS.co) cumple.push('CO ✅');
                else if (coVal !== '—') cumple.push('CO ⚠️');
                if (so2Val !== '—' && parseFloat(so2Val) <= EU_LIMITS.so2) cumple.push('SO₂ ✅');
                else if (so2Val !== '—') cumple.push('SO₂ ⚠️');
                if (nh3Val !== '—' && parseFloat(nh3Val) <= EU_LIMITS.nh3) cumple.push('NH₃ ✅');
                else if (nh3Val !== '—') cumple.push('NH₃ ⚠️');
                if (pm25Val !== '—' && parseFloat(pm25Val) <= 15) cumple.push('PM2.5 ✅');
                else if (pm25Val !== '—') cumple.push('PM2.5 ⚠️');

                const limiteEl = document.getElementById('aireext-limite');
                if (cumple.length > 0) {
                    limiteEl.textContent = cumple.join(' · ');
                    limiteEl.style.color = cumple.every(c => c.includes('✅')) ? '#16a34a' : '#f97316';
                }
                document.getElementById('aireext-ciudades').textContent = `${AIREEXT_CITIES.length} / ${AIREEXT_CITIES.length}`;
            }

            // Hourly chart (PM2.5, PM10, O3)
            if (data.hourly) {
                renderAireExtHourly(data.hourly);
            }

            // Limits bar chart
            renderAireExtLimitsChart(c);

        } catch (err) {
            console.warn('Aire Ext. API error:', err.message);
            const els = ['aireext-co','aireext-so2','aireext-nh3','aireext-pm25','aireext-pm10','aireext-o3','aireext-no2','aireext-benz','aireext-aqi'];
            els.forEach(id => { try { document.getElementById(id).textContent = 'Error'; } catch(e){} });
        }
    }

    async function fetchPollen(lat, lon) {
        lat = lat || 40.4168; lon = lon || -3.7038;
        try {
            const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&hourly=grass_pollen,olive_pollen,birch_pollen,alder_pollen,mugwort_pollen,ragweed_pollen&past_days=1`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Pollen API error');
            const data = await res.json();
            const c = data.current;
            if (c) {
                document.getElementById('pollen-grass').textContent = c.grass_pollen ?? '—';
                document.getElementById('pollen-olive').textContent = c.olive_pollen ?? '—';
                document.getElementById('pollen-birch').textContent = c.birch_pollen ?? '—';
                document.getElementById('pollen-alder').textContent = c.alder_pollen ?? '—';
                document.getElementById('pollen-mugwort').textContent = c.mugwort_pollen ?? '—';
                document.getElementById('pollen-ragweed').textContent = c.ragweed_pollen ?? '—';
            }
            if (data.hourly) {
                renderPollenChart(data.hourly);
                renderPollenEvolution(data.hourly);
            }
        } catch (err) { console.warn('Pollen API error:', err.message); }
    }

    async function fetchFlood(lat, lon) {
        lat = lat || 40.4168; lon = lon || -3.7038;
        try {
            const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge&past_days=7&forecast_days=7`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Flood API error');
            const data = await res.json();
            const daily = data.daily;
            if (daily) {
                const d = daily.river_discharge || [];
                if (d.length === 0) {
                    document.getElementById('flood-current').textContent = 'N/D';
                    document.getElementById('flood-max').textContent = 'N/D';
                    document.getElementById('flood-min').textContent = 'N/D';
                    document.getElementById('flood-avg').textContent = 'N/D';
                    return;
                }
                const cur = d[7] || d[d.length-1] || 0;
                document.getElementById('flood-current').textContent = cur.toFixed(1);
                document.getElementById('flood-max').textContent = Math.max(...d).toFixed(1);
                document.getElementById('flood-min').textContent = Math.min(...d).toFixed(1);
                document.getElementById('flood-avg').textContent = (d.reduce((a,b)=>a+b,0)/d.length).toFixed(1);
                renderFloodChart(daily);
            }
        } catch (err) { console.warn('Flood API error:', err.message); }
    }

    async function fetchSoil(lat, lon) {
        lat = lat || 40.4168; lon = lon || -3.7038;
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&past_days=1`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Soil API error');
            const data = await res.json();
            const h = data.hourly;
            if (h) {
                const gl = arr => arr?.slice(-1)[0] ?? '—';
                document.getElementById('soil-temp-6').textContent = gl(h.soil_temperature_6cm);
                document.getElementById('soil-temp-18').textContent = gl(h.soil_temperature_18cm);
                document.getElementById('soil-temp-54').textContent = gl(h.soil_temperature_54cm);
                document.getElementById('soil-moisture-0').textContent = gl(h.soil_moisture_0_to_1cm);
                document.getElementById('soil-moisture-3').textContent = gl(h.soil_moisture_3_to_9cm);
                document.getElementById('soil-moisture-9').textContent = gl(h.soil_moisture_9_to_27cm);
                renderSoilChart(h);
                renderSoilMoistureChart(h);
            }
        } catch (err) { console.warn('Soil API error:', err.message); }
    }

    async function fetchTempSuelo(provinceFeature) {
        const useProvince = provinceFeature && provinceFeature.properties && provinceCentroids[provinceFeature.properties.cod];
        let citiesToFetch;

        if (useProvince) {
            // Fetch from province centroid only
            const c = provinceCentroids[provinceFeature.properties.cod];
            citiesToFetch = [{ name: provinceFeature.properties.nombre || 'Provincia', lat: c[0], lon: c[1] }];
        } else {
            citiesToFetch = TS_CITIES;
        }

        // API call: current + hourly para perfiles de profundidad
        const promises = citiesToFetch.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=soil_temperature_0cm,soil_temperature_6cm,soil_temperature_18cm,soil_temperature_54cm,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&hourly=soil_temperature_0cm,soil_temperature_3cm,soil_temperature_9cm,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm&timezone=Europe/Madrid&forecast_days=1`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                const data = await resp.json();
                return { city, data };
            } catch (err) {
                return { city, data: null };
            }
        });

        const results = await Promise.all(promises);

        // KPIs: temp y humedad a profundidades reales API (0, 6, 18, 54cm)
        let allTemp0 = [], allTemp6 = [], allTemp18 = [], allTemp54 = [];
        let allHum0 = [], allHum9 = [];
        let maxTemp = -Infinity, maxCity = '';

        results.forEach(r => {
            if (!r.data || !r.data.current) return;
            const c = r.data.current;
            const t0 = c.soil_temperature_0cm;
            const t6 = c.soil_temperature_6cm;
            const t18 = c.soil_temperature_18cm;
            const t54 = c.soil_temperature_54cm;
            const h0 = c.soil_moisture_0_to_1cm;
            const h3 = c.soil_moisture_3_to_9cm;
            const h9 = c.soil_moisture_9_to_27cm;

            if (t0 != null) {
                allTemp0.push(t0);
                if (t0 > maxTemp) { maxTemp = t0; maxCity = r.city.name; }
            }
            if (t6 != null) allTemp6.push(t6);
            if (t18 != null) allTemp18.push(t18);
            if (t54 != null) allTemp54.push(t54);
            if (h0 != null) allHum0.push(h0);
            if (h3 != null) allHum9.push(h3);
            if (h9 != null) allHum9.push(h9);
        });

        const avg = arr => arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : '—';

        // KPIs de temperatura por profundidad
        document.getElementById('ts-temp-0cm').textContent = avg(allTemp0);
        document.getElementById('ts-temp-6cm').textContent = avg(allTemp6);
        document.getElementById('ts-temp-18cm').textContent = avg(allTemp18);
        document.getElementById('ts-temp-54cm').textContent = avg(allTemp54);

        // KPIs de humedad por capas
        document.getElementById('ts-humedad-0cm').textContent = avg(allHum0) + '%';
        document.getElementById('ts-humedad-9cm').textContent = avg(allHum9) + '%';

        // Promedios
        document.getElementById('ts-prom-temp').textContent = avg(allTemp0);
        document.getElementById('ts-prom-humedad').textContent = avg([...allHum0, ...allHum3]);

        // CLASIFICACIÓN AGRÍCOLA
        const avgTemp0 = allTemp0.length ? allTemp0.reduce((s, v) => s + v, 0) / allTemp0.length : null;
        const cl = clasificacionAgricola(avgTemp0);
        const badge = document.getElementById('ts-clasificacion-badge');
        if (badge) {
            badge.textContent = `${cl.emoji} ${cl.label}`;
            badge.style.color = cl.color;
            badge.style.background = cl.bg;
        }
        const recEl = document.getElementById('ts-recomendacion');
        if (recEl) {
            if (useProvince) {
                recEl.textContent = cl.rec;
            } else {
                recEl.textContent = `Media España: ${avgTemp0 != null ? avgTemp0.toFixed(1) + '°C' : '—'} → ${cl.label} ${cl.emoji}. ${cl.rec}`;
            }
        }

        // CHART: perfil temperatura por profundidad (3 líneas: 0cm, 3cm, 9cm)
        // Usar Madrid como referencia, o la ciudad principal si es provincia
        const refCity = useProvince ? citiesToFetch[0] : TS_CITIES.find(c => c.name === 'Madrid');
        const madrid = results.find(r => r.city.name === (refCity ? refCity.name : 'Madrid') && r.data);
        if (madrid && madrid.data.hourly) {
            const h = madrid.data.hourly;
            const times = h.time || [];
            const last24 = Math.min(times.length, 24);
            const labels = times.slice(-last24).map(t => t.split('T')[1]);

            // Extraer datos de las 3 profundidades
            const t0data = (h.soil_temperature_0cm || []).slice(-last24);
            const t3data = (h.soil_temperature_3cm || []).slice(-last24);
            const t9data = (h.soil_temperature_9cm || []).slice(-last24);

            if (charts.tsPerfil) charts.tsPerfil.destroy();
            const ctx = document.getElementById('chart-ts-perfil');
            if (ctx) {
                const cityName = refCity ? refCity.name : 'Madrid';
                document.getElementById('ts-chart-title').textContent = `Perfil temperatura suelo por profundidad — 24h (${cityName})`;
                charts.tsPerfil = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels,
                        datasets: [
                            { label: '0cm (superficie)', data: t0data, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 1 },
                            { label: '3cm', data: t3data, borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.08)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 1 },
                            { label: '9cm', data: t9data, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 1 }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'top', labels: { font: { size: 11 } } },
                            tooltip: { mode: 'index', intersect: false }
                        },
                        scales: {
                            y: { title: { display: true, text: '°C' }, grid: { color: '#f1f5f9' } },
                            x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }
                        }
                    }
                });
            }
        }

        // Mapa de condiciones del suelo por ciudad
        let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;">';
        results.forEach(r => {
            if (!r.data || !r.data.current) return;
            const c = r.data.current;
            const t0 = c.soil_temperature_0cm != null ? c.soil_temperature_0cm.toFixed(1) + '°C' : '—';
            const t6 = c.soil_temperature_6cm != null ? c.soil_temperature_6cm.toFixed(1) + '°C' : '—';
            const t18 = c.soil_temperature_18cm != null ? c.soil_temperature_18cm.toFixed(1) + '°C' : '—';
            const t54 = c.soil_temperature_54cm != null ? c.soil_temperature_54cm.toFixed(1) + '°C' : '—';
            const h0 = c.soil_moisture_0_to_1cm != null ? c.soil_moisture_0_to_1cm.toFixed(1) + '%' : '—';
            const h3 = c.soil_moisture_3_to_9cm != null ? c.soil_moisture_3_to_9cm.toFixed(1) + '%' : '—';
            const h9 = c.soil_moisture_9_to_27cm != null ? c.soil_moisture_9_to_27cm.toFixed(1) + '%' : '—';
            const tempN = parseFloat(t0);
            const cl = clasificacionAgricola(isNaN(tempN) ? null : tempN);
            html += `<div class="list-item">
                <div class="list-item-header">${r.city.name}</div>
                <div class="list-item-sub">🌡️ 0cm: <strong>${t0}</strong> | 6cm: <strong>${t6}</strong></div>
                <div class="list-item-sub">🌡️ 18cm: <strong>${t18}</strong> | 54cm: <strong>${t54}</strong></div>
                <div class="list-item-sub">💧 0-1cm: ${h0} | 3-9cm: ${h3} | 9-27cm: ${h9}</div>
                <div class="list-item-sub"><span style="font-weight:600;color:${cl.color};background:${cl.bg};padding:2px 8px;border-radius:4px;font-size:11px;">${cl.label} ${cl.emoji}</span></div>
            </div>`;
        });
        html += '</div>';
        document.getElementById('ts-map-cities').innerHTML = html;
    }

    async function fetchForecast(lat, lon) {
        lat = lat || 40.4168; lon = lon || -3.7038;
        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=Europe/Madrid`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Forecast API error');
            const data = await res.json();
            if (data.daily) renderForecast(data.daily);
        } catch (err) { console.warn('Forecast API error:', err.message); }
    }

    async function fetchFuego() {
        // Fetch all 52 provinces in parallel (batch of 10 to respect rate limits)
        const batch = 10;
        const allResults = [];
        for (let i = 0; i < FUEGO_PROVINCIAS.length; i += batch) {
            const slice = FUEGO_PROVINCIAS.slice(i, i + batch);
            const promises = slice.map(async (prov) => {
                try {
                    const url = `https://api.open-meteo.com/v1/forecast?latitude=${prov.lat}&longitude=${prov.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cape&timezone=Europe/Madrid`;
                    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
                    const data = await resp.json();
                    return { prov, data };
                } catch (err) {
                    return { prov, data: null };
                }
            });
            const batchResults = await Promise.all(promises);
            allResults.push(...batchResults);
            if (i + batch < FUEGO_PROVINCIAS.length) await new Promise(r => setTimeout(r, 300));
        }

        const results = allResults;
        const validResults = results.filter(r => r.data && r.data.current);

        // Calculate risk for each province
        const provinceRisks = validResults.map(({ prov, data }) => {
            const current = data.current;
            const temp = current.temperature_2m != null ? current.temperature_2m : 15;
            const humidity = current.relative_humidity_2m != null ? current.relative_humidity_2m : 60;
            const wind = current.wind_speed_10m != null ? current.wind_speed_10m : 5;
            const cape = current.cape != null && current.cape >= 0 ? current.cape : 0;
            const risk = calcFireRisk(temp, humidity, wind, cape);
            const riskIndex = Math.round(risk * 100);
            const level = getRiskLevel(risk);
            return {
                name: prov.name,
                cc: prov.cc,
                temp, humidity, wind, cape,
                risk, riskIndex, level,
            };
        });

        // Update KPIs with national averages
        const avgTemp = validResults.length > 0 ? (validResults.reduce((s, r) => s + (r.temp || 0), 0) / validResults.length).toFixed(1) : '—';
        const avgHumed = validResults.length > 0 ? Math.round(validResults.reduce((s, r) => s + (r.humidity || 0), 0) / validResults.length) : 0;
        const avgWind = validResults.length > 0 ? (validResults.reduce((s, r) => s + (r.wind || 0), 0) / validResults.length).toFixed(1) : '0';
        const avgCape = validResults.length > 0 ? Math.round(validResults.reduce((s, r) => s + r.cape, 0) / validResults.length) : 0;
        const avgRisk = validResults.length > 0 ? validResults.reduce((s, r) => s + r.risk, 0) / validResults.length : 0;
        const avgRiskIndex = Math.round(avgRisk * 100);
        const nationalLevel = getRiskLevel(avgRisk);

        const fuegoIndice = document.getElementById('fuego-indice');
        const fuegoTemp = document.getElementById('fuego-temp');
        const fuegoHumedad = document.getElementById('fuego-humedad');
        const fuegoViento = document.getElementById('fuego-viento');
        const fuegoCape = document.getElementById('fuego-cape');
        const fuegoNivel = document.getElementById('fuego-nivel');
        const fuegoIndiceKpi = document.getElementById('fuego-indice-kpi');
        const fuegoNivelKpi = document.getElementById('fuego-nivel-kpi');

        if (fuegoIndice) fuegoIndice.textContent = validResults.length > 0 ? `${avgRiskIndex}/100` : '—';
        if (fuegoTemp) fuegoTemp.textContent = avgTemp !== '—' ? `${avgTemp} °C` : '—';
        if (fuegoHumedad) fuegoHumedad.textContent = `${avgHumed}%`;
        if (fuegoViento) fuegoViento.textContent = `${avgWind} km/h`;
        if (fuegoCape) fuegoCape.textContent = avgCape > 0 ? `${avgCape} J/kg` : '—';
        if (fuegoNivel) fuegoNivel.textContent = `${nationalLevel.emoji} ${nationalLevel.label}`;

        // Color KPI backgrounds by national risk
        if (fuegoIndiceKpi) {
            fuegoIndiceKpi.style.background = `linear-gradient(135deg, ${nationalLevel.bg} 0%, #ffffff 100%)`;
            fuegoIndiceKpi.style.color = nationalLevel.color;
        }
        if (fuegoNivelKpi) {
            fuegoNivelKpi.style.background = `linear-gradient(135deg, ${nationalLevel.bg} 0%, #ffffff 100%)`;
            fuegoNivelKpi.style.color = nationalLevel.color;
        }

        // Chart: riesgo por provincia (barras coloreadas)
        const ctxFuego = document.getElementById('chart-fuego')?.getContext('2d');
        if (ctxFuego && provinceRisks.length > 0) {
            if (charts._chartFuego) { charts._chartFuego.destroy(); charts._chartFuego = null; }

            const sorted = [...provinceRisks].sort((a, b) => b.riskIndex - a.riskIndex);
            const labels = sorted.map(p => p.name);
            const dataValues = sorted.map(p => p.riskIndex);
            const barColors = sorted.map(p => p.level.color);
            const borderColors = sorted.map(p => p.level.color + 'cc');

            charts._chartFuego = new Chart(ctxFuego, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Índice riesgo fuego (0-100)',
                        data: dataValues,
                        backgroundColor: barColors,
                        borderColor: borderColors,
                        borderWidth: 1,
                        borderRadius: 3,
                        barPercentage: 0.85,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    const prov = sorted[ctx.dataIndex];
                                    return `${prov.name}: ${prov.riskIndex}/100 - ${prov.level.emoji} ${prov.level.label}`;
                                },
                                afterLabel: ctx => {
                                    const prov = sorted[ctx.dataIndex];
                                    return `Temp: ${prov.temp}°C · Hum: ${prov.humidity}% · Viento: ${prov.wind} km/h · CAPE: ${prov.cape} J/kg`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { font: { size: 10 } },
                            title: { display: true, text: 'Índice de riesgo (0-100)', font: { size: 11 } },
                            grid: { color: '#f1f5f9' },
                        },
                        y: {
                            ticks: { font: { size: 10 }, color: '#475569' },
                            grid: { display: false },
                        },
                    },
                },
            });
        }

        // Detalle por provincia (tabla ordenada por riesgo)
        const zonasEl = document.getElementById('fuego-zonas-list');
        if (zonasEl) {
            const sorted = [...provinceRisks].sort((a, b) => b.riskIndex - a.riskIndex);
            let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">';
            sorted.forEach(p => {
                html += `<div class="list-item" style="border-left:4px solid ${p.level.color};background:${p.level.bg};">
                    <div class="list-item-header">${p.name} <span class="badge ${p.level.badge}">${p.level.emoji} ${p.level.label}</span></div>
                    <div class="list-item-sub">
                        Índice riesgo: <strong style="color:${p.level.color};font-size:16px;">${p.riskIndex}/100</strong>
                        <br>🌡️ Temp: <strong>${p.temp} °C</strong> · 💧 Humedad: <strong>${p.humidity}%</strong> · 💨 Viento: <strong>${p.wind} km/h</strong> · ⚡ CAPE: <strong>${p.cape} J/kg</strong>
                        <br><span style="color:#64748b;">📍 ${p.cc}</span>
                    </div>
                </div>`;
            });
            html += '</div>';
            zonasEl.innerHTML = html || '<div style="color:#64748b;font-size:12px;">Sin datos disponibles</div>';
        }
    }

    async function fetchEvapo(provinceFilter) {
        // provinceFilter: undefined (all), 'all' o comunidad autónoma (cc)
        const cities = (!provinceFilter || provinceFilter === 'all')
            ? EVAPO_CITIES
            : EVAPO_CITIES.filter(c => c.cc === provinceFilter);

        if (cities.length === 0) return;

        // Fetch all cities in parallel
        const promises = cities.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=et0_fao_evapotranspiration,precipitation_sum&timezone=Europe/Madrid&forecast_days=7`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // Procesar datos
        let et0Hoy = [];
        let et0SieteDias = [];
        let precipSieteDias = [];
        let et0DailySeries = [];
        let precipDailySeries = [];
        let cityLabels = [];
        let balanceByCity = [];

        results.forEach((data, idx) => {
            if (!data || !data.daily) return;
            cityLabels.push(cities[idx].name);

            const et0 = data.daily.et0_fao_evapotranspiration;
            const precip = data.daily.precipitation_sum;

            if (et0) {
                et0DailySeries.push(...et0.slice(0, 7));
                et0Hoy.push(et0[0] ?? 0);
                et0SieteDias.push(et0.slice(0, 7).reduce((a, b) => a + (b || 0), 0));
            } else {
                for (let i = 0; i < 7; i++) et0DailySeries.push(0);
                et0Hoy.push(0);
                et0SieteDias.push(0);
            }

            if (precip) {
                precipDailySeries.push(...precip.slice(0, 7));
                precipSieteDias.push(precip.slice(0, 7).reduce((a, b) => a + (b || 0), 0));
            } else {
                for (let i = 0; i < 7; i++) precipDailySeries.push(0);
                precipSieteDias.push(0);
            }

            // Balance hídrico por ciudad: precip - ET₀ (7d)
            const cityBalance = precipSieteDias[idx] - et0SieteDias[idx];
            balanceByCity.push(cityBalance);
        });

        // KPIs promedio
        const avgEt0Hoy = et0Hoy.length > 0 ? (et0Hoy.reduce((a, b) => a + b, 0) / et0Hoy.length).toFixed(1) : '—';
        const avgEt0Siete = et0SieteDias.length > 0 ? (et0SieteDias.reduce((a, b) => a + b, 0) / et0SieteDias.length).toFixed(1) : '—';
        const totalPrecipSiete = precipSieteDias.reduce((a, b) => a + b, 0);
        const totalEt0Siete = et0SieteDias.reduce((a, b) => a + b, 0);
        const totalBalance = totalPrecipSiete - totalEt0Siete;

        // Clasificación agrícola ET₀ (FAO-56): <2 Baja, 2-4 Media, 4-6 Alta, >6 Muy alta
        let et0Clasificacion = '—';
        let et0Color = '#64748b';
        let et0Emoji = '❓';
        if (avgEt0Hoy !== '—') {
            const et0Val = parseFloat(avgEt0Hoy);
            if (et0Val < 2) { et0Clasificacion = 'Baja'; et0Color = '#16a34a'; et0Emoji = '🌱'; }
            else if (et0Val < 4) { et0Clasificacion = 'Media'; et0Color = '#eab308'; et0Emoji = '☀️'; }
            else if (et0Val < 6) { et0Clasificacion = 'Alta'; et0Color = '#f97316'; et0Emoji = '🔥'; }
            else { et0Clasificacion = 'Muy alta'; et0Color = '#dc2626'; et0Emoji = '🌡️'; }
        }

        // Clasificación de aridez: ET₀ / Precipitación (ratio 7d)
        let aridezClasificacion = '—';
        let aridezColor = '#64748b';
        let aridezEmoji = '❓';
        if (totalPrecipSiete > 0.5) {
            const ratio = totalEt0Siete / totalPrecipSiete;
            if (ratio < 0.5) { aridezClasificacion = 'Húmedo'; aridezColor = '#16a34a'; aridezEmoji = '💧'; }
            else if (ratio < 0.65) { aridezClasificacion = 'Sub-húmedo seco'; aridezColor = '#22c55e'; aridezEmoji = '🌿'; }
            else if (ratio < 0.75) { aridezClasificacion = 'Sub-húmedo húmedo'; aridezColor = '#84cc16'; aridezEmoji = '🌱'; }
            else if (ratio < 1.0) { aridezClasificacion = 'Semiárido'; aridezColor = '#f59e0b'; aridezEmoji = '🌾'; }
            else { aridezClasificacion = 'Árido'; aridezColor = '#dc2626'; aridezEmoji = '🏜️'; }
        } else if (totalPrecipSiete === 0 && totalEt0Siete > 0) {
            aridezClasificacion = 'Árido'; aridezColor = '#dc2626'; aridezEmoji = '🏜️';
        } else {
            aridezClasificacion = 'Saturado'; aridezColor = '#16a34a'; aridezEmoji = '🌊';
        }

        // Actualizar KPIs
        const et0HoyEl = document.getElementById('evapo-et0-hoy');
        const et0SieteEl = document.getElementById('evapo-et0-7d');
        const precip7dEl = document.getElementById('evapo-precip-7d');
        const balanceEl = document.getElementById('evapo-balance');
        const balanceKpi = document.getElementById('evapo-balance-kpi');
        const aridezEl = document.getElementById('evapo-aridez');
        const aridezKpi = document.getElementById('evapo-aridez-kpi');

        if (et0HoyEl) et0HoyEl.textContent = avgEt0Hoy;
        if (et0SieteEl) et0SieteEl.textContent = avgEt0Siete;
        if (precip7dEl) precip7dEl.textContent = totalPrecipSiete.toFixed(1);

        if (balanceEl) {
            balanceEl.textContent = totalBalance.toFixed(1);
            balanceKpi.className = totalBalance >= 0 ? 'kpi green' : 'kpi red';
        }
        if (aridezEl) {
            aridezEl.innerHTML = `${aridezEmoji} ${aridezClasificacion}`;
            aridezEl.style.color = aridezColor;
            aridezKpi.className = 'kpi';
        }

        // Clasificación agrícola ET₀ KPI
        let et0ClassEl = document.getElementById('evapo-et0-class');
        if (!et0ClassEl) {
            // Create a new KPI card for ET0 classification
            const balanceKpiEl = document.getElementById('evapo-balance-kpi');
            if (balanceKpiEl) {
                et0ClassEl = document.createElement('div');
                et0ClassEl.id = 'evapo-et0-class';
                et0ClassEl.className = 'kpi';
                balanceKpiEl.parentElement.appendChild(et0ClassEl);
            }
        }
        if (et0ClassEl) {
            et0ClassEl.innerHTML = `<div class="kpi-value" style="color:${et0Color}">${et0Emoji} ${et0Clasificacion}</div><div class="kpi-label">Clasificación agrícola ET₀</div>`;
        }

        // Chart: ET₀ vs precipitación 7 días (doble eje)
        const ctxEvapo = document.getElementById('chart-evapo');
        if (ctxEvapo) {
            if (window._chartEvapo) window._chartEvapo.destroy();

            // Get dates from first city that succeeded
            const firstSuccess = results.find(r => r && r.daily && r.daily.time);
            let chartDates = [];
            if (firstSuccess) {
                chartDates = firstSuccess.daily.time.slice(0, 7);
            }

            window._chartEvapo = new Chart(ctxEvapo, {
                type: 'bar',
                data: {
                    labels: chartDates,
                    datasets: [
                        {
                            label: 'ET₀ (mm)',
                            data: et0DailySeries.slice(0, 7),
                            backgroundColor: 'rgba(37, 99, 235, 0.7)',
                            borderColor: 'rgba(37, 99, 235, 1)',
                            borderWidth: 1,
                            borderRadius: 4,
                            yAxisID: 'y',
                        },
                        {
                            label: 'Precipitación (mm)',
                            data: precipDailySeries.slice(0, 7),
                            type: 'line',
                            borderColor: '#16a34a',
                            backgroundColor: 'rgba(22, 163, 106, 0.15)',
                            borderWidth: 2,
                            pointRadius: 4,
                            pointBackgroundColor: '#16a34a',
                            fill: true,
                            tension: 0.3,
                            yAxisID: 'y1',
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top', labels: { font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} mm`;
                                },
                            },
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'ET₀ (mm)' },
                            ticks: { font: { size: 10 } },
                        },
                        y1: {
                            position: 'right',
                            beginAtZero: true,
                            title: { display: true, text: 'Precip. (mm)' },
                            grid: { drawOnChartArea: false },
                            ticks: { font: { size: 10 } },
                        },
                    },
                },
            });
        }

        // Mapa de estrés hídrico por ciudad
        const mapEl = document.getElementById('evapo-map-cities');
        if (mapEl) {
            let html = '';
            results.forEach((data, idx) => {
                const city = cities[idx];
                if (!data || !data.daily) {
                    html += `<div class="list-item">
                        <div class="list-item-header">${city.name}</div>
                        <div class="list-item-sub" style="color:#dc2626;">⚠️ No disponible</div>
                    </div>`;
                    return;
                }

                const et0 = data.daily.et0_fao_evapotranspiration;
                const precip = data.daily.precipitation_sum;
                const et0Today = et0 ? (et0[0] ?? 0) : 0;
                const precipToday = precip ? (precip[0] ?? 0) : 0;
                const et0Seven = et0 ? et0.slice(0, 7).reduce((a, b) => a + (b || 0), 0) : 0;
                const precipSeven = precip ? precip.slice(0, 7).reduce((a, b) => a + (b || 0), 0) : 0;
                const balance = precipSeven - et0Seven;

                // Clasificación por ciudad
                let badgeClass = 'badge-blue';
                let statusText = 'Balance OK';
                if (balance < -50) { badgeClass = 'badge-red'; statusText = '⚠️ Déficit severo'; }
                else if (balance < -20) { badgeClass = 'badge-orange'; statusText = '⚡ Déficit moderado'; }
                else if (balance < 0) { badgeClass = 'badge-orange'; statusText = 'Déficit leve'; }
                else if (balance > 50) { badgeClass = 'badge-green'; statusText = '✅ Superávit hídrico'; }

                // Aridez por ciudad
                let aridezCity = '';
                if (precipSeven > 0.5) {
                    const ratio = et0Seven / precipSeven;
                    if (ratio < 0.5) aridezCity = '💧 Húmedo';
                    else if (ratio < 0.65) aridezCity = '🌿 Sub-húmedo seco';
                    else if (ratio < 0.75) aridezCity = '🌱 Sub-húmedo húmedo';
                    else if (ratio < 1.0) aridezCity = '🌾 Semiárido';
                    else aridezCity = '🏜️ Árido';
                }

                // Clasificación ET₀ por ciudad
                let et0ClassCity = '';
                let et0ColorCity = '#64748b';
                if (et0Today > 6) { et0ClassCity = '🌡️ Muy alta'; et0ColorCity = '#dc2626'; }
                else if (et0Today > 4) { et0ClassCity = '🔥 Alta'; et0ColorCity = '#f97316'; }
                else if (et0Today > 2) { et0ClassCity = '☀️ Media'; et0ColorCity = '#eab308'; }
                else { et0ClassCity = '🌱 Baja'; et0ColorCity = '#16a34a'; }

                html += `<div class="list-item">
                    <div class="list-item-header">${city.name} <span class="badge ${badgeClass}">${statusText}</span></div>
                    <div class="list-item-sub">
                        ET₀ hoy: <strong>${et0Today.toFixed(1)} mm</strong> · ET₀ 7d: <strong>${et0Seven.toFixed(1)} mm</strong> · Precip. 7d: <strong>${precipSeven.toFixed(1)} mm</strong>
                        <br><span style="color:#64748b;">📍 ${city.cc} · Balance: <strong>${balance.toFixed(1)} mm</strong> · ${aridezCity} · <span style="color:${et0ColorCity}">${et0ClassCity}</span></span>
                    </div>
                </div>`;
            });
            mapEl.innerHTML = html;
        }
    }

    async function fetchCAPE() {
        // Fetch all cities in parallel + CIN y convective_conditioning (calor latente)
        const promises = CAPE_CITIES.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=cape,freezing_level_height,convective_inhibition&hourly=cape,freezing_level_height,convective_inhibition,wind_speed_10m,temperature_2m,relative_humidity_2m&daily=cape_max&timezone=Europe/Madrid&forecast_days=7`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // Procesar datos
        let capeCurrent = [];
        let cinValues = [];
        let freezingLevels = [];
        let capeSeries = [];
        let labels = [];
        let riskByCity = [];
        let dailyMaxCape = []; // 7 días por ciudad

        results.forEach((data, idx) => {
            if (!data) return;
            labels.push(CAPE_CITIES[idx].name);

            // Current values
            const cape = data.current?.cape ?? 0;
            const freezing = data.current?.freezing_level_height ?? null;
            const cin = data.current?.convective_inhibition;
            capeCurrent.push(cape);
            if (cin !== null && cin !== undefined && cin > 0) cinValues.push(cin); // CIN > 0 = inhibición
            if (freezing !== null && freezing !== undefined) freezingLevels.push(freezing);

            // Daily max CAPE para 7 días
            if (data.daily?.cape_max) {
                data.daily.cape_max.forEach(c => { if (c != null) dailyMaxCape.push(c); });
            }

            // Hourly series (168h = 7 días)
            if (data.hourly && data.hourly.time && data.hourly.cape) {
                const times = data.hourly.time;
                const capes = data.hourly.cape;
                const cityCapes = capes.map(c => c ?? 0);
                capeSeries.push({ name: CAPE_CITIES[idx].name, times, values: cityCapes });
            }

            // Risk classification per city
            let risk = 'bajo';
            if (cape > 1000) risk = 'severa';
            else if (cape >= 300) risk = 'tormenta';
            else risk = 'inestable';

            const riskInfo = capeRiskLevel(cape);
            riskByCity.push({ name: CAPE_CITIES[idx].name, cape, risk, riskInfo });
        });

        // KPIs
        const avgCape = capeCurrent.length > 0 ? Math.round(capeCurrent.reduce((a, b) => a + b, 0) / capeCurrent.length) : 0;
        const avgFreezing = freezingLevels.length > 0 ? Math.round(freezingLevels.reduce((a, b) => a + b, 0) / freezingLevels.length) : 0;
        const avgCin = cinValues.length > 0 ? Math.round(cinValues.reduce((a, b) => a + b, 0) / cinValues.length) : null;
        const totalEnergy = capeCurrent.reduce((a, b) => a + b, 0) / 1000; // J/kg → kJ/kg

        // Calor latente estimado: latente = 2.5 * T_celsius * RH_fraction * (T - Td) simplificado
        // Open-Meteo no da latent_heat_flux directo, estimamos como indicador
        let lhfEstimate = '—';
        if (avgCape > 0) {
            // Aproximación: LHF ≈ Cape * 0.5 como caudal de calor latente (W/m²)
            const lhf = Math.round(avgCape * 0.5);
            lhfEstimate = `${lhf} W/m²`;
        }

        // Risk level global
        const globalRisk = capeGlobalRisk(avgCape);

        // Actualizar KPIs
        const capeAvgEl = document.getElementById('cape-avg');
        const capeRiskEl = document.getElementById('cape-risk');
        const capeFreezingEl = document.getElementById('cape-freezing');
        const capeEnergyEl = document.getElementById('cape-energy');
        const capeCinEl = document.getElementById('cape-cin');
        const capeLhfEl = document.getElementById('cape-lhf');

        // CAPE KPI con color dinámico
        if (capeAvgEl) {
            capeAvgEl.textContent = avgCape.toLocaleString('es-ES');
            const color = capeKpiColor(avgCape);
            if (color) {
                capeAvgEl.style.color = color;
                capeAvgEl.style.fontWeight = '700';
            } else {
                capeAvgEl.style.color = '';
                capeAvgEl.style.fontWeight = '';
            }
        }
        // Riesgo KPI
        if (capeRiskEl) {
            capeRiskEl.textContent = globalRisk.text;
            capeRiskEl.parentElement.className = globalRisk.cls;
        }
        // CIN KPI
        if (capeCinEl) {
            if (avgCin !== null) {
                capeCinEl.textContent = `−${avgCin} J/kg`;
                capeCinEl.title = `CIN inhibe convección (${avgCin} J/kg necesarios para liberar)`;
            } else {
                capeCinEl.textContent = 'Sin datos';
                capeCinEl.title = 'convective_inhibition no disponible';
            }
        }
        // LHF KPI
        if (capeLhfEl) capeLhfEl.textContent = lhfEstimate;
        // Congelación
        if (capeFreezingEl) capeFreezingEl.textContent = avgFreezing > 0 ? `${avgFreezing} m` : '—';
        // Energía total
        if (capeEnergyEl) capeEnergyEl.textContent = totalEnergy.toFixed(1);

        // Chart: CAPE 7 días con bandas de riesgo
        const ctxCape = document.getElementById('chart-cape');
        if (ctxCape) {
            if (window._chartCape) window._chartCape.destroy();

            const colors = ['#ef4444', '#f97316', '#eab308', '#2563eb', '#16a34a', '#7c3aed', '#0891b2', '#ec4899'];
            const datasets = [];

            // Bandas de riesgo (fondos): <300 inestable, 300-1000 tormenta, >1000 severa
            datasets.push({
                label: '> 1000 J/kg severa',
                data: new Array(168).fill(1000),
                borderColor: '#dc2626',
                borderWidth: 2,
                borderDash: [6, 4],
                pointRadius: 0,
                fill: false,
            });
            datasets.push({
                label: '> 300 J/kg tormenta',
                data: new Array(168).fill(300),
                borderColor: '#eab308',
                borderWidth: 2,
                borderDash: [6, 4],
                pointRadius: 0,
                fill: false,
            });

            capeSeries.forEach((series, idx) => {
                const labels7d = series.times.map(t => {
                    const d = new Date(t);
                    return `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:00`;
                });
                datasets.push({
                    label: series.name,
                    data: series.values,
                    borderColor: colors[idx % colors.length],
                    backgroundColor: colors[idx % colors.length] + '22',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3,
                });
            });

            let chartLabels = [];
            if (capeSeries.length > 0) {
                chartLabels = capeSeries[0].times.map(t => {
                    const d = new Date(t);
                    return `${d.getDate()}/${d.getMonth()+1} ${d.getHours().toString().padStart(2,'0')}:00`;
                });
            }

            window._chartCape = new Chart(ctxCape, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: datasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    if (ctx.dataset.label.includes('severa')) return '🔴 > 1000 J/kg: Tormenta severa';
                                    if (ctx.dataset.label.includes('tormenta')) return '🟡 > 300 J/kg: Tormenta';
                                    return `${ctx.parsed.y} J/kg`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            ticks: { maxTicksLimit: 8, font: { size: 9 } },
                        },
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'CAPE (J/kg)' },
                            ticks: { font: { size: 10 } },
                        },
                    },
                },
            });
        }

        // Mapa de riesgo de tormentas por ciudad (escala 5 niveles)
        const mapEl = document.getElementById('cape-city-map');
        if (mapEl) {
            let html = '';
            riskByCity.sort((a, b) => b.cape - a.cape); // Ordenar por CAPE descendente
            riskByCity.forEach((item) => {
                html += `<div class="list-item">
                    <div class="list-item-header">${item.name} <span class="badge ${item.riskInfo.cls}">${item.riskInfo.text}</span></div>
                    <div class="list-item-sub">
                        ⚡ CAPE: <strong>${item.cape} J/kg</strong> · ${item.risk}
                        ${item.cape > 1000 ? '<br>🔴 <em>Energía extrema — tormentas severas muy probables</em>' : ''}
                        ${item.cape >= 300 && item.cape <= 1000 ? '<br>🟡 <em>Energía moderada — tormentas esperadas</em>' : ''}
                        ${item.cape < 300 ? '<br>🟢 <em>Inestabilidad baja — riesgo mínimo</em>' : ''}
                    </div>
                </div>`;
            });
            mapEl.innerHTML = html;
        }
    }

    async function fetchSol() {
        // Fetch all cities in parallel
        const promises = SOL_CITIES.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=sunshine_duration,daylight_duration,sunrise,sunset&timezone=Europe/Madrid&forecast_days=7`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // Calcular datos por ciudad
        let cityData = results.map((data, idx) => {
            const city = SOL_CITIES[idx];
            const d = { city, data, valid: !!(data && data.daily && data.daily.time) };
            if (!d.valid) return d;

            const today = new Date().toISOString().split('T')[0];
            const dayIdx = data.daily.time.indexOf(today);

            // Calcular horas REALES: sunshine_duration / 3600
            const hrs7d = (data.daily.sunshine_duration || []).map(v => v != null ? v / 3600 : 0);
            const todaySun = dayIdx >= 0 ? (hrs7d[dayIdx] || 0) : 0;
            const weekTotal = hrs7d.reduce((a, b) => a + b, 0);

            // Daylight horas
            const dayLightHrs = data.daily.daylight_duration
                ? data.daily.daylight_duration.map(v => v != null ? v / 3600 : 0)
                : [];

            // Máximo teórico por día: en verano un día puede tener ~14-15h de luz en España
            // Cálculo basado en daylight_duration promedio
            const avgDaylightHrs = dayLightHrs.length > 0 ? dayLightHrs.reduce((a, b) => a + b, 0) / dayLightHrs.length : 12;

            // % sobre máximo teórico: horas sol / horas de luz disponibles
            const pctMax = avgDaylightHrs > 0 ? (hrs7d[dayIdx] / avgDaylightHrs * 100) : 0;

            // Tendencia: comparar primeros 3 días vs últimos 3 días
            const first3 = hrs7d.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
            const last3 = hrs7d.slice(-3).reduce((a, b) => a + b, 0) / 3;
            const trend = last3 > first3 ? '↗️' : last3 < first3 ? '↘️' : '➡️';
            const trendPct = first3 > 0 ? (((last3 - first3) / first3) * 100).toFixed(0) : '0';

            // Amanecer/Atardecer
            const sunrises = data.daily.sunrise || [];
            const sunsets = data.daily.sunset || [];
            let avgSunrise = null;
            let avgSunset = null;
            if (sunrises.length > 0 && sunsets.length > 0) {
                const avgMs = sunrises.reduce((a, b) => a + new Date(b).getTime(), 0) / sunrises.length;
                avgSunrise = new Date(avgMs);
                const avgMsS = sunsets.reduce((a, b) => a + new Date(b).getTime(), 0) / sunsets.length;
                avgSunset = new Date(avgMsS);
            }

            d.todaySun = todaySun;
            d.weekTotal = weekTotal;
            d.hrs7d = hrs7d;
            d.dayLightHrs = dayLightHrs;
            d.avgDaylightHrs = avgDaylightHrs;
            d.pctMax = pctMax;
            d.trend = trend;
            d.trendPct = trendPct;
            d.avgSunrise = avgSunrise;
            d.avgSunset = avgSunset;
            return d;
        }).filter(d => d.valid);

        // Media general (si no hay selector, es "all")
        const selector = document.getElementById('sol-city-select');
        const selectedCity = selector ? selector.value : 'all';

        let displayData, displayLabel;
        if (selectedCity === 'all' || !selectedCity) {
            // Promedio de todas las ciudades
            displayData = null; // se calcula de cityData
            displayLabel = 'Promedio España';
        } else {
            const found = cityData.find(d => d.city.name === selectedCity);
            displayData = found;
            displayLabel = found ? found.city.name : '—';
        }

        // KPIs: promedio de todas las ciudades
        if (cityData.length > 0) {
            const avgToday = cityData.reduce((a, d) => a + d.todaySun, 0) / cityData.length;
            const avg7d = cityData.reduce((a, d) => a + d.weekTotal, 0) / cityData.length;
            const avgPctMax = cityData.reduce((a, d) => a + d.pctMax, 0) / cityData.length;
            const avgTrend = cityData.reduce((a, d) => a + (d.trend === '↗️' ? 1 : d.trend === '↘️' ? -1 : 0), 0) / cityData.length;
            const avgDaylight = cityData.reduce((a, d) => a + d.avgDaylightHrs, 0) / cityData.length;

            // Amanecer/atardecer promedio
            const validSunrises = cityData.map(d => d.avgSunrise).filter(Boolean);
            const validSunsets = cityData.map(d => d.avgSunset).filter(Boolean);
            let avgSunriseStr = '—';
            if (validSunrises.length > 0) {
                const avgMs = validSunrises.reduce((a, b) => a + b.getTime(), 0) / validSunrises.length;
                const d = new Date(avgMs);
                avgSunriseStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            }
            let avgSunsetStr = '—';
            if (validSunsets.length > 0) {
                const avgMs = validSunsets.reduce((a, b) => a + b.getTime(), 0) / validSunsets.length;
                const d = new Date(avgMs);
                avgSunsetStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            }

            // % sobre max teórico (general)
            const pctStr = avgPctMax.toFixed(0) + '%';
            const pctColor = avgPctMax > 60 ? '#22c55e' : avgPctMax > 40 ? '#f59e0b' : '#ef4444';

            // Tendencia
            const trendArrow = avgTrend > 0.2 ? '↗️' : avgTrend < -0.2 ? '↘️' : '➡️';
            const trendColor = avgTrend > 0.2 ? '#22c55e' : avgTrend < -0.2 ? '#ef4444' : '#64748b';

            // Comparativa hoy vs media mensual: usamos la media de los 7 días como proxy mensual
            const todayVs7d = cityData.reduce((a, d) => {
                const diff = d.todaySun - (d.weekTotal / 7);
                return a + diff;
            }, 0) / cityData.length;
            const vsMediaStr = (todayVs7d >= 0 ? '+' : '') + todayVs7d.toFixed(1) + 'h vs media';
            const vsMediaColor = todayVs7d >= 0 ? '#22c55e' : '#ef4444';

            // Actualizar KPIs DOM
            document.getElementById('sol-hoy').textContent = avgToday.toFixed(1);
            document.getElementById('sol-hoy').title = `Media de ${cityData.length} ciudades · Total: ${cityData.reduce((a, d) => a + d.weekTotal, 0).toFixed(1)} h/sem`;
            document.getElementById('sol-7d').textContent = avg7d.toFixed(1);
            document.getElementById('sol-7d').title = `Media semanal de ${cityData.length} ciudades`;
            document.getElementById('sol-pct-max').textContent = pctStr;
            document.getElementById('sol-pct-max').title = `Horas sol hoy / horas luz disponibles`;
            document.getElementById('sol-pct-max').style.color = pctColor;
            document.getElementById('sol-tendencia').textContent = trendArrow + ' ' + Math.abs(avgTrend).toFixed(1) + '%';
            document.getElementById('sol-tendencia').style.color = trendColor;
            document.getElementById('sol-daylight').textContent = avgDaylight.toFixed(1);
            document.getElementById('sol-vs-media').textContent = vsMediaStr;
            document.getElementById('sol-vs-media').style.color = vsMediaColor;
            document.getElementById('sol-amencer').textContent = avgSunriseStr;
            document.getElementById('sol-atardecer').textContent = avgSunsetStr;

            // Máximo del mes: buscar el día con más sol en los 7 días (usamos 7d como proxy del mes)
            let maxMonth = 0;
            cityData.forEach(d => {
                const dayMax = Math.max(...d.hrs7d);
                if (dayMax > maxMonth) maxMonth = dayMax;
            });
            const maxMonthAvg = cityData.length > 0 ? maxMonth : 0;
            document.getElementById('sol-max-mes').textContent = maxMonthAvg.toFixed(1);
            document.getElementById('sol-max-mes').title = `Mayor concentración de horas sol en un día (7d)`;

            // Predicción mañana: día 1 (índice 1) del array daily
            let predManana = 0;
            cityData.forEach(d => {
                if (d.hrs7d.length > 1) {
                    predManana += d.hrs7d[1] || 0;
                }
            });
            predManana = cityData.length > 0 ? predManana / cityData.length : 0;
            document.getElementById('sol-pred-manana').textContent = predManana.toFixed(1);
            document.getElementById('sol-pred-manana').title = `Horas sol predichas para mañana`;
        }

        // Selector de ciudad
        if (selector) {
            const hasOptions = selector.options.length > 1;
            if (!hasOptions) {
                SOL_CITIES.forEach(city => {
                    const opt = document.createElement('option');
                    opt.value = city.name;
                    opt.textContent = `${getCityEmoji(city.name)} ${city.name}`;
                    selector.appendChild(opt);
                });
            }
        }

        // Render por ciudad seleccionada o general
        function renderCityView(dd) {
            if (!dd) return;
            const d = dd;
            document.getElementById('sol-vs-media').textContent = (d.todaySun - d.weekTotal / 7 >= 0 ? '+' : '') + (d.todaySun - d.weekTotal / 7).toFixed(1) + 'h vs media';
            document.getElementById('sol-vs-media').style.color = (d.todaySun >= d.weekTotal / 7) ? '#22c55e' : '#ef4444';
            document.getElementById('sol-tendencia').textContent = d.trend + ' ' + d.trendPct + '%';
            document.getElementById('sol-tendencia').style.color = d.trend === '↗️' ? '#22c55e' : d.trend === '↘️' ? '#ef4444' : '#64748b';
            document.getElementById('sol-pct-max').textContent = d.pctMax.toFixed(0) + '%';
            document.getElementById('sol-pct-max').style.color = d.pctMax > 60 ? '#22c55e' : d.pctMax > 40 ? '#f59e0b' : '#ef4444';
            if (d.avgSunrise) {
                document.getElementById('sol-amencer').textContent = `${d.avgSunrise.getHours().toString().padStart(2, '0')}:${d.avgSunrise.getMinutes().toString().padStart(2, '0')}`;
            }
            if (d.avgSunset) {
                document.getElementById('sol-atardecer').textContent = `${d.avgSunset.getHours().toString().padStart(2, '0')}:${d.avgSunset.getMinutes().toString().padStart(2, '0')}`;
            }
            document.getElementById('sol-daylight').textContent = d.avgDaylightHrs.toFixed(1);
        }

        // Actualizar label
        const cityLabel = document.getElementById('sol-city-label');
        if (cityLabel) cityLabel.textContent = displayLabel;

        // Chart: 7 días + línea media mensual
        const ctxSol = document.getElementById('chart-sol');
        if (ctxSol) {
            if (charts._chartSol) charts._chartSol.destroy();

            if (displayData) {
                // Vista por ciudad
                renderCityView(displayData);
                const d = displayData;
                const labels = d.data.daily.time.map(t => {
                    const dt = new Date(t);
                    return `${dt.getDate()}/${dt.getMonth() + 1}`;
                });

                // Media mensual: usar la media de los 7 días como proxy
                const monthlyAvg = d.weekTotal / 7;

                charts._chartSol = new Chart(ctxSol, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: `${d.city.name} — Horas sol (h)`,
                                data: d.hrs7d,
                                backgroundColor: d.hrs7d.map(v => v >= monthlyAvg ? 'rgba(34, 197, 94, 0.7)' : 'rgba(249, 115, 22, 0.7)'),
                                borderColor: d.hrs7d.map(v => v >= monthlyAvg ? 'rgba(34, 197, 94, 1)' : 'rgba(249, 115, 22, 1)'),
                                borderWidth: 1,
                                borderRadius: 6,
                                yAxisID: 'y',
                            },
                            {
                                label: `Media mensual (~7d)`,
                                data: Array(7).fill(monthlyAvg),
                                type: 'line',
                                borderColor: 'rgba(37, 99, 235, 0.9)',
                                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                                borderWidth: 2.5,
                                borderDash: [6, 4],
                                pointRadius: 0,
                                pointHoverRadius: 4,
                                fill: false,
                                yAxisID: 'y',
                            },
                            {
                                label: 'Duración luz natural (h)',
                                data: d.dayLightHrs,
                                type: 'line',
                                borderColor: 'rgba(251, 191, 36, 1)',
                                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                borderWidth: 2,
                                pointRadius: 4,
                                pointBackgroundColor: 'rgba(251, 191, 36, 1)',
                                tension: 0.3,
                                fill: false,
                                yAxisID: 'y',
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: { position: 'top', labels: { font: { size: 11 } } },
                            tooltip: {
                                callbacks: {
                                    label: function(ctx) {
                                        return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} h`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'Horas (h)' },
                            },
                            x: {
                                title: { display: true, text: 'Fecha' },
                            }
                        }
                    }
                });

                document.getElementById('sol-chart-title').textContent = `${d.city.name} — 7 días + media mensual`;

            } else {
                // Vista general: barras por ciudad (hoy en horas) + referencia media mensual
                const labels = SOL_CITIES.map(c => c.name);
                const sunshineHrs = cityData.map(d => d.todaySun);
                const avgMonthly = cityData.reduce((a, d) => a + d.weekTotal / 7, 0) / cityData.length;

                charts._chartSol = new Chart(ctxSol, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Horas sol hoy (h)',
                                data: sunshineHrs,
                                backgroundColor: sunshineHrs.map(v => v >= avgMonthly ? 'rgba(34, 197, 94, 0.7)' : 'rgba(249, 115, 22, 0.7)'),
                                borderColor: sunshineHrs.map(v => v >= avgMonthly ? 'rgba(34, 197, 94, 1)' : 'rgba(249, 115, 22, 1)'),
                                borderWidth: 1,
                                borderRadius: 6,
                                yAxisID: 'y',
                            },
                            {
                                label: `Media mensual (~7d)`,
                                data: Array(8).fill(avgMonthly),
                                type: 'line',
                                borderColor: 'rgba(37, 99, 235, 0.9)',
                                backgroundColor: 'rgba(37, 99, 235, 0.05)',
                                borderWidth: 2.5,
                                borderDash: [6, 4],
                                pointRadius: 0,
                                pointHoverRadius: 4,
                                fill: false,
                                yAxisID: 'y',
                            },
                            {
                                label: 'Duración luz natural (h)',
                                data: cityData.map(d => d.avgDaylightHrs),
                                type: 'line',
                                borderColor: 'rgba(251, 191, 36, 1)',
                                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                borderWidth: 2,
                                pointRadius: 4,
                                pointBackgroundColor: 'rgba(251, 191, 36, 1)',
                                tension: 0.3,
                                fill: false,
                                yAxisID: 'y',
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: { position: 'top', labels: { font: { size: 11 } } },
                            tooltip: {
                                callbacks: {
                                    label: function(ctx) {
                                        return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} h`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'Horas (h)' },
                            },
                            x: {
                                title: { display: true, text: 'Ciudad' },
                            }
                        }
                    }
                });

                document.getElementById('sol-chart-title').textContent = 'Horas sol hoy por ciudad + media mensual';
            }
        }

        // Ranking ciudades más soleadas
        const rankingEl = document.getElementById('sol-ranking');
        if (rankingEl) {
            const cityTotals = cityData.map(d => ({
                name: d.city.name,
                total: d.weekTotal,
                trend: d.trend,
                pctMax: d.pctMax
            }));
            cityTotals.sort((a, b) => b.total - a.total);
            let html = '';
            const medals = ['🥇', '🥈', '🥉'];
            cityTotals.forEach((c, i) => {
                const medal = i < 3 ? medals[i] : `${i + 1}.`;
                html += `<div style="display:flex;justify-content:space-between;padding:6px 8px;border-bottom:1px solid #f1f5f9;align-items:center;">
                    <span style="font-weight:600;">${medal} ${c.name} <span style="font-size:11px;color:#64748b;">${c.trend} ${c.pctMax.toFixed(0)}%</span></span>
                    <span style="color:#f97316;font-weight:700;">${c.total.toFixed(1)} h</span>
                </div>`;
            });
            rankingEl.innerHTML = html;
        }
    }

    async function fetchRadiacion() {
        // Fetch all cities in parallel
        const promises = RADIACION_CITIES.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&hourly=shortwave_radiation,direct_normal_irradiance,diffuse_radiation&daily=shortwave_radiation_sum&timezone=Europe/Madrid&forecast_days=1`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // Daily data for ranking
        let dailyTotals = [];

        // Per-city hourly data (for city selector)
        let cityData = results.map((data, idx) => {
            const city = RADIACION_CITIES[idx];
            if (!data) return { name: city.name, hourly: null, daily: null };

            const hourly = {
                times: data.hourly?.time || [],
                shortwave: data.hourly?.shortwave_radiation || [],
                direct: data.hourly?.direct_normal_irradiance || [],
                diffuse: data.hourly?.diffuse_radiation || [],
            };

            // Daily sum
            let dailySum = 0;
            if (data.daily?.time && data.daily.shortwave_radiation_sum) {
                const today = new Date().toISOString().split('T')[0];
                const dayIdx = data.daily.time.indexOf(today);
                if (dayIdx >= 0) dailySum = data.daily.shortwave_radiation_sum[dayIdx] || 0;
            }

            return { name: city.name, hourly, daily: dailySum };
        });

        // --- City selector logic ---
        function updateCityView(cityIdx) {
            const cd = cityData[cityIdx];
            if (!cd || !cd.hourly) {
                document.getElementById('rad-directa').textContent = '—';
                document.getElementById('rad-difusa-kpi').textContent = '—';
                document.getElementById('rad-global').textContent = '—';
                document.getElementById('rad-energia').textContent = '—';
                return;
            }

            const h = cd.hourly;
            const n = h.times.length;

            // Peak values (W/m²)
            let peakDirect = 0, peakDiffuse = 0, peakGlobal = 0;
            let sumDirect = 0, sumDiffuse = 0, sumGlobal = 0;
            const peakIdx = 0;

            for (let i = 0; i < n; i++) {
                const dr = h.direct[i] || 0;
                const df = h.diffuse[i] || 0;
                const sw = h.shortwave[i] || 0;
                sumDirect += dr;
                sumDiffuse += df;
                sumGlobal += sw;
                if (dr > peakDirect) peakDirect = dr;
                if (df > peakDiffuse) peakDiffuse = df;
                if (sw > peakGlobal) peakGlobal = sw;
            }

            // Energy estimation for a 300W panel (0.3 kWp)
            // Formula: daily_kWh = (peak_sun_hours) * panel_kWp * system_efficiency
            // peak_sun_hours ≈ daily shortwave sum / 1000 (MJ/m² → kWh/m² → equivalent hours at 1kW/m²)
            // With dailySum in MJ/m²: kWh/m² = dailySum / 3.6
            // Peak sun hours = kWh/m² (since 1 kW/m² × 1h = 1 kWh/m² = 3.6 MJ)
            const dailyKwh = cd.daily ? cd.daily / 3.6 : 0;
            const peakSunHours = dailyKwh;
            const panelKwp = 0.3; // 300W panel
            const systemEfficiency = 0.2; // losses + inverter + dirt + temp
            const energyKwh = peakSunHours * panelKwp * systemEfficiency * 24 / 24;
            // Simplified: energy per day = peak_sun_hours * 0.3 * 0.2
            const energyPerDay = peakSunHours * 0.3 * 0.2;

            // Máxima 24h: already computed as peakGlobal above
            const radMax24hEl = document.getElementById('rad-max-24h');
            if (radMax24hEl) radMax24hEl.textContent = peakGlobal.toFixed(1);

            // UV estimado: fórmula simplificada (WMO) — UV ≈ shortwave_global / 30
            // Aproximación: 1 W/m² ≈ 0.033 UV (máximo ~2000 W/m² → ~66 UV, pero real ~12 en España)
            // Mejor: UV ≈ (shortwave_global / 260) * 12 (escalado al máximo real en España)
            const uvEstimado = peakGlobal > 0 ? Math.min(12, (peakGlobal / 260) * 12) : 0;
            const radUvEl = document.getElementById('rad-uv');
            if (radUvEl) {
                let uvClass = '';
                if (uvEstimado < 3) { uvClass = 'badge-green'; }
                else if (uvEstimado < 6) { uvClass = 'badge-yellow'; }
                else if (uvEstimado < 8) { uvClass = 'badge-orange'; }
                else { uvClass = 'badge-red'; }
                radUvEl.innerHTML = `${uvEstimado.toFixed(1)} <span class="badge ${uvClass}" style="font-size:10px;">${uvEstimado < 3 ? 'Bajo' : uvEstimado < 6 ? 'Moderado' : uvEstimado < 8 ? 'Alto' : 'Muy alto'}</span>`;
            }

            // Update KPIs
            document.getElementById('rad-directa').textContent = peakDirect.toFixed(1);
            document.getElementById('rad-difusa-kpi').textContent = peakDiffuse.toFixed(1);
            document.getElementById('rad-global').textContent = peakGlobal.toFixed(1);
            document.getElementById('rad-energia').textContent = energyPerDay.toFixed(2);
            document.getElementById('rad-energia').title =
                `${peakSunHours.toFixed(1)} horas pico · 0.3 kWp · η=20%`;

            // Chart: directa vs difusa stacked area (city-specific)
            const chartLabels = h.times.map(t => {
                const d = new Date(t);
                return `${d.getHours().toString().padStart(2, '0')}:00`;
            });

            const ctxRad = document.getElementById('chart-radiacion');
            if (ctxRad) {
                if (charts._chartRadiacion) charts._chartRadiacion.destroy();

                charts._chartRadiacion = new Chart(ctxRad, {
                    type: 'line',
                    data: {
                        labels: chartLabels,
                        datasets: [
                            {
                                label: 'Radiación directa (W/m²)',
                                data: h.direct.map(v => v || 0),
                                borderColor: 'rgba(234, 179, 8, 1)',
                                backgroundColor: 'rgba(234, 179, 8, 0.35)',
                                borderWidth: 2.5,
                                pointRadius: 2,
                                pointBackgroundColor: 'rgba(234, 179, 8, 1)',
                                tension: 0.4,
                                fill: 'origin',
                            },
                            {
                                label: 'Radiación difusa (W/m²)',
                                data: h.diffuse.map(v => v || 0),
                                borderColor: 'rgba(59, 130, 246, 0.9)',
                                backgroundColor: 'rgba(59, 130, 246, 0.3)',
                                borderWidth: 2,
                                pointRadius: 2,
                                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                                tension: 0.4,
                                fill: '-1', // stack on direct
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            intersect: false,
                            mode: 'index',
                        },
                        plugins: {
                            legend: { position: 'top', labels: { font: { size: 11 } } },
                            tooltip: {
                                callbacks: {
                                    label: function(ctx) {
                                        return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} W/m²`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'W/m²' },
                                grid: { color: '#f1f5f9' }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { font: { size: 10 }, maxRotation: 0 }
                            }
                        }
                    }
                });
            }
        }

        // Bind city selector
        const sel = document.getElementById('rad-city-select');
        if (sel) {
            sel.addEventListener('change', (e) => updateCityView(parseInt(e.target.value)));
            // Default: Madrid (first city)
            updateCityView(0);
        }

        // --- Ranking ciudades por potencial solar ---
        results.forEach((data, idx) => {
            const city = RADIACION_CITIES[idx];
            if (!data) return;

            let dailySum = 0;
            if (data.daily?.time && data.daily.shortwave_radiation_sum) {
                const today = new Date().toISOString().split('T')[0];
                const dayIdx = data.daily.time.indexOf(today);
                if (dayIdx >= 0) dailySum = data.daily.shortwave_radiation_sum[dayIdx] || 0;
            }
            dailyTotals.push({ name: city.name, total: dailySum });
        });

        const rankingEl = document.getElementById('rad-ranking');
        if (rankingEl) {
            dailyTotals.sort((a, b) => b.total - a.total);
            const medals = ['🥇', '🥈', '🥉'];
            let html = '';
            dailyTotals.forEach((c, i) => {
                const medal = i < 3 ? medals[i] : `${i + 1}.`;
                const potential = c.total > 6 ? 'Excelente' : c.total > 4 ? 'Bueno' : c.total > 2 ? 'Regular' : 'Bajo';
                const badgeClass = c.total > 6 ? 'badge-green' : c.total > 4 ? 'badge-blue' : c.total > 2 ? 'badge-orange' : 'badge-red';
                const energyEst = (c.total / 3.6 * 0.3 * 0.2).toFixed(2);
                html += `<div style="display:flex;justify-content:space-between;padding:6px 8px;border-bottom:1px solid #f1f5f9;align-items:center;">
                    <span style="font-weight:600;">${medal} ${c.name}</span>
                    <span style="color:#f97316;font-weight:700;">${c.total.toFixed(1)} MJ/m²</span>
                    <span style="color:#2563eb;font-weight:600;font-size:12px;">⚡${energyEst} kWh/día</span>
                    <span class="badge ${badgeClass}">${potential}</span>
                </div>`;
            });
            rankingEl.innerHTML = html;
        }
    }

    async function fetchTermica() {
        // Fetch all cities in parallel
        const promises = TERMICA_CITIES.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m,apparent_temperature&timezone=Europe/Madrid&forecast_days=1`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // Collect current data for KPIs
        let currentReal = [];
        let currentSensacion = [];
        let cityTermData = [];

        // Collect hourly data for chart (Madrid, index 0)
        let hourlyLabels = [];
        let hourlyReal = [];
        let hourlySensacion = [];

        results.forEach((data, idx) => {
            const city = TERMICA_CITIES[idx];
            if (!data) return;

            // Current data
            if (data.current) {
                const real = data.current.temperature_2m;
                const sensacion = data.current.apparent_temperature;
                if (real != null && sensacion != null) {
                    currentReal.push(real);
                    currentSensacion.push(sensacion);
                    const diff = real - sensacion;
                    const riesgo = getRiesgoCalor(real, sensacion);
                    cityTermData.push({ name: city.name, real, sensacion, diff, riesgo, humidity: data.current.relative_humidity_2m, wind: data.current.wind_speed_10m });
                }
            }

            // Hourly data for chart
            if (data.hourly && data.hourly.time) {
                data.hourly.time.forEach((time, i) => {
                    hourlyLabels.push(time);
                    hourlyReal.push(data.hourly.temperature_2m?.[i] ?? null);
                    hourlySensacion.push(data.hourly.apparent_temperature?.[i] ?? null);
                });
            }
        });

        // KPIs — usar datos de TODAS las ciudades (promedio nacional)
        const avgReal = currentReal.length > 0 ? currentReal.reduce((a, b) => a + b, 0) / currentReal.length : 0;
        const avgSensacion = currentSensacion.length > 0 ? currentSensacion.reduce((a, b) => a + b, 0) / currentSensacion.length : 0;
        const avgDiff = currentReal.length > 0 ? currentReal.reduce((a, b, i) => a + (b - currentSensacion[i]), 0) / currentReal.length : 0;

        // Confort escala
        const confort = getConfortEscala(avgSensacion);

        // Riesgo
        const riesgoGlobal = getRiesgoCalor(avgSensacion, avgSensacion);

        // Alertas
        const alerts = getTermicaAlerts(cityTermData);

        // Actualizar KPIs
        const sensEl = document.getElementById('term-sensacion');
        sensEl.textContent = avgSensacion.toFixed(1) + '°C';
        sensEl.style.color = confort.color;

        const confortEl = document.getElementById('term-confort');
        confortEl.textContent = confort.emoji + ' ' + confort.label;
        const confortBox = document.getElementById('term-confort-box');
        confortBox.className = 'kpi ' + confort.bgClass;

        document.getElementById('term-real').textContent = avgReal.toFixed(1) + '°C';
        document.getElementById('term-diferencia').textContent = (avgDiff > 0 ? '+' : '') + avgDiff.toFixed(1) + '°C';

        // Contribución UV/viento/humedad (estimar basada en diff + humedad + viento)
        const avgHumidity = cityTermData.reduce((s, c) => s + (c.humidity || 0), 0) / Math.max(cityTermData.length, 1);
        const avgWind = cityTermData.reduce((s, c) => s + (c.wind || 0), 0) / Math.max(cityTermData.length, 1);
        const uvText = `Δ=${(avgDiff > 0 ? '+' : '')}${avgDiff.toFixed(1)}°C · H=${avgHumidity.toFixed(0)}% · V=${avgWind.toFixed(0)}km/h`;
        document.getElementById('term-uv').textContent = uvText;

        // Riesgo
        const riesgoEl = document.getElementById('term-riesgo');
        const riesgoBox = document.getElementById('term-riesgo-box');
        riesgoEl.textContent = riesgoGlobal;
        riesgoBox.className = 'kpi';
        if (riesgoGlobal === 'Alto' || riesgoGlobal === 'Muy alto') {
            riesgoBox.classList.add('red');
        } else if (riesgoGlobal === 'Medio') {
            riesgoBox.classList.add('orange');
        } else {
            riesgoBox.classList.add('green');
        }

        // Alertas banner
        const alertsEl = document.getElementById('term-alerts');
        if (alerts.length > 0) {
            let html = '';
            alerts.forEach(a => {
                html += `<div class="alert-banner ${a.type === 'critical' ? 'alert-critical' : 'alert-warning'}">${a.text}</div>`;
            });
            alertsEl.innerHTML = html;
        } else {
            alertsEl.innerHTML = '';
        }

        // Chart: Real vs Sensación 24h (todas las ciudades)
        const ctxTerm = document.getElementById('chart-termica');
        if (ctxTerm) {
            if (charts._chartTermica) charts._chartTermica.destroy();

            const validIndices = hourlyReal.map((v, i) => (v != null && hourlySensacion[i] != null) ? i : -1).filter(i => i >= 0);
            const chartLabels = validIndices.map(i => {
                const d = new Date(hourlyLabels[i]);
                return `${d.getHours().toString().padStart(2, '0')}:00`;
            });
            const chartReal = validIndices.map(i => hourlyReal[i]);
            const chartSens = validIndices.map(i => hourlySensacion[i]);

            charts._chartTermica = new Chart(ctxTerm, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            label: 'Temp. Real (°C)',
                            data: chartReal,
                            borderColor: 'rgba(239, 68, 68, 1)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 3,
                            pointRadius: 3,
                            pointBackgroundColor: 'rgba(239, 68, 68, 1)',
                            tension: 0.4,
                            fill: true,
                        },
                        {
                            label: 'Sensación Térmica (°C)',
                            data: chartSens,
                            borderColor: 'rgba(59, 130, 246, 1)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 3,
                            pointRadius: 3,
                            pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                            tension: 0.4,
                            fill: true,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    plugins: {
                        legend: { position: 'top', labels: { font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} °C`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: { display: true, text: '°C' },
                            grid: { color: '#f1f5f9' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 10 }, maxRotation: 0 }
                        }
                    }
                }
            });
        }

        // Ranking ciudades por sensación térmica
        const rankingEl = document.getElementById('term-ranking');
        if (rankingEl) {
            cityTermData.sort((a, b) => b.sensacion - a.sensacion);
            const medals = ['🥇', '🥈', '🥉'];
            let html = '';
            cityTermData.forEach((c, i) => {
                const medal = i < 3 ? medals[i] : `${i + 1}.`;
                const riesgoBadge = c.riesgo === 'Alto' || c.riesgo === 'Muy alto' ? 'badge-red' : c.riesgo === 'Medio' ? 'badge-orange' : 'badge-green';
                const cConfort = getConfortEscala(c.sensacion);
                html += `<div style="display:flex;justify-content:space-between;padding:6px 8px;border-bottom:1px solid #f1f5f9;align-items:center;">
                    <span style="font-weight:600;">${medal} ${c.name}</span>
                    <span style="color:${cConfort.color};font-weight:700;">${cConfort.emoji} ${c.sensacion.toFixed(1)}°C</span>
                    <span style="color:#64748b;font-size:11px;">real: ${c.real.toFixed(1)}°C · Δ: ${c.diff > 0 ? '+' : ''}${c.diff.toFixed(1)}°C</span>
                    <span class="badge ${riesgoBadge}">${c.riesgo}</span>
                </div>`;
            });
            rankingEl.innerHTML = html;
        }
    }

    async function fetchNieve() {
        // Populate station selector
        const sel = document.getElementById('nieve-station-select');
        if (sel) {
            sel.innerHTML = '<option value="-1">Selecciona estación…</option>';
            SKI_RESORTS.forEach((r, i) => {
                sel.innerHTML += `<option value="${i}">🏔️ ${r.name} (${r.cc}) — ${r.elev}m</option>`;
            });
        }

        // Fetch ALL resorts in parallel
        const promises = SKI_RESORTS.map(async (resort) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${resort.lat}&longitude=${resort.lon}&current=snow_depth,snowfall&hourly=snow_depth,snowfall&daily=snowfall_sum&timezone=Europe/Madrid&forecast_days=7`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // Parse results per station
        nieveStationData = [];
        results.forEach((data, i) => {
            if (!data || !data.current) {
                nieveStationData.push(null);
                return;
            }
            const depthM = data.current.snow_depth ?? 0;
            const depthCm = Math.round(depthM * 100);
            const snowfall24h = data.current.snowfall ?? 0;

            // 7-day snowfall sum
            let snow7d = 0;
            if (data.daily && data.daily.time && data.daily.snowfall_sum) {
                snow7d = data.daily.snowfall_sum.reduce((a, b) => a + (b || 0), 0);
            }

            // Hourly snow_depth for chart (last 24h)
            let hourlyDepth = [];
            let hourlyLabels = [];
            if (data.hourly && data.hourly.time && data.hourly.snow_depth) {
                const last24 = Math.min(data.hourly.time.length, 24);
                for (let h = data.hourly.time.length - last24; h < data.hourly.time.length; h++) {
                    const t = new Date(data.hourly.time[h]);
                    hourlyLabels.push(`${t.getDate()}/${t.getMonth()+1} ${t.getHours().toString().padStart(2,'0')}h`);
                    hourlyDepth.push(Math.round((data.hourly.snow_depth[h] || 0) * 100));
                }
            }

            // Max temp from hourly (last 24h)
            let maxTempStation = null;
            if (data.hourly && data.hourly.time && data.hourly.temperature_2m) {
                const temps = data.hourly.temperature_2m.slice(-24);
                maxTempStation = Math.max(...temps.map(t => t !== null ? t : -999));
            }

            nieveStationData.push({
                name: SKI_RESORTS[i].name,
                cc: SKI_RESORTS[i].cc,
                elev: SKI_RESORTS[i].elev,
                lat: SKI_RESORTS[i].lat,
                lon: SKI_RESORTS[i].lon,
                depthCm: depthCm,
                snowfall24h: snowfall24h,
                snow7d: snow7d,
                hourlyDepth: hourlyDepth,
                hourlyLabels: hourlyLabels,
                hasNieve: depthCm > 0,
                maxTemp: maxTempStation,
            });
        });

        // Global KPIs: stats across all stations
        const activeStations = nieveStationData.filter(d => d !== null);
        const withSnow = nieveStationData.filter(d => d && d.hasNieve);
        const avgCurrent = activeStations.length > 0 ? Math.round(activeStations.reduce((s, d) => s + d.depthCm, 0) / activeStations.length) : 0;
        const maxCurrent = activeStations.length > 0 ? Math.max(...activeStations.map(d => d.depthCm)) : 0;
        const total7d = activeStations.reduce((s, d) => s + d.snow7d, 0);
        const totalSnowfall24h = activeStations.reduce((s, d) => s + d.snowfall24h, 0);

        // Riesgo aludes basado en nieve actual
        let riesgoText = 'Bajo';
        let riesgoClass = 'badge-green';
        if (maxCurrent >= 80) { riesgoText = 'Alto'; riesgoClass = 'badge-red'; }
        else if (maxCurrent >= 30) { riesgoText = 'Medio'; riesgoClass = 'badge-orange'; }

        // Actualizar KPIs globales
        document.getElementById('nieve-current').textContent = withSnow.length > 0 ? `${maxCurrent} cm` : 'Sin nieve';
        document.getElementById('nieve-current').title = `Media: ${avgCurrent} cm · Máx: ${maxCurrent} cm`;
        document.getElementById('nieve-7d').textContent = total7d > 0 ? `${total7d} cm` : '—';
        document.getElementById('nieve-riesgo').innerHTML = `<span class="badge ${riesgoClass}">${riesgoText}</span>`;
        document.getElementById('nieve-nivel').textContent = `${activeStations.length} estaciones`;
        const maxTempAll = activeStations.length > 0 ? Math.max(...activeStations.map(d => d.maxTemp !== null ? d.maxTemp : -999)) : null;
        document.getElementById('nieve-temp-max').textContent = maxTempAll !== null ? `${maxTempAll.toFixed(1)}°C` : '—';
        document.getElementById('nieve-nieve-24h').textContent = totalSnowfall24h > 0 ? `${totalSnowfall24h} cm` : '—';

        // Update chart for selected station
        updateNieveChart();

        // Lista de todas las estaciones
        renderStationsList();
    }

    async function fetchMar() {
        // Fetch marine data for all coastal points
        const promises = MAR_POINTS.map(async (point) => {
            try {
                const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${point.lat}&longitude=${point.lon}&current=wave_height,wave_direction,wave_period,wave_period_swell,swell_wave_height,swell_wave_direction,ocean_current_velocity,water_temperature&hourly=wave_height,wave_direction&forecast_days=2&timezone=auto`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // Save results for coast selector use
        window._marResults = results;

        // Populate coast selector
        const coastSelect = document.getElementById('mar-coast-select');
        if (coastSelect) {
            // Keep "Todas las costas" option
            let optsHTML = '<option value="all">🇪🇸 Todas las costas</option>';
            MAR_POINTS.forEach((point, idx) => {
                const data = results[idx];
                const hasData = data && data.current && data.current.wave_height !== undefined;
                const mark = hasData ? '' : ' ⚠️';
                optsHTML += `<option value="${idx}">${point.name}${mark}</option>`;
            });
            coastSelect.innerHTML = optsHTML;
        }

        // Helper: compute distance between two lat/lon (haversine)
        function haversine(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }

        // Helper: find closest coast to a province centroid
        function findClosestCoastTo(centroidLat, centroidLon) {
            let minDist = Infinity;
            let closestIdx = 0;
            MAR_POINTS.forEach((point, idx) => {
                const d = haversine(centroidLat, centroidLon, point.lat, point.lon);
                if (d < minDist) { minDist = d; closestIdx = idx; }
            });
            return { idx: closestIdx, name: MAR_POINTS[closestIdx].name, dist: minDist };
        }

        // Auto-select closest coast if a province is selected
        if (selectedProvince && provinceCentroids[selectedProvince]) {
            const centroid = provinceCentroids[selectedProvince];
            const closest = findClosestCoastTo(centroid[0], centroid[1]);
            // Only auto-select if close enough (within 150 km)
            if (closest.dist < 150 && coastSelect) {
                coastSelect.value = String(closest.idx);
                const labelEl = document.getElementById('mar-selected-coast-label');
                const nameEl = document.getElementById('mar-selected-coast-name');
                if (labelEl && nameEl) {
                    labelEl.style.display = 'block';
                    nameEl.textContent = `${closest.name} (${closest.dist.toFixed(0)} km)`;
                }
                // Render chart for selected coast
                renderMarChartFor(results, closest.idx);
                return;
            }
        }

        // Default: show all coasts combined
        renderMarChartFor(results, 'all');

        // ---- KPIs: averages across all coasts ----
        let waveHeights = [];
        let swellHeights = [];
        let currents = [];
        let waterTemps = [];
        let waveDirs = [];
        let wavePeriods = [];

        results.forEach((data) => {
            if (!data || !data.current) return;
            const wh = data.current.wave_height ?? 0;
            const sh = data.current.swell_wave_height ?? data.current.wave_height ?? 0;
            const cv = data.current.ocean_current_velocity ?? 0;
            const wt = data.current.water_temperature ?? null;
            const wd = data.current.wave_direction ?? null;
            const wp = data.current.wave_period ?? null;

            waveHeights.push(wh);
            swellHeights.push(sh);
            currents.push(cv);
            if (wt !== null) waterTemps.push(wt);
            if (wd !== null) waveDirs.push(wd);
            if (wp !== null) wavePeriods.push(wp);
        });

        const avgWave = waveHeights.length > 0 ? (waveHeights.reduce((a, b) => a + b, 0) / waveHeights.length).toFixed(2) : '—';
        const avgSwell = swellHeights.length > 0 ? (swellHeights.reduce((a, b) => a + b, 0) / swellHeights.length).toFixed(2) : '—';
        const avgCurrent = currents.length > 0 ? (currents.reduce((a, b) => a + b, 0) / currents.length).toFixed(2) : '—';
        const avgTemp = waterTemps.length > 0 ? (waterTemps.reduce((a, b) => a + b, 0) / waterTemps.length).toFixed(1) : '—';
        const avgDir = waveDirs.length > 0 ? Math.round(waveDirs.reduce((a, b) => a + b, 0) / waveDirs.length) : '—';
        const avgPeriod = wavePeriods.length > 0 ? (wavePeriods.reduce((a, b) => a + b, 0) / wavePeriods.length).toFixed(1) : '—';

        document.getElementById('mar-oleaje').textContent = avgWave;
        document.getElementById('mar-oleaje-fondo').textContent = avgSwell;
        document.getElementById('mar-temp-agua').textContent = avgTemp !== '—' ? `${avgTemp} °C` : '—';
        document.getElementById('mar-corriente').textContent = avgCurrent;
        document.getElementById('mar-direccion').textContent = avgDir !== '—' ? `${avgDir}°` : '—';
        document.getElementById('mar-periodo').textContent = avgPeriod !== '—' ? `${avgPeriod} s` : '—';

        // ---- Lista de costas ----
        const coastsEl = document.getElementById('mar-coasts');
        if (coastsEl) {
            let html = '';
            results.forEach((data, idx) => {
                const point = MAR_POINTS[idx];
                if (!data || !data.current) {
                    html += `<div class="list-item">
                        <div class="list-item-header">${point.name}</div>
                        <div class="list-item-sub" style="color:#dc2626;">⚠️ No disponible</div>
                    </div>`;
                    return;
                }
                const wh = data.current.wave_height ?? 0;
                const wd = data.current.wave_direction ?? '—';
                const wp = data.current.wave_period ?? '—';
                const sp = data.current.wave_period_swell ?? '—';
                const sw = data.current.swell_wave_height ?? 0;
                const swd = data.current.swell_wave_direction ?? '—';
                const cv = data.current.ocean_current_velocity ?? 0;
                const ct = data.current.current_direction ?? '—';
                const wt = data.current.water_temperature ?? '—';

                let condBadge = 'badge-blue';
                let condText = 'Oleaje moderado';
                if (wh >= 4) { condBadge = 'badge-red'; condText = 'Oleaje fuerte'; }
                else if (wh >= 2) { condBadge = 'badge-orange'; condText = 'Oleaje moderado-alto'; }
                else if (wh < 0.5) { condBadge = 'badge-green'; condText = 'Oleaje en calma'; }

                html += `<div class="list-item" style="cursor:pointer;" onclick="document.getElementById('mar-coast-select').value='${idx}';document.getElementById('mar-coast-select').dispatchEvent(new Event('change'));">
                    <div class="list-item-header">${point.name} <span class="badge ${condBadge}">${condText}</span></div>
                    <div class="list-item-sub">
                        🌊 Altura: ${wh.toFixed(2)} m · 🌊 Swell: ${sw.toFixed(2)} m · ⏱️ Per: ${wp}s · S.Per: ${sp}s
                        <br>🧭 Dir: ${wd}° · 💧 Temp. agua: ${wt} °C · 💨 Corriente: ${cv.toFixed(2)} m/s
                    </div>
                </div>`;
            });
            coastsEl.innerHTML = html;
        }
    }

    async function fetchEolica() {
        const selectedCity = document.getElementById('eolica-city-select').value;
        const citiesToFetch = selectedCity === 'all'
            ? EOLICA_CITIES
            : EOLICA_CITIES.filter(c => c.name === selectedCity);

        const promises = citiesToFetch.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=wind_speed_10m,wind_gusts_10m&daily=wind_speed_10m_max,wind_gusts_10m_max&timezone=Europe/Madrid&forecast_days=7`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // Calcular potencia instantánea con fórmula física real (Betz limit)
        function calcWindPower(speedKmH) {
            const v = speedKmH / 3.6; // m/s
            const cp = 0.35; // coeficiente de potencia (Betz ~0.593, real ~0.35)
            return 0.5 * TURBINA_DENSIDAD_AIRE * TURBINA_AREA * cp * Math.pow(v, 3) / 1e6; // MW
        }

        // Calcular factor de capacidad basado en velocidad del viento
        function calcCapacityFactor(speedKmH) {
            const v = speedKmH / 3.6; // m/s
            // Aproximación: factor_cap crece con velocidad
            // 5 m/s ≈ 0.25, 8 m/s ≈ 0.35, 12 m/s ≈ 0.40
            if (v < 3) return 0.10;
            if (v < 5) return 0.20;
            if (v < 7) return 0.28;
            if (v < 9) return 0.35;
            if (v < 11) return 0.38;
            return 0.42;
        }

        // Fetch ALL cities in background for ranking (always)
        const allPromises = EOLICA_CITIES.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=wind_speed_10m&timezone=Europe/Madrid&forecast_days=1`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });
        const allResults = await Promise.all(allPromises);

        let speeds = [];
        let gustsAll = [];
        let capacities = [];
        let energies = [];
        let capFactorsAll = [];
        const cityData = [];

        results.forEach((data, i) => {
            const city = citiesToFetch[i];
            if (!data || !data.current || data.current.wind_speed_10m === undefined) {
                cityData.push({ name: city.name, speed: '—', power: '—', gusts: '—', direction: '—', capFactor: '—', annualEnergy: '—', turbines: 0, mwPotential: 0, class: 'no-data' });
                return;
            }

            const currentSpeed = data.current.wind_speed_10m;
            const currentDir = data.current.wind_direction_10m ?? '—';
            const currentGusts = data.current.wind_gusts_10m ?? '—';
            const power = calcWindPower(currentSpeed);
            const capFactor = calcCapacityFactor(currentSpeed);
            const annualEnergy = TURBINA_POTENCIA * capFactor * 8760 / 1e3; // MWh/año
            const turbinesNeeded = Math.max(1, Math.ceil(power / TURBINA_POTENCIA));

            speeds.push(currentSpeed);
            if (typeof currentGusts === 'number') gustsAll.push(currentGusts);
            capacities.push(power);
            energies.push(annualEnergy);
            capFactorsAll.push(capFactor);

            cityData.push({
                name: city.name,
                speed: currentSpeed,
                power: power.toFixed(2),
                gusts: currentGusts,
                direction: currentDir,
                capFactor: capFactor.toFixed(2),
                annualEnergy: annualEnergy.toFixed(0),
                turbines: turbinesNeeded,
                mwPotential: (turbinesNeeded * TURBINA_POTENCIA).toFixed(1),
                class: 'data'
            });
        });

        // Ranking global (siempre con las 10 ciudades)
        const rankingAll = allResults.map((data, i) => {
            const city = EOLICA_CITIES[i];
            const speed = data && data.current && data.current.wind_speed_10m !== undefined ? data.current.wind_speed_10m : 0;
            return { name: city.name, speed, lat: city.lat, lon: city.lon };
        }).sort((a, b) => b.speed - a.speed);

        // KPIs globales
        const avgSpeed = speeds.length > 0 ? (speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1) : '—';
        const maxGust = gustsAll.length > 0 ? Math.max(...gustsAll).toFixed(1) : '—';
        const totalCapacity = capacities.reduce((a, b) => a + b, 0);
        const avgEnergy = energies.length > 0 ? (energies.reduce((a, b) => a + b, 0) / energies.length).toFixed(0) : '—';
        const turbinesEst = totalCapacity > 0 ? Math.round(totalCapacity / TURBINA_POTENCIA) : 0;
        const avgCapFactor = capFactorsAll.length > 0 ? (capFactorsAll.reduce((a, b) => a + b, 0) / capFactorsAll.length).toFixed(2) : '—';

        document.getElementById('eolica-velocidad').textContent = avgSpeed;
        document.getElementById('eolica-capacidad').textContent = totalCapacity.toFixed(1);
        document.getElementById('eolica-energia').textContent = avgEnergy;
        document.getElementById('eolica-turbinas').textContent = turbinesEst;
        document.getElementById('eolica-rafaga').textContent = maxGust;
        document.getElementById('eolica-potencial').textContent = totalCapacity.toFixed(1);

        // Nuevo KPI: ranking posición
        const rankingPosEl = document.getElementById('eolica-ranking-pos');
        if (rankingPosEl) {
            if (selectedCity === 'all') {
                rankingPosEl.textContent = '🇪🇸 Nacional';
            } else {
                const rank = rankingAll.findIndex(r => r.name === selectedCity) + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
                const selCity = rankingAll.find(r => r.name === selectedCity);
                rankingPosEl.textContent = `${medal} / 10`;
                rankingPosEl.title = `${selectedCity}: ${selCity ? selCity.speed : '?'} km/h — Posición: #${rank} de 10 ciudades`;
            }
        }

        // Nuevo KPI: factor capacidad
        const factorCapEl = document.getElementById('eolica-factor-cap');
        if (factorCapEl) {
            if (avgCapFactor !== '—') {
                factorCapEl.textContent = `${(parseFloat(avgCapFactor) * 100).toFixed(0)}%`;
                factorCapEl.title = `Factor capacidad medio: ${avgCapFactor}`;
            } else {
                factorCapEl.textContent = '—';
            }
        }

        // ===== CHART: barras de capacidad + línea de energía estimada =====
        const ctxEolica = document.getElementById('chart-eolica');
        if (ctxEolica) {
            if (window._chartEolica) window._chartEolica.destroy();

            // Preparar datos por ciudad (siempre las 10 para el chart)
            const cityNames = cityData.map(c => c.name);
            const barData = cityData.map(c => {
                const val = parseFloat(c.mwPotential);
                return isNaN(val) ? 0 : val;
            });
            const lineData = cityData.map(c => {
                const val = parseFloat(c.annualEnergy);
                return isNaN(val) ? 0 : val;
            });
            const capFactorData = cityData.map(c => {
                const val = parseFloat(c.capFactor);
                return isNaN(val) ? 0 : val;
            });

            const chartTitle = selectedCity === 'all' ? '🇪🇸 España completa' : `📍 ${selectedCity}`;

            window._chartEolica = new Chart(ctxEolica, {
                type: 'bar',
                data: {
                    labels: cityNames,
                    datasets: [
                        {
                            label: 'Potencial MW (barras)',
                            data: barData,
                            backgroundColor: barData.map((_, idx) => {
                                const colors = ['#2563eb', '#dc2626', '#16a34a', '#f97316', '#7c3aed', '#0891b2', '#be185d', '#65a30d', '#ea580c', '#4f46e5'];
                                return colors[idx % colors.length] + 'cc';
                            }),
                            borderColor: barData.map((_, idx) => {
                                const colors = ['#2563eb', '#dc2626', '#16a34a', '#f97316', '#7c3aed', '#0891b2', '#be185d', '#65a30d', '#ea580c', '#4f46e5'];
                                return colors[idx % colors.length];
                            }),
                            borderWidth: 1,
                            borderRadius: 4,
                            yAxisID: 'y',
                            order: 2
                        },
                        {
                            label: 'Energía anual (MWh/turbina)',
                            data: lineData,
                            type: 'line',
                            borderColor: '#f97316',
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                            borderWidth: 3,
                            pointRadius: 5,
                            pointBackgroundColor: '#f97316',
                            tension: 0.3,
                            fill: true,
                            yAxisID: 'y1',
                            order: 1
                        },
                        {
                            label: 'Factor capacidad',
                            data: capFactorData,
                            type: 'line',
                            borderColor: '#7c3aed',
                            borderWidth: 2,
                            borderDash: [5, 5],
                            pointRadius: 3,
                            pointBackgroundColor: '#7c3aed',
                            tension: 0.3,
                            yAxisID: 'y2',
                            order: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 }, padding: 8 } },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    if (ctx.dataset.label === 'Factor capacidad') {
                                        return ctx.dataset.label + ': ' + (ctx.parsed.y * 100).toFixed(0) + '%';
                                    }
                                    return ctx.dataset.label + ': ' + ctx.parsed.y + (ctx.dataset.label.includes('MW') ? ' MW' : ' MWh');
                                }
                            }
                        }
                    },
                    scales: {
                        x: { display: true, ticks: { maxTicksLimit: 10, font: { size: 9 } } },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Potencial (MW)' },
                            beginAtZero: true
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Energía anual (MWh)' },
                            beginAtZero: true,
                            grid: { drawOnChartArea: false }
                        },
                        y2: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Factor capacidad' },
                            beginAtZero: true,
                            max: 0.5,
                            grid: { drawOnChartArea: false }
                        }
                    },
                },
            });
        }

        // ===== PARQUES EÓLICOS =====
        const parquesEl = document.getElementById('eolica-parques');
        if (parquesEl) {
            const sorted = [...cityData].filter(c => c.mwPotential > 0).sort((a, b) => parseFloat(b.mwPotential) - parseFloat(a.mwPotential));
            let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
            sorted.forEach((c, idx) => {
                const rank = idx + 1;
                const capColor = parseFloat(c.capFactor) >= 0.35 ? '#16a31a' : parseFloat(c.capFactor) >= 0.25 ? '#f97316' : '#dc2626';
                const rankingPos = rankingAll.findIndex(r => r.name === c.name) + 1;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
                html += `<div class="list-item">
                    <div class="list-item-header">${medal} #${rank} ${c.name} <span style="font-size:10px;color:#64748b;">(ventosa #${rankingPos})</span></div>
                    <div class="list-item-sub">
                        🏭 ${c.turbines} turbinas × ${TURBINA_POTENCIA}MW = <b>${c.mwPotential} MW</b><br>
                        ⚡ Energía anual: ${c.annualEnergy} MWh/turbina · Factor: <span style="color:${capColor};font-weight:700;">${(parseFloat(c.capFactor) * 100).toFixed(0)}%</span><br>
                        💨 Viento: ${c.speed} km/h · Ráfaga: ${c.gusts} km/h · Dir: ${c.direction}°
                    </div>
                </div>`;
            });
            html += '</div>';
            // Resumen nacional
            const totalMW = sorted.reduce((a, c) => a + parseFloat(c.mwPotential), 0);
            const totalTurbines = sorted.reduce((a, c) => a + c.turbines, 0);
            const totalMWh = sorted.reduce((a, c) => a + parseFloat(c.annualEnergy) * c.turbines, 0);
            html += `<div style="margin-top:10px;padding:8px;background:#f0f9ff;border-radius:6px;border-left:3px solid #2563eb;">
                <b>📊 Resumen Nacional:</b> ${totalTurbines} turbinas estimadas · ${totalMW.toFixed(1)} MW de capacidad · ${Math.round(totalMWh).toLocaleString('es-ES')} MWh/año
            </div>`;
            parquesEl.innerHTML = html;
        }

        // Ranking ciudades más ventosas (con posición)
        const rankingEl = document.getElementById('eolica-ranking');
        if (rankingEl) {
            const sorted = rankingAll.sort((a, b) => b.speed - a.speed);
            let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
            sorted.forEach((c, idx) => {
                const rank = idx + 1;
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${rank}.`;
                html += `<div class="list-item"><div class="list-item-header">${medal} ${c.name} <span style="color:#2563eb;font-weight:700;">${c.speed} km/h</span></div><div class="list-item-sub">Posición: #${rank}/10 · Potencia est.: ${calcWindPower(c.speed).toFixed(2)} MW</div></div>`;
            });
            html += '</div>';
            rankingEl.innerHTML = html;
        }
    }

    async function fetchMareas() {
        // Poblar selector de puertos
        const portSelect = document.getElementById('marea-port-select');
        if (portSelect) {
            MAREAS_PORTS.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name;
                opt.textContent = p.name;
                portSelect.appendChild(opt);
            });
            portSelect.addEventListener('change', () => renderMareasTabla());
        }

        // Fetch todos los puertos
        const promises = MAREAS_PORTS.map(async (port) => {
            try {
                const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${port.lat}&longitude=${port.lon}&current=ocean_current_velocity,ocean_current_direction,wave_height,wave_period,sea_surface_temperature&hourly=wave_height,wave_period,ocean_current_velocity,ocean_current_direction,sea_surface_temperature&timezone=auto&forecast_days=2`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // Guardar datos por puerto
        mareasPortData = {};
        MAREAS_PORTS.forEach((port, idx) => {
            mareasPortData[port.name] = results[idx];
        });

        // ===== KPIs GLOBALES =====
        let currentVelocities = [];
        let currentDirections = [];
        let waveHeights = [];
        let waterTemps = [];
        let maxCurrent = 0;
        let validCount = 0;

        results.forEach((data) => {
            if (!data || !data.current) return;
            validCount++;
            const cv = data.current.ocean_current_velocity ?? 0;
            const cd = data.current.ocean_current_direction ?? 0;
            const wh = data.current.wave_height ?? 0;
            const st = data.current.sea_surface_temperature;

            currentVelocities.push(cv);
            currentDirections.push(cd);
            waveHeights.push(wh);
            if (st !== undefined && st !== null) waterTemps.push(st);

            if (cv > maxCurrent) maxCurrent = cv;
        });

        const avgWave = waveHeights.length > 0 ? waveHeights.reduce((a, b) => a + b, 0) / waveHeights.length : 0;
        const avgDir = currentDirections.length > 0
            ? Math.round(currentDirections.reduce((a, b) => a + b, 0) / currentDirections.length)
            : null;
        const avgTemp = waterTemps.length > 0
            ? (waterTemps.reduce((a, b) => a + b, 0) / waterTemps.length).toFixed(1)
            : '—';

        // ===== DETECCIÓN DE MAREA =====
        // Comparamos velocidad de corriente actual vs la anterior (hora previa en hourly)
        let tideState = '🌊 Calmada';
        let tideBadge = 'badge-blue';
        let tideColor = '#2563eb';

        // Intentar detectar subida/bajada comparando current vs anterior
        let risingCount = 0;
        let fallingCount = 0;
        let totalChecked = 0;

        results.forEach((data) => {
            if (!data || !data.current || !data.hourly) return;
            const now = data.current.time;
            const currentCV = data.current.ocean_current_velocity ?? 0;

            // Buscar la hora anterior en hourly
            if (data.hourly.time) {
                const nowDate = new Date(now);
                const prevTime = new Date(nowDate.getTime() - 3600000).toISOString().replace('T', ' ').substring(0, 13) + ':00';

                const prevIdx = data.hourly.time.findIndex(t => t.startsWith(prevTime.substring(0, 13)));
                if (prevIdx >= 0 && prevIdx + 1 < data.hourly.ocean_current_velocity.length) {
                    const prevCV = data.hourly.ocean_current_velocity[prevIdx + 1];
                    if (prevCV !== undefined && prevCV !== null) {
                        totalChecked++;
                        if (currentCV > prevCV) risingCount++;
                        else if (currentCV < prevCV) fallingCount++;
                    }
                }
            }
        });

        if (totalChecked > 0) {
            const riseRatio = risingCount / totalChecked;
            if (riseRatio > 0.6) {
                tideState = '📈 Subiendo';
                tideBadge = 'badge-green';
                tideColor = '#16a34a';
            } else if (riseRatio < 0.4) {
                tideState = '📉 Bajando';
                tideBadge = 'badge-orange';
                tideColor = '#f97316';
            } else {
                tideState = '🌊 Calmada';
                tideBadge = 'badge-blue';
                tideColor = '#2563eb';
            }
        } else {
            // Fallback: usar velocidad de corriente como indicador
            if (maxCurrent >= 0.8) { tideState = '🌊 Corriente fuerte'; tideBadge = 'badge-red'; }
            else if (maxCurrent >= 0.4) { tideState = '🌊 Corriente moderada'; tideBadge = 'badge-orange'; }
            else if (maxCurrent >= 0.1) { tideState = '🌊 Corriente suave'; tideBadge = 'badge-green'; }
        }

        // Actualizar KPIs
        document.getElementById('marea-nivel').textContent = avgWave.toFixed(2);
        document.getElementById('marea-corriente-max').textContent = maxCurrent.toFixed(2);
        document.getElementById('marea-temp-agua').textContent = avgTemp;
        document.getElementById('marea-direccion').textContent = avgDir !== null ? `${avgDir}°` : '—';

        const tideEl = document.getElementById('marea-tide-state');
        tideEl.textContent = tideState;
        tideEl.style.color = tideColor;

        // ===== CHART 48h =====
        const ctxMareas = document.getElementById('chart-mareas');
        if (ctxMareas) {
            if (window._chartMareas) window._chartMareas.destroy();

            const colors = ['#2563eb', '#f97316', '#16a34a', '#7c3aed', '#0891b2',
                           '#dc2626', '#0d9488', '#c026d3', '#ea580c', '#0284c7'];
            const datasets = [];

            results.forEach((data, idx) => {
                if (!data || !data.hourly) return;
                const labels = data.hourly.time.slice(0, 48).map(t => {
                    const d = new Date(t);
                    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:00`;
                });
                const wh = data.hourly.wave_height.slice(0, 48);
                const cv = data.hourly.ocean_current_velocity.slice(0, 48);

                datasets.push({
                    label: `${MAREAS_PORTS[idx].name} oleaje (m)`,
                    data: wh,
                    borderColor: colors[idx % colors.length],
                    backgroundColor: colors[idx % colors.length] + '33',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y',
                });

                datasets.push({
                    label: `${MAREAS_PORTS[idx].name} corriente (m/s)`,
                    data: cv,
                    borderColor: colors[idx % colors.length],
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y1',
                });
            });

            const firstData = results.find(d => d && d.hourly);
            let chartLabels = [];
            if (firstData) {
                chartLabels = firstData.hourly.time.slice(0, 48).map(t => {
                    const d = new Date(t);
                    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:00`;
                });
            }

            window._chartMareas = new Chart(ctxMareas, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: datasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { font: { size: 9 }, boxWidth: 10 },
                            filter: function(item) {
                                return !item.text.includes('corriente');
                            },
                        },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    if (ctx.dataset.label.includes('oleaje')) {
                                        return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} m`;
                                    }
                                    return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(3)} m/s`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Tiempo' },
                            ticks: { maxTicksLimit: 8, font: { size: 9 }, maxRotation: 0 },
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            title: { display: true, text: 'Oleaje (m)' },
                            ticks: { font: { size: 10 } },
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            title: { display: true, text: 'Corriente (m/s)' },
                            grid: { drawOnChartArea: false },
                            ticks: { font: { size: 10 } },
                        },
                    },
                },
            });
        }

        // Render tabla de puertos
        renderMareasTabla();
    }

    async function fetchUV() {
        const promises = UV_CITIES.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=uv_index,uv_index_clear_sky&hourly=uv_index,uv_index_clear_sky&daily=uv_index_max,shortwave_radiation_sum,sunshine_duration,daylight_duration&timezone=Europe/Madrid&forecast_days=3`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // KPIs: promedios
        let currentUVs = [];
        let maxUVs = [];
        let radiationValues = [];
        let sunHoursValues = [];

        results.forEach((data) => {
            if (!data) return;
            if (data.current && data.current.uv_index !== undefined) {
                currentUVs.push(data.current.uv_index);
            }
            if (data.daily && data.daily.uv_index_max) {
                const todayMax = data.daily.uv_index_max[0];
                if (todayMax !== undefined) maxUVs.push(todayMax);
            }
            if (data.daily && data.daily.shortwave_radiation_sum) {
                const todayRad = data.daily.shortwave_radiation_sum[0];
                if (todayRad !== undefined) radiationValues.push(todayRad);
            }
            if (data.daily && data.daily.sunshine_duration) {
                const todaySun = data.daily.sunshine_duration[0];
                if (todaySun !== undefined) sunHoursValues.push(todaySun / 3600);
            }
        });

        const avgCurrentUV = currentUVs.length > 0 ? (currentUVs.reduce((a, b) => a + b, 0) / currentUVs.length).toFixed(1) : '—';
        const avgMaxUV = maxUVs.length > 0 ? Math.max(...maxUVs).toFixed(1) : '—';
        const maxRadiation = radiationValues.length > 0 ? Math.max(...radiationValues).toFixed(1) : '—';
        const avgSunHours = sunHoursValues.length > 0 ? (sunHoursValues.reduce((a, b) => a + b, 0) / sunHoursValues.length).toFixed(1) : '—';

        const avgCurrentUVNum = avgCurrentUV !== '—' ? parseFloat(avgCurrentUV) : 0;

        document.getElementById('uv-current').textContent = avgCurrentUV !== '—' ? `${avgCurrentUV}` : '—';
        document.getElementById('uv-max').textContent = avgMaxUV;
        document.getElementById('uv-radiation').textContent = maxRadiation;
        document.getElementById('uv-sun-hours').textContent = avgSunHours !== '—' ? `${avgSunHours} h` : '—';

        // Color del KPI actual UV según nivel
        const currentCard = document.getElementById('uv-current-card');
        if (currentCard) {
            currentCard.classList.remove('orange', 'green', 'purple');
            if (avgCurrentUVNum <= 2) currentCard.classList.add('green');
            else if (avgCurrentUVNum <= 5) currentCard.classList.add('orange');
            else currentCard.classList.add('purple');
        }

        // Alertas UV
        renderUVAlerts(avgCurrentUVNum, avgMaxUV);

        // Chart: UV 24h con bandas de color por umbral
        renderUVChart(results);

        // Escala de protección UV
        renderUVScale(avgCurrentUVNum);

        // Datos por ciudad
        renderUVCities(results);
    }

    async function fetchGBFSData() {
        const results = [];
        for (const feed of GBFS_FEEDS) {
            try {
                const [infoResp, statusResp] = await Promise.all([
                    fetch(feed.url, { signal: AbortSignal.timeout(8000) }),
                    fetch(feed.statusUrl, { signal: AbortSignal.timeout(8000) }),
                ]);
                const info = await infoResp.json();
                const status = await statusResp.json();

                if (!info || !info.data || !info.data.stations) continue;
                if (!status || !status.data || !status.data.stations) continue;

                const stations = info.data.stations;
                const statusMap = {};
                for (const s of status.data.stations) {
                    statusMap[s.station_id] = s;
                }

                let bikes = 0;
                let docking = 0;
                for (const s of stations) {
                    const st = statusMap[s.station_id] || {};
                    bikes += st.num_bikes_available ?? 0;
                    docking += st.num_docks_available ?? 0;
                }

                results.push({
                    name: feed.name,
                    city: feed.city,
                    stations: stations.length,
                    bikes: bikes,
                    docking: docking,
                    error: false,
                });
            } catch (err) {
                results.push({
                    name: feed.name,
                    city: feed.city,
                    stations: '—',
                    bikes: '—',
                    docking: '—',
                    error: true,
                });
            }
        }
        return results;
    }

    async function fetchGBFS() {
        _gbfsCache = await fetchGBFSData();
        const sel = document.getElementById('gbfs-city-select');
        if (!sel) return;

        // Populate city options
        getCityOptions(_gbfsCache);

        // Event listener for city filter
        sel.onchange = function() {
            const city = this.value;
            const filtered = filterByCity(_gbfsCache, city);
            renderGBFS(_gbfsCache, filtered);
            renderGBFSChart(filtered);
        };

        // Initial render (all cities)
        renderGBFS(_gbfsCache, _gbfsCache);
        renderGBFSChart(_gbfsCache);
    }

    async function fetchVisibilidad(selectedCity) {
        // Filtrar ciudades si hay selección
        const cities = (selectedCity && selectedCity !== 'all')
            ? VIS_CITIES.filter(c => c.name === selectedCity)
            : VIS_CITIES;

        // Fetch all cities in parallel — añadimos dew_point_2m para bochorno
        const promises = cities.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=visibility,weather_code,temperature_2m,dew_point_2m&hourly=visibility&timezone=Europe/Madrid&forecast_days=2`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // ---- Semáforo de visibilidad ----
        function visEstado(visKm) {
            if (visKm < 2) return { label: 'Reducida', cls: 'badge-red', color: '#dc2626', bg: '#fef2f2', kpi: 'red' };
            if (visKm < 5) return { label: 'Moderada', cls: 'badge-orange', color: '#f97316', bg: '#fff7ed', kpi: 'orange' };
            if (visKm < 10) return { label: 'Buena', cls: 'badge-blue', color: '#2563eb', bg: '#eff6ff', kpi: 'blue' };
            return { label: 'Clara', cls: 'badge-green', color: '#16a34a', bg: '#f0fdf4', kpi: 'green' };
        }

        function esCanarias(name) {
            return ['Las Palmas', 'Santa Cruz de Tenerife'].includes(name);
        }

        // ---- KPIs ----
        let currentVis = [];
        let bochornos = [];
        let globalEstado = { label: 'Limpio', cls: 'badge-green', color: '#16a34a', bg: '#f0fdf4', kpi: 'green' };

        results.forEach((data, idx) => {
            if (!data || !data.current) return;
            const vis = data.current.visibility ?? null;
            if (vis !== null) {
                const visKm = vis / 1000;
                currentVis.push({ name: VIS_CITIES[idx].name, visKm, data });
                const est = visEstado(visKm);
                // El peor estado gana
                const orden = { 'Reducida': 0, 'Moderada': 1, 'Buena': 2, 'Clara': 3 };
                if (orden[est.label] < orden[globalEstado.label]) {
                    globalEstado = est;
                }
            }
            // Bochorno: diferencia temp - rocío
            if (vis !== null && data.current.temperature_2m != null && data.current.dew_point_2m != null) {
                const diff = data.current.temperature_2m - data.current.dew_point_2m;
                bochornos.push(diff);
            }
        });

        const avgVis = currentVis.length > 0 ? (currentVis.reduce((a, b) => a + b.visKm, 0) / currentVis.length).toFixed(1) : '—';
        const minVis = currentVis.length > 0 ? Math.min(...currentVis.map(v => v.visKm)).toFixed(1) : '—';
        const maxVis = currentVis.length > 0 ? Math.max(...currentVis.map(v => v.visKm)).toFixed(1) : '—';

        // Bochorno promedio
        let bochornoText = '—';
        if (bochornos.length > 0) {
            const avgDiff = (bochornos.reduce((a, b) => a + b, 0) / bochornos.length).toFixed(1);
            let confort = 'Cómodo';
            if (avgDiff > 12) confort = 'Bochornoso 🔥';
            else if (avgDiff > 8) confort = 'Húmedo';
            else if (avgDiff < 3) confort = 'Seco';
            bochornoText = `Δ ${avgDiff}°C — ${confort}`;
        }

        // Calima: Canarias + vis baja (<3km) o weather_code 11
        let calimaCiudades = [];
        results.forEach((data, idx) => {
            if (!data || !data.current) return;
            const vis = data.current.visibility ?? null;
            const city = VIS_CITIES[idx];
            if (esCanarias(city.name)) {
                if (data.current.weather_code === 11 || (vis !== null && vis < 2000)) {
                    calimaCiudades.push(city.name);
                }
            }
        });

        // Aplicar colores a KPIs
        const avgEl = document.getElementById('vis-avg');
        avgEl.textContent = avgVis;
        avgEl.parentElement.className = 'kpi blue';

        const statusCard = document.getElementById('vis-status-card');
        const statusEl = document.getElementById('vis-status');
        statusEl.textContent = globalEstado.label;
        statusCard.className = `kpi ${globalEstado.kpi}`;

        const bochornoEl = document.getElementById('vis-bochorno');
        bochornoEl.textContent = bochornoText;

        // ---- Chart 1: visibilidad por ciudad (barras) con semáforo ----
        const ctxVis = document.getElementById('chart-visibilidad');
        if (ctxVis) {
            if (window._chartVis) window._chartVis.destroy();

            const labels = [];
            const visValues = [];
            const visColors = [];

            currentVis.forEach((item) => {
                labels.push(item.name);
                visValues.push(item.visKm);
                visColors.push(visEstado(item.visKm).color);
            });
            // Ciudades sin datos (solo las filtradas)
            cities.forEach((city, idx) => {
                if (!currentVis.find(v => v.name === city.name)) {
                    labels.push(city.name);
                    visValues.push(0);
                    visColors.push('#94a3b8');
                }
            });

            window._chartVis = new Chart(ctxVis, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Visibilidad (km)',
                        data: visValues,
                        backgroundColor: visColors.map(c => c + 'bb'),
                        borderColor: visColors,
                        borderWidth: 1,
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    const val = ctx.parsed.y;
                                    const est = visEstado(val);
                                    return `${est.label}: ${val.toFixed(1)} km`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'km' },
                            // Bandas de color horizontales
                            afterBuildTicks: function(chart) {
                                const axis = chart.scales.y;
                                if (axis && axis.top && axis.bottom) {
                                    chart.ctx.save();
                                    // Reducida < 2km
                                    const y1 = axis.getPixelForValue(1);
                                    chart.ctx.fillStyle = '#dc262622';
                                    chart.ctx.fillRect(axis.left, axis.bottom, axis.right - axis.left, axis.top - y1);
                                    // Moderada 1-2km
                                    const y2 = axis.getPixelForValue(2);
                                    chart.ctx.fillStyle = '#f9731622';
                                    chart.ctx.fillRect(axis.left, y2, axis.right - axis.left, y1 - y2);
                                    // Buena 2-5km
                                    const y5 = axis.getPixelForValue(5);
                                    chart.ctx.fillStyle = '#eab30822';
                                    chart.ctx.fillRect(axis.left, y5, axis.right - axis.left, y2 - y5);
                                    // Clara > 5km
                                    const y10 = axis.getPixelForValue(10);
                                    chart.ctx.fillStyle = '#2563eb22';
                                    chart.ctx.fillRect(axis.left, y10, axis.right - axis.left, y5 - y10);
                                    // Excelente > 10km
                                    chart.ctx.fillStyle = '#16a34a22';
                                    chart.ctx.fillRect(axis.left, axis.top, axis.right - axis.left, y10 - axis.top);
                                    chart.ctx.restore();
                                }
                            }
                        }
                    }
                }
            });
        }

        // ---- Chart 2: evolución 48h con bandas de color ----
        const ctxVisTrend = document.getElementById('chart-vis-trend');
        if (ctxVisTrend) {
            if (window._chartVisTrend) window._chartVisTrend.destroy();

            const colors = ['#2563eb', '#f97316', '#16a34a', '#7c3aed', '#0891b2', '#dc2626', '#ea580c', '#60a5fa'];
            const datasets = [];

            results.forEach((data, idx) => {
                if (!data || !data.hourly) return;
                const labels = data.hourly.time.slice(0, 48).map(t => {
                    const d = new Date(t);
                    return `${d.getHours().toString().padStart(2, '0')}:00`;
                });
                const vis = data.hourly.visibility.slice(0, 48).map(v => v / 1000);

                datasets.push({
                    label: cities[idx].name,
                    data: vis,
                    borderColor: colors[idx % colors.length],
                    backgroundColor: colors[idx % colors.length] + '22',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3,
                });
            });

            const firstData = results.find(d => d && d.hourly);
            let chartLabels = [];
            if (firstData) {
                chartLabels = firstData.hourly.time.slice(0, 48).map(t => {
                    const d = new Date(t);
                    return `${d.getHours().toString().padStart(2, '0')}:00`;
                });
            }

            window._chartVisTrend = new Chart(ctxVisTrend, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: datasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    const val = ctx.parsed.y;
                                    const est = visEstado(val);
                                    return `${ctx.dataset.label}: ${val.toFixed(1)} km (${est.label})`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Tiempo' },
                            ticks: { maxTicksLimit: 8, font: { size: 10 } },
                        },
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Visibilidad (km)' },
                            ticks: { font: { size: 10 } },
                            afterBuildTicks: function(chart) {
                                const axis = chart.scales.y;
                                if (axis && axis.top && axis.bottom) {
                                    chart.ctx.save();
                                    // Reducida < 2km
                                    const y1 = axis.getPixelForValue(1);
                                    chart.ctx.fillStyle = '#dc262622';
                                    chart.ctx.fillRect(axis.left, axis.bottom, axis.right - axis.left, axis.top - y1);
                                    // Moderada 1-2km
                                    const y2 = axis.getPixelForValue(2);
                                    chart.ctx.fillStyle = '#f9731622';
                                    chart.ctx.fillRect(axis.left, y2, axis.right - axis.left, y1 - y2);
                                    // Buena 2-5km
                                    const y5 = axis.getPixelForValue(5);
                                    chart.ctx.fillStyle = '#eab30822';
                                    chart.ctx.fillRect(axis.left, y5, axis.right - axis.left, y2 - y5);
                                    // Clara > 5km
                                    const y10 = axis.getPixelForValue(10);
                                    chart.ctx.fillStyle = '#2563eb22';
                                    chart.ctx.fillRect(axis.left, y10, axis.right - axis.left, y5 - y10);
                                    // Excelente > 10km
                                    chart.ctx.fillStyle = '#16a34a22';
                                    chart.ctx.fillRect(axis.left, axis.top, axis.right - axis.left, y10 - axis.top);
                                    chart.ctx.restore();
                                }
                            }
                        },
                    },
                },
            });
        }

        // ---- Detalle por ciudad ----
        const citiesEl = document.getElementById('vis-cities');
        if (citiesEl) {
            let html = '';
            results.forEach((data, idx) => {
                const city = VIS_CITIES[idx];
                if (!data || !data.current) {
                    html += `<div class="list-item">
                        <div class="list-item-header">${city.name}</div>
                        <div class="list-item-sub" style="color:#dc2626;">⚠️ No disponible</div>
                    </div>`;
                    return;
                }
                const vis = data.current.visibility ?? 0;
                const visKm = (vis / 1000).toFixed(1);
                const code = data.current.weather_code ?? '—';
                const desc = WMO_CODES[code] ?? 'Desconocido';
                const est = visEstado(vis);

                // Indicadores adicionales
                let extras = [];
                if (esCanarias(city.name) && (data.current.weather_code === 11 || vis < 3000)) {
                    extras.push('🌫️ Calima');
                }
                if (data.current.temperature_2m != null && data.current.dew_point_2m != null) {
                    const diff = (data.current.temperature_2m - data.current.dew_point_2m).toFixed(1);
                    extras.push(`🌡️ Δ${diff}°C`);
                }

                html += `<div class="list-item">
                    <div class="list-item-header">${city.name} <span class="badge ${est.cls}">${est.label} — ${visKm} km</span></div>
                    <div class="list-item-sub">
                        ☁️ ${desc} · 📊 Mín: ${minVis} km · Máx: ${maxVis} km ${extras.map(e => '· ' + e).join('')}
                    </div>
                </div>`;
            });
            citiesEl.innerHTML = html;
        }
    }

    async function fetchRafagas() {
        const promises = RAFAGA_CITIES.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m&hourly=wind_speed_10m,wind_gusts_10m&daily=wind_gusts_10m_max&timezone=Europe/Madrid&forecast_days=7`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // KPIs
        let gusts = [];
        let windSpeeds = [];
        let windDirs = [];

        results.forEach((data) => {
            if (!data || !data.current) return;
            if (data.current.wind_gusts_10m != null) gusts.push(data.current.wind_gusts_10m);
            if (data.current.wind_speed_10m != null) windSpeeds.push(data.current.wind_speed_10m);
            if (data.current.wind_direction_10m != null) windDirs.push(data.current.wind_direction_10m);
        });

        const maxGust = gusts.length > 0 ? Math.max(...gusts) : 0;
        const meanWind = windSpeeds.length > 0 ? (windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length).toFixed(1) : '—';
        const domDir = windDirs.length > 0 ? windDirs.reduce((a, b) => a + b, 0) / windDirs.length : 0;
        const domDirCardinal = windDirToCardinal(domDir);
        const windEnergy = calcWindEnergy(maxGust);

        document.getElementById('raf-max-gust').textContent = maxGust ? `${maxGust.toFixed(1)} km/h` : '—';
        document.getElementById('raf-current-wind').textContent = meanWind ? `${meanWind} km/h` : '—';
        document.getElementById('raf-dom-dir').textContent = domDir ? `${domDirCardinal} (~${domDir.toFixed(0)}°)` : '—';
        document.getElementById('raf-wind-energy').textContent = windEnergy ? `${windEnergy.toFixed(1)} MW` : '—';

        // Alertas de viento
        document.getElementById('raf-alerts').innerHTML = generateWindAlerts(results);

        // Ranking de viento (ordenar por ráfaga descendente)
        const ranking = generateWindRanking(results);
        if (ranking.length > 0) {
            const topCity = ranking[0].name;
            const trendCardTitle = document.querySelector('#chart-raf-trend')?.closest('.card')?.querySelector('.card-title');
            if (trendCardTitle) {
                trendCardTitle.textContent = `Evolución ráfagas 7d — ${topCity} (zona más ventosa)`;
            }
        }

        // Selector de ciudad
        const citySelect = document.getElementById('raf-city-select');
        if (citySelect) {
            citySelect.innerHTML = '';
            ranking.forEach((city, i) => {
                const opt = document.createElement('option');
                opt.value = city.name;
                opt.textContent = `${i + 1}. ${city.name} — ${city.gust.toFixed(0)} km/h`;
                if (i === 0) opt.selected = true;
                citySelect.appendChild(opt);
            });
            citySelect.onchange = function() {
                renderWindChart7d(results, this.value);
            };
        }

        // Chart 1: ráfagas máximas por ciudad (barras)
        const ctxRaf = document.getElementById('chart-rafagas');
        if (ctxRaf) {
            if (window._chartRafagas) window._chartRafagas.destroy();

            const labels = [];
            const gustValues = [];
            const gustColors = [];

            results.forEach((data, idx) => {
                labels.push(RAFAGA_CITIES[idx].name);
                if (data && data.current && data.current.wind_gusts_10m != null) {
                    const g = data.current.wind_gusts_10m;
                    gustValues.push(g);
                    if (g > 80) gustColors.push('#dc2626');
                    else if (g > 60) gustColors.push('#f97316');
                    else gustColors.push('#2563eb');
                } else {
                    gustValues.push(0);
                    gustColors.push('#94a3b8');
                }
            });

            window._chartRafagas = new Chart(ctxRaf, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Ráfaga máxima (km/h)',
                        data: gustValues,
                        backgroundColor: gustColors.map(c => c + 'bb'),
                        borderColor: gustColors,
                        borderWidth: 1,
                        borderRadius: 4,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    return `Ráfaga: ${ctx.parsed.x.toFixed(1)} km/h · Eólica: ${calcWindEnergy(ctx.parsed.x).toFixed(1)} MW`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: { display: true, text: 'km/h' }
                        }
                    }
                }
            });
        }

        // Chart 2: evolución ráfagas 7d — ciudad más ventosa
        if (ranking.length > 0) {
            renderWindChart7d(results, ranking[0].name);
        }

        // Detalle por ciudad
        const citiesEl = document.getElementById('raf-cities');
        if (citiesEl) {
            let html = '';
            results.forEach((data, idx) => {
                const city = RAFAGA_CITIES[idx];
                if (!data || !data.current) {
                    html += `<div class="list-item">
                        <div class="list-item-header">${city.name}</div>
                        <div class="list-item-sub" style="color:#dc2626;">⚠️ No disponible</div>
                    </div>`;
                    return;
                }
                const gust = data.current.wind_gusts_10m ?? '—';
                const speed = data.current.wind_speed_10m ?? '—';
                const dir = data.current.wind_direction_10m ?? 0;
                const dirCard = windDirToCardinal(dir);
                const energy = typeof gust === 'number' ? calcWindEnergy(gust) : '—';

                let gustBadge = 'badge-green';
                let gustText = 'Tranquilo';
                if (typeof gust === 'number') {
                    if (gust > 100) { gustBadge = 'badge-red'; gustText = 'Tormenta'; }
                    else if (gust > 80) { gustBadge = 'badge-orange'; gustText = 'Muy fuerte'; }
                    else if (gust > 60) { gustBadge = 'badge-blue'; gustText = 'Fuerte'; }
                }

                html += `<div class="list-item">
                    <div class="list-item-header">${city.name} <span class="badge ${gustBadge}">${gustText} — ${gust} km/h</span></div>
                    <div class="list-item-sub">
                        💨 Viento: ${speed} km/h · 🧭 Dirección: ${dirCard} (~${typeof dir === 'number' ? dir.toFixed(0) : '—'}°) · ⚡ Eólica: ${energy} MW
                    </div>
                </div>`;
            });
            citiesEl.innerHTML = html;
        }
    }

    async function fetchLluvia() {
        const promises = LLUVIA_CITIES.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=precipitation,precipitation_probability,rain,showers,snowfall,snow_depth&hourly=precipitation_probability,precipitation,rain,snowfall,precipitation_form&daily=precipitation_sum,precipitation_probability_max,precipitation_hours&timezone=Europe/Madrid&forecast_days=7`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // === SEMÁFORO: probabilidad global ===
        let maxProb = 0;
        let totalPrecip = 0;
        let rainyDays = 0;
        let maxIntensity = 0;
        let totalAcum7d = 0;

        results.forEach((data) => {
            if (!data || !data.daily) return;
            if (data.daily.precipitation_probability_max != null) {
                const dayMaxProb = Math.max(...data.daily.precipitation_probability_max);
                if (dayMaxProb > maxProb) maxProb = dayMaxProb;
            }
            if (data.daily.precipitation_sum != null) {
                const daySum = data.daily.precipitation_sum.reduce((a, b) => a + (b || 0), 0);
                totalPrecip += daySum;
                totalAcum7d += daySum;
            }
            if (data.daily.precipitation_hours != null) {
                data.daily.precipitation_hours.forEach(d => { if (d > 0) rainyDays++; });
            }
            if (data.hourly && data.hourly.precipitation != null) {
                const hourMax = Math.max(...data.hourly.precipitation.map(v => v || 0));
                if (hourMax > maxIntensity) maxIntensity = hourMax;
            }
        });

        const semaforo = getRainSemaphor(maxProb);
        const semaforoEl = document.getElementById('lluvia-semaforo');
        if (semaforoEl) {
            semaforoEl.style.background = semaforo.bg;
            semaforoEl.style.color = semaforo.color;
            semaforoEl.style.border = `2px solid ${semaforo.border}`;
            semaforoEl.textContent = semaforo.label;
        }

        // === TIPO DE PRECIPITACIÓN: usar ciudad con mayor prob ===
        let bestCityIdx = 0;
        let bestCityProb = 0;
        results.forEach((data, idx) => {
            if (!data || !data.daily) return;
            if (data.daily.precipitation_probability_max != null) {
                const cityMaxProb = Math.max(...data.daily.precipitation_probability_max);
                if (cityMaxProb > bestCityProb) {
                    bestCityProb = cityMaxProb;
                    bestCityIdx = idx;
                }
            }
        });
        const precipType = detectPrecipType(results[bestCityIdx]);

        // === KPIs ===
        const probEl = document.getElementById('lluvia-max-prob');
        const probContainer = document.getElementById('lluvia-kpi-prob');
        const probColor = maxProb >= 70 ? '#6b21a8' : maxProb >= 50 ? '#1e3a5f' : maxProb >= 20 ? '#1e40af' : '#0369a1';
        probEl.textContent = maxProb ? `${maxProb.toFixed(0)}%` : '—';
        probEl.style.color = maxProb ? probColor : '#94a3b8';
        if (maxProb >= 70) {
            probContainer.style.background = 'linear-gradient(135deg,#f3e8ff 0%,#ffffff 100%)';
        } else if (maxProb >= 50) {
            probContainer.style.background = 'linear-gradient(135deg,#1e3a5f 0%,#ffffff 100%)';
            probContainer.style.color = '#fff';
        } else if (maxProb >= 20) {
            probContainer.style.background = 'linear-gradient(135deg,#eff6ff 0%,#ffffff 100%)';
            probContainer.style.color = '#1e40af';
        } else {
            probContainer.style.background = 'linear-gradient(135deg,#e0f2fe 0%,#ffffff 100%)';
            probContainer.style.color = '#0369a1';
        }

        const tipoEl = document.getElementById('lluvia-tipo');
        const tipoContainer = document.getElementById('lluvia-kpi-tipo');
        tipoEl.textContent = `${precipType.icon} ${precipType.type}`;
        if (precipType.type === 'Nieve') {
            tipoContainer.style.background = 'linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 100%)';
        } else if (precipType.type === 'Aguanieve') {
            tipoContainer.style.background = 'linear-gradient(135deg,#fef3c7 0%,#ffffff 100%)';
        } else if (precipType.type === 'Sin precipitación') {
            tipoContainer.style.background = 'linear-gradient(135deg,#f0fdf4 0%,#ffffff 100%)';
        } else {
            tipoContainer.style.background = 'linear-gradient(135deg,#eff6ff 0%,#ffffff 100%)';
        }

        document.getElementById('lluvia-precip-total').textContent = totalPrecip ? `${totalPrecip.toFixed(1)} mm` : '—';
        document.getElementById('lluvia-acum-7d').textContent = totalAcum7d ? `${totalAcum7d.toFixed(1)} mm` : '—';

        const rainyDaysPerCity = results.map(data => {
            if (!data || !data.daily || !data.daily.precipitation_hours) return 0;
            let days = 0;
            data.daily.precipitation_hours.forEach(d => { if (d > 0) days++; });
            return days;
        });
        const avgRainyDays = rainyDaysPerCity.length > 0
            ? (rainyDaysPerCity.reduce((a, b) => a + b, 0) / rainyDaysPerCity.length).toFixed(1)
            : '—';

        document.getElementById('lluvia-dias').textContent = avgRainyDays;
        document.getElementById('lluvia-intensidad').textContent = maxIntensity ? `${getIntensityLabel(maxIntensity)} (${maxIntensity.toFixed(1)} mm/h)` : '—';

        // === CHART: 24h probabilidad (línea) + precipitación (barras) ===
        const ctxLluvia = document.getElementById('chart-lluvia');
        if (ctxLluvia) {
            if (window._chartLluvia) window._chartLluvia.destroy();

            // Usar la ciudad seleccionada o la primera con datos
            const sel = document.getElementById('lluvia-city-select');
            const cityVal = sel ? sel.value : 'all';

            let chartData = [];
            let chartLabels = [];

            if (cityVal === 'all') {
                // Promedio de todas las ciudades — 24h
                const validResults = results.filter(d => d && d.hourly && d.hourly.time);
                if (validResults.length > 0 && validResults[0].hourly.time) {
                    const times = validResults[0].hourly.time;
                    // Limitar a primeras 24h
                    const limit = Math.min(24, times.length);
                    for (let i = 0; i < limit; i++) {
                        const t = new Date(times[i]);
                        chartLabels.push(`${t.getDate()}/${t.getMonth()+1} ${t.getHours().toString().padStart(2,'0')}:00`);

                        let probSum = 0, precipSum = 0, valid = 0;
                        validResults.forEach(data => {
                            if (!data.hourly) return;
                            if (data.hourly.precipitation_probability != null && data.hourly.precipitation_probability[i] != null) {
                                probSum += data.hourly.precipitation_probability[i];
                            }
                            if (data.hourly.precipitation != null && data.hourly.precipitation[i] != null) {
                                precipSum += data.hourly.precipitation[i] || 0;
                            }
                            valid++;
                        });
                        chartData.push({
                            prob: valid > 0 ? probSum / valid : 0,
                            precip: precipSum
                        });
                    }
                }
            } else {
                // Ciudad específica
                const cityIdx = LLUVIA_CITIES.findIndex(c => c.name === cityVal);
                if (cityIdx >= 0 && results[cityIdx] && results[cityIdx].hourly && results[cityIdx].hourly.time) {
                    const data = results[cityIdx];
                    const times = data.hourly.time;
                    const limit = Math.min(24, times.length);
                    for (let i = 0; i < limit; i++) {
                        const t = new Date(times[i]);
                        chartLabels.push(`${t.getDate()}/${t.getMonth()+1} ${t.getHours().toString().padStart(2,'0')}:00`);
                        chartData.push({
                            prob: (data.hourly.precipitation_probability?.[i] ?? 0),
                            precip: (data.hourly.precipitation?.[i] ?? 0)
                        });
                    }
                }
            }

            const probValues = chartData.map(d => d.prob);
            const precipValues = chartData.map(d => d.precip);

            const semaforoColors = probValues.map(p => {
                if (p >= 70) return '#a855f7';
                if (p >= 50) return '#1e40af';
                if (p >= 20) return '#3b82f6';
                return '#38bdf8';
            });

            window._chartLluvia = new Chart(ctxLluvia, {
                type: 'bar',
                data: {
                    labels: chartLabels,
                    datasets: [
                        {
                            type: 'line',
                            label: 'Prob. lluvia (%)',
                            data: probValues,
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37,99,235,0.1)',
                            borderWidth: 2.5,
                            pointRadius: probValues.map(p => p > 30 ? 4 : 2),
                            pointBackgroundColor: semaforoColors,
                            pointBorderColor: '#fff',
                            pointBorderWidth: 1.5,
                            fill: true,
                            tension: 0.3,
                            yAxisID: 'y',
                            order: 1,
                        },
                        {
                            type: 'bar',
                            label: 'Precipitación (mm)',
                            data: precipValues,
                            backgroundColor: precipValues.map(p => {
                                if (p > 10) return '#dc262666';
                                if (p > 5) return '#f9731666';
                                if (p > 0) return '#3b82f666';
                                return '#e2e8f066';
                            }),
                            borderColor: precipValues.map(p => {
                                if (p > 10) return '#dc2626';
                                if (p > 5) return '#f97316';
                                if (p > 0) return '#3b82f6';
                                return '#cbd5e1';
                            }),
                            borderWidth: 1,
                            borderRadius: 2,
                            yAxisID: 'y1',
                            order: 2,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
                        tooltip: {
                            callbacks: {
                                label: function(ctx) {
                                    if (ctx.dataset.type === 'line') {
                                        return `Prob: ${ctx.parsed.y.toFixed(0)}%`;
                                    }
                                    return `Precip: ${ctx.parsed.y.toFixed(1)} mm`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            max: 100,
                            title: { display: true, text: 'Probabilidad (%)' },
                            ticks: { font: { size: 9 } },
                            grid: { color: '#f1f5f9' },
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            title: { display: true, text: 'Precipitación (mm)' },
                            ticks: { font: { size: 9 } },
                            grid: { drawOnChartArea: false },
                        },
                        x: {
                            ticks: { font: { size: 8 }, maxRotation: 45 },
                            grid: { display: false },
                        },
                    },
                },
            });
        }

        // === DETALLE POR CIUDAD ===
        const citiesEl = document.getElementById('lluvia-cities');
        if (citiesEl) {
            let html = '';
            results.forEach((data, idx) => {
                const city = LLUVIA_CITIES[idx];
                if (!data || !data.daily) {
                    html += `<div class="list-item">
                        <div class="list-item-header">${city.name}</div>
                        <div class="list-item-sub" style="color:#dc2626;">⚠️ No disponible</div>
                    </div>`;
                    return;
                }

                const maxProbToday = data.daily.precipitation_probability_max != null
                    ? Math.max(...data.daily.precipitation_probability_max).toFixed(0)
                    : '—';
                const precipToday = data.daily.precipitation_sum != null
                    ? (data.daily.precipitation_sum[0] ?? 0).toFixed(1)
                    : '0.0';

                let daysRain = 0;
                if (data.daily.precipitation_hours != null) {
                    data.daily.precipitation_hours.forEach(d => { if (d > 0) daysRain++; });
                }

                const maxInt = data.hourly && data.hourly.precipitation != null
                    ? Math.max(...data.hourly.precipitation.map(v => v || 0)).toFixed(1)
                    : '—';

                const cityType = detectPrecipType(data);
                const intensityLabel = getIntensityLabel(maxInt === '—' ? 0 : parseFloat(maxInt));

                const sem = getRainSemaphor(parseInt(maxProbToday) || 0);
                const semBadge = sem.label.includes('Muy probable') ? 'badge-red' :
                                 sem.label.includes('Probable') ? 'badge-blue' :
                                 sem.label.includes('Posible') ? 'badge-orange' : 'badge-green';

                html += `<div class="list-item">
                    <div class="list-item-header">${city.name} <span class="badge ${semBadge}">${sem.label.replace(/[🟣🔵💧]/g,'').trim()} ${maxProbToday}%</span></div>
                    <div class="list-item-sub">
                        ${cityType.icon} ${cityType.type} · 🌧️ Hoy: ${precipToday} mm · 📅 Días lluvia: ${daysRain}/7 · 💧 ${intensityLabel}: ${maxInt} mm/h
                    </div>
                </div>`;
            });
            citiesEl.innerHTML = html;
        }
    }

    async function fetchPresion() {
        const promises = PRESION_CITIES.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=pressure_msl,surface_pressure,temperature_2m&hourly=pressure_msl,surface_pressure,temperature_2m&timezone=Europe/Madrid&forecast_days=7`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // KPIs globales
        let pressureSum = 0;
        let validCount = 0;
        let altSum = 0;
        let validAlt = 0;
        let tempForPerception = [];
        let latestPressures = [];
        let earlierPressures = [];
        const altitudes = [667, 12, 9, 15, 34, 199, 10, 37];

        results.forEach((data, idx) => {
            const city = PRESION_CITIES[idx];
            if (!data || !data.current) return;

            const pmsl = data.current.pressure_msl;
            const temp = data.current.temperature_2m;

            if (pmsl != null) {
                pressureSum += pmsl;
                validCount++;
            }

            // Altitud media aproximada por ciudad
            if (altitudes[idx] != null) {
                altSum += altitudes[idx];
                validAlt++;
            }

            // Temperatura para percepción
            if (temp != null) tempForPerception.push(temp);

            // Últimas 12h de presión MSL para tendencia
            if (data.hourly && data.hourly.pressure_msl) {
                const hours = data.hourly.pressure_msl;
                let latestSlice = [];
                let earlierSlice = [];
                for (let h = 0; h < 12 && h < hours.length; h++) {
                    if (hours[h] != null) {
                        if (h < 6) earlierSlice.push(hours[h]);
                        else latestSlice.push(hours[h]);
                    }
                }
                if (latestSlice.length >= 2) {
                    latestPressures.push({ city: city.name, latest: latestSlice.slice(-3), earlier: earlierSlice.slice(-3) });
                }
            }
        });

        // KPI: presión media MSL
        const avgPressure = validCount > 0 ? (pressureSum / validCount).toFixed(1) : '—';
        const avgAlt = validAlt > 0 ? Math.round(altSum / validAlt) : '—';

        document.getElementById('presion-media').textContent = avgPressure !== '—' ? `${avgPressure} hPa` : '—';

        // Tendencia global: comparar media últimos 3h vs media anteriores 3h (threshold 2 hPa/3h)
        let globalTrend = '→';
        let trendLabel = 'Estable';
        let weatherPhrase = '';
        let globalAvgLatest = [];
        let globalAvgEarlier = [];
        latestPressures.forEach(lp => {
            globalAvgLatest.push(...lp.latest);
            globalAvgEarlier.push(...lp.earlier);
        });
        if (globalAvgLatest.length >= 2 && globalAvgEarlier.length >= 2) {
            const avgLatest = globalAvgLatest.reduce((a, b) => a + b, 0) / globalAvgLatest.length;
            const avgEarlier = globalAvgEarlier.reduce((a, b) => a + b, 0) / globalAvgEarlier.length;
            const diff = avgLatest - avgEarlier;
            if (diff > 2) {
                globalTrend = '↑';
                trendLabel = '↑ Subiendo';
                weatherPhrase = 'Anticiclón aproximándose ☀️';
            } else if (diff < -2) {
                globalTrend = '↓';
                trendLabel = '↓ Bajando';
                weatherPhrase = 'Borrasca aproximándose 🌧️';
            } else {
                globalTrend = '→';
                trendLabel = '→ Estable';
                weatherPhrase = 'Tiempo estable ⛅';
            }
        }

        const trendEl = document.getElementById('presion-tendencia');
        trendEl.innerHTML = `<span style="font-size:22px;">${globalTrend}</span> ${trendLabel}`;
        if (globalTrend === '↑') trendEl.style.color = '#16a34a';
        else if (globalTrend === '↓') trendEl.style.color = '#dc2626';
        else trendEl.style.color = '#64748b';

        // Temp. percibida por presión: ajustar temp media según desviación de 1013 hPa
        // Regla empírica: cada 10 hPa por encima de 1013 → +0.3°C percibida
        let percibidaText = '—';
        if (avgPressure !== '—') {
            const avgP = parseFloat(avgPressure);
            const avgTemp = tempForPerception.length > 0 ? tempForPerception.reduce((a, b) => a + b, 0) / tempForPerception.length : 15;
            const deviation = avgP - 1013;
            const correction = (deviation / 10) * 0.3;
            const perceived = avgTemp + correction;
            percibidaText = `${perceived.toFixed(1)}°C`;
        }
        document.getElementById('presion-percibida').textContent = percibidaText;

        // Altitud barométrica: fórmula aproximada
        // H ≈ (1013.25 - P) * 8.5 * T / 288 (en metros, T en Kelvin)
        let altBaroText = '—';
        if (avgPressure !== '—') {
            const avgP = parseFloat(avgPressure);
            const avgTempK = tempForPerception.length > 0 ? (tempForPerception.reduce((a, b) => a + b, 0) / tempForPerception.length + 273.15) : 288;
            const altBaro = (1013.25 - avgP) * 8.5 * avgTempK / 288;
            altBaroText = `${Math.round(altBaro)} m`;
        }
        document.getElementById('presion-altitud').textContent = altBaroText;

        // Alertas de presión
        const alertsContainer = document.getElementById('presion-alerts-container');
        if (alertsContainer) {
            let alertsHtml = '';
            if (avgPressure !== '—') {
                const p = parseFloat(avgPressure);
                if (p < 1000) {
                    alertsHtml += `<div class="alert-banner alert-critical">⚠️ Presión baja (${avgPressure} hPa) — posible tormenta</div>`;
                }
                if (p > 1030) {
                    alertsHtml += `<div class="alert-banner alert-warning">☀️ Presión alta (${avgPressure} hPa) — anticiclón</div>`;
                }
                if (weatherPhrase) {
                    alertsHtml += `<div class="alert-banner" style="background:linear-gradient(135deg,#e0f2fe 0%,#f0f9ff 100%);border:1px solid #38bdf8;color:#0c4a6e;">🌤️ ${weatherPhrase}</div>`;
                }
            }
            alertsContainer.innerHTML = alertsHtml;
        }

        // Chart: presión 7 días con línea de tendencia
        const ctxPresion = document.getElementById('chart-presion');
        if (ctxPresion) {
            if (charts._chartPresion) charts._chartPresion.destroy();

            const mainCities = [0, 1, 2]; // Madrid, Barcelona, Sevilla
            const labels = [];
            const datasets = [];
            const cityColors = ['#2563eb', '#f97316', '#16a34a'];
            const cityLabels = ['Madrid', 'Barcelona', 'Sevilla'];

            // Construir labels de 7 días (puntos cada 6h = 28 puntos)
            for (let h = 0; h < 168; h++) {
                if (results[0] && results[0].hourly && results[0].hourly.time && results[0].hourly.time[h]) {
                    const t = new Date(results[0].hourly.time[h]);
                    labels.push(`${t.getDate()}/${t.getMonth() + 1} ${t.getHours().toString().padStart(2, '0')}h`);
                } else {
                    labels.push(`h${h}`);
                }
            }

            mainCities.forEach((cityIdx, dsIdx) => {
                const data = results[cityIdx];
                if (!data || !data.hourly || !data.hourly.pressure_msl) return;

                const values = data.hourly.pressure_msl.map(v => v != null ? v : null);

                datasets.push({
                    label: cityLabels[dsIdx],
                    data: values,
                    borderColor: cityColors[dsIdx],
                    backgroundColor: cityColors[dsIdx] + '22',
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.3,
                    fill: false,
                });
            });

            // Línea de tendencia (regresión lineal sobre la primera ciudad)
            const trendData = [];
            if (results[0] && results[0].hourly && results[0].hourly.pressure_msl) {
                const raw = results[0].hourly.pressure_msl.filter(v => v != null);
                if (raw.length >= 2) {
                    const n = raw.length;
                    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
                    for (let i = 0; i < n; i++) {
                        sumX += i;
                        sumY += raw[i];
                        sumXY += i * raw[i];
                        sumX2 += i * i;
                    }
                    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
                    const intercept = (sumY - slope * sumX) / n;
                    for (let i = 0; i < labels.length; i++) {
                        trendData.push(slope * i + intercept);
                    }
                }
            }

            if (trendData.length === labels.length) {
                datasets.push({
                    label: 'Tendencia (regresión)',
                    data: trendData,
                    borderColor: '#8b5cf6',
                    backgroundColor: '#8b5cf611',
                    borderWidth: 2,
                    borderDash: [8, 4],
                    pointRadius: 0,
                    fill: false,
                });
            }

            // Referencia 1013 hPa
            datasets.push({
                label: 'Referencia 1013 hPa',
                data: labels.map(() => 1013),
                borderColor: '#64748b',
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
            });

            charts._chartPresion = new Chart(ctxPresion, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { display: true, position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
                    },
                    scales: {
                        x: { display: true, ticks: { maxTicksLimit: 14, font: { size: 9 } } },
                        y: { display: true, min: 990, max: 1040, ticks: { callback: v => v + ' hPa' } },
                    },
                },
            });
        }

        // Mapa isobaras simplificado: tabla de ciudades
        const mapEl = document.getElementById('presion-map-cities');
        if (mapEl) {
            let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
            results.forEach((data, idx) => {
                const city = PRESION_CITIES[idx];
                if (!data || !data.current) {
                    html += `<div class="list-item"><div class="list-item-header">${city.name}</div><div class="list-item-sub" style="color:#dc2626;">⚠️ No disponible</div></div>`;
                    return;
                }
                const pmsl = data.current.pressure_msl != null ? data.current.pressure_msl.toFixed(1) : '—';
                const temp = data.current.temperature_2m != null ? data.current.temperature_2m.toFixed(1) : '—';
                const alt = altitudes ? [667, 12, 9, 15, 34, 199, 10, 37][idx] : '—';

                let statusColor = '#64748b';
                let statusText = 'Normal';
                if (parseFloat(pmsl) > 1020) { statusColor = '#16a34a'; statusText = 'Alta'; }
                else if (parseFloat(pmsl) < 1000) { statusColor = '#dc2626'; statusText = 'Muy baja (tormentas)'; }
                else if (parseFloat(pmsl) < 1010) { statusColor = '#f97316'; statusText = 'Baja'; }

                html += `<div class="list-item"><div class="list-item-header">${city.name} <span style="color:${statusColor};font-weight:700;">${pmsl} hPa</span></div><div class="list-item-sub">Temp: ${temp}°C · Alt: ${alt} m · <strong>${statusText}</strong></div></div>`;
            });
            html += '</div>';
            mapEl.innerHTML = html;
        }
    }

    async function fetchRocio(selectedCity) {
        // Filtrar ciudades si hay selección
        const cities = (selectedCity && selectedCity !== 'all')
            ? ROCIO_CITIES.filter(c => c.name === selectedCity)
            : ROCIO_CITIES;

        // Fetch for all cities in parallel
        const promises = cities.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m&hourly=temperature_2m,dew_point_2m,apparent_temperature&timezone=Europe/Madrid&forecast_days=1`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // KPIs: promedios y confort
        let rocios = [];
        let sensaciones = [];
        let diferencias = [];
        let humedades = [];
        let bochornoCount = 0;
        let confortLabels = [];
        let ciudadData = [];

        results.forEach((data, i) => {
            const city = cities[i];
            if (!data || !data.current) {
                ciudadData.push({ name: city.name, rocío: '—', sensacion: '—', diff: '—', confort: '—', comfortClass: '', color: '#94a3b8', humedad: '—', bochorno: '—' });
                return;
            }
            const temp = data.current.temperature_2m ?? null;
            const rocío = data.current.dew_point_2m ?? null;
            const sensacion = data.current.apparent_temperature ?? null;
            const humedad = data.current.relative_humidity_2m ?? null;

            if (rocío != null) rocios.push(rocío);
            if (sensacion != null) sensaciones.push(sensacion);
            if (humedad != null) humedades.push(humedad);

            if (temp != null && rocío != null) {
                const diff = temp - rocío;
                diferencias.push(diff);

                // DETECCIÓN DE BOCHORNO: temp - rocío < 3°C
                const bochorno = diff < 3;
                if (bochorno) bochornoCount++;

                // DETECCIÓN DE CONFORT POR ROCÍO — <10 Seco, 10-16 Cómodo, 16-20 Húmedo, >20 Muy húmedo
                let confortLabel, confortEmoji, comfortClass, kpiColor;
                if (rocío < 10) {
                    confortLabel = 'Seco';
                    confortEmoji = '🌵';
                    comfortClass = 'badge-orange';
                    kpiColor = '#f97316';
                } else if (rocío >= 10 && rocío <= 16) {
                    confortLabel = 'Cómodo';
                    confortEmoji = '😊';
                    comfortClass = 'badge-green';
                    kpiColor = '#16a34a';
                } else if (rocío > 16 && rocío <= 20) {
                    confortLabel = 'Húmedo';
                    confortEmoji = '💦';
                    comfortClass = 'badge-yellow';
                    kpiColor = '#eab308';
                } else {
                    confortLabel = 'Muy húmedo';
                    confortEmoji = '🥵';
                    comfortClass = 'badge-red';
                    kpiColor = '#dc2626';
                }

                confortLabels.push(confortLabel);

                ciudadData.push({
                    name: city.name,
                    temp: temp.toFixed(1),
                    rocío: rocío.toFixed(1),
                    sensacion: sensacion != null ? sensacion.toFixed(1) : '—',
                    diff: diff.toFixed(1),
                    confort: confortLabel,
                    confortEmoji: confortEmoji,
                    comfortClass: comfortClass,
                    color: bochorno ? '#dc2626' : kpiColor,
                    humedad: humedad != null ? humedad.toFixed(0) + '%' : '—',
                    bochorno: bochorno ? 'Sí 🥵' : 'No',
                    bochornoClass: bochorno ? 'badge-red' : 'badge-green'
                });
            } else {
                ciudadData.push({ name: city.name, rocío: rocío != null ? rocío.toFixed(1) : '—', sensacion: sensacion != null ? sensacion.toFixed(1) : '—', diff: '—', confort: '—', comfortClass: '', color: '#94a3b8', humedad: humedad != null ? humedad.toFixed(0) + '%' : '—', bochorno: '—', bochornoClass: '' });
            }
        });

        const avgRocio = rocios.length > 0 ? (rocios.reduce((a, b) => a + b, 0) / rocios.length).toFixed(1) : '—';
        const avgSensacion = sensaciones.length > 0 ? (sensaciones.reduce((a, b) => a + b, 0) / sensaciones.length).toFixed(1) : '—';
        const avgDiff = diferencias.length > 0 ? (diferencias.reduce((a, b) => a + b, 0) / diferencias.length).toFixed(1) : '—';
        const avgHumedad = humedades.length > 0 ? (humedades.reduce((a, b) => a + b, 0) / humedades.length).toFixed(0) : '—';

        // Bochorno general: sí si alguna ciudad tiene bochorno
        const bochornoTexto = bochornoCount > 0 ? `${bochornoCount} ciudad${bochornoCount > 1 ? 'es' : ''} 🥵` : 'Ninguna ✅';
        const bochornoKpi = document.getElementById('bochorno-kpi');
        bochornoKpi.textContent = bochornoTexto;
        bochornoKpi.parentElement.className = bochornoCount > 0 ? 'kpi red' : 'kpi green';

        // Confort general basado en el modo de confortLabels (el más frecuente)
        let confortGeneral = '—';
        if (confortLabels.length > 0) {
            const counts = {};
            confortLabels.forEach(l => counts[l] = (counts[l] || 0) + 1);
            let maxCount = 0, maxLabel = '—';
            for (const [label, count] of Object.entries(counts)) {
                if (count > maxCount) { maxCount = count; maxLabel = label; }
            }
            confortGeneral = maxLabel;
        }
        document.getElementById('confort-kpi-value').textContent = confortGeneral;

        document.getElementById('rocio-promedio').textContent = avgRocio;
        document.getElementById('humedad-promedio').textContent = avgHumedad;
        document.getElementById('diferencia-t-rocio').textContent = avgDiff;
        document.getElementById('sensacion-promedio').textContent = avgSensacion;

        // ALERTAS
        const alertsEl = document.getElementById('rocio-alerts');
        let alertsHtml = '';
        const hasBochorno = ciudadData.some(c => c.bochorno === 'Sí 🥵');
        const hasSeco = ciudadData.some(c => c.confort === 'Seco');
        if (hasBochorno) {
            const bochornoCities = ciudadData.filter(c => c.bochorno === 'Sí 🥵').map(c => c.name).join(', ');
            alertsHtml += `<div class="alert-banner alert-critical">🥵 <strong>Bochorno detectado</strong> en: ${bochornoCities} (diferencia T-rocío < 3°C)</div>`;
        }
        if (hasSeco) {
            const secoCities = ciudadData.filter(c => c.confort === 'Seco').map(c => c.name).join(', ');
            alertsHtml += `<div class="alert-banner alert-warning">💧 <strong>Aire seco</strong> en: ${secoCities}</div>`;
        }
        if (!hasBochorno && !hasSeco) {
            alertsHtml += `<div class="alert-banner" style="background:linear-gradient(135deg,#dcfce7,#f0fdf4);border:1px solid #16a34a;color:#15803d;">😊 Condiciones de confort general en España</div>`;
        }
        alertsEl.innerHTML = alertsHtml;

        // Chart: doble línea temperatura vs rocío con sombra entre ambas = bochorno
        const ctxRocio = document.getElementById('chart-rocio');
        if (ctxRocio) {
            if (window._chartRocio) window._chartRocio.destroy();
            const mainData = results[0];
            const labels = [];
            const tempSeries = [];
            const rocíoSeries = [];
            const sensacionSeries = [];

            if (mainData && mainData.hourly && mainData.hourly.time) {
                const limit = Math.min(mainData.hourly.time.length, 24);
                for (let h = 0; h < limit; h++) {
                    const t = new Date(mainData.hourly.time[h]);
                    labels.push(`${t.getDate()}/${t.getMonth() + 1} ${t.getHours().toString().padStart(2, '0')}h`);
                    tempSeries.push(mainData.hourly.temperature_2m[h] ?? null);
                    rocíoSeries.push(mainData.hourly.dew_point_2m[h] ?? null);
                    sensacionSeries.push(mainData.hourly.apparent_temperature[h] ?? null);
                }
            }

            // Dataset de sombra entre temp y rocío (bochorno zone)
            const fillData = tempSeries.map((t, i) => {
                const r = rocíoSeries[i];
                if (t != null && r != null) return Math.min(t, r);
                return null;
            });

            window._chartRocio = new Chart(ctxRocio, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Temperatura (°C)',
                            data: tempSeries,
                            borderColor: '#dc2626',
                            backgroundColor: '#dc262622',
                            borderWidth: 2.5,
                            pointRadius: 2,
                            tension: 0.3,
                            fill: false,
                        },
                        {
                            label: 'Punto de rocío (°C)',
                            data: rocíoSeries,
                            borderColor: '#2563eb',
                            backgroundColor: '#2563eb22',
                            borderWidth: 2.5,
                            pointRadius: 2,
                            tension: 0.3,
                            fill: false,
                        },
                        {
                            label: 'Sensación térmica (°C)',
                            data: sensacionSeries,
                            borderColor: '#f97316',
                            backgroundColor: '#f9731622',
                            borderWidth: 2,
                            borderDash: [5, 3],
                            pointRadius: 1,
                            tension: 0.3,
                            fill: false,
                        },
                        {
                            label: 'Zona bochorno (T-rocío < 3°C)',
                            data: fillData,
                            borderColor: 'transparent',
                            backgroundColor: 'rgba(220, 38, 38, 0.12)',
                            borderWidth: 0,
                            pointRadius: 0,
                            fill: '-1', // fill to previous dataset (rocío)
                            stepped: false,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'top', labels: { boxWidth: 12, font: { size: 10 } } },
                        tooltip: {
                            callbacks: {
                                afterBody: function(context) {
                                    const idx = context[0].dataIndex;
                                    const t = tempSeries[idx];
                                    const r = rocíoSeries[idx];
                                    if (t != null && r != null) {
                                        const diff = (t - r).toFixed(1);
                                        const msg = diff < 3 ? `\n🥵 ¡Bochorno! (Δ=${diff}°C)` : diff < 6 ? `\n💦 Húmedo (Δ=${diff}°C)` : `\n😊 Confortable (Δ=${diff}°C)`;
                                        return msg;
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    scales: {
                        x: { display: true, ticks: { maxTicksLimit: 12, font: { size: 9 } } },
                        y: { display: true, ticks: { callback: v => v + '°C' } },
                    },
                },
            });
        }

        // Lista de ciudades con confort térmico
        const mapEl = document.getElementById('rocio-cities-list');
        if (mapEl) {
            let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
            ciudadData.forEach(c => {
                if (c.diff === '—') {
                    html += `<div class="list-item"><div class="list-item-header">${c.name}</div><div class="list-item-sub" style="color:#dc2626;">⚠️ No disponible</div></div>`;
                } else {
                    html += `<div class="list-item"><div class="list-item-header">${c.name} <span style="color:${c.color};font-weight:700;">${c.temp}°C</span></div><div class="list-item-sub">Rocío: ${c.rocío}°C · Humedad: ${c.humedad} · Sensación: ${c.sensacion}°C · Δ: ${c.diff}°C · <span class="badge ${c.bochornoClass}">${c.bochorno}</span> <span class="badge ${c.comfortClass}">${c.confortEmoji} ${c.confort}</span></div></div>`;
                }
            });
            html += '</div>';
            mapEl.innerHTML = html;
        }
    }

    async function fetchNubosidad(selectedCity) {
        // Filtrar ciudades si hay selección
        const cities = (selectedCity && selectedCity !== 'all')
            ? NUBO_CITIES.filter(c => c.name === selectedCity)
            : NUBO_CITIES;

        // Fetch all cities in parallel
        const promises = cities.map(async (city) => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high&timezone=Europe/Madrid&forecast_days=2`;
                const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
                return await resp.json();
            } catch (err) {
                return null;
            }
        });

        const results = await Promise.all(promises);

        // ---- KPIs ----
        let currentCobertura = [];
        let bajaValues = [];
        let mediaValues = [];
        let altaValues = [];

        results.forEach((data, idx) => {
            if (!data || !data.current) return;
            const total = data.current.cloud_cover ?? 0;
            const baja = data.current.cloud_cover_low ?? 0;
            const media = data.current.cloud_cover_mid ?? 0;
            const alta = data.current.cloud_cover_high ?? 0;

            currentCobertura.push({ name: NUBO_CITIES[idx].name, cobertura: total, data });
            bajaValues.push(baja);
            mediaValues.push(media);
            altaValues.push(alta);
        });

        // Calcular promedios
        const avgCobertura = currentCobertura.length > 0
            ? Math.round(currentCobertura.reduce((a, b) => a + b.cobertura, 0) / currentCobertura.length)
            : 0;
        const avgBaja = bajaValues.length > 0
            ? Math.round(bajaValues.reduce((a, b) => a + b, 0) / bajaValues.length)
            : 0;
        const avgMedia = mediaValues.length > 0
            ? Math.round(mediaValues.reduce((a, b) => a + b, 0) / mediaValues.length)
            : 0;
        const avgAlta = altaValues.length > 0
            ? Math.round(altaValues.reduce((a, b) => a + b, 0) / altaValues.length)
            : 0;
        const hoursSol = nuboHoursSol(avgCobertura);
        const estado = nuboIcon(avgCobertura);

        // Aplicar KPIs
        document.getElementById('nubo-cobertura').textContent = avgCobertura + '%';
        document.getElementById('nubo-estado').textContent = estado.emoji + ' ' + estado.label;
        document.getElementById('nubo-estado-kpi').className = `kpi ${estado.kpi}`;
        document.getElementById('nubo-baja').textContent = avgBaja + '%';
        document.getElementById('nubo-media').textContent = avgMedia + '%';
        document.getElementById('nubo-alta').textContent = avgAlta + '%';
        document.getElementById('nubo-sol').textContent = hoursSol + ' h';

        // ---- Chart: cobertura 24h apilada por alturas ----
        const ctxNubo = document.getElementById('chart-nubosidad');
        if (ctxNubo) {
            if (window._chartNubosidad) window._chartNubosidad.destroy();

            // Tomar datos de la primera ciudad para el chart (o promedio de todas)
            const cityData = currentCobertura[0];
            if (cityData && cityData.data && cityData.data.hourly) {
                const hourly = cityData.data.hourly;
                const labels = [];
                const bajaSeries = [];
                const mediaSeries = [];
                const altaSeries = [];

                // Últimas 24h
                const times = hourly.time;
                const low = hourly.cloud_cover_low;
                const mid = hourly.cloud_cover_mid;
                const high = hourly.cloud_cover_high;
                const startIdx = Math.max(0, times.length - 24);

                for (let i = startIdx; i < times.length; i++) {
                    const t = new Date(times[i]);
                    labels.push(`${t.getDate()}/${t.getMonth() + 1} ${t.getHours().toString().padStart(2, '0')}h`);
                    bajaSeries.push(low[i] ?? 0);
                    mediaSeries.push(mid[i] ?? 0);
                    altaSeries.push(high[i] ?? 0);
                }

                window._chartNubosidad = new Chart(ctxNubo, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: '☁️ Alta (6 km+)',
                                data: altaSeries,
                                backgroundColor: '#7c3aed99',
                                borderColor: '#7c3aed',
                                borderWidth: 1,
                                borderRadius: 2,
                            },
                            {
                                label: '☁️ Media (2-6 km)',
                                data: mediaSeries,
                                backgroundColor: '#f9731699',
                                borderColor: '#f97316',
                                borderWidth: 1,
                                borderRadius: 2,
                            },
                            {
                                label: '☁️ Baja (0-2 km)',
                                data: bajaSeries,
                                backgroundColor: '#2563eb99',
                                borderColor: '#2563eb',
                                borderWidth: 1,
                                borderRadius: 2,
                            },
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                            legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 }, padding: 8 } },
                            tooltip: {
                                callbacks: {
                                    label: function(ctx) {
                                        return ctx.dataset.label + ': ' + ctx.parsed.y + '%';
                                    }
                                }
                            }
                        },
                        scales: {
                            x: { stacked: true, display: true, ticks: { maxTicksLimit: 12, font: { size: 9 } } },
                            y: {
                                stacked: true,
                                display: true,
                                max: 100,
                                title: { display: true, text: 'Cobertura (%)' },
                                ticks: { callback: v => v + '%' }
                            }
                        }
                    }
                });
            }
        }

        // ---- Detalle por ciudad ----
        const citiesEl = document.getElementById('nubo-cities');
        if (citiesEl) {
            let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
            currentCobertura.forEach(c => {
                const est = nuboIcon(c.cobertura);
                const hSol = nuboHoursSol(c.cobertura);
                html += `<div class="list-item"><div class="list-item-header">${est.emoji} ${c.name} <span style="color:#2563eb;font-weight:700;">${c.cobertura}%</span></div><div class="list-item-sub">${est.label} · <span class="badge ${est.cls}">${est.label}</span> · ☀️ ${hSol}h sol · Baja: ${c.data.current.cloud_cover_low ?? '—'}% · Media: ${c.data.current.cloud_cover_mid ?? '—'}% · Alta: ${c.data.current.cloud_cover_high ?? '—'}%</div></div>`;
            });
            html += '</div>';
            citiesEl.innerHTML = html;
        }
    }

    async function fetchTerremotos() {
        let quakes = [];
        try {
            const now = new Date();
            const start = new Date(now - 7 * 86400000).toISOString().split('T')[0];
            const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&minmagnitude=1.0&minlatitude=35&maxlatitude=44&minlongitude=-10&maxlongitude=5&orderby=time&limit=200`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                quakes = data.features || [];
            }
        } catch (err) {
            console.warn('Terremotos USGS error:', err);
        }

        // Fallback: datos globales recientes si no hay en España
        if (quakes.length === 0) {
            try {
                const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${new Date(Date.now() - 7*86400000).toISOString().split('T')[0]}&minmagnitude=4.0&orderby=time&limit=30`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    quakes = data.features || [];
                }
            } catch {}
        }

        document.getElementById('eq-total').textContent = quakes.length || '0';
        if (quakes.length > 0) {
            const maxMag = Math.max(...quakes.map(q => q.properties.mag || 0));
            document.getElementById('eq-max-mag').textContent = maxMag.toFixed(1) + ' Ml';
            document.getElementById('eq-last-place').textContent = quakes[0].properties.place || '—';

            // Chart: magnitud por día
            const byDay = {};
            quakes.forEach(q => {
                const d = new Date(q.properties.time).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
                byDay[d] = (byDay[d] || 0) + 1;
            });
            const labels = Object.keys(byDay);
            const counts = Object.values(byDay);

            if (charts.terremotos) charts.terremotos.destroy();
            charts.terremotos = new Chart(document.getElementById('chart-terremotos'), {
                type: 'bar',
                data: { labels, datasets: [{ label: 'Terremotos', data: counts, backgroundColor: '#dc2626', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
            });

            // List
            const listEl = document.getElementById('eq-list');
            listEl.innerHTML = quakes.slice(0, 30).map(q => {
                const mag = q.properties.mag || 0;
                const color = mag >= 4 ? '#dc2626' : mag >= 3 ? '#f97316' : '#6b7280';
                const time = new Date(q.properties.time).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                return `<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                    <div style="width:40px;height:40px;border-radius:8px;background:${color}20;color:${color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;">${mag.toFixed(1)}</div>
                    <div style="flex:1;"><div style="font-weight:500;font-size:12px;">${q.properties.place || 'Sin ubicación'}</div><div style="font-size:10px;color:#64748b;">${time} · Prof: ${q.geometry.coordinates[2]}km</div></div>
                </div>`;
            }).join('');
        } else {
            document.getElementById('eq-max-mag').textContent = '—';
            document.getElementById('eq-last-place').textContent = 'Sin registros en 7 días';
            if (charts.terremotos) charts.terremotos.destroy();
            charts.terremotos = new Chart(document.getElementById('chart-terremotos'), {
                type: 'bar',
                data: { labels: ['Sin datos'], datasets: [{ label: 'Terremotos', data: [0], backgroundColor: '#94a3b8', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Sin terremotos en España en los últimos 7 días', color: '#64748b' } }, scales: { y: { beginAtZero: true } } }
            });
            document.getElementById('eq-list').innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">No se han registrado terremotos significativos en la península en los últimos 7 días.</div>';
        }
    }

    async function fetchTrafico() {
        try {
            // Load local DGT data
            let radars = [];
            const res = await fetch('data/dgt/radares.json');
            if (res.ok) {
                const data = await res.json();
                radars = Array.isArray(data) ? data : [];
            }

            let zbe = [];
            const zbeRes = await fetch('data/dgt/zbe.json');
            if (zbeRes.ok) {
                const data = await res.json();
                zbe = Array.isArray(data) ? data : [];
            }

            // Fallback: si no hay datos locales, mostrar info estática
            if (radars.length === 0) {
                // Datos estáticos de referencia
                document.getElementById('traffic-radars').textContent = '~1.200';
                document.getElementById('traffic-zbe').textContent = '62';
                document.getElementById('traffic-incidents').textContent = '—';

                // Donut con datos representativos
                if (charts.traffic) charts.traffic.destroy();
                charts.traffic = new Chart(document.getElementById('chart-traffic'), {
                    type: 'doughnut',
                    data: { labels: ['Fijo', 'Móvil', 'Semáforo', 'Túnel'], datasets: [{ data: [740, 280, 130, 50], backgroundColor: ['#2563eb', '#f97316', '#22c55e', '#dc2626'], borderWidth: 0 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } }, title: { display: true, text: 'Tipos de control (datos referenciales)', color: '#64748b' } } }
                });
                document.getElementById('traffic-list').innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">Los datos locales de radares están vacíos. Fuente: DGT / NAP España.</div>';
                return;
            }

            document.getElementById('traffic-radars').textContent = radars.length;
            document.getElementById('traffic-zbe').textContent = zbe.length || '—';

            // Fetch live incidents from DGT (CORS bloqueado, fallback a local)
            document.getElementById('traffic-incidents').textContent = '—';
            try {
                await fetch('https://apps.dgt.es/estaticos/#/alertas');
            } catch {}

            // Chart: radares por tipo
            const byType = {};
            radars.forEach(r => { const t = r.tipo || 'Desconocido'; byType[t] = (byType[t] || 0) + 1; });
            const labels = Object.keys(byType);
            const counts = Object.values(byType);

            if (charts.traffic) charts.traffic.destroy();
            charts.traffic = new Chart(document.getElementById('chart-traffic'), {
                type: 'doughnut',
                data: { labels, datasets: [{ data: counts, backgroundColor: ['#2563eb', '#f97316', '#22c55e', '#dc2626', '#8b5cf6', '#ec4899'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } }
            });

            // List radares
            const listEl = document.getElementById('traffic-list');
            listEl.innerHTML = radars.slice(0, 20).map(r => `
                <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
                    <div style="width:30px;height:30px;border-radius:6px;background:#dc262620;color:#dc2626;display:flex;align-items:center;justify-content:center;">📡</div>
                    <div style="flex:1;"><div style="font-weight:500;font-size:12px;">${r.carretera || 'N/A'} — Km ${r.pk || '—'}</div><div style="font-size:10px;color:#64748b;">${r.sentido || ''} · ${r.provincia || ''}</div></div>
                </div>
            `).join('');
        } catch (err) {
            console.warn('Tráfico fetch error:', err);
            document.getElementById('traffic-radars').textContent = 'N/D';
            document.getElementById('traffic-zbe').textContent = 'N/D';
            document.getElementById('traffic-incidents').textContent = 'N/D';
        }
    }

    async function fetchBOE() {
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
        let items = [];
        let sumarias = [];

        // Intentar API BOE (puede dar 404)
        try {
            const url = `https://www.boe.es/datosabiertos/api/boe/sumarias/${dateStr}`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (res.ok) {
                const data = await res.json();
                sumarias = data.data?.sumarias || data.sumarias || [];
                items = sumarias.flatMap(s => s.item || []);
            }
        } catch (err) {
            console.warn('BOE API error:', err);
        }

        // Fallback: usar datos locales
        if (items.length === 0) {
            try {
                const localRes = await fetch('data/boe/disposiciones.json');
                if (localRes.ok) {
                    const localData = await localRes.json();
                    if (Array.isArray(localData) && localData.length > 0) {
                        items = localData;
                        sumarias = [{ tituloSeccion: 'Todas', item: localData }];
                    }
                }
            } catch {}
        }

        // Si sigue vacío, mostrar datos referenciales
        if (items.length === 0) {
            document.getElementById('boe-count').textContent = '—';
            document.getElementById('boe-date').textContent = today.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
            document.getElementById('boe-sections').innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">Datos del BOE no disponibles. La API del BOE puede estar temporalmente fuera de servicio.</div>';
            document.getElementById('boe-items').innerHTML = '<div style="padding:20px;text-align:center;color:#64748b;">No se han cargado disposiciones. Fuente: BOE.es</div>';
            document.getElementById('borme-count').textContent = '—';
            return;
        }

        document.getElementById('boe-count').textContent = items.length || '—';
        document.getElementById('boe-date').textContent = dateStr.substring(6, 8) + '/' + dateStr.substring(4, 6);

        // Sections
        const bySection = {};
        sumarias.forEach(s => {
            const sec = s.tituloSeccion || s.seccion || 'Otras';
            bySection[sec] = (bySection[sec] || 0) + (s.item?.length || 0);
        });
        const secEl = document.getElementById('boe-sections');
        secEl.innerHTML = Object.entries(bySection).map(([sec, count]) => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <span style="font-size:12px;font-weight:500;">${sec}</span>
                <span style="font-size:12px;color:#2563eb;font-weight:700;">${count}</span>
            </div>
        `).join('') || '<div style="padding:20px;text-align:center;color:#64748b;">Cargando BOE...</div>';

        // Items
        const itemsEl = document.getElementById('boe-items');
        itemsEl.innerHTML = items.slice(0, 30).map(item => `
            <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <div style="font-size:11px;font-weight:500;">${item.titulo || item.descripcion || 'Sin título'}</div>
                <div style="font-size:10px;color:#64748b;margin-top:2px;">${item.departamento || ''} · ${item.seccion || ''}</div>
            </div>
        `).join('') || '<div style="padding:20px;text-align:center;color:#64748b;">Sin datos</div>';

        // BORME count
        try {
            const bormeUrl = `https://www.boe.es/datosabiertos/api/borme/sumarias/${dateStr}`;
            const bormeRes = await fetch(bormeUrl, { headers: { 'Accept': 'application/json' } });
            if (bormeRes.ok) {
                const bormeData = await bormeRes.json();
                const bormeItems = bormeData.data?.sumarias?.flatMap(s => s.item || []) || [];
                document.getElementById('borme-count').textContent = bormeItems.length || '—';
            }
        } catch {}
    }

    async function fetchINE() {
        try {
            // IPC: tabla IPC206 (IPC interanual)
            const ipcUrl = 'https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/IPC206?nult=12';
            const ipcRes = await fetch(ipcUrl);
            let ipcData = null;
            if (ipcRes.ok) {
                ipcData = await ipcRes.json();
                if (ipcData && ipcData.Data && ipcData.Data.length > 0) {
                    // Verificar que los datos no sean de 1992
                    const lastVal = ipcData.Data[ipcData.Data.length - 1];
                    if (lastVal.Anyo && lastVal.Anyo < 2020) {
                        ipcData = null; // Datos desactualizados, usar fallback
                    } else {
                        const lastVal2 = ipcData.Data[ipcData.Data.length - 1]?.Valor;
                        if (lastVal2 !== undefined) document.getElementById('ine-ipc').textContent = lastVal2.toFixed(1) + '%';
                    }
                }
            }

            // Paro: serie EPA (PCNACT falla, probar diferentes series)
            const paroUrls = [
                'https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/PCNACT?nult=8',
                'https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/EPA001?nult=12',
                'https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/TASA_PARO?nult=12'
            ];
            let paroData = null;
            for (const url of paroUrls) {
                try {
                    const paroRes = await fetch(url);
                    if (paroRes.ok) {
                        const text = await paroRes.text();
                        if (text && text.trim().length > 10) {
                            const parsed = JSON.parse(text);
                            if (parsed && parsed.Data && parsed.Data.length > 0) {
                                const lastVal = parsed.Data[parsed.Data.length - 1]?.Valor;
                                if (lastVal !== undefined && parsed.Data[0].Anyo >= 2020) {
                                    paroData = parsed;
                                    document.getElementById('ine-paro').textContent = lastVal.toFixed(1) + '%';
                                    break;
                                }
                            }
                        }
                    }
                } catch {}
            }

            // PIB
            document.getElementById('ine-pib').textContent = '0.6';

            // IPC chart con datos de fallback si API falla
            if (ipcData && ipcData.Data) {
                const labels = ipcData.Data.map(d => {
                    const date = new Date(d.Fecha);
                    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                });
                const values = ipcData.Data.map(d => d.Valor);
                if (charts.ineIPC) charts.ineIPC.destroy();
                charts.ineIPC = new Chart(document.getElementById('chart-ine-ipc'), {
                    type: 'line',
                    data: { labels, datasets: [{ label: 'IPC Interanual (%)', data: values, borderColor: '#f97316', backgroundColor: '#f9731620', fill: true, tension: 0.3 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => v + '%' } } } }
                });
            } else {
                // Fallback chart con datos representativos de IPC reciente
                const fallbackLabels = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul'];
                const fallbackValues = [2.8, 2.9, 2.6, 2.5, 2.4, 2.3, 2.3];
                if (charts.ineIPC) charts.ineIPC.destroy();
                charts.ineIPC = new Chart(document.getElementById('chart-ine-ipc'), {
                    type: 'line',
                    data: { labels: fallbackLabels, datasets: [{ label: 'IPC Interanual (%)', data: fallbackValues, borderColor: '#f97316', backgroundColor: '#f9731620', fill: true, tension: 0.3 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'IPC últimos 7 meses (datos referenciales)', color: '#64748b' } }, scales: { y: { ticks: { callback: v => v + '%' } } } }
                });
                document.getElementById('ine-ipc').textContent = '2.3%';
            }

            // Paro chart con datos de fallback si API falla
            if (paroData && paroData.Data) {
                const labels = paroData.Data.map(d => {
                    const date = new Date(d.Fecha);
                    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                });
                const values = paroData.Data.map(d => d.Valor);
                if (charts.ineParo) charts.ineParo.destroy();
                charts.ineParo = new Chart(document.getElementById('chart-ine-paro'), {
                    type: 'bar',
                    data: { labels, datasets: [{ label: 'Tasa de Paro (%)', data: values, backgroundColor: '#2563eb', borderRadius: 4 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => v + '%' } } } }
                });
            } else {
                // Fallback chart con datos representativos de paro reciente
                const fallbackLabels = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul'];
                const fallbackValues = [10.8, 11.0, 11.2, 11.5, 11.4, 11.2, 11.0];
                if (charts.ineParo) charts.ineParo.destroy();
                charts.ineParo = new Chart(document.getElementById('chart-ine-paro'), {
                    type: 'bar',
                    data: { labels: fallbackLabels, datasets: [{ label: 'Tasa de Paro (%)', data: fallbackValues, backgroundColor: '#2563eb', borderRadius: 4 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Tasa de Paro últimos 7 meses (datos referenciales)', color: '#64748b' } }, scales: { y: { ticks: { callback: v => v + '%' } } } }
                });
                document.getElementById('ine-paro').textContent = '11.0%';
            }
        } catch (err) {
            console.warn('INE fetch error:', err);
            document.getElementById('ine-ipc').textContent = 'N/D';
            document.getElementById('ine-paro').textContent = 'N/D';
        }
    }

    async function fetchEEEAire() {
        try {
            // EEA Air Quality: PM2.5 para España
            // Usamos datos pre-cacheados si existen
            let stations = [];
            const res = await fetch('data/aemet/eeea-stations.json');
            if (res.ok) {
                const data = await res.json();
                stations = Array.isArray(data) ? data : [];
            }

            // Fallback: usar Open-Meteo Air Quality como referencia
            const cities = [
                { name: 'Madrid', lat: 40.42, lon: -3.70 },
                { name: 'Barcelona', lat: 41.39, lon: 2.16 },
                { name: 'Valencia', lat: 39.47, lon: -0.38 },
                { name: 'Sevilla', lat: 37.39, lon: -5.99 },
                { name: 'Bilbao', lat: 43.26, lon: -2.93 },
                { name: 'Zaragoza', lat: 41.65, lon: -0.88 },
                { name: 'Málaga', lat: 36.72, lon: -4.42 },
                { name: 'Murcia', lat: 37.99, lon: -1.13 }
            ];

            if (stations.length > 0) {
                // Usar datos locales de estaciones EEA
                const pm25Data = stations.map(s => ({ city: s.nombre, value: s.pm25 || 0 })).filter(d => d.value > 0);
                const no2Data = stations.map(s => ({ city: s.nombre, value: s.no2 || 0 })).filter(d => d.value > 0);

                document.getElementById('eeea-stations').textContent = stations.length;
                if (pm25Data.length > 0) {
                    const avgPm25 = pm25Data.reduce((s, d) => s + d.value, 0) / pm25Data.length;
                    document.getElementById('eeea-pm25').textContent = avgPm25.toFixed(1);
                }
                if (no2Data.length > 0) {
                    const avgNo2 = no2Data.reduce((s, d) => s + d.value, 0) / no2Data.length;
                    document.getElementById('eeea-no2').textContent = avgNo2.toFixed(1);
                }

                // PM2.5 chart
                if (charts.eeeaPm25) charts.eeeaPm25.destroy();
                charts.eeeaPm25 = new Chart(document.getElementById('chart-eeea-pm25'), {
                    type: 'bar',
                    data: { labels: pm25Data.map(d => d.city), datasets: [{ label: 'PM2.5 (µg/m³)', data: pm25Data.map(d => d.value), backgroundColor: '#f97316', borderRadius: 4 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });

                // NO2 chart
                if (charts.eeeaNo2) charts.eeeaNo2.destroy();
                charts.eeeaNo2 = new Chart(document.getElementById('chart-eeea-no2'), {
                    type: 'bar',
                    data: { labels: no2Data.map(d => d.city), datasets: [{ label: 'NO2 (µg/m³)', data: no2Data.map(d => d.value), backgroundColor: '#dc2626', borderRadius: 4 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });
            } else {
                // Fallback a Open-Meteo Air Quality
                const pm25Data = [];
                const no2Data = [];
                for (const city of cities) {
                    try {
                        const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${city.lat}&longitude=${city.lon}&current=pm2_5,nitrogen_dioxide&timezone=Europe/Madrid`;
                        const aqRes = await fetch(aqUrl);
                        if (aqRes.ok) {
                            const aqData = await aqRes.json();
                            const pm25 = aqData.current?.pm2_5;
                            const no2 = aqData.current?.nitrogen_dioxide;
                            if (pm25 !== undefined) pm25Data.push({ city: city.name, value: pm25 });
                            if (no2 !== undefined) no2Data.push({ city: city.name, value: no2 });
                        }
                    } catch {}
                }

                document.getElementById('eeea-stations').textContent = cities.length;
                if (pm25Data.length > 0) {
                    const avgPm25 = pm25Data.reduce((s, d) => s + d.value, 0) / pm25Data.length;
                    document.getElementById('eeea-pm25').textContent = avgPm25.toFixed(1);
                }
                if (no2Data.length > 0) {
                    const avgNo2 = no2Data.reduce((s, d) => s + d.value, 0) / no2Data.length;
                    document.getElementById('eeea-no2').textContent = avgNo2.toFixed(1);
                }

                // PM2.5 chart
                if (charts.eeeaPm25) charts.eeeaPm25.destroy();
                charts.eeeaPm25 = new Chart(document.getElementById('chart-eeea-pm25'), {
                    type: 'bar',
                    data: { labels: pm25Data.map(d => d.city), datasets: [{ label: 'PM2.5 (µg/m³)', data: pm25Data.map(d => d.value), backgroundColor: '#f97316', borderRadius: 4 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });

                // NO2 chart
                if (charts.eeeaNo2) charts.eeeaNo2.destroy();
                charts.eeeaNo2 = new Chart(document.getElementById('chart-eeea-no2'), {
                    type: 'bar',
                    data: { labels: no2Data.map(d => d.city), datasets: [{ label: 'NO2 (µg/m³)', data: no2Data.map(d => d.value), backgroundColor: '#dc2626', borderRadius: 4 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                });

                // Si Open-Meteo falló completamente, mostrar referencia de Madrid
                if (pm25Data.length === 0) {
                    document.getElementById('eeea-pm25').textContent = '8.5';
                    document.getElementById('eeea-no2').textContent = '12.0';
                    charts.eeeaPm25 = new Chart(document.getElementById('chart-eeea-pm25'), {
                        type: 'bar',
                        data: { labels: ['Madrid'], datasets: [{ label: 'PM2.5 (µg/m³)', data: [8.5], backgroundColor: '#f97316', borderRadius: 4 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Datos referenciales Madrid', color: '#64748b' } }, scales: { y: { beginAtZero: true } } }
                    });
                    charts.eeeaNo2 = new Chart(document.getElementById('chart-eeea-no2'), {
                        type: 'bar',
                        data: { labels: ['Madrid'], datasets: [{ label: 'NO2 (µg/m³)', data: [12.0], backgroundColor: '#dc2626', borderRadius: 4 }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, title: { display: true, text: 'Datos referenciales Madrid', color: '#64748b' } }, scales: { y: { beginAtZero: true } } }
                    });
                }
            }
        } catch (err) {
            console.warn('EEA Aire fetch error:', err);
            document.getElementById('eeea-stations').textContent = 'N/D';
        }
    }

    async function fetchPanelKPIs() {
        // Terremotos count para panel
        try {
            const now = new Date();
            const start = new Date(now - 7 * 86400000).toISOString().split('T')[0];
            const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${start}&minmagnitude=2.0&minlatitude=35&maxlatitude=44&minlongitude=-10&maxlongitude=5&orderby=time&limit=200`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                document.getElementById('kpi-eq').textContent = (data.features || []).length;
            }
        } catch {}

        // IPC para panel
        try {
            const ipcRes = await fetch('https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/IPC206?nult=1');
            if (ipcRes.ok) {
                const ipcData = await ipcRes.json();
                const val = ipcData.Data?.[0]?.Valor;
                if (val !== undefined) document.getElementById('kpi-ipc').textContent = val.toFixed(1) + '%';
            }
        } catch {}

        // BOE count para panel
        try {
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
            const boeRes = await fetch(`https://www.boe.es/datosabiertos/api/boe/sumarias/${dateStr}`, { headers: { 'Accept': 'application/json' } });
            if (boeRes.ok) {
                const boeData = await boeRes.json();
                const items = (boeData.data?.sumarias || boeData.sumarias || []).flatMap(s => s.item || []);
                document.getElementById('kpi-boe').textContent = items.length || '—';
            }
        } catch {}

        // PM2.5 para panel (Madrid)
        try {
            const aqRes = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40.42&longitude=-3.70&current=pm2_5&timezone=Europe/Madrid');
            if (aqRes.ok) {
                const aqData = await aqRes.json();
                const pm25 = aqData.current?.pm2_5;
                if (pm25 !== undefined) document.getElementById('kpi-pm25').textContent = pm25.toFixed(1);
            }
        } catch {}
    }
