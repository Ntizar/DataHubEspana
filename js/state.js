// state.js — DataHub España
// Estado global + constantes + datos estáticos
// Generado por refactor-extractor.py
// ⚠️ ÚNICA fuente de verdad del estado. Otros módulos leen/escriben vía funciones.

/* ==========================================================================
   DataHub España — Dashboard Principal
   Panel de datos abiertos de España en tiempo real
   ========================================================================== */

// ===== CCAA NAMES =====
const CCAA_NAMES = {
    '01': 'Andalucía',
    '02': 'Aragón',
    '03': 'Principado de Asturias',
    '04': 'Illes Balears',
    '05': 'Canarias',
    '06': 'Cantabria',
    '07': 'Castilla y León',
    '08': 'Castilla-La Mancha',
    '09': 'Cataluña',
    '10': 'Extremadura',
    '11': 'Galicia',
    '12': 'La Rioja',
    '13': 'Comunidad de Madrid',
    '14': 'Región de Murcia',
    '15': 'Comunidad Foral de Navarra',
    '16': 'País Vasco',
    '17': 'Comunidad Valenciana',
    '18': 'Ciudad de Ceuta',
    '19': 'Ciudad de Melilla',
};

// ===== WMO WEATHER CODE DESCRIPTIONS =====
const WMO_CODES = {
    0: 'Despejado — sin nubes visibles',
    1: 'Principalmente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado — cielo cubierto',
    45: 'Niebla',
    48: 'Niebla con escarcha depositada',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna densa',
    56: 'Llovizna helada ligera',
    57: 'Llovizna helada densa',
    61: 'Lluvia débil',
    63: 'Lluvia moderada',
    65: 'Lluvia fuerte',
    66: 'Lluvia helada ligera',
    67: 'Lluvia helada fuerte',
    71: 'Nevada débil',
    73: 'Nevada moderada',
    75: 'Nevada fuerte',
    77: 'Granos de nieve',
    80: 'Chubascos débiles',
    81: 'Chubascos moderados',
    82: 'Chubascos violentos',
    85: 'Chubascos de nieve débiles',
    86: 'Chubascos de nieve fuertes',
    95: 'Tormenta',
    96: 'Tormenta con granizo débil',
    99: 'Tormenta con granizo fuerte'
};

// ===== NATIONAL PARKS (OAPN) =====
const NATIONAL_PARKS = [
    { nombre: 'Picos de Europa', comunidad: 'Asturias / Cantabria / Castilla y León', superficie: 646, anio: 1918, lat: 43.17, lon: -4.85 },
    { nombre: 'Ordesa y Monte Perdido', comunidad: 'Aragón', superficie: 156, anio: 1918, lat: 42.67, lon: -0.02 },
    { nombre: 'Aigüestortes i Estany de Sant Maurici', comunidad: 'Cataluña', superficie: 408, anio: 1955, lat: 42.58, lon: 1.02 },
    { nombre: 'Sierra de Guadarrama', comunidad: 'Castilla y León / Madrid', superficie: 339, anio: 2013, lat: 40.85, lon: -3.85 },
    { nombre: 'Monfragüe', comunidad: 'Extremadura', superficie: 116, anio: 2007, lat: 39.83, lon: -6.05 },
    { nombre: 'Cabañeros', comunidad: 'Castilla-La Mancha', superficie: 390, anio: 1995, lat: 39.38, lon: -4.32 },
    { nombre: 'Doñana', comunidad: 'Andalucía', superficie: 542, anio: 1969, lat: 36.95, lon: -6.35 },
    { nombre: 'Sierra Nevada', comunidad: 'Andalucía', superficie: 862, anio: 1999, lat: 37.05, lon: -3.37 },
    { nombre: 'Tablas de Daimiel', comunidad: 'Castilla-La Mancha', superficie: 30, anio: 1973, lat: 39.15, lon: -3.08 },
    { nombre: 'Timanfaya', comunidad: 'Canarias', superficie: 51, anio: 1974, lat: 29.00, lon: -13.83 },
    { nombre: 'Caldera de Taburiente', comunidad: 'Canarias', superficie: 46, anio: 1954, lat: 28.75, lon: -17.87 },
    { nombre: 'Garajonay', comunidad: 'Canarias', superficie: 40, anio: 1981, lat: 28.10, lon: -17.23 },
    { nombre: 'Teide', comunidad: 'Canarias', superficie: 189, anio: 1954, lat: 28.27, lon: -16.64 },
    { nombre: 'Archipiélago de Cabrera', comunidad: 'Illes Balears', superficie: 100, anio: 1991, lat: 39.15, lon: 2.95 },
    { nombre: 'Islas Atlánticas de Galicia', comunidad: 'Galicia', superficie: 1185, anio: 2004, lat: 42.50, lon: -9.00 },
    { nombre: 'Sierra de las Nieves', comunidad: 'Andalucía', superficie: 201, anio: 2021, lat: 36.68, lon: -5.02 },
];

// ===== EMBALSES DATA (from data/embalses/) =====
const EMBALSES_DATA = {
    'Cantábrico': [
        { nombre: 'Aldeadávila', nivel: 62.3 },
        { nombre: 'Villalcampo', nivel: 71.8 },
        { nombre: 'Ricobayo', nivel: 45.2 },
        { nombre: 'Cernadilla', nivel: 88.1 }
    ],
    'Ebro': [
        { nombre: 'Mequinenza', nivel: 21.2 },
        { nombre: 'Ribarroja', nivel: 56.1 },
        { nombre: 'Flix', nivel: 75.7 },
        { nombre: 'Canelles', nivel: 51.7 }
    ],
    'Guadalquivir': [
        { nombre: 'Iznájar', nivel: 34.5 },
        { nombre: 'Alcalá del Río', nivel: 52.8 },
        { nombre: 'Negratín', nivel: 29.1 }
    ],
    'Júcar': [
        { nombre: 'Alarcón', nivel: 41.3 },
        { nombre: 'Contreras', nivel: 63.7 },
        { nombre: 'Tous', nivel: 55.2 }
    ],
    'Miño-Sil': [
        { nombre: 'Belesar', nivel: 47.8 },
        { nombre: 'Salamonde', nivel: 72.3 }
    ],
    'Segura': [
        { nombre: 'Camarena', nivel: 38.9 },
        { nombre: 'Alquife', nivel: 22.4 }
    ],
    'Tajo': [
        { nombre: 'El Atazar', nivel: 58.6 },
        { nombre: 'Pantano de Bolarque', nivel: 44.1 },
        { nombre: 'Boruja', nivel: 66.2 }
    ]
};

// ===== PROVINCE MAIN RIVERS =====
const PROVINCE_RIVERS = {
    '28': 'Tajo',
    '08': 'Llobregat',
    '41': 'Guadalquivir',
    '48': 'Nervión',
    '46': 'Turia',
    '50': 'Ebro',
    '20': 'Bidasoa',
    '36': 'Lérez',
    '15': 'Anllóns',
    '17': 'Ter',
    '14': 'Segura',
    '03': 'Segura',
    '30': 'Segura',
    '06': 'Guadalete',
    '33': 'Nalón',
    '39': 'Sella',
    '24': 'Bernesga',
    '23': 'Guadalquivir',
    '11': 'Odiel',
    '04': 'Andarax',
    '29': 'Guadalhorce',
    '18': 'Darro',
    '21': 'Odiel',
    '45': 'Guadiana',
    '09': 'Ebro',
    '22': 'Ebro',
    '16': 'Júcar',
    '12': 'Segura',
    '10': 'Guadiana',
    '05': 'Guadalupejo',
    '25': 'Segre',
    '43': 'Ebro',
    '44': 'Jiloca',
    '31': 'Ega',
    '32': 'Miño',
    '34': 'Esla',
    '37': 'Tormes',
    '47': 'Duero',
    '49': 'Tormes',
    '02': 'Jiloca',
    '13': 'Guadiana',
    '19': 'Henares',
    '42': 'Duero',
    '38': 'Güímar',
    '35': 'Barranco de Tirajana',
    '01': 'Nervión',
    '40': 'Eresma',
    '26': 'Ebro',
    '27': 'Sil',
    '07': 'Torrente de Ses Feixes',
};

// ===== GLOBAL STATE =====
let map = null;
let provincesGeo = null;
let provinceData = {};
let geoLayer = null;
let provincesOverlay = null;
let parksOverlay = null;
let selectedProvince = null;
let filteredProvince = null; // For province filter across tabs
let charts = {};
let provinceCentroids = {};
let loadStartTime = Date.now();
let resizeTimeout;
let selectedStationIdx = 0;

// Expose state to window — use getters/setters to keep references in sync
// (let-scoped vars don't auto-sync with window properties)
Object.defineProperty(window, 'map', {
  get() { return map; },
  set(v) { map = v; },
  configurable: true
});
Object.defineProperty(window, 'provincesGeo', {
  get() { return provincesGeo; },
  set(v) { provincesGeo = v; },
  configurable: true
});
Object.defineProperty(window, 'provinceData', {
  get() { return provinceData; },
  set(v) { provinceData = v; },
  configurable: true
});
Object.defineProperty(window, 'geoLayer', {
  get() { return geoLayer; },
  set(v) { geoLayer = v; },
  configurable: true
});
Object.defineProperty(window, 'provincesOverlay', {
  get() { return provincesOverlay; },
  set(v) { provincesOverlay = v; },
  configurable: true
});
Object.defineProperty(window, 'parksOverlay', {
  get() { return parksOverlay; },
  set(v) { parksOverlay = v; },
  configurable: true
});
Object.defineProperty(window, 'selectedProvince', {
  get() { return selectedProvince; },
  set(v) { selectedProvince = v; },
  configurable: true
});
Object.defineProperty(window, 'filteredProvince', {
  get() { return filteredProvince; },
  set(v) { filteredProvince = v; },
  configurable: true
});
Object.defineProperty(window, 'charts', {
  get() { return charts; },
  set(v) { charts = v; },
  configurable: true
});
Object.defineProperty(window, 'provinceCentroids', {
  get() { return provinceCentroids; },
  set(v) { provinceCentroids = v; },
  configurable: true
});
Object.defineProperty(window, 'loadStartTime', {
  get() { return loadStartTime; },
  set(v) { loadStartTime = v; },
  configurable: true
});
Object.defineProperty(window, 'resizeTimeout', {
  get() { return resizeTimeout; },
  set(v) { resizeTimeout = v; },
  configurable: true
});
Object.defineProperty(window, 'selectedStationIdx', {
  get() { return selectedStationIdx; },
  set(v) { selectedStationIdx = v; },
  configurable: true
});
// ===== LLUVIA CITIES (selector de ciudades para pestaña Lluvia) =====
const LLUVIA_CITIES = [
    { name: 'Madrid', lat: 40.42, lon: -3.70 },
    { name: 'Barcelona', lat: 41.39, lon: 2.17 },
    { name: 'Valencia', lat: 39.47, lon: -0.38 },
    { name: 'Sevilla', lat: 37.39, lon: -5.98 },
    { name: 'Bilbao', lat: 43.26, lon: -2.93 },
    { name: 'Zaragoza', lat: 41.65, lon: -0.88 },
    { name: 'Málaga', lat: 36.72, lon: -4.42 },
    { name: 'A Coruña', lat: 43.37, lon: -8.41 },
];

// ===== EVAPO CITIES (selector de ciudades para pestaña Evapotranspiración) =====
const EVAPO_CITIES = [
    { name: 'Madrid', lat: 40.42, lon: -3.70, cc: 'Castilla-La Mancha' },
    { name: 'Sevilla', lat: 37.39, lon: -6.00, cc: 'Andalucía' },
    { name: 'Barcelona', lat: 41.39, lon: 2.17, cc: 'Cataluña' },
    { name: 'Valencia', lat: 39.45, lon: -0.32, cc: 'Comunidad Valenciana' },
    { name: 'Bilbao', lat: 43.26, lon: -2.93, cc: 'País Vasco' },
    { name: 'Málaga', lat: 36.72, lon: -4.42, cc: 'Andalucía' },
    { name: 'Zaragoza', lat: 41.65, lon: -0.88, cc: 'Aragón' },
    { name: 'Palma', lat: 39.57, lon: 2.65, cc: 'Islas Baleares' },
];

// Assign to window AFTER const declarations (temporal dead zone fix)
window.LLUVIA_CITIES = LLUVIA_CITIES;
window.EVAPO_CITIES = EVAPO_CITIES;

// ===== GLOBAL HELPER: safe DOM text updates =====
const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; else console.warn('Element not found:', id); };
window.setTxt = setTxt;

// ===== TOGGLE SIDEBAR (exported for FAB) =====
