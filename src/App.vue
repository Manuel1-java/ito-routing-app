<template>
  <div class="app-wrapper">
    <BuscadorSalones @seleccion="manejarSeleccion" />
    
    <ControlesLaterales 
      @cambio-piso="manejarCambioPiso" 
      @cambio-accesibilidad="manejarAccesibilidad" 
    />
    
    <MapaCampus 
      ref="mapaRef" 
      @seleccionar-edificio="manejarSeleccionEdificio"
    />

    <TarjetaDestino 
      :lugar="lugarActivo" 
      :ruta="rutaCalculada"
      @cerrar="cerrarDestino"
      @trazar-ruta="iniciarRuta"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MapaCampus from './components/MapaCampus.vue'
import BuscadorSalones from './components/BuscadorSalones.vue'
import TarjetaDestino from './components/TarjetaDestino.vue'
import ControlesLaterales from './components/ControlesLaterales.vue'
import { calcularRuta } from './utils/pathfinder'

const lugarActivo = ref(null)
const mapaRef = ref(null)
const rutasGeojson = ref(null)
const lugaresCatalogo = ref([])
const rutaCalculada = ref(null)
const navegando = ref(false)

const pisoActual = ref('PB')
const rutaAccesible = ref(false)

onMounted(async () => {
  try {
    const [resRutas, resLugares] = await Promise.all([
      fetch('/rutas.geojson'),
      fetch('/lugares.json')
    ])
    rutasGeojson.value = await resRutas.json()
    lugaresCatalogo.value = await resLugares.json()
  } catch (error) {
    console.error('Error al cargar archivos geográficos:', error)
  }
})

const manejarSeleccion = (lugar) => {
  lugarActivo.value = lugar
  rutaCalculada.value = null
  navegando.value = false

  if (mapaRef.value) {
    mapaRef.value.limpiarRuta()
    mapaRef.value.resaltarEdificio(lugar.edificio_id)

    if (lugar.coordenadas && lugar.coordenadas.length === 2) {
      mapaRef.value.volarACoordenada(lugar.coordenadas[0], lugar.coordenadas[1])
    }
  }
}

const manejarSeleccionEdificio = ({ edificioId, nombre, coordenadas }) => {
  const coincidencias = lugaresCatalogo.value.filter(
    (l) => String(l.edificio_id) === String(edificioId)
  )

  let lugarEncontrado = null

  if (coincidencias.length === 1) {
    lugarEncontrado = coincidencias[0]
  } else if (coincidencias.length > 1) {
    const nombreBase = nombre.toLowerCase().slice(0, 8)
    lugarEncontrado =
      coincidencias.find((l) => l.nombre.toLowerCase().includes(nombreBase)) ||
      coincidencias[0]
  } else {
    lugarEncontrado = {
      id: `edificio-${edificioId}`,
      nombre,
      descripcion: 'Edificio del campus',
      tipo: 'Edificio',
      edificio_id: String(edificioId),
      coordenadas
    }
  }

  manejarSeleccion(lugarEncontrado)
}

const iniciarRuta = async (lugar) => {
  if (!lugar?.coordenadas || !mapaRef.value) return

  if (!rutasGeojson.value) {
    const res = await fetch('/rutas.geojson')
    rutasGeojson.value = await res.json()
  }

  const origen = mapaRef.value.obtenerUbicacionOrigen()
  const resultado = calcularRuta(
    rutasGeojson.value,
    origen.coords,
    lugar.coordenadas,
    rutaAccesible.value
  )

  if (!resultado) {
    alert('No se encontró un camino conectado hasta ese punto con los filtros actuales.')
    return
  }

  rutaCalculada.value = {
    ...resultado,
    origenNombre: origen.nombre,
    desdeGPS: origen.esGPS,
    soloAccesible: rutaAccesible.value
  }
  navegando.value = true
  mapaRef.value.dibujarRuta(resultado.coordenadas)
}

const cerrarDestino = () => {
  lugarActivo.value = null
  rutaCalculada.value = null
  navegando.value = false
  mapaRef.value?.limpiarRuta()
}

const manejarCambioPiso = (piso) => {
  pisoActual.value = piso
  mapaRef.value?.cambiarNivelPiso(piso)
}

const manejarAccesibilidad = (estado) => {
  rutaAccesible.value = estado
  if (navegando.value && lugarActivo.value) {
    iniciarRuta(lugarActivo.value)
  }
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