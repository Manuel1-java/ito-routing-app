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
      :lugares-extra="salonesComoLugares"
      :edificios="edificiosGeojson?.features || []"
      @seleccion="manejarSeleccion"
      @abrir-panel-roles="panelRolesAbierto = true"
      @abrir-menu="abrirMenuEventos"
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
      :piso-actual="pisoActual"
      :solo-edificios="soloEdificios"
      @cambio-piso="manejarCambioPiso"
      @cambio-solo-edificios="manejarSoloEdificios"
      @cambio-accesibilidad="manejarAccesibilidad"
    />

    <MapaCampus
      ref="mapaRef"
      :tarjeta-abierta="Boolean(lugarActivo)"
      :guiando="guiando"
      :seleccionando-tramo="esperandoTramoMapa"
      :tramo-seleccionado-id="tramoCapturado?.id ?? null"
      @seleccionar-edificio="manejarSeleccionEdificio"
      @seleccionar-salon="manejarSeleccionSalon"
      @actualizacion-gps="manejarActualizacionGPS"
      @clic-mapa="manejarClicMapa"
      @seleccionar-tramo="manejarSeleccionTramo"
    />

    <TarjetaDestino
      :lugar="lugarActivo"
      :ruta="rutaCalculada"
      :guiando="guiando"
      :eventos="eventosDelLugarActivo"
      @cerrar="cerrarDestino"
      @trazar-ruta="iniciarRuta"
      @iniciar-guia="iniciarGuia"
      @detener-guia="detenerGuia"
      @ver-imagen="abrirVisorImagen"
      @abrir-eventos="abrirMenuEventos"
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

    <MenuLateral
      v-if="!guiando && !esperandoClicMapa && !esperandoTramoMapa"
      :abierto="menuLateralAbierto"
      :eventos-disponibles="eventosDisponibles"
      :eventos-anteriores="eventosAnteriores"
      :pendientes="eventosPendientes"
      :cargando="cargandoEventos"
      :edificios="edificiosGeojson?.features || []"
      :salones="salonesComoLugares"
      @toggle="toggleMenuEventos"
      @cerrar="menuLateralAbierto = false"
      @recargar-eventos="cargarEventosCampus"
      @ir-a-evento="ubicarEventoEnMapa"
      @ver-imagen="abrirVisorImagen"
      @abrir-panel-roles="panelRolesAbierto = true"
    />

    <VisorImagen
      :imagen="imagenAmpliada.imagen"
      :titulo="imagenAmpliada.titulo"
      :subtitulo="imagenAmpliada.subtitulo"
      @cerrar="cerrarVisorImagen"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import MapaCampus from './components/MapaCampus.vue'
import BuscadorSalones from './components/BuscadorSalones.vue'
import BannerNavegacion from './components/BannerNavegacion.vue'
import TarjetaDestino from './components/TarjetaDestino.vue'
import ControlesLaterales from './components/ControlesLaterales.vue'
import PanelRoles from './components/PanelRoles.vue'
import MenuLateral from './components/MenuLateral.vue'
import VisorImagen from './components/VisorImagen.vue'
import { calcularRuta, evaluarProgresoRuta, etiquetaPiso } from './utils/pathfinder'
import { obtenerDatosCampus, suscribirActualizacionCampus } from './services/campusSync'
import {
  usuarioActual,
  validarSesionActiva,
  obtenerEventos,
  obtenerEventosPendientes
} from './services/api'

const lugarActivo = ref(null)
const mapaRef = ref(null)
const rutasGeojson = ref(null)
const edificiosGeojson = ref(null)
const salonesGeojson = ref(null)
const lugaresCatalogo = ref([])
const rutaCalculada = ref(null)
const navegando = ref(false)

const guiando = ref(false)
const indicePasoActual = ref(0)
const distanciaAlGiro = ref(null)
const distanciaRestante = ref(0)

const pisoActual = ref('PB')
const soloEdificios = ref(false)
const rutaAccesible = ref(false)

const menuLateralAbierto = ref(false)
const panelRolesAbierto = ref(false)
const esperandoClicMapa = ref(false)
const coordenadasCapturadas = ref(null)
const esperandoTramoMapa = ref(false)
const tramoCapturado = ref(null)

const eventosDisponibles = ref([])
const eventosAnteriores = ref([])
const eventosPendientes = ref([])
const cargandoEventos = ref(false)

const imagenAmpliada = reactive({
  imagen: null,
  titulo: '',
  subtitulo: ''
})

let cancelarSuscripcion = null

const abrirVisorImagen = ({ imagen, titulo = '', subtitulo = '' }) => {
  imagenAmpliada.imagen = imagen
  imagenAmpliada.titulo = titulo
  imagenAmpliada.subtitulo = subtitulo
}

const cerrarVisorImagen = () => {
  imagenAmpliada.imagen = null
  imagenAmpliada.titulo = ''
  imagenAmpliada.subtitulo = ''
}

const centroidePoligono = (geometry) => {
  if (!geometry) return null
  if (geometry.type === 'Point') return geometry.coordinates
  const anillo =
    geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates[0][0]
        : null
  if (!anillo || !anillo.length) return null

  const cerrado =
    anillo.length > 1 &&
    anillo[0][0] === anillo[anillo.length - 1][0] &&
    anillo[0][1] === anillo[anillo.length - 1][1]
  const total = cerrado ? anillo.length - 1 : anillo.length

  let sumLng = 0
  let sumLat = 0
  for (let i = 0; i < total; i++) {
    sumLng += anillo[i][0]
    sumLat += anillo[i][1]
  }
  return [sumLng / total, sumLat / total]
}

const obtenerMapaEdificios = () => {
  const mapa = {}
  for (const feat of edificiosGeojson.value?.features || []) {
    const id = feat.properties?.id
    const nombre = feat.properties?.nombre
    if (id && nombre) {
      mapa[String(id)] = nombre
    }
  }
  return mapa
}

const salonesComoLugares = computed(() => {
  const nombresEdif = obtenerMapaEdificios()
  return (salonesGeojson.value?.features || [])
    .map((feat, idx) => {
      const fProps = feat.properties || {}
      const nombre = String(fProps.nombre || fProps.Nombre || '').trim()
      const coords = centroidePoligono(feat.geometry)
      if (!coords || !nombre || nombre === 'Ejemplo Salon') return null
      const rawEdif = fProps.edificio_id ?? fProps.Edificio_id ?? null
      const edifId = rawEdif !== null && rawEdif !== '' ? String(rawEdif).trim() : null
      const piso = String(fProps.piso || fProps.Piso || 'PB').trim().toUpperCase()
      const tipo = String(fProps.tipo || fProps.Tipo || 'Aula').trim()
      const nombreEdif = edifId ? nombresEdif[edifId] : ''
      return {
        id: String(fProps.id || fProps.ID || `salon-${idx + 1}`),
        nombre,
        descripcion: nombreEdif ? `${nombreEdif} • ${etiquetaPiso(piso)}` : etiquetaPiso(piso),
        tipo,
        edificio_id: edifId,
        piso,
        coordenadas: coords,
        palabras_clave: [nombreEdif, piso, tipo].filter(Boolean)
      }
    })
    .filter(Boolean)
})

const normalizar = (txt) =>
  (txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const eventosDelLugarActivo = computed(() => {
  const lugar = lugarActivo.value
  if (!lugar || !eventosDisponibles.value.length) return []

  const edifId = lugar.edificio_id ? String(lugar.edificio_id).trim() : ''
  if (!edifId) return []

  const delEdificio = eventosDisponibles.value.filter(
    (ev) => String(ev.edificio_id).trim() === edifId
  )

  if (lugar.tipo === 'Edificio') {
    return delEdificio
  }

  const salonId = String(lugar.id || '').trim()
  const nombreSalon = normalizar(lugar.nombre)

  return delEdificio.filter((ev) => {
    if (!ev.salon_id && !ev.salon_nombre) return true
    if (ev.salon_id && String(ev.salon_id).trim() === salonId) return true
    if (ev.salon_nombre && normalizar(ev.salon_nombre) === nombreSalon) return true
    return false
  })
})

const cargarEventosCampus = async () => {
  cargandoEventos.value = true
  try {
    const data = await obtenerEventos()
    eventosDisponibles.value = data.disponibles || []
    eventosAnteriores.value = data.anteriores || []

    const rol = usuarioActual.value?.rol
    if (rol === 'ADMIN' || rol === 'MODERADOR') {
      const pend = await obtenerEventosPendientes()
      eventosPendientes.value = pend.pendientes || []
    } else {
      eventosPendientes.value = []
    }
  } catch (err) {
    console.warn('No se pudieron cargar eventos:', err.message)
  } finally {
    cargandoEventos.value = false
  }
}

watch(
  () => usuarioActual.value?.rol,
  () => {
    cargarEventosCampus()
  }
)

const abrirMenuEventos = () => {
  menuLateralAbierto.value = true
  cargarEventosCampus()
}

const toggleMenuEventos = () => {
  menuLateralAbierto.value = !menuLateralAbierto.value
  if (menuLateralAbierto.value) {
    cargarEventosCampus()
  }
}

const ubicarEventoEnMapa = (ev) => {
  menuLateralAbierto.value = false
  const edifId = String(ev.edificio_id || '').trim()

  if (ev.salon_id || ev.salon_nombre) {
    const salonEncontrado = salonesComoLugares.value.find(
      (s) =>
        String(s.edificio_id) === edifId &&
        ((ev.salon_id && String(s.id) === String(ev.salon_id)) ||
          (ev.salon_nombre && normalizar(s.nombre) === normalizar(ev.salon_nombre)))
    )
    if (salonEncontrado) {
      manejarSeleccion(salonEncontrado)
      return
    }
  }

  const featEdif = (edificiosGeojson.value?.features || []).find(
    (f) => String(f.properties?.id) === edifId
  )
  const coords = centroidePoligono(featEdif?.geometry)
  const nombre = featEdif?.properties?.nombre || `Edificio ${edifId}`

  manejarSeleccionEdificio({
    edificioId: edifId,
    nombre,
    coordenadas: coords
  })
}

const cargarSalones = async () => {
  try {
    const res = await fetch('/salones.geojson', { cache: 'no-cache' })
    if (res.ok) {
      salonesGeojson.value = await res.json()
    }
  } catch {
    salonesGeojson.value = null
  }
}

onMounted(async () => {
  await validarSesionActiva()

  try {
    const [datos] = await Promise.all([
      obtenerDatosCampus(),
      cargarSalones(),
      cargarEventosCampus()
    ])
    rutasGeojson.value = datos.rutas
    edificiosGeojson.value = datos.edificios
    lugaresCatalogo.value = datos.lugares

    cancelarSuscripcion = suscribirActualizacionCampus((nuevosDatos) => {
      rutasGeojson.value = nuevosDatos.rutas
      edificiosGeojson.value = nuevosDatos.edificios
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
  tramoCapturado.value = null
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

const manejarSeleccion = (lugar) => {
  if (esperandoClicMapa.value || esperandoTramoMapa.value) return

  detenerGuia()
  lugarActivo.value = lugar
  rutaCalculada.value = null
  navegando.value = false

  const pisoDestino = String(lugar.piso || 'PB').toUpperCase()
  const esEspacioInterior = lugar.tipo !== 'Edificio'

  if (esEspacioInterior) {
    soloEdificios.value = false
    pisoActual.value = pisoDestino
  }

  if (mapaRef.value) {
    mapaRef.value.limpiarRuta()
    if (esEspacioInterior) {
      mapaRef.value.cambiarNivelPiso(pisoDestino)
    }
    const salonId = esEspacioInterior ? lugar.id : null
    const salonNombre = esEspacioInterior ? lugar.nombre : ''
    mapaRef.value.resaltarEdificio(lugar.edificio_id, salonId, salonNombre)

    if (lugar.coordenadas && lugar.coordenadas.length === 2) {
      mapaRef.value.volarACoordenada(lugar.coordenadas[0], lugar.coordenadas[1])
    }
  }
}

const manejarSeleccionSalon = ({ id, nombre, tipo, piso, edificioId, coordenadas }) => {
  if (esperandoClicMapa.value || esperandoTramoMapa.value) return

  const pisoNorm = String(piso || 'PB').trim().toUpperCase()
  const edifNorm = edificioId ? String(edificioId).trim() : ''

  const enCatalogo = lugaresCatalogo.value.find((l) => {
    if (String(l.id) === String(id)) return true
    const mismoNombre = normalizar(l.nombre) === normalizar(nombre)
    const mismoPiso = String(l.piso || 'PB').trim().toUpperCase() === pisoNorm
    const mismoEdif = !edifNorm || !l.edificio_id || String(l.edificio_id).trim() === edifNorm
    return mismoNombre && mismoPiso && mismoEdif
  })

  if (enCatalogo) {
    manejarSeleccion(enCatalogo)
    return
  }

  const nombresEdif = obtenerMapaEdificios()
  const nombreEdificio = edifNorm ? nombresEdif[edifNorm] : ''
  const desc = nombreEdificio
    ? `${nombreEdificio} • ${etiquetaPiso(pisoNorm)}`
    : etiquetaPiso(pisoNorm)

  manejarSeleccion({
    id,
    nombre,
    descripcion: desc,
    tipo: tipo || 'Aula',
    edificio_id: edifNorm || null,
    piso: pisoNorm,
    coordenadas
  })
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
      coincidencias.find((l) => l.tipo === 'Edificio' || normalizar(l.nombre).includes(nombreBase)) ||
      coincidencias[0]
  } else {
    lugarEncontrado = {
      id: `edificio-${edificioId}`,
      nombre,
      descripcion: 'Edificio del campus',
      tipo: 'Edificio',
      edificio_id: String(edificioId),
      piso: 'PB',
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
    edificiosGeojson.value = datos.edificios
  }

  const rutasHabilitadas = {
    ...rutasGeojson.value,
    features: (rutasGeojson.value?.features || []).filter(
      (f) => f.properties?.habilitado !== false
    )
  }

  const origen = origenPersonalizado || mapaRef.value.obtenerUbicacionOrigen()
  const pisoDestino = String(lugar.piso || 'PB').toUpperCase()
  const resultado = calcularRuta(
    rutasHabilitadas,
    origen.coords,
    lugar.coordenadas,
    rutaAccesible.value,
    lugar.nombre,
    pisoDestino,
    obtenerMapaEdificios()
  )

  if (!resultado) {
    alert('No se encontró un camino conectado hasta ese punto con los filtros actuales.')
    return false
  }

  if (lugar.tipo !== 'Edificio') {
    soloEdificios.value = false
    pisoActual.value = pisoDestino
    mapaRef.value.cambiarNivelPiso(pisoDestino)
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

  mapaRef.value.dibujarRuta(resultado, ajustarCamara)
  return true
}

const iniciarGuia = async () => {
  if (!lugarActivo.value) return

  if (!rutaCalculada.value?.pasos?.length) {
    const ok = await iniciarRuta(lugarActivo.value, null, false)
    if (!ok) return
  }

  menuLateralAbierto.value = false
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

  if (paso.piso && (paso.piso !== pisoActual.value || soloEdificios.value)) {
    soloEdificios.value = false
    pisoActual.value = paso.piso
    mapaRef.value?.cambiarNivelPiso(paso.piso)
  }

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

  const pasoActual = rutaCalculada.value.pasos[progreso.nuevoPasoIdx]
  if (pasoActual?.piso && (pasoActual.piso !== pisoActual.value || soloEdificios.value)) {
    soloEdificios.value = false
    pisoActual.value = pasoActual.piso
    mapaRef.value?.cambiarNivelPiso(pasoActual.piso)
  }

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
  soloEdificios.value = false
  pisoActual.value = piso
  mapaRef.value?.cambiarNivelPiso(piso)
}

const manejarSoloEdificios = (activo) => {
  soloEdificios.value = activo
  mapaRef.value?.cambiarSoloEdificios(activo)
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