#!/usr/bin/env python3
"""
Scraper INE - Instituto Nacional de Estadística
Extrae datos de paro, salarios, población, pensiones por provincia y comunidad.
Fuente: REST API INE (sin auth, sin key)
"""
import json
import os
import sys
import time
import requests
from datetime import date
from pathlib import Path

BASE_URL = "https://servicios.ine.es/wstempus/js/ES"
DATA_DIR = Path(__file__).parent.parent / "data" / "ine"

# Tablas INE mapeadas con descripción
TABLAS = {
    # EPA - Encuesta de Población Activa
    "4247": {"nombre": "EPA Paro por provincia y sexo", "categoria": "empleo"},
    "2852": {"nombre": "EPA Paro por sector y provincia", "categoria": "empleo"},
    "2856": {"nombre": "Afiliación SS por provincia", "categoria": "empleo"},
    
    # Salarios
    "66241": {"nombre": "Salarios por decil y provincia", "categoria": "salarios"},
    
    # Población
    "56936": {"nombre": "Población por municipio y sexo", "categoria": "poblacion"},
    "2852": {"nombre": "Población por edad y sexo", "categoria": "poblacion"},
    
    # Pensiones
    "31304": {"nombre": "Pensiones por tipo y provincia", "categoria": "pensiones"},
    
    # IPC - Índice de Precios al Consumo
    "22344": {"nombre": "IPC por provincias", "categoria": "precios"},
    "49611": {"nombre": "IPC por grupos ECOFIT", "categoria": "precios"},
    
    # PIB
    "31304": {"nombre": "PIB por provincias", "categoria": "economia"},
    
    # Demografía
    "9681": {"nombre": "Nacimientos por provincia", "categoria": "demografia"},
    "9682": {"nombre": "Defunciones por provincia", "categoria": "demografia"},
    "9683": {"nombre": "Matrimonios por provincia", "categoria": "demografia"},
    
    # Turismo
    "39994": {"nombre": "Llegadas turísticas por país de origen", "categoria": "turismo"},
    "39995": {"nombre": "Pernoctaciones turísticas", "categoria": "turismo"},
    
    # Electricidad
    "56915": {"nombre": "Producción electricidad por fuente", "categoria": "energia"},
}


def fetch_tabla_ine(tabla_id: str, nult: int = 12) -> dict:
    """Obtiene una tabla INE completa."""
    url = f"{BASE_URL}/DATOS_TABLA/{tabla_id}?tip=AM&nult={nult}"
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  Error fetching tabla {tabla_id}: {e}")
        return None


def parse_tabla_ine(data: list, tabla_id: str) -> dict:
    """Parsea los datos de una tabla INE a formato normalizado."""
    if not data:
        return {}
    
    resultado = {
        "tabla_id": tabla_id,
        "nombre": TABLAS.get(tabla_id, {}).get("nombre", f"Tabla {tabla_id}"),
        "categoria": TABLAS.get(tabla_id, {}).get("categoria", "general"),
        "unidad": data[0].get("Nombre", ""),
        "datos": []
    }
    
    for serie in data:
        nombre_serie = serie.get("Nombre", "")
        # Extraer dimensiones del nombre (provincia, sexo, etc.)
        partes = nombre_serie.split(". ")
        
        punto = {
            "dimensiones": nombre_serie,
            "valores": []
        }
        
        for nodo in serie.get("Data", []):
            punto["valores"].append({
                "fecha": nodo.get("Fecha", ""),
                "valor": nodo.get("Valor"),
                "ano": nodo.get("ANO"),
                "mes": nodo.get("MES")
            })
        
        resultado["datos"].append(punto)
    
    return resultado


def scrape_all_tablas(nult: int = 12):
    """Scrapea todas las tablas INE configuradas."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    resultados = {}
    
    for tabla_id, info in TABLAS.items():
        print(f"\n📊 [{info['categoria'].upper()}] {info['nombre']} ({tabla_id})")
        
        data = fetch_tabla_ine(tabla_id, nult)
        if data:
            parsed = parse_tabla_ine(data, tabla_id)
            if parsed:
                resultados[tabla_id] = parsed
                print(f"  ✅ {len(parsed.get('datos', []))} series, {sum(len(p.get('valores', [])) for p in parsed.get('datos', []))} valores")
                
                # Guardar por tabla
                tabla_file = DATA_DIR / f"tabla_{tabla_id}.json"
                with open(tabla_file, "w", encoding="utf-8") as f:
                    json.dump(parsed, f, ensure_ascii=False, indent=2)
            else:
                print("  ⚠️ Sin datos parseados")
        else:
            print("  ❌ Error al obtener")
        
        time.sleep(0.5)
    
    # Guardar índice
    index_file = DATA_DIR / "index.json"
    index = {tid: {"nombre": t["nombre"], "categoria": t["categoria"]} 
             for tid, t in TABLAS.items() if tid in resultados}
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*50}")
    print(f"✅ Completado: {len(resultados)} tablas procesadas")
    return resultados


def scrape_paro_provincias():
    """Scrapea específicamente datos de paro por provincia (tabla EPA 4247)."""
    print("📊 EPA: Paro por provincia y sexo")
    data = fetch_tabla_ine("4247", nult=12)
    if data:
        return parse_tabla_ine(data, "4247")
    return None


def scrape_salarios():
    """Scrapea datos de salarios por provincia (tabla 66241)."""
    print("📊 Salarios por decil y provincia")
    data = fetch_tabla_ine("66241", nult=12)
    if data:
        return parse_tabla_ine(data, "66241")
    return None


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Scraper INE")
    parser.add_argument("--all", action="store_true", help="Scrapear todas las tablas")
    parser.add_argument("--paro", action="store_true", help="Solo paro")
    parser.add_argument("--salarios", action="store_true", help="Solo salarios")
    parser.add_argument("--tabla", help="ID de tabla específica")
    parser.add_argument("--nult", type=int, default=12, help="Últimos N valores")
    args = parser.parse_args()
    
    if args.all:
        scrape_all_tablas(args.nult)
    elif args.paro:
        scrape_paro_provincias()
    elif args.salarios:
        scrape_salarios()
    elif args.tabla:
        data = fetch_tabla_ine(args.tabla, args.nult)
        if data:
            parsed = parse_tabla_ine(data, args.tabla)
            print(json.dumps(parsed, ensure_ascii=False, indent=2))
    else:
        scrape_all_tablas(args.nult)
