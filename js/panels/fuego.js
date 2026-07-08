// panels/fuego.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function calcFireRisk(temp, humidity, wind, cape) {
        // Fórmula: fireRisk = CAPE × windSpeed / (humidity + 1)
        // Normalizado a 0-1: max CAPE~2000 J/kg, max wind~100 km/h, humidity 0-100
        const raw = cape * wind / (humidity + 1);
        // Normalización: max raw ≈ 2000*100/1 = 200000 → divide por 200000
        return Math.min(raw / 200000, 1);
    }

    function getRiskLevel(risk) {
        if (risk >= 0.8) return { label: 'Muy alto', color: '#dc2626', emoji: '🚨', bg: '#fef2f2', border: '#dc2626', badge: 'badge-red' };
        if (risk >= 0.5) return { label: 'Alto', color: '#ea580c', emoji: '🔥', bg: '#fff7ed', border: '#ea580c', badge: 'badge-orange' };
        if (risk >= 0.2) return { label: 'Moderado', color: '#ca8a04', emoji: '⚠️', bg: '#fefce8', border: '#ca8a04', badge: 'badge-orange' };
        return { label: 'Bajo', color: '#16a34a', emoji: '✅', bg: '#f0fdf4', border: '#16a34a', badge: 'badge-green' };
    }

    function getRiskColor(risk) {
        if (risk >= 0.8) return '#dc2626';
        if (risk >= 0.5) return '#ea580c';
        if (risk >= 0.2) return '#ca8a04';
        return '#16a34a';
    }

    (function initFuegoSelector() {
        const sel = document.getElementById('fuego-province-select');
        if (sel) {
            FUEGO_PROVINCIAS.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.cc;
                opt.textContent = p.name;
                sel.appendChild(opt);
            });
            sel.addEventListener('change', function() {
                const val = this.value;
                if (val === 'all') {
                    fetchFuego();
                } else {
                    const prov = FUEGO_PROVINCIAS.find(p => p.cc === val);
                    if (!prov) return;
                    // Fetch single province data
                    (async () => {
                        try {
                            const url = `https://api.open-meteo.com/v1/forecast?latitude=${prov.lat}&longitude=${prov.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,cape&timezone=Europe/Madrid`;
                            const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
                            const data = await resp.json();
                            if (!data.current) return;
                            const current = data.current;
                            const temp = current.temperature_2m != null ? current.temperature_2m : 15;
                            const humidity = current.relative_humidity_2m != null ? current.relative_humidity_2m : 60;
                            const wind = current.wind_speed_10m != null ? current.wind_speed_10m : 5;
                            const cape = current.cape != null && current.cape >= 0 ? current.cape : 0;
                            const risk = calcFireRisk(temp, humidity, wind, cape);
                            const riskIndex = Math.round(risk * 100);
                            const level = getRiskLevel(risk);

                            const fuegoIndice = document.getElementById('fuego-indice');
                            const fuegoTemp = document.getElementById('fuego-temp');
                            const fuegoHumedad = document.getElementById('fuego-humedad');
                            const fuegoViento = document.getElementById('fuego-viento');
                            const fuegoCape = document.getElementById('fuego-cape');
                            const fuegoNivel = document.getElementById('fuego-nivel');
                            const fuegoIndiceKpi = document.getElementById('fuego-indice-kpi');
                            const fuegoNivelKpi = document.getElementById('fuego-nivel-kpi');

                            if (fuegoIndice) fuegoIndice.textContent = `${riskIndex}/100`;
                            if (fuegoTemp) fuegoTemp.textContent = `${temp} °C`;
                            if (fuegoHumedad) fuegoHumedad.textContent = `${humidity}%`;
                            if (fuegoViento) fuegoViento.textContent = `${wind} km/h`;
                            if (fuegoCape) fuegoCape.textContent = `${cape} J/kg`;
                            if (fuegoNivel) fuegoNivel.textContent = `${level.emoji} ${level.label}`;
                            if (fuegoIndiceKpi) {
                                fuegoIndiceKpi.style.background = `linear-gradient(135deg, ${level.bg} 0%, #ffffff 100%)`;
                                fuegoIndiceKpi.style.color = level.color;
                            }
                            if (fuegoNivelKpi) {
                                fuegoNivelKpi.style.background = `linear-gradient(135deg, ${level.bg} 0%, #ffffff 100%)`;
                                fuegoNivelKpi.style.color = level.color;
                            }

                            // Chart: single province bar
                            const ctxFuego = document.getElementById('chart-fuego')?.getContext('2d');
                            if (ctxFuego) {
                                if (charts._chartFuego) { charts._chartFuego.destroy(); charts._chartFuego = null; }
                                charts._chartFuego = new Chart(ctxFuego, {
                                    type: 'bar',
                                    data: {
                                        labels: [prov.name],
                                        datasets: [{
                                            label: 'Índice riesgo fuego (0-100)',
                                            data: [riskIndex],
                                            backgroundColor: level.color,
                                            borderColor: level.color + 'cc',
                                            borderWidth: 1,
                                            borderRadius: 4,
                                        }],
                                    },
                                    options: {
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false }, tooltip: { callbacks: { label: () => `${prov.name}: ${riskIndex}/100 - ${level.emoji} ${level.label}` } } },
                                        scales: {
                                            x: { beginAtZero: true, max: 100, title: { display: true, text: 'Índice de riesgo (0-100)' } },
                                            y: { grid: { display: false } },
                                        },
                                    },
                                });
                            }

                            // Detail
                            const zonasEl = document.getElementById('fuego-zonas-list');
                            if (zonasEl) {
                                zonasEl.innerHTML = `<div class="list-item" style="border-left:4px solid ${level.color};background:${level.bg};padding:12px;">
                                    <div class="list-item-header" style="font-size:15px;">${prov.name} <span class="badge ${level.badge}">${level.emoji} ${level.label}</span></div>
                                    <div class="list-item-sub">
                                        Índice riesgo: <strong style="color:${level.color};font-size:18px;">${riskIndex}/100</strong>
                                        <br>🌡️ Temp: <strong>${temp} °C</strong> · 💧 Humedad: <strong>${humidity}%</strong> · 💨 Viento: <strong>${wind} km/h</strong> · ⚡ CAPE: <strong>${cape} J/kg</strong>
                                        <br><span style="color:#64748b;">📍 ${prov.cc}</span>
                                    </div>
                                </div>`;
                            }
                        } catch(e) { console.warn('Error fetching provincia:', prov.name, e); }
                    })();
                }
            });
        }
    })();
