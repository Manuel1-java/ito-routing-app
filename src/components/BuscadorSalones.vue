<template>
  <div class="buscador-container">
    <div class="input-wrapper">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      
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
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Baños')">🚻 Baños</button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Comida')">☕ Cafetería</button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Laboratorio')">🔬 Laboratorios</button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Área Común')">🌳 Áreas Verdes</button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Administrativo')">🧑‍🏫 Oficinas</button>
    </div>

    <div v-if="inputEnFoco && busqueda.length > 0" class="resultados-panel">
      <ul v-if="resultadosFiltrados.length > 0" class="resultados-lista">
        <li 
          v-for="lugar in resultadosFiltrados" 
          :key="lugar.id" 
          class="resultado-item"
          @mousedown.prevent="seleccionarLugar(lugar)"
        >
          <div class="lugar-icono">{{ obtenerIcono(lugar.tipo) }}</div>
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

const obtenerIcono = (tipo) => {
  const iconos = {
    'Edificio': '🏢', 'Aula': '📚', 'Laboratorio': '🔬', 
    'Departamento': '💼', 'Administrativo': '🧑‍🏫', 'Audiovisual': '📽️',
    'Biblioteca': '📖', 'Comida': '☕', 'Baños': '🚻',
    'Área Común': '🌳', 'Punto de Interés': '📍', 'Servicio': '⚙️'
  };
  return iconos[tipo] || '📌';
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
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 400px;
  z-index: 10;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background-color: white;
  padding: 12px 15px;
  border-radius: 25px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.3s ease;
  position: relative;
  z-index: 11;
}

.input-wrapper:focus-within {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.search-icon {
  width: 20px;
  height: 20px;
  color: #666;
  margin-right: 10px;
}

.search-input {
  border: none;
  outline: none;
  width: 100%;
  font-size: 16px;
  color: #333;
  background: transparent;
}

.search-input::placeholder {
  color: #999;
}

.filtros-rapidos {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  overflow-x: auto;
  padding-bottom: 5px;
  scrollbar-width: none;
}

.filtros-rapidos::-webkit-scrollbar {
  display: none;
}

.pildora {
  background: white;
  border: 1px solid #e0e0e0;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
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
  top: 30px;
  left: 0;
  width: 100%;
  background: white;
  border-radius: 0 0 20px 20px;
  box-shadow: 0 10px 20px rgba(0,0,0,0.15);
  padding-top: 25px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 10;
}

.resultados-lista {
  list-style: none;
  margin: 0;
  padding: 0;
}

.resultado-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.resultado-item:last-child {
  border-bottom: none;
}

.resultado-item:hover {
  background-color: #f5f8fa;
}

.lugar-icono {
  font-size: 20px;
  margin-right: 15px;
}

.lugar-info {
  display: flex;
  flex-direction: column;
}

.lugar-nombre {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.lugar-descripcion {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

.sin-resultados {
  padding: 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
}
</style>