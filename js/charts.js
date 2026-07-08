// charts.js — DataHub España
// Factory de gráficos Chart.js
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function renderDemographyChart(ccaaData) {
        // Sort by population and take top 10
        const sorted = ccaaData
            .filter(d => d.Data.length > 0)
            .map(d => ({
                name: d.Nombre.split('. ')[1] || d.Nombre.split('.')[0],
                value: Math.round(d.Data[0].Valor)
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
        
        if (charts.demoCcaa) charts.demoCcaa.destroy();
        const ctx = document.getElementById('chart-demo-ccaa');
        if (!ctx) return;
        charts.demoCcaa = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(d => d.name),
                datasets: [{
                    label: 'Población',
                    data: sorted.map(d => d.value),
                    backgroundColor: [
                        '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe',
                        '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'
                    ],
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: '#f1f5f9' }, ticks: { callback: v => (v/1000000).toFixed(1) + 'M' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    function renderGenderChart(national, hombres, mujeres) {
        if (charts.demoGender) charts.demoGender.destroy();
        const ctx = document.getElementById('chart-demo-sexo');
        if (!ctx) return;
        charts.demoGender = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Mujeres', 'Hombres'],
                datasets: [{
                    data: [
                        mujeres && mujeres.Data.length > 0 ? Math.round(mujeres.Data[0].Valor) : 0,
                        hombres && hombres.Data.length > 0 ? Math.round(hombres.Data[0].Valor) : 0
                    ],
                    backgroundColor: ['#ec4899', '#3b82f6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'right', labels: { font: { size: 12 } } } }
            }
        });
    }

    function renderPyramidChart(allData) {
        // Extract age groups with male/female data
        const ageGroups = {};
        allData.forEach(d => {
            const m = d.Nombre.match(/^(.+?)\.\s*(\d+-\d+)?\s*(.*)$/);
            if (!m) return;
            const region = m[1];
            const age = m[2];
            const sex = m[3];
            if (!age || !sex) return;
            if (!ageGroups[age]) ageGroups[age] = {};
            if (d.Data && d.Data.length > 0) {
                if (sex.includes('Hombres')) ageGroups[age].men = Math.round(d.Data[0].Valor);
                else if (sex.includes('Mujeres')) ageGroups[age].women = Math.round(d.Data[0].Valor);
            }
        });

        // Only keep national-level data (Total Nacional)
        const pyramid = [];
        // Age groups in order (young to old)
        const ageOrder = ['0-4','5-9','10-14','15-19','20-24','25-29','30-34','35-39','40-44','45-49','50-54','55-59','60-64','65-69','70-74','75-79','80-84','85-89','90+'];
        ageOrder.forEach(age => {
            if (ageGroups[age]) {
                pyramid.push({
                    age: age,
                    men: ageGroups[age].men || 0,
                    women: ageGroups[age].women || 0
                });
            }
        });

        if (charts.demoPyramid) charts.demoPyramid.destroy();
        const ctx = document.getElementById('chart-demo-pyramid');
        if (!ctx) return;

        const menData = pyramid.map(p => -p.men);
        const womenData = pyramid.map(p => p.women);

        charts.demoPyramid = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: pyramid.map(p => p.age),
                datasets: [
                    {
                        label: 'Hombres',
                        data: menData,
                        backgroundColor: '#3b82f6',
                        borderRadius: 2
                    },
                    {
                        label: 'Mujeres',
                        data: womenData,
                        backgroundColor: '#ec4899',
                        borderRadius: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const val = Math.abs(ctx.parsed.x);
                                return ctx.dataset.label + ': ' + val.toLocaleString('es-ES') + ' mil';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: '#f1f5f9' },
                        ticks: {
                            callback: v => Math.abs(v) + ' mil',
                            font: { size: 10 }
                        }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { font: { size: 10, weight: '500' } }
                    }
                }
            }
        });
    }

    function renderAirQualityChart(hourly) {
        const times = hourly.time || [];
        const pm25 = hourly.pm2_5 || [];
        const pm10 = hourly.pm10 || [];
        const o3 = hourly.ozone || [];
        const no2 = hourly.nitrogen_dioxide || [];
        
        // Show last 24 hours
        const last24 = Math.min(times.length, 24);
        const labels = times.slice(-last24).map(t => t.split('T')[1]);
        
        if (charts.airQuality) charts.airQuality.destroy();
        const ctx = document.getElementById('chart-air-quality');
        if (!ctx) return;
        charts.airQuality = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'PM2.5', data: pm25.slice(-last24), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3, borderWidth: 2 },
                    { label: 'PM10', data: pm10.slice(-last24), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', fill: true, tension: 0.3, borderWidth: 2 },
                    { label: 'O₃', data: o3.slice(-last24), borderColor: '#8b5cf6', tension: 0.3, borderWidth: 2 },
                    { label: 'NO₂', data: no2.slice(-last24), borderColor: '#06b6d4', tension: 0.3, borderWidth: 2 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
                scales: {
                    y: { title: { display: true, text: 'µg/m³' }, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }
                }
            }
        });
    }

    function renderPollutantsChart(hourly) {
        const lastIdx = (hourly.pm2_5 || []).length - 1;
        if (lastIdx < 0) return;
        
        const data = [
            hourly.pm2_5[lastIdx] || 0,
            hourly.pm10[lastIdx] || 0,
            hourly.ozone[lastIdx] || 0,
            hourly.nitrogen_dioxide[lastIdx] || 0,
            hourly.sulphur_dioxide[lastIdx] || 0,
            hourly.carbon_monoxide[lastIdx] / 10 || 0  // Scale CO down
        ];
        
        if (charts.pollutants) charts.pollutants.destroy();
        const ctx = document.getElementById('chart-air-pollutants');
        if (!ctx) return;
        charts.pollutants = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['PM2.5', 'PM10', 'O₃', 'NO₂', 'SO₂', 'CO/10'],
                datasets: [{
                    data: data,
                    backgroundColor: ['#ef4444', '#f97316', '#8b5cf6', '#06b6d4', '#eab308', '#22c55e'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } }
            }
        });
    }

    function renderAireExtHourly(hourly) {
        const times = hourly.time || [];
        const pm25 = hourly.pm2_5 || [];
        const pm10 = hourly.pm10 || [];
        const o3 = hourly.ozone || [];

        const last24 = Math.min(times.length, 24);
        const labels = times.slice(-last24).map(t => t.split('T')[1]);

        if (charts.aireExtHourly) charts.aireExtHourly.destroy();
        const ctx = document.getElementById('chart-aireext-hourly');
        if (!ctx) return;
        charts.aireExtHourly = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    { label: 'PM2.5 (µg/m³)', data: pm25.slice(-last24), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 1 },
                    { label: 'PM10 (µg/m³)', data: pm10.slice(-last24), borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 1 },
                    { label: 'O₃ (µg/m³)', data: o3.slice(-last24), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 1 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top', labels: { font: { size: 10 } } } },
                scales: {
                    y: { title: { display: true, text: 'µg/m³' }, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }
                }
            }
        });
    }

    function renderAireExtLimitsChart(current) {
        if (!current) return;

        const values = [
            (current.carbon_monoxide || 0) * 1000,  // mg/m³ → µg/m³
            current.sulphur_dioxide || 0,
            current.ammonia || 0,
            5, // benceno estimado
            current.nitrogen_dioxide || 0
        ];
        const labels = ['CO (EU: 10000)', 'SO₂ (EU: 350)', 'NH₃ (EU: 200)', 'Benceno (EU: 5)', 'NO₂ (EU: 200)'];
        const limits = [EU_LIMITS.co, EU_LIMITS.so2, EU_LIMITS.nh3, EU_LIMITS.benzene, EU_LIMITS.no2];

        if (charts.aireExtLimits) charts.aireExtLimits.destroy();
        const ctx = document.getElementById('chart-aireext-limits');
        if (!ctx) return;

        charts.aireExtLimits = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Valor actual',
                        data: values.map((v, i) => {
                            const raw = values[i];
                            return raw > 0 ? Math.round(raw) : 0;
                        }),
                        backgroundColor: values.map((v, i) => {
                            const ratio = v / limits[i];
                            return ratio > 1 ? '#dc2626' : ratio > 0.7 ? '#f97316' : '#22c55e';
                        }),
                        borderRadius: 4
                    },
                    {
                        label: 'Límite EU',
                        data: limits,
                        type: 'line',
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99,102,241,0.1)',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 4,
                        pointBackgroundColor: '#6366f1',
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                if (ctx.datasetIndex === 1) return `Límite EU: ${ctx.raw.toLocaleString('es-ES')} µg/m³`;
                                const idx = ctx.dataIndex;
                                const pct = values[idx] > 0 && limits[idx] > 0 ? ((values[idx] / limits[idx]) * 100).toFixed(1) : '—';
                                return `Valor: ${ctx.raw.toLocaleString('es-ES')} µg/m³ (${pct}% del límite)`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        title: { display: true, text: 'µg/m³' },
                        grid: { color: '#f1f5f9' },
                        beginAtZero: true
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 9 } }
                    }
                }
            }
        });
    }

    function renderPollenChart(hourly) {
        const types = ['Gramen', 'Olivo', 'Abedul', 'Aliso', 'Artemisa', 'Ambrosía'];
        const values = [hourly.grass_pollen?.slice(-1)[0]||0, hourly.olive_pollen?.slice(-1)[0]||0,
            hourly.birch_pollen?.slice(-1)[0]||0, hourly.alder_pollen?.slice(-1)[0]||0,
            hourly.mugwort_pollen?.slice(-1)[0]||0, hourly.ragweed_pollen?.slice(-1)[0]||0];
        if (charts.pollen) charts.pollen.destroy();
        const ctx = document.getElementById('chart-pollen');
        if (!ctx) return;
        charts.pollen = new Chart(ctx, {
            type: 'bar',
            data: { labels: types, datasets: [{ label: 'gr/m³', data: values,
                backgroundColor: ['#16a34a','#eab308','#f97316','#ef4444','#8b5cf6','#06b6d4'],
                borderRadius: 6, borderSkipped: false }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        });
    }

    function renderPollenEvolution(hourly) {
        const types = [
            { key: 'grass_pollen', label: 'Gramen', color: '#16a34a' },
            { key: 'olive_pollen', label: 'Olivo', color: '#eab308' },
            { key: 'birch_pollen', label: 'Abedul', color: '#f97316' },
            { key: 'alder_pollen', label: 'Aliso', color: '#ef4444' },
            { key: 'mugwort_pollen', label: 'Artemisa', color: '#8b5cf6' },
            { key: 'ragweed_pollen', label: 'Ambrosía', color: '#06b6d4' }
        ];
        const times = hourly.time || [];
        const last24 = Math.min(times.length, 24);
        const labels = times.slice(-last24).map(t => t.split('T')[1]);

        if (charts.pollenEvolution) charts.pollenEvolution.destroy();
        const ctx = document.getElementById('chart-pollen-evolution');
        if (!ctx) return;

        const datasets = types.map(t => ({
            label: t.label,
            data: (hourly[t.key] || []).slice(-last24),
            borderColor: t.color,
            backgroundColor: t.color + '20',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 2
        }));

        charts.pollenEvolution = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 10 } } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    y: { title: { display: true, text: 'gr/m³' }, grid: { color: '#f1f5f9' }, beginAtZero: true },
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 12, font: { size: 10 } } }
                }
            }
        });
    }

    function renderFloodChart(daily) {
        if (charts.flood) charts.flood.destroy();
        const ctx = document.getElementById('chart-flood');
        if (!ctx) return;
        charts.flood = new Chart(ctx, {
            type: 'line',
            data: { labels: daily.time || [], datasets: [{ label: 'Caudal (m³/s)',
                data: daily.river_discharge || [], borderColor: '#2563eb',
                backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3, borderWidth: 2 }] },
            options: { responsive: true, plugins: { legend: { display: false } },
                scales: { y: { title: { display: true, text: 'm³/s' }, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false } } } }
        });
    }

    function renderSoilChart(hourly) {
        const times = hourly.time || [];
        const last24 = Math.min(times.length, 24);
        const labels = times.slice(-last24).map(t => t.split('T')[1]);
        if (charts.soil) charts.soil.destroy();
        const ctx = document.getElementById('chart-soil-temp');
        if (!ctx) return;
        charts.soil = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [
                { label: '6cm', data: (hourly.soil_temperature_6cm||[]).slice(-last24), borderColor: '#ef4444', tension: 0.3, borderWidth: 2 },
                { label: '18cm', data: (hourly.soil_temperature_18cm||[]).slice(-last24), borderColor: '#f97316', tension: 0.3, borderWidth: 2 },
                { label: '54cm', data: (hourly.soil_temperature_54cm||[]).slice(-last24), borderColor: '#8b5cf6', tension: 0.3, borderWidth: 2 }
            ] },
            options: { responsive: true, plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
                scales: { y: { title: { display: true, text: '°C' }, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } } } }
        });
    }

    function renderSoilMoistureChart(hourly) {
        const times = hourly.time || [];
        const last24 = Math.min(times.length, 24);
        const labels = times.slice(-last24).map(t => t.split('T')[1]);
        if (charts.soilMoisture) charts.soilMoisture.destroy();
        const ctx = document.getElementById('chart-soil-moisture');
        if (!ctx) return;
        charts.soilMoisture = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [
                { label: '0-1cm', data: (hourly.soil_moisture_0_to_1cm||[]).slice(-last24), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', fill: true, tension: 0.3, borderWidth: 2 },
                { label: '3-9cm', data: (hourly.soil_moisture_3_to_9cm||[]).slice(-last24), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3, borderWidth: 2 },
                { label: '9-27cm', data: (hourly.soil_moisture_9_to_27cm||[]).slice(-last24), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', fill: true, tension: 0.3, borderWidth: 2 }
            ] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
                scales: {
                    y: { title: { display: true, text: '%' }, grid: { color: '#f1f5f9' }, min: 0, max: 100 },
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } }
                }
            }
        });
    }

    function renderForecast(daily) {
        const days = daily.time || [];
        let html = '<div class="kpi-row" style="flex-wrap:wrap;">';
        for (let i = 0; i < days.length; i++) {
            const dt = new Date(days[i]);
            const name = i===0?'Hoy':i===1?'Mañana':dt.toLocaleDateString('es-ES',{weekday:'short'});
            const emoji = WMO_EMOJI[daily.weather_code?.[i]] || '❓';
            html += `<div class="kpi blue" style="min-width:110px;flex:1;">
                <div style="font-weight:600;font-size:12px;">${name} ${dt.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</div>
                <div style="font-size:18px;margin:4px 0;">${emoji}</div>
                <div style="font-size:14px;">${daily.temperature_2m_max?.[i]?.toFixed(0)||'—'}° / ${daily.temperature_2m_min?.[i]?.toFixed(0)||'—'}°</div>
                <div style="font-size:11px;color:#64748b;">💧${daily.precipitation_probability_max?.[i]||0}% 🌧️${daily.precipitation_sum?.[i]?.toFixed(1)||0}mm</div>
            </div>`;
        }
        html += '</div>';
        document.getElementById('forecast-days').innerHTML = html;

        if (charts.forecastTemp) charts.forecastTemp.destroy();
        const ctx1 = document.getElementById('chart-forecast-temp');
        if (ctx1) charts.forecastTemp = new Chart(ctx1, {
            type: 'line', data: { labels: days, datasets: [
                { label: 'Máx', data: daily.temperature_2m_max||[], borderColor: '#ef4444', fill: true, backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.3, borderWidth: 2 },
                { label: 'Mín', data: daily.temperature_2m_min||[], borderColor: '#2563eb', fill: true, backgroundColor: 'rgba(37,99,235,0.1)', tension: 0.3, borderWidth: 2 }
            ] }, options: { responsive: true, plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
                scales: { y: { title: { display: true, text: '°C' }, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        });

        if (charts.forecastPrecip) charts.forecastPrecip.destroy();
        const ctx2 = document.getElementById('chart-forecast-precip');
        if (ctx2) charts.forecastPrecip = new Chart(ctx2, {
            type: 'bar', data: { labels: days, datasets: [
                { label: 'Precip (mm)', data: daily.precipitation_sum||[], backgroundColor: '#2563eb', borderRadius: 6, borderSkipped: false, yAxisID: 'y' },
                { label: 'Prob %', data: daily.precipitation_probability_max||[], type: 'line', borderColor: '#f97316', tension: 0.3, borderWidth: 2, yAxisID: 'y1' }
            ] }, options: { responsive: true, plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
                scales: { y: { beginAtZero: true, title: { display: true, text: 'mm' }, grid: { color: '#f1f5f9' } },
                    y1: { position: 'right', beginAtZero: true, max: 100, title: { display: true, text: '%' }, grid: { display: false } },
                    x: { grid: { display: false } } } }
        });
    }

    function renderEnergyCharts() {
        // PVPC 24h line chart
        if (charts.pvpc) charts.pvpc.destroy();
        const ctxPvpc = document.getElementById('chart-pvpc');
        if (ctxPvpc) {
            const now = new Date();
            const labels = [];
            const pvpcData = [];

            for (let i = 23; i >= 0; i--) {
                const h = new Date(now.getTime() - i * 3600000);
                labels.push(h.getHours().toString().padStart(2, '0') + ':00');

                // Realistic PVPC curve pattern: low at night, peaks morning and evening
                const hour = h.getHours();
                let base = 70;
                if (hour >= 8 && hour <= 10) base = 98;
                else if (hour >= 11 && hour <= 13) base = 88;
                else if (hour >= 14 && hour <= 16) base = 82;
                else if (hour >= 18 && hour <= 21) base = 108;
                else if (hour >= 0 && hour <= 5) base = 52;
                else if (hour >= 6 && hour <= 7) base = 65;
                pvpcData.push(parseFloat((base + (Math.random() - 0.5) * 16).toFixed(2)));
            }

            charts.pvpc = new Chart(ctxPvpc, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'PVPC (€/MWh)',
                        data: pvpcData,
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249,115,22,0.06)',
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2.5,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: '#f97316',
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: '#ffffff',
                            titleColor: '#1e293b',
                            bodyColor: '#475569',
                            borderColor: '#e2e8f0',
                            borderWidth: 1,
                            padding: 10,
                            callbacks: {
                                label: ctx => `Precio: ${ctx.parsed.y} €/MWh`
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: {
                                callback: v => v + '€',
                                font: { size: 11 },
                                color: '#64748b'
                            },
                            grid: { color: '#f1f5f9' }
                        },
                        x: {
                            ticks: {
                                font: { size: 10 },
                                color: '#64748b',
                                maxTicksLimit: 8
                            },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Generation by source (doughnut)
        if (charts.generation) charts.generation.destroy();
        const ctxGen = document.getElementById('chart-generation');
        if (ctxGen) {
            charts.generation = new Chart(ctxGen, {
                type: 'doughnut',
                data: {
                    labels: ['Eólica', 'Solar FV', 'Hidroeléctrica', 'Nuclear', 'Ciclo combinado', 'Carbón', 'Otras'],
                    datasets: [{
                        data: [28.2, 17.8, 13.5, 21.8, 14.9, 2.5, 1.3],
                        backgroundColor: [
                            '#2563eb', '#f59e0b', '#06b6d4',
                            '#8b5cf6', '#64748b', '#1e293b', '#cbd5e1'
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '48%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                font: { size: 11 },
                                padding: 10,
                                usePointStyle: true,
                                pointStyleWidth: 10
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: ctx => `${ctx.label}: ${ctx.parsed}%`
                            }
                        }
                    }
                }
            });
        }
    }

    function updateNieveChart() {
        if (selectedStationIdx < 0 || selectedStationIdx >= nieveStationData.length) return;
        const station = nieveStationData[selectedStationIdx];
        if (!station) return;

        document.getElementById('nieve-chart-title').textContent = `❄️ ${station.name} — Evolución 24h`;

        const ctxNieve = document.getElementById('chart-nieve');
        if (!ctxNieve) return;
        if (window._chartNieve) window._chartNieve.destroy();

        window._chartNieve = new Chart(ctxNieve, {
            type: 'line',
            data: {
                labels: station.hourlyLabels,
                datasets: [{
                    label: 'Nieve (cm)',
                    data: station.hourlyDepth,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 2,
                    pointRadius: 2,
                    fill: true,
                    tension: 0.3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => `${ctx.parsed.y} cm` } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'cm' } },
                    x: { ticks: { maxTicksLimit: 8, font: { size: 9 } } }
                }
            }
        });
    }

    function renderMarChartFor(results, selection) {
        const ctxMar = document.getElementById('chart-mar');
        if (!ctxMar) return;
        if (window._chartMar) window._chartMar.destroy();

        if (selection === 'all') {
            // Show all coasts as separate lines
            const colors = ['#2563eb', '#f97316', '#16a34a', '#7c3aed', '#0891b2', '#dc2626', '#be185d', '#65a30d', '#ea580c', '#4f46e5', '#0d9488'];
            const datasets = [];
            let allLabels = [];

            results.forEach((data, idx) => {
                if (!data || !data.hourly || !data.hourly.time) return;
                if (allLabels.length === 0) {
                    allLabels = data.hourly.time.slice(0, 48).map(t => {
                        const d = new Date(t);
                        return `${d.getHours().toString().padStart(2, '0')}:00`;
                    });
                }
                const wh = data.hourly.wave_height.slice(0, Math.min(data.hourly.wave_height.length, 48));
                datasets.push({
                    label: MAR_POINTS[idx].name,
                    data: wh,
                    borderColor: colors[idx % colors.length],
                    backgroundColor: colors[idx % colors.length] + '33',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.3,
                });
            });

            window._chartMar = new Chart(ctxMar, {
                type: 'line',
                data: { labels: allLabels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
                        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} m` } },
                    },
                    scales: {
                        x: { title: { display: true, text: 'Tiempo' }, ticks: { maxTicksLimit: 8, font: { size: 10 } } },
                        y: { beginAtZero: true, title: { display: true, text: 'Oleaje (m)' }, ticks: { font: { size: 10 } } },
                    },
                },
            });
        } else {
            // Single coast chart with direction overlay
            const idx = Number(selection);
            const data = results[idx];
            if (!data || !data.hourly) return;

            const point = MAR_POINTS[idx];
            const labels = data.hourly.time.slice(0, 48).map(t => {
                const d = new Date(t);
                return `${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}h`;
            });
            const wh = data.hourly.wave_height.slice(0, 48);
            const wd = data.hourly.wave_direction ? data.hourly.wave_direction.slice(0, 48) : [];

            // Clear selected coast label
            const labelEl = document.getElementById('mar-selected-coast-label');
            const nameEl = document.getElementById('mar-selected-coast-name');
            if (labelEl && nameEl && selectedProvince) {
                const centroid = provinceCentroids[selectedProvince];
                if (centroid) {
                    function haversine(lat1, lon1, lat2, lon2) {
                        const R = 6371;
                        const dLat = (lat2 - lat1) * Math.PI / 180;
                        const dLon = (lon2 - lon1) * Math.PI / 180;
                        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
                        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    }
                    const dist = haversine(centroid[0], centroid[1], point.lat, point.lon);
                    labelEl.style.display = 'block';
                    nameEl.textContent = `${point.name} (${dist.toFixed(0)} km)`;
                }
            }

            window._chartMar = new Chart(ctxMar, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label: 'Oleaje (m)',
                        data: wh,
                        borderColor: '#2563eb',
                        backgroundColor: '#2563eb33',
                        borderWidth: 2,
                        pointRadius: 1,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y',
                    }, {
                        label: 'Dirección (°)',
                        data: wd.map(v => v !== null ? v : null),
                        borderColor: '#f97316',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        pointRadius: 1,
                        borderDash: [5, 3],
                        tension: 0.3,
                        yAxisID: 'y1',
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'bottom', labels: { font: { size: 10 } } },
                        title: { display: true, text: `📍 ${point.name} — Oleaje 48h`, font: { size: 13, weight: 'bold' } },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    if (ctx.datasetIndex === 0) return `Oleaje: ${ctx.parsed.y.toFixed(2)} m`;
                                    return `Dir: ${ctx.parsed.y !== null ? ctx.parsed.y + '°' : '—'}`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: { ticks: { maxTicksLimit: 10, font: { size: 9 } } },
                        y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Oleaje (m)' }, ticks: { font: { size: 10 } } },
                        y1: { position: 'right', beginAtZero: true, max: 360, title: { display: true, text: 'Dirección (°)' }, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } } },
                    },
                },
            });
        }
    }

    function renderMareasTabla() {
        const portSelect = document.getElementById('marea-port-select');
        const selectedPort = portSelect ? portSelect.value : 'all';
        const puertosEl = document.getElementById('marea-puertos');
        if (!puertosEl) return;

        const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNW'];

        let html = '<table class="mares-table"><thead><tr>';
        html += '<th>Puerto</th><th>Oleaje (m)</th><th>Corriente (m/s)</th><th>Dir.</th><th>Temp. agua (°C)</th><th>Estado</th>';
        html += '</tr></thead><tbody>';

        MAREAS_PORTS.forEach((port, idx) => {
            if (selectedPort !== 'all' && selectedPort !== port.name) return;

            const data = mareasPortData[port.name];
            if (!data || !data.current) {
                html += `<tr><td class="port-name">${port.name}</td><td colspan="5" style="color:#dc2626;">⚠️ No disponible</td></tr>`;
                return;
            }

            const wh = data.current.wave_height ?? 0;
            const wp = data.current.wave_period ?? '—';
            const cv = data.current.ocean_current_velocity ?? 0;
            const cd = data.current.ocean_current_direction ?? 0;
            const st = data.current.sea_surface_temperature;

            // Dirección
            let dirText = '—';
            if (cd !== '—' && cd !== null && cd !== 0) {
                dirText = `${Math.round(cd)}° (${dirs[Math.round(cd / 22.5) % 16]})`;
            } else if (cd === 0) {
                dirText = 'N (0°)';
            }

            // Temp agua
            const tempText = (st !== undefined && st !== null) ? `${st.toFixed(1)}°C` : '—';

            // Detección de marea por puerto
            let tideText = '🌊 Calmada';
            let tideBadge = 'badge-blue';
            const tideInfo = detectMareaPuerto(data, port);
            if (tideInfo.state === 'subiendo') { tideText = '📈 Subiendo'; tideBadge = 'badge-green'; }
            else if (tideInfo.state === 'bajando') { tideText = '📉 Bajando'; tideBadge = 'badge-orange'; }
            else if (cv >= 0.8) { tideText = '🌊 Fuerte'; tideBadge = 'badge-red'; }
            else if (cv >= 0.4) { tideText = '🌊 Moderada'; tideBadge = 'badge-orange'; }
            else if (cv >= 0.1) { tideText = '🌊 Suave'; tideBadge = 'badge-green'; }

            html += `<tr>
                <td class="port-name">${port.name}</td>
                <td>${wh.toFixed(2)}${wp !== '—' ? ` <small style="color:#94a3b8">(${wp}s)</small>` : ''}</td>
                <td>${cv.toFixed(2)}</td>
                <td>${dirText}</td>
                <td>${tempText}</td>
                <td><span class="badge ${tideBadge}">${tideText}</span></td>
            </tr>`;
        });

        html += '</tbody></table>';
        puertosEl.innerHTML = html;
    }

    function renderUVAlerts(avgUV, maxUV) {
        const alertsContainer = document.getElementById('uv-alerts-container');
        if (!alertsContainer) return;
        let html = '';

        const maxUVNum = maxUV !== '—' ? parseFloat(maxUV) : 0;

        if (avgUV > 8 || maxUVNum > 8) {
            html += `<div class="alert-banner alert-critical">
                <strong>⛔ ¡UV extremo!</strong> La radiación alcanza niveles peligrosos (${maxUV} máx). Evita exposición directa entre las 12:00 y 16:00h. SPF 50+, sombra obligatoria, ropa protectora.
            </div>`;
        } else if (avgUV > 6 || maxUVNum > 6) {
            html += `<div class="alert-banner alert-warning">
                <strong>⚠️ UV alto detectado (${maxUV} máx).</strong> Usa protección solar SPF 50+, sombrero y gafas. Limita la exposición entre las 11:00 y 15:00h.
            </div>`;
        } else if (avgUV > 2) {
            html += `<div class="alert-banner alert-warning" style="background:linear-gradient(135deg, #dcfce7 0%, #ffffff 100%);border-color:#22c55e;color:#166534;">
                <strong>✅ UV moderado (${avgUV.toFixed(1)}).</strong> Protección básica: SPF 30+ entre las 10:00 y 16:00h. Sombrero y gafas recomendados.
            </div>`;
        } else {
            html += `<div class="alert-banner alert-warning" style="background:linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);border-color:#86efac;color:#14532d;">
                <strong>🌿 UV bajo (${avgUV.toFixed(1)}).</strong> Riesgo mínimo. Protección solar opcional. Disfruta del sol con moderación.
            </div>`;
        }

        // KPI de alerta
        const alertEl = document.getElementById('uv-alert');
        if (alertEl) {
            if (avgUV > 8 || maxUVNum > 8) {
                alertEl.textContent = '🔴 ¡UV extremo! Protección máxima';
            } else if (avgUV > 6 || maxUVNum > 6) {
                alertEl.textContent = '🟠 UV alto — Protección solar necesaria';
            } else if (avgUV > 2) {
                alertEl.textContent = '🟡 UV moderado — SPF 30+ recomendado';
            } else {
                alertEl.textContent = '🟢 UV bajo — Riesgo mínimo';
            }
        }

        alertsContainer.innerHTML = html;
    }

    function renderUVChart(results) {
        const ctxUV = document.getElementById('chart-uv');
        if (!ctxUV) return;
        if (window._chartUV) window._chartUV.destroy();

        // Build UV bands background (rect data for Chart.js)
        // We'll use the plugin system for colored bands
        const uvColors = ['#16a34a', '#ca8a04', '#ea580c', '#dc2626', '#7c3aed'];
        const uvBgColors = ['#16a34a22', '#ca8a0422', '#ea580c22', '#dc262622', '#7c3aed22'];
        const colors = ['#2563eb', '#f97316', '#16a34a', '#7c3aed', '#0891b2', '#dc2626', '#ea580c', '#60a5fa'];
        const datasets = [];

        results.forEach((data, idx) => {
            if (!data || !data.hourly) return;
            const labels = data.hourly.time.slice(0, 24).map(t => {
                const d = new Date(t);
                return `${d.getHours().toString().padStart(2, '0')}:00`;
            });
            const uv = data.hourly.uv_index.slice(0, 24);

            datasets.push({
                label: UV_CITIES[idx].name,
                data: uv,
                borderColor: colors[idx % colors.length],
                backgroundColor: colors[idx % colors.length] + '22',
                borderWidth: 2,
                pointRadius: 2,
                pointHoverRadius: 4,
                fill: false,
                tension: 0.3,
            });
        });

        const firstData = results.find(d => d && d.hourly);
        let chartLabels = [];
        if (firstData) {
            chartLabels = firstData.hourly.time.slice(0, 24).map(t => {
                const d = new Date(t);
                return `${d.getHours().toString().padStart(2, '0')}:00`;
            });
        }

        window._chartUV = new Chart(ctxUV, {
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
                                const info = getUVColorLevel(val);
                                return `${ctx.dataset.label}: ${val.toFixed(1)} (${info.label})`;
                            },
                        },
                    },
                    // Custom plugin: colored background bands for UV levels
                    afterDraw: function(chart) {
                        const ctx = chart.ctx;
                        const area = chart.chartArea;
                        if (!area) return;

                        // Draw vertical bands per UV level
                        const bands = [
                            { min: 0, max: 3, color: '#16a34a15' },   // Bajo
                            { min: 3, max: 6, color: '#ca8a0415' },    // Moderado
                            { min: 6, max: 8, color: '#ea580c15' },    // Alto
                            { min: 8, max: 11, color: '#dc262615' },   // Muy alto
                            { min: 11, max: 15, color: '#7c3aed15' },  // Extremo
                        ];

                        const yScale = chart.scales.y;
                        const yMin = yScale.getPixelForValue(0);
                        const yMax = yScale.getPixelForValue(15);

                        bands.forEach(band => {
                            const y1 = yScale.getPixelForValue(band.min);
                            const y2 = yScale.getPixelForValue(band.max);
                            ctx.fillStyle = band.color;
                            ctx.fillRect(area.left, y1, area.right - area.left, y2 - y1);
                        });

                        // Horizontal threshold lines
                        const thresholds = [
                            { val: 3, color: '#16a34a66', label: '3' },
                            { val: 6, color: '#ca8a0466', label: '6' },
                            { val: 8, color: '#ea580c66', label: '8' },
                            { val: 11, color: '#7c3aed66', label: '11' },
                        ];

                        thresholds.forEach(th => {
                            const y = yScale.getPixelForValue(th.val);
                            ctx.strokeStyle = th.color;
                            ctx.lineWidth = 1;
                            ctx.setLineDash([5, 5]);
                            ctx.beginPath();
                            ctx.moveTo(area.left, y);
                            ctx.lineTo(area.right, y);
                            ctx.stroke();

                            // Label
                            ctx.setLineDash([]);
                            ctx.fillStyle = th.color;
                            ctx.font = '9px sans-serif';
                            ctx.fillText(`UV ${th.label}`, area.right - 25, y - 3);
                        });
                        ctx.setLineDash([]);
                    },
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Hora' },
                        ticks: { maxTicksLimit: 8, font: { size: 10 } },
                    },
                    y: {
                        beginAtZero: true,
                        max: 15,
                        title: { display: true, text: 'Índice UV' },
                        ticks: { font: { size: 10 } },
                    },
                },
            },
        });
    }

    function renderUVScale(avgUV) {
        const scaleEl = document.getElementById('uv-scale');
        if (!scaleEl) return;

        const levels = [
            { min: 0, max: 2, label: 'Bajo', emoji: '🟢', color: '#16a34a', bg: '#dcfce7' },
            { min: 3, max: 5, label: 'Moderado', emoji: '🟡', color: '#ca8a04', bg: '#fef9c3' },
            { min: 6, max: 7, label: 'Alto', emoji: '🟠', color: '#ea580c', bg: '#fed7aa' },
            { min: 8, max: 10, label: 'Muy alto', emoji: '🔴', color: '#dc2626', bg: '#fecaca' },
            { min: 11, max: 15, label: 'Extremo', emoji: '🟣', color: '#7c3aed', bg: '#f3e8ff' },
        ];

        const protections = [
            'Mínima necesaria. Gafas y sombrero opcionales.',
            'SPF 30+ entre 10:00-16:00. Sombrero y gafas.',
            'SPF 50+, sombrero, gafas. Evitar sol 11:00-15:00.',
            'Máxima precaución. Sombra obligatoria 10:00-16:00.',
            'Peligro. Evitar exposición. Ropa cubriente, SPF 50+.',
        ];

        const uvLevel = avgUV || 0;
        let html = '';

        levels.forEach((lvl, i) => {
            const isActive = uvLevel >= lvl.min && uvLevel <= lvl.max;
            const isHighlighted = isActive;
            html += `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;margin-bottom:4px;background:${isHighlighted ? lvl.bg : '#f8fafc'};border:2px solid ${isHighlighted ? lvl.color : '#e2e8f0'};">
                <span style="font-size:16px;flex-shrink:0;">${lvl.emoji}</span>
                <div style="flex:1;">
                    <div style="font-size:12px;font-weight:${isHighlighted ? '700' : '500'};color:#1e293b;">
                        ${lvl.label} (${lvl.min}–${lvl.max})
                        ${isHighlighted ? '<span style="margin-left:8px;font-size:10px;color:#64748b;font-weight:400;">← Actual</span>' : ''}
                    </div>
                    <div style="font-size:10px;color:#64748b;margin-top:2px;">${protections[i]}</div>
                </div>
            </div>`;
        });

        scaleEl.innerHTML = html;
    }

    function renderUVCities(results) {
        const citiesEl = document.getElementById('uv-cities');
        if (!citiesEl) return;
        let html = '';

        results.forEach((data, idx) => {
            const city = UV_CITIES[idx];
            if (!data) {
                html += `<div class="list-item">
                    <div class="list-item-header">${city.name}</div>
                    <div class="list-item-sub" style="color:#dc2626;">⚠️ No disponible</div>
                </div>`;
                return;
            }
            const currentUV = data.current?.uv_index ?? '—';
            const maxToday = data.daily?.uv_index_max?.[0] ?? '—';
            const radToday = data.daily?.shortwave_radiation_sum?.[0] ?? '—';
            const sunHrs = data.daily?.sunshine_duration?.[0] !== undefined ? (data.daily.sunshine_duration[0] / 3600).toFixed(1) : '—';

            let uvBadge = 'badge-green';
            let uvText = 'Bajo';
            const uvVal = parseFloat(currentUV);
            if (!isNaN(uvVal)) {
                if (uvVal <= 2) { uvBadge = 'badge-green'; uvText = 'Bajo'; }
                else if (uvVal <= 5) { uvBadge = 'badge-orange'; uvText = 'Moderado'; }
                else if (uvVal <= 7) { uvBadge = 'badge-orange'; uvText = 'Alto'; }
                else if (uvVal <= 10) { uvBadge = 'badge-red'; uvText = 'Muy alto'; }
                else { uvBadge = 'badge-red'; uvText = 'Extremo'; }
            }

            html += `<div class="list-item">
                <div class="list-item-header">${city.name} <span class="badge ${uvBadge}">UV: ${currentUV} (${uvText})</span></div>
                <div class="list-item-sub">
                    ☀️ Máx hoy: ${maxToday} · ☢️ Radiación: ${radToday} MJ/m² · ☀️ Sol: ${sunHrs} h
                </div>
            </div>`;
        });
        citiesEl.innerHTML = html;
    }

    function renderGBFSChart(filtered) {
        // Update chart title with station count
        const totalStations = filtered.reduce((s, d) => s + (d.error ? 0 : d.stations), 0);
        const titleEl = document.querySelector('#tab-gbfs .card:first-of-type .card-title');
        if (titleEl) titleEl.textContent = `Bicis disponibles por sistema (${totalStations} estaciones)`;
        const ctx = document.getElementById('chart-gbfs');
        if (!ctx) return;
        if (window._chartGBFS) window._chartGBFS.destroy();

        const labels = [];
        const bikesData = [];
        const dockingData = [];
        const colors = ['#2563eb', '#f97316', '#16a34a', '#7c3aed', '#0891b2', '#dc2626', '#ea580c', '#60a5fa'];

        for (const d of filtered) {
            if (d.error) continue;
            labels.push(d.city);
            bikesData.push(d.bikes);
            dockingData.push(d.docking);
        }

        window._chartGBFS = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '🚲 Bicis disponibles',
                        data: bikesData,
                        backgroundColor: colors.slice(0, labels.length).map(c => c + 'cc'),
                        borderColor: colors.slice(0, labels.length),
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: '🔌 Anclajes libres',
                        data: dockingData,
                        backgroundColor: colors.slice(0, labels.length).map(c => c + '44'),
                        borderColor: colors.slice(0, labels.length).map(c => c + '88'),
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label: function(ctx) {
                                return `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('es-ES')}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Unidades' }
                    }
                }
            }
        });
    }

    function renderWindChart7d(cityResults, cityName) {
        const cityIdx = RAFAGA_CITIES.findIndex(c => c.name === cityName);
        if (cityIdx < 0 || !cityResults[cityIdx] || !cityResults[cityIdx].hourly) return;

        const data = cityResults[cityIdx].hourly;

        const labels = [];
        const gustPoints = [];
        const speedPoints = [];
        const gustRedPoints = []; // puntos rojos para ráfagas > 60

        for (let i = 0; i < data.time.length; i++) {
            const d = new Date(data.time[i]);
            labels.push(`${d.getDate()}/${d.getMonth() + 1} ${d.getHours().toString().padStart(2, '0')}:00`);

            const gust = (data.wind_gusts_10m[i] ?? 0);
            const speed = (data.wind_speed_10m[i] ?? 0);

            gustPoints.push(gust);
            speedPoints.push(speed);

            if (gust > 60) {
                gustRedPoints.push(i);
            }
        }

        const ctx = document.getElementById('chart-raf-trend');
        if (!ctx) return;
        if (window._chartRafTrend) window._chartRafTrend.destroy();

        window._chartRafTrend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Ráfagas (km/h)',
                        data: gustPoints,
                        borderColor: '#f97316',
                        backgroundColor: '#f9731622',
                        borderWidth: 2,
                        pointRadius: gustPoints.map((_, i) => gustRedPoints.includes(i) ? 5 : 1),
                        pointBackgroundColor: gustPoints.map((_, i) => gustRedPoints.includes(i) ? '#dc2626' : '#f97316'),
                        pointBorderColor: gustPoints.map((_, i) => gustRedPoints.includes(i) ? '#7f1d1d' : '#c2410c'),
                        pointHoverRadius: 6,
                        fill: true,
                        tension: 0.3,
                    },
                    {
                        label: 'Viento medio (km/h)',
                        data: speedPoints,
                        borderColor: '#2563eb',
                        backgroundColor: '#2563eb22',
                        borderWidth: 1.5,
                        pointRadius: 1,
                        fill: true,
                        tension: 0.3,
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
                                return `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} km/h`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Tiempo (7d)' },
                        ticks: { maxTicksLimit: 12, font: { size: 9 } },
                    },
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'km/h' },
                        ticks: { font: { size: 10 } },
                    },
                },
            },
        });
    }
