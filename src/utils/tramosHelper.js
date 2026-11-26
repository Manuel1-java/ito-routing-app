const PUERTAS_REFERENCIA = [
  { id: 'puerta-puente', nombre: 'Puerta Puente Tec', coords: [-96.746307, 17.078457] },
  { id: 'puerta-norte', nombre: 'Puerta Av. Tecnológico', coords: [-96.745389, 17.079019] },
  { id: 'puerta-riberas', nombre: 'Puerta Riberas / Bátiz', coords: [-96.744752, 17.075832] },
  { id: 'puerta-ferrocarril', nombre: 'Puerta Av. Ferrocarril', coords: [-96.743204, 17.076342] },
  { id: 'puerta-posgrado', nombre: 'Puerta Calzada Madero', coords: [-96.743397, 17.079302] }
];

const distanciaMetros = (c1, c2) => {
  const R = 6371000;
  const rad = Math.PI / 180;
  const lat1 = c1[1] * rad;
  const lat2 = c2[1] * rad;
  const dLat = (c2[1] - c1[1]) * rad;
  const dLon = (c2[0] - c1[0]) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const extraerPuntosEdificio = (geometry) => {
  if (!geometry) return [];
  const anillo =
    geometry.type === 'Polygon'
      ? geometry.coordinates[0]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates[0][0]
        : null;
  if (!anillo || !anillo.length) return [];

  let sumLng = 0;
  let sumLat = 0;
  const pts = [];
  for (const coord of anillo) {
    sumLng += coord[0];
    sumLat += coord[1];
    pts.push(coord);
  }
  pts.push([sumLng / anillo.length, sumLat / anillo.length]);
  return pts;
};

const construirAnclas = (edificiosFeatures = []) => {
  const anclas = [];
  const nombresPorId = {};

  for (const feat of edificiosFeatures) {
    const props = feat.properties || {};
    const id = String(props.id || '').trim();
    const nombre = String(props.nombre || '').trim();
    if (!id || !nombre) continue;

    nombresPorId[id] = nombre;
    const puntos = extraerPuntosEdificio(feat.geometry);
    if (puntos.length) {
      anclas.push({ id: `edif-${id}`, nombre, puntos, esPuerta: false });
    }
  }

  for (const p of PUERTAS_REFERENCIA) {
    anclas.push({ id: p.id, nombre: p.nombre, puntos: [p.coords], esPuerta: true });
  }

  return { anclas, nombresPorId };
};

const buscarAnclaCercana = (coord, anclas, radioMaxMetros = 42) => {
  let mejor = null;
  let menorDist = radioMaxMetros;

  for (const ancla of anclas) {
    for (const pt of ancla.puntos) {
      const d = distanciaMetros(coord, pt);
      const peso = ancla.esPuerta ? d + 6 : d;
      if (peso < menorDist) {
        menorDist = peso;
        mejor = ancla;
      }
    }
  }
  return mejor;
};

const extraerCoordenadasLinea = (geometry) => {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return geometry.coordinates || [];
  if (geometry.type === 'MultiLineString') {
    return (geometry.coordinates || []).flat();
  }
  return [];
};

export const describirTramosCampus = (rutasGeojson, edificiosFeatures = []) => {
  const features = rutasGeojson?.features || [];
  if (!features.length) return [];

  const { anclas, nombresPorId } = construirAnclas(edificiosFeatures);

  return features.map((feat, idx) => {
    const props = feat.properties || {};
    const id = props.id ?? props.ID ?? props.fid ?? feat.id ?? idx + 1;
    const habilitado = props.habilitado !== false;
    const tipoRaw = String(props.Tipo || props.tipo || 'andador').trim();
    const tipoLower = tipoRaw.toLowerCase();
    const piso = String(props.Piso || props.piso || 'PB').trim().toUpperCase();
    const edificioId = props.edificio_id ? String(props.edificio_id).trim() : '';

    const coords = extraerCoordenadasLinea(feat.geometry);
    const inicio = coords[0] || null;
    const fin = coords[coords.length - 1] || null;
    const medio = coords.length ? coords[Math.floor(coords.length / 2)] : null;

    let titulo = '';
    const nombreEdifDirecto = edificioId ? nombresPorId[edificioId] : '';

    if (tipoLower.includes('escalera') || tipoLower.includes('rampa')) {
      const ref = nombreEdifDirecto || (medio ? buscarAnclaCercana(medio, anclas, 35)?.nombre : '');
      titulo = ref ? `Escalera / Rampa • ${ref} (${piso})` : `Escalera / Rampa (${piso})`;
    } else if (piso !== 'PB' || nombreEdifDirecto) {
      const ref = nombreEdifDirecto || (medio ? buscarAnclaCercana(medio, anclas, 35)?.nombre : '');
      titulo = ref ? `Pasillo interior • ${ref} (${piso})` : `Pasillo interior (${piso})`;
    } else if (inicio && fin) {
      const anclaIni = buscarAnclaCercana(inicio, anclas, 42);
      const anclaFin = buscarAnclaCercana(fin, anclas, 42);
      const anclaMed = medio ? buscarAnclaCercana(medio, anclas, 48) : null;

      if (anclaIni && anclaFin && anclaIni.id !== anclaFin.id) {
        titulo = `Andador entre ${anclaIni.nombre} y ${anclaFin.nombre}`;
      } else if (anclaMed) {
        titulo = `Andador junto a ${anclaMed.nombre}`;
      } else if (anclaIni) {
        titulo = `Andador cerca de ${anclaIni.nombre}`;
      } else {
        titulo = `Andador exterior #${id}`;
      }
    } else {
      titulo = `Tramo de paso #${id}`;
    }

    return {
      id,
      titulo,
      piso,
      tipo: tipoRaw,
      habilitado,
      coordsCentro: medio || inicio
    };
  });
};