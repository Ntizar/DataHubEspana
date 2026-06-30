#!/usr/bin/env python3
"""
Scraper BORME - Boletín Oficial del Registro Mercantil
Extrae constituciones, disoluciones, nombramientos y movimientos de capital por provincia y día.
Fuente: API pública BOE (sin auth)
"""
import json
import os
import sys
import time
import re
import xml.etree.ElementTree as ET
from datetime import date, timedelta
from pathlib import Path

BASE_URL = "https://www.boe.es"
API_URL = f"{BASE_URL}/datosabiertos/api/borme"
DATA_DIR = Path(__file__).parent.parent / "data" / "borme"

PROVINCIAS = {
    "02": "ALBACETE", "03": "ALICANTE", "04": "ALMERÍA", "05": "ÁVILA",
    "06": "BADAJOZ", "07": "BALEARES", "08": "BARCELONA", "09": "BURGOS",
    "10": "CACERES", "11": "CADIZ", "12": "CASTELLÓN", "13": "CIUDAD REAL",
    "14": "CORDOBA", "15": "CORUÑA", "16": "CUENCA", "17": "GIRONA",
    "18": "GRANADA", "19": "GUADALAJARA", "20": "GIPUZKOA", "21": "HUELVA",
    "22": "HUESCA", "23": "JAÉN", "24": "LEÓN", "25": "LLEIDA",
    "26": "LA RIOJA", "27": "LUGO", "28": "MADRID", "29": "MÁLAGA",
    "30": "MURCIA", "31": "NAVARRA", "32": "OURENSE", "33": "ASTURIAS",
    "34": "PALENCIA", "35": "LAS PALMAS", "36": "PONTEVEDRA", "37": "SALAMANCA",
    "38": "SANTA CRUZ DE TENERIFE", "39": "CANTABRIA", "40": "SEGOVIA",
    "41": "SEVILLA", "42": "SORIA", "43": "TARRAGONA", "44": "TERUEL",
    "45": "TOLEDO", "46": "VALENCIA", "47": "VALLADOLID", "48": "BIZKAIA",
    "49": "ZAMORA", "50": "ZARAGOZA", "51": "CEUTA", "52": "MELILLA"
}


def fetch_borme_day(fecha_str: str) -> dict:
    """Obtiene el sumario BORME de un día específico (formato YYYYMMDD)."""
    import requests
    
    url = f"{API_URL}/sumario/{fecha_str}"
    try:
        resp = requests.get(url, headers={"Accept": "application/json"}, timeout=30)
        if resp.status_code == 404:
            return None  # Día festivo o sin publicación
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"  Error fetching {fecha_str}: {e}")
        return None


def fetch_borme_xml(xml_url: str) -> list:
    """Obtiene y parsea el XML de una provincia específica."""
    import requests
    
    try:
        resp = requests.get(xml_url, timeout=30)
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        
        actos = []
        nombre = ""
        for p in root.findall(".//p"):
            if p.get("class") == "articulo":
                nombre = (p.text or "").strip()
            elif p.get("class") == "parrafo" and nombre:
                texto = (p.text or "").strip()
                acto = parsear_acto(nombre, texto)
                if acto:
                    actos.append(acto)
                nombre = ""
        return actos
    except Exception as e:
        print(f"  Error parsing XML: {e}")
        return []


def parsear_acto(nombre_empresa: str, texto: str) -> dict:
    """Parsea un acto mercantil del XML del BORME."""
    t = texto.lower()
    
    # Extraer nombre de empresa del formato "NOMBRE - TIPO SOCIEDAD"
    partes = nombre_empresa.split(" - ", 1)
    num_reg = partes[0].strip() if len(partes) > 1 else ""
    emp = partes[-1].strip().rstrip(".") if len(partes) > 1 else nombre_empresa.strip()
    
    # Detectar tipo de acto
    if "constitución" in t or "constitucion" in t:
        cap = re.search(r'Capital:\s*([\d.,]+)\s*Euros', texto)
        cnae = re.search(r'CNAE:\s*(\d+)', texto)
        dom = re.search(r'Domicilio:\s*(.+?)(?:\.|Capital)', texto)
        tipo_soc = re.search(r'(?:S\.?L\.?|S\.?A\.?|S\.?L\.?U\.?|SCoop|SLNE)', texto, re.IGNORECASE)
        return {
            "tipo": "constitucion",
            "empresa": emp,
            "num_registro": num_reg,
            "capital": cap.group(1) if cap else None,
            "cnae": cnae.group(1) if cnae else None,
            "domicilio": dom.group(1).strip() if dom else None,
            "tipo_sociedad": tipo_soc.group(0) if tipo_soc else None
        }
    elif "disolución" in t or "disolucion" in t:
        tipo_dis = "voluntaria" if "voluntaria" in t else "forzosa" if "forzosa" in t else "otra"
        return {"tipo": "disolucion", "empresa": emp, "num_registro": num_reg, "subtipo": tipo_dis}
    elif "extinción" in t or "extincion" in t:
        return {"tipo": "extincion", "empresa": emp, "num_registro": num_reg}
    elif "nombramientos" in t:
        cargo = re.search(r'(?:Adm\.?\s*(?:\w+)|Consejero|Liquidador|Administrador)', texto, re.IGNORECASE)
        persona = re.search(r'(?:Adm\.?\s*(?:\w+)|Consejero|Liquidador|Administrador)[:\s]+([A-ZÁÉÍÓÚÑ\s]+)', texto)
        return {
            "tipo": "nombramiento",
            "empresa": emp,
            "num_registro": num_reg,
            "cargo": cargo.group(0) if cargo else None,
            "persona": persona.group(1).strip() if persona else None
        }
    elif "ceses" in t or "dimisiones" in t:
        return {"tipo": "cese", "empresa": emp, "num_registro": num_reg}
    elif "modificaciones estatutarias" in t or "modificación" in t:
        cap = re.search(r'Capital:\s*([\d.,]+)\s*Euros', texto)
        return {
            "tipo": "modificacion",
            "empresa": emp,
            "num_registro": num_reg,
            "capital_nuevo": cap.group(1) if cap else None
        }
    elif "reducción de capital" in t or "reduccion de capital" in t:
        cap = re.search(r'Importe reducción:\s*([\d.,]+)\s*Euros', texto)
        return {"tipo": "reduccion_capital", "empresa": emp, "num_registro": num_reg, "importe": cap.group(1) if cap else None}
    elif "aumento de capital" in t or "ampliación de capital" in t or "ampliacion de capital" in t:
        cap = re.search(r'Capital social:\s*([\d.,]+)\s*Euros', texto)
        return {"tipo": "aumento_capital", "empresa": emp, "num_registro": num_reg, "capital_nuevo": cap.group(1) if cap else None}
    
    return None


def scrape_borme_range(start_date: date, end_date: date, provincias_filter: list = None):
    """Scrapea BORME para un rango de fechas."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    current = start_date
    total_actos = 0
    dias_procesados = 0
    
    while current <= end_date:
        # Saltar sábados, domingos y festivos de Madrid
        if current.weekday() >= 5:
            current += timedelta(days=1)
            continue
        
        fecha_str = current.strftime("%Y%m%d")
        print(f"\n📅 {current.strftime('%Y-%m-%d')} ({current.strftime('%A')})")
        
        data = fetch_borme_day(fecha_str)
        if not data or "data" not in data:
            print("  ⏭️ Sin publicación (festivo)")
            current += timedelta(days=1)
            continue
        
        try:
            diarios = data["data"]["sumario"]["diario"]
            if not diarios:
                current += timedelta(days=1)
                continue
                
            diario = diarios[0]
            resultado_dia = {"fecha": fecha_str, "provincias": {}}
            
            for seccion in diario.get("seccion", []):
                items = seccion.get("item", [])
                if isinstance(items, dict):
                    items = [items]
                
                for item in items:
                    titulo = item.get("titulo", "").upper()
                    
                    # Filtrar provincias si se especifica
                    if provincias_filter and titulo not in [p.upper() for p in provincias_filter]:
                        continue
                    
                    xml_url = item.get("url_xml", "")
                    if not xml_url:
                        continue
                    
                    print(f"  📍 {titulo}...", end=" ")
                    actos = fetch_borme_xml(xml_url)
                    
                    if actos:
                        resultado_dia["provincias"][titulo] = {
                            "identificador": item.get("identificador", ""),
                            "actos": actos,
                            "total": len(actos)
                        }
                        print(f"✅ {len(actos)} actos")
                        total_actos += len(actos)
                    else:
                        print("⚠️ 0 actos")
                    
                    time.sleep(0.5)  # Rate limiting
            
            # Guardar día
            day_file = DATA_DIR / f"{fecha_str}.json"
            with open(day_file, "w", encoding="utf-8") as f:
                json.dump(resultado_dia, f, ensure_ascii=False, indent=2)
            
            dias_procesados += 1
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
        
        current += timedelta(days=1)
        time.sleep(0.3)
    
    print(f"\n{'='*50}")
    print(f"✅ Completado: {dias_procesados} días, {total_actos} actos totales")
    return total_actos


def scrape_today():
    """Scrapea solo el día de hoy."""
    today = date.today()
    # Si es lunes, también scrapear el viernes anterior
    if today.weekday() == 0:
        friday = today - timedelta(days=3)
        print(f"📅 Lunes detectado, incluyendo viernes {friday}")
        scrape_borme_range(friday, today)
    else:
        scrape_borme_range(today, today)


def scrape_last_n_days(n: int = 5):
    """Scrapea los últimos N días laborables."""
    end = date.today()
    start = end - timedelta(days=n + 3)  # Margen para festivos
    scrape_borme_range(start, end)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Scraper BORME")
    parser.add_argument("--today", action="store_true", help="Scrapear solo hoy")
    parser.add_argument("--last", type=int, help="Scrapear últimos N días")
    parser.add_argument("--start", help="Fecha inicio (YYYY-MM-DD)")
    parser.add_argument("--end", help="Fecha fin (YYYY-MM-DD)")
    parser.add_argument("--provincias", nargs="+", help="Filtrar provincias")
    args = parser.parse_args()
    
    if args.today:
        scrape_today()
    elif args.last:
        scrape_last_n_days(args.last)
    elif args.start and args.end:
        start = date.fromisoformat(args.start)
        end = date.fromisoformat(args.end)
        scrape_borme_range(start, end, args.provincias)
    else:
        scrape_last_n_days(7)
