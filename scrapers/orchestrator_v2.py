#!/usr/bin/env python3
"""
Orquestador Maestro DataHub España v2
Ejecuta TODOS los scrapers y genera datos consolidados.
"""
import json
import os
import sys
import time
from pathlib import Path
from datetime import date

# Añadir directorio padre al path para imports
sys.path.insert(0, str(Path(__file__).parent))

# Imports de todos los scrapers
from borme_scraper import fetch_borme_day
from ine_scraper import fetch_ine_series
from madrid_scraper import scrape_madrid_dataset
from ign_scraper import fetch_ign_earthquakes
from catastro_scraper import fetch_catastro_province
from esios_scraper import fetch_esios_indicator

# Scrapers nuevos
import ckan_multi_portal as ckan
import nap_transporte_scraper as nap
import dgt_scraper as dgt
import aemet_scraper as aemet
import embalses_scraper as embalses
import boe_completo_scraper as boe
import puertos_scraper as puertos
import subvenciones_scraper as subvenciones
import contratacion_scraper as contratacion
import idee_scraper as idee
import siu_scraper as siu

DATA_DIR = Path(__file__).parent.parent / "data"


def run_all_scrapers(max_per_source: int = 100):
    """Ejecuta todos los scrapers disponibles."""
    print("=" * 60)
    print("🚀 DATAHUB ESPAÑA - RECOLECCIÓN MASIVA")
    print("=" * 60)
    
    resultados = {}
    inicio = time.time()
    
    # === BLOQUE 1: Datos base (probados) ===
    print("\n📦 BLOQUE 1: Datos base")
    print("-" * 40)
    
    # BORME
    try:
        print("📋 BORME...")
        borme = fetch_borme_day(date.today().strftime("%Y%m%d"))
        resultados["borme"] = {"status": "ok", "provincias": len(borme)}
        print(f"   ✅ {len(borme)} provincias")
    except Exception as e:
        resultados["borme"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # INE
    try:
        print("📊 INE...")
        ine = fetch_ine_series(["PC0015", "PC0097"])
        resultados["ine"] = {"status": "ok", "series": len(ine)}
        print(f"   ✅ {len(ine)} series")
    except Exception as e:
        resultados["ine"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # Madrid
    try:
        print("🏙️ Madrid Open Data...")
        madrid = scrape_madrid_dataset("dummy")
        resultados["madrid"] = {"status": "ok"}
        print(f"   ✅")
    except Exception as e:
        resultados["madrid"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # === BLOQUE 2: Portales CKAN ===
    print("\n📦 BLOQUE 2: Portales CKAN")
    print("-" * 40)
    
    try:
        print("🌐 CKAN Multi-Portal...")
        ckan_result = ckan.scrape_all_portals(max_datasets=max_per_source)
        resultados["ckan"] = {"status": "ok", "portales": len(ckan_result)}
        print(f"   ✅ {len(ckan_result)} portales procesados")
    except Exception as e:
        resultados["ckan"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # === BLOQUE 3: Transporte ===
    print("\n📦 BLOQUE 3: Transporte")
    print("-" * 40)
    
    # NAP Transportes
    try:
        print("🚂 NAP Transportes...")
        nap_result = nap.scrape_nap_transporte()
        resultados["nap"] = {"status": "ok", "datasets": len(nap_result)}
        print(f"   ✅ {len(nap_result)} datasets")
    except Exception as e:
        resultados["nap"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # DGT
    try:
        print("🚗 DGT...")
        dgt_result = dgt.scrape_dgt_completo()
        resultados["dgt"] = {"status": "ok"}
        print(f"   ✅")
    except Exception as e:
        resultados["dgt"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # === BLOQUE 4: Medio Ambiente ===
    print("\n📦 BLOQUE 4: Medio Ambiente")
    print("-" * 40)
    
    # Meteorología
    try:
        print("🌦️ AEMET...")
        aemet_result = aemet.scrape_aemet()
        resultados["aemet"] = {"status": "ok"}
        print(f"   ✅")
    except Exception as e:
        resultados["aemet"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # Embalses
    try:
        print("💧 Embalses...")
        embalses_result = embalses.scrape_embalses()
        resultados["embalses"] = {"status": "ok"}
        print(f"   ✅")
    except Exception as e:
        resultados["embalses"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # IDEE
    try:
        print("🗺️ IDEE...")
        idee_result = idee.scrape_idee()
        resultados["idee"] = {"status": "ok"}
        print(f"   ✅")
    except Exception as e:
        resultados["idee"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # === BLOQUE 5: Economía ===
    print("\n📦 BLOQUE 5: Economía")
    print("-" * 40)
    
    # BOE
    try:
        print("📋 BOE Completo...")
        boe_result = boe.scrape_boe_range(date.today() - __import__("datetime").timedelta(days=5), date.today())
        resultados["boe"] = {"status": "ok"}
        print(f"   ✅")
    except Exception as e:
        resultados["boe"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # Subvenciones
    try:
        print("💰 Subvenciones...")
        subv_result = subvenciones.scrape_subvenciones()
        resultados["subvenciones"] = {"status": "ok"}
        print(f"   ✅")
    except Exception as e:
        resultados["subvenciones"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # Contratación
    try:
        print("📝 Contratación Pública...")
        contr_result = contratacion.scrape_contratacion()
        resultados["contratacion"] = {"status": "ok"}
        print(f"   ✅")
    except Exception as e:
        resultados["contratacion"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # === BLOQUE 6: Otros ===
    print("\n📦 BLOQUE 6: Otros")
    print("-" * 40)
    
    # Puertos
    try:
        print("⚓ Puertos...")
        puertos_result = puertos.scrape_puertos()
        resultados["puertos"] = {"status": "ok"}
        print(f"   ✅")
    except Exception as e:
        resultados["puertos"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # SIU
    try:
        print("🏗️ SIU MITMA...")
        siu_result = siu.scrape_siu()
        resultados["siu"] = {"status": "ok"}
        print(f"   ✅")
    except Exception as e:
        resultados["siu"] = {"status": "error", "error": str(e)}
        print(f"   ❌ {e}")
    
    # === RESUMEN FINAL ===
    elapsed = time.time() - inicio
    exitosos = sum(1 for r in resultados.values() if r.get("status") == "ok")
    fallidos = sum(1 for r in resultados.values() if r.get("status") == "error")
    
    print("\n" + "=" * 60)
    print(f"✅ RECOLECCIÓN COMPLETADA")
    print(f"   ⏱️ Tiempo: {elapsed:.1f} segundos")
    print(f"   ✅ Exitosos: {exitosos}/{len(resultados)}")
    print(f"   ❌ Fallidos: {fallidos}/{len(resultados)}")
    print("=" * 60)
    
    # Guardar resumen
    summary = {
        "fecha": date.today().isoformat(),
        "timestamp": time.time(),
        "duracion_seg": round(elapsed, 1),
        "exitosos": exitosos,
        "fallidos": fallidos,
        "resultados": resultados
    }
    
    with open(DATA_DIR / "resumen_recoleccion.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    
    return summary


def run_single(scraper_name: str):
    """Ejecuta un scraper específico."""
    scrapers = {
        "borme": lambda: print("BORME: python3 borme_scraper.py"),
        "ine": lambda: print("INE: python3 ine_scraper.py"),
        "madrid": lambda: print("Madrid: python3 madrid_scraper.py"),
        "ign": lambda: print("IGN: python3 ign_scraper.py"),
        "catastro": lambda: print("Catastro: python3 catastro_scraper.py"),
        "esios": lambda: print("ESIOS: python3 esios_scraper.py"),
        "ckan": lambda: ckan.scrape_all_portals(),
        "nap": lambda: nap.scrape_nap_transporte(),
        "dgt": lambda: dgt.scrape_dgt_completo(),
        "aemet": lambda: aemet.scrape_aemet(),
        "embalses": lambda: embalses.scrape_embalses(),
        "boe": lambda: boe.scrape_boe_range(date.today() - __import__("datetime").timedelta(days=3), date.today()),
        "puertos": lambda: puertos.scrape_puertos(),
        "subvenciones": lambda: subvenciones.scrape_subvenciones(),
        "contratacion": lambda: contratacion.scrape_contratacion(),
        "idee": lambda: idee.scrape_idee(),
        "siu": lambda: siu.scrape_siu(),
    }
    
    if scraper_name in scrapers:
        scrapers[scraper_name]()
    else:
        print(f"Scraper no encontrado: {scraper_name}")
        print(f"Disponibles: {', '.join(scrapers.keys())}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Orquestador DataHub España v2")
    parser.add_argument("--all", action="store_true", help="Ejecutar todos los scrapers")
    parser.add_argument("--single", help="Ejecutar un scraper específico")
    parser.add_argument("--max", type=int, default=100, help="Max datasets por fuente CKAN")
    args = parser.parse_args()
    
    if args.all:
        run_all_scrapers(max_per_source=args.max)
    elif args.single:
        run_single(args.single)
    else:
        run_all_scrapers(max_per_source=args.max)
