#!/usr/bin/env python3
"""
Scraper IGN - Instituto Geográfico Nacional
Extrae datos de sismicidad en tiempo real de España.
Fuente: API pública IGN (sin auth)
"""
import json
import os
import sys
import time
import requests
from datetime import date, datetime, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "ign"

# API IGN terremotos
IGN_URL = "https://www.ign.es/web/resources/volcanologia/tproximos/"


def fetch_terremotos_recientes() -> dict:
    """Obtiene los terremotos más recientes de España."""
    url = f"{IGN_URL}consultas_ultimodia/40_30days.js"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        # El JSON puede estar envuelto en una función
        text = resp.text
        if text.startswith("var "):
            text = text[text.index("["):]
            text = text[:text.rindex("]")+1]
        return json.loads(text)
    except Exception as e:
        print(f"Error terremotos recientes: {e}")
        return []


def fetch_terremotos_hoy() -> dict:
    """Obtiene los terremotos del día actual."""
    url = f"{IGN_URL}consultas_ultimodia/todos_ultimodia.js"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        text = resp.text
        if text.startswith("var "):
            text = text[text.index("["):]
            text = text[:text.rindex("]")+1]
        return json.loads(text)
    except Exception as e:
        print(f"Error terremotos hoy: {e}")
        return []


def fetch_sismologia_json() -> list:
    """Obtiene el catálogo de sismicidad reciente."""
    # Endpoint alternativo del IGN
    urls = [
        "https://www.ign.es/web/resources/volcanologia/tproximos/40_30days.js",
        "https://www.ign.es/web/resources/volcanologia/tproximos/todos_ultimodia.js",
    ]
    
    for url in urls:
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code == 200:
                text = resp.text
                # Limpiar formato JS
                if "=" in text:
                    text = text[text.index("["):]
                    text = text[:text.rindex("]")+1]
                return json.loads(text)
        except:
            continue
    
    return []


def scrape_sismicidad():
    """Scrapea la sismicidad reciente de España."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("🌍 IGN: Sismicidad reciente de España\n")
    
    # Terremotos del último mes
    terremotos_30d = fetch_terremotos_recientes()
    print(f"  Últimos 30 días: {len(terremotos_30d)} terremotos")
    
    # Terremotos de hoy
    terremotos_hoy = fetch_terremotos_hoy()
    print(f"  Hoy: {len(terremotos_hoy)} terremotos")
    
    # Parsear y normalizar
    def parsear_terremoto(t):
        if isinstance(t, dict):
            return {
                "id": t.get("id", ""),
                "fecha": t.get("fecha", ""),
                "hora": t.get("hora", ""),
                "latitud": t.get("latitud"),
                "longitud": t.get("longitud"),
                "profundidad_km": t.get("profundidad"),
                "magnitud": t.get("magnitud"),
                "magnitud_tipo": t.get("magnitudTipo", ""),
                "tipo": t.get("tipo", ""),
                "localidad": t.get("localizacion", ""),
                "observatorio": t.get("observatorio", ""),
                "eventid": t.get("eventid", "")
            }
        return None
    
    # Guardar terremotos 30 días
    parsed_30d = [parsear_terremoto(t) for t in terremotos_30d if parsear_terremoto(t)]
    file_30d = DATA_DIR / "terremotos_30dias.json"
    with open(file_30d, "w", encoding="utf-8") as f:
        json.dump(parsed_30d, f, ensure_ascii=False, indent=2)
    
    # Guardar terremotos hoy
    parsed_hoy = [parsear_terremoto(t) for t in terremotos_hoy if parsear_terremoto(t)]
    file_hoy = DATA_DIR / f"terremotos_{date.today().isoformat()}.json"
    with open(file_hoy, "w", encoding="utf-8") as f:
        json.dump(parsed_hoy, f, ensure_ascii=False, indent=2)
    
    # Estadísticas rápidas
    if parsed_30d:
        magnitudes = [t["magnitud"] for t in parsed_30d if t.get("magnitud")]
        if magnitudes:
            print(f"\n  📊 Estadísticas 30 días:")
            print(f"    Total: {len(parsed_30d)}")
            print(f"    Máxima magnitud: {max(magnitudes):.1f}")
            print(f"    Media: {sum(magnitudes)/len(magnitudes):.2f}")
            print(f"    M3+: {sum(1 for m in magnitudes if m >= 3)}")
            print(f"    M4+: {sum(1 for m in magnitudes if m >= 4)}")
    
    print(f"\n  ✅ Guardado en {DATA_DIR}")
    
    # Guardar índice
    index = {
        "fecha_scraping": datetime.now().isoformat(),
        "terremotos_30d": len(parsed_30d),
        "terremotos_hoy": len(parsed_hoy),
        "magnitud_max": max((t["magnitud"] for t in parsed_30d if t.get("magnitud")), default=0)
    }
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    return parsed_30d


if __name__ == "__main__":
    scrape_sismicidad()
