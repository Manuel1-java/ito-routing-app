<template>
  <div v-if="abierto" class="modal-overlay" @click.self="cerrar">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-titulo">
          <Shield :size="20" class="icono-azul" />
          <div>
            <h3>Control de Acceso y Campus</h3>
            <span class="subtitulo-sync">
              Estado: {{ etiquetaSync }} (v{{ versionCampusLocal }})
            </span>
          </div>
        </div>
        <div class="header-acciones">
          <button
            class="btn-icono"
            title="Sincronizar ahora con el servidor"
            @click="forzarSync"
          >
            <RefreshCw :size="17" :class="{ girando: estadoSync === 'sincronizando' }" />
          </button>
          <button class="btn-icono" title="Cerrar" @click="cerrar">
            <X :size="18" />
          </button>
        </div>
      </div>

      <div v-if="mensajeFeedback" class="alerta" :class="tipoFeedback">
        {{ mensajeFeedback }}
      </div>

      <!-- VISTA SIN SESION: LOGIN Y REGISTRO -->
      <div v-if="!usuarioActual" class="seccion-auth">
        <div class="tabs-auth">
          <button
            :class="{ activo: modoAuth === 'login' }"
            @click="modoAuth = 'login'; limpiarFeedback()"
          >
            Iniciar Sesion
          </button>
          <button
            :class="{ activo: modoAuth === 'registro' }"
            @click="modoAuth = 'registro'; limpiarFeedback()"
          >
            Registro Estudiante
          </button>
        </div>

        <form @submit.prevent="enviarAuth" class="formulario">
          <div v-if="modoAuth === 'registro'" class="campo">
            <label>Nombre completo</label>
            <input
              v-model="formAuth.nombre"
              type="text"
              placeholder="Ej. Manuel Lopez"
              required
            />
          </div>

          <div class="campo">
            <label>Correo institucional</label>
            <input
              v-model="formAuth.correo"
              type="email"
              placeholder="usuario@itoaxaca.edu.mx"
              required
            />
          </div>

          <div class="campo">
            <label>Contrasena</label>
            <input
              v-model="formAuth.password"
              type="password"
              placeholder="Minimo 6 caracteres"
              required
            />
          </div>

          <button type="submit" class="btn-primario" :disabled="cargando">
            {{ cargando ? 'Procesando...' : modoAuth === 'login' ? 'Entrar' : 'Crear Cuenta' }}
          </button>
        </form>

        <div v-if="modoAuth === 'login'" class="accesos-rapidos">
          <span>Cuentas de prueba:</span>
          <div class="botones-demo">
            <button type="button" @click="rellenarDemo('admin@itoaxaca.edu.mx', 'admin123')">
              Admin
            </button>
            <button type="button" @click="rellenarDemo('moderador@itoaxaca.edu.mx', 'mod123')">
              Moderador
            </button>
            <button type="button" @click="rellenarDemo('20161247@itoaxaca.edu.mx', 'est123')">
              Estudiante
            </button>
          </div>
        </div>
      </div>

      <!-- VISTA AUTENTICADA -->
      <div v-else class="seccion-panel">
        <div class="perfil-bar">
          <div>
            <strong>{{ usuarioActual.nombre }}</strong>
            <span class="correo-txt">{{ usuarioActual.correo }}</span>
          </div>
          <div class="perfil-derecha">
            <span class="badge-rol" :class="usuarioActual.rol.toLowerCase()">
              {{ usuarioActual.rol }}
            </span>
            <button class="btn-salir" title="Cerrar sesion" @click="manejarLogout">
              <LogOut :size="16" />
            </button>
          </div>
        </div>

        <div class="tabs-panel">
          <button
            :class="{ activo: tabActiva === 'reportar' }"
            @click="tabActiva = 'reportar'; limpiarFeedback()"
          >
            Reportar Paso
          </button>
          <button
            v-if="esModeradorOAdmin"
            :class="{ activo: tabActiva === 'moderar' }"
            @click="tabActiva = 'moderar'; cargarReportes()"
          >
            Moderacion
          </button>
          <button
            v-if="esAdmin"
            :class="{ activo: tabActiva === 'admin' }"
            @click="tabActiva = 'admin'; limpiarFeedback()"
          >
            Administracion
          </button>
        </div>

        <!-- TAB 1: REPORTAR INCIDENCIA (ESTUDIANTE / MODERADOR / ADMIN) -->
        <form v-if="tabActiva === 'reportar'" @submit.prevent="enviarReporte" class="formulario">
          <p class="ayuda-txt">
            Reporta un andador cerrado por obras o mantenimiento para que un moderador actualice las rutas.
          </p>
          <div class="campo">
            <label>ID del tramo de andador</label>
            <input
              v-model.number="formReporte.tramo_id"
              type="number"
              min="1"
              placeholder="Ej. 56 o seleccionalo en el mapa"
              required
            />
          </div>

          <button
            type="button"
            class="btn-secundario"
            @click="$emit('activar-captura-tramo')"
          >
            <MapPin :size="15" />
            {{ esperandoTramoMapa ? 'Toca un pasillo en el mapa...' : 'Seleccionar tramo tocando el mapa' }}
          </button>

          <div class="campo">
            <label>Motivo del bloqueo</label>
            <textarea
              v-model="formReporte.motivo"
              rows="2"
              placeholder="Ej. Escalera cerrada por reparacion"
              required
            ></textarea>
          </div>
          <button type="submit" class="btn-primario" :disabled="cargando">
            Enviar Reporte
          </button>
        </form>

        <!-- TAB 2: MODERACION DE TRAMOS Y REPORTES (MODERADOR / ADMIN) -->
        <div v-if="tabActiva === 'moderar' && esModeradorOAdmin" class="bloque-scroll">
          <form @submit.prevent="cambiarEstadoTramo" class="formulario caja-borde">
            <strong>Habilitar o cerrar tramo de ruta</strong>
            <div class="fila-dos">
              <div class="campo">
                <label>ID Tramo</label>
                <input
                  v-model.number="formTramo.id"
                  type="number"
                  min="1"
                  placeholder="Ej. 10"
                  required
                />
              </div>
              <div class="campo">
                <label>Accion</label>
                <select v-model="formTramo.habilitado">
                  <option :value="false">Cerrar (Deshabilitar)</option>
                  <option :value="true">Abrir (Habilitar)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              class="btn-secundario"
              @click="$emit('activar-captura-tramo')"
            >
              <MapPin :size="15" />
              {{ esperandoTramoMapa ? 'Toca un pasillo en el mapa...' : 'Seleccionar tramo tocando el mapa' }}
            </button>

            <button type="submit" class="btn-primario" :disabled="cargando">
              Aplicar Cambio en Mapa
            </button>
          </form>

          <div class="lista-reportes">
            <strong>Reportes recientes ({{ reportes.length }})</strong>
            <div v-if="reportes.length === 0" class="vacio-txt">
              No hay reportes registrados.
            </div>
            <div v-for="rep in reportes" :key="rep.id" class="item-reporte">
              <div class="rep-top">
                <span>Tramo #{{ rep.tramo_id }}</span>
                <span class="rep-estado">{{ rep.estado }}</span>
              </div>
              <p>{{ rep.motivo }}</p>
              <small>Por: {{ rep.reportado_por }}</small>
            </div>
          </div>
        </div>

        <!-- TAB 3: ADMINISTRACION DE LUGARES Y EDIFICIOS (SOLO ADMIN) -->
        <div v-if="tabActiva === 'admin' && esAdmin" class="bloque-scroll">
          <form @submit.prevent="crearNuevoLugar" class="formulario caja-borde">
            <strong>Agregar nuevo salon o punto de interes</strong>
            <div class="fila-dos">
              <div class="campo">
                <label>ID unico</label>
                <input v-model="formLugar.id" type="text" placeholder="Ej. aula-sc2" required />
              </div>
              <div class="campo">
                <label>Tipo</label>
                <select v-model="formLugar.tipo">
                  <option value="Aula">Aula</option>
                  <option value="Laboratorio">Laboratorio</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Administrativo">Administrativo</option>
                  <option value="Servicio">Servicio</option>
                  <option value="Punto de Interés">Punto de Interes</option>
                </select>
              </div>
            </div>

            <div class="campo">
              <label>Nombre del lugar</label>
              <input v-model="formLugar.nombre" type="text" placeholder="Ej. Aula SC-2" required />
            </div>

            <div class="campo">
              <label>Descripcion</label>
              <input
                v-model="formLugar.descripcion"
                type="text"
                placeholder="Ej. Edificio I, Planta Alta"
              />
            </div>

            <div class="fila-dos">
              <div class="campo">
                <label>Longitud</label>
                <input
                  v-model.number="formLugar.longitud"
                  type="number"
                  step="any"
                  placeholder="-96.7447"
                  required
                />
              </div>
              <div class="campo">
                <label>Latitud</label>
                <input
                  v-model.number="formLugar.latitud"
                  type="number"
                  step="any"
                  placeholder="17.0761"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              class="btn-secundario"
              @click="$emit('activar-captura-mapa')"
            >
              <MapPin :size="15" />
              {{ esperandoClicMapa ? 'Toca un punto en el mapa...' : 'Capturar coordenadas tocando el mapa' }}
            </button>

            <button type="submit" class="btn-primario" :disabled="cargando">
              Guardar en Base de Datos
            </button>
          </form>

          <form @submit.prevent="eliminarEdificioPorId" class="formulario caja-borde">
            <strong>Eliminar edificio por ID</strong>
            <div class="fila-dos">
              <input
                v-model="idEdificioEliminar"
                type="text"
                placeholder="ID del edificio (ej. 99)"
                required
              />
              <button type="submit" class="btn-peligro" :disabled="cargando">
                <Trash2 :size="15" /> Eliminar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { Shield, RefreshCw, X, LogOut, MapPin, Trash2 } from 'lucide-vue-next';
import {
  usuarioActual,
  iniciarSesion,
  registrarCuenta,
  cerrarSesion,
  apiFetch
} from '../services/api.js';
import {
  versionCampusLocal,
  estadoSync,
  sincronizarConServidor
} from '../services/campusSync.js';

const props = defineProps({
  abierto: { type: Boolean, default: false },
  coordenadasCapturadas: { type: Array, default: null },
  esperandoClicMapa: { type: Boolean, default: false },
  tramoCapturado: { type: Object, default: null },
  esperandoTramoMapa: { type: Boolean, default: false }
});

const emit = defineEmits(['cerrar', 'activar-captura-mapa', 'activar-captura-tramo']);

const modoAuth = ref('login');
const tabActiva = ref('reportar');
const cargando = ref(false);
const mensajeFeedback = ref('');
const tipoFeedback = ref('exito');

const formAuth = ref({ nombre: '', correo: '', password: '' });
const formReporte = ref({ tramo_id: null, motivo: '' });
const formTramo = ref({ id: null, habilitado: false });
const reportes = ref([]);

const formLugar = ref({
  id: '',
  nombre: '',
  descripcion: '',
  tipo: 'Aula',
  longitud: null,
  latitud: null
});
const idEdificioEliminar = ref('');

const esModeradorOAdmin = computed(() =>
  ['MODERADOR', 'ADMIN'].includes(usuarioActual.value?.rol)
);
const esAdmin = computed(() => usuarioActual.value?.rol === 'ADMIN');

const etiquetaSync = computed(() => {
  if (estadoSync.value === 'actualizado') return 'Conectado';
  if (estadoSync.value === 'sincronizando') return 'Sincronizando';
  return 'Modo Offline';
});

watch(
  () => props.coordenadasCapturadas,
  (coords) => {
    if (coords && coords.length === 2) {
      formLugar.value.longitud = Number(coords[0].toFixed(7));
      formLugar.value.latitud = Number(coords[1].toFixed(7));
      mostrarFeedback('Coordenadas capturadas desde el mapa.', 'exito');
    }
  }
);

watch(
  () => props.tramoCapturado,
  (tramo) => {
    if (!tramo || !tramo.id) return;

    if (tabActiva.value === 'reportar') {
      formReporte.value.tramo_id = tramo.id;
      mostrarFeedback(`Tramo #${tramo.id} seleccionado desde el mapa.`, 'exito');
    } else if (tabActiva.value === 'moderar') {
      formTramo.value.id = tramo.id;
      formTramo.value.habilitado = !tramo.habilitado;
      const estadoTxt = tramo.habilitado ? 'abierto' : 'cerrado';
      mostrarFeedback(
        `Tramo #${tramo.id} seleccionado (actualmente ${estadoTxt}).`,
        'exito'
      );
    }
  }
);

const mostrarFeedback = (texto, tipo = 'exito') => {
  mensajeFeedback.value = texto;
  tipoFeedback.value = tipo;
};

const limpiarFeedback = () => {
  mensajeFeedback.value = '';
};

const cerrar = () => {
  limpiarFeedback();
  emit('cerrar');
};

const rellenarDemo = (correo, password) => {
  formAuth.value.correo = correo;
  formAuth.value.password = password;
};

const forzarSync = async () => {
  const res = await sincronizarConServidor(versionCampusLocal.value);
  if (res) {
    mostrarFeedback(`Datos actualizados a la version ${res.version}.`, 'exito');
  } else if (estadoSync.value === 'actualizado') {
    mostrarFeedback('El dispositivo ya tiene la version mas reciente.', 'exito');
  } else {
    mostrarFeedback('Sin conexion con el servidor. Usando cache local.', 'error');
  }
};

const enviarAuth = async () => {
  cargando.value = true;
  limpiarFeedback();
  try {
    if (modoAuth.value === 'login') {
      await iniciarSesion(formAuth.value.correo, formAuth.value.password);
    } else {
      await registrarCuenta(
        formAuth.value.nombre,
        formAuth.value.correo,
        formAuth.value.password
      );
    }
    tabActiva.value = 'reportar';
    formAuth.value = { nombre: '', correo: '', password: '' };
  } catch (err) {
    mostrarFeedback(err.message, 'error');
  } finally {
    cargando.value = false;
  }
};

const manejarLogout = () => {
  cerrarSesion();
  limpiarFeedback();
};

const enviarReporte = async () => {
  cargando.value = true;
  limpiarFeedback();
  try {
    const res = await apiFetch('/campus/reportes', {
      method: 'POST',
      body: JSON.stringify(formReporte.value)
    });
    mostrarFeedback(res.mensaje, 'exito');
    formReporte.value = { tramo_id: null, motivo: '' };
  } catch (err) {
    mostrarFeedback(err.message, 'error');
  } finally {
    cargando.value = false;
  }
};

const cargarReportes = async () => {
  limpiarFeedback();
  try {
    const res = await apiFetch('/campus/reportes');
    reportes.value = res.reportes || [];
  } catch (err) {
    mostrarFeedback(err.message, 'error');
  }
};

const cambiarEstadoTramo = async () => {
  cargando.value = true;
  limpiarFeedback();
  try {
    const res = await apiFetch(`/campus/rutas/${formTramo.value.id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ habilitado: formTramo.value.habilitado })
    });
    await sincronizarConServidor(versionCampusLocal.value);
    mostrarFeedback(res.mensaje, 'exito');
  } catch (err) {
    mostrarFeedback(err.message, 'error');
  } finally {
    cargando.value = false;
  }
};

const crearNuevoLugar = async () => {
  cargando.value = true;
  limpiarFeedback();
  try {
    const payload = {
      id: formLugar.value.id,
      nombre: formLugar.value.nombre,
      descripcion: formLugar.value.descripcion,
      tipo: formLugar.value.tipo,
      coordenadas: [formLugar.value.longitud, formLugar.value.latitud],
      palabras_clave: [formLugar.value.nombre.toLowerCase()]
    };
    const res = await apiFetch('/campus/lugares', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    await sincronizarConServidor(versionCampusLocal.value);
    mostrarFeedback(res.mensaje, 'exito');
    formLugar.value = {
      id: '',
      nombre: '',
      descripcion: '',
      tipo: 'Aula',
      longitud: null,
      latitud: null
    };
  } catch (err) {
    mostrarFeedback(err.message, 'error');
  } finally {
    cargando.value = false;
  }
};

const eliminarEdificioPorId = async () => {
  cargando.value = true;
  limpiarFeedback();
  try {
    const res = await apiFetch(`/campus/edificios/${idEdificioEliminar.value.trim()}`, {
      method: 'DELETE'
    });
    await sincronizarConServidor(versionCampusLocal.value);
    mostrarFeedback(res.mensaje, 'exito');
    idEdificioEliminar.value = '';
  } catch (err) {
    mostrarFeedback(err.message, 'error');
  } finally {
    cargando.value = false;
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  background: #ffffff;
  width: 100%;
  max-width: 430px;
  max-height: 85vh;
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 10px;
}

.header-titulo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-titulo h3 {
  margin: 0;
  font-size: 16px;
  color: #1e293b;
}

.subtitulo-sync {
  font-size: 12px;
  color: #64748b;
}

.icono-azul {
  color: #1e88e5;
}

.header-acciones {
  display: flex;
  gap: 6px;
}

.btn-icono {
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  padding: 7px;
  cursor: pointer;
  color: #334155;
  display: flex;
  align-items: center;
}

.girando {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% {
    transform: rotate(360deg);
  }
}

.alerta {
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
}

.alerta.exito {
  background: #dcfce7;
  color: #166534;
}

.alerta.error {
  background: #fee2e2;
  color: #991b1b;
}

.tabs-auth,
.tabs-panel {
  display: flex;
  gap: 6px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
}

.tabs-auth button,
.tabs-panel button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.tabs-auth button.activo,
.tabs-panel button.activo {
  background: #ffffff;
  color: #1e88e5;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.formulario {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.campo label {
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

input,
select,
textarea {
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 9px 11px;
  font-size: 13px;
  outline: none;
  font-family: inherit;
}

input:focus,
select:focus,
textarea:focus {
  border-color: #1e88e5;
}

.btn-primario {
  background: #1e88e5;
  color: #ffffff;
  border: none;
  border-radius: 12px;
  padding: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primario:disabled {
  opacity: 0.6;
}

.btn-secundario {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-peligro {
  background: #ef4444;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.accesos-rapidos {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #cbd5e1;
  font-size: 12px;
  color: #64748b;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.botones-demo {
  display: flex;
  gap: 6px;
}

.botones-demo button {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  cursor: pointer;
}

.perfil-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f8fafc;
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 10px;
}

.perfil-bar strong {
  display: block;
  font-size: 14px;
  color: #1e293b;
}

.correo-txt {
  font-size: 11px;
  color: #64748b;
}

.perfil-derecha {
  display: flex;
  align-items: center;
  gap: 8px;
}

.badge-rol {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 8px;
  background: #e2e8f0;
  color: #334155;
}

.badge-rol.admin {
  background: #fef3c7;
  color: #92400e;
}

.badge-rol.moderador {
  background: #dbeafe;
  color: #1e40af;
}

.badge-rol.estudiante {
  background: #dcfce7;
  color: #166534;
}

.btn-salir {
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
  display: flex;
}

.bloque-scroll {
  overflow-y: auto;
  max-height: 52vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 4px;
}

.caja-borde {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
}

.fila-dos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ayuda-txt {
  margin: 0;
  font-size: 12px;
  color: #64748b;
}

.lista-reportes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}

.item-reporte {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px 10px;
}

.rep-top {
  display: flex;
  justify-content: space-between;
  font-weight: 700;
  font-size: 12px;
  color: #1e293b;
}

.rep-estado {
  color: #d97706;
}

.item-reporte p {
  margin: 4px 0;
  font-size: 12px;
  color: #334155;
}

.item-reporte small {
  color: #64748b;
  font-size: 11px;
}

.vacio-txt {
  font-size: 12px;
  color: #94a3b8;
}
</style>