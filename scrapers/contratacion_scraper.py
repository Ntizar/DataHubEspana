#!/usr/bin/env python3
"""
Scraper Contratación Pública España
Plataformas de contratación: nacional, autonómicas, municipales.
API: BOE (sección B) + datos.gob.es + plataforma nacional
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import date, timedelta

DATA_DIR = Path(__file__).parent.parent / "data" / "contratacion"

# Plataforma de Contratación del Sector Público
PLATAFORMA_URL = "https://contrataciondelestado.es"


def fetch_plataforma_nacional() -> list:
    """Obtiene licitaciones de la plataforma nacional vía búsqueda."""
    # La plataforma tiene un endpoint de búsqueda SOAP/XML
    # Usar el endpoint público de búsqueda
    url = f"{PLATAFORMA_URL}/wps/poc/schemas/contratoCompleto"
    try:
        resp = requests.get(url, timeout=30,
                          headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "")
            if "json" in content_type:
                return resp.json()
    except:
        pass

    # Fallback: buscar en datos.gob.es
    try:
        url = "https://datos.gob.es/apidata/catalog/dataset"
        params = {"q": "contratación pública", "_pageSize": 20}
        resp = requests.get(url, params=params, timeout=15,
                          headers={"Accept": "application/json"})
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("result", {}).get("items", [])
            return [{"titulo": r.get("title", ""), "url": r.get("_about", "")} for r in results]
    except:
        pass
    return []


def fetch_contratacion_perfil() -> list:
    """Obtiene perfiles de contratación disponibles."""
    # La plataforma nacional tiene una lista de perfiles del contratante
    try:
        url = f"{PLATAFORMA_URL}/wps/poc/abrirperfilcontratante"
        resp = requests.get(url, timeout=30,
                          headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            # La plataforma devuelve HTML, buscar enlaces a perfiles
            import re
            perfiles = []
            matches = re.findall(r'href="(/wps/portal/[^"]*perfilcontratante[^"]*)"[^>]*>([^<]+)', resp.text)
            for href, nombre in matches:
                perfiles.append({
                    "nombre": nombre.strip(),
                    "url": f"{PLATAFORMA_URL}{href}"
                })
            if perfiles:
                return perfiles
    except:
        pass
    return []


def fetch_boe_contrataciones() -> list:
    """Busca contrataciones en el BOE (sección B)."""
    url = "https://www.boe.es/datosabiertos/api/boe/sumario/"
    # Probar hoy y días anteriores
    for dias_atras in range(0, 4):
        fecha = (date.today() - timedelta(days=dias_atras)).strftime("%Y%m%d")
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
                    if contratos:
                        return contratos
                except:
                    pass
            time.sleep(0.3)
        except:
            pass
    return []


def fetch_dog_contrataciones() -> list:
    """Obtiene contrataciones del Diario Oficial de Galicia."""
    url = "https://www.xunta.gal/dog/api/v1/sumario"
    try:
        resp = requests.get(url, timeout=15,
                          headers={"Accept": "application/json"})
        if resp.status_code == 200:
            return resp.json().get("result", [])
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
    print(f"     {len(nacional)} contratos/datasets nacionales")

    # 2. Perfil contratante
    print("  👤 Perfiles de contratante...")
    perfiles = fetch_contratacion_perfil()
    print(f"     {len(perfiles)} perfiles")

    # 3. BOE contrataciones
    print("  📋 BOE contrataciones...")
    boe = fetch_boe_contrataciones()
    print(f"     {len(boe)} contratos BOE")

    # 4. DOG (Galicia)
    print("  📋 DOG Galicia...")
    dog = fetch_dog_contrataciones()
    print(f"     {len(dog)} entradas DOG")

    # Guardar
    with open(DATA_DIR / "nacional.json", "w", encoding="utf-8") as f:
        json.dump(nacional, f, ensure_ascii=False, indent=2)

    with open(DATA_DIR / "perfiles.json", "w", encoding="utf-8") as f:
        json.dump(perfiles, f, ensure_ascii=False, indent=2)

    with open(DATA_DIR / "boe_contrataciones.json", "w", encoding="utf-8") as f:
        json.dump(boe, f, ensure_ascii=False, indent=2)

    with open(DATA_DIR / "dog_galicia.json", "w", encoding="utf-8") as f:
        json.dump(dog, f, ensure_ascii=False, indent=2)

    index = {
        "fecha": date.today().isoformat(),
        "nacional": len(nacional),
        "perfiles": len(perfiles),
        "boe": len(boe),
        "dog": len(dog)
    }
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    print(f"\n  ✅ Contratación completada")
    return index


if __name__ == "__main__":
    scrape_contratacion()
