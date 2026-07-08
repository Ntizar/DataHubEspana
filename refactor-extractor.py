#!/usr/bin/env python3
"""
DataHub España — Extractor modular
Refactoriza el monolito index.html (11.538 líneas) a arquitectura modular.

Uso: python3 refactor-extractor.py [--dry-run]
"""

import re
import os
import sys

BASE = '/root/workspace/DataHubEspana'
INDEX = os.path.join(BASE, 'index.html')

# === MAPEO DE FUNCIONES A MÓDULOS ===
# Cada función se asigna a un archivo. Las que no están aquí van a 'uncategorized.js'

MODULE_MAP = {
    'state.js': {
        'type': 'globals',
        'description': 'Estado global + constantes + datos estáticos',
    },
    'ui.js': {
        'functions': [
            'toggleSidebar', 'initMobile', 'showToast', 'updateClock',
            'closeProvinceDetail', 'restoreDefaultTabValues', 'getPopColor',
            'setTxt',
        ],
        'description': 'UI utilities, sidebar, clock, toast, mobile',
    },
    'map.js': {
        'functions': [
            'initMap', 'getBounds', 'computeCentroid', 'loadProvinces',
            'renderChoropleth', 'selectProvince',
        ],
        'description': 'Mapa Leaflet, provincias, choropleth',
    },
    'api.js': {
        'functions': [
            'fetchProvinceWeatherFiltered', 'fetchProvinceWeather',
            'fetchEnergyData', 'fetchWeather', 'fetchClimaCiudad',
            'fetchSeismic', 'fetchDemography', 'fetchAirQuality',
            'fetchAireExt', 'fetchPollen', 'fetchFlood', 'fetchSoil',
            'fetchTempSuelo', 'fetchForecast', 'fetchFuego', 'fetchEvapo',
            'fetchCAPE', 'fetchSol', 'fetchRadiacion', 'fetchTermica',
            'fetchNieve', 'fetchMar', 'fetchEolica', 'fetchMareas',
            'fetchUV', 'fetchGBFSData', 'fetchGBFS', 'fetchVisibilidad',
            'fetchRafagas', 'fetchLluvia', 'fetchPresion', 'fetchRocio',
            'fetchNubosidad', 'fetchTerremotos', 'fetchTrafico',
            'fetchBOE', 'fetchINE', 'fetchEEEAire', 'fetchPanelKPIs',
        ],
        'description': 'Fetch de todas las APIs externas',
    },
    'charts.js': {
        'functions': [
            'renderDemographyChart', 'renderGenderChart', 'renderPyramidChart',
            'renderAirQualityChart', 'renderPollutantsChart',
            'renderAireExtHourly', 'renderAireExtLimitsChart',
            'renderEnergyCharts', 'renderPollenChart', 'renderPollenEvolution',
            'renderFloodChart', 'renderSoilChart', 'renderSoilMoistureChart',
            'renderForecast', 'renderMarChartFor', 'renderUVAlerts',
            'renderUVChart', 'renderUVScale', 'renderUVCities',
            'renderGBFSChart', 'renderWindChart7d', 'renderMareasTabla',
            'updateNieveChart',
        ],
        'description': 'Factory de gráficos Chart.js',
    },
    'tabs.js': {
        'functions': [
            'populateProvinceFilter', 'onProvinceFilterChange',
            'updateFilteredData', 'resetFilteredData', 'renderParksFiltered',
            'updateClimateForProvince', 'updateEconomyForProvince',
            'updatePopulationForProvince', 'updateKPIs', 'renderTabSummary',
            'updateAirQualityForProvince', 'updatePollenForProvince',
            'updateFloodForProvince', 'updateSoilForProvince',
            'updateForecastForProvince',
        ],
        'description': 'Gestión de pestañas + lazy render + sync provincia',
    },
    'panels/agua.js': {
        'functions': ['renderWater'],
    },
    'panels/economia.js': {
        'functions': ['renderEconomy'],
    },
    'panels/catastro.js': {
        'functions': ['renderCatastro'],
    },
    'panels/ambiente.js': {
        'functions': ['renderParks', 'selectPark'],
    },
    'panels/poblacion.js': {
        'functions': ['renderPopulation'],
    },
    'panels/economia-det.js': {
        'functions': ['renderEconomyDetail'],
    },
    'panels/puertos.js': {
        'functions': ['renderPorts', 'selectPort', 'getDirectionName'],
    },
    'panels/gbfs.js': {
        'functions': ['getCityOptions', 'filterByCity', 'renderGBFS'],
    },
    'panels/fuego.js': {
        'functions': ['calcFireRisk', 'getRiskLevel', 'getRiskColor', 'initFuegoSelector'],
    },
    'panels/cape.js': {
        'functions': ['capeRiskLevel', 'capeGlobalRisk', 'capeKpiColor'],
    },
    'panels/ccaa-shared.js': {
        'functions': ['generateCCAATab', 'selectCCAA'],
    },
    'panels/sol.js': {
        'functions': ['renderCityView', 'getCityEmoji', 'updateCityView'],
    },
    'panels/termica.js': {
        'functions': ['getConfortEscala', 'getTermicaAlerts', 'getRiesgoCalor'],
    },
    'panels/nieve.js': {
        'functions': ['renderStationsList'],
    },
    'panels/mar.js': {
        'functions': ['haversine', 'findClosestCoastTo'],
    },
    'panels/eolica.js': {
        'functions': ['calcWindPower', 'calcCapacityFactor'],
    },
    'panels/mareas.js': {
        'functions': ['detectMareaPuerto'],
    },
    'panels/uv.js': {
        'functions': ['getUVColorLevel'],
    },
    'panels/visibilidad.js': {
        'functions': ['visEstado', 'esCanarias'],
    },
    'panels/rafagas.js': {
        'functions': ['windDirToDeg', 'windDirToCardinal', 'calcWindEnergy',
                       'generateWindAlerts', 'generateWindRanking'],
    },
    'panels/lluvia.js': {
        'functions': ['getRainSemaphor', 'detectPrecipType', 'getIntensityLabel'],
    },
    'panels/nubosidad.js': {
        'functions': ['nuboIcon', 'nuboHoursSol'],
    },
    'panels/soil-helpers.js': {
        'functions': ['clasificacionAgricola', 'interpolarProfundidad'],
    },
    'panels/oms-air.js': {
        'functions': ['omsClassifPM25', 'omsClassifPM10', 'omsClassifO3',
                       'omsClassifNO2', 'omsClassifCO', 'omsStatusHTML',
                       'v2str', 'calcAQIOSM', 'statusLine'],
    },
    'main.js': {
        'functions': ['init'],
        'description': 'Orquestador: init + wiring',
    },
}

# Funciones que son IIFE o anónimas (se manejan specially)
IIFE_PATTERNS = [
    'initFuegoSelector',
]

def find_function_name(line):
    """Extrae el nombre de una función de una línea."""
    # async function name( o function name(
    m = re.match(r'\s*(?:async\s+)?function\s+(\w+)\s*\(', line)
    if m:
        return m.group(1)
    return None

def find_iife_name(line):
    """Detecta IIFEs como (function initFuegoSelector() {"""
    m = re.match(r'\s*\(\s*function\s+(\w+)\s*\(', line)
    if m:
        return m.group(1)
    # También: (function() { ... })() anónimas
    if re.match(r'\s*\(\s*function\s*\(', line):
        return '_anonymous_iife'
    return None

def find_function_end(lines, start_idx):
    """Encuentra el final de una función contando llaves."""
    depth = 0
    found_open = False
    for i in range(start_idx, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                depth += 1
                found_open = True
            elif ch == '}':
                depth -= 1
                if found_open and depth == 0:
                    return i
    return len(lines) - 1

def find_inline_function_end(lines, start_idx):
    """Para funciones inline dentro de otras (como statusLine, renderCityView)."""
    return find_function_end(lines, start_idx)

def categorize_function(name):
    """Asigna una función a su módulo."""
    # Event blocks van a main.js (wiring)
    if name.startswith('_event_block_'):
        return 'main.js'
    for module, config in MODULE_MAP.items():
        if module == 'state.js':
            continue
        if 'functions' in config and name in config['functions']:
            return module
    return 'uncategorized.js'

def extract_js_block(lines):
    """Extrae el bloque <script> inline (sin src)."""
    start = None
    end = None
    for i, line in enumerate(lines):
        if '<script>' in line and 'src=' not in line:
            start = i + 1
        if '</script>' in line and start is not None:
            end = i
            break
    return start, end

def extract_globals(js_lines, start_offset):
    """Extrae constantes y variables globales (antes de la primera función)."""
    # Las globals son las líneas antes de la primera función
    first_func_line = None
    for i, line in enumerate(js_lines):
        if re.match(r'\s*(?:async\s+)?function\s+\w+\s*\(', line):
            first_func_line = i
            break
        if re.match(r'\s*\(\s*function\s+\w+\s*\(', line):  # IIFE
            first_func_line = i
            break
    
    if first_func_line is None:
        return js_lines, []
    
    globals_lines = js_lines[:first_func_line]
    rest_lines = js_lines[first_func_line:]
    return globals_lines, rest_lines

def parse_functions(js_lines):
    """Parsea todas las funciones del bloque JS. Retorna lista de (name, start, end, lines)."""
    functions = []
    i = 0
    while i < len(js_lines):
        line = js_lines[i]
        
        # Función normal
        name = find_function_name(line)
        if not name:
            # IIFE
            name = find_iife_name(line)
        
        if name:
            end = find_function_end(js_lines, i)
            func_lines = js_lines[i:end+1]
            functions.append({
                'name': name,
                'start': i,
                'end': end,
                'lines': func_lines,
            })
            i = end + 1
        else:
            # Línea suelta (no es función) - puede ser event listener, código suelto
            # Verificar si es un bloque importante (event listener, DOMContentLoaded, etc.)
            if 'addEventListener' in line or 'DOMContentLoaded' in line:
                # Buscar el final del bloque
                end = find_function_end(js_lines, i)
                if end > i:
                    functions.append({
                        'name': f'_event_block_{i}',
                        'start': i,
                        'end': end,
                        'lines': js_lines[i:end+1],
                    })
                    i = end + 1
                    continue
            i += 1
    
    return functions

def generate_module_file(module_name, functions, description=''):
    """Genera el contenido de un archivo de módulo."""
    header = f"""// {module_name} — DataHub España
// {description or 'Módulo extraído del monolito index.html'}
// Generado por refactor-extractor.py
// ⚠️ Este archivo es parte del refactor modular. NO editar funciones de otros módulos aquí.

"""
    body = '\n\n'.join(['\n'.join(f['lines']) for f in functions])
    return header + body + '\n'

def generate_index_html(head_scripts, body_html):
    """Genera el nuevo index.html con imports modulares."""
    # Quitar <body>, </body>, </html> del body_html (los añade el template)
    # Importante: quitar </html> primero, luego </body>, luego <body> del inicio
    body_clean = body_html
    body_clean = re.sub(r'</html>\s*$', '', body_clean)
    body_clean = re.sub(r'</body>\s*$', '', body_clean)
    body_clean = re.sub(r'^\s*<body>\s*', '', body_clean)
    # Limpiar cualquier tag duplicado que quede
    body_clean = body_clean.replace('<body>\n<body>', '<body>')
    body_clean = re.sub(r'(</body>\s*)+', '</body>', body_clean)
    body_clean = re.sub(r'(</html>\s*)+', '</html>', body_clean)
    
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DataHub España — Panel de Datos Nacional</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/topojson-client@3"></script>
    <link rel="stylesheet" href="css/styles.css">
    <script src="js/datahub.js"></script>
    <!-- === MÓDULOS REFACTORIZADOS (orden de carga importa) === -->
    <script src="js/state.js"></script>
    <script src="js/api.js"></script>
    <script src="js/charts.js"></script>
    <script src="js/map.js"></script>
    <script src="js/tabs.js"></script>
    <script src="js/ui.js"></script>
    <!-- Panels (uno por pestaña) -->
    <script src="js/panels/agua.js"></script>
    <script src="js/panels/economia.js"></script>
    <script src="js/panels/catastro.js"></script>
    <script src="js/panels/ambiente.js"></script>
    <script src="js/panels/poblacion.js"></script>
    <script src="js/panels/economia-det.js"></script>
    <script src="js/panels/puertos.js"></script>
    <script src="js/panels/gbfs.js"></script>
    <script src="js/panels/fuego.js"></script>
    <script src="js/panels/cape.js"></script>
    <script src="js/panels/ccaa-shared.js"></script>
    <script src="js/panels/sol.js"></script>
    <script src="js/panels/termica.js"></script>
    <script src="js/panels/nieve.js"></script>
    <script src="js/panels/mar.js"></script>
    <script src="js/panels/eolica.js"></script>
    <script src="js/panels/mareas.js"></script>
    <script src="js/panels/uv.js"></script>
    <script src="js/panels/visibilidad.js"></script>
    <script src="js/panels/rafagas.js"></script>
    <script src="js/panels/lluvia.js"></script>
    <script src="js/panels/nubosidad.js"></script>
    <script src="js/panels/soil-helpers.js"></script>
    <script src="js/panels/oms-air.js"></script>
    <!-- Orquestador (debe ir último) -->
    <script src="js/main.js"></script>
</head>
<body>
{body_clean}
</body>
</html>
"""

def main():
    dry_run = '--dry-run' in sys.argv
    
    print("=== DataHub España — Extractor Modular ===")
    print(f"Modo: {'DRY RUN' if dry_run else 'EJECUCIÓN'}")
    
    # 1. Leer index.html
    with open(INDEX, 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.split('\n')
    print(f"Total líneas: {len(lines)}")
    
    # 2. Encontrar bloque JS
    js_start, js_end = extract_js_block(lines)
    print(f"Bloque JS: líneas {js_start+1} a {js_end+1} ({js_end - js_start} líneas)")
    
    # 3. Extraer HTML (todo lo que no es JS)
    html_before = lines[:js_start]  # <head> + <body> inicio
    # El <script> opening está en js_start-1
    # Buscar dónde empieza <body>
    html_head = []
    html_body = []
    in_body = False
    for line in lines[:js_start]:
        if '<body>' in line:
            in_body = True
            html_body.append(line)
            continue
        if in_body:
            html_body.append(line)
        else:
            html_head.append(line)
    
    # HTML después del script
    html_after = lines[js_end+1:]  # </script> + </body> + </html>
    # Limpiar html_after (quitar </script> y tags de cierre)
    html_after_clean = [l for l in html_after if '</script>' not in l and l.strip()]
    
    # El body completo es: html_body + html_after_clean
    body_html = '\n'.join(html_body + html_after_clean)
    
    # 4. Extraer JS
    js_lines = lines[js_start:js_end]
    
    # 5. Separar globals de funciones
    globals_lines, rest_lines = extract_globals(js_lines, js_start)
    print(f"Globals: {len(globals_lines)} líneas")
    print(f"Resto (funciones + código suelto): {len(rest_lines)} líneas")
    
    # 6. Parsear funciones
    functions = parse_functions(rest_lines)
    print(f"Funciones encontradas: {len(functions)}")
    
    # 7. Categorizar
    modules = {}
    uncategorized = []
    for func in functions:
        module = categorize_function(func['name'])
        if module not in modules:
            modules[module] = []
        modules[module].append(func)
        if module == 'uncategorized.js':
            uncategorized.append(func['name'])
    
    print(f"\nMódulos:")
    for mod, funcs in sorted(modules.items()):
        print(f"  {mod}: {len(funcs)} funciones")
    
    if uncategorized:
        print(f"\n⚠️  Sin categorizar ({len(uncategorized)}):")
        for name in uncategorized:
            print(f"    - {name}")
    
    # 8. Generar archivos
    if not dry_run:
        # Crear directorios
        js_dir = os.path.join(BASE, 'js')
        panels_dir = os.path.join(js_dir, 'panels')
        os.makedirs(panels_dir, exist_ok=True)
        
        # state.js
        state_content = f"""// state.js — DataHub España
// Estado global + constantes + datos estáticos
// Generado por refactor-extractor.py
// ⚠️ ÚNICA fuente de verdad del estado. Otros módulos leen/escriben vía funciones.

"""
        state_content += '\n'.join(globals_lines) + '\n'
        state_path = os.path.join(js_dir, 'state.js')
        with open(state_path, 'w', encoding='utf-8') as f:
            f.write(state_content)
        print(f"\n✅ Escrito: {state_path} ({len(globals_lines)} líneas)")
        
        # Módulos
        for mod_name, funcs in modules.items():
            if mod_name == 'state.js':
                continue
            desc = MODULE_MAP.get(mod_name, {}).get('description', '')
            content = generate_module_file(mod_name, funcs, desc)
            
            if mod_name.startswith('panels/'):
                path = os.path.join(js_dir, mod_name)
            else:
                path = os.path.join(js_dir, mod_name)
            
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Escrito: {path} ({len(funcs)} funciones)")
        
        # Nuevo index.html
        new_html = generate_index_html(None, body_html)
        backup_path = os.path.join(BASE, 'index.html.bak')
        
        # Backup
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        print(f"\n✅ Backup: {backup_path}")
        
        # Nuevo index.html
        with open(INDEX, 'w', encoding='utf-8') as f:
            f.write(new_html)
        print(f"✅ Escrito: {INDEX} ({len(new_html.split(chr(10)))} líneas)")
        
        print(f"\n=== REFACTOR COMPLETO ===")
        print(f"index.html: {len(lines)} → {len(new_html.split(chr(10)))} líneas")
        print(f"Módulos creados: {len(modules)}")
    else:
        print("\n[DRY RUN] No se escribieron archivos.")
    
    return modules

if __name__ == '__main__':
    main()
