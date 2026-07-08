// panels/termica.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function getConfortEscala(temp) {
        if (temp < 0) return { label: 'Congelación', emoji: '❄️', color: '#3b82f6', bgClass: 'blue' };
        if (temp < 10) return { label: 'Muy frío', emoji: '🥶', color: '#6366f1', bgClass: 'purple' };
        if (temp < 18) return { label: 'Frío', emoji: '🌬️', color: '#8b5cf6', bgClass: 'purple' };
        if (temp < 24) return { label: 'Confortable', emoji: '😊', color: '#16a34a', bgClass: 'green' };
        if (temp < 30) return { label: 'Cálido', emoji: '🥵', color: '#ea580c', bgClass: 'orange' };
        if (temp < 38) return { label: 'Caliente', emoji: '🔥', color: '#dc2626', bgClass: 'red' };
        return { label: 'Peligroso', emoji: '🚨', color: '#991b1b', bgClass: 'red' };
    }

    function getTermicaAlerts(cityData) {
        let alerts = [];
        cityData.forEach(c => {
            if (c.sensacion != null) {
                if (c.sensacion > 40) {
                    alerts.push({ type: 'critical', text: `🚨 Alerta ola de calor en ${c.name}: sensación térmica ${c.sensacion.toFixed(1)}°C` });
                }
                if (c.sensacion < -10) {
                    alerts.push({ type: 'warning', text: `🥶 Alerta frío extremo en ${c.name}: sensación térmica ${c.sensacion.toFixed(1)}°C` });
                }
            }
        });
        return alerts;
    }

    function getRiesgoCalor(temp, sensacion) {
        if (sensacion >= 54) return 'Muy alto';
        if (sensacion >= 46) return 'Alto';
        if (sensacion >= 40) return 'Medio';
        return 'Bajo';
    }
