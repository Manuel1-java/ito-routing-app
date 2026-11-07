<template>
  <div class="controles-laterales-container">
    
    <!-- Botón de Accesibilidad (Ruta en silla de ruedas) -->
    <div class="grupo-control">
      <button 
        class="btn-circular accesibilidad" 
        :class="{ 'accesibilidad-activa': modoAccesible }"
        @click="toggleAccesibilidad"
        title="Ruta sin escaleras"
      >
        <span class="icono">♿</span>
      </button>
    </div>

    <!-- Selector de Pisos -->
    <div class="grupo-control selector-pisos">
      <button 
        v-for="piso in niveles" 
        :key="piso.id"
        class="btn-piso"
        :class="{ 'piso-activo': pisoActivo === piso.id }"
        @click="cambiarPiso(piso.id)"
        :title="piso.nombre"
      >
        {{ piso.etiqueta }}
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['cambio-piso', 'cambio-accesibilidad']);

// Estado local
const modoAccesible = ref(false);
const pisoActivo = ref('PB');

// Definición de los niveles del Tec
const niveles = [
  { id: 'P2', etiqueta: 'P2', nombre: 'Segundo Piso' },
  { id: 'P1', etiqueta: 'P1', nombre: 'Primer Piso' },
  { id: 'PB', etiqueta: 'PB', nombre: 'Planta Baja' }
];

// Acciones
const toggleAccesibilidad = () => {
  modoAccesible.value = !modoAccesible.value;
  emit('cambio-accesibilidad', modoAccesible.value);
};

const cambiarPiso = (idPiso) => {
  pisoActivo.value = idPiso;
  emit('cambio-piso', idPiso);
};
</script>

<style scoped>
.controles-laterales-container {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 10; /* Por encima del mapa */
}

.grupo-control {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Para que los botones respeten el borde redondeado */
}

/* Estilos del botón de accesibilidad */
.btn-circular {
  border: none;
  background: white;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.icono {
  font-size: 22px;
  filter: grayscale(100%);
  transition: all 0.2s ease;
}

/* Cuando se activa el modo silla de ruedas */
.accesibilidad-activa {
  background: #1E88E5; /* Azul institucional */
}

.accesibilidad-activa .icono {
  filter: grayscale(0%);
  transform: scale(1.1);
}

/* Estilos del selector de pisos */
.btn-piso {
  border: none;
  background: white;
  width: 45px;
  height: 45px;
  font-size: 14px;
  font-weight: bold;
  color: #555;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.btn-piso:last-child {
  border-bottom: none;
}

.btn-piso:hover {
  background: #f5f8fa;
}

/* Cuando un piso está seleccionado */
.piso-activo {
  background: #f0f8ff;
  color: #1E88E5;
  border-left: 4px solid #1E88E5;
}
</style>