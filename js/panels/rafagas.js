// panels/rafagas.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function windDirToDeg(dir) {
        return dir ?? 0;
    }

    function windDirToCardinal(deg) {
        const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                      'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
        return dirs[Math.round(deg / 22.5) % 16];
    }

    function calcWindEnergy(maxGustKmh) {
        // P = 0.5 * ρ * A * v³  — potencia total estimada por aerogenerador
        // v en m/s, A = 5000 m² (eólica onshore media), ρ = 1.225 kg/m³
        const rho = 1.225;
        const A = 5000;
        const v = maxGustKmh / 3.6; // km/h → m/s
        const P = 0.5 * rho * A * Math.pow(v, 3); // watts
        return P / 1e6; // MW
    }

    function generateWindAlerts(cityResults) {
        let alertsHtml = '';
        let hasAlert = false;

        cityResults.forEach((data, idx) => {
            if (!data || !data.current || !data.current.wind_gusts_10m) return;
            const gust = data.current.wind_gusts_10m;
            const city = RAFAGA_CITIES[idx];
            let alertClass, alertIcon, alertMsg;

            if (gust > 100) {
                alertClass = 'alert-critical';
                alertIcon = '🔴';
                alertMsg = `Aviso rojo — temporal de viento en ${city.name} (${gust.toFixed(0)} km/h)`;
            } else if (gust > 80) {
                alertClass = 'alert-critical';
                alertIcon = '🟠';
                alertMsg = `Aviso naranja — ráfagas muy fuertes en ${city.name} (${gust.toFixed(0)} km/h)`;
            } else if (gust > 60) {
                alertClass = 'alert-warning';
                alertIcon = '🟡';
                alertMsg = `Aviso amarillo — viento fuerte en ${city.name} (${gust.toFixed(0)} km/h)`;
            } else {
                return;
            }

            hasAlert = true;
            alertsHtml += `<div class="alert-banner ${alertClass}">${alertIcon} ${alertMsg}</div>`;
        });

        if (!hasAlert) {
            alertsHtml = `<div class="alert-banner" style="background:#f0fdf4;border:1px solid #86efac;color:#166534;">✅ Condiciones normales de viento en todas las ciudades</div>`;
        }

        return alertsHtml;
    }

    function generateWindRanking(cityResults) {
        const ranked = [];
        cityResults.forEach((data, idx) => {
            if (!data || !data.current || !data.current.wind_gusts_10m) return;
            ranked.push({
                name: RAFAGA_CITIES[idx].name,
                gust: data.current.wind_gusts_10m,
                speed: data.current.wind_speed_10m || 0,
                dir: data.current.wind_direction_10m || 0,
            });
        });
        ranked.sort((a, b) => b.gust - a.gust);
        return ranked;
    }
