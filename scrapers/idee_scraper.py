#!/usr/bin/env python3
"""
Scraper IDEE - Infraestructura de Datos Espaciales de España
Capas de datos espaciales: carreteras, ríos, municipios, límites administrativos.
WMS/WFS del IDEE: delimita.mma.es + idee.es
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import date

DATA_DIR = Path(__file__).parent.parent / "data" / "idee"

# Capas WMS del IDEE
CAPAS_WMS = {
    "administrativas": {
        "nombre": "Límites administrativos",
        "wms": "http://www.ign.es/wms/ign/limites",
        "capas": [
            "Línea de costa",
            "Límite de Comunidad Autónoma",
            "Límite de Provincia",
            "Límite de Municipio"
        ]
    },
    "carreteras": {
        "nombre": "Red de carreteras",
        "wms": "http://www.ign.es/wms/mta-net-vigola",
        "capas": [
            "Carreteras",
            "Autovías",
            "Autopistas",
            "Puentes"
        ]
    },
    "hidrografia": {
        "nombre": "Red hidrográfica",
        "wms": "http://www.ign.es/wms/ign/hs",
        "capas": [
            "Ríos",
            "Embalses",
            "Cursos de agua"
        ]
    },
    "toponimia": {
        "nombre": "Toponimia",
        "wms": "http://www.ign.es/wms/ign/toponimia",
        "capas": [
            "Nombres de lugar",
            "Montes",
            "Picos"
        ]
    },
    "relieve": {
        "nombre": "Modelo Digital del Terreno",
        "wms": "http://www.ign.es/wms/ign/mdt",
        "capas": [
            "MDT200",
            "MDT50",
            "Curvas de nivel",
            "Sombras de relieve"
        ]
    },
    "sismologia": {
        "nombre": "Sismología",
        "wms": "http://www.ign.es/wms/ign/sismologia",
        "capas": [
            "Terremotos últimos 30 días",
            "Catálogo sísmico"
        ]
    },
    "volcanologia": {
        "nombre": "Volcanología",
        "wms": "http://www.ign.es/wms/ign/volcanologia",
        "capas": [
            "Volcanes activos",
            "Zonas volcánicas"
        ]
    },
    "ciudades": {
        "nombre": "Cartografía de ciudades",
        "wms": "http://www.ign.es/wms/ign/ciudades",
        "capas": [
            "Núcleos urbanos"
        ]
    }
}


def fetch_wms_capabilities(wms_url: str) -> dict:
    """Obtiene capabilities de un servidor WMS."""
    url = f"{wms_url}?service=WMS&version=1.3.0&request=GetCapabilities"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return {"status": "ok", "content_type": resp.headers.get("content-type", ""), "size": len(resp.text)}
    except:
        pass
    return {"status": "offline"}


def fetch_wfs_capabilities(wfs_url: str) -> dict:
    """Obtiene capabilities de un servidor WFS."""
    url = f"{wfs_url}?service=WFS&version=2.0.0&request=GetCapabilities"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return {"status": "ok", "content_type": resp.headers.get("content-type", ""), "size": len(resp.text)}
    except:
        pass
    return {"status": "offline"}


def fetch_wms_layer_info(wms_url: str, layer_name: str) -> dict:
    """Obtiene información de una capa WMS específica."""
    params = {
        "service": "WMS",
        "version": "1.3.0",
        "request": "GetMap",
        "layers": layer_name,
        "bbox": "36.0,-9.5,43.8,3.3",  # España
        "srs": "EPSG:4326",
        "format": "image/png",
        "width": "100",
        "height": "100"
    }
    try:
        resp = requests.get(wms_url, params=params, timeout=30)
        return {
            "status": resp.status_code,
            "content_type": resp.headers.get("content-type", ""),
            "accessible": resp.status_code == 200
        }
    except:
        return {"status": "error", "accessible": False}


def scrape_idee():
    """Scrapea el IDEE: capabilities de todas las capas WMS."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("🗺️ IDEE - Datos Espaciales de España\n")
    
    resultados = {}
    
    for capa_id, config in CAPAS_WMS.items():
        print(f"  🌐 {config['nombre']}...")
        
        wms_url = config["wms"]
        capabilities = fetch_wms_capabilities(wms_url)
        
        resultados[capa_id] = {
            "nombre": config["nombre"],
            "wms": wms_url,
            "capabilities": capabilities,
            "capas_disponibles": config["capas"]
        }
        
        status = "✅" if capabilities["status"] == "ok" else "❌"
        print(f"     {status} {capabilities['status']}")
        
        time.sleep(0.3)
    
    # Guardar
    with open(DATA_DIR / "capas_idee.json", "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)
    
    activas = sum(1 for r in resultados.values() if r["capabilities"]["status"] == "ok")
    
    index = {
        "fecha": date.today().isoformat(),
        "total_capas": len(resultados),
        "capas_activas": activas,
        "capas": list(CAPAS_WMS.keys())
    }
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n  ✅ {activas}/{len(resultados)} servidores WMS activos")
    return index


if __name__ == "__main__":
    scrape_idee()
