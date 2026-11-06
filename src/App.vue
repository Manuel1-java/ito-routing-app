<template>
  <div class="app-wrapper">
    <BuscadorSalones />
    <MapaCampus />
  </div>
</template>

<script setup>
import MapaCampus from './components/MapaCampus.vue'
import BuscadorSalones from './components/BuscadorSalones.vue'
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  font-family: Arial, sans-serif;
}

.app-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
}
</style>