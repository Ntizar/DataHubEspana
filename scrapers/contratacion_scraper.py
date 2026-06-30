#!/usr/bin/env python3
"""
Scraper Contratación Pública España
Plataformas de contratación: nacional, autonómicas, municipales.
API pública: contrataciondelestado.es
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import date, timedelta

DATA_DIR = Path(__file__).parent.parent / "data" / "contratacion"

# Plataformas de contratación conocidas
PLATAFORMAS = {
    "nacional": {
        "nombre": "Plataforma de Contratación del Sector Público",
        "web": "https://contrataciondelestado.es",
        "api": "https://contrataciondelestado.es/wps/poc/schemas"
    },
    "ministerios": {
        "nombre": "Contratación por Ministerios",
        "web": "https://contrataciondelestado.es/wps/poc/inicio"
    },
    "comunidades": {
        "nombre": "Plataformas Autonómicas",
        "web": "https://contrataciondelestado.es/wps/portal/plataforma"
    }
}


def fetch_plataforma_nacional() -> list:
    """Obtiene contratos de la plataforma nacional."""
    # API de búsqueda
    url = "https://contrataciondelestado.es/wps/poc/schemas/contratoCompleto"
    try:
        resp = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            return resp.json() if resp.headers.get("content-type", "").startswith("application/json") else []
    except:
        pass
    return []


def fetch_contratacion_perfil() -> list:
    """Obtiene datos del perfil de contratación."""
    url = "https://contrataciondelestado.es/wps/poc/abrirperfilcontratante"
    try:
        resp = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            return resp.json() if resp.headers.get("content-type", "").startswith("application/json") else []
    except:
        pass
    return []


def fetch_boe_contrataciones() -> list:
    """Busca contrataciones en el BOE."""
    url = "https://www.boe.es/datosabiertos/api/boe/sumario/"
    fecha = date.today().strftime("%Y%m%d")
    try:
        resp = requests.get(f"{url}{fecha}", timeout=30,
                          headers={"Accept": "application/json"})
        if resp.status_code == 200:
            data = resp.json()
            contratos = []
            try:
                for seccion in data["data"]["sumario"]["diario"][0].get("seccion", []):
                    codigo = seccion.get("codigo", "")
                    if codigo == "B":  # B = Contrataciones
                        items = seccion.get("item", [])
                        if isinstance(items, dict):
                            items = [items]
                        for item in items:
                            contratos.append({
                                "tipo": "contrato",
                                "fecha": fecha,
                                "organismo": item.get("organismo", ""),
                                "titulo": item.get("titulo", ""),
                                "id": item.get("identificador", ""),
                            })
            except:
                pass
            return contratos
    except:
        pass
    return []


def fetch_dog_contrataciones() -> list:
    """Intenta obtener contrataciones del Diario Oficial Galicia."""
    url = "https://www.xunta.gal/dog/api/v1/sumario"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return []


def scrape_contratacion():
    """Scrapea contratación pública de múltiples fuentes."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("📝 Contratación Pública\n")
    
    # 1. Plataforma nacional
    print("  🏛️ Plataforma nacional...")
    nacional = fetch_plataforma_nacional()
    print(f"     {len(nacional)} contratos nacionales")
    
    # 2. Perfil contratante
    print("  👤 Perfiles de contratante...")
    perfiles = fetch_contratacion_perfil()
    print(f"     {len(perfiles)} perfiles")
    
    # 3. BOE contrataciones
    print("  📋 BOE contrataciones...")
    boe = fetch_boe_contrataciones()
    print(f"     {len(boe)} contratos BOE")
    
    # Guardar
    with open(DATA_DIR / "nacional.json", "w", encoding="utf-8") as f:
        json.dump(nacional, f, ensure_ascii=False, indent=2)
    
    with open(DATA_DIR / "perfiles.json", "w", encoding="utf-8") as f:
        json.dump(perfiles, f, ensure_ascii=False, indent=2)
    
    with open(DATA_DIR / "boe_contrataciones.json", "w", encoding="utf-8") as f:
        json.dump(boe, f, ensure_ascii=False, indent=2)
    
    index = {
        "fecha": date.today().isoformat(),
        "nacional": len(nacional),
        "perfiles": len(perfiles),
        "boe": len(boe)
    }
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n  ✅ Contratación completada")
    return index


if __name__ == "__main__":
    scrape_contratacion()
