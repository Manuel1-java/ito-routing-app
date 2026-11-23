<template>
  <transition name="slide-up">
    <div
      v-if="lugar"
      class="tarjeta-container"
      :class="{ 'tarjeta-minimizada': minimizada }"
    >
      <!-- Vista compacta (minimizada) -->
      <div v-if="minimizada" class="barra-compacta">
        <div class="compacta-info" @click="minimizada = false">
          <div class="icono-mini">
            <component :is="iconoComponente" :size="20" />
          </div>
          <div class="compacta-textos">
            <span class="compacta-nombre">{{ lugar.nombre }}</span>
            <span v-if="ruta" class="compacta-meta">
              {{ ruta.tiempoMinutos }} min • {{ ruta.distancia }} m
              <template v-if="ruta.soloAccesible"> • Sin escaleras</template>
            </span>
            <span v-else class="compacta-meta">{{ lugar.tipo }}</span>
          </div>
        </div>

        <div class="compacta-acciones">
          <button
            v-if="!ruta"
            class="btn-mini-accion btn-azul"
            @click="$emit('trazar-ruta', lugar)"
          >
            <Navigation :size="15" />
            <span>Ruta</span>
          </button>

          <button
            v-else-if="!guiando"
            class="btn-mini-accion btn-verde"
            @click="$emit('iniciar-guia')"
          >
            <Play :size="15" />
            <span>Iniciar</span>
          </button>

          <button
            class="btn-icono-circular"
            @click="minimizada = false"
            title="Expandir tarjeta"
          >
            <ChevronUp :size="18" />
          </button>

          <button
            class="btn-icono-circular"
            @click="$emit('cerrar')"
            title="Cerrar"
          >
            <X :size="18" />
          </button>
        </div>
      </div>

      <!-- Vista expandida completa -->
      <div v-else>
        <div class="botones-superiores">
          <button
            class="btn-icono-circular"
            @click="minimizada = true"
            title="Minimizar tarjeta"
          >
            <ChevronDown :size="19" />
          </button>
          <button
            class="btn-icono-circular"
            @click="$emit('cerrar')"
            title="Cerrar"
          >
            <X :size="19" />
          </button>
        </div>
        
        <div class="tarjeta-header">
          <div class="icono-grande">
            <component :is="iconoComponente" :size="32" />
          </div>
          <div class="info-principal">
            <h2 class="nombre">{{ lugar.nombre }}</h2>
            <p class="descripcion">{{ lugar.descripcion }}</p>
            <div class="etiquetas-row">
              <span class="etiqueta-tipo">{{ lugar.tipo }}</span>
              <span v-if="ruta?.soloAccesible" class="etiqueta-accesible">
                <Accessibility :size="14" /> Sin escaleras
              </span>
            </div>
          </div>
        </div>

        <!-- Resumen de distancia y tiempo cuando ya se trazó la ruta -->
        <div v-if="ruta" class="resumen-ruta">
          <div class="origen-fila">
            <Flag class="icono-bandera" :size="15" />
            <span class="origen-titulo">Saliendo desde:</span>
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

        <!-- Botones de acción -->
        <div class="tarjeta-acciones">
          <button
            v-if="!ruta"
            class="btn-ruta btn-azul"
            @click="$emit('trazar-ruta', lugar)"
          >
            <Navigation :size="19" />
            <span>Cómo llegar</span>
          </button>

          <template v-else>
            <button
              v-if="!guiando"
              class="btn-ruta btn-verde"
              @click="$emit('iniciar-guia')"
            >
              <Play :size="19" />
              <span>Iniciar ruta</span>
            </button>

            <button
              v-else
              class="btn-ruta btn-rojo"
              @click="$emit('detener-guia')"
            >
              <Square :size="17" />
              <span>Finalizar guía</span>
            </button>

            <button
              class="btn-secundario"
              @click="$emit('trazar-ruta', lugar)"
              title="Recalcular ruta"
            >
              <RotateCw :size="19" />
            </button>
          </template>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import {
  X,
  ChevronDown,
  ChevronUp,
  Accessibility,
  Flag,
  Navigation,
  Play,
  Square,
  RotateCw,
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

const props = defineProps({
  lugar: {
    type: Object,
    default: null
  },
  ruta: {
    type: Object,
    default: null
  },
  guiando: {
    type: Boolean,
    default: false
  }
});

defineEmits(['cerrar', 'trazar-ruta', 'iniciar-guia', 'detener-guia']);

const minimizada = ref(false);

watch(
  () => props.lugar?.id,
  () => {
    minimizada.value = false;
  }
);

watch(
  () => props.guiando,
  (activo) => {
    if (activo) {
      minimizada.value = true;
    }
  }
);

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

const iconoComponente = computed(() => {
  if (!props.lugar) return MapPin;
  return iconosPorTipo[props.lugar.tipo] || MapPin;
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
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.16);
  padding: 20px 20px 24px;
  z-index: 20;
  box-sizing: border-box;
  transition: padding 0.25s ease, border-radius 0.25s ease;
}

.tarjeta-minimizada {
  padding: 12px 14px;
  border-radius: 18px 18px 0 0;
}

.barra-compacta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.compacta-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
  cursor: pointer;
}

.icono-mini {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: #eff6ff;
  color: #1E88E5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.compacta-textos {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.compacta-nombre {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compacta-meta {
  font-size: 12px;
  font-weight: 600;
  color: #FF6D00;
  margin-top: 1px;
}

.compacta-acciones {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.btn-mini-accion {
  border: none;
  color: white;
  padding: 8px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
}

.botones-superiores {
  position: absolute;
  top: 14px;
  right: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-icono-circular {
  background: #f1f5f9;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  transition: background 0.2s;
}

.btn-icono-circular:hover {
  background: #e2e8f0;
}

.tarjeta-header {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.icono-grande {
  margin-right: 14px;
  background: #eff6ff;
  color: #1E88E5;
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
}

.info-principal {
  display: flex;
  flex-direction: column;
  padding-right: 68px;
}

.nombre {
  margin: 0 0 4px 0;
  font-size: 18px;
  color: #1e293b;
}

.descripcion {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #64748b;
}

.etiquetas-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.etiqueta-tipo {
  background: #e0f2fe;
  color: #0369a1;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.etiqueta-accesible {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #d1fae5;
  color: #065f46;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.resumen-ruta {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 14px;
  margin-bottom: 14px;
}

.origen-fila {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #475569;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
}

.icono-bandera {
  color: #10B981;
  flex-shrink: 0;
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
  font-size: 17px;
  font-weight: bold;
  color: #FF6D00;
}

.metrica-sub {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.divisor {
  width: 1px;
  height: 28px;
  background: #cbd5e1;
}

.tarjeta-acciones {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-ruta {
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 25px;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
  transition: transform 0.2s, background 0.2s;
}

.btn-azul {
  background: #1E88E5;
  box-shadow: 0 4px 10px rgba(30, 136, 229, 0.3);
}

.btn-azul:hover {
  background: #1565C0;
}

.btn-verde {
  background: #059669;
  box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3);
}

.btn-verde:hover {
  background: #047857;
}

.btn-rojo {
  background: #dc2626;
  box-shadow: 0 4px 10px rgba(220, 38, 38, 0.28);
}

.btn-rojo:hover {
  background: #b91c1c;
}

.btn-secundario {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #1E88E5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
}

.btn-secundario:hover {
  background: #e2e8f0;
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