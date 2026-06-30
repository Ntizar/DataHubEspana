#!/usr/bin/env python3
"""
Orquestador DataHub España
Ejecuta todos los scrapers y genera el índice maestro.
"""
import json
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"


def run_all_scrapers():
    """Ejecuta todos los scrapers en orden."""
    from scrapers import (
        borme_scraper, ine_scraper, esios_scraper,
        madrid_scraper, ign_scraper, catastro_scraper
    )
    
    scrapers = [
        ("BORME", borme_scraper.scrape_last_n_days, {"n": 3}),
        ("INE", ine_scraper.scrape_all_tablas, {"nult": 6}),
        ("ESIOS", esios_scraper.scrape_demanda_y_precios, {}),
        ("Madrid", madrid_scraper.scrape_madrid_completo, {}),
        ("IGN Sismicidad", ign_scraper.scrape_sismicidad, {}),
        ("Catastro", catastro_scraper.scrape_muestra_nacional, {"max_provincias": 3, "max_munis": 2}),
    ]
    
    resultados = {}
    
    for nombre, func, kwargs in scrapers:
        print(f"\n{'='*60}")
        print(f"🔄 {nombre}")
        print(f"{'='*60}")
        
        start = time.time()
        try:
            result = func(**kwargs)
            elapsed = time.time() - start
            resultados[nombre] = {
                "estado": "ok",
                "duracion": f"{elapsed:.1f}s",
                "resultado": str(result)[:200] if result else "N/A"
            }
            print(f"  ⏱️ {elapsed:.1f}s")
        except Exception as e:
            resultados[nombre] = {
                "estado": "error",
                "error": str(e)
            }
            print(f"  ❌ Error: {e}")
    
    return resultados


def generate_master_index():
    """Genera el índice maestro de todos los datasets."""
    index = {
        "fecha_generacion": datetime.now().isoformat(),
        "fuentes": {},
        "estadisticas": {
            "total_datasets": 0,
            "total_registros": 0,
            "fuentes_activas": 0
        }
    }
    
    # Recorrer todos los directorios de data
    for subdir in DATA_DIR.iterdir():
        if subdir.is_dir():
            nombre = subdir.name
            archivo_index = subdir / "index.json"
            archivos_datos = list(subdir.glob("*.json"))
            
            if archivos_datos:
                index["fuentes"][nombre] = {
                    "directorio": nombre,
                    "archivos": len(archivos_datos),
                    "tiene_index": archivo_index.exists(),
                    "fecha_modificacion": max(f.stat().st_mtime for f in archivos_datos)
                }
                index["estadisticas"]["total_datasets"] += len(archivos_datos)
                index["estadisticas"]["fuentes_activas"] += 1
    
    # Guardar índice maestro
    index_file = DATA_DIR / "master_index.json"
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n📊 Índice maestro generado: {index_file}")
    print(f"  Fuentes activas: {index['estadisticas']['fuentes_activas']}")
    print(f"  Total datasets: {index['estadisticas']['total_datasets']}")
    
    return index


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Orquestador DataHub España")
    parser.add_argument("--all", action="store_true", help="Ejecutar todos los scrapers")
    parser.add_argument("--index", action="store_true", help="Solo generar índice maestro")
    parser.add_argument("--borme", action="store_true", help="Solo BORME")
    parser.add_argument("--ine", action="store_true", help="Solo INE")
    parser.add_argument("--esios", action="store_true", help="Solo ESIOS")
    parser.add_argument("--madrid", action="store_true", help="Solo Madrid")
    parser.add_argument("--ign", action="store_true", help="Solo IGN")
    parser.add_argument("--catastro", action="store_true", help="Solo Catastro")
    args = parser.parse_args()
    
    if args.index:
        generate_master_index()
    elif args.borme:
        from scrapers import borme_scraper
        borme_scraper.scrape_last_n_days(3)
    elif args.ine:
        from scrapers import ine_scraper
        ine_scraper.scrape_all_tablas()
    elif args.esios:
        from scrapers import esios_scraper
        esios_scraper.scrape_demanda_y_precios()
    elif args.madrid:
        from scrapers import madrid_scraper
        madrid_scraper.scrape_madrid_completo()
    elif args.ign:
        from scrapers import ign_scraper
        ign_scraper.scrape_sismicidad()
    elif args.catastro:
        from scrapers import catastro_scraper
        catastro_scraper.scrape_muestra_nacional()
    elif args.all:
        run_all_scrapers()
        generate_master_index()
    else:
        run_all_scrapers()
        generate_master_index()
