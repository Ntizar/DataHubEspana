#!/usr/bin/env python3
"""
Scraper SIU - Sistema de Información Urbana (MITMA)
5.898 municipios: suelo, urbanismo, vivienda, planeamiento.
API: siu.ministerio.cl
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import date

DATA_DIR = Path(__file__).parent.parent / "data" / "siu_mitma"


def fetch_siu_municipios() -> list:
    """Obtiene listado de municipios del SIU."""
    url = "https://siu.ministerio.cl/api/municipios"
    try:
        resp = requests.get(url, timeout=60)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return []


def fetch_siu_datos_municipio(codigo_municipio: str) -> dict:
    """Obtiene datos de un municipio específico."""
    urls = [
        f"https://siu.ministerio.cl/api/municipio/{codigo_municipio}",
        f"https://siu.ministerio.cl/api/municipios/{codigo_municipio}",
    ]
    for url in urls:
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code == 200:
                return resp.json()
        except:
            pass
    return {}


def fetch_siu_estadisticas() -> dict:
    """Obtiene estadísticas generales del SIU."""
    url = "https://siu.ministerio.cl/api/estadisticas"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return {}


def fetch_siu_suelo() -> list:
    """Obtiene datos de suelo."""
    url = "https://siu.ministerio.cl/api/suelo"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return []


def fetch_siu_planeamiento() -> list:
    """Obtiene información de planeamiento urbanístico."""
    url = "https://siu.ministerio.cl/api/planeamiento"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return []


def scrape_siu():
    """Scrapea datos del SIU MITMA."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("🏗️ SIU MITMA - Urbanismo\n")
    
    # 1. Municipios
    print("  🏘️ Listado de municipios...")
    municipios = fetch_siu_municipios()
    print(f"     {len(municipios)} municipios")
    
    # 2. Estadísticas
    print("  📊 Estadísticas generales...")
    estadisticas = fetch_siu_estadisticas()
    print(f"     {'✅' if estadisticas else '⚠️'}")
    
    # 3. Suelo
    print("  🏗️ Datos de suelo...")
    suelo = fetch_siu_suelo()
    print(f"     {len(suelo)} registros")
    
    # 4. Planeamiento
    print("  📋 Planeamiento urbanístico...")
    planeamiento = fetch_siu_planeamiento()
    print(f"     {len(planeamiento)} registros")
    
    # Guardar
    with open(DATA_DIR / "municipios.json", "w", encoding="utf-8") as f:
        json.dump(municipios, f, ensure_ascii=False, indent=2)
    
    with open(DATA_DIR / "estadisticas.json", "w", encoding="utf-8") as f:
        json.dump(estadisticas, f, ensure_ascii=False, indent=2)
    
    with open(DATA_DIR / "suelo.json", "w", encoding="utf-8") as f:
        json.dump(suelo, f, ensure_ascii=False, indent=2)
    
    with open(DATA_DIR / "planeamiento.json", "w", encoding="utf-8") as f:
        json.dump(planeamiento, f, ensure_ascii=False, indent=2)
    
    index = {
        "fecha": date.today().isoformat(),
        "municipios": len(municipios),
        "estadisticas": bool(estadisticas),
        "suelo": len(suelo),
        "planeamiento": len(planeamiento)
    }
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n  ✅ SIU completado")
    return index


if __name__ == "__main__":
    scrape_siu()
