// panels/nieve.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function renderStationsList() {
        const stationsEl = document.getElementById('nieve-stations-list');
        if (!stationsEl) return;

        let html = '';
        nieveStationData.forEach((d, i) => {
            if (!d) {
                html += `<div class="list-item"><div class="list-item-header">${SKI_RESORTS[i].name}</div><div class="list-item-sub" style="color:#dc2626;">⚠️ No disponible</div></div>`;
                return;
            }
            const badgeClass = d.hasNieve ? 'badge-green' : 'badge-red';
            const badgeText = d.hasNieve ? `✅ ${d.depthCm} cm` : '❄️ Sin nieve';
            html += `<div class="list-item" style="cursor:pointer;" onclick="selectedStationIdx=${i};updateNieveChart();">
                <div class="list-item-header">${d.name} <span class="badge ${badgeClass}">${badgeText}</span></div>
                <div class="list-item-sub">${d.cc} · ⛰️ ${d.elev} m · 🌨️ 7d: ${d.snow7d} cm</div>
            </div>`;
        });
        stationsEl.innerHTML = html;
    }
