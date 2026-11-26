<template>
  <div class="menu-sistema" :style="{ '--drawer-width': 'min(280px, calc(100vw - 68px))' }">
    <Transition name="fade-backdrop">
      <div
        v-if="abierto"
        class="menu-backdrop"
        @click="$emit('cerrar')"
      ></div>
    </Transition>

    <button
      type="button"
      class="btn-menu-flotante"
      :class="{ abierto }"
      :aria-label="abierto ? 'Ocultar menú' : 'Abrir menú'"
      :aria-expanded="abierto"
      @click="$emit('toggle')"
    >
      <Transition name="icon-swap" mode="out-in">
        <ArrowLeft v-if="abierto" key="cerrar" :size="20" />
        <Menu v-else key="abrir" :size="20" />
      </Transition>
    </button>

    <aside
      class="menu-drawer"
      :class="{ abierto }"
      aria-label="Menú principal"
    >
      <div class="menu-header">
        <div class="menu-titulo-grupo">
          <span class="menu-subtitulo">Campus ITO</span>
          <h2 class="menu-titulo">Menú</h2>
        </div>

        <button
          type="button"
          class="btn-cerrar-movil"
          aria-label="Ocultar menú"
          @click="$emit('cerrar')"
        >
          <ArrowLeft :size="20" />
        </button>
      </div>

      <div class="menu-contenido">
        <div class="menu-vacio">
          <p>Espacio reservado para próximas funciones.</p>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { Menu, ArrowLeft } from 'lucide-vue-next';

defineProps({
  abierto: {
    type: Boolean,
    default: false
  }
});

defineEmits(['toggle', 'cerrar']);
</script>

<style scoped>
.menu-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 38;
}

.btn-menu-flotante {
  position: fixed;
  top: 16px;
  left: 16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: #ffffff;
  color: #1e293b;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.16);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 42;
  transform: translateX(0);
  transition:
    transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.btn-menu-flotante:hover {
  background: #f8fafc;
  color: #1e88e5;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
}

.btn-menu-flotante.abierto {
  transform: translateX(calc(var(--drawer-width) - 4px));
  background: #ffffff;
  color: #1e88e5;
}

.menu-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--drawer-width);
  background: #ffffff;
  box-shadow: 6px 0 24px rgba(15, 23, 42, 0.18);
  z-index: 40;
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.menu-drawer.abierto {
  transform: translateX(0);
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 18px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.menu-titulo-grupo {
  display: flex;
  flex-direction: column;
}

.menu-subtitulo {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #1e88e5;
}

.menu-titulo {
  margin: 2px 0 0;
  font-size: 19px;
  font-weight: 700;
  color: #0f172a;
}

.btn-cerrar-movil {
  display: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #1e88e5;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-cerrar-movil:hover {
  background: #e2e8f0;
}

.menu-contenido {
  flex: 1;
  padding: 18px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.menu-vacio {
  margin: auto 0;
  padding: 24px 16px;
  border: 1.5px dashed #cbd5e1;
  border-radius: 14px;
  text-align: center;
  color: #64748b;
  font-size: 13px;
}

.menu-vacio p {
  margin: 0;
}

.fade-backdrop-enter-active,
.fade-backdrop-leave-active {
  transition: opacity 0.25s ease;
}

.fade-backdrop-enter-from,
.fade-backdrop-leave-to {
  opacity: 0;
}

.icon-swap-enter-active,
.icon-swap-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}

.icon-swap-enter-from {
  opacity: 0;
  transform: scale(0.75);
}

.icon-swap-leave-to {
  opacity: 0;
  transform: scale(0.75);
}

@media (max-width: 640px) {
  .btn-menu-flotante {
    display: none;
  }

  .menu-drawer {
    width: min(285px, 82vw);
  }

  .btn-cerrar-movil {
    display: inline-flex;
  }
}
</style>