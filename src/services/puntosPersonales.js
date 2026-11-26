import { ref } from 'vue';

const PUNTOS_KEY = 'ito_puntos_personales_v1';
const FAVORITOS_KEY = 'ito_lugares_favoritos_v1';

const cargarJson = (clave) => {
  try {
    const raw = localStorage.getItem(clave);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const puntosPersonales = ref(cargarJson(PUNTOS_KEY));
export const lugaresFavoritos = ref(cargarJson(FAVORITOS_KEY));

const persistirPuntos = () => {
  localStorage.setItem(PUNTOS_KEY, JSON.stringify(puntosPersonales.value));
};

const persistirFavoritos = () => {
  localStorage.setItem(FAVORITOS_KEY, JSON.stringify(lugaresFavoritos.value));
};

export const agregarPuntoPersonal = ({ nombre, descripcion = '', coordenadas, piso = 'PB' }) => {
  const nuevo = {
    id: `personal-${Date.now()}`,
    nombre: String(nombre).trim(),
    descripcion: String(descripcion || '').trim() || 'Punto personal guardado en este dispositivo',
    tipo: 'Punto de Interés',
    edificio_id: null,
    piso,
    esPersonal: true,
    coordenadas: [Number(coordenadas[0]), Number(coordenadas[1])]
  };
  puntosPersonales.value = [nuevo, ...puntosPersonales.value];
  persistirPuntos();
  return nuevo;
};

export const eliminarPuntoPersonal = (id) => {
  puntosPersonales.value = puntosPersonales.value.filter((p) => String(p.id) !== String(id));
  persistirPuntos();
};

export const esLugarFavorito = (lugar) => {
  if (!lugar) return false;
  if (lugar.esPersonal) return true;
  return lugaresFavoritos.value.some((f) => String(f.id) === String(lugar.id));
};

export const toggleLugarFavorito = (lugar) => {
  if (!lugar) return false;
  if (lugar.esPersonal) {
    eliminarPuntoPersonal(lugar.id);
    return false;
  }

  const existe = lugaresFavoritos.value.some((f) => String(f.id) === String(lugar.id));
  if (existe) {
    lugaresFavoritos.value = lugaresFavoritos.value.filter(
      (f) => String(f.id) !== String(lugar.id)
    );
    persistirFavoritos();
    return false;
  }

  lugaresFavoritos.value = [
    {
      id: lugar.id,
      nombre: lugar.nombre,
      descripcion: lugar.descripcion || '',
      tipo: lugar.tipo || 'Punto de Interés',
      edificio_id: lugar.edificio_id || null,
      piso: lugar.piso || 'PB',
      coordenadas: lugar.coordenadas
    },
    ...lugaresFavoritos.value
  ];
  persistirFavoritos();
  return true;
};

export const quitarLugarFavorito = (id) => {
  lugaresFavoritos.value = lugaresFavoritos.value.filter((f) => String(f.id) !== String(id));
  persistirFavoritos();
};