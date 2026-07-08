// panels/lluvia.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function getRainSemaphor(prob) {
        if (prob >= 70) return { label: '🟣 Muy probable', bg: 'linear-gradient(135deg,#f3e8ff 0%,#e9d5ff 100%)', color: '#6b21a8', border: '#a855f7' };
        if (prob >= 50) return { label: '🔵 Probable', bg: 'linear-gradient(135deg,#1e3a5f 0%,#1e40af 100%)', color: '#ffffff', border: '#2563eb' };
        if (prob >= 20) return { label: '🔵 Posible', bg: 'linear-gradient(135deg,#bfdbfe 0%,#93c5fd 100%)', color: '#1e40af', border: '#3b82f6' };
        return { label: '💧 Improbable', bg: 'linear-gradient(135deg,#e0f2fe 0%,#bae6fd 100%)', color: '#0369a1', border: '#38bdf8' };
    }

    function detectPrecipType(data) {
        // Detectar tipo de precipitación de datos actuales/horarios
        if (!data) return { type: 'Sin datos', icon: '❓' };

        const current = data.current || {};
        const hourly = data.hourly || {};

        // Open-Meteo: current tiene showery/rain, hourly tiene snowfall/snow_depth
        const currentRain = (current.rain || 0) + (current.showers || 0);
        const currentSnow = current.snowfall || 0;
        const currentSleet = current.snow_depth || 0;

        // Buscar nieve en próximas 24h
        let snow24h = 0;
        if (hourly.snowfall && hourly.snowfall.length > 0) {
            for (let i = 0; i < Math.min(24, hourly.snowfall.length); i++) {
                snow24h += hourly.snowfall[i] || 0;
            }
        }
        let rain24h = 0;
        if (hourly.rain && hourly.rain.length > 0) {
            for (let i = 0; i < Math.min(24, hourly.rain.length); i++) {
                rain24h += hourly.rain[i] || 0;
            }
        }
        // Aguanieve: prob > 30% con temp baja → usar precipitation_form (0=lluvia, 1=lluvia_congelada, 2=nieve, 3=aguanieve)
        let sleetProb = 0;
        if (hourly.precipitation_form && hourly.precipitation_form.length > 0) {
            for (let i = 0; i < Math.min(24, hourly.precipitation_form.length); i++) {
                const pf = hourly.precipitation_form[i] || 0;
                if (pf === 3) sleetProb += 1; // aguanieve
                else if (pf === 2) snow24h += 0.5; // nieve
            }
        }

        if (snow24h > 0.5 || currentSnow > 0) return { type: 'Nieve', icon: '❄️' };
        if (sleetProb > 6) return { type: 'Aguanieve', icon: '🌨️' };
        if (rain24h > 0 || currentRain > 0) return { type: 'Lluvia', icon: '🌧️' };
        return { type: 'Sin precipitación', icon: '☀️' };
    }

    function getIntensityLabel(mm) {
        if (mm == null || mm === 0) return 'Sin datos';
        if (mm < 2.5) return 'Débil';
        if (mm < 10) return 'Moderada';
        if (mm < 30) return 'Fuerte';
        return 'Torrencial';
    }
