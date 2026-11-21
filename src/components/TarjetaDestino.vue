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

      <!-- Resumen de distancia y tiempo cuando ya se trazó la ruta -->
      <div v-if="ruta" class="resumen-ruta">
        <div class="origen-fila">
          <span class="origen-titulo">🚩 Saliendo desde:</span>
          <span class="origen-nombre">{{ ruta.origenNombre }}</span>
        </div>

        <div class="metricas-fila">
          <div class="metrica">
            <span class="metrica-dato">{{ ruta.tiempoMinutos }} min</span>
            <span class="metrica-sub">Tiempo aprox.</span>
          </div>
          <div class="divisor"></div>
          <div class="metrica">
            <span class="metrica-dato">{{ ruta.distancia }} m</span>
            <span class="metrica-sub">Distancia</span>
          </div>
        </div>
      </div>

      <div class="tarjeta-acciones">
        <button class="btn-ruta" @click="$emit('trazar-ruta', lugar)">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none">
            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
          </svg>
          {{ ruta ? 'Recalcular ruta' : 'Cómo llegar' }}
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
  },
  ruta: {
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
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 520px;
  background: white;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  padding: 25px 20px 30px;
  z-index: 20;
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
  margin-bottom: 18px;
}

.icono-grande {
  font-size: 40px;
  margin-right: 15px;
  background: #f5f8fa;
  width: 70px;
  height: 70px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
}

.info-principal {
  display: flex;
  flex-direction: column;
  padding-right: 25px;
}

.nombre {
  margin: 0 0 5px 0;
  font-size: 20px;
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

.resumen-ruta {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px 16px;
  margin-bottom: 16px;
}

.origen-fila {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  font-size: 13px;
  color: #475569;
  padding-bottom: 10px;
  margin-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.origen-titulo {
  font-weight: 600;
}

.origen-nombre {
  color: #1e293b;
  font-weight: bold;
}

.metricas-fila {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.metrica {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metrica-dato {
  font-size: 18px;
  font-weight: bold;
  color: #FF6D00;
}

.metrica-sub {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.divisor {
  width: 1px;
  height: 30px;
  background: #cbd5e1;
}

.tarjeta-acciones {
  display: flex;
  justify-content: center;
}

.btn-ruta {
  background: #1E88E5;
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

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>