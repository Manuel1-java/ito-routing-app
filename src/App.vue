<template>
  <div class="app-wrapper">
    <BuscadorSalones @seleccion="manejarSeleccion" />
    
    <ControlesLaterales 
      @cambio-piso="manejarCambioPiso" 
      @cambio-accesibilidad="manejarAccesibilidad" 
    />
    
    <MapaCampus ref="mapaRef" />

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
import ControlesLaterales from './components/ControlesLaterales.vue' // Importamos el nuevo componente

const lugarActivo = ref(null)
const mapaRef = ref(null) 

const pisoActual = ref('PB')
const rutaAccesible = ref(false)

const manejarSeleccion = (lugar) => {
  lugarActivo.value = lugar
  
  if (lugar.id === '8' && mapaRef.value) {
    mapaRef.value.volarACoordenada(-96.744785, 17.076287) 
  }
}

const iniciarRuta = (lugar) => {
  let mensaje = `Simulando cálculo de ruta hacia: ${lugar.nombre}`;
  if (rutaAccesible.value) {
    mensaje += `\n⚠️ Modo Accesible Activado: Calculando ruta sin escaleras.`;
  }
  alert(mensaje);
}

const manejarCambioPiso = (piso) => {
  pisoActual.value = piso
  console.log(`Vista cambiada a: ${piso}`)
  // Aquí luego le diremos a MapLibre: map.setFilter('salones-capa', ['==', 'piso', piso])
}

const manejarAccesibilidad = (estado) => {
  rutaAccesible.value = estado
  console.log(`Ruta para silla de ruedas: ${estado ? 'Activada' : 'Desactivada'}`)
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