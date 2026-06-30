#!/usr/bin/env python3
"""
Scraper datos.gob.es - Catálogo Nacional de Datos Abiertos
Catálogo DCAT con miles de datasets de toda España.
API: datos.gob.es/apidata/catalog/dataset.json
"""
import json
import os
import sys
import time
import requests
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "datos_gob"
BASE_URL = "https://datos.gob.es/apidata/catalog/dataset.json"


def fetch_datasets_page(page: int = 0) -> dict:
    """Obtiene una página del catálogo."""
    url = f"{BASE_URL}?_page={page}"
    try:
        resp = requests.get(url, timeout=30, headers={"Accept": "application/json"})
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"  Error página {page}: {e}")
    return {}


def parse_dataset(item: dict) -> dict:
    """Parsea un dataset del catálogo DCAT."""
    # Título
    titulo = ""
    if "title" in item:
        if isinstance(item["title"], list):
            for t in item["title"]:
                if isinstance(t, dict) and t.get("_lang") == "es":
                    titulo = t.get("_value", "")
                    break
            if not titulo and item["title"]:
                titulo = item["title"][0].get("_value", "") if isinstance(item["title"][0], dict) else str(item["title"][0])
    
    # Descripción
    desc = ""
    if "description" in item:
        if isinstance(item["description"], list):
            for d in item["description"]:
                if isinstance(d, dict) and d.get("_lang") == "es":
                    desc = d.get("_value", "")[:500]
                    break
            if not desc and item["description"]:
                desc = item["description"][0].get("_value", "")[:500] if isinstance(item["description"][0], dict) else str(item["description"][0])[:500]
    
    # Distribuciones (archivos)
    dists = []
    dist_data = item.get("distribution", [])
    if isinstance(dist_data, dict):
        dist_data = [dist_data]
    
    for d in dist_data:
        formato = ""
        if "format" in d:
            fmt = d["format"]
            if isinstance(fmt, dict):
                formato = fmt.get("value", fmt.get("_about", "")).split("/")[-1].upper()
            elif isinstance(fmt, str):
                formato = fmt.split("/")[-1].upper()
        
        access_url = d.get("accessURL", "")
        
        dists.append({
            "formato": formato,
            "url": access_url,
            "titulo": d.get("title", [{"_value": ""}])[0].get("_value", "") if isinstance(d.get("title"), list) else d.get("title", "")
        })
    
    # Palabras clave
    keywords = []
    if "keyword" in item:
        kw_data = item["keyword"]
        if isinstance(kw_data, list):
            for kw in kw_data:
                if isinstance(kw, dict):
                    keywords.append(kw.get("_value", ""))
                elif isinstance(kw, str):
                    keywords.append(kw)
    
    # Territorio
    spatial = ""
    if "spatial" in item:
        sp = item["spatial"]
        if isinstance(sp, str):
            spatial = sp.split("/")[-1]
    
    # Sector
    themes = []
    if "theme" in item:
        th = item["theme"]
        if isinstance(th, list):
            for t in th:
                if isinstance(t, str):
                    themes.append(t.split("/")[-1])
                elif isinstance(t, dict):
                    themes.append(t.get("_value", "").split("/")[-1])
        elif isinstance(th, str):
            themes.append(th.split("/")[-1])
    
    return {
        "id": item.get("identifier", item.get("_about", "")).split("/")[-1],
        "titulo": titulo,
        "descripcion": desc,
        "territorio": spatial,
        "temas": themes,
        "palabras_clave": [k for k in keywords if k],
        "distribuciones": dists,
        "total_recursos": len(dists),
        "formatos": list(set(d["formato"] for d in dists if d["formato"]))
    }


def scrape_datos_gob_es(max_datasets: int = 500):
    """Scrapea el catálogo de datos.gob.es."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("🇪🇸 datos.gob.es - Catálogo Nacional\\n")
    
    all_datasets = []
    page = 0
    
    while len(all_datasets) < max_datasets:
        print(f"  📄 Página {page}...", end="\\r")
        
        resp = fetch_datasets_page(page)
        if not resp:
            break
        data = resp  # fetch_datasets_page already returns json
        if not data:
            break
        
        result = data.get("result", {})
        items = result.get("items", [])
        if not items:
            break
        
        for item in items:
            try:
                parsed = parse_dataset(item)
                all_datasets.append(parsed)
            except Exception as e:
                pass
        
        page += 1
        time.sleep(0.5)
    
    print(f"  📊 Total datasets: {len(all_datasets)}     ")
    
    # Guardar catálogo completo
    with open(DATA_DIR / "catalogo.json", "w", encoding="utf-8") as f:
        json.dump(all_datasets, f, ensure_ascii=False, indent=2)
    
    # Estadísticas
    formatos = {}
    territorios = {}
    temas = {}
    
    for ds in all_datasets:
        for fmt in ds["formatos"]:
            formatos[fmt] = formatos.get(fmt, 0) + 1
        
        terr = ds["territorio"]
        if terr:
            territorios[terr] = territorios.get(terr, 0) + 1
        
        for tema in ds["temas"]:
            temas[tema] = temas.get(tema, 0) + 1
    
    index = {
        "total_datasets": len(all_datasets),
        "total_recursos": sum(d["total_recursos"] for d in all_datasets),
        "formatos": dict(sorted(formatos.items(), key=lambda x: -x[1])[:20]),
        "territorios": dict(sorted(territorios.items(), key=lambda x: -x[1])[:30]),
        "temas": dict(sorted(temas.items(), key=lambda x: -x[1])[:20]),
        "paginas": page
    }
    
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\\n  ✅ {len(all_datasets)} datasets, {index['total_recursos']} recursos")
    print(f"     Top temas: {', '.join(list(temas.keys())[:5])}")
    print(f"     Top territorios: {', '.join(list(territorios.keys())[:5])}")
    
    return index


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--max", type=int, default=500, help="Max datasets")
    args = parser.parse_args()
    scrape_datos_gob_es(args.max)
