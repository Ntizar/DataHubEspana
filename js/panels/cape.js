// panels/cape.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function capeRiskLevel(cape) {
        if (cape > 1000) return { text: '🔴 Tormenta severa', cls: 'badge-red', color: '#dc2626' };
        if (cape >= 300) return { text: '🟡 Tormenta', cls: 'badge-yellow', color: '#eab308' };
        return { text: '🟢 Inestable', cls: 'badge-green', color: '#16a34a' };
    }

    function capeGlobalRisk(avgCape) {
        if (avgCape > 1000) return { text: '🔴 Tormenta severa', cls: 'kpi red' };
        if (avgCape >= 300) return { text: '🟡 Tormenta', cls: 'kpi yellow' };
        return { text: '🟢 Inestable', cls: 'kpi green' };
    }

    function capeKpiColor(cape) {
        if (cape > 1000) return '#dc2626';
        if (cape >= 300) return '#eab308';
        return '#16a34a';
    }
