<template>
  <div class="app-wrapper">
    <BuscadorSalones @seleccion="manejarSeleccion" />
    <MapaCampus />
    <TarjetaDestino 
      :lugar="lugarActivo" 
      @cerrar="lugarActivo = null"
      @trazar-ruta="iniciarRuta"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import MapaCampus from './components/MapaCampus.vue'
import BuscadorSalones from './components/BuscadorSalones.vue'
import TarjetaDestino from './components/TarjetaDestino.vue'

const lugarActivo = ref(null)

const manejarSeleccion = (lugar) => {
  lugarActivo.value = lugar
}

const iniciarRuta = (lugar) => {
  alert(`Simulando cálculo de ruta hacia: ${lugar.nombre}\n\nAquí conectaremos el algoritmo A* de Víctor para dibujar la línea en el mapa.`)
}
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