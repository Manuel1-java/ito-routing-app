<template>
  <div class="controles-laterales-container">
    <div class="accesibilidad-wrapper">
      <transition name="fade">
        <span v-if="mostrarAvisoAccesible" class="aviso-accesible">
          {{ modoAccesible ? 'Ruta sin escaleras' : 'Ruta estándar' }}
        </span>
      </transition>

      <div class="grupo-control">
        <button
          type="button"
          class="btn-circular accesibilidad"
          :class="{ 'accesibilidad-activa': modoAccesible }"
          @click="toggleAccesibilidad"
          title="Ruta sin escaleras"
        >
          <Accessibility :size="22" />
        </button>
      </div>
    </div>

    <div class="grupo-control selector-pisos">
      <button
        type="button"
        class="btn-piso btn-exterior"
        :class="{ 'piso-activo': soloEdificios }"
        @click="activarSoloEdificios"
        title="Solo edificios (ocultar salones)"
      >
        <Building2 :size="18" />
      </button>

      <button
        v-for="piso in niveles"
        :key="piso.id"
        type="button"
        class="btn-piso"
        :class="{ 'piso-activo': !soloEdificios && pisoActual === piso.id }"
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
import { Accessibility, Building2 } from 'lucide-vue-next';

defineProps({
  pisoActual: {
    type: String,
    default: 'PB'
  },
  soloEdificios: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['cambio-piso', 'cambio-accesibilidad', 'cambio-solo-edificios']);

const modoAccesible = ref(false);
const mostrarAvisoAccesible = ref(false);
let temporizadorAviso = null;

const niveles = [
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

const activarSoloEdificios = () => {
  emit('cambio-solo-edificios', true);
};

const cambiarPiso = (idPiso) => {
  emit('cambio-piso', idPiso);
};
</script>

<style scoped>
.controles-laterales-container {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
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
  color: #475569;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-circular:hover {
  background: #f8fafc;
}

.accesibilidad-activa {
  background: #059669;
  color: #ffffff;
}

.accesibilidad-activa:hover {
  background: #047857;
}

.btn-piso {
  border: none;
  background: white;
  width: 44px;
  height: 42px;
  font-size: 13px;
  font-weight: bold;
  color: #475569;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-piso:last-child {
  border-bottom: none;
}

.btn-piso:hover {
  background: #f8fafc;
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

@media (max-width: 768px) {
  .controles-laterales-container {
    top: 268px;
    transform: none;
    gap: 12px;
  }

  .btn-circular {
    width: 40px;
    height: 40px;
  }

  .btn-piso {
    width: 40px;
    height: 36px;
    font-size: 12px;
  }
}
</style>