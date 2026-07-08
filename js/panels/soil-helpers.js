// panels/soil-helpers.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function clasificacionAgricola(temp) {
        if (temp == null) return { label: '—', emoji: '❓', color: '#94a3b8', bg: '#f1f5f8', rec: '' };
        if (temp < 5) return { label: 'Helada', emoji: '❄️', color: '#2563eb', bg: '#dbeafe', rec: '⚠️ Temperatura de suelo por debajo de 5°C. No se recomienda siembra. Proteger cultivos sensibles con cobertores.' };
        if (temp < 15) return { label: 'Frío — siembra limitada', emoji: '🌱', color: '#d97706', bg: '#fef3c7', rec: '🌱 Temperatura baja. Siembra limitada a cultaciones de clima fresco (espinacas, guisantes, habas). Evitar cultivos mediterráneos.' };
        if (temp <= 25) return { label: 'Óptimo para cultivos', emoji: '✅', color: '#16a34a', bg: '#dcfce7', rec: '✅ Condiciones ideales. Temperatura de suelo favorable para la mayoría de cultivos. Buena ventana para siembra y trasplante.' };
        return { label: 'Estrés térmico', emoji: '🔥', color: '#dc2626', bg: '#fee2e2', rec: '🔥 Temperatura elevada. Riesgo de estrés hídrico y térmico. Aumentar riego, considerar sombreado y proteger raíces.' };
    }

    function interpolarProfundidad(profundidades, valores, target) {
        if (!valores || valores.length === 0) return null;
        if (target <= profundidades[0]) return valores[0];
        if (target >= profundidades[profundidades.length - 1]) return valores[valores.length - 1];
        for (let i = 0; i < profundidades.length - 1; i++) {
            if (target >= profundidades[i] && target <= profundidades[i + 1]) {
                const t = (target - profundidades[i]) / (profundidades[i + 1] - profundidades[i]);
                return valores[i] + t * (valores[i + 1] - valores[i]);
            }
        }
        return valores[valores.length - 1];
    }
