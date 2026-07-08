// panels/poblacion.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function renderPopulation() {
        const ccaa = [
            'Andalucía', 'Cataluña', 'C. de Madrid', 'C. Valenciana',
            'Galicia', 'Castilla y León', 'Castilla-La Mancha', 'País Vasco',
            'Canarias', 'Aragón'
        ];
        const pops = [8494092, 7901046, 6790361, 5221333, 2699798, 2410892, 2078421, 2225404, 2236691, 1329391];

        if (charts.popCcaa) charts.popCcaa.destroy();
        const ctxPop = document.getElementById('chart-pop-ccaa');
        if (ctxPop) {
            charts.popCcaa = new Chart(ctxPop, {
                type: 'bar',
                data: {
                    labels: ccaa,
                    datasets: [{
                        label: 'Población',
                        data: pops,
                        backgroundColor: '#2563eb',
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
                                label: ctx => `${ctx.parsed.x.toLocaleString('es-ES')} habitantes`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                callback: v => (v / 1000000).toFixed(1) + 'M',
                                font: { size: 11 },
                                color: '#64748b'
                            },
                            grid: { color: '#f1f5f9' }
                        },
                        y: {
                            ticks: { font: { size: 11 }, color: '#475569' },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Age distribution (doughnut)
        if (charts.popAge) charts.popAge.destroy();
        const ctxAge = document.getElementById('chart-pop-age');
        if (ctxAge) {
            charts.popAge = new Chart(ctxAge, {
                type: 'doughnut',
                data: {
                    labels: ['0-14 años', '15-24 años', '25-54 años', '55-64 años', '65+ años'],
                    datasets: [{
                        data: [13.2, 9.4, 36.8, 13.5, 27.1],
                        backgroundColor: ['#2563eb', '#60a5fa', '#16a34a', '#f97316', '#dc2626'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '50%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { size: 11 },
                                padding: 12,
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
