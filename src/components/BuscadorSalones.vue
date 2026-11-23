<template>
  <div class="buscador-container">
    <div class="input-wrapper">
      <Search class="search-icon" :size="20" />
      
      <input 
        ref="inputRef"
        type="text" 
        v-model="busqueda"
        @focus="inputEnFoco = true"
        @blur="ocultarResultados"
        @keyup.enter="seleccionarPrimero"
        placeholder="Buscar salón, edificio o área..." 
        class="search-input"
      />
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
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Administrativo')">
        <Briefcase :size="15" /> Oficinas
      </button>
    </div>

    <div v-if="inputEnFoco && busqueda.length > 0" class="resultados-panel">
      <ul v-if="resultadosFiltrados.length > 0" class="resultados-lista">
        <li 
          v-for="lugar in resultadosFiltrados" 
          :key="lugar.id" 
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
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  Search,
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
  Wrench
} from 'lucide-vue-next';
import { buscarLugares } from '../utils/pathfinder';

const emit = defineEmits(['seleccion']);

const busqueda = ref('');
const inputEnFoco = ref(false);
const inputRef = ref(null);
const lugaresITO = ref([]);

onMounted(async () => {
  try {
    const res = await fetch('/lugares.json');
    lugaresITO.value = await res.json();
  } catch (error) {
    console.error('Error al cargar lugares.json:', error);
  }
});

const resultadosFiltrados = computed(() => {
  return buscarLugares(lugaresITO.value, busqueda.value, 12);
});

const iconosPorTipo = {
  'Edificio': Building2,
  'Aula': BookOpen,
  'Laboratorio': FlaskConical,
  'Departamento': Briefcase,
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

const aplicarFiltro = (filtro) => {
  busqueda.value = filtro;
  inputEnFoco.value = true;
  setTimeout(() => inputRef.value?.focus(), 10);
};

const seleccionarLugar = (lugar) => {
  busqueda.value = lugar.nombre;
  inputEnFoco.value = false;
  emit('seleccion', lugar);
};

const seleccionarPrimero = () => {
  if (resultadosFiltrados.value.length > 0) {
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
  width: 92%;
  max-width: 420px;
  z-index: 15;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: white;
  padding: 11px 16px;
  border-radius: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.3s ease;
  position: relative;
  z-index: 16;
}

.input-wrapper:focus-within {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.search-icon {
  color: #64748b;
  margin-right: 10px;
  flex-shrink: 0;
}

.search-input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 15px;
  color: #1e293b;
  background: transparent;
}

.search-input::placeholder {
  color: #94a3b8;
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
  padding-top: 26px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 15;
}

.resultados-lista {
  list-style: none;
  margin: 0;
  padding: 0;
}

.resultado-item {
  display: flex;
  align-items: center;
  padding: 12px 18px;
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

.sin-resultados {
  padding: 20px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}
</style>