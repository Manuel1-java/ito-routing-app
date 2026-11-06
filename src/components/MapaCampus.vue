<template>
  <div class="map-wrap">
    <div ref="mapContainer" class="map-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const mapContainer = ref(null);
let map = null;

onMounted(() => {
const limitesITO = [
    [-96.751517, 17.074415], // Suroeste
    [-96.736851, 17.081369]  // Noreste
  ];

  map = new maplibregl.Map({
    container: mapContainer.value,
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-96.744388, 17.077856], // Coordenadas del Tec de Oaxaca
    zoom: 16.5, // Acercamos la cámara
    minZoom: 15.5, // BLOQUEO: Evita que el usuario aleje demasiado la vista
    maxBounds: limitesITO, // Bloqueo
    pitch: 0,
    bearing: 0
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  //Control de geolocalización
  const geolocateControl = new maplibregl.GeolocateControl({
    positionOptions: {
      enableHighAccuracy: true // Solicita usar el GPS del dispositivo para mayor precisión
    },
    trackUserLocation: true, // Actualiza el punto azul automáticamente si el usuario camina
    showUserHeading: true // Muestra una flecha indicando hacia dónde mira el teléfono
  });
  
  map.addControl(geolocateControl, 'top-right');

  //Dibujar el edificio 3D de prueba cuando el mapa cargue
  map.on('load', () => {
    map.addSource('edificio-prueba', {
      'type': 'geojson',
      'data': {
        'type': 'FeatureCollection',
        'features': [{
          'type': 'Feature',
          'properties': {
            'altura': 15, // Altura en metros
            'color': '#1E88E5'
          },
          'geometry': {
            'type': 'Polygon',
            'coordinates': [[
              [-96.744785, 17.076287],
              [-96.744576, 17.075946],
              [-96.744755, 17.075854],
              [-96.744938, 17.076197],
              [-96.744785, 17.076287] // Cierra el polígono
            ]]
          }
        }]
      }
    });

    map.addLayer({
      'id': 'edificio-prueba-3d',
      'type': 'fill-extrusion', // Esta es la propiedad que da el efecto 3D
      'source': 'edificio-prueba',
      'paint': {
        'fill-extrusion-color': ['get', 'color'],
        'fill-extrusion-height': ['get', 'altura'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.8
      }
    });
  });
});

onUnmounted(() => {
  if (map) map.remove();
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
</style>