<template>
  <div class="map-wrap">
    <div ref="mapContainer" class="map-container"></div>
    
    <!-- NUEVO: Botón flotante para cambiar de vista -->
    <button class="btn-vista" @click="toggleVista">
      {{ vistaSatelite ? '🗺️ Ver Mapa Sencillo' : '🌍 Ver Satélite' }}
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const mapContainer = ref(null);
let map = null;

// Variable reactiva para saber qué vista está activa
const vistaSatelite = ref(false);

// Función que se ejecuta al hacer clic en el botón
const toggleVista = () => {
  if (!map) return;
  vistaSatelite.value = !vistaSatelite.value;
  const visibilidad = vistaSatelite.value ? 'visible' : 'none';
  map.setLayoutProperty('capa-satelite', 'visibility', visibilidad);
};

onMounted(() => {
  const limitesITO = [
    [-96.751517, 17.074415], // Suroeste
    [-96.736851, 17.081369]  // Noreste
  ];

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-96.744388, 17.077856],
    zoom: 16.5,
    minZoom: 15.5,
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
  
  map.addControl(geolocateControl, 'top-right');

map.on('load', () => {
    // ==========================================
    // 1. FUENTES DE DATOS (Las bases)
    // ==========================================
    
    // Satélite
    map.addSource('fuente-satelite', {
      'type': 'raster',
      'tiles': [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      'tileSize': 256
    });

    // Tu archivo GeoJSON (Los edificios reales de QGIS)
    map.addSource('edificios-ito', {
      type: 'geojson',
      data: '/edificios.geojson'
    });

    // ==========================================
    // 2. CAPAS VISUALES (Se dibujan de abajo hacia arriba)
    // ==========================================

    // Primero agregamos el satélite (para que quede pegado al piso)
    map.addLayer({
      'id': 'capa-satelite',
      'type': 'raster',
      'source': 'fuente-satelite',
      'layout': {
        'visibility': 'none' // Inicia apagado
      }
    });

    // Encima del satélite, levantamos tus edificios 3D
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
  });
});

onUnmounted(() => {
  if (map) map.remove();
});

const volarACoordenada = (lng, lat) => {
  if (!map) return;
  
  map.flyTo({
    center: [lng, lat],
    zoom: 18.5,       // Nos acercamos para ver el salón
    pitch: 60,        // Inclinación a 60 grados (¡activa el 3D!)
    bearing: -20,     // Rotamos un poco la cámara para apreciar el volumen
    duration: 2500,   // Duración de la animación (2.5 segundos)
    essential: true
  });
};

defineExpose({ volarACoordenada });
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

/* Estilos para el botón flotante */
.btn-vista {
  position: absolute;
  bottom: 40px;
  left: 20px;
  z-index: 10; /* Lo mantiene por encima del mapa */
  background-color: white;
  border: none;
  padding: 12px 18px;
  border-radius: 25px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-vista:hover {
  background-color: #f0f0f0;
  transform: translateY(-2px);
}
</style>