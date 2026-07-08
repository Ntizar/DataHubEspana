// panels/mareas.js — DataHub España
// Módulo extraído del monolito index.html
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

    function detectMareaPuerto(data, port) {
        if (!data || !data.current || !data.hourly) return { state: 'calmada', detail: '' };

        const now = data.current.time;
        const currentCV = data.current.ocean_current_velocity ?? 0;

        // Comparar con hora anterior
        const nowDate = new Date(now);
        const prevTime = new Date(nowDate.getTime() - 3600000).toISOString();
        const prevHourStr = prevTime.substring(0, 13) + ':00';

        const prevIdx = data.hourly.time.findIndex(t => t.startsWith(prevTime.substring(0, 13)));
        if (prevIdx >= 0 && prevIdx + 1 < data.hourly.ocean_current_velocity.length) {
            const prevCV = data.hourly.ocean_current_velocity[prevIdx + 1];
            if (prevCV !== undefined && prevCV !== null) {
                const diff = currentCV - prevCV;
                if (diff > 0.05) return { state: 'subiendo', detail: `+${diff.toFixed(2)} m/s` };
                if (diff < -0.05) return { state: 'bajando', detail: `${diff.toFixed(2)} m/s` };
            }
        }

        return { state: 'calmada', detail: '' };
    }
