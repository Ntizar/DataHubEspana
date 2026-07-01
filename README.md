# 🇪🇸 DataHub España

**Panel de datos en tiempo real de España** con mapa base IGN y múltiples capas de información.

## 🚀 Despliegue

Automático vía GitHub Pages en cada push a `main`.

**URL:** `https://ntizar.github.io/DataHubEspana/`

## 📊 Capas de Datos

| Capa | Fuente | Tipo | API |
|------|--------|------|-----|
| ⚡ **Energía** | ESIOS/REE | Tiempo real | REST API (vía proxy) |
| 🌤️ **Clima** | Open-Meteo | Tiempo real | REST API |
| 👥 **Demografía** | Local (INE-based) | Estático | JSON |
| 💼 **Economía** | BOE/BORME | Diario | REST API |
| 💧 **Agua** | Embalses | Actualizado | JSON |
| 🚗 **Transporte** | DGT/NAP | Tiempo real | CKAN |
| 🌿 **Medio Ambiente** | SIU/MITMA | Bajo demanda | WFS/WMS |
| 🏗️ **Catastro** | DGC | On-demand | REST API |
| 🚲 **Bicicletas** | GBFS | Tiempo real | REST API |
| 🚢 **Puertos** | Puertos del Estado | Tiempo real | REST API |

## 🗺️ Mapa Base

- **IGN WMTS** — Instituto Geográfico Nacional (CC BY 4.0)
- Capas: Gris (recomendado para datos), Topográfica, Ortofotografía

## 📐 Arquitectura

```
DataHubEspana/
├── index.html                    ← Dashboard principal (SPA)
├── css/
│   └── styles.css                ← Estilos (extraídos del HTML)
├── js/
│   └── datahub.js                ← Factory Open-Meteo + cache + error handling
├── data/
│   ├── geo/                      ← GeoJSON provincias (lazy load)
│   ├── dgt/                      ← Datos DGT (radares, ZBE)
│   ├── embalses/                 ← Niveles de embalses
│   ├── puertos/                  ← Tráfico portuario
│   └── ...
├── scrapers/                     ← Scrapers Python
│   └── orchestrator_v2.py        ← Orquestador principal
├── proxy/
│   ├── esios-proxy.js            ← Cloudflare Worker proxy ESIOS
│   └── wrangler.toml             ← Config deploy Cloudflare
├── tools/                        ← Herramientas auxiliares
└── .github/workflows/
    ├── pages.yml                 ← Deploy GitHub Pages
    └── scrapers.yml              ← Cron horario de scrapers
```

## 🔒 Seguridad

El token ESIOS **nunca** se incluye en el frontend. Se usa un proxy:

1. **Deploy del proxy:** `cd proxy && npx wrangler deploy`
2. **Configurar variable:** En el dashboard de Cloudflare → Settings → Variables → `ESIOS_TOKEN`
3. **Configurar URL en el frontend:** `window.ESIOS_PROXY_URL = 'https://esios-proxy.tu-subdominio.workers.dev'`

## 🔄 Pipeline de Datos Automático

Los scrapers se ejecutan automáticamente cada hora vía GitHub Actions:

```yaml
# .github/workflows/scrapers.yml
schedule:
  - cron: '30 * * * *'
```

Los datos actualizados se commitean al repo y GitHub Pages los sirve automáticamente.

## 🛠️ Scrapers

- `esios_scraper.py` — ESIOS/REE (energía)
- `ine_scraper.py` — INE (estadísticas)
- `boe_completo_scraper.py` — BOE (legislación)
- `borme_scraper.py` — BORME (registro mercantil)
- `dgt_scraper.py` — DGT (tráfico, radares, ZBE)
- `embalses_scraper.py` — Embalses (agua)
- `aemet_scraper.py` — AEMET (meteorología)
- `catastro_scraper.py` — Catastro (inmobiliario)
- `siu_scraper.py` — SIU/MITMA (suelo, urbanismo) vía WFS
- `subvenciones_scraper.py` — BDNS + BOE (subvenciones)
- `contratacion_scraper.py` — Plataforma de contratación + BOE
- `ckan_multi_portal.py` — Madrid, Aragón, Argentina (CKAN)
- `nap_transporte_scraper.py` — NAP Transportes
- `puertos_scraper.py` — Puertos del Estado
- `ign_scraper.py` — IGN (terremotos)
- `idee_scraper.py` — IDEE (capas cartográficas)
- `datos_gob_scraper.py` — datos.gob.es
- `madrid_scraper.py` — Ayuntamiento de Madrid

## ⚡ Rendimiento

- **Cache localStorage** — Las llamadas a Open-Meteo se cachean 10 minutos
- **Interceptor global** — Todos los fetch a open-meteo.com pasan por cache + timeout
- **CSS externo** — Estilos separados del HTML para mejor caching del navegador
- **Lazy loading** — Las tabs se renderizan bajo demanda

## 🎨 Diseño

- **Fondo claro** — Blanco limpio con sombras sutiles
- **Mobile-first** — Responsive en todos los dispositivos
- **Touch targets 44px** — Accesibilidad móvil
- **Tabs agrupadas** — Navegación organizada por categorías

## 📝 Licencia

- **Código:** MIT (ver `LICENSE`)
- **Datos:** Según la fuente (CC BY 4.0 para IGN, libre reutilización para datos públicos)
- **Atribución:** Hecho con ❤️ por David Antizar

## 🔗 Fuentes de Datos

- [ESIOS/REE](https://www.esios.ree.es/) — Datos energéticos
- [Open-Meteo](https://open-meteo.com/) — Meteorología gratuita
- [BOE/BORME](https://www.boe.es/datosabiertos/) — Datos abiertos del Estado
- [DGT/NAP](https://nap.dgt.es/) — Tráfico y movilidad
- [IGN](https://www.ign.es/) — Mapas base
- [SIU/MITMA](https://mapas.fomento.gob.es/VisorSIU/) — Suelo y urbanismo
- [Catastro](https://www.sedecatastro.gob.es/) — Datos catastrales
- [GBFS](https://github.com/NABSA/gbfs) — Bicicletas compartidas
- [Puertos del Estado](https://portus.puertos.es/) — Datos portuarios
