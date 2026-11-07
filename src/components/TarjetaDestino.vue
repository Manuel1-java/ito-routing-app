<template>
  <transition name="slide-up">
    <div v-if="lugar" class="tarjeta-container">
      <!-- Botón para cerrar la tarjeta -->
      <button class="btn-cerrar" @click="$emit('cerrar')">
        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      
      <div class="tarjeta-header">
        <div class="icono-grande">{{ icono }}</div>
        <div class="info-principal">
          <h2 class="nombre">{{ lugar.nombre }}</h2>
          <p class="descripcion">{{ lugar.descripcion }}</p>
          <span class="etiqueta-tipo">{{ lugar.tipo }}</span>
        </div>
      </div>

      <div class="tarjeta-acciones">
        <button class="btn-ruta" @click="$emit('trazar-ruta', lugar)">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
          </svg>
          Cómo llegar
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  lugar: {
    type: Object,
    default: null
  }
});

defineEmits(['cerrar', 'trazar-ruta']);

const icono = computed(() => {
  if (!props.lugar) return '📌';
  const iconos = {
    'Edificio': '🏢', 'Aula': '📚', 'Laboratorio': '🔬', 
    'Departamento': '💼', 'Administrativo': '🧑‍🏫', 'Audiovisual': '📽️',
    'Biblioteca': '📖', 'Comida': '☕', 'Baños': '🚻',
    'Área Común': '🌳', 'Punto de Interés': '📍', 'Servicio': '⚙️'
  };
  return iconos[props.lugar.tipo] || '📌';
});
</script>

<style scoped>
.tarjeta-container {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  background: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  padding: 25px 20px 30px;
  z-index: 20; /* Flota por encima de todo */
  box-sizing: border-box;
}

.btn-cerrar {
  position: absolute;
  top: 15px;
  right: 15px;
  background: #f0f0f0;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: background 0.2s;
}

.btn-cerrar:hover {
  background: #e0e0e0;
}

.tarjeta-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.icono-grande {
  font-size: 40px;
  margin-right: 15px;
  background: #f5f8fa;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
}

.info-principal {
  display: flex;
  flex-direction: column;
}

.nombre {
  margin: 0 0 5px 0;
  font-size: 22px;
  color: #333;
}

.descripcion {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #666;
}

.etiqueta-tipo {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  align-self: flex-start;
}

.tarjeta-acciones {
  display: flex;
  justify-content: center;
}

.btn-ruta {
  background: #1E88E5; /* Azul tecnológico */
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 25px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(30, 136, 229, 0.3);
  transition: transform 0.2s, background 0.2s;
}

.btn-ruta:hover {
  background: #1565C0;
  transform: translateY(-2px);
}

/* Animaciones de entrada y salida */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>