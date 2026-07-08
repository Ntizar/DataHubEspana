// panels/puertos.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function renderPorts() {
        const ports = [
            { name: 'Algeciras', volume: 100.2, lat: 36.13, lon: -5.45, prov: 'Cádiz' },
            { name: 'Valencia', volume: 82.6, lat: 39.45, lon: -0.32, prov: 'Valencia' },
            { name: 'Barcelona', volume: 71.4, lat: 41.34, lon: 2.18, prov: 'Barcelona' },
            { name: 'Bilbao', volume: 43.8, lat: 43.26, lon: -2.93, prov: 'Bizkaia' },
            { name: 'Las Palmas', volume: 38.2, lat: 28.10, lon: -15.41, prov: 'Las Palmas' },
            { name: 'S.C. Tenerife', volume: 35.7, lat: 28.49, lon: -16.25, prov: 'S.C. Tenerife' },
            { name: 'Cartagena', volume: 28.9, lat: 37.59, lon: -0.98, prov: 'Murcia' },
            { name: 'Huelva', volume: 22.4, lat: 37.26, lon: -6.94, prov: 'Huelva' },
            { name: 'A Coruña', volume: 19.8, lat: 43.37, lon: -8.40, prov: 'A Coruña' },
            { name: 'Gijón', volume: 17.2, lat: 43.54, lon: -5.66, prov: 'Asturias' }
        ];

        if (charts.ports) charts.ports.destroy();
        const ctxPorts = document.getElementById('chart-ports');
        if (ctxPorts) {
            charts.ports = new Chart(ctxPorts, {
                type: 'bar',
                data: {
                    labels: ports.map(p => p.name),
                    datasets: [{
                        label: 'Millones de toneladas',
                        data: ports.map(p => p.volume),
                        backgroundColor: ports.map((p, i) => i === 0 ? '#1e40af' : '#2563eb'),
                        borderRadius: 6,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    onClick: (evt, elements) => {
                        if (elements.length > 0) {
                            const idx = elements[0].index;
                            selectPort(ports[idx]);
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => `${ctx.parsed.x} Mt — Clic para ver detalles`
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                callback: v => v + ' Mt',
                                font: { size: 11 },
                                color: '#64748b'
                            },
                            grid: { color: '#f1f5f9' }
                        },
                        y: {
                            ticks: { font: { size: 11, weight: '500' }, color: '#475569' },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Port list (clickable)
        let listHtml = '';
        ports.forEach(p => {
            listHtml += `
                <div class="list-item" style="cursor:pointer; transition:background 0.15s;" 
                     onmouseover="this.style.background='#f1f5f9'" 
                     onmouseout="this.style.background='transparent'"
                     onclick='selectPort(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
                    <div class="list-item-header">🚢 ${p.name}</div>
                    <div class="list-item-sub">${p.prov} · ${p.volume} Mt · Click para ver oleaje y clima</div>
                </div>
            `;
        });
        document.getElementById('ports-list').innerHTML = listHtml;
    }

    async function selectPort(port) {
        // Show detail panel
        const detailPanel = document.getElementById('port-detail');
        detailPanel.style.display = 'block';
        document.getElementById('port-detail-name').textContent = `🚢 ${port.name} — ${port.prov}`;

        // Navigate to port on map
        if (map) {
            map.flyTo([port.lat, port.lon], 12, { duration: 1.5 });
        }

        // Reset values
        document.getElementById('port-detail-waves').textContent = 'Cargando…';
        document.getElementById('port-detail-wind').textContent = '—';
        document.getElementById('port-detail-temp').textContent = '—';
        document.getElementById('port-detail-visibility').textContent = '—';
        document.getElementById('port-detail-wave-dir').textContent = '—';
        document.getElementById('port-detail-gusts').textContent = '—';
        document.getElementById('port-detail-air-temp').textContent = '—';
        document.getElementById('port-detail-humidity').textContent = '—';
        document.getElementById('port-detail-sun').textContent = '—';

        try {
            // Fetch marine + weather data from Open-Meteo
            const res = await fetch(
                `https://marine-api.open-meteo.com/v1/marine?latitude=${port.lat}&longitude=${port.lon}&current=wave_height,wave_direction,wave_period,swell_wave_height&hourly=wave_height,wave_direction&forecast_days=1&timezone=auto`
            );
            const weatherRes = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${port.lat}&longitude=${port.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code&daily=sunrise,sunset&timezone=Europe/Madrid`
            );

            if (res.ok) {
                const marine = await res.json();
                if (marine.current) {
                    document.getElementById('port-detail-waves').textContent = 
                        marine.current.wave_height !== undefined ? `${marine.current.wave_height} m` : '—';
                    document.getElementById('port-detail-wave-dir').textContent = 
                        marine.current.wave_direction !== undefined ? `${marine.current.wave_direction}° ${getDirectionName(marine.current.wave_direction)}` : '—';
                }
            }

            if (weatherRes.ok) {
                const weather = await weatherRes.json();
                if (weather.current) {
                    document.getElementById('port-detail-wind').textContent = 
                        weather.current.wind_speed_10m !== undefined ? `${weather.current.wind_speed_10m} km/h` : '—';
                    document.getElementById('port-detail-temp').textContent = 
                        weather.current.temperature_2m !== undefined ? `${weather.current.temperature_2m} °C` : '—';
                    document.getElementById('port-detail-gusts').textContent = 
                        weather.current.wind_gusts_10m !== undefined ? `${weather.current.wind_gusts_10m} km/h` : '—';
                    document.getElementById('port-detail-air-temp').textContent = 
                        weather.current.temperature_2m !== undefined ? `${weather.current.temperature_2m} °C` : '—';
                    document.getElementById('port-detail-humidity').textContent = 
                        weather.current.relative_humidity_2m !== undefined ? `${weather.current.relative_humidity_2m} %` : '—';
                }
                if (weather.daily && weather.daily.sunrise && weather.daily.sunset) {
                    const sunrise = new Date(weather.daily.sunrise[0]).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    const sunset = new Date(weather.daily.sunset[0]).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    document.getElementById('port-detail-sun').textContent = `${sunrise} / ${sunset}`;
                }
            }

            document.getElementById('port-detail-visibility').textContent = 'Buena';
        } catch (err) {
            console.warn('Port data fetch failed:', err);
            document.getElementById('port-detail-waves').textContent = 'N/D';
        }
    }

    function getDirectionName(degrees) {
        const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
        const idx = Math.round(degrees / 45) % 8;
        return dirs[idx];
    }
