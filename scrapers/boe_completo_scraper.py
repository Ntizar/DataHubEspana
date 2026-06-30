#!/usr/bin/env python3
"""
Scraper BOE Completo - Boletín Oficial del Estado
No solo BORME: legislación, disposiciones, autoridades, anuncios.
API pública sin auth.
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import date, timedelta

BASE_URL = "https://www.boe.es/datosabiertos/api"
DATA_DIR = Path(__file__).parent.parent / "data" / "boe"


def fetch_boe_sumario(fecha_str: str) -> dict:
    """Obtiene el sumario BOE de un día."""
    url = f"{BASE_URL}/boe/sumario/{fecha_str}"
    try:
        resp = requests.get(url, headers={"Accept": "application/json"}, timeout=30)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return None


def fetch_boe_disposiciones(fecha_str: str) -> list:
    """Extrae disposiciones del BOE de un día."""
    data = fetch_boe_sumario(fecha_str)
    if not data:
        return []
    
    disposiciones = []
    try:
        diario = data["data"]["sumario"]["diario"][0]
        for seccion in diario.get("seccion", []):
            items = seccion.get("item", [])
            if isinstance(items, dict):
                items = [items]
            
            for item in items:
                disposiciones.append({
                    "fecha": fecha_str,
                    "seccion": seccion.get("codigo", ""),
                    "seccion_nombre": seccion.get("nombre", ""),
                    "identificador": item.get("identificador", ""),
                    "titulo": item.get("titulo", ""),
                    "url_pdf": item.get("url_pdf", {}).get("texto", "") if isinstance(item.get("url_pdf"), dict) else "",
                    "url_html": item.get("url_html", ""),
                    "url_xml": item.get("url_xml", "")
                })
    except Exception as e:
        pass
    
    return disposiciones


def fetch_legislacion_consolidada(tema: str = "") -> list:
    """Acceso a legislación consolidada."""
    # Endpoint de búsqueda de legislación
    url = f"{BASE_URL}/legislacion-consolidada/buscar"
    params = {"q": tema, "page": 1, "per_page": 20}
    try:
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code == 200:
            return resp.json().get("result", [])
    except:
        pass
    return []


def scrape_boe_range(start_date: date, end_date: date):
    """Scrapea BOE para un rango de fechas."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("📋 BOE - Boletín Oficial del Estado\n")
    
    current = start_date
    todas_disposiciones = []
    dias_con_datos = 0
    
    while current <= end_date:
        if current.weekday() >= 5:  # Saltar fines de semana
            current += timedelta(days=1)
            continue
        
        fecha_str = current.strftime("%Y%m%d")
        print(f"  📅 {current.strftime('%Y-%m-%d')}...", end=" ")
        
        disposiciones = fetch_boe_disposiciones(fecha_str)
        if disposiciones:
            todas_disposiciones.extend(disposiciones)
            dias_con_datos += 1
            print(f"✅ {len(disposiciones)} disposiciones")
        else:
            print("⏭️")
        
        current += timedelta(days=1)
        time.sleep(0.3)
    
    # Guardar
    with open(DATA_DIR / "disposiciones.json", "w", encoding="utf-8") as f:
        json.dump(todas_disposiciones, f, ensure_ascii=False, indent=2)
    
    # Estadísticas por sección
    secciones = {}
    for d in todas_disposiciones:
        sec = d.get("seccion_nombre", "Otra")
        secciones[sec] = secciones.get(sec, 0) + 1
    
    index = {
        "dias_procesados": dias_con_datos,
        "total_disposiciones": len(todas_disposiciones),
        "secciones": dict(sorted(secciones.items(), key=lambda x: -x[1]))
    }
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n  ✅ {len(todas_disposiciones)} disposiciones en {dias_con_datos} días")
    return index


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--last", type=int, default=3, help="Últimos N días")
    args = parser.parse_args()
    
    end = date.today()
    start = end - timedelta(days=args.last + 3)
    scrape_boe_range(start, end)
