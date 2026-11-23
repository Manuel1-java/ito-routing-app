function claveNodo(coord) {
  return `${coord[0].toFixed(7)},${coord[1].toFixed(7)}`;
}

export function distanciaMetros(coord1, coord2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const lat1 = coord1[1] * rad;
  const lat2 = coord2[1] * rad;
  const dLat = (coord2[1] - coord1[1]) * rad;
  const dLon = (coord2[0] - coord1[0]) * rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Calcula el rumbo (azimut en grados 0° - 360°) de coord1 hacia coord2
export function calcularRumbo(coord1, coord2) {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;
  const lat1 = coord1[1] * rad;
  const lat2 = coord2[1] * rad;
  const dLon = (coord2[0] - coord1[0]) * rad;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return (Math.atan2(y, x) * deg + 360) % 360;
}

// Calcula el punto más cercano de un segmento AB a un punto P
function proyectarEnSegmento(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return { punto: a, t: 0, dist: distanciaMetros(p, a) };

  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const punto = [a[0] + t * dx, a[1] + t * dy];
  return { punto, t, dist: distanciaMetros(p, punto) };
}

function construirGrafo(rutasGeojson, soloAccesible = false) {
  const segmentos = [];
  const verticesUnicos = new Map();

  const registrarVertice = (coord) => {
    const id = claveNodo(coord);
    if (!verticesUnicos.has(id)) {
      verticesUnicos.set(id, coord);
    }
    return verticesUnicos.get(id);
  };

  for (const feature of rutasGeojson.features) {
    if (feature.geometry?.type !== 'LineString') continue;

    const tipoRaw = feature.properties?.Tipo || feature.properties?.tipo || 'andador';
    const tipo = tipoRaw.toLowerCase().trim();

    if (soloAccesible && tipo === 'escalera') continue;

    const puntos = feature.geometry.coordinates;
    for (let i = 0; i < puntos.length - 1; i++) {
      const a = registrarVertice(puntos[i]);
      const b = registrarVertice(puntos[i + 1]);
      if (claveNodo(a) !== claveNodo(b)) {
        segmentos.push({ a, b, tipo });
      }
    }
  }

  const UMBRAL_UNION_METROS = 3.5;
  const listaVertices = Array.from(verticesUnicos.values());

  const segmentosFinales = [];
  for (const seg of segmentos) {
    const cortes = [
      { t: 0, coord: seg.a },
      { t: 1, coord: seg.b }
    ];

    for (const v of listaVertices) {
      if (claveNodo(v) === claveNodo(seg.a) || claveNodo(v) === claveNodo(seg.b)) continue;
      const proy = proyectarEnSegmento(v, seg.a, seg.b);
      if (proy.t > 0.01 && proy.t < 0.99 && proy.dist <= UMBRAL_UNION_METROS) {
        cortes.push({ t: proy.t, coord: v });
      }
    }

    cortes.sort((x, y) => x.t - y.t);

    for (let i = 0; i < cortes.length - 1; i++) {
      const p1 = cortes[i].coord;
      const p2 = cortes[i + 1].coord;
      if (claveNodo(p1) !== claveNodo(p2)) {
        segmentosFinales.push({ a: p1, b: p2, tipo: seg.tipo });
      }
    }
  }

  const grafo = {};
  const coordenadas = {};

  const agregarArista = (p1, p2, tipo) => {
    const id1 = claveNodo(p1);
    const id2 = claveNodo(p2);
    if (id1 === id2) return;

    coordenadas[id1] = p1;
    coordenadas[id2] = p2;
    if (!grafo[id1]) grafo[id1] = [];
    if (!grafo[id2]) grafo[id2] = [];

    const peso = distanciaMetros(p1, p2);
    grafo[id1].push({ nodo: id2, peso, tipo });
    grafo[id2].push({ nodo: id1, peso, tipo });
  };

  for (const seg of segmentosFinales) {
    agregarArista(seg.a, seg.b, seg.tipo);
  }

  return { grafo, coordenadas, segmentos: segmentosFinales, agregarArista };
}

function conectarPuntoAlGrafo(coordObjetivo, grafoData) {
  let mejorProy = null;
  let mejorSeg = null;

  for (const seg of grafoData.segmentos) {
    const proy = proyectarEnSegmento(coordObjetivo, seg.a, seg.b);
    if (!mejorProy || proy.dist < mejorProy.dist) {
      mejorProy = proy;
      mejorSeg = seg;
    }
  }

  if (!mejorProy || !mejorSeg) return null;

  const puntoAnclaje = mejorProy.punto;
  const idAnclaje = claveNodo(puntoAnclaje);

  if (!grafoData.coordenadas[idAnclaje]) {
    grafoData.agregarArista(mejorSeg.a, puntoAnclaje, mejorSeg.tipo);
    grafoData.agregarArista(puntoAnclaje, mejorSeg.b, mejorSeg.tipo);
  }

  return idAnclaje;
}

// Convierte los vértices de la ruta en instrucciones paso a paso (recto, izquierda, derecha)
export function generarInstrucciones(rutaCoords, nombreDestino = 'tu destino') {
  if (!rutaCoords || rutaCoords.length < 2) return [];

  // Filtrar micro-segmentos menores a 1.5 m para evitar falsos giros en las uniones
  const puntos = [rutaCoords[0]];
  for (let i = 1; i < rutaCoords.length; i++) {
    const esUltimo = i === rutaCoords.length - 1;
    if (esUltimo || distanciaMetros(puntos[puntos.length - 1], rutaCoords[i]) >= 1.5) {
      puntos.push(rutaCoords[i]);
    }
  }

  if (puntos.length < 2) return [];

  const pasos = [];
  let rumboPrevio = calcularRumbo(puntos[0], puntos[1]);
  let pasoActual = {
    tipo: 'recto',
    texto: 'Avanza recto por el andador',
    distancia: distanciaMetros(puntos[0], puntos[1]),
    puntoGiro: puntos[0],
    puntoSiguiente: puntos[1],
    rumbo: rumboPrevio
  };

  for (let i = 1; i < puntos.length - 1; i++) {
    const pActual = puntos[i];
    const pSig = puntos[i + 1];
    const distTramo = distanciaMetros(pActual, pSig);
    const rumboNuevo = calcularRumbo(pActual, pSig);

    // Diferencia angular entre -180° y +180°
    const diff = ((rumboNuevo - rumboPrevio + 540) % 360) - 180;

    if (Math.abs(diff) < 28) {
      // Misma dirección general: acumulamos metros al paso actual
      pasoActual.distancia += distTramo;
      pasoActual.puntoSiguiente = pSig;
    } else {
      pasos.push({
        ...pasoActual,
        distancia: Math.max(1, Math.round(pasoActual.distancia))
      });

      let tipoGiro = 'derecha';
      let textoGiro = 'Gira a la derecha';

      if (Math.abs(diff) >= 135) {
        tipoGiro = 'vuelta';
        textoGiro = 'Da media vuelta';
      } else if (diff < 0) {
        tipoGiro = 'izquierda';
        textoGiro = 'Gira a la izquierda';
      }

      pasoActual = {
        tipo: tipoGiro,
        texto: textoGiro,
        distancia: distTramo,
        puntoGiro: pActual,
        puntoSiguiente: pSig,
        rumbo: rumboNuevo
      };
    }

    rumboPrevio = rumboNuevo;
  }

  pasos.push({
    ...pasoActual,
    distancia: Math.max(1, Math.round(pasoActual.distancia))
  });

  // Paso final de llegada
  const puntoFinal = puntos[puntos.length - 1];
  pasos.push({
    tipo: 'destino',
    texto: `Has llegado a ${nombreDestino}`,
    distancia: 0,
    puntoGiro: puntoFinal,
    puntoSiguiente: puntoFinal,
    rumbo: rumboPrevio
  });

  return pasos;
}

// Evalúa la posición GPS del usuario contra la ruta activa
export function evaluarProgresoRuta(ubicacionActual, rutaCoords, pasos, pasoActualIdx) {
  if (!ubicacionActual || !rutaCoords || rutaCoords.length < 2 || !pasos?.length) {
    return null;
  }

  let menorDistRuta = Infinity;
  let idxSegmentoCercano = 0;
  let puntoProyectado = rutaCoords[0];

  for (let i = 0; i < rutaCoords.length - 1; i++) {
    const proy = proyectarEnSegmento(ubicacionActual, rutaCoords[i], rutaCoords[i + 1]);
    if (proy.dist < menorDistRuta) {
      menorDistRuta = proy.dist;
      idxSegmentoCercano = i;
      puntoProyectado = proy.punto;
    }
  }

  // Si se aleja más de 22 m del andador, avisamos para recalcular
  if (menorDistRuta > 22) {
    return { fueraDeRuta: true };
  }

  const destino = rutaCoords[rutaCoords.length - 1];
  const distAlDestino = distanciaMetros(ubicacionActual, destino);

  if (distAlDestino <= 10) {
    return {
      llegado: true,
      nuevoPasoIdx: pasos.length - 1,
      distanciaAlSiguienteGiro: 0,
      distanciaRestanteTotal: 0,
      rumboActual: pasos[pasos.length - 1].rumbo
    };
  }

  let nuevoPasoIdx = Math.min(pasoActualIdx, pasos.length - 2);
  const siguientePaso = pasos[nuevoPasoIdx + 1];

  if (siguientePaso) {
    const distAlGiro = distanciaMetros(ubicacionActual, siguientePaso.puntoGiro);
    // Si ya entró en el radio de 9 m de la esquina, avanza automáticamente
    if (distAlGiro <= 9 && nuevoPasoIdx + 1 < pasos.length - 1) {
      nuevoPasoIdx += 1;
    }
  }

  const pasoRefSiguiente = pasos[nuevoPasoIdx + 1];
  const distanciaAlSiguienteGiro = pasoRefSiguiente
    ? Math.max(1, Math.round(distanciaMetros(ubicacionActual, pasoRefSiguiente.puntoGiro)))
    : Math.max(1, Math.round(distAlDestino));

  // Distancia restante sumando desde la proyección actual hasta el final
  let restante = distanciaMetros(puntoProyectado, rutaCoords[idxSegmentoCercano + 1]);
  for (let i = idxSegmentoCercano + 1; i < rutaCoords.length - 1; i++) {
    restante += distanciaMetros(rutaCoords[i], rutaCoords[i + 1]);
  }

  return {
    fueraDeRuta: false,
    llegado: false,
    nuevoPasoIdx,
    distanciaAlSiguienteGiro,
    distanciaRestanteTotal: Math.max(1, Math.round(restante)),
    rumboActual: pasos[nuevoPasoIdx]?.rumbo || 0
  };
}

export function calcularRuta(
  rutasGeojson,
  origenCoord,
  destinoCoord,
  soloAccesible = false,
  nombreDestino = 'tu destino'
) {
  const grafoData = construirGrafo(rutasGeojson, soloAccesible);

  const inicio = conectarPuntoAlGrafo(origenCoord, grafoData);
  const fin = conectarPuntoAlGrafo(destinoCoord, grafoData);

  if (!inicio || !fin) return null;

  const { grafo, coordenadas } = grafoData;
  const distancias = {};
  const previos = {};
  const visitados = new Set();

  for (const id of Object.keys(grafo)) {
    distancias[id] = Infinity;
  }
  distancias[inicio] = 0;

  while (true) {
    let actual = null;
    let menorDist = Infinity;

    for (const id of Object.keys(distancias)) {
      if (!visitados.has(id) && distancias[id] < menorDist) {
        menorDist = distancias[id];
        actual = id;
      }
    }

    if (!actual || actual === fin) break;
    visitados.add(actual);

    for (const vecino of grafo[actual]) {
      if (visitados.has(vecino.nodo)) continue;
      const nuevaDist = distancias[actual] + vecino.peso;

      if (nuevaDist < distancias[vecino.nodo]) {
        distancias[vecino.nodo] = nuevaDist;
        previos[vecino.nodo] = actual;
      }
    }
  }

  if (distancias[fin] === Infinity) return null;

  const rutaCoords = [];
  let paso = fin;

  while (paso) {
    rutaCoords.unshift(coordenadas[paso]);
    paso = previos[paso];
  }

  const distanciaTotal = Math.round(distancias[fin]);
  const tiempoMinutos = Math.max(1, Math.round(distanciaTotal / 75));
  const pasos = generarInstrucciones(rutaCoords, nombreDestino);

  return {
    coordenadas: rutaCoords,
    distancia: distanciaTotal,
    tiempoMinutos,
    pasos
  };
}

function normalizarTexto(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function buscarLugares(lugares, consulta, limite = 12) {
  const query = normalizarTexto(consulta);
  if (!query) return [];

  const tokens = query.split(/\s+/);

  const coincidencias = lugares.filter((lugar) => {
    const baseBusqueda = normalizarTexto(
      `${lugar.nombre} ${lugar.descripcion || ''} ${lugar.tipo || ''} ${(lugar.palabras_clave || []).join(' ')}`
    );
    return tokens.every((token) => baseBusqueda.includes(token));
  });

  coincidencias.sort((a, b) => {
    const nombreA = normalizarTexto(a.nombre);
    const nombreB = normalizarTexto(b.nombre);
    const empiezaA = nombreA.startsWith(query) ? 0 : 1;
    const empiezaB = nombreB.startsWith(query) ? 0 : 1;
    return empiezaA - empiezaB || nombreA.localeCompare(nombreB);
  });

  return coincidencias.slice(0, limite);
}