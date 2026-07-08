// panels/economia-det.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function renderEconomyDetail() {
        // PIB by sector (horizontal bar)
        const sectors = ['Servicios', 'Industria', 'Construcción', 'Agricultura'];
        const gdpPcts = [67.5, 16.2, 8.1, 4.3];
        const gdpColors = ['#2563eb', '#f97316', '#64748b', '#16a34a'];

        if (charts.gdpSector) charts.gdpSector.destroy();
        const ctxGdp = document.getElementById('chart-gdp-sector');
        if (ctxGdp) {
            charts.gdpSector = new Chart(ctxGdp, {
                type: 'bar',
                data: {
                    labels: sectors,
                    datasets: [{
                        label: '% del PIB',
                        data: gdpPcts,
                        backgroundColor: gdpColors,
                        borderRadius: 6,
                        borderSkipped: false,
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
                                label: ctx => `${ctx.parsed.x}% del PIB`
                            }
                        }
                    },
                    scales: {
                        x: {
                            max: 80,
                            ticks: {
                                callback: v => v + '%',
                                font: { size: 11 },
                                color: '#64748b'
                            },
                            grid: { color: '#f1f5f9' }
                        },
                        y: {
                            ticks: { font: { size: 12, weight: '500' }, color: '#475569' },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Unemployment by province (bar)
        const provs = ['Cádiz', 'Córdoba', 'Sevilla', 'Jaén', 'Granada', 'Málaga', 'Huelva', 'Almería', 'León', 'Lugo'];
        const unempRates = [24.8, 21.3, 19.7, 18.4, 16.9, 15.2, 14.8, 13.6, 12.9, 12.4];

        if (charts.unempProv) charts.unempProv.destroy();
        const ctxUnemp = document.getElementById('chart-unemp-prov');
        if (ctxUnemp) {
            charts.unempProv = new Chart(ctxUnemp, {
                type: 'bar',
                data: {
                    labels: provs,
                    datasets: [{
                        label: 'Tasa de paro (%)',
                        data: unempRates,
                        backgroundColor: unempRates.map(v => v > 20 ? '#dc2626' : v > 15 ? '#f97316' : '#f59e0b'),
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
                                label: ctx => `Paro: ${ctx.parsed.y}%`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 30,
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
    }
