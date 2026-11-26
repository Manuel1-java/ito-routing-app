import { ref } from 'vue';
import { API_BASE_URL } from './api.js';

const DB_NAME = 'ito_campus_offline_db';
const STORE_NAME = 'campus_store';
const DATA_KEY = 'datos_campus_v1';

export const versionCampusLocal = ref(0);
export const estadoSync = ref('offline');

const suscriptores = new Set();
let promesaCargaInicial = null;
let sincronizacionEnCurso = false;

export const suscribirActualizacionCampus = (callback) => {
  suscriptores.add(callback);
  return () => suscriptores.delete(callback);
};

const notificarSuscriptores = (datos) => {
  for (const cb of suscriptores) {
    try {
      cb(datos);
    } catch (err) {
      console.error('Error notificando actualizacion del campus:', err);
    }
  }
};

const abrirDB = () => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const leerCacheLocal = async () => {
  try {
    const db = await abrirDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(DATA_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
};

const guardarCacheLocal = async (paquete) => {
  try {
    const db = await abrirDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(paquete, DATA_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('No se pudo guardar cache en IndexedDB:', err);
  }
};

export const limpiarCacheCampus = async () => {
  try {
    const db = await abrirDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(DATA_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('No se pudo limpiar cache en IndexedDB:', err);
  }
};

const cargarRespaldoEstatico = async () => {
  const [resEdificios, resRutas, resLugares] = await Promise.all([
    fetch('/edificios.geojson', { cache: 'no-cache' }),
    fetch('/rutas.geojson', { cache: 'no-cache' }),
    fetch('/lugares.json', { cache: 'no-cache' })
  ]);

  const [edificios, rutas, lugares] = await Promise.all([
    resEdificios.json(),
    resRutas.json(),
    resLugares.json()
  ]);

  return {
    version: 0,
    edificios,
    rutas,
    lugares
  };
};

export const sincronizarConServidor = async (versionActual = versionCampusLocal.value) => {
  if (sincronizacionEnCurso) return null;
  sincronizacionEnCurso = true;
  estadoSync.value = 'sincronizando';

  try {
    const controlador = new AbortController();
    const timeoutId = setTimeout(() => controlador.abort(), 5000);

    const res = await fetch(`${API_BASE_URL}/campus/sync?version=${versionActual}`, {
      signal: controlador.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      estadoSync.value = 'offline';
      return null;
    }

    const payload = await res.json();
    versionCampusLocal.value = payload.version;
    estadoSync.value = 'actualizado';

    if (!payload.actualizado && payload.edificios && payload.rutas && payload.lugares) {
      const nuevoPaquete = {
        version: payload.version,
        edificios: payload.edificios,
        rutas: payload.rutas,
        lugares: payload.lugares
      };
      await guardarCacheLocal(nuevoPaquete);
      notificarSuscriptores(nuevoPaquete);
      return nuevoPaquete;
    }

    return null;
  } catch {
    estadoSync.value = 'offline';
    return null;
  } finally {
    sincronizacionEnCurso = false;
  }
};

export const obtenerDatosCampus = async () => {
  if (!promesaCargaInicial) {
    promesaCargaInicial = (async () => {
      let datos = await leerCacheLocal();

      if (!datos || !datos.version) {
        try {
          datos = await cargarRespaldoEstatico();
          await guardarCacheLocal(datos);
        } catch (err) {
          if (!datos) throw err;
        }
      }

      versionCampusLocal.value = datos.version || 0;
      sincronizarConServidor(versionCampusLocal.value);

      return datos;
    })();
  }

  return promesaCargaInicial;
};