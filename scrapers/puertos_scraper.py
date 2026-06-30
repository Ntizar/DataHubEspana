#!/usr/bin/env python3
"""
Scraper Puertos del Estado - Puertos Españoles
Oleaje, temperatura marina, viento, estado del mar.
API pública: datos.gob.es + web scraping.
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import date

DATA_DIR = Path(__file__).parent.parent / "data" / "puertos"

# Puertos principales y sus APIs conocidas
PUERTOS = {
    "algeciras": {"nombre": "Puerto de Algeciras", "ccaa": "Andalucía", "lat": 36.12, "lng": -5.45},
    "barcelona": {"nombre": "Puerto de Barcelona", "ccaa": "Cataluña", "lat": 41.34, "lng": 2.18},
    "bilbao": {"nombre": "Puerto de Bilbao", "ccaa": "País Vasco", "lat": 43.33, "lng": -2.96},
    "cádiz": {"nombre": "Puerto de Cádiz", "ccaa": "Andalucía", "lat": 36.53, "lng": -6.29},
    "cartagena": {"nombre": "Puerto de Cartagena", "ccaa": "Murcia", "lat": 37.56, "lng": -0.98},
    "celeiro": {"nombre": "Puerto del Celeiro", "ccaa": "Galicia", "lat": 43.72, "lng": -7.60},
    "ceuta": {"nombre": "Puerto de Ceuta", "ccaa": "Ceuta", "lat": 35.89, "lng": -5.32},
    "culleredo": {"nombre": "Puerto de Culleredo", "ccaa": "Galicia", "lat": 43.35, "lng": -8.38},
    "gijón": {"nombre": "Puerto de Gijón", "ccaa": "Asturias", "lat": 43.55, "lng": -5.67},
    "las palmas": {"nombre": "Puerto de Las Palmas", "ccaa": "Canarias", "lat": 28.10, "lng": -15.41},
    "melilla": {"nombre": "Puerto de Melilla", "ccaa": "Melilla", "lat": 35.29, "lng": -2.93},
    "palma": {"nombre": "Puerto de Palma", "ccaa": "Baleares", "lat": 39.57, "lng": 2.64},
    "santander": {"nombre": "Puerto de Santander", "ccaa": "Cantabria", "lat": 43.46, "lng": -3.81},
    "santiago": {"nombre": "Puerto de San Cibrao", "ccaa": "Galicia", "lat": 43.68, "lng": -7.77},
    "sevilla": {"nombre": "Puerto de Sevilla", "ccaa": "Andalucía", "lat": 37.39, "lng": -5.99},
    "tarragona": {"nombre": "Puerto de Tarragona", "ccaa": "Cataluña", "lat": 41.12, "lng": 1.18},
    "valencia": {"nombre": "Puerto de Valencia", "ccaa": "C. Valenciana", "lat": 39.45, "lng": -0.32},
    "vigo": {"nombre": "Puerto de Vigo", "ccaa": "Galicia", "lat": 42.24, "lng": -8.72},
    "vizcaya": {"nombre": "Puerto de Bilbao", "ccaa": "País Vasco", "lat": 43.33, "lng": -2.96},
}


def fetch_puertos_estado() -> list:
    """Obtiene datos de Puertos del Estado API."""
    url = "https://portus.puertos.es/portus/api/v1/real_time"
    try:
        resp = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            return resp.json().get("ports", [])
    except:
        pass
    return []


def fetch_puerto_datos(puerto_id: str) -> dict:
    """Obtiene datos en tiempo real de un puerto."""
    urls = [
        f"https://portus.puertos.es/portus/api/v1/real_time/{puerto_id}",
        f"https://portus.puertos.es/portus/api/v1/stations/{puerto_id}",
    ]
    for url in urls:
        try:
            resp = requests.get(url, timeout=15)
            if resp.status_code == 200:
                return resp.json()
        except:
            pass
    return {}


def fetch_humedal_oleaje(puerto_id: str) -> dict:
    """Obtiene datos de oleaje y humedal."""
    url = f"https://portus.puertos.es/portus/api/v1/stations/{puerto_id}/wave"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return {}


def scrape_puertos():
    """Scrapea datos de todos los puertos principales."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("⚓ Puertos del Estado\n")
    
    # 1. Datos generales de Puertos del Estado
    print("  🌊 Intentando API Puertos del Estado...")
    puertos_data = fetch_puertos_estado()
    if puertos_data:
        print(f"     ✅ {len(puertos_data)} puertos desde API")
    else:
        print("     ⚠️ API no disponible, usando catálogo local")
    
    # 2. Datos por puerto
    catalogo = []
    for puerto_id, info in PUERTOS.items():
        print(f"  🚢 {info['nombre']}...", end=" ")
        
        datos = fetch_puerto_datos(puerto_id)
        oleaje = fetch_humedal_oleaje(puerto_id)
        
        entry = {
            "id": puerto_id,
            "nombre": info["nombre"],
            "ccaa": info["ccaa"],
            "coordenadas": {"lat": info["lat"], "lng": info["lng"]},
            "datos": datos if datos else None,
            "oleaje": oleaje if oleaje else None,
        }
        catalogo.append(entry)
        
        print("✅" if datos else "⚠️")
        time.sleep(0.3)
    
    # Guardar catálogo
    with open(DATA_DIR / "catalogo.json", "w", encoding="utf-8") as f:
        json.dump(catalogo, f, ensure_ascii=False, indent=2)
    
    # Guardar por puerto
    for entry in catalogo:
        with open(DATA_DIR / f"puerto_{entry['id']}.json", "w", encoding="utf-8") as f:
            json.dump(entry, f, ensure_ascii=False, indent=2)
    
    index = {
        "fecha": date.today().isoformat(),
        "total_puertos": len(catalogo),
        "con_datos": sum(1 for e in catalogo if e["datos"]),
        "puertos": [e["nombre"] for e in catalogo]
    }
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n  ✅ {len(catalogo)} puertos mapeados")
    return index


if __name__ == "__main__":
    scrape_puertos()
