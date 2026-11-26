<template>
  <div class="menu-sistema" :style="{ '--drawer-width': 'min(345px, calc(100vw - 60px))' }">
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
      aria-label="Panel lateral del campus"
    >
      <!-- CABECERA Y PESTAÑAS COMPACTAS -->
      <div class="menu-header">
        <div class="header-superior">
          <div class="menu-titulo-grupo">
            <span class="menu-subtitulo">Campus ITO</span>
            <h2 class="menu-titulo">{{ tituloSeccion }}</h2>
          </div>

          <div class="menu-header-acciones">
            <button
              v-if="tabMenu === 'eventos' && usuarioActual"
              type="button"
              class="btn-nuevo-evento"
              :class="{ activo: mostrarFormularioEvento }"
              @click="toggleFormularioEvento"
            >
              <X v-if="mostrarFormularioEvento" :size="15" />
              <Plus v-else :size="15" />
              <span>{{ mostrarFormularioEvento ? 'Cerrar' : esStaff ? 'Crear' : 'Sugerir' }}</span>
            </button>

            <button
              v-if="tabMenu === 'lugares'"
              type="button"
              class="btn-nuevo-evento"
              :class="{ activo: mostrarFormularioPoi }"
              @click="toggleFormularioPoi"
            >
              <X v-if="mostrarFormularioPoi" :size="15" />
              <Plus v-else :size="15" />
              <span>{{ mostrarFormularioPoi ? 'Cerrar' : 'Nuevo punto' }}</span>
            </button>

            <button
              type="button"
              class="btn-cerrar-movil"
              aria-label="Ocultar menú"
              @click="$emit('cerrar')"
            >
              <ArrowLeft :size="20" />
            </button>
          </div>
        </div>

        <nav class="tabs-menu" aria-label="Secciones del menú">
          <button
            type="button"
            :class="{ activo: tabMenu === 'eventos' }"
            @click="tabMenu = 'eventos'; mensajeFeedback = ''"
          >
            <Calendar :size="14" />
            <span>Eventos</span>
            <span v-if="eventosDisponibles.length" class="pill-count">
              {{ eventosDisponibles.length }}
            </span>
          </button>

          <button
            type="button"
            :class="{ activo: tabMenu === 'lugares' }"
            @click="tabMenu = 'lugares'; mensajeFeedback = ''"
          >
            <Star :size="14" />
            <span>Lugares</span>
          </button>

          <button
            type="button"
            :class="{ activo: tabMenu === 'caminos' }"
            @click="tabMenu = 'caminos'; mensajeFeedback = ''"
          >
            <Route :size="14" />
            <span>Caminos</span>
            <span v-if="tramosCerrados.length" class="pill-count pill-alerta">
              {{ tramosCerrados.length }}
            </span>
          </button>
        </nav>
      </div>

      <div class="menu-contenido">
        <div v-if="mensajeFeedback" class="alerta-feedback" :class="tipoFeedback">
          <span>{{ mensajeFeedback }}</span>
          <button type="button" @click="mensajeFeedback = ''">
            <X :size="14" />
          </button>
        </div>

        <!-- =======================================================
             PESTAÑA 1: EVENTOS
             ======================================================= -->
        <template v-if="tabMenu === 'eventos'">
          <div v-if="!usuarioActual" class="banner-sesion">
            <span>¿Quieres anunciar o sugerir un evento?</span>
            <button type="button" class="btn-link-sesion" @click="abrirAcceso">
              Inicia sesión
            </button>
          </div>

          <form
            v-if="mostrarFormularioEvento && usuarioActual"
            class="form-evento"
            @submit.prevent="enviarFormularioEvento"
          >
            <div class="form-titulo-barra">
              <h3>{{ esStaff ? 'Publicar evento' : 'Sugerir evento' }}</h3>
              <span v-if="!esStaff" class="badge-revision">Requiere aprobación</span>
            </div>

            <div class="campo">
              <label>Nombre del evento *</label>
              <input
                v-model="form.titulo"
                type="text"
                maxlength="140"
                placeholder="Ej. Feria de Idiomas / Torneo Deportivo"
                required
              />
            </div>

            <div class="campo">
              <label>Duración *</label>
              <div class="segmento-duracion">
                <button
                  type="button"
                  :class="{ activo: !form.variosDias }"
                  @click="form.variosDias = false"
                >
                  Un solo día
                </button>
                <button
                  type="button"
                  :class="{ activo: form.variosDias }"
                  @click="form.variosDias = true"
                >
                  Varios días
                </button>
              </div>
            </div>

            <div v-if="!form.variosDias" class="grid-dos">
              <div class="campo span-2">
                <label>Fecha *</label>
                <input v-model="form.fechaInicio" type="date" :min="hoyISO" required />
              </div>
              <div class="campo">
                <label>Hora inicio *</label>
                <input v-model="form.horaInicio" type="time" required />
              </div>
              <div class="campo">
                <label>Hora fin *</label>
                <input v-model="form.horaFin" type="time" required />
              </div>
            </div>

            <div v-else class="grid-dos">
              <div class="campo">
                <label>Fecha inicio *</label>
                <input v-model="form.fechaInicio" type="date" :min="hoyISO" required />
              </div>
              <div class="campo">
                <label>Hora inicio *</label>
                <input v-model="form.horaInicio" type="time" required />
              </div>
              <div class="campo">
                <label>Fecha fin *</label>
                <input v-model="form.fechaFin" type="date" :min="form.fechaInicio || hoyISO" required />
              </div>
              <div class="campo">
                <label>Hora cierre *</label>
                <input v-model="form.horaFin" type="time" required />
              </div>
            </div>

            <div class="campo">
              <label>Edificio *</label>
              <select v-model="form.edificioId" required @change="form.salonId = ''">
                <option value="" disabled>Selecciona un edificio...</option>
                <option
                  v-for="edif in edificiosOrdenados"
                  :key="edif.id"
                  :value="edif.id"
                >
                  {{ edif.nombre }}
                </option>
              </select>
            </div>

            <div v-if="salonesDelEdificioSeleccionado.length > 0" class="campo">
              <label>Salón o espacio mapeado (opcional)</label>
              <select v-model="form.salonId">
                <option value="">Todo el edificio / Área general</option>
                <option
                  v-for="salon in salonesDelEdificioSeleccionado"
                  :key="salon.id"
                  :value="salon.id"
                >
                  {{ salon.nombre }} ({{ salon.piso || 'PB' }})
                </option>
              </select>
            </div>

            <div class="campo">
              <label>Ubicación específica (opcional)</label>
              <input
                v-model="form.espacioDetalle"
                type="text"
                maxlength="120"
                placeholder="Ej. Auditorio, Cancha principal, Sala 2..."
              />
            </div>

            <div class="campo">
              <label>Organizador (opcional)</label>
              <input
                v-model="form.organizador"
                type="text"
                maxlength="100"
                placeholder="Ej. Coordinación de Idiomas"
              />
            </div>

            <div class="campo">
              <label>Descripción corta (opcional)</label>
              <textarea
                v-model="form.descripcion"
                rows="2"
                maxlength="400"
                placeholder="Detalles breves o actividades..."
              ></textarea>
            </div>

            <div class="campo">
              <label>Cartel promocional (opcional)</label>
              <div v-if="!form.imagenWebp">
                <input
                  ref="inputImagenRef"
                  type="file"
                  accept="image/*"
                  class="input-file-oculto"
                  @change="procesarImagenSeleccionada"
                />
                <button
                  type="button"
                  class="btn-subir-foto"
                  :disabled="procesandoImagen"
                  @click="inputImagenRef?.click()"
                >
                  <ImageIcon :size="16" />
                  <span>{{ procesandoImagen ? 'Optimizando...' : 'Adjuntar imagen' }}</span>
                </button>
              </div>

              <div v-else class="preview-imagen-box">
                <img :src="form.imagenWebp" alt="Vista previa" class="preview-imagen" />
                <button
                  type="button"
                  class="btn-quitar-imagen"
                  @click="quitarImagen"
                >
                  <X :size="14" />
                </button>
              </div>
            </div>

            <button type="submit" class="btn-enviar-evento" :disabled="enviando">
              {{ enviando ? 'Guardando...' : esStaff ? 'Publicar evento' : 'Enviar sugerencia' }}
            </button>
          </form>

          <!-- Bandeja de pendientes (Admin / Moderador) -->
          <section v-if="esStaff && pendientes.length > 0" class="seccion-bloque">
            <h3 class="seccion-titulo titulo-pendientes">
              Propuestas pendientes ({{ pendientes.length }})
            </h3>

            <div class="lista-tarjetas">
              <article v-for="ev in pendientes" :key="ev.id" class="card-item card-pendiente">
                <div class="card-top">
                  <div class="card-info">
                    <span class="badge-estado badge-ambar">Por aprobar</span>
                    <h4 class="card-titulo">{{ ev.titulo }}</h4>
                    <p class="card-meta">
                      <Building2 :size="13" />
                      <span>{{ formatearUbicacion(ev) }}</span>
                    </p>
                    <p class="card-meta">
                      <Clock :size="13" />
                      <span>{{ formatearHorario(ev.fecha_inicio, ev.fecha_fin) }}</span>
                    </p>
                  </div>

                  <button
                    v-if="ev.imagen_webp"
                    type="button"
                    class="btn-miniatura"
                    @click="abrirVisor(ev)"
                  >
                    <img :src="ev.imagen_webp" :alt="ev.titulo" />
                  </button>
                </div>

                <div class="card-acciones-moderacion">
                  <button type="button" class="btn-aprobar" @click="moderarPropuesta(ev.id, 'aprobado')">
                    <Check :size="15" /> Aprobar
                  </button>
                  <button type="button" class="btn-rechazar" @click="moderarPropuesta(ev.id, 'rechazado')">
                    <X :size="15" /> Rechazar
                  </button>
                </div>
              </article>
            </div>
          </section>

          <!-- Eventos disponibles -->
          <section class="seccion-bloque">
            <h3 class="seccion-titulo">
              Eventos disponibles ({{ eventosDisponibles.length }})
            </h3>

            <div v-if="cargando" class="estado-vacio">Cargando eventos...</div>
            <div v-else-if="eventosDisponibles.length === 0" class="estado-vacio">
              No hay eventos programados por el momento.
            </div>

            <div v-else class="lista-tarjetas">
              <article v-for="ev in eventosDisponibles" :key="ev.id" class="card-item">
                <div class="card-top">
                  <div class="card-info">
                    <div class="badges-fila">
                      <span
                        class="badge-estado"
                        :class="estaEnCurso(ev) ? 'badge-verde' : 'badge-azul'"
                      >
                        {{ estaEnCurso(ev) ? 'En curso' : 'Próximo' }}
                      </span>
                      <span v-if="ev.pospuesto" class="badge-estado badge-ambar">
                        Reprogramado
                      </span>
                    </div>

                    <h4 class="card-titulo">{{ ev.titulo }}</h4>
                    <p class="card-meta">
                      <Building2 :size="13" />
                      <span>{{ formatearUbicacion(ev) }}</span>
                    </p>
                    <p class="card-meta">
                      <Clock :size="13" />
                      <span>{{ formatearHorario(ev.fecha_inicio, ev.fecha_fin) }}</span>
                    </p>
                    <p v-if="ev.organizador" class="card-organizador">
                      Organiza: {{ ev.organizador }}
                    </p>
                  </div>

                  <button
                    v-if="ev.imagen_webp"
                    type="button"
                    class="btn-miniatura"
                    @click="abrirVisor(ev)"
                  >
                    <img :src="ev.imagen_webp" :alt="ev.titulo" />
                  </button>
                </div>

                <p v-if="ev.descripcion" class="card-descripcion">{{ ev.descripcion }}</p>

                <div v-if="posponiendoId === ev.id" class="box-posponer">
                  <span class="posponer-label">Nueva fecha y horario:</span>
                  <div class="grid-dos">
                    <div class="campo">
                      <label>Inicio</label>
                      <input v-model="posponerForm.fechaInicio" type="date" :min="hoyISO" />
                    </div>
                    <div class="campo">
                      <label>Hora inicio</label>
                      <input v-model="posponerForm.horaInicio" type="time" />
                    </div>
                    <div class="campo">
                      <label>Fin</label>
                      <input v-model="posponerForm.fechaFin" type="date" :min="posponerForm.fechaInicio || hoyISO" />
                    </div>
                    <div class="campo">
                      <label>Hora fin</label>
                      <input v-model="posponerForm.horaFin" type="time" />
                    </div>
                  </div>
                  <div class="posponer-botones">
                    <button type="button" class="btn-guardar-posponer" @click="confirmarPosponer(ev.id)">
                      Guardar
                    </button>
                    <button type="button" class="btn-cancelar-posponer" @click="posponiendoId = null">
                      Cancelar
                    </button>
                  </div>
                </div>

                <div class="card-footer">
                  <button type="button" class="btn-ubicar" @click="$emit('ir-a-evento', ev)">
                    <Navigation :size="14" />
                    <span>Ubicar en mapa</span>
                  </button>

                  <div v-if="esStaff" class="acciones-staff">
                    <button type="button" class="btn-staff" title="Posponer" @click="abrirPosponer(ev)">
                      <CalendarClock :size="15" />
                    </button>
                    <button
                      type="button"
                      class="btn-staff btn-staff-peligro"
                      :class="{ confirmando: confirmandoBorrarId === ev.id }"
                      @click="manejarBorrarEvento(ev.id)"
                    >
                      <Trash2 :size="15" />
                      <span v-if="confirmandoBorrarId === ev.id" class="txt-confirmar">Borrar</span>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <!-- Eventos anteriores (24h) -->
          <section v-if="eventosAnteriores.length > 0" class="seccion-bloque seccion-anteriores">
            <div class="seccion-header-colapsable">
              <button
                type="button"
                class="btn-toggle-anteriores"
                @click="mostrarAnteriores = !mostrarAnteriores"
              >
                <span>Eventos anteriores ({{ eventosAnteriores.length }})</span>
                <ChevronUp v-if="mostrarAnteriores" :size="16" />
                <ChevronDown v-else :size="16" />
              </button>

              <button
                v-if="esStaff && mostrarAnteriores"
                type="button"
                class="btn-vaciar-historial"
                :class="{ confirmando: confirmandoVaciar }"
                @click="manejarVaciarAnteriores"
              >
                <Trash2 :size="13" />
                <span>{{ confirmandoVaciar ? '¿Confirmar?' : 'Vaciar' }}</span>
              </button>
            </div>

            <div v-if="mostrarAnteriores" class="lista-tarjetas">
              <article v-for="ev in eventosAnteriores" :key="ev.id" class="card-item card-anterior">
                <div class="card-top">
                  <div class="card-info">
                    <span class="badge-estado badge-gris">Finalizado (24h)</span>
                    <h4 class="card-titulo">{{ ev.titulo }}</h4>
                    <p class="card-meta">
                      <Building2 :size="13" />
                      <span>{{ formatearUbicacion(ev) }}</span>
                    </p>
                  </div>
                </div>

                <div v-if="esStaff" class="card-footer card-footer-solo-borrar">
                  <button
                    type="button"
                    class="btn-staff btn-staff-peligro"
                    :class="{ confirmando: confirmandoBorrarId === ev.id }"
                    @click="manejarBorrarEvento(ev.id)"
                  >
                    <Trash2 :size="14" />
                    <span class="txt-confirmar">
                      {{ confirmandoBorrarId === ev.id ? '¿Eliminar?' : 'Borrar' }}
                    </span>
                  </button>
                </div>
              </article>
            </div>
          </section>
        </template>

        <!-- =======================================================
             PESTAÑA 2: PUNTOS DE INTERÉS Y FAVORITOS
             ======================================================= -->
        <template v-else-if="tabMenu === 'lugares'">
          <form
            v-if="mostrarFormularioPoi"
            class="form-evento"
            @submit.prevent="guardarNuevoPuntoInteres"
          >
            <div class="form-titulo-barra">
              <h3>Agregar punto de interés</h3>
            </div>

            <div class="campo">
              <label>Nombre del punto *</label>
              <input
                v-model="formPoi.nombre"
                type="text"
                maxlength="120"
                placeholder="Ej. Bancas sombra, Copias, Cafetería..."
                required
              />
            </div>

            <div class="campo">
              <label>Nota corta (opcional)</label>
              <input
                v-model="formPoi.descripcion"
                type="text"
                maxlength="220"
                placeholder="Ej. Frente al edificio de sistemas"
              />
            </div>

            <div class="campo">
              <label>Ubicación en el mapa *</label>
              <button
                type="button"
                class="btn-captura-poi"
                @click="$emit('activar-captura-poi')"
              >
                <MapPin :size="15" />
                <span>
                  {{
                    formPoi.coordenadas
                      ? `Punto capturado (${formPoi.coordenadas[1].toFixed(5)}, ${formPoi.coordenadas[0].toFixed(5)})`
                      : 'Tocar punto en el mapa'
                  }}
                </span>
              </button>
            </div>

            <div class="campo">
              <label>¿Dónde guardarlo? *</label>
              <div class="segmento-duracion">
                <button
                  type="button"
                  :class="{ activo: formPoi.alcance === 'personal' }"
                  @click="formPoi.alcance = 'personal'"
                >
                  Solo para mí (Offline)
                </button>
                <button
                  type="button"
                  :class="{ activo: formPoi.alcance === 'campus' }"
                  @click="formPoi.alcance = 'campus'"
                >
                  {{ esStaff ? 'Publicar en campus' : 'Sugerir al campus' }}
                </button>
              </div>
            </div>

            <p v-if="formPoi.alcance === 'campus' && !usuarioActual" class="ayuda-mini">
              Necesitas iniciar sesión para enviar sugerencias visibles para todos.
            </p>

            <button
              type="submit"
              class="btn-enviar-evento"
              :disabled="enviandoPoi || !formPoi.coordenadas"
            >
              {{
                enviandoPoi
                  ? 'Guardando...'
                  : formPoi.alcance === 'personal'
                    ? 'Guardar en mi dispositivo'
                    : esStaff
                      ? 'Publicar para todos'
                      : 'Enviar sugerencia'
              }}
            </button>
          </form>

          <!-- Mis puntos personales y favoritos -->
          <section class="seccion-bloque">
            <h3 class="seccion-titulo">
              Mis lugares y favoritos ({{ misLugaresTotal.length }})
            </h3>

            <div v-if="misLugaresTotal.length === 0" class="estado-vacio">
              Guarda puntos personales con <strong>+ Nuevo punto</strong> o toca la estrella en cualquier edificio.
            </div>

            <div v-else class="lista-tarjetas">
              <article v-for="item in misLugaresTotal" :key="item.id" class="card-item">
                <div class="card-top">
                  <div class="card-info">
                    <span
                      class="badge-estado"
                      :class="item.esPersonal ? 'badge-morado' : 'badge-ambar'"
                    >
                      {{ item.esPersonal ? 'Personal (Offline)' : 'Favorito' }}
                    </span>
                    <h4 class="card-titulo">{{ item.nombre }}</h4>
                    <p v-if="item.descripcion" class="card-descripcion">{{ item.descripcion }}</p>
                  </div>
                </div>

                <div class="card-footer">
                  <button
                    type="button"
                    class="btn-ubicar"
                    @click="$emit('seleccionar-lugar-menu', item)"
                  >
                    <Navigation :size="14" />
                    <span>Ir al lugar</span>
                  </button>

                  <button
                    type="button"
                    class="btn-staff btn-staff-peligro"
                    title="Quitar de mi lista"
                    @click="quitarDeMisLugares(item)"
                  >
                    <Trash2 :size="14" />
                  </button>
                </div>
              </article>
            </div>
          </section>

          <!-- Puntos de interés del campus (aprobados para todos) -->
          <section class="seccion-bloque">
            <h3 class="seccion-titulo">
              Puntos de interés del campus ({{ puntosComunitarios.length }})
            </h3>

            <div v-if="puntosComunitarios.length === 0" class="estado-vacio">
              Aún no hay puntos comunitarios registrados.
            </div>

            <div v-else class="lista-tarjetas">
              <article v-for="poi in puntosComunitarios" :key="poi.id" class="card-item">
                <div class="card-top">
                  <div class="card-info">
                    <span class="badge-estado badge-azul">Campus</span>
                    <h4 class="card-titulo">{{ poi.nombre }}</h4>
                    <p v-if="poi.descripcion" class="card-descripcion">{{ poi.descripcion }}</p>
                  </div>
                </div>

                <div class="card-footer">
                  <button
                    type="button"
                    class="btn-ubicar"
                    @click="$emit('seleccionar-lugar-menu', poi)"
                  >
                    <Navigation :size="14" />
                    <span>Ubicar en mapa</span>
                  </button>
                </div>
              </article>
            </div>
          </section>
        </template>

        <!-- =======================================================
             PESTAÑA 3: CAMINOS Y CIERRES DE PASO
             ======================================================= -->
        <template v-else-if="tabMenu === 'caminos'">
          <div class="tarjeta-switch-caminos">
            <div class="switch-info">
              <strong>Mostrar caminos en el mapa</strong>
              <span>Visualiza los andadores peatonales y su estado actual.</span>
            </div>
            <label class="switch-control">
              <input
                type="checkbox"
                :checked="mostrarCaminos"
                @change="$emit('toggle-mostrar-caminos', $event.target.checked)"
              />
              <span class="switch-slider"></span>
            </label>
          </div>

          <div v-if="mostrarCaminos" class="leyenda-caminos">
            <span class="leyenda-item">
              <i class="punto-leyenda verde"></i> Paso abierto
            </span>
            <span class="leyenda-item">
              <i class="punto-leyenda rojo"></i> Paso cerrado
            </span>
          </div>

          <section class="seccion-bloque">
            <div class="seccion-header">
              <h3 class="seccion-titulo">
                Cierres activos ({{ tramosCerrados.length }})
              </h3>
              <button
                type="button"
                class="btn-reportar-rapido"
                @click="abrirReportePaso"
              >
                Reportar cierre
              </button>
            </div>

            <div v-if="tramosCerrados.length === 0" class="estado-vacio">
              Todos los andadores del campus están abiertos actualmente.
            </div>

            <div v-else class="lista-tarjetas">
              <article v-for="tr in tramosCerrados" :key="tr.id" class="card-item card-cerrado">
                <div class="card-info">
                  <span class="badge-estado badge-rojo">Paso cerrado</span>
                  <h4 class="card-titulo">{{ tr.titulo }}</h4>
                </div>

                <div v-if="tr.coordsCentro" class="card-footer">
                  <button
                    type="button"
                    class="btn-ubicar"
                    @click="$emit('enfocar-tramo', tr)"
                  >
                    <Navigation :size="14" />
                    <span>Ver tramo en mapa</span>
                  </button>
                </div>
              </article>
            </div>
          </section>
        </template>
      </div>

      <!-- PIE DISCRETO DE SINCRONIZACIÓN Y SESIÓN -->
      <div class="menu-footer">
        <div class="footer-sync">
          <span class="dot-sync" :class="estadoSync"></span>
          <span>Mapa v{{ versionCampusLocal }}</span>
        </div>

        <button type="button" class="btn-footer-sesion" @click="abrirAcceso">
          {{ usuarioActual ? `${usuarioActual.nombre.split(' ')[0]} (${usuarioActual.rol})` : 'Iniciar sesión' }}
        </button>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import {
  Menu,
  ArrowLeft,
  Plus,
  X,
  Building2,
  Clock,
  Navigation,
  CalendarClock,
  Trash2,
  Check,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Calendar,
  Star,
  Route,
  MapPin
} from 'lucide-vue-next';
import {
  usuarioActual,
  comprimirImagenAWebP,
  crearEvento,
  resolverEventoPendiente,
  posponerEvento,
  eliminarEvento,
  limpiarEventosAnteriores,
  crearSugerenciaLugar
} from '../services/api.js';
import {
  puntosPersonales,
  lugaresFavoritos,
  agregarPuntoPersonal,
  eliminarPuntoPersonal,
  quitarLugarFavorito
} from '../services/puntosPersonales.js';
import {
  versionCampusLocal,
  estadoSync,
  sincronizarConServidor
} from '../services/campusSync.js';

const props = defineProps({
  abierto: { type: Boolean, default: false },
  eventosDisponibles: { type: Array, default: () => [] },
  eventosAnteriores: { type: Array, default: () => [] },
  pendientes: { type: Array, default: () => [] },
  cargando: { type: Boolean, default: false },
  edificios: { type: Array, default: () => [] },
  salones: { type: Array, default: () => [] },
  lugaresCatalogo: { type: Array, default: () => [] },
  tramosDescriptivos: { type: Array, default: () => [] },
  mostrarCaminos: { type: Boolean, default: false },
  coordenadasPoiCapturadas: { type: Array, default: null }
});

const emit = defineEmits([
  'toggle',
  'cerrar',
  'recargar-eventos',
  'ir-a-evento',
  'ver-imagen',
  'abrir-panel-roles',
  'seleccionar-lugar-menu',
  'toggle-mostrar-caminos',
  'enfocar-tramo',
  'activar-captura-poi'
]);

const tabMenu = ref('eventos');
const mostrarFormularioEvento = ref(false);
const mostrarFormularioPoi = ref(false);
const mostrarAnteriores = ref(false);
const enviando = ref(false);
const enviandoPoi = ref(false);
const procesandoImagen = ref(false);
const mensajeFeedback = ref('');
const tipoFeedback = ref('exito');
const inputImagenRef = ref(null);

const posponiendoId = ref(null);
const posponerForm = reactive({
  fechaInicio: '',
  horaInicio: '',
  fechaFin: '',
  horaFin: ''
});

const confirmandoBorrarId = ref(null);
const confirmandoVaciar = ref(false);
let timerConfirmacion = null;

const esStaff = computed(() => {
  const rol = usuarioActual.value?.rol;
  return rol === 'ADMIN' || rol === 'MODERADOR';
});

const tituloSeccion = computed(() => {
  if (tabMenu.value === 'lugares') return 'Puntos y Favoritos';
  if (tabMenu.value === 'caminos') return 'Caminos y Cierres';
  return 'Eventos';
});

const hoyISO = computed(() => {
  const ahora = new Date();
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, '0');
  const d = String(ahora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
});

const form = reactive({
  titulo: '',
  variosDias: false,
  fechaInicio: '',
  horaInicio: '10:00',
  fechaFin: '',
  horaFin: '12:00',
  edificioId: '',
  salonId: '',
  espacioDetalle: '',
  organizador: '',
  descripcion: '',
  imagenWebp: ''
});

const formPoi = reactive({
  nombre: '',
  descripcion: '',
  coordenadas: null,
  alcance: 'personal'
});

watch(
  () => props.coordenadasPoiCapturadas,
  (coords) => {
    if (coords && coords.length === 2) {
      tabMenu.value = 'lugares';
      mostrarFormularioPoi.value = true;
      formPoi.coordenadas = coords;
      notificar('Ubicación capturada desde el mapa.', 'exito');
    }
  }
);

const misLugaresTotal = computed(() => [
  ...puntosPersonales.value,
  ...lugaresFavoritos.value
]);

const puntosComunitarios = computed(() =>
  (props.lugaresCatalogo || []).filter((l) => l.tipo === 'Punto de Interés')
);

const tramosCerrados = computed(() =>
  (props.tramosDescriptivos || []).filter((t) => !t.habilitado)
);

const edificiosOrdenados = computed(() => {
  return (props.edificios || [])
    .map((f) => ({
      id: String(f.properties?.id || '').trim(),
      nombre: String(f.properties?.nombre || '').trim()
    }))
    .filter((e) => e.id && e.nombre)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
});

const mapaNombresEdificios = computed(() => {
  const mapa = {};
  for (const e of edificiosOrdenados.value) {
    mapa[e.id] = e.nombre;
  }
  return mapa;
});

const salonesDelEdificioSeleccionado = computed(() => {
  if (!form.edificioId) return [];
  return (props.salones || [])
    .filter((s) => String(s.edificio_id || '') === String(form.edificioId))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
});

const notificar = (texto, tipo = 'exito') => {
  mensajeFeedback.value = texto;
  tipoFeedback.value = tipo;
};

const toggleFormularioEvento = () => {
  mostrarFormularioEvento.value = !mostrarFormularioEvento.value;
  if (mostrarFormularioEvento.value && !form.fechaInicio) {
    form.fechaInicio = hoyISO.value;
    form.fechaFin = hoyISO.value;
  }
};

const toggleFormularioPoi = () => {
  mostrarFormularioPoi.value = !mostrarFormularioPoi.value;
  if (!mostrarFormularioPoi.value) {
    formPoi.nombre = '';
    formPoi.descripcion = '';
    formPoi.coordenadas = null;
  }
};

const abrirAcceso = () => {
  emit('cerrar');
  emit('abrir-panel-roles');
};

const abrirReportePaso = () => {
  emit('cerrar');
  emit('abrir-panel-roles');
};

const guardarNuevoPuntoInteres = async () => {
  if (enviandoPoi.value || !formPoi.coordenadas) return;

  if (formPoi.alcance === 'personal') {
    const creado = agregarPuntoPersonal({
      nombre: formPoi.nombre,
      descripcion: formPoi.descripcion,
      coordenadas: formPoi.coordenadas
    });
    toggleFormularioPoi();
    notificar('Punto guardado solo en tu dispositivo.', 'exito');
    emit('seleccionar-lugar-menu', creado);
    return;
  }

  if (!usuarioActual.value) {
    abrirAcceso();
    return;
  }

  enviandoPoi.value = true;
  try {
    const res = await crearSugerenciaLugar({
      nombre: formPoi.nombre,
      descripcion: formPoi.descripcion,
      coordenadas: formPoi.coordenadas
    });
    if (res.aprobado_directo) {
      await sincronizarConServidor(versionCampusLocal.value);
    }
    toggleFormularioPoi();
    notificar(res.mensaje || 'Sugerencia enviada.', 'exito');
  } catch (err) {
    notificar(err.message || 'No se pudo enviar el punto.', 'error');
  } finally {
    enviandoPoi.value = false;
  }
};

const quitarDeMisLugares = (item) => {
  if (item.esPersonal) {
    eliminarPuntoPersonal(item.id);
  } else {
    quitarLugarFavorito(item.id);
  }
};

const procesarImagenSeleccionada = async (e) => {
  const archivo = e.target.files?.[0];
  if (!archivo) return;

  procesandoImagen.value = true;
  try {
    form.imagenWebp = await comprimirImagenAWebP(archivo, 960, 0.78);
  } catch (err) {
    notificar(err.message || 'No se pudo cargar la imagen.', 'error');
  } finally {
    procesandoImagen.value = false;
    if (inputImagenRef.value) inputImagenRef.value.value = '';
  }
};

const quitarImagen = () => {
  form.imagenWebp = '';
  if (inputImagenRef.value) inputImagenRef.value.value = '';
};

const enviarFormularioEvento = async () => {
  if (enviando.value) return;

  const fechaFinReal = form.variosDias ? form.fechaFin : form.fechaInicio;
  const inicioIso = new Date(`${form.fechaInicio}T${form.horaInicio}:00`).toISOString();
  const finIso = new Date(`${fechaFinReal}T${form.horaFin}:00`).toISOString();

  const salonObj = salonesDelEdificioSeleccionado.value.find(
    (s) => String(s.id) === String(form.salonId)
  );

  enviando.value = true;
  try {
    const res = await crearEvento({
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      organizador: form.organizador || null,
      edificio_id: form.edificioId,
      salon_id: salonObj ? salonObj.id : null,
      salon_nombre: salonObj ? salonObj.nombre : null,
      piso: salonObj ? salonObj.piso : 'PB',
      espacio_detalle: form.espacioDetalle || null,
      fecha_inicio: inicioIso,
      fecha_fin: finIso,
      imagen_webp: form.imagenWebp || null
    });

    form.titulo = '';
    form.variosDias = false;
    form.edificioId = '';
    form.salonId = '';
    form.espacioDetalle = '';
    form.organizador = '';
    form.descripcion = '';
    form.imagenWebp = '';
    mostrarFormularioEvento.value = false;
    notificar(res.mensaje || 'Evento registrado.', 'exito');
    emit('recargar-eventos');
  } catch (err) {
    notificar(err.message || 'Error al guardar el evento.', 'error');
  } finally {
    enviando.value = false;
  }
};

const moderarPropuesta = async (id, estado) => {
  try {
    const res = await resolverEventoPendiente(id, estado);
    notificar(res.mensaje || 'Propuesta actualizada.', 'exito');
    emit('recargar-eventos');
  } catch (err) {
    notificar(err.message || 'No se pudo moderar.', 'error');
  }
};

const aInputsLocales = (isoString) => {
  const d = new Date(isoString);
  const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { fecha, hora };
};

const abrirPosponer = (ev) => {
  if (posponiendoId.value === ev.id) {
    posponiendoId.value = null;
    return;
  }
  const ini = aInputsLocales(ev.fecha_inicio);
  const fin = aInputsLocales(ev.fecha_fin);
  posponiendoId.value = ev.id;
  posponerForm.fechaInicio = ini.fecha;
  posponerForm.horaInicio = ini.hora;
  posponerForm.fechaFin = fin.fecha;
  posponerForm.horaFin = fin.hora;
};

const confirmarPosponer = async (id) => {
  try {
    const inicioIso = new Date(`${posponerForm.fechaInicio}T${posponerForm.horaInicio}:00`).toISOString();
    const finIso = new Date(`${posponerForm.fechaFin}T${posponerForm.horaFin}:00`).toISOString();
    const res = await posponerEvento(id, inicioIso, finIso);
    posponiendoId.value = null;
    notificar(res.mensaje || 'Evento pospuesto.', 'exito');
    emit('recargar-eventos');
  } catch (err) {
    notificar(err.message || 'No se pudo posponer.', 'error');
  }
};

const manejarBorrarEvento = async (id) => {
  if (confirmandoBorrarId.value !== id) {
    confirmandoBorrarId.value = id;
    clearTimeout(timerConfirmacion);
    timerConfirmacion = setTimeout(() => {
      confirmandoBorrarId.value = null;
    }, 3500);
    return;
  }

  confirmandoBorrarId.value = null;
  try {
    await eliminarEvento(id);
    notificar('Evento eliminado.', 'exito');
    emit('recargar-eventos');
  } catch (err) {
    notificar(err.message || 'No se pudo eliminar.', 'error');
  }
};

const manejarVaciarAnteriores = async () => {
  if (!confirmandoVaciar.value) {
    confirmandoVaciar.value = true;
    clearTimeout(timerConfirmacion);
    timerConfirmacion = setTimeout(() => {
      confirmandoVaciar.value = false;
    }, 3500);
    return;
  }

  confirmandoVaciar.value = false;
  try {
    const res = await limpiarEventosAnteriores();
    notificar(res.mensaje || 'Historial limpiado.', 'exito');
    emit('recargar-eventos');
  } catch (err) {
    notificar(err.message || 'No se pudo vaciar el historial.', 'error');
  }
};

const estaEnCurso = (ev) => {
  const ahora = Date.now();
  return new Date(ev.fecha_inicio).getTime() <= ahora && new Date(ev.fecha_fin).getTime() >= ahora;
};

const formatearUbicacion = (ev) => {
  const nombreEdif = mapaNombresEdificios.value[String(ev.edificio_id)] || `Edificio ${ev.edificio_id}`;
  const extras = [
    ev.salon_nombre ? `${ev.salon_nombre} (${ev.piso || 'PB'})` : '',
    ev.espacio_detalle || ''
  ].filter(Boolean);
  return extras.length ? `${nombreEdif} • ${extras.join(' - ')}` : nombreEdif;
};

const formatearHorario = (inicioIso, finIso) => {
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
  return `${fmtFecha.format(ini)} (${fmtHora.format(ini)}) - ${fmtFecha.format(fin)} (${fmtHora.format(fin)})`;
};

const abrirVisor = (ev) => {
  emit('ver-imagen', {
    imagen: ev.imagen_webp,
    titulo: ev.titulo,
    subtitulo: `${formatearUbicacion(ev)} • ${formatearHorario(ev.fecha_inicio, ev.fecha_fin)}`
  });
};
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
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.2s ease, color 0.2s ease;
}

.btn-menu-flotante:hover {
  background: #f8fafc;
  color: #1e88e5;
}

.btn-menu-flotante.abierto {
  transform: translateX(calc(var(--drawer-width) - 4px));
  color: #1e88e5;
}

.menu-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--drawer-width);
  background: #f8fafc;
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
  flex-direction: column;
  gap: 12px;
  padding: 16px 14px 12px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.header-superior {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.menu-titulo-grupo {
  display: flex;
  flex-direction: column;
}

.menu-subtitulo {
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: #1e88e5;
}

.menu-titulo {
  margin: 1px 0 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.menu-header-acciones {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-nuevo-evento {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: #1e88e5;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  padding: 7px 11px;
  border-radius: 18px;
  cursor: pointer;
}

.btn-nuevo-evento.activo {
  background: #475569;
}

.btn-cerrar-movil {
  display: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  color: #1e88e5;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tabs-menu {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
}

.tabs-menu button {
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 11.5px;
  font-weight: 700;
  padding: 7px 4px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
}

.tabs-menu button.activo {
  background: #ffffff;
  color: #1e88e5;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

.pill-count {
  font-size: 10px;
  background: #e0f2fe;
  color: #0369a1;
  padding: 1px 5px;
  border-radius: 999px;
}

.pill-alerta {
  background: #fee2e2;
  color: #b91c1c;
}

.menu-contenido {
  flex: 1;
  padding: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.banner-sesion {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 12px;
  padding: 9px 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #1e3a8a;
}

.btn-link-sesion {
  border: none;
  background: #1e88e5;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 10px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
}

.alerta-feedback {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.alerta-feedback.exito {
  background: #dcfce7;
  color: #166534;
}

.alerta-feedback.error {
  background: #fee2e2;
  color: #991b1b;
}

.alerta-feedback button {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
}

.form-evento {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 13px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-titulo-barra {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-titulo-barra h3 {
  margin: 0;
  font-size: 14px;
  color: #0f172a;
}

.badge-revision {
  font-size: 10px;
  font-weight: 700;
  background: #fef3c7;
  color: #92400e;
  padding: 3px 8px;
  border-radius: 10px;
}

.campo {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.campo label {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
}

.campo input,
.campo select,
.campo textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  padding: 8px 10px;
  font-size: 13px;
  color: #0f172a;
  background: #ffffff;
  font-family: inherit;
}

.segmento-duracion {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.segmento-duracion button {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #475569;
  font-size: 11.5px;
  font-weight: 600;
  padding: 7px 4px;
  border-radius: 9px;
  cursor: pointer;
}

.segmento-duracion button.activo {
  background: #eff6ff;
  border-color: #1e88e5;
  color: #1d4ed8;
}

.btn-captura-poi {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  padding: 9px;
  border-radius: 10px;
  cursor: pointer;
}

.ayuda-mini {
  margin: 0;
  font-size: 11px;
  color: #b45309;
}

.grid-dos {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.span-2 {
  grid-column: span 2;
}

.input-file-oculto {
  display: none;
}

.btn-subir-foto {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1.5px dashed #94a3b8;
  background: #f8fafc;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  padding: 9px;
  border-radius: 10px;
  cursor: pointer;
}

.preview-imagen-box {
  position: relative;
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #cbd5e1;
}

.preview-imagen {
  width: 100%;
  max-height: 130px;
  object-fit: cover;
  display: block;
}

.btn-quitar-imagen {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(15, 23, 42, 0.75);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-enviar-evento {
  border: none;
  background: #1e88e5;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  padding: 10px;
  border-radius: 12px;
  cursor: pointer;
}

.btn-enviar-evento:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.seccion-bloque {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.seccion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.seccion-titulo {
  margin: 0;
  font-size: 11.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #475569;
}

.titulo-pendientes {
  color: #b45309;
}

.estado-vacio {
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  font-size: 12.5px;
  color: #64748b;
  line-height: 1.4;
}

.lista-tarjetas {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.card-item {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 13px;
  padding: 11px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.card-pendiente {
  border-color: #fcd34d;
  background: #fffbeb;
}

.card-cerrado {
  border-color: #fecaca;
  background: #fef2f2;
}

.card-anterior {
  opacity: 0.78;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 9px;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.badges-fila {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.badge-estado {
  display: inline-block;
  width: fit-content;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 9px;
}

.badge-verde {
  background: #dcfce7;
  color: #166534;
}

.badge-azul {
  background: #e0f2fe;
  color: #0369a1;
}

.badge-ambar {
  background: #fef3c7;
  color: #92400e;
}

.badge-morado {
  background: #f3e8ff;
  color: #6b21a8;
}

.badge-rojo {
  background: #fee2e2;
  color: #b91c1c;
}

.badge-gris {
  background: #e2e8f0;
  color: #475569;
}

.card-titulo {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.25;
}

.card-meta {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #475569;
}

.card-meta svg {
  color: #1e88e5;
  flex-shrink: 0;
}

.card-organizador {
  margin: 0;
  font-size: 11px;
  color: #64748b;
  font-style: italic;
}

.card-descripcion {
  margin: 0;
  font-size: 12px;
  color: #334155;
  line-height: 1.35;
}

.btn-miniatura {
  width: 54px;
  height: 54px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-miniatura img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
}

.card-footer-solo-borrar {
  justify-content: flex-end;
}

.btn-ubicar {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: none;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 11px;
  border-radius: 10px;
  cursor: pointer;
}

.acciones-staff {
  display: flex;
  align-items: center;
  gap: 5px;
}

.btn-staff {
  height: 30px;
  min-width: 30px;
  padding: 0 7px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
}

.btn-staff-peligro.confirmando {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.txt-confirmar {
  font-size: 11px;
  font-weight: 700;
}

.card-acciones-moderacion {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn-aprobar,
.btn-rechazar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  padding: 7px;
  border-radius: 9px;
  cursor: pointer;
}

.btn-aprobar {
  background: #16a34a;
  color: #ffffff;
}

.btn-rechazar {
  background: #e2e8f0;
  color: #334155;
}

.box-posponer {
  background: #f8fafc;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 9px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.posponer-label {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
}

.posponer-botones {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.btn-guardar-posponer {
  border: none;
  background: #1e88e5;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  padding: 7px;
  border-radius: 8px;
  cursor: pointer;
}

.btn-cancelar-posponer {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  font-size: 11px;
  font-weight: 600;
  padding: 7px;
  border-radius: 8px;
  cursor: pointer;
}

.seccion-anteriores {
  border-top: 1px solid #e2e8f0;
  padding-top: 10px;
}

.seccion-header-colapsable {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-toggle-anteriores {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 0;
  cursor: pointer;
}

.btn-vaciar-historial {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.btn-vaciar-historial.confirmando {
  background: #dc2626;
  color: #ffffff;
}

/* SWITCH DE CAMINOS */
.tarjeta-switch-caminos {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.switch-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.switch-info strong {
  font-size: 13px;
  color: #0f172a;
}

.switch-info span {
  font-size: 11.5px;
  color: #64748b;
  line-height: 1.3;
}

.switch-control {
  position: relative;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}

.switch-control input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  inset: 0;
  background: #cbd5e1;
  border-radius: 999px;
  transition: background 0.2s ease;
}

.switch-slider::before {
  content: '';
  position: absolute;
  left: 3px;
  top: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease;
}

.switch-control input:checked + .switch-slider {
  background: #10b981;
}

.switch-control input:checked + .switch-slider::before {
  transform: translateX(20px);
}

.leyenda-caminos {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 4px;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
}

.leyenda-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.punto-leyenda {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.punto-leyenda.verde {
  background: #10b981;
}

.punto-leyenda.rojo {
  background: #ef4444;
}

.btn-reportar-rapido {
  border: none;
  background: #fee2e2;
  color: #b91c1c;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 9px;
  border-radius: 8px;
  cursor: pointer;
}

/* PIE DEL PANEL */
.menu-footer {
  padding: 10px 14px;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  color: #64748b;
}

.footer-sync {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.dot-sync {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #94a3b8;
}

.dot-sync.actualizado {
  background: #10b981;
}

.dot-sync.sincronizando {
  background: #f59e0b;
}

.btn-footer-sesion {
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #1e293b;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 9px;
  border-radius: 9px;
  cursor: pointer;
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

.icon-swap-enter-from,
.icon-swap-leave-to {
  opacity: 0;
  transform: scale(0.75);
}

@media (max-width: 640px) {
  .btn-menu-flotante {
    display: none;
  }

  .menu-drawer {
    width: min(335px, 88vw);
  }

  .btn-cerrar-movil {
    display: inline-flex;
  }
}
</style>