export function normalizarPiso(piso) {
  const val = String(piso || 'PB').trim().toUpperCase();
  if (val === '1' || val === 'P1') return 'P1';
  if (val === '2' || val === 'P2') return 'P2';
  return 'PB';
}

function nivelPiso(piso) {
  const p = normalizarPiso(piso);
  if (p === 'P1') return 1;
  if (p === 'P2') return 2;
  return 0;
}

export function alturaBasePiso(piso) {
  const p = normalizarPiso(piso);
  if (p === 'P1') return 4.15;
  if (p === 'P2') return 7.55;
  return 0.05;
}

export function etiquetaPiso(piso) {
  const p = normalizarPiso(piso);
  if (p === 'P1') return 'Primer Piso (P1)';
  if (p === 'P2') return 'Segundo Piso (P2)';
  return 'Planta Baja (PB)';
}

function claveNodo(coord, piso = 'PB') {
  return `${coord[0].toFixed(7)},${coord[1].toFixed(7)}|${normalizarPiso(piso)}`;
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
  const conexionesVerticales = [];
  const verticesPorPiso = new Map();
  const umbralUnion = 2.5;

  const registrarVertice = (coord, piso) => {
    const pNorm = normalizarPiso(piso);
    const id = claveNodo(coord, pNorm);
    if (verticesPorPiso.has(id)) {
      return verticesPorPiso.get(id).coord;
    }
    for (const v of verticesPorPiso.values()) {
      if (v.piso === pNorm && distanciaMetros(v.coord, coord) <= umbralUnion) {
        return v.coord;
      }
    }
    verticesPorPiso.set(id, { coord, piso: pNorm });
    return coord;
  };

  for (const feature of rutasGeojson.features) {
    if (feature.geometry?.type !== 'LineString') continue;
    if (feature.properties?.habilitado === false) continue;

    const props = feature.properties || {};
    const tipo = (props.Tipo || props.tipo || 'andador').toLowerCase().trim();

    if (soloAccesible && (tipo === 'escalera' || tipo === 'escaleras')) continue;

    const pisoInicio = normalizarPiso(props.Piso || props.piso || 'PB');
    const pisoFin = normalizarPiso(props.Piso_fin || props.piso_fin || pisoInicio);
    const edificioId = props.edificio_id ? String(props.edificio_id) : null;
    const puntos = feature.geometry.coordinates;

    if (puntos.length < 2) continue;

    if (pisoInicio !== pisoFin) {
      const pA = registrarVertice(puntos[0], pisoInicio);
      const pB = registrarVertice(puntos[puntos.length - 1], pisoFin);
      conexionesVerticales.push({
        a: pA,
        b: pB,
        pisoA: pisoInicio,
        pisoB: pisoFin,
        tipo,
        edificioId,
        traza: puntos
      });
      continue;
    }

    for (let i = 0; i < puntos.length - 1; i++) {
      const a = registrarVertice(puntos[i], pisoInicio);
      const b = registrarVertice(puntos[i + 1], pisoInicio);
      if (claveNodo(a, pisoInicio) !== claveNodo(b, pisoInicio)) {
        segmentos.push({ a, b, piso: pisoInicio, tipo, edificioId });
      }
    }
  }

  const listaVertices = Array.from(verticesPorPiso.values());
  const segmentosFinales = [];

  for (const seg of segmentos) {
    const cortes = [
      { t: 0, coord: seg.a },
      { t: 1, coord: seg.b }
    ];

    for (const v of listaVertices) {
      if (v.piso !== seg.piso) continue;
      if (
        claveNodo(v.coord, seg.piso) === claveNodo(seg.a, seg.piso) ||
        claveNodo(v.coord, seg.piso) === claveNodo(seg.b, seg.piso)
      ) {
        continue;
      }
      const proy = proyectarEnSegmento(v.coord, seg.a, seg.b);
      if (proy.t > 0.01 && proy.t < 0.99 && proy.dist <= umbralUnion) {
        cortes.push({ t: proy.t, coord: v.coord });
      }
    }

    cortes.sort((x, y) => x.t - y.t);

    for (let i = 0; i < cortes.length - 1; i++) {
      const p1 = cortes[i].coord;
      const p2 = cortes[i + 1].coord;
      if (claveNodo(p1, seg.piso) !== claveNodo(p2, seg.piso)) {
        segmentosFinales.push({
          a: p1,
          b: p2,
          piso: seg.piso,
          tipo: seg.tipo,
          edificioId: seg.edificioId
        });
      }
    }
  }

  const grafo = {};
  const nodosMeta = {};

  const agregarArista = (p1, piso1, p2, piso2, meta = {}, metaInversa = null) => {
    const id1 = claveNodo(p1, piso1);
    const id2 = claveNodo(p2, piso2);
    if (id1 === id2) return;

    nodosMeta[id1] = { coord: p1, piso: normalizarPiso(p1 ? piso1 : 'PB') };
    nodosMeta[id2] = { coord: p2, piso: normalizarPiso(p2 ? piso2 : 'PB') };
    if (!grafo[id1]) grafo[id1] = [];
    if (!grafo[id2]) grafo[id2] = [];

    const baseDist = distanciaMetros(p1, p2);
    const peso = piso1 !== piso2 ? Math.max(5, baseDist) : baseDist;

    grafo[id1].push({ nodo: id2, peso, ...meta });
    grafo[id2].push({ nodo: id1, peso, ...(metaInversa || meta) });
  };

  for (const seg of segmentosFinales) {
    agregarArista(seg.a, seg.piso, seg.b, seg.piso, {
      tipo: seg.tipo,
      edificioId: seg.edificioId
    });
  }

  for (const con of conexionesVerticales) {
    const trazaIda = Array.isArray(con.traza) && con.traza.length >= 2 ? con.traza : [con.a, con.b];
    const trazaVuelta = [...trazaIda].reverse();
    agregarArista(
      con.a,
      con.pisoA,
      con.b,
      con.pisoB,
      { tipo: con.tipo, edificioId: con.edificioId, traza: trazaIda },
      { tipo: con.tipo, edificioId: con.edificioId, traza: trazaVuelta }
    );
  }

  return { grafo, nodosMeta, segmentos: segmentosFinales, agregarArista };
}

function conectarPuntoAlGrafo(coordObjetivo, pisoObjetivo, grafoData) {
  const pisoNorm = normalizarPiso(pisoObjetivo);
  let candidatos = grafoData.segmentos.filter((s) => s.piso === pisoNorm);

  if (candidatos.length === 0) {
    candidatos = grafoData.segmentos;
  }

  let mejorProy = null;
  let mejorSeg = null;

  for (const seg of candidatos) {
    const proy = proyectarEnSegmento(coordObjetivo, seg.a, seg.b);
    if (!mejorProy || proy.dist < mejorProy.dist) {
      mejorProy = proy;
      mejorSeg = seg;
    }
  }

  if (!mejorProy || !mejorSeg) return null;

  const puntoAnclaje = mejorProy.punto;
  const pisoAnclaje = mejorSeg.piso;
  const idAnclaje = claveNodo(puntoAnclaje, pisoAnclaje);

  if (!grafoData.nodosMeta[idAnclaje]) {
    grafoData.agregarArista(mejorSeg.a, pisoAnclaje, puntoAnclaje, pisoAnclaje, {
      tipo: mejorSeg.tipo,
      edificioId: mejorSeg.edificioId
    });
    grafoData.agregarArista(puntoAnclaje, pisoAnclaje, mejorSeg.b, pisoAnclaje, {
      tipo: mejorSeg.tipo,
      edificioId: mejorSeg.edificioId
    });
  }

  return idAnclaje;
}

function segmentoAPoligono(p1, p2, anchoMetros = 0.45) {
  const mLat = 111320;
  const mLon = 111320 * Math.cos(((p1[1] + p2[1]) / 2) * (Math.PI / 180));
  const dx = (p2[0] - p1[0]) * mLon;
  const dy = (p2[1] - p1[1]) * mLat;
  const len = Math.hypot(dx, dy);

  if (len < 0.05) {
    const ox = anchoMetros / mLon;
    const oy = anchoMetros / mLat;
    return [[
      [p1[0] - ox, p1[1] - oy],
      [p1[0] + ox, p1[1] - oy],
      [p1[0] + ox, p1[1] + oy],
      [p1[0] - ox, p1[1] + oy],
      [p1[0] - ox, p1[1] - oy]
    ]];
  }

  const nx = (-dy / len) * anchoMetros;
  const ny = (dx / len) * anchoMetros;
  const ox = nx / mLon;
  const oy = ny / mLat;

  return [[
    [p1[0] + ox, p1[1] + oy],
    [p2[0] + ox, p2[1] + oy],
    [p2[0] - ox, p2[1] - oy],
    [p1[0] - ox, p1[1] - oy],
    [p1[0] + ox, p1[1] + oy]
  ]];
}

export function construirGeojsonRuta3D(rutaNodos) {
  const lineasPB = [];
  const extrusiones3D = [];

  if (!rutaNodos || rutaNodos.length < 2) {
    return {
      rutaPB: { type: 'FeatureCollection', features: [] },
      rutaElevada: { type: 'FeatureCollection', features: [] }
    };
  }

  for (let i = 0; i < rutaNodos.length - 1; i++) {
    const a = rutaNodos[i];
    const b = rutaNodos[i + 1];

    if (a.piso !== b.piso) {
      const pts = Array.isArray(b.traza) && b.traza.length >= 2 ? b.traza : [a.coord, b.coord];
      const zInicio = alturaBasePiso(a.piso);
      const zFin = alturaBasePiso(b.piso);
      const tramos = pts.length - 1;

      for (let j = 0; j < tramos; j++) {
        const z0 = zInicio + ((zFin - zInicio) * j) / tramos;
        const z1 = zInicio + ((zFin - zInicio) * (j + 1)) / tramos;
        extrusiones3D.push({
          type: 'Feature',
          properties: {
            base: Math.min(z0, z1),
            height: Math.max(z0, z1) + 0.25,
            tipo: 'escalera'
          },
          geometry: {
            type: 'Polygon',
            coordinates: segmentoAPoligono(pts[j], pts[j + 1], 0.5)
          }
        });
      }
      continue;
    }

    if (a.piso === 'PB') {
      lineasPB.push({
        type: 'Feature',
        properties: { piso: 'PB' },
        geometry: {
          type: 'LineString',
          coordinates: [a.coord, b.coord]
        }
      });
    } else {
      const z = alturaBasePiso(a.piso);
      extrusiones3D.push({
        type: 'Feature',
        properties: { base: z, height: z + 0.25, piso: a.piso, tipo: 'pasillo' },
        geometry: {
          type: 'Polygon',
          coordinates: segmentoAPoligono(a.coord, b.coord, 0.45)
        }
      });
    }
  }

  return {
    rutaPB: { type: 'FeatureCollection', features: lineasPB },
    rutaElevada: { type: 'FeatureCollection', features: extrusiones3D }
  };
}

export function generarInstrucciones(
  rutaNodos,
  nombreDestino = 'tu destino',
  nombresEdificios = {}
) {
  if (!rutaNodos || rutaNodos.length < 2) return [];

  const pasos = [];
  let rumboPrevio = calcularRumbo(rutaNodos[0].coord, rutaNodos[1].coord);
  let pasoActual = {
    tipo: 'recto',
    texto: 'Avanza recto por el andador',
    distancia: distanciaMetros(rutaNodos[0].coord, rutaNodos[1].coord),
    puntoGiro: rutaNodos[0].coord,
    puntoSiguiente: rutaNodos[1].coord,
    rumbo: rumboPrevio,
    piso: rutaNodos[0].piso
  };

  for (let i = 1; i < rutaNodos.length; i++) {
    const prev = rutaNodos[i - 1];
    const curr = rutaNodos[i];
    const distTramo = distanciaMetros(prev.coord, curr.coord);

    if (prev.piso !== curr.piso) {
      pasos.push({
        ...pasoActual,
        distancia: Math.max(1, Math.round(pasoActual.distancia))
      });

      const sube = nivelPiso(curr.piso) > nivelPiso(prev.piso);
      const via = curr.tipo === 'rampa' ? 'por la rampa' : 'por las escaleras';
      const accion = sube ? 'Sube' : 'Baja';

      pasoActual = {
        tipo: curr.tipo === 'rampa' ? 'rampa' : 'escalera',
        texto: `${accion} ${via} a ${etiquetaPiso(curr.piso)}`,
        distancia: Math.max(4, distTramo),
        puntoGiro: prev.coord,
        puntoSiguiente: curr.coord,
        rumbo: rumboPrevio,
        piso: curr.piso
      };
      continue;
    }

    if (!prev.edificioId && curr.edificioId) {
      pasos.push({
        ...pasoActual,
        distancia: Math.max(1, Math.round(pasoActual.distancia))
      });

      const nombreEdif = nombresEdificios[curr.edificioId] || 'el edificio';
      pasoActual = {
        tipo: 'entrada',
        texto: `Entra a ${nombreEdif} y sigue por el pasillo`,
        distancia: distTramo,
        puntoGiro: prev.coord,
        puntoSiguiente: curr.coord,
        rumbo: distTramo > 0.5 ? calcularRumbo(prev.coord, curr.coord) : rumboPrevio,
        piso: curr.piso
      };
      continue;
    }

    if (distTramo < 1.2 && i < rutaNodos.length - 1) continue;

    const rumboNuevo =
      distTramo > 0.3 ? calcularRumbo(prev.coord, curr.coord) : rumboPrevio;
    const diff = ((rumboNuevo - rumboPrevio + 540) % 360) - 180;

    if (Math.abs(diff) < 28 && pasoActual.tipo !== 'escalera' && pasoActual.tipo !== 'rampa') {
      pasoActual.distancia += distTramo;
      pasoActual.puntoSiguiente = curr.coord;
    } else {
      pasos.push({
        ...pasoActual,
        distancia: Math.max(1, Math.round(pasoActual.distancia))
      });

      let tipoGiro = 'recto';
      let textoGiro = curr.edificioId
        ? 'Continúa por el pasillo interior'
        : 'Avanza recto por el andador';

      if (Math.abs(diff) >= 135) {
        tipoGiro = 'vuelta';
        textoGiro = 'Da media vuelta';
      } else if (diff <= -28) {
        tipoGiro = 'izquierda';
        textoGiro = 'Gira a la izquierda';
      } else if (diff >= 28) {
        tipoGiro = 'derecha';
        textoGiro = 'Gira a la derecha';
      }

      pasoActual = {
        tipo: tipoGiro,
        texto: textoGiro,
        distancia: distTramo,
        puntoGiro: prev.coord,
        puntoSiguiente: curr.coord,
        rumbo: rumboNuevo,
        piso: curr.piso
      };
    }

    rumboPrevio = rumboNuevo;
  }

  pasos.push({
    ...pasoActual,
    distancia: Math.max(1, Math.round(pasoActual.distancia))
  });

  const ultimoNodo = rutaNodos[rutaNodos.length - 1];
  const sufijoPiso =
    ultimoNodo.piso !== 'PB' ? ` (${etiquetaPiso(ultimoNodo.piso)})` : '';

  pasos.push({
    tipo: 'destino',
    texto: `Has llegado a ${nombreDestino}${sufijoPiso}`,
    distancia: 0,
    puntoGiro: ultimoNodo.coord,
    puntoSiguiente: ultimoNodo.coord,
    rumbo: rumboPrevio,
    piso: ultimoNodo.piso
  });

  return pasos;
}

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
    if (distAlGiro <= 9 && nuevoPasoIdx + 1 < pasos.length - 1) {
      nuevoPasoIdx += 1;
    }
  }

  const pasoRefSiguiente = pasos[nuevoPasoIdx + 1];
  const distanciaAlSiguienteGiro = pasoRefSiguiente
    ? Math.max(1, Math.round(distanciaMetros(ubicacionActual, pasoRefSiguiente.puntoGiro)))
    : Math.max(1, Math.round(distAlDestino));

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
  nombreDestino = 'tu destino',
  pisoDestino = 'PB',
  nombresEdificios = {}
) {
  const grafoData = construirGrafo(rutasGeojson, soloAccesible);

  const inicio = conectarPuntoAlGrafo(origenCoord, 'PB', grafoData);
  const fin = conectarPuntoAlGrafo(destinoCoord, pisoDestino, grafoData);

  if (!inicio || !fin) return null;

  const { grafo, nodosMeta } = grafoData;
  const distancias = {};
  const previos = {};
  const aristaUsada = {};
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
        aristaUsada[vecino.nodo] = {
          tipo: vecino.tipo || 'andador',
          edificioId: vecino.edificioId || null,
          traza: vecino.traza || null
        };
      }
    }
  }

  if (distancias[fin] === Infinity) return null;

  const rutaNodos = [];
  let paso = fin;

  while (paso) {
    const meta = nodosMeta[paso];
    const edge = aristaUsada[paso] || { tipo: 'andador', edificioId: null, traza: null };
    rutaNodos.unshift({
      coord: meta.coord,
      piso: meta.piso,
      tipo: edge.tipo,
      edificioId: edge.edificioId,
      traza: edge.traza
    });
    paso = previos[paso];
  }

  const rutaCoords = rutaNodos.map((n) => n.coord);
  const distanciaTotal = Math.round(distancias[fin]);
  const tiempoMinutos = Math.max(1, Math.round(distanciaTotal / 75));
  const pasos = generarInstrucciones(rutaNodos, nombreDestino, nombresEdificios);
  const geojson3D = construirGeojsonRuta3D(rutaNodos);

  return {
    coordenadas: rutaCoords,
    nodos: rutaNodos,
    distancia: distanciaTotal,
    tiempoMinutos,
    pasos,
    geojson3D
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
      `${lugar.nombre} ${lugar.descripcion || ''} ${lugar.tipo || ''} ${lugar.piso || ''} ${(lugar.palabras_clave || []).join(' ')}`
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