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
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-96.7456, 17.0772], // Coordenadas del Tec de Oaxaca
    zoom: 16,
    pitch: 0
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