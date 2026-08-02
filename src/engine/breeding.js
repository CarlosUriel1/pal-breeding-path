// Motor de crianza de Palworld — port del algoritmo de palbreed.com/breeding-path.
// Reglas del juego:
//  1. Combos únicos (con posible restricción de género) tienen prioridad.
//  2. Dos pals de la misma especie producen esa misma especie.
//  3. Si no, el hijo es el pal "criable por rank" cuyo combiRank sea el más
//     cercano a floor((rankA + rankB + 1) / 2); empates los gana el de mayor combiPriority.
import palsRaw from '../data/pals.json';

export const palsById = palsRaw;

// Pool de crianza: pals que pueden participar como padre o hijo.
export const breedingPool = Object.values(palsById).filter(
  (p) =>
    p.name &&
    p.icon &&
    !p.isBoss &&
    p.combiRank &&
    p.combiRank !== 9999 &&
    !(p.ignoreCombi && !(p.combos || []).length)
);

export const breedableIds = new Set(breedingPool.map((p) => p.id));

// Hijos que solo salen de combos únicos, y pares de padres con combo único (ambos órdenes).
const uniqueChildren = new Set();
const uniquePairs = new Set();
for (const pal of Object.values(palsById)) {
  for (const combo of pal.combos || []) {
    uniqueChildren.add(combo.child);
    uniquePairs.add(combo.a + '|' + combo.b);
    uniquePairs.add(combo.b + '|' + combo.a);
  }
}

// Pals que pueden salir como hijo por la fórmula de rank.
const rankPool = breedingPool.filter((p) => !uniqueChildren.has(p.id) && !p.ignoreCombi);

// Tabla precalculada: childByRank[r] = hijo para un rank objetivo r.
const maxRank = Math.max(...breedingPool.map((p) => p.combiRank)) + 1;
const childByRank = new Array(maxRank + 1);
for (let r = 0; r <= maxRank; r++) {
  let best = null;
  let bestDiff = Infinity;
  for (const p of rankPool) {
    const diff = Math.abs(p.combiRank - r);
    if (!best || diff < bestDiff || (diff === bestDiff && p.combiPriority > best.combiPriority)) {
      best = p;
      bestDiff = diff;
    }
  }
  childByRank[r] = best;
}

const genderOk = (required, gender) => !required || required === gender;

export const genderMark = (g) => (g === 'M' ? ' ♂' : g === 'F' ? ' ♀' : '');

// Hijo de la pareja (a ♂/♀, b ♂/♀). Los géneros solo importan en combos únicos restringidos.
export function calculateChild(a, b, genderA = 'M', genderB = 'F') {
  if (!a || !b) return null;
  for (const combo of a.combos || []) {
    if (
      (combo.a === a.id && combo.b === b.id && genderOk(combo.ga, genderA) && genderOk(combo.gb, genderB)) ||
      (combo.a === b.id && combo.b === a.id && genderOk(combo.ga, genderB) && genderOk(combo.gb, genderA))
    ) {
      return palsById[combo.child];
    }
  }
  if (a.id === b.id) return a;
  return childByRank[(a.combiRank + b.combiRank + 1) >> 1];
}

// Describe la cruza de dos ids: hijo, si es combo único y si exige géneros.
export function describeBreeding(idA, idB) {
  const a = palsById[idA];
  const b = palsById[idB];
  if (!a || !b) return null;
  for (const combo of a.combos || []) {
    const directo = combo.a === idA && combo.b === idB;
    const invertido = combo.a === idB && combo.b === idA;
    if (!directo && !invertido) continue;
    const child = palsById[combo.child];
    if (!child) continue;
    const genderRequirement =
      combo.ga || combo.gb
        ? directo
          ? { a: combo.ga || '', b: combo.gb || '' }
          : { a: combo.gb || '', b: combo.ga || '' }
        : null;
    return { child, unique: true, genderRequirement };
  }
  const child = a.id === b.id ? a : childByRank[(a.combiRank + b.combiRank + 1) >> 1];
  return child ? { child, unique: false, genderRequirement: null } : null;
}

// Géneros requeridos para que (a, b) produzca childId; '' si no hay restricción.
export function requiredGenders(a, b, childId, genderA, genderB) {
  for (const combo of a.combos || []) {
    if (combo.child !== childId || (!combo.ga && !combo.gb)) continue;
    if (combo.a === a.id && combo.b === b.id && genderOk(combo.ga, genderA) && genderOk(combo.gb, genderB)) {
      return { genderA: combo.ga || '', genderB: combo.gb || '' };
    }
    if (combo.a === b.id && combo.b === a.id && genderOk(combo.ga, genderB) && genderOk(combo.gb, genderA)) {
      return { genderA: combo.gb || '', genderB: combo.ga || '' };
    }
  }
  return { genderA: '', genderB: '' };
}

// Todas las parejas que producen a un pal (combos únicos + fórmula de rank).
const parentsCache = new Map();
export function parentsOf(pal) {
  if (parentsCache.has(pal.id)) return parentsCache.get(pal.id);
  const pairs = [];
  for (const combo of pal.combos || []) {
    if (combo.child !== pal.id) continue;
    const a = palsById[combo.a];
    const b = palsById[combo.b];
    if (!a || !b) continue;
    pairs.push({ A: a.id, AN: a.name + genderMark(combo.ga), B: b.id, BN: b.name + genderMark(combo.gb) });
  }
  if (!uniqueChildren.has(pal.id) && !pal.ignoreCombi && pal.combiRank) {
    for (let i = 0; i < breedingPool.length; i++) {
      for (let j = i; j < breedingPool.length; j++) {
        const a = breedingPool[i];
        const b = breedingPool[j];
        if (uniquePairs.has(a.id + '|' + b.id)) continue;
        const childId = a.id === b.id ? a.id : childByRank[(a.combiRank + b.combiRank + 1) >> 1].id;
        if (childId === pal.id) pairs.push({ A: a.id, AN: a.name, B: b.id, BN: b.name });
      }
    }
  }
  parentsCache.set(pal.id, pairs);
  return pairs;
}

const stepKey = (step) => JSON.stringify([step.a, step.genderA, step.b, step.genderB]);

// Ruta más corta desde los pals que tienes hasta el objetivo (Dijkstra sobre nº de cruzas).
// Devuelve { score, steps, tree } o null si no hay ruta.
export function findShortestPath(ownedIds, targetId) {
  const target = palsById[targetId];
  const owned = [...new Set(ownedIds)].filter((id) => breedableIds.has(id)).sort();
  const ownedSet = new Set(owned);
  if (!target || !breedableIds.has(targetId)) return null;
  if (ownedSet.has(targetId)) {
    return {
      strategy: 'already-owned',
      score: 0,
      steps: [],
      tree: buildTree(targetId, 'root', '', new Map(), ownedSet),
    };
  }
  if (owned.length < 2) return null;

  const targetOwned = ownedSet.has(targetId);
  const dist = new Map();
  const cameFrom = new Map();
  for (const id of owned) {
    dist.set(id, 0);
    cameFrom.set(id, null);
  }

  const finalized = [];
  const visited = new Set();
  let bestScore = Infinity;
  let bestStep = null; // mejor cruza que produce el objetivo cuando ya lo tienes

  for (;;) {
    let current = null;
    let currentDist = Infinity;
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < currentDist) {
        current = id;
        currentDist = d;
      }
    }
    if (current == null) break;
    finalized.push(current);
    visited.add(current);
    if (current === targetId && !targetOwned) break;

    for (const other of finalized) {
      for (const [gA, gB] of [['M', 'F'], ['F', 'M']]) {
        const child = calculateChild(palsById[current], palsById[other], gA, gB);
        if (!child) continue;
        const cost = dist.get(current) + dist.get(other) + 1;
        const improvesTarget = targetOwned && child.id === targetId && cost <= bestScore;
        const improvesNode = !visited.has(child.id) && cost < (dist.get(child.id) ?? Infinity);
        if (improvesTarget || improvesNode) {
          const genders = requiredGenders(palsById[current], palsById[other], child.id, gA, gB);
          const step = { a: current, b: other, genderA: genders.genderA, genderB: genders.genderB };
          if (improvesTarget && (cost < bestScore || (cost === bestScore && stepKey(step) < stepKey(bestStep)))) {
            bestScore = cost;
            bestStep = step;
          }
          if (improvesNode) {
            dist.set(child.id, cost);
            cameFrom.set(child.id, step);
          }
        }
      }
    }
    if (targetOwned && bestStep && currentDist + 1 > bestScore) break;
  }

  if (targetOwned ? !bestStep : !visited.has(targetId)) return null;

  // Reconstruye la lista de pasos en orden de dependencia.
  const steps = [];
  const emitted = new Set();
  const emit = (id, override = null) => {
    const step = override || cameFrom.get(id);
    if (!step || emitted.has(id)) return;
    emitted.add(id);
    emit(step.a);
    emit(step.b);
    steps.push({ ...step, child: id });
  };
  emit(targetId, bestStep);

  return {
    strategy: 'shortest',
    score: targetOwned ? bestScore : dist.get(targetId),
    steps,
    tree: buildTree(targetId, 'root', '', cameFrom, ownedSet, bestStep),
  };
}

function buildTree(palId, branchKey, gender, cameFrom, ownedSet, override = null) {
  const pal = palsById[palId];
  const step = override || cameFrom.get(palId);
  return {
    branchKey,
    palId,
    name: pal.name,
    icon: pal.icon,
    gender,
    owned: !step && ownedSet.has(palId),
    children: step
      ? [
          buildTree(step.a, branchKey + '-a', step.genderA, cameFrom, ownedSet),
          buildTree(step.b, branchKey + '-b', step.genderB, cameFrom, ownedSet),
        ]
      : [],
  };
}
