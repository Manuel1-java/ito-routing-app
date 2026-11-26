<template>
  <Transition name="fade-visor">
    <div
      v-if="imagen"
      class="visor-backdrop"
      role="dialog"
      aria-modal="true"
      @click.self="$emit('cerrar')"
    >
      <div class="visor-contenido">
        <div class="visor-barra-superior">
          <div class="visor-textos">
            <h3 v-if="titulo" class="visor-titulo">{{ titulo }}</h3>
            <span v-if="subtitulo" class="visor-subtitulo">{{ subtitulo }}</span>
          </div>
          <button
            type="button"
            class="btn-cerrar-visor"
            aria-label="Cerrar imagen"
            @click="$emit('cerrar')"
          >
            <X :size="22" />
          </button>
        </div>

        <div class="visor-imagen-wrap" @click.self="$emit('cerrar')">
          <img
            :src="imagen"
            :alt="titulo || 'Cartel promocional del evento'"
            class="visor-imagen"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { X } from 'lucide-vue-next';

const props = defineProps({
  imagen: {
    type: String,
    default: null
  },
  titulo: {
    type: String,
    default: ''
  },
  subtitulo: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['cerrar']);

const manejarTecla = (e) => {
  if (e.key === 'Escape' && props.imagen) {
    emit('cerrar');
  }
};

onMounted(() => {
  window.addEventListener('keydown', manejarTecla);
});

onUnmounted(() => {
  window.removeEventListener('keydown', manejarTecla);
});
</script>

<style scoped>
.visor-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(4px);
  z-index: 65;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.visor-contenido {
  width: 100%;
  max-width: 720px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.visor-barra-superior {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #ffffff;
}

.visor-textos {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.visor-titulo {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.visor-subtitulo {
  font-size: 12px;
  color: #cbd5e1;
  margin-top: 2px;
}

.btn-cerrar-visor {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s ease;
}

.btn-cerrar-visor:hover {
  background: rgba(255, 255, 255, 0.28);
}

.visor-imagen-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  border-radius: 16px;
}

.visor-imagen {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 14px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45);
  background: #0f172a;
}

.fade-visor-enter-active,
.fade-visor-leave-active {
  transition: opacity 0.2s ease;
}

.fade-visor-enter-from,
.fade-visor-leave-to {
  opacity: 0;
}
</style>