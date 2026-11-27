import { ref } from 'vue';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://ito-routing-api.onrender.com/api';

const TOKEN_KEY = 'ito_routing_token';
const USER_KEY = 'ito_routing_user';

export const tokenActual = ref(localStorage.getItem(TOKEN_KEY) || '');
export const usuarioActual = ref(
  JSON.parse(localStorage.getItem(USER_KEY) || 'null')
);

const guardarSesion = (token, usuario) => {
  tokenActual.value = token;
  usuarioActual.value = usuario;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
};

export const cerrarSesion = () => {
  tokenActual.value = '';
  usuarioActual.value = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const apiFetch = async (endpoint, opciones = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(opciones.headers || {})
  };

  if (tokenActual.value) {
    headers.Authorization = `Bearer ${tokenActual.value}`;
  }

  const respuesta = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...opciones,
    headers
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    if (respuesta.status === 401 && tokenActual.value) {
      cerrarSesion();
    }
    throw new Error(datos.error || `Error HTTP ${respuesta.status}`);
  }

  return datos;
};

export const iniciarSesion = async (correo, password) => {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ correo, password })
  });
  guardarSesion(res.token, res.usuario);
  return res.usuario;
};

export const registrarCuenta = async (nombre, correo, password) => {
  const res = await apiFetch('/auth/registro', {
    method: 'POST',
    body: JSON.stringify({ nombre, correo, password })
  });
  guardarSesion(res.token, res.usuario);
  return res.usuario;
};

export const validarSesionActiva = async () => {
  if (!tokenActual.value) return null;
  try {
    const res = await apiFetch('/auth/perfil');
    usuarioActual.value = res.usuario;
    localStorage.setItem(USER_KEY, JSON.stringify(res.usuario));
    return res.usuario;
  } catch {
    return null;
  }
};

/* =========================================================
   ENDPOINTS DE EVENTOS DEL CAMPUS Y COMPRESIÓN DE IMAGEN
   ========================================================= */

export const comprimirImagenAWebP = (archivo, maxLado = 960, calidad = 0.78) => {
  return new Promise((resolve, reject) => {
    if (!archivo || !archivo.type.startsWith('image/')) {
      reject(new Error('Selecciona un archivo de imagen válido.'));
      return;
    }

    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    lector.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      img.onload = () => {
        let ancho = img.width;
        let alto = img.height;

        if (ancho > maxLado || alto > maxLado) {
          if (ancho >= alto) {
            alto = Math.round((alto * maxLado) / ancho);
            ancho = maxLado;
          } else {
            ancho = Math.round((ancho * maxLado) / alto);
            alto = maxLado;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, ancho, alto);

        let dataUrl = canvas.toDataURL('image/webp', calidad);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', calidad);
        }
        resolve(dataUrl);
      };
      img.src = ev.target.result;
    };
    lector.readAsDataURL(archivo);
  });
};

export const obtenerEventos = async () => {
  return apiFetch('/eventos');
};

export const obtenerEventosPendientes = async () => {
  return apiFetch('/eventos/pendientes');
};

export const crearEvento = async (payload) => {
  return apiFetch('/eventos', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const resolverEventoPendiente = async (id, estado) => {
  return apiFetch(`/eventos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado })
  });
};

export const posponerEvento = async (id, fecha_inicio, fecha_fin) => {
  return apiFetch(`/eventos/${id}/posponer`, {
    method: 'PATCH',
    body: JSON.stringify({ fecha_inicio, fecha_fin })
  });
};

export const eliminarEvento = async (id) => {
  return apiFetch(`/eventos/${id}`, {
    method: 'DELETE'
  });
};

export const limpiarEventosAnteriores = async () => {
  return apiFetch('/eventos/anteriores', {
    method: 'DELETE'
  });
};

/* =========================================================
   SUGERENCIAS Y MODERACIÓN DE PUNTOS DE INTERÉS
   ========================================================= */

export const crearSugerenciaLugar = async (payload) => {
  return apiFetch('/campus/sugerencias-lugar', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const obtenerSugerenciasLugar = async () => {
  return apiFetch('/campus/sugerencias-lugar');
};

export const resolverSugerenciaLugar = async (id, estado) => {
  return apiFetch(`/campus/sugerencias-lugar/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ estado })
  });
};
