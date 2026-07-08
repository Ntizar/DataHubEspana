// panels/economia.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function renderEconomy() {
        // BOE activity data - constitutions and dissolutions
        // Data source: BORME Q2 2026 (hardcoded — API not available)
        const constituciones = 1247;
        const disoluciones = 438;
        setTxt('econ-const', constituciones.toLocaleString('es-ES'));
        setTxt('econ-disol', disoluciones.toLocaleString('es-ES'));

        // Add date label
        const econSection = document.querySelector('#tab-economia .section-title');
        if (econSection) {
            econSection.textContent = 'Actividad Mercantil (BORME Q2 2026)';
        }

        if (charts.economy) charts.economy.destroy();
        const ctx = document.getElementById('chart-economy');
        if (ctx) {
            charts.economy = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: [
                        `Constituciones (${constituciones})`,
                        `Disoluciones (${disoluciones})`
                    ],
                    datasets: [{
                        data: [constituciones, disoluciones],
                        backgroundColor: ['#16a34a', '#dc2626'],
                        borderWidth: 3,
                        borderColor: '#ffffff',
                        hoverBorderWidth: 1,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '55%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: { size: 12 },
                                padding: 16,
                                usePointStyle: true,
                                pointStyleWidth: 12
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = ((ctx.parsed / total) * 100).toFixed(1);
                                    return `${ctx.label}: ${pct}%`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Add source note
        const sourceSection = document.querySelector('#tab-economia .section-title:last-of-type');
        if (sourceSection) {
            sourceSection.textContent = 'Fuentes';
            const nextEl = sourceSection.nextElementSibling;
            if (nextEl) {
                nextEl.innerHTML = '<div style="font-size:12px;color:#64748b;">Datos procedentes del BOE y BORME. La actividad mercantil refleja la creación y disolución de sociedades mercantiles en España. <span style="color:#f97316;font-weight:500;">⚠️ Datos BORME Q2 2026 — valores de referencia.</span></div>';
            }
        }
    }
