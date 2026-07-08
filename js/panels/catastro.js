// panels/catastro.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function renderCatastro() {
        // Catastro card is populated on province click (lines 3637-3650).
        // This function just ensures the card is visible when tab is first opened.
        const card = document.getElementById('catastro-card');
        if (card) card.style.display = 'block';
    }
