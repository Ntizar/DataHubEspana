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

# BDNS - Base de Datos Nacional de Subvenciones
# El BDNS tiene un endpoint de búsqueda pública
BDNS_URL = "https://subvenciones.mpr.gob.es/bdnstrans/busqueda"
BDNS_API = "https://subvenciones.mpr.gob.es/bdnstrans/api"


def fetch_bdns_search(query: str = "", page: int = 1) -> dict:
    """Busca subvenciones en el BDNS."""
    # El BDNS usa un formulario web, pero tiene endpoint de búsqueda
    params = {
        "q": query,
        "page": page,
        "numRows": 20
    }
    try:
        resp = requests.get(BDNS_URL, params=params, timeout=30,
                          headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "")
            if "json" in content_type:
                return resp.json()
            # Si devuelve HTML, intentar parsear
            if "html" in content_type:
                return parse_bdns_html(resp.text)
    except:
        pass
    return {}


def parse_bdns_html(html: str) -> dict:
    """Parsea el HTML del BDNS si no devuelve JSON."""
    import re
    results = []
    # Buscar entradas de subvenciones en el HTML
    entries = re.findall(r'<div class="result-item">(.*?)</div>', html, re.DOTALL)
    for entry in entries:
        titulo = re.search(r'<h[34][^>]*>(.*?)</h[34]>', entry)
        organismo = re.search(r'Organismo:\s*<[^>]*>(.*?)<', entry)
        importe = re.search(r'Importe:\s*<[^>]*>(.*?)<', entry)
        if titulo:
            results.append({
                "titulo": titulo.group(1).strip(),
                "organismo": organismo.group(1).strip() if organismo else "",
                "importe": importe.group(1).strip() if importe else "",
            })
    return {"results": results, "total": len(results)}


def fetch_bdns_ultimas(page: int = 1) -> list:
    """Obtiene las últimas subvenciones publicadas."""
    # Intentar API directa
    for url in [BDNS_API + "/search", BDNS_URL]:
        params = {
            "page": page,
            "numRows": 50,
            "sort": "fecha_publicacion",
            "order": "desc"
        }
        try:
            resp = requests.get(url, params=params, timeout=30,
                              headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
            if resp.status_code == 200:
                content_type = resp.headers.get("content-type", "")
                if "json" in content_type:
                    data = resp.json()
                    return data.get("results", data.get("items", []))
                elif "html" in content_type:
                    parsed = parse_bdns_html(resp.text)
                    return parsed.get("results", [])
        except:
            pass
    return []


def fetch_boe_subvenciones() -> list:
    """Busca subvenciones en el BOE (secciones D y E)."""
    url = "https://www.boe.es/datosabiertos/api/boe/sumario/"
    # Probar hoy y ayer (puede que hoy no esté publicado aún)
    for dias_atras in range(0, 4):
        fecha = (date.today() - timedelta(days=dias_atras)).strftime("%Y%m%d")
        try:
            resp = requests.get(f"{url}{fecha}", timeout=30,
                              headers={"Accept": "application/json"})
            if resp.status_code == 200:
                data = resp.json()
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
                    if disposiciones:
                        return disposiciones
                except:
                    pass
            time.sleep(0.3)
        except:
            pass
    return []


def fetch_gob_es_subvenciones() -> list:
    """Busca datasets de subvenciones en datos.gob.es."""
    url = "https://datos.gob.es/apidata/catalog/dataset"
    params = {"q": "subvenciones", "_pageSize": 20}
    try:
        resp = requests.get(url, params=params, timeout=15,
                          headers={"Accept": "application/json"})
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("result", {}).get("items", [])
            return [{"titulo": r.get("title", ""), "url": r.get("_about", "")} for r in results]
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
