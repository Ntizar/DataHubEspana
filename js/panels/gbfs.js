// panels/gbfs.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function getCityOptions(data) {
        const cities = [...new Set(data.map(d => d.city).filter(Boolean))].sort();
        const sel = document.getElementById('gbfs-city-select');
        if (!sel) return cities;
        // Mantener selección actual
        const current = sel.value;
        sel.innerHTML = '<option value="all">Todas las ciudades</option>';
        for (const c of cities) {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            if (c === current) opt.selected = true;
            sel.appendChild(opt);
        }
        return cities;
    }

    function filterByCity(data, city) {
        if (city === 'all') return data;
        return data.filter(d => d.city === city);
    }

    function renderGBFS(data, filtered) {
        const listEl = document.getElementById('gbfs-list');
        if (!listEl) return;

        let totalSystems = 0;
        let totalStations = 0;
        let totalBikes = 0;
        let totalDocking = 0;
        let html = '';

        for (const d of filtered) {
            if (d.error) {
                html += `<div class="list-item">
                    <div class="list-item-header">${d.name}</div>
                    <div class="list-item-sub" style="color:#dc2626;">⚠️ No disponible</div>
                </div>`;
                continue;
            }
            totalSystems++;
            totalStations += d.stations;
            totalBikes += d.bikes;
            totalDocking += d.docking;
            html += `<div class="list-item">
                <div class="list-item-header">${d.name}</div>
                <div class="list-item-sub">
                    ${d.stations} estaciones · 🚲 ${d.bikes.toLocaleString('es-ES')} bicis · 🔌 ${d.docking.toLocaleString('es-ES')} anclajes
                </div>
            </div>`;
        }

        document.getElementById('gbfs-systems').textContent = totalSystems;
        document.getElementById('gbfs-stations').textContent = totalStations.toLocaleString('es-ES');
        document.getElementById('gbfs-bikes').textContent = totalBikes.toLocaleString('es-ES');
        document.getElementById('gbfs-docking').textContent = totalDocking.toLocaleString('es-ES');
        listEl.innerHTML = html || '<div style="font-size:12px;color:#64748b;">No se encontraron sistemas GBFS.</div>';
    }
