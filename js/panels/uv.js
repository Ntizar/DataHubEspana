// panels/uv.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function getUVColorLevel(uv) {
        if (uv <= 2) return { level: 0, label: 'Bajo', color: '#16a34a', bg: '#dcfce7' };
        if (uv <= 5) return { level: 1, label: 'Moderado', color: '#ca8a04', bg: '#fef9c3' };
        if (uv <= 7) return { level: 2, label: 'Alto', color: '#ea580c', bg: '#fed7aa' };
        if (uv <= 10) return { level: 3, label: 'Muy alto', color: '#dc2626', bg: '#fecaca' };
        return { level: 4, label: 'Extremo', color: '#7c3aed', bg: '#f3e8ff' };
    }
