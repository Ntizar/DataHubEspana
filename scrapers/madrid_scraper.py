#!/usr/bin/env python3
"""
Scraper Madrid - Portal de Datos Abiertos del Ayuntamiento de Madrid
Extrae tráfico, aparcamientos, urbanismo, servicios sociales.
Fuente: API CKAN datos.madrid.es
"""
import json
import os
import sys
import time
import requests
from datetime import date
from pathlib import Path

CKAN_BASE = "https://datos.madrid.es/api/3/action"
DATA_DIR = Path(__file__).parent.parent / "data" / "madrid"

# Datasets de alto valor de Madrid
DATASETS_CLAVE = {
    # Transporte
    "300227-0-emt-bus-real-time": {"nombre": "EMT Tiempo real autobuses", "categoria": "transporte"},
    "300230-0-puntomas-tiempo-real": {"nombre": "Puntomas tierra real time", "categoria": "transporte"},
    "300009-30-taxis-datos-abiertos": {"nombre": "Taxis", "categoria": "transporte"},
    "207316-0-bicimad-datos-abiertos": {"nombre": "BiciMAD estaciones", "categoria": "transporte"},
    "206117-0-aparca-bicis": {"nombre": "Aparcamientos bicicletas", "categoria": "transporte"},
    "202611-0-censo-calles": {"nombre": "Censo calles", "categoria": "transporte"},
    
    # Tráfico
    "208305-0-semaforos-tiempo-real": {"nombre": "Semáforos tiempo real", "categoria": "trafico"},
    "202612-0-mobiliario-urbano-otro": {"nombre": "Moviliario urbano", "categoria": "trafico"},
    
    # Aparcamientos
    "208303-0-aparcamientos-rotacionales": {"nombre": "Aparcamientos públicos", "categoria": "aparcamiento"},
    
    # Urbanismo
    "232993-0-normativa-municipal": {"nombre": "Normativa municipal", "categoria": "urbanismo"},
    
    # Servicios
    "200652-0-censo-locales": {"nombre": "Censo locales", "categoria": "servicios"},
    "50055-0-fuentes-mascotas": {"nombre": "Fuentes mascotas", "categoria": "servicios"},
    "300051-0-fuentes": {"nombre": "Fuentes públicas", "categoria": "servicios"},
    "300390-0-areas-deportivas": {"nombre": "Áreas deportivas", "categoria": "servicios"},
    "200637-0-areas-mayores": {"nombre": "Áreas mayores", "categoria": "servicios"},
    "200652-0-areas-infantiles": {"nombre": "Áreas infantiles", "categoria": "servicios"},
    "300094-0-areas-caninas": {"nombre": "Áreas caninas", "categoria": "servicios"},
    
    # Moviliario urbano
    "300095-0-mobiliario-bancos": {"nombre": "Bancos", "categoria": "mobiliario"},
    "300096-0-mobiliario-papeleras": {"nombre": "Papeleras", "categoria": "mobiliario"},
    "300395-0-mobiliario-urbano-mayores": {"nombre": "Mobiliario mayores", "categoria": "mobiliario"},
    "300396-0-mobiliario-urbano-deportivos": {"nombre": "Mobiliario deportivo", "categoria": "mobiliario"},
    
    # Salud
    "300296-0-empleo-inscripciones": {"nombre": "Empleo inscripciones", "categoria": "empleo"},
    "300405-0-locales-cedidos": {"nombre": "Locales cedidos", "categoria": "servicios"},
    
    # Seguridad
    "300680-0-servicios-sociales-problematicas": {"nombre": "Servicios sociales", "categoria": "seguridad"},
}


def fetch_ckan_datasets(rows: int = 50) -> list:
    """Obtiene la lista completa de datasets del catálogo."""
    url = f"{CKAN_BASE}/package_search"
    params = {"rows": rows, "start": 0}
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data.get("result", {}).get("results", [])
    except Exception as e:
        print(f"Error datasets: {e}")
        return []


def fetch_ckan_package(package_name: str) -> dict:
    """Obtiene un dataset específico por nombre."""
    url = f"{CKAN_BASE}/package_show"
    params = {"id": package_name}
    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json().get("result", {})
    except Exception as e:
        print(f"Error package {package_name}: {e}")
        return {}


def fetch_ckan_resource_data(resource_url: str) -> list:
    """Descarga y parsea datos de un recurso CKAN (JSON/CSV)."""
    try:
        resp = requests.get(resource_url, timeout=60)
        resp.raise_for_status()
        
        content_type = resp.headers.get("Content-Type", "")
        
        if "json" in content_type or resource_url.endswith(".json"):
            return resp.json()
        elif "csv" in content_type or resource_url.endswith(".csv"):
            import csv
            import io
            reader = csv.DictReader(io.StringIO(resp.text))
            return list(reader)
        else:
            return resp.json()  # Intentar JSON por defecto
    except Exception as e:
        print(f"  Error recurso: {e}")
        return []


def scrape_dataset_clave(dataset_id: str, info: dict) -> dict:
    """Scrapea un dataset clave con sus recursos."""
    print(f"  📊 [{info['categoria'].upper()}] {info['nombre']}...")
    
    package = fetch_ckan_package(dataset_id)
    if not package:
        print("    ❌ No encontrado")
        return None
    
    recursos = []
    for resource in package.get("resources", []):
        res_info = {
            "nombre": resource.get("name", ""),
            "formato": resource.get("format", ""),
            "url": resource.get("url", ""),
            "tamaño": resource.get("size", 0)
        }
        
        # Descargar datos si son JSON/CSV y no son demasiado grandes
        formato = resource.get("format", "").upper()
        tamaño = resource.get("size", 0) or 0
        
        if formato in ("JSON", "CSV") and tamaño < 5_000_000:  # <5MB
            datos = fetch_ckan_resource_data(resource.get("url", ""))
            if datos:
                res_info["datos"] = datos[:1000]  # Limitar a 1000 registros
                res_info["total_registros"] = len(datos)
        
        recursos.append(res_info)
    
    resultado = {
        "id": dataset_id,
        "nombre": package.get("title", ""),
        "descripcion": package.get("notes", ""),
        "categoria": info["categoria"],
        "recursos": recursos,
        "total_recursos": len(recursos)
    }
    
    print(f"    ✅ {len(recursos)} recursos")
    return resultado


def scrape_madrid_completo():
    """Scrapea todos los datasets clave de Madrid."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("🏙️ Madrid: Scraping datasets clave\n")
    
    resultados = {}
    
    for dataset_id, info in DATASETS_CLAVE.items():
        data = scrape_dataset_clave(dataset_id, info)
        if data:
            resultados[dataset_id] = data
            
            # Guardar por dataset
            ds_file = DATA_DIR / f"{dataset_id.replace('/', '_')}.json"
            with open(ds_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        
        time.sleep(0.5)
    
    # Guardar índice
    index_file = DATA_DIR / "index.json"
    index = {
        ds_id: {"nombre": ds["nombre"], "categoria": ds["categoria"]}
        for ds_id, ds in resultados.items()
    }
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*50}")
    print(f"✅ Completado: {len(resultados)} datasets procesados")
    return resultados


def scrape_transporte_madrid():
    """Scrapea específicamente datos de transporte de Madrid."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    transporte_ids = {k: v for k, v in DATASETS_CLAVE.items() if v["categoria"] in ("transporte", "trafico", "aparcamiento")}
    
    print(f"🚗 Madrid Transporte: {len(transporte_ids)} datasets\n")
    
    resultados = {}
    for ds_id, info in transporte_ids.items():
        data = scrape_dataset_clave(ds_id, info)
        if data:
            resultados[ds_id] = data
            ds_file = DATA_DIR / f"{ds_id.replace('/', '_')}.json"
            with open(ds_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        time.sleep(0.5)
    
    print(f"\n✅ Transporte completado: {len(resultados)} datasets")
    return resultados


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Scraper Madrid Open Data")
    parser.add_argument("--all", action="store_true", help="Scrapear todos los datasets clave")
    parser.add_argument("--transporte", action="store_true", help="Solo transporte")
    parser.add_argument("--listar", action="store_true", help="Listar todos los datasets disponibles")
    parser.add_argument("--dataset", help="Scrapear un dataset específico")
    args = parser.parse_args()
    
    if args.all:
        scrape_madrid_completo()
    elif args.transporte:
        scrape_transporte_madrid()
    elif args.listar:
        datasets = fetch_ckan_datasets(200)
        for ds in datasets:
            print(f"  {ds.get('name', 'N/A')}: {ds.get('title', 'N/A')}")
    elif args.dataset:
        data = scrape_dataset_clave(args.dataset, {"nombre": args.dataset, "categoria": "general"})
        if data:
            print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        scrape_madrid_completo()
