# 🇪🇸 DataHub España

**Panel de datos en tiempo real de España** con mapa base IGN y múltiples capas de información.

## 🚀 Despliegue

Automático vía GitHub Pages en cada push a `main`.

**URL:** `https://ntizar.github.io/DataHubEspana/`

## 📊 Capas de Datos

| Capa | Fuente | Tipo | API |
|------|--------|------|-----|
| ⚡ **Energía** | ESIOS/REE | Tiempo real | REST API |
| 🌤️ **Clima** | Open-Meteo | Tiempo real | REST API |
| 👥 **Demografía** | Local (INE-based) | Estático | JSON |
| 💼 **Economía** | BOE/BORME | Diario | REST API |
| 💧 **Agua** | Embalses | Actualizado | JSON |
| 🚗 **Transporte** | DGT | Tiempo real | DATEX2 |
| 🌿 **Medio Ambiente** | OAPN/MITECO | Estático | WMS |
| 🏗️ **Catastro** | DGC | On-demand | REST API |

## 🗺️ Mapa Base

- **IGN WMTS** — Instituto Geográfico Nacional (CC BY 4.0)
- Capas: Gris (recomendado para datos), Topográfica, Ortofotografía

## 📐 Arquitectura

```
DataHubEspana/
├── index.html                    ← Dashboard principal (SPA)
├── data/
│   ├── codigos-postales-centroids.json  ← 251 centroides municipales
│   ├── dgt/                      ← Datos DGT (radares, ZBE)
│   ├── embalses/                 ← Niveles de embalses
│   ├── puertos/                  ← Tráfico portuario
│   └── ...
├── scrapers/                     ← Scrapers Python
│   └── orchestrator_v2.py        ← Orquestador principal
├── tools/                        ← Herramientas anteriores
└── .github/workflows/pages.yml   ← Deploy automático
```

## 🎨 Diseño

- **Aurora Design System v5.1** — Liquid glass naranja/azul
- **Mobile-first** — Responsive en todos los dispositivos
- **Fondo claro** — Blanco limpio con glass sutil
- **Touch targets 44px** — Accesibilidad móvil

## 🛠️ Scrapers

Los scrapers recogen datos de APIs públicas y los guardan en `data/`:

- `esios_scraper.py` — ESIOS/REE (energía)
- `ine_scraper.py` — INE (estadísticas)
- `boe_completo_scraper.py` — BOE (legislación)
- `borme_scraper.py` — BORME (registro mercantil)
- `dgt_scraper.py` — DGT (tráfico)
- `embalses_scraper.py` — Embalses (agua)
- `aemet_scraper.py` — AEMET (meteorología)
- `catastro_scraper.py` — Catastro (inmobiliario)

## 📝 Licencia

- **Código:** MIT
- **Datos:** Según la fuente (CC BY 4.0 para IGN, libre reutilización para datos públicos)
- **Atribución:** Hecho con ❤️ por David Antizar

## 🔗 Fuentes de Datos

- [ESIOS/REE](https://www.esios.ree.es/) — Datos energéticos
- [Open-Meteo](https://open-meteo.com/) — Meteorología gratuita
- [BOE/BORME](https://www.boe.es/datosabiertos/) — Datos abiertos del Estado
- [DGT/NAP](https://nap.dgt.es/) — Tráfico y movilidad
- [IGN](https://www.ign.es/) — Mapas base
- [OAPN](https://www.miteco.gob.es/) — Parques nacionales
- [Catastro](https://www.sedecatastro.gob.es/) — Datos catastrales
