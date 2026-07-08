// panels/ccaa-shared.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function generateCCAATab(dataType) {
        const container = document.getElementById('ccaa-' + dataType + '-container');
        if (!container) return;
        
        let html = '<div class="ccaa-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-top:8px;">';
        
        for (const [code, ccaa] of Object.entries(CCAA_CENTROIDS)) {
            html += `
                <div class="ccaa-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:11px;cursor:pointer;transition:all 0.15s;"
                     onclick="selectCCAA('${code}', '${dataType}')"
                     onmouseover="this.style.borderColor='#2563eb';this.style.boxShadow='0 2px 8px rgba(37,99,235,0.15)'"
                     onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='none'">
                    <div style="font-weight:600;color:#1e293b;font-size:12px;">${ccaa.name}</div>
                    <div style="color:#64748b;font-size:10px;margin-top:2px;">${ccaa.caps.length} ${ccaa.caps.length > 1 ? 'capitales' : 'capital'}</div>
                    <div id="ccaa-${dataType}-${code}" style="color:#94a3b8;font-size:10px;margin-top:3px;">—</div>
                </div>`;
        }
        
        html += '</div>';
        container.innerHTML = html;
    }

    async function selectCCAA(code, dataType) {
        const ccaa = CCAA_CENTROIDS[code];
        if (!ccaa) return;
        
        // Flash effect on card
        const card = document.querySelector(`[onclick="selectCCAA('${code}', '${dataType}')"]`);
        if (card) {
            card.style.borderColor = '#2563eb';
            card.style.background = '#eff6ff';
            setTimeout(() => { card.style.background = '#f8fafc'; }, 1000);
        }
        
        const dataEl = document.getElementById(`ccaa-${dataType}-${code}`);
        if (!dataEl) return;
        
        dataEl.innerHTML = '⏳ Cargando...';
        
        try {
            let result = {};
            
            switch(dataType) {
                case 'clima':
                    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ccaa.lat}&longitude=${ccaa.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=Europe/Madrid`);
                    const wData = await wRes.json();
                    result = { temp: wData.current.temperature_2m + '°C', desc: WMO_CODES[wData.current.weather_code] || '—', viento: wData.current.wind_speed_10m + ' km/h' };
                    dataEl.innerHTML = `🌡️${result.temp} 💨${result.viento}`;
                    break;
                    
                case 'aire':
                    const aRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${ccaa.lat}&longitude=${ccaa.lon}&current=pm2_5,pm10,ozone,nitrogen_dioxide&timezone=Europe/Madrid`);
                    const aData = await aRes.json();
                    result = { pm25: aData.current.pm2_5, pm10: aData.current.pm10 };
                    const aqiColor = result.pm25 < 10 ? '#22c55e' : result.pm25 < 20 ? '#eab308' : '#ef4444';
                    dataEl.innerHTML = `<span style="color:${aqiColor}">PM2.5: ${result.pm25}</span> PM10: ${result.pm10}`;
                    break;
                    
                case 'nieve':
                    const sRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ccaa.lat}&longitude=${ccaa.lon}&current=snow_depth,snowfall&timezone=Europe/Madrid`);
                    const sData = await sRes.json();
                    const depth = Math.round((sData.current.snow_depth || 0) * 100);
                    const snow = sData.current.snowfall || 0;
                    dataEl.innerHTML = depth > 0 ? `❄️ ${depth}cm ❄️ ${snow}cm/24h` : 'Sin nieve';
                    break;
                    
                case 'mar':
                    const mRes = await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${ccaa.lat}&longitude=${ccaa.lon}&current=wave_height,wave_direction,wave_period&timezone=Europe/Madrid`);
                    const mData = await mRes.json();
                    result = { waves: mData.current.wave_height, dir: mData.current.wave_direction, period: mData.current.wave_period };
                    dataEl.innerHTML = result.waves != null ? `🌊 ${result.waves}m 📐 ${result.period}s` : 'Sin datos marinos';
                    break;
                    
                default:
                    dataEl.innerHTML = 'Selecciona una pestaña';
            }
        } catch (err) {
            dataEl.innerHTML = '<span style="color:#ef4444">Error API</span>';
        }
    }
