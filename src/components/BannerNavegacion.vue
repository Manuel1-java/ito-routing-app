<template>
  <div v-if="pasoActual" class="banner-nav" :class="{ 'banner-llegada': esDestino }">
    <div class="banner-principal">
      <div class="icono-giro">
        <component :is="iconoDireccion" :size="30" :stroke-width="2.5" />
      </div>

      <div class="texto-instruccion">
        <span v-if="!esDestino" class="distancia-paso">
          En {{ distanciaSiguiente }} m
        </span>
        <span v-else class="distancia-paso">
          ¡Destino alcanzado!
        </span>

        <h3 class="titulo-paso">{{ textoSiguiente }}</h3>
      </div>

      <button class="btn-salir-nav" @click="$emit('detener')" title="Finalizar guía">
        <X :size="20" />
      </button>
    </div>

    <div class="banner-pie">
      <div class="resumen-restante">
        <span class="badge-tiempo">{{ minutosRestantes }} min</span>
        <span>• {{ distanciaRestante }} m restantes</span>
      </div>

      <div class="controles-pasos">
        <button
          class="btn-paso-manual"
          :disabled="indicePaso <= 0"
          @click="$emit('anterior-paso')"
          title="Paso anterior"
        >
          <ChevronLeft :size="18" />
        </button>
        <span class="contador-pasos">{{ indicePaso + 1 }}/{{ totalPasos }}</span>
        <button
          class="btn-paso-manual"
          :disabled="indicePaso >= totalPasos - 1"
          @click="$emit('siguiente-paso')"
          title="Siguiente paso"
        >
          <ChevronRight :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import {
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
  RotateCcw,
  Flag,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-vue-next';

const props = defineProps({
  pasos: {
    type: Array,
    default: () => []
  },
  indicePaso: {
    type: Number,
    default: 0
  },
  distanciaAlGiro: {
    type: Number,
    default: null
  },
  distanciaRestante: {
    type: Number,
    default: 0
  }
});

defineEmits(['detener', 'anterior-paso', 'siguiente-paso']);

const totalPasos = computed(() => props.pasos.length);

const pasoActual = computed(() => props.pasos[props.indicePaso] || null);

// Muestra la acción que viene a continuación (el giro al final del tramo actual)
const pasoProximo = computed(() => {
  if (props.indicePaso + 1 < props.pasos.length) {
    return props.pasos[props.indicePaso + 1];
  }
  return pasoActual.value;
});

const esDestino = computed(() => pasoActual.value?.tipo === 'destino');

const distanciaSiguiente = computed(() => {
  if (props.distanciaAlGiro !== null) return props.distanciaAlGiro;
  return pasoActual.value?.distancia || 0;
});

const textoSiguiente = computed(() => {
  if (esDestino.value) return pasoActual.value.texto;
  if (pasoProximo.value?.tipo === 'destino') {
    return `Continúa recto hacia ${pasoProximo.value.texto.replace('Has llegado a ', '')}`;
  }
  return pasoProximo.value?.texto || pasoActual.value?.texto;
});

const iconoDireccion = computed(() => {
  const tipo = esDestino.value ? 'destino' : pasoProximo.value?.tipo;
  const mapa = {
    recto: ArrowUp,
    derecha: CornerUpRight,
    izquierda: CornerUpLeft,
    vuelta: RotateCcw,
    destino: Flag
  };
  return mapa[tipo] || ArrowUp;
});

const minutosRestantes = computed(() =>
  Math.max(1, Math.round(props.distanciaRestante / 75))
);
</script>

<style scoped>
.banner-nav {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 92%;
  max-width: 440px;
  background: #0f172a;
  color: #ffffff;
  border-radius: 18px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.35);
  z-index: 25;
  overflow: hidden;
  transition: background 0.3s ease;
}

.banner-llegada {
  background: #065f46;
}

.banner-principal {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  gap: 14px;
}

.icono-giro {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: #10B981;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.texto-instruccion {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.distancia-paso {
  font-size: 13px;
  font-weight: 700;
  color: #34d399;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.titulo-paso {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.25;
  color: #f8fafc;
}

.btn-salir-nav {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-salir-nav:hover {
  background: rgba(255, 255, 255, 0.25);
}

.banner-pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.22);
  font-size: 12px;
  color: #cbd5e1;
}

.resumen-restante {
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-tiempo {
  color: #fbbf24;
  font-weight: 700;
}

.controles-pasos {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-paso-manual {
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: white;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-paso-manual:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.contador-pasos {
  font-weight: 600;
  min-width: 34px;
  text-align: center;
}
</style>