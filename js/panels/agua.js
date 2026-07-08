// panels/agua.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function renderWater() {
        const basins = Object.keys(EMBALSES_DATA);
        const avgLevels = basins.map(b => {
            const embalses = EMBALSES_DATA[b];
            return embalses.reduce((s, e) => s + e.nivel, 0) / embalses.length;
        });

        // Compute totals
        let allLevels = [];
        let totalEmbalses = 0;
        basins.forEach(b => {
            EMBALSES_DATA[b].forEach(e => {
                allLevels.push({ name: e.nombre, nivel: e.nivel, basin: b });
            });
            totalEmbalses += EMBALSES_DATA[b].length;
        });

        // KPIs
        const avgLevel = allLevels.length > 0
            ? (allLevels.reduce((s, e) => s + e.nivel, 0) / allLevels.length).toFixed(1)
            : '—';
        setTxt('agua-nivel-medio', avgLevel + '%');
        setTxt('agua-total-embalses', totalEmbalses);

        // Volume/capacity estimates (rough approximation from national data)
        // National capacity ~28,000 Mm³, current ~55% → ~15,400 Mm³ stored
        const estCapacity = 28000;
        const estVolume = Math.round(estCapacity * parseFloat(avgLevel) / 100);
        setTxt('agua-volumen-est', estVolume.toLocaleString('es-ES'));
        setTxt('agua-capacidad-est', estCapacity.toLocaleString('es-ES'));

        // Best and worst embalse
        if (allLevels.length > 0) {
            const sorted = [...allLevels].sort((a, b) => b.nivel - a.nivel);
            setTxt('agua-embalse-mejor', `${sorted[0].nombre} (${sorted[0].nivel.toFixed(0)}%)`);
            setTxt('agua-embalse-peor', `${sorted[sorted.length-1].nombre} (${sorted[sorted.length-1].nivel.toFixed(0)}%)`);
        }

        // Bar chart
        if (charts.water) charts.water.destroy();
        const ctx = document.getElementById('chart-water');
        if (ctx) {
            charts.water = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: basins,
                    datasets: [{
                        label: 'Nivel medio (%)',
                        data: avgLevels.map(v => parseFloat(v.toFixed(1))),
                        backgroundColor: avgLevels.map(v =>
                            v > 60 ? '#16a34a' : v > 40 ? '#f97316' : '#dc2626'
                        ),
                        borderRadius: 4,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: ctx => `Nivel medio: ${ctx.parsed.y}%`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: v => v + '%',
                                font: { size: 11 },
                                color: '#64748b'
                            },
                            grid: { color: '#f1f5f9' }
                        },
                        x: {
                            ticks: { font: { size: 10 }, color: '#64748b' },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Detail list with progress bars
        let listHtml = '';
        basins.forEach(basin => {
            listHtml += `<div style="font-weight:600;font-size:11px;color:#2563eb;margin:8px 0 4px;padding-left:4px;border-left:2px solid #2563eb;">${basin}</div>`;
            EMBALSES_DATA[basin].forEach(e => {
                const colorClass = e.nivel > 60 ? 'green' : e.nivel > 40 ? 'orange' : 'red';
                const badgeClass = e.nivel > 60 ? 'badge-green' : e.nivel > 40 ? 'badge-orange' : 'badge-red';
                listHtml += `
                    <div class="list-item">
                        <div class="list-item-header">${e.nombre}</div>
                        <div class="list-item-sub">
                            Nivel: <span class="badge ${badgeClass}">${e.nivel}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill ${colorClass}" style="width:${e.nivel}%"></div>
                        </div>
                    </div>
                `;
            });
        });
        document.getElementById('water-list').innerHTML = listHtml;
    }
