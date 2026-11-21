function claveNodo(coord) {
  return `${coord[0].toFixed(7)},${coord[1].toFixed(7)}`;
}

function distanciaMetros(coord1, coord2) {
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

function construirGrafo(rutasGeojson, soloAccesible = false) {
  const grafo = {};
  const coordenadas = {};

  for (const feature of rutasGeojson.features) {
    if (feature.geometry?.type !== 'LineString') continue;

    const tipoRaw = feature.properties?.Tipo || feature.properties?.tipo || 'andador';
    const tipo = tipoRaw.toLowerCase().trim();

    if (soloAccesible && tipo === 'escalera') continue;

    const puntos = feature.geometry.coordinates;

    for (let i = 0; i < puntos.length - 1; i++) {
      const p1 = puntos[i];
      const p2 = puntos[i + 1];
      const id1 = claveNodo(p1);
      const id2 = claveNodo(p2);

      if (id1 === id2) continue;

      coordenadas[id1] = p1;
      coordenadas[id2] = p2;

      if (!grafo[id1]) grafo[id1] = [];
      if (!grafo[id2]) grafo[id2] = [];

      const peso = distanciaMetros(p1, p2);
      grafo[id1].push({ nodo: id2, peso, tipo });
      grafo[id2].push({ nodo: id1, peso, tipo });
    }
  }

  return { grafo, coordenadas };
}

function encontrarNodoCercano(coordObjetivo, coordenadas) {
  let mejorId = null;
  let menorDistancia = Infinity;

  for (const [id, coord] of Object.entries(coordenadas)) {
    const dist = distanciaMetros(coordObjetivo, coord);
    if (dist < menorDistancia) {
      menorDistancia = dist;
      mejorId = id;
    }
  }

  return mejorId;
}

export function calcularRuta(rutasGeojson, origenCoord, destinoCoord, soloAccesible = false) {
  const { grafo, coordenadas } = construirGrafo(rutasGeojson, soloAccesible);

  const inicio = encontrarNodoCercano(origenCoord, coordenadas);
  const fin = encontrarNodoCercano(destinoCoord, coordenadas);

  if (!inicio || !fin) return null;

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

  return {
    coordenadas: rutaCoords,
    distancia: distanciaTotal,
    tiempoMinutos
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