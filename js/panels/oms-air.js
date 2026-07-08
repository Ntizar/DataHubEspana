// panels/oms-air.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function omsClassifPM25(v) {
        if (v <= 10) return { nivel: 'Bueno', color: '#16a34a' };
        if (v <= 20) return { nivel: 'Regular', color: '#ca8a04' };
        if (v <= 25) return { nivel: 'Malo', color: '#ea580c' };
        return { nivel: 'Muy malo', color: '#dc2626' };
    }

    function omsClassifPM10(v) {
        if (v <= 20) return { nivel: 'Bueno', color: '#16a34a' };
        if (v <= 40) return { nivel: 'Regular', color: '#ca8a04' };
        if (v <= 50) return { nivel: 'Malo', color: '#ea580c' };
        return { nivel: 'Muy malo', color: '#dc2626' };
    }

    function omsClassifO3(v) {
        if (v <= 100) return { nivel: 'Bueno', color: '#16a34a' };
        if (v <= 180) return { nivel: 'Regular', color: '#ca8a04' };
        return { nivel: 'Malo', color: '#ea580c' };
    }

    function omsClassifNO2(v) {
        if (v <= 40) return { nivel: 'Bueno', color: '#16a34a' };
        if (v <= 100) return { nivel: 'Regular', color: '#ca8a04' };
        return { nivel: 'Malo', color: '#ea580c' };
    }

    function omsClassifCO(v) {
        if (v <= 4) return { nivel: 'Bueno', color: '#16a34a' };
        return { nivel: 'Malo', color: '#ea580c' };
    }

    function omsStatusHTML(pol, cls) {
        const badgeCls = cls.color === '#16a34a' ? 'badge-green' :
                         cls.color === '#ca8a04' ? 'badge-yellow' :
                         cls.color === '#ea580c' ? 'badge-orange' : 'badge-red';
        return `<span class="badge ${badgeCls}">${cls.nivel}</span> ${pol} ${cls.nivel} (${v2str(pol)})`;
    }

    function v2str(v) { return v !== '—' ? v + ' µg/m³' : '—'; }

    function calcAQIOSM(pm25, pm10, o3, no2, co) {
        let maxAQI = 0;
        // PM2.5: thresholds OMS 2021
        if (pm25 !== '—') {
            const n = parseFloat(pm25);
            maxAQI = Math.max(maxAQI, n <= 5 ? 0 : n <= 10 ? 1 : n <= 15 ? 2 : n <= 20 ? 3 : n <= 30 ? 4 : 5);
        }
        // PM10
        if (pm10 !== '—') {
            const n = parseFloat(pm10);
            maxAQI = Math.max(maxAQI, n <= 15 ? 0 : n <= 20 ? 1 : n <= 30 ? 2 : n <= 50 ? 3 : n <= 75 ? 4 : 5);
        }
        // O3
        if (o3 !== '—') {
            const n = parseFloat(o3);
            maxAQI = Math.max(maxAQI, n <= 50 ? 0 : n <= 100 ? 1 : n <= 160 ? 2 : n <= 240 ? 3 : n <= 380 ? 4 : 5);
        }
        // NO2
        if (no2 !== '—') {
            const n = parseFloat(no2);
            maxAQI = Math.max(maxAQI, n <= 10 ? 0 : n <= 20 ? 1 : n <= 40 ? 2 : n <= 100 ? 3 : n <= 200 ? 4 : 5);
        }
        // CO (mg/m³)
        if (co !== '—') {
            const n = parseFloat(co);
            maxAQI = Math.max(maxAQI, n <= 4 ? 0 : n <= 8 ? 1 : n <= 12 ? 2 : n <= 16 ? 3 : n <= 24 ? 4 : 5);
        }
        return maxAQI;
    }
