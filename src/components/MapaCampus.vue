<template>
  <div class="map-wrap" :class="{ 'con-tarjeta-abierta': tarjetaAbierta }">
    <div ref="mapContainer" class="map-container"></div>

    <div v-if="!guiando" class="selector-origen">
      <MapPin class="icono-origen" :size="16" />
      <label for="select-origen">Salir desde:</label>
      <select id="select-origen" v-model="origenSeleccionado">
        <option value="auto">Automático (GPS / Entrada cercana)</option>
        <option
          v-for="(acceso, idx) in ACCESOS_CAMPUS"
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
import { ref, onMounted, onUnmounted } from 'vue';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Map as MapIcon, Globe } from 'lucide-vue-next';

defineProps({
  tarjetaAbierta: {
    type: Boolean,
    default: false
  },
  guiando: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['seleccionar-edificio', 'actualizacion-gps']);

const mapContainer = ref(null);
let map = null;
let watchId = null;

const vistaSatelite = ref(false);
const ubicacionUsuario = ref(null);
const origenSeleccionado = ref('auto');
const edificioActivoId = ref(null);
const pisoActivo = ref('PB');

const ZOOM_MAX_NORMAL = 21.5;
const ZOOM_MAX_SATELITE = 18.2;

const ACCESOS_CAMPUS = [
  {
    nombre: 'Acceso Puente del Tecnológico / Riberas',
    coords: [-96.74630669434635, 17.078456917290136]
  },
  {
    nombre: 'Acceso Av. Tecnológico (Norte)',
    coords: [-96.74538887234341, 17.079018506015785]
  },
  {
    nombre: 'Acceso Riveras y Juan de Dios Bátiz',
    coords: [-96.74475163449951, 17.075831796177102]
  },
  {
    nombre: 'Acceso Juan de Dios Bátiz / Ferrocarril',
    coords: [-96.74320435437524, 17.076342002947552]
  },
  {
    nombre: 'Acceso Calzada Madero / Ferrocarril',
    coords: [-96.74339672315243, 17.079301983144862]
  }
];

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

const actualizarEstiloEdificios = () => {
  if (!map || !map.getLayer('edificios-3d')) return;

  const idSel = edificioActivoId.value ? String(edificioActivoId.value) : '';
  const piso = pisoActivo.value;

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

  map.setPaintProperty('edificios-3d', 'fill-extrusion-color', [
    'case',
    ['==', ['to-string', ['get', 'id']], idSel],
    '#F59E0B',
    condicionNivel,
    '#1E88E5',
    '#CBD5E1'
  ]);
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

onMounted(() => {
  solicitarUbicacionGPS();

  const limitesITO = [
    [-96.751517, 17.074415],
    [-96.736851, 17.081369]
  ];

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-96.744388, 17.077856],
    zoom: 16.5,
    minZoom: 15.5,
    maxZoom: ZOOM_MAX_NORMAL,
    maxBounds: limitesITO,
    pitch: 0,
    bearing: 0
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

  map.on('load', () => {
    map.addSource('fuente-satelite', {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 18
    });

    map.addSource('edificios-ito', {
      type: 'geojson',
      data: '/edificios.geojson'
    });

    map.addSource('ruta-activa', {
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
      id: 'edificios-3d',
      type: 'fill-extrusion',
      source: 'edificios-ito',
      paint: {
        'fill-extrusion-color': '#1E88E5',
        'fill-extrusion-height': ['to-number', ['get', 'altura']],
        'fill-extrusion-base': ['to-number', ['get', 'base']],
        'fill-extrusion-opacity': 0.85
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

    // Marcador GPS en vivo durante la navegación
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

    map.on('mouseenter', 'edificios-3d', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'edificios-3d', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('click', 'edificios-3d', (e) => {
      if (!e.features || !e.features.length) return;
      const props = e.features[0].properties;

      emit('seleccionar-edificio', {
        edificioId: String(props.id),
        nombre: props.nombre || 'Edificio',
        coordenadas: [e.lngLat.lng, e.lngLat.lat]
      });
    });
  });
});

onUnmounted(() => {
  detenerSeguimientoVivo();
  if (map) map.remove();
});

const obtenerUbicacionOrigen = () => {
  if (origenSeleccionado.value !== 'auto') {
    const manual = ACCESOS_CAMPUS[Number(origenSeleccionado.value)];
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

    let accesoMasCercano = ACCESOS_CAMPUS[0];
    let menorDistancia = Infinity;

    for (const acceso of ACCESOS_CAMPUS) {
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
    coords: ACCESOS_CAMPUS[0].coords,
    nombre: ACCESOS_CAMPUS[0].nombre,
    esGPS: false
  };
};

const volarACoordenada = (lng, lat, rumbo = -20) => {
  if (!map) return;

  map.flyTo({
    center: [lng, lat],
    zoom: vistaSatelite.value ? 18.0 : 18.6,
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
    zoom: vistaSatelite.value ? 18.1 : 19.0,
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

const resaltarEdificio = (edificioId) => {
  edificioActivoId.value = edificioId || null;
  actualizarEstiloEdificios();
};

const cambiarNivelPiso = (piso) => {
  pisoActivo.value = piso;
  actualizarEstiloEdificios();
};

const dibujarRuta = (coordenadas, ajustarCamara = true) => {
  if (!map || !coordenadas || coordenadas.length < 2) return;
  const fuente = map.getSource('ruta-activa');
  if (!fuente) return;

  const inicio = coordenadas[0];
  const fin = coordenadas[coordenadas.length - 1];

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

  if (ajustarCamara) {
    const bounds = coordenadas.reduce(
      (b, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(coordenadas[0], coordenadas[0])
    );

    map.fitBounds(bounds, {
      padding: { top: 140, bottom: 210, left: 60, right: 60 },
      pitch: 55,
      maxZoom: vistaSatelite.value ? 18.0 : 19.5,
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
  resaltarEdificio(null);
};

defineExpose({
  volarACoordenada,
  enfocarNavegacion,
  iniciarSeguimientoVivo,
  detenerSeguimientoVivo,
  resaltarEdificio,
  cambiarNivelPiso,
  dibujarRuta,
  limpiarRuta,
  obtenerUbicacionOrigen
});
</script>

<style scoped>
.map-wrap {
  position: relative;
  width: 100vw;
  height: 100vh;
}
.map-container {
  position: absolute;
  width: 100%;
  height: 100%;
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

  /* Evita encime con la tarjeta inferior en móviles */
  .con-tarjeta-abierta .selector-origen,
  .con-tarjeta-abierta .btn-vista {
    opacity: 0;
    pointer-events: none;
  }
}
</style>