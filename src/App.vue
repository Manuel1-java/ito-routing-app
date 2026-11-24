<template>
  <div class="app-wrapper">
    <div v-if="esperandoClicMapa || esperandoTramoMapa" class="banner-captura">
      <span v-if="esperandoTramoMapa">
        Toca un pasillo en el mapa (Verde: abierto, Rojo: cerrado)
      </span>
      <span v-else>
        Toca cualquier punto en el mapa para capturar sus coordenadas
      </span>
      <button type="button" @click="cancelarCapturaMapa">Cancelar</button>
    </div>

    <BuscadorSalones
      v-else-if="!guiando"
      @seleccion="manejarSeleccion"
      @abrir-panel-roles="panelRolesAbierto = true"
    />

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
      :seleccionando-tramo="esperandoTramoMapa"
      :tramo-seleccionado-id="tramoCapturado?.id ?? null"
      @seleccionar-edificio="manejarSeleccionEdificio"
      @actualizacion-gps="manejarActualizacionGPS"
      @clic-mapa="manejarClicMapa"
      @seleccionar-tramo="manejarSeleccionTramo"
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

    <PanelRoles
      :abierto="panelRolesAbierto"
      :coordenadas-capturadas="coordenadasCapturadas"
      :esperando-clic-mapa="esperandoClicMapa"
      :tramo-capturado="tramoCapturado"
      :esperando-tramo-mapa="esperandoTramoMapa"
      @cerrar="cerrarPanelRoles"
      @activar-captura-mapa="activarCapturaCoordenadas"
      @activar-captura-tramo="activarCapturaTramo"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import MapaCampus from './components/MapaCampus.vue'
import BuscadorSalones from './components/BuscadorSalones.vue'
import BannerNavegacion from './components/BannerNavegacion.vue'
import TarjetaDestino from './components/TarjetaDestino.vue'
import ControlesLaterales from './components/ControlesLaterales.vue'
import PanelRoles from './components/PanelRoles.vue'
import { calcularRuta, evaluarProgresoRuta } from './utils/pathfinder'
import { obtenerDatosCampus, suscribirActualizacionCampus } from './services/campusSync'
import { validarSesionActiva } from './services/api'

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

const panelRolesAbierto = ref(false)
const esperandoClicMapa = ref(false)
const coordenadasCapturadas = ref(null)
const esperandoTramoMapa = ref(false)
const tramoCapturado = ref(null)
let cancelarSuscripcion = null

onMounted(async () => {
  validarSesionActiva()

  try {
    const datos = await obtenerDatosCampus()
    rutasGeojson.value = datos.rutas
    lugaresCatalogo.value = datos.lugares

    cancelarSuscripcion = suscribirActualizacionCampus((nuevosDatos) => {
      rutasGeojson.value = nuevosDatos.rutas
      lugaresCatalogo.value = nuevosDatos.lugares
      mapaRef.value?.actualizarEdificios(nuevosDatos.edificios)
      mapaRef.value?.actualizarRutas(nuevosDatos.rutas)

      if (navegando.value && lugarActivo.value) {
        iniciarRuta(lugarActivo.value)
      }
    })
  } catch (error) {
    console.error('Error al cargar datos del campus:', error)
  }
})

onUnmounted(() => {
  if (cancelarSuscripcion) cancelarSuscripcion()
})

const activarCapturaCoordenadas = () => {
  esperandoTramoMapa.value = false
  esperandoClicMapa.value = true
  panelRolesAbierto.value = false
}

const activarCapturaTramo = () => {
  esperandoClicMapa.value = false
  esperandoTramoMapa.value = true
  panelRolesAbierto.value = false
}

const cancelarCapturaMapa = () => {
  esperandoClicMapa.value = false
  esperandoTramoMapa.value = false
  panelRolesAbierto.value = true
}

const cerrarPanelRoles = () => {
  panelRolesAbierto.value = false
  esperandoClicMapa.value = false
  esperandoTramoMapa.value = false
}

const manejarClicMapa = (coords) => {
  if (!esperandoClicMapa.value) return
  esperandoClicMapa.value = false
  coordenadasCapturadas.value = coords
  panelRolesAbierto.value = true
}

const manejarSeleccionTramo = (tramo) => {
  if (!esperandoTramoMapa.value) return
  esperandoTramoMapa.value = false
  tramoCapturado.value = { ...tramo, _ts: Date.now() }
  panelRolesAbierto.value = true
}

const normalizar = (txt) =>
  (txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const manejarSeleccion = (lugar) => {
  if (esperandoClicMapa.value || esperandoTramoMapa.value) return

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
  if (esperandoClicMapa.value || esperandoTramoMapa.value) return

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
    const datos = await obtenerDatosCampus()
    rutasGeojson.value = datos.rutas
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

.banner-captura {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: 92%;
  max-width: 440px;
  background: #1e293b;
  color: #ffffff;
  padding: 11px 16px;
  border-radius: 18px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
}

.banner-captura button {
  background: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
}
</style>