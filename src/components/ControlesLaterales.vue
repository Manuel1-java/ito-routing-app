<template>
  <div class="controles-laterales-container">
    <!-- Botón de Accesibilidad (Ruta en silla de ruedas) -->
    <div class="accesibilidad-wrapper">
      <transition name="fade">
        <span v-if="mostrarAvisoAccesible" class="aviso-accesible">
          {{ modoAccesible ? '♿ Ruta sin escaleras' : 'Ruta estándar' }}
        </span>
      </transition>

      <div class="grupo-control">
        <button
          class="btn-circular accesibilidad"
          :class="{ 'accesibilidad-activa': modoAccesible }"
          @click="toggleAccesibilidad"
          title="Ruta sin escaleras"
        >
          <svg
            class="icono-svg"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="10" cy="4.5" r="2" fill="currentColor" stroke="none" />
            <path d="M10 8.5v5.5h5.5l2.5 5" />
            <path d="M10 11h4.5" />
            <path d="M13.5 16.5a4.5 4.5 0 1 1-4.2-6" />
          </svg>
        </button>
      </div>
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

const modoAccesible = ref(false);
const pisoActivo = ref('PB');
const mostrarAvisoAccesible = ref(false);
let temporizadorAviso = null;

const niveles = [
  { id: 'P2', etiqueta: 'P2', nombre: 'Segundo Piso' },
  { id: 'P1', etiqueta: 'P1', nombre: 'Primer Piso' },
  { id: 'PB', etiqueta: 'PB', nombre: 'Planta Baja' }
];

const toggleAccesibilidad = () => {
  modoAccesible.value = !modoAccesible.value;
  emit('cambio-accesibilidad', modoAccesible.value);

  mostrarAvisoAccesible.value = true;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => {
    mostrarAvisoAccesible.value = false;
  }, 2200);
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
  align-items: flex-end;
  gap: 20px;
  z-index: 10;
}

.accesibilidad-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.aviso-accesible {
  background: #1e293b;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 16px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.grupo-control {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.btn-circular {
  border: none;
  background: white;
  color: #64748b;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-circular:hover {
  background: #f8fafc;
}

.icono-svg {
  transition: transform 0.2s ease;
}

.accesibilidad-activa {
  background: #059669;
  color: #ffffff;
}

.accesibilidad-activa:hover {
  background: #047857;
}

.accesibilidad-activa .icono-svg {
  transform: scale(1.08);
}

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

.piso-activo {
  background: #f0f8ff;
  color: #1E88E5;
  border-left: 4px solid #1E88E5;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>