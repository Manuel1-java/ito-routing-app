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
        placeholder="Buscar salón, edificio o área..." 
        class="search-input"
      />
    </div>

    <!-- NUEVO: Fila de Filtros Rápidos -->
    <div class="filtros-rapidos">
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Baños')">🚻 Baños</button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Comida')">☕ Cafetería</button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Laboratorio')">🔬 Laboratorios</button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Área Común')">🌳 Áreas Verdes</button>
      <button class="pildora" @mousedown.prevent="aplicarFiltro('Administrativo')">🧑‍🏫 Oficinas</button>
    </div>

    <!-- Panel de Resultados Desplegable -->
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
import { ref, computed } from 'vue';

const emit = defineEmits(['seleccion']);

const busqueda = ref('');
const inputEnFoco = ref(false);
const inputRef = ref(null); // Referencia para controlar el teclado

// Base de datos oficial del ITO
const lugaresITO = [
  { id: '1', nombre: 'Edificio A', descripcion: 'Aulas / Administrativo', tipo: 'Edificio' },
  { id: '2', nombre: 'Edificio B', descripcion: 'Aulas', tipo: 'Edificio' },
  { id: '3', nombre: 'Edificio C', descripcion: 'Aulas', tipo: 'Edificio' },
  { id: '4', nombre: 'Edificio E', descripcion: 'Aulas', tipo: 'Edificio' },
  { id: '5', nombre: 'Edificio F', descripcion: 'Aulas', tipo: 'Edificio' },
  { id: '6', nombre: 'Edificio G', descripcion: 'Aulas', tipo: 'Edificio' },
  { id: '7', nombre: 'Edificio H', descripcion: 'Aulas', tipo: 'Edificio' },
  { id: '8', nombre: 'Edificio I', descripcion: 'Depto. de Ing. en Sistemas y Computación', tipo: 'Edificio' },
  { id: '9', nombre: 'Edificio J', descripcion: 'Depto. de Ciencias Económico-Administrativas', tipo: 'Edificio' },
  { id: '10', nombre: 'Edificio K', descripcion: 'Aulas', tipo: 'Edificio' },
  { id: '11', nombre: 'Edificio L', descripcion: 'Depto. Ciencias de la Tierra', tipo: 'Edificio' },
  { id: '12', nombre: 'Edificio Q', descripcion: 'Aulas', tipo: 'Edificio' },
  { id: '18', nombre: 'Edificio S', descripcion: 'Aulas', tipo: 'Edificio' },
  { id: '45', nombre: 'Edificio de Cátedras CONACYT', descripcion: 'Investigación', tipo: 'Edificio' },
  { id: '13', nombre: 'Aulas 55, 56 y 57', descripcion: 'Cubículos de Doctorado', tipo: 'Aula' },
  { id: '14', nombre: 'Aula Ñ', descripcion: 'Aula', tipo: 'Aula' },
  { id: '16', nombre: 'Aulas M', descripcion: 'Aulas', tipo: 'Aula' },
  { id: '17', nombre: 'Aulas O', descripcion: 'Aulas', tipo: 'Aula' },
  { id: '19', nombre: 'Aulas P', descripcion: 'Aulas', tipo: 'Aula' },
  { id: '38', nombre: 'Aulas Q8 y Q10', descripcion: 'Aulas', tipo: 'Aula' },
  { id: '20', nombre: 'Laboratorio de Ingeniería Civil', descripcion: 'Prácticas Civil', tipo: 'Laboratorio' },
  { id: '21A', nombre: 'Laboratorio de Ingeniería Industrial', descripcion: 'Prácticas Industrial', tipo: 'Laboratorio' },
  { id: '22', nombre: 'Sala de Simulación', descripcion: 'Ingeniería Industrial', tipo: 'Laboratorio' },
  { id: '24', nombre: 'Laboratorio de Química Pesada', descripcion: 'Prácticas Química', tipo: 'Laboratorio' },
  { id: '25', nombre: 'Laboratorio de Físico-Química', descripcion: 'Prácticas Química', tipo: 'Laboratorio' },
  { id: '26', nombre: 'Laboratorio de Ingeniería Mecánica', descripcion: 'Prácticas Mecánica', tipo: 'Laboratorio' },
  { id: '27', nombre: 'Centro de Cómputo', descripcion: 'Equipos y Sistemas', tipo: 'Laboratorio' },
  { id: '28', nombre: 'Laboratorio de Ingeniería Eléctrica', descripcion: 'Prácticas Eléctrica', tipo: 'Laboratorio' },
  { id: '15', nombre: 'Unidad Académica de Posgrado', descripcion: 'DEPI', tipo: 'Departamento' },
  { id: '23', nombre: 'Depto. de Ing. Química e Industrial', descripcion: 'Jefatura de Química e Industrial', tipo: 'Departamento' },
  { id: '29', nombre: 'Depto. de Ingeniería Electrónica', descripcion: 'Jefatura de Electrónica', tipo: 'Departamento' },
  { id: '32', nombre: 'Depto. de Ciencias Básicas', descripcion: 'Jefatura de Ciencias Básicas', tipo: 'Departamento' },
  { id: '34', nombre: 'Depto. de Ing. Eléctrica y Mantenimiento', descripcion: 'Eléctrica y Servicios Generales', tipo: 'Departamento' },
  { id: '35', nombre: 'Área Docente de Ingeniería Electrónica', descripcion: 'Docencia', tipo: 'Departamento' },
  { id: '37', nombre: 'División de Estudios Profesionales', descripcion: 'Depto. de Servicios Escolares', tipo: 'Departamento' },
  { id: '42', nombre: 'Depto. de Desarrollo Académico', descripcion: 'Desarrollo Académico', tipo: 'Departamento' },
  { id: '46', nombre: 'Maestría en Construcción', descripcion: 'Posgrado', tipo: 'Departamento' },
  { id: '33', nombre: 'Claustro Doctoral', descripcion: 'Área de Maestros', tipo: 'Administrativo' },
  { id: '36', nombre: 'Dirección', descripcion: 'Dirección General', tipo: 'Administrativo' },
  { id: '39', nombre: 'Sala de Maestros', descripcion: 'Ing. Gregorio Gutiérrez López', tipo: 'Administrativo' },
  { id: '41', nombre: 'Cubículos de Maestros C', descripcion: 'Área Docente', tipo: 'Administrativo' },
  { id: '43', nombre: 'Orientación Educativa y Titulación', descripcion: 'Acción Tutorial y Simulación Civil', tipo: 'Administrativo' },
  { id: '44', nombre: 'Sección 61', descripcion: 'Sindicato', tipo: 'Administrativo' },
  { id: '49', nombre: 'GRIQ', descripcion: 'Área de Investigación', tipo: 'Administrativo' },
  { id: 'c-civil', nombre: 'Cubículos Dept. Civil', descripcion: 'Área Docente', tipo: 'Administrativo' },
  { id: 'gric', nombre: 'GRIC', descripcion: 'Área de Investigación', tipo: 'Administrativo' },
  { id: '30', nombre: 'Audiovisual de Licenciatura', descripcion: 'Sección 22', tipo: 'Audiovisual' },
  { id: '31', nombre: 'Audiovisual de Ingeniería', descripcion: 'Sala de Proyecciones', tipo: 'Audiovisual' },
  { id: '40', nombre: 'Centro de Información', descripcion: 'Biblioteca', tipo: 'Biblioteca' },
  { id: '47', nombre: 'Cafetería', descripcion: 'Alimentos y Bebidas', tipo: 'Comida' },
  { id: '48', nombre: 'Gimnasio', descripcion: 'Deportes', tipo: 'Área Común' },
  { id: 'musica', nombre: 'Área de Música', descripcion: 'Actividades Extraescolares', tipo: 'Área Común' },
  { id: 'p-juarez', nombre: 'Plaza Benito Juárez', descripcion: 'Explanada', tipo: 'Punto de Interés' },
  { id: 'p-civica', 'nombre': 'Plaza Cívica', descripcion: 'Explanada Central', tipo: 'Punto de Interés' },
  { id: 'bancas', nombre: 'Bancas y Áreas de Descanso', descripcion: 'Puntos de Reunión', tipo: 'Área Común' },
  { id: '50', nombre: 'Planta de Tratamiento', descripcion: 'Servicios Hídricos', tipo: 'Servicio' },
  { id: 'puri', nombre: 'Purificadora', descripcion: 'Agua Potable', tipo: 'Servicio' },
  { id: 'medico', nombre: 'Centro Médico', descripcion: 'Enfermería / Primeros Auxilios', tipo: 'Servicio' },
  { id: 'caldera', nombre: 'Caldera', descripcion: 'Servicios Generales', tipo: 'Servicio' },
  { id: 'bodega', nombre: 'Bodega', descripcion: 'Almacén', tipo: 'Servicio' },
  { id: 'banos', nombre: 'Baños', descripcion: 'Sanitarios', tipo: 'Baños' }
];

const resultadosFiltrados = computed(() => {
  const termino = busqueda.value.toLowerCase().trim();
  if (!termino) return [];
  
  return lugaresITO.filter(lugar => 
    lugar.nombre.toLowerCase().includes(termino) ||
    lugar.descripcion.toLowerCase().includes(termino) ||
    lugar.tipo.toLowerCase().includes(termino)
  );
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

// NUEVA FUNCIÓN: Al hacer clic en una píldora, llena el input y abre los resultados
const aplicarFiltro = (filtro) => {
  busqueda.value = filtro;
  inputEnFoco.value = true;
  // Le damos foco al input visualmente
  setTimeout(() => inputRef.value?.focus(), 10);
};

const seleccionarLugar = (lugar) => {
  busqueda.value = lugar.nombre;
  inputEnFoco.value = false;
  emit('seleccion', lugar);
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

/* NUEVO: Estilos para las píldoras (Filtros rápidos) */
.filtros-rapidos {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  overflow-x: auto;
  padding-bottom: 5px; /* Espacio para el scroll horizontal si hay muchos filtros */
  scrollbar-width: none; /* Oculta el scroll en Firefox */
}

.filtros-rapidos::-webkit-scrollbar {
  display: none; /* Oculta el scroll en Chrome/Safari */
}

.pildora {
  background: white;
  border: 1px solid #e0e0e0;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  white-space: nowrap; /* Evita que el texto se rompa en dos líneas */
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
  transition: all 0.2s ease;
}

.pildora:hover, .pildora:active {
  background: #f0f8ff; /* Azul muy clarito */
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