<template>
  <div class="buscador-container">
    <div class="input-wrapper">
      <button
        type="button"
        class="btn-menu"
        aria-label="Abrir menú"
        @mousedown.prevent="$emit('abrir-menu')"
      >
        <Menu :size="20" />
      </button>

      <Search class="search-icon" :size="19" />

      <input
        ref="inputRef"
        type="text"
        v-model="busqueda"
        @focus="abrirPanel"
        @blur="ocultarResultados"
        @keyup.enter="seleccionarPrimero"
        placeholder="Buscar salón, edificio o área..."
        class="search-input"
      />

      <button
        v-if="busqueda.length > 0"
        type="button"
        class="btn-limpiar"
        aria-label="Limpiar búsqueda"
        @mousedown.prevent="limpiarBusqueda"
      >
        <X :size="16" />
      </button>

      <button
        type="button"
        class="btn-cuenta"
        :class="{ autenticado: Boolean(usuarioActual) }"
        :title="usuarioActual ? `${usuarioActual.nombre} (${usuarioActual.rol})` : 'Acceso / Roles'"
        @click="$emit('abrir-panel-roles')"
      >
        <User :size="17" />
        <span v-if="usuarioActual" class="rol-corto">{{ usuarioActual.rol.slice(0, 3) }}</span>
      </button>
    </div>

    <div class="filtros-rapidos">
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Baños')">
        <DoorClosed :size="15" /> Baños
      </button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Comida')">
        <Coffee :size="15" /> Cafetería
      </button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Laboratorio')">
        <FlaskConical :size="15" /> Laboratorios
      </button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Área Común')">
        <Trees :size="15" /> Áreas Verdes
      </button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Oficina')">
        <Briefcase :size="15" /> Oficinas
      </button>
    </div>

    <div v-if="inputEnFoco" class="resultados-panel">
      <template v-if="busqueda.trim().length > 0">
        <ul v-if="resultadosFiltrados.length > 0" class="resultados-lista">
          <li
            v-for="lugar in resultadosFiltrados"
            :key="`${lugar.id}-${lugar.piso || 'PB'}`"
            class="resultado-item"
            @mousedown.prevent="seleccionarLugar(lugar)"
          >
            <div class="lugar-icono">
              <component :is="obtenerIcono(lugar.tipo)" :size="18" />
            </div>
            <div class="lugar-info">
              <span class="lugar-nombre">{{ lugar.nombre }}</span>
              <span class="lugar-descripcion">{{ lugar.descripcion }} • {{ lugar.tipo }}</span>
            </div>
          </li>
        </ul>
        <div v-else class="sin-resultados">
          No se encontró ningún lugar para "{{ busqueda }}"
        </div>
      </template>

      <template v-else-if="edificioExplorado">
        <div class="subpanel-header">
          <button
            type="button"
            class="btn-volver"
            @mousedown.prevent="volverAEdificios"
          >
            <ArrowLeft :size="16" />
            <span>Edificios</span>
          </button>
          <span class="subpanel-titulo">{{ edificioExplorado.nombre }}</span>
        </div>

        <div class="subpanel-acciones">
          <button
            type="button"
            class="btn-ir-edificio"
            @mousedown.prevent="seleccionarEdificioGeneral(edificioExplorado)"
          >
            <Building2 :size="15" />
            <span>Ir a {{ edificioExplorado.nombre }} (General)</span>
          </button>

          <div v-if="pisosDisponiblesEdificio.length > 1" class="tabs-pisos">
            <button
              v-for="piso in pisosDisponiblesEdificio"
              :key="piso"
              type="button"
              class="tab-piso"
              :class="{ activo: pisoFiltroEdificio === piso }"
              @mousedown.prevent="pisoFiltroEdificio = piso"
            >
              {{ piso === 'TODOS' ? 'Todos' : piso }}
            </button>
          </div>
        </div>

        <ul class="resultados-lista">
          <li
            v-for="salon in salonesEdificioFiltrados"
            :key="`${salon.id}-${salon.piso}`"
            class="resultado-item"
            @mousedown.prevent="seleccionarLugar(salon)"
          >
            <div class="lugar-icono">
              <component :is="obtenerIcono(salon.tipo)" :size="18" />
            </div>
            <div class="lugar-info">
              <span class="lugar-nombre">{{ salon.nombre }}</span>
              <span class="lugar-descripcion">{{ salon.tipo }} • {{ salon.piso }}</span>
            </div>
          </li>
        </ul>
      </template>

      <template v-else>
        <div class="explorador-tabs">
          <button
            type="button"
            class="explorador-tab"
            :class="{ activo: pestanaExploracion === 'edificios' }"
            @mousedown.prevent="pestanaExploracion = 'edificios'"
          >
            Edificios ({{ edificiosExplorables.length }})
          </button>
          <button
            type="button"
            class="explorador-tab"
            :class="{ activo: pestanaExploracion === 'areas' }"
            @mousedown.prevent="pestanaExploracion = 'areas'"
          >
            Áreas y Servicios ({{ areasGenerales.length }})
          </button>
        </div>

        <ul v-if="pestanaExploracion === 'edificios'" class="resultados-lista">
          <li
            v-for="edif in edificiosExplorables"
            :key="edif.id"
            class="resultado-item"
            @mousedown.prevent="abrirEdificio(edif)"
          >
            <div class="lugar-icono">
              <Building2 :size="18" />
            </div>
            <div class="lugar-info">
              <span class="lugar-nombre">{{ edif.nombre }}</span>
              <span class="lugar-descripcion">
                {{ edif.salones.length > 0 ? `${edif.salones.length} espacios interiores` : 'Edificio del campus' }}
              </span>
            </div>
            <ChevronRight v-if="edif.salones.length > 0" class="icono-flecha" :size="18" />
          </li>
        </ul>

        <ul v-else class="resultados-lista">
          <li
            v-for="area in areasGenerales"
            :key="`${area.id}-${area.piso || 'PB'}`"
            class="resultado-item"
            @mousedown.prevent="seleccionarLugar(area)"
          >
            <div class="lugar-icono">
              <component :is="obtenerIcono(area.tipo)" :size="18" />
            </div>
            <div class="lugar-info">
              <span class="lugar-nombre">{{ area.nombre }}</span>
              <span class="lugar-descripcion">{{ area.descripcion }} • {{ area.tipo }}</span>
            </div>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  Menu,
  Search,
  X,
  User,
  Building2,
  BookOpen,
  FlaskConical,
  Briefcase,
  Landmark,
  Projector,
  Library,
  Coffee,
  DoorClosed,
  Trees,
  MapPin,
  Wrench,
  ChevronRight,
  ArrowLeft
} from 'lucide-vue-next';
import { buscarLugares } from '../utils/pathfinder';
import { usuarioActual } from '../services/api.js';
import { obtenerDatosCampus, suscribirActualizacionCampus } from '../services/campusSync.js';

const props = defineProps({
  lugaresExtra: {
    type: Array,
    default: () => []
  },
  edificios: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['seleccion', 'abrir-panel-roles', 'abrir-menu']);

const busqueda = ref('');
const inputEnFoco = ref(false);
const inputRef = ref(null);
const lugaresITO = ref([]);
const pestanaExploracion = ref('edificios');
const edificioExplorado = ref(null);
const pisoFiltroEdificio = ref('TODOS');
let cancelarSuscripcion = null;

onMounted(async () => {
  try {
    const datos = await obtenerDatosCampus();
    lugaresITO.value = datos.lugares || [];

    cancelarSuscripcion = suscribirActualizacionCampus((nuevosDatos) => {
      lugaresITO.value = nuevosDatos.lugares || [];
    });
  } catch (error) {
    console.error('Error al cargar catalogo de lugares:', error);
  }
});

onUnmounted(() => {
  if (cancelarSuscripcion) cancelarSuscripcion();
});

const normalizarClave = (txt) =>
  String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const claveUnicaLugar = (item) => {
  const nombre = normalizarClave(item.nombre);
  const edif = String(item.edificio_id || '').trim();
  const piso = String(item.piso || 'PB').trim().toUpperCase();
  return `${nombre}|${edif}|${piso}`;
};

const catalogoCompleto = computed(() => {
  const mapa = new Map();
  for (const item of lugaresITO.value) {
    mapa.set(claveUnicaLugar(item), item);
  }
  for (const extra of props.lugaresExtra) {
    const clave = claveUnicaLugar(extra);
    const previo = mapa.get(clave);
    mapa.set(clave, previo ? { ...previo, ...extra } : extra);
  }
  return Array.from(mapa.values());
});

const resultadosFiltrados = computed(() => {
  return buscarLugares(catalogoCompleto.value, busqueda.value, 8);
});

const centroidePoligono = (geometry) => {
  if (!geometry) return null;
  if (geometry.type === 'Point') return geometry.coordinates;
  const anillo =
    geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates[0][0]
        : null;
  if (!anillo || !anillo.length) return null;

  const cerrado =
    anillo.length > 1 &&
    anillo[0][0] === anillo[anillo.length - 1][0] &&
    anillo[0][1] === anillo[anillo.length - 1][1];
  const total = cerrado ? anillo.length - 1 : anillo.length;

  let sumLng = 0;
  let sumLat = 0;
  for (let i = 0; i < total; i++) {
    sumLng += anillo[i][0];
    sumLat += anillo[i][1];
  }
  return [sumLng / total, sumLat / total];
};

const edificiosExplorables = computed(() => {
  const salonesPorEdificio = new Map();
  for (const salon of props.lugaresExtra) {
    const edifId = String(salon.edificio_id || '').trim();
    if (!edifId) continue;
    if (!salonesPorEdificio.has(edifId)) {
      salonesPorEdificio.set(edifId, []);
    }
    salonesPorEdificio.get(edifId).push(salon);
  }

  const mapaEdificios = new Map();

  for (const feat of props.edificios) {
    const p = feat.properties || {};
    const id = String(p.id || '').trim();
    const nombre = String(p.nombre || '').trim();
    if (!id || !nombre) continue;

    const salones = (salonesPorEdificio.get(id) || []).slice().sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { numeric: true })
    );

    mapaEdificios.set(id, {
      id,
      nombre,
      coordenadas: centroidePoligono(feat.geometry),
      salones
    });
  }

  for (const [id, salones] of salonesPorEdificio.entries()) {
    if (!mapaEdificios.has(id)) {
      mapaEdificios.set(id, {
        id,
        nombre: `Edificio ${id}`,
        coordenadas: salones[0]?.coordenadas || null,
        salones: salones.slice().sort((a, b) =>
          a.nombre.localeCompare(b.nombre, 'es', { numeric: true })
        )
      });
    }
  }

  return Array.from(mapaEdificios.values()).sort((a, b) => {
    const aTiene = a.salones.length > 0 ? 0 : 1;
    const bTiene = b.salones.length > 0 ? 0 : 1;
    if (aTiene !== bTiene) return aTiene - bTiene;
    return a.nombre.localeCompare(b.nombre, 'es', { numeric: true });
  });
});

const areasGenerales = computed(() => {
  const idsSalones = new Set(props.lugaresExtra.map((s) => claveUnicaLugar(s)));
  return lugaresITO.value
    .filter((l) => l.tipo !== 'Edificio' && !idsSalones.has(claveUnicaLugar(l)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
});

const pisosDisponiblesEdificio = computed(() => {
  if (!edificioExplorado.value) return [];
  const orden = ['PB', 'P1', 'P2'];
  const presentes = new Set(
    edificioExplorado.value.salones.map((s) => String(s.piso || 'PB').toUpperCase())
  );
  const pisosOrdenados = orden.filter((p) => presentes.has(p));
  for (const p of presentes) {
    if (!pisosOrdenados.includes(p)) pisosOrdenados.push(p);
  }
  return ['TODOS', ...pisosOrdenados];
});

const salonesEdificioFiltrados = computed(() => {
  if (!edificioExplorado.value) return [];
  if (pisoFiltroEdificio.value === 'TODOS') {
    return edificioExplorado.value.salones;
  }
  return edificioExplorado.value.salones.filter(
    (s) => String(s.piso || 'PB').toUpperCase() === pisoFiltroEdificio.value
  );
});

const iconosPorTipo = {
  'Edificio': Building2,
  'Aula': BookOpen,
  'Laboratorio': FlaskConical,
  'Departamento': Briefcase,
  'Oficina': Briefcase,
  'Administrativo': Landmark,
  'Audiovisual': Projector,
  'Biblioteca': Library,
  'Comida': Coffee,
  'Baños': DoorClosed,
  'Área Común': Trees,
  'Punto de Interés': MapPin,
  'Servicio': Wrench
};

const obtenerIcono = (tipo) => {
  return iconosPorTipo[tipo] || MapPin;
};

const abrirPanel = () => {
  inputEnFoco.value = true;
};

const limpiarBusqueda = () => {
  busqueda.value = '';
  edificioExplorado.value = null;
  pisoFiltroEdificio.value = 'TODOS';
  inputEnFoco.value = true;
  setTimeout(() => inputRef.value?.focus(), 10);
};

const aplicarFiltro = (filtro) => {
  edificioExplorado.value = null;
  busqueda.value = filtro;
  inputEnFoco.value = true;
  setTimeout(() => inputRef.value?.focus(), 10);
};

const abrirEdificio = (edif) => {
  if (!edif.salones || edif.salones.length === 0) {
    seleccionarEdificioGeneral(edif);
    return;
  }
  edificioExplorado.value = edif;
  pisoFiltroEdificio.value = 'TODOS';
};

const volverAEdificios = () => {
  edificioExplorado.value = null;
  pisoFiltroEdificio.value = 'TODOS';
};

const seleccionarEdificioGeneral = (edif) => {
  const enCatalogo = lugaresITO.value.find(
    (l) => String(l.edificio_id) === String(edif.id) && l.tipo === 'Edificio'
  );

  if (enCatalogo) {
    seleccionarLugar(enCatalogo);
    return;
  }

  seleccionarLugar({
    id: `edificio-${edif.id}`,
    nombre: edif.nombre,
    descripcion: 'Edificio del campus',
    tipo: 'Edificio',
    edificio_id: String(edif.id),
    piso: 'PB',
    coordenadas: edif.coordenadas
  });
};

const seleccionarLugar = (lugar) => {
  busqueda.value = lugar.nombre;
  edificioExplorado.value = null;
  inputEnFoco.value = false;
  emit('seleccion', lugar);
};

const seleccionarPrimero = () => {
  if (busqueda.value.trim().length > 0 && resultadosFiltrados.value.length > 0) {
    seleccionarLugar(resultadosFiltrados.value[0]);
  }
};

const ocultarResultados = () => {
  inputEnFoco.value = false;
};
</script>

<style scoped>
.buscador-container {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: min(420px, calc(100vw - 160px));
  z-index: 15;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: white;
  padding: 8px 10px 8px 15px;
  border-radius: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.3s ease;
  position: relative;
  z-index: 16;
  gap: 8px;
}

.input-wrapper:focus-within {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.btn-menu {
  display: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #334155;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-menu:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.search-icon {
  color: #64748b;
  flex-shrink: 0;
}

.search-input {
  border: none;
  outline: none;
  width: 100%;
  min-width: 0;
  font-size: 15px;
  color: #1e293b;
  background: transparent;
}

.search-input::placeholder {
  color: #94a3b8;
}

.btn-limpiar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-limpiar:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.btn-cuenta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 18px;
  padding: 7px 10px;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
}

.btn-cuenta.autenticado {
  background: #dbeafe;
  color: #1e40af;
}

.rol-corto {
  letter-spacing: 0.3px;
}

.filtros-rapidos {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.filtros-rapidos::-webkit-scrollbar {
  display: none;
}

.pildora {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #e2e8f0;
  padding: 7px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;
}

.pildora:hover, .pildora:active {
  background: #f0f8ff;
  border-color: #1E88E5;
  color: #1E88E5;
  transform: translateY(-1px);
}

.resultados-panel {
  position: absolute;
  top: 26px;
  left: 0;
  width: 100%;
  background: white;
  border-radius: 0 0 20px 20px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
  padding-top: 28px;
  max-height: 330px;
  overflow-y: auto;
  z-index: 15;
}

.explorador-tabs {
  display: flex;
  gap: 6px;
  padding: 8px 14px 10px;
  border-bottom: 1px solid #f1f5f9;
  position: sticky;
  top: 0;
  background: #ffffff;
  z-index: 2;
}

.explorador-tab {
  flex: 1;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 10px;
  cursor: pointer;
}

.explorador-tab.activo {
  background: #eff6ff;
  border-color: #1e88e5;
  color: #1e88e5;
}

.subpanel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
  position: sticky;
  top: 0;
  z-index: 2;
}

.btn-volver {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: #ffffff;
  color: #1e88e5;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 9px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
}

.subpanel-titulo {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subpanel-acciones {
  padding: 8px 14px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-ir-edificio {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-ir-edificio:hover {
  background: #dbeafe;
}

.tabs-pisos {
  display: flex;
  gap: 6px;
}

.tab-piso {
  flex: 1;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.tab-piso.activo {
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
}

.resultados-lista {
  list-style: none;
  margin: 0;
  padding: 0;
}

.resultado-item {
  display: flex;
  align-items: center;
  padding: 11px 16px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f1f5f9;
}

.resultado-item:last-child {
  border-bottom: none;
}

.resultado-item:hover {
  background-color: #f8fafc;
}

.lugar-icono {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #1E88E5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.lugar-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.lugar-nombre {
  font-weight: 600;
  color: #1e293b;
  font-size: 14px;
}

.lugar-descripcion {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.icono-flecha {
  color: #94a3b8;
  flex-shrink: 0;
  margin-left: 8px;
}

.sin-resultados {
  padding: 20px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

@media (max-width: 640px) {
  .buscador-container {
    left: 50%;
    right: auto;
    width: 92%;
    max-width: 420px;
    transform: translateX(-50%);
  }

  .input-wrapper {
    padding: 8px 10px;
    gap: 6px;
  }

  .btn-menu {
    display: inline-flex;
  }
}
</style>