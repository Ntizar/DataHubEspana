// panels/nubosidad.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function nuboIcon(cobertura) {
        if (cobertura <= 10) return { emoji: '☀️', label: 'Despejado', cls: 'badge-green', kpi: 'green' };
        if (cobertura <= 30) return { emoji: '🌤️', label: 'Poco nuboso', cls: 'badge-green', kpi: 'green' };
        if (cobertura <= 60) return { emoji: '⛅', label: 'Parcialmente nuboso', cls: 'badge-blue', kpi: 'blue' };
        if (cobertura <= 80) return { emoji: '🌥️', label: 'Muy nuboso', cls: 'badge-orange', kpi: 'orange' };
        return { emoji: '☁️', label: 'Cubierto', cls: 'badge-red', kpi: 'red' };
    }

    function nuboHoursSol(cobertura) {
        // Estimación: día de 12h en promedio, proporcional inversa a cobertura
        const ratio = Math.max(0, (100 - cobertura) / 100);
        return (ratio * 12).toFixed(1);
    }
