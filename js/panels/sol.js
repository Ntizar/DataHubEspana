// panels/sol.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function getCityEmoji(name) {
        const map = {
            'Madrid': '🏰', 'Sevilla': '🌺', 'Barcelona': '🏖️', 'Valencia': '🍊',
            'Zaragoza': '⛪', 'Málaga': '🐟', 'Bilbao': '🌉', 'A Coruña': '🗼',
            'Las Palmas': '🌴', 'Santa Cruz': '🌴', 'Almería': '☀️', 'Murcia': '🌿'
        };
        return map[name] || '📍';
    }
