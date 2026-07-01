#!/usr/bin/env python3
"""
Scraper SIU - Sistema de Información Urbana (MITMA / Ministerio de Vivienda)
5.898 municipios: suelo, urbanismo, vivienda, planeamiento.
API: WFS/WMS de mapas.fomento.gob.es (ArcGIS)
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import date

DATA_DIR = Path(__file__).parent.parent / "data" / "siu_mitma"

WFS_URL = "https://mapas.fomento.gob.es/arcgis/services/SIU/Servicios_OGC/MapServer/WFSServer"

# Capas disponibles en el SIU
CAPAS = {
    "clases_suelo": "Servicios_OGC:OGC_Clases_Suelo",
    "recintos": "Servicios_OGC:OGC_Recintos",
    "sectores": "Servicios_OGC:OGC_Sectores",
    "areas_urbanas": "Servicios_OGC:OGC_Areas_Urbanas",
    "corine_2018": "Servicios_OGC:OGC_CORINE_2018",
    "siose_2014": "Servicios_OGC:OGC_SIOSE_2014",
}

# BBOX por comunidad autónoma (EPSG:25830)
BBOX_CCAA = {
    "nacional": "0,4000000,1000000,4900000",
    "madrid": "440000,4440000,520000,4550000",
    "cantabria": "530000,4740000,620000,4810000",
    "asturias": "470000,4730000,580000,4820000",
    "pais_vasco": "490000,4720000,600000,4830000",
    "galicia": "500000,4650000,640000,4830000",
    "cataluna": "460000,4540000,620000,4720000",
}


def fetch_wfs_capabilities() -> dict:
    """Obtiene las capabilities del WFS para verificar qué capas hay."""
    params = {
        "service": "wfs",
        "version": "2.0.0",
        "request": "GetCapabilities",
    }
    try:
        resp = requests.get(WFS_URL, params=params, timeout=30,
                          headers={"User-Agent": "DataHubEspana/1.0"})
        if resp.status_code == 200:
            # Contar capas disponibles
            capas_disponibles = []
            for nombre, layer in CAPAS.items():
                if layer.split(":")[-1] in resp.text:
                    capas_disponibles.append(nombre)
            return {"status": "ok", "capas": capas_disponibles}
    except Exception as e:
        return {"status": "error", "error": str(e)}
    return {"status": "error", "error": "Sin respuesta"}


def fetch_wfs_layer(layer_name: str, bbox: str = None, count: int = 500) -> list:
    """Obtiene features de una capa WFS como GeoJSON."""
    params = {
        "service": "wfs",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": CAPAS.get(layer_name, layer_name),
        "count": count,
        "outputFormat": "application/json",
        "srsName": "EPSG:4326",  # WGS84 para compatibilidad con Leaflet
    }
    if bbox:
        params["BBOX"] = f"{bbox},EPSG:25830"

    try:
        resp = requests.get(WFS_URL, params=params, timeout=60,
                          headers={"User-Agent": "DataHubEspana/1.0"})
        if resp.status_code == 200:
            data = resp.json()
            return data.get("features", [])
    except Exception as e:
        print(f"    ⚠️ Error WFS {layer_name}: {e}")
    return []


def fetch_siu_estadisticas() -> dict:
    """Obtiene estadísticas generales consultando capabilities y contando features."""
    caps = fetch_wfs_capabilities()
    if caps.get("status") != "ok":
        return {"error": caps.get("error", "WFS no disponible")}

    stats = {
        "capas_disponibles": caps.get("capas", []),
        "total_capas": len(caps.get("capas", [])),
        "wfs_url": WFS_URL,
        "crs": "EPSG:25830",
        "fecha_consulta": date.today().isoformat(),
    }
    return stats


def scrape_siu():
    """Scrapea datos del SIU MITMA vía WFS."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("🏗️ SIU MITMA - Urbanismo (WFS)\n")

    # 1. Capabilities
    print("  🔍 Verificando capas WFS...")
    caps = fetch_wfs_capabilities()
    capas = caps.get("capas", [])
    print(f"     {len(capas)} capas disponibles: {', '.join(capas)}")

    # 2. Estadísticas
    print("  📊 Estadísticas generales...")
    estadisticas = fetch_siu_estadisticas()
    print(f"     {'✅' if 'error' not in estadisticas else '⚠️'}")

    # 3. Muestra de clases de suelo (nacional, limitado)
    print("  🏗️ Clases de suelo (muestra nacional)...")
    suelo = fetch_wfs_layer("clases_suelo", BBOX_CCAA["madrid"], count=200)
    print(f"     {len(suelo)} features (Madrid)")

    # 4. Sectores
    print("  📋 Sectores de desarrollo...")
    sectores = fetch_wfs_layer("sectores", BBOX_CCAA["madrid"], count=200)
    print(f"     {len(sectores)} features (Madrid)")

    # Guardar
    with open(DATA_DIR / "estadisticas.json", "w", encoding="utf-8") as f:
        json.dump(estadisticas, f, ensure_ascii=False, indent=2)

    with open(DATA_DIR / "suelo.json", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": suelo}, f, ensure_ascii=False)

    with open(DATA_DIR / "sectores.json", "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": sectores}, f, ensure_ascii=False)

    # Guardar configuración de capas para el frontend
    config_capas = {
        "wms_url": "https://mapas.fomento.gob.es/arcgis/services/SIU/Servicios_OGC/MapServer/WMSServer",
        "wfs_url": WFS_URL,
        "crs": "EPSG:25830",
        "capas": {
            "clases_suelo": {"wms": "OGC_Clases_Suelo", "wfs": "Servicios_OGC:OGC_Clases_Suelo"},
            "recintos": {"wms": "OGC_Recintos", "wfs": "Servicios_OGC:OGC_Recintos"},
            "sectores": {"wms": "OGC_Sectores", "wfs": "Servicios_OGC:OGC_Sectores"},
            "areas_urbanas": {"wms": "OGC_Areas_Urbanas", "wfs": "Servicios_OGC:OGC_Areas_Urbanas"},
            "corine_2018": {"wms": "OGC_CORINE_2018", "wfs": "Servicios_OGC:OGC_CORINE_2018"},
            "siose_2014": {"wms": "OGC_SIOSE_2014", "wfs": "Servicios_OGC:OGC_SIOSE_2014"},
        },
        "bbox_ccaa": BBOX_CCAA,
    }
    with open(DATA_DIR / "capas.json", "w", encoding="utf-8") as f:
        json.dump(config_capas, f, ensure_ascii=False, indent=2)

    index = {
        "fecha": date.today().isoformat(),
        "capas_disponibles": len(capas),
        "features_suelo": len(suelo),
        "features_sectores": len(sectores),
        "wfs_disponible": caps.get("status") == "ok",
    }
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\n  ✅ SIU completado")
    return index


if __name__ == "__main__":
    scrape_siu()
