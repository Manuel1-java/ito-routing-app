<template>
  <div class="app-wrapper">
    <BuscadorSalones v-if="!guiando" @seleccion="manejarSeleccion" />

    <BannerNavegacion
      v-else
      :pasos="rutaCalculada?.pasos || []"
      :indice-paso="indicePasoActual"
      :distancia-al-giro="distanciaAlGiro"
      :distancia-restante="distanciaRestante"
      @detener="detenerGuia"
      @anterior-paso="irAPaso(indicePasoActual - 1)"
      @siguiente-paso="irAPaso(indicePasoActual + 1)"
    />
    
    <ControlesLaterales 
      @cambio-piso="manejarCambioPiso" 
      @cambio-accesibilidad="manejarAccesibilidad" 
    />
    
    <MapaCampus 
      ref="mapaRef"
      :tarjeta-abierta="Boolean(lugarActivo)"
      :guiando="guiando"
      @seleccionar-edificio="manejarSeleccionEdificio"
      @actualizacion-gps="manejarActualizacionGPS"
    />

    <TarjetaDestino 
      :lugar="lugarActivo" 
      :ruta="rutaCalculada"
      :guiando="guiando"
      @cerrar="cerrarDestino"
      @trazar-ruta="iniciarRuta"
      @iniciar-guia="iniciarGuia"
      @detener-guia="detenerGuia"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import MapaCampus from './components/MapaCampus.vue'
import BuscadorSalones from './components/BuscadorSalones.vue'
import BannerNavegacion from './components/BannerNavegacion.vue'
import TarjetaDestino from './components/TarjetaDestino.vue'
import ControlesLaterales from './components/ControlesLaterales.vue'
import { calcularRuta, evaluarProgresoRuta } from './utils/pathfinder'

const lugarActivo = ref(null)
const mapaRef = ref(null)
const rutasGeojson = ref(null)
const lugaresCatalogo = ref([])
const rutaCalculada = ref(null)
const navegando = ref(false)

const guiando = ref(false)
const indicePasoActual = ref(0)
const distanciaAlGiro = ref(null)
const distanciaRestante = ref(0)

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

const normalizar = (txt) =>
  (txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const manejarSeleccion = (lugar) => {
  detenerGuia()
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
    const nombreBase = normalizar(nombre).slice(0, 8)
    lugarEncontrado =
      coincidencias.find((l) => normalizar(l.nombre).includes(nombreBase)) ||
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

const iniciarRuta = async (lugar, origenPersonalizado = null, ajustarCamara = true) => {
  if (!lugar?.coordenadas || !mapaRef.value) return false

  if (!rutasGeojson.value) {
    const res = await fetch('/rutas.geojson')
    rutasGeojson.value = await res.json()
  }

  const origen = origenPersonalizado || mapaRef.value.obtenerUbicacionOrigen()
  const resultado = calcularRuta(
    rutasGeojson.value,
    origen.coords,
    lugar.coordenadas,
    rutaAccesible.value,
    lugar.nombre
  )

  if (!resultado) {
    alert('No se encontró un camino conectado hasta ese punto con los filtros actuales.')
    return false
  }

  rutaCalculada.value = {
    ...resultado,
    origenNombre: origen.nombre,
    desdeGPS: origen.esGPS,
    soloAccesible: rutaAccesible.value
  }
  navegando.value = true
  indicePasoActual.value = 0
  distanciaAlGiro.value = resultado.pasos?.[0]?.distancia ?? null
  distanciaRestante.value = resultado.distancia

  mapaRef.value.dibujarRuta(resultado.coordenadas, ajustarCamara)
  return true
}

const iniciarGuia = async () => {
  if (!lugarActivo.value) return

  if (!rutaCalculada.value?.pasos?.length) {
    const ok = await iniciarRuta(lugarActivo.value, null, false)
    if (!ok) return
  }

  guiando.value = true
  indicePasoActual.value = 0
  const primerPaso = rutaCalculada.value.pasos[0]
  distanciaAlGiro.value = primerPaso?.distancia ?? null
  distanciaRestante.value = rutaCalculada.value.distancia

  mapaRef.value?.iniciarSeguimientoVivo(
    rutaCalculada.value.coordenadas[0],
    primerPaso?.rumbo || 0
  )
}

const detenerGuia = () => {
  guiando.value = false
  mapaRef.value?.detenerSeguimientoVivo()
}

const irAPaso = (nuevoIndice) => {
  const pasos = rutaCalculada.value?.pasos
  if (!pasos || nuevoIndice < 0 || nuevoIndice >= pasos.length) return

  indicePasoActual.value = nuevoIndice
  const paso = pasos[nuevoIndice]
  distanciaAlGiro.value = paso.distancia

  const restante = pasos
    .slice(nuevoIndice)
    .reduce((acc, item) => acc + (item.distancia || 0), 0)
  distanciaRestante.value = restante

  if (paso.puntoGiro && mapaRef.value) {
    mapaRef.value.enfocarNavegacion(paso.puntoGiro, paso.rumbo)
  }
}

const manejarActualizacionGPS = async ({ coords, heading }) => {
  if (!guiando.value || !rutaCalculada.value || !lugarActivo.value) return

  const progreso = evaluarProgresoRuta(
    coords,
    rutaCalculada.value.coordenadas,
    rutaCalculada.value.pasos,
    indicePasoActual.value
  )

  if (!progreso) return

  if (progreso.fueraDeRuta) {
    await iniciarRuta(
      lugarActivo.value,
      { coords, nombre: 'Tu ubicación actual', esGPS: true },
      false
    )
    return
  }

  indicePasoActual.value = progreso.nuevoPasoIdx
  distanciaAlGiro.value = progreso.distanciaAlSiguienteGiro
  distanciaRestante.value = progreso.distanciaRestanteTotal

  const rumboCamara =
    heading !== null && !Number.isNaN(heading) ? heading : progreso.rumboActual
  mapaRef.value?.enfocarNavegacion(coords, rumboCamara)
}

const cerrarDestino = () => {
  detenerGuia()
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