// panels/ambiente.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function renderParks() {
        let html = '';
        NATIONAL_PARKS.forEach(p => {
            html += `
                <div class="list-item" style="cursor:pointer; transition:background 0.15s;"
                     onmouseover="this.style.background='#f1f5f9'"
                     onmouseout="this.style.background='transparent'"
                     onclick='selectPark(${JSON.stringify({nombre:p.nombre, lat:p.lat, lon:p.lon}).replace(/'/g, "&#39;")})'>
                    <div class="list-item-header">🌲 ${p.nombre}</div>
                    <div class="list-item-sub">${p.comunidad} · ${p.superficie.toLocaleString('es-ES')} km² · Declarado: ${p.anio}</div>
                </div>
            `;
        });
        document.getElementById('parks-list').innerHTML = html;

        // Add park markers to map as overlay
        if (parksOverlay) parksOverlay.clearLayers();
        else parksOverlay = L.layerGroup();
        NATIONAL_PARKS.forEach(p => {
            const marker = L.circleMarker([p.lat, p.lon], {
                radius: 7,
                fillColor: '#16a34a',
                color: '#ffffff',
                weight: 2,
                fillOpacity: 0.9
            }).bindTooltip(`<strong>🌲 ${p.nombre}</strong><br>${p.comunidad}<br>${p.superficie} km² — ${p.anio}`, { sticky: true });
            parksOverlay.addLayer(marker);
        });

        if (map && !map.hasLayer(parksOverlay)) {
            parksOverlay.addTo(map);
        }
    }

    function selectPark(park) {
        if (map) {
            map.flyTo([park.lat, park.lon], 11, { duration: 1.5 });
        }
    }
