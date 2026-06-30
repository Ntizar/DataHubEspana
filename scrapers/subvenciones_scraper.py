#!/usr/bin/env python3
"""
Scraper Subvenciones España
BDNS (Base de Datos Nacional de Subvenciones) + BOE.
API pública sin auth.
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import date, timedelta

DATA_DIR = Path(__file__).parent.parent / "data" / "subvenciones"


def fetch_bdns_search(query: str = "", page: int = 1) -> dict:
    """Busca subvenciones en el BDNS."""
    url = "https://subvenciones.mrrf.es/bdnstrans/search"
    params = {
        "q": query,
        "page": page,
        "numRows": 20
    }
    try:
        resp = requests.get(url, params=params, timeout=30,
                          headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return {}


def fetch_bdns_ultimas(page: int = 1) -> list:
    """Obtiene las últimas subvenciones publicadas."""
    url = "https://subvenciones.mrrf.es/bdnstrans/search"
    params = {
        "page": page,
        "numRows": 50,
        "sort": "fecha_publicacion",
        "order": "desc"
    }
    try:
        resp = requests.get(url, params=params, timeout=30,
                          headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            data = resp.json()
            return data.get("results", data.get("items", []))
    except:
        pass
    return []


def fetch_boe_subvenciones() -> list:
    """Busca subvenciones en el BOE."""
    url = "https://www.boe.es/datosabiertos/api/boe/sumario/"
    # Usar fecha de hoy
    fecha = date.today().strftime("%Y%m%d")
    try:
        resp = requests.get(f"{url}{fecha}", timeout=30,
                          headers={"Accept": "application/json"})
        if resp.status_code == 200:
            data = resp.json()
            # Filtrar secciones de subvenciones (D, E)
            disposiciones = []
            try:
                for seccion in data["data"]["sumario"]["diario"][0].get("seccion", []):
                    codigo = seccion.get("codigo", "")
                    if codigo in ["D", "E"]:  # D = subvenciones, E = otros
                        items = seccion.get("item", [])
                        if isinstance(items, dict):
                            items = [items]
                        for item in items:
                            disposiciones.append({
                                "tipo": "boe_subvencion",
                                "fecha": fecha,
                                "seccion": codigo,
                                "organismo": item.get("organismo", ""),
                                "titulo": item.get("titulo", ""),
                                "id": item.get("identificador", ""),
                            })
            except:
                pass
            return disposiciones
    except:
        pass
    return []


def fetch_gob_es_subvenciones() -> list:
    """Busca subvenciones en datos.gob.es (si accesible)."""
    url = "https://datos.gob.es/apidata/catalog/dataset"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("result", {}).get("items", [])
            return [r for r in results if "subvencion" in r.get("title", "").lower()]
    except:
        pass
    return []


def scrape_subvenciones():
    """Scrapea subvenciones de múltiples fuentes."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("💰 Subvenciones España\n")
    
    # 1. BDNS
    print("  📋 BDNS - Últimas subvenciones...")
    bdns = fetch_bdns_ultimas()
    print(f"     {len(bdns)} subvenciones BDNS")
    
    # 2. BOE subvenciones
    print("  📋 BOE - Subvenciones...")
    boe = fetch_boe_subvenciones()
    print(f"     {len(boe)} disposiciones BOE")
    
    # 3. datos.gob.es
    print("  📋 datos.gob.es - Subvenciones...")
    gob = fetch_gob_es_subvenciones()
    print(f"     {len(gob)} datasets gob.es")
    
    # Guardar
    all_subvenciones = bdns + boe + gob
    
    with open(DATA_DIR / "bdns.json", "w", encoding="utf-8") as f:
        json.dump(bdns, f, ensure_ascii=False, indent=2)
    
    with open(DATA_DIR / "boe_subvenciones.json", "w", encoding="utf-8") as f:
        json.dump(boe, f, ensure_ascii=False, indent=2)
    
    with open(DATA_DIR / "gob_es.json", "w", encoding="utf-8") as f:
        json.dump(gob, f, ensure_ascii=False, indent=2)
    
    index = {
        "fecha": date.today().isoformat(),
        "bdns": len(bdns),
        "boe": len(boe),
        "gob_es": len(gob),
        "total": len(all_subvenciones)
    }
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n  ✅ Total: {len(all_subvenciones)} subvenciones")
    return index


if __name__ == "__main__":
    scrape_subvenciones()
