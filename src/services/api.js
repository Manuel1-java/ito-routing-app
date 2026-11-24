import { ref } from 'vue';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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