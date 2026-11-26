<template>
  <div class="map-wrap" :class="{ 'con-tarjeta-abierta': tarjetaAbierta }">
    <div ref="mapContainer" class="map-container"></div>
    <div ref="capaEtiquetas3D" class="capa-etiquetas-3d"></div>

    <div v-if="errorMapa" class="error-mapa">
      {{ errorMapa }}
    </div>

    <div v-if="!guiando" class="selector-origen">
      <MapPin class="icono-origen" :size="16" />
      <label for="select-origen">Salir desde:</label>
      <select id="select-origen" v-model="origenSeleccionado">
        <option value="auto">Automático (GPS / Entrada cercana)</option>
        <option
          v-for="(acceso, idx) in accesosCampus"
          :key="acceso.nombre"
          :value="idx"
        >
          {{ acceso.nombre }}
        </option>
      </select>
    </div>

    <button class="btn-vista" @click="toggleVista">
      <component :is="vistaSatelite ? MapIcon : Globe" :size="18" />
      <span>{{ vistaSatelite ? 'Ver Mapa Sencillo' : 'Ver Satélite' }}</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Map as MapIcon, Globe } from 'lucide-vue-next';
import { obtenerDatosCampus } from '../services/campusSync.js';

if (import.meta.env.PROD && typeof maplibregl.setWorkerUrl === 'function') {
  maplibregl.setWorkerUrl('/maplibre-worker.js');
}

const props = defineProps({
  tarjetaAbierta: {
    type: Boolean,
    default: false
  },
  guiando: {
    type: Boolean,
    default: false
  },
  seleccionandoTramo: {
    type: Boolean,
    default: false
  },
  tramoSeleccionadoId: {
    type: [Number, String],
    default: null
  }
});

const emit = defineEmits([
  'seleccionar-edificio',
  'seleccionar-salon',
  'actualizacion-gps',
  'clic-mapa',
  'seleccionar-tramo'
]);

const mapContainer = ref(null);
const capaEtiquetas3D = ref(null);
const errorMapa = ref('');
let map = null;
let watchId = null;
let resizeObserver = null;
let salonesCache = null;
let elementosEtiquetas3D = [];
let elementoDestino3D = null;

const vistaSatelite = ref(false);
const ubicacionUsuario = ref(null);
const origenSeleccionado = ref('auto');
const edificioActivoId = ref(null);
const salonActivoId = ref(null);
const salonActivoNombre = ref('');
const pisoActivo = ref('PB');
const soloEdificios = ref(true);
const idsEdificiosConSalones = ref([]);

const ZOOM_MAX_NORMAL = 21.5;
const ZOOM_MAX_SATELITE = 18.2;

const ACCESOS_BASE = [
  {
    nombre: 'Puerta Puente del Tecnológico / Riberas',
    etiqueta: 'Puerta Puente Tec',
    coords: [-96.74630669434635, 17.078456917290136],
    postes: null
  },
  {
    nombre: 'Puerta Av. Tecnológico (Norte)',
    etiqueta: 'Puerta Av. Tecnológico',
    coords: [-96.74538887234341, 17.079018506015785],
    postes: null
  },
  {
    nombre: 'Puerta Riveras y Juan de Dios Bátiz',
    etiqueta: 'Puerta Riberas / Bátiz',
    coords: [-96.74475163449951, 17.075831796177102],
    postes: null
  },
  {
    nombre: 'Puerta Av. Ferrocarril (Sur / Bátiz)',
    etiqueta: 'Puerta Av. Ferrocarril',
    coords: [-96.74320435437524, 17.076342002947552],
    postes: null
  },
  {
    nombre: 'Puerta Calzada Madero (Posgrado)',
    etiqueta: 'Puerta Calzada Madero',
    coords: [-96.74339672315243, 17.079301983144862],
    postes: null
  }
];

const accesosCampus = ref(ACCESOS_BASE.map((a) => ({ ...a })));

const distanciaMetros = (c1, c2) => {
  const R = 6371000;
  const rad = Math.PI / 180;
  const lat1 = c1[1] * rad;
  const lat2 = c2[1] * rad;
  const dLat = (c2[1] - c1[1]) * rad;
  const dLon = (c2[0] - c1[0]) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const calcularCentroidePoligono = (geometry) => {
  if (!geometry) return null;
  if (geometry.type === 'Point') return geometry.coordinates;
  const anillo =
    geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates[0][0]
        : null;
  if (!anillo || !anillo.length) return null;

  const cerrado =
    anillo.length > 1 &&
    anillo[0][0] === anillo[anillo.length - 1][0] &&
    anillo[0][1] === anillo[anillo.length - 1][1];
  const total = cerrado ? anillo.length - 1 : anillo.length;

  let sumLng = 0;
  let sumLat = 0;
  for (let i = 0; i < total; i++) {
    sumLng += anillo[i][0];
    sumLat += anillo[i][1];
  }
  return [sumLng / total, sumLat / total];
};

const normalizarPisoVal = (val) => {
  const txt = String(val || 'PB').trim().toUpperCase();
  if (txt === '1' || txt === 'P1') return 'P1';
  if (txt === '2' || txt === 'P2') return 'P2';
  return 'PB';
};

const altitudTechoPiso = (piso) => {
  const p = normalizarPisoVal(piso);
  if (p === 'P2') return 11.55;
  if (p === 'P1') return 7.55;
  return 3.55;
};

const altitudPasilloPiso = (piso) => {
  const p = normalizarPisoVal(piso);
  if (p === 'P2') return 7.85;
  if (p === 'P1') return 4.45;
  return 0.25;
};

const proyectarElemento3D = (item, matriz, ancho, alto) => {
  const { el, mc } = item;
  const clipX = matriz[0] * mc.x + matriz[4] * mc.y + matriz[8] * mc.z + matriz[12];
  const clipY = matriz[1] * mc.x + matriz[5] * mc.y + matriz[9] * mc.z + matriz[13];
  const clipW = matriz[3] * mc.x + matriz[7] * mc.y + matriz[11] * mc.z + matriz[15];

  if (clipW <= 0) {
    el.style.display = 'none';
    return;
  }

  const px = ((clipX / clipW + 1) / 2) * ancho;
  const py = ((1 - clipY / clipW) / 2) * alto;

  if (px < -120 || px > ancho + 120 || py < -120 || py > alto + 120) {
    el.style.display = 'none';
    return;
  }

  el.style.display = 'block';
  el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%)`;
};

const sincronizarPosiciones3D = (matrizArg) => {
  if (!map) return;
  const matriz =
    Array.isArray(matrizArg) || ArrayBuffer.isView(matrizArg)
      ? matrizArg
      : matrizArg?.defaultProjectionData?.mainMatrix;
  if (!matriz) return;

  const canvas = map.getCanvas();
  const ancho = canvas.clientWidth;
  const alto = canvas.clientHeight;

  for (const item of elementosEtiquetas3D) {
    proyectarElemento3D(item, matriz, ancho, alto);
  }
  if (elementoDestino3D) {
    proyectarElemento3D(elementoDestino3D, matriz, ancho, alto);
  }
};

const normalizarSalonesGeojson = (geojson) => {
  if (!geojson || !Array.isArray(geojson.features)) {
    return { type: 'FeatureCollection', features: [] };
  }
  const edifsSet = new Set();

  const features = geojson.features
    .filter((f) => {
      const p = f.properties || {};
      const nombre = String(p.nombre || p.Nombre || '').trim();
      return nombre && nombre !== 'Ejemplo Salon';
    })
    .map((f, idx) => {
      const p = f.properties || {};
      const id = String(p.id || p.ID || `salon-${idx + 1}`).trim();
      const nombre = String(p.nombre || p.Nombre || 'Salón').trim();
      const piso = normalizarPisoVal(p.piso || p.Piso || 'PB');
      const tipo = String(p.tipo || p.Tipo || 'Aula').trim();
      const rawEdif = p.edificio_id ?? p.Edificio_id ?? null;
      const edificioId = rawEdif !== null && rawEdif !== '' ? String(rawEdif).trim() : '';

      if (edificioId) edifsSet.add(edificioId);

      return {
        ...f,
        properties: {
          ...p,
          id,
          nombre,
          piso,
          tipo,
          edificio_id: edificioId
        }
      };
    });

  idsEdificiosConSalones.value = Array.from(edifsSet);
  return { ...geojson, features };
};

const limpiarEtiquetasSalones = () => {
  for (const item of elementosEtiquetas3D) {
    item.el.remove();
  }
  elementosEtiquetas3D = [];
};

const actualizarEtiquetasSalones = () => {
  limpiarEtiquetasSalones();
  if (soloEdificios.value) return;
  if (!map || !salonesCache?.features || !capaEtiquetas3D.value) return;
  if (map.getZoom() < 17.5) return;

  const piso = normalizarPisoVal(pisoActivo.value);
  const altitud = altitudTechoPiso(piso);
  const fragment = document.createDocumentFragment();

  for (const feat of salonesCache.features) {
    const propsFeat = feat.properties || {};
    if (normalizarPisoVal(propsFeat.piso) !== piso) continue;

    const centro = calcularCentroidePoligono(feat.geometry);
    if (!centro) continue;

    const el = document.createElement('div');
    el.className = 'etiqueta-salon-3d';
    el.textContent = propsFeat.nombre || '';
    fragment.appendChild(el);

    elementosEtiquetas3D.push({
      el,
      mc: maplibregl.MercatorCoordinate.fromLngLat(centro, altitud)
    });
  }

  capaEtiquetas3D.value.appendChild(fragment);
  map.triggerRepaint();
};

const limpiarMarcadorDestino3D = () => {
  if (elementoDestino3D) {
    elementoDestino3D.el.remove();
    elementoDestino3D = null;
  }
};

const colocarMarcadorDestino3D = (coords, piso) => {
  limpiarMarcadorDestino3D();
  if (!map || !coords || !capaEtiquetas3D.value) return;

  const el = document.createElement('div');
  el.className = 'pin-destino-3d';
  capaEtiquetas3D.value.appendChild(el);

  elementoDestino3D = {
    el,
    mc: maplibregl.MercatorCoordinate.fromLngLat(coords, altitudPasilloPiso(piso))
  };
  map.triggerRepaint();
};

const ajustarPuertasAPerimetro = (perimetroData) => {
  const lineas = [];
  for (const feat of perimetroData?.features || []) {
    if (feat.geometry?.type === 'LineString' && feat.geometry.coordinates?.length >= 2) {
      lineas.push(feat.geometry.coordinates);
    } else if (feat.geometry?.type === 'MultiLineString') {
      for (const parte of feat.geometry.coordinates || []) {
        if (parte.length >= 2) lineas.push(parte);
      }
    }
  }

  const extremos = [];
  lineas.forEach((coords, idx) => {
    extremos.push({ coord: coords[0], idx });
    extremos.push({ coord: coords[coords.length - 1], idx });
  });

  const aberturas = [];
  for (let i = 0; i < extremos.length; i++) {
    for (let j = i + 1; j < extremos.length; j++) {
      const dist = distanciaMetros(extremos[i].coord, extremos[j].coord);
      if (dist >= 3 && dist <= 45) {
        aberturas.push({
          centro: [
            (extremos[i].coord[0] + extremos[j].coord[0]) / 2,
            (extremos[i].coord[1] + extremos[j].coord[1]) / 2
          ],
          postes: [extremos[i].coord, extremos[j].coord],
          usada: false
        });
      }
    }
  }

  accesosCampus.value = ACCESOS_BASE.map((acceso) => {
    let mejorAbertura = null;
    let menorDist = 75;

    for (const ab of aberturas) {
      if (ab.usada) continue;
      const d = distanciaMetros(acceso.coords, ab.centro);
      if (d < menorDist) {
        menorDist = d;
        mejorAbertura = ab;
      }
    }

    if (mejorAbertura) {
      mejorAbertura.usada = true;
      return {
        ...acceso,
        coords: mejorAbertura.centro,
        postes: mejorAbertura.postes
      };
    }

    return { ...acceso };
  });
};

const construirGeojsonPuertas = () => {
  const puntos = {
    type: 'FeatureCollection',
    features: accesosCampus.value.map((acceso, idx) => ({
      type: 'Feature',
      properties: {
        indice: idx,
        nombre: acceso.etiqueta || acceso.nombre
      },
      geometry: {
        type: 'Point',
        coordinates: acceso.coords
      }
    }))
  };

  const umbrales = {
    type: 'FeatureCollection',
    features: accesosCampus.value
      .filter((a) => Array.isArray(a.postes) && a.postes.length === 2)
      .map((acceso, idx) => ({
        type: 'Feature',
        properties: { indice: idx },
        geometry: {
          type: 'LineString',
          coordinates: acceso.postes
        }
      }))
  };

  return { puntos, umbrales };
};

const cargarGeojsonOpcional = async (ruta) => {
  try {
    const res = await fetch(ruta, { cache: 'no-cache' });
    if (!res.ok) return { type: 'FeatureCollection', features: [] };
    return await res.json();
  } catch {
    return { type: 'FeatureCollection', features: [] };
  }
};

const crearIconoPuerta = () => {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.35)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(24, 41);
  ctx.lineTo(24, 24);
  ctx.arc(32, 24, 8, Math.PI, 0, false);
  ctx.lineTo(40, 41);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(32, 39);
  ctx.lineTo(32, 27);
  ctx.moveTo(28, 31);
  ctx.lineTo(32, 27);
  ctx.lineTo(36, 31);
  ctx.stroke();

  return ctx.getImageData(0, 0, size, size);
};

const solicitarUbicacionGPS = () => {
  if (!('geolocation' in navigator)) return;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      ubicacionUsuario.value = [pos.coords.longitude, pos.coords.latitude];
    },
    (err) => {
      console.warn('No se pudo obtener GPS preciso:', err.message);
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
};

const toggleVista = () => {
  if (!map) return;
  vistaSatelite.value = !vistaSatelite.value;
  const visibilidad = vistaSatelite.value ? 'visible' : 'none';
  map.setLayoutProperty('capa-satelite', 'visibility', visibilidad);

  if (vistaSatelite.value) {
    map.setMaxZoom(ZOOM_MAX_SATELITE);
    if (map.getZoom() > ZOOM_MAX_SATELITE) {
      map.easeTo({ zoom: ZOOM_MAX_SATELITE, duration: 450 });
    }
  } else {
    map.setMaxZoom(ZOOM_MAX_NORMAL);
  }
};

const actualizarCapaTramosEdicion = () => {
  if (!map || !map.getLayer('rutas-campus-linea')) return;

  const visibilidad = props.seleccionandoTramo ? 'visible' : 'none';
  map.setLayoutProperty('rutas-campus-linea', 'visibility', visibilidad);
  map.setLayoutProperty('rutas-campus-hitbox', 'visibility', visibilidad);

  const idSel = props.tramoSeleccionadoId !== null ? String(props.tramoSeleccionadoId) : '';

  map.setPaintProperty('rutas-campus-linea', 'line-color', [
    'case',
    ['==', ['to-string', ['coalesce', ['get', 'id'], ['id']]], idSel],
    '#F59E0B',
    ['==', ['get', 'habilitado'], false],
    '#EF4444',
    '#10B981'
  ]);
};

watch(
  () => [props.seleccionandoTramo, props.tramoSeleccionadoId],
  () => {
    actualizarCapaTramosEdicion();
  }
);

const actualizarEstiloEdificios = () => {
  if (!map || !map.getLayer('edificios-3d')) return;

  const idSel = edificioActivoId.value ? String(edificioActivoId.value) : '';

  if (soloEdificios.value) {
    map.setFilter('edificios-3d', null);
    map.setPaintProperty('edificios-3d', 'fill-extrusion-color', [
      'case',
      ['==', ['to-string', ['get', 'id']], idSel],
      '#F59E0B',
      '#1E88E5'
    ]);

    if (map.getLayer('edificios-envolvente-3d')) {
      map.setFilter('edificios-envolvente-3d', ['==', ['get', 'id'], '']);
    }
    if (map.getLayer('edificios-envolvente-seleccionada-3d')) {
      map.setFilter('edificios-envolvente-seleccionada-3d', ['==', ['get', 'id'], '']);
    }
    if (map.getLayer('salones-3d')) {
      map.setFilter('salones-3d', ['==', ['get', 'id'], '']);
    }
    if (map.getLayer('pasillos-interiores-linea')) {
      map.setFilter('pasillos-interiores-linea', ['==', ['get', 'id'], '']);
    }

    actualizarEtiquetasSalones();
    return;
  }

  const edificioGeneralSeleccionado = Boolean(idSel && !salonActivoId.value);
  const salonSel = salonActivoId.value ? String(salonActivoId.value) : '';
  const nombreSel = salonActivoNombre.value ? String(salonActivoNombre.value).toLowerCase() : '';
  const piso = pisoActivo.value;
  const conInteriores = idsEdificiosConSalones.value;

  let condicionNivel = true;
  if (piso === 'P1') {
    condicionNivel = [
      'any',
      ['>=', ['to-number', ['get', 'altura']], 8],
      ['==', ['upcase', ['to-string', ['get', 'piso']]], 'P1']
    ];
  } else if (piso === 'P2') {
    condicionNivel = [
      'any',
      ['>=', ['to-number', ['get', 'altura']], 12],
      ['==', ['upcase', ['to-string', ['get', 'piso']]], 'P2']
    ];
  }

  const esEdificioInterior = conInteriores.length > 0
    ? ['in', ['to-string', ['get', 'id']], ['literal', conInteriores]]
    : false;

  map.setFilter('edificios-3d', ['!', esEdificioInterior]);

  map.setPaintProperty('edificios-3d', 'fill-extrusion-color', [
    'case',
    ['==', ['to-string', ['get', 'id']], idSel],
    '#F59E0B',
    condicionNivel,
    '#1E88E5',
    '#CBD5E1'
  ]);

  if (map.getLayer('edificios-envolvente-3d')) {
    if (edificioGeneralSeleccionado) {
      map.setFilter('edificios-envolvente-3d', [
        'all',
        esEdificioInterior,
        ['!=', ['to-string', ['get', 'id']], idSel]
      ]);
    } else {
      map.setFilter('edificios-envolvente-3d', esEdificioInterior);
    }
  }

  if (map.getLayer('edificios-envolvente-seleccionada-3d')) {
    if (edificioGeneralSeleccionado) {
      map.setFilter('edificios-envolvente-seleccionada-3d', [
        'all',
        esEdificioInterior,
        ['==', ['to-string', ['get', 'id']], idSel]
      ]);
    } else {
      map.setFilter('edificios-envolvente-seleccionada-3d', ['==', ['get', 'id'], '']);
    }
  }

  if (map.getLayer('salones-3d')) {
    const filtroPiso = ['==', ['get', 'piso'], piso];
    map.setFilter('salones-3d', filtroPiso);

    const basePiso = piso === 'P2' ? 8.1 : piso === 'P1' ? 4.1 : 0.2;
    const altoPiso = piso === 'P2' ? 11.4 : piso === 'P1' ? 7.4 : 3.4;

    map.setPaintProperty('salones-3d', 'fill-extrusion-base', basePiso);
    map.setPaintProperty('salones-3d', 'fill-extrusion-height', altoPiso);
    map.setPaintProperty('salones-3d', 'fill-extrusion-color', [
      'case',
      [
        'all',
        ['!=', ['literal', salonSel], ''],
        [
          'any',
          ['==', ['to-string', ['get', 'id']], salonSel],
          ['==', ['downcase', ['get', 'nombre']], nombreSel]
        ]
      ],
      '#F59E0B',
      ['in', ['downcase', ['get', 'tipo']], ['literal', ['baño', 'baños']]],
      '#0D9488',
      ['==', ['downcase', ['get', 'tipo']], 'oficina'],
      '#6366F1',
      '#0284C7'
    ]);
  }

  if (map.getLayer('pasillos-interiores-linea')) {
    map.setFilter('pasillos-interiores-linea', [
      'all',
      [
        'in',
        ['downcase', ['coalesce', ['get', 'Tipo'], ['get', 'tipo'], '']],
        ['literal', ['pasillo', 'escalera', 'escaleras', 'rampa', 'escalera/rampa']]
      ],
      [
        'any',
        ['==', ['upcase', ['coalesce', ['get', 'Piso'], ['get', 'piso'], 'PB']], piso],
        ['==', ['upcase', ['coalesce', ['get', 'Piso_fin'], ['get', 'piso_fin'], '']], piso]
      ]
    ]);
  }

  actualizarEtiquetasSalones();
};

const actualizarMarcadorUsuario = (coords) => {
  if (!map) return;
  const fuente = map.getSource('usuario-vivo');
  if (!fuente) return;

  if (!coords) {
    fuente.setData({ type: 'FeatureCollection', features: [] });
    return;
  }

  fuente.setData({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords }
      }
    ]
  });
};

const normalizarRutasGeojson = (geojson) => {
  if (!geojson || !Array.isArray(geojson.features)) return geojson;
  return {
    ...geojson,
    features: geojson.features.map((f, idx) => {
      const fProps = f.properties || {};
      const idResuelto = fProps.id ?? fProps.ID ?? fProps.fid ?? fProps.FID ?? f.id ?? (idx + 1);
      return {
        ...f,
        id: idResuelto,
        properties: {
          ...fProps,
          id: idResuelto
        }
      };
    })
  };
};

onMounted(() => {
  solicitarUbicacionGPS();

  const limitesITO = [
    [-96.751517, 17.074415],
    [-96.736851, 17.081369]
  ];

  try {
    map = new maplibregl.Map({
      container: mapContainer.value,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [-96.744388, 17.077856],
      zoom: 16.5,
      minZoom: 15.5,
      maxZoom: ZOOM_MAX_NORMAL,
      maxBounds: limitesITO,
      pitch: 0,
      bearing: 0,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
        antialias: false,
        failIfMajorPerformanceCaveat: false
      }
    });
  } catch (err) {
    errorMapa.value = `Error iniciando WebGL: ${err.message}`;
    return;
  }

  map.getCanvas()?.addEventListener('webglcontextcreationerror', (e) => {
    errorMapa.value = `WebGL no disponible: ${e.statusMessage || 'sin soporte'}`;
  });

  resizeObserver = new ResizeObserver(() => {
    if (map) map.resize();
  });
  if (mapContainer.value) {
    resizeObserver.observe(mapContainer.value);
  }
  setTimeout(() => {
    if (map) map.resize();
  }, 300);

  map.on('error', (e) => {
    const msg = e?.error?.message || '';
    console.error('Error MapLibre:', e?.error || e);
    if (msg && !msg.includes('Failed to fetch')) {
      errorMapa.value = `Aviso mapa: ${msg}`;
    }
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  const geolocateControl = new maplibregl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true
  });

  geolocateControl.on('geolocate', (e) => {
    ubicacionUsuario.value = [e.coords.longitude, e.coords.latitude];
  });

  map.addControl(geolocateControl, 'top-right');

  map.on('zoomend', () => {
    actualizarEtiquetasSalones();
  });

  map.on('load', async () => {
    map.resize();

    const [datosCampus, perimetroData, salonesRaw] = await Promise.all([
      obtenerDatosCampus(),
      cargarGeojsonOpcional('/perimetro.geojson'),
      cargarGeojsonOpcional('/salones.geojson')
    ]);

    const salonesData = normalizarSalonesGeojson(salonesRaw);
    salonesCache = salonesData;
    ajustarPuertasAPerimetro(perimetroData);
    const { puntos: puertasPuntos, umbrales: puertasUmbrales } = construirGeojsonPuertas();

    map.addImage('icono-puerta', crearIconoPuerta(), { pixelRatio: 2 });

    map.addSource('fuente-satelite', {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 18
    });

    map.addSource('perimetro-ito', {
      type: 'geojson',
      data: perimetroData
    });

    map.addSource('edificios-ito', {
      type: 'geojson',
      data: datosCampus.edificios || '/edificios.geojson'
    });

    map.addSource('salones-ito', {
      type: 'geojson',
      data: salonesData
    });

    map.addSource('puertas-umbrales', {
      type: 'geojson',
      data: puertasUmbrales
    });

    map.addSource('puertas-ito', {
      type: 'geojson',
      data: puertasPuntos
    });

    map.addSource('rutas-campus', {
      type: 'geojson',
      data: normalizarRutasGeojson(datosCampus.rutas) || '/rutas.geojson'
    });

    map.addSource('ruta-activa', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    map.addSource('ruta-elevada-src', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    map.addSource('usuario-vivo', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    map.addLayer({
      id: 'capa-satelite',
      type: 'raster',
      source: 'fuente-satelite',
      layout: { visibility: 'none' }
    });

    map.addLayer({
      id: 'muros-campus-borde',
      type: 'line',
      source: 'perimetro-ito',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': 7.5,
        'line-opacity': 0.85
      }
    });

    map.addLayer({
      id: 'muros-campus-linea',
      type: 'line',
      source: 'perimetro-ito',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#1e293b',
        'line-width': 4.5,
        'line-opacity': 0.95
      }
    });

    map.addLayer({
      id: 'puertas-umbral-borde',
      type: 'line',
      source: 'puertas-umbrales',
      layout: {
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': 7,
        'line-opacity': 0.9
      }
    });

    map.addLayer({
      id: 'puertas-umbral',
      type: 'line',
      source: 'puertas-umbrales',
      layout: {
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#10b981',
        'line-width': 4,
        'line-dasharray': [1.2, 1.2]
      }
    });

    map.addLayer({
      id: 'edificios-3d',
      type: 'fill-extrusion',
      source: 'edificios-ito',
      paint: {
        'fill-extrusion-color': '#1E88E5',
        'fill-extrusion-height': ['to-number', ['get', 'altura']],
        'fill-extrusion-base': ['to-number', ['get', 'base']],
        'fill-extrusion-opacity': 0.90
      }
    });

    map.addLayer({
      id: 'pasillos-interiores-linea',
      type: 'line',
      source: 'rutas-campus',
      minzoom: 17.5,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#94a3b8',
        'line-width': 3,
        'line-dasharray': [1.5, 1.5],
        'line-opacity': 0.85
      }
    });

    map.addLayer({
      id: 'salones-3d',
      type: 'fill-extrusion',
      source: 'salones-ito',
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'fill-extrusion-color': [
          'case',
          ['in', ['downcase', ['get', 'tipo']], ['literal', ['baño', 'baños']]],
          '#0D9488',
          ['==', ['downcase', ['get', 'tipo']], 'oficina'],
          '#6366F1',
          '#0284C7'
        ],
        'fill-extrusion-height': 3.4,
        'fill-extrusion-base': 0.2,
        'fill-extrusion-opacity': 0.92
      }
    });

    map.addLayer({
      id: 'ruta-elevada-3d',
      type: 'fill-extrusion',
      source: 'ruta-elevada-src',
      paint: {
        'fill-extrusion-color': [
          'match',
          ['get', 'tipo'],
          'escalera', '#EF4444',
          '#FF6D00'
        ],
        'fill-extrusion-base': ['get', 'base'],
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-opacity': 0.95
      }
    });

    map.addLayer({
      id: 'edificios-envolvente-3d',
      type: 'fill-extrusion',
      source: 'edificios-ito',
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'fill-extrusion-color': '#3B82F6',
        'fill-extrusion-height': ['to-number', ['get', 'altura']],
        'fill-extrusion-base': ['to-number', ['get', 'base']],
        'fill-extrusion-opacity': 0.16
      }
    });

    map.addLayer({
      id: 'edificios-envolvente-seleccionada-3d',
      type: 'fill-extrusion',
      source: 'edificios-ito',
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'fill-extrusion-color': '#D97706',
        'fill-extrusion-height': ['to-number', ['get', 'altura']],
        'fill-extrusion-base': ['to-number', ['get', 'base']],
        'fill-extrusion-opacity': 0.10
      }
    });

    map.addLayer({
      id: 'edificios-etiquetas',
      type: 'symbol',
      source: 'edificios-ito',
      minzoom: 16.8,
      layout: {
        'text-field': ['get', 'nombre'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 16.8, 11, 19, 14],
        'text-max-width': 8,
        'text-anchor': 'center',
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#1e293b',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 0.5
      }
    });

    map.addLayer({
      id: 'puertas-etiquetas',
      type: 'symbol',
      source: 'puertas-ito',
      minzoom: 15.5,
      layout: {
        'icon-image': 'icono-puerta',
        'icon-size': 0.9,
        'icon-anchor': 'center',
        'icon-allow-overlap': true,
        'text-field': ['get', 'nombre'],
        'text-size': 11.5,
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 1.35,
        'text-max-width': 11,
        'text-optional': true
      },
      paint: {
        'text-color': '#065f46',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2.5
      }
    });

    map.addLayer({
      id: 'rutas-campus-linea',
      type: 'line',
      source: 'rutas-campus',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        visibility: props.seleccionandoTramo ? 'visible' : 'none'
      },
      paint: {
        'line-color': [
          'case',
          ['==', ['get', 'habilitado'], false],
          '#EF4444',
          '#10B981'
        ],
        'line-width': 5,
        'line-opacity': 0.9
      }
    });

    map.addLayer({
      id: 'rutas-campus-hitbox',
      type: 'line',
      source: 'rutas-campus',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        visibility: props.seleccionandoTramo ? 'visible' : 'none'
      },
      paint: {
        'line-color': '#000000',
        'line-width': 22,
        'line-opacity': 0.01
      }
    });

    map.addLayer({
      id: 'ruta-activa-borde',
      type: 'line',
      source: 'ruta-activa',
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#FFFFFF', 'line-width': 8, 'line-opacity': 0.9 }
    });

    map.addLayer({
      id: 'ruta-activa-linea',
      type: 'line',
      source: 'ruta-activa',
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#FF6D00', 'line-width': 5 }
    });

    map.addLayer({
      id: 'ruta-extremos',
      type: 'circle',
      source: 'ruta-activa',
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 7,
        'circle-color': [
          'match',
          ['get', 'rol'],
          'inicio', '#10B981',
          'fin', '#EF4444',
          '#FF6D00'
        ],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#FFFFFF'
      }
    });

    map.addLayer({
      id: 'usuario-vivo-halo',
      type: 'circle',
      source: 'usuario-vivo',
      paint: {
        'circle-radius': 18,
        'circle-color': '#2563EB',
        'circle-opacity': 0.22
      }
    });

    map.addLayer({
      id: 'usuario-vivo-punto',
      type: 'circle',
      source: 'usuario-vivo',
      paint: {
        'circle-radius': 7.5,
        'circle-color': '#2563EB',
        'circle-stroke-width': 3,
        'circle-stroke-color': '#FFFFFF'
      }
    });

    map.addLayer({
      id: 'proyeccion-etiquetas-3d',
      type: 'custom',
      renderingMode: '3d',
      onAdd() {},
      render(_gl, matrixArg) {
        sincronizarPosiciones3D(matrixArg);
      }
    });

    map.on('mouseenter', 'rutas-campus-hitbox', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'rutas-campus-hitbox', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('click', ['rutas-campus-hitbox', 'rutas-campus-linea'], (e) => {
      if (!props.seleccionandoTramo || !e.features || !e.features.length) return;
      const feat = e.features[0];
      const fProps = feat.properties || {};
      const idTramo = fProps.id ?? fProps.ID ?? fProps.fid ?? feat.id;

      emit('seleccionar-tramo', {
        id: Number(idTramo) || idTramo,
        habilitado: fProps.habilitado !== false,
        tipo: fProps.tipo || fProps.Tipo || 'andador',
        accesible: fProps.accesible !== false
      });
    });

    map.on('mouseenter', 'puertas-etiquetas', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'puertas-etiquetas', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('click', 'puertas-etiquetas', (e) => {
      if (!e.features || !e.features.length) return;
      const idx = Number(e.features[0].properties.indice);
      if (!Number.isNaN(idx) && accesosCampus.value[idx]) {
        origenSeleccionado.value = idx;
      }
    });

    map.on('mouseenter', 'salones-3d', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'salones-3d', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('click', 'salones-3d', (e) => {
      if (!e.features || !e.features.length) return;
      const feat = e.features[0];
      const fProps = feat.properties || {};
      const centro = calcularCentroidePoligono(feat.geometry) || [e.lngLat.lng, e.lngLat.lat];

      emit('seleccionar-salon', {
        id: String(fProps.id || fProps.nombre),
        nombre: fProps.nombre || 'Salón',
        tipo: fProps.tipo || 'Aula',
        piso: String(fProps.piso || 'PB').toUpperCase(),
        edificioId: fProps.edificio_id ? String(fProps.edificio_id) : null,
        coordenadas: centro
      });
    });

    map.on('mouseenter', ['edificios-3d', 'edificios-envolvente-3d', 'edificios-envolvente-seleccionada-3d'], () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', ['edificios-3d', 'edificios-envolvente-3d', 'edificios-envolvente-seleccionada-3d'], () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('click', (e) => {
      emit('clic-mapa', [e.lngLat.lng, e.lngLat.lat]);
    });

    map.on('click', ['edificios-3d', 'edificios-envolvente-3d', 'edificios-envolvente-seleccionada-3d'], (e) => {
      if (!e.features || !e.features.length) return;
      const salonesEnPunto = map.queryRenderedFeatures(e.point, { layers: ['salones-3d'] });
      if (salonesEnPunto.length > 0) return;

      const fProps = e.features[0].properties;
      emit('seleccionar-edificio', {
        edificioId: String(fProps.id),
        nombre: fProps.nombre || 'Edificio',
        coordenadas: [e.lngLat.lng, e.lngLat.lat]
      });
    });

    actualizarEstiloEdificios();
    actualizarCapaTramosEdicion();
  });
});

onUnmounted(() => {
  detenerSeguimientoVivo();
  limpiarEtiquetasSalones();
  limpiarMarcadorDestino3D();
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (map) map.remove();
});

const actualizarEdificios = (geojson) => {
  if (!map || !geojson) return;
  const fuente = map.getSource('edificios-ito');
  if (fuente) {
    fuente.setData(geojson);
  }
};

const actualizarRutas = (geojson) => {
  if (!map || !geojson) return;
  const fuente = map.getSource('rutas-campus');
  if (fuente) {
    fuente.setData(normalizarRutasGeojson(geojson));
  }
};

const obtenerUbicacionOrigen = () => {
  const lista = accesosCampus.value;

  if (origenSeleccionado.value !== 'auto') {
    const manual = lista[Number(origenSeleccionado.value)];
    return { coords: manual.coords, nombre: manual.nombre, esGPS: false };
  }

  if (ubicacionUsuario.value) {
    const [lng, lat] = ubicacionUsuario.value;

    const dentroDeCampus =
      lng >= -96.7466 && lng <= -96.7430 &&
      lat >= 17.0757 && lat <= 17.0798;

    if (dentroDeCampus) {
      return {
        coords: ubicacionUsuario.value,
        nombre: 'Tu ubicación actual',
        esGPS: true
      };
    }

    let accesoMasCercano = lista[0];
    let menorDistancia = Infinity;

    for (const acceso of lista) {
      const dist = distanciaMetros(ubicacionUsuario.value, acceso.coords);
      if (dist < menorDistancia) {
        menorDistancia = dist;
        accesoMasCercano = acceso;
      }
    }

    return {
      coords: accesoMasCercano.coords,
      nombre: accesoMasCercano.nombre,
      esGPS: true
    };
  }

  return {
    coords: lista[0].coords,
    nombre: lista[0].nombre,
    esGPS: false
  };
};

const volarACoordenada = (lng, lat, rumbo = -20) => {
  if (!map) return;

  map.flyTo({
    center: [lng, lat],
    zoom: vistaSatelite.value ? 18.0 : 19.2,
    pitch: 60,
    bearing: rumbo,
    duration: 1400,
    essential: true
  });
};

const enfocarNavegacion = (coords, rumbo = null) => {
  if (!map || !coords) return;

  map.easeTo({
    center: coords,
    zoom: vistaSatelite.value ? 18.1 : 19.5,
    pitch: 60,
    bearing: rumbo !== null && !Number.isNaN(rumbo) ? rumbo : map.getBearing(),
    duration: 750
  });
};

const iniciarSeguimientoVivo = (puntoInicial = null, rumboInicial = 0) => {
  detenerSeguimientoVivo();

  const inicio = ubicacionUsuario.value || puntoInicial;
  if (inicio) {
    actualizarMarcadorUsuario(inicio);
    enfocarNavegacion(inicio, rumboInicial);
  }

  if (!('geolocation' in navigator)) return;

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const coords = [pos.coords.longitude, pos.coords.latitude];
      ubicacionUsuario.value = coords;
      actualizarMarcadorUsuario(coords);

      emit('actualizacion-gps', {
        coords,
        heading: pos.coords.heading,
        accuracy: pos.coords.accuracy
      });
    },
    (err) => {
      console.warn('Seguimiento GPS en espera:', err.message);
    },
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
  );
};

const detenerSeguimientoVivo = () => {
  if (watchId !== null && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  actualizarMarcadorUsuario(null);
};

const resaltarEdificio = (edificioId, salonId = null, salonNombre = '') => {
  edificioActivoId.value = edificioId || null;
  salonActivoId.value = salonId || null;
  salonActivoNombre.value = salonNombre || '';
  actualizarEstiloEdificios();
};

const cambiarNivelPiso = (piso) => {
  soloEdificios.value = false;
  pisoActivo.value = normalizarPisoVal(piso);
  actualizarEstiloEdificios();
};

const cambiarSoloEdificios = (activo = true) => {
  soloEdificios.value = Boolean(activo);
  actualizarEstiloEdificios();
};

const dibujarRuta = (rutaInput, ajustarCamara = true) => {
  if (!map) return;
  const fuente = map.getSource('ruta-activa');
  const fuenteElevada = map.getSource('ruta-elevada-src');
  if (!fuente) return;

  const esObjetoRuta = rutaInput && !Array.isArray(rutaInput) && Array.isArray(rutaInput.coordenadas);
  const coordenadas = esObjetoRuta ? rutaInput.coordenadas : rutaInput;
  if (!Array.isArray(coordenadas) || coordenadas.length < 2) return;

  const inicio = coordenadas[0];
  const fin = coordenadas[coordenadas.length - 1];
  const nodos = esObjetoRuta && Array.isArray(rutaInput.nodos) ? rutaInput.nodos : [];
  const pisoFin = nodos.length ? normalizarPisoVal(nodos[nodos.length - 1].piso) : 'PB';

  if (esObjetoRuta && rutaInput.geojson3D) {
    const featuresPB = [
      ...(rutaInput.geojson3D.rutaPB?.features || []),
      {
        type: 'Feature',
        properties: { rol: 'inicio' },
        geometry: { type: 'Point', coordinates: inicio }
      }
    ];

    if (pisoFin === 'PB') {
      featuresPB.push({
        type: 'Feature',
        properties: { rol: 'fin' },
        geometry: { type: 'Point', coordinates: fin }
      });
      limpiarMarcadorDestino3D();
    } else {
      colocarMarcadorDestino3D(fin, pisoFin);
    }

    fuente.setData({ type: 'FeatureCollection', features: featuresPB });
    if (fuenteElevada) {
      fuenteElevada.setData(rutaInput.geojson3D.rutaElevada || { type: 'FeatureCollection', features: [] });
    }
  } else {
    limpiarMarcadorDestino3D();
    fuente.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { rol: 'linea' },
          geometry: { type: 'LineString', coordinates: coordenadas }
        },
        {
          type: 'Feature',
          properties: { rol: 'inicio' },
          geometry: { type: 'Point', coordinates: inicio }
        },
        {
          type: 'Feature',
          properties: { rol: 'fin' },
          geometry: { type: 'Point', coordinates: fin }
        }
      ]
    });
    if (fuenteElevada) {
      fuenteElevada.setData({ type: 'FeatureCollection', features: [] });
    }
  }

  if (ajustarCamara) {
    const bounds = coordenadas.reduce(
      (b, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(coordenadas[0], coordenadas[0])
    );

    map.fitBounds(bounds, {
      padding: { top: 140, bottom: 210, left: 60, right: 60 },
      pitch: 55,
      maxZoom: vistaSatelite.value ? 18.0 : 19.8,
      duration: 1600
    });
  }
};

const limpiarRuta = () => {
  if (!map) return;
  const fuente = map.getSource('ruta-activa');
  if (fuente) {
    fuente.setData({ type: 'FeatureCollection', features: [] });
  }
  const fuenteElevada = map.getSource('ruta-elevada-src');
  if (fuenteElevada) {
    fuenteElevada.setData({ type: 'FeatureCollection', features: [] });
  }
  limpiarMarcadorDestino3D();
  resaltarEdificio(null, null, '');
};

defineExpose({
  volarACoordenada,
  enfocarNavegacion,
  iniciarSeguimientoVivo,
  detenerSeguimientoVivo,
  resaltarEdificio,
  cambiarNivelPiso,
  cambiarSoloEdificios,
  dibujarRuta,
  limpiarRuta,
  obtenerUbicacionOrigen,
  actualizarEdificios,
  actualizarRutas
});
</script>

<style scoped>
.map-wrap {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
}
.map-container {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.capa-etiquetas-3d {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 4;
}

.error-mapa {
  position: absolute;
  top: 130px;
  left: 50%;
  transform: translateX(-50%);
  background: #dc2626;
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 12px;
  z-index: 30;
  max-width: 85vw;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

:deep(.etiqueta-salon-3d) {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 11px;
  font-weight: 700;
  color: #0f172a;
  background: rgba(255, 255, 255, 0.92);
  padding: 2px 6px;
  border-radius: 5px;
  border: 1px solid rgba(15, 23, 42, 0.22);
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.22);
  will-change: transform;
}

:deep(.pin-destino-3d) {
  position: absolute;
  top: 0;
  left: 0;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #ef4444;
  border: 2.5px solid #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  will-change: transform;
}

:deep(.maplibregl-ctrl-top-right) {
  top: 12px;
  right: 12px;
  z-index: 12;
}

:deep(.maplibregl-ctrl-group) {
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  overflow: hidden;
}

.selector-origen {
  position: absolute;
  bottom: 86px;
  left: 16px;
  z-index: 10;
  background-color: white;
  padding: 8px 14px;
  border-radius: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.icono-origen {
  color: #10B981;
  flex-shrink: 0;
}

.selector-origen select {
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: #1E88E5;
  outline: none;
  cursor: pointer;
  max-width: 210px;
}

.btn-vista {
  position: absolute;
  bottom: 32px;
  left: 16px;
  z-index: 10;
  background-color: white;
  border: none;
  padding: 11px 16px;
  border-radius: 25px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  font-size: 13px;
  font-weight: bold;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-vista:hover {
  background-color: #f8fafc;
  transform: translateY(-2px);
}

@media (max-width: 768px) {
  :deep(.maplibregl-ctrl-top-right) {
    top: 118px;
    right: 12px;
  }

  .selector-origen {
    bottom: 78px;
    left: 12px;
    padding: 7px 11px;
    font-size: 12px;
    max-width: calc(100vw - 84px);
  }

  .selector-origen label {
    display: none;
  }

  .selector-origen select {
    max-width: 195px;
    font-size: 12px;
  }

  .btn-vista {
    bottom: 28px;
    left: 12px;
    padding: 10px 14px;
    font-size: 12px;
  }

  .con-tarjeta-abierta .selector-origen,
  .con-tarjeta-abierta .btn-vista {
    opacity: 0;
    pointer-events: none;
  }
}
</style>