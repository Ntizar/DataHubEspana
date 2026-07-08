# DataHub España — Decisiones del Spec Workflow

> **Simulado por Mastermind actuando como David Antizar**
> **Fecha:** 2026-07-08
> **Base:** Preferencias conocidas de David (memoria + SOUL.md + historial de proyectos)

---

## Fase 1 — Propuesta inicial (lo que el agente propondría)

He detectado que quieres refactorizar DataHubEspana. Basándome en tu historial (GTFSSpain, GBFSSpain, CallesDinamicas), propongo:

🎯 **Qué será:** Refactor del monolito actual (11.538 líneas) a arquitectura modular
📊 **Datos:** Los mismos que ya tiene — 15 fuentes, 17 pestañas
🗺️ **Pantallas:** Las mismas 17 pestañas, sin añadir ni quitar
⚡ **Stack:** Vanilla JS, Leaflet, Chart.js — sin cambiar tecnologías
🚫 **No incluye:** No añade features nuevas, no cambia el diseño visual, no toca los datos

## Fase 2 — Respuestas de David (simuladas)

### Bloque A — Alcance

**A1. ¿Qué problema resuelve?**
→ ✅ Refactor de arquitectura: monolito → modular sin perder funcionalidad

**A2. ¿Cuál es la pantalla principal?**
→ ✅ Dashboard con tabs (las 17 pestañas actuales, sin cambio)

**A3. ¿Qué NO hace? (non-goals)**
→ ✅ No añade features nuevas
→ ✅ No cambia el diseño visual (Aurora Ntizar se mantiene)
→ ✅ No cambia los datos ni las APIs
→ ✅ No añade tests automatizados (futuro)
→ ✅ No migra a framework (se queda en vanilla JS)

### Bloque B — Datos

**B1. ¿De dónde vienen los datos?**
→ ✅ Los mismos: Open-Meteo (6 APIs), ESIOS, USGS, INE, DGT, GBFS, Puertos, Catastro, EEA

**B2. ¿Cada cuánto se actualizan?**
→ ✅ Sin cambios: tiempo real + estático mixto

**B3. ¿Volumen de datos?**
→ ✅ Sin cambios: 50 provincias, 68 sistemas GBFS, 400+ embalses, etc.

### Bloque C — Arquitectura y stack

**C1. ¿Frontend, backend, o ambos?**
→ ✅ Solo frontend (estático, GitHub Pages). El proxy mínimo se mantiene.

**C2. ¿Tecnologías preferidas?**
→ ✅ Vanilla JS (sin framework) — David siempre usa vanilla JS en sus visores
→ ✅ Leaflet 1.9.4 (sin cambio)
→ ✅ Chart.js 4.4.4 (sin cambio)
→ ✅ CSS: Aurora Ntizar (azul #2563eb + naranja #f97316, liquid glass, bento grid)
→ ✅ NO degradados azul→naranja (sRGB interpola a morado — pitfall conocido de David)
→ ✅ Colores sólidos puros en bloques
→ ✅ Fondo blanco (#fafafa) para data viz, NO oscuro

**C3. ¿Deploy dónde?**
→ ✅ GitHub Pages (estático, workflow ya configurado)

### Bloque D — Lo que David ya sabe

**D1. ¿Hay algo que YA sabes cómo quieres que sea?**
→ ✅ Sí: el diseño visual se mantiene exactamente igual. Solo cambia la arquitectura interna.
→ ✅ `var charts = window.charts = {}` (NO `const`) — pitfall conocido
→ ✅ Tab lazy-rendered: NO marcar como loaded hasta terminar fetch
→ ✅ ESIOS `time_trunc=hour` SUMA, no promedia — usar `convertEsiosValue()`
→ ✅ NO `buildSummary()` recursivo — causa OOM
→ ✅ Shelf-packing en treemaps (NO centroid)
→ ✅ Canvas2D > Three.js para data viz 2D
→ ✅ Layout bento asimétrico

**D2. ¿Hay algo que HAYAS VISTO que te guste como referencia?**
→ ✅ GTFSSpain (click líneas → panel ruta+horarios) — mismo patrón de interacción
→ ✅ GBFSSpain (visor 68 sistemas) — mismo patrón de mapa + panel

**D3. ¿Hay algo que TE HAYA PASADO antes que quieras evitar?**
→ ✅ Monolitos imposibles de iterar (este refactor lo soluciona)
→ ✅ Estado global esparcido sin dueño claro
→ ✅ Funciones que tocan variables que no les corresponden
→ ✅ Parches acumulados que rompen cosas anteriores
→ ✅ "Antes funcionaba y ahora no" sin saber por qué

## Fase 3 — Aprobación

**David dice:** ✅ Adelante. Refactoriza siguiendo la SPEC.md. Una fase por commit. No rompas nada.

## Fase 4 — Plan de ejecución

1. Branch `refactor-modular` desde main
2. Fase 1: Extraer CSS → css/styles.css
3. Fase 2: Extraer estado → js/state.js
4. Fase 3: Extraer API → js/api.js
5. Fase 4: Extraer mapa → js/map.js
6. Fase 5: Extraer gráficos → js/charts.js
7. Fase 6: Extraer tabs → js/tabs.js
8. Fase 7: Extraer panels (uno por uno, 17 total)
9. Fase 8: Limpieza final + merge
10. Push a GitHub

## Notas para el agente nocturno

- Actuar como David significa: mantener sus preferencias de diseño, no inventar features nuevas, no cambiar tecnologías
- El objetivo es DEMOSTRAR el skill project-spec-workflow refactorizando de verdad
- Si algo se rompe, revertir ese commit y continuar con la siguiente fase
- El index.html final debe ser < 300 líneas (solo DOM + script imports)
- Cada archivo JS debe tener una responsabilidad clara
- NO usar `const` para `charts` — usar `var charts = window.charts = {}`
- NO marcar tabs como loaded antes de tiempo
- Mantener TODOS los anti-patrones de SOUL.md
