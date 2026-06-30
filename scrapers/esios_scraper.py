#!/usr/bin/env python3
"""
Scraper ESIOS/REE - Red Eléctrica de España
Extrae datos de demanda, generación, precios del mercado eléctrico español.
Fuente: API ESIOS (key gratuita) + API demanda tiempo real (sin auth)
"""
import json
import os
import sys
import time
import requests
from datetime import date, datetime, timedelta
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "esios"

# ESIOS API v2 - indicadores clave
ESIOS_BASE = "https://api.esios.ree.es"
ESIOS_TOKEN = os.environ.get("ESIOS_TOKEN", "")

# Indicadores ESIOS mapeados
INDICADORES = {
    # Demanda
    "1293": {"nombre": "Demanda eléctrica total", "unidad": "MW", "categoria": "demanda"},
    "1294": {"nombre": "Demanda programada", "unidad": "MW", "categoria": "demanda"},
    "1295": {"nombre": "Demanda prevista", "unidad": "MW", "categoria": "demanda"},
    
    # Generación
    "1300": {"nombre": "Generación total", "unidad": "MW", "categoria": "generacion"},
    "1302": {"nombre": "Generación eólica", "unidad": "MW", "categoria": "generacion"},
    "1303": {"nombre": "Generación solar fotovoltaica", "unidad": "MW", "categoria": "generacion"},
    "1304": {"nombre": "Generación hidroeléctrica", "unidad": "MW", "categoria": "generacion"},
    "1305": {"nombre": "Generación nuclear", "unidad": "MW", "categoria": "generacion"},
    "1306": {"nombre": "Generación carbón", "unidad": "MW", "categoria": "generacion"},
    "1307": {"nombre": "Generación gas natural", "unidad": "MW", "categoria": "generacion"},
    "1308": {"nombre": "Generación fuel/gasoil", "unidad": "MW", "categoria": "generacion"},
    
    # Precios
    "1728": {"nombre": "Precio mercado diario (PVPC)", "unidad": "€/MWh", "categoria": "precios"},
    "1729": {"nombre": "Precio medio mercado diario", "unidad": "€/MWh", "categoria": "precios"},
    
    # Interconexiones
    "1310": {"nombre": "Interconexión Francia", "unidad": "MW", "categoria": "interconexiones"},
    "1311": {"nombre": "Interconexión Portugal", "unidad": "MW", "categoria": "interconexiones"},
    
    # Reservas
    "1312": {"nombre": "Reserva de reposición", "unidad": "MW", "categoria": "reservas"},
    
    # Renovables
    "1314": {"nombre": "Producción renovable", "unidad": "MW", "categoria": "renovables"},
    "1315": {"nombre": "% Renovables sobre demanda", "unidad": "%", "categoria": "renovables"},
}


def fetch_demanda_realtime() -> dict:
    """Obtiene la demanda eléctrica en tiempo real (sin key)."""
    # API de demanda REE en tiempo real
    url = "https://demanda.ree.es/vcc/curva?tun=1&curva=1"
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  Error demanda realtime: {e}")
        return None


def fetch_generacion_realtime() -> dict:
    """Obtiene la generación por tecnología en tiempo real."""
    url = "https://demanda.ree.es/vcc/curva?tun=4&curva=1"
    try:
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  Error generación realtime: {e}")
        return None


def fetch_iesios_indicator(indicador_id: str, start: str, end: str) -> dict:
    """Obtiene un indicador ESIOS para un rango de fechas."""
    if not ESIOS_TOKEN:
        return fetch_iesios_public(indicador_id)
    
    url = f"{ESIOS_BASE}/indicators/{indicador_id}/data"
    params = {
        "start_date": start,
        "end_date": end,
        "geo_ids": 8741,  # España peninsular
        "limit": 5000
    }
    headers = {
        "Accept": "application/json",
        "Authorization": f"Token token={ESIOS_TOKEN}"
    }
    
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  Error indicador {indicador_id}: {e}")
        return None


def fetch_iesios_public(indicador_id: str) -> dict:
    """Fallback: obtener datos de indicadores públicos sin token."""
    # Intentar con la API pública de demanda
    url = f"https://demanda.ree.es/movilizacion/curva?tun=4&curva={indicador_id}"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return None


def scrape_demanda_y_precios():
    """Scrapea demanda, generación y precios del día actual."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("⚡ Demanda eléctrica en tiempo real...")
    demanda = fetch_demanda_realtime()
    
    print("⚡ Generación por tecnología...")
    generacion = fetch_generacion_realtime()
    
    resultado = {
        "fecha": date.today().isoformat(),
        "timestamp": datetime.now().isoformat(),
        "demanda": demanda,
        "generacion": generacion
    }
    
    # Guardar
    today_file = DATA_DIR / f"{date.today().isoformat()}.json"
    with open(today_file, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Datos guardados en {today_file}")
    return resultado


def scrape_iesios_range(start_date: date, end_date: date):
    """Scrapea indicadores ESIOS para un rango de fechas."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    start_str = start_date.isoformat() + "T00:00:00Z"
    end_str = end_date.isoformat() + "T23:59:59Z"
    
    resultados = {}
    
    for ind_id, info in INDICADORES.items():
        print(f"📊 [{info['categoria'].upper()}] {info['nombre']} ({ind_id})")
        
        data = fetch_iesios_indicator(ind_id, start_str, end_str)
        if data and "indicator" in data:
            ind_data = data["indicator"].get("data", [])
            if ind_data:
                resultados[ind_id] = {
                    "id": ind_id,
                    "nombre": info["nombre"],
                    "unidad": info["unidad"],
                    "categoria": info["categoria"],
                    "datos": [{
                        "fecha": d.get("datetime", ""),
                        "valor": d.get("value"),
                        "geo": d.get("geo", {}).get("name", "España")
                    } for d in ind_data]
                }
                print(f"  ✅ {len(ind_data)} valores")
            else:
                print("  ⚠️ Sin datos")
        else:
            print("  ❌ Error o sin acceso (token necesario)")
        
        time.sleep(0.5)
    
    # Guardar
    range_file = DATA_DIR / f"esios_{start_date}_{end_date}.json"
    with open(range_file, "w", encoding="utf-8") as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*50}")
    print(f"✅ Completado: {len(resultados)} indicadores")
    return resultados


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Scraper ESIOS/REE")
    parser.add_argument("--realtime", action="store_true", help="Datos tiempo real")
    parser.add_argument("--range", nargs=2, metavar=("START", "END"), help="Rango fechas YYYY-MM-DD")
    parser.add_argument("--all", action="store_true", help="Todo")
    args = parser.parse_args()
    
    if args.realtime:
        scrape_demanda_y_precios()
    elif args.range:
        start = date.fromisoformat(args.range[0])
        end = date.fromisoformat(args.range[1])
        scrape_iesios_range(start, end)
    elif args.all:
        scrape_demanda_y_precios()
    else:
        scrape_demanda_y_precios()
