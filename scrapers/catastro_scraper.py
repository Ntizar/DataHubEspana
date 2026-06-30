#!/usr/bin/env python3
"""
Scraper Catastro - Dirección General del Catastro
Extrae datos de inmuebles, parcelas, callejero por provincias.
Fuente: API pública Catastro (sin auth)
"""
import json
import os
import sys
import time
import requests
from pathlib import Path

BASE_URL = "https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero"
DATA_DIR = Path(__file__).parent.parent / "data" / "catastro"


def fetch_provincias() -> list:
    """Obtiene todas las provincias del Catastro."""
    url = f"{BASE_URL}/COVCCallejero.svc/json/ObtenerProvincias"
    try:
        resp = requests.get(url, timeout=30)
        data = resp.json()
        provincias = data.get("consulta_provincieroResult", {}).get("provinciero", {}).get("prov", [])
        return [{"codigo": p["cpine"], "nombre": p["np"]} for p in provincias]
    except Exception as e:
        print(f"Error obteniendo provincias: {e}")
        return []


def fetch_municipios(provincia: str) -> list:
    """Obtiene los municipios de una provincia."""
    url = f"{BASE_URL}/COVCCallejero.svc/json/ObtenerMunicipios"
    params = {"Provincia": provincia}
    try:
        resp = requests.get(url, params=params, timeout=30)
        data = resp.json()
        munis = data.get("consulta_municipieroResult", {}).get("municipiero", {}).get("muni", [])
        return [{"nombre": m["nm"], "codigo_ine": m.get("loine", {}).get("cp", "") + m.get("loine", {}).get("cm", "")} for m in munis]
    except Exception as e:
        print(f"Error obteniendo municipios de {provincia}: {e}")
        return []


def fetch_callejero(provincia: str, municipio: str, tipo_via: str = "", nom_via: str = "") -> list:
    """Obtiene el callejero de un municipio."""
    url = f"{BASE_URL}/COVCCallejero.svc/json/ObtenerCallejero"
    params = {"Provincia": provincia, "Municipio": municipio}
    if tipo_via:
        params["TipoVia"] = tipo_via
    if nom_via:
        params["NomVia"] = nom_via
    try:
        resp = requests.get(url, params=params, timeout=30)
        data = resp.json()
        return data.get("consulta_callejeroResult", {}).get("callejero", {}).get("calles", [])
    except Exception as e:
        print(f"Error callejero: {e}")
        return []


def fetch_inmueble_refcat(ref_cat: str) -> dict:
    """Obtiene datos de un inmueble por referencia catastral."""
    url = f"{BASE_URL}/COVCCallejero.svc/json/Consulta_DNPRC"
    params = {"RefCat": ref_cat}
    try:
        resp = requests.get(url, params=params, timeout=30)
        data = resp.json()
        result = data.get("consulta_dnprcResult", {})
        if result.get("control", {}).get("cuerr", 0) > 0:
            return None
        return result.get("bico", {})
    except Exception as e:
        print(f"Error inmueble {ref_cat}: {e}")
        return None


def fetch_inmueble_localizacion(provincia: str, municipio: str, sigla: str, 
                                  calle: str, numero: str, bloque: str = "",
                                  escalera: str = "", planta: str = "", puerta: str = "") -> dict:
    """Obtiene datos de un inmueble por localización."""
    url = f"{BASE_URL}/COVCCallejero.svc/json/Consulta_DNPLOC"
    params = {
        "Provincia": provincia, "Municipio": municipio,
        "Sigla": sigla, "Calle": calle, "Numero": numero
    }
    if bloque: params["Bloque"] = bloque
    if escalera: params["Escalera"] = escalera
    if planta: params["Planta"] = planta
    if puerta: params["Puerta"] = puerta
    
    try:
        resp = requests.get(url, params=params, timeout=30)
        data = resp.json()
        result = data.get("consulta_dnplocResult", {})
        if result.get("control", {}).get("cuerr", 0) > 0:
            return None
        return result.get("lbi", {}).get("bi", {})
    except Exception as e:
        print(f"Error localización: {e}")
        return None


def fetch_coords_to_ref(lat: float, lng: float) -> dict:
    """Obtiene la referencia catastral por coordenadas (WGS84)."""
    url = f"{BASE_URL}/COVCCoordenadas.svc/json/Consulta_RCCOOR"
    params = {
        "SRS": "EPSG:4326",
        "Coordenada_X": str(lng),
        "Coordenada_Y": str(lat)
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        data = resp.json()
        result = data.get("Consulta_RCCOORResult", {})
        if result.get("control", {}).get("cuerr", 0) > 0:
            return None
        coords = result.get("coordenadas", {}).get("coord", [])
        if coords:
            c = coords[0]
            return {
                "ref_cat": c.get("pc", {}).get("pc1", "") + c.get("pc", {}).get("pc2", ""),
                "direccion": c.get("ldt", ""),
                "tipo": c.get("ti", "")
            }
    except Exception as e:
        print(f"Error coordenadas: {e}")
    return None


def scrape_provincia_sample(provincia: str, max_municipios: int = 5):
    """Scrapea una muestra de datos de una provincia."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print(f"📍 Provincia: {provincia}")
    
    # Obtener municipios
    munis = fetch_municipios(provincia)
    print(f"  Municipios: {len(munis)}")
    
    resultado = {"provincia": provincia, "municipios": {}}
    
    for muni in munis[:max_municipios]:
        nombre = muni["nombre"]
        print(f"  🏘️ {nombre}...", end=" ")
        
        callejero = fetch_callejero(provincia, nombre)
        if callejero:
            calles = []
            for c in callejero:
                if isinstance(c, dict):
                    calles.append({
                        "nombre": c.get("cv", ""),
                        "tipo": c.get("tv", ""),
                        "codigo": c.get("cvi", "")
                    })
            resultado["municipios"][nombre] = {
                "codigo_ine": muni.get("codigo_ine", ""),
                "calles": calles,
                "total_calles": len(calles)
            }
            print(f"✅ {len(calles)} calles")
        else:
            print("⚠️ Sin datos")
        
        time.sleep(0.3)
    
    # Guardar
    prov_file = DATA_DIR / f"provincia_{provincia.replace(' ', '_').lower()}.json"
    with open(prov_file, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
    
    print(f"  ✅ Guardado en {prov_file}")
    return resultado


def scrape_muestra_nacional(max_provincias: int = 5, max_munis: int = 3):
    """Scrapea una muestra nacional: pocas provincias, pocos municipios."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    provincias = fetch_provincias()
    print(f"📍 Catastro: {len(provincias)} provincias disponibles")
    
    resultado = {"provincias": {}}
    
    for prov in provincias[:max_provincias]:
        data = scrape_provincia_sample(prov["nombre"], max_munis)
        resultado["provincias"][prov["nombre"]] = data
    
    # Guardar índice
    index_file = DATA_DIR / "index.json"
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump({
            "total_provincias": len(provincias),
            "provincias_scrapeadas": list(resultado["provincias"].keys()),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S")
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*50}")
    print(f"✅ Muestra completada: {len(resultado['provincias'])} provincias")
    return resultado


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Scraper Catastro")
    parser.add_argument("--provincias", action="store_true", help="Listar provincias")
    parser.add_argument("--muestra", action="store_true", help="Muestra nacional")
    parser.add_argument("--provincia", help="Scrapear una provincia específica")
    parser.add_argument("--refcat", help="Consultar referencia catastral")
    parser.add_argument("--coordenadas", nargs=2, type=float, metavar=("LAT", "LNG"), help="Ref catastral por coordenadas")
    args = parser.parse_args()
    
    if args.provincias:
        provs = fetch_provincias()
        for p in provs:
            print(f"  {p['codigo']}: {p['nombre']}")
    elif args.provincia:
        scrape_provincia_sample(args.provincia)
    elif args.refcat:
        data = fetch_inmueble_refcat(args.refcat)
        if data:
            print(json.dumps(data, ensure_ascii=False, indent=2))
    elif args.coordenadas:
        data = fetch_coords_to_ref(args.coordenadas[0], args.coordenadas[1])
        if data:
            print(json.dumps(data, ensure_ascii=False, indent=2))
    elif args.muestra:
        scrape_muestra_nacional()
    else:
        scrape_muestra_nacional()
