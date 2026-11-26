<template>
  <transition name="slide-up">
    <div
      v-if="lugar"
      class="tarjeta-container"
      :class="{ 'tarjeta-minimizada': minimizada }"
    >
      <!-- Insignia flotante superior de eventos activos/próximos -->
      <button
        v-if="eventos.length > 0"
        type="button"
        class="insignia-eventos"
        :title="
          eventos.length === 1
            ? '1 evento en este lugar (ver en panel)'
            : `${eventos.length} eventos en este lugar (ver en panel)`
        "
        @click="$emit('abrir-eventos')"
      >
        <span class="insignia-pulso"></span>
        <span class="insignia-texto">
          {{ eventos.length === 1 ? '!' : eventos.length }}
        </span>
      </button>

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
            <span v-else-if="eventoActual" class="compacta-meta compacta-evento">
              Evento: {{ eventoActual.titulo }}
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
            :class="{ 'btn-favorito-activo': esFavorito }"
            @click="alternarFavorito"
            :title="esFavorito ? 'Quitar de mis lugares' : 'Guardar en mis lugares'"
          >
            <Star :size="18" :fill="esFavorito ? 'currentColor' : 'none'" />
          </button>
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
              <span v-if="lugar.esPersonal" class="etiqueta-personal">
                Solo en tu dispositivo
              </span>
              <span v-if="ruta?.soloAccesible" class="etiqueta-accesible">
                <Accessibility :size="14" /> Sin escaleras
              </span>
            </div>
          </div>
        </div>

        <!-- Mini resumen compacto de evento(s) en este edificio/salón -->
        <div v-if="eventoActual" class="resumen-evento-box">
          <div class="evento-box-contenido">
            <div class="evento-box-cabecera">
              <span class="evento-pill">
                <Calendar :size="12" />
                <span>{{ esEnCurso(eventoActual) ? 'Evento en curso' : 'Próximo evento' }}</span>
              </span>

              <div v-if="eventos.length > 1" class="evento-paginador">
                <button
                  type="button"
                  class="btn-pag-evento"
                  aria-label="Evento anterior"
                  @click="anteriorEvento"
                >
                  <ChevronLeft :size="14" />
                </button>
                <span>{{ indiceEvento + 1 }}/{{ eventos.length }}</span>
                <button
                  type="button"
                  class="btn-pag-evento"
                  aria-label="Siguiente evento"
                  @click="siguienteEvento"
                >
                  <ChevronRight :size="14" />
                </button>
              </div>
            </div>

            <h4 class="evento-box-titulo">{{ eventoActual.titulo }}</h4>

            <p class="evento-box-meta">
              {{ formatearHorarioCorto(eventoActual.fecha_inicio, eventoActual.fecha_fin) }}
              <template v-if="detalleUbicacionEvento(eventoActual)">
                • {{ detalleUbicacionEvento(eventoActual) }}
              </template>
            </p>
          </div>

          <button
            v-if="eventoActual.imagen_webp"
            type="button"
            class="evento-miniatura-btn"
            title="Toca para ampliar cartel"
            @click="ampliarCartelEvento"
          >
            <img :src="eventoActual.imagen_webp" :alt="eventoActual.titulo" />
            <span class="icono-zoom-mini">
              <Maximize2 :size="11" />
            </span>
          </button>
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
  Star,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Maximize2,
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
import { esLugarFavorito, toggleLugarFavorito } from '../services/puntosPersonales.js';

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
  },
  eventos: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  'cerrar',
  'trazar-ruta',
  'iniciar-guia',
  'detener-guia',
  'ver-imagen',
  'abrir-eventos'
]);

const minimizada = ref(false);
const indiceEvento = ref(0);

const esFavorito = computed(() => esLugarFavorito(props.lugar));

const alternarFavorito = () => {
  toggleLugarFavorito(props.lugar);
};

watch(
  () => props.lugar?.id,
  () => {
    minimizada.value = false;
    indiceEvento.value = 0;
  }
);

watch(
  () => props.eventos.length,
  (len) => {
    if (indiceEvento.value >= len) {
      indiceEvento.value = 0;
    }
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

const eventoActual = computed(() => {
  if (!props.eventos || props.eventos.length === 0) return null;
  return props.eventos[indiceEvento.value] || props.eventos[0];
});

const siguienteEvento = () => {
  if (!props.eventos.length) return;
  indiceEvento.value = (indiceEvento.value + 1) % props.eventos.length;
};

const anteriorEvento = () => {
  if (!props.eventos.length) return;
  indiceEvento.value = (indiceEvento.value - 1 + props.eventos.length) % props.eventos.length;
};

const esEnCurso = (ev) => {
  const ahora = Date.now();
  return new Date(ev.fecha_inicio).getTime() <= ahora && new Date(ev.fecha_fin).getTime() >= ahora;
};

const detalleUbicacionEvento = (ev) => {
  const partes = [
    ev.salon_nombre ? `${ev.salon_nombre} (${ev.piso || 'PB'})` : '',
    ev.espacio_detalle || ''
  ].filter(Boolean);
  return partes.join(' • ');
};

const formatearHorarioCorto = (inicioIso, finIso) => {
  const ini = new Date(inicioIso);
  const fin = new Date(finIso);
  const mismoDia =
    ini.getFullYear() === fin.getFullYear() &&
    ini.getMonth() === fin.getMonth() &&
    ini.getDate() === fin.getDate();

  const fmtFecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
  const fmtHora = new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

  if (mismoDia) {
    return `${fmtFecha.format(ini)} • ${fmtHora.format(ini)} - ${fmtHora.format(fin)}`;
  }
  return `${fmtFecha.format(ini)} al ${fmtFecha.format(fin)}`;
};

const ampliarCartelEvento = () => {
  if (!eventoActual.value?.imagen_webp) return;
  emit('ver-imagen', {
    imagen: eventoActual.value.imagen_webp,
    titulo: eventoActual.value.titulo,
    subtitulo: `${props.lugar?.nombre || ''} • ${formatearHorarioCorto(eventoActual.value.fecha_inicio, eventoActual.value.fecha_fin)}`
  });
};

const iconosPorTipo = {
  'Edificio': Building2,
  'Aula': BookOpen,
  'Laboratorio': FlaskConical,
  'Departamento': Briefcase,
  'Oficina': Briefcase,
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

/* Insignia superior de notificación de eventos */
.insignia-eventos {
  position: absolute;
  top: -15px;
  left: 20px;
  min-width: 30px;
  height: 30px;
  padding: 0 9px;
  border-radius: 999px;
  border: 2.5px solid #ffffff;
  background: #f59e0b;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.45);
  cursor: pointer;
  z-index: 22;
}

.insignia-texto {
  position: relative;
  z-index: 2;
  line-height: 1;
}

.insignia-pulso {
  position: absolute;
  inset: -2px;
  border-radius: 999px;
  background: #f59e0b;
  opacity: 0.45;
  animation: pulso-evento 2.2s infinite ease-out;
}

@keyframes pulso-evento {
  0% {
    transform: scale(0.95);
    opacity: 0.55;
  }
  70% {
    transform: scale(1.38);
    opacity: 0;
  }
  100% {
    transform: scale(1.38);
    opacity: 0;
  }
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.compacta-evento {
  color: #b45309;
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
  transition: background 0.2s, color 0.2s;
}

.btn-icono-circular:hover {
  background: #e2e8f0;
}

.btn-favorito-activo {
  background: #fef3c7;
  color: #d97706;
}

.btn-favorito-activo:hover {
  background: #fde68a;
}

.tarjeta-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.icono-grande {
  margin-right: 14px;
  background: #eff6ff;
  color: #1E88E5;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 15px;
}

.info-principal {
  display: flex;
  flex-direction: column;
  padding-right: 112px;
}

.nombre {
  margin: 0 0 3px 0;
  font-size: 18px;
  color: #1e293b;
}

.descripcion {
  margin: 0 0 7px 0;
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
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.etiqueta-personal {
  background: #f3e8ff;
  color: #6b21a8;
  padding: 3px 10px;
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
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

/* Mini resumen de evento dentro de la tarjeta */
.resumen-evento-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 13px;
  padding: 9px 12px;
  margin-bottom: 12px;
}

.evento-box-contenido {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.evento-box-cabecera {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.evento-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #b45309;
}

.evento-paginador {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #92400e;
}

.btn-pag-evento {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid #fcd34d;
  background: #ffffff;
  color: #92400e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.evento-box-titulo {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.evento-box-meta {
  margin: 0;
  font-size: 11.5px;
  color: #78350f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.evento-miniatura-btn {
  position: relative;
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 10px;
  border: 1.5px solid #fcd34d;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  background: #ffffff;
}

.evento-miniatura-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.icono-zoom-mini {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 17px;
  height: 17px;
  border-radius: 5px;
  background: rgba(15, 23, 42, 0.72);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.resumen-ruta {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 10px 14px;
  margin-bottom: 12px;
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