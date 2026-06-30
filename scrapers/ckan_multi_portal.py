#!/usr/bin/env python3
"""
Scraper CKAN Genérico Multi-Portal
Recorre portales CKAN de datos abiertos españoles y descarga catálogos + metadatos.
Portales: Asturias, Euskadi, Galicia, Cataluña, Andalucía, Navarra, Aragón, etc.
"""
import json
import os
import sys
import time
import requests
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "ckan"

# Portales CKAN españoles conocidos
PORTALES = {
    "aragon": {
        "nombre": "Aragón Open Data",
        "base": "https://opendata.aragon.es/api/3/action",
        "web": "https://opendata.aragon.es",
        "ccaa": "Aragón"
    },
    "madrid_ayunt": {
        "nombre": "Ayuntamiento de Madrid",
        "base": "https://datos.madrid.es/api/3/action",
        "web": "https://datos.madrid.es",
        "ccaa": "C. de Madrid"
    },
    "gob_ar": {
        "nombre": "Argentina Abierto",
        "base": "https://datos.gob.ar/api/action",
        "web": "https://datos.gob.ar",
        "ccaa": "Argentina"
    },
}


def test_portal(portal_id: str, config: dict) -> dict:
    """Testea si un portal CKAN responde."""
    base = config["base"]
    try:
        resp = requests.get(f"{base}/package_search?rows=1", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success"):
                count = data.get("result", {}).get("count", 0)
                return {"status": "ok", "datasets": count}
    except:
        pass
    return {"status": "offline"}


def fetch_ckan_datasets(base_url: str, rows: int = 50, start: int = 0) -> list:
    """Obtiene datasets de un portal CKAN."""
    url = f"{base_url}/package_search"
    params = {"rows": rows, "start": start}
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("result", {}).get("results", [])
    except Exception as e:
        print(f"  Error: {e}")
        return []


def fetch_ckan_package(base_url: str, package_id: str) -> dict:
    """Obtiene un dataset específico."""
    url = f"{base_url}/package_show"
    params = {"id": package_id}
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json().get("result", {})
    except:
        return {}


def fetch_ckan_orgs(base_url: str) -> list:
    """Obtiene organizaciones del portal."""
    url = f"{base_url}/organization_list"
    params = {"all_fields": "true"}
    try:
        resp = requests.get(url, params=params, timeout=30)
        return resp.json().get("result", [])
    except:
        return []


def fetch_ckan_tags(base_url: str) -> list:
    """Obtiene etiquetas/taxonomías del portal."""
    url = f"{base_url}/tag_list"
    params = {"all_fields": "true"}
    try:
        resp = requests.get(url, params=params, timeout=30)
        return resp.json().get("result", [])
    except:
        return []


def scrape_portal_full(portal_id: str, config: dict, max_datasets: int = 200):
    """Scrapea un portal CKAN completo: catálogo + organizaciones + tags."""
    portal_dir = DATA_DIR / portal_id
    portal_dir.mkdir(parents=True, exist_ok=True)
    
    base = config["base"]
    print(f"\n🌐 {config['nombre']} ({config['ccaa']})")
    
    # 1. Organizaciones
    orgs = fetch_ckan_orgs(base)
    print(f"  📁 Organizaciones: {len(orgs)}")
    
    # 2. Tags
    tags = fetch_ckan_tags(base)
    print(f"  🏷️ Etiquetas: {len(tags)}")
    
    # 3. Datasets (paginados)
    all_datasets = []
    start = 0
    batch = 50
    
    while start < max_datasets:
        datasets = fetch_ckan_datasets(base, rows=batch, start=start)
        if not datasets:
            break
        all_datasets.extend(datasets)
        start += batch
        print(f"  📊 Datasets: {len(all_datasets)}...", end="\r")
        time.sleep(0.3)
    
    print(f"  📊 Total datasets: {len(all_datasets)}")
    
    # 4. Extraer metadatos relevantes
    catalogo = []
    for ds in all_datasets:
        recursos = []
        for r in ds.get("resources", []):
            recursos.append({
                "nombre": r.get("name", ""),
                "formato": r.get("format", ""),
                "url": r.get("url", ""),
                "tamaño": r.get("size", 0)
            })
        
        catalogo.append({
            "id": ds.get("name", ""),
            "titulo": ds.get("title", ""),
            "descripcion": (ds.get("notes", "") or "")[:500],
            "organizacion": ds.get("organization", {}).get("title", "") if ds.get("organization") else "",
            "etiquetas": [t.get("name", "") for t in ds.get("tags", [])],
            "fecha_creacion": ds.get("metadata_created", ""),
            "fecha_modificacion": ds.get("metadata_modified", ""),
            "recursos": recursos,
            "total_recursos": len(recursos)
        })
    
    # 5. Guardar catálogo
    with open(portal_dir / "catalogo.json", "w", encoding="utf-8") as f:
        json.dump(catalogo, f, ensure_ascii=False, indent=2)
    
    # 6. Guardar organizaciones
    with open(portal_dir / "organizaciones.json", "w", encoding="utf-8") as f:
        json.dump([{"id": o.get("name"), "nombre": o.get("title"), "datasets": o.get("package_count", 0)} for o in orgs], f, ensure_ascii=False, indent=2)
    
    # 7. Guardar tags
    with open(portal_dir / "tags.json", "w", encoding="utf-8") as f:
        json.dump(tags, f, ensure_ascii=False, indent=2)
    
    # 8. Estadísticas por formato
    formatos = {}
    for ds in catalogo:
        for r in ds["recursos"]:
            fmt = r["formato"].upper()
            if fmt:
                formatos[fmt] = formatos.get(fmt, 0) + 1
    
    # 9. Guardar índice
    index = {
        "portal": portal_id,
        "nombre": config["nombre"],
        "ccaa": config["ccaa"],
        "web": config["web"],
        "total_datasets": len(catalogo),
        "total_recursos": sum(d["total_recursos"] for d in catalogo),
        "organizaciones": len(orgs),
        "etiquetas": len(tags),
        "formatos": dict(sorted(formatos.items(), key=lambda x: -x[1])[:20])
    }
    with open(portal_dir / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"  ✅ Guardado: {len(catalogo)} datasets, {index['total_recursos']} recursos")
    print(f"     Formatos: {', '.join(f'{k}:{v}' for k,v in list(formatos.items())[:5])}")
    
    return index


def scrape_all_portals(max_datasets: int = 200):
    """Scrapea todos los portales configurados."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    resultados = {}
    
    for portal_id, config in PORTALES.items():
        try:
            result = scrape_portal_full(portal_id, config, max_datasets)
            resultados[portal_id] = result
        except Exception as e:
            print(f"  ❌ Error en {portal_id}: {e}")
            resultados[portal_id] = {"status": "error", "error": str(e)}
        
        time.sleep(0.5)
    
    # Índice maestro
    with open(DATA_DIR / "portales_index.json", "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)
    
    total_ds = sum(r.get("total_datasets", 0) for r in resultados.values())
    total_r = sum(r.get("total_recursos", 0) for r in resultados.values())
    activos = sum(1 for r in resultados.values() if r.get("total_datasets", 0) > 0)
    
    print(f"\n{'='*60}")
    print(f"✅ COMPLETADO: {activos} portales activos")
    print(f"   Total datasets: {total_ds}")
    print(f"   Total recursos: {total_r}")
    
    return resultados


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Scraper CKAN Multi-Portal")
    parser.add_argument("--all", action="store_true", help="Scrapear todos los portales")
    parser.add_argument("--test", action="store_true", help="Testear qué portales responden")
    parser.add_argument("--portal", help="Scrapear un portal específico")
    parser.add_argument("--max", type=int, default=200, help="Max datasets por portal")
    args = parser.parse_args()
    
    if args.test:
        print("🔍 Testeando portales CKAN de España:\n")
        for pid, config in PORTALES.items():
            result = test_portal(pid, config)
            status = "✅" if result["status"] == "ok" else "❌"
            count = result.get("datasets", 0)
            print(f"  {status} {config['nombre']}: {count} datasets")
    elif args.portal:
        if args.portal in PORTALES:
            scrape_portal_full(args.portal, PORTALES[args.portal], args.max)
        else:
            print(f"Portal no encontrado: {args.portal}")
            print(f"Disponibles: {', '.join(PORTALES.keys())}")
    elif args.all:
        scrape_all_portals(args.max)
    else:
        scrape_all_portals(args.max)
