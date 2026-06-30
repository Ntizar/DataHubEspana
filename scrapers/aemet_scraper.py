#!/usr/bin/env python3
"""
Scraper AEMET - Agencia Estatal de Meteorología
Predicciones, observaciones, avisos meteorológicos.
API pública con key gratuita + XML público sin key.
"""
import json
import os
import sys
import time
import requests
from pathlib import Path
from datetime import date

DATA_DIR = Path(__file__).parent.parent / "data" / "aemet"
XML_BASE = "https://www.aemet.es/xml"


def fetch_prediccion_localidades() -> list:
    """Obtiene predicciones por localidades (XML público, sin key)."""
    # XML de predicciones municipales
    url = f"{XML_BASE}/municipales/localidades_28079_0.xml"  # Madrid
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.text
    except:
        pass
    return None


def fetch_avisos() -> list:
    """Obtiene avisos meteorológicos activos."""
    url = f"{XML_BASE}/prediccion/avisos/rss_esp.xml"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code == 200:
            return resp.text
    except:
        pass
    return None


def fetch_observacion_red() -> list:
    """Obtiene datos de la red de observación (JSON público)."""
    # Endpoint de observación en tiempo real
    url = "https://www.aemet.es/es/eltiempo/prediccion/municipios/madrid-id28079"
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code == 200:
            return resp.text[:5000]  # Primeros 5KB para parseo
    except:
        pass
    return None


def fetch_tabla_aemet() -> list:
    """Intenta obtener datos de tablas AEMET."""
    # Datos abiertos AEMET sin key
    url = "https://www.aemet.es/documentos_d/eltiempo/observacion/td_27481.pdf"
    # Solo para verificar disponibilidad
    try:
        resp = requests.head(url, timeout=10)
        return resp.status_code == 200
    except:
        return False


def fetch_municipales_batch(codigos: list) -> dict:
    """Obtiene predicciones para varios municipios."""
    resultados = {}
    
    for codigo in codigos:
        url = f"{XML_BASE}/municipales/localidades_{codigo}_0.xml"
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                resultados[codigo] = resp.text[:2000]
        except:
            pass
        time.sleep(0.3)
    
    return resultados


# Principales ciudades españolas
CIUDADES_PRINCIPALES = {
    "28079": "Madrid",
    "08019": "Barcelona",
    "46250": "Valencia",
    "41091": "Sevilla",
    "48020": "Bilbao",
    "50298": "Zaragoza",
    "29067": "Málaga",
    "33044": "Oviedo",
    "39075": "Santander",
    "15030": "A Coruña",
    "32054": "Ourense",
    "36057": "Pontevedra",
    "35016": "Las Palmas",
    "38038": "Sta Cruz Tenerife",
    "30030": "Murcia",
    "13034": "Ciudad Real",
    "06030": "Badajoz",
    "23050": "Jaén",
    "14021": "Córdoba",
    "18087": "Granada",
    "21041": "Huelva",
    "11012": "Cádiz",
    "04013": "Almería",
    "02003": "Albacete",
    "16078": "Cuenca",
    "45168": "Toledo",
    "40294": "Segovia",
    "47186": "Valladolid",
    "34120": "Palencia",
    "09059": "Burgos",
    "42173": "Soria",
    "24186": "León",
    "37274": "Salamanca",
    "10037": "Cáceres",
    "05019": "Ávila",
    "03031": "Alicante",
    "12032": "Castellón",
    "25121": "Lleida",
    "17079": "Girona",
    "43141": "Tarragona",
    "26093": "Logroño",
    "31201": "Pamplona",
    "20069": "Donostia",
    "48020": "Bilbao",
    "01059": "Vitoria-Gasteiz",
}


def scrape_aemet():
    """Scrapea datos meteorológicos de AEMET."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("🌦️ AEMET - Meteorología\n")
    
    # 1. Avisos
    print("  ⚠️ Avisos meteorológicos...")
    avisos = fetch_avisos()
    if avisos:
        with open(DATA_DIR / "avisos.xml", "w", encoding="utf-8") as f:
            f.write(avisos)
        print(f"     ✅ Avisos descargados")
    
    # 2. Predicciones principales ciudades
    print("  🌡️ Predicciones principales ciudades...")
    predicciones = fetch_municipales_batch(list(CIUDADES_PRINCIPALES.keys())[:10])
    
    for codigo, texto in predicciones.items():
        ciudad = CIUDADES_PRINCIPALES.get(codigo, codigo)
        with open(DATA_DIR / f"prediccion_{codigo}.xml", "w", encoding="utf-8") as f:
            f.write(texto)
    
    print(f"     {len(predicciones)} ciudades descargadas")
    
    # 3. Datos de ejemplo
    index = {
        "fecha": date.today().isoformat(),
        "avisos": bool(avisos),
        "predicciones": len(predicciones),
        "ciudades": list(CIUDADES_PRINCIPALES.values())[:10]
    }
    with open(DATA_DIR / "index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    print(f"\n  ✅ AEMET completado")
    return index


if __name__ == "__main__":
    scrape_aemet()
